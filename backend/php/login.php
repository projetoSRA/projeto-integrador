<?php
// ======================= CONFIGURAÇÃO DE SESSÃO =======================
$sessPath = __DIR__ . '/sessions';
if (!is_dir($sessPath)) mkdir($sessPath, 0777, true);
ini_set('session.save_path', $sessPath);
ini_set('session.cookie_path', '/'); // Cookie válido para todo o domínio
ini_set('session.gc_maxlifetime', 3600); // Sessão dura 1h
session_start();

require_once "conexao.php";

// ======================= CAPTURA DOS DADOS =======================
$tipo    = $_POST['format'] ?? '';
$usuario = $_POST['rm'] ?? '';
$senha   = $_POST['senha'] ?? '';

if (empty($tipo) || empty($usuario) || empty($senha)) {
    echo "<script>alert('Preencha todos os campos.'); window.location.href='../../index.php';</script>";
    exit;
}

// ======================= LIMPEZA =======================
$usuario = mysqli_real_escape_string($conn, trim($usuario));
if ($tipo === 'empresas') $usuario = preg_replace('/\D/', '', $usuario);

// ======================= TABELA E CAMPO =======================
switch ($tipo) {
    case 'alunos':
        $tabela = 'alunos';
        $campo  = 'rm';
        break;

    case 'coordenacao':
        $tabela = 'coordenacao';
        $campo  = 'login';
        break;

    case 'empresas':
        $tabela = 'empresa';
        $campo  = 'cnpj';
        break;

    default:
        echo "<script>alert('Tipo de usuário inválido.'); window.location.href='../../index.php';</script>";
        exit;
}

// ======================= CONSULTA SEGURA =======================
$sql = "SELECT * FROM $tabela WHERE $campo = ?";
$stmt = mysqli_prepare($conn, $sql);
if (!$stmt) {
    echo "<script>alert('Erro no banco de dados.'); window.location.href='../../index.php';</script>";
    exit;
}

mysqli_stmt_bind_param($stmt, 's', $usuario);
mysqli_stmt_execute($stmt);
$result = mysqli_stmt_get_result($stmt);

// ======================= VERIFICA USUÁRIO =======================
if ($result && mysqli_num_rows($result) > 0) {
    $row = mysqli_fetch_assoc($result);

    if (password_verify($senha, $row['senha'])) {

        // ====== ARMAZENA OS DADOS NA SESSÃO ======
        $_SESSION['tipo'] = $tipo;

        switch ($tipo) {
            case 'alunos':
               $_SESSION['idAluno'] = $row['id'];
                $_SESSION['rm']      = $row['rm'];
                $_SESSION['nome']    = $row['nome'];
                break;

            case 'coordenacao':
                $_SESSION['idAluno'] = null;
                $_SESSION['rm']      = $row['login'];
                $_SESSION['nome']    = $row['nome'];
                break;

            case 'empresas':
                $_SESSION['idAluno'] = null;
                $_SESSION['rm']      = $row['cnpj'];
                $_SESSION['nome']    = $row['empresa'];
                break;
        }

        // ====== REDIRECIONAMENTO ======
        header("Location: ../php/paginaslide.php");
        exit;

    } else {
        echo "<script>alert('Senha incorreta.'); window.location.href='../../index.php';</script>";
        exit;
    }
} else {
    echo "<script>alert('Usuário não encontrado.'); window.location.href='../../index.php';</script>";
    exit;
}
?>
