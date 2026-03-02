<?php
// ================= INÍCIO DA SESSÃO =================
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
?>
<!DOCTYPE html>
<html lang="pt-br" >
  <head>
    <meta charset="utf-8" />
    <title>Notícias</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Ícones Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"/>

    <!-- Swiper (biblioteca do carrossel/slider) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" />

    <!-- Estilo personalizado da página -->
    <link rel="stylesheet" href="../../frontend/css/style_slide.css" />
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
        <a href="../php/paginaslide.php">SRA</a>
    </div>

    <!-- Itens da navbar -->
    <ul class="nav-items" id="navItems" role="menu" aria-hidden="true">
        <li role="none"><a role="menuitem" href="../../frontend/paginas/horas.php">Horas</a></li>
        <li role="none"><a role="menuitem" href="../../frontend/paginas/relatorio.php">Relatórios</a></li>
        <li role="none"><a role="menuitem" href="../../frontend/paginas/certificados.php">Certificados</a></li>
        <li role="none"><a role="menuitem" href="../../frontend/paginas/palestras.php">Palestras</a></li>
    </ul>

    <!-- Perfil -->
    <div class="profile-container">
        <img src="../../frontend/img/relogio.png" alt="Perfil" class="profile-icon" id="profileBtn">
        <div class="dropdown-menu" id="dropdownMenu" aria-hidden="true">
            <div class="profile-info">
                <img src="../../frontend/img/relogio.png" alt="Perfil" />
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

    <!-- ================= SLIDER DE NOTÍCIAS ================= -->
    <div class="container swiper">
      <div class="wrapper">
        <div class="card-list swiper-wrapper">

          <!-- ==== CARD 1 ==== -->
          <div class="card swiper-slide">
            <div class="card-image">
              <img src="../../frontend/img/gamerscom-fatec-taquaritinga.jpg" />
            </div>
            <div class="card-content">
              <h3 class="card-title">CPS levará estudantes e professores para ‘Gamescom Latam 2025’</h3>
              <p class="card-text">Etecs e Fatecs contarão com 1,5 mil ingressos gratuitos...</p>
              <div class="card-footer">
                <a href="https://www.cps.sp.gov.br/cps-levara-estudantes-e-professores-para-gamescom-latam-2025/" target="_blank" class="card-button">Saiba Mais</a>
              </div>
            </div>
          </div>

          <!-- ==== CARD 2 ==== -->
          <div class="card swiper-slide">
            <div class="card-image">
              <img src="../../frontend/img/feirasdeinstitutos.jpg" />
            </div>
            <div class="card-content">
              <h3 class="card-title">CPS recebe sexta edição da Feira de Institutos Politécnicos Portugueses</h3>
              <p class="card-text">Evento contou com a participação de representantes...</p>
              <div class="card-footer">
                <a href="https://www.cps.sp.gov.br/cps-recebe-sexta-edicao-da-feira-de-institutos-politecnicos-portugueses" target="_blank" class="card-button">Saiba Mais</a>
              </div>
            </div>
          </div>

          <!-- ==== CARD 3 ==== -->
          <div class="card swiper-slide">
            <div class="card-image">
              <img src="../../frontend/img/cpsayrton.jpeg" />
            </div>
            <div class="card-content">
              <h3 class="card-title">Gestores do Centro Paula Souza visitam sede do Instituto Ayrton Senna</h3>
              <p class="card-text">ONG mantém parceria com CPS voltada ao desenvolvimento socioemocional...</p>
              <div class="card-footer">
                <a href="https://www.cps.sp.gov.br/gestores-do-centro-paula-souza-visitam-sede-do-instituto-ayrton-senna/" target="_blank" class="card-button">Saiba Mais</a>
              </div>
            </div>
          </div>

          <!-- ==== CARD 4 ==== -->
          <div class="card swiper-slide">
            <div class="card-image">
              <img src="../../frontend/img/inscriçoes.jpg" />
            </div>
            <div class="card-content">
              <h3 class="card-title">Centro Paula Souza prorroga inscrições para 20ª Escola de Inovadores</h3>
              <p class="card-text">Curso online gratuito ensina pessoas com espírito empreendedor...</p>
              <div class="card-footer">
                <a href="https://www.cps.sp.gov.br/cps-prorroga-inscricoes-para-20a-escola-de-inovadores/" target="_blank" class="card-button">Saiba Mais</a>
              </div>
            </div>
          </div>

          <!-- ==== CARD 5 ==== -->
          <div class="card swiper-slide">
            <div class="card-image">
              <img src="../../frontend/img/etec.jpg" />
            </div>
            <div class="card-content">
              <h3 class="card-title">Etecs e Fatecs oferecem consultoria gratuita para declaração do IRPF</h3>
              <p class="card-text">Prazo para prestar contas à Receita Federal segue até 30 de maio...</p>
              <div class="card-footer">
                <a href="https://www.cps.sp.gov.br/etecs-e-fatecs-oferecem-consultoria-para-declaracao-do-irpf-2/" target="_blank" class="card-button">Saiba Mais</a>
              </div>
            </div>
          </div>

        </div>

        <!-- Botões do slider -->
        <div class="swiper-slide-button swiper-button-prev"></div>
        <div class="swiper-slide-button swiper-button-next"></div>
      </div>
    </div>

    <!-- ================= SEÇÃO DE INFORMAÇÕES ================= -->
    <section class="info-section">


    
    <!-- ================= SCRIPTS ================= -->
    <!-- Swiper -->
    <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
    <!-- Script JS externo -->
    <script src="../../frontend/js/pagina_slide.js"></script>

    <script>
  // ================= FUNÇÕES JS =================

  // --- Bloqueio do botão Voltar ---
  function bloquearVoltar() {
    history.pushState(null, null, location.href);
  }

  // --- Logout com confirmação ---
  function confirmarLogout() {
    if (confirm("Deseja realmente sair?")) {
      sessionStorage.clear(); // Limpa dados da sessão no navegador
      window.removeEventListener("popstate", bloquearVoltar); // Libera o botão voltar
      window.location.replace("../php/logout.php"); // Redireciona para logout.php
    }
  }

  // --- Ao carregar a página ---
  document.addEventListener("DOMContentLoaded", () => {
    // ================= MENU RESPONSIVO =================
    const menuIcon = document.getElementById("menuIcon");
    const cancelIcon = document.getElementById("cancelIcon");
    const navItems = document.getElementById("navItems");
    const profileBtn = document.getElementById("profileBtn");
    const dropdownMenu = document.getElementById("dropdownMenu");

    // Inicial: estado correto
    if (menuIcon && cancelIcon && navItems && profileBtn && dropdownMenu) {
      cancelIcon.style.display = "none";
      navItems.classList.remove("active");
      navItems.setAttribute("aria-hidden", "true");
      menuIcon.setAttribute("aria-expanded", "false");
      profileBtn.setAttribute("aria-expanded", "false");
      dropdownMenu.setAttribute("aria-hidden", "true");

      // Abre menu mobile
      menuIcon.addEventListener("click", () => {
        navItems.classList.add("active");
        menuIcon.style.display = "none";
        cancelIcon.style.display = "flex";
        navItems.setAttribute("aria-hidden", "false");
        menuIcon.setAttribute("aria-expanded", "true");
      });

      // Fecha menu mobile
      cancelIcon.addEventListener("click", () => {
        navItems.classList.remove("active");
        cancelIcon.style.display = "none";
        menuIcon.style.display = "flex";
        navItems.setAttribute("aria-hidden", "true");
        menuIcon.setAttribute("aria-expanded", "false");
      });

      // Fecha menu ao clicar em link (mobile)
      navItems.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          if (window.innerWidth <= 768) {
            navItems.classList.remove("active");
            cancelIcon.style.display = "none";
            menuIcon.style.display = "flex";
            navItems.setAttribute("aria-hidden", "true");
            menuIcon.setAttribute("aria-expanded", "false");
          }
        });
      });

      // Dropdown do perfil
      profileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isShown = dropdownMenu.classList.toggle("show");
        profileBtn.setAttribute("aria-expanded", isShown);
        dropdownMenu.setAttribute("aria-hidden", !isShown);
      });

      // Fecha dropdown ao clicar fora
      document.addEventListener("click", (e) => {
        if (dropdownMenu.classList.contains("show") && !profileBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
          dropdownMenu.classList.remove("show");
          profileBtn.setAttribute("aria-expanded", "false");
          dropdownMenu.setAttribute("aria-hidden", "true");
        }
      });
    }

    // ================= BLOQUEIO BOTÃO VOLTAR =================
    history.pushState(null, null, location.href);
    window.addEventListener("popstate", bloquearVoltar);

    // ================= EXIBIR NOME E RM =================
    const nomeUsuario = sessionStorage.getItem("nome");
    const rmUsuario = sessionStorage.getItem("rm");

    if (nomeUsuario && rmUsuario) {
      const nomeEl = document.getElementById("nomeUsuario");
      const rmEl = document.getElementById("rmUsuario");

      if (nomeEl) nomeEl.textContent = nomeUsuario;
      if (rmEl) rmEl.textContent = "RM: " + rmUsuario;
    }
  });
</script>

  </body>
</html>
