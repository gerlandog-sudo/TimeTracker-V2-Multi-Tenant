<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Core\Context;
use App\Core\Request;
use App\Services\QueryEngine;
use App\Services\FinancialGuard;

class InsightsController {

    // ─── GET /reports/insights/catalog ───────────────────────────────────────
    // Devuelve el catálogo de dimensiones y métricas filtrado por rol del usuario.
    public function getCatalog(): void {
        $user     = Context::getUser();
        $tenantId = (int)Context::getTenantId();
        $roleId   = (int)($user['role_id'] ?? 0);

        $hasFinancial = FinancialGuard::hasFinancialAccess($roleId, $tenantId);
        $catalog      = QueryEngine::getCatalog($hasFinancial);

        Response::json([
            'catalog'       => $catalog,
            'financial_ok'  => $hasFinancial,
        ]);
    }

    // ─── POST /reports/insights/run ──────────────────────────────────────────
    // Ejecuta una consulta ad-hoc y devuelve los resultados.
    public function run(): void {
        try {
            $user     = Context::getUser();
            $tenantId = Context::getTenantId();
            
            if (!$user || !$tenantId) {
                Response::error('Sesión inválida o tenant no identificado.', 401);
                return;
            }

            $roleId = (int)($user['role_id'] ?? 0);
            $def    = Request::getBody();
            $tenantId = (int)$tenantId;

            // Validar estructura de la definición
            $validationError = QueryEngine::validate($def);
            if ($validationError) {
                Response::error($validationError, 422);
                return;
            }

            // Financial Guard — segunda barrera
            $metrics = $def['metrics'] ?? [];
            if (!FinancialGuard::check($metrics, $roleId, $tenantId)) {
                $blocked = FinancialGuard::getBlockedMetrics($metrics, $roleId, $tenantId);
                Response::error('Acceso denegado: métricas financieras restringidas para tu rol. (' . implode(', ', $blocked) . ')', 403);
                return;
            }

            $startMs = round(microtime(true) * 1000);

            $built    = QueryEngine::build($def, $tenantId);
            $rows     = Database::fetchAll($built['sql'], $built['params']);
            
            $countRes = Database::fetchOne($built['count_sql'], $built['params']);
            $total    = (int)($countRes['total'] ?? 0);

            $execMs   = round(microtime(true) * 1000) - $startMs;

            // Guardar en historial de ejecuciones (no bloqueante)
            try {
                $viewId = isset($def['view_id']) ? (int)$def['view_id'] : null;
                Database::query(
                    "INSERT INTO custom_report_runs (tenant_id, view_id, user_id, definition, row_count, exec_ms)
                     VALUES (?, ?, ?, ?, ?, ?)",
                    [
                        $tenantId,
                        $viewId,
                        (int)$user['id'],
                        json_encode($def),
                        count($rows),
                        $execMs,
                    ]
                );
            } catch (\Throwable $ignored) {
            }

            $limit = min((int)($def['limit'] ?? QueryEngine::MAX_ROWS), QueryEngine::MAX_ROWS);
            $page  = max(1, (int)($def['page'] ?? 1));

            Response::json([
                'data'        => $rows,
                'total'       => $total,
                'page'        => $page,
                'limit'       => $limit,
                'total_pages' => $limit > 0 ? (int)ceil($total / $limit) : 1,
                'exec_ms'     => $execMs,
            ]);
        } catch (\Throwable $e) {
            Response::error('Error ejecutando el reporte: ' . $e->getMessage(), 500);
        }
    }

    // ─── GET /reports/insights/views ─────────────────────────────────────────
    // Lista las vistas guardadas del tenant (propias + públicas).
    public function listViews(): void {
        try {
            $user     = Context::getUser();
            $tenantId = Context::getTenantId();
            
            if (!$user || !$tenantId) {
                Response::error('Sesión inválida o tenant no identificado.', 401);
                return;
            }

            $userId = (int)$user['id'];
            $tenantId = (int)$tenantId;

            $views = Database::fetchAll(
                "SELECT v.*, u.name AS creator_name
                 FROM custom_report_views v
                 LEFT JOIN users u ON v.created_by = u.id
                 WHERE v.tenant_id = ?
                   AND (v.is_public = 1 OR v.created_by = ?)
                 ORDER BY v.updated_at DESC",
                [$tenantId, $userId]
            );

            // Decodificar definition JSON y asegurar que sea un array
            foreach ($views as &$v) {
                if (is_string($v['definition'])) {
                    $decoded = json_decode($v['definition'], true);
                    $v['definition'] = is_array($decoded) ? $decoded : [];
                } elseif (!is_array($v['definition'])) {
                    $v['definition'] = [];
                }
            }

            Response::json($views);
        } catch (\Throwable $e) {
            // Log the actual error internally if possible, but return a clean error
            Response::error('Error listando vistas: ' . $e->getMessage(), 500);
        }
    }

    // ─── POST /reports/insights/views ────────────────────────────────────────
    // Guarda una nueva vista personalizada.
    public function saveView(): void {
        $user     = Context::getUser();
        $tenantId = (int)Context::getTenantId();
        $body     = Request::getBody();

        $name       = trim($body['name'] ?? '');
        $definition = $body['definition'] ?? null;
        $chartType  = $body['chart_type'] ?? 'table';
        $isPublic   = isset($body['is_public']) ? (int)(bool)$body['is_public'] : 0;
        $description = trim($body['description'] ?? '');

        if (!$name || !$definition) {
            Response::error('Nombre y definición son requeridos.', 422);
            return;
        }

        // Validar definición antes de guardar
        $validationError = QueryEngine::validate($definition);
        if ($validationError) {
            Response::error($validationError, 422);
            return;
        }

        $allowedChartTypes = ['table', 'bar', 'line', 'pie', 'area'];
        if (!in_array($chartType, $allowedChartTypes, true)) {
            $chartType = 'table';
        }

        try {
            Database::query(
                "INSERT INTO custom_report_views (tenant_id, created_by, name, description, definition, chart_type, is_public)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                    $tenantId,
                    (int)$user['id'],
                    $name,
                    $description,
                    json_encode($definition),
                    $chartType,
                    $isPublic,
                ]
            );

            $id = Database::fetchOne("SELECT LAST_INSERT_ID() AS id")['id'];
            Response::json(['success' => true, 'id' => (int)$id]);
        } catch (\Throwable $e) {
            Response::error('Error guardando la vista: ' . $e->getMessage(), 500);
        }
    }

    // ─── PUT /reports/insights/views/{id} ────────────────────────────────────
    // Actualiza una vista existente (solo el creador puede editarla).
    public function updateView(int $id): void {
        $user     = Context::getUser();
        $tenantId = (int)Context::getTenantId();
        $body     = Request::getBody();

        // Verificar ownership
        $existing = Database::fetchOne(
            "SELECT id FROM custom_report_views WHERE id = ? AND tenant_id = ? AND created_by = ?",
            [$id, $tenantId, (int)$user['id']]
        );

        if (!$existing) {
            Response::error('Vista no encontrada o sin permisos.', 404);
            return;
        }

        $name        = trim($body['name'] ?? '');
        $definition  = $body['definition'] ?? null;
        $chartType   = $body['chart_type'] ?? 'table';
        $isPublic    = isset($body['is_public']) ? (int)(bool)$body['is_public'] : 0;
        $description = trim($body['description'] ?? '');

        if ($definition) {
            $validationError = QueryEngine::validate($definition);
            if ($validationError) {
                Response::error($validationError, 422);
                return;
            }
        }

        try {
            Database::query(
                "UPDATE custom_report_views
                 SET name = ?, description = ?, definition = ?, chart_type = ?, is_public = ?
                 WHERE id = ?",
                [
                    $name,
                    $description,
                    $definition ? json_encode($definition) : null,
                    $chartType,
                    $isPublic,
                    $id,
                ]
            );
            Response::json(['success' => true]);
        } catch (\Throwable $e) {
            Response::error('Error actualizando la vista: ' . $e->getMessage(), 500);
        }
    }

    // ─── DELETE /reports/insights/views/{id} ─────────────────────────────────
    // Elimina una vista (solo el creador o admin del tenant).
    public function deleteView(int $id): void {
        $user     = Context::getUser();
        $tenantId = (int)Context::getTenantId();
        $roleId   = (int)($user['role_id'] ?? 0);

        // Admin (role_id=1) puede borrar cualquier vista del tenant
        $isAdmin = $roleId === 1;
        $existing = $isAdmin
            ? Database::fetchOne("SELECT id FROM custom_report_views WHERE id = ? AND tenant_id = ?", [$id, $tenantId])
            : Database::fetchOne("SELECT id FROM custom_report_views WHERE id = ? AND tenant_id = ? AND created_by = ?", [$id, $tenantId, (int)$user['id']]);

        if (!$existing) {
            Response::error('Vista no encontrada o sin permisos.', 404);
            return;
        }

        try {
            Database::query("DELETE FROM custom_report_views WHERE id = ?", [$id]);
            Response::json(['success' => true]);
        } catch (\Throwable $e) {
            Response::error('Error eliminando la vista: ' . $e->getMessage(), 500);
        }
    }

    // ─── POST /reports/insights/ai-assist ────────────────────────────────────
    public function aiAssist(): void {
        try {
            $user     = Context::getUser();
            $tenantId = Context::getTenantId();
            $body     = Request::getBody();
            $prompt   = trim($body['prompt'] ?? '');

            if (!$prompt) {
                Response::error('El prompt es requerido.', 422);
                return;
            }

            $roleId = (int)($user['role_id'] ?? 0);
            $hasFinancial = FinancialGuard::hasFinancialAccess($roleId, (int)$tenantId);

            $definition = \App\Services\AiService::assist($prompt, $hasFinancial);

            Response::json([
                'success'    => true,
                'definition' => $definition
            ]);
        } catch (\Throwable $e) {
            $code = (strpos($e->getMessage(), 'mantenimiento') !== false) ? 503 : 500;
            $msg = (strpos($e->getMessage(), 'mantenimiento') !== false) ? $e->getMessage() : 'Error en Asistencia IA: ' . $e->getMessage();
            Response::error($msg, $code);
        }
    }
    // ─── POST /reports/insights/generate-text ────────────────────────────────
    public function generateInsight(): void {
        try {
            $user     = Context::getUser();
            $tenantId = Context::getTenantId();
            $body     = Request::getBody();
            $prompt   = trim($body['prompt'] ?? '');

            if (!$prompt) {
                Response::error('El prompt es requerido.', 422);
                return;
            }

            $insightText = \App\Services\AiService::generateText($prompt);

            Response::json([
                'success' => true,
                'text'    => $insightText
            ]);
        } catch (\Throwable $e) {
            $code = (strpos($e->getMessage(), 'mantenimiento') !== false) ? 503 : 500;
            $msg = (strpos($e->getMessage(), 'mantenimiento') !== false) ? $e->getMessage() : 'Error generando insight: ' . $e->getMessage();
            Response::error($msg, $code);
        }
    }
}
