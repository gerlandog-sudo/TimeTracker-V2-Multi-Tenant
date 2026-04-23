<?php

namespace App\Controllers;

use App\Core\Database;
use App\Core\Response;
use App\Core\Context;
use App\Core\Request;

class GenericController {

    // Cache de tablas que tienen tenant_id
    private static $tenantCache = [];

    private function hasTenantId($table) {
        if (!isset(self::$tenantCache[$table])) {
            try {
                $cols = Database::fetchAll("SHOW COLUMNS FROM `$table` LIKE 'tenant_id'");
                self::$tenantCache[$table] = !empty($cols);
            } catch (\Throwable $e) {
                self::$tenantCache[$table] = false;
            }
        }
        return self::$tenantCache[$table];
    }

    private function getAlias($t) {
        $map = [
            'users'          => 'u',
            'clients'        => 'c',
            'projects'       => 'p',
            'time_entries'   => 'te',
            'kanban_tasks'   => 'kt',
            'positions'      => 'pos',
            'tasks_master'   => 'tm',
            'position_costs' => 'pc',
            'costs'          => 'co',
            'roles'          => 'ro',
            'audit_logs'     => 'al',
            'notifications'  => 'no',
        ];
        return $map[$t] ?? 'x';
    }

    public function list($table) {
        try {
            $alias  = $this->getAlias($table);
            $where  = $this->hasTenantId($table)
                      ? Context::getTenantFilter($alias)
                      : "1=1";
            $params = [];

            $ignore = ['path', 'page', 'limit', 't', 'participating', 'from', 'to', 'debug', 'status'];

            foreach ($_GET as $k => $v) {
                if (!in_array($k, $ignore) && $v !== '' && $v !== null && $v !== 'all') {
                    $where .= " AND $alias.`$k` = ?";
                    $params[] = $v;
                }
            }

            if (isset($_GET['status']) && $_GET['status'] !== 'all' && !empty($_GET['status'])) {
                $where .= " AND $alias.`status` = ?";
                $params[] = $_GET['status'];
            }

            $limit  = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $page   = (int)($_GET['page'] ?? 1);
            $offset = ($page - 1) * $limit;

            $select = "$alias.*";
            $joins  = "";
            if ($table === 'position_costs') {
                $select .= ", pos2.name as position_name";
                $joins   = " LEFT JOIN positions pos2 ON $alias.position_id = pos2.id";
            }

            $sql      = "SELECT $select FROM `$table` $alias $joins WHERE $where ORDER BY $alias.id DESC LIMIT $limit OFFSET $offset";
            $countSql = "SELECT COUNT(*) as count FROM `$table` $alias $joins WHERE $where";

            $data  = Database::fetchAll($sql, $params);
            $total = (int)(Database::fetchOne($countSql, $params)['count'] ?? 0);

            return Response::json([
                'data'       => $data,
                'total'      => $total,
                'page'       => $page,
                'limit'      => $limit,
                'totalPages' => ceil($total / max($limit, 1))
            ]);

        } catch (\Throwable $e) {
            return Response::error("Error [$table]: " . $e->getMessage());
        }
    }

    public function create($table) {
        try {
            $body = Request::getBody();
            if ($this->hasTenantId($table)) {
                $body['tenant_id'] = Context::getTenantId();
            }
            if (isset($body['password'])) {
                $body['password'] = password_hash($body['password'], PASSWORD_BCRYPT);
            }
            $fields = array_keys($body);
            $cols   = implode(', ', array_map(fn($f) => "`$f`", $fields));
            $ph     = implode(',', array_fill(0, count($fields), '?'));
            Database::query("INSERT INTO `$table` ($cols) VALUES ($ph)", array_values($body));
            return Response::json(['success' => true, 'id' => Database::connect()->lastInsertId()]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage());
        }
    }

    public function update($table) {
        try {
            $body = Request::getBody();
            $id   = $body['id'] ?? null;
            unset($body['id'], $body['tenant_id']);
            if (isset($body['password']) && !empty($body['password'])) {
                $body['password'] = password_hash($body['password'], PASSWORD_BCRYPT);
            } else {
                unset($body['password']);
            }
            $set      = implode(', ', array_map(fn($f) => "`$f` = ?", array_keys($body)));
            $params   = array_values($body);
            $params[] = $id;
            Database::query("UPDATE `$table` SET $set WHERE id = ?", $params);
            return Response::json(['success' => true]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage());
        }
    }

    public function delete($table, $id) {
        try {
            Database::query("DELETE FROM `$table` WHERE id = ?", [$id]);
            return Response::json(['success' => true]);
        } catch (\Throwable $e) {
            return Response::error($e->getMessage());
        }
    }
}
