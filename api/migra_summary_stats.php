<?php
/**
 * MIGRACIÓN: Estadísticas de Proyectos (Triggers)
 * Objetivo: Crear tabla summary_projects_stats y Triggers para cálculo automático.
 */

require_once __DIR__ . '/config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Iniciando creación de infraestructura para estadísticas...\n";

    // 1. Crear tabla de resumen si no existe
    $pdo->exec("CREATE TABLE IF NOT EXISTS `summary_projects_stats` (
        `project_id` int(11) NOT NULL,
        `actual_hours` decimal(15,2) DEFAULT 0.00,
        `actual_cost` decimal(15,2) DEFAULT 0.00,
        `actual_revenue` decimal(15,2) DEFAULT 0.00,
        `last_updated` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`project_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    echo "- Tabla summary_projects_stats lista.\n";

    // 2. Poblar inicialmente la tabla con datos existentes
    $pdo->exec("INSERT INTO summary_projects_stats (project_id, actual_hours, actual_cost, actual_revenue)
                SELECT 
                    p.id as project_id,
                    COALESCE(SUM(t.hours), 0) as actual_hours,
                    COALESCE(SUM(t.hours * COALESCE(u.hourly_cost, 0)), 0) as actual_cost,
                    COALESCE(SUM(t.hours * COALESCE(pc.hourly_cost, 0)), 0) as actual_revenue
                FROM projects p
                LEFT JOIN time_entries t ON p.id = t.project_id AND t.status = 'approved'
                LEFT JOIN users u ON t.user_id = u.id
                LEFT JOIN position_costs pc ON u.position_id = pc.position_id 
                     AND u.seniority = pc.seniority 
                     AND pc.tenant_id = t.tenant_id
                GROUP BY p.id
                ON DUPLICATE KEY UPDATE 
                    actual_hours = VALUES(actual_hours),
                    actual_cost = VALUES(actual_cost),
                    actual_revenue = VALUES(actual_revenue);");
    echo "- Datos iniciales sincronizados.\n";

    // 3. Crear Triggers para mantener la tabla actualizada automáticamente
    
    // Drop existing triggers to avoid errors
    $pdo->exec("DROP TRIGGER IF EXISTS trg_time_entries_insert;");
    $pdo->exec("DROP TRIGGER IF EXISTS trg_time_entries_update;");
    $pdo->exec("DROP TRIGGER IF EXISTS trg_time_entries_delete;");

    // Trigger INSERT
    $pdo->exec("
    CREATE TRIGGER trg_time_entries_insert AFTER INSERT ON time_entries
    FOR EACH ROW
    BEGIN
        IF NEW.status = 'approved' THEN
            INSERT INTO summary_projects_stats (project_id, actual_hours, actual_cost, actual_revenue)
            SELECT 
                NEW.project_id,
                NEW.hours,
                (NEW.hours * COALESCE(u.hourly_cost, 0)),
                (NEW.hours * COALESCE(pc.hourly_cost, 0))
            FROM users u
            LEFT JOIN position_costs pc ON u.position_id = pc.position_id 
                 AND u.seniority = pc.seniority 
                 AND pc.tenant_id = NEW.tenant_id
            WHERE u.id = NEW.user_id
            ON DUPLICATE KEY UPDATE 
                actual_hours = actual_hours + VALUES(actual_hours),
                actual_cost = actual_cost + VALUES(actual_cost),
                actual_revenue = actual_revenue + VALUES(actual_revenue);
        END IF;
    END;");

    // Trigger UPDATE
    $pdo->exec("
    CREATE TRIGGER trg_time_entries_update AFTER UPDATE ON time_entries
    FOR EACH ROW
    BEGIN
        -- Restar valores viejos si estaban aprobados
        IF OLD.status = 'approved' THEN
            UPDATE summary_projects_stats SET 
                actual_hours = actual_hours - OLD.hours,
                actual_cost = actual_cost - (OLD.hours * (SELECT COALESCE(hourly_cost, 0) FROM users WHERE id = OLD.user_id)),
                actual_revenue = actual_revenue - (OLD.hours * (SELECT COALESCE(pc.hourly_cost, 0) 
                                                               FROM users u 
                                                               LEFT JOIN position_costs pc ON u.position_id = pc.position_id 
                                                                    AND u.seniority = pc.seniority 
                                                                    AND pc.tenant_id = OLD.tenant_id
                                                               WHERE u.id = OLD.user_id))
            WHERE project_id = OLD.project_id;
        END IF;

        -- Sumar valores nuevos si están aprobados
        IF NEW.status = 'approved' THEN
            INSERT INTO summary_projects_stats (project_id, actual_hours, actual_cost, actual_revenue)
            SELECT 
                NEW.project_id,
                NEW.hours,
                (NEW.hours * COALESCE(u.hourly_cost, 0)),
                (NEW.hours * COALESCE(pc.hourly_cost, 0))
            FROM users u
            LEFT JOIN position_costs pc ON u.position_id = pc.position_id 
                 AND u.seniority = pc.seniority 
                 AND pc.tenant_id = NEW.tenant_id
            WHERE u.id = NEW.user_id
            ON DUPLICATE KEY UPDATE 
                actual_hours = actual_hours + VALUES(actual_hours),
                actual_cost = actual_cost + VALUES(actual_cost),
                actual_revenue = actual_revenue + VALUES(actual_revenue);
        END IF;
    END;");

    // Trigger DELETE
    $pdo->exec("
    CREATE TRIGGER trg_time_entries_delete AFTER DELETE ON time_entries
    FOR EACH ROW
    BEGIN
        IF OLD.status = 'approved' THEN
            UPDATE summary_projects_stats SET 
                actual_hours = actual_hours - OLD.hours,
                actual_cost = actual_cost - (OLD.hours * (SELECT COALESCE(hourly_cost, 0) FROM users WHERE id = OLD.user_id)),
                actual_revenue = actual_revenue - (OLD.hours * (SELECT COALESCE(pc.hourly_cost, 0) 
                                                               FROM users u 
                                                               LEFT JOIN position_costs pc ON u.position_id = pc.position_id 
                                                                    AND u.seniority = pc.seniority 
                                                                    AND pc.tenant_id = OLD.tenant_id
                                                               WHERE u.id = OLD.user_id))
            WHERE project_id = OLD.project_id;
        END IF;
    END;");

    echo "- Triggers creados exitosamente.\n";
    echo "\n>>> PROCESO FINALIZADO. La tabla summary_projects_stats está ahora activa y sincronizada.\n";

} catch (Exception $e) {
    die("ERROR EN MIGRACIÓN: " . $e->getMessage());
}
