<?php
/**
 * Verificación KODAN-HUB v2.0
 */

require_once __DIR__ . '/src/Core/Database.php';
require_once __DIR__ . '/config.php';

use App\Core\Database;

header('Content-Type: text/html; charset=UTF-8');

echo "<h1>Verificación KODAN-HUB v2.0</h1>";

try {
    // 1. Verificar Columnas
    $columns = Database::fetchAll("SHOW COLUMNS FROM system_config");
    $existingCols = array_column($columns, 'Field');
    
    echo "<h3>1. Estado de Base de Datos</h3>";
    echo "kodan_token: " . (in_array('kodan_token', $existingCols) ? "<span style='color:green;'>OK</span>" : "<span style='color:red;'>FALTA</span>") . "<br>";
    echo "kodan_app_id: " . (in_array('kodan_app_id', $existingCols) ? "<span style='color:green;'>OK</span>" : "<span style='color:red;'>FALTA</span>") . "<br>";

    // 2. Verificar Valores
    $config = Database::fetchOne("SELECT kodan_token, kodan_app_id FROM system_config WHERE id = 1");
    echo "<h3>2. Configuración Persistida</h3>";
    echo "APP_ID: " . ($config['kodan_app_id'] ?? "No definido") . "<br>";
    echo "Token: " . ($config['kodan_token'] ? "Configurado (oculto)" : "<span style='color:orange;'>Pendiente (se auto-registrará al primer uso)</span>") . "<br>";

    // 3. Probar Conectividad (Simulada)
    echo "<h3>3. Prueba de Comunicación</h3>";
    if (!empty($config['kodan_app_id'])) {
        $url = "https://hub.pmaasglobal.com/";
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'X-KODAN-APP-ID: ' . $config['kodan_app_id'],
            'X-KODAN-APP-NAME: TimeTracker Verify'
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200) {
            echo "<p style='color:green;'>✅ Conexión con el HUB establecida correctamente (HTTP $httpCode).</p>";
        } else {
            echo "<p style='color:red;'>❌ Error de conexión con el HUB (HTTP $httpCode). Respuesta: $response</p>";
        }
    } else {
        echo "<p style='color:red;'>❌ No se puede probar sin APP_ID.</p>";
    }

} catch (Exception $e) {
    echo "<p style='color:red;'>ERROR: " . $e->getMessage() . "</p>";
}

echo "<hr><a href='/'>Volver al sistema</a>";
