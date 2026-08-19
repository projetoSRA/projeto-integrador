import { Router } from "express";
import multer from "multer";
import { db } from "../db.js";
import { supabase } from "../supabase.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const BUCKET = process.env.SUPABASE_BUCKET || "arquivos-sra";

function normalizarTipo(tipo: string) {
  return tipo === "relatorio" ? "RELATORIO" : "CERTIFICADO";
}

function validarArquivo(tipo: string, file: Express.Multer.File) {
  const mime = file.mimetype;

  if (tipo === "CERTIFICADO") {
    return [
      "image/png",
      "image/jpeg",
      "application/pdf",
    ].includes(mime);
  }

  return [
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ].includes(mime);
}

router.get("/aluno/:idAluno", async (req, res) => {
  try {
    const { idAluno } = req.params;

    const result = await db.query(
      `
      SELECT
        id_certificado,
        id_aluno,
        id_evento,
        titulo,
        instituicao,
        quantidade_horas,
        data_emissao,
        url_arquivo,
        status_certificado,
        tipo_arquivo,
        nome_arquivo,
        mime_type,
        tamanho_arquivo,
        storage_path,
        url_publica,
        criado_em
      FROM public.certificados
      WHERE id_aluno = $1
      ORDER BY criado_em DESC
      `,
      [idAluno]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar arquivos:", error);
    return res.status(500).json({
      message: "Erro ao listar arquivos.",
    });
  }
});

router.post("/upload", upload.single("arquivo"), async (req, res) => {
  try {
    const { idAluno, tipo, titulo, horas, dataEmissao } = req.body;
    const file = req.file;

    if (!idAluno || !tipo || !titulo || !horas || !dataEmissao || !file) {
      return res.status(400).json({
        message: "Dados obrigatórios não enviados.",
      });
    }

    const tipoArquivo = normalizarTipo(tipo);
    const quantidadeHoras = Number(horas);

    if (tipoArquivo === "RELATORIO" && (quantidadeHoras < 1 || quantidadeHoras > 2)) {
      return res.status(400).json({
        message: "Relatórios devem ter entre 1 e 2 horas.",
      });
    }

    if (tipoArquivo === "CERTIFICADO" && quantidadeHoras < 1) {
      return res.status(400).json({
        message: "Certificados devem ter pelo menos 1 hora.",
      });
    }

    if (!validarArquivo(tipoArquivo, file)) {
      return res.status(400).json({
        message:
          tipoArquivo === "CERTIFICADO"
            ? "Certificados aceitam apenas imagem ou PDF."
            : "Relatórios aceitam apenas PDF, TXT, DOC ou DOCX.",
      });
    }

    const pasta = tipoArquivo === "CERTIFICADO" ? "certificados" : "relatorios";
    const nomeSeguro = file.originalname
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    const storagePath = `${pasta}/aluno-${idAluno}/${Date.now()}-${nomeSeguro}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error(uploadError);
      return res.status(500).json({
        message: "Erro ao enviar arquivo para o Supabase Storage.",
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    const urlPublica = publicUrlData.publicUrl;

    const insert = await db.query(
      `
      INSERT INTO public.certificados (
        id_aluno,
        id_evento,
        titulo,
        instituicao,
        quantidade_horas,
        data_emissao,
        url_arquivo,
        status_certificado,
        tipo_arquivo,
        nome_arquivo,
        mime_type,
        tamanho_arquivo,
        storage_path,
        url_publica
      )
      VALUES (
        $1, NULL, $2, $3, $4, $5, $6,
        'PENDENTE', $7, $8, $9, $10, $11, $12
      )
      RETURNING *
      `,
      [
        idAluno,
        titulo,
        "3° AMS Ourinhos",
        quantidadeHoras,
        dataEmissao,
        urlPublica,
        tipoArquivo,
        file.originalname,
        file.mimetype,
        file.size,
        storagePath,
        urlPublica,
      ]
    );

    return res.status(201).json({
      message: "Arquivo enviado com sucesso.",
      arquivo: insert.rows[0],
    });
  } catch (error) {
    console.error("Erro no upload:", error);
    return res.status(500).json({
      message: "Erro interno ao enviar arquivo.",
    });
  }
});

router.delete("/:idCertificado", async (req, res) => {
  try {
    const { idCertificado } = req.params;

    const arquivo = await db.query(
      `
      SELECT storage_path
      FROM public.certificados
      WHERE id_certificado = $1
      `,
      [idCertificado]
    );

    if (arquivo.rowCount === 0) {
      return res.status(404).json({
        message: "Arquivo não encontrado.",
      });
    }

    const storagePath = arquivo.rows[0].storage_path;

    if (storagePath) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
    }

    await db.query(
      `
      DELETE FROM public.certificados
      WHERE id_certificado = $1
      `,
      [idCertificado]
    );

    return res.json({
      message: "Arquivo excluído com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir arquivo:", error);
    return res.status(500).json({
      message: "Erro ao excluir arquivo.",
    });
  }
});

export default router;