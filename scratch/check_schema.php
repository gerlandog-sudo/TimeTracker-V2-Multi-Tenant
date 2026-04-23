<?php
require_once 'api/src/Core/Database.php';
use App\Core\Database;

function checkTable($tableName) {
    $db = Database::getInstance()->getConnection();
    try {
        $stmt = $db->query("DESCRIBE $tableName");
        echo "\n--- Table: $tableName ---\n";
        while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "Field: " . str_pad($row['Field'], 20) . " | Type: " . $row['Type'] . "\n";
        }
    } catch (Exception $e) {
        echo "Error checking $tableName: " . $e->getMessage() . "\n";
    }
}

checkTable('tenants');
checkTable('system_config');
checkTable('users');
checkTable('permissions');
