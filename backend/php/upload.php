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

$titulo = $_POST['curso'] ?? '';
$data   = $_POST['data'] ?? '';
$horas  = intval($_POST['horas'] ?? 0); // Garantir que seja número inteiro
$instituicao = "3°AMS Ourinhos";

// Validação do campo horas
if($horas < 1 || $horas > 50){
    die("A quantidade de horas deve ser entre 1 e 50.");
}

if(isset($_FILES['arquivo']) && $_FILES['arquivo']['error'] == 0){
    $arquivoTmp = $_FILES['arquivo']['tmp_name'];
    $nomeOriginal = $_FILES['arquivo']['name'];

    $uploadDir = __DIR__ . "/../uploads"; 
    if(!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

    $extensao = strtolower(pathinfo($nomeOriginal, PATHINFO_EXTENSION));

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $tipoMime = finfo_file($finfo, $arquivoTmp);
    finfo_close($finfo);

    // Extensões permitidas (imagens + html)
    $extensoesPermitidas = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'html', 'htm'];

    // MIME types permitidos (imagens + html)
    $tiposMimePermitidos = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp',
        'image/svg+xml',
        'text/html'
    ];

    if(!in_array($extensao, $extensoesPermitidas) || !in_array($tipoMime, $tiposMimePermitidos)){
        die("Arquivo inválido. Apenas imagens (jpg, jpeg, png, gif, bmp, webp, svg) e HTML são permitidos para certificados.");
    }

    $nomeArquivo = $rmAluno . "_" 
                 . preg_replace('/[^A-Za-z0-9_-]/', '', $nomeAluno) . "" 
                 . preg_replace('/[^A-Za-z0-9_-]/', '_', $titulo) 
                 . "." . $extensao;

    $destinoFisico = $uploadDir . "/" . $nomeArquivo;
    $urlBanco = "uploads/" . $nomeArquivo;

    if(move_uploaded_file($arquivoTmp, $destinoFisico)){
        $sql = "INSERT INTO certificados (titulo, dataEmissao, URL, quantidadeHoras, instituicao, idAluno) 
                VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        if(!$stmt){
            die("Erro na query: " . $conn->error);
        }

        $stmt->bind_param("sssisi", $titulo, $data, $urlBanco, $horas, $instituicao, $idAluno);

        if($stmt->execute()){
            header("Location: ../../frontend/paginas/certificados.php");
            exit;
        } else {
            echo "Erro ao salvar no banco: " . $stmt->error;
        }
        $stmt->close();
    } else {
        echo "Erro ao mover o arquivo.";
    }
} else {
    echo "Nenhum arquivo enviado ou erro no upload.";
}

$conn->close();
?>