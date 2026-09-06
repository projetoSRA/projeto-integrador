import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireSelfAlunoOrCoordenacao } from "../middleware/auth.js";

const router = Router();

// Antes: pública — qualquer pessoa via o total de horas de qualquer aluno
// trocando o id na URL. Agora exige login e restringe ao próprio aluno ou
// à coordenação (achado C1).
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
        COALESCE(COUNT(*) FILTER (WHERE tipo_arquivo = 'CERTIFICADO'), 0)::int AS total_certificados,
        COALESCE(COUNT(*) FILTER (WHERE tipo_arquivo = 'RELATORIO'), 0)::int AS total_relatorios,

        COALESCE(SUM(horas_aprovadas) FILTER (
          WHERE tipo_arquivo = 'CERTIFICADO'
          AND status_certificado = 'APROVADO'
        ), 0)::int AS horas_certificados,

        COALESCE(SUM(horas_aprovadas) FILTER (
          WHERE tipo_arquivo = 'RELATORIO'
          AND status_certificado = 'APROVADO'
        ), 0)::int AS horas_relatorios
      FROM public.certificados
      WHERE id_aluno = $1
      `,
        [idAluno]
      );

      const eventos = await db.query(
        `
      SELECT
        COALESCE(COUNT(*), 0)::int AS total_eventos,
        COALESCE(SUM(e.carga_horaria), 0)::int AS horas_eventos
      FROM public.inscricao i
      JOIN public.eventos e ON e.id_evento = i.id_evento
      WHERE i.id_aluno = $1
        AND i.status_inscricao = 'PRESENTE'
      `,
        [idAluno]
      );

      const visitas = await db.query(
        `
      SELECT
        COALESCE(COUNT(*), 0)::int AS total_visitas,
        COALESCE(SUM(quantidade_horas), 0)::int AS horas_visitas
      FROM public.visita
      WHERE id_aluno = $1
      `,
        [idAluno]
      );

      const arquivos = result.rows[0];
      const eventosData = eventos.rows[0];
      const visitasData = visitas.rows[0];

      const totalHoras =
        Number(arquivos.horas_certificados) +
        Number(arquivos.horas_relatorios) +
        Number(eventosData.horas_eventos) +
        Number(visitasData.horas_visitas);

      return res.json({
        totalCertificados: arquivos.total_certificados,
        totalRelatorios: arquivos.total_relatorios,
        totalEventos: eventosData.total_eventos,
        totalVisitas: visitasData.total_visitas,
        horasCertificados: arquivos.horas_certificados,
        horasRelatorios: arquivos.horas_relatorios,
        horasEventos: eventosData.horas_eventos,
        horasVisitas: visitasData.horas_visitas,
        totalHoras,
        totalAlvo: 200,
        horasRestantes: Math.max(200 - totalHoras, 0),
      });
    } catch (error) {
      console.error("Erro ao buscar horas:", error);
      return res.status(500).json({
        message: "Erro ao buscar horas do aluno.",
      });
    }
  }
);

export default router;
