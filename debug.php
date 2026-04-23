<?php
/**
 * Script de diagnóstico para el servidor.
 */
header('Content-Type: text/html; charset=utf-8');

echo "<h1>Diagnóstico de Servidor - TimeTracker</h1>";

echo "<h3>1. Información del Servidor</h3>";
echo "<ul>";
echo "<li><strong>PHP Version:</strong> " . phpversion() . "</li>";
echo "<li><strong>Document Root:</strong> " . $_SERVER['DOCUMENT_ROOT'] . "</li>";
echo "<li><strong>Script Filename:</strong> " . $_SERVER['SCRIPT_FILENAME'] . "</li>";
echo "<li><strong>Request URI:</strong> " . $_SERVER['REQUEST_URI'] . "</li>";
echo "</ul>";

echo "<h3>2. Verificación de Archivos Críticos</h3>";
$files = [
    '.htaccess' => '.htaccess',
    'index.html' => 'index.html',
    'api/index.php' => 'api/index.php',
    'api/config.php' => 'api/config.php'
];

echo "<ul>";
foreach ($files as $name => $path) {
    $exists = file_exists(__DIR__ . '/' . $path);
    $status = $exists ? "<span style='color: green;'>EXISTE</span>" : "<span style='color: red;'>NO ENCONTRADO</span>";
    echo "<li>$name: $status</li>";
}
echo "</ul>";

echo "<h3>3. Contenido de la carpeta actual (" . __DIR__ . ")</h3>";
echo "<ul>";
$dirContent = scandir(__DIR__);
foreach ($dirContent as $item) {
    if ($item != "." && $item != "..") {
        $type = is_dir(__DIR__ . '/' . $item) ? "[DIR]" : "[FILE]";
        echo "<li>$type $item</li>";
        if ($item == "api" || $item == "API") {
            echo "<ul>";
            $apiContent = scandir(__DIR__ . '/' . $item);
            foreach ($apiContent as $apiItem) {
                if ($apiItem != "." && $apiItem != "..") {
                    echo "<li>$apiItem</li>";
                }
            }
            echo "</ul>";
        }
    }
}
echo "</ul>";

echo "<h3>4. Prueba de Conexión a Base de Datos</h3>";
try {
    require_once __DIR__ . '/api/config.php';
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    echo "<p style='color: green;'>Conexión a Base de Datos: EXITOSA</p>";
} catch (Exception $e) {
    echo "<p style='color: red;'>Conexión a Base de Datos: FALLIDA (" . $e->getMessage() . ")</p>";
}

echo "<hr>";
echo "<p>Si ves errores 'NO ENCONTRADO', asegúrate de que la estructura de carpetas en el FTP sea correcta.</p>";
