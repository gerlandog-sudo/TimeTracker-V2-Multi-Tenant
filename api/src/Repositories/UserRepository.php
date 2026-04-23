<?php

namespace App\Repositories;

use App\Core\BaseRepository;

class UserRepository extends BaseRepository {

    /**
     * Busca un usuario por email (para validación de duplicados).
     */
    public function findByEmail($email) {
        return $this->fetch("SELECT id FROM users WHERE email = ?", [$email]);
    }

    /**
     * Cuenta usuarios de una empresa.
     */
    public function countByTenant($tenantId) {
        return (int)$this->fetch("SELECT COUNT(*) as count FROM users WHERE tenant_id = ?", [$tenantId])['count'];
    }

    /**
     * Crea un nuevo usuario.
     */
    public function create($data) {
        // Basado en schema_master.sql v2.01
        // Se omite is_super_admin para garantizar que siempre sea 0 por defecto (DB)
        $sql = "INSERT INTO users (tenant_id, name, email, password, role, role_id, language) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        
        $this->query($sql, [
            $data['tenant_id'],
            $data['name'],
            $data['email'],
            $data['password'],
            $data['role'] ?? 'staff',
            $data['role_id'] ?? 4,
            $data['language'] ?? 'es_AR'
        ]);

        return $this->db->lastInsertId();
    }

    /**
     * Asigna permisos de administrador por defecto.
     */
    public function assignAdminPermissions($userId, $tenantId) {
        $features = [
            'dashboard', 'tasks', 'tracker', 'approvals', 'clients', 
            'projects', 'users', 'costs', 'reports', 'config',
            'kanban', 'report_audit', 'report_heatmaps', 'report_ai', 'report_custom',
            'settings', 'notifications'
        ];

        foreach ($features as $feature) {
            $this->query(
                "INSERT IGNORE INTO permissions (tenant_id, role_id, feature, can_access) VALUES (?, 1, ?, 1)",
                [$tenantId, $feature]
            );
        }
        return true;
    }

    /**
     * Elimina usuarios de una empresa.
     */
    public function deleteByTenant($tenantId) {
        return $this->query("DELETE FROM users WHERE tenant_id = ?", [$tenantId]);
    }

    /**
     * Elimina permisos de una empresa.
     */
    public function deletePermissionsByTenant($tenantId) {
        return $this->query("DELETE FROM permissions WHERE tenant_id = ?", [$tenantId]);
    }
}
