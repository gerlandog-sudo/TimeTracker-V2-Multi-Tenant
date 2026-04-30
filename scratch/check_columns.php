<?php
require_once __DIR__ . '/api/src/Core/Database.php';
require_once __DIR__ . '/api/config.php';

use App\Core\Database;

try {
    $columns = Database::fetchAll("SHOW COLUMNS FROM system_config");
    print_r($columns);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
