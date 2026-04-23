<?php
/**
 * MIGRACIÓN DE NIVELACIÓN V2 - ARQUITECTURA MULTI-TENANT
 * Objetivo: Convertir tablas a InnoDB y añadir índices de performance.
 */

require_once __DIR__ . '/src/Core/Database.php';
require_once __DIR__ . '/src/Core/Response.php';

use App\Core\Database;
use App\Core\Response;

try {
    $db = Database::connect();
    echo "Iniciando nivelación de arquitectura de Base de Datos...<br>";

    // 1. CONVERSIÓN DE MOTORES A INNODB (Para soporte de transacciones)
    $tablesToInnoDB = [
        'users', 'system_config', 'clients', 'projects', 'time_entries', 
        'kanban_tasks', 'notifications', 'password_resets', 'tasks_master', 
        'positions', 'position_costs', 'time_entry_logs'
    ];

    foreach ($tablesToInnoDB as $table) {
        echo "- Convirtiendo '$table' a InnoDB y UTF8mb4... ";
        Database::query("ALTER TABLE `$table` ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        echo "OK<br>";
    }

    // 2. CREACIÓN DE ÍNDICES DE PERFORMANCE (Para velocidad Multi-Tenant)
    $indices = [
        ['users', 'tenant_id', 'idx_users_tenant'],
        ['system_config', 'tenant_id', 'idx_config_tenant'],
        ['clients', 'tenant_id', 'idx_clients_tenant'],
        ['projects', 'tenant_id', 'idx_projects_tenant'],
        ['time_entries', 'tenant_id', 'idx_time_tenant'],
        ['permissions', 'tenant_id', 'idx_perm_tenant'],
        ['tasks_master', 'tenant_id', 'idx_tasks_tenant']
    ];

    foreach ($indices as $idx) {
        list($table, $column, $indexName) = $idx;
        echo "- Verificando índice '$indexName' en '$table'... ";
        
        // Verificamos si el índice ya existe para no fallar
        $exists = Database::fetchOne("
            SELECT COUNT(1) as c 
            FROM information_schema.statistics 
            WHERE table_schema = DATABASE() 
            AND table_name = ? 
            AND index_name = ?
        ", [$table, $indexName])['c'];

        if (!$exists) {
            Database::query("ALTER TABLE `$table` ADD INDEX `$indexName` (`$column`)");
            echo "CREADO<br>";
        } else {
            echo "YA EXISTE<br>";
        }
    }

    echo "<br><b>¡NIVELACIÓN COMPLETADA CON ÉXITO!</b><br>";
    echo "Su base de datos ahora es 100% transaccional y está optimizada para Multi-Tenancy.";

} catch (\Throwable $e) {
    echo "<br><b style='color:red;'>ERROR EN MIGRACIÓN:</b> " . $e->getMessage();
}
