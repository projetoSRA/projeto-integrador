// Script de migração único: adiciona a coluna public.aluno.cpf (11 dígitos,
// sem pontuação, mesmo padrão usado para o CNPJ da empresa no projeto).
// Rode uma vez com:
//   node scripts/migrate-cpf-aluno.js
require("dotenv/config");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await pool.query(`
    ALTER TABLE public.aluno
    ADD COLUMN IF NOT EXISTS cpf VARCHAR(11);
  `);

  console.log("Coluna public.aluno.cpf pronta.");
  await pool.end();
}

main().catch((error) => {
  console.error("Erro ao migrar coluna cpf:", error);
  process.exit(1);
});
