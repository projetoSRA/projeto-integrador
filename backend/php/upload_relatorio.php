<?php
require_once "../php/session_config.php";
require_once "../php/verifica_login.php";
require_once "../php/conexao.php";

$nome = $_SESSION['nome'];
$rm   = $_SESSION['rm'];
$idAluno = $_SESSION['idAluno'] ?? null;

if (!$idAluno) {
    echo "<p>Usuário não logado.</p>";
    exit;
}

// Dados do formulário
$titulo = $_POST['curso'] ?? '';
$data   = $_POST['data'] ?? '';
$horas  = intval($_POST['horas'] ?? 0); // converte para inteiro
$instituicao = "3°AMS Ourinhos";

// Validação do campo horas (entre 1 e 2)
if ($horas < 1 || $horas > 2) {
    echo "<script>alert('A quantidade de horas deve ser entre 1 e 2.'); history.back();</script>";
    exit;
}

// Verifica o upload
if (isset($_FILES['arquivo']) && $_FILES['arquivo']['error'] === 0) {

    $arquivoTmp = $_FILES['arquivo']['tmp_name'];
    $nomeOriginal = $_FILES['arquivo']['name'];
    $extensao = strtolower(pathinfo($nomeOriginal, PATHINFO_EXTENSION));

    // Detectar MIME com segurança usando finfo_file (melhor que mime_content_type)
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $tipoMime = finfo_file($finfo, $arquivoTmp);
    finfo_close($finfo);

    // ✅ Permitidos
    $extensoesPermitidas = ['pdf', 'txt', 'doc', 'docx'];
    $tiposMimePermitidos = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    // ❌ Proibidos
    $extensoesProibidas = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'html', 'htm'];
    $tiposMimeProibidos = [
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/svg+xml',
        'text/html',                    // Chrome HTML document
        'application/xhtml+xml',
        'application/octet-stream'     // Tipo genérico potencialmente perigoso
    ];

    // Verificação completa
    if (
        in_array($extensao, $extensoesProibidas) ||
        in_array($tipoMime, $tiposMimeProibidos) ||
        !in_array($extensao, $extensoesPermitidas) ||
        !in_array($tipoMime, $tiposMimePermitidos)
    ) {
        echo "<script>alert('❌ Arquivo recusado: tipos como Chrome HTML, imagens e arquivos não permitidos são bloqueados. Envie apenas PDF, TXT ou Word (.doc/.docx).'); history.back();</script>";
        exit;
    }

    // Diretório de destino
    $uploadDir = __DIR__ . "/../uploads";
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

    // Nome do arquivo
    $nomeArquivo = $rmAluno . "_" 
                 . preg_replace('/[^A-Za-z0-9_-]/', '', $nomeAluno) . "" 
                 . preg_replace('/[^A-Za-z0-9_-]/', '_', $titulo) 
                 . "." . $extensao;

    $destinoFisico = $uploadDir . "/" . $nomeArquivo;
    $urlBanco = "uploads/" . $nomeArquivo;

    // Upload e inserção no banco
    if (move_uploaded_file($arquivoTmp, $destinoFisico)) {
        $sql = "INSERT INTO relatorios (titulo, dataEmissao, URL, quantidadeHoras, instituicao, idAluno)
                VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);

        if (!$stmt) {
            echo "<script>alert('Erro na preparação da query.'); history.back();</script>";
            exit;
        }

        $stmt->bind_param("sssisi", $titulo, $data, $urlBanco, $horas, $instituicao, $idAluno);

        if ($stmt->execute()) {
            header("Location: ../../frontend/paginas/relatorio.php");
            exit;
        } else {
            echo "<script>alert('Erro ao salvar no banco: " . $stmt->error . "'); history.back();</script>";
        }

        $stmt->close();
    } else {
        echo "<script>alert('Erro ao mover o arquivo para o servidor.'); history.back();</script>";
    }

} else {
    echo "<script>alert('Nenhum arquivo enviado ou erro no upload.'); history.back();</script>";
}

$conn->close();
?>