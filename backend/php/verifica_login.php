<?php
// Não precisa de session_start() aqui.
// session_config.php cuidará disso antes de incluir este arquivo.
if (!isset($_SESSION['tipo']) || !isset($_SESSION['rm'])) {
    // É uma boa prática limpar a sessão antes de redirecionar para login
    session_unset();
    session_destroy();
    header("Location: ../../index.php"); // Seu caminho de login
    exit;
}
// Não precisa de fechamento ?>