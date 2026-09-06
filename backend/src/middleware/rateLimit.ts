// Rate limiter simples em memória (sem dependências externas), usado para
// mitigar força bruta no login (achado A2 do relatório de pentest).
// Para múltiplas instâncias/processos em produção, prefira uma solução
// compartilhada (ex.: Redis) — este limitador é por processo.
import { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

export function simpleRateLimit(options: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  const { windowMs, max, message } = options;
  const buckets = new Map<string, Bucket>();

  // Evita crescimento ilimitado do Map ao longo do tempo.
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, windowMs);
  cleanup.unref?.();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || "unknown"}:${req.body?.identifier || ""}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= max) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        message: message || "Muitas tentativas. Tente novamente em instantes.",
      });
    }

    bucket.count += 1;
    return next();
  };
}
