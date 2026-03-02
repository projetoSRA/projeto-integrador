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

// Recebe o ID via POST
$idCertificado = $_POST['idCertificado'] ?? null;

if(!$idCertificado){
    die("ID inválido.");
}

// Busca o certificado para excluir também o arquivo
$sql = "SELECT URL FROM certificados WHERE idCertificado = ? AND idAluno = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $idCertificado, $idAluno);
$stmt->execute();
$result = $stmt->get_result();

if($result->num_rows > 0){
    $row = $result->fetch_assoc();
    $arquivo = "../" . $row['URL'];

    // Deleta do banco
    $sqlDel = "DELETE FROM certificados WHERE idCertificado = ? AND idAluno = ?";
    $stmtDel = $conn->prepare($sqlDel);
    $stmtDel->bind_param("ii", $idCertificado, $idAluno);

    if($stmtDel->execute()){
        if(file_exists($arquivo)){
            unlink($arquivo); // remove o arquivo físico
        }
        header("Location: ../../frontend/paginas/certificados.php");
        exit;
    } else {
        echo "Erro ao excluir do banco.";
    }
    $stmtDel->close();
} else {
    echo "Certificado não encontrado.";
}

$stmt->close();
$conn->close();
?>
