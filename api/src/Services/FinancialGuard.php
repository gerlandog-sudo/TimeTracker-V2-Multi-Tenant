<?php

namespace App\Services;

use App\Core\Database;

/**
 * FinancialGuard
 *
 * Doble barrera de seguridad para métricas financieras.
 * 1) Filtra el catálogo antes de enviarlo al frontend.
 * 2) Re-valida en cada ejecución de consulta.
 */
class FinancialGuard {

    /**
     * Verifica si el rol del usuario tiene acceso financiero.
     * Fuente de verdad: roles.financial_access = 1
     */
    public static function hasFinancialAccess(int $roleId, int $tenantId): bool {
        if ($roleId <= 0) return false;

        $row = Database::fetchOne(
            "SELECT financial_access FROM roles WHERE id = ? AND tenant_id = ? LIMIT 1",
            [$roleId, $tenantId]
        );

        // Fallback: role_id 1 (Admin) y 2 (C-Level) siempre tienen acceso
        if (!$row) {
            return in_array($roleId, [1, 2]);
        }

        return (int)($row['financial_access'] ?? 0) === 1;
    }

    /**
     * Verifica que todas las métricas solicitadas sean accesibles para el rol.
     * Devuelve true si OK, false si hay alguna financiera bloqueada.
     */
    public static function check(array $metrics, int $roleId, int $tenantId): bool {
        if (self::hasFinancialAccess($roleId, $tenantId)) {
            return true;
        }

        $financialMetrics = QueryEngine::getFinancialMetricKeys();
        foreach ($metrics as $metric) {
            if (in_array($metric, $financialMetrics, true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Devuelve la lista de métricas bloqueadas para un rol dado.
     */
    public static function getBlockedMetrics(array $metrics, int $roleId, int $tenantId): array {
        if (self::hasFinancialAccess($roleId, $tenantId)) {
            return [];
        }

        $financialMetrics = QueryEngine::getFinancialMetricKeys();
        return array_values(array_filter($metrics, fn($m) => in_array($m, $financialMetrics, true)));
    }
}
