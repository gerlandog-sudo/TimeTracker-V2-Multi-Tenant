<?php

namespace App\Services;

use App\Services\QueryEngine;

class AiService {

    private const MODELS = [
        "gemma-3-4b-it",
        "gemini-flash-latest",
        "gemini-2.5-flash",
        "gemini-2.0-flash"
    ];

    private const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";

    public static function assist(string $prompt, bool $hasFinancialAccess): array {
        if (!function_exists('curl_init')) {
            throw new \Exception("La extensión CURL no está habilitada en este servidor PHP.");
        }

        $apiKey = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '';
        if (!$apiKey || $apiKey === 'TU_API_KEY_AQUI') {
            throw new \Exception("Gemini API Key no configurada en api/config.php.");
        }

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

        $payload = [
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
                return self::callGemini($model, $payload, $apiKey);
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
                self::log("Error with model $model: " . $lastError);
                continue; // Try next model
            }
        }

        throw new \Exception("Gemini falló en todos los modelos disponibles. Último error: " . $lastError);
    }

    public static function generateText(string $prompt): string {
        if (!function_exists('curl_init')) {
            throw new \Exception("La extensión CURL no está habilitada en este servidor PHP.");
        }

        $apiKey = defined('GEMINI_API_KEY') ? GEMINI_API_KEY : '';
        if (!$apiKey || $apiKey === 'TU_API_KEY_AQUI') {
            throw new \Exception("Gemini API Key no configurada en api/config.php.");
        }

        $payload = [
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
                return self::callGemini($model, $payload, $apiKey, false);
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
                self::log("Error with model $model in generateText: " . $lastError);
                continue; // Try next model
            }
        }

        throw new \Exception("Gemini falló en todos los modelos para generateText. Último error: " . $lastError);
    }

    private static function callGemini(string $model, array $payload, string $apiKey, bool $returnJson = true) {
        $url = self::BASE_URL . $model . ":generateContent?key=" . trim($apiKey);
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        // LOGGING: Guardar respuesta antes de parsear
        $safeResponse = str_replace($apiKey, '***HIDDEN***', (string)$response);
        self::log("Model: $model | HTTP: $httpCode | Response: " . $safeResponse);

        if ($curlError) {
            throw new \Exception("Error de conexión CURL ($model): " . $curlError);
        }

        $result = json_decode($response, true);
        
        if ($httpCode !== 200) {
            $errMsg = (is_array($result) && isset($result['error']['message'])) ? $result['error']['message'] : $response;
            throw new \Exception("Gemini API Error ($httpCode) en modelo $model: " . $errMsg);
        }

        if (!isset($result['candidates'][0]['content']['parts'][0]['text'])) {
            throw new \Exception("Estructura de respuesta inesperada en $model. JSON: " . substr($response, 0, 200));
        }

        $content = $result['candidates'][0]['content']['parts'][0]['text'];
        
        if ($returnJson) {
            // Limpiar posibles bloques de código markdown
            $cleanContent = preg_replace('/^```json\s*|```$/m', '', trim($content));
            $definition = json_decode($cleanContent, true);
            if (!$definition) {
                throw new \Exception("Error al parsear el JSON generado por $model. Contenido: " . substr($cleanContent, 0, 200));
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
        $file = $logDir . '/gemini_' . date('Y-m-d') . '.log';
        $timestamp = date('Y-m-d H:i:s');
        @file_put_contents($file, "[$timestamp] $message\n", FILE_APPEND);
    }
}
