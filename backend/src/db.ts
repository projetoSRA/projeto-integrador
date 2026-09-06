import { Pool } from "pg";
import { DATABASE_URL } from "./config/env.js";

export const db = new Pool({
  connectionString: DATABASE_URL,
  // Valida o certificado TLS do Postgres gerenciado (Supabase usa um
  // certificado assinado por CA pública) em vez de aceitar qualquer
  // certificado sem verificação (achado GitGuard:
  // insecure-transport.bypass-tls-verification — rejectUnauthorized:false
  // deixava a conexão vulnerável a man-in-the-middle).
  ssl: {
    rejectUnauthorized: true,
  },
});
