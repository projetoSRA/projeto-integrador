import { Router } from "express";
import { db } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        ev.id_evento,
        ev.id_empresa,
        emp.nome_empresa,
        ev.titulo,
        ev.descricao,
        ev.tipo_evento,
        ev.data_evento,
        ev.horario,
        ev.carga_horaria,
        ev.palestrante,
        ev.info_palestrante,
        ev.criado_em
      FROM public.eventos ev
      JOIN public.empresa emp ON emp.id_empresa = ev.id_empresa
      ORDER BY ev.data_evento DESC, ev.criado_em DESC
    `);

    return res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar eventos:", error);
    return res.status(500).json({ message: "Erro ao listar eventos." });
  }
});

router.get("/empresa/:idEmpresa", async (req, res) => {
  try {
    const { idEmpresa } = req.params;

    const result = await db.query(
      `
      SELECT
        id_evento,
        id_empresa,
        titulo,
        descricao,
        tipo_evento,
        data_evento,
        horario,
        carga_horaria,
        palestrante,
        info_palestrante,
        criado_em
      FROM public.eventos
      WHERE id_empresa = $1
      ORDER BY data_evento DESC, criado_em DESC
      `,
      [idEmpresa]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar eventos da empresa:", error);
    return res.status(500).json({
      message: "Erro ao listar eventos da empresa.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      idEmpresa,
      titulo,
      descricao,
      tipoEvento,
      dataEvento,
      horario,
      cargaHoraria,
      palestrante,
      infoPalestrante,
    } = req.body;

    if (!idEmpresa || !titulo || !dataEvento || !cargaHoraria) {
      return res.status(400).json({
        message: "Empresa, título, data e carga horária são obrigatórios.",
      });
    }

    const result = await db.query(
      `
      INSERT INTO public.eventos (
        id_empresa,
        titulo,
        descricao,
        tipo_evento,
        data_evento,
        horario,
        carga_horaria,
        palestrante,
        info_palestrante
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        idEmpresa,
        titulo,
        descricao || null,
        tipoEvento || "PALESTRA",
        dataEvento,
        horario || null,
        Number(cargaHoraria),
        palestrante || null,
        infoPalestrante || null,
      ]
    );

    return res.status(201).json({
      message: "Evento criado com sucesso.",
      evento: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    return res.status(500).json({
      message: "Erro ao criar evento.",
    });
  }
});

router.delete("/:idEvento", async (req, res) => {
  try {
    const { idEvento } = req.params;

    await db.query(
      `
      DELETE FROM public.eventos
      WHERE id_evento = $1
      `,
      [idEvento]
    );

    return res.json({
      message: "Evento excluído com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir evento:", error);
    return res.status(500).json({
      message: "Erro ao excluir evento.",
    });
  }
});
router.get("/inscricoes/aluno/:idAluno", async (req, res) => {
  try {
    const { idAluno } = req.params;

    const result = await db.query(
      `
      SELECT id_evento, status_inscricao
      FROM public.inscricao
      WHERE id_aluno = $1
      `,
      [idAluno]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar inscrições:", error);
    return res.status(500).json({
      message: "Erro ao listar inscrições.",
    });
  }
});

router.post("/:idEvento/inscrever", async (req, res) => {
  try {
    const { idEvento } = req.params;
    const { idAluno } = req.body;

    if (!idAluno || !idEvento) {
      return res.status(400).json({
        message: "Aluno e evento são obrigatórios.",
      });
    }

    const existe = await db.query(
      `
      SELECT id_inscricao
      FROM public.inscricao
      WHERE id_aluno = $1
        AND id_evento = $2
      `,
      [idAluno, idEvento]
    );

    if ((existe.rowCount ?? 0) > 0) {
      return res.status(400).json({
        message: "Aluno já inscrito neste evento.",
      });
    }

    const result = await db.query(
      `
      INSERT INTO public.inscricao (
        id_aluno,
        id_evento,
        status_inscricao
      )
      VALUES ($1, $2, 'INSCRITO')
      RETURNING *
      `,
      [idAluno, idEvento]
    );

    return res.status(201).json({
      message: "Inscrição realizada com sucesso.",
      inscricao: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao inscrever aluno:", error);
    return res.status(500).json({
      message: "Erro ao realizar inscrição.",
    });
  }
});
router.get("/:idEvento/inscritos", async (req, res) => {
  try {
    const { idEvento } = req.params;

    const result = await db.query(
      `
      SELECT
        a.id_aluno,
        a.nome,
        a.email,
        u.login AS rm,
        i.status_inscricao
      FROM public.inscricao i
      JOIN public.aluno a ON a.id_aluno = i.id_aluno
      LEFT JOIN public.usuario u ON u.id_aluno = a.id_aluno
      WHERE i.id_evento = $1
      ORDER BY a.nome ASC
      `,
      [idEvento]
    );

    return res.json(
      result.rows.map((item) => ({
        ...item,
        curso: "Análise e Desenvolvimento de Sistemas",
      }))
    );
  } catch (error) {
    console.error("Erro ao listar inscritos:", error);
    return res.status(500).json({
      message: "Erro ao listar inscritos.",
    });
  }
});
export default router;