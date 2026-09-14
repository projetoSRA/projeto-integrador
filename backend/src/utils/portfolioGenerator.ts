// Monta o "Portfólio do Aluno" (documento bimestral) em .docx a partir de
// dados já validados/aprovados no sistema. Layout inspirado no modelo
// oficial da coordenação (cabeçalho de identificação + seção "Palestras"
// montada a partir dos relatórios aprovados no bimestre + visitas técnicas
// já estruturadas). As seções de assinatura/parecer do modelo oficial não
// entram aqui — continuam sendo preenchidas manualmente no documento físico.
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  AlignmentType,
} from "docx";

export type PortfolioAluno = {
  nome: string;
  identificador: string; // RM ou RA, já resolvido
  curso: string | null;
  serieSemestre: string | null;
  empresaParceiraNome: string | null;
  empresaParceiraRepresentante: string | null;
};

export type CategoriaRelatorio = "PALESTRA" | "CURSO" | "VISITA";

export type PortfolioRelatorio = {
  local: string;
  data: string; // já formatada dd/mm/aaaa
  horas: number;
  titulo: string;
  conteudo: string;
  categoria: CategoriaRelatorio;
};

export type PortfolioVisita = {
  local: string;
  data: string; // já formatada dd/mm/aaaa
  horas: number;
};

export type PortfolioDados = {
  aluno: PortfolioAluno;
  coordenador: string;
  bimestre: number;
  relatorios: PortfolioRelatorio[];
  visitas: PortfolioVisita[];
};

const CINZA_CLARO = "F2F2F2";

function linhaRotulo(rotulo: string, valor: string) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: rotulo, bold: true }),
      new TextRun({ text: valor || "Não informado" }),
    ],
  });
}

function celula(children: Paragraph[], opcoes: { width?: number; columnSpan?: number; shading?: string } = {}) {
  return new TableCell({
    width: { size: opcoes.width || 100, type: WidthType.PERCENTAGE },
    columnSpan: opcoes.columnSpan,
    shading: opcoes.shading ? { type: ShadingType.CLEAR, fill: opcoes.shading } : undefined,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children,
  });
}

function tituloSecao(texto: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text: texto, bold: true })],
  });
}

function separador() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "AAAAAA" } },
    spacing: { before: 200, after: 200 },
  });
}

// O conteúdo é digitado pelo aluno em uma textarea (texto corrido, sem
// formatação rica) — cada linha em branco vira um novo parágrafo, pra não
// jogar tudo grudado num bloco só nem depender de o aluno usar marcação
// especial.
function paragrafosDeTexto(texto: string): Paragraph[] {
  return texto
    .split(/\n+/)
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0)
    .map(
      (linha) =>
        new Paragraph({
          spacing: { after: 120 },
          alignment: AlignmentType.JUSTIFIED,
          children: [new TextRun({ text: linha })],
        })
    );
}

function blocoRelatorio(dados: PortfolioRelatorio, aluno: PortfolioAluno): Paragraph[] {
  return [
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: `Local: ${dados.local}   `, bold: true }),
        new TextRun({ text: `Data: ${dados.data}   `, bold: true }),
        new TextRun({ text: `Carga horária: ${dados.horas}h`, bold: true }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: "Curso: " }),
        new TextRun({ text: `${aluno.curso || "Não informado"}   ` }),
        new TextRun({ text: `Aluno: ${aluno.nome}` }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "Relatório: ", bold: true }),
        new TextRun({ text: dados.titulo, bold: true }),
      ],
    }),
    ...paragrafosDeTexto(dados.conteudo),
    separador(),
  ];
}

function tabelaVisitas(visitas: PortfolioVisita[]) {
  const cabecalho = new TableRow({
    children: [
      celula([new Paragraph({ children: [new TextRun({ text: "Local", bold: true })] })], {
        width: 50,
        shading: CINZA_CLARO,
      }),
      celula([new Paragraph({ children: [new TextRun({ text: "Data", bold: true })] })], {
        width: 25,
        shading: CINZA_CLARO,
      }),
      celula([new Paragraph({ children: [new TextRun({ text: "Carga horária", bold: true })] })], {
        width: 25,
        shading: CINZA_CLARO,
      }),
    ],
  });

  const linhas = visitas.map(
    (v) =>
      new TableRow({
        children: [
          celula([new Paragraph({ children: [new TextRun({ text: v.local })] })], { width: 50 }),
          celula([new Paragraph({ children: [new TextRun({ text: v.data })] })], { width: 25 }),
          celula([new Paragraph({ children: [new TextRun({ text: `${v.horas}h` })] })], { width: 25 }),
        ],
      })
  );

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [cabecalho, ...linhas] });
}

