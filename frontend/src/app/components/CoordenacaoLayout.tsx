import { ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { User } from "../utils/auth";
import { clearSession } from "../utils/api";
import { panelStyle } from "../../styles/uiStyles";
import { FileCheck2, LogOut, LucideIcon, Settings, Users } from "lucide-react";
import ChatbotCoordenacao from "./ChatbotCoordenacao";

type ActivePage = "dashboard" | "alunos";

type CoordenacaoLayoutProps = {
  user: User;
  activePage: ActivePage;
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  pendentesCount?: number;
  children: ReactNode;
};

export default function CoordenacaoLayout({
  user,
  activePage,
  icon: Icon = Users,
  title,
  subtitle,
  headerActions,
  pendentesCount,
  children,
}: CoordenacaoLayoutProps) {
  const navigate = useNavigate();
  const [menuContaAberto, setMenuContaAberto] = useState(false);
  const [modalSair, setModalSair] = useState(false);

  const handleLogout = () => {
    setMenuContaAberto(false);
    setModalSair(true);
  };

  const confirmarLogout = () => {
    clearSession();
    navigate("/");
  };

  const navClass = (page: ActivePage) =>
    activePage === page
      ? "w-full h-11 flex items-center gap-2 px-4 rounded-xl bg-white/15 text-blue-400 font-semibold transition"
      : "w-full h-11 flex items-center gap-2 px-4 rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition";

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

      <div className="relative grid grid-cols-1 lg:grid-cols-[17rem_1fr] lg:grid-rows-[auto_1fr] h-full gap-4 lg:gap-x-6 lg:gap-y-5">
        <header
          className="lg:col-start-2 lg:row-start-1 flex items-center gap-3 p-3 sm:p-4 rounded-2xl"
          style={panelStyle}
        >
          <Icon className="size-7 sm:size-8 text-blue-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-semibold text-white truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="hidden sm:block text-white/70 text-sm">{subtitle}</p>
            )}
          </div>

          {headerActions && <div className="hidden sm:flex gap-2">{headerActions}</div>}

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuContaAberto((aberto) => !aberto)}
              className="rounded-xl bg-white/10 p-2.5 transition hover:bg-white/15"
              aria-label="Abrir menu da conta"
            >
              <Settings className="size-5 text-white" />
            </button>

            {menuContaAberto && (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-white/10 bg-[#10131b] p-2 shadow-2xl">
                <div className="border-b border-white/10 px-2 pb-2 mb-1">
                  <p className="truncate text-sm font-medium text-white">{user.name}</p>
                  <p className="truncate text-xs text-white/50">{user.identifier}</p>
                </div>
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

        <aside
          className="hidden lg:flex lg:col-start-1 lg:row-start-1 lg:row-span-2 w-full lg:h-full p-5 flex-col rounded-2xl"
          style={panelStyle}
        >
          <div>
            <h2 className="text-xl font-semibold text-white mb-5">
              Minhas Informações
            </h2>

            <p className="text-white mb-2 text-sm">
              <strong>Nome:</strong> {user.name}
            </p>

            <p className="text-white mb-5 text-sm">
              <strong>Matrícula:</strong> {user.identifier}
            </p>

            <div className="space-y-1.5 mb-4">
              <button
                onClick={() => navigate("/coordenacao")}
                className={navClass("dashboard")}
                type="button"
              >
                <FileCheck2 className="size-4" />
                Certificados
              </button>

              <button
                onClick={() => navigate("/coordenacao/alunos")}
                className={navClass("alunos")}
                type="button"
              >
                <Users className="size-4" />
                Alunos
              </button>
            </div>

            {pendentesCount !== undefined && (
              <div className="flex justify-between bg-white/10 p-3 rounded-xl text-white">
                <span>Fila de validação</span>
                <span className="font-semibold text-blue-400">
                  {pendentesCount}
                </span>
              </div>
            )}
          </div>

        </aside>

        <main className="lg:col-start-2 lg:row-start-2 rounded-2xl lg:overflow-hidden">
          <div
            className="
              max-w-7xl mx-auto lg:h-full lg:overflow-y-auto lg:pr-2
              [scrollbar-width:none]
              [-ms-overflow-style:none]
              [&::-webkit-scrollbar]:hidden
            "
          >
            {children}
          </div>
        </main>
      </div>

      <ChatbotCoordenacao />

      {createPortal(
        <nav
          className="fixed inset-x-3 z-[90] grid grid-cols-2 rounded-2xl border border-white/10 bg-[#10131b]/95 p-1.5 shadow-2xl backdrop-blur-xl lg:hidden"
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          aria-label="Navegação da coordenação"
        >
          <button
            type="button"
            onClick={() => navigate("/coordenacao")}
            className={`flex min-h-14 items-center justify-center gap-2 rounded-xl text-sm font-medium transition ${
              activePage === "dashboard" ? "bg-blue-500/20 text-blue-300" : "text-white/65"
            }`}
          >
            <FileCheck2 className="size-5" />
            Validações
          </button>
          <button
            type="button"
            onClick={() => navigate("/coordenacao/alunos")}
            className={`flex min-h-14 items-center justify-center gap-2 rounded-xl text-sm font-medium transition ${
              activePage === "alunos" ? "bg-blue-500/20 text-blue-300" : "text-white/65"
            }`}
          >
            <Users className="size-5" />
            Alunos
          </button>
        </nav>,
        document.body
      )}

      {modalSair && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl" style={panelStyle}>
            <h2 className="text-xl font-semibold text-white">Deseja realmente sair?</h2>
            <p className="mt-2 text-sm text-white/60">Você será redirecionado para a tela de login.</p>
            <div className="mt-5 flex justify-end gap-3">
              <Button type="button" onClick={() => setModalSair(false)} className="rounded-xl border border-white/10 bg-white/10 text-white hover:bg-white/15">
                Cancelar
              </Button>
              <Button type="button" onClick={confirmarLogout} className="rounded-xl bg-red-500 text-white hover:bg-red-600">
                Sair
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
