<?php
try {
    require_once __DIR__ . '/api/src/Core/Database.php';
    require_once __DIR__ . '/api/src/Services/AiService.php';
    echo "AiService syntax is OK\n";
} catch (Throwable $e) {
    echo "AiService error: " . $e->getMessage() . "\n";
}
