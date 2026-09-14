// Script de migração único: adiciona public.certificados.categoria.
// Usado só quando tipo_arquivo = 'RELATORIO' — classifica o relato como
// PALESTRA, CURSO ou VISITA, pra o Portfólio do Aluno conseguir separar
// os relatórios aprovados em seções diferentes (em vez de jogar tudo em
// "Palestras"). Registros antigos ficam com categoria NULL; o gerador do
// portfólio trata NULL como PALESTRA (comportamento de antes desta
// mudança), então nada existente quebra.
// Rode uma vez com:
//   node scripts/migrate-categoria-relatorio.js
require("dotenv/config");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await pool.query(`
    ALTER TABLE public.certificados
    ADD COLUMN IF NOT EXISTS categoria VARCHAR(20);
  `);

  console.log("Coluna public.certificados.categoria pronta.");
  await pool.end();
}

main().catch((error) => {
  console.error("Erro ao migrar coluna categoria:", error);
  process.exit(1);
});
