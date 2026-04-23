<?php
/**
 * MIGRACIÓN: Actualización de Clave Primaria en Permissions
 * Objetivo: Permitir que cada tenant tenga sus propios permisos para los mismos roles.
 */
require_once __DIR__ . '/src/Core/Database.php';
use App\Core\Database;

try {
    $db = Database::connect();
    
    echo "Iniciando corrección de índices en 'permissions'...\n";

    // 1. Ya sabemos que el índice 'role_feature' fue eliminado en el paso anterior.
    // Si no se eliminó por alguna razón, lo intentamos de nuevo silenciosamente.
    try {
        $db->exec("DROP INDEX role_feature ON permissions");
        echo "- Índice antiguo 'role_feature' eliminado.\n";
    } catch (Exception $e) {
        echo "- Nota: El índice antiguo ya no existe.\n";
    }

    // 2. Crear el nuevo Índice Único que incluye tenant_id
    // Usamos ADD UNIQUE INDEX en lugar de PRIMARY KEY para no interferir con la columna ID autoincremental
    try {
        $db->exec("ALTER TABLE permissions ADD UNIQUE INDEX role_feature_tenant (role_id, feature, tenant_id)");
        echo "- Nuevo índice multi-tenant (role_id, feature, tenant_id) creado con éxito.\n";
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate key name') !== false) {
            echo "- El índice nuevo ya existía.\n";
        } else {
            throw $e;
        }
    }

    echo "\n¡Éxito! La estructura de permisos ha sido actualizada correctamente.\n";
    echo "Ya puede intentar dar de alta la empresa en la plataforma.\n";

} catch (Exception $e) {
    die("\nERROR FATAL en migración: " . $e->getMessage());
}
