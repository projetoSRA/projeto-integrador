import { Router } from "express";
import { db } from "../db.js";

const router = Router();

router.get("/aluno/:idAluno", async (req, res) => {
  try {
    const { idAluno } = req.params;

    const result = await db.query(
      `
      SELECT
        COALESCE(COUNT(*) FILTER (WHERE tipo_arquivo = 'CERTIFICADO'), 0)::int AS total_certificados,
        COALESCE(COUNT(*) FILTER (WHERE tipo_arquivo = 'RELATORIO'), 0)::int AS total_relatorios,

        COALESCE(SUM(quantidade_horas) FILTER (
          WHERE tipo_arquivo = 'CERTIFICADO'
          AND status_certificado = 'APROVADO'
        ), 0)::int AS horas_certificados,

        COALESCE(SUM(quantidade_horas) FILTER (
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

    const arquivos = result.rows[0];
    const eventosData = eventos.rows[0];

    const totalHoras =
      Number(arquivos.horas_certificados) +
      Number(arquivos.horas_relatorios) +
      Number(eventosData.horas_eventos);

    return res.json({
      totalCertificados: arquivos.total_certificados,
      totalRelatorios: arquivos.total_relatorios,
      totalEventos: eventosData.total_eventos,
      horasCertificados: arquivos.horas_certificados,
      horasRelatorios: arquivos.horas_relatorios,
      horasEventos: eventosData.horas_eventos,
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
});

export default router;