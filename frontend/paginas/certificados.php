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
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificados — SRA</title>

  <!-- Font Awesome (ícones) -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"/>

  <!-- Seu CSS (certificados) -->
  <link rel="stylesheet" href="../css/style_certificados.css">
</head>
<body>

  <!-- ================= NAVBAR (corrigida) ================= -->
  <nav>

    <!-- Ícone menu (mobile) -->
    <div class="menu-icon" id="menuIcon" aria-label="Abrir menu" role="button" tabindex="0">
      <span class="fas fa-bars" aria-hidden="true"></span>
    </div>

    <!-- Ícone cancelar (X) -->
    <div class="cancel-icon" id="cancelIcon" aria-label="Fechar menu" role="button" tabindex="0" style="display: none;">
      <span class="fas fa-times" aria-hidden="true"></span>
    </div>

    <!-- Logo (central) -->
    <div class="logo">
      <a href="../../backend/php/paginaslide.php">SRA</a>
    </div>

    <!-- Itens da navegação (use <ul> para semântica) -->
    <ul class="nav-items" id="navItems" role="menu" aria-hidden="true">
      <li role="none"><a role="menuitem" href="../paginas/horas.php">Horas</a></li>
      <li role="none"><a role="menuitem" href="../paginas/relatorio.php">Relatórios</a></li>
      <li role="none"><a role="menuitem" href="../paginas/certificados.php">Certificados</a></li>
      <li role="none"><a role="menuitem" href="../paginas/palestras.php">Palestras</a></li>
    </ul>

    <!-- Perfil (dropdown) -->
    <div class="profile-container">
      <img src="../img/relogio.png" alt="Perfil" class="profile-icon" id="profileBtn" />

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

      <!-- Lista de certificados -->
      <div class="cert-list">
      <?php

$sql = "SELECT * FROM certificados WHERE idAluno = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $idAluno);
$stmt->execute();
$result = $stmt->get_result();

if($result->num_rows > 0){
    while($row = $result->fetch_assoc()){
        echo '<div class="cert-item">';
        echo '<strong>'.htmlspecialchars($row['titulo']).'</strong>';
        echo '<small>Horas: '.$row['quantidadeHoras'].' | Data: '.$row['dataEmissao'].'</small>';
        echo '<br><a href="../../backend/'.$row['URL'].'" target="_blank">Ver Certificado</a>';

        // Botão de excluir
        echo '<form method="POST" action="../../backend/php/excluir_certificado.php" style="display:inline">';
        echo '<input type="hidden" name="idCertificado" value="'.$row['idCertificado'].'">';
        echo '<button type="submit" class="btn danger" onclick="return confirm(\'Deseja realmente excluir este certificado?\')">Excluir</button>';
        echo '</form>';

        echo '</div>';
    }
} else {
    echo "<p>Nenhum certificado encontrado.</p>";
}
?>
      </div>
    </div>
  </main>

  <!-- Modal do formulário -->
  <div class="form-modal" id="formModal" aria-hidden="true">
    <div class="form-box">
      <h2>Informações do Arquivo</h2>
      <form id="uploadForm" action="../../backend/php/upload.php" method="POST" enctype="multipart/form-data">
        <label>Evento</label>
        <input type="text" name="curso" id="cursoInput" required>

        <label>Horas</label>
        <input type="number" name="horas" id="horasInput" min="1" max="50" required>

        <label>Data do Evento</label>
        <input type="date" name="data" id="dataInput" required>

        <input type="file" name="arquivo" id="fileInput" style="display:none" required
               accept="image/png, image/jpeg, image/gif, image/bmp, image/webp, image/svg+xml, application/pdf, text/pdf">

        <div class="form-actions">
          <button type="button" class="btn secondary" onclick="closeForm()">Cancelar</button>
          <button type="submit" class="btn">Salvar</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ================= SCRIPTS ================= -->
  <script>
    // Referências
    const menuIcon = document.getElementById("menuIcon");
    const cancelIcon = document.getElementById("cancelIcon");
    const navItems = document.getElementById("navItems");
    const profileBtn = document.getElementById("profileBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const formModal = document.getElementById("formModal");
    const fileInput = document.getElementById("fileInput");

    // Inicial: garantir estado correto
    document.addEventListener('DOMContentLoaded', () => {
      cancelIcon.style.display = "none";
      navItems.classList.remove("active");
    });

    // Abre menu mobile
    menuIcon.addEventListener("click", () => {
      navItems.classList.add("active");
      navItems.setAttribute("aria-hidden", "false");
      menuIcon.style.display = "none";
      cancelIcon.style.display = "flex";
    });

    // Fecha menu mobile
    cancelIcon.addEventListener("click", () => {
      navItems.classList.remove("active");
      navItems.setAttribute("aria-hidden", "true");
      cancelIcon.style.display = "none";
      menuIcon.style.display = "flex";
    });

    // Fecha menu ao clicar em um link (mobile)
    navItems.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navItems.classList.remove("active");
        navItems.setAttribute("aria-hidden", "true");
        cancelIcon.style.display = "none";
        menuIcon.style.display = "flex";
      });
    });

    // Dropdown do perfil
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle("show");
      const shown = dropdownMenu.classList.contains("show");
      dropdownMenu.setAttribute("aria-hidden", !shown);
    });

    // Fecha dropdown ao clicar fora
    document.addEventListener("click", (e) => {
      if (!profileBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.remove("show");
        dropdownMenu.setAttribute("aria-hidden", "true");
      }
    });

    // Função de logout
    function confirmarLogout() {
      if (confirm("Deseja realmente sair?")) window.location.href = "../../backend/php/logout.php";
    }

    // Modal do formulário (abrir/fechar)
    function openForm() {
      formModal.classList.add("open");
      formModal.setAttribute("aria-hidden", "false");
    }
    function closeForm() {
      formModal.classList.remove("open");
      formModal.setAttribute("aria-hidden", "true");
      // Limpar inputs se quiser
      // document.getElementById('uploadForm').reset();
    }

    // Ao clicar no botão "Importar", abrimos form; quando o usuário clica no botão "Importar" original,
    // chamamos openForm() (já ligado no HTML). Se quiser que o clique no file input abra no upload:
    // document.querySelector('.btn.importar').addEventListener('click', () => fileInput.click());

    // Segurança: se janela redimensionada para desktop, resetar menu
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1140) { // breakpoint alinhado com seu CSS
        navItems.classList.remove('active');
        navItems.setAttribute('aria-hidden', 'false');
        cancelIcon.style.display = "none";
        menuIcon.style.display = "none"; // em desktop seu CSS esconde o menu-icon; manter isso
      } else {
        // mobile: garantir visibilidade do menu icon se necessário
        menuIcon.style.display = "flex";
      }
    });
  </script>

  <!-- Seu script externo (se houver) -->
  <script src="../js/certificados.js" defer></script>
</body>
</html>
