<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Core\Context;
use App\Core\Request;

class KanbanController {
    public function list() {
        $user = Context::getUser();
        if (!$user) return Response::error("No autenticado", 401);

        $sql    = "SELECT kt.*, p.name as project_name, u.name as user_name, tm.name as task_type_name
                   FROM kanban_tasks kt
                   JOIN projects p ON kt.project_id = p.id
                   JOIN users u ON kt.user_id = u.id
                   LEFT JOIN tasks_master tm ON kt.task_type_id = tm.id
                   WHERE 1=1";
        $params = [];

        $isManager = (($user['role'] ?? '') === 'admin' || ($user['role_id'] ?? 99) <= 2);
        if (!$isManager) {
            $sql .= " AND (kt.user_id = ? OR kt.created_by = ?)";
            $params[] = $user['id']; $params[] = $user['id'];
        } elseif (!empty($_GET['user_id'])) {
            $sql .= " AND kt.user_id = ?"; $params[] = $_GET['user_id'];
        }

        $sql .= " ORDER BY kt.created_at DESC";
        return Response::json(array_values(Database::fetchAll($sql, $params) ?: []));
    }

    public function create() {
        $user = Context::getUser();
        $body = Request::getBody();
        $isManager   = (($user['role'] ?? '') === 'admin' || ($user['role_id'] ?? 99) <= 2);
        $targetUserId= $isManager && isset($body['user_id']) ? $body['user_id'] : $user['id'];

        Database::query("INSERT INTO kanban_tasks (project_id, user_id, description, priority, task_type_id, estimated_hours, status, created_by) VALUES (?, ?, ?, ?, ?, ?, 'ToDo', ?)", [
            $body['project_id'], $targetUserId, $body['description'],
            $body['priority'] ?? 'Baja', $body['task_type_id'] ?? null,
            $body['estimated_hours'] ?? 0, $user['id']
        ]);
        return Response::json(['success' => true, 'id' => Database::connect()->lastInsertId()]);
    }

    public function update($id) {
        $user = Context::getUser();
        $body = Request::getBody();
        $task = Database::fetchOne("SELECT * FROM kanban_tasks WHERE id = ?", [$id]);
        if (!$task) return Response::error("No encontrado", 404);

        $isManager = (($user['role'] ?? '') === 'admin' || ($user['role_id'] ?? 99) <= 2);
        if (!$isManager && $task['user_id'] != $user['id'] && $task['created_by'] != $user['id']) return Response::error("Sin permisos", 403);

        $newStatus   = $body['status'] ?? $task['status'];
        $started_at  = $task['started_at'];
        $completed_at= $task['completed_at'];

        if ($newStatus === 'Doing' && $task['status'] !== 'Doing') {
            $started_at = date('Y-m-d H:i:s');
            if ($task['status'] === 'Done') $completed_at = null;
        } elseif ($newStatus === 'Done' && $task['status'] !== 'Done') {
            $completed_at = date('Y-m-d H:i:s');
        }

        Database::query("UPDATE kanban_tasks SET project_id = ?, description = ?, priority = ?, task_type_id = ?, estimated_hours = ?, status = ?, started_at = ?, completed_at = ? WHERE id = ?", [
            $body['project_id'] ?? $task['project_id'], $body['description'] ?? $task['description'],
            $body['priority'] ?? $task['priority'], $body['task_type_id'] ?? $task['task_type_id'],
            $body['estimated_hours'] ?? $task['estimated_hours'],
            $newStatus, $started_at, $completed_at, $id
        ]);
        return Response::json(['success' => true]);
    }

    public function delete($id) {
        $user = Context::getUser();
        $task = Database::fetchOne("SELECT user_id, created_by FROM kanban_tasks WHERE id = ?", [$id]);
        if (!$task) return Response::error("No encontrado", 404);
        $isManager = (($user['role'] ?? '') === 'admin' || ($user['role_id'] ?? 99) <= 2);
        if (!$isManager && $task['user_id'] != $user['id'] && $task['created_by'] != $user['id']) return Response::error("Sin permisos", 403);
        Database::query("DELETE FROM kanban_tasks WHERE id = ?", [$id]);
        return Response::json(['success' => true]);
    }
}
