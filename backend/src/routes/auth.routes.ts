import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "../db";
import { JWT_SECRET } from "../config/env";
import { simpleRateLimit } from "../middleware/rateLimit";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Mitiga força bruta contra o login (achado A2 do relatório de pentest):
// no máximo 8 tentativas por minuto por IP + identificador informado.
const loginRateLimit = simpleRateLimit({
  windowMs: 60 * 1000,
  max: 8,
  message: "Muitas tentativas de login. Aguarde um minuto e tente novamente.",
});

router.post("/login", loginRateLimit, async (req, res) => {
  try {
    const { type, identifier, password } = req.body;

    if (!type || !identifier || !password) {
      return res.status(400).json({
        message: "Login e senha são obrigatórios.",
      });
    }

    const tipoUsuario = String(type).toUpperCase();

    const result = await db.query(
      `
      SELECT
        u.id_usuario,
        u.login,
        u.senha,
        u.tipo_usuario,
        u.precisa_trocar_senha,

        a.id_aluno,
        a.nome AS nome_aluno,
        a.email AS email_aluno,
        a.foto_perfil_url AS foto_perfil_url_aluno,
        a.rm,
        a.ra,
        a.nivel_ensino,
        a.curso,
        a.serie_semestre,

        c.id_coordenacao,
        c.nome_coordenador,
        c.email AS email_coordenacao,

        e.id_empresa,
        e.nome_empresa,
        e.email AS email_empresa

      FROM public.usuario u
      LEFT JOIN public.aluno a ON a.id_usuario = u.id_usuario
      LEFT JOIN public.coordenacao c ON c.id_usuario = u.id_usuario
      LEFT JOIN public.empresa e ON e.id_usuario = u.id_usuario
      WHERE u.tipo_usuario = $2
        AND (
          (u.tipo_usuario = 'ALUNO' AND (a.rm = $1 OR a.ra = $1))
          OR (u.tipo_usuario <> 'ALUNO' AND u.login = $1)
        )
      LIMIT 1
      `,
      [identifier, tipoUsuario]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        message: "Login não encontrado.",
      });
    }

    const usuario = result.rows[0];

    if (!usuario.senha) {
      return res.status(401).json({
        message: "Esta conta ainda não tem senha definida. Fale com a coordenação.",
      });
    }

    let senhaValida = false;
    // Indica se a senha validada não estava em bcrypt, para reforçarmos o
    // hash automaticamente após um login bem-sucedido (ver bloco abaixo).
    let precisaAtualizarHash = false;

    // 1. Se for bcrypt (formato recomendado e único aceito para novas senhas)
    if (usuario.senha.startsWith("$2b$") || usuario.senha.startsWith("$2a$")) {
      senhaValida = await bcrypt.compare(password, usuario.senha);
    }
    // 2. Formatos legados (SHA-256 sem sal ou texto puro): ainda aceitos na
    //    validação por compatibilidade com contas antigas, mas a senha é
    //    automaticamente re-hasheada em bcrypt assim que o login funciona
    //    (achado C3 do relatório de pentest — objetivo é migrar 100% das
    //    contas para bcrypt de forma gradual, sem travar o acesso de
    //    ninguém no meio do caminho).
    else if (usuario.senha.length === 64) {
      const hash = crypto.createHash("sha256").update(password).digest("hex");
      senhaValida = hash === usuario.senha;
      if (senhaValida) precisaAtualizarHash = true;
    } else {
      senhaValida = password === usuario.senha;
      if (senhaValida) precisaAtualizarHash = true;
    }

    if (!senhaValida) {
      return res.status(401).json({
        message: "Senha inválida.",
      });
    }

    if (precisaAtualizarHash) {
      try {
        const novoHash = await bcrypt.hash(password, 10);
        await db.query(
          `UPDATE public.usuario SET senha = $1 WHERE id_usuario = $2`,
          [novoHash, usuario.id_usuario]
        );
      } catch (hashError) {
        // Não bloqueia o login por causa da migração de hash; apenas registra.
        console.error("Erro ao migrar senha para bcrypt:", hashError);
      }
    }

    let user;

    if (usuario.tipo_usuario === "ALUNO") {
      user = {
        id: usuario.id_aluno,
        name: usuario.nome_aluno,
        email: usuario.email_aluno,
        identifier: identifier,
        type: "aluno",
        foto_perfil_url: usuario.foto_perfil_url_aluno,
        rm: usuario.rm,
        ra: usuario.ra,
        nivel_ensino: usuario.nivel_ensino,
        curso: usuario.curso,
        serie_semestre: usuario.serie_semestre,
        precisaTrocarSenha: usuario.precisa_trocar_senha,
      };
    }

    if (usuario.tipo_usuario === "COORDENACAO") {
      user = {
        id: usuario.id_coordenacao,
        name: usuario.nome_coordenador,
        email: usuario.email_coordenacao,
        identifier: usuario.login,
        type: "coordenacao",
      };
    }

    if (usuario.tipo_usuario === "EMPRESA") {
      user = {
        id: usuario.id_empresa,
        name: usuario.nome_empresa,
        email: usuario.email_empresa,
        identifier: usuario.login,
        type: "empresa",
      };
    }

    // O payload do token carrega o id específico do papel (id_aluno /
    // id_coordenacao / id_empresa) para que o middleware de autorização
    // (backend/src/middleware/auth.ts) consiga validar, no servidor, que o
    // usuário só acessa/altera os próprios dados — sem confiar em nenhum id
    // enviado pelo cliente (achado C1 do relatório de pentest).
    const tokenPayload: Record<string, unknown> = {
      id_usuario: usuario.id_usuario,
      tipo_usuario: usuario.tipo_usuario,
    };

    if (usuario.tipo_usuario === "ALUNO") tokenPayload.id_aluno = usuario.id_aluno;
    if (usuario.tipo_usuario === "COORDENACAO") tokenPayload.id_coordenacao = usuario.id_coordenacao;
    if (usuario.tipo_usuario === "EMPRESA") tokenPayload.id_empresa = usuario.id_empresa;

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      message: "Login realizado com sucesso.",
      token,
      user,
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({
      message: "Erro interno no servidor.",
    });
  }
});

// Define a senha definitiva no primeiro acesso (ou qualquer troca de senha
// posterior). Exige estar logado — o aluno só chega aqui depois de validar
// a senha padrão de primeiro acesso no /login, então não pedimos a senha
// atual de novo, só a nova (duas vezes, para confirmação, no frontend).
router.post("/definir-senha", requireAuth, async (req, res) => {
  try {
    const { novaSenha } = req.body;
    const idUsuario = req.auth!.id_usuario;

    if (!novaSenha || String(novaSenha).length < 6) {
      return res.status(400).json({
        message: "A nova senha deve ter no mínimo 6 caracteres.",
      });
    }

    const hash = await bcrypt.hash(String(novaSenha), 10);

    await db.query(
      `UPDATE public.usuario SET senha = $1, precisa_trocar_senha = false WHERE id_usuario = $2`,
      [hash, idUsuario]
    );

    return res.json({ message: "Senha definida com sucesso." });
  } catch (error) {
    console.error("Erro ao definir senha:", error);
    return res.status(500).json({ message: "Erro ao definir senha." });
  }
});

export default router;
