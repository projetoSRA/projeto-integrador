// Middleware de autenticação/autorização.
// Antes desta mudança, nenhuma rota (exceto /auth/login) verificava o token
// JWT — qualquer requisição direta à API funcionava sem autenticação
// (achado crítico C1 do relatório de pentest). Este arquivo centraliza a
// verificação do token e checagens de papel/posse (ownership) de recurso.
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env";

export type TipoUsuario = "ALUNO" | "COORDENACAO" | "EMPRESA";

export interface AuthPayload {
  id_usuario: number;
  tipo_usuario: TipoUsuario;
  id_aluno?: number;
  id_coordenacao?: number;
  id_empresa?: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

/** Exige um token JWT válido no header Authorization: Bearer <token>. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token de autenticação ausente." });
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
}

/** Exige que o usuário autenticado tenha um dos tipos informados. */
export function requireRole(...tipos: TipoUsuario[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !tipos.includes(req.auth.tipo_usuario)) {
      return res.status(403).json({ message: "Acesso não autorizado para este perfil." });
    }
    return next();
  };
}

/**
 * Exige que o :idAluno da rota (params ou body) seja o próprio aluno
 * autenticado, ou que quem está chamando seja da COORDENACAO.
 */
export function requireSelfAlunoOrCoordenacao(paramName: string = "idAluno") {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return res.status(401).json({ message: "Não autenticado." });

    if (auth.tipo_usuario === "COORDENACAO") return next();

    const targetId = req.params[paramName] ?? req.body?.[paramName];

    if (
      auth.tipo_usuario === "ALUNO" &&
      targetId !== undefined &&
      String(auth.id_aluno) === String(targetId)
    ) {
      return next();
    }

    return res.status(403).json({
      message: "Você não tem permissão para acessar dados de outro aluno.",
    });
  };
}

/** Exige que o :idEmpresa da rota seja a própria empresa autenticada, ou COORDENACAO. */
export function requireSelfEmpresaOrCoordenacao(paramName: string = "idEmpresa") {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return res.status(401).json({ message: "Não autenticado." });

    if (auth.tipo_usuario === "COORDENACAO") return next();

    const targetId = req.params[paramName] ?? req.body?.[paramName];

    if (
      auth.tipo_usuario === "EMPRESA" &&
      targetId !== undefined &&
      String(auth.id_empresa) === String(targetId)
    ) {
      return next();
    }

    return res.status(403).json({
      message: "Você não tem permissão para acessar dados de outra empresa.",
    });
  };
}
