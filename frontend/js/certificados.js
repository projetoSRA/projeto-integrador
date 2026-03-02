   // Abrir modal quando escolher arquivo
    document.getElementById('fileInput').addEventListener('change', e => {
      if(e.target.files.length > 0){
        document.getElementById('formModal').classList.add('open');
      }
    });

    // Fechar formulário
    function closeForm(){
      document.getElementById('formModal').classList.remove('open');
      document.getElementById('cursoInput').value = "";
      document.getElementById('dataInput').value = "";
      document.getElementById('horasInput').value = "";
      document.getElementById('fileInput').value = "";
    }