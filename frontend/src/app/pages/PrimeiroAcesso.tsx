import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "../components/ui/sonner";
import { User } from "../utils/auth";
import { apiFetch, API_URL, saveSession, getToken, clearSession } from "../utils/api";

export default function PrimeiroAcesso() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData || !getToken()) {
      navigate("/");
      return;
    }

    const parsedUser = JSON.parse(userData) as User;
    if (parsedUser.type !== "aluno" || !parsedUser.precisaTrocarSenha) {
      navigate("/");
      return;
    }

    setUser(parsedUser);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (novaSenha.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiFetch(`${API_URL}/auth/definir-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novaSenha }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erro ao definir senha.");
      }

      if (user) {
        const usuarioAtualizado = { ...user, precisaTrocarSenha: false };
        saveSession(usuarioAtualizado, getToken() || "");
      }

      toast.success("Senha definida com sucesso!");
      navigate("/aluno");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao definir senha.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelar = () => {
    clearSession();
    navigate("/");
  };

  if (!user) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0b0f19 0%, #0f172a 40%, #1e3a8a 100%)",
      }}
    >
      <Toaster />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.25), transparent 40%), radial-gradient(circle at 80% 80%, rgba(99,102,241,0.2), transparent 40%)",
        }}
      />

      <div className="relative w-full max-w-md rounded-[32px] border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.55)] bg-[#252a2d]/80 backdrop-blur-2xl p-8 sm:p-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="size-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
            <KeyRound className="size-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Primeiro acesso</h1>
          <p className="text-sm text-white/60 mt-2">
            Olá, {user.name}. Antes de continuar, defina uma senha nova e
            definitiva para sua conta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-white/50 mb-2 block">Nova senha</Label>
            <Input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="h-12 rounded-lg bg-[#1e2227] border-white/10 text-white placeholder:text-white/35"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <div>
            <Label className="text-white/50 mb-2 block">Confirmar nova senha</Label>
            <Input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="h-12 rounded-lg bg-[#1e2227] border-white/10 text-white placeholder:text-white/35"
              placeholder="Repita a senha"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-lg bg-gradient-to-r from-slate-400 to-slate-600 hover:from-slate-300 hover:to-slate-500 text-white shadow-lg"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : "Salvar e continuar"}
          </Button>

          <button
            type="button"
            onClick={handleCancelar}
            className="w-full text-center text-sm text-white/50 hover:text-white/80 transition"
          >
            Cancelar e sair
          </button>
        </form>
      </div>
    </div>
  );
}
