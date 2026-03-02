<?php
require_once "../../backend/php/session_config.php";
require_once "../../backend/php/verifica_login.php";
require_once "../../backend/php/conexao.php";

$nome = $_SESSION['nome'];
$rm   = $_SESSION['rm'];
$idAluno = $_SESSION['idAluno'] ?? null;

if (!$idAluno) {
    echo "<p>Usuário não logado.</p>";
    exit;
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Palestras — SRA</title>

<!-- Font Awesome CSS confiável -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"/>

<!-- CSS corrigido -->
<link rel="stylesheet" href="../css/style_palestras.css">
</head>
<body>

<!-- ================= NAVBAR ================= -->
<nav>

    <!-- Ícone menu (hamburger) -->
    <div class="menu-icon" id="menuIcon" aria-label="Abrir menu" role="button" tabindex="0">
        <span class="fas fa-bars" aria-hidden="true"></span>
    </div>

    <!-- Ícone cancelar menu -->
    <div class="cancel-icon" id="cancelIcon" aria-label="Fechar menu" role="button" tabindex="0" style="display:none;">
        <span class="fas fa-times" aria-hidden="true"></span>
    </div>

    <!-- Logo -->
    <div class="logo">
        <a href="../../backend/php/paginaslide.php">SRA</a>
    </div>

    <!-- Itens da navbar -->
    <ul class="nav-items" id="navItems" role="menu" aria-hidden="true">
        <li role="none"><a role="menuitem" href="../paginas/horas.php">Horas</a></li>
        <li role="none"><a role="menuitem" href="../paginas/relatorio.php">Relatórios</a></li>
        <li role="none"><a role="menuitem" href="../paginas/certificados.php">Certificados</a></li>
        <li role="none"><a role="menuitem" href="../paginas/palestras.php">Palestras</a></li>
    </ul>

    <!-- Perfil -->
    <div class="profile-container">
        <img src="../img/relogio.png" alt="Perfil" class="profile-icon" id="profileBtn">
        <div class="dropdown-menu" id="dropdownMenu" aria-hidden="true">
            <div class="profile-info">
                <img src="../img/relogio.png" alt="Perfil" />
                <h3><?php echo htmlspecialchars($nome); ?></h3>
                <p>RM: <?php echo htmlspecialchars($rm); ?></p>
            </div>
            <a href="#" onclick="confirmarLogout()">🚪 Sair</a>
        </div>
    </div>

</nav>

<!-- ================= CONTEÚDO ================= -->
<div class="content">
    <header>Palestras Disponíveis</header>
</div>

<section class="info-section">
    <div class="card-tabela">
        <div class="coluna-imagem">
            <img src="https://img.olx.com.br/images/26/267560220751520.webp" class="palestra-img" alt="Palestra">
        </div>
        <div class="coluna-info">
            <table class="tabela-info">
                <tr><td class="titulo" colspan="2">Como ficar milionário com o Ruyter</td></tr>
                <tr><th>Local:</th><td>Fatec Ourinhos</td></tr>
                <tr><th>Horário:</th><td>13:30 até 17:30 (4 horas totais)</td></tr>
                <tr><th>Palestrante:</th><td>Ruyter</td></tr>
            </table>
            <div class="area-botao">
                <button id="btnInscricao" class="btn inscrever" onclick="toggleInscricao()">Inscrever-se</button>
            </div>
        </div>
    </div>
</section>

<!-- ================= SCRIPTS ================= -->
<script>
document.addEventListener("DOMContentLoaded", () => {

    // ===== MENU RESPONSIVO =====
    const menuIcon = document.getElementById("menuIcon");
    const cancelIcon = document.getElementById("cancelIcon");
    const navItems = document.getElementById("navItems");

    // Estado inicial
    cancelIcon.style.display = "none";
    navItems.classList.remove("active");
    navItems.setAttribute("aria-hidden", "true");

    menuIcon.addEventListener("click", () => {
        navItems.classList.add("active");
        navItems.setAttribute("aria-hidden", "false");
        menuIcon.style.display = "none";
        cancelIcon.style.display = "flex";
    });

    cancelIcon.addEventListener("click", () => {
        navItems.classList.remove("active");
        navItems.setAttribute("aria-hidden", "true");
        cancelIcon.style.display = "none";
        menuIcon.style.display = "flex";
    });

    navItems.querySelectorAll("a").forEach(item => {
        item.addEventListener("click", () => {
            navItems.classList.remove("active");
            navItems.setAttribute("aria-hidden", "true");
            cancelIcon.style.display = "none";
            menuIcon.style.display = "flex";
        });
    });

    // ===== DROPDOWN PERFIL =====
    const profileBtn = document.getElementById("profileBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");

    profileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle("show");
        const shown = dropdownMenu.classList.contains("show");
        dropdownMenu.setAttribute("aria-hidden", !shown);
    });

    document.addEventListener("click", (e) => {
        if (!profileBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove("show");
            dropdownMenu.setAttribute("aria-hidden", "true");
        }
    });

    // ===== LOGOUT =====
    window.confirmarLogout = function() {
        if (confirm("Deseja realmente sair?")) {
            window.location.href = "../../backend/php/logout.php";
        }
    };

    // ===== BOTÃO INSCRIÇÃO =====
    window.toggleInscricao = function() {
        const btn = document.getElementById("btnInscricao");
        if (btn.classList.contains("inscrever")) {
            btn.classList.remove("inscrever");
            btn.classList.add("inscrito");
            btn.innerText = "Inscrito";
        } else {
            btn.classList.remove("inscrito");
            btn.classList.add("inscrever");
            btn.innerText = "Inscrever-se";
        }
    };

    // ===== RESETAR MENU AO REDIMENSIONAR =====
    window.addEventListener("resize", () => {
        if (window.innerWidth > 1140) {
            navItems.classList.remove("active");
            navItems.setAttribute("aria-hidden", "false");
            cancelIcon.style.display = "none";
            menuIcon.style.display = "none";
        } else {
            menuIcon.style.display = "flex";
        }
    });

});
</script>

</body>
</html>
