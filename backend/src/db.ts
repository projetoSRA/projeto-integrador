import { Pool } from "pg";
import { DATABASE_URL } from "./config/env.js";

export const db = new Pool({
  connectionString: DATABASE_URL,
  // TENTATIVA REVERTIDA (2026-09-07): trocamos para rejectUnauthorized:true
  // para corrigir o achado GitGuard de bypass-tls-verification, mas isso
  // quebrou a conexão real em produção ("self-signed certificate in
  // certificate chain") — o pooler do Supabase (Supavisor/PgBouncer) usado
  // por este DATABASE_URL apresenta uma cadeia de certificado que o
  // Node não reconhece sem o certificado da CA do Supabase configurado
  // explicitamente via `ssl.ca`. Revertido para não confiar por padrão
  // continua sendo o achado A da auditoria — ver Pendências de Segurança
  // no cofre do projeto para o passo correto (obter o CA cert do painel
  // do Supabase antes de reativar rejectUnauthorized:true).
  ssl: {
    rejectUnauthorized: false,
  },
});
