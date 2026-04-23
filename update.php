<?php
declare(strict_types=1);

/**
 * TimeTracker - Update Script
 * This script handles database schema updates robustly.
 */

header('Content-Type: application/json');

require_once __DIR__ . '/api/config.php';
require_once __DIR__ . '/api/src/Database.php';

use App\Database;

// Simple security check
$update_key = 'PMaaS_2026';
if (($_GET['key'] ?? '') !== $update_key) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized update attempt.']);
    exit;
}

function columnExists($pdo, $table, $column) {
    try {
        $result = $pdo->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
        return $result->rowCount() > 0;
    } catch (Exception $e) {
        return false;
    }
}

try {
    $pdo = Database::getInstance();
    echo "Starting database updates...\n";

    // 1. Projects Table
    try {
        if (columnExists($pdo, 'projects', 'budget')) {
            $pdo->exec("ALTER TABLE projects CHANGE COLUMN budget budget_money DECIMAL(15, 2) DEFAULT 0");
            echo "- Renamed budget to budget_money in projects.\n";
        }
        if (!columnExists($pdo, 'projects', 'budget_hours')) {
            $pdo->exec("ALTER TABLE projects ADD COLUMN budget_hours DECIMAL(15, 2) DEFAULT 0 AFTER name");
            echo "- Added budget_hours to projects.\n";
        }
        
        // Standardize status
        $pdo->exec("ALTER TABLE projects MODIFY COLUMN status VARCHAR(50) DEFAULT 'Activo'");
        $pdo->exec("UPDATE projects SET status = 'Activo' WHERE status IN ('active', 'Activo') OR status IS NULL");
        $pdo->exec("UPDATE projects SET status = 'Pausado' WHERE status IN ('paused', 'Pausado')");
        $pdo->exec("UPDATE projects SET status = 'Finalizado' WHERE status IN ('finished', 'Finalizado')");
        $pdo->exec("UPDATE projects SET status = 'Facturado' WHERE status IN ('invoiced', 'Facturado')");
        $pdo->exec("ALTER TABLE projects MODIFY COLUMN status ENUM('Activo', 'Pausado', 'Facturado', 'Finalizado') DEFAULT 'Activo'");
        echo "- Projects status standardized to Spanish ENUM.\n";
    } catch (PDOException $e) { echo "! Projects update: " . $e->getMessage() . "\n"; }

    // 2. Clients Table
    try {
        if (!columnExists($pdo, 'clients', 'legal_name')) {
            $pdo->exec("ALTER TABLE clients ADD COLUMN legal_name VARCHAR(255) AFTER name");
        }
        if (!columnExists($pdo, 'clients', 'tax_id')) {
            $pdo->exec("ALTER TABLE clients ADD COLUMN tax_id VARCHAR(50) AFTER legal_name");
        }
        if (!columnExists($pdo, 'clients', 'created_at')) {
            $pdo->exec("ALTER TABLE clients ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER address");
        }
        echo "- Clients table columns verified.\n";
    } catch (PDOException $e) { echo "! Clients update: " . $e->getMessage() . "\n"; }

    // 3. Users Table (Missing in previous run)
    try {
        if (!columnExists($pdo, 'users', 'position_id')) {
            $pdo->exec("ALTER TABLE users ADD COLUMN position_id INT NULL AFTER role");
        }
        if (!columnExists($pdo, 'users', 'seniority')) {
            $pdo->exec("ALTER TABLE users ADD COLUMN seniority VARCHAR(50) NULL AFTER position_id");
        }
        if (!columnExists($pdo, 'users', 'hourly_cost')) {
            $pdo->exec("ALTER TABLE users ADD COLUMN hourly_cost DECIMAL(15, 2) DEFAULT 0 AFTER seniority");
        }
        if (!columnExists($pdo, 'users', 'weekly_capacity')) {
            $pdo->exec("ALTER TABLE users ADD COLUMN weekly_capacity DECIMAL(5, 2) DEFAULT 40.00 AFTER hourly_cost");
        }
        if (!columnExists($pdo, 'users', 'language')) {
            $pdo->exec("ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT 'es_AR' AFTER weekly_capacity");
        }
        echo "- Users table columns verified.\n";
    } catch (PDOException $e) { echo "! Users update: " . $e->getMessage() . "\n"; }

    // 4. Time Entries Table
    try {
        if (columnExists($pdo, 'time_entries', 'duration')) {
            $pdo->exec("ALTER TABLE time_entries CHANGE COLUMN duration hours DECIMAL(5, 2) NOT NULL");
            echo "- Renamed duration to hours in time_entries.\n";
        }
        if (!columnExists($pdo, 'time_entries', 'task_id')) {
            $pdo->exec("ALTER TABLE time_entries ADD COLUMN task_id INT NULL AFTER project_id");
        }
        if (!columnExists($pdo, 'time_entries', 'status')) {
            $pdo->exec("ALTER TABLE time_entries ADD COLUMN status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft' AFTER date");
        }
        if (!columnExists($pdo, 'time_entries', 'rejection_reason')) {
            $pdo->exec("ALTER TABLE time_entries ADD COLUMN rejection_reason TEXT AFTER status");
        }
        if (!columnExists($pdo, 'time_entries', 'reviewed_by')) {
            $pdo->exec("ALTER TABLE time_entries ADD COLUMN reviewed_by INT NULL AFTER rejection_reason");
        }
        if (!columnExists($pdo, 'time_entries', 'reviewed_at')) {
            $pdo->exec("ALTER TABLE time_entries ADD COLUMN reviewed_at TIMESTAMP NULL AFTER reviewed_by");
        }
        if (!columnExists($pdo, 'time_entries', 'approved_at')) {
            $pdo->exec("ALTER TABLE time_entries ADD COLUMN approved_at TIMESTAMP NULL AFTER status");
        }
        if (!columnExists($pdo, 'time_entries', 'rejected_at')) {
            $pdo->exec("ALTER TABLE time_entries ADD COLUMN rejected_at TIMESTAMP NULL AFTER approved_at");
        }
        echo "- Time entries table columns verified.\n";
    } catch (PDOException $e) { echo "! Time entries update: " . $e->getMessage() . "\n"; }

    // 5. Create Tables if not exist
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS client_contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NULL,
            phone VARCHAR(100) NULL,
            position VARCHAR(100) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        )");
        
        $pdo->exec("CREATE TABLE IF NOT EXISTS tasks_master (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS positions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS position_costs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            position_id INT NOT NULL,
            seniority VARCHAR(50) NOT NULL,
            hourly_cost DECIMAL(15, 2) DEFAULT 0,
            UNIQUE KEY pos_seniority (position_id, seniority),
            FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS time_entry_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            time_entry_id INT NOT NULL,
            from_status VARCHAR(50) NULL,
            to_status VARCHAR(50) NOT NULL,
            user_id INT NOT NULL,
            comment TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (time_entry_id) REFERENCES time_entries(id) ON DELETE CASCADE
        )");
        
        $pdo->exec("CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            message TEXT NOT NULL,
            type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS permissions (
            role VARCHAR(50) NOT NULL,
            feature VARCHAR(100) NOT NULL,
            can_access TINYINT(1) DEFAULT 0,
            PRIMARY KEY (role, feature)
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS kanban_tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            project_id INT NOT NULL,
            user_id INT NOT NULL,
            description TEXT NOT NULL,
            priority ENUM('Baja', 'Media', 'Alta') DEFAULT 'Baja',
            task_type_id INT NULL,
            estimated_hours DECIMAL(5, 2) DEFAULT 0,
            status ENUM('ToDo', 'Doing', 'Done', 'Archivo') DEFAULT 'ToDo',
            started_at TIMESTAMP NULL,
            completed_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (task_type_id) REFERENCES tasks_master(id) ON DELETE SET NULL
        )");

        // Add created_by if missing
        try {
            $pdo->exec("ALTER TABLE kanban_tasks ADD COLUMN created_by INT NULL AFTER user_id, 
                        ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL");
        } catch (Exception $e) { /* Column probably exists */ }

        // Initial task to created_by sync
        $pdo->exec("UPDATE kanban_tasks SET created_by = user_id WHERE created_by IS NULL");
        
        echo "- Master, log and kanban tables verified.\n";
    } catch (PDOException $e) { echo "! Table creation: " . $e->getMessage() . "\n"; }

    // 6. Seed Permissions if empty
    try {
        $count = $pdo->query("SELECT COUNT(*) FROM permissions")->fetchColumn();
        if ($count == 0) {
            $pdo->exec("INSERT IGNORE INTO permissions (role, feature, can_access) VALUES 
                ('admin', 'dashboard', 1), ('admin', 'tracker', 1), ('admin', 'approvals', 1),
                ('admin', 'settings', 1), ('admin', 'clients', 1), ('admin', 'projects', 1),
                ('admin', 'users', 1), ('admin', 'costs', 1), ('admin', 'report_heatmaps', 1),
                ('admin', 'report_audit', 1), ('admin', 'report_ai', 1), ('admin', 'report_custom', 1), ('admin', 'kanban', 1),
                ('c-level', 'dashboard', 1), ('c-level', 'tracker', 1), ('c-level', 'approvals', 1),
                ('c-level', 'clients', 1), ('c-level', 'projects', 1), ('c-level', 'costs', 1),
                ('c-level', 'report_heatmaps', 1), ('c-level', 'report_audit', 1), 
                ('c-level', 'report_ai', 1), ('c-level', 'report_custom', 1), ('c-level', 'kanban', 1),
                ('commercial', 'dashboard', 1), ('commercial', 'tracker', 1), 
                ('commercial', 'clients', 1), ('commercial', 'projects', 1), ('commercial', 'kanban', 1),
                ('staff', 'dashboard', 1), ('staff', 'tracker', 1), ('staff', 'kanban', 1)
            ");
            echo "- Initial permissions seeded.\n";
        } else {
            // Ensure report_audit and kanban are present even if table was already seeded
            $pdo->exec("INSERT IGNORE INTO permissions (role, feature, can_access) VALUES 
                ('admin', 'report_audit', 1),
                ('admin', 'kanban', 1),
                ('c-level', 'report_audit', 1),
                ('c-level', 'kanban', 1),
                ('staff', 'kanban', 1),
                ('commercial', 'kanban', 1)
            ");
        }
    } catch (PDOException $e) { echo "! Permissions seeding: " . $e->getMessage() . "\n"; }

    echo "\nAll updates completed successfully.\n";

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
