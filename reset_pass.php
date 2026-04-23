<?php
/**
 * Script de emergencia para resetear la password del admin.
 * ELIMINAR DESPUÉS DE USAR.
 */
require_once 'api/config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $email = 'admin@pmaasglobal.com';
    $pass = password_hash('admin_pmaas_2026', PASSWORD_DEFAULT);

    // Intentamos actualizar si existe, o insertar si no
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        $stmt = $pdo->prepare("UPDATE users SET password = ?, role = 'admin' WHERE id = ?");
        $stmt->execute([$pass, $user['id']]);
        echo "Password actualizada para: $email";
    } else {
        $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role) VALUES ('Admin', ?, ?, 'admin')");
        $stmt->execute([$email, $pass]);
        echo "Usuario admin creado: $email";
    }
    
    echo "<br>Nueva clave: admin_pmaas_2026";
    echo "<br><br><strong style='color:red;'>POR SEGURIDAD: ELIMINA ESTE ARCHIVO (reset_pass.php) DE TU SERVIDOR AHORA.</strong>";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
