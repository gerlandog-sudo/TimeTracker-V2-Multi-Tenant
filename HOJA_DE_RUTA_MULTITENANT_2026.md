# Hoja de Ruta: Arquitectura Modular Multi-tenant 2026

Este documento detalla el paso a paso para la transformación del paradigma monolítico de TimeTracker hacia una plataforma SaaS (Software as a Service) modular y escalable.

## 1. Cambio de Paradigma: Del Monolito a Micro-Servicios
- **Infraestructura Actual**: Transición de una aplicación "todo-en-uno" hacia un Backend desacoplado (API REST) y un Frontend independiente (SPA).
- **Aislamiento de Lógica**: Cada controlador en `api/src/Controllers` está diseñado para funcionar como un módulo autónomo, facilitando su futura migración a microservicios reales (Node.js, Go o contenedores independientes).
- **Servicios Externos**: Integración modular de servicios de IA y procesamiento de datos.

## 2. Fase 1: Capa de Datos (Aislamiento)
- [x] **Identificador Único**: Añadir `tenant_id` a todas las tablas del sistema.
- [x] **Filtro Automático**: Implementar `Context::getTenantFilter()` en el backend para restringir consultas.
- [ ] **Migración de Datos**: Script para asignar el `tenant_id = 1` a todos los datos existentes (Legacy Migration).

## 3. Fase 2: Identificación y Seguridad
- [x] **Contexto de Sesión**: El JWT debe incluir el `tenant_id` del usuario logueado.
- [ ] **Detección por Dominio**: Implementar lógica en `index.php` para identificar el tenant mediante el host (`$_SERVER['HTTP_HOST']`).
- [x] **Validación de Cruce**: Impedir mediante código que un usuario de un tenant acceda a recursos de otro.

## 4. Fase 3: Personalización (White-Label)
- [x] **Configuración Dinámica**: Cargar `logo_url`, `primary_color` y `company_name` desde la tabla `tenants_config`.
- [ ] **Aislamiento de Archivos**: Estructurar la carpeta `/uploads` como `/uploads/{tenant_id}/`.
- [x] **Internacionalización (i18n)**: Soporte para 6 idiomas con carga dinámica según preferencia del tenant.

## 5. Fase 4: Super Administrador (Control Maestro)
- [x] **Dashboard Global**: Vista de métricas de todos los clientes.
- [x] **Gestor de Tenants**: Crear, editar y suspender empresas.
- [x] **Auditoría Global**: Registro de acciones críticas en toda la plataforma.

## 6. Fase 5: Modularización IA
- [x] **Motor Gemini**: Integración modular para insights predictivos.
- [x] **Simulación de Costos**: Módulo de IA para predicción de rentabilidad por perfil.
- [ ] **Activación por Plan**: Lógica para habilitar/deshabilitar IA según el contrato del tenant.

## 7. Fase 6: Desacoplamiento y Microservicios
- [x] **API First**: El frontend no tiene lógica de negocio, solo consume endpoints.
- [ ] **Service Discovery**: Implementar un gestor de servicios para escalar módulos pesados (IA/Reportes) en servidores dedicados.
- [ ] **Event-Driven**: Migrar la auditoría y notificaciones a un sistema basado en eventos para no bloquear el hilo principal de ejecución.

---
*Documento de Estrategia - TimeTracker V2 Modular Architecture & Microservices (rev. 2026)*
