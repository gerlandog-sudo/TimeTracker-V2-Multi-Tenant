<?php
/**
 * Migración para configurar el entorno de Super Admin.
 * 1. Asegura que existe el registro con tenant_id = 0 en system_config.
 * 2. Asegura que existe la tabla tenants si no estuviera.
 */

require_once __DIR__ . '/api/config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 1. Crear tabla tenants si no existe
    $pdo->exec("CREATE TABLE IF NOT EXISTS `tenants` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `name` varchar(255) NOT NULL,
        `domain` varchar(255) DEFAULT NULL,
        `status` enum('active','paused','deleted') DEFAULT 'active',
        `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 2. Asegurar que system_config tiene la columna tenant_id
    $pdo->exec("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS tenant_id INT(11) DEFAULT 1");

    // 3. Insertar configuración para Super Admin (tenant_id = 0)
    // Usamos colores distintivos para el Super Admin (ej. Violeta/Negro)
    $check = $pdo->query("SELECT id FROM system_config WHERE tenant_id = 0")->fetch();
    if (!$check) {
        $pdo->exec("INSERT INTO system_config (
            company_name, primary_color, secondary_color, accent_color, 
            sidebar_bg, sidebar_text, tenant_id, sound_enabled
        ) VALUES (
            'PLATFORM ADMIN', '#6366f1', '#111827', '#6366f1', 
            '#0f172a', '#f8fafc', 0, 1
        )");
    }

    echo "<h1>Configuración de Super Admin completada</h1>";
    echo "<p>Se ha creado el registro de configuración para el Tenant 0.</p>";
    echo "<a href='/'>Ir a la plataforma</a>";

} catch (Exception $e) {
    echo "<h1>Error</h1>";
    echo "<p>" . $e->getMessage() . "</p>";
}
