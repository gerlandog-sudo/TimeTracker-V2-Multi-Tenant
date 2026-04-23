<?php
session_start();

/**
 * Instalador Profesional para TimeTracker v1.2
 * Provee una interfaz guiada para configurar DB y crear el primer admin.
 */

$step = isset($_GET['step']) ? (int)$_GET['step'] : 1;
$error = '';
$success = '';

// Archivo de configuración
$config_file = __DIR__ . '/api/config.php';

// Definir el logo (SVG)
$logo_svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="64" height="64">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00D2FF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3A47FF;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="230" cy="230" r="180" fill="none" stroke="url(#grad)" stroke-width="40" />
  <line x1="360" y1="360" x2="480" y2="480" stroke="url(#grad)" stroke-width="60" stroke-linecap="round" />
  <path d="M230 110 V230 L310 310" fill="none" stroke="url(#grad)" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" />
</svg>';

if ($step === 2 && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $db_host = $_POST['db_host'];
    $db_name = $_POST['db_name'];
    $db_user = $_POST['db_user'];
    $db_pass = $_POST['db_pass'];

    try {
        $pdo = new PDO("mysql:host=$db_host;charset=utf8mb4", $db_user, $db_pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db_name` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
        $pdo->exec("USE `$db_name` text"); // Force use selected db

        $_SESSION['db_config'] = [
            'host' => $db_host,
            'name' => $db_name,
            'user' => $db_user,
            'pass' => $db_pass
        ];
        header("Location: install.php?step=3");
        exit;
    } catch (PDOException $e) {
        $error = "Error de conexión: " . $e->getMessage();
    }
}

if ($step === 3 && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $admin_email = $_POST['admin_email'];
    $admin_pass = $_POST['admin_pass'];
    $admin_name = $_POST['admin_name'];

    if (isset($_SESSION['db_config'])) {
        $db = $_SESSION['db_config'];
        try {
            $pdo = new PDO("mysql:host={$db['host']};dbname={$db['name']};charset=utf8mb4", $db['user'], $db['pass']);
            
            // Cargar SQL
            $sql = file_get_contents(__DIR__ . '/setup.sql');
            $pdo->exec($sql);

            // Crear Admin
            $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')");
            $stmt->execute([$admin_name, $admin_email, password_hash($admin_pass, PASSWORD_DEFAULT)]);

            // Generar config.php
            $config_content = "<?php\n" .
                "define('DB_HOST', '{$db['host']}');\n" .
                "define('DB_NAME', '{$db['name']}');\n" .
                "define('DB_USER', '{$db['user']}');\n" .
                "define('DB_PASS', '{$db['pass']}');\n" .
                "define('ENC_KEY', '" . bin2hex(random_bytes(16)) . "');\n";
            
            file_put_contents($config_file, $config_content);
            
            $success = "Instalación completada con éxito.";
            $step = 4;
        } catch (Exception $e) {
            $error = "Error en la instalación: " . $e->getMessage();
        }
    }
}

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instalador TimeTracker v1.2</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f9fafb; }
        .gradient-text { background: linear-gradient(135deg, #00D2FF 0%, #3A47FF 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .progress-bar { transition: width 0.5s ease-in-out; }
    </style>
</head>
<body class="flex items-center justify-center min-h-screen p-4">

    <div class="max-w-xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <!-- Header -->
        <div class="p-8 text-center border-b border-gray-50">
            <div class="flex justify-center mb-4">
                <?= $logo_svg ?>
            </div>
            <h1 class="text-3xl font-bold text-gray-900 tracking-tight">TimeTracker <span class="text-primary font-medium text-lg italic">v1.2</span></h1>
            <p class="text-gray-500 mt-2">Instalación del Entorno</p>
        </div>

        <!-- Progress Bar -->
        <div class="h-1.5 w-full bg-gray-100">
            <?php 
                $progress = ($step - 1) * 33.33;
                if ($step == 4) $progress = 100;
            ?>
            <div class="h-full bg-gradient-to-r from-cyan-400 to-blue-600 progress-bar shadow-[0_0_10px_rgba(58,71,255,0.3)]" style="width: <?= $progress ?>%"></div>
        </div>

        <div class="p-8">
            <?php if ($error): ?>
                <div class="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm flex items-center gap-3">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <?= $error ?>
                </div>
            <?php endif; ?>

            <?php if ($step === 1): ?>
                <div class="space-y-6">
                    <div class="bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50">
                        <h2 class="font-bold text-blue-900 flex items-center gap-2 mb-3">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Pasos Previos en cPanel
                        </h2>
                        <ol class="text-sm text-blue-800/80 space-y-2 list-decimal list-inside">
                            <li>Ingresá a tu cPanel y buscá <b>MySQL Databases</b>.</li>
                            <li>Creá una nueva base de datos (ej: <span class="font-mono bg-white/50 px-1">admglobal_timesheet</span>).</li>
                            <li>Creá un usuario de base de datos y asignale una contraseña segura.</li>
                            <li>Añadí el usuario a la base de datos con <b>TODOS LOS PRIVILEGIOS</b>.</li>
                            <li>Asegurate de que los archivos estén en <span class="font-mono bg-white/50 px-1">/public_html/TimeTracker/</span>.</li>
                        </ol>
                    </div>
                    <a href="install.php?step=2" class="block w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 rounded-2xl text-center shadow-lg hover:opacity-90 transition-all">
                        Comenzar Instalación
                    </a>
                </div>

            <?php elseif ($step === 2): ?>
                <form method="POST" class="space-y-5">
                    <h3 class="text-sm font-bold text-gray-400 uppercase tracking-widest text-center mb-4">Configuración de Base de Datos</h3>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1 px-1">Servidor (Host)</label>
                        <input type="text" name="db_host" value="localhost" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-mono text-sm" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1 px-1">Nombre de la Base de Datos</label>
                        <input type="text" name="db_name" placeholder="ej: admglobal_timesheet" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-mono text-sm" required>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1 px-1">Usuario DB</label>
                            <input type="text" name="db_user" placeholder="ej: admglobal_admin" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-mono text-sm" required>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase mb-1 px-1">Contraseña DB</label>
                            <input type="password" name="db_pass" placeholder="••••••••" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-mono text-sm" required>
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:opacity-90 transition-all mt-4">
                        Validar y Continuar
                    </button>
                    <p class="text-[10px] text-gray-400 text-center italic mt-2">El sistema intentará crear la base de datos si no existe, pero se recomienda crearla manualmente.</p>
                </form>

            <?php elseif ($step === 3): ?>
                <form method="POST" class="space-y-5">
                    <div class="text-center mb-6">
                        <div class="inline-flex items-center px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-100">
                             Base de datos conectada correctamente
                        </div>
                    </div>
                    <h3 class="text-sm font-bold text-gray-400 uppercase tracking-widest text-center mb-4">Credenciales del Administrador</h3>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1 px-1">Nombre Completo</label>
                        <input type="text" name="admin_name" placeholder="ej: Administrador Global" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1 px-1">Email (Usuario de ingreso)</label>
                        <input type="email" name="admin_email" placeholder="admin@pmaasglobal.com" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1 px-1">Contraseña Nueva</label>
                        <input type="password" name="admin_pass" placeholder="Mínimo 8 caracteres" minlength="8" class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" required>
                    </div>
                    <button type="submit" class="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:opacity-90 transition-all mt-4">
                        Finalizar Instalación
                    </button>
                    <p class="text-[10px] text-gray-400 text-center italic mt-2">Al presionar, se crearán las tablas y el archivo de configuración.</p>
                </form>

            <?php elseif ($step === 4): ?>
                <div class="text-center space-y-6">
                    <div class="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100 shadow-sm">
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900">¡Listo para empezar!</h3>
                    <p class="text-gray-500 text-sm">La plataforma ha sido instalada correctamente. Por seguridad, te recomendamos eliminar el archivo <span class="font-mono bg-gray-100 px-1 rounded">install.php</span> de tu servidor.</p>
                    
                    <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-left space-y-2">
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Resumen de Instalación</p>
                        <p class="text-xs text-gray-600 flex justify-between"><span>Base de Datos:</span> <span class="font-bold text-gray-900"><?= $_SESSION['db_config']['name'] ?></span></p>
                        <p class="text-xs text-gray-600 flex justify-between"><span>Configuración:</span> <span class="font-bold text-green-600">api/config.php Generado</span></p>
                    </div>

                    <a href="index.html" class="block w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-gray-800 transition-all uppercase tracking-widest text-sm">
                        Ir al Tablero de Control
                    </a>
                </div>
            <?php endif; ?>
        </div>

        <div class="p-6 bg-gray-50 border-t border-gray-100 text-center">
            <p class="text-[10px] text-gray-400 uppercase font-bold tracking-widest">&copy; 2026 PMaaS Global • v1.2 Release</p>
        </div>
    </div>

</body>
</html>
