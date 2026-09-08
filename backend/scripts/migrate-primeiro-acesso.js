// Script de migração único: adiciona public.usuario.precisa_trocar_senha e
// dá uma senha padrão de primeiro acesso a toda conta de ALUNO que hoje não
// tem senha nenhuma (login = RM/RA, senha = NULL — o estado de uma conta
// criada pela coordenação, seja por importação de planilha ou cadastro
// manual). Rode uma vez com:
//   node scripts/migrate-primeiro-acesso.js
require("dotenv/config");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const SENHA_PADRAO_PRIMEIRO_ACESSO = "Aluno@123";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await pool.query(`
    ALTER TABLE public.usuario
    ADD COLUMN IF NOT EXISTS precisa_trocar_senha BOOLEAN NOT NULL DEFAULT false;
  `);

  const hash = await bcrypt.hash(SENHA_PADRAO_PRIMEIRO_ACESSO, 10);

  const result = await pool.query(
    `
    UPDATE public.usuario
    SET senha = $1, precisa_trocar_senha = true
    WHERE tipo_usuario = 'ALUNO' AND senha IS NULL
    RETURNING id_usuario
    `,
    [hash]
  );

  console.log("Coluna precisa_trocar_senha pronta.");
  console.log(`${result.rowCount} conta(s) de aluno receberam a senha padrão de primeiro acesso.`);
  await pool.end();
}

main().catch((error) => {
  console.error("Erro na migração de primeiro acesso:", error);
  process.exit(1);
});
