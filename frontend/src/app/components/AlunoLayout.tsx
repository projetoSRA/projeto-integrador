import { ReactNode, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { User } from "../utils/auth";
import { panelStyle } from "../../styles/uiStyles";
import { LogOut, GraduationCap, Settings, Camera } from "lucide-react";

type ActivePage = "inicio" | "horas" | "certificados" | "eventos";

type AlunoLayoutProps = {
  user: User & {
    foto_perfil_url?: string;
  };
  activePage: ActivePage;
  children: ReactNode;
  horas?: number;
  certificados?: number;
  relatorios?: number;
};

export const glassCardStyle = {
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.045), rgba(59,130,246,0.10))",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function AlunoLayout({
  user,
  activePage,
  children,
  horas = 0,
  certificados,
  relatorios,
}: AlunoLayoutProps) {
  const navigate = useNavigate();

  const [modalSair, setModalSair] = useState(false);
  const [fotoPerfil, setFotoPerfil] = useState(user.foto_perfil_url || "");
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [menuMolduraAberto, setMenuMolduraAberto] = useState(false);

  const handleLogout = () => {
    setModalSair(true);
  };

  const confirmarLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };
  const [moldura, setMoldura] = useState(
  localStorage.getItem(`moldura_aluno_${user.id}`) || "azul"
);

  const trocarFotoPerfil = async (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const file = event.target.files?.[0];

  if (!file) return;

  const tiposPermitidos = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

  if (!tiposPermitidos.includes(file.type)) {
    alert("Envie uma imagem PNG, JPG, JPEG ou WEBP.");
    return;
  }

  if (file.size > 15 * 1024 * 1024) {
    alert("A imagem deve ter no máximo 15MB.");
    return;
  }

  try {
    setEnviandoFoto(true);

    const formData = new FormData();
    formData.append("foto", file);

    const response = await fetch(`${API_URL}/aluno/${user.id}/foto`, {
      method: "POST",
      body: formData,
    });

    const texto = await response.text();

    let data;
    try {
      data = JSON.parse(texto);
    } catch {
      throw new Error("A rota de foto não retornou JSON. Verifique o backend.");
    }

    if (!response.ok) {
      throw new Error(data.message || "Erro ao atualizar foto.");
    }

    setFotoPerfil(data.foto_perfil_url);

    const userAtualizado = {
      ...user,
      foto_perfil_url: data.foto_perfil_url,
    };

    localStorage.setItem("user", JSON.stringify(userAtualizado));
  } catch (error: any) {
    alert(error.message || "Erro ao atualizar foto.");
  } finally {
    setEnviandoFoto(false);
  }
};

  const navClass = (page: ActivePage) =>
    activePage === page
      ? "text-blue-400 text-lg font-semibold transition"
      : "text-white/90 hover:text-blue-400 text-lg font-semibold transition hover:scale-105";

      const molduras = {
  azul: "border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.45)]",
  roxa: "border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.45)]",
  verde: "border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.45)]",
  dourada: "border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.45)]",
  vermelha: "border-red-400 shadow-[0_0_25px_rgba(248,113,113,0.45)]",
};

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
            <h2 className="text-2xl font-semibold text-white mb-6">
              Minhas Informações
            </h2>

           <div className="flex flex-col items-center mb-5">
  <div className="relative">
    {/* FOTO */}
    <div
      onClick={() => setMenuMolduraAberto(!menuMolduraAberto)}
      className={`w-32 h-32 rounded-full overflow-hidden border-4 cursor-pointer transition ${molduras[moldura as keyof typeof molduras]}`}
    >
      <img
        src={fotoPerfil}
        alt="Foto do aluno"
        className="w-full h-full object-cover"
      />
    </div>

    {/* BOTÃO CAMERA */}
    <label className="absolute bottom-1 right-1 bg-black/70 hover:bg-black/80 transition p-2 rounded-full cursor-pointer">
      <Camera className="size-4 text-white" />
      <input
        type="file"
        accept="image/*"
        onChange={trocarFotoPerfil}
        className="hidden"
        disabled={enviandoFoto}
      />
    </label>

    {/* MENU DE MOLDURAS (ESCONDIDO) */}
    {menuMolduraAberto && (
      <div className="absolute top-36 left-1/2 -translate-x-1/2 bg-[#0b0d14] border border-white/10 rounded-xl p-3 flex gap-2 shadow-2xl z-50">
        {Object.entries(molduras).map(([nome, classe]) => (
          <button
            key={nome}
            type="button"
            onClick={() => {
              setMoldura(nome);
              localStorage.setItem(`moldura_aluno_${user.id}`, nome);
              setMenuMolduraAberto(false);
            }}
            className={`w-8 h-8 rounded-full border-2 transition hover:scale-110 ${
              moldura === nome ? "scale-110 ring-2 ring-white/70" : ""
            } ${classe}`}
            title={`Moldura ${nome}`}
          />
        ))}
      </div>
    )}
  </div>
</div>

            <p className="text-white mb-2 text-base">
              <strong>Nome:</strong> {user.name}
            </p>

            <p className="text-white mb-4 text-base">
              <strong>RM:</strong> {user.identifier}
            </p>

            <p className="text-white mb-5 text-base">
              <strong>Curso:</strong> Análise e Desenvolvimento de Sistemas
            </p>

            <div className="space-y-4 mt-6">
              <div className="flex justify-between bg-white/10 p-3 rounded-xl text-white">
                <span>Status</span>
                <span className="font-semibold text-blue-400">Ativo</span>
              </div>

              {certificados !== undefined && (
                <div className="flex justify-between bg-white/10 p-3 rounded-xl text-white">
                  <span>Certificados</span>
                  <span className="font-semibold">{certificados}</span>
                </div>
              )}

              {relatorios !== undefined && (
                <div className="flex justify-between bg-white/10 p-3 rounded-xl text-white">
                  <span>Relatórios</span>
                  <span className="font-semibold">{relatorios}</span>
                </div>
              )}

              <div className="flex justify-between bg-white/10 p-3 rounded-xl text-white">
                <span>Horas</span>
                <span className="font-semibold">{horas}h</span>
              </div>

              <div className="flex justify-between bg-white/10 p-3 rounded-xl text-white">
                <span>Ano</span>
                <span className="font-semibold">1º ADS</span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleLogout}
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
              className="grid grid-cols-3 items-center mb-8 p-6 rounded-2xl"
              style={panelStyle}
            >
              <div className="flex items-center gap-4">
                <GraduationCap className="size-9 text-blue-400" />
                <div>
                  <h1 className="text-3xl font-semibold text-white">
                    Central SRA
                  </h1>
                  <p className="text-white/70 text-base">
                    Bem-vindo(a), {user.name}
                  </p>
                </div>
              </div>

              <div className="flex justify-center gap-12">
                <button
                  onClick={() => navigate("/aluno")}
                  className={navClass("inicio")}
                >
                  Início
                </button>

                <button
                  onClick={() => navigate("/horas-ams")}
                  className={navClass("horas")}
                >
                  Horas
                </button>

                <button
                  onClick={() => navigate("/certificados")}
                  className={navClass("certificados")}
                >
                  Certificados
                </button>

                <button
                  onClick={() => navigate("/eventos")}
                  className={navClass("eventos")}
                >
                  Eventos
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => navigate("/configuracoes")}
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/15 transition hover:rotate-90 duration-300"
                  type="button"
                >
                  <Settings className="size-6 text-white" />
                </button>
              </div>
            </header>

            {children}
          </div>
        </main>
      </div>

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
                className="rounded-xl bg-white/10 text-white hover:bg-white/15 border border-white/10"
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