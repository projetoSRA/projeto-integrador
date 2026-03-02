document.addEventListener("DOMContentLoaded", () => {
  const inputUsuario = document.querySelector("#inputUsuario");
  const inputSenha = document.querySelector("#inputSenha");
  const selectTipo = document.getElementById("format");
  const botao = document.querySelector(".botaoEntrar");

  // Inicialização dos campos
  inputUsuario.value = "";
  inputSenha.value = "";
  inputUsuario.disabled = true;
  inputSenha.disabled = true;

  // Função para bloquear não números (RM e Coordenação)
  function bloquearNaoNumeros(e) {
    const tipo = selectTipo.value;
    if (tipo === "alunos" || tipo === "coordenacao") {
      if (!/\d/.test(e.key)) e.preventDefault();
    }
  }

  // Função da máscara de CNPJ
  function aplicarMascaraCNPJ(e) {
    let valor = e.target.value.replace(/\D/g, "");
    if (valor.length > 14) valor = valor.slice(0, 14);

    let formatado = valor;
    if (valor.length > 2) formatado = valor.slice(0, 2) + "." + valor.slice(2);
    if (valor.length > 5) formatado = formatado.slice(0, 6) + "." + formatado.slice(6);
    if (valor.length > 8) formatado = formatado.slice(0, 10) + "/" + formatado.slice(10);
    if (valor.length > 12) formatado = formatado.slice(0, 15) + "-" + formatado.slice(15);

    e.target.value = formatado;
  }

  // Atualiza o botão Entrar
  function atualizarBotao() {
    const tipo = selectTipo.value;
    const usuario = inputUsuario.value.trim();
    const senha = inputSenha.value.trim();
    const cnpjLimpo = usuario.replace(/\D/g, "");
    let usuarioValido = false;

    if (tipo === "alunos") usuarioValido = /^\d{5}$/.test(usuario);
    else if (tipo === "coordenacao") usuarioValido = /^\d{8}$/.test(usuario);
    else if (tipo === "empresa") usuarioValido = /^\d{14}$/.test(cnpjLimpo);

    botao.disabled = !(usuarioValido && senha.length >= 7);
  }

  // Função para trocar placeholder e configurar input
  function trocarLabel() {
    const tipo = selectTipo.value;

    inputUsuario.disabled = false;
    inputSenha.disabled = false;
    inputUsuario.value = "";
    inputSenha.value = "";

    // Remove eventos antigos
    inputUsuario.removeEventListener("input", aplicarMascaraCNPJ);
    inputUsuario.removeEventListener("keypress", bloquearNaoNumeros);

    // Configura conforme tipo
    if (tipo === "alunos") {
      inputUsuario.placeholder = "Digite seu RM";
      inputUsuario.maxLength = 5;
      inputUsuario.addEventListener("keypress", bloquearNaoNumeros);
    } else if (tipo === "coordenacao") {
      inputUsuario.placeholder = "Digite seu login";
      inputUsuario.maxLength = 8;
      inputUsuario.addEventListener("keypress", bloquearNaoNumeros);
    } else if (tipo === "empresa") {  // ⚡ correção aqui
      inputUsuario.placeholder = "Digite seu CNPJ";
      inputUsuario.maxLength = 18;
      inputUsuario.addEventListener("input", aplicarMascaraCNPJ);
    } else {
      inputUsuario.disabled = true;
      inputSenha.disabled = true;
      inputUsuario.placeholder = "RM / Login / CNPJ";
    }

    atualizarBotao();
  }

  selectTipo.addEventListener("change", trocarLabel);

  inputUsuario.addEventListener("input", atualizarBotao);
  inputSenha.addEventListener("input", atualizarBotao);

  // Validação e envio do formulário
  botao.addEventListener("click", (e) => {
    e.preventDefault();
    const tipo = selectTipo.value;
    const usuario = inputUsuario.value.trim();
    const senha = inputSenha.value.trim();
    const cnpjLimpo = usuario.replace(/\D/g, "");
    let valido = true;

    document.querySelectorAll(".rmErro,.loginErro,.cnpjErro,.senhaErro").forEach(el => el.style.display = "none");

    switch (tipo) {
      case "alunos":
        if (!/^\d{5}$/.test(usuario)) {
          document.querySelector(".rmErro").style.display = "block";
          valido = false;
        }
        break;
      case "coordenacao":
        if (!/^\d{8}$/.test(usuario)) {
          document.querySelector(".loginErro").style.display = "block";
          valido = false;
        }
        break;
      case "empresa":
        if (!/^\d{14}$/.test(cnpjLimpo)) {
          document.querySelector(".cnpjErro").style.display = "block";
          valido = false;
        }
        break;
      default:
        valido = false;
        break;
    }

    if (senha.length < 7) {
      document.querySelector(".senhaErro").style.display = "block";
      valido = false;
    }

    if (valido) {
      document.querySelector(".formLogin").submit();
    }
  });

  // Eventos de teclas
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!botao.disabled) botao.click();
    }
    if (e.key === "Escape") {
      inputUsuario.value = "";
      inputSenha.value = "";
      document.querySelectorAll(".rmErro,.loginErro,.cnpjErro,.senhaErro").forEach(el => el.style.display = "none");
      atualizarBotao();
    }
  });

  // Bloqueio do botão voltar
  history.pushState(null, null, location.href);
  window.addEventListener("popstate", () => history.pushState(null, null, location.href));
});
