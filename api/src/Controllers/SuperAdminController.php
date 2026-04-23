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
            // Obtener tamaño de la base de datos
            $dbSize = Database::fetchOne("
                SELECT SUM(data_length + index_length) / 1024 / 1024 AS size 
                FROM information_schema.TABLES 
                WHERE table_schema = DATABASE()
            ")['size'];

            $stats = [
                'total_tenants' => (int)Database::fetchOne("SELECT COUNT(*) as count FROM tenants")['count'],
                'total_users'   => (int)Database::fetchOne("SELECT COUNT(*) as count FROM users WHERE is_super_admin = 0")['count'],
                'total_projects'=> (int)Database::fetchOne("SELECT COUNT(*) as count FROM projects")['count'],
                'total_hours'   => (float)Database::fetchOne("SELECT SUM(hours) as total FROM time_entries")['total'],
                'total_tasks'   => (int)Database::fetchOne("SELECT COUNT(*) as count FROM kanban_tasks")['count'],
                'total_audit'   => (int)Database::fetchOne("
                    SELECT (
                        SELECT COUNT(*) FROM time_entry_logs
                    ) + (
                        SELECT COUNT(*) FROM audit_logs
                    ) as count
                ")['count'],
                'entries_count' => (int)Database::fetchOne("SELECT COUNT(*) as count FROM time_entries")['count'],
                'active_kanban' => (int)Database::fetchOne("SELECT COUNT(*) as count FROM kanban_tasks WHERE status != 'Done'")['count']
            ];

            $server_info = [
                'php_version' => PHP_VERSION,
                'memory_limit' => ini_get('memory_limit'),
                'memory_usage' => round(memory_get_usage() / 1024 / 1024, 2) . ' MB',
                'mysql_version' => Database::fetchOne("SELECT VERSION() as v")['v'],
                'db_size' => round((float)$dbSize, 2) . ' MB',
                'os' => PHP_OS
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
                'top_tenants' => $topTenants,
                'server_info' => $server_info
            ]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage());
        }
    }

    // GESTIÓN DE EMPRESAS (TENANTS)
    public function listTenants() {
        $this->checkAccess();
        try {
            $db = Database::connect();
            $tenantRepo = new \App\Repositories\TenantRepository($db);
            $userRepo = new \App\Repositories\UserRepository($db);
            $tenantService = new \App\Services\TenantService($tenantRepo, $userRepo);

            $result = $tenantService->listAll();
            return Response::json($result['data']);
        } catch (\Throwable $e) {
            return Response::error("Error en listado: " . $e->getMessage());
        }
    }

    public function saveTenant() {
        $this->checkAccess();
        $body = Request::getBody();
        $id = $body['id'] ?? null;
        
        try {
            $db = Database::connect();
            $tenantRepo = new \App\Repositories\TenantRepository($db);
            $userRepo = new \App\Repositories\UserRepository($db);
            $tenantService = new \App\Services\TenantService($tenantRepo, $userRepo);

            if ($id) {
                // Actualización o cambio de estado
                if (count($body) <= 2 && isset($body['status'])) {
                    $result = $tenantService->toggleStatus($id, $body['status']);
                } else {
                    $tenantRepo->update(
                        $id, 
                        $body['name'] ?? '', 
                        $body['domain'] ?? null, 
                        $body['status'] ?? 'active'
                    );
                    $result = ['success' => true];
                }
            } else {
                // Alta transaccional mediante el servicio
                $result = $tenantService->registerTenant($body);
            }

            if (isset($result['success']) && !$result['success']) {
                return Response::error($result['errors'][0] ?? "Error en la operación", $result['status'] ?? 400);
            }

            return Response::json(['success' => true]);
        } catch (\Throwable $e) {
            return Response::error("Error en proceso: " . $e->getMessage());
        }
    }

    public function deleteTenant($id) {
        $this->checkAccess();
        try {
            $db = Database::connect();
            $tenantRepo = new \App\Repositories\TenantRepository($db);
            $userRepo = new \App\Repositories\UserRepository($db);
            $tenantService = new \App\Services\TenantService($tenantRepo, $userRepo);

            $result = $tenantService->removeTenant($id);

            if (!$result['success']) {
                return Response::error($result['errors'][0], $result['status']);
            }
            
            return Response::json(['success' => true]);
        } catch (\Throwable $e) {
            return Response::error("Error crítico: " . $e->getMessage());
        }
    }

    // LOGS GLOBALES
    public function getGlobalLogs() {
        $this->checkAccess();
        try {
            $page  = isset($_GET['page'])  ? (int)$_GET['page']  : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
            $offset = ($page - 1) * $limit;

            $where = "WHERE 1=1";
            $params = [];

            if (!empty($_GET['tenant_id'])) {
                $where .= " AND u.tenant_id = ?";
                $params[] = $_GET['tenant_id'];
            }
            if (!empty($_GET['from_status'])) {
                $where .= " AND l.from_status = ?";
                $params[] = $_GET['from_status'];
            }
            if (!empty($_GET['to_status'])) {
                $where .= " AND l.to_status = ?";
                $params[] = $_GET['to_status'];
            }
            if (!empty($_GET['date_from'])) {
                $where .= " AND DATE(l.created_at) >= ?";
                $params[] = $_GET['date_from'];
            }
            if (!empty($_GET['date_to'])) {
                $where .= " AND DATE(l.created_at) <= ?";
                $params[] = $_GET['date_to'];
            }

            $total = Database::fetchOne("
                SELECT COUNT(*) as count 
                FROM time_entry_logs l
                JOIN users u ON l.user_id = u.id
                $where
            ", $params)['count'];
            
            $logs = Database::fetchAll("
                SELECT l.*, u.name as user_name, t.name as tenant_name
                FROM time_entry_logs l
                JOIN users u ON l.user_id = u.id
                LEFT JOIN tenants t ON u.tenant_id = t.id
                $where
                ORDER BY l.created_at DESC
                LIMIT $limit OFFSET $offset
            ", $params);

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
