import { Router } from "express";
import { db } from "../db";
import { requireAuth, requireRole, requireSelfAlunoOrCoordenacao } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// Lista as visitas registradas para um aluno (própria coordenação ou o
// próprio aluno dono dos registros).
router.get(
  "/aluno/:idAluno",
  requireSelfAlunoOrCoordenacao("idAluno"),
  async (req, res) => {
    try {
      const { idAluno } = req.params;

      const result = await db.query(
        `
        SELECT
          v.id_visita,
          v.id_aluno,
          v.local,
          v.quantidade_horas,
          v.data_visita,
          v.observacao,
          v.bimestre,
          v.criado_em
        FROM public.visita v
        WHERE v.id_aluno = $1
        ORDER BY v.data_visita DESC, v.criado_em DESC
        `,
        [idAluno]
      );

      return res.json(result.rows);
    } catch (error) {
      console.error("Erro ao listar visitas:", error);
      return res.status(500).json({ message: "Erro ao listar visitas." });
    }
  }
);

// Coordenação registra uma visita para um aluno.
router.post("/", requireRole("COORDENACAO"), async (req, res) => {
  try {
    const idCoordenacao = req.auth!.id_coordenacao;
    const { idAluno, local, quantidadeHoras, dataVisita, observacao, bimestre } = req.body;

    if (!idAluno || !local || !quantidadeHoras || !dataVisita) {
      return res.status(400).json({
        message: "Aluno, local, quantidade de horas e data são obrigatórios.",
      });
    }

    const horas = Number(quantidadeHoras);

    if (Number.isNaN(horas) || horas <= 0) {
      return res.status(400).json({
        message: "Informe uma quantidade de horas válida.",
      });
    }

    // O bimestre alimenta a geração automática do Portfólio do Aluno (ver
    // certificados.routes.ts, que usa o mesmo campo para relatórios).
    const numeroBimestre = Number(bimestre);

    if (!bimestre || !Number.isInteger(numeroBimestre) || numeroBimestre < 1 || numeroBimestre > 4) {
      return res.status(400).json({
        message: "Informe o bimestre (1 a 4).",
      });
    }

    const result = await db.query(
      `
      INSERT INTO public.visita (
        id_aluno,
        id_coordenacao,
        local,
        quantidade_horas,
        data_visita,
        observacao,
        bimestre
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [idAluno, idCoordenacao, local, horas, dataVisita, observacao || null, numeroBimestre]
    );

    return res.status(201).json({
      message: "Visita registrada com sucesso.",
      visita: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao registrar visita:", error);
    return res.status(500).json({ message: "Erro ao registrar visita." });
  }
});

// Coordenação exclui um registro de visita.
router.delete("/:idVisita", requireRole("COORDENACAO"), async (req, res) => {
  try {
    const { idVisita } = req.params;

    const result = await db.query(
      `DELETE FROM public.visita WHERE id_visita = $1 RETURNING id_visita`,
      [idVisita]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Visita não encontrada." });
    }

    return res.json({ message: "Visita excluída com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir visita:", error);
    return res.status(500).json({ message: "Erro ao excluir visita." });
  }
});

export default router;
