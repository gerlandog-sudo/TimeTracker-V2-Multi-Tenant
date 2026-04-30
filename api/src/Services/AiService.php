<?php

namespace App\Services;

use App\Core\Database;
use App\Services\QueryEngine;

class AiService {

    private const MODELS = [
        "gemma-3-4b-it",
        "gemini-2.0-flash",
        "gemini-1.5-flash"
    ];

    private const BASE_URL = "https://hub.pmaasglobal.com/api/";
    private const APP_NAME = "TimeTracker V2";

    public static function assist(string $prompt, bool $hasFinancialAccess): array {
        if (!function_exists('curl_init')) {
            throw new \Exception("La extensión CURL no está habilitada en este servidor PHP.");
        }

        $hubConfig = self::getOrRegisterToken();
        $token = $hubConfig['token'];

        $catalog = QueryEngine::getCatalog($hasFinancialAccess);
        $catalogJson = json_encode($catalog);

        $systemPrompt = "Eres un asistente experto en análisis de datos para una plataforma de TimeTracking. 
        Tu objetivo es convertir una solicitud en lenguaje natural del usuario en una definición de reporte JSON que el motor interno pueda ejecutar.
        
        CATÁLOGO DE CAMPOS DISPONIBLES (Solo puedes usar las keys de este JSON):
        $catalogJson

        REGLAS:
        1. Responde ÚNICAMENTE con un objeto JSON válido. Sin texto explicativo, sin bloques de código markdown.
        2. La estructura del JSON debe ser:
           {
             \"dimensions\": [\"key1\", \"key2\"],
             \"metrics\": [\"key3\"],
             \"filters\": [
               { \"field\": \"key\", \"op\": \"eq|neq|gt|lt|gte|lte|between|like|in\", \"value\": \"valor\" }
             ],
             \"chart_type\": \"table|bar|line|pie|area\"
           }
        3. Para filtros de fecha (entry.date), hoy es " . date('Y-m-d') . ".
        4. Si el usuario pide algo que no está en el catálogo, ignóralo o mapea a lo más cercano.
        5. Los campos financieros (cost.sum, project.budget_money, margin.calc) solo están disponibles si aparecen en el catálogo proporcionado.";

        $geminiPayload = [
            "contents" => [
                [
                    "role" => "user",
                    "parts" => [
                        ["text" => $systemPrompt . "\n\nUSUARIO PIDE: " . $prompt]
                    ]
                ]
            ],
            "generationConfig" => [
                "temperature" => 0.1,
                "topK" => 1,
                "topP" => 1,
                "maxOutputTokens" => 1000,
                "responseMimeType" => "application/json"
            ]
        ];

        $lastError = "";
        foreach (self::MODELS as $model) {
            try {
                return self::callHub($model, $geminiPayload, $token);
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
                
                // Si es un error de saturación (503 o High Demand), logueamos y saltamos al siguiente modelo inmediatamente
                if (strpos($lastError, 'high demand') !== false || strpos($lastError, '503') !== false) {
                    self::log("Saturación detectada en modelo $model. Saltando al siguiente...");
                    continue;
                }

                // Si el token fue invalidado (401), intentar re-vincular y reintentar UNA vez
                if (strpos($lastError, 'reiniciada') !== false) {
                    self::log("Reintentando tras limpieza de token 401...");
                    $hubConfig = self::getOrRegisterToken();
                    return self::callHub($model, $geminiPayload, $hubConfig['token']);
                }

                if (strpos($lastError, 'mantenimiento') !== false || strpos($lastError, 'vinculado') !== false) throw $e; 
                continue; // Try next model
            }
        }

        throw new \Exception("KODAN-HUB falló en todos los modelos. Último error: " . $lastError);
    }

