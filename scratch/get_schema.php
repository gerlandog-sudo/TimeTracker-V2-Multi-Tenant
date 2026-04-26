<?php
$db = new mysqli('localhost', 'admglobal_admin', 'PMaaS_2026', 'admglobal_timesheet');
if ($db->connect_error) die("Connection failed: " . $db->connect_error);
$res = $db->query('SHOW TABLES');
while($row = $res->fetch_array()) {
    echo "Table: " . $row[0] . "\n";
    $res2 = $db->query('DESCRIBE ' . $row[0]);
    while($row2 = $res2->fetch_array()) {
        echo "  - " . $row2[0] . " (" . $row2[1] . ")\n";
    }
}
