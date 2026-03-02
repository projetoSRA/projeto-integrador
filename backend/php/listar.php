<?php
$conn = new mysqli("localhost", "root", "", "tcc");
$sql = "SELECT * FROM certificados WHERE idAluno = 2";
$result = $conn->query($sql);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Meus Certificados</title>
  <style>
    body{background:#0f1115; color:#e7ecf3; font-family:sans-serif;}
    header{padding:20px; text-align:center; font-weight:700; background:#151922;}
    .grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:16px; padding:18px;}
    .card{background:#1a2030; border:1px solid #22293a; border-radius:14px; overflow:hidden; display:flex; flex-direction:column;}
    .thumb{aspect-ratio:16/10; display:grid; place-items:center; background:#111726;}
    .thumb img{width:100%; height:100%; object-fit:cover}
    .pdf{font-size:28px; font-weight:800; color:#9eb2ff}
    .meta{padding:12px; font-size:14px; display:flex; flex-direction:column; gap:4px}
    .row{display:flex; gap:8px; padding:0 12px 12px; margin-top:auto}
    .btn{padding:6px 10px; font-size:12px; border-radius:8px; border:none; cursor:pointer; background:#5b8cff; color:#0b1020; font-weight:700}
  </style>
</head>
<body>
  <header>Meus Certificados</header>
  <main>
    <div class="grid">
    <?php while($row = $result->fetch_assoc()): ?>
      <div class="card">
        <div class="thumb">
          <?php if(preg_match('/\.(jpg|jpeg|png|gif)$/i', $row['URL'])): ?>
            <img src="<?= $row['URL'] ?>">
          <?php else: ?>
            <div class="pdf">📄</div>
          <?php endif; ?>
        </div>
        <div class="meta">
          <strong><?= htmlspecialchars($row['titulo']) ?></strong>
          <span>Data: <?= $row['dataEmissao'] ?></span>
          <span>Horas: <?= $row['quantidadeHoras'] ?></span>
        </div>
        <div class="row">
          <a href="<?= $row['URL'] ?>" target="_blank" class="btn">Abrir</a>
        </div>
      </div>
    <?php endwhile; ?>
    </div>
  </main>
</body>
</html>
