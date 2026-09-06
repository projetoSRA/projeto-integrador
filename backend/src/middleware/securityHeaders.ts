// Cabeçalhos básicos de segurança HTTP (achado M2 do relatório de pentest).
// Uma versão mínima e sem dependências do que o pacote "helmet" faria.
import { Request, Response, NextFunction } from "express";

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
}
