import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { User } from "../utils/auth";
import { LogOut, Users } from "lucide-react";

export default function DashboardCoordenacao() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

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

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  if (!user) return null;

  return (
    <div className="size-full p-4" style={{ background: '#15182e' }}>
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-8 p-6 bg-white rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Users className="size-8 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Dashboard da Coordenação</h1>
              <p className="text-sm text-muted-foreground">Bem-vindo(a), {user.name}</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
            <LogOut className="size-4" />
            Sair
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Minhas Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Nome:</strong> {user.name}</p>
              <p><strong>Matrícula:</strong> {user.identifier}</p>
              <p><strong>ID:</strong> {user.id}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader> 
              <CardTitle>Gerenciar Alunos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Ferramentas de gestão de alunos aparecerão aqui.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Relatórios</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Relatórios e estatísticas aparecerão aqui.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
