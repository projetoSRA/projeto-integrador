import { Router } from "express";
import multer from "multer";
import { db } from "../db.js";
import { supabase } from "../supabase.js";
import {
  requireAuth,
  requireRole,
  requireSelfAlunoOrCoordenacao,
} from "../middleware/auth.js";
import { matchesDeclaredType } from "../utils/fileSignature.js";

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

export default router;
