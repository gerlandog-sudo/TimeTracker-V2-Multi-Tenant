<?php
/**
 * MIGRACIÓN DE ESTABILIZACIÓN TOTAL - TIMETRACKER V2
 * Objetivo: Sincronizar Esquema Maestro con Controladores y habilitar tablas faltantes.
 * Ejecución: Copiar este archivo al servidor y ejecutar vía navegador o CLI.
 */

require_once __DIR__ . '/config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Iniciando migración de estabilización...\n";

    // 1. Asegurar tabla KANBAN_TASKS (Multi-tenant)
    $pdo->exec("CREATE TABLE IF NOT EXISTS `kanban_tasks` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `tenant_id` int(11) NOT NULL,
      `project_id` int(11) NOT NULL,
      `user_id` int(11) NOT NULL,
      `description` text NOT NULL,
      `priority` varchar(20) DEFAULT 'Baja',
      `task_type_id` int(11) DEFAULT NULL,
      `estimated_hours` decimal(5,2) DEFAULT '0.00',
      `status` varchar(20) DEFAULT 'ToDo',
      `started_at` datetime DEFAULT NULL,
      `completed_at` datetime DEFAULT NULL,
      `created_by` int(11) DEFAULT NULL,
      `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `idx_kanban_tenant` (`tenant_id`),
      KEY `idx_kanban_project` (`project_id`),
      KEY `idx_kanban_user` (`user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    echo "- Tabla kanban_tasks verificada/creada.\n";

    // 2. Asegurar tabla NOTIFICATIONS
    $pdo->exec("CREATE TABLE IF NOT EXISTS `notifications` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `user_id` int(11) NOT NULL,
      `message` text NOT NULL,
      `type` varchar(50) DEFAULT 'info',
      `is_read` tinyint(1) DEFAULT 0,
      `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `idx_notify_user` (`user_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    echo "- Tabla notifications verificada/creada.\n";

    // 3. Saneamiento de tabla USERS
    $columnsUsers = $pdo->query("SHOW COLUMNS FROM users")->fetchAll(PDO::FETCH_COLUMN);
    
    if (!in_array('role', $columnsUsers)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN role varchar(50) DEFAULT 'staff' AFTER role_id");
        echo "- Columna 'role' añadida a users.\n";
    }
    
    if (!in_array('seniority', $columnsUsers)) {
        $pdo->exec("ALTER TABLE users ADD COLUMN seniority varchar(50) DEFAULT NULL AFTER seniority_id");
        echo "- Columna 'seniority' añadida a users.\n";
    }

    // 4. Asegurar columnas de contacto en CLIENTS
    $columnsClients = $pdo->query("SHOW COLUMNS FROM clients")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('contact_name', $columnsClients)) {
        $pdo->exec("ALTER TABLE clients ADD COLUMN contact_name varchar(100) DEFAULT NULL AFTER tax_id");
        echo "- Columna 'contact_name' añadida a clients.\n";
    }
    if (!in_array('contact_email', $columnsClients)) {
        $pdo->exec("ALTER TABLE clients ADD COLUMN contact_email varchar(100) DEFAULT NULL AFTER contact_name");
        echo "- Columna 'contact_email' añadida a clients.\n";
    }

    // 5. Verificación de motor y charset para todas las tablas
    $tables = ['users', 'clients', 'projects', 'time_entries', 'kanban_tasks', 'tenants', 'system_config'];
    foreach ($tables as $table) {
        $pdo->exec("ALTER TABLE `$table` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    }
    echo "- Optimización de charset finalizada.\n";

    echo "\n>>> MIGRACIÓN EXITOSA. La base de datos está ahora sincronizada con el código v2.\n";
    
    // Eliminar archivo después de ejecutar (opcional, recomendado por seguridad)
    // unlink(__FILE__);

} catch (Exception $e) {
    die("ERROR EN MIGRACIÓN: " . $e->getMessage());
}
