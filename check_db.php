<?php
require_once __DIR__ . '/api/src/Database.php';
use App\Database;

try {
    $db = Database::getInstance();
    echo "COLUMNS IN permissions:\n";
    $cols = Database::fetchAll("DESCRIBE permissions");
    foreach($cols as $c) {
        echo $c['Field'] . " (" . $c['Type'] . ")\n";
    }
    
    echo "\nCOLUMNS IN system_config:\n";
    $cols = Database::fetchAll("DESCRIBE system_config");
    foreach($cols as $c) {
        echo $c['Field'] . " (" . $c['Type'] . ")\n";
    }
} catch (Throwable $e) {
    echo "ERROR: " . $e->getMessage();
}
