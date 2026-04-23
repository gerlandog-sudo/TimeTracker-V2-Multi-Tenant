<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Core\Context;
use App\Core\Request;

class ClientsController {
    public function list() {
        $user = Context::getUser();
        if (!$user) return Response::error("No autenticado", 401);

        $participating = (($_GET['participating'] ?? '') === 'true');
        $tenantId      = Context::getTenantId();

        $sql = "SELECT c.*, 
                (SELECT COALESCE(SUM(p.budget_hours), 0) FROM projects p WHERE p.client_id = c.id AND p.tenant_id = ?) as total_budget_hours,
                (SELECT COALESCE(SUM(p.budget_money), 0) FROM projects p WHERE p.client_id = c.id AND p.tenant_id = ?) as total_budget_money,
                (SELECT COALESCE(SUM(te.hours), 0) FROM time_entries te JOIN projects p ON te.project_id = p.id WHERE p.client_id = c.id AND te.status = 'approved' AND p.tenant_id = ?) as total_actual_hours,
                (SELECT COALESCE(SUM(te.hours * COALESCE(pc.hourly_cost, 0)), 0) 
                 FROM time_entries te 
                 JOIN projects p ON te.project_id = p.id 
                 JOIN users u ON te.user_id = u.id
                 LEFT JOIN position_costs pc ON u.position_id = pc.position_id 
                      AND u.seniority = pc.seniority 
                      AND pc.tenant_id = te.tenant_id
                 WHERE p.client_id = c.id AND te.status = 'approved' AND p.tenant_id = ?) as total_actual_revenue
                FROM clients c
                WHERE c.tenant_id = ?";

        $params = [$tenantId, $tenantId, $tenantId, $tenantId, $tenantId];

        if (($user['role'] ?? '') !== 'admin' && $participating) {
            $sql .= " AND c.id IN (SELECT DISTINCT p2.client_id FROM projects p2 JOIN time_entries t2 ON p2.id = t2.project_id WHERE t2.user_id = ?)";
            $params[] = $user['id'];
        }

        $sql .= " ORDER BY c.name";

        $data = Database::fetchAll($sql, $params);
        return Response::json($data);
    }

    public function create() {
        $body = Request::getBody();
        Database::query("INSERT INTO clients (name, legal_name, tax_id, contact_name, contact_email, address, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)", [
            $body['name'], 
            $body['legal_name'] ?? null, 
            $body['tax_id'] ?? null,
            $body['contact_name'] ?? null,
            $body['contact_email'] ?? null,
            $body['address'] ?? null, 
            Context::getTenantId()
        ]);
        return Response::json(['success' => true, 'id' => Database::connect()->lastInsertId()]);
    }

    public function update() {
        $body = Request::getBody();
        Database::query("UPDATE clients SET name = ?, legal_name = ?, tax_id = ?, contact_name = ?, contact_email = ?, address = ? WHERE id = ?", [
            $body['name'], 
            $body['legal_name'] ?? null, 
            $body['tax_id'] ?? null, 
            $body['contact_name'] ?? null,
            $body['contact_email'] ?? null,
            $body['address'] ?? null, 
            $body['id']
        ]);
        return Response::json(['success' => true]);
    }

    public function delete($id) {
        $used = Database::fetchOne("SELECT id FROM projects WHERE client_id = ? LIMIT 1", [$id]);
        if ($used) return Response::error("No se puede eliminar el cliente porque tiene proyectos asociados.", 400);
        Database::query("DELETE FROM clients WHERE id = ?", [$id]);
        return Response::json(['success' => true]);
    }
}
