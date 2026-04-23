<?php
declare(strict_types=1);

namespace App;

use PDO;
use PDOException;

class Database {
    private static ?PDO $instance = null;

    public static function getInstance(): PDO {
        if (self::$instance === null) {
            require_once __DIR__ . '/../config.php';
            try {
                // Attempt MySQL connection first
                self::$instance = new PDO(
                    "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                    DB_USER,
                    DB_PASS,
                    [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false,
                    ]
                );
            } catch (PDOException $e) {
                // Fallback to SQLite if MySQL fails
                try {
                    $dbPath = __DIR__ . '/../database.sqlite';
                    self::$instance = new PDO("sqlite:" . $dbPath);
                    self::$instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                    self::$instance->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                    self::$instance->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);

                    // Create tables if they don't exist (for SQLite fallback)
                    self::createSQLiteTables();

                } catch (PDOException $sqlite_e) {
                    http_response_code(500);
                    error_log('Database connection failed: MySQL - ' . $e->getMessage() . ' | SQLite - ' . $sqlite_e->getMessage());
                    echo json_encode(['message' => 'Database connection failed.']);
                    exit;
                }
            }
        }
        return self::$instance;
    }

    private static function createSQLiteTables(): void {
        // Ensure tables exist for SQLite fallback
        $queries = [
            "CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'staff',
                role_id INTEGER DEFAULT 4,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                weekly_capacity DECIMAL(5,2) DEFAULT 40,
                position_id INTEGER,
                seniority VARCHAR(100),
                hourly_cost DECIMAL(10,2) DEFAULT 0
            )",
            "CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                client_id INTEGER,
                status VARCHAR(50) DEFAULT 'Active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            "CREATE TABLE IF NOT EXISTS tasks_master (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                is_archived TINYINT(1) DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            "CREATE TABLE IF NOT EXISTS time_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                project_id INTEGER NOT NULL,
                task_id INTEGER NOT NULL,
                description TEXT,
                hours DECIMAL(5, 2) NOT NULL,
                date DATE NOT NULL,
                status VARCHAR(50) DEFAULT 'draft',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                approved_by INTEGER,
                rejection_reason TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (project_id) REFERENCES projects(id),
                FOREIGN KEY (task_id) REFERENCES tasks_master(id)
            )",
            "CREATE TABLE IF NOT EXISTS position_costs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                position_id INTEGER NOT NULL,
                seniority VARCHAR(100) NOT NULL,
                hourly_cost DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY (position_id) REFERENCES positions(id)
            )",
            "CREATE TABLE IF NOT EXISTS system_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_name VARCHAR(255),
                logo_url TEXT,
                currency VARCHAR(10) DEFAULT 'USD',
                primary_color VARCHAR(7) DEFAULT '#3b82f6',
                secondary_color VARCHAR(7) DEFAULT '#1f2937',
                accent_color VARCHAR(7) DEFAULT '#3b82f6',
                sidebar_bg VARCHAR(7) DEFAULT '#ffffff',
                sidebar_text VARCHAR(7) DEFAULT '#1f2937',
                color_approved VARCHAR(7) DEFAULT '#3b82f6',
                color_rejected VARCHAR(7) DEFAULT '#ef4444',
                color_submitted VARCHAR(7) DEFAULT '#eab308',
                color_draft VARCHAR(7) DEFAULT '#9ca3af'
            )",
            "CREATE TABLE IF NOT EXISTS permissions (
                role_id INTEGER,
                feature VARCHAR(50),
                can_access INTEGER DEFAULT 0,
                PRIMARY KEY (role_id, feature)
            )",
            "CREATE TABLE IF NOT EXISTS seniorities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL UNIQUE
            )",
            "CREATE TABLE IF NOT EXISTS time_entry_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                time_entry_id INTEGER NOT NULL,
                from_status VARCHAR(50),
                to_status VARCHAR(50) NOT NULL,
                user_id INTEGER NOT NULL,
                comment TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (time_entry_id) REFERENCES time_entries(id) ON DELETE CASCADE
            )",
            "CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(20) DEFAULT 'info',
                is_read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )",
            "CREATE TABLE IF NOT EXISTS kanban_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                description TEXT NOT NULL,
                priority VARCHAR(20) DEFAULT 'Baja',
                task_type_id INTEGER,
                estimated_hours DECIMAL(5, 2) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'ToDo',
                started_at DATETIME,
                completed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (task_type_id) REFERENCES tasks_master(id) ON DELETE SET NULL
            )",
            "CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE
            )"
        ];

        foreach ($queries as $query) {
            try {
                self::getInstance()->exec($query);
            } catch (PDOException $e) {
                // Log error but don't exit, as some tables might already exist
                error_log('Error creating SQLite table: ' . $e->getMessage());
            }
        }

        // Insert default values for seniorities if they don't exist
        $defaultSeniorities = "INSERT OR IGNORE INTO seniorities (name) VALUES ('Junior'), ('Semi-Senior'), ('Senior'), ('Lead'), ('Manager')";
        try {
            self::getInstance()->exec($defaultSeniorities);
        } catch (PDOException $e) {
            error_log('Error inserting default seniorities: ' . $e->getMessage());
        }

        // SQLite migrations for preview environment
        try { self::getInstance()->exec("ALTER TABLE users ADD COLUMN role_id INTEGER DEFAULT 4"); } catch (Throwable $e) {}
        try { self::getInstance()->exec("ALTER TABLE tasks_master ADD COLUMN is_archived TINYINT(1) DEFAULT 0"); } catch (Throwable $e) {}
    }

    public static function query(string $sql, array $params = []) {
        $stmt = self::getInstance()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    public static function fetchAll(string $sql, array $params = []) {
        return self::query($sql, $params)->fetchAll(PDO::FETCH_ASSOC);
    }

    public static function fetchOne(string $sql, array $params = []) {
        return self::query($sql, $params)->fetch(PDO::FETCH_ASSOC);
    }
}
