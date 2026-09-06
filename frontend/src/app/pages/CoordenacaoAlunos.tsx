import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { User } from "../utils/auth";
import { apiFetch, clearSession } from "../utils/api";
import { panelStyle, cardStyle } from "../../styles/uiStyles";
import { ArrowLeft, Clock, LogOut, Search, Users } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

type AlunoResumo = {
  id_aluno: number;
  nome: string;
  email: string;
  rm: string | null;
  ra: string | null;
  curso: string | null;
  nivel_ensino: "MEDIO" | "FACULDADE" | null;
  serie_semestre: string | null;
  total_horas: number;
  total_eventos: number;
  ultima_atividade: string | null;
};

function formatarData(dataISO: string | null) {
  if (!dataISO) return "-";

  const data = new Date(dataISO);
  if (Number.isNaN(data.getTime())) return "-";

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function CoordenacaoAlunos() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  const [alunos, setAlunos] = useState<AlunoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/");
      return;
    }

    const parsedUser = JSON.parse(userData) as User;
    if (parsedUser.type !== "coordenacao") {
      navigate("/");
      return;
    }

    setUser(parsedUser);
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);

        const query = busca.trim() ? `?busca=${encodeURIComponent(busca.trim())}` : "";
        const response = await apiFetch(`${API_URL}/aluno${query}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Erro ao carregar alunos");
        }

        setAlunos(data);
      } catch (error) {
        console.error("Erro ao carregar alunos:", error);
        setAlunos([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [user, busca]);

  const totalAlunos = useMemo(() => alunos.length, [alunos]);

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  if (!user) return null;

  return (
    <div className="size-full p-4" style={{ background: "#15182e" }}>
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 p-4 sm:p-6 bg-white rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Users className="size-8 text-primary shrink-0" />
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">Alunos</h1>
              <p className="text-sm text-muted-foreground">
                Consulte o histórico de horas de cada aluno
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={() => navigate("/coordenacao")}
              variant="outline"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2"
            >
              <ArrowLeft className="size-4" />
              Voltar
            </Button>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2"
            >
              <LogOut className="size-4" />
              Sair
            </Button>
          </div>
        </header>

        <Card className="rounded-2xl border-0 shadow" style={panelStyle}>
          <CardHeader>
            <CardTitle className="text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Clock className="size-5 shrink-0" />
                {loading ? "Carregando..." : `${totalAlunos} aluno(s)`}
              </span>

              <div className="relative w-full sm:w-72">
                <Search className="size-4 text-white/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, RM ou RA..."
                  className="w-full rounded-xl bg-white/10 border border-white/10 py-2 pl-10 pr-3 text-white placeholder:text-white/50 outline-none"
                />
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loading && (
              <div className="rounded-2xl bg-white/10 p-8 text-center">
                <p className="text-white/70">Carregando alunos...</p>
              </div>
            )}

            {!loading && alunos.length === 0 && (
              <div className="rounded-2xl bg-white/10 p-8 text-center">
                <Users className="size-10 text-white/70 mx-auto mb-3" />
                <h3 className="text-white text-lg font-semibold mb-1">
                  Nenhum aluno encontrado
                </h3>
                <p className="text-white/70">
                  Ajuste a busca ou aguarde novos cadastros.
                </p>
              </div>
            )}

            {!loading && alunos.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {alunos.map((aluno) => (
                  <button
                    key={aluno.id_aluno}
                    type="button"
                    onClick={() => navigate(`/coordenacao/alunos/${aluno.id_aluno}`)}
                    className="text-left rounded-2xl bg-white/10 p-5 border border-white/10 hover:bg-white/15 transition"
                    style={cardStyle}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-white font-semibold text-lg">
                          {aluno.nome}
                        </h3>
                        <p className="text-white/70 text-sm">{aluno.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p className="text-white/70">
                        {aluno.nivel_ensino === "FACULDADE" ? "RA:" : "RM:"}{" "}
                        <span className="text-white">
                          {aluno.nivel_ensino === "FACULDADE" ? aluno.ra : aluno.rm}
                        </span>
                      </p>
                      <p className="text-white/70">
                        Curso:{" "}
                        <span className="text-white">
                          {aluno.curso || "-"}
                          {aluno.serie_semestre ? ` · ${aluno.serie_semestre}` : ""}
                        </span>
                      </p>
                      <p className="text-white/70">
                        Total de horas:{" "}
                        <span className="text-white font-semibold">
                          {Number(aluno.total_horas || 0)}h
                        </span>
                      </p>
                      <p className="text-white/70">
                        Última atividade:{" "}
                        <span className="text-white">
                          {formatarData(aluno.ultima_atividade)}
                        </span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
