<?php

namespace App\Repositories;

use App\Core\BaseRepository;
use PDO;

class TenantRepository extends BaseRepository {

    /**
     * Obtiene todas las empresas con sus estadísticas y configuración de logo.
     */
    public function findAll() {
        return $this->fetchAll("
            SELECT 
                t.*, 
                sc.logo_url,
                (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as users_count,
                (SELECT COUNT(*) FROM projects WHERE tenant_id = t.id) as projects_count
            FROM tenants t
            LEFT JOIN system_config sc ON t.id = sc.tenant_id
            ORDER BY t.id DESC
        ");
    }

    /**
     * Busca una empresa por nombre (para validación).
     */
    public function findByName($name) {
        return $this->fetch("SELECT id FROM tenants WHERE name = ?", [$name]);
    }

    /**
     * Obtiene el conteo total de empresas.
     */
    public function countAll() {
        return (int)$this->fetch("SELECT COUNT(*) as count FROM tenants")['count'];
    }

    /**
     * Obtiene el Top 5 de empresas por cantidad de usuarios.
     */
    public function getTopTenants($limit = 5) {
        return $this->fetchAll("
            SELECT t.name, COUNT(u.id) as user_count 
            FROM tenants t 
            LEFT JOIN users u ON t.id = u.tenant_id 
            GROUP BY t.id 
            ORDER BY user_count DESC 
            LIMIT ?", [$limit]);
    }

    /**
     * Actualiza solo el estado de una empresa.
     */
    public function updateStatus($id, $status) {
        return $this->query("UPDATE tenants SET status = ? WHERE id = ?", [$status, $id]);
    }

    /**
     * Actualiza los datos básicos de una empresa.
     */
    public function update($id, $name, $domain, $status) {
        return $this->query("UPDATE tenants SET name = ?, domain = ?, status = ? WHERE id = ?", [
            $name, $domain, $status, $id
        ]);
    }

    /**
     * Crea un nuevo registro de empresa.
     */
    public function create($name, $domain, $status) {
        $this->query("INSERT INTO tenants (name, domain, status) VALUES (?, ?, ?)", [
            $name, $domain, $status
        ]);
        return $this->db->lastInsertId();
    }

    /**
     * Elimina el registro base de la empresa.
     */
    public function delete($id) {
        return $this->query("DELETE FROM tenants WHERE id = ?", [$id]);
    }

    /**
     * Métodos para dependencias (Configuración de marca)
     */
    public function createConfig($data) {
        $sql = "INSERT INTO system_config 
                (tenant_id, company_name, logo_url, currency, primary_color, secondary_color, accent_color, sidebar_bg, sidebar_text, color_approved, color_submitted, color_rejected, color_draft) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        return $this->query($sql, [
            $data['tenant_id'],
            $data['company_name'],
            $data['logo_url'],
            $data['currency'],
            $data['primary_color'],
            $data['secondary_color'],
            $data['accent_color'],
            $data['sidebar_bg'],
            $data['sidebar_text'],
            $data['color_approved'],
            $data['color_submitted'],
            $data['color_rejected'],
            $data['color_draft']
        ]);
    }

    public function deleteConfig($tenantId) {
        return $this->query("DELETE FROM system_config WHERE tenant_id = ?", [$tenantId]);
    }
}
