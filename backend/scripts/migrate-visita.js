// Script de migração único: cria a tabela public.visita usada pela tela de
// Coordenação (Aluno > Visitas). Rode uma vez com:
//   node scripts/migrate-visita.js
require("dotenv/config");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Mesma correção aplicada em src/db.ts — validar o certificado TLS de
  // verdade em vez de aceitar qualquer um sem verificação.
  ssl: { rejectUnauthorized: true },
});

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.visita (
      id_visita SERIAL PRIMARY KEY,
      id_aluno INTEGER NOT NULL REFERENCES public.aluno(id_aluno) ON DELETE CASCADE,
      id_coordenacao INTEGER REFERENCES public.coordenacao(id_coordenacao),
      local VARCHAR(255) NOT NULL,
      quantidade_horas NUMERIC(6,2) NOT NULL,
      data_visita DATE NOT NULL,
      observacao TEXT,
      criado_em TIMESTAMP NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_visita_id_aluno ON public.visita(id_aluno);
  `);

  console.log("Tabela public.visita pronta.");
  await pool.end();
}

main().catch((error) => {
  console.error("Erro ao migrar tabela visita:", error);
  process.exit(1);
});
