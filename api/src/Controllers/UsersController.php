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
        $user = Context::getUser();
        if (!$user) return Response::error("No autenticado", 401);
        $tenantId = Context::getTenantId();

        $body   = Request::getBody();
        $email  = $body['email'] ?? '';

        // VALIDACIÓN GLOBAL DE EMAIL (Sin filtrar por tenant)
        $exists = Database::fetchOne("SELECT id FROM users WHERE email = ?", [$email]);
        if ($exists) {
            return Response::error("El correo electrónico ya está registrado en el sistema por otro usuario.", 400);
        }

        $hashed = password_hash($body['password'], PASSWORD_DEFAULT);
        Database::query("INSERT INTO users (name, email, password, role, role_id, position_id, seniority, hourly_cost, weekly_capacity, tenant_id, is_super_admin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)", [
            $body['name'], $email, $hashed, $body['role'], $body['role_id'] ?? 4,
            $body['position_id'] ?? null, $body['seniority'] ?? null,
            $body['hourly_cost'] ?? 0, $body['weekly_capacity'] ?? 40,
            $tenantId
        ]);
        return Response::json(['success' => true]);
    }

    public function update() {
        $user = Context::getUser();
        if (!$user) return Response::error("No autenticado", 401);
        $tenantId = Context::getTenantId();
        $body = Request::getBody();
        $id   = $body['id'] ?? null;
        if (!$id) return Response::error("ID de usuario requerido", 400);

        // Verificar que el usuario a editar pertenezca al mismo tenant
        $target = Database::fetchOne("SELECT tenant_id FROM users WHERE id = ? AND tenant_id = ?", [$id, $tenantId]);
        if (!$target) {
            return Response::error("Usuario no encontrado o sin permisos para editarlo", 403);
        }

        // VALIDACIÓN GLOBAL DE EMAIL (Excepto para el mismo ID)
        $email = $body['email'] ?? '';
        $exists = Database::fetchOne("SELECT id FROM users WHERE email = ? AND id != ?", [$email, $id]);
        if ($exists) {
            return Response::error("El correo electrónico ya está en uso por otro usuario del sistema.", 400);
        }

        $params = [$body['name'], $email, $body['role'], $body['role_id'] ?? 4, $body['position_id'] ?? null, $body['seniority'] ?? null, $body['hourly_cost'] ?? 0, $body['weekly_capacity'] ?? 40];
        $sql    = "UPDATE users SET name = ?, email = ?, role = ?, role_id = ?, position_id = ?, seniority = ?, hourly_cost = ?, weekly_capacity = ?";

        if (!empty($body['password'])) {
            $sql .= ", password = ?";
            $params[] = password_hash($body['password'], PASSWORD_DEFAULT);
        }
        $sql .= " WHERE id = ? AND tenant_id = ?";
        $params[] = $id;
        $params[] = $tenantId;
        Database::query($sql, $params);
        return Response::json(['success' => true]);
    }

    public function delete($id) {
        $user = Context::getUser();
        if (!$user) return Response::error("No autenticado", 401);
        $tenantId = Context::getTenantId();

        // Verificar que el usuario a borrar pertenezca al mismo tenant
        $target = Database::fetchOne("SELECT tenant_id FROM users WHERE id = ? AND tenant_id = ?", [$id, $tenantId]);
        if (!$target) {
            return Response::error("No tienes permisos para eliminar este usuario", 403);
        }

        // Solo borramos de time_entries si pertenecen al mismo tenant (seguridad extra)
        $used = Database::fetchOne("SELECT id FROM time_entries WHERE user_id = ? AND tenant_id = ? LIMIT 1", [$id, $tenantId]);
        if ($used) return Response::error("No se puede eliminar el usuario porque tiene horas registradas en esta empresa.", 400);
        
        Database::query("DELETE FROM users WHERE id = ? AND tenant_id = ?", [$id, $tenantId]);
        return Response::json(['success' => true]);
    }
}
