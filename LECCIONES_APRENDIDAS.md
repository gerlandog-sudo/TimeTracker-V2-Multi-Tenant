# TimeTracker V2 Multi-Tenant: Manifiesto de Lecciones Aprendidas

Este documento consolida las lecciones técnicas, de diseño y de infraestructura extraídas durante la evolución de la plataforma. Es de cumplimiento obligatorio para garantizar la estabilidad y calidad premium del sistema.

---

## 1. Internacionalización y Localización (i18n)
*   **Normalización Sistémica**: Queda prohibido el uso de texto en duro ("hardcoded") en componentes. Todas las etiquetas deben residir en los diccionarios JSON (`src/i18n/locales/`).
*   **Paridad Lingüística**: Cualquier nueva funcionalidad o validación debe inyectarse simultáneamente en los seis idiomas oficiales (`es_AR`, `es_ES`, `en_US`, `en_GB`, `pt_BR`, `pt_PT`).
*   **Validaciones Dinámicas**: Los mensajes de error de la API o del frontend deben usar claves de traducción (ej. `t('super.tenants.error_name_required')`) para asegurar una comunicación profesional en todos los mercados.

## 2. Infraestructura y Despliegue
*   **Enrutamiento Relativo**: Evitar el uso de directivas `RewriteBase` absolutas en `.htaccess`. El sistema de reescritura debe ser agnóstico a la posición del directorio para garantizar la portabilidad entre servidores y subdominios.
*   **Sincronización de Artefactos**: Cada cambio en el núcleo de la API exige una reconstrucción total del bundle de producción. El punto de entrada JS debe estar alineado con la última versión de la lógica del servidor.
*   **Entornos de Producción**: La carpeta `ready_for_deploy/` es el único artefacto válido para el despliegue. Debe contener la estructura `/api` (con su `.htaccess`) y `/assets` sincronizados.

## 3. UX/UI Premium y Diseño
*   **Filosofía CERO SCROLL**: En procesos críticos (como el alta de empresas), priorizar el uso de **Steppers Horizontales** y contenedores compactos. Menos scroll equivale a mayor tasa de éxito.
*   **Identidad Visual Homogénea**: No crear componentes ad-hoc. Reutilizar patrones establecidos (selectores de color dual, contenedores `bg-gray-50/50`, tipografía `mono` para datos técnicos) para que la plataforma se sienta cohesiva.
*   **Micro-interacciones**: Mantener retroalimentación inmediata mediante notificaciones Toast (localizadas) para cada acción de éxito o error.

## 4. Gestión de Datos y Migraciones
*   **Migraciones Externas**: TODAS las migraciones de base de datos se ejecutan de forma independiente (scripts PHP externos). Nunca inyectar lógica de migración dentro del código de la plataforma para evitar errores transaccionales.
*   **Auditoría y Telemetría**: El sistema debe diferenciar entre el uso bruto (infraestructura) y la productividad neta (negocio). El Super Admin supervisa volumen; el Admin supervisa eficiencia.
*   **Blindaje de Datos**: La integridad referencial es innegociable. Validar siempre la existencia de dependencias (ej. usuarios activos) antes de permitir eliminaciones de inquilinos (Tenants).

## 5. Arquitectura Multi-Tenant
*   **Desacoplamiento Modular**: Seguir estrictamente el patrón Service-Repository. Los controladores deben ser delgados y delegar la lógica de negocio a servicios especializados.
*   **Seguridad de Contexto**: El `TenantId` debe ser inyectado y validado en cada petición mediante el `AuthService` y el `Context` de la API para evitar fugas de datos entre empresas.

---
**Última Actualización**: 2026-04-23
**Estado**: Activo y Mandatorio
