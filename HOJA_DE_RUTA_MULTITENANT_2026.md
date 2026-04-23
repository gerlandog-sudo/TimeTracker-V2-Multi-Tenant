# Hoja de Ruta: Arquitectura Modular Multi-tenant 2026

Este documento detalla el paso a paso para la transformación del paradigma monolítico de TimeTracker hacia una plataforma SaaS (Software as a Service) modular y escalable.

## 1. Cambio de Paradigma: Del Monolito a Micro-Servicios
- [x] **Infraestructura Desacoplada**: Transición completada de aplicación "todo-en-uno" hacia Backend (API REST) y Frontend (SPA) independientes.
- [x] **Aislamiento de Lógica**: Controladores autónomos en `api/src/Controllers` listos para escalado independiente.
- [x] **Servicios Externos**: Integración exitosa de servicios de IA (Gemini) como módulos desacoplados.

## 2. Fase 1: Capa de Datos (Aislamiento)
- [x] **Identificador Único**: Añadir `tenant_id` a todas las tablas del sistema.
- [x] **Filtro Automático**: Implementar `Context::getTenantFilter()` en el backend para restringir consultas.
- [x] **Migración de Datos**: Mecanismo de migración de tenants maestros operativo.

## 3. Fase 2: Identificación y Seguridad
- [x] **Contexto de Sesión**: El JWT incluye el `tenant_id` del usuario logueado.
- [ ] **Detección por Dominio**: Pendiente implementar lógica de host dinámico (`empresa.timetracker.com`).
- [x] **Validación de Cruce**: Restricción de acceso a recursos entre diferentes tenants completada.

## 4. Fase 3: Personalización (White-Label)
- [x] **Configuración Dinámica**: Carga de logos, colores y marca blanca funcional.
- [ ] **Aislamiento de Archivos**: Pendiente estructurar `/uploads/{tenant_id}/`.
- [x] **Internacionalización (i18n)**: Soporte completo para 6 idiomas (ES_ar, ES_es, EN_us, EN_gb, PT_br, PT_pt).

## 5. Fase 4: Super Administrador (Control Maestro)
- [x] **Dashboard Global**: Vista de métricas consolidadas.
- [x] **Gestor de Tenants**: ABM de empresas y suscripciones operativo.
- [x] **Auditoría Global**: Sistema de logs paginado y funcional para control maestro.

## 6. Fase 5: Modularización IA
- [x] **Motor Gemini**: Integración modular con el SDK oficial.
- [x] **Simulación de Costos**: Módulo de predicción IA por perfil funcional.
- [ ] **Activación por Plan**: Pendiente lógica de habilitación de módulos IA según contrato.

## 7. Fase 6: Desacoplamiento y Microservicios
- [x] **API First**: Separación total entre Frontend (React) y Backend (PHP).
- [ ] **Service Discovery**: Pendiente gestor de servicios escalables.
- [ ] **Event-Driven**: Pendiente migración a arquitectura basada en eventos para notificaciones.

---
*Documento de Estrategia - TimeTracker V2 Modular Architecture & Microservices (rev. 2026)*
