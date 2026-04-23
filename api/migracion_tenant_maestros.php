<?php
/**
 * MIGRACIÓN: Agregar tenant_id a tablas maestras
 * Ejecutar UNA SOLA VEZ en el servidor.
 * Borrar este archivo después de ejecutarlo.
 */

require_once __DIR__ . '/config.php';

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $tablas = [
        'positions'      => 'idx_positions_tenant',
        'position_costs' => 'idx_poscosts_tenant',
        'tasks_master'   => 'idx_tasks_tenant',
        'roles'          => 'idx_roles_tenant',
        'audit_logs'     => 'idx_audit_tenant',
        'notifications'  => 'idx_notif_tenant',
    ];

    $migraciones = [];

    foreach ($tablas as $tabla => $indexName) {
        // Verificar si la tabla existe
        $existe = $pdo->query("SHOW TABLES LIKE '$tabla'")->fetchColumn();
        if (!$existe) {
            $migraciones[] = "$tabla: tabla no existe en la BD, omitida";
            continue;
        }

        // Verificar si ya tiene tenant_id
        $cols = $pdo->query("SHOW COLUMNS FROM `$tabla` LIKE 'tenant_id'")->fetchAll();
        if (empty($cols)) {
            $pdo->exec("ALTER TABLE `$tabla` ADD COLUMN `tenant_id` INT NULL DEFAULT NULL AFTER `id`");
            $pdo->exec("ALTER TABLE `$tabla` ADD INDEX `$indexName` (`tenant_id`)");
            $migraciones[] = "$tabla.tenant_id: AGREGADA";
        } else {
            $migraciones[] = "$tabla.tenant_id: ya existía";
        }
    }

    echo "<pre>\n";
    echo "=== MIGRACIÓN COMPLETADA ===\n\n";
    foreach ($migraciones as $m) {
        echo "  > $m\n";
    }
    echo "\nBORRA ESTE ARCHIVO DEL SERVIDOR.\n";
    echo "</pre>";

} catch (Throwable $e) {
    echo "<pre>ERROR: " . $e->getMessage() . "</pre>";
}
