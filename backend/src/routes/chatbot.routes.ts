import { Router } from "express";
import { db } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// Assistente da coordenação: escopo fechado (sem LLM externo), só responde
// com dados agregados/consultas que a própria coordenação já pode ver nas
// telas do sistema (fila de validação, lista de alunos, eventos, seu
// próprio histórico de validações). Nunca expõe dado de uma coordenação
// para outra — o id sempre vem do token, nunca do corpo da requisição.
//
// Reconhecimento de intenção por pontuação: cada tópico tem uma lista ampla
// de palavras/expressões-gatilho; o tópico com mais gatilhos distintos no
// texto vence (ver contarOcorrencias). Só cai no fallback quando nada bate.
router.use(requireAuth, requireRole("COORDENACAO"));

const SUGESTOES_PADRAO = [
  "Quantos certificados estão pendentes?",
  "Quantos alunos já bateram a meta?",
  "Quais os próximos eventos?",
  "Meu histórico de validações",
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Conta quantos gatilhos distintos aparecem no texto, sem contar em dobro
// quando um gatilho é só um pedaço de outro que também bateu (ex.: "hora"
// e "horas" juntos na mesma lista não podem valer 2 pontos só porque a
// coordenação escreveu "horas" — senão um tópico "genérico" sempre ganharia
// de um tópico mais específico só por ter mais sinônimos parecidos entre
// si na lista).
function contarOcorrencias(texto: string, palavras: string[]): number {
  const encontrados = palavras.filter((palavra) => texto.includes(palavra));
  const maximais = encontrados.filter(
    (palavra) => !encontrados.some((outro) => outro !== palavra && outro.includes(palavra))
  );
  return maximais.length;
}

function contemAlguma(texto: string, palavras: string[]): boolean {
  return palavras.some((palavra) => texto.includes(palavra));
}

// Casamento por palavra/frase inteira (com \b), usado para os gatilhos
// curtos de saudação/ajuda ("oi", "ola" etc.) — com includes() simples, "oi"
// bateria dentro de "foi", fazendo qualquer pergunta com essa palavra cair
// no menu genérico em vez do tópico certo.
function contemPalavraInteira(texto: string, palavras: string[]): boolean {
  return palavras.some((palavra) => {
    const escapada = palavra.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escapada}\\b`).test(texto);
  });
}

type Resultado = { resposta: string; sugestoes: string[] };

async function responderPendencias(): Promise<Resultado> {
  const result = await db.query(
    `
    SELECT c.titulo, c.tipo_arquivo, a.nome AS nome_aluno, c.criado_em
    FROM public.certificados c
    JOIN public.aluno a ON a.id_aluno = c.id_aluno
    WHERE c.status_certificado = 'PENDENTE'
    ORDER BY c.criado_em ASC
    `
  );

  if (result.rowCount === 0) {
    return {
      resposta: "Não há certificados ou relatórios pendentes de validação no momento.",
      sugestoes: SUGESTOES_PADRAO,
    };
  }

  const total = result.rowCount;
  const primeiros = result.rows.slice(0, 5).map((item) => {
    const tipo = item.tipo_arquivo === "RELATORIO" ? "relatório" : "certificado";
    return `• ${item.nome_aluno} — ${tipo} "${item.titulo}"`;
  });

  const restante = total - primeiros.length;
  const listaTexto = primeiros.join("\n") + (restante > 0 ? `\n... e mais ${restante}.` : "");

  return {
    resposta: `Há ${total} item(ns) pendente(s) de validação:\n${listaTexto}`,
    sugestoes: ["Meu histórico de validações", "Quantos alunos já bateram a meta?"],
  };
}

async function responderMeuHistorico(idCoordenacao: number): Promise<Resultado> {
  const result = await db.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE status_validacao = 'APROVADO')::int AS aprovados,
      COUNT(*) FILTER (WHERE status_validacao = 'REPROVADO')::int AS reprovados
    FROM public.validacao
    WHERE id_coordenacao = $1
    `,
    [idCoordenacao]
  );

  const { aprovados, reprovados } = result.rows[0];

  if (aprovados === 0 && reprovados === 0) {
    return {
      resposta: "Você ainda não validou nenhum certificado ou relatório.",
      sugestoes: ["Quantos certificados estão pendentes?"],
    };
  }

  return {
    resposta: `Seu histórico de validações: ${aprovados} aprovado(s), ${reprovados} reprovado(s).`,
    sugestoes: ["Quantos certificados estão pendentes?"],
  };
}

async function responderEstatisticasAlunos(): Promise<Resultado> {
  const totalAlunos = await db.query(`SELECT COUNT(*)::int AS total FROM public.aluno`);

  const horasPorAluno = await db.query(`
    SELECT
      a.id_aluno,
      COALESCE(cert.horas, 0) + COALESCE(ev.horas, 0) + COALESCE(vis.horas, 0) AS total_horas
    FROM public.aluno a
    LEFT JOIN (
      SELECT id_aluno, SUM(horas_aprovadas) AS horas
      FROM public.certificados
      WHERE status_certificado = 'APROVADO'
      GROUP BY id_aluno
    ) cert ON cert.id_aluno = a.id_aluno
    LEFT JOIN (
      SELECT i.id_aluno, SUM(e.carga_horaria) AS horas
      FROM public.inscricao i
      JOIN public.eventos e ON e.id_evento = i.id_evento
      WHERE i.status_inscricao = 'PRESENTE'
      GROUP BY i.id_aluno
    ) ev ON ev.id_aluno = a.id_aluno
    LEFT JOIN (
      SELECT id_aluno, SUM(quantidade_horas) AS horas
      FROM public.visita
      GROUP BY id_aluno
    ) vis ON vis.id_aluno = a.id_aluno
  `);

  const meta = 200;
  const totalAlunosNum = totalAlunos.rows[0].total;
  const horas = horasPorAluno.rows.map((r) => Number(r.total_horas));
  const bateramMeta = horas.filter((h) => h >= meta).length;
  const media = horas.length > 0 ? horas.reduce((a, b) => a + b, 0) / horas.length : 0;

  return {
    resposta: `Você tem ${totalAlunosNum} aluno(s) cadastrado(s). ${bateramMeta} já bateram a meta de ${meta}h. Média geral: ${media.toFixed(1)}h por aluno.`,
    sugestoes: ["Quantos certificados estão pendentes?", "Quais os próximos eventos?"],
  };
}

async function responderProximosEventos(): Promise<Resultado> {
  const result = await db.query(
    `
    SELECT ev.titulo, ev.data_evento, ev.carga_horaria, emp.nome_empresa,
      (SELECT COUNT(*) FROM public.inscricao i WHERE i.id_evento = ev.id_evento)::int AS total_inscritos
    FROM public.eventos ev
    JOIN public.empresa emp ON emp.id_empresa = ev.id_empresa
    WHERE ev.data_evento >= CURRENT_DATE
    ORDER BY ev.data_evento ASC
    LIMIT 5
    `
  );

  if (result.rowCount === 0) {
    return {
      resposta: "Não há eventos futuros cadastrados no momento.",
      sugestoes: SUGESTOES_PADRAO,
    };
  }

  const lista = result.rows
    .map((ev) => {
      const data = new Date(ev.data_evento).toLocaleDateString("pt-BR");
      return `• ${ev.titulo} (${ev.nome_empresa}) — ${data}, ${ev.carga_horaria}h, ${ev.total_inscritos} inscrito(s)`;
    })
    .join("\n");

  return {
    resposta: `Próximos eventos:\n${lista}`,
    sugestoes: SUGESTOES_PADRAO,
  };
}

// Extrai um termo de busca (nome ou RM/RA) de uma pergunta em linguagem
// natural sobre um aluno específico. Prioriza uma sequência de dígitos
// (RM/RA); na ausência dela, remove palavras de parada comuns da pergunta
// e usa o que sobrar como nome. É uma heurística — sem um RM exato, a
// coordenação pode precisar reformular se o nome não for reconhecido.
const PALAVRAS_DE_PARADA = [
  "quantas",
  "quantos",
  "quanto",
  "qual",
  "quais",
  "horas",
  "hora",
  "tem",
  "tenho",
  "tera",
  "possui",
  "esta",
  "estao",
  "o",
  "a",
  "os",
  "as",
  "do",
  "da",
  "de",
  "dos",
  "das",
  "aluno",
  "aluna",
  "alunos",
  "alunas",
  "estudante",
  "estudantes",
  "chamado",
  "chamada",
  "nome",
  "certificado",
  "certificados",
  "relatorio",
  "relatorios",
  "pendente",
  "pendentes",
  "pendencia",
  "pendencias",
  "eu",
  "e",
  "ou",
  "um",
  "uma",
  "no",
  "na",
  "quero",
  "saber",
  "sobre",
  "informacoes",
  "dados",
  "perfil",
  "dele",
  "dela",
];

function extrairTermoBusca(mensagemOriginal: string): string | null {
  const digitos = mensagemOriginal.match(/\d{3,}/);
  if (digitos) return digitos[0];

  const semPontuacao = normalizar(mensagemOriginal).replace(/[^a-z0-9\s]/g, " ");
  const termo = semPontuacao
    .split(/\s+/)
    .filter((palavra) => palavra && !PALAVRAS_DE_PARADA.includes(palavra))
    .join(" ")
    .trim();

  return termo.length >= 2 ? termo : null;
}

// Usa a extensão unaccent do Postgres para achar "sergio" mesmo quando o
// nome no banco está com acento ("SÉRGIO") — sem isso, o aluno buscado por
// nome sem acento não era encontrado. Se o banco for recriado do zero,
// rode `CREATE EXTENSION IF NOT EXISTS unaccent;` antes de usar essa busca
// (o Supabase não vem com ela ativada por padrão).
async function buscarAlunoPorTermo(termo: string) {
  return db.query(
    `
    SELECT
      a.id_aluno,
      a.nome,
      a.rm,
      a.ra,
      a.curso,
      COALESCE(cert.horas_certificados, 0) + COALESCE(cert.horas_relatorios, 0)
        + COALESCE(ev.horas_eventos, 0) + COALESCE(vis.horas_visitas, 0) AS total_horas,
      COALESCE(cert.pendentes, 0)::int AS pendentes_count
    FROM public.aluno a
    LEFT JOIN (
      SELECT
        id_aluno,
        SUM(horas_aprovadas) FILTER (WHERE tipo_arquivo = 'CERTIFICADO' AND status_certificado = 'APROVADO') AS horas_certificados,
        SUM(horas_aprovadas) FILTER (WHERE tipo_arquivo = 'RELATORIO' AND status_certificado = 'APROVADO') AS horas_relatorios,
        COUNT(*) FILTER (WHERE status_certificado = 'PENDENTE') AS pendentes
      FROM public.certificados
      GROUP BY id_aluno
    ) cert ON cert.id_aluno = a.id_aluno
    LEFT JOIN (
      SELECT i.id_aluno, SUM(e.carga_horaria) AS horas_eventos
      FROM public.inscricao i
      JOIN public.eventos e ON e.id_evento = i.id_evento
      WHERE i.status_inscricao = 'PRESENTE'
      GROUP BY i.id_aluno
    ) ev ON ev.id_aluno = a.id_aluno
    LEFT JOIN (
      SELECT id_aluno, SUM(quantidade_horas) AS horas_visitas
      FROM public.visita
      GROUP BY id_aluno
    ) vis ON vis.id_aluno = a.id_aluno
    WHERE unaccent(a.nome) ILIKE unaccent('%' || $1 || '%')
       OR a.rm ILIKE '%' || $1 || '%'
       OR a.ra ILIKE '%' || $1 || '%'
    ORDER BY a.nome ASC
    LIMIT 6
    `,
    [termo]
  );
}

function formatarResultadoBusca(termo: string, rows: any[]): Resultado {
  if (rows.length > 1) {
    const lista = rows.map((a) => `• ${a.nome} — RM/RA ${a.rm || a.ra}`).join("\n");
    return {
      resposta: `Encontrei mais de um aluno com "${termo}". Pode especificar o RM?\n${lista}`,
      sugestoes: SUGESTOES_PADRAO,
    };
  }

  const aluno = rows[0];
  return {
    resposta: `${aluno.nome} (RM/RA ${aluno.rm || aluno.ra}, ${aluno.curso || "curso não informado"}): ${aluno.total_horas}h de 200h, ${aluno.pendentes_count} certificado(s)/relatório(s) pendente(s).`,
    sugestoes: SUGESTOES_PADRAO,
  };
}

// Usada quando a pergunta deixa claro que é sobre um aluno específico
// ("aluno", "aluna", "RM ..."): se não achar ninguém, é honesto dizer que
// não encontrou.
async function responderBuscaAluno(termo: string): Promise<Resultado> {
  const result = await buscarAlunoPorTermo(termo);

  if (result.rowCount === 0) {
    return {
      resposta: `Não encontrei nenhum aluno com "${termo}" no nome, RM ou RA.`,
      sugestoes: SUGESTOES_PADRAO,
    };
  }

  return formatarResultadoBusca(termo, result.rows);
}

// Última tentativa antes de desistir (fallback): a coordenação pode digitar
// só um nome ("allan") ou uma pergunta sem palavras-gatilho ("pedro tem
// quantas horas?"). Só usada quando nenhum tópico bateu; se não encontrar
// ninguém, devolve null e quem chamou cai no fallback genérico — não faz
// sentido dizer "não encontrei aluno" para uma pergunta que talvez nem
// fosse sobre um aluno (ex.: "conte uma piada").
async function tentarBuscaSilenciosa(termo: string): Promise<Resultado | null> {
  const result = await buscarAlunoPorTermo(termo);
  if (result.rowCount === 0) return null;
  return formatarResultadoBusca(termo, result.rows);
}

const RESPOSTA_MENU: Resultado = {
  resposta:
    "Posso te ajudar com: pendências de validação, dados de um aluno específico (por nome ou RM), estatísticas gerais dos alunos, próximos eventos e seu histórico de validações. O que você quer saber?",
  sugestoes: SUGESTOES_PADRAO,
};

const RESPOSTA_FALLBACK: Resultado = {
  resposta:
    "Não entendi essa pergunta. Posso responder sobre pendências de validação, dados de um aluno, estatísticas gerais e eventos — tenta uma das opções abaixo.",
  sugestoes: SUGESTOES_PADRAO,
};

const SAUDACAO = ["oi", "ola", "bom dia", "boa tarde", "boa noite", "eae", "salve", "e ai"];
const AJUDA = [
  "ajuda",
  "menu",
  "o que voce faz",
  "o que voce sabe",
  "o que voce consegue",
  "quais comandos",
  "como voce funciona",
];

const GATILHOS_PENDENCIAS = [
  "pendente",
  "pendentes",
  "fila de validacao",
  "para aprovar",
  "pra aprovar",
  "para validar",
  "pra validar",
  "para revisar",
  "pra revisar",
  "algo pra validar",
  "algo para validar",
  "coisa pra validar",
  "aguardando aprovacao",
  "aguardando validacao",
  "falta validar",
  "falta aprovar",
];

const GATILHOS_HISTORICO = [
  "meu historico",
  "minhas validacoes",
  "validacoes eu fiz",
  "validacoes eu ja fiz",
  "validacoes ja fiz",
  "certificados eu ja validei",
  "certificados ja validei",
  "ja validei",
  "ja aprovei",
  "ja reprovei",
  "eu ja aprovei",
  "eu ja reprovei",
  "eu aprovei",
  "eu reprovei",
];

const GATILHOS_ESTATISTICAS = [
  "quantos alunos",
  "quantos estudantes",
  "media de horas",
  "media geral",
  "bateram a meta",
  "quantos ja bateram",
  "total de alunos",
];

const GATILHOS_EVENTOS = [
  "evento",
  "eventos",
  "palestra",
  "palestras",
  "agenda",
  "programacao",
  "proximo evento",
  "proxima palestra",
];

// Só a forma singular ("aluno"/"aluna") conta como "pergunta sobre UM
// aluno específico" — "alunos"/"alunas" no plural é sinal de pergunta
// agregada (estatísticas) e não deve disparar uma busca por nome/RM.
// contemPalavraInteira (com \b) garante que "alunos" não bata em "aluno".
const GATILHOS_ALUNO_ESPECIFICO = ["aluno", "aluna", "estudante"];

// Palavras que, sozinhas na mensagem, quase certamente não são o nome de
// um aluno — usado só para a tentativa silenciosa de última instância
// (mensagem sem nenhuma palavra-gatilho de tópico nem menção a "aluno"),
// pra não tentar buscar "conte uma piada" como se fosse nome de aluno.
const PALAVRAS_CLARAMENTE_FORA_DE_ESCOPO = [
  "piada",
  "jogo",
  "resultado",
  "tempo",
  "previsao",
  "futebol",
  "time",
  "filme",
  "musica",
  "dinheiro",
  "clima",
  "noticia",
  "receita",
  "signo",
];

router.post("/mensagem", async (req, res) => {
  try {
    const idCoordenacao = req.auth!.id_coordenacao;
    const mensagemOriginal = req.body?.mensagem;

    if (!idCoordenacao) {
      return res.status(400).json({ message: "Coordenação não identificada no token." });
    }

    if (typeof mensagemOriginal !== "string" || !mensagemOriginal.trim()) {
      return res.status(400).json({ message: "Envie uma mensagem." });
    }

    const mensagemLimitada = mensagemOriginal.slice(0, 500);
    const texto = normalizar(mensagemLimitada);
    const textoComEspacos = ` ${texto} `;

    let resultado: Resultado;

    const mencionaAlunoEspecifico =
      contemPalavraInteira(texto, GATILHOS_ALUNO_ESPECIFICO) ||
      contemAlguma(textoComEspacos, [" rm ", " ra "]);

    if (contemPalavraInteira(texto, SAUDACAO) || contemPalavraInteira(texto, AJUDA)) {
      resultado = RESPOSTA_MENU;
    } else if (mencionaAlunoEspecifico) {
      // Mencionar um aluno específico (singular) é um sinal forte e
      // prioritário — vence mesmo que a mensagem também contenha palavras
      // de outro tópico (ex.: "certificados pendentes do aluno pedro" deve
      // buscar o Pedro, não listar a fila geral de pendências).
      const termo = extrairTermoBusca(mensagemLimitada);
      resultado = termo
        ? await responderBuscaAluno(termo)
        : {
            resposta: "Sobre qual aluno você quer saber? Me diga o nome ou o RM.",
            sugestoes: SUGESTOES_PADRAO,
          };
    } else {
      const pontuacoes = [
        { nome: "pendencias", pontos: contarOcorrencias(texto, GATILHOS_PENDENCIAS) },
        { nome: "historico", pontos: contarOcorrencias(texto, GATILHOS_HISTORICO) },
        { nome: "estatisticas", pontos: contarOcorrencias(texto, GATILHOS_ESTATISTICAS) },
        { nome: "eventos", pontos: contarOcorrencias(texto, GATILHOS_EVENTOS) },
      ];

      let melhor = pontuacoes[0];
      for (const item of pontuacoes) {
        if (item.pontos > melhor.pontos) melhor = item;
      }

      if (melhor.pontos > 0 && melhor.nome === "pendencias") {
        resultado = await responderPendencias();
      } else if (melhor.pontos > 0 && melhor.nome === "historico") {
        resultado = await responderMeuHistorico(idCoordenacao);
      } else if (melhor.pontos > 0 && melhor.nome === "estatisticas") {
        resultado = await responderEstatisticasAlunos();
      } else if (melhor.pontos > 0 && melhor.nome === "eventos") {
        resultado = await responderProximosEventos();
      } else {
        // Nenhum tópico bateu: pode ser só um nome digitado direto
        // ("allan") ou uma pergunta sem palavra-gatilho ("pedro tem
        // quantas horas?"). Tenta uma busca silenciosa antes de desistir,
        // a menos que a mensagem claramente não seja sobre um aluno.
        const pareceForaDeEscopo = contemAlguma(texto, PALAVRAS_CLARAMENTE_FORA_DE_ESCOPO);
        const termo = pareceForaDeEscopo ? null : extrairTermoBusca(mensagemLimitada);
        resultado = termo ? (await tentarBuscaSilenciosa(termo)) ?? RESPOSTA_FALLBACK : RESPOSTA_FALLBACK;
      }
    }

    return res.json(resultado);
  } catch (error) {
    console.error("Erro no chatbot da coordenação:", error);
    return res.status(500).json({ message: "Erro ao processar a mensagem." });
  }
});

export default router;
