<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Core\Context;
use App\Core\Request;

class AuthController {
    public function login() {
        $body     = Request::getBody();
        $email    = trim($body['email'] ?? '');
        $password = trim($body['password'] ?? '');

        $user = Database::fetchOne("SELECT * FROM users WHERE email = ?", [$email]);

        if (!$user || !password_verify($password, $user['password'])) {
            return Response::error("Credenciales inválidas", 401);
        }

        $token = \App\Core\Auth::generateToken([
            'id'            => (int)$user['id'],
            'email'         => $user['email'],
            'role'          => $user['role'],
            'role_id'       => (int)$user['role_id'],
            'tenant_id'     => (int)($user['tenant_id'] ?? 0),
            'language'      => $user['language'] ?? 'es_AR',
            'is_super_admin'=> (isset($user['is_super_admin']) && $user['is_super_admin'] == 1),
        ]);

        // Cookie de respaldo (sintaxis compatible PHP 7+)
        setcookie('tt_token', $token, time() + 86400, '/', '', false, false);

        unset($user['password']);
        return Response::json(['token' => $token, 'user' => $user]);
    }

    public function findTenant() {
        $body  = Request::getBody();
        $email = trim($body['email'] ?? $_GET['email'] ?? '');
        if (!$email) return Response::error("Email requerido");

        try {
            $user = Database::fetchOne("SELECT tenant_id FROM users WHERE email = ?", [$email]);
            if (!$user) return Response::error("Usuario no encontrado", 404);

            $tenant = Database::fetchOne("SELECT id, name FROM tenants WHERE id = ?", [$user['tenant_id']]);
            if (!$tenant) return Response::error("Empresa no encontrada", 404);

            return Response::json($tenant);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage());
        }
    }

    public function forgotPassword() {
        $body  = Request::getBody();
        $email = trim($body['email'] ?? '');
        $user  = Database::fetchOne("SELECT id FROM users WHERE email = ?", [$email]);
        if ($user) {
            $otp       = (string)rand(100000, 999999);
            $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));
            Database::query("INSERT INTO password_resets (email, otp, expires_at) VALUES (?, ?, ?)", [$email, $otp, $expiresAt]);
            @mail($email, "TimeTracker - Código de Verificación", "Tu código es: $otp\nExpira en 15 minutos.", "From: noreply@timetracker.pmaasglobal.com");
        }
        return Response::json(['success' => true, 'message' => 'Si el email existe, se enviará un código']);
    }

    public function resetPassword() {
        $body        = Request::getBody();
        $email       = $body['email'] ?? '';
        $otp         = $body['otp'] ?? '';
        $newPassword = $body['password'] ?? '';

        $reset = Database::fetchOne("SELECT * FROM password_resets WHERE email = ? AND otp = ? AND used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1", [$email, $otp]);
        if ($reset) {
            Database::query("UPDATE users SET password = ? WHERE email = ?", [password_hash($newPassword, PASSWORD_DEFAULT), $email]);
            Database::query("UPDATE password_resets SET used = 1 WHERE id = ?", [$reset['id']]);
            return Response::json(['success' => true]);
        }
        return Response::error("Código inválido o expirado");
    }
}
