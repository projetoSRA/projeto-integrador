import { Router } from "express";
import { db } from "../db";
import { requireAuth, requireSelfAlunoOrCoordenacao } from "../middleware/auth";
import { gerarPortfolioDocx } from "../utils/portfolioGenerator";

const router = Router();

router.use(requireAuth);

function formatarDataBr(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

// Gera o Portfólio do Aluno (.docx) de um bimestre, com base nos
// relatórios aprovados e visitas técnicas registradas naquele período.
// Acessível pelo próprio aluno ou pela coordenação (mesmo padrão de
// permissão usado em horas/certificados/eventos).
router.get(
  "/:idAluno/bimestre/:numero",
  requireSelfAlunoOrCoordenacao("idAluno"),
  async (req, res) => {
    try {
      const { idAluno, numero } = req.params;
      const bimestre = Number(numero);

      if (!Number.isInteger(bimestre) || bimestre < 1 || bimestre > 4) {
        return res.status(400).json({ message: "Bimestre inválido. Use um valor de 1 a 4." });
      }

      const alunoResult = await db.query(
        `
        SELECT nome, rm, ra, curso, nivel_ensino, serie_semestre,
               empresa_parceira_nome, empresa_parceira_representante
        FROM public.aluno
        WHERE id_aluno = $1
        `,
        [idAluno]
      );

      if (alunoResult.rowCount === 0) {
        return res.status(404).json({ message: "Aluno não encontrado." });
      }

      const alunoRow = alunoResult.rows[0];

      const coordenacaoResult = await db.query(
        `SELECT nome_coordenador FROM public.coordenacao ORDER BY id_coordenacao ASC LIMIT 1`
      );
      const nomeCoordenador = coordenacaoResult.rows[0]?.nome_coordenador || "Não informado";

      const relatoriosResult = await db.query(
        `
        SELECT titulo, local, conteudo, data_emissao, horas_aprovadas, categoria
        FROM public.certificados
        WHERE id_aluno = $1
          AND tipo_arquivo = 'RELATORIO'
          AND status_certificado = 'APROVADO'
          AND bimestre = $2
        ORDER BY data_emissao ASC
        `,
        [idAluno, bimestre]
      );

      const visitasResult = await db.query(
        `
        SELECT local, quantidade_horas, data_visita
        FROM public.visita
        WHERE id_aluno = $1 AND bimestre = $2
        ORDER BY data_visita ASC
        `,
        [idAluno, bimestre]
      );

      const buffer = await gerarPortfolioDocx({
        aluno: {
          nome: alunoRow.nome,
          identificador: alunoRow.nivel_ensino === "FACULDADE" ? alunoRow.ra : alunoRow.rm,
          curso: alunoRow.curso,
          serieSemestre: alunoRow.serie_semestre,
          empresaParceiraNome: alunoRow.empresa_parceira_nome,
          empresaParceiraRepresentante: alunoRow.empresa_parceira_representante,
        },
        coordenador: nomeCoordenador,
        bimestre,
        relatorios: relatoriosResult.rows.map((r) => ({
          local: r.local || "Não informado",
          data: formatarDataBr(r.data_emissao),
          horas: Number(r.horas_aprovadas),
          titulo: r.titulo,
          conteudo: r.conteudo || "",
          // Relatórios enviados antes desse campo existir não têm
          // categoria — tratamos como PALESTRA pra manter o comportamento
          // de antes (todos caíam na mesma seção) em vez de sumir do documento.
          categoria: (r.categoria || "PALESTRA") as "PALESTRA" | "CURSO" | "VISITA",
        })),
        visitas: visitasResult.rows.map((v) => ({
          local: v.local,
          data: formatarDataBr(v.data_visita),
          horas: Number(v.quantidade_horas),
        })),
      });

      const nomeArquivo = `portfolio-${alunoRow.rm || alunoRow.ra || idAluno}-${bimestre}bimestre.docx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
      return res.send(buffer);
    } catch (error) {
      console.error("Erro ao gerar portfólio:", error);
      return res.status(500).json({ message: "Erro ao gerar o portfólio." });
    }
  }
);

export default router;
