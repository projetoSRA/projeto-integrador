// Script de migração único: adiciona os campos usados pela geração
// automática do Portfólio do Aluno.
//
// public.certificados ganha local/conteudo/bimestre — só usados quando
// tipo_arquivo = 'RELATORIO' (o aluno escreve o relato ali em vez de só
// anexar um arquivo pronto). A validação de bimestre (1 a 4) fica no
// backend, no mesmo padrão já usado para as regras de horas de
// certificado/relatório (ver certificados.routes.ts).
//
// public.aluno ganha empresa_parceira_nome/empresa_parceira_representante,
// que hoje não existem em lugar nenhum do schema.
//
// Rode uma vez com:
//   node scripts/migrate-portfolio.js
require("dotenv/config");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await pool.query(`
    ALTER TABLE public.certificados
    ADD COLUMN IF NOT EXISTS local VARCHAR(255),
    ADD COLUMN IF NOT EXISTS conteudo TEXT,
    ADD COLUMN IF NOT EXISTS bimestre SMALLINT;
  `);

  await pool.query(`
    ALTER TABLE public.aluno
    ADD COLUMN IF NOT EXISTS empresa_parceira_nome VARCHAR(255),
    ADD COLUMN IF NOT EXISTS empresa_parceira_representante VARCHAR(255);
  `);

  console.log("Colunas do Portfólio do Aluno prontas (certificados.local/conteudo/bimestre, aluno.empresa_parceira_*).");
  await pool.end();
}

main().catch((error) => {
  console.error("Erro ao migrar colunas do portfólio:", error);
  process.exit(1);
});
