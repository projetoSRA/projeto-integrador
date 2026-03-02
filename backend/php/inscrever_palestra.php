<?php
require_once "session_config.php";
require_once "verifica_login.php";
require_once "conexao.php";

$idAluno = $_SESSION['idAluno'] ?? null;

if (!$idAluno) {
    echo json_encode(["status" => "erro", "msg" => "Usuário não logado"]);
    exit;
}

$idPalestra = $_POST['idPalestra'] ?? null;

if (!$idPalestra) {
    echo json_encode(["status" => "erro", "msg" => "ID da palestra não enviado"]);
    exit;
}

// Verifica se já está inscrito
$sqlCheck = $conn->prepare("SELECT id FROM inscricoes WHERE idAluno = ? AND idPalestra = ?");
$sqlCheck->bind_param("ii", $idAluno, $idPalestra);
$sqlCheck->execute();
$result = $sqlCheck->get_result();

if ($result->num_rows > 0) {
    echo json_encode(["status" => "ja_inscrito"]);
    exit;
}

// Insere inscrição
$sql = $conn->prepare("INSERT INTO inscricoes (idAluno, idPalestra) VALUES (?, ?)");
$sql->bind_param("ii", $idAluno, $idPalestra);

if ($sql->execute()) {
    echo json_encode(["status" => "ok"]);
} else {
    echo json_encode(["status" => "erro", "msg" => "Falha ao inserir"]);
}
?>
