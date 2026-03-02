<?php
$sessPath = dirname(__DIR__) . '/php/sessions';
ini_set('session.save_path', $sessPath);
ini_set('session.cookie_path', '/');
session_start();

echo "<pre>";
print_r($_SESSION);
echo "</pre>";