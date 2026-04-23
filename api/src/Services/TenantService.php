<?php

namespace App\Services;

use App\Core\BaseService;
use App\Repositories\TenantRepository;
use App\Repositories\UserRepository;
use Exception;

class TenantService extends BaseService {
    private $tenantRepo;
    private $userRepo;

    public function __construct(TenantRepository $tenantRepo, UserRepository $userRepo) {
        $this->tenantRepo = $tenantRepo;
        $this->userRepo = $userRepo;
    }

    /**
     * Lista todas las empresas.
     */
    public function listAll() {
        try {
            $data = $this->tenantRepo->findAll();
            return $this->response($data);
        } catch (Exception $e) {
            $this->addError("No se pudo obtener el listado: " . $e->getMessage());
            return $this->response(null, 500);
        }
    }

    /**
     * Cambia el estado de una empresa (Activa/Pausada).
     */
    public function toggleStatus($id, $status) {
        try {
            $this->tenantRepo->updateStatus($id, $status);
            $this->addMessage("Estado de la empresa actualizado.");
            return $this->response(true);
        } catch (Exception $e) {
            $this->addError("Error al actualizar estado: " . $e->getMessage());
            return $this->response(false, 500);
        }
    }

    /**
     * Crea una nueva empresa con su administrador inicial.
     */
    public function registerTenant($data) {
        try {
            // 1. Validaciones previas
            if ($this->tenantRepo->findByName($data['name'])) {
                $this->addError("Ya existe una empresa con ese nombre.");
                return $this->response(null, 400);
            }

            if ($this->userRepo->findByEmail($data['admin_email'])) {
                $this->addError("El email del administrador ya está en uso.");
                return $this->response(null, 400);
            }

            // 2. Inicio de transacción
            $this->tenantRepo->beginTransaction();

            // 3. Crear empresa
            $domain = !empty($data['domain']) ? trim($data['domain']) : null;
            $tenantId = $this->tenantRepo->create(
                $data['name'], 
                $domain, 
                $data['status'] ?? 'active'
            );

            // 4. Crear Configuración
            $this->tenantRepo->createConfig([
                'tenant_id' => $tenantId,
                'company_name' => $data['name'],
                'logo_url' => $data['logo_url'] ?? null,
                'currency' => $data['currency'] ?? 'USD',
                'primary_color' => $data['primary_color'] ?? '#4f46e5',
                'secondary_color' => $data['secondary_color'] ?? '#0f172a',
                'accent_color' => $data['accent_color'] ?? '#06b6d4',
                'sidebar_bg' => $data['sidebar_bg'] ?? '#f8fafc',
                'sidebar_text' => $data['sidebar_text'] ?? '#334155',
                'color_approved' => $data['color_approved'] ?? '#10b981',
                'color_submitted' => $data['color_submitted'] ?? '#f59e0b',
                'color_rejected' => $data['color_rejected'] ?? '#ef4444',
                'color_draft' => $data['color_draft'] ?? '#94a3b8'
            ]);

            // 5. Crear Usuario Admin
            $passwordHash = password_hash($data['admin_password'] ?? '123456', PASSWORD_DEFAULT);
            $userId = $this->userRepo->create([
                'name' => $data['admin_name'] ?? 'Admin',
                'email' => $data['admin_email'],
                'password' => $passwordHash,
                'role' => 'admin',
                'role_id' => 1,
                'tenant_id' => $tenantId
            ]);

            // 6. Permisos iniciales
            $this->userRepo->assignAdminPermissions($userId, $tenantId);

            $this->tenantRepo->commit();
            $this->addMessage("Empresa registrada exitosamente.");
            return $this->response(['tenant_id' => $tenantId]);

        } catch (Exception $e) {
            $this->tenantRepo->rollBack();
            $this->addError("Error crítico en registro: " . $e->getMessage());
            return $this->response(null, 500);
        }
    }

    /**
     * Elimina una empresa si cumple las reglas de negocio.
     */
    public function removeTenant($id) {
        try {
            $userCount = $this->userRepo->countByTenant($id);
            if ($userCount > 1) {
                $this->addError("No se puede eliminar: la empresa tiene {$userCount} usuarios activos.");
                return $this->response(null, 403);
            }

            $this->tenantRepo->beginTransaction();

            $this->tenantRepo->deleteConfig($id);
            $this->userRepo->deletePermissionsByTenant($id);
            $this->userRepo->deleteByTenant($id);
            $this->tenantRepo->delete($id);

            $this->tenantRepo->commit();
            $this->addMessage("Empresa eliminada correctamente.");
            return $this->response(true);

        } catch (Exception $e) {
            $this->tenantRepo->rollBack();
            $this->addError("Fallo crítico en eliminación: " . $e->getMessage());
            return $this->response(null, 500);
        }
    }
}
