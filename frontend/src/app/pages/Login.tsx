import { useState } from "react";
import { useNavigate } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { GraduationCap, Building2, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "../components/ui/sonner";
import { validateRM, validateLogin, validateCNPJ, validatePassword } from "../utils/validators";
import { authenticateUser } from "../utils/auth";

export default function Login() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("alunos");
  const [cnpj, setCnpj] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  const handleLogin = async (
    userType: "aluno" | "coordenacao" | "empresa",
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    let identifier = formData.get("identifier") as string;

if (userType === "empresa") {
  identifier = identifier.replace(/\D/g, "");
}
    const password = formData.get("password") as string;

    let hasError = false;
    const newErrors: { identifier?: string; password?: string } = {};

    if (userType === "aluno") {
      if (!validateRM(identifier)) {
        newErrors.identifier = "RM deve ter exatamente 5 números";
        hasError = true;
      }
    } else if (userType === "coordenacao") {
      if (!validateLogin(identifier)) {
        newErrors.identifier = "Login deve ter entre 3 e 8 caracteres";
        hasError = true;
      }
    } else if (userType === "empresa") {
  const cnpjLimpo = identifier.replace(/\D/g, "");

  if (cnpjLimpo.length !== 14) {
    newErrors.identifier = "CNPJ deve ter 14 números";
    hasError = true;
  }

  if (password.length !== 8) {
    newErrors.password = "Senha da empresa deve ter 8 dígitos";
    hasError = true;
  }
}

    if (userType !== "empresa" && !validatePassword(password)) {
      newErrors.password = "Senha deve ter no mínimo 6 caracteres";
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      toast.error("Corrija os erros no formulário");
      return;
    }

    setIsLoading(true);

    try {
      const result = await authenticateUser(userType, identifier, password);

      if (result.success && result.user) {
        toast.success(result.message);
        localStorage.setItem("user", JSON.stringify(result.user));

        if (userType === "aluno") navigate("/aluno");
        else if (userType === "coordenacao") navigate("/coordenacao");
        else navigate("/empresa");
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Erro ao realizar login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRMInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    e.target.value = value.slice(0, 5);
  };

  const handleCNPJInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setCnpj(value);
  };

  return (
  <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden"
     style={{
       background: "linear-gradient(135deg, #0b0f19 0%, #0f172a 40%, #1e3a8a 100%)"
     }}>
    <Toaster />

    <div className="absolute inset-0"
  style={{
    background:
      "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.25), transparent 40%), radial-gradient(circle at 80% 80%, rgba(99,102,241,0.2), transparent 40%)"
  }}
/>

    <div className="relative w-full max-w-6xl min-h-[620px] rounded-[32px] overflow-hidden border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.55)] bg-[#252a2d]/80 backdrop-blur-2xl flex">
      <div className="absolute top-7 left-8 flex gap-2">
        <span className="size-3 rounded-full bg-white/35" />
        <span className="size-3 rounded-full bg-white/25" />
        <span className="size-3 rounded-full bg-white/15" />
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10">
  <h1 className="text-5xl font-bold text-white tracking-wide">
    SRA
  </h1>

  <p className="text-sm text-blue-400 mt-1 tracking-wide">
    Seu espaço educacional.
  </p>
</div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 gap-2 bg-transparent mb-8 p-0">
              <TabsTrigger
                value="alunos"
                className="rounded-xl bg-white/5 text-white/50 data-[state=active]:bg-white/15 data-[state=active]:text-white"
              >
                Aluno
              </TabsTrigger>

              <TabsTrigger
                value="coordenacao"
                className="rounded-xl bg-white/5 text-white/50 data-[state=active]:bg-white/15 data-[state=active]:text-white"
              >
                Coord
              </TabsTrigger>

              <TabsTrigger
                value="empresas"
                className="rounded-xl bg-white/5 text-white/50 data-[state=active]:bg-white/15 data-[state=active]:text-white"
              >
                Empresa
              </TabsTrigger>
            </TabsList>

            <TabsContent value="alunos">
              <form onSubmit={(e) => handleLogin("aluno", e)} className="space-y-6">
                <div>
                  <Label className="text-white/50 mb-2 block">RM</Label>
                  <Input
                    name="identifier"
                    type="text"
                    maxLength={5}
                    onChange={handleRMInput}
                    className="h-12 rounded-lg bg-[#1e2227] border-white/10 text-white placeholder:text-white/35"
                    placeholder="12345"
                    required
                  />
                </div>

                <div>
                  <Label className="text-white/50 mb-2 block">Senha</Label>
                  <Input
                    name="password"
                    type="password"
                    className="h-12 rounded-lg bg-[#1e2227] border-white/10 text-white placeholder:text-white/35"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <Button
                  className="w-full h-12 rounded-lg bg-gradient-to-r from-slate-400 to-slate-600 hover:from-slate-300 hover:to-slate-500 text-white shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="coordenacao">
              <form onSubmit={(e) => handleLogin("coordenacao", e)} className="space-y-6">
                <div>
                  <Label className="text-white/50 mb-2 block">Login</Label>
                  <Input
                    name="identifier"
                    type="text"
                    className="h-12 rounded-lg bg-[#1e2227] border-white/10 text-white placeholder:text-white/35"
                    placeholder="usuario"
                    required
                  />
                </div>

                <div>
                  <Label className="text-white/50 mb-2 block">Senha</Label>
                  <Input
                    name="password"
                    type="password"
                    className="h-12 rounded-lg bg-[#1e2227] border-white/10 text-white placeholder:text-white/35"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <Button
                  className="w-full h-12 rounded-lg bg-gradient-to-r from-slate-400 to-slate-600 hover:from-slate-300 hover:to-slate-500 text-white shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="empresas">
              <form onSubmit={(e) => handleLogin("empresa", e)} className="space-y-6">
                <div>
                  <Label className="text-white/50 mb-2 block">CNPJ</Label>
                  <Input
                    name="identifier"
                    value={cnpj}
                    onChange={handleCNPJInput}
                    className="h-12 rounded-lg bg-[#1e2227] border-white/10 text-white placeholder:text-white/35"
                    placeholder="00.000.000/0000-00"
                    required
                  />
                </div>

                <div>
                  <Label className="text-white/50 mb-2 block">Senha</Label>
                  <Input
                    name="password"
                    type="password"
                    className="h-12 rounded-lg bg-[#1e2227] border-white/10 text-white placeholder:text-white/35"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <Button
                  className="w-full h-12 rounded-lg bg-gradient-to-r from-slate-400 to-slate-600 hover:from-slate-300 hover:to-slate-500 text-white shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : "Login"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

     <div className="hidden lg:flex w-1/2 p-5">
  <div className="relative flex w-full overflow-hidden rounded-[30px] bg-[#0d1020] shadow-2xl">

    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_35%)]" />

    <div className="relative z-10 flex w-full">
      <div className="relative flex-1 overflow-hidden">

        <div className="absolute inset-0 bg-gradient-to-br from-violet-700/80 via-blue-600/50 to-cyan-400/30" />

        <div className="absolute -top-16 right-[-60px] h-72 w-72 rounded-full bg-violet-500/40 blur-3xl" />

        <div className="absolute bottom-[-80px] left-[-40px] h-72 w-72 rounded-full bg-cyan-400/30 blur-3xl" />

        <div className="absolute inset-0">
          <svg
            className="h-full w-full opacity-70"
            viewBox="0 0 800 600"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 320C120 260 180 420 320 360C460 300 520 120 800 220"
              stroke="url(#paint0_linear)"
              strokeWidth="22"
              strokeLinecap="round"
            />
            <path
              d="M0 420C180 340 260 520 420 430C560 350 640 220 800 300"
              stroke="url(#paint1_linear)"
              strokeWidth="18"
              strokeLinecap="round"
            />

            <defs>
              <linearGradient
                id="paint0_linear"
                x1="0"
                y1="0"
                x2="800"
                y2="0"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#8B5CF6" />
                <stop offset="1" stopColor="#22D3EE" />
              </linearGradient>

              <linearGradient
                id="paint1_linear"
                x1="0"
                y1="0"
                x2="800"
                y2="0"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#6366F1" />
                <stop offset="1" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
          </svg>
        </div>

      </div>
    </div>
  </div>
</div>
    </div>
  </div>
);
}