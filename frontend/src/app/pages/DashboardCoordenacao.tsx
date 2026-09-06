import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { User } from "../utils/auth";
import { apiFetch, clearSession } from "../utils/api";
import { panelStyle, cardStyle } from "../../styles/uiStyles";
import {
  CheckCircle2,
  Clock,
  Eye,
  History,
  LogOut,
  Users,
  X,
  XCircle,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

type Pendente = {
  id_certificado: number;
  id_aluno: number;
  nome_aluno: string;
  email_aluno: string;
  titulo: string;
  instituicao: string | null;
  quantidade_horas: number;
  data_emissao: string;
  tipo_arquivo: "CERTIFICADO" | "RELATORIO";
  nome_arquivo: string | null;
  mime_type: string | null;
  url_publica: string | null;
  status_certificado: string;
  criado_em: string;
};

type Historico = {
  id_validacao: number;
  id_certificado: number;
  horas_validadas: number;
  status_validacao: string;
  observacao: string | null;
  data_validacao: string;
  criado_em: string;
  titulo: string;
  id_aluno: number;
  nome_aluno: string;
};

function formatarData(dataISO: string) {
  if (!dataISO) return "-";

  const data = new Date(dataISO);

  if (Number.isNaN(data.getTime())) return dataISO;

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function statusClasse(status: string) {
  const statusNormalizado = status.toUpperCase();

  if (statusNormalizado === "APROVADO") return "text-green-400";
  if (statusNormalizado === "REPROVADO") return "text-red-400";

  return "text-blue-400";
}

export default function DashboardCoordenacao() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  const [aba, setAba] = useState<"pendentes" | "historico">("pendentes");

  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [loadingPendentes, setLoadingPendentes] = useState(false);
  const [horasPorItem, setHorasPorItem] = useState<Record<number, string>>({});
  const [processando, setProcessando] = useState<number | null>(null);

  const [historico, setHistorico] = useState<Historico[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [historicoCarregado, setHistoricoCarregado] = useState(false);

  const [rejeicaoAlvo, setRejeicaoAlvo] = useState<Pendente | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");

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

  const carregarPendentes = async () => {
    try {
      setLoadingPendentes(true);

      const response = await apiFetch(`${API_URL}/validacao/pendentes`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao carregar pendências");
      }

      setPendentes(data);
      setHorasPorItem((prev) => {
        const novo = { ...prev };
        data.forEach((item: Pendente) => {
          if (novo[item.id_certificado] === undefined) {
            novo[item.id_certificado] = String(item.quantidade_horas);
          }
        });
        return novo;
      });
    } catch (error) {
      console.error("Erro ao carregar pendências:", error);
      setPendentes([]);
    } finally {
      setLoadingPendentes(false);
    }
  };

  const carregarHistorico = async () => {
    if (!user) return;

    try {
      setLoadingHistorico(true);

      const response = await apiFetch(
        `${API_URL}/validacao/coordenacao/${user.id}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao carregar histórico");
      }

      setHistorico(data);
      setHistoricoCarregado(true);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      setHistorico([]);
    } finally {
      setLoadingHistorico(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    carregarPendentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (aba === "historico" && !historicoCarregado) {
      carregarHistorico();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, user]);

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  const aprovar = async (item: Pendente) => {
    if (!user) return;

    const horasInformadas = Number(
      horasPorItem[item.id_certificado] ?? item.quantidade_horas
    );

    if (
      Number.isNaN(horasInformadas) ||
      horasInformadas < 0 ||
      horasInformadas > item.quantidade_horas
    ) {
      alert(`Informe um valor entre 0 e ${item.quantidade_horas}.`);
      return;
    }

    try {
      setProcessando(item.id_certificado);

      const response = await apiFetch(`${API_URL}/validacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idCertificado: item.id_certificado,
          idCoordenacao: user.id,
          statusValidacao: "APROVADO",
          horasValidadas: horasInformadas,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao aprovar.");
      }

      setPendentes((prev) =>
        prev.filter((p) => p.id_certificado !== item.id_certificado)
      );
      setHistoricoCarregado(false);
    } catch (error: any) {
      alert(error.message || "Erro ao aprovar arquivo.");
    } finally {
      setProcessando(null);
    }
  };

  const abrirRejeicao = (item: Pendente) => {
    setRejeicaoAlvo(item);
    setMotivoRejeicao("");
  };

  const confirmarRejeicao = async () => {
    if (!rejeicaoAlvo || !user) return;

    try {
      setProcessando(rejeicaoAlvo.id_certificado);

      const response = await apiFetch(`${API_URL}/validacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idCertificado: rejeicaoAlvo.id_certificado,
          idCoordenacao: user.id,
          statusValidacao: "REPROVADO",
          observacao: motivoRejeicao || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao reprovar.");
      }

      setPendentes((prev) =>
        prev.filter((p) => p.id_certificado !== rejeicaoAlvo.id_certificado)
      );
      setHistoricoCarregado(false);
      setRejeicaoAlvo(null);
    } catch (error: any) {
      alert(error.message || "Erro ao reprovar arquivo.");
    } finally {
      setProcessando(null);
    }
  };

  if (!user) return null;

  return (
    <div className="size-full p-4" style={{ background: "#15182e" }}>
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 p-4 sm:p-6 bg-white rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Users className="size-8 text-primary shrink-0" />
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">Dashboard da Coordenação</h1>
              <p className="text-sm text-muted-foreground">
                Bem-vindo(a), {user.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={() => navigate("/coordenacao/alunos")}
              variant="outline"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2"
            >
              <Users className="size-4" />
              Alunos
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Minhas Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <strong>Nome:</strong> {user.name}
              </p>
              <p>
                <strong>Matrícula:</strong> {user.identifier}
              </p>
              <p>
                <strong>ID:</strong> {user.id}
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Fila de validação</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {loadingPendentes
                  ? "Carregando..."
                  : `${pendentes.length} arquivo(s) aguardando aprovação.`}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-0 shadow" style={panelStyle}>
          <CardHeader>
            <CardTitle className="text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Clock className="size-5 shrink-0" />
                Validação de Certificados e Relatórios
              </span>

              <div className="flex gap-2 bg-white/10 p-1 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setAba("pendentes")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    aba === "pendentes"
                      ? "bg-white text-[#2f3147]"
                      : "text-white/70 hover:text-white"
                  }`}
                  type="button"
                >
                  Pendentes
                </button>

                <button
                  onClick={() => setAba("historico")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
                    aba === "historico"
                      ? "bg-white text-[#2f3147]"
                      : "text-white/70 hover:text-white"
                  }`}
                  type="button"
                >
                  <History className="size-4" />
                  Histórico
                </button>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {aba === "pendentes" && (
              <>
                {loadingPendentes && (
                  <div className="rounded-2xl bg-white/10 p-8 text-center">
                    <p className="text-white/70">Carregando pendências...</p>
                  </div>
                )}

                {!loadingPendentes && pendentes.length === 0 && (
                  <div className="rounded-2xl bg-white/10 p-8 text-center">
                    <CheckCircle2 className="size-10 text-white/70 mx-auto mb-3" />
                    <h3 className="text-white text-lg font-semibold mb-1">
                      Nenhuma pendência
                    </h3>
                    <p className="text-white/70">
                      Todos os certificados e relatórios já foram avaliados.
                    </p>
                  </div>
                )}

                {!loadingPendentes && pendentes.length > 0 && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {pendentes.map((item) => (
                      <div
                        key={item.id_certificado}
                        className="rounded-2xl bg-white/10 p-5 border border-white/10"
                        style={cardStyle}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <h3 className="text-white font-semibold text-lg">
                              {item.titulo}
                            </h3>
                            <p className="text-white/70 text-sm">
                              {item.nome_aluno} · {item.email_aluno}
                            </p>
                          </div>

                          {item.url_publica && (
                            <a
                              href={item.url_publica}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition shrink-0"
                              title="Ver arquivo"
                            >
                              <Eye className="size-5 text-white" />
                            </a>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                          <p className="text-white/70">
                            Tipo:{" "}
                            <span className="text-white">
                              {item.tipo_arquivo === "RELATORIO"
                                ? "Relatório"
                                : "Certificado"}
                            </span>
                          </p>
                          <p className="text-white/70">
                            Data:{" "}
                            <span className="text-white">
                              {formatarData(item.data_emissao)}
                            </span>
                          </p>
                          <p className="text-white/70">
                            Horas solicitadas:{" "}
                            <span className="text-white font-semibold">
                              {item.quantidade_horas}h
                            </span>
                          </p>
                          <p className="text-white/70">
                            Arquivo:{" "}
                            <span className="text-white">
                              {item.nome_arquivo || "-"}
                            </span>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <label className="text-white/70 text-sm">
                              Horas a aprovar:
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={item.quantidade_horas}
                              value={
                                horasPorItem[item.id_certificado] ??
                                String(item.quantidade_horas)
                              }
                              onChange={(e) =>
                                setHorasPorItem((prev) => ({
                                  ...prev,
                                  [item.id_certificado]: e.target.value,
                                }))
                              }
                              className="w-20 rounded-lg bg-white/10 border border-white/10 p-2 text-white outline-none"
                            />
                          </div>

                          <div className="flex gap-2 ml-auto">
                            <button
                              onClick={() => abrirRejeicao(item)}
                              disabled={processando === item.id_certificado}
                              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 transition disabled:opacity-50"
                              title="Reprovar"
                              type="button"
                            >
                              <XCircle className="size-5 text-red-300" />
                            </button>

                            <button
                              onClick={() => aprovar(item)}
                              disabled={processando === item.id_certificado}
                              className="p-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 transition disabled:opacity-50"
                              title="Aprovar"
                              type="button"
                            >
                              <CheckCircle2 className="size-5 text-green-300" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {aba === "historico" && (
              <>
                {loadingHistorico && (
                  <div className="rounded-2xl bg-white/10 p-8 text-center">
                    <p className="text-white/70">Carregando histórico...</p>
                  </div>
                )}

                {!loadingHistorico && historico.length === 0 && (
                  <div className="rounded-2xl bg-white/10 p-8 text-center">
                    <History className="size-10 text-white/70 mx-auto mb-3" />
                    <h3 className="text-white text-lg font-semibold mb-1">
                      Nenhuma validação registrada
                    </h3>
                    <p className="text-white/70">
                      As validações que você fizer aparecerão aqui.
                    </p>
                  </div>
                )}

                {!loadingHistorico && historico.length > 0 && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {historico.map((item) => (
                      <div
                        key={item.id_validacao}
                        className="rounded-2xl bg-white/10 p-5 border border-white/10"
                        style={cardStyle}
                      >
                        <h3 className="text-white font-semibold text-lg mb-1">
                          {item.titulo}
                        </h3>
                        <p className="text-white/70 text-sm mb-3">
                          {item.nome_aluno}
                        </p>

                        <p className="text-white/70 text-sm mb-1">
                          Status:{" "}
                          <span
                            className={`${statusClasse(
                              item.status_validacao
                            )} font-semibold`}
                          >
                            {item.status_validacao}
                          </span>
                        </p>

                        <p className="text-white/70 text-sm mb-1">
                          Horas validadas:{" "}
                          <span className="text-white">
                            {item.horas_validadas}h
                          </span>
                        </p>

                        <p className="text-white/70 text-sm mb-1">
                          Data:{" "}
                          <span className="text-white">
                            {formatarData(item.data_validacao)}
                          </span>
                        </p>

                        {item.observacao && (
                          <p className="text-white/70 text-sm">
                            Observação:{" "}
                            <span className="text-white">
                              {item.observacao}
                            </span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {rejeicaoAlvo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={panelStyle}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-white">
                Reprovar "{rejeicaoAlvo.titulo}"
              </h2>

              <button
                onClick={() => setRejeicaoAlvo(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                type="button"
              >
                <X className="size-5 text-white" />
              </button>
            </div>

            <label className="block text-white mb-2">
              Motivo (opcional)
            </label>
            <textarea
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              rows={4}
              className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
              placeholder="Explique por que este arquivo está sendo reprovado..."
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                onClick={() => setRejeicaoAlvo(null)}
                variant="outline"
                className="rounded-xl bg-transparent text-white hover:bg-white/10"
                style={{ borderColor: "#8c8da9", color: "#ffffff" }}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={confirmarRejeicao}
                disabled={processando === rejeicaoAlvo.id_certificado}
                className="rounded-xl bg-red-500 text-white hover:bg-red-600"
              >
                {processando === rejeicaoAlvo.id_certificado
                  ? "Enviando..."
                  : "Confirmar reprovação"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
