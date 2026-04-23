<?php

namespace App\Core;

/**
 * Database Core (V2.1) - Soporte Dual para Constantes y Arrays
 */
class Database {
    private static $pdo = null;

    public static function connect() {
        if (self::$pdo === null) {
            $config = require __DIR__ . '/../../config.php';
            
            // Detectar si usamos constantes (modelo viejo) o array (modelo nuevo)
            $host = defined('DB_HOST') ? DB_HOST : ($config['db_host'] ?? 'localhost');
            $name = defined('DB_NAME') ? DB_NAME : ($config['db_name'] ?? '');
            $user = defined('DB_USER') ? DB_USER : ($config['db_user'] ?? '');
            $pass = defined('DB_PASS') ? DB_PASS : ($config['db_pass'] ?? '');

            $dsn = "mysql:host=$host;dbname=$name;charset=utf8mb4";
            self::$pdo = new \PDO($dsn, $user, $pass, [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                \PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
            ]);
        }
        return self::$pdo;
    }

    public static function query($sql, $params = []) {
        $stmt = self::connect()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    public static function fetchAll($sql, $params = []) {
        return self::query($sql, $params)->fetchAll();
    }

    public static function fetchOne($sql, $params = []) {
        return self::query($sql, $params)->fetch();
    }
}
