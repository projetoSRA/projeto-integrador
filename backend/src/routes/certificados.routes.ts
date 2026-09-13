import { Router } from "express";
import multer from "multer";
import { db } from "../db";
import { supabase } from "../supabase";
import { requireAuth, requireRole, requireSelfAlunoOrCoordenacao } from "../middleware/auth";
import { matchesDeclaredType } from "../utils/fileSignature";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const BUCKET = process.env.SUPABASE_BUCKET || "arquivos-sra";

function normalizarTipo(tipo: string) {
  return tipo === "relatorio" ? "RELATORIO" : "CERTIFICADO";
}

function validarArquivo(tipo: string, file: Express.Multer.File) {
  const mime = file.mimetype;

  if (tipo === "CERTIFICADO") {
    return [
      "image/png",
      "image/jpeg",
      "application/pdf",
    ].includes(mime);
  }

  return [
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ].includes(mime);
}

// Antes: rota pública — qualquer pessoa via URL direta via os certificados e
// dados pessoais (nome, RM/RA, email) de qualquer aluno. Agora exige login e
// que o chamador seja o próprio aluno ou a coordenação (achados C1 e A1).
router.get(
  "/aluno/:idAluno",
  requireAuth,
  requireSelfAlunoOrCoordenacao("idAluno"),
  async (req, res) => {
    try {
      const { idAluno } = req.params;

      const result = await db.query(
        `
      SELECT
        id_certificado,
        id_aluno,
        id_evento,
        titulo,
        instituicao,
        quantidade_horas,
        data_emissao,
        url_arquivo,
        status_certificado,
        tipo_arquivo,
        nome_arquivo,
        mime_type,
        tamanho_arquivo,
        storage_path,
        url_publica,
        horas_aprovadas,
        local,
        conteudo,
        bimestre,
        criado_em
      FROM public.certificados
      WHERE id_aluno = $1
      ORDER BY criado_em DESC
      `,
        [idAluno]
      );

      return res.json(result.rows);
    } catch (error) {
      console.error("Erro ao listar arquivos:", error);
      return res.status(500).json({
        message: "Erro ao listar arquivos.",
      });
    }
  }
);

