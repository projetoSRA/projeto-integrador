import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

const STATUS_VALIDOS = ["APROVADO", "REPROVADO"];

// Antes: todas as rotas abaixo eram públicas, incluindo a que aprova ou
// reprova certificados — qualquer pessoa podia se auto-aprovar horas sem
// nenhuma autenticação (achado C1, o mais grave do relatório de pentest).
// Agora exigem login como COORDENACAO por padrão; a exceção pontual está
// comentada abaixo.
router.use(requireAuth);

// Lista certificados/relatórios ainda pendentes de validação
router.get("/pendentes", requireRole("COORDENACAO"), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        c.id_certificado,
        c.id_aluno,
        a.nome AS nome_aluno,
        a.email AS email_aluno,
        c.titulo,
        c.instituicao,
        c.quantidade_horas,
        c.data_emissao,
        c.tipo_arquivo,
        c.nome_arquivo,
        c.mime_type,
        c.url_publica,
        c.status_certificado,
        c.criado_em
      FROM public.certificados c
      JOIN public.aluno a ON a.id_aluno = c.id_aluno
      WHERE c.status_certificado = 'PENDENTE'
      ORDER BY c.criado_em ASC
    `);

    return res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar pendentes de validação:", error);
    return res.status(500).json({
      message: "Erro ao listar pendentes de validação.",
    });
  }
});

// Histórico de validações feitas por uma coordenação
router.get(
  "/coordenacao/:idCoordenacao",
  requireRole("COORDENACAO"),
  async (req, res) => {
    try {
      const { idCoordenacao } = req.params;
      const auth = req.auth!;

      if (String(auth.id_coordenacao) !== String(idCoordenacao)) {
        return res.status(403).json({
          message: "Você não tem permissão para ver o histórico de outra coordenação.",
        });
      }

      const result = await db.query(
        `
      SELECT
        v.id_validacao,
        v.id_certificado,
        v.id_coordenacao,
        v.horas_validadas,
        v.status_validacao,
        v.observacao,
        v.data_validacao,
        v.criado_em,
        c.titulo,
        c.id_aluno,
        a.nome AS nome_aluno
      FROM public.validacao v
      JOIN public.certificados c ON c.id_certificado = v.id_certificado
      JOIN public.aluno a ON a.id_aluno = c.id_aluno
      WHERE v.id_coordenacao = $1
      ORDER BY v.criado_em DESC
      `,
        [idCoordenacao]
      );

      return res.json(result.rows);
    } catch (error) {
      console.error("Erro ao listar validações da coordenação:", error);
      return res.status(500).json({
        message: "Erro ao listar validações da coordenação.",
      });
    }
  }
);

// Todas as validações já feitas para um certificado específico.
// Permitida tanto para a coordenação quanto para o próprio aluno dono do
// certificado (ele deve poder ver por que foi aprovado/reprovado).
router.get(
  "/certificado/:idCertificado",
  requireRole("COORDENACAO", "ALUNO"),
  async (req, res) => {
    try {
      const { idCertificado } = req.params;
      const auth = req.auth!;

      if (auth.tipo_usuario === "ALUNO") {
        const certificado = await db.query(
          `SELECT id_aluno FROM public.certificados WHERE id_certificado = $1`,
          [idCertificado]
        );

        if (certificado.rowCount === 0) {
          return res.status(404).json({ message: "Certificado não encontrado." });
        }

        if (String(auth.id_aluno) !== String(certificado.rows[0].id_aluno)) {
          return res.status(403).json({
            message: "Você não tem permissão para ver este certificado.",
          });
        }
      }

      const result = await db.query(
        `
      SELECT *
      FROM public.validacao
      WHERE id_certificado = $1
      ORDER BY criado_em DESC
      `,
        [idCertificado]
      );

      return res.json(result.rows);
    } catch (error) {
      console.error("Erro ao buscar validações do certificado:", error);
      return res.status(500).json({
        message: "Erro ao buscar validações do certificado.",
      });
    }
  }
);

// Coordenação aprova ou rejeita um certificado/relatório.
// Antes: qualquer pessoa podia chamar esta rota informando qualquer
// idCoordenacao no corpo — inclusive para auto-aprovar as próprias horas.
// Agora exige login como COORDENACAO e usa o id do token.
router.post("/", requireRole("COORDENACAO"), async (req, res) => {
  const idCoordenacao = req.auth!.id_coordenacao;
  const { idCertificado, statusValidacao, horasValidadas, observacao } = req.body;

  if (!idCertificado || !idCoordenacao || !statusValidacao) {
    return res.status(400).json({
      message: "Certificado, coordenação e status da validação são obrigatórios.",
    });
  }

  const status = String(statusValidacao).toUpperCase();

  if (!STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({
      message: "Status da validação inválido. Use APROVADO ou REPROVADO.",
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const certificado = await client.query(
      `
      SELECT quantidade_horas
      FROM public.certificados
      WHERE id_certificado = $1
      FOR UPDATE
      `,
      [idCertificado]
    );

    if (certificado.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Certificado não encontrado." });
    }

    const quantidadeHoras = Number(certificado.rows[0].quantidade_horas);
    let horasAprovadas = 0;

    if (status === "APROVADO") {
      horasAprovadas =
        horasValidadas !== undefined && horasValidadas !== null
          ? Number(horasValidadas)
          : quantidadeHoras;

      if (Number.isNaN(horasAprovadas) || horasAprovadas < 0 || horasAprovadas > quantidadeHoras) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: `Horas validadas devem estar entre 0 e ${quantidadeHoras}.`,
        });
      }
    }

    const validacao = await client.query(
      `
      INSERT INTO public.validacao (
        id_certificado,
        id_coordenacao,
        horas_validadas,
        status_validacao,
        observacao,
        data_validacao
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
      RETURNING *
      `,
      [idCertificado, idCoordenacao, horasAprovadas, status, observacao || null]
    );

    const certificadoAtualizado = await client.query(
      `
      UPDATE public.certificados
      SET status_certificado = $1,
          horas_aprovadas = $2,
          atualizado_em = now()
      WHERE id_certificado = $3
      RETURNING *
      `,
      [status, horasAprovadas, idCertificado]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Validação registrada com sucesso.",
      validacao: validacao.rows[0],
      certificado: certificadoAtualizado.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao validar certificado:", error);
    return res.status(500).json({
      message: "Erro ao validar certificado.",
    });
  } finally {
    client.release();
  }
});

export default router;
