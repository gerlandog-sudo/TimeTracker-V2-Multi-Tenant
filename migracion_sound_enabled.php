<?php
/**
 * Migración para añadir el campo sound_enabled a la configuración del sistema.
 * Instrucciones: Subir este archivo a la carpeta raíz y ejecutarlo desde el navegador.
 */

require_once __DIR__ . '/api/config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // 1. Añadir columna sound_enabled si no existe
    $pdo->exec("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS sound_enabled TINYINT(1) DEFAULT 1 AFTER currency");

    // 2. Asegurarse de que las otras columnas de colores existan (por si acaso no se ejecutaron migras previas)
    $columns = [
        'accent_color' => "VARCHAR(7) DEFAULT '#3b82f6'",
        'sidebar_bg' => "VARCHAR(7) DEFAULT '#ffffff'",
        'sidebar_text' => "VARCHAR(7) DEFAULT '#1f2937'",
        'color_approved' => "VARCHAR(7) DEFAULT '#3b82f6'",
        'color_rejected' => "VARCHAR(7) DEFAULT '#ef4444'",
        'color_submitted' => "VARCHAR(7) DEFAULT '#eab308'",
        'color_draft' => "VARCHAR(7) DEFAULT '#9ca3af'"
    ];

    foreach ($columns as $col => $def) {
        $pdo->exec("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS `$col` $def");
    }

    echo "<h1>Migración completada con éxito</h1>";
    echo "<p>Se ha añadido la configuración de sonido a la base de datos.</p>";
    echo "<a href='/'>Volver a la plataforma</a>";

} catch (Exception $e) {
    echo "<h1>Error en la migración</h1>";
    echo "<p>" . $e->getMessage() . "</p>";
}