export async function gerarPortfolioDocx(dados: PortfolioDados): Promise<Buffer> {
  const { aluno, coordenador, bimestre, relatorios, visitas } = dados;

  function secaoVazia(mensagem: string): Paragraph[] {
    return [
      new Paragraph({
        spacing: { after: 150 },
        children: [new TextRun({ text: mensagem, italics: true, color: "666666" })],
      }),
    ];
  }

  // Cada relatório aprovado é classificado pelo aluno no envio (Palestra,
  // Curso ou Visita) — isso é o que permite montar seções separadas no
  // documento em vez de jogar tudo em "Palestras", como era antes desse
  // campo existir.
  const porCategoria = (categoria: CategoriaRelatorio) =>
    relatorios.filter((r) => r.categoria === categoria);

  const relatoriosPalestra = porCategoria("PALESTRA");
  const relatoriosCurso = porCategoria("CURSO");
  const relatoriosVisita = porCategoria("VISITA");

  const secaoPalestras =
    relatoriosPalestra.length > 0
      ? relatoriosPalestra.flatMap((r) => blocoRelatorio(r, aluno))
      : secaoVazia("Nenhum relatório de palestra aprovado neste bimestre até o momento.");

  const secaoCursos =
    relatoriosCurso.length > 0
      ? relatoriosCurso.flatMap((r) => blocoRelatorio(r, aluno))
      : secaoVazia("Nenhum relatório de curso aprovado neste bimestre até o momento.");

  const secaoVisitasRelatorios =
    relatoriosVisita.length > 0 ? relatoriosVisita.flatMap((r) => blocoRelatorio(r, aluno)) : [];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [new TextRun({ text: "PORTFÓLIO DO ALUNO", bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: "Etec Jacinto Ferreira de Sá – Ourinhos-SP" })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [new TextRun({ text: `${bimestre}º Bimestre`, bold: true })],
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  celula([linhaRotulo("Aluno(a): ", aluno.nome)], { width: 60 }),
                  celula([linhaRotulo("RM/RA: ", aluno.identificador)], { width: 40 }),
                ],
              }),
              new TableRow({
                children: [
                  celula(
                    [
                      linhaRotulo("Habilitação Profissional/Curso: ", aluno.curso || ""),
                      linhaRotulo("Série/Turma: ", aluno.serieSemestre || ""),
                    ],
                    { width: 100, columnSpan: 2 }
                  ),
                ],
              }),
              new TableRow({
                children: [
                  celula([linhaRotulo("Nome do(a) Coordenador(a) de Curso: ", coordenador)], {
                    width: 100,
                    columnSpan: 2,
                  }),
                ],
              }),
              new TableRow({
                children: [
                  celula([linhaRotulo("Nome da Empresa Parceira: ", aluno.empresaParceiraNome || "")], {
                    width: 100,
                    columnSpan: 2,
                  }),
                ],
              }),
              new TableRow({
                children: [
                  celula(
                    [
                      linhaRotulo(
                        "Representante da Empresa Parceira: ",
                        aluno.empresaParceiraRepresentante || ""
                      ),
                    ],
                    { width: 100, columnSpan: 2 }
                  ),
                ],
              }),
            ],
          }),

          tituloSecao("Atividades realizadas"),
          new Paragraph({
            spacing: { after: 150 },
            children: [new TextRun({ text: "Palestras", bold: true, underline: {} })],
          }),
          ...secaoPalestras,

          new Paragraph({
            spacing: { after: 150 },
            children: [new TextRun({ text: "Visitas técnicas", bold: true, underline: {} })],
          }),
          visitas.length > 0
            ? tabelaVisitas(visitas)
            : secaoVazia("Nenhuma visita técnica registrada pela coordenação neste bimestre.")[0],
          ...(secaoVisitasRelatorios.length > 0
            ? secaoVisitasRelatorios
            : secaoVazia("Nenhum relatório de visita aprovado neste bimestre até o momento.")),
          separador(),

          new Paragraph({
            spacing: { after: 150 },
            children: [new TextRun({ text: "Cursos flexíveis", bold: true, underline: {} })],
          }),
          ...secaoCursos,

          new Paragraph({
            spacing: { before: 300 },
            children: [
              new TextRun({
                text: "Outras atividades, Acompanhamento da coordenação, Acompanhamento da empresa parceira, Parecer final e Feedback ao aluno seguem sendo preenchidos manualmente no documento oficial.",
                italics: true,
                color: "666666",
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
