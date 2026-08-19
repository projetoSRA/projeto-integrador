import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { User } from "../utils/auth";
import AlunoLayout, { glassCardStyle } from "../components/AlunoLayout";
import { panelStyle, cardStyle, buttonGlass } from "../../styles/uiStyles";
import { Mic2 } from "lucide-react";

type Evento = {
  id_evento: number;
  id_empresa: number;
  nome_empresa?: string;
  titulo: string;
  descricao: string | null;
  tipo_evento: string | null;
  data_evento: string;
  horario: string | null;
  carga_horaria: number;
  palestrante: string | null;
  info_palestrante: string | null;
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

export default function Eventos() {
  const navigate = useNavigate();

  const [horas, setHoras] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [inscricoes, setInscricoes] = useState<number[]>([]);
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

    fetch(`http://localhost:3000/aluno/horas/${parsedUser.identifier}`)
    .then(res => res.json())
    .then(data => setHoras(data.horas))
    .catch(() => setHoras(0));
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    async function carregarEventos() {
      try {
        setLoading(true);

        const [eventosResponse, inscricoesResponse] = await Promise.all([
          fetch(`${API_URL}/eventos`),
          fetch(`${API_URL}/eventos/inscricoes/aluno/${user.id}`),
        ]);

        const eventosData = await eventosResponse.json();
        const inscricoesData = await inscricoesResponse.json();

        if (!eventosResponse.ok) {
          throw new Error(eventosData.message || "Erro ao carregar eventos");
        }

        setEventos(eventosData);

        if (inscricoesResponse.ok) {
          setInscricoes(inscricoesData.map((item: any) => item.id_evento));
        }
      } catch (error) {
        console.error("Erro ao carregar eventos:", error);
        setEventos([]);
      } finally {
        setLoading(false);
      }
    }

    carregarEventos();
  }, [user]);

  const inscreverEvento = async (idEvento: number) => {
    if (!user) return;

    try {
      const response = await fetch(`${API_URL}/eventos/${idEvento}/inscrever`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idAluno: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao realizar inscrição");
      }

      setInscricoes((prev) =>
        prev.includes(idEvento) ? prev : [...prev, idEvento]
      );
    } catch (error: any) {
      alert(error.message || "Erro ao realizar inscrição.");
    }
  };

  if (!user) return null;

  return (
    <AlunoLayout user={user} activePage="eventos" horas={horas}>
      <Card
        className="rounded-2xl border-0 shadow mb-6"
        style={panelStyle}
      >
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Mic2 className="size-5 text-blue-400" />
            Eventos disponíveis
          </CardTitle>
        </CardHeader>

        <CardContent>
  {loading ? (
    <div className="rounded-2xl bg-white/10 p-6 text-center">
      <p className="text-white/70">Carregando eventos...</p>
    </div>
  ) : eventos.length === 0 ? (
    <div className="rounded-2xl bg-white/10 p-6 text-center">
      <Mic2 className="size-9 text-white/70 mx-auto mb-3" />
      <h3 className="text-white text-lg font-semibold mb-1">
        Nenhum evento disponível
      </h3>
      <p className="text-white/70">
        Aguarde uma empresa publicar novos eventos.
      </p>
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-4">
      {eventos.map((evento) => {
        const inscrito = inscricoes.includes(evento.id_evento);

        return (
          <div
            key={evento.id_evento}
            className="bg-white/10 rounded-2xl p-4 w-full flex flex-col lg:flex-row gap-4 items-center border border-white/10"
          >
            <div className="w-full lg:w-[220px] h-40 shrink-0 overflow-hidden rounded-xl bg-white/10 flex items-center justify-center">
              <div className="text-center">
                <Mic2 className="size-11 text-blue-400 mx-auto mb-2" />
                <p className="text-white/70 text-xs">
                  {evento.tipo_evento || "EVENTO"}
                </p>
              </div>
            </div>

            <div className="flex-1 w-full">
              <span className="inline-flex rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-400 mb-2">
                {evento.tipo_evento || "EVENTO"}
              </span>

              <h3 className="text-white font-semibold text-xl mb-2">
                {evento.titulo}
              </h3>

              {evento.descricao && (
                <p className="text-white/70 text-sm mb-3 line-clamp-2">
                  {evento.descricao}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-white/85 text-sm">
                <p>
                  <strong>Empresa:</strong>{" "}
                  {evento.nome_empresa || "Empresa parceira"}
                </p>

                <p>
                  <strong>Data:</strong> {formatarData(evento.data_evento)}
                </p>

                <p>
                  <strong>Horário:</strong> {formatarHorario(evento.horario)}
                </p>

                <p>
                  <strong>Duração:</strong> {evento.carga_horaria}h
                </p>

                <p>
                  <strong>Palestrante:</strong> {evento.palestrante || "-"}
                </p>

                {evento.info_palestrante && (
                  <p className="md:col-span-2 line-clamp-1">
                    <strong>Sobre:</strong> {evento.info_palestrante}
                  </p>
                )}
              </div>

              <div className="flex justify-end mt-4">
  <button
    onClick={() => inscreverEvento(evento.id_evento)}
    disabled={inscrito}
    className={`rounded-lg py-2 px-4 text-sm font-semibold transition ${
      inscrito
        ? "bg-green-500 text-white cursor-default"
        : "bg-blue-500 text-white hover:bg-blue-600"
    }`}
  >
    {inscrito ? "Inscrito" : "Inscrever-se"}
  </button>
</div>
            </div>
          </div>
        );
      })}
    </div>
  )}
</CardContent>
      </Card>
    </AlunoLayout>
  );
}