    public static function generateText(string $prompt): string {
        if (!function_exists('curl_init')) {
            throw new \Exception("La extensión CURL no está habilitada en este servidor PHP.");
        }

        $hubConfig = self::getOrRegisterToken();
        $token = $hubConfig['token'];

        $geminiPayload = [
            "contents" => [
                [
                    "role" => "user",
                    "parts" => [
                        ["text" => $prompt]
                    ]
                ]
            ],
            "generationConfig" => [
                "temperature" => 0.4,
                "topK" => 1,
                "topP" => 1,
                "maxOutputTokens" => 1000
            ]
        ];

        $lastError = "";
        foreach (self::MODELS as $model) {
            try {
                return self::callHub($model, $geminiPayload, $token, false);
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
                
                // Si es un error de saturación (503 o High Demand), logueamos y saltamos al siguiente modelo inmediatamente
                if (strpos($lastError, 'high demand') !== false || strpos($lastError, '503') !== false) {
                    self::log("Saturación detectada en modelo $model (generateText). Saltando al siguiente...");
                    continue;
                }

                // Si el token fue invalidado (401), intentar re-vincular y reintentar UNA vez
                if (strpos($lastError, 'reiniciada') !== false) {
                    self::log("Reintentando tras limpieza de token 401 en generateText...");
                    $hubConfig = self::getOrRegisterToken();
                    return self::callHub($model, $geminiPayload, $hubConfig['token'], false);
                }

                if (strpos($lastError, 'mantenimiento') !== false || strpos($lastError, 'vinculado') !== false) throw $e;
                continue; // Try next model
            }
        }

        throw new \Exception("KODAN-HUB falló en todos los modelos para generateText. Último error: " . $lastError);
    }

    private static function getOrRegisterToken(): array {
        $tenantId = (int)(\App\Core\Context::getTenantId() ?? 1);
        
        // Intentar obtener config de forma segura
        try {
            $config = Database::fetchOne("SELECT kodan_token, kodan_app_id, company_name FROM system_config WHERE tenant_id = ? OR id = 1 ORDER BY (tenant_id = ?) DESC LIMIT 1", [$tenantId, $tenantId]);
        } catch (\Throwable $e) {
            $config = null;
        }
        
        if (!$config) {
            $config = ['kodan_token' => null, 'kodan_app_id' => null, 'company_name' => null];
        }

        if (empty($config['kodan_app_id'])) {
            $newAppId = 'TT-' . bin2hex(random_bytes(4)) . '-' . date('Ymd') . '-T' . $tenantId;
            try {
                Database::query("UPDATE system_config SET kodan_app_id = ? WHERE tenant_id = ? OR id = 1", [$newAppId, $tenantId]);
            } catch (\Throwable $e) { }
            $config['kodan_app_id'] = $newAppId;
        }

        if (empty($config['kodan_token'])) {
            $companyName = $config['company_name'] ?? (self::APP_NAME . " (T$tenantId)");
            $newToken = self::handshake($config['kodan_app_id'], $companyName, (int)$tenantId);
            $config['kodan_token'] = $newToken;
        }

        return [
            'token' => (string)($config['kodan_token'] ?? ''),
            'app_id' => (string)($config['kodan_app_id'] ?? '')
        ];
    }

    private static function handshake(string $appId, string $companyName, int $tenantId = 1): string {
        self::log("Iniciando Handshake para APP_ID: $appId ($companyName)");
        
        $ch = curl_init(self::BASE_URL);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'X-KODAN-APP-ID: ' . $appId,
            'X-KODAN-APP-NAME: ' . $companyName
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $result = json_decode($response, true);
        $newToken = $result['new_kodan_token'] ?? null;

        if ($newToken) {
            Database::query("UPDATE system_config SET kodan_token = ? WHERE tenant_id = ? OR id = 1", [$newToken, $tenantId]);
            self::log("Handshake exitoso. Nuevo token guardado para Tenant $tenantId.");
            return $newToken;
        }

        throw new \Exception("No se pudo obtener un token del KODAN-HUB (HTTP $httpCode). " . $response);
    }

