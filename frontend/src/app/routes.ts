import { createBrowserRouter } from "react-router";
import Login from "./pages/Login";
import DashboardAluno from "./pages/DashboardAluno";
import DashboardCoordenacao from "./pages/DashboardCoordenacao";
import DashboardEmpresa from "./pages/DashboardEmpresa";
import HorasAMS from "./pages/HorasAMS";
import Eventos from "./pages/Eventos";
import Certificados from "./pages/Certificados"; // 👈 ADICIONE ISSO

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/aluno",
    Component: DashboardAluno,
  },
  {
    path: "/coordenacao",
    Component: DashboardCoordenacao,
  },
  {
    path: "/empresa",
    Component: DashboardEmpresa,
  },
  {
    path: "/horas-ams",
    Component: HorasAMS,
  },
  {
    path: "/eventos", // rota
    Component: Eventos,
  },
  {
    path: "/certificados", // 👈 NOVA ROTA
    Component: Certificados,
  },
]);