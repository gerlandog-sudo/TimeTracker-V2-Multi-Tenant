<?php

namespace App\Core;

use App\Core\JWT;

class Auth {
    private static function getSecret(): string {
        if (!defined('JWT_SECRET')) {
            require_once __DIR__ . '/../../config.php';
        }
        return JWT_SECRET;
    }

    public static function generateToken($payload) {
        $payload['iat'] = time();
        $payload['exp'] = time() + (60 * 60 * 24);
        return JWT::encode($payload, self::getSecret());
    }

    public static function validateToken($token) {
        if (!$token) return null;
        try {
            $payload = JWT::decode($token, self::getSecret());
            if (!$payload || (isset($payload['exp']) && $payload['exp'] < time())) return null;
            return $payload;
        } catch (\Throwable $e) { return null; }
    }
}
