<?php
$servidor = "sql100.infinityfree.com";
$usuario = "if0_40138881";
$senha = "Y95moaMZeDv"; // deixe vazio se estiver no XAMPP ou altere conforme seu ambiente
$banco = "if0_40138881_tcc";

$conn = new mysqli($servidor, $usuario, $senha, $banco);

if ($conn->connect_error) {
    die("Falha na conexão: " . $conn->connect_error);
}
?>
