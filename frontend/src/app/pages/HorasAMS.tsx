import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { User } from "../utils/auth";
import AlunoLayout, {
  glassCardStyle
} from "../components/AlunoLayout";
import { panelStyle, cardStyle, buttonGlass } from "../../styles/uiStyles";
import { Clock3 } from "lucide-react";

type ResumoHoras = {
  totalCertificados: number;
  totalRelatorios: number;
  totalEventos: number;
  horasCertificados: number;
  horasRelatorios: number;
  horasEventos: number;
  totalHoras: number;
  totalAlvo: number;
  horasRestantes: number;
};

type RegistroHora = {
  titulo: string;
  quantidadeHoras: number;
  categoria: "evento" | "certificado" | "relatorio";
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function HorasAMS() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [resumo, setResumo] = useState<ResumoHoras | null>(null);
  const [dados, setDados] = useState<RegistroHora[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    async function carregarHoras() {
      try {
        setLoading(true);

        const response = await fetch(`${API_URL}/horas/aluno/${user.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Erro ao buscar horas");
        }

        setResumo(data);

        const detalhes: RegistroHora[] = [
          {
            titulo: "Eventos presenciais",
            quantidadeHoras: Number(data.horasEventos || 0),
            categoria: "evento",
          },
          {
            titulo: "Certificados aprovados",
            quantidadeHoras: Number(data.horasCertificados || 0),
            categoria: "certificado",
          },
          {
            titulo: "Relatórios aprovados",
            quantidadeHoras: Number(data.horasRelatorios || 0),
            categoria: "relatorio",
          },
        ];

        setDados(detalhes);
      } catch (error) {
        console.error("Erro ao carregar horas:", error);
        setResumo(null);
        setDados([]);
      } finally {
        setLoading(false);
      }
    }

    carregarHoras();
  }, [user]);

  const horasEventos = resumo?.horasEventos ?? 0;
  const horasCertificados = resumo?.horasCertificados ?? 0;
  const horasRelatorios = resumo?.horasRelatorios ?? 0;

  const totalEventos = resumo?.totalEventos ?? 0;
  const totalCertificados = resumo?.totalCertificados ?? 0;
  const totalRelatorios = resumo?.totalRelatorios ?? 0;

  const totalHoras = resumo?.totalHoras ?? 0;
  const totalAlvo = resumo?.totalAlvo ?? 200;
  const horasRestantes = resumo?.horasRestantes ?? totalAlvo;

  const progresso = useMemo(() => {
    if (!totalAlvo) return 0;
    return Math.min((totalHoras / totalAlvo) * 100, 100);
  }, [totalHoras, totalAlvo]);

  if (!user) return null;

  return (
    <AlunoLayout user={user} activePage="horas" horas={totalHoras}>
      <Card
        className="rounded-2xl border-0 shadow mb-6"
        style={panelStyle}
      >
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock3 className="size-5 text-blue-400" />
            Minhas Horas
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div
              className="rounded-2xl p-6 text-white"
              style={glassCardStyle}
            >
              Carregando horas...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-2xl p-5" style={glassCardStyle}>
                  <h3 className="text-white font-semibold mb-4">
                    Progresso geral
                  </h3>

                  <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progresso}%`,
                        background:
                          "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
                      }}
                    />
                  </div>

                  <p className="text-white/90 text-sm mb-1">
                    {totalHoras}h de {totalAlvo}h concluídas
                  </p>

                  <p className="text-white/70 text-sm">
                    Faltam {horasRestantes}h para completar a carga total.
                  </p>

                  <div className="grid grid-cols-3 gap-3 mt-6">
                    <div className="rounded-xl bg-white/10 p-4 text-center">
                      <p className="text-white/70 text-sm">Eventos</p>
                      <p className="text-white text-xl font-semibold">
                        {horasEventos}h
                      </p>
                      <p className="text-white/50 text-xs mt-1">
                        {totalEventos} registros
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/10 p-4 text-center">
                      <p className="text-white/70 text-sm">Certificados</p>
                      <p className="text-white text-xl font-semibold">
                        {horasCertificados}h
                      </p>
                      <p className="text-white/50 text-xs mt-1">
                        {totalCertificados} arquivos
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/10 p-4 text-center">
                      <p className="text-white/70 text-sm">Relatórios</p>
                      <p className="text-white text-xl font-semibold">
                        {horasRelatorios}h
                      </p>
                      <p className="text-white/50 text-xs mt-1">
                        {totalRelatorios} arquivos
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl p-5" style={glassCardStyle}>
                  <h3 className="text-white font-semibold mb-4">
                    Resumo das categorias
                  </h3>

                  <div className="space-y-4">
                    {[
                      ["Eventos", horasEventos],
                      ["Certificados", horasCertificados],
                      ["Relatórios", horasRelatorios],
                      ["Faltante", horasRestantes],
                    ].map(([label, value]) => (
                      <div key={String(label)}>
                        <div className="flex justify-between text-sm text-white mb-1">
                          <span>{label}</span>
                          <span>{value}h</span>
                        </div>

                        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-400"
                            style={{
                              width: `${Math.min(
                                (Number(value) / totalAlvo) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl p-5" style={glassCardStyle}>
                <h3 className="text-white font-semibold mb-4">
                  Detalhamento
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-white">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="pb-3 pr-4">Título</th>
                        <th className="pb-3 pr-4">Categoria</th>
                        <th className="pb-3">Horas</th>
                      </tr>
                    </thead>

                    <tbody>
                      {dados.map((item, index) => (
                        <tr
                          key={`${item.titulo}-${index}`}
                          className="border-b border-white/5"
                        >
                          <td className="py-3 pr-4 text-white/90">
                            {item.titulo}
                          </td>

                          <td className="py-3 pr-4 text-white/70 capitalize">
                            {item.categoria}
                          </td>

                          <td className="py-3 text-white/90">
                            {item.quantidadeHoras}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AlunoLayout>
  );
}