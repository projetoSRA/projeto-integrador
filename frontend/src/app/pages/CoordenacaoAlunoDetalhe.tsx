import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import CoordenacaoLayout from "../components/CoordenacaoLayout";
import { User } from "../utils/auth";
import { apiFetch } from "../utils/api";
import { panelStyle, cardStyle } from "../../styles/uiStyles";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Eye,
  FileBadge2,
  Mic2,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

type AlunoDetalhe = {
  id_aluno: number;
  nome: string;
  email: string;
  rm: string | null;
  ra: string | null;
  curso: string | null;
  nivel_ensino: "MEDIO" | "FACULDADE" | null;
  serie_semestre: string | null;
  totalPalestrasNoAno: number;
  eventosParticipados: number;
  totalHoras: number;
};

type Certificado = {
  id_certificado: number;
  titulo: string;
  tipo_arquivo: "CERTIFICADO" | "RELATORIO";
  quantidade_horas: number;
  horas_aprovadas: number;
  data_emissao: string;
  status_certificado: string;
  url_publica: string | null;
};

type EventoAluno = {
  id_evento: number;
  nome_empresa: string;
  titulo: string;
  tipo_evento: string | null;
  data_evento: string;
  carga_horaria: number;
  status_inscricao: string;
};

type Visita = {
  id_visita: number;
  local: string;
  quantidade_horas: number;
  data_visita: string;
  observacao: string | null;
};

type Aba = "certificados" | "eventos" | "visitas";

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

function statusInfo(status: string) {
  const normalizado = status.toUpperCase();
  if (normalizado === "APROVADO") return { texto: "Válido", classe: "text-green-400" };
  if (normalizado === "REPROVADO") return { texto: "Inválido", classe: "text-red-400" };
  return { texto: "Pendente", classe: "text-blue-400" };
}

