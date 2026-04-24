<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Core\Context;
use App\Core\Request;

class TimeEntriesController {

    private function logTransition($timeEntryId, $fromStatus, $toStatus, $userId, $comment = null) {
        try {
            Database::query("INSERT INTO time_entry_logs (time_entry_id, from_status, to_status, user_id, comment) VALUES (?, ?, ?, ?, ?)",
                [$timeEntryId, $fromStatus, $toStatus, $userId, $comment]);
        } catch (\Throwable $e) {}
    }

    private function createNotification($userId, $message, $type = 'info') {
        try {
            Database::query("INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)", [$userId, $message, $type]);
        } catch (\Throwable $e) {}
    }

    public function list() {
        $user = Context::getUser();
        if (!$user) return Response::error("No autenticado", 401);
        $tenantId = $user['tenant_id'];

        $limit  = isset($_GET['limit']) ? (int)$_GET['limit'] : null;
        $page   = (int)($_GET['page'] ?? 1);
        $offset = ($page - 1) * ($limit ?? 0);

        $where  = "WHERE t.tenant_id = ?";
        $params = [$tenantId];

        if (($user['role'] ?? '') === 'staff' || ($user['role'] ?? '') === 'commercial') {
            $where .= " AND t.user_id = ?"; $params[] = $user['id'];
        }
        if (isset($_GET['status']) && $_GET['status'] !== 'all') {
            $where .= " AND t.status = ?"; $params[] = $_GET['status'];
        }
        if (!empty($_GET['from'])) { $where .= " AND t.date >= ?"; $params[] = $_GET['from']; }
        if (!empty($_GET['to']))   { $where .= " AND t.date <= ?"; $params[] = $_GET['to']; }
        
        // Filtros avanzados para Admin/C-Level
        if (($user['role'] === 'admin' || $user['role'] === 'c-level')) {
            if (!empty($_GET['user_id_filter'])) {
                $where .= " AND t.user_id = ?";
                $params[] = $_GET['user_id_filter'];
            }
        }
        
        if (!empty($_GET['project_id'])) {
            $where .= " AND t.project_id = ?";
            $params[] = $_GET['project_id'];
        }

        try {
            $total = (int)Database::fetchOne("SELECT COUNT(*) as total FROM time_entries t $where", $params)['total'];

            $sql = "SELECT t.*, p.name as project_name, tm.name as task_name, u.name as user_name, ua.name as approved_by_name
                    FROM time_entries t
                    LEFT JOIN projects p ON t.project_id = p.id
                    LEFT JOIN tasks_master tm ON t.task_id = tm.id
                    LEFT JOIN users u ON t.user_id = u.id
                    LEFT JOIN users ua ON t.reviewed_by = ua.id
                    $where ORDER BY t.date DESC, t.created_at DESC";

            if ($limit) { $sql .= " LIMIT $limit OFFSET $offset"; }

            $data = Database::fetchAll($sql, $params);
            return Response::json(['data' => $data, 'total' => $total, 'page' => $page, 'limit' => $limit, 'totalPages' => $limit ? ceil($total / $limit) : 1]);
        } catch (\Throwable $e) { return Response::error('TimeEntries Error: ' . $e->getMessage()); }
    }

