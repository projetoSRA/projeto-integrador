import { Router } from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import { db } from "../db.js";
import { supabase } from "../supabase.js";
import {
  requireAuth,
  requireRole,
  requireSelfAlunoOrCoordenacao,
} from "../middleware/auth.js";
import { matchesDeclaredType } from "../utils/fileSignature.js";

const XLSX_MIMETYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

// Lista os alunos para a tela "Alunos" da coordenação, com busca opcional
// por nome, RM ou RA e um resumo de horas/eventos de cada um.
router.get("/", requireAuth, requireRole("COORDENACAO"), async (req, res) => {
  try {
    const busca = typeof req.query.busca === "string" ? req.query.busca.trim() : "";

    const result = await db.query(
      `
      SELECT
        a.id_aluno,
        a.nome,
        a.email,
        a.rm,
        a.ra,
        a.curso,
        a.nivel_ensino,
        a.serie_semestre,
        a.foto_perfil_url,
        COALESCE(cert.horas_certificados, 0) + COALESCE(cert.horas_relatorios, 0)
          + COALESCE(ev.horas_eventos, 0) + COALESCE(vis.horas_visitas, 0) AS total_horas,
        COALESCE(ev.total_eventos, 0)::int AS total_eventos,
        GREATEST(cert.ultima_data, ev.ultima_data, vis.ultima_data) AS ultima_atividade
      FROM public.aluno a
      LEFT JOIN (
        SELECT
          id_aluno,
          SUM(horas_aprovadas) FILTER (WHERE tipo_arquivo = 'CERTIFICADO' AND status_certificado = 'APROVADO') AS horas_certificados,
          SUM(horas_aprovadas) FILTER (WHERE tipo_arquivo = 'RELATORIO' AND status_certificado = 'APROVADO') AS horas_relatorios,
          MAX(criado_em) AS ultima_data
        FROM public.certificados
        GROUP BY id_aluno
      ) cert ON cert.id_aluno = a.id_aluno
      LEFT JOIN (
        SELECT
          i.id_aluno,
          COUNT(*) AS total_eventos,
          SUM(e.carga_horaria) AS horas_eventos,
          MAX(e.data_evento) AS ultima_data
        FROM public.inscricao i
        JOIN public.eventos e ON e.id_evento = i.id_evento
        WHERE i.status_inscricao = 'PRESENTE'
        GROUP BY i.id_aluno
      ) ev ON ev.id_aluno = a.id_aluno
      LEFT JOIN (
        SELECT id_aluno, SUM(quantidade_horas) AS horas_visitas, MAX(data_visita) AS ultima_data
        FROM public.visita
        GROUP BY id_aluno
      ) vis ON vis.id_aluno = a.id_aluno
      WHERE
        $1 = '' OR a.nome ILIKE '%' || $1 || '%' OR a.rm ILIKE '%' || $1 || '%' OR a.ra ILIKE '%' || $1 || '%'
      ORDER BY a.nome ASC
      `,
      [busca]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar alunos:", error);
    return res.status(500).json({ message: "Erro ao listar alunos." });
  }
});

// Perfil completo de um aluno para a tela de detalhe da coordenação
// (também acessível pelo próprio aluno).
router.get(
  "/:idAluno",
  requireAuth,
  requireSelfAlunoOrCoordenacao("idAluno"),
  async (req, res) => {
    try {
      const { idAluno } = req.params;

      const aluno = await db.query(
        `
        SELECT id_aluno, nome, email, rm, ra, curso, nivel_ensino, serie_semestre, foto_perfil_url
        FROM public.aluno
        WHERE id_aluno = $1
        `,
        [idAluno]
      );

      if (aluno.rowCount === 0) {
        return res.status(404).json({ message: "Aluno não encontrado." });
      }

      const anoAtual = new Date().getFullYear();

      const palestrasNoAno = await db.query(
        `
        SELECT COUNT(*)::int AS total
        FROM public.eventos
        WHERE tipo_evento = 'PALESTRA' AND EXTRACT(YEAR FROM data_evento) = $1
        `,
        [anoAtual]
      );

      const participacoes = await db.query(
        `
        SELECT COUNT(*)::int AS total
        FROM public.inscricao i
        JOIN public.eventos e ON e.id_evento = i.id_evento
        WHERE i.id_aluno = $1 AND i.status_inscricao = 'PRESENTE' AND e.tipo_evento = 'PALESTRA'
        `,
        [idAluno]
      );

      const horas = await db.query(
        `
        SELECT
          COALESCE(SUM(horas_aprovadas) FILTER (
            WHERE tipo_arquivo IN ('CERTIFICADO', 'RELATORIO') AND status_certificado = 'APROVADO'
          ), 0)::numeric AS horas_certificados
        FROM public.certificados
        WHERE id_aluno = $1
        `,
        [idAluno]
      );

      const horasEventos = await db.query(
        `
        SELECT COALESCE(SUM(e.carga_horaria), 0)::numeric AS horas_eventos
        FROM public.inscricao i
        JOIN public.eventos e ON e.id_evento = i.id_evento
        WHERE i.id_aluno = $1 AND i.status_inscricao = 'PRESENTE'
        `,
        [idAluno]
      );

      const horasVisitas = await db.query(
        `SELECT COALESCE(SUM(quantidade_horas), 0)::numeric AS horas_visitas FROM public.visita WHERE id_aluno = $1`,
        [idAluno]
      );

      const totalHoras =
        Number(horas.rows[0].horas_certificados) +
        Number(horasEventos.rows[0].horas_eventos) +
        Number(horasVisitas.rows[0].horas_visitas);

      return res.json({
        ...aluno.rows[0],
        totalPalestrasNoAno: palestrasNoAno.rows[0].total,
        eventosParticipados: participacoes.rows[0].total,
        totalHoras,
      });
    } catch (error) {
      console.error("Erro ao buscar aluno:", error);
      return res.status(500).json({ message: "Erro ao buscar aluno." });
    }
  }
);

// Antes: rota totalmente pública — qualquer pessoa podia trocar a foto de
// qualquer aluno só sabendo o id. Agora exige login e que o chamador seja o
// próprio aluno (ou a coordenação) — achado C1 do relatório de pentest.
router.post(
  "/:idAluno/foto",
  requireAuth,
  requireSelfAlunoOrCoordenacao("idAluno"),
  upload.single("foto"),
  async (req, res) => {
    try {
      const { idAluno } = req.params;

      if (!req.file) {
        return res.status(400).json({ message: "Nenhuma foto enviada." });
      }

      const tiposPermitidos = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

      if (!tiposPermitidos.includes(req.file.mimetype)) {
        return res.status(400).json({
          message: "Envie apenas imagens PNG, JPG, JPEG ou WEBP.",
        });
      }

      // Não confia apenas no Content-Type declarado pelo cliente
      // (achado A3 do relatório de pentest).
      if (!matchesDeclaredType(req.file.buffer, req.file.mimetype)) {
        return res.status(400).json({
          message: "O conteúdo do arquivo não corresponde a uma imagem válida.",
        });
      }

      const extensao = req.file.originalname.split(".").pop() || "png";
      const caminho = `fotos-perfil/aluno-${idAluno}/foto-${Date.now()}.${extensao}`;

      const { error } = await supabase.storage
        .from("arquivos-sra")
        .upload(caminho, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (error) {
        console.error("Erro no upload:", error);
        return res.status(500).json({ message: "Erro ao enviar foto." });
      }

      const { data } = supabase.storage
        .from("arquivos-sra")
        .getPublicUrl(caminho);

      const fotoUrl = data.publicUrl;

      await db.query(
        `
      UPDATE public.aluno
      SET foto_perfil_url = $1
      WHERE id_aluno = $2
      `,
        [fotoUrl, idAluno],
      );

      return res.json({
        message: "Foto atualizada com sucesso.",
        foto_perfil_url: fotoUrl,
      });
    } catch (error) {
      console.error("Erro ao atualizar foto:", error);
      return res.status(500).json({
        message: "Erro ao atualizar foto.",
      });
    }
  }
);

function normalizarTexto(valor: unknown): string {
  if (valor == null) return "";
  return String(valor).trim();
}

function normalizarCabecalho(valor: unknown): string {
  return normalizarTexto(valor).toUpperCase();
}

// A planilha da coordenação guarda o RM como texto, mas se alguém digitar/
// colar como número o Excel converte a célula — cobrimos os dois casos.
function normalizarRm(valor: unknown): string {
  if (valor == null) return "";
  if (typeof valor === "number") return String(Math.trunc(valor));
  return String(valor).trim();
}

// Extrai curso/turma/ano/série da linha de metadados que fica acima do
// cabeçalho RM/NOME/GRUPO no modelo padrão da coordenação, ex.:
// "Habilitação: _MTEC - DESENVOLVIMENTO DE SISTEMAS - AMS Turma: TURMA A
//  Semestre:  Ano: 2023 Módulo/Série: 3 SERIE Componente Curricular: "
// Se a planilha não seguir esse padrão, os dados de turma ficam null e a
// importação segue só com RM/NOME (não é motivo para recusar o arquivo).
function extrairMetadadosTurma(texto: string) {
  const match = texto.match(
    /Habilita[çc][ãa]o:\s*_?([\s\S]*?)\s*Turma:\s*([\s\S]*?)\s*Semestre:\s*([\s\S]*?)\s*Ano:\s*([\s\S]*?)\s*M[óo]dulo\/S[ée]rie:\s*([\s\S]*?)\s*Componente Curricular:/i
  );

  if (!match) {
    return { curso: null, turma: null, ano: null, serieSemestre: null };
  }

  return {
    curso: match[1]?.trim() || null,
    turma: match[2]?.trim() || null,
    ano: match[4]?.trim() || null,
    serieSemestre: match[5]?.trim() || null,
  };
}

// Importação em lote de alunos via planilha Excel (RF006 do TCC).
// Espera o modelo oficial usado pela coordenação: uma linha de metadados
// da turma, seguida por um cabeçalho "RM | NOME | GRUPO" e uma linha por
// aluno. A coluna GRUPO é lida mas não é persistida (não existe campo
// correspondente no modelo de dados atual).
//
// Alunos com RM já cadastrado têm nome/curso/série atualizados; RMs novos
// geram um cadastro de aluno + um usuário do tipo ALUNO sem senha (mesmo
// estado de uma conta criada manualmente pela coordenação — o aluno só
// consegue logar depois que uma senha for definida).
router.post(
  "/importar-planilha",
  requireAuth,
  requireRole("COORDENACAO"),
  upload.single("planilha"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhuma planilha enviada." });
      }

      if (!req.file.originalname.toLowerCase().endsWith(".xlsx")) {
        return res.status(400).json({
          message: "Envie um arquivo .xlsx (Excel).",
        });
      }

      // Não confia apenas na extensão do nome do arquivo — confere a
      // assinatura real do conteúdo (achado A3 do relatório de pentest,
      // mesmo princípio já aplicado ao upload de foto de perfil).
      if (!matchesDeclaredType(req.file.buffer, XLSX_MIMETYPE)) {
        return res.status(400).json({
          message: "O conteúdo do arquivo não corresponde a uma planilha .xlsx válida.",
        });
      }

      const workbook = new ExcelJS.Workbook();
      try {
        // Cast por incompatibilidade de tipos entre o Buffer do @types/node
        // instalado e o tipo esperado pelo .d.ts da exceljs — mesmo Buffer
        // em tempo de execução, só um atrito de definição de tipos.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await workbook.xlsx.load(req.file.buffer as any);
      } catch (parseError) {
        console.error("Erro ao ler planilha:", parseError);
        return res.status(400).json({
          message: "Não foi possível ler o arquivo. Confira se é uma planilha .xlsx válida.",
        });
      }

      const sheet = workbook.worksheets[0];
      if (!sheet) {
        return res.status(400).json({ message: "A planilha não tem nenhuma aba com dados." });
      }

      let headerRowNumber = -1;
      for (let r = 1; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        if (
          normalizarCabecalho(row.getCell(1).value) === "RM" &&
          normalizarCabecalho(row.getCell(2).value) === "NOME"
        ) {
          headerRowNumber = r;
          break;
        }
      }

      if (headerRowNumber === -1) {
        return res.status(400).json({
          message:
            "Não encontrei as colunas RM e NOME na planilha. Use o modelo padrão da coordenação.",
        });
      }

      let textoMetadados = "";
      for (let r = 1; r < headerRowNumber; r++) {
        const row = sheet.getRow(r);
        for (let c = 1; c <= sheet.columnCount; c++) {
          const valor = row.getCell(c).value;
          if (typeof valor === "string" && valor.trim()) {
            textoMetadados += ` ${valor}`;
          }
        }
      }

      const { curso, turma, ano, serieSemestre } = extrairMetadadosTurma(textoMetadados);

      // Deduplica RMs repetidos dentro da própria planilha (última
      // ocorrência vence) e valida cada linha antes de tocar no banco.
      const alunosValidos = new Map<string, { linha: number; nome: string }>();
      const ignorados: { linha: number; motivo: string }[] = [];

      for (let r = headerRowNumber + 1; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const rm = normalizarRm(row.getCell(1).value);
        const nome = normalizarTexto(row.getCell(2).value);

        if (!rm && !nome) continue; // linha em branco no fim da planilha

        if (!rm || !nome) {
          ignorados.push({ linha: r, motivo: "RM ou nome ausente" });
          continue;
        }

        if (rm.length > 20) {
          ignorados.push({ linha: r, motivo: "RM com mais de 20 caracteres" });
          continue;
        }

        if (nome.length > 150) {
          ignorados.push({ linha: r, motivo: "Nome com mais de 150 caracteres" });
          continue;
        }

        alunosValidos.set(rm, { linha: r, nome });
      }

      if (alunosValidos.size === 0) {
        return res.status(400).json({
          message: "Nenhuma linha válida encontrada na planilha.",
          ignorados,
        });
      }

      const client = await db.connect();
      let criados = 0;
      let atualizados = 0;

      try {
        await client.query("BEGIN");

        for (const [rm, { nome }] of alunosValidos) {
          const existente = await client.query(
            `SELECT id_aluno FROM public.aluno WHERE rm = $1`,
            [rm]
          );

          if ((existente.rowCount ?? 0) > 0) {
            await client.query(
              `
              UPDATE public.aluno
              SET nome = $1,
                  curso = COALESCE($2, curso),
                  serie_semestre = COALESCE($3, serie_semestre)
              WHERE rm = $4
              `,
              [nome, curso, serieSemestre, rm]
            );
            atualizados++;
          } else {
            const novoUsuario = await client.query(
              `INSERT INTO public.usuario (login, senha, tipo_usuario) VALUES ($1, NULL, 'ALUNO') RETURNING id_usuario`,
              [rm]
            );
            const idUsuario = novoUsuario.rows[0].id_usuario;

            // A planilha não traz e-mail, mas a coluna é NOT NULL no banco.
            // Usa um placeholder derivado do RM (único, fácil de reconhecer
            // como provisório) até o próprio aluno ou a coordenação
            // atualizarem com o e-mail real.
            const emailPlaceholder = `aluno.rm${rm}@sra.local`;

            await client.query(
              `
              INSERT INTO public.aluno (id_usuario, nome, email, rm, curso, serie_semestre, nivel_ensino)
              VALUES ($1, $2, $3, $4, $5, $6, 'MEDIO')
              `,
              [idUsuario, nome, emailPlaceholder, rm, curso, serieSemestre]
            );
            criados++;
          }
        }

        await client.query("COMMIT");
      } catch (dbError) {
        await client.query("ROLLBACK");
        console.error("Erro ao importar planilha de alunos:", dbError);
        return res.status(500).json({
          message: "Erro ao importar a planilha. Nenhuma alteração foi salva.",
        });
      } finally {
        client.release();
      }

      return res.status(200).json({
        message: "Importação concluída.",
        turma: { curso, turma, ano, serieSemestre },
        criados,
        atualizados,
        totalNaPlanilha: alunosValidos.size,
        ignorados,
      });
    } catch (error) {
      console.error("Erro ao importar planilha de alunos:", error);
      return res.status(500).json({ message: "Erro ao importar a planilha." });
    }
  }
);

export default router;
