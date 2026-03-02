<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link rel="stylesheet" href="../tcc/frontend/css/style_index.css" />
  <title>Login</title>
</head>
<body>
  <div class="container">
    <div class="panels-container">
      <div class="panel left-panel">
        <img src="../tcc/frontend/img/log.svg" class="image" alt="" />
        <div class="content">
          <h3>Novo por aqui?</h3>
          <p>Faça seu login e fique por dentro de tudo!</p>
        </div>
      </div>
    </div>

    <div class="forms-container">
      <div class="signin-signup">
        <form class="sign-in-form formLogin" action="../tcc/backend/php/login.php" method="post">
          <h2 class="title">Login</h2>

          <!-- SELECT DE PERFIL -->
          <div class="input-field select-field">
            <i class="fas fa-user"></i>
            <select name="format" id="format" onchange="trocarLabel()">
              <option value="" disabled selected hidden>Selecione...</option>
              <option value="alunos">Aluno</option>
              <option value="coordenacao">Coordenação</option>
              <option value="empresas">Empresa</option>
            </select>
          </div>

          <!-- CAMPO USUÁRIO -->
          <div class="input-field">
            <i class="fas fa-user"></i>
            <input type="text" placeholder="RM" id="inputUsuario" class="usuario" name="rm" disabled maxlength="5" />
          </div>
          <p class="rmErro" style="color: red; display: none;">O RM deve conter exatamente 5 dígitos</p>
          <p class="loginErro" style="color: red; display: none;">O login deve conter 8 números</p>
          <p class="cnpjErro" style="color: red; display: none;">Digite somente os números do CNPJ</p>

          <!-- CAMPO SENHA -->
          <div class="input-field">
            <i class="fas fa-lock"></i>
            <input type="password" placeholder="Digite sua senha" id="inputSenha" class="senha" name="senha" maxlength="20" disabled />
          </div>
          <p class="senhaErro" style="color: red; display: none;">Sua senha deve conter no mínimo 7 caracteres</p>

          <button type="submit" class="btn botaoEntrar" disabled>Entrar</button>
        </form>
      </div>
    </div>
  </div>

  <script src="../tcc/frontend/js/index.js"></script>
</body>
</html>
