import { Router } from "express";
import { db } from "../db";
import {
  requireAuth,
  requireRole,
  requireSelfAlunoOrCoordenacao,
  requireSelfEmpresaOrCoordenacao,
} from "../middleware/auth";

const router = Router();

// Antes: todas as rotas abaixo eram públicas. Agora exigem login; as
// checagens de papel/posse específicas ficam em cada rota (achado C1).
router.use(requireAuth);

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

router.get(
  "/empresa/:idEmpresa",
  requireSelfEmpresaOrCoordenacao("idEmpresa"),
  async (req, res) => {
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
  }
);

// Antes: qualquer pessoa podia criar um evento em nome de qualquer empresa
// informando o idEmpresa no corpo. Agora exige login como EMPRESA e usa o
// id do token, ignorando qualquer idEmpresa vindo do cliente.
router.post("/", requireRole("EMPRESA"), async (req, res) => {
  try {
    const idEmpresa = req.auth!.id_empresa;
    const {
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

// Antes: qualquer pessoa podia apagar qualquer evento só sabendo o id.
// Agora exige login e verifica se quem apaga é a empresa dona do evento ou
// a coordenação.
router.delete("/:idEvento", async (req, res) => {
  try {
    const { idEvento } = req.params;
    const auth = req.auth!;

    const evento = await db.query(
      `SELECT id_empresa FROM public.eventos WHERE id_evento = $1`,
      [idEvento]
    );

    if (evento.rowCount === 0) {
      return res.status(404).json({ message: "Evento não encontrado." });
    }

    const podeExcluir =
      auth.tipo_usuario === "COORDENACAO" ||
      (auth.tipo_usuario === "EMPRESA" &&
        String(auth.id_empresa) === String(evento.rows[0].id_empresa));

    if (!podeExcluir) {
      return res.status(403).json({
        message: "Você não tem permissão para excluir este evento.",
      });
    }

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

// Eventos em que um aluno está inscrito, com os dados completos do evento
// (usado na tela de detalhe do aluno na coordenação).
router.get(
  "/aluno/:idAluno",
  requireSelfAlunoOrCoordenacao("idAluno"),
  async (req, res) => {
    try {
      const { idAluno } = req.params;

      const result = await db.query(
        `
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
        i.status_inscricao
      FROM public.inscricao i
      JOIN public.eventos ev ON ev.id_evento = i.id_evento
      JOIN public.empresa emp ON emp.id_empresa = ev.id_empresa
      WHERE i.id_aluno = $1
      ORDER BY ev.data_evento DESC
      `,
        [idAluno]
      );

      return res.json(result.rows);
    } catch (error) {
      console.error("Erro ao listar eventos do aluno:", error);
      return res.status(500).json({
        message: "Erro ao listar eventos do aluno.",
      });
    }
  }
);

router.get(
  "/inscricoes/aluno/:idAluno",
  requireRole("ALUNO", "COORDENACAO"),
  async (req, res) => {
    try {
      const { idAluno } = req.params;
      const auth = req.auth!;

      if (auth.tipo_usuario === "ALUNO" && String(auth.id_aluno) !== String(idAluno)) {
        return res.status(403).json({
          message: "Você não tem permissão para acessar dados de outro aluno.",
        });
      }

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
  }
);

// Antes: qualquer pessoa podia inscrever qualquer aluno em qualquer evento
// informando idAluno no corpo. Agora exige login como ALUNO e usa o id do
// próprio token (auto-inscrição apenas).
router.post("/:idEvento/inscrever", requireRole("ALUNO"), async (req, res) => {
  try {
    const { idEvento } = req.params;
    const idAluno = req.auth!.id_aluno;

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

// Antes: pública — expunha nome, email, RM/RA e curso de todos os inscritos
// para qualquer pessoa. Agora restrita à empresa dona do evento e à
// coordenação (dados sensíveis de alunos, achado A1).
router.get("/:idEvento/inscritos", requireRole("COORDENACAO", "EMPRESA"), async (req, res) => {
  try {
    const { idEvento } = req.params;
    const auth = req.auth!;

    if (auth.tipo_usuario === "EMPRESA") {
      const evento = await db.query(
        `SELECT id_empresa FROM public.eventos WHERE id_evento = $1`,
        [idEvento]
      );

      if (evento.rowCount === 0) {
        return res.status(404).json({ message: "Evento não encontrado." });
      }

      if (String(auth.id_empresa) !== String(evento.rows[0].id_empresa)) {
        return res.status(403).json({
          message: "Você não tem permissão para ver os inscritos deste evento.",
        });
      }
    }

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
        i.status_inscricao
      FROM public.inscricao i
      JOIN public.aluno a ON a.id_aluno = i.id_aluno
      WHERE i.id_evento = $1
      ORDER BY a.nome ASC
      `,
      [idEvento]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar inscritos:", error);
    return res.status(500).json({
      message: "Erro ao listar inscritos.",
    });
  }
});

export default router;
