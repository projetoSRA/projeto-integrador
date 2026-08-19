import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "../db.js";

const router = Router();

router.post("/login", async (req, res) => {
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

        a.id_aluno,
        a.nome AS nome_aluno,
        a.email AS email_aluno,
        a.foto_perfil_url AS foto_perfil_url_aluno,

        c.id_coordenacao,
        c.nome_coordenador,
        c.email AS email_coordenacao,

        e.id_empresa,
        e.nome_empresa,
        e.email AS email_empresa

      FROM public.usuario u
      LEFT JOIN public.aluno a ON a.id_aluno = u.id_aluno
      LEFT JOIN public.coordenacao c ON c.id_coordenacao = u.id_coordenacao
      LEFT JOIN public.empresa e ON e.id_empresa = u.id_empresa
      WHERE u.login = $1
        AND u.tipo_usuario = $2
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

    let senhaValida = false;

// 1. Se for bcrypt
if (usuario.senha.startsWith("$2b$")) {
  senhaValida = await bcrypt.compare(password, usuario.senha);
}

// 2. Se for SHA-256
else if (usuario.senha.length === 64) {
  const hash = crypto.createHash("sha256").update(password).digest("hex");
  senhaValida = hash === usuario.senha;
}

// 3. Se for texto puro
else {
  senhaValida = password === usuario.senha;
}

    if (!senhaValida) {
      return res.status(401).json({
        message: "Senha inválida.",
      });
    }

    let user;

    if (usuario.tipo_usuario === "ALUNO") {
      user = {
        id: usuario.id_aluno,
        name: usuario.nome_aluno,
        email: usuario.email_aluno,
        identifier: usuario.login,
        type: "aluno",
        foto_perfil_url: usuario.foto_perfil_url_aluno,

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

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        tipo_usuario: usuario.tipo_usuario,
      },
      process.env.JWT_SECRET || "sra_secret",
      { expiresIn: "7d" }
    );

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

export default router;