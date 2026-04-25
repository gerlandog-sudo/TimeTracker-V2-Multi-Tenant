<?php

namespace App\Services;

/**
 * QueryEngine
 *
 * Motor de consultas SQL dinámicas para el módulo de Reportes Insights.
 */
class QueryEngine {

    const MAX_ROWS = 5000;

    private static array $CATALOG = [

        // ── PROYECTOS Y CLIENTES ─────────────────────────────────────────────
        'project.name' => [
            'type'       => 'dimension',
            'sql'        => 'p.name',
            'label_es'   => 'Proyecto',
            'label_en'   => 'Project',
            'financial'  => false,
            'table_deps' => ['projects'],
        ],
        'project.status' => [
            'type'       => 'dimension',
            'sql'        => 'p.status',
            'label_es'   => 'Estado del Proyecto',
            'label_en'   => 'Project Status',
            'financial'  => false,
            'table_deps' => ['projects'],
        ],
        'project.budget_hours' => [
            'type'       => 'dimension',
            'sql'        => 'p.budget_hours',
            'label_es'   => 'Presupuesto en Horas',
            'label_en'   => 'Budgeted Hours',
            'financial'  => false,
            'table_deps' => ['projects'],
        ],
        'project.budget_money' => [
            'type'       => 'dimension',
            'sql'        => 'p.budget_money',
            'label_es'   => 'Presupuesto en Dinero',
            'label_en'   => 'Budgeted Money',
            'financial'  => true,
            'table_deps' => ['projects'],
        ],
        'client.name' => [
            'type'       => 'dimension',
            'sql'        => 'c.name',
            'label_es'   => 'Cliente',
            'label_en'   => 'Client',
            'financial'  => false,
            'table_deps' => ['projects', 'clients'],
        ],
        'client.legal_name' => [
            'type'       => 'dimension',
            'sql'        => 'c.legal_name',
            'label_es'   => 'Razón Social Cliente',
            'label_en'   => 'Client Legal Name',
            'financial'  => false,
            'table_deps' => ['projects', 'clients'],
        ],
        'client.tax_id' => [
            'type'       => 'dimension',
            'sql'        => 'c.tax_id',
            'label_es'   => 'Tax ID / CUIT',
            'label_en'   => 'Tax ID',
            'financial'  => false,
            'table_deps' => ['projects', 'clients'],
        ],
        'client.contact' => [
            'type'       => 'dimension',
            'sql'        => 'c.contact_name',
            'label_es'   => 'Contacto Cliente',
            'label_en'   => 'Client Contact',
            'financial'  => false,
            'table_deps' => ['projects', 'clients'],
        ],

        // ── USUARIOS Y ROLES ──────────────────────────────────────────────────
        'user.name' => [
            'type'       => 'dimension',
            'sql'        => 'u.name',
            'label_es'   => 'Colaborador',
            'label_en'   => 'Team Member',
            'financial'  => false,
            'table_deps' => ['users'],
        ],
        'user.email' => [
            'type'       => 'dimension',
            'sql'        => 'u.email',
            'label_es'   => 'Email Colaborador',
            'label_en'   => 'Member Email',
            'financial'  => false,
            'table_deps' => ['users'],
        ],
        'user.role' => [
            'type'       => 'dimension',
            'sql'        => 'r.name',
            'label_es'   => 'Rol de Usuario',
            'label_en'   => 'User Role',
            'financial'  => false,
            'table_deps' => ['users', 'roles'],
        ],
        'user.position' => [
            'type'       => 'dimension',
            'sql'        => 'pos.name',
            'label_es'   => 'Cargo / Posición',
            'label_en'   => 'Position',
            'financial'  => false,
            'table_deps' => ['users', 'positions'],
        ],
        'user.hourly_cost' => [
            'type'       => 'dimension',
            'sql'        => 'u.hourly_cost',
            'label_es'   => 'Costo Hora Colaborador',
            'label_en'   => 'Member Hourly Cost',
            'financial'  => true,
            'table_deps' => ['users'],
        ],

        // ── TRANSACCIONAL: TIME ENTRIES ──────────────────────────────────────
        'entry.description' => [
            'type'       => 'dimension',
            'sql'        => 'te.description',
            'label_es'   => 'Descripción del Trabajo',
            'label_en'   => 'Work Description',
            'financial'  => false,
            'table_deps' => [],
        ],
        'entry.date' => [
            'type'       => 'dimension',
            'sql'        => 'te.date',
            'label_es'   => 'Fecha Registro',
            'label_en'   => 'Entry Date',
            'financial'  => false,
            'table_deps' => [],
        ],
        'entry.status' => [
            'type'       => 'dimension',
            'sql'        => 'te.status',
            'label_es'   => 'Estado Aprobación',
            'label_en'   => 'Entry Status',
            'financial'  => false,
            'table_deps' => [],
        ],

        // ── TRANSACCIONAL: KANBAN ────────────────────────────────────────────
        'kanban.description' => [
            'type'       => 'dimension',
            'sql'        => 'kt.description',
            'label_es'   => 'Tarea Kanban',
            'label_en'   => 'Kanban Task',
            'financial'  => false,
            'table_deps' => ['kanban_tasks'],
        ],
        'kanban.priority' => [
            'type'       => 'dimension',
            'sql'        => 'kt.priority',
            'label_es'   => 'Prioridad Kanban',
            'label_en'   => 'Kanban Priority',
            'financial'  => false,
            'table_deps' => ['kanban_tasks'],
        ],
        'kanban.status' => [
            'type'       => 'dimension',
            'sql'        => 'kt.status',
            'label_es'   => 'Estado Kanban',
            'label_en'   => 'Kanban Status',
            'financial'  => false,
            'table_deps' => ['kanban_tasks'],
        ],

        // ── SISTEMA: AUDITORIA Y NOTIFICACIONES ──────────────────────────────
        'audit.action' => [
            'type'       => 'dimension',
            'sql'        => 'al.action',
            'label_es'   => 'Acción Auditada',
            'label_en'   => 'Audit Action',
            'financial'  => false,
            'table_deps' => ['audit_logs'],
        ],
        'audit.entity' => [
            'type'       => 'dimension',
            'sql'        => 'al.entity_type',
            'label_es'   => 'Entidad Auditada',
            'label_en'   => 'Audit Entity',
            'financial'  => false,
            'table_deps' => ['audit_logs'],
        ],
        'notify.message' => [
            'type'       => 'dimension',
            'sql'        => 'n.message',
            'label_es'   => 'Mensaje Notificación',
            'label_en'   => 'Notification Message',
            'financial'  => false,
            'table_deps' => ['notifications'],
        ],

        // ── MÉTRICAS ─────────────────────────────────────────────────────────
        'hours.sum' => [
            'type'       => 'metric',
            'sql'        => 'SUM(te.hours)',
            'label_es'   => 'Total Horas (Registros)',
            'label_en'   => 'Total Hours (Entries)',
            'financial'  => false,
            'table_deps' => [],
        ],
        'kanban.estimated_sum' => [
            'type'       => 'metric',
            'sql'        => 'SUM(kt.estimated_hours)',
            'label_es'   => 'Total Horas Estimadas (Kanban)',
            'label_en'   => 'Total Est. Hours (Kanban)',
            'financial'  => false,
            'table_deps' => ['kanban_tasks'],
        ],
        'kanban.count' => [
            'type'       => 'metric',
            'sql'        => 'COUNT(kt.id)',
            'label_es'   => 'Cantidad Tareas Kanban',
            'label_en'   => 'Kanban Count',
            'financial'  => false,
            'table_deps' => ['kanban_tasks'],
        ],
        'cost.sum' => [
            'type'       => 'metric',
            'sql'        => 'SUM(te.hours * COALESCE(u.hourly_cost, 0))',
            'label_es'   => 'Costo Operativo Total',
            'label_en'   => 'Total Op. Cost',
            'financial'  => true,
            'table_deps' => ['users'],
        ],
        'margin.calc' => [
            'type'       => 'metric',
            'sql'        => 'ROUND(((MAX(p.budget_money) - SUM(te.hours * COALESCE(u.hourly_cost, 0))) / NULLIF(MAX(p.budget_money), 0)) * 100, 2)',
            'label_es'   => 'Margen Operativo (%)',
            'label_en'   => 'Operating Margin (%)',
            'financial'  => true,
            'table_deps' => ['projects', 'users'],
        ],
    ];