    private static function callHub(string $model, array $geminiPayload, string $token, bool $returnJson = true) {
        $tenantId = \App\Core\Context::getTenantId() ?? 1;
        $url = self::BASE_URL;
        
        $hubPayload = [
            "model" => $model,
            "payload" => $geminiPayload
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($hubPayload));
        curl_setopt($ch, CURLOPT_HEADER, true); // Necesitamos los headers para X-KODAN-NEW-TOKEN
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-KODAN-TOKEN: ' . trim($token)
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $fullResponse = curl_exec($ch);
        $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $headerStr = substr($fullResponse, 0, $headerSize);
        $response = substr($fullResponse, $headerSize);
        
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            throw new \Exception("Error de conexión con KODAN-HUB ($model): " . $curlError);
        }

        $result = json_decode($response, true);

        // --- GESTIÓN DE ROTACIÓN DE TOKEN ---
        $newToken = null;
        if (isset($result['new_kodan_token'])) {
            $newToken = $result['new_kodan_token'];
        } elseif (preg_match('/X-KODAN-NEW-TOKEN:\s*(.*)$/mi', $headerStr, $matches)) {
            $newToken = trim($matches[1]);
        }

        if ($newToken) {
            self::log("Detectada rotación de token. Actualizando DB para Tenant $tenantId...");
            Database::query("UPDATE system_config SET kodan_token = ? WHERE tenant_id = ? OR id = 1", [$newToken, $tenantId]);
        }
        // ------------------------------------

        // --- MANEJO DE ESTADOS CRÍTICOS (401) ---
        if ($httpCode === 401) {
            // Token invalidado o revocado en el HUB, limpiar local para forzar nuevo handshake
            Database::query("UPDATE system_config SET kodan_token = NULL WHERE tenant_id = ? OR id = 1", [$tenantId]);
            self::log("Token 401 detectado. Limpiando DB para forzar re-vínculo.");
            throw new \Exception("Sesión de IA reiniciada por seguridad. Por favor, intente de nuevo para vincular el dispositivo.");
        }

        // --- MANEJO DE ESTADOS PROTOCOLO v2.0 ---
        $status = $result['status'] ?? ($httpCode === 200 ? 'success' : 'error');

        switch ($status) {
            case 'success':
                // Continuar procesamiento normal
                break;
            case 'maintenance':
                throw new \Exception($result['message'] ?? 'Consultas a la IA en mantenimiento.');
            case 'registered':
                throw new \Exception("Dispositivo vinculado. Esperando activación.");
            case 'pending_config':
                throw new \Exception("Servicio en mantenimiento. Contacte al Admin.");
            case 'error':
                $errMsg = $result['message'] ?? $result['error'] ?? 'Error desconocido en el HUB';
                throw new \Exception("Error en consulta: " . $errMsg);
        }

        if ($httpCode !== 200) {
            throw new \Exception("KODAN-HUB API Error ($httpCode): " . ($result['message'] ?? $response));
        }

        // El Hub retorna {"status":"success", "data":{...}, "http_code":200}
        $geminiData = $result['data'] ?? $result;
        
        if (!isset($geminiData['candidates'][0]['content']['parts'][0]['text'])) {
            throw new \Exception("Estructura de respuesta inesperada del Hub para $model. JSON: " . substr($response, 0, 200));
        }

        $content = $geminiData['candidates'][0]['content']['parts'][0]['text'];
        
        if ($returnJson) {
            $cleanContent = preg_replace('/^```json\s*|```$/m', '', trim($content));
            $definition = json_decode($cleanContent, true);
            if (!$definition) {
                throw new \Exception("Error al parsear el JSON generado por el Hub ($model). Contenido: " . substr($cleanContent, 0, 200));
            }
            return $definition;
        }

        return $content;
    }

    private static function log(string $message): void {
        $logDir = __DIR__ . '/../../logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0777, true);
        }
        $file = $logDir . '/hub_' . date('Y-m-d') . '.log';
        $timestamp = date('Y-m-d H:i:s');
        @file_put_contents($file, "[$timestamp] $message\n", FILE_APPEND);
    }
}
