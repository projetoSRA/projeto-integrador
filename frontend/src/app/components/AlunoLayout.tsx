import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { User } from "../utils/auth";
import { apiFetch, clearSession } from "../utils/api";
import { panelStyle } from "../../styles/uiStyles";
import {
  LogOut,
  GraduationCap,
  Settings,
  Camera,
  House,
  Clock3,
  FileBadge2,
  CalendarDays,
} from "lucide-react";

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
  const [infoAberto, setInfoAberto] = useState(false);
  const [menuConfigAberto, setMenuConfigAberto] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!infoAberto) {
      setMenuMolduraAberto(false);
      return;
    }

    function handleClickFora(event: MouseEvent) {
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setInfoAberto(false);
      }
    }

    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [infoAberto]);

  const handleLogout = () => {
    setInfoAberto(false);
    setMenuConfigAberto(false);
    setModalSair(true);
  };

  const confirmarLogout = () => {
    clearSession();
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

    const response = await apiFetch(`${API_URL}/aluno/${user.id}/foto`, {
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
      ? "min-w-0 rounded-lg bg-blue-500/20 px-2 py-2 text-sm font-semibold text-blue-300 transition sm:px-3 sm:text-base lg:bg-transparent lg:px-0 lg:py-0 lg:text-lg lg:text-blue-400"
      : "min-w-0 rounded-lg px-2 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white sm:px-3 sm:text-base lg:px-0 lg:py-0 lg:text-lg lg:font-semibold lg:text-white/90 lg:hover:scale-105 lg:hover:bg-transparent lg:hover:text-blue-400";

      const molduras = {
  azul: "border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.45)]",
  roxa: "border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.45)]",
  verde: "border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.45)]",
  dourada: "border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.45)]",
  vermelha: "border-red-400 shadow-[0_0_25px_rgba(248,113,113,0.45)]",
};

  return (
    <div
      className="min-h-screen min-h-[100dvh] lg:h-screen lg:overflow-hidden p-3 pb-24 sm:p-4 sm:pb-24 md:p-6 md:pb-24 lg:pb-6 relative"
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

      <div className="relative flex flex-col lg:flex-row h-full gap-4 lg:gap-10">
        <aside
          className="hidden lg:flex lg:order-1 lg:w-80 lg:shrink-0 lg:h-full lg:min-h-0 lg:overflow-hidden p-5 flex-col justify-start rounded-2xl"
          style={panelStyle}
        >
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Minhas Informações
            </h2>

           <div className="flex flex-col items-center mb-5">
  <div className="relative">
    {/* FOTO */}
    <div
      onClick={() => setMenuMolduraAberto(!menuMolduraAberto)}
      className={`w-24 h-24 rounded-full overflow-hidden border-4 cursor-pointer transition ${molduras[moldura as keyof typeof molduras]}`}
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
      <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-[#0b0d14] border border-white/10 rounded-xl p-3 flex gap-2 shadow-2xl z-50">
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

            <p className="text-white mb-2.5 text-sm leading-relaxed">
              <strong>Nome:</strong> {user.name}
            </p>

            <p className="text-white mb-3 text-sm leading-relaxed">
              <strong>{user.nivel_ensino === "FACULDADE" ? "RA:" : "RM:"}</strong> {user.identifier}
            </p>

            <p className="text-white mb-4 text-sm leading-relaxed">
              <strong>Curso:</strong> {user.curso || "Não informado"}
              {user.serie_semestre ? ` · ${user.serie_semestre}` : ""}
            </p>

            <div className="space-y-3 mt-4">
              <div className="flex justify-between bg-white/10 px-3 py-2 rounded-xl text-sm text-white">
                <span>Status</span>
                <span className="font-semibold text-blue-400">Ativo</span>
              </div>

              {certificados !== undefined && (
                <div className="flex justify-between bg-white/10 px-3 py-2 rounded-xl text-sm text-white">
                  <span>Certificados</span>
                  <span className="font-semibold">{certificados}</span>
                </div>
              )}

              {relatorios !== undefined && (
                <div className="flex justify-between bg-white/10 px-3 py-2 rounded-xl text-sm text-white">
                  <span>Relatórios</span>
                  <span className="font-semibold">{relatorios}</span>
                </div>
              )}

              <div className="flex justify-between bg-white/10 px-3 py-2 rounded-xl text-sm text-white">
                <span>Horas</span>
                <span className="font-semibold">{horas}h</span>
              </div>

              <div className="flex justify-between bg-white/10 px-3 py-2 rounded-xl text-sm text-white">
                <span>Ano</span>
                <span className="font-semibold">1º ADS</span>
              </div>
            </div>
          </div>

        </aside>

        <main className="order-1 lg:order-2 flex-1 rounded-2xl p-1 sm:p-4 md:p-6 lg:overflow-hidden">
          <div
            className="
              max-w-7xl mx-auto lg:h-full lg:overflow-y-auto lg:pr-2
              [scrollbar-width:none]
              [-ms-overflow-style:none]
              [&::-webkit-scrollbar]:hidden
            "
          >
            <header
              className="relative z-20 flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-4 mb-4 sm:mb-6 lg:mb-8 p-3 sm:p-4 lg:p-6 rounded-2xl"
              style={panelStyle}
            >
              <div className="w-full lg:w-auto flex items-center gap-3 sm:gap-4 shrink-0">
                <div className="relative lg:hidden" ref={infoRef}>
                  <button
                    type="button"
                    onClick={() => setInfoAberto((v) => !v)}
                    className={`w-11 h-11 rounded-full overflow-hidden border-4 cursor-pointer transition hover:scale-105 shrink-0 ${
                      molduras[moldura as keyof typeof molduras]
                    }`}
                    title="Minhas informações"
                  >
                    <img
                      src={fotoPerfil}
                      alt="Foto do aluno"
                      className="w-full h-full object-cover"
                    />
                  </button>

                  {infoAberto && (
                    <div
                      className="absolute left-0 top-full mt-3 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-2xl p-5 shadow-2xl border border-white/10 bg-[#0b0d14] max-h-[75vh] overflow-y-auto"
                    >
                      <h2 className="text-xl font-semibold text-white mb-5">
                        Minhas Informações
                      </h2>

                      <div className="flex flex-col items-center mb-5">
                        <div className="relative">
                          <div
                            onClick={() => setMenuMolduraAberto(!menuMolduraAberto)}
                            className={`w-24 h-24 rounded-full overflow-hidden border-4 cursor-pointer transition ${
                              molduras[moldura as keyof typeof molduras]
                            }`}
                          >
                            <img
                              src={fotoPerfil}
                              alt="Foto do aluno"
                              className="w-full h-full object-cover"
                            />
                          </div>

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

                          {menuMolduraAberto && (
                            <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-[#0b0d14] border border-white/10 rounded-xl p-3 flex gap-2 shadow-2xl z-50">
                              {Object.entries(molduras).map(([nome, classe]) => (
                                <button
                                  key={nome}
                                  type="button"
                                  onClick={() => {
                                    setMoldura(nome);
                                    localStorage.setItem(
                                      `moldura_aluno_${user.id}`,
                                      nome
                                    );
                                    setMenuMolduraAberto(false);
                                  }}
                                  className={`w-8 h-8 rounded-full border-2 transition hover:scale-110 ${
                                    moldura === nome
                                      ? "scale-110 ring-2 ring-white/70"
                                      : ""
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
                        <strong>
                          {user.nivel_ensino === "FACULDADE" ? "RA:" : "RM:"}
                        </strong>{" "}
                        {user.identifier}
                      </p>

                      <p className="text-white mb-5 text-base">
                        <strong>Curso:</strong> {user.curso || "Não informado"}
                        {user.serie_semestre ? ` · ${user.serie_semestre}` : ""}
                      </p>

                      <div className="space-y-3 mb-6">
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
                  )}
                </div>

                <GraduationCap className="hidden lg:block size-9 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-2xl lg:text-3xl font-semibold text-white whitespace-nowrap">
                    Central SRA
                  </h1>
                  <p className="hidden lg:block text-white/70 text-sm sm:text-base">
                    Bem-vindo(a), {user.name}
                  </p>
                </div>

                <div className="relative ml-auto lg:hidden">
                  <button
                    onClick={() => setMenuConfigAberto((aberto) => !aberto)}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition shrink-0"
                    type="button"
                    aria-label="Abrir menu da conta"
                  >
                    <Settings className="size-5 text-white" />
                  </button>

                  {menuConfigAberto && (
                    <div className="absolute right-0 top-full mt-2 z-50 w-40 rounded-xl border border-white/10 bg-[#10131b] p-1.5 shadow-2xl">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-300 transition hover:bg-red-500/15"
                      >
                        <LogOut className="size-4" />
                        Sair
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <nav className="hidden w-full lg:flex lg:flex-1 lg:flex-wrap lg:justify-center lg:gap-x-8 lg:gap-y-2" aria-label="Navegação do aluno">
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
              </nav>

              <div className="relative hidden lg:flex lg:w-auto justify-end shrink-0">
                <button
                  onClick={() => setMenuConfigAberto((aberto) => !aberto)}
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/15 transition"
                  type="button"
                  aria-label="Abrir menu da conta"
                >
                  <Settings className="size-6 text-white" />
                </button>

                {menuConfigAberto && (
                  <div className="absolute right-0 top-full mt-2 z-50 w-40 rounded-xl border border-white/10 bg-[#10131b] p-1.5 shadow-2xl">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-300 transition hover:bg-red-500/15"
                    >
                      <LogOut className="size-4" />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </header>

            {children}
          </div>
        </main>
      </div>

      {createPortal(<nav
        className="fixed inset-x-3 z-[100] grid grid-cols-4 rounded-2xl border border-white/10 bg-[#10131b]/95 p-1.5 shadow-2xl backdrop-blur-xl lg:hidden"
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        aria-label="Navegação principal"
      >
        {[
          { page: "inicio" as ActivePage, label: "Início", icon: House, path: "/aluno" },
          { page: "horas" as ActivePage, label: "Horas", icon: Clock3, path: "/horas-ams" },
          { page: "certificados" as ActivePage, label: "Arquivos", icon: FileBadge2, path: "/certificados" },
          { page: "eventos" as ActivePage, label: "Eventos", icon: CalendarDays, path: "/eventos" },
        ].map(({ page, label, icon: Icon, path }) => {
          const ativo = activePage === page;

          return (
            <button
              key={page}
              type="button"
              onClick={() => navigate(path)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-medium transition ${
                ativo
                  ? "bg-blue-500/20 text-blue-300"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>, document.body)}

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
