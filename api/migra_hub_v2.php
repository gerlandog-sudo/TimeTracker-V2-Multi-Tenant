<?php
/**
 * Migración KODAN-HUB v2.0
 * Este script añade las columnas necesarias para la persistencia del token de IA
 * y el Handshake automático en la tabla system_config.
 */

require_once __DIR__ . '/src/Core/Database.php';
require_once __DIR__ . '/config.php';

use App\Core\Database;

header('Content-Type: text/plain');

try {
    echo "Iniciando migración KODAN-HUB v2.0...\n";

    // 1. Añadir columnas a system_config
    echo "Verificando columnas en system_config...\n";
    
    $columns = Database::fetchAll("SHOW COLUMNS FROM system_config");
    $existingCols = array_column($columns, 'Field');

    if (!in_array('kodan_token', $existingCols)) {
        echo "Añadiendo columna kodan_token...\n";
        Database::query("ALTER TABLE system_config ADD COLUMN kodan_token TEXT NULL AFTER company_name");
    }

    if (!in_array('kodan_app_id', $existingCols)) {
        echo "Añadiendo columna kodan_app_id...\n";
        Database::query("ALTER TABLE system_config ADD COLUMN kodan_app_id VARCHAR(100) NULL AFTER kodan_token");
    }

    // 2. Inicializar APP_ID si no existe
    $config = Database::fetchOne("SELECT id, kodan_app_id, kodan_token FROM system_config WHERE id = 1");
    if (!$config) {
        // Si no hay fila 1, crearla (aunque update.php ya debería haberlo hecho)
        Database::query("INSERT INTO system_config (id) VALUES (1)");
        $config = ['kodan_app_id' => null, 'kodan_token' => null];
    }

    if (empty($config['kodan_app_id'])) {
        $newAppId = 'TT-' . bin2hex(random_bytes(4)) . '-' . date('Ymd');
        echo "Generando nuevo APP_ID: $newAppId\n";
        Database::query("UPDATE system_config SET kodan_app_id = ? WHERE id = 1", [$newAppId]);
    } else {
        echo "APP_ID existente: " . $config['kodan_app_id'] . "\n";
    }

    // 3. Migrar token actual si existe en config.php (opcional)
    if (defined('KODAN_HUB_TOKEN') && empty($config['kodan_token'])) {
        echo "Migrando token desde config.php a base de datos...\n";
        Database::query("UPDATE system_config SET kodan_token = ? WHERE id = 1", [KODAN_HUB_TOKEN]);
    }

    echo "\nMigración completada con éxito.\n";
    echo "IMPORTANTE: Ahora puede comentar la constante KODAN_HUB_TOKEN en api/config.php\n";

} catch (Exception $e) {
    echo "\nERROR DURANTE LA MIGRACIÓN: " . $e->getMessage() . "\n";
}