    public static function getFinancialMetricKeys(): array {
        return array_keys(array_filter(self::$CATALOG, fn($f) => $f['financial'] === true));
    }

    public static function getCatalog(bool $hasFinancialAccess): array {
        $result = [];
        foreach (self::$CATALOG as $key => $field) {
            if ($field['financial'] && !$hasFinancialAccess) continue;
            $result[] = [
                'key'       => $key,
                'type'      => $field['type'],
                'label_es'  => $field['label_es'],
                'label_en'  => $field['label_en'],
                'financial' => $field['financial'],
            ];
        }
        return $result;
    }

    public static function validate(array $def): ?string {
        $dimensions = $def['dimensions'] ?? [];
        $metrics    = $def['metrics']    ?? [];
        if (empty($dimensions) && empty($metrics)) return 'Debe seleccionar al menos una dimensión o métrica.';
        foreach ($dimensions as $d) if (!isset(self::$CATALOG[$d])) return "Dimensión no válida: $d";
        foreach ($metrics as $m) if (!isset(self::$CATALOG[$m])) return "Métrica no válida: $m";
        return null;
    }

    public static function build(array $def, int $tenantId): array {
        $dimensions = $def['dimensions'] ?? [];
        $metrics    = $def['metrics']    ?? [];
        $filters    = $def['filters']    ?? [];
        $sort       = $def['sort']       ?? [];
        $limit      = min((int)($def['limit'] ?? self::MAX_ROWS), self::MAX_ROWS);
        $page       = max(1, (int)($def['page'] ?? 1));
        $offset     = ($page - 1) * $limit;

        $requiredTables = [];
        foreach (array_merge($dimensions, $metrics) as $key) {
            foreach (self::$CATALOG[$key]['table_deps'] as $tbl) $requiredTables[$tbl] = true;
        }
        foreach ($filters as $f) {
            foreach (self::$CATALOG[$f['field']]['table_deps'] ?? [] as $tbl) $requiredTables[$tbl] = true;
        }

        $selectParts = [];
        foreach ($dimensions as $key) {
            $alias = self::toAlias($key);
            $selectParts[] = self::$CATALOG[$key]['sql'] . " AS `$alias`";
        }
        foreach ($metrics as $key) {
            $alias = self::toAlias($key);
            $selectParts[] = self::$CATALOG[$key]['sql'] . " AS `$alias`";
        }

        $select = implode(', ', $selectParts);

        // DETERMINAR TABLA BASE
        $hasTimeEntries = false;
        foreach (array_merge($dimensions, $metrics) as $k) {
            if (empty(self::$CATALOG[$k]['table_deps'])) { $hasTimeEntries = true; break; }
        }
        
        $baseTable = 'time_entries';
        $baseAlias = 'te';
        
        if (isset($requiredTables['kanban_tasks']) && !$hasTimeEntries) {
            $baseTable = 'kanban_tasks';
            $baseAlias = 'kt';
        } elseif (isset($requiredTables['audit_logs'])) {
            $baseTable = 'audit_logs';
            $baseAlias = 'al';
        } elseif (isset($requiredTables['notifications'])) {
            $baseTable = 'notifications';
            $baseAlias = 'n';
        }

        $from = "FROM $baseTable $baseAlias";
        $joins = "";

        if ($baseTable === 'time_entries') {
            if (isset($requiredTables['projects'])) $joins .= "\n  JOIN projects p ON te.project_id = p.id AND p.tenant_id = te.tenant_id";
            if (isset($requiredTables['clients']))  $joins .= "\n  JOIN clients c ON p.client_id = c.id AND c.tenant_id = te.tenant_id";
            if (isset($requiredTables['users']))    $joins .= "\n  JOIN users u ON te.user_id = u.id AND u.tenant_id = te.tenant_id";
            if (isset($requiredTables['roles']))    $joins .= "\n  JOIN roles r ON u.role_id = r.id AND r.tenant_id = te.tenant_id";
            if (isset($requiredTables['positions']))$joins .= "\n  LEFT JOIN positions pos ON u.position_id = pos.id AND pos.tenant_id = te.tenant_id";
            if (isset($requiredTables['kanban_tasks']))$joins .= "\n  LEFT JOIN kanban_tasks kt ON te.project_id = kt.project_id AND te.user_id = kt.user_id";
        } elseif ($baseTable === 'kanban_tasks') {
            if (isset($requiredTables['projects'])) $joins .= "\n  JOIN projects p ON kt.project_id = p.id AND p.tenant_id = kt.tenant_id";
            if (isset($requiredTables['clients']))  $joins .= "\n  JOIN clients c ON p.client_id = c.id AND c.tenant_id = kt.tenant_id";
            if (isset($requiredTables['users']))    $joins .= "\n  JOIN users u ON kt.user_id = u.id AND u.tenant_id = kt.tenant_id";
        }

        $whereParts = ["$baseAlias.tenant_id = ?"];
        $params = [(int)$tenantId];

        foreach ($filters as $f) {
            $fieldDef = self::$CATALOG[$f['field']];
            $colSql   = $fieldDef['sql'];
            $op       = $f['op'];
            $val      = $f['value'];

            switch ($op) {
                case 'eq':      $whereParts[] = "$colSql = ?"; $params[] = $val; break;
                case 'neq':     $whereParts[] = "$colSql != ?"; $params[] = $val; break;
                case 'gt':      $whereParts[] = "$colSql > ?"; $params[] = $val; break;
                case 'lt':      $whereParts[] = "$colSql < ?"; $params[] = $val; break;
                case 'gte':     $whereParts[] = "$colSql >= ?"; $params[] = $val; break;
                case 'lte':     $whereParts[] = "$colSql <= ?"; $params[] = $val; break;
                case 'between': $whereParts[] = "$colSql BETWEEN ? AND ?"; $params[] = $val[0]; $params[] = $val[1]; break;
                case 'like':    $whereParts[] = "$colSql LIKE ?"; $params[] = '%' . $val . '%'; break;
                case 'in':
                    $placeholders = implode(',', array_fill(0, count((array)$val), '?'));
                    $whereParts[] = "$colSql IN ($placeholders)";
                    foreach ((array)$val as $v) $params[] = $v;
                    break;
            }
        }

        $where = "WHERE " . implode("\n  AND ", $whereParts);
        $groupBy = '';
        if (!empty($dimensions) && !empty($metrics)) {
            $groupByCols = array_map(fn($k) => self::$CATALOG[$k]['sql'], $dimensions);
            $groupBy = "GROUP BY " . implode(', ', $groupByCols);
        }

        $orderBy = '';
        if (!empty($sort)) {
            $sortParts = [];
            foreach ($sort as $s) {
                $sortKey = $s['field'] ?? '';
                if (!isset(self::$CATALOG[$sortKey])) continue;
                $dir = strtoupper($s['dir'] ?? 'ASC') === 'DESC' ? 'DESC' : 'ASC';
                $sortParts[] = self::$CATALOG[$sortKey]['sql'] . " $dir";
            }
            if (!empty($sortParts)) $orderBy = "ORDER BY " . implode(', ', $sortParts);
        }

        $sql = "SELECT $select\n$from$joins\n$where\n$groupBy\n$orderBy\nLIMIT $limit OFFSET $offset";
        $countSql = "SELECT COUNT(*) AS total FROM (SELECT 1 $from$joins\n$where\n$groupBy) AS _count_wrap";

        return ['sql' => $sql, 'count_sql' => $countSql, 'params' => $params];
    }

    private static function toAlias(string $key): string {
        return str_replace('.', '_', $key);
    }
}
