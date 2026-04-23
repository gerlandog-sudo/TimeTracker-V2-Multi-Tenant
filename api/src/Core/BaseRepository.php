<?php

namespace App\Core;

use PDO;
use Exception;

abstract class BaseRepository {
    protected $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    /**
     * Ejecuta una consulta preparada de forma segura.
     */
    protected function query($sql, $params = []) {
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (Exception $e) {
            error_log("Database Error: " . $e->getMessage());
            throw new Exception("Error en la operación de base de datos.");
        }
    }

    /**
     * Obtiene todos los resultados de una consulta.
     */
    protected function fetchAll($sql, $params = []) {
        return $this->query($sql, $params)->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Obtiene un solo resultado de una consulta.
     */
    protected function fetch($sql, $params = []) {
        return $this->query($sql, $params)->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Inicia una transacción.
     */
    public function beginTransaction() {
        return $this->db->beginTransaction();
    }

    /**
     * Confirma una transacción.
     */
    public function commit() {
        return $this->db->commit();
    }

    /**
     * Revierte una transacción.
     */
    public function rollBack() {
        return $this->db->rollBack();
    }
}
