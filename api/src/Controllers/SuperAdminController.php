<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Core\Context;
use App\Core\Request;

class SuperAdminController {

    private function checkAccess() {
        if (!Context::isSuperAdmin()) {
            Response::error("Acceso denegado. Se requiere privilegios de Super Admin.", 403);
            exit;
        }
    }

    // DASHBOARD GLOBAL
    public function getStats() {
        $this->checkAccess();
        try {
            $stats = [
                'total_tenants' => (int)Database::fetchOne("SELECT COUNT(*) as count FROM tenants")['count'],
                'total_users'   => (int)Database::fetchOne("SELECT COUNT(*) as count FROM users WHERE is_super_admin = 0")['count'],
                'total_projects'=> (int)Database::fetchOne("SELECT COUNT(*) as count FROM projects")['count'],
                'total_hours'   => (float)Database::fetchOne("SELECT SUM(hours) as total FROM time_entries WHERE status = 'approved'")['total'],
                'entries_count' => (int)Database::fetchOne("SELECT COUNT(*) as count FROM time_entries")['count'],
                'active_kanban' => (int)Database::fetchOne("SELECT COUNT(*) as count FROM kanban_tasks WHERE status != 'Done'")['count']
            ];
            
            // Actividad por tenant (Top 5)
            $topTenants = Database::fetchAll("
                SELECT t.name, COUNT(u.id) as user_count 
                FROM tenants t 
                LEFT JOIN users u ON t.id = u.tenant_id 
                GROUP BY t.id 
                ORDER BY user_count DESC 
                LIMIT 5
            ");

            return Response::json([
                'stats' => $stats,
                'top_tenants' => $topTenants
            ]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage());
        }
    }

    // GESTIÓN DE EMPRESAS (TENANTS)
    public function listTenants() {
        $this->checkAccess();
        try {
            // Intentamos una consulta más simple primero para evitar errores de columnas calculadas
            $tenants = Database::fetchAll("
                SELECT t.*
                FROM tenants t 
                ORDER BY t.id DESC
            ");
            
            // Enriquecemos con conteos de forma segura
            foreach ($tenants as &$tenant) {
                $tenant['users_count'] = (int)Database::fetchOne("SELECT COUNT(*) as c FROM users WHERE tenant_id = ?", [$tenant['id']])['c'];
                $tenant['projects_count'] = (int)Database::fetchOne("SELECT COUNT(*) as c FROM projects WHERE tenant_id = ?", [$tenant['id']])['c'];
            }

            return Response::json($tenants);
        } catch (\Throwable $e) {
            return Response::error("Error en listado: " . $e->getMessage());
        }
    }

    public function saveTenant() {
        $this->checkAccess();
        $body = Request::getBody();
        $id = $body['id'] ?? null;
        
        try {
            $db = Database::getInstance();

            if ($id) {
                // ACTUALIZACIÓN BÁSICA (Solo Tenant)
                Database::query("UPDATE tenants SET name = ?, domain = ?, status = ? WHERE id = ?", [
                    $body['name'], $body['domain'] ?? null, $body['status'] ?? 'active', $id
                ]);
            } else {
                // ALTA NUEVA EMPRESA (TRANSACCIONAL)
                
                // 1. Validaciones previas
                $existingTenant = Database::fetchOne("SELECT id FROM tenants WHERE name = ?", [$body['name']]);
                if ($existingTenant) return Response::error("Ya existe una empresa con ese nombre.", 400);

                $adminEmail = $body['admin_email'] ?? '';
                $existingUser = Database::fetchOne("SELECT id FROM users WHERE email = ?", [$adminEmail]);
                if ($existingUser) return Response::error("El email del administrador ya está en uso.", 400);

                $db->beginTransaction();

                // 2. Crear Tenant
                Database::query("INSERT INTO tenants (name, domain, status) VALUES (?, ?, ?)", [
                    $body['name'], $body['domain'] ?? null, $body['status'] ?? 'active'
                ]);
                $tenantId = $db->lastInsertId();

                // 3. Crear System Config
                Database::query("
                    INSERT INTO system_config 
                    (tenant_id, company_name, logo_url, currency, primary_color, secondary_color, accent_color, sidebar_bg, sidebar_text, color_approved, color_submitted, color_rejected, color_draft) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ", [
                    $tenantId,
                    $body['name'],
                    $body['logo_url'] ?? null,
                    $body['currency'] ?? 'USD',
                    $body['primary_color']   ?? '#4f46e5',
                    $body['secondary_color'] ?? '#0f172a',
                    $body['accent_color']    ?? '#06b6d4',
                    $body['sidebar_bg']      ?? '#f8fafc',
                    $body['sidebar_text']    ?? '#334155',
                    $body['color_approved']  ?? '#10b981',
                    $body['color_submitted'] ?? '#f59e0b',
                    $body['color_rejected']  ?? '#ef4444',
                    $body['color_draft']      ?? '#94a3b8'
                ]);

                // 4. Crear Usuario Administrador
                $passwordHash = password_hash($body['admin_password'] ?? '123456', PASSWORD_DEFAULT);
                Database::query("
                    INSERT INTO users (name, email, password, role, role_id, tenant_id, weekly_capacity, hourly_cost) 
                    VALUES (?, ?, ?, 'admin', 1, ?, 40, 0)
                ", [
                    $body['admin_name'] ?? 'Admin',
                    $adminEmail,
                    $passwordHash,
                    $tenantId
                ]);

                // 5. Matriz de Permisos
                $features = [
                    'dashboard', 'kanban', 'tracker', 'approvals', 'projects', 
                    'clients', 'costs', 'report_heatmaps', 'report_audit', 
                    'report_ai', 'report_custom', 'users', 'settings'
                ];
                
                foreach ($features as $f) {
                    Database::query("
                        INSERT INTO permissions (role_id, feature, can_access, tenant_id) 
                        VALUES (1, ?, 1, ?)
                    ", [$f, $tenantId]);
                }

                $db->commit();
            }
            return Response::json(['success' => true]);
        } catch (\Throwable $e) {
            if (isset($db) && $db->inTransaction()) $db->rollBack();
            return Response::error("Error en DB: " . $e->getMessage());
        }
    }

    public function deleteTenant($id) {
        $this->checkAccess();
        try {
            Database::query("DELETE FROM tenants WHERE id = ?", [$id]);
            return Response::json(['success' => true]);
        } catch (\Throwable $e) {
            return Response::error("Error al eliminar: " . $e->getMessage());
        }
    }

    // LOGS GLOBALES
    public function getGlobalLogs() {
        $this->checkAccess();
        try {
            $page  = isset($_GET['page'])  ? (int)$_GET['page']  : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
            $offset = ($page - 1) * $limit;

            $total = Database::fetchOne("SELECT COUNT(*) as count FROM time_entry_logs")['count'];
            
            $logs = Database::fetchAll("
                SELECT l.*, u.name as user_name, t.name as tenant_name
                FROM time_entry_logs l
                JOIN users u ON l.user_id = u.id
                LEFT JOIN tenants t ON u.tenant_id = t.id
                ORDER BY l.created_at DESC
                LIMIT $limit OFFSET $offset
            ");

            return Response::json([
                'data' => $logs,
                'total' => (int)$total,
                'page' => $page,
                'limit' => $limit,
                'totalPages' => ceil($total / $limit)
            ]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage());
        }
    }
}
