<?php
/**
 * MIGRACIÓN: Actualización de Clave Primaria en Permissions
 * Objetivo: Permitir que cada tenant tenga sus propios permisos para los mismos roles.
 */
require_once __DIR__ . '/src/Core/Database.php';
use App\Core\Database;

try {
    $db = Database::connect();
    
    echo "Iniciando migración de tabla 'permissions'...\n";

    // 1. Intentar eliminar la clave primaria actual (si existe)
    try {
        $db->exec("ALTER TABLE permissions DROP PRIMARY KEY");
        echo "- Clave primaria antigua eliminada.\n";
    } catch (Exception $e) {
        echo "- Nota: No se pudo eliminar la PK (posiblemente no existía o era distinta): " . $e->getMessage() . "\n";
    }

    // 2. Intentar eliminar el índice único 'role_feature' que está causando el error 1062
    try {
        $db->exec("DROP INDEX role_feature ON permissions");
        echo "- Índice 'role_feature' eliminado.\n";
    } catch (Exception $e) {
        echo "- Nota: El índice 'role_feature' no existía o ya fue eliminado.\n";
    }

    // 3. Crear la nueva Clave Primaria incluyendo tenant_id
    $db->exec("ALTER TABLE permissions ADD PRIMARY KEY (role_id, feature, tenant_id)");
    echo "- Nueva clave primaria (role_id, feature, tenant_id) creada con éxito.\n";

    echo "\nMigración finalizada correctamente. Ya puede intentar el alta de empresa de nuevo.\n";

} catch (Exception $e) {
    die("\nERROR FATAL en migración: " . $e->getMessage());
}
