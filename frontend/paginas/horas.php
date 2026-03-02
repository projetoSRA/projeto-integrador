<?php
// ================= INÍCIO DA SESSÃO =================
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

// Inicializa variáveis
$dados = [];
$horasEventos = 0;
$horasCertificados = 0;
$horasRelatorio = 0;

// -------- Certificados --------
$stmt = $conn->prepare("SELECT titulo, quantidadeHoras FROM certificados WHERE idAluno=?");
$stmt->bind_param("i", $idAluno);
$stmt->execute();
$result = $stmt->get_result();
while($row = $result->fetch_assoc()){
    $row['categoria'] = 'certificado';
    $dados[] = $row;
    $horasCertificados += (int)$row['quantidadeHoras'];
}
$stmt->close();

// -------- Relatórios --------
$stmt = $conn->prepare("SELECT titulo, quantidadeHoras FROM relatorios WHERE idAluno=?");
$stmt->bind_param("i", $idAluno);
$stmt->execute();
$result = $stmt->get_result();
while($row = $result->fetch_assoc()){
    $row['categoria'] = 'relatorio';
    $dados[] = $row;
    $horasRelatorio += (int)$row['quantidadeHoras'];
}
$stmt->close();

$totalHoras = $horasEventos + $horasCertificados + $horasRelatorio;
$totalAlvo = 200;
$horasRestantes = max($totalAlvo - $totalHoras, 0);

$labelsGrafico = ['Eventos','Certificados','Relatórios'];
$dadosGrafico = [$horasEventos, $horasCertificados, $horasRelatorio];

if($horasRestantes > 0){
    $labelsGrafico[] = 'Faltante';
    $dadosGrafico[] = $horasRestantes;
}
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Horas</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0"> <link rel="stylesheet" href="../css/style_horas.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>

<nav>
    <div class="menu-icon" id="menuIcon"><i class="fas fa-bars"></i></div>
    <div class="logo"><a href="../../backend/php/paginaslide.php">SRA</a></div>
    <ul class="nav-items" id="navItems">
        <li><a href="../paginas/horas.php">Horas</a></li>
        <li><a href="../paginas/relatorio.php">Relatórios</a></li>
        <li><a href="../paginas/certificados.php">Certificados</a></li>
        <li><a href="../paginas/palestras.php">Palestras</a></li>
    </ul>
    <div class="cancel-icon" id="cancelIcon"><i class="fas fa-times"></i></div>

    <div class="profile-container">
        <img src="../img/relogio.png" alt="Perfil" class="profile-icon" id="profileBtn">
        <div class="dropdown-menu" id="dropdownMenu">
            <div class="profile-info">
                <img src="../img/relogio.png" alt="Perfil" />
                <h3><?php echo htmlspecialchars($nome); ?></h3>
                <p>RM: <?php echo htmlspecialchars($rm); ?></p>
            </div>
            <a href="#" onclick="confirmarLogout()">🚪 Sair</a>
        </div>
    </div>
</nav>

<main>
    <div class="panel">
        <div class="panel-header"><span class="panel-title">Minhas Horas</span></div>
        <div class="content-wrapper">
            <div class="chart-container">
                <canvas id="graficoHoras"></canvas>
            </div>
            <div class="table-container">
    		<table class="w-full table-fixed text-center">
                    <thead>
                        <tr>
                            <th>Eventos</th>
                            <th>Certificados</th>
                            <th>Relatórios</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><?= $horasEventos; ?></td>
                            <td><?= $horasCertificados; ?></td>
                            <td><?= $horasRelatorio; ?></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="total-horas">
            Total de Horas: <?= $totalHoras; ?> / <?= $totalAlvo; ?>h
        </div>
    </div>
</main>

<script>
// ... (Seu PHP e JS existentes) ...

// ================= MENU RESPONSIVO =================
const menuIcon = document.getElementById("menuIcon");
const cancelIcon = document.getElementById("cancelIcon");
const navItems = document.getElementById("navItems");
const profileBtn = document.getElementById("profileBtn");
const dropdownMenu = document.getElementById("dropdownMenu");

// Inicial: estado correto
document.addEventListener('DOMContentLoaded', () => {
    // Esconder o menu hamburger e os itens de navegação no desktop é feito via CSS @media query.
    // O JS só controla o estado ATIVO do menu hamburger.
    
    // Esconder cancelIcon sempre inicialmente
    cancelIcon.style.display = "none";
    // Garantir que navItems não está ativo
    navItems.classList.remove("active");

    // ARIA attributes for accessibility
    navItems.setAttribute("aria-hidden", "true"); // Hidden by default (mobile)
    menuIcon.setAttribute("aria-expanded", "false"); // Not expanded by default
    profileBtn.setAttribute("aria-expanded", "false"); // Not expanded by default
    dropdownMenu.setAttribute("aria-hidden", "true"); // Hidden by default
});


