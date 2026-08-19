import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { User } from "../utils/auth";
import AlunoLayout, { glassCardStyle } from "../components/AlunoLayout";
import { panelStyle, cardStyle, buttonGlass } from "../../styles/uiStyles";

import {
  Newspaper,
  ExternalLink,
  Clock3,
  FileBadge2,
  Mic2,
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

    setUser(parsedUser);

    fetch(`http://localhost:3000/aluno/horas/${parsedUser.identifier}`)
    .then(res => res.json())
    .then(data => setHoras(data.horas))
    .catch(() => setHoras(0));
  }, [navigate]);

  if (!user) return null;

  return (
    <AlunoLayout user={user} activePage="inicio" horas={horas}>
      <Card
        className="rounded-2xl border-0 shadow mb-6"
       style={panelStyle}
      >
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Newspaper className="size-5" />
            Notícias recentes - Etec, Fatec e Centro Paula Souza
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {noticias.map((noticia) => (
              <a
                key={noticia.id}
                href={noticia.link}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl p-4 transition hover:scale-[1.01] hover:bg-white/10"
               style={glassCardStyle}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-white/15 text-white">
                    {noticia.origem}
                  </span>
                  <ExternalLink className="size-4 text-white/80 shrink-0" />
                </div>

                <h3 className="text-white font-semibold text-base mb-2">
                  {noticia.titulo}
                </h3>

                <p className="text-white/80 text-sm mb-3">
                  {noticia.resumo}
                </p>

                <p className="text-white/70 text-xs">
                  Publicado em {noticia.data}
                </p>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </AlunoLayout>
  );
}