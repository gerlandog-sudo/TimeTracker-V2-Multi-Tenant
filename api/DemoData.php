<?php
require_once 'src/Database.php';
require_once 'config.php';

use App\Database;

$key = $_GET['key'] ?? '';
if ($key !== 'CAMBIAR_POR_LLAVE_SEGURA') {
    die('Unauthorized');
}

error_reporting(E_ALL);
ini_set('display_errors', '1');
header('Content-Type: text/plain');

try {
    echo "Iniciando generación de datos de DEMO...\n";

    // 1. Obtener Maestros
    $profiles = Database::fetchAll("SELECT * FROM profiles");
    $seniorities = Database::fetchAll("SELECT * FROM seniorities");
    $tasks_master = Database::fetchAll("SELECT * FROM tasks_master");

    if (empty($profiles) || empty($seniorities) || empty($tasks_master)) {
        die("Error: Faltan datos maestros (profiles, seniorities o tasks_master). Ejecute update.php primero.");
    }

    // 2. Crear Usuarios
    echo "Creando usuarios del equipo...\n";
    $pass = password_hash('demo123', PASSWORD_DEFAULT);
    
    $usersData = [
        ['name' => 'Carlos C-Level', 'email' => 'ceo@demo.com', 'role' => 'c-level', 'profile' => 'PM', 'seniority' => 'Senior'],
        ['name' => 'Marta Manager', 'email' => 'marta@demo.com', 'role' => 'commercial', 'profile' => 'PM', 'seniority' => 'Senior'],
        ['name' => 'Juan Developer', 'email' => 'juan@demo.com', 'role' => 'staff', 'profile' => 'DEV', 'seniority' => 'Senior'],
        ['name' => 'Ana Junior', 'email' => 'ana@demo.com', 'role' => 'staff', 'profile' => 'DEV', 'seniority' => 'Junior'],
        ['name' => 'Pedro Tester', 'email' => 'pedro@demo.com', 'role' => 'staff', 'profile' => 'QA', 'seniority' => 'Ssr'],
        ['name' => 'Lucía Analyst', 'email' => 'lucia@demo.com', 'role' => 'staff', 'profile' => 'AF', 'seniority' => 'Ssr']
    ];

    $userIds = [];
    foreach ($usersData as $u) {
        $pId = null; $sId = null;
        foreach($profiles as $p) if($p['name'] == $u['profile']) $pId = $p['id'];
        foreach($seniorities as $s) if($s['name'] == $u['seniority']) $sId = $s['id'];

        Database::query("INSERT IGNORE INTO users (name, email, password, role, profile_id, seniority_id, weekly_capacity) VALUES (?, ?, ?, ?, ?, ?, ?)", [
            $u['name'], $u['email'], $pass, $u['role'], $pId, $sId, 40
        ]);
        $user = Database::fetchOne("SELECT id FROM users WHERE email = ?", [$u['email']]);
        if ($user) {
            $userIds[] = $user['id'];
        }
    }

    // 3. Crear Clientes y Contactos
    echo "Creando clientes y contactos...\n";
    $clientsData = [
        ['name' => 'Banco Global', 'tax' => '30-12345678-9', 'contact' => 'Roberto Finanzas'],
        ['name' => 'Tech Solutions Corp', 'tax' => '30-87654321-0', 'contact' => 'Elena Tech'],
        ['name' => 'Logística Ágil SA', 'tax' => '30-11223344-5', 'contact' => 'Mario Rutas'],
        ['name' => 'Seguros Total', 'tax' => '30-55667788-2', 'contact' => 'Sofía Póliza']
    ];

    $clientIds = [];
    foreach ($clientsData as $c) {
        Database::query("INSERT INTO clients (name, legal_name, tax_id) VALUES (?, ?, ?)", [$c['name'], $c['name'] . " Inc.", $c['tax']]);
        $cid = Database::getInstance()->lastInsertId();
        $clientIds[] = $cid;
        Database::query("INSERT INTO client_contacts (client_id, name, email, position) VALUES (?, ?, ?, ?)", [
            $cid, $c['contact'], strtolower(str_replace(' ', '.', $c['contact'])) . "@client.com", 'Gerente de Proyecto'
        ]);
    }

    // 4. Crear Proyectos
    echo "Creando proyectos...\n";
    $projectIds = [];
    foreach ($clientIds as $cid) {
        $cName = Database::fetchOne("SELECT name FROM clients WHERE id = ?", [$cid])['name'];
        $projs = ["Implementación ERP $cName", "Soporte Anual $cName"];
        foreach ($projs as $pName) {
            Database::query("INSERT INTO projects (client_id, name, budget_hours, budget_money, status) VALUES (?, ?, ?, ?, ?)", [
                $cid, $pName, rand(500, 2000), rand(10000, 50000), 'active'
            ]);
            $projectIds[] = Database::getInstance()->lastInsertId();
        }
    }

    // 5. Crear Tareas Kanban (al menos 50)
    echo "Generando 60 tareas Kanban...\n";
    $priorities = ['Low', 'Medium', 'High', 'Critical'];
    $statuses = ['ToDo', 'Doing', 'Done'];
    for ($i = 0; $i < 60; $i++) {
        $pid = $projectIds[array_rand($projectIds)];
        $uid = $userIds[array_rand($userIds)];
        $taskMaster = $tasks_master[array_rand($tasks_master)];
        $priority = $priorities[array_rand($priorities)];
        $status = $statuses[array_rand($statuses)];
        $est = rand(2, 20);
        
        Database::query("INSERT INTO kanban_tasks (project_id, user_id, description, priority, task_type_id, estimated_hours, status) VALUES (?, ?, ?, ?, ?, ?, ?)", [
            $pid, $uid, "Tarea de " . $taskMaster['name'] . " correlativa a Fase " . ($i+1), $priority, $taskMaster['id'], $est, $status
        ]);
    }

    // 6. Crear Entradas de Tiempo (al menos 100) y Logs
    echo "Generando 120 registros de tiempo y auditoría...\n";
    $entryStatuses = ['draft', 'submitted', 'approved', 'rejected'];
    for ($i = 0; $i < 120; $i++) {
        $uid = $userIds[array_rand($userIds)];
        $pid = $projectIds[array_rand($projectIds)];
        $tid = $tasks_master[array_rand($tasks_master)]['id'];
        $hours = rand(1, 8) + (rand(0, 4) / 4); // Hs con decimales .25, .50 etc
        $date = date('Y-m-d', strtotime('-' . rand(0, 30) . ' days'));
        $status = $entryStatuses[array_rand($entryStatuses)];
        
        Database::query("INSERT INTO time_entries (user_id, project_id, task_id, description, hours, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)", [
            $uid, $pid, $tid, "Desarrollo y análisis de requerimientos modulo " . ($i + 1), $hours, $date, $status
        ]);
        $eid = Database::getInstance()->lastInsertId();

        // Generar historial de auditoría
        // Siempre empieza en NULL -> draft o submitted
        $actorId = $uid; // Casi siempre el usuario mismo
        if ($status == 'approved' || $status == 'rejected') {
            // Pasó por revisión
            $reviewerId = $userIds[array_rand($userIds)]; // Simular que alguien lo revisó
            Database::query("INSERT INTO time_entry_logs (time_entry_id, from_status, to_status, user_id, comment) VALUES (?, ?, ?, ?, ?)", [
                $eid, 'submitted', $status, $reviewerId, $status == 'rejected' ? 'Faltan detalles en la descripción' : 'OK'
            ]);
            Database::query("UPDATE time_entries SET reviewed_by = ?, approved_at = NOW() WHERE id = ?", [$reviewerId, $eid]);
        } else if ($status == 'submitted') {
            Database::query("INSERT INTO time_entry_logs (time_entry_id, from_status, to_status, user_id, comment) VALUES (?, ?, ?, ?, ?)", [
                $eid, 'draft', 'submitted', $uid, 'Envío semanal'
            ]);
        }
    }

    echo "\nDatos de DEMO generados con éxito.\n";
    echo "Total Usuarios creados: " . count($userIds) . "\n";
    echo "Total Clientes creados: " . count($clientIds) . "\n";
    echo "Total Proyectos creados: " . count($projectIds) . "\n";
    echo "Total Tareas creadas: 60\n";
    echo "Total Registros de tiempo: 120\n";

} catch (Exception $e) {
    echo "\nError durante la generación: " . $e->getMessage();
}
