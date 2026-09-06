// Helper central para chamadas à API do backend.
//
// Antes desta mudança, o token JWT devolvido pelo login era descartado
// (só o objeto "user" era salvo no localStorage) e nenhuma chamada
// enviava o header Authorization — o que combinado com a ausência de
// verificação de token no backend deixava toda a API pública (achado
// crítico C1 do relatório de pentest). Agora o token é salvo e anexado
// automaticamente em toda chamada feita via apiFetch.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function getToken(): string | null {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

export function saveSession(user: unknown, token: string) {
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("token", token);
}

export function clearSession() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
}

/**
 * Wrapper sobre o fetch nativo que anexa automaticamente o header
 * "Authorization: Bearer <token>" quando existe uma sessão salva.
 * Use no lugar de fetch() para todas as chamadas à API do backend.
 */
export async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    // Token ausente/expirado/inválido: limpa a sessão local para forçar
    // um novo login na próxima navegação protegida.
    clearSession();
  }

  return response;
}
