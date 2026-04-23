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
            $tenants = Database::fetchAll("
                SELECT t.*, 
                       (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as users_count,
                       (SELECT COUNT(*) FROM projects WHERE client_id IN (SELECT id FROM clients WHERE tenant_id = t.id)) as projects_count
                FROM tenants t 
                ORDER BY t.created_at DESC
            ");
            return Response::json($tenants);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage());
        }
    }

    public function saveTenant() {
        $this->checkAccess();
        $body = Request::getBody();
        $id = $body['id'] ?? null;
        
        try {
            if ($id) {
                Database::query("UPDATE tenants SET name = ?, domain = ?, status = ? WHERE id = ?", [
                    $body['name'], $body['domain'] ?? null, $body['status'] ?? 'active', $id
                ]);
            } else {
                Database::query("INSERT INTO tenants (name, domain, status) VALUES (?, ?, ?)", [
                    $body['name'], $body['domain'] ?? null, $body['status'] ?? 'active'
                ]);
            }
            return Response::json(['success' => true]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage());
        }
    }

    public function deleteTenant($id) {
        $this->checkAccess();
        try {
            // Verificar si hay usuarios
            $hasUsers = Database::fetchOne("SELECT id FROM users WHERE tenant_id = ? LIMIT 1", [$id]);
            if ($hasUsers) return Response::error("No se puede eliminar una empresa con usuarios activos. Pausa la empresa en su lugar.", 400);
            
            Database::query("DELETE FROM tenants WHERE id = ?", [$id]);
            return Response::json(['success' => true]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage());
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
