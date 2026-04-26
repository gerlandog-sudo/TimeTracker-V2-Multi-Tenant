<?php
$db = new mysqli('localhost', 'admglobal_admin', 'PMaaS_2026', 'admglobal_timesheet');
$res = $db->query('DESCRIBE custom_report_views');
while($row = $res->fetch_array()) {
    echo $row[0] . " (" . $row[1] . ")\n";
}
