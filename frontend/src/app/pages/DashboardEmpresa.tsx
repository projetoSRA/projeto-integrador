import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { User } from "../utils/auth";
import { panelStyle, cardStyle, buttonGlass } from "../../styles/uiStyles";
import {
  Building2,
  CalendarDays,
  Eye,
  LogOut,
  Plus,
  Trash2,
  X,
} from "lucide-react";

type EventoEmpresa = {
  id_evento: number;
  id_empresa: number;
  titulo: string;
  descricao: string | null;
  tipo_evento: string | null;
  data_evento: string;
  horario: string | null;
  carga_horaria: number;
  palestrante: string | null;
  info_palestrante: string | null;
  criado_em: string;
};

type AlunoInscrito = {
  id_aluno: number;
  nome: string;
  email?: string;
  curso?: string;
  rm?: string;
  status_inscricao?: string;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

function formatarHorario(horario: string | null) {
  if (!horario) return "-";
  return horario.slice(0, 5);
}

export default function DashboardEmpresa() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [eventos, setEventos] = useState<EventoEmpresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [modalSair, setModalSair] = useState(false);

  const [modalInscritos, setModalInscritos] = useState(false);
  const [loadingInscritos, setLoadingInscritos] = useState(false);
  const [inscritos, setInscritos] = useState<AlunoInscrito[]>([]);
  const [eventoSelecionado, setEventoSelecionado] =
    useState<EventoEmpresa | null>(null);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoEvento, setTipoEvento] = useState("PALESTRA");
  const [dataEvento, setDataEvento] = useState("");
  const [horario, setHorario] = useState("");
  const [cargaHoraria, setCargaHoraria] = useState("");
  const [palestrante, setPalestrante] = useState("");
  const [infoPalestrante, setInfoPalestrante] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("user");

    if (!userData) {
      navigate("/");
      return;
    }

    const parsedUser = JSON.parse(userData) as User;

    if (parsedUser.type !== "empresa") {
      navigate("/");
      return;
    }

    setUser(parsedUser);
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    async function carregarEventos() {
      try {
        setLoading(true);

        const response = await fetch(`${API_URL}/eventos/empresa/${user.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Erro ao carregar eventos");
        }

        setEventos(data);
      } catch (error) {
        console.error("Erro ao carregar eventos:", error);
        setEventos([]);
      } finally {
        setLoading(false);
      }
    }

    carregarEventos();
  }, [user]);

  const totalHoras = useMemo(() => {
    return eventos.reduce(
      (acc, item) => acc + Number(item.carga_horaria || 0),
      0,
    );
  }, [eventos]);

  const limparFormulario = () => {
    setTitulo("");
    setDescricao("");
    setTipoEvento("PALESTRA");
    setDataEvento("");
    setHorario("");
    setCargaHoraria("");
    setPalestrante("");
    setInfoPalestrante("");
  };

  const fecharModal = () => {
    setModalAberto(false);
    limparFormulario();
  };

  const criarEvento = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) return;

    try {
      setSalvando(true);

      const response = await fetch(`${API_URL}/eventos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idEmpresa: user.id,
          titulo,
          descricao,
          tipoEvento,
          dataEvento,
          horario,
          cargaHoraria,
          palestrante,
          infoPalestrante,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Erro ao criar evento");
      }

      setEventos((prev) => [result.evento, ...prev]);
      fecharModal();
    } catch (error: any) {
      alert(error.message || "Erro ao criar evento.");
    } finally {
      setSalvando(false);
    }
  };

  const excluirEvento = async (idEvento: number) => {
    if (!confirm("Deseja realmente excluir este evento?")) return;

    try {
      const response = await fetch(`${API_URL}/eventos/${idEvento}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao excluir evento");
      }

      setEventos((prev) => prev.filter((item) => item.id_evento !== idEvento));
    } catch (error: any) {
      alert(error.message || "Erro ao excluir evento.");
    }
  };

  const verInscritos = async (evento: EventoEmpresa) => {
    try {
      setEventoSelecionado(evento);
      setModalInscritos(true);
      setLoadingInscritos(true);
      setInscritos([]);

      const response = await fetch(
        `${API_URL}/eventos/${evento.id_evento}/inscritos`,
      );

      const texto = await response.text();

      let data;
      try {
        data = JSON.parse(texto);
      } catch {
        throw new Error(
          "A rota de inscritos não retornou JSON. Verifique o backend.",
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Erro ao buscar inscritos");
      }

      setInscritos(data);
    } catch (error: any) {
      alert(error.message || "Erro ao carregar inscritos.");
    } finally {
      setLoadingInscritos(false);
    }
  };

  const fecharModalInscritos = () => {
    setModalInscritos(false);
    setEventoSelecionado(null);
    setInscritos([]);
  };

  const handleLogout = () => {
  setModalSair(true);
};

const confirmarLogout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  navigate("/");
};

  if (!user) return null;

  return (
    <div
      className="h-screen overflow-hidden p-4 md:p-6 relative"
      style={{
        background:
          "linear-gradient(135deg, #020305 0%, #05070d 42%, #071a44 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 88% 82%, rgba(37,99,235,0.42), transparent 35%), radial-gradient(circle at 45% 20%, rgba(255,255,255,0.04), transparent 28%)",
        }}
      />

      <div className="relative flex h-full gap-10">
        <aside
          className="w-80 min-h-full p-6 flex flex-col justify-between rounded-2xl"
          style={panelStyle}
        >
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="size-12 rounded-2xl bg-blue-500/15 flex items-center justify-center">
                <Building2 className="size-7 text-blue-400" />
              </div>

              <div>
                <h2 className="text-2xl font-semibold text-white">Empresa</h2>
                <p className="text-white/60 text-sm">Painel corporativo</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl p-4" style={cardStyle}>
                <p className="text-white/60 text-sm mb-1">Nome</p>
                <p className="text-white font-semibold">{user.name}</p>
              </div>

              <div className="rounded-2xl p-4" style={cardStyle}>
                <p className="text-white/60 text-sm mb-1">CNPJ</p>
                <p className="text-white font-semibold">{user.identifier}</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleLogout}
            style={buttonGlass}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-white bg-white/10 hover:bg-white/15 mt-8 border border-white/10"
          >
            <LogOut className="size-4" />
            Sair
          </Button>
        </aside>

        <main className="flex-1 rounded-2xl p-6 overflow-hidden">
          <div
            className="
              max-w-7xl mx-auto h-full overflow-y-auto pr-2
              [scrollbar-width:none]
              [-ms-overflow-style:none]
              [&::-webkit-scrollbar]:hidden
            "
          >
            <header
              className="flex items-center justify-between mb-8 p-6 rounded-2xl"
              style={panelStyle}
            >
              <div className="flex items-center gap-4">
                <Building2 className="size-9 text-blue-400" />
                <div>
                  <h1 className="text-3xl font-semibold text-white">
                    Central SRA
                  </h1>
                  <p className="text-white/70 text-base">
                    Bem-vindo(a), {user.name}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setModalAberto(true)}
                className="rounded-xl bg-white text-[#2f3147] hover:bg-white/90 flex items-center gap-2 px-5 py-2"
              >
                <Plus className="size-4" />
                Novo evento
              </Button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white/10 rounded-2xl p-5">
                <p className="text-white/60 text-sm">Eventos publicados</p>
                <h2 className="text-white text-2xl font-semibold mt-1">
                  {eventos.length}
                </h2>
              </div>

              <div className="bg-white/10 rounded-2xl p-5">
                <p className="text-white/60 text-sm">Horas ofertadas</p>
                <h2 className="text-white text-2xl font-semibold mt-1">
                  {totalHoras}h
                </h2>
              </div>
            </div>

            <Card className="rounded-3xl border-0 mb-6" style={panelStyle}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CalendarDays className="size-5 text-blue-400" />
                  Meus eventos
                </CardTitle>
              </CardHeader>

              <CardContent>
                {loading ? (
                  <div
                    className="rounded-2xl p-8 text-center"
                    style={cardStyle}
                  >
                    <p className="text-white/70">Carregando eventos...</p>
                  </div>
                ) : eventos.length === 0 ? (
                  <div
                    className="rounded-2xl p-8 text-center"
                    style={cardStyle}
                  >
                    <CalendarDays className="size-10 text-white/70 mx-auto mb-3" />
                    <h3 className="text-white text-lg font-semibold mb-1">
                      Nenhum evento publicado
                    </h3>
                    <p className="text-white/70">
                      Clique em novo evento para criar sua primeira publicação.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {eventos.map((evento) => (
                      <div
                        key={evento.id_evento}
                        className="rounded-2xl p-5 border border-white/10"
                        style={cardStyle}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <span className="inline-flex rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-400 mb-3">
                              {evento.tipo_evento || "EVENTO"}
                            </span>

                            <h3 className="text-white font-semibold text-xl mb-2">
                              {evento.titulo}
                            </h3>

                            <p className="text-white/70 text-sm mb-3 line-clamp-3">
                              {evento.descricao || "Sem descrição informada."}
                            </p>

                            <div className="space-y-1 text-sm text-white/70">
                              <p>
                                Data:{" "}
                                <span className="text-white">
                                  {formatarData(evento.data_evento)}
                                </span>
                              </p>

                              <p>
                                Horário:{" "}
                                <span className="text-white">
                                  {formatarHorario(evento.horario)}
                                </span>
                              </p>

                              <p>
                                Carga horária:{" "}
                                <span className="text-white font-semibold">
                                  {evento.carga_horaria}h
                                </span>
                              </p>

                              <p>
                                Palestrante:{" "}
                                <span className="text-white">
                                  {evento.palestrante || "-"}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <button
                              onClick={() => verInscritos(evento)}
                              className="px-3 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm flex items-center gap-2"
                              type="button"
                            >
                              <Eye className="size-4" />
                              Inscritos
                            </button>

                            <button
                              onClick={() => excluirEvento(evento.id_evento)}
                              className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 transition"
                              title="Excluir evento"
                              type="button"
                            >
                              <Trash2 className="size-5 text-red-300" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-2xl rounded-2xl p-6 shadow-xl"
            style={panelStyle}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-white">Novo evento</h2>

              <button
                onClick={fecharModal}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                type="button"
              >
                <X className="size-5 text-white" />
              </button>
            </div>

            <form
              onSubmit={criarEvento}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="md:col-span-2">
                <label className="block text-white mb-2">Título</label>
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  required
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                  placeholder="Ex: Palestra de Tecnologia"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white mb-2">Descrição</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none resize-none"
                  placeholder="Descreva o evento..."
                />
              </div>

              <div>
                <label className="block text-white mb-2">Tipo</label>
                <select
                  value={tipoEvento}
                  onChange={(e) => setTipoEvento(e.target.value)}
                  className="w-full rounded-xl border border-white/10 p-3 outline-none bg-[#252938] text-white focus:border-blue-400"
                >
                  <option className="bg-[#252938] text-white" value="PALESTRA">
                    Palestra
                  </option>
                  <option className="bg-[#252938] text-white" value="WORKSHOP">
                    Workshop
                  </option>
                  <option className="bg-[#252938] text-white" value="FEIRA">
                    Feira
                  </option>
                  <option className="bg-[#252938] text-white" value="CURSO">
                    Curso
                  </option>
                  <option className="bg-[#252938] text-white" value="OUTRO">
                    Outro
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-white mb-2">Carga horária</label>
                <input
                  type="number"
                  min={1}
                  value={cargaHoraria}
                  onChange={(e) => setCargaHoraria(e.target.value)}
                  required
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                  placeholder="Ex: 4"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Data</label>
                <input
                  type="date"
                  value={dataEvento}
                  onChange={(e) => setDataEvento(e.target.value)}
                  required
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Horário</label>
                <input
                  type="time"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Palestrante</label>
                <input
                  value={palestrante}
                  onChange={(e) => setPalestrante(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                  placeholder="Nome do palestrante"
                />
              </div>

              <div>
                <label className="block text-white mb-2">
                  Info palestrante
                </label>
                <input
                  value={infoPalestrante}
                  onChange={(e) => setInfoPalestrante(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                  placeholder="Ex: Especialista em tecnologia"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-3">
                <Button
                  type="button"
                  onClick={fecharModal}
                  variant="outline"
                  className="rounded-xl bg-transparent text-white hover:bg-white/10"
                  style={{
                    borderColor: "#8c8da9",
                    color: "#ffffff",
                  }}
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={salvando}
                  className="rounded-xl bg-white text-[#2f3147] hover:bg-white/90"
                >
                  {salvando ? "Salvando..." : "Publicar evento"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalInscritos && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-lg rounded-2xl p-6 shadow-xl border border-white/10"
            style={panelStyle}
          >
            {/* HEADER */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Alunos inscritos
                </h2>
                <p className="text-white/50 text-sm mt-1">
                  {eventoSelecionado?.titulo}
                </p>
              </div>

              <button
                onClick={fecharModalInscritos}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                type="button"
              >
                <X className="size-5 text-white" />
              </button>
            </div>

            {/* TOTAL */}
            <div className="rounded-xl bg-white/10 p-4 mb-5 border border-white/10">
              <p className="text-white/50 text-xs uppercase tracking-wide">
                Total de inscritos
              </p>
              <p className="text-white text-3xl font-semibold">
                {inscritos.length}
              </p>
            </div>

            {/* LISTA */}
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scroll pr-2">
              {loadingInscritos ? (
                <p className="text-white/70 text-center py-4">
                  Carregando inscritos...
                </p>
              ) : inscritos.length === 0 ? (
                <p className="text-white/70 text-center py-4">
                  Nenhum aluno inscrito ainda.
                </p>
              ) : (
                inscritos.map((item) => (
                  <div
                    key={item.id_aluno}
                    className="rounded-xl bg-white/5 p-4 border border-white/10 hover:bg-white/10 transition"
                  >
                    <p className="text-white font-semibold">{item.nome}</p>

                    <div className="mt-1 space-y-1 text-sm text-white/70">
                      <p>
                        {item.curso || "Análise e Desenvolvimento de Sistemas"}
                      </p>

                      {item.rm && <p>RM: {item.rm}</p>}
                    </div>

                    {/* STATUS */}
                    {item.status_inscricao && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400">
                          {item.status_inscricao}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* FOOTER */}
            <Button
              onClick={fecharModalInscritos}
              className="w-full mt-6 rounded-xl bg-white text-[#2f3147] hover:bg-white/90"
            >
              Fechar
            </Button>
          </div>
        </div>
      )}
      {modalSair && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div
      className="w-full max-w-md rounded-2xl p-6 border border-white/10 shadow-2xl"
      style={panelStyle}
    >
      <div className="mb-5">
        <h2 className="text-white text-xl font-semibold">
          Deseja realmente sair?
        </h2>
        <p className="text-white/60 text-sm mt-2">
          Você será redirecionado para a tela de login.
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          onClick={() => setModalSair(false)}
          style={buttonGlass}
          className="rounded-xl text-white hover:bg-white/15 border border-white/10"
        >
          Cancelar
        </Button>

        <Button
          type="button"
          onClick={confirmarLogout}
          className="rounded-xl bg-red-500/90 text-white hover:bg-red-600"
        >
          Sair
        </Button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
