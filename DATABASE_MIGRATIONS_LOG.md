# Registro de Evolución de Base de Datos - TimeTracker V2 Multi-Tenant

Este documento registra cronológicamente todas las alteraciones realizadas al esquema de base de datos para asegurar la integridad del modelo Multi-Tenant.

---

## 1. Estructura Core (Aislamiento)
- **Cambio Global**: Se añadió la columna `tenant_id` (INT, NOT NULL) a todas las tablas del sistema.
- **Tabla `tenants`**: 
    - Creada para gestionar las empresas.
    - Campos: `id` (PK), `name`, `domain`, `status`, `created_at`.

## 2. Tabla: `permissions` (MODIFICADA)
- **Cambio**: Cambio de Clave Primaria de `(role_id, feature)` a `(role_id, feature, tenant_id)`.
- **Razón**: Permite que el Rol 1 (Admin) exista en N empresas con diferentes permisos sin violar restricciones de integridad.
- **Migra**: `api/migra_permissions_pk.php`

## 3. Tabla: `system_config` (MODIFICADA)
- **Aislamiento**: Se añadió `tenant_id`.
- **Identidad**: Se añadieron columnas para marca blanca: `primary_color`, `secondary_color`, `accent_color`, `logo_url` (Text/Base64), `sidebar_bg`, `sidebar_text`.
- **Colores de Estado**: `color_approved`, `color_rejected`, `color_submitted`, `color_draft`.

## 4. Tabla: `users` (MODIFICADA)
- **Aislamiento**: Se añadió `tenant_id`.
- **Seguridad**: El campo `email` se mantiene como `UNIQUE` a nivel global.
- **Relación**: Vinculación obligatoria con `role_id` y `tenant_id`.

## 5. Tabla: `roles` (EN REVISIÓN)
- **Configuración**: El Administrador de cada empresa tiene `financial_access = 1` y `system_config_access = 1` por defecto a través del Rol ID 1.

---
*Documento generado automáticamente por la Arquitectura de Software v2.01.019*