export default function CoordenacaoAlunoDetalhe() {
  const navigate = useNavigate();
  const { idAluno } = useParams();
  const [user, setUser] = useState<User | null>(null);

  const [aluno, setAluno] = useState<AlunoDetalhe | null>(null);
  const [carregandoAluno, setCarregandoAluno] = useState(true);

  const [aba, setAba] = useState<Aba>("certificados");

  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [eventos, setEventos] = useState<EventoAluno[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [carregandoAba, setCarregandoAba] = useState(false);

  const [modalVisitaAberto, setModalVisitaAberto] = useState(false);
  const [local, setLocal] = useState("");
  const [horasVisita, setHorasVisita] = useState("");
  const [dataVisita, setDataVisita] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvandoVisita, setSalvandoVisita] = useState(false);

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

  const carregarAluno = async () => {
    if (!idAluno) return;

    try {
      setCarregandoAluno(true);
      const response = await apiFetch(`${API_URL}/aluno/${idAluno}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao carregar aluno");
      }

      setAluno(data);
    } catch (error) {
      console.error("Erro ao carregar aluno:", error);
      setAluno(null);
    } finally {
      setCarregandoAluno(false);
    }
  };

  useEffect(() => {
    if (!user || !idAluno) return;
    carregarAluno();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, idAluno]);

  useEffect(() => {
    if (!user || !idAluno) return;

    async function carregarAba() {
      try {
        setCarregandoAba(true);

        if (aba === "certificados") {
          const response = await apiFetch(`${API_URL}/certificados/aluno/${idAluno}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.message);
          setCertificados(data);
        }

        if (aba === "eventos") {
          const response = await apiFetch(`${API_URL}/eventos/aluno/${idAluno}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.message);
          setEventos(data);
        }

        if (aba === "visitas") {
          const response = await apiFetch(`${API_URL}/visita/aluno/${idAluno}`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.message);
          setVisitas(data);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        if (aba === "certificados") setCertificados([]);
        if (aba === "eventos") setEventos([]);
        if (aba === "visitas") setVisitas([]);
      } finally {
        setCarregandoAba(false);
      }
    }

    carregarAba();
  }, [user, idAluno, aba]);

  const abrirModalVisita = () => {
    setLocal("");
    setHorasVisita("");
    setDataVisita("");
    setObservacao("");
    setModalVisitaAberto(true);
  };

  const registrarVisita = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!idAluno) return;

    const horas = Number(horasVisita);
    if (Number.isNaN(horas) || horas <= 0) {
      alert("Informe uma quantidade de horas válida.");
      return;
    }

    try {
      setSalvandoVisita(true);

      const response = await apiFetch(`${API_URL}/visita`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idAluno: Number(idAluno),
          local,
          quantidadeHoras: horas,
          dataVisita,
          observacao: observacao || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao registrar visita.");
      }

      setVisitas((prev) => [data.visita, ...prev]);
      setModalVisitaAberto(false);
      carregarAluno();
    } catch (error: any) {
      alert(error.message || "Erro ao registrar visita.");
    } finally {
      setSalvandoVisita(false);
    }
  };

  const excluirVisita = async (idVisita: number) => {
    if (!confirm("Deseja realmente excluir esta visita?")) return;

    try {
      const response = await apiFetch(`${API_URL}/visita/${idVisita}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao excluir visita.");
      }

      setVisitas((prev) => prev.filter((v) => v.id_visita !== idVisita));
      carregarAluno();
    } catch (error: any) {
      alert(error.message || "Erro ao excluir visita.");
    }
  };

  if (!user) return null;

  return (
    <>
    <CoordenacaoLayout
      user={user}
      activePage="alunos"
      icon={UserRound}
      title={carregandoAluno ? "Carregando..." : aluno?.nome || "Aluno"}
      subtitle="Perfil de horas e participações"
      headerActions={
        <Button
          onClick={() => navigate("/coordenacao/alunos")}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl text-white bg-white/10 hover:bg-white/15 border border-white/10"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
      }
    >
        {aluno && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-2xl bg-white/10 p-5 border border-white/10" style={cardStyle}>
              <p className="text-sm text-white/70 font-medium mb-1">
                {aluno.nivel_ensino === "FACULDADE" ? "RA" : "RM"}
              </p>
              <p className="text-2xl font-semibold text-white">
                {(aluno.nivel_ensino === "FACULDADE" ? aluno.ra : aluno.rm) || "-"}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-5 border border-white/10" style={cardStyle}>
              <p className="text-sm text-white/70 font-medium mb-1">
                Total de palestras no ano
              </p>
              <p className="text-2xl font-semibold text-white">{aluno.totalPalestrasNoAno}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-5 border border-white/10" style={cardStyle}>
              <p className="text-sm text-white/70 font-medium mb-1">
                Palestras que participou
              </p>
              <p className="text-2xl font-semibold text-white">{aluno.eventosParticipados}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-5 border border-white/10" style={cardStyle}>
              <p className="text-sm text-white/70 font-medium mb-1">
                Total de horas
              </p>
              <p className="text-2xl font-semibold text-white">{Number(aluno.totalHoras || 0)}h</p>
            </div>
          </div>
        )}

        <Card className="rounded-2xl border-0 shadow" style={panelStyle}>
          <CardHeader>
            <CardTitle className="text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex gap-2 bg-white/10 p-1 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setAba("certificados")}
                  type="button"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
                    aba === "certificados"
                      ? "bg-white text-[#2f3147]"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  <FileBadge2 className="size-4" />
                  Certificados
                </button>

                <button
                  onClick={() => setAba("eventos")}
                  type="button"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
                    aba === "eventos"
                      ? "bg-white text-[#2f3147]"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  <Mic2 className="size-4" />
                  Eventos
                </button>

                <button
                  onClick={() => setAba("visitas")}
                  type="button"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
                    aba === "visitas"
                      ? "bg-white text-[#2f3147]"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  <Building2 className="size-4" />
                  Visitas
                </button>
              </div>

              {aba === "visitas" && (
                <Button
                  onClick={abrirModalVisita}
                  className="rounded-xl bg-white text-[#2f3147] hover:bg-white/90 flex items-center gap-2"
                >
                  <Plus className="size-4" />
                  Nova visita
                </Button>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {carregandoAba && (
              <div className="rounded-2xl bg-white/10 p-8 text-center">
                <p className="text-white/70">Carregando...</p>
              </div>
            )}

            {!carregandoAba && aba === "certificados" && (
              certificados.length === 0 ? (
                <div className="rounded-2xl bg-white/10 p-8 text-center">
                  <FileBadge2 className="size-10 text-white/70 mx-auto mb-3" />
                  <h3 className="text-white text-lg font-semibold mb-1">
                    Nenhum certificado ou relatório
                  </h3>
                  <p className="text-white/70">
                    Os arquivos enviados pelo aluno aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {certificados.map((item) => {
                    const status = statusInfo(item.status_certificado);
                    return (
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
                              {item.tipo_arquivo === "RELATORIO" ? "Relatório" : "Certificado"}
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

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <p className="text-white/70">
                            Data:{" "}
                            <span className="text-white">
                              {formatarData(item.data_emissao)}
                            </span>
                          </p>
                          <p className="text-white/70">
                            Horas:{" "}
                            <span className="text-white font-semibold">
                              {item.status_certificado.toUpperCase() === "APROVADO"
                                ? `${item.horas_aprovadas}h`
                                : `${item.quantidade_horas}h (solicitado)`}
                            </span>
                          </p>
                          <p className="text-white/70 col-span-2">
                            Status:{" "}
                            <span className={`${status.classe} font-semibold`}>
                              {status.texto}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {!carregandoAba && aba === "eventos" && (
              eventos.length === 0 ? (
                <div className="rounded-2xl bg-white/10 p-8 text-center">
                  <Mic2 className="size-10 text-white/70 mx-auto mb-3" />
                  <h3 className="text-white text-lg font-semibold mb-1">
                    Nenhum evento
                  </h3>
                  <p className="text-white/70">
                    As inscrições do aluno em eventos aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {eventos.map((evento) => (
                    <div
                      key={evento.id_evento}
                      className="rounded-2xl bg-white/10 p-5 border border-white/10"
                      style={cardStyle}
                    >
                      <h3 className="text-white font-semibold text-lg mb-1">
                        {evento.titulo}
                      </h3>
                      <p className="text-white/70 text-sm mb-3">
                        {evento.nome_empresa} · {evento.tipo_evento || "EVENTO"}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="text-white/70">
                          Data:{" "}
                          <span className="text-white">
                            {formatarData(evento.data_evento)}
                          </span>
                        </p>
                        <p className="text-white/70">
                          Horas:{" "}
                          <span className="text-white font-semibold">
                            {evento.carga_horaria}h
                          </span>
                        </p>
                        <p className="text-white/70 col-span-2">
                          Situação:{" "}
                          <span className="text-white">{evento.status_inscricao}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {!carregandoAba && aba === "visitas" && (
              visitas.length === 0 ? (
                <div className="rounded-2xl bg-white/10 p-8 text-center">
                  <Building2 className="size-10 text-white/70 mx-auto mb-3" />
                  <h3 className="text-white text-lg font-semibold mb-1">
                    Nenhuma visita registrada
                  </h3>
                  <p className="text-white/70">
                    Clique em "Nova visita" para registrar uma visita deste aluno.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {visitas.map((visita) => (
                    <div
                      key={visita.id_visita}
                      className="rounded-2xl bg-white/10 p-5 border border-white/10"
                      style={cardStyle}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="text-white font-semibold text-lg">
                          {visita.local}
                        </h3>

                        <button
                          onClick={() => excluirVisita(visita.id_visita)}
                          className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 transition shrink-0"
                          title="Excluir visita"
                          type="button"
                        >
                          <Trash2 className="size-5 text-red-300" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="text-white/70">
                          Quantidade de horas:{" "}
                          <span className="text-white font-semibold">
                            {visita.quantidade_horas}h
                          </span>
                        </p>
                        <p className="text-white/70">
                          Data:{" "}
                          <span className="text-white">
                            {formatarData(visita.data_visita)}
                          </span>
                        </p>
                        {visita.observacao && (
                          <p className="text-white/70 col-span-2">
                            Observação:{" "}
                            <span className="text-white">{visita.observacao}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>
    </CoordenacaoLayout>

    {modalVisitaAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-2xl p-6 shadow-xl" style={panelStyle}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <CalendarDays className="size-5" />
                Nova visita
              </h2>

              <button
                onClick={() => setModalVisitaAberto(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                type="button"
              >
                <X className="size-5 text-white" />
              </button>
            </div>

            <form onSubmit={registrarVisita} className="space-y-4">
              <div>
                <label className="block text-white mb-2">Local</label>
                <input
                  type="text"
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  required
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                  placeholder="Ex: Empresa / cidade visitada"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Quantidade de horas</label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={horasVisita}
                  onChange={(e) => setHorasVisita(e.target.value)}
                  required
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Data</label>
                <input
                  type="date"
                  value={dataVisita}
                  onChange={(e) => setDataVisita(e.target.value)}
                  required
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Observação (opcional)</label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button
                  type="button"
                  onClick={() => setModalVisitaAberto(false)}
                  variant="outline"
                  className="rounded-xl bg-transparent text-white hover:bg-white/10"
                  style={{ borderColor: "#8c8da9", color: "#ffffff" }}
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={salvandoVisita}
                  className="rounded-xl bg-white text-[#2f3147] hover:bg-white/90"
                >
                  {salvandoVisita ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