    public function create() {
        $user = Context::getUser();
        if (!$user) return Response::error("No autenticado", 401);
        $tenantId = $user['tenant_id'];
        $body = Request::getBody();
        $targetUserId = $user['id'];

        if (isset($body['user_id']) && ($user['role'] === 'admin' || ($user['role_id'] ?? 0) <= 2)) {
            $targetUserId = $body['user_id'];
        } elseif ($user['role'] === 'admin' && !isset($body['user_id'])) {
            return Response::error("El administrador debe especificar un usuario.", 400);
        }

        $project = Database::fetchOne("SELECT status FROM projects WHERE id = ? AND tenant_id = ?", [$body['project_id'] ?? 0, $tenantId]);
        if (!$project || $project['status'] !== 'Activo') {
            return Response::error("No se pueden imputar horas a un proyecto que no esté ACTIVO o no pertenezca a tu empresa.", 400);
        }

        Database::query("INSERT INTO time_entries (user_id, project_id, task_id, description, hours, date, status, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
            $targetUserId, $body['project_id'], $body['task_id'],
            $body['description'], $body['hours'], $body['date'],
            $body['status'] ?? 'submitted',
            $tenantId
        ]);
        $id = Database::connect()->lastInsertId();
        $this->logTransition($id, null, $body['status'] ?? 'submitted', $user['id'], 'Registro creado');
        return Response::json(['success' => true, 'id' => $id]);
    }

    public function update() {
        $user = Context::getUser();
        if (!$user) return Response::error("No autenticado", 401);
        $tenantId = $user['tenant_id'];
        $body = Request::getBody();
        $id   = $body['id'] ?? null;
        if (!$id) return Response::error("ID requerido", 400);

        $entry = Database::fetchOne("SELECT * FROM time_entries WHERE id = ? AND tenant_id = ?", [$id, $tenantId]);
        if (!$entry) return Response::error("No encontrado", 404);

        $isAdminOrCLevel = in_array($user['role'], ['admin', 'c-level']);

        if ((int)$entry['user_id'] !== (int)$user['id'] && !$isAdminOrCLevel) {
            return Response::error("Sin permisos", 403);
        }
        
        if (!in_array($entry['status'], ['draft', 'pending', 'rejected']) && !$isAdminOrCLevel) {
            return Response::error("Solo se pueden editar registros en estado Borrador o Rechazado", 400);
        }

        Database::query("UPDATE time_entries SET project_id = ?, task_id = ?, description = ?, hours = ?, date = ? WHERE id = ? AND tenant_id = ?",
            [$body['project_id'], $body['task_id'], $body['description'], $body['hours'], $body['date'], $id, $tenantId]);
        return Response::json(['success' => true]);
    }

    public function submit($id) {
        $user = Context::getUser();
        if (!$user) return Response::error("No autenticado", 401);
        $tenantId = $user['tenant_id'];

        $entry = Database::fetchOne("SELECT * FROM time_entries WHERE id = ? AND tenant_id = ?", [$id, $tenantId]);
        if (!$entry) return Response::error("No encontrado", 404);
        $isAdminOrCLevel = in_array($user['role'], ['admin', 'c-level']);
        if ($entry['user_id'] != $user['id'] && !$isAdminOrCLevel) return Response::error("Sin permisos", 403);
        if (!in_array($entry['status'], ['draft', 'rejected'])) return Response::error("Estado inválido para envío", 400);

        Database::query("UPDATE time_entries SET status = 'submitted', submitted_at = NOW() WHERE id = ? AND tenant_id = ?", [$id, $tenantId]);
        $this->logTransition($id, $entry['status'], 'submitted', $user['id'], 'Enviado para aprobación');
        return Response::json(['success' => true]);
    }

    public function updateStatus($id) {
        $user = Context::getUser();
        if (!$user) return Response::error("No autenticado", 401);
        $tenantId = $user['tenant_id'];

        $body      = Request::getBody();
        $newStatus = $body['status'] ?? '';

        $entry = Database::fetchOne("SELECT * FROM time_entries WHERE id = ? AND tenant_id = ?", [$id, $tenantId]);
        if (!$entry) return Response::error("No encontrado", 404);
        
        // Validación basada en permisos de la DB
        $roleId = $user['role_id'] ?? 0;
        $hasPerm = Database::fetchOne("SELECT can_access FROM permissions WHERE role_id = ? AND feature = 'approvals' AND tenant_id = ?", [$roleId, $tenantId]);
        
        if (($hasPerm['can_access'] ?? 0) != 1 && !in_array($user['role'], ['admin', 'c-level'])) {
            return Response::error("Sin permisos para aprobar", 403);
        }

        if (!in_array($newStatus, ['approved', 'rejected', 'draft'])) return Response::error("Estado inválido", 400);

        $sql    = "UPDATE time_entries SET status = ?, reviewed_by = ?, rejection_reason = ?";
        $params = [$newStatus, $user['id'], $body['rejection_reason'] ?? null];

        if ($newStatus === 'approved')  $sql .= ", approved_at = NOW()";
        elseif ($newStatus === 'rejected') $sql .= ", rejected_at = NOW()";

        $sql .= " WHERE id = ? AND tenant_id = ?";
        $params[] = $id;
        $params[] = $tenantId;
        Database::query($sql, $params);
        $this->logTransition($id, $entry['status'], $newStatus, $user['id'], $body['comment'] ?? 'Cambio de estado');

        $msg = "Tu registro del " . $entry['date'] . " ha sido " . ($newStatus === 'approved' ? 'APROBADO' : ($newStatus === 'rejected' ? 'RECHAZADO' : 'revertido a Borrador'));
        $this->createNotification($entry['user_id'], $msg, $newStatus === 'approved' ? 'success' : ($newStatus === 'rejected' ? 'error' : 'warning'));
        return Response::json(['success' => true]);
    }

    public function bulkStatus() {
        $user = Context::getUser();
        if (!$user) return Response::error("No autenticado", 401);
        $tenantId = $user['tenant_id'];

        $roleId = $user['role_id'] ?? 0;
        $hasPerm = Database::fetchOne("SELECT can_access FROM permissions WHERE role_id = ? AND feature = 'approvals' AND tenant_id = ?", [$roleId, $tenantId]);

        if (($hasPerm['can_access'] ?? 0) != 1 && !in_array($user['role'], ['admin', 'c-level'])) {
            return Response::error("Sin permisos", 403);
        }
        $body      = Request::getBody();
        $ids       = $body['ids'] ?? [];
        $newStatus = $body['status'] ?? '';

        if (empty($ids) || !in_array($newStatus, ['approved', 'rejected'])) return Response::error("Parámetros inválidos", 400);

        foreach ($ids as $id) {
            $entry = Database::fetchOne("SELECT * FROM time_entries WHERE id = ? AND tenant_id = ?", [$id, $tenantId]);
            if (!$entry || $entry['status'] !== 'submitted') continue;
            $sql = "UPDATE time_entries SET status = ?, reviewed_by = ?, " . ($newStatus === 'approved' ? 'approved_at' : 'rejected_at') . " = NOW() WHERE id = ? AND tenant_id = ?";
            Database::query($sql, [$newStatus, $user['id'], $id, $tenantId]);
            $this->logTransition($id, 'submitted', $newStatus, $user['id'], 'Aprobación masiva');
            $msg = "Tu registro del " . $entry['date'] . " ha sido " . ($newStatus === 'approved' ? 'APROBADO' : 'RECHAZADO');
            $this->createNotification($entry['user_id'], $msg, $newStatus === 'approved' ? 'success' : 'error');
        }
        return Response::json(['success' => true]);
    }

    public function delete($id) {
        $user = Context::getUser();
        if (!$user) return Response::error("No autenticado", 401);
        $tenantId = $user['tenant_id'];
        $entry = Database::fetchOne("SELECT * FROM time_entries WHERE id = ? AND tenant_id = ?", [$id, $tenantId]);
        if (!$entry) return Response::error("No encontrado", 404);
        $isAdminOrCLevel = in_array($user['role'], ['admin', 'c-level']);
        if ((int)$entry['user_id'] !== (int)$user['id'] && !$isAdminOrCLevel) return Response::error("Sin permisos", 403);
        Database::query("DELETE FROM time_entries WHERE id = ? AND tenant_id = ?", [$id, $tenantId]);
        return Response::json(['success' => true]);
    }

    public function getLogs($id) {
        $user = Context::getUser();
        if (!$user) return Response::error("No autenticado", 401);
        $tenantId = $user['tenant_id'];
        $exists = Database::fetchOne("SELECT id FROM time_entries WHERE id = ? AND tenant_id = ?", [$id, $tenantId]);
        if (!$exists) return Response::error("No encontrado", 404);

        return Response::json(Database::fetchAll("SELECT l.*, COALESCE(u.name, 'Sistema') as user_name FROM time_entry_logs l LEFT JOIN users u ON l.user_id = u.id WHERE l.time_entry_id = ? ORDER BY l.created_at DESC", [$id]));
    }
}
