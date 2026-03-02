<?php

// Ativa suporte completo a UTF-8
mb_internal_encoding("UTF-8");
mb_http_output("UTF-8");
ini_set('default_charset', 'UTF-8');
// Checa se a sessão já está ativa para evitar o warning ini_set
if (session_status() === PHP_SESSION_NONE) {
    $sessPath = __DIR__ . '/sessions'; // Ajuste o caminho conforme a localização ideal (pode ser /../sessions se precisar subir um nível)
    
    // Cria o diretório se não existir
    if (!is_dir($sessPath)) {
        // Use 0700 para segurança. O PHP (servidor) deve ter permissão para escrever.
        mkdir($sessPath, 0700, true); 
    }
    
    // Configura o caminho de salvamento
    ini_set('session.save_path', $sessPath);
    
    // Configura o cookie para ser global no seu domínio (correto)
    ini_set('session.cookie_path', '/');
    
    // Inicia a sessão APÓS as configurações
    session_start();
}
// Não precisa de fechamento ?>