<?php
require_once __DIR__ . '/src/Database.php';
require_once __DIR__ . '/config.php';

$key = $_GET['key'] ?? '';
if ($key !== JWT_SECRET) {
    die('Unauthorized');
}

error_reporting(E_ALL);
ini_set('display_errors', '1');

try {
    echo "Starting update process...<br>";
    
    if (!class_exists('\\App\\Database')) {
        echo "Critial Error: Class \\App\\Database not found even after require_once.<br>";
        echo "Check if api/src/Database.php exists and has 'namespace App;' and 'class Database'.<br>";
        exit;
    }

    // Disable FK checks to allow creating tables in any order
    \App\Database::query("SET FOREIGN_KEY_CHECKS = 0");

    // 1. Core Tables
    echo "Creating core tables...<br>";
    
    \App\Database::query("
        CREATE TABLE IF NOT EXISTS clients (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            legal_name VARCHAR(255),
            tax_id VARCHAR(50),
            address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    \App\Database::query("
        CREATE TABLE IF NOT EXISTS client_contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(50),
            position VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    \App\Database::query("
        CREATE TABLE IF NOT EXISTS projects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            budget_hours DECIMAL(10, 2) DEFAULT 0,
            budget_money DECIMAL(15, 2) DEFAULT 0,
            status ENUM('Activo', 'Inactivo', 'Finalizado') DEFAULT 'Activo',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    \App\Database::query("
        CREATE TABLE IF NOT EXISTS positions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    \App\Database::query("
        CREATE TABLE IF NOT EXISTS seniorities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    \App\Database::query("
        CREATE TABLE IF NOT EXISTS position_costs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            position_id INT NOT NULL,
            seniority VARCHAR(100) NOT NULL,
            hourly_cost DECIMAL(10, 2) NOT NULL,
            FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    \App\Database::query("
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role ENUM('admin', 'c-level', 'commercial', 'staff') DEFAULT 'staff',
            position_id INT,
            seniority VARCHAR(100),
            hourly_cost DECIMAL(10, 2) DEFAULT 0,
            weekly_capacity DECIMAL(5, 2) DEFAULT 40,
            profile_id INT,
            seniority_id INT,
            language VARCHAR(10) DEFAULT 'es_AR',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    \App\Database::query("
        CREATE TABLE IF NOT EXISTS tasks_master (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            is_archived TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // Add is_archived if it doesn't exist
    $taskArchivedExists = \App\Database::fetchOne("SHOW COLUMNS FROM tasks_master LIKE 'is_archived'");
    if (!$taskArchivedExists) {
        \App\Database::query("ALTER TABLE tasks_master ADD COLUMN is_archived TINYINT(1) DEFAULT 0 AFTER name");
    }

    \App\Database::query("
        CREATE TABLE IF NOT EXISTS time_entries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            project_id INT NOT NULL,
            task_id INT NOT NULL,
            description TEXT,
            hours DECIMAL(5, 2) NOT NULL,
            date DATE NOT NULL,
            status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
            approved_by INT,
            rejection_reason TEXT,
            submitted_at DATETIME,
            approved_at DATETIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (task_id) REFERENCES tasks_master(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    \App\Database::query("
        CREATE TABLE IF NOT EXISTS system_config (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company_name VARCHAR(255) DEFAULT 'TimeTracker',
            logo_url TEXT,
            primary_color VARCHAR(7) DEFAULT '#3b82f6',
            secondary_color VARCHAR(7) DEFAULT '#1f2937',
            accent_color VARCHAR(7) DEFAULT '#f59e0b',
            sidebar_bg VARCHAR(7) DEFAULT '#ffffff',
            sidebar_text VARCHAR(7) DEFAULT '#1f2937',
            currency VARCHAR(10) DEFAULT 'USD',
            color_approved VARCHAR(7) DEFAULT '#10b981',
            color_rejected VARCHAR(7) DEFAULT '#ef4444',
            color_submitted VARCHAR(7) DEFAULT '#3b82f6',
            color_draft VARCHAR(7) DEFAULT '#9ca3af'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // Initialize system_config if empty
    $configExists = \App\Database::fetchOne("SELECT id FROM system_config LIMIT 1");
    if (!$configExists) {
        \App\Database::query("INSERT INTO system_config (id) VALUES (1)");
    }

    echo "Creating extended tables...<br>";

    // Meta tables and Permissions
    $permissionsRoleExists = \App\Database::fetchOne("SHOW COLUMNS FROM permissions LIKE 'role'");
    if ($permissionsRoleExists) {
        \App\Database::query("DROP TABLE permissions");
    }

    \App\Database::query("
        CREATE TABLE IF NOT EXISTS permissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            role_id INT NOT NULL,
            feature VARCHAR(100) NOT NULL,
            can_access TINYINT(1) DEFAULT 0,
            UNIQUE KEY role_feature (role_id, feature)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    \App\Database::query("
        CREATE TABLE IF NOT EXISTS kanban_tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            project_id INT NOT NULL,
            user_id INT NOT NULL,
            description TEXT NOT NULL,
            priority VARCHAR(20) DEFAULT 'Low',
            task_type_id INT,
            estimated_hours DECIMAL(5, 2) DEFAULT 0,
            status VARCHAR(20) DEFAULT 'ToDo',
            started_at DATETIME,
            completed_at DATETIME,
            created_by INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    \App\Database::query("
        CREATE TABLE IF NOT EXISTS time_entry_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            time_entry_id INT NOT NULL,
            from_status VARCHAR(50),
            to_status VARCHAR(50) NOT NULL,
            user_id INT NOT NULL,
            comment TEXT,
            created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
            FOREIGN KEY (time_entry_id) REFERENCES time_entries(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    \App\Database::query("
        CREATE TABLE IF NOT EXISTS password_resets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            otp VARCHAR(10) NOT NULL,
            expires_at DATETIME NOT NULL,
            used TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (email),
            INDEX (otp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    \App\Database::query("
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(20) DEFAULT 'info',
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    
    echo "Creating RBAC and Security tables...<br>";

    // Roles and RBAC
    \App\Database::query("
        CREATE TABLE IF NOT EXISTS roles (
            id INT PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            financial_access BOOLEAN DEFAULT FALSE,
            system_config_access BOOLEAN DEFAULT FALSE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    \App\Database::query("
        INSERT IGNORE INTO roles (id, name, financial_access, system_config_access) VALUES 
        (1, 'Administrator', 1, 1),
        (2, 'C-Level', 1, 0),
        (3, 'PM / Commercial', 0, 0),
        (4, 'Staff', 0, 0),
        (5, 'External Client', 0, 0)
    ");

    \App\Database::query("
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            entity_type VARCHAR(50) NOT NULL,
            entity_id INT NOT NULL,
            action VARCHAR(50) NOT NULL,
            old_values JSON,
            new_values JSON,
            user_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_correction BOOLEAN DEFAULT FALSE,
            original_log_id INT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (original_log_id) REFERENCES audit_logs(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // Add role_id to users and migrate data
    $roleIdExists = \App\Database::fetchOne("SHOW COLUMNS FROM users LIKE 'role_id'");
    if (!$roleIdExists) {
        \App\Database::query("ALTER TABLE users ADD COLUMN role_id INT DEFAULT 4");
        
        // Migrate data based on old 'role' string
        \App\Database::query("UPDATE users SET role_id = 1 WHERE role = 'admin'");
        \App\Database::query("UPDATE users SET role_id = 2 WHERE role = 'c-level'");
        \App\Database::query("UPDATE users SET role_id = 3 WHERE role = 'commercial'");
        \App\Database::query("UPDATE users SET role_id = 4 WHERE role = 'staff'");
        
        \App\Database::query("ALTER TABLE users ADD CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id)");
    }

    echo "Checking for column migrations...<br>";

    // Add missing columns to system_config if they don't exist
    $cols = [
        'primary_color' => "VARCHAR(7) DEFAULT '#3b82f6'",
        'secondary_color' => "VARCHAR(7) DEFAULT '#1f2937'",
        'accent_color' => "VARCHAR(7) DEFAULT '#f59e0b'",
        'sidebar_bg' => "VARCHAR(7) DEFAULT '#ffffff'",
        'sidebar_text' => "VARCHAR(7) DEFAULT '#1f2937'",
        'currency' => "VARCHAR(10) DEFAULT 'USD'",
        'color_approved' => "VARCHAR(7) DEFAULT '#10b981'",
        'color_rejected' => "VARCHAR(7) DEFAULT '#ef4444'",
        'color_submitted' => "VARCHAR(7) DEFAULT '#3b82f6'",
        'color_draft' => "VARCHAR(7) DEFAULT '#9ca3af'"
    ];

    foreach ($cols as $col => $def) {
        $exists = \App\Database::fetchOne("SHOW COLUMNS FROM system_config LIKE '$col'");
        if (!$exists) {
            \App\Database::query("ALTER TABLE system_config ADD COLUMN $col $def");
        }
    }

    // Asegurar columnas en tabla users
    $userCols = [
        'profile_id' => "INT DEFAULT NULL",
        'seniority_id' => "INT DEFAULT NULL",
        'weekly_capacity' => "DECIMAL(5,2) DEFAULT '40.00'",
        'position_id' => "INT DEFAULT NULL",
        'seniority' => "VARCHAR(100) DEFAULT NULL",
        'hourly_cost' => "DECIMAL(10,2) DEFAULT '0.00'"
    ];

    foreach ($userCols as $col => $def) {
        $exists = \App\Database::fetchOne("SHOW COLUMNS FROM users LIKE '$col'");
        if (!$exists) {
            \App\Database::query("ALTER TABLE users ADD COLUMN $col $def");
        }
    }

    echo "Seeding default data...<br>";

    // Seed Seniorities
    $defaultSeniorities = ['Junior', 'Semi-Senior', 'Senior', 'Lead', 'Manager'];
    foreach ($defaultSeniorities as $s) {
        \App\Database::query("INSERT IGNORE INTO seniorities (name) VALUES (?)", [$s]);
    }

    // Seed Permissions
    $allFeatures = [
        'dashboard', 'kanban', 'tracker', 'approvals', 'projects', 
        'clients', 'costs', 'report_heatmaps', 'report_audit', 
        'report_ai', 'report_custom', 'users', 'settings'
    ];
    $rolesMap = [
        1 => 'admin',
        2 => 'c-level',
        3 => 'commercial',
        4 => 'staff'
    ];

    // Clean current permissions to ensure a fresh start
    \App\Database::query("DELETE FROM permissions");

    foreach ($rolesMap as $roleId => $roleName) {
        foreach ($allFeatures as $feature) {
            $canAccess = 0;
            if ($roleId === 1) { // admin
                $canAccess = 1;
            } elseif ($roleId === 2) { // c-level
                // c-level can access EVERYTHING except administration (settings, users)
                $canAccess = in_array($feature, ['settings', 'users']) ? 0 : 1;
            } elseif ($roleId === 3) { // commercial
                $canAccess = in_array($feature, ['dashboard', 'kanban', 'tracker', 'projects', 'clients', 'report_custom']) ? 1 : 0;
            } elseif ($roleId === 4) { // staff
                $canAccess = in_array($feature, ['dashboard', 'kanban', 'tracker', 'projects']) ? 1 : 0;
            }

            \App\Database::query("
                INSERT INTO permissions (role_id, feature, can_access) 
                VALUES (?, ?, ?)
            ", [$roleId, $feature, $canAccess]);
        }
    }

    \App\Database::query("SET FOREIGN_KEY_CHECKS = 1");

    echo "<strong>Update completed successfully!</strong>";
} catch (Exception $e) {
    if (class_exists('\\App\\Database')) {
        \App\Database::query("SET FOREIGN_KEY_CHECKS = 1");
    }
    echo "<br><strong style='color: red;'>Error updating database:</strong> " . $e->getMessage();
}
