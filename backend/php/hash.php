<?php
$senha = "xuxufrazon2007";
$hash = password_hash($senha, PASSWORD_DEFAULT);
echo "Hash gerado para a senha 'xuxufrazon2007':<br><code>$hash</code>";
?>