// Script de migração único: adiciona public.visita.bimestre — necessário
// pra geração automática do Portfólio do Aluno conseguir filtrar quais
// visitas técnicas entram em cada bimestre (o mesmo campo já existe em
// public.certificados desde migrate-portfolio.js).
// Rode uma vez com:
//   node scripts/migrate-visita-bimestre.js
require("dotenv/config");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await pool.query(`
    ALTER TABLE public.visita
    ADD COLUMN IF NOT EXISTS bimestre SMALLINT;
  `);

  console.log("Coluna public.visita.bimestre pronta.");
  await pool.end();
}

main().catch((error) => {
  console.error("Erro ao migrar coluna bimestre em visita:", error);
  process.exit(1);
});
