<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Core\Context;
use App\Core\Request;

class ReportsController {
    public function getHeatmap() {
        try {
            $user     = Context::getUser();
            $tenantId = Context::getTenantId();
            $from     = Request::input('start_date', date('Y-m-01'));
            $to       = Request::input('end_date', date('Y-m-t'));

            $usersSql = "SELECT id, name, weekly_capacity FROM users WHERE tenant_id = ? AND is_super_admin = 0";
            $usersParams = [$tenantId];
            if (in_array($user['role'] ?? '', ['staff', 'commercial'])) {
                $usersSql .= " AND id = ?";
                $usersParams[] = $user['id'];
            }
            $users = Database::fetchAll($usersSql, $usersParams);

            $entriesSql = "SELECT user_id, date, SUM(hours)+0 as hours 
                           FROM time_entries 
                           WHERE tenant_id = ? AND date BETWEEN ? AND ? 
                           GROUP BY user_id, date";
            $entries = Database::fetchAll($entriesSql, [$tenantId, $from, $to]);

            $entriesByUser = [];
            foreach ($entries as $entry) {
                $entriesByUser[$entry['user_id']][$entry['date']] = (float)$entry['hours'];
            }

            $dateRange = [];
            $curr = strtotime($from);
            $last = strtotime($to);
            while ($curr <= $last) {
                $dateRange[] = date('Y-m-d', $curr);
                $curr = strtotime('+1 day', $curr);
            }

            $result = [];
            foreach ($users as $u) {
                $userDays = [];
                foreach ($dateRange as $d) {
                    $userDays[] = [
                        'date' => $d,
                        'hours' => $entriesByUser[$u['id']][$d] ?? 0
                    ];
                }
                $result[] = [
                    'id' => $u['id'],
                    'name' => $u['name'],
                    'weekly_capacity' => (float)$u['weekly_capacity'],
                    'days' => $userDays
                ];
            }
            return Response::json($result);
        } catch (\Throwable $e) {
            return Response::error("Heatmap Error: " . $e->getMessage());
        }
    }

    public function getAuditLog() {
        try {
            $tenantId = Context::getTenantId();
            
            // Paginación
            $limit = (int)Request::input('limit', 10);
            $page  = (int)Request::input('page', 1);
            $offset = ($page - 1) * $limit;

            // Filtros básicos
            $where = "WHERE te.tenant_id = ?";
            $params = [$tenantId];

            if ($startDate = Request::input('start_date')) { $where .= " AND tel.created_at >= ?"; $params[] = $startDate . ' 00:00:00'; }
            if ($endDate = Request::input('end_date'))     { $where .= " AND tel.created_at <= ?"; $params[] = $endDate . ' 23:59:59'; }
            if ($projectId = Request::input('project_id')) { $where .= " AND te.project_id = ?"; $params[] = $projectId; }
            if ($ownerId = Request::input('owner_id'))     { $where .= " AND te.user_id = ?"; $params[] = $ownerId; }

            $total = (int)Database::fetchOne("
                SELECT COUNT(*) as total 
                FROM time_entry_logs tel
                JOIN time_entries te ON tel.time_entry_id = te.id
                $where", $params)['total'];

            $sql = "SELECT tel.*, 
                           u_actor.name as actor_name,
                           u_owner.name as owner_name,
                           u_owner.id as owner_id,
                           te.date as entry_date, 
                           te.hours as entry_hours,
                           te.description as entry_description,
                           te.created_at as entry_created_at,
                           p.name as project_name,
                           tm.name as task_name,
                           (SELECT COUNT(*) FROM time_entry_logs WHERE time_entry_id = te.id AND to_status = 'rejected') as rejection_count
                    FROM time_entry_logs tel 
                    JOIN users u_actor ON tel.user_id = u_actor.id 
                    JOIN time_entries te ON tel.time_entry_id = te.id
                    JOIN users u_owner ON te.user_id = u_owner.id
                    JOIN projects p ON te.project_id = p.id
                    JOIN tasks_master tm ON te.task_id = tm.id
                    $where 
                    ORDER BY tel.created_at DESC 
                    LIMIT $limit OFFSET $offset";

            return Response::json([
                'data' => Database::fetchAll($sql, $params),
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'totalPages' => ceil($total / $limit)
            ]);
        } catch (\Throwable $e) {
            return Response::error("Audit Log Error: " . $e->getMessage());
        }
    }

    public function getPredictiveAlerts() {
        try {
            $tenantId = Context::getTenantId();
            
            $projects = Database::fetchAll("
                SELECT id, name, budget_hours, status 
                FROM projects 
                WHERE tenant_id = ? AND budget_hours > 0
            ", [$tenantId]);

            $alerts = [];
            foreach ($projects as $project) {
                $status = mb_strtolower($project['status']);
                if ($status === 'terminado' || $status === 'cancelado') continue;

                $projectId = $project['id'];
                
                // 1. Horas y Burn Rate
                $consumedHours = (float)Database::fetchOne("
                    SELECT SUM(hours) as total FROM time_entries 
                    WHERE project_id = ? AND status IN ('approved', 'submitted')
                ", [$projectId])['total'] ?? 0;

                $avgWeekly = (float)Database::fetchOne("
                    SELECT SUM(hours) / 4 as avg_weekly FROM time_entries
                    WHERE project_id = ? AND status IN ('approved', 'submitted')
                      AND date >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
                ", [$projectId])['avg_weekly'] ?? 0;

                // 2. Mix de Seniority (Horas de perfiles 'Senior')
                $totalHours = (float)Database::fetchOne("
                    SELECT SUM(hours) FROM time_entries WHERE project_id = ?
                ", [$projectId])['SUM(hours)'] ?? 1;

                $seniorHours = (float)Database::fetchOne("
                    SELECT SUM(te.hours) 
                    FROM time_entries te 
                    JOIN users u ON te.user_id = u.id 
                    WHERE te.project_id = ? AND u.seniority = 'Senior'
                ", [$projectId])['SUM(te.hours)'] ?? 0;

                $seniorPercent = round(($seniorHours / $totalHours) * 100);

                // 3. Cálculos Proyectivos
                $remainingHours = (float)$project['budget_hours'] - $consumedHours;
                $percentageUsed = ($consumedHours / (float)$project['budget_hours']) * 100;
                $weeksRemaining = $avgWeekly > 0 ? $remainingHours / $avgWeekly : null;
                
                // Mapeo de prioridad para el frontend
                $priority = 'Low';
                if ($percentageUsed > 90 || ($weeksRemaining !== null && $weeksRemaining < 2)) $priority = 'High';
                elseif ($percentageUsed > 75 || ($weeksRemaining !== null && $weeksRemaining < 4)) $priority = 'Medium';

                $alerts[] = [
                    'projectId'   => $projectId,
                    'projectName' => $project['name'],
                    'priority'    => $priority,
                    'metrics'     => [
                        'budget_hours'             => (float)$project['budget_hours'],
                        'consumed_hours'           => $consumedHours,
                        'budget_exhausted_percent' => round($percentageUsed, 1),
                        'avg_weekly_hours'         => round($avgWeekly, 1),
                        'weeks_to_depletion'       => $weeksRemaining !== null ? round($weeksRemaining, 1) : 'Indefinido',
                        'seniority_mix'            => [
                            'senior_percent' => $seniorPercent
                        ]
                    ]
                ];
            }

            return Response::json(['alerts' => $alerts]);
        } catch (\Throwable $e) {
            return Response::error("Predictive Alerts Error: " . $e->getMessage());
        }
    }
}
