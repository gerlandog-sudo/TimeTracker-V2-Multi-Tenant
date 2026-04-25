<?php
require_once __DIR__ . '/../../api/config.php';

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    $tables = ['projects', 'users', 'clients', 'tasks_master', 'time_entries'];
    foreach ($tables as $table) {
        echo "Table: $table\n";
        $stmt = $pdo->query("DESC $table");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "  - {$row['Field']} ({$row['Type']})\n";
        }
        echo "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