// Abre menu mobile
menuIcon.addEventListener("click", () => {
    navItems.classList.add("active");
    // Visual
    menuIcon.style.display = "none";
    cancelIcon.style.display = "flex";
    // ARIA
    navItems.setAttribute("aria-hidden", "false");
    menuIcon.setAttribute("aria-expanded", "true");
});

// Fecha menu mobile
cancelIcon.addEventListener("click", () => {
    navItems.classList.remove("active");
    // Visual
    cancelIcon.style.display = "none";
    menuIcon.style.display = "flex";
    // ARIA
    navItems.setAttribute("aria-hidden", "true");
    menuIcon.setAttribute("aria-expanded", "false");
});

// Fecha menu ao clicar em link (mobile)
navItems.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
        // Apenas fechar se o menu estiver em modo mobile (i.e., navItems tem a classe 'active'
        // ou o menu hamburger está visível - você pode verificar a largura da tela aqui se quiser ser mais preciso)
        if (window.innerWidth <= 768) { // Use a mesma breakpoint do CSS
            navItems.classList.remove("active");
            cancelIcon.style.display = "none";
            menuIcon.style.display = "flex";
            // ARIA
            navItems.setAttribute("aria-hidden", "true");
            menuIcon.setAttribute("aria-expanded", "false");
        }
    });
});

// Dropdown do perfil (ativado APENAS no mobile via CSS, mas a lógica JS é a mesma)
profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    // Verifica se o dropdown está visível (ex: se estamos em mobile)
    // Se o dropdown está com display: none via CSS media query, essa lógica não será aplicada visualmente.
    const isShown = dropdownMenu.classList.toggle("show");
    profileBtn.setAttribute("aria-expanded", isShown);
    dropdownMenu.setAttribute("aria-hidden", !isShown);
});

// Fecha dropdown ao clicar fora
document.addEventListener("click", (e) => {
    // Garante que só esconde se o dropdown estiver "ativo" e o clique não foi dentro dele
    if (dropdownMenu.classList.contains("show") && !profileBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.remove("show");
        profileBtn.setAttribute("aria-expanded", "false");
        dropdownMenu.setAttribute("aria-hidden", "true");
    }
});


function confirmarLogout() {
    if (confirm("Deseja realmente sair?")) {
        window.location.href = "../../backend/php/logout.php";
    }
}

// ================= GRÁFICO =================
const canvas = document.getElementById('graficoHoras');
const ctx = canvas.getContext('2d');

// Sua função ajustarCanvas() é boa, mas o Chart.js já tem um bom mecanismo de responsividade
// com responsive: true e maintainAspectRatio: false + um contêiner com aspect-ratio no CSS.
// Podemos simplificar um pouco ou deixar o Chart.js cuidar mais.
// Vou manter sua lógica, mas saiba que o CSS + Chart.js já faz grande parte do trabalho.
function ajustarCanvas() {
    // Isso é mais para ajuste de DPI, o Chart.js lida com redimensionamento de container
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * (window.devicePixelRatio || 1);
    canvas.height = height * (window.devicePixelRatio || 1);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale((window.devicePixelRatio || 1), (window.devicePixelRatio || 1));
}

// Chame ajustarCanvas apenas para DPI inicialmente.
// O Chart.js lida com o responsive.
ajustarCanvas();


const coresGrafico = ['#FF6384', '#36A2EB', '#FFCE56', '#DDDDDD']; 
// Mantenha o '#DDDDDD' como a última cor para 'Faltante', se houver.

const grafico = new Chart(ctx, {
    type: 'pie',
    data: {
        labels: <?= json_encode($labelsGrafico); ?>,
        datasets: [{
            label: 'Horas por categoria',
            data: <?= json_encode($dadosGrafico); ?>,
            backgroundColor: coresGrafico.slice(0, <?= count($dadosGrafico); ?>),
            borderColor: '#ffffff',
            borderWidth: 1,
            hoverOffset: 15
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false, // Isso é chave para o gráfico se adaptar e não ter proporção fixa
        plugins: {
            legend: { position: 'bottom', labels:{font:{size:14}} },
            tooltip: {
                callbacks: {
                    label: ctx => ctx.label + ": " + ctx.raw + "h"
                }
            }
        },
        // Opcional: Se quiser que o gráfico re-renderize completamente em resize (menos comum para pie)
        // resizeDelay: 100 
    }
});

// A remoção da aba (dropdown) é puramente visual através do CSS @media query.
// O JS continua com a lógica para o mobile, mas no desktop, o elemento 'dropdownMenu' terá
// 'display: none !important', então ele não será visível nem interagível.
</script>

</body>
</html>