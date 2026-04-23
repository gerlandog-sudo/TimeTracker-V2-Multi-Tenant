<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Core\Context;
use App\Core\Request;

class AdminController {

    // =====================================================================
    // SYSTEM CONFIG (tabla con una sola fila, id = tenant_id del usuario)
    // =====================================================================
    public function getSystemConfig() {
        try {
            $tenantId = isset($_GET['tenant_id']) ? (int)$_GET['tenant_id'] : (Context::getTenantId());
            if ($tenantId === null) $tenantId = 1;
            
            // Intentar obtener config específica del tenant
            $config = Database::fetchOne("SELECT * FROM system_config WHERE tenant_id = ?", [$tenantId]);
            // Si no existe y no es el super admin (0), obtener la global (id = 1)
            if (!$config && $tenantId != 0) {
                $config = Database::fetchOne("SELECT * FROM system_config WHERE id = 1");
            }
            if (!$config) {
                $config = Database::fetchOne("SELECT * FROM system_config LIMIT 1");
            }
            return Response::json($config ?? []);
        } catch (\Throwable $e) {
            return Response::json([]);
        }
    }

    public function updateSystemConfig() {
        $body = Request::getBody();
        $tenantId = Context::getTenantId() ?? 1;
        try {
            // Verificar si existe config para este tenant
            $exists = Database::fetchOne("SELECT id FROM system_config WHERE tenant_id = ?", [$tenantId]);
            if ($exists) {
                Database::query("
                    UPDATE system_config SET
                        company_name = ?, logo_url = ?, primary_color = ?,
                        secondary_color = ?, accent_color = ?, sidebar_bg = ?,
                        sidebar_text = ?, currency = ?, color_approved = ?,
                        color_rejected = ?, color_submitted = ?, color_draft = ?,
                        sound_enabled = ?
                    WHERE tenant_id = ?
                ", [
                    $body['company_name'] ?? null, $body['logo_url'] ?? null, $body['primary_color'] ?? null,
                    $body['secondary_color'] ?? null, $body['accent_color'] ?? null, $body['sidebar_bg'] ?? null,
                    $body['sidebar_text'] ?? null, $body['currency'] ?? null, $body['color_approved'] ?? null,
                    $body['color_rejected'] ?? null, $body['color_submitted'] ?? null, $body['color_draft'] ?? null,
                    isset($body['sound_enabled']) ? ($body['sound_enabled'] ? 1 : 0) : 1,
                    $tenantId
                ]);
            } else {
                // Si no existe fila para este tenant, actualizar la global (id=1) o insertar
                $global = Database::fetchOne("SELECT id FROM system_config WHERE id = 1");
                if ($global) {
                    Database::query("
                        UPDATE system_config SET
                            company_name = ?, logo_url = ?, primary_color = ?,
                            secondary_color = ?, accent_color = ?, sidebar_bg = ?,
                            sidebar_text = ?, currency = ?, color_approved = ?,
                            color_rejected = ?, color_submitted = ?, color_draft = ?,
                            sound_enabled = ?, tenant_id = ?
                        WHERE id = 1
                    ", [
                        $body['company_name'] ?? null, $body['logo_url'] ?? null, $body['primary_color'] ?? null,
                        $body['secondary_color'] ?? null, $body['accent_color'] ?? null, $body['sidebar_bg'] ?? null,
                        $body['sidebar_text'] ?? null, $body['currency'] ?? null, $body['color_approved'] ?? null,
                        $body['color_rejected'] ?? null, $body['color_submitted'] ?? null, $body['color_draft'] ?? null,
                        isset($body['sound_enabled']) ? ($body['sound_enabled'] ? 1 : 0) : 1,
                        $tenantId
                    ]);
                }
            }
            return Response::json(['success' => true]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage());
        }
    }

    // =====================================================================
    // PERMISSIONS (columnas: role_id, feature, can_access)
    // =====================================================================
    public function getPermissions() {
        try {
            $perms = Database::fetchAll("SELECT role_id, feature, can_access FROM permissions");
            return Response::json($perms);
        } catch (\Throwable $e) {
            return Response::json([]);
        }
    }

    public function updatePermission() {
        $body = Request::getBody();
        try {
            Database::query("
                INSERT INTO permissions (role_id, feature, can_access)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE can_access = VALUES(can_access)
            ", [$body['role_id'], $body['feature'], $body['can_access']]);
            return Response::json(['success' => true]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage());
        }
    }

    // =====================================================================
    // METADATA (tabla: positions, tasks_master)
    // =====================================================================
    public function getMetadata() {
        try {
            $profiles = Database::fetchAll("SELECT * FROM positions ORDER BY name");
            $tasks    = Database::fetchAll("SELECT * FROM tasks_master ORDER BY name");
            return Response::json([
                'profiles'    => $profiles,
                'seniorities' => [],
                'tasks'       => $tasks
            ]);
        } catch (\Throwable $e) {
            return Response::json(['profiles' => [], 'seniorities' => [], 'tasks' => []]);
        }
    }

    // =====================================================================
    // PROFILE (usuario logueado)
    // =====================================================================
    public function getProfile() {
        $user = Context::getUser();
        if (!$user) return Response::error("No autenticado", 401);
        try {
            $u = Database::fetchOne("SELECT id, name, email, role, role_id, language FROM users WHERE id = ?", [$user['id']]);
            return Response::json($u ?? []);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage());
        }
    }

    public function updateProfile() {
        $user = Context::getUser();
        $body = Request::getBody();
        try {
            Database::query("UPDATE users SET name = ?, email = ? WHERE id = ?", [$body['name'], $body['email'], $user['id']]);
            return Response::json(['success' => true]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage());
        }
    }
}
