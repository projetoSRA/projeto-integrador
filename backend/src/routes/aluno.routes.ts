import { Router } from "express";
import multer from "multer";
import { db } from "../db.js";
import { supabase } from "../supabase.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

router.post("/:idAluno/foto", upload.single("foto"), async (req, res) => {
  try {
    const { idAluno } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "Nenhuma foto enviada." });
    }

    const tiposPermitidos = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

    if (!tiposPermitidos.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Envie apenas imagens PNG, JPG, JPEG ou WEBP.",
      });
    }

    const extensao = req.file.originalname.split(".").pop() || "png";
    const caminho = `fotos-perfil/aluno-${idAluno}/foto-${Date.now()}.${extensao}`;

    const { error } = await supabase.storage
      .from("arquivos-sra")
      .upload(caminho, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (error) {
      console.error("Erro no upload:", error);
      return res.status(500).json({ message: "Erro ao enviar foto." });
    }

    const { data } = supabase.storage
      .from("arquivos-sra")
      .getPublicUrl(caminho);

    const fotoUrl = data.publicUrl;

    await db.query(
      `
      UPDATE public.aluno
      SET foto_perfil_url = $1
      WHERE id_aluno = $2
      `,
      [fotoUrl, idAluno],
    );

    return res.json({
      message: "Foto atualizada com sucesso.",
      foto_perfil_url: fotoUrl,
    });
  } catch (error) {
    console.error("Erro ao atualizar foto:", error);
    return res.status(500).json({
      message: "Erro ao atualizar foto.",
    });
  }
});

export default router;