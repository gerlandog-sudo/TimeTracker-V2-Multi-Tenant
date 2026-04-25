<?php

namespace App\Services;

use App\Services\QueryEngine;

class AiService {

    private const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

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

        $ch = curl_init(self::API_URL . "?key=" . trim($apiKey));
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

        if ($curlError) {
            throw new \Exception("Error de conexión CURL hacia Google: " . $curlError);
        }

        $result = json_decode($response, true);
        
        if ($httpCode !== 200) {
            $errMsg = (is_array($result) && isset($result['error']['message'])) ? $result['error']['message'] : $response;
            throw new \Exception("Gemini API Error ($httpCode): " . $errMsg);
        }

        if (!isset($result['candidates'][0]['content']['parts'][0]['text'])) {
            throw new \Exception("Estructura de respuesta inesperada: " . $response);
        }

        $content = $result['candidates'][0]['content']['parts'][0]['text'];
        
        // Limpiar posibles residuos de markdown si Gemini ignora la instrucción
        $content = preg_replace('/^```json\s*|```$/m', '', trim($content));
        
        $definition = json_decode($content, true);
        if (!$definition) {
            throw new \Exception("Error al parsear el JSON generado por IA: " . $content);
        }

        return $definition;
    }
}
