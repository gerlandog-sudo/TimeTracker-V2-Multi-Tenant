<?php

namespace App\Core;

class Request {
    public static function getMethod() { return $_SERVER['REQUEST_METHOD']; }
    public static function getBody() { return json_decode(file_get_contents('php://input'), true) ?? []; }
    public static function input($key, $default = null) { return $_GET[$key] ?? $_POST[$key] ?? self::getBody()[$key] ?? $default; }

    public static function getAuthToken() {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        if (empty($headers)) {
            foreach ($_SERVER as $name => $value) {
                if (substr($name, 0, 5) == 'HTTP_') {
                    $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
                }
            }
        }
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? $headers['X-Authorization'] ?? $headers['x-authorization'] ?? '';
        if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) return $matches[1];
        if (isset($_COOKIE['tt_token'])) return $_COOKIE['tt_token'];
        return null;
    }
}
