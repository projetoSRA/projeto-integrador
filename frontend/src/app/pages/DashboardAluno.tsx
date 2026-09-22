import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { User } from "../utils/auth";
import { apiFetch } from "../utils/api";
import AlunoLayout, { glassCardStyle } from "../components/AlunoLayout";
import { panelStyle, cardStyle, buttonGlass } from "../../styles/uiStyles";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

import {
  Newspaper,
  ExternalLink,
  Clock3,
  FileBadge2,
  Download,
  Files,
} from "lucide-react";

type NewsItem = {
  id: number;
  titulo: string;
  origem: string;
  data: string;
  resumo: string;
  link: string;
};

export default function DashboardAluno() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  const [horas, setHoras] = useState(0);
  const [certificados, setCertificados] = useState(0);
  const [relatorios, setRelatorios] = useState(0);
  const [bimestrePortfolio, setBimestrePortfolio] = useState("1");
  const [gerandoPortfolio, setGerandoPortfolio] = useState(false);
  const noticias: NewsItem[] = [
    {
      id: 1,
      titulo: "Fatecs abrem prazo para pedir isenção e desconto na taxa do Vestibular",
      origem: "Fatec / CPS",
      data: "24/03/2026",
      resumo:
        "Pedido de isenção ou redução da taxa vai até 6 de abril. A prova do Vestibular das Fatecs está marcada para 28 de junho.",
      link: "https://www.cps.sp.gov.br/fatecs-abrem-prazo-para-pedir-isencao-e-desconto-na-taxa-do-vestibular/",
    },
    {
      id: 2,
      titulo: "Centro Paula Souza leva 11 projetos de estudantes de Etecs para a Febrace 2026",
      origem: "Etec / CPS",
      data: "16/03/2026",
      resumo:
        "Projetos das Etecs foram selecionados para a Febrace em áreas como sustentabilidade, saúde, inteligência artificial e prevenção de desastres.",
      link: "https://www.cps.sp.gov.br/centro-paula-souza-leva-11-projetos-de-estudantes-de-etecs-para-a-febrace-2026/",
    },
    {
      id: 3,
      titulo: "Centro Paula Souza lança desafio de inovação para estudantes de Etecs e Fatecs",
      origem: "CPS",
      data: "18/03/2026",
      resumo:
        "Ação de inovação com participação remota e classificação das melhores propostas para intercâmbio cultural na Inglaterra.",
      link: "https://www.cps.sp.gov.br/centro-paula-souza-lanca-desafio-de-inovacao-para-estudantes-de-etecs-e-fatecs/",
    },
  ];

  useEffect(() => {
    const userData = localStorage.getItem("user");

    if (!userData) {
      navigate("/");
      return;
    }

    const parsedUser = JSON.parse(userData) as User;

    if (parsedUser.type !== "aluno") {
      navigate("/");
      return;
    }

    if (parsedUser.precisaTrocarSenha) {
      navigate("/primeiro-acesso");
      return;
    }

    setUser(parsedUser);

    apiFetch(`${API_URL}/horas/aluno/${parsedUser.id}`)
    .then(res => res.json())
    .then(data => setHoras(data.totalHoras || 0))
    .catch(() => setHoras(0));

    apiFetch(`${API_URL}/certificados/aluno/${parsedUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setCertificados(
          data.filter((item: any) => item.tipo_arquivo !== "RELATORIO").length
        );
        setRelatorios(
          data.filter((item: any) => item.tipo_arquivo === "RELATORIO").length
        );
      })
      .catch(() => {
        setCertificados(0);
        setRelatorios(0);
      });
  }, [navigate]);

  const baixarPortfolio = async () => {
    if (!user) return;

    try {
      setGerandoPortfolio(true);

      const response = await apiFetch(
        `${API_URL}/portfolio/${user.id}/bimestre/${bimestrePortfolio}`
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Erro ao gerar o portfólio.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `portfolio-${user.identifier}-${bimestrePortfolio}bimestre.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error.message || "Erro ao gerar o portfólio.");
    } finally {
      setGerandoPortfolio(false);
    }
  };

  if (!user) return null;

  return (
    <AlunoLayout
      user={user}
      activePage="inicio"
      horas={horas}
      certificados={certificados}
      relatorios={relatorios}
    >
      <section className="mb-4 grid grid-cols-3 gap-2 sm:hidden" aria-label="Resumo do aluno">
        <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 text-center">
          <Clock3 className="mx-auto mb-1.5 size-5 text-blue-300" />
          <strong className="block text-lg leading-none text-white">{horas}h</strong>
          <span className="mt-1 block text-xs text-white/60">Horas</span>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 text-center">
          <FileBadge2 className="mx-auto mb-1.5 size-5 text-emerald-300" />
          <strong className="block text-lg leading-none text-white">{certificados}</strong>
          <span className="mt-1 block text-xs text-white/60">Certificados</span>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 text-center">
          <Files className="mx-auto mb-1.5 size-5 text-violet-300" />
          <strong className="block text-lg leading-none text-white">{relatorios}</strong>
          <span className="mt-1 block text-xs text-white/60">Relatórios</span>
        </div>
      </section>
      <Card
        className="gap-2 sm:gap-3 rounded-2xl border-0 shadow mb-4 sm:mb-6"
        style={panelStyle}
      >
        <CardHeader className="px-4 pt-4 pb-1 sm:px-6 sm:pt-6 sm:pb-2">
          <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
            <FileBadge2 className="size-4 sm:size-5" />
            Portfólio do Aluno
          </CardTitle>
        </CardHeader>

        <CardContent className="px-4 pt-1 pb-4 sm:px-6 sm:pt-2 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-2.5 sm:gap-3">
            <div className="flex-1">
              <label className="block text-white/70 text-xs sm:text-sm mb-1.5">Bimestre</label>
              <select
                value={bimestrePortfolio}
                onChange={(e) => setBimestrePortfolio(e.target.value)}
                className="w-full sm:w-48 rounded-xl bg-white/10 border border-white/10 px-3 py-2.5 text-sm sm:text-base text-white outline-none"
              >
                <option value="1" className="text-black">1º Bimestre</option>
                <option value="2" className="text-black">2º Bimestre</option>
                <option value="3" className="text-black">3º Bimestre</option>
                <option value="4" className="text-black">4º Bimestre</option>
              </select>
            </div>

            <Button
              type="button"
              onClick={baixarPortfolio}
              disabled={gerandoPortfolio}
              className="w-full sm:w-auto min-h-10 flex items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm sm:text-base text-[#2f3147] hover:bg-white/90"
            >
              <Download className="size-4" />
              {gerandoPortfolio ? "Gerando..." : "Baixar Portfólio (.docx)"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card
        className="gap-2 sm:gap-3 rounded-2xl border-0 shadow mb-6"
       style={panelStyle}
      >
        <CardHeader className="px-4 pt-4 pb-1 sm:px-6 sm:pt-6 sm:pb-2">
          <CardTitle className="text-base sm:text-lg leading-snug text-white flex items-start sm:items-center gap-2">
            <Newspaper className="size-4 sm:size-5 mt-0.5 sm:mt-0 shrink-0" />
            <span className="sm:hidden">Notícias recentes</span>
            <span className="hidden sm:inline">
              Notícias recentes - Etec, Fatec e Centro Paula Souza
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="px-3 pt-1 pb-3 sm:px-6 sm:pt-2 sm:pb-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
            {noticias.map((noticia) => (
              <a
                key={noticia.id}
                href={noticia.link}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl sm:rounded-2xl p-3 sm:p-4 transition hover:scale-[1.01] hover:bg-white/10"
               style={glassCardStyle}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-white/15 text-white">
                    {noticia.origem}
                  </span>
                  <ExternalLink className="size-4 text-white/80 shrink-0" />
                </div>

                <h3 className="text-white font-semibold text-sm sm:text-base leading-snug mb-1.5 sm:mb-2">
                  {noticia.titulo}
                </h3>

                <p className="line-clamp-3 text-white/75 text-sm leading-relaxed mb-3">
                  {noticia.resumo}
                </p>

                <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2.5">
                  <p className="text-white/60 text-xs">{noticia.data}</p>
                  <span className="text-xs font-semibold text-blue-300">Ver notícia</span>
                </div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </AlunoLayout>
  );
}
