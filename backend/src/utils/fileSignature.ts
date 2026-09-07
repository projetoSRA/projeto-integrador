// Validação básica de assinatura de arquivo ("magic bytes"), para não
// confiar apenas no Content-Type declarado pelo cliente no upload
// (achado A3 do relatório de pentest). Cobre os tipos de imagem/PDF usados
// pelo projeto; para DOC/DOCX/TXT (sem assinatura simples e confiável de
// verificar sem bibliotecas externas) mantemos a checagem apenas por
// mimetype, documentando essa limitação.
export function matchesDeclaredType(buffer: Buffer, mimetype: string): boolean {
  switch (mimetype) {
    case "image/png":
      return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/jpeg":
    case "image/jpg":
      return startsWith(buffer, [0xff, 0xd8, 0xff]);
    case "image/webp":
      return (
        startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && // "RIFF"
        buffer.slice(8, 12).toString("ascii") === "WEBP"
      );
    case "application/pdf":
      return startsWith(buffer, [0x25, 0x50, 0x44, 0x46]); // "%PDF"
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      // .xlsx é um arquivo ZIP por baixo — confere a assinatura local de
      // arquivo ZIP ("PK\x03\x04") em vez de confiar só na extensão/mimetype.
      return startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]);
    default:
      // Tipos sem verificação de assinatura implementada (doc/docx/txt):
      // não bloqueia, mas também não garante o conteúdo real.
      return true;
  }
}

function startsWith(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, index) => buffer[index] === byte);
}
