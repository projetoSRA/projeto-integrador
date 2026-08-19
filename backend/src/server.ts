import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import authRoutes from "./routes/auth.routes";
import alunoRoutes from "./routes/aluno.routes";
import certificadosRoutes from "./routes/certificados.routes";
import eventosRoutes from "./routes/eventos.routes";
import horasRoutes from "./routes/horas.routes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use("/uploads", express.static(path.resolve("uploads")));

app.use("/auth", authRoutes);
app.use("/aluno", alunoRoutes);
app.use("/eventos", eventosRoutes);
app.use("/certificados", certificadosRoutes);
app.use("/horas", horasRoutes);
app.use("/eventos", eventosRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend SRA rodando" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});