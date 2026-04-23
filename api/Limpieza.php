<?php
require_once 'src/Database.php';
require_once 'config.php';

use App\Database;

$key = $_GET['key'] ?? '';
if ($key !== 'CAMBIAR_POR_LLAVE_SEGURA') {
    die('Unauthorized');
}

error_reporting(E_ALL);
ini_set('display_errors', '1');

header('Content-Type: text/plain');

try {
    Database::query("SET FOREIGN_KEY_CHECKS = 0");

    echo "Limpiando tablas de datos...\n";
    
    $tables = [
        'password_resets',
        'notifications',
        'time_entry_logs',
        'time_entries',
        'kanban_tasks',
        'projects',
        'client_contacts',
        'clients'
    ];

    foreach ($tables as $table) {
        try {
            Database::query("TRUNCATE TABLE $table");
            echo "- Tabla $table vaciada.\n";
        } catch (Exception $te) {
            echo "- Tabla $table no existe o no pudo ser vaciada (Omitiendo).\n";
        }
    }

    echo "Limpiando usuarios (excepto administradores)...\n";
    try {
        Database::query("DELETE FROM users WHERE role != 'admin' AND email != 'admin@pmaas.com'");
    } catch (Exception $ue) {
        echo "- Error limpiando usuarios: " . $ue->getMessage() . "\n";
    }
    
    echo "Reseteando contadores de autoincremento...\n";
    Database::query("ALTER TABLE users AUTO_INCREMENT = 1");

    Database::query("SET FOREIGN_KEY_CHECKS = 1");
    
    echo "\nLimpieza completada con éxito. Solo queda el usuario administrador.";
} catch (Exception $e) {
    echo "\nError durante la limpieza: " . $e->getMessage();
}
