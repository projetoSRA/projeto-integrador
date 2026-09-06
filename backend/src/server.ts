import express from "express";
import cors from "cors";
import path from "path";

// Importa e valida as variáveis de ambiente obrigatórias antes de tudo —
// se algo essencial estiver faltando (ex.: JWT_SECRET), o servidor falha
// ao iniciar em vez de rodar com um segredo padrão previsível
// (achado C4 do relatório de pentest).
import { FRONTEND_URL, PORT } from "./config/env.js";
import { securityHeaders } from "./middleware/securityHeaders.js";

import authRoutes from "./routes/auth.routes";
import alunoRoutes from "./routes/aluno.routes";
import certificadosRoutes from "./routes/certificados.routes";
import eventosRoutes from "./routes/eventos.routes";
import horasRoutes from "./routes/horas.routes.js";
import validacaoRoutes from "./routes/validacao.routes";
import visitaRoutes from "./routes/visita.routes";

const app = express();

app.use(securityHeaders);

// A API usa token Bearer (não cookies de sessão), então "credentials: true"
// não é necessário e foi removido para reduzir a superfície de CORS
// (achado M1 do relatório de pentest).
app.use(
  cors({
    origin: FRONTEND_URL,
  })
);

app.use(express.json());

app.use("/uploads", express.static(path.resolve("uploads")));

app.use("/auth", authRoutes);
app.use("/aluno", alunoRoutes);
app.use("/eventos", eventosRoutes);
app.use("/certificados", certificadosRoutes);
app.use("/horas", horasRoutes);
app.use("/validacao", validacaoRoutes);
app.use("/visita", visitaRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend SRA rodando" });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
