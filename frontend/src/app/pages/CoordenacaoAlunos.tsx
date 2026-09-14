import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import CoordenacaoLayout from "../components/CoordenacaoLayout";
import { User } from "../utils/auth";
import { apiFetch } from "../utils/api";
import { panelStyle, cardStyle } from "../../styles/uiStyles";
import { Building2, CalendarDays, Clock, Search, Upload, Users, X } from "lucide-react";

type ResultadoImportacao = {
  message: string;
  turma: {
    curso: string | null;
    turma: string | null;
    ano: string | null;
    serieSemestre: string | null;
  };
  criados: number;
  atualizados: number;
  totalNaPlanilha: number;
  ignorados: { linha: number; motivo: string }[];
};

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
  pendentes_count: number;
  ultima_atividade: string | null;
};

const LIMITE_POUCAS_HORAS = 5;

type FiltroSituacao = "todos" | "pendencias" | "poucas_horas" | "sem_horas";

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
  const [recarregarContador, setRecarregarContador] = useState(0);

  const [turmaFiltro, setTurmaFiltro] = useState("todas");
  const [situacaoFiltro, setSituacaoFiltro] = useState<FiltroSituacao>("todos");

  const inputPlanilhaRef = useRef<HTMLInputElement | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultadoImportacao, setResultadoImportacao] = useState<ResultadoImportacao | null>(null);
  const [erroImportacao, setErroImportacao] = useState<string | null>(null);

  const [modalVisitaTurmaAberto, setModalVisitaTurmaAberto] = useState(false);
  const [turmaVisita, setTurmaVisita] = useState("");
  const [localVisitaTurma, setLocalVisitaTurma] = useState("");
  const [horasVisitaTurma, setHorasVisitaTurma] = useState("");
  const [dataVisitaTurma, setDataVisitaTurma] = useState("");
  const [bimestreVisitaTurma, setBimestreVisitaTurma] = useState("");
  const [observacaoVisitaTurma, setObservacaoVisitaTurma] = useState("");
  const [salvandoVisitaTurma, setSalvandoVisitaTurma] = useState(false);

  const [modalEmpresaTurmaAberto, setModalEmpresaTurmaAberto] = useState(false);
  const [turmaEmpresa, setTurmaEmpresa] = useState("");
  const [nomeEmpresaTurma, setNomeEmpresaTurma] = useState("");
  const [representanteEmpresaTurma, setRepresentanteEmpresaTurma] = useState("");
  const [salvandoEmpresaTurma, setSalvandoEmpresaTurma] = useState(false);

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
  }, [user, busca, recarregarContador]);

  const turmas = useMemo(() => {
    const unicas = new Set(
      alunos
        .map((a) => a.serie_semestre)
        .filter((serie): serie is string => Boolean(serie))
    );
    return Array.from(unicas).sort();
  }, [alunos]);

  const alunosFiltrados = useMemo(() => {
    return alunos.filter((aluno) => {
      if (turmaFiltro !== "todas" && aluno.serie_semestre !== turmaFiltro) {
        return false;
      }

      if (situacaoFiltro === "pendencias" && aluno.pendentes_count <= 0) {
        return false;
      }

      if (
        situacaoFiltro === "poucas_horas" &&
        !(aluno.total_horas > 0 && aluno.total_horas < LIMITE_POUCAS_HORAS)
      ) {
        return false;
      }

      if (situacaoFiltro === "sem_horas" && Number(aluno.total_horas) !== 0) {
        return false;
      }

      return true;
    });
  }, [alunos, turmaFiltro, situacaoFiltro]);

  const totalAlunos = useMemo(() => alunosFiltrados.length, [alunosFiltrados]);

  const handleSelecionarPlanilha = () => {
    setErroImportacao(null);
    setResultadoImportacao(null);
    inputPlanilhaRef.current?.click();
  };

  const handleArquivoSelecionado = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    // Limpa o input para permitir selecionar o mesmo arquivo de novo depois.
    event.target.value = "";
    if (!arquivo) return;

    setImportando(true);
    setErroImportacao(null);
    setResultadoImportacao(null);

    try {
      const formData = new FormData();
      formData.append("planilha", arquivo);

      const response = await apiFetch(`${API_URL}/aluno/importar-planilha`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao importar a planilha.");
      }

      setResultadoImportacao(data);
      setRecarregarContador((c) => c + 1);
    } catch (error) {
      setErroImportacao(
        error instanceof Error ? error.message : "Erro ao importar a planilha."
      );
    } finally {
      setImportando(false);
    }
  };

  const abrirModalVisitaTurma = () => {
    setTurmaVisita(turmas[0] || "");
    setLocalVisitaTurma("");
    setHorasVisitaTurma("");
    setDataVisitaTurma("");
    setBimestreVisitaTurma("");
    setObservacaoVisitaTurma("");
    setModalVisitaTurmaAberto(true);
  };

  const registrarVisitaTurma = async (event: React.FormEvent) => {
    event.preventDefault();

    const horas = Number(horasVisitaTurma);
    if (Number.isNaN(horas) || horas <= 0) {
      alert("Informe uma quantidade de horas válida.");
      return;
    }

    if (!turmaVisita) {
      alert("Selecione a turma.");
      return;
    }

    if (!bimestreVisitaTurma) {
      alert("Selecione o bimestre.");
      return;
    }

    try {
      setSalvandoVisitaTurma(true);

      const response = await apiFetch(`${API_URL}/visita/turma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serieSemestre: turmaVisita,
          local: localVisitaTurma,
          quantidadeHoras: horas,
          dataVisita: dataVisitaTurma,
          observacao: observacaoVisitaTurma || null,
          bimestre: bimestreVisitaTurma,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao registrar visita da turma.");
      }

      alert(data.message);
      setModalVisitaTurmaAberto(false);
      setRecarregarContador((c) => c + 1);
    } catch (error: any) {
      alert(error.message || "Erro ao registrar visita da turma.");
    } finally {
      setSalvandoVisitaTurma(false);
    }
  };

  const abrirModalEmpresaTurma = () => {
    setTurmaEmpresa(turmas[0] || "");
    setNomeEmpresaTurma("");
    setRepresentanteEmpresaTurma("");
    setModalEmpresaTurmaAberto(true);
  };

  const salvarEmpresaTurma = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!turmaEmpresa) {
      alert("Selecione a turma.");
      return;
    }

    try {
      setSalvandoEmpresaTurma(true);

      const response = await apiFetch(`${API_URL}/aluno/turma/empresa-parceira`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serieSemestre: turmaEmpresa,
          empresaParceiraNome: nomeEmpresaTurma,
          empresaParceiraRepresentante: representanteEmpresaTurma,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao atualizar empresa parceira da turma.");
      }

      alert(data.message);
      setModalEmpresaTurmaAberto(false);
    } catch (error: any) {
      alert(error.message || "Erro ao atualizar empresa parceira da turma.");
    } finally {
      setSalvandoEmpresaTurma(false);
    }
  };

  if (!user) return null;

  return (
    <>
    <CoordenacaoLayout
      user={user}
      activePage="alunos"
      title="Alunos"
      subtitle="Consulte o histórico de horas de cada aluno"
      headerActions={
        <>
          <input
            ref={inputPlanilhaRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleArquivoSelecionado}
          />

          <Button
            onClick={handleSelecionarPlanilha}
            disabled={importando}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl text-white bg-white/10 hover:bg-white/15 border border-white/10"
          >
            <Upload className="size-4" />
            {importando ? "Importando..." : "Importar planilha"}
          </Button>

          <Button
            onClick={abrirModalVisitaTurma}
            disabled={turmas.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl text-white bg-white/10 hover:bg-white/15 border border-white/10"
          >
            <CalendarDays className="size-4" />
            Visita p/ turma
          </Button>

          <Button
            onClick={abrirModalEmpresaTurma}
            disabled={turmas.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl text-white bg-white/10 hover:bg-white/15 border border-white/10"
          >
            <Building2 className="size-4" />
            Empresa p/ turma
          </Button>
        </>
      }
    >
        {(resultadoImportacao || erroImportacao) && (
          <Card className="rounded-2xl border-0 shadow mb-6" style={panelStyle}>
            <CardContent className="pt-6">
              {erroImportacao && (
                <p className="text-red-300">
                  Não foi possível importar: {erroImportacao}
                </p>
              )}

              {resultadoImportacao && (
                <div className="text-white/90 space-y-2">
                  <p className="font-semibold">
                    Importação concluída
                    {resultadoImportacao.turma.turma
                      ? ` — ${resultadoImportacao.turma.turma}${
                          resultadoImportacao.turma.serieSemestre
                            ? ` · ${resultadoImportacao.turma.serieSemestre}`
                            : ""
                        }${resultadoImportacao.turma.ano ? ` · ${resultadoImportacao.turma.ano}` : ""}`
                      : ""}
                    .
                  </p>
                  <p className="text-sm text-white/70">
                    {resultadoImportacao.criados} aluno(s) novo(s) cadastrado(s), {""}
                    {resultadoImportacao.atualizados} atualizado(s) de {""}
                    {resultadoImportacao.totalNaPlanilha} linha(s) válida(s) na planilha.
                  </p>

                  {resultadoImportacao.ignorados.length > 0 && (
                    <div className="text-sm text-amber-300">
                      <p>{resultadoImportacao.ignorados.length} linha(s) ignorada(s):</p>
                      <ul className="list-disc list-inside">
                        {resultadoImportacao.ignorados.map((item) => (
                          <li key={item.linha}>
                            Linha {item.linha}: {item.motivo}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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

            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <select
                value={turmaFiltro}
                onChange={(e) => setTurmaFiltro(e.target.value)}
                className="w-full sm:w-auto rounded-xl bg-white/10 border border-white/10 py-2 px-3 text-white outline-none [&>option]:bg-[#2f3147]"
              >
                <option value="todas">Todas as turmas</option>
                {turmas.map((turma) => (
                  <option key={turma} value={turma}>
                    {turma}
                  </option>
                ))}
              </select>

              <select
                value={situacaoFiltro}
                onChange={(e) => setSituacaoFiltro(e.target.value as FiltroSituacao)}
                className="w-full sm:w-auto rounded-xl bg-white/10 border border-white/10 py-2 px-3 text-white outline-none [&>option]:bg-[#2f3147]"
              >
                <option value="todos">Todas as situações</option>
                <option value="pendencias">Com atividades pendentes</option>
                <option value="poucas_horas">Poucas horas (menos de {LIMITE_POUCAS_HORAS}h)</option>
                <option value="sem_horas">Sem horas registradas</option>
              </select>
            </div>
          </CardHeader>

          <CardContent>
            {loading && (
              <div className="rounded-2xl bg-white/10 p-8 text-center">
                <p className="text-white/70">Carregando alunos...</p>
              </div>
            )}

            {!loading && alunosFiltrados.length === 0 && (
              <div className="rounded-2xl bg-white/10 p-8 text-center">
                <Users className="size-10 text-white/70 mx-auto mb-3" />
                <h3 className="text-white text-lg font-semibold mb-1">
                  Nenhum aluno encontrado
                </h3>
                <p className="text-white/70">
                  Ajuste a busca ou os filtros aplicados.
                </p>
              </div>
            )}

            {!loading && alunosFiltrados.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {alunosFiltrados.map((aluno) => (
                  <button
                    key={aluno.id_aluno}
                    type="button"
                    onClick={() => navigate(`/coordenacao/alunos/${aluno.id_aluno}`)}
                    className="text-left rounded-2xl bg-white/10 p-5 border border-white/10 hover:bg-white/15 transition"
                    style={cardStyle}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        <h3 className="text-white font-semibold text-lg break-words">
                          {aluno.nome}
                        </h3>
                        <p className="text-white/70 text-sm break-words">{aluno.email}</p>
                      </div>

                      {aluno.pendentes_count > 0 && (
                        <span className="shrink-0 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold px-2.5 py-1">
                          {aluno.pendentes_count} pendente(s)
                        </span>
                      )}
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
    </CoordenacaoLayout>

    {modalVisitaTurmaAberto && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-lg max-h-[90vh] rounded-2xl p-6 shadow-xl overflow-y-auto" style={panelStyle}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <CalendarDays className="size-5" />
              Registrar visita para a turma
            </h2>

            <button
              onClick={() => setModalVisitaTurmaAberto(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
              type="button"
            >
              <X className="size-5 text-white" />
            </button>
          </div>

          <p className="text-white/60 text-sm mb-4">
            Cria a mesma visita técnica para todos os alunos da turma escolhida de uma vez.
          </p>

          <form onSubmit={registrarVisitaTurma} className="space-y-4">
            <div>
              <label className="block text-white mb-2">Turma</label>
              <select
                value={turmaVisita}
                onChange={(e) => setTurmaVisita(e.target.value)}
                required
                className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none [&>option]:bg-[#2f3147]"
              >
                {turmas.map((turma) => (
                  <option key={turma} value={turma}>
                    {turma}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white mb-2">Local</label>
              <input
                type="text"
                value={localVisitaTurma}
                onChange={(e) => setLocalVisitaTurma(e.target.value)}
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
                value={horasVisitaTurma}
                onChange={(e) => setHorasVisitaTurma(e.target.value)}
                required
                className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-white mb-2">Data</label>
              <input
                type="date"
                value={dataVisitaTurma}
                onChange={(e) => setDataVisitaTurma(e.target.value)}
                required
                className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-white mb-2">Bimestre</label>
              <select
                value={bimestreVisitaTurma}
                onChange={(e) => setBimestreVisitaTurma(e.target.value)}
                required
                className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none [&>option]:bg-[#2f3147]"
              >
                <option value="" className="text-black">Selecione...</option>
                <option value="1" className="text-black">1º Bimestre</option>
                <option value="2" className="text-black">2º Bimestre</option>
                <option value="3" className="text-black">3º Bimestre</option>
                <option value="4" className="text-black">4º Bimestre</option>
              </select>
            </div>

            <div>
              <label className="block text-white mb-2">Observação (opcional)</label>
              <textarea
                value={observacaoVisitaTurma}
                onChange={(e) => setObservacaoVisitaTurma(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                type="button"
                onClick={() => setModalVisitaTurmaAberto(false)}
                variant="outline"
                className="rounded-xl bg-transparent text-white hover:bg-white/10"
                style={{ borderColor: "#8c8da9", color: "#ffffff" }}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={salvandoVisitaTurma}
                className="rounded-xl bg-white text-[#2f3147] hover:bg-white/90"
              >
                {salvandoVisitaTurma ? "Salvando..." : "Registrar para a turma"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )}

    {modalEmpresaTurmaAberto && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-lg max-h-[90vh] rounded-2xl p-6 shadow-xl overflow-y-auto" style={panelStyle}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Building2 className="size-5" />
              Empresa parceira da turma
            </h2>

            <button
              onClick={() => setModalEmpresaTurmaAberto(false)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
              type="button"
            >
              <X className="size-5 text-white" />
            </button>
          </div>

          <p className="text-white/60 text-sm mb-4">
            Define a mesma empresa parceira e representante para todos os alunos da turma escolhida.
          </p>

          <form onSubmit={salvarEmpresaTurma} className="space-y-4">
            <div>
              <label className="block text-white mb-2">Turma</label>
              <select
                value={turmaEmpresa}
                onChange={(e) => setTurmaEmpresa(e.target.value)}
                required
                className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none [&>option]:bg-[#2f3147]"
              >
                {turmas.map((turma) => (
                  <option key={turma} value={turma}>
                    {turma}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white mb-2">Nome da empresa parceira</label>
              <input
                type="text"
                value={nomeEmpresaTurma}
                onChange={(e) => setNomeEmpresaTurma(e.target.value)}
                maxLength={255}
                className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                placeholder="Ex: Tech Solutions Ltda."
              />
            </div>

            <div>
              <label className="block text-white mb-2">Representante da empresa</label>
              <input
                type="text"
                value={representanteEmpresaTurma}
                onChange={(e) => setRepresentanteEmpresaTurma(e.target.value)}
                maxLength={255}
                className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                placeholder="Ex: Maria Fernanda Costa"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                type="button"
                onClick={() => setModalEmpresaTurmaAberto(false)}
                variant="outline"
                className="rounded-xl bg-transparent text-white hover:bg-white/10"
                style={{ borderColor: "#8c8da9", color: "#ffffff" }}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={salvandoEmpresaTurma}
                className="rounded-xl bg-white text-[#2f3147] hover:bg-white/90"
              >
                {salvandoEmpresaTurma ? "Salvando..." : "Aplicar para a turma"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
