# 🧪 Hoja de Ruta: Prueba de Concepto (PoC)
**Módulo objetivo**: Gestión de Empresas (Tenants)
**Arquitectura**: Capas (Controller -> Service -> Repository)

---

## 📂 1. Creación de Infraestructura (Cimientos)
Antes de mover lógica, debemos establecer las clases padre que heredarán todos los servicios futuros.

- [ ] **1.1 Crear `api/src/Core/BaseRepository.php`**:
    *   Centralizar la propiedad `$db` (PDO).
    *   Métodos base para ejecución de queries y manejo de transacciones.
- [ ] **1.2 Crear `api/src/Core/BaseService.php`**:
    *   Propiedad para manejo de errores/mensajes.
    *   Método `response($data, $status)` para estandarizar salidas hacia los controladores.

---

## 🏗️ 2. Implementación del Patrón Repository
Aislar el acceso a datos. El controlador ya no debe conocer SQL.

- [ ] **2.1 Crear `api/src/Repositories/TenantRepository.php`**:
    *   Heredar de `BaseRepository`.
    *   Método `getAllTenants()`: Mover el SQL de `SuperAdminController`.
    *   Método `getTenantStats()`: Mover las consultas de conteo de usuarios por empresa.
    *   Método `updateTenantStatus($id, $status)`: Lógica de actualización.

---

## ⚙️ 3. Implementación de la Capa de Servicio
Aislar la lógica de negocio.

- [ ] **3.1 Crear `api/src/Services/TenantService.php`**:
    *   Instanciar `TenantRepository` en el constructor.
    *   Método `listAll()`: Llama al repositorio y formatea los datos.
    *   Método `toggleStatus($id, $currentStatus)`: Lógica para pausar o activar empresas con validaciones previas.

---

## 🔗 4. Refactor del Controlador (El "Cableado")
Conectar la nueva lógica al flujo existente.

- [ ] **4.1 Modificar `api/src/Controllers/SuperAdminController.php`**:
    *   Eliminar la instanciación de `$this->db` (si es posible) en los métodos de Tenants.
    *   Instanciar `TenantService`.
    *   Sustituir bloques de código por: `$result = $this->tenantService->listAll();`.

---

## 🚩 5. Criterios de Validación (Éxito de la PoC)
1.  **Paridad Funcional**: La pantalla de "Empresas / Tenants" carga y permite editar exactamente igual que antes.
2.  **Aislamiento**: El archivo `SuperAdminController.php` ya no contiene strings de SQL (SELECT/UPDATE) para la tabla `tenants`.
3.  **Auditabilidad**: Los errores de base de datos son capturados por el `BaseRepository` y reportados de forma limpia.

---

## ⚠️ Riesgos y Mitigación
*   **Riesgo**: Error de sintaxis en clases Base.
*   **Mitigación**: Subir primero los archivos de la carpeta `Core` y `Repositories` (no rompen nada al estar inactivos). Solo actualizar el `Controller` al final.
*   **Rollback**: Si el controlador falla, restaurar el respaldo de `SuperAdminController.php` (toma 5 segundos).
