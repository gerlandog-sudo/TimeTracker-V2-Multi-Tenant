<?php
declare(strict_types=1);

// ===== ENDPOINT DE DEBUG v4 =====
if (isset($_GET['debug'])) {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    $out = [];

    try { require_once __DIR__ . '/config.php'; }
    catch (\Throwable $e) { echo json_encode(['config_error' => $e->getMessage()]); exit; }

    spl_autoload_register(function ($class) {
        $file = __DIR__ . '/src/' . str_replace(['App\\', '\\'], ['', '/'], $class) . '.php';
        if (file_exists($file)) require_once $file;
    });

    // Autenticación desde cookie o header
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    preg_match('/Bearer\s+(.*)$/i', $auth, $m);
    $token = $m[1] ?? ($_COOKIE['tt_token'] ?? null);

    if ($token) {
        $userData = \App\Core\Auth::validateToken($token);
        if ($userData) {
            \App\Core\Context::setUser($userData);
            \App\Core\Context::setTenantId($userData['tenant_id'] ?? 0);
            $out['auth'] = 'ok: ' . ($userData['email'] ?? '?');
        } else {
            $out['auth'] = 'token_invalid';
        }
    } else {
        $out['auth'] = 'no_token';
    }

    // Simular los GET params que manda el frontend para time-entries
    $_GET['page']   = '1';
    $_GET['limit']  = '10';
    $_GET['status'] = 'submitted';
    $_GET['from']   = '2026-04-01';
    $_GET['to']     = '2026-04-30';

    // Llamar TimeEntriesController directamente
    try {
        ob_start();
        (new \App\Controllers\TimeEntriesController())->list();
        $raw = ob_get_clean();
        $parsed = json_decode($raw, true);
        $out['time_entries'] = $parsed ?? ['raw_response' => substr($raw, 0, 1000)];
    } catch (\Throwable $e) {
        ob_end_clean();
        $out['time_entries_error'] = $e->getMessage();
    }

    // Reset y probar positions
    unset($_GET['status'], $_GET['from'], $_GET['to']);
    try {
        ob_start();
        (new \App\Controllers\GenericController())->list('positions');
        $raw2 = ob_get_clean();
        $parsed2 = json_decode($raw2, true);
        $out['positions'] = $parsed2 ? ['total' => $parsed2['total']] : ['raw' => substr($raw2, 0, 300)];
    } catch (\Throwable $e) {
        ob_end_clean();
        $out['positions_error'] = $e->getMessage();
    }

    // Probar kanban-tasks
    try {
        ob_start();
        (new \App\Controllers\KanbanController())->list();
        $raw3 = ob_get_clean();
        $parsed3 = json_decode($raw3, true);
        $out['kanban'] = is_array($parsed3) ? ['count' => count($parsed3)] : ['raw' => substr($raw3, 0, 300)];
    } catch (\Throwable $e) {
        ob_end_clean();
        $out['kanban_error'] = $e->getMessage();
    }

    echo json_encode($out, JSON_PRETTY_PRINT);
    exit;
}
// ===== FIN DEBUG =====

require_once __DIR__ . '/config.php';



spl_autoload_register(function ($class) {
    $file = __DIR__ . '/src/' . str_replace(['App\\', '\\'], ['', '/'], $class) . '.php';
    if (file_exists($file)) require_once $file;
});

use App\Core\Router;
use App\Core\Auth;
use App\Core\Context;
use App\Core\Request;
use App\Core\Response;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

// ===== EXCEPCIÓN PARA SCRIPTS DE MIGRACIÓN INDEPENDIENTES =====
$path = $_GET['path'] ?? '';
if (strpos($path, 'migra_') === 0 && file_exists(__DIR__ . '/' . $path)) {
    header('Content-Type: text/plain');
    require_once __DIR__ . '/' . $path;
    exit;
}

// ===== AUTENTICACIÓN =====
$token = Request::getAuthToken();
if ($token) {
    $userData = Auth::validateToken($token);
    if ($userData) {
        Context::setUser($userData);
        if (isset($userData['tenant_id'])) Context::setTenantId($userData['tenant_id']);
    }
}

// ===== RUTAS =====

// Auth
Router::post('auth/login',          'AuthController', 'login');
Router::post('auth/find-tenant',    'AuthController', 'findTenant');
Router::post('auth/forgot-password','AuthController', 'forgotPassword');
Router::post('auth/reset-password', 'AuthController', 'resetPassword');

// Config & Permisos (tabla: system_config, permissions)
Router::get('config',               'AdminController', 'getSystemConfig');
Router::post('config',              'AdminController', 'updateSystemConfig');
Router::get('permissions',          'AdminController', 'getPermissions');
Router::post('permissions',         'AdminController', 'updatePermission');

// Metadata (tablas: positions, tasks_master)
Router::get('metadata',             'AdminController', 'getMetadata');

// Profile
Router::get('profile',              'AdminController', 'getProfile');
Router::put('profile',              'AdminController', 'updateProfile');
Router::post('profile',             'AdminController', 'updateProfile');

