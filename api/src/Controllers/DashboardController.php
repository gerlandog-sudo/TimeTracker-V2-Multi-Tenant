<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Core\Context;
use App\Core\Request;

class DashboardController {
    public function getStats() {
        try {
            $user = Context::getUser();
            if (!$user) return Response::error("No autenticado", 401);

            $from     = Request::input('from', null);
            $to       = Request::input('to', null);
            $clientId = Request::input('client_id', null);
            $projectId= Request::input('project_id', null);
            $tenantId = Context::getTenantId();

            $statsWhere  = "WHERE 1=1";
            $statsParams = [];

            // Filtro multi-tenant
            if ($tenantId) {
                $statsWhere .= " AND (t.tenant_id = ?)";
                $statsParams[] = $tenantId;
            }

            // Staff solo ve sus propias horas
            if (($user['role'] ?? '') === 'staff' || ($user['role'] ?? '') === 'commercial') {
                $statsWhere .= " AND t.user_id = ?";
                $statsParams[] = $user['id'];
            }

            if ($from)      { $statsWhere .= " AND t.date >= ?"; $statsParams[] = $from; }
            if ($to)        { $statsWhere .= " AND t.date <= ?"; $statsParams[] = $to; }
            if ($clientId)  { $statsWhere .= " AND p.client_id = ?"; $statsParams[] = $clientId; }
            if ($projectId) { $statsWhere .= " AND t.project_id = ?"; $statsParams[] = $projectId; }

            $joinBase = "FROM time_entries t JOIN projects p ON t.project_id = p.id JOIN users u ON t.user_id = u.id";

            $stats = [
                'totalHours'    => (float)(Database::fetchOne("SELECT SUM(t.hours) as total $joinBase $statsWhere AND t.status IN ('approved','submitted','draft')", $statsParams)['total'] ?? 0),
                'totalEarnings' => (float)(Database::fetchOne("SELECT SUM(t.hours * u.hourly_cost) as total $joinBase $statsWhere AND t.status = 'approved'", $statsParams)['total'] ?? 0),
                'activeProjects'=> (int)(Database::fetchOne("SELECT COUNT(DISTINCT p.id) as total $joinBase $statsWhere", $statsParams)['total'] ?? 0),
                'totalClients'  => (int)(Database::fetchOne("SELECT COUNT(DISTINCT p.client_id) as total $joinBase $statsWhere", $statsParams)['total'] ?? 0),
            ];

            $hoursByProject = Database::fetchAll("
                SELECT p.name,
                    SUM(CASE WHEN t.status='approved'  THEN t.hours ELSE 0 END)+0 as approved,
                    SUM(CASE WHEN t.status='submitted' THEN t.hours ELSE 0 END)+0 as submitted,
                    SUM(CASE WHEN t.status='draft'     THEN t.hours ELSE 0 END)+0 as draft,
                    SUM(CASE WHEN t.status='rejected'  THEN t.hours ELSE 0 END)+0 as rejected
                FROM projects p
                LEFT JOIN time_entries t ON p.id = t.project_id
                LEFT JOIN users u ON t.user_id = u.id
                $statsWhere
                GROUP BY p.id, p.name
                HAVING (approved+submitted+draft+rejected) > 0
            ", $statsParams);

            $hoursByTask = Database::fetchAll("
                SELECT tm.name,
                    SUM(CASE WHEN t.status='approved'  THEN t.hours ELSE 0 END)+0 as approved,
                    SUM(CASE WHEN t.status='submitted' THEN t.hours ELSE 0 END)+0 as submitted,
                    SUM(CASE WHEN t.status='draft'     THEN t.hours ELSE 0 END)+0 as draft,
                    SUM(CASE WHEN t.status='rejected'  THEN t.hours ELSE 0 END)+0 as rejected
                FROM tasks_master tm
                JOIN time_entries t ON tm.id = t.task_id
                JOIN projects p ON t.project_id = p.id
                JOIN users u ON t.user_id = u.id
                $statsWhere
                GROUP BY tm.id, tm.name
                HAVING (approved+submitted+draft+rejected) > 0
            ", $statsParams);

            $hoursByStatus = Database::fetchOne("
                SELECT
                    SUM(CASE WHEN t.status='approved'  THEN t.hours ELSE 0 END)+0 as approved,
                    SUM(CASE WHEN t.status='submitted' THEN t.hours ELSE 0 END)+0 as submitted,
                    SUM(CASE WHEN t.status='draft'     THEN t.hours ELSE 0 END)+0 as draft,
                    SUM(CASE WHEN t.status='rejected'  THEN t.hours ELSE 0 END)+0 as rejected
                FROM time_entries t
                JOIN projects p ON t.project_id = p.id
                JOIN users u ON t.user_id = u.id
                $statsWhere
            ", $statsParams);

            // Rentabilidad (Solo Admin / C-Level)
            $profitability = [];
            $pagination = null;
            $role = $user['role'] ?? '';
            if ($role === 'admin' || $role === 'c-level') {
                $pLimit = (int)Request::input('limit', 10);
                $pPage  = (int)Request::input('page', 1);
                $pOffset = ($pPage - 1) * $pLimit;

                // Parámetros para rentabilidad (pueden ser diferentes si hay paginación específica)
                $pParams = $statsParams;

                $sqlProfit = "
                    SELECT p.name, 
                           SUM(t.hours * COALESCE(pc.hourly_cost, 0)) as revenue,
                           SUM(t.hours * COALESCE(u.hourly_cost, 0)) as cost
                    FROM projects p
                    JOIN time_entries t ON t.project_id = p.id
                    LEFT JOIN users u ON t.user_id = u.id
                    LEFT JOIN position_costs pc ON u.position_id = pc.position_id 
                         AND u.seniority = pc.seniority 
                         AND pc.tenant_id = t.tenant_id
                    $statsWhere AND t.status IN ('approved', 'submitted')
                    GROUP BY p.id, p.name
                    ORDER BY MAX(t.date) DESC
                    LIMIT $pLimit OFFSET $pOffset";
                
                $profitability = Database::fetchAll($sqlProfit, $pParams);

                $countProfit = (int)(Database::fetchOne("
                    SELECT COUNT(DISTINCT p.id) as total 
                    FROM projects p 
                    JOIN time_entries t ON t.project_id = p.id 
                    $statsWhere AND t.status IN ('approved', 'submitted')", $pParams)['total'] ?? 0);

                $sums = Database::fetchOne("
                    SELECT SUM(t.hours * COALESCE(pc.hourly_cost, 0)) as totalRevenue,
                           SUM(t.hours * COALESCE(u.hourly_cost, 0)) as totalCost
                    FROM projects p
                    JOIN time_entries t ON t.project_id = p.id
                    LEFT JOIN users u ON t.user_id = u.id
                    LEFT JOIN position_costs pc ON u.position_id = pc.position_id 
                         AND u.seniority = pc.seniority
                         AND pc.tenant_id = t.tenant_id
                    $statsWhere AND t.status IN ('approved', 'submitted')", $pParams);

                $pagination = [
                    'total' => $countProfit,
                    'page' => $pPage,
                    'limit' => $pLimit,
                    'totalPages' => ceil($countProfit / $pLimit),
                    'globalRevenue' => (float)($sums['totalRevenue'] ?? 0),
                    'globalCost' => (float)($sums['totalCost'] ?? 0)
                ];
            }

            $userStats = null;
            if (in_array($user['role'] ?? '', ['staff', 'commercial'])) {
                $userWhere  = "WHERE t.user_id = ? AND t.tenant_id = ?";
                $userParams = [$user['id'], $tenantId];
                if ($from)  { $userWhere .= " AND t.date >= ?"; $userParams[] = $from; }
                if ($to)    { $userWhere .= " AND t.date <= ?"; $userParams[] = $to; }

                $userStats = [
                    'totalHours'    => (float)(Database::fetchOne("SELECT SUM(t.hours) as total FROM time_entries t JOIN projects p ON t.project_id = p.id $userWhere", $userParams)['total'] ?? 0),
                    'totalEarnings' => 0,
                    'hoursByProject'=> Database::fetchAll("SELECT p.name, SUM(t.hours)+0 as hours FROM projects p JOIN time_entries t ON p.id = t.project_id $userWhere GROUP BY p.id, p.name", $userParams),
                    'hoursByTask'   => Database::fetchAll("SELECT tm.name, SUM(t.hours)+0 as hours FROM tasks_master tm JOIN time_entries t ON tm.id = t.task_id JOIN projects p ON t.project_id = p.id $userWhere GROUP BY tm.id, tm.name", $userParams),
                ];
            }

            return Response::json([
                'stats'          => $stats,
                'hoursByProject' => $hoursByProject,
                'hoursByTask'    => $hoursByTask,
                'hoursByStatus'  => $hoursByStatus,
                'profitability'  => $profitability,
                'userStats'      => $userStats,
                'pagination'     => $pagination
            ]);

        } catch (\Throwable $e) {
            return Response::error("Dashboard Error: " . $e->getMessage());
        }
    }
}