// Antes: qualquer pessoa podia enviar um certificado em nome de qualquer
// idAluno informado no corpo da requisição. Agora exige login como ALUNO e
// o id do aluno vem do token (nunca do corpo enviado pelo cliente).
router.post(
  "/upload",
  requireAuth,
  requireRole("ALUNO"),
  upload.single("arquivo"),
  async (req, res) => {
    try {
      const idAluno = req.auth!.id_aluno;
      const { tipo, titulo, horas, dataEmissao, local, conteudo, bimestre } = req.body;
      const file = req.file;

      if (!idAluno || !tipo || !titulo || !horas || !dataEmissao || !file) {
        return res.status(400).json({
          message: "Dados obrigatórios não enviados.",
        });
      }

      const tipoArquivo = normalizarTipo(tipo);
      const quantidadeHoras = Number(horas);

      if (tipoArquivo === "RELATORIO" && (quantidadeHoras < 1 || quantidadeHoras > 2)) {
        return res.status(400).json({
          message: "Relatórios devem ter entre 1 e 2 horas.",
        });
      }

      if (tipoArquivo === "CERTIFICADO" && quantidadeHoras < 1) {
        return res.status(400).json({
          message: "Certificados devem ter pelo menos 1 hora.",
        });
      }

      // Bimestre e (para relatório) local/conteúdo alimentam a geração
      // automática do Portfólio do Aluno (RF do 3º bimestre) — sem eles não
      // dá pra montar o bloco "Palestras" do documento.
      const numeroBimestre = Number(bimestre);

      if (!bimestre || !Number.isInteger(numeroBimestre) || numeroBimestre < 1 || numeroBimestre > 4) {
        return res.status(400).json({
          message: "Informe o bimestre (1 a 4).",
        });
      }

      const localTexto = typeof local === "string" ? local.trim() : "";
      const conteudoTexto = typeof conteudo === "string" ? conteudo.trim() : "";

      if (tipoArquivo === "RELATORIO") {
        if (!localTexto || !conteudoTexto) {
          return res.status(400).json({
            message: "Para relatórios, informe o local da atividade e o conteúdo do relato.",
          });
        }

        if (localTexto.length > 255) {
          return res.status(400).json({
            message: "O local deve ter no máximo 255 caracteres.",
          });
        }

        if (conteudoTexto.length > 10000) {
          return res.status(400).json({
            message: "O conteúdo do relatório deve ter no máximo 10000 caracteres.",
          });
        }
      }

      if (!validarArquivo(tipoArquivo, file)) {
        return res.status(400).json({
          message:
            tipoArquivo === "CERTIFICADO"
              ? "Certificados aceitam apenas imagem ou PDF."
              : "Relatórios aceitam apenas PDF, TXT, DOC ou DOCX.",
        });
      }

      // Não confia apenas no Content-Type declarado pelo cliente
      // (achado A3 do relatório de pentest).
      if (!matchesDeclaredType(file.buffer, file.mimetype)) {
        return res.status(400).json({
          message: "O conteúdo do arquivo não corresponde ao tipo declarado.",
        });
      }

      const pasta = tipoArquivo === "CERTIFICADO" ? "certificados" : "relatorios";
      const nomeSeguro = file.originalname
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");

      const storagePath = `${pasta}/aluno-${idAluno}/${Date.now()}-${nomeSeguro}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);
        return res.status(500).json({
          message: "Erro ao enviar arquivo para o Supabase Storage.",
        });
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath);

      const urlPublica = publicUrlData.publicUrl;

      const insert = await db.query(
        `
      INSERT INTO public.certificados (
        id_aluno,
        id_evento,
        titulo,
        instituicao,
        quantidade_horas,
        data_emissao,
        url_arquivo,
        status_certificado,
        tipo_arquivo,
        nome_arquivo,
        mime_type,
        tamanho_arquivo,
        storage_path,
        url_publica,
        horas_aprovadas,
        local,
        conteudo,
        bimestre
      )
      VALUES (
        $1, NULL, $2, $3, $4, $5, $6,
        'PENDENTE', $7, $8, $9, $10, $11, $12, 0, $13, $14, $15
      )
      RETURNING *
      `,
        [
          idAluno,
          titulo,
          "3° AMS Ourinhos",
          quantidadeHoras,
          dataEmissao,
          urlPublica,
          tipoArquivo,
          file.originalname,
          file.mimetype,
          file.size,
          storagePath,
          urlPublica,
          tipoArquivo === "RELATORIO" ? localTexto : null,
          tipoArquivo === "RELATORIO" ? conteudoTexto : null,
          numeroBimestre,
        ]
      );

      return res.status(201).json({
        message: "Arquivo enviado com sucesso.",
        arquivo: insert.rows[0],
      });
    } catch (error) {
      console.error("Erro no upload:", error);
      return res.status(500).json({
        message: "Erro interno ao enviar arquivo.",
      });
    }
  }
);

// Antes: qualquer pessoa podia apagar o certificado de qualquer aluno só
// sabendo o id. Agora exige login e verifica se quem está apagando é o
// dono do certificado (aluno) ou a coordenação.
router.delete("/:idCertificado", requireAuth, async (req, res) => {
  try {
    const { idCertificado } = req.params;
    const auth = req.auth!;

    const arquivo = await db.query(
      `
      SELECT id_aluno, storage_path
      FROM public.certificados
      WHERE id_certificado = $1
      `,
      [idCertificado]
    );

    if (arquivo.rowCount === 0) {
      return res.status(404).json({
        message: "Arquivo não encontrado.",
      });
    }

    const { id_aluno: idAlunoDono, storage_path: storagePath } = arquivo.rows[0];

    const podeExcluir =
      auth.tipo_usuario === "COORDENACAO" ||
      (auth.tipo_usuario === "ALUNO" && String(auth.id_aluno) === String(idAlunoDono));

    if (!podeExcluir) {
      return res.status(403).json({
        message: "Você não tem permissão para excluir este arquivo.",
      });
    }

    if (storagePath) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
    }

    await db.query(
      `
      DELETE FROM public.certificados
      WHERE id_certificado = $1
      `,
      [idCertificado]
    );

    return res.json({
      message: "Arquivo excluído com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir arquivo:", error);
    return res.status(500).json({
      message: "Erro ao excluir arquivo.",
    });
  }
});

export default router;
