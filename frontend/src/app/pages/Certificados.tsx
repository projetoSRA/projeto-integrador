import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { User } from "../utils/auth";
import { apiFetch } from "../utils/api";
import AlunoLayout, { glassCardStyle } from "../components/AlunoLayout";
import { panelStyle, cardStyle, buttonGlass } from "../../styles/uiStyles";
import {
  FileText,
  Upload,
  Trash2,
  Eye,
  X,
  FileBadge2,
} from "lucide-react";

type TipoArquivo = "certificado" | "relatorio";

type ArquivoAluno = {
  id: number;
  tipo: TipoArquivo;
  titulo: string;
  quantidadeHoras: number;
  horasAprovadas: number;
  dataEmissao: string;
  arquivoNome: string;
  arquivoUrl: string;
  status: string;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function formatarData(dataISO: string) {
  if (!dataISO) return "-";

  const data = new Date(dataISO);

  if (Number.isNaN(data.getTime())) {
    return dataISO;
  }

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function statusClasse(status: string) {
  const statusNormalizado = status.toUpperCase();

  if (statusNormalizado === "APROVADO") {
    return "text-green-400";
  }

  if (statusNormalizado === "REPROVADO") {
    return "text-red-400";
  }

  return "text-blue-400";
}

export default function Certificados() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [arquivos, setArquivos] = useState<ArquivoAluno[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [filtro, setFiltro] = useState<TipoArquivo>("certificado");
  const [tipoSelecionado, setTipoSelecionado] =
    useState<TipoArquivo>("certificado");

  const [titulo, setTitulo] = useState("");
  const [horas, setHoras] = useState("");
  const [data, setData] = useState("");
  const [bimestre, setBimestre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [local, setLocal] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

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
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    async function carregarArquivos() {
      try {
        setLoading(true);

        const response = await apiFetch(`${API_URL}/certificados/aluno/${user.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Erro ao carregar arquivos");
        }

        const arquivosFormatados: ArquivoAluno[] = data.map((item: any) => ({
          id: item.id_certificado,
          tipo: item.tipo_arquivo === "RELATORIO" ? "relatorio" : "certificado",
          titulo: item.titulo,
          quantidadeHoras: Number(item.quantidade_horas || 0),
          horasAprovadas: Number(item.horas_aprovadas || 0),
          dataEmissao: item.data_emissao,
          arquivoNome: item.nome_arquivo || "Arquivo",
          arquivoUrl: item.url_publica || item.url_arquivo,
          status: item.status_certificado || "PENDENTE",
        }));

        setArquivos(arquivosFormatados);
      } catch (error) {
        console.error("Erro ao carregar arquivos:", error);
        setArquivos([]);
      } finally {
        setLoading(false);
      }
    }

    carregarArquivos();
  }, [user]);

  const certificados = arquivos.filter((item) => item.tipo === "certificado");
  const relatorios = arquivos.filter((item) => item.tipo === "relatorio");

  const totalHoras = useMemo(() => {
    return arquivos
      .filter((item) => item.status.toUpperCase() === "APROVADO")
      .reduce((acc, item) => acc + Number(item.horasAprovadas || 0), 0);
  }, [arquivos]);

  const limparFormulario = () => {
    setTitulo("");
    setHoras("");
    setData("");
    setBimestre("");
    setCategoria("");
    setLocal("");
    setConteudo("");
    setArquivo(null);
  };

  const abrirModal = (tipo: TipoArquivo) => {
    setTipoSelecionado(tipo);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    limparFormulario();
  };

  const validarArquivo = () => {
    if (!arquivo) {
      alert("Selecione um arquivo.");
      return false;
    }

    const nome = arquivo.name.toLowerCase();

    const extensoesCertificado = [".png", ".jpg", ".jpeg", ".pdf"];
    const extensoesRelatorio = [".pdf", ".txt", ".doc", ".docx"];

    const extensoesPermitidas =
      tipoSelecionado === "certificado"
        ? extensoesCertificado
        : extensoesRelatorio;

    const permitido = extensoesPermitidas.some((ext) => nome.endsWith(ext));

    if (!permitido) {
      alert(
        tipoSelecionado === "certificado"
          ? "Certificados aceitam apenas imagem ou PDF."
          : "Relatórios aceitam apenas PDF, TXT, DOC ou DOCX."
      );
      return false;
    }

    const horasNumber = Number(horas);

    if (Number.isNaN(horasNumber) || horasNumber <= 0) {
      alert("Informe uma quantidade de horas válida.");
      return false;
    }

    if (
      tipoSelecionado === "relatorio" &&
      (horasNumber < 1 || horasNumber > 2)
    ) {
      alert("Relatórios devem ter entre 1 e 2 horas.");
      return false;
    }

    if (!bimestre) {
      alert("Selecione o bimestre.");
      return false;
    }

    if (tipoSelecionado === "relatorio") {
      if (!categoria) {
        alert("Selecione a categoria do relatório (Palestra, Curso ou Visita).");
        return false;
      }

      if (!local.trim() || !conteudo.trim()) {
        alert(
          "Para relatórios, informe o local da atividade e o conteúdo do relato — é o texto usado para montar o Portfólio do Aluno automaticamente."
        );
        return false;
      }
    }

    return true;
  };

  const enviarArquivo = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validarArquivo() || !arquivo || !user) return;

    try {
      setSalvando(true);

      const formData = new FormData();

      formData.append("idAluno", String(user.id));
      formData.append("tipo", tipoSelecionado);
      formData.append("titulo", titulo);
      formData.append("horas", horas);
      formData.append("dataEmissao", data);
      formData.append("bimestre", bimestre);
      formData.append("arquivo", arquivo);

      if (tipoSelecionado === "relatorio") {
        formData.append("categoria", categoria);
        formData.append("local", local);
        formData.append("conteudo", conteudo);
      }

      const response = await apiFetch(`${API_URL}/certificados/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Erro ao enviar arquivo");
      }

      const item = result.arquivo;

      const novoArquivo: ArquivoAluno = {
        id: item.id_certificado,
        tipo: item.tipo_arquivo === "RELATORIO" ? "relatorio" : "certificado",
        titulo: item.titulo,
        quantidadeHoras: Number(item.quantidade_horas || 0),
        horasAprovadas: Number(item.horas_aprovadas || 0),
        dataEmissao: item.data_emissao,
        arquivoNome: item.nome_arquivo || "Arquivo",
        arquivoUrl: item.url_publica || item.url_arquivo,
        status: item.status_certificado || "PENDENTE",
      };

      setArquivos((prev) => [novoArquivo, ...prev]);
      fecharModal();
    } catch (error: any) {
      alert(error.message || "Erro ao enviar arquivo.");
    } finally {
      setSalvando(false);
    }
  };

  const excluirArquivo = async (id: number) => {
    if (!confirm("Deseja realmente excluir este arquivo?")) return;

    try {
      const response = await apiFetch(`${API_URL}/certificados/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao excluir arquivo");
      }

      setArquivos((prev) => prev.filter((item) => item.id !== id));
    } catch (error: any) {
      alert(error.message || "Erro ao excluir arquivo.");
    }
  };

  if (!user) return null;

  const renderLista = (lista: ArquivoAluno[], vazio: string) => {
    if (loading) {
      return (
        <div className="rounded-2xl bg-white/10 p-8 text-center">
          <p className="text-white/70">Carregando arquivos...</p>
        </div>
      );
    }

    if (lista.length === 0) {
      return (
        <div className="rounded-2xl bg-white/10 p-8 text-center">
          <FileText className="size-10 text-white/70 mx-auto mb-3" />
          <h3 className="text-white text-lg font-semibold mb-1">{vazio}</h3>
          <p className="text-white/70">
            Clique em importar para cadastrar um novo arquivo.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {lista.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl bg-white/10 p-5 border border-white/10"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-white font-semibold text-lg mb-2">
                  {item.titulo}
                </h3>

                <p className="text-white/70 text-sm mb-1">
                  Horas:{" "}
                  <span className="text-white font-semibold">
                    {item.status.toUpperCase() === "APROVADO"
                      ? `${item.horasAprovadas}h aprovadas (de ${item.quantidadeHoras}h)`
                      : `${item.quantidadeHoras}h solicitadas`}
                  </span>
                </p>

                <p className="text-white/70 text-sm mb-1">
                  Data:{" "}
                  <span className="text-white">
                    {formatarData(item.dataEmissao)}
                  </span>
                </p>

                <p className="text-white/70 text-sm mb-1">
                  Arquivo:{" "}
                  <span className="text-white">{item.arquivoNome}</span>
                </p>

                <p className="text-white/70 text-sm">
                  Status:{" "}
                  <span className={`${statusClasse(item.status)} font-semibold`}>
                    {item.status}
                  </span>
                </p>
              </div>

              <div className="flex gap-2">
                <a
                  href={item.arquivoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                  title="Ver arquivo"
                >
                  <Eye className="size-5 text-white" />
                </a>

                <button
                  onClick={() => excluirArquivo(item.id)}
                  className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 transition"
                  title="Excluir arquivo"
                  type="button"
                >
                  <Trash2 className="size-5 text-red-300" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AlunoLayout
      user={user}
      activePage="certificados"
      horas={totalHoras}
      certificados={certificados.length}
      relatorios={relatorios.length}
    >
      <Card className="rounded-2xl border-0 shadow mb-6" style={panelStyle}>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileBadge2 className="size-5" />
            Arquivos Acadêmicos
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex gap-2 bg-white/10 p-1 rounded-xl">
              <button
                onClick={() => setFiltro("certificado")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filtro === "certificado"
                    ? "bg-white text-[#2f3147]"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Certificados
              </button>

              <button
                onClick={() => setFiltro("relatorio")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filtro === "relatorio"
                    ? "bg-white text-[#2f3147]"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Relatórios
              </button>
            </div>

            <Button
              onClick={() => abrirModal(filtro)}
              className="w-full sm:w-auto rounded-xl bg-white text-[#2f3147] hover:bg-white/90 flex items-center justify-center gap-2"
            >
              <Upload className="size-4" />
              {filtro === "certificado"
                ? "Importar certificado"
                : "Importar relatório"}
            </Button>
          </div>

          {filtro === "certificado"
            ? renderLista(certificados, "Nenhum certificado encontrado")
            : renderLista(relatorios, "Nenhum relatório encontrado")}
        </CardContent>
      </Card>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-lg max-h-[90vh] rounded-2xl p-6 shadow-xl overflow-y-auto"
            style={panelStyle}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-white">
                {tipoSelecionado === "certificado"
                  ? "Importar Certificado"
                  : "Importar Relatório"}
              </h2>

              <button
                onClick={fecharModal}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                type="button"
              >
                <X className="size-5 text-white" />
              </button>
            </div>

            <form onSubmit={enviarArquivo} className="space-y-4">
              <div>
                <label className="block text-white mb-2">
                  {tipoSelecionado === "certificado"
                    ? "Evento / Curso"
                    : "Título do relatório"}
                </label>

                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  required
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                  placeholder={
                    tipoSelecionado === "certificado"
                      ? "Ex: Semana de Tecnologia"
                      : "Ex: Relatório Interdisciplinar"
                  }
                />
              </div>

              <div>
                <label className="block text-white mb-2">Horas</label>

                <input
                  type="number"
                  value={horas}
                  onChange={(e) => setHoras(e.target.value)}
                  min={1}
                  max={tipoSelecionado === "relatorio" ? 2 : 50}
                  required
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                  placeholder={
                    tipoSelecionado === "relatorio"
                      ? "Entre 1 e 2 horas"
                      : "Ex: 10"
                  }
                />
              </div>

              <div>
                <label className="block text-white mb-2">Data</label>

                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  required
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-white mb-2">Bimestre</label>

                <select
                  value={bimestre}
                  onChange={(e) => setBimestre(e.target.value)}
                  required
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                >
                  <option value="" className="text-black">
                    Selecione...
                  </option>
                  <option value="1" className="text-black">1º Bimestre</option>
                  <option value="2" className="text-black">2º Bimestre</option>
                  <option value="3" className="text-black">3º Bimestre</option>
                  <option value="4" className="text-black">4º Bimestre</option>
                </select>
              </div>

              {tipoSelecionado === "relatorio" && (
                <>
                  <div>
                    <label className="block text-white mb-2">
                      Categoria do relatório
                    </label>

                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      required
                      className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none [&>option]:bg-[#2f3147]"
                    >
                      <option value="" className="text-black">Selecione...</option>
                      <option value="PALESTRA" className="text-black">Palestra</option>
                      <option value="CURSO" className="text-black">Curso</option>
                      <option value="VISITA" className="text-black">Visita</option>
                    </select>

                    <p className="text-white/60 text-sm mt-2">
                      Define em qual seção do Portfólio do Aluno esse relatório vai aparecer.
                    </p>
                  </div>

                  <div>
                    <label className="block text-white mb-2">
                      Local da atividade
                    </label>

                    <input
                      type="text"
                      value={local}
                      onChange={(e) => setLocal(e.target.value)}
                      required
                      className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none"
                      placeholder="Ex: Auditório Fatec Ourinhos, Online via Youtube..."
                    />
                  </div>

                  <div>
                    <label className="block text-white mb-2">
                      Conteúdo do relatório
                    </label>

                    <textarea
                      value={conteudo}
                      onChange={(e) => setConteudo(e.target.value)}
                      required
                      rows={6}
                      maxLength={10000}
                      className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white outline-none resize-y"
                      placeholder="Escreva o relato da atividade (pode incluir RESULTADOS e AGRADECIMENTOS, como no portfólio bimestral)."
                    />

                    <p className="text-white/60 text-sm mt-2">
                      Esse texto é usado depois para montar o Portfólio do Aluno automaticamente.
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-white mb-2">Arquivo</label>

                <input
                  type="file"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                  required
                  accept={
                    tipoSelecionado === "certificado"
                      ? "image/png, image/jpeg, application/pdf"
                      : ".pdf,.txt,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  }
                  className="w-full rounded-xl bg-white/10 border border-white/10 p-3 text-white"
                />

                <p className="text-white/60 text-sm mt-2">
                  {tipoSelecionado === "certificado"
                    ? "Permitido: imagem ou PDF."
                    : "Permitido: PDF, TXT, DOC ou DOCX."}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3">
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
                  {salvando ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AlunoLayout>
  );
}