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
  <title>Importar Arquivos</title>

  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"/>
  
  <!-- CSS da página -->
  <link rel="stylesheet" href="../css/style_certificados.css">

  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>

<!-- ================= NAVBAR (CORRIGIDA) ================= -->
<nav>

    <!-- Ícone menu (mobile) -->
    <div class="menu-icon" id="menuIcon">
        <span class="fas fa-bars"></span>
    </div>

    <!-- Ícone cancelar -->
    <div class="cancel-icon" id="cancelIcon">
        <span class="fas fa-times"></span>
    </div>

    <!-- Logo -->
    <div class="logo">
        <a href="../../backend/php/paginaslide.php">SRA</a>
    </div>

    <!-- Itens da navegação -->
    <ul class="nav-items" id="navItems">
        <li><a href="../paginas/horas.php">Horas</a></li>
        <li><a href="../paginas/relatorio.php">Relatórios</a></li>
        <li><a href="../paginas/certificados.php">Certificados</a></li>
        <li><a href="../paginas/palestras.php">Palestras</a></li>
    </ul>

    <!-- PERFIL -->
    <div class="profile-container">
        <img src="../img/relogio.png" alt="Perfil" class="profile-icon" id="profileBtn">

        <div class="dropdown-menu" id="dropdownMenu">
            <div class="profile-info">
                <img src="../img/relogio.png" alt="Perfil">
                <h3><?php echo htmlspecialchars($nome); ?></h3>
                <p>RM: <?php echo htmlspecialchars($rm); ?></p>
            </div>
            <a href="#" onclick="confirmarLogout()">🚪 Sair</a>
        </div>
    </div>

</nav>

<!-- ================= CONTEÚDO CENTRAL ================= -->
<div class="content">
<header class="space"></header>
<div class="space text"></div>
</div>

<main>
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Meus Arquivos</span>
        <button class="btn" onclick="document.getElementById('fileInput').click()">Importar</button>
      </div>

      <div class="cert-list">
      <?php

$sql = "SELECT * FROM relatorios WHERE idAluno = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $idAluno);
$stmt->execute();
$result = $stmt->get_result();

if($result->num_rows > 0){
    while($row = $result->fetch_assoc()){
        echo '<div class="cert-item">';
        echo '<strong>'.htmlspecialchars($row['titulo']).'</strong>';
        echo '<small>Horas: '.$row['quantidadeHoras'].' | Data: '.$row['dataEmissao'].'</small>';
        echo '<br><a href="../../backend/'.$row['URL'].'" target="_blank">Ver Relatório</a>';

        echo '<form method="POST" action="../php/excluir_relatorio.php" style="display:inline">';
        echo '<input type="hidden" name="idRelatorios" value="'.$row['idRelatorios'].'">';
        echo '<button type="submit" class="btn danger" onclick="return confirm(\'Deseja realmente excluir este relatorio?\')">Excluir</button>';
        echo '</form>';

        echo '</div>';
    }
} else {
    echo "<p>Nenhum relatorio encontrado.</p>";
}
?>
      </div>
    </div>
</main>

<!-- Modal -->
<div class="form-modal" id="formModal">
    <div class="form-box">
      <h2>Informações do Arquivo</h2>

      <form id="uploadForm" action="../../backend/php/upload_relatorio.php" method="POST" enctype="multipart/form-data">
        
        <label>Evento</label>
        <input type="text" name="curso" required>

        <label>Horas</label>
        <input type="number" name="horas" min="1" max="2" required>

        <label>Data do Evento</label>
        <input type="date" name="data" required>

        <input type="file" name="arquivo" id="fileInput" style="display:none"
               required
               accept=".txt,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document">

        <div class="form-actions">
          <button type="button" class="btn secondary" onclick="closeForm()">Cancelar</button>
          <button type="submit" class="btn">Salvar</button>
        </div>
      </form>

    </div>
</div>

<!-- ==================== SCRIPTS NAVBAR ==================== -->
<script>
const menuIcon = document.getElementById("menuIcon");
const cancelIcon = document.getElementById("cancelIcon");
const navItems = document.getElementById("navItems");

// Abrir menu
menuIcon.addEventListener("click", () => {
    navItems.classList.add("active");
    menuIcon.style.display = "none";
    cancelIcon.style.display = "flex";
});

// Fechar menu
cancelIcon.addEventListener("click", () => {
    navItems.classList.remove("active");
    cancelIcon.style.display = "none";
    menuIcon.style.display = "flex";
});

// Fechar ao clicar em item
navItems.querySelectorAll("a").forEach(item => {
    item.addEventListener("click", () => {
        navItems.classList.remove("active");
        cancelIcon.style.display = "none";
        menuIcon.style.display = "flex";
    });
});

// ==================== DROPDOWN PERFIL ====================
const profileBtn = document.getElementById("profileBtn");
const dropdownMenu = document.getElementById("dropdownMenu");

profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("show");
});

document.addEventListener("click", () => {
    dropdownMenu.classList.remove("show");
});

// ==================== LOGOUT ====================
function confirmarLogout() {
    if (confirm("Deseja realmente sair?")) {
        window.location.href = "../../backend/php/logout.php";
    }
}
</script>

<script src="../js/certificados.js"></script>
</body>
</html>
