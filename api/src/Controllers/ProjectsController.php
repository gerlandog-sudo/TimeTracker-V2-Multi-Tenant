<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Core\Context;
use App\Core\Request;

class ProjectsController {
    public function list() {
        $user = Context::getUser();
        if (!$user) return Response::error("No autenticado", 401);

        $limit        = isset($_GET['limit']) ? (int)$_GET['limit'] : null;
        $page         = (int)($_GET['page'] ?? 1);
        $offset       = ($page - 1) * ($limit ?? 0);
        $participating= (($_GET['participating'] ?? '') === 'true');
        $tenantId     = Context::getTenantId();

        $where  = "WHERE p.tenant_id = ?";
        $params = [$tenantId];

        if (isset($_GET['status']) && !empty($_GET['status'])) {
            $where .= " AND p.status = ?"; $params[] = $_GET['status'];
        }
        if (($user['role'] ?? '') !== 'admin' && $participating) {
            $where .= " AND p.id IN (SELECT DISTINCT project_id FROM time_entries WHERE user_id = ?)";
            $params[] = $user['id'];
        }

        $total  = (int)Database::fetchOne("SELECT COUNT(*) as total FROM projects p $where", $params)['total'];
        
        // Consulta para obtener proyectos con horas y dinero consumido (revenue)
        // Calculamos revenue basado en position_costs (precio de venta)
        $sql    = "SELECT p.*, c.name as client_name,
                   (SELECT COALESCE(SUM(t.hours), 0) FROM time_entries t WHERE t.project_id = p.id AND t.status = 'approved') as actual_hours,
                   (SELECT COALESCE(SUM(t.hours * COALESCE(pc.hourly_cost, 0)), 0) 
                    FROM time_entries t 
                    JOIN users u ON t.user_id = u.id
                    LEFT JOIN position_costs pc ON u.position_id = pc.position_id 
                         AND u.seniority = pc.seniority 
                         AND pc.tenant_id = t.tenant_id
                    WHERE t.project_id = p.id AND t.status = 'approved') as actual_revenue
                   FROM projects p
                   JOIN clients c ON p.client_id = c.id
                   $where 
                   ORDER BY p.status ASC, p.created_at DESC";

        if ($limit) { $sql .= " LIMIT $limit OFFSET $offset"; }

        return Response::json([
            'data' => Database::fetchAll($sql, $params), 
            'total' => $total, 
            'page' => $page, 
            'limit' => $limit, 
            'totalPages' => $limit ? ceil($total / $limit) : 1
        ]);
    }

    public function create() {
        $body = Request::getBody();
        Database::query("INSERT INTO projects (client_id, name, budget_hours, budget_money, status, tenant_id) VALUES (?, ?, ?, ?, ?, ?)", [
            $body['client_id'], $body['name'], $body['budget_hours'],
            $body['budget_money'] ?? null, $body['status'] ?? 'Activo',
            Context::getTenantId()
        ]);
        return Response::json(['success' => true]);
    }

    public function update() {
        $body = Request::getBody();
        Database::query("UPDATE projects SET client_id = ?, name = ?, budget_hours = ?, budget_money = ?, status = ? WHERE id = ?", [
            $body['client_id'], $body['name'], $body['budget_hours'],
            $body['budget_money'] ?? null, $body['status'], $body['id']
        ]);
        return Response::json(['success' => true]);
    }

    public function delete($id) {
        $used = Database::fetchOne("SELECT id FROM time_entries WHERE project_id = ? LIMIT 1", [$id]);
        if ($used) return Response::error("No se puede eliminar el proyecto porque tiene horas registradas.", 400);
        Database::query("DELETE FROM projects WHERE id = ?", [$id]);
        return Response::json(['success' => true]);
    }
}
