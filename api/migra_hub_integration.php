<?php
/**
 * Migración y Verificación: Integración KODAN-HUB
 * Instrucciones: Subir este archivo a la carpeta raíz o ejecutar desde /api/migra_hub_integration.php
 */

require_once __DIR__ . '/config.php';

echo "<h1>Verificación de Integración KODAN-HUB</h1>";

// 1. Verificar Constante
if (!defined('KODAN_HUB_TOKEN')) {
    echo "<p style='color:red;'>❌ ERROR: La constante KODAN_HUB_TOKEN no está definida en api/config.php</p>";
} else {
    echo "<p style='color:green;'>✅ OK: KODAN_HUB_TOKEN detectado.</p>";
}

// 2. Verificar Extensión CURL
if (!function_exists('curl_init')) {
    echo "<p style='color:red;'>❌ ERROR: La extensión CURL no está habilitada en este servidor.</p>";
} else {
    echo "<p style='color:green;'>✅ OK: Extensión CURL disponible.</p>";
}

// 3. Probar Conexión al Hub (Simulando petición mínima)
$url = "https://hub.pmaasglobal.com/";
$token = defined('KODAN_HUB_TOKEN') ? KODAN_HUB_TOKEN : '';
$payload = [
    "model" => "gemma-3-4b-it",
    "payload" => [
        "contents" => [["parts" => [["text" => "Ping"]]]]
    ]
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-KODAN-TOKEN: ' . $token
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    echo "<p style='color:green;'>✅ OK: Conexión exitosa, autorizada y funcional con el Hub (HTTP $httpCode).</p>";
} elseif ($httpCode === 401) {
    echo "<p style='color:red;'>❌ ERROR: Token no autorizado o inválido (HTTP $httpCode).</p>";
} elseif ($httpCode === 400) {
    echo "<p style='color:red;'>❌ ERROR: El Hub rechazó la petición (Bad Request). Verifique el formato del payload.</p>";
} else {
    echo "<p style='color:red;'>❌ ERROR: No se pudo contactar con el Hub correctamente (HTTP $httpCode). " . curl_error($ch) . "</p>";
}



echo "<hr>";
echo "<p>Si todos los puntos están en verde, la migración de código es segura.</p>";
echo "<a href='/'>Volver a la plataforma</a>";
