<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Core\Context;
use App\Core\Request;

class UsersController {
    public function list() {
        $user = Context::getUser();
        if (!$user) return Response::error("No autenticado", 401);
        
        try {
            $limit    = isset($_GET['limit']) ? (int)$_GET['limit'] : null;
            $page     = (int)($_GET['page'] ?? 1);
            $offset   = ($page - 1) * ($limit ?? 0);
            $tenantId = Context::getTenantId();

            // Solo mostrar usuarios del tenant actual y ocultar super admins
            $where  = "WHERE u.tenant_id = ? AND u.is_super_admin = 0";
            $params = [$tenantId];

            $total = (int)Database::fetchOne("SELECT COUNT(*) as total FROM users u $where", $params)['total'];

            $sql = "SELECT u.id, u.name, u.email, u.role, u.role_id, u.position_id, u.seniority, 
                           u.hourly_cost, u.weekly_capacity, u.created_at, COALESCE(p.name,'') as position_name
                    FROM users u 
                    LEFT JOIN positions p ON u.position_id = p.id 
                    $where 
                    ORDER BY u.name";

            if ($limit) { $sql .= " LIMIT $limit OFFSET $offset"; }

            $users = Database::fetchAll($sql, $params);
            return Response::json([
                'data' => $users, 
                'total' => $total, 
                'page' => $page, 
                'limit' => $limit, 
                'totalPages' => $limit ? ceil($total / $limit) : 1
            ]);
        } catch (\Throwable $e) { 
            return Response::error('Users Error: ' . $e->getMessage()); 
        }
    }

    public function create() {
        $body   = Request::getBody();
        $hashed = password_hash($body['password'], PASSWORD_DEFAULT);
        Database::query("INSERT INTO users (name, email, password, role, role_id, position_id, seniority, hourly_cost, weekly_capacity, tenant_id, is_super_admin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)", [
            $body['name'], $body['email'], $hashed, $body['role'], $body['role_id'] ?? 4,
            $body['position_id'] ?? null, $body['seniority'] ?? null,
            $body['hourly_cost'] ?? 0, $body['weekly_capacity'] ?? 40,
            Context::getTenantId()
        ]);
        return Response::json(['success' => true]);
    }

    public function update() {
        $user = Context::getUser();
        $body = Request::getBody();
        $id   = $body['id'] ?? null;
        if (!$id) return Response::error("ID de usuario requerido", 400);

        // Verificar que el usuario a editar pertenezca al mismo tenant
        $target = Database::fetchOne("SELECT tenant_id FROM users WHERE id = ?", [$id]);
        if (!$target || $target['tenant_id'] != Context::getTenantId()) {
            return Response::error("No tienes permisos para editar este usuario", 403);
        }

        $params = [$body['name'], $body['email'], $body['role'], $body['role_id'] ?? 4, $body['position_id'] ?? null, $body['seniority'] ?? null, $body['hourly_cost'] ?? 0, $body['weekly_capacity'] ?? 40];
        $sql    = "UPDATE users SET name = ?, email = ?, role = ?, role_id = ?, position_id = ?, seniority = ?, hourly_cost = ?, weekly_capacity = ?";

        if (!empty($body['password'])) {
            $sql .= ", password = ?";
            $params[] = password_hash($body['password'], PASSWORD_DEFAULT);
        }
        $sql .= " WHERE id = ?";
        $params[] = $id;
        Database::query($sql, $params);
        return Response::json(['success' => true]);
    }

    public function delete($id) {
        // Verificar que el usuario a borrar pertenezca al mismo tenant
        $target = Database::fetchOne("SELECT tenant_id FROM users WHERE id = ?", [$id]);
        if (!$target || $target['tenant_id'] != Context::getTenantId()) {
            return Response::error("No tienes permisos para eliminar este usuario", 403);
        }

        $used = Database::fetchOne("SELECT id FROM time_entries WHERE user_id = ? LIMIT 1", [$id]);
        if ($used) return Response::error("No se puede eliminar el usuario porque tiene horas registradas.", 400);
        
        Database::query("DELETE FROM users WHERE id = ?", [$id]);
        return Response::json(['success' => true]);
    }
}