// Alertas (tabla: notifications)
Router::get('user-alerts',          'UserAlertsController', 'getAlerts');
Router::post('user-alerts',         'UserAlertsController', 'markRead');
Router::patch('user-alerts',        'UserAlertsController', 'markRead');

// Dashboard & Reportes
Router::get('dashboard',            'DashboardController', 'getStats');
Router::get('reports/heatmap',      'ReportsController', 'getHeatmap');
Router::get('reports/audit',        'ReportsController', 'getAuditLog');
Router::get('predictive-alerts',    'ReportsController', 'getPredictiveAlerts');

// Reportes Insights (Ad-hoc Query Engine)
Router::get('reports/insights/catalog',       'InsightsController', 'getCatalog');
Router::post('reports/insights/run',          'InsightsController', 'run');
Router::get('reports/insights/views',         'InsightsController', 'listViews');
Router::post('reports/insights/views',        'InsightsController', 'saveView');
Router::put('reports/insights/views/{id}',    'InsightsController', 'updateView');
Router::delete('reports/insights/views/{id}', 'InsightsController', 'deleteView');
Router::post('reports/insights/ai-assist',    'InsightsController', 'aiAssist');
Router::post('reports/insights/generate-text','InsightsController', 'generateInsight');

// Clientes
Router::get('clients',              'ClientsController', 'list');
Router::post('clients',             'ClientsController', 'create');
Router::put('clients',              'ClientsController', 'update');
Router::delete('clients/{id}',      'ClientsController', 'delete');

// Proyectos
Router::get('projects',             'ProjectsController', 'list');
Router::post('projects',            'ProjectsController', 'create');
Router::put('projects',             'ProjectsController', 'update');
Router::delete('projects/{id}',     'ProjectsController', 'delete');

// Time Entries
Router::get('time-entries',         'TimeEntriesController', 'list');
Router::post('time-entries',        'TimeEntriesController', 'create');
Router::put('time-entries',         'TimeEntriesController', 'update');
Router::delete('time-entries/{id}', 'TimeEntriesController', 'delete');
Router::patch('time-entries/{id}/submit', 'TimeEntriesController', 'submit');
Router::patch('time-entries/{id}/status', 'TimeEntriesController', 'updateStatus');
Router::post('time-entries/bulk-status',  'TimeEntriesController', 'bulkStatus');
Router::get('time-entries/{id}/logs',     'TimeEntriesController', 'getLogs');

// Kanban
Router::get('kanban-tasks',         'KanbanController', 'list');
Router::post('kanban-tasks',        'KanbanController', 'create');
Router::put('kanban-tasks/{id}',    'KanbanController', 'update');
Router::delete('kanban-tasks/{id}', 'KanbanController', 'delete');

// Usuarios (tabla: users + positions JOIN)
Router::get('users',                'UsersController', 'list');
Router::post('users',               'UsersController', 'create');
Router::put('users',                'UsersController', 'update');
Router::delete('users/{id}',        'UsersController', 'delete');

// Maestros (tabla: tasks_master, positions, position_costs)
Router::get('tasks',                'GenericController', 'list',   ['tasks_master']);
Router::post('tasks',               'GenericController', 'create', ['tasks_master']);
Router::put('tasks',                'GenericController', 'update', ['tasks_master']);
Router::delete('tasks/{id}',        'GenericController', 'delete', ['tasks_master']);

Router::get('tasks-master',         'GenericController', 'list',   ['tasks_master']);
Router::post('tasks-master',        'GenericController', 'create', ['tasks_master']);
Router::put('tasks-master',         'GenericController', 'update', ['tasks_master']);
Router::delete('tasks-master/{id}', 'GenericController', 'delete', ['tasks_master']);

Router::get('positions',            'GenericController', 'list',   ['positions']);
Router::post('positions',           'GenericController', 'create', ['positions']);
Router::put('positions',            'GenericController', 'update', ['positions']);
Router::delete('positions/{id}',    'GenericController', 'delete', ['positions']);

Router::get('position-costs',       'GenericController', 'list',   ['position_costs']);
Router::post('position-costs',      'GenericController', 'create', ['position_costs']);
Router::put('position-costs',       'GenericController', 'update', ['position_costs']);
Router::delete('position-costs/{id}','GenericController','delete', ['position_costs']);

Router::get('costs',                'GenericController', 'list',   ['costs']);
Router::post('costs',               'GenericController', 'create', ['costs']);
Router::put('costs',                'GenericController', 'update', ['costs']);
Router::delete('costs/{id}',        'GenericController', 'delete', ['costs']);

// Super Admin
Router::get('super/stats',         'SuperAdminController', 'getStats');
Router::get('super/tenants',       'SuperAdminController', 'listTenants');
Router::post('super/tenants',      'SuperAdminController', 'saveTenant');
Router::delete('super/tenants/{id}','SuperAdminController','deleteTenant');
Router::get('super/logs',          'SuperAdminController', 'getGlobalLogs');

// ===== EJECUCIÓN =====
try {
    $path = $_GET['path'] ?? '';
    if (!Router::run($_SERVER['REQUEST_METHOD'], $path)) {
        Response::error("Endpoint no encontrado: $path", 404);
    }
} catch (\Throwable $e) {
    Response::error($e->getMessage(), 500);
}
