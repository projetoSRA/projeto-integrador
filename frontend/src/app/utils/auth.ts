export type User = {
  id: number;
  name: string;
  identifier: string;
  type: "aluno" | "coordenacao" | "empresa";
  foto_perfil_url?: string;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function authenticateUser(
  type: "aluno" | "coordenacao" | "empresa",
  identifier: string,
  password: string
) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        identifier,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "Erro ao fazer login",
      };
    }

    return {
      success: true,
      message: "Login realizado com sucesso",
      user: data.user,
      token: data.token,
    };
  } catch (error) {
    return {
      success: false,
      message: "Erro ao conectar com o servidor",
    };
  }
}