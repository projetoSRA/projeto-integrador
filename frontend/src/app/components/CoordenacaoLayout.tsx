import { ReactNode } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { User } from "../utils/auth";
import { clearSession } from "../utils/api";
import { panelStyle } from "../../styles/uiStyles";
import { FileCheck2, LogOut, LucideIcon, Users } from "lucide-react";
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

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  const navClass = (page: ActivePage) =>
    activePage === page
      ? "w-full h-11 flex items-center gap-2 px-4 rounded-xl bg-white/15 text-blue-400 font-semibold transition"
      : "w-full h-11 flex items-center gap-2 px-4 rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition";

  return (
    <div
      className="min-h-screen lg:h-screen lg:overflow-hidden p-3 sm:p-4 md:p-6 relative"
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

      <div className="relative grid grid-cols-1 lg:grid-cols-[20rem_1fr] lg:grid-rows-[auto_1fr] h-full gap-4 lg:gap-x-10 lg:gap-y-8">
        <header
          className="lg:col-start-2 lg:row-start-1 flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-6 rounded-2xl"
          style={panelStyle}
        >
          <Icon className="size-9 text-blue-400 shrink-0" />
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-white/70 text-sm sm:text-base">{subtitle}</p>
            )}
          </div>

          {headerActions && (
            <div className="flex gap-2 w-full sm:w-auto">{headerActions}</div>
          )}
        </header>

        <aside
          className="lg:col-start-1 lg:row-start-1 lg:row-span-2 w-full lg:min-h-full p-4 sm:p-6 flex flex-col justify-between rounded-2xl"
          style={panelStyle}
        >
          <div>
            <h2 className="text-2xl font-semibold text-white mb-6">
              Minhas Informações
            </h2>

            <p className="text-white mb-2 text-base">
              <strong>Nome:</strong> {user.name}
            </p>

            <p className="text-white mb-2 text-base">
              <strong>Matrícula:</strong> {user.identifier}
            </p>

            <p className="text-white mb-5 text-base">
              <strong>ID:</strong> {user.id}
            </p>

            <div className="space-y-1 mb-4">
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

          <Button
            onClick={handleLogout}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-white bg-white/10 hover:bg-white/15 mt-8 border border-white/10"
          >
            <LogOut className="size-4" />
            Sair
          </Button>
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
    </div>
  );
}
