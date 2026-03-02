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
$idRelatorios = $_POST['idRelatorios'] ?? null;

if(!$idRelatorios){
    die("ID inválido.");
}

// Busca o certificado para excluir também o arquivo
$sql = "SELECT URL FROM relatorios WHERE idRelatorios = ? AND idAluno = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $idRelatorios, $idAluno);
$stmt->execute();
$result = $stmt->get_result();

if($result->num_rows > 0){
    $row = $result->fetch_assoc();
    $arquivo = "../" . $row['URL'];

    // Deleta do banco
    $sqlDel = "DELETE FROM relatorios WHERE idRelatorios = ? AND idAluno = ?";
    $stmtDel = $conn->prepare($sqlDel);
    $stmtDel->bind_param("ii", $idRelatorios, $idAluno);

    if($stmtDel->execute()){
        if(file_exists($arquivo)){
            unlink($arquivo); // remove o arquivo físico
        }
        header("Location: ../../paginas/relatorio.php");
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
