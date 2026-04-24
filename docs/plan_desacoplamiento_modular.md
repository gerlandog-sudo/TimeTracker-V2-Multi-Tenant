# Plan Maestro de Desacoplamiento Modular - TimeTracker V2

Este documento detalla la estrategia de transformación del monolito de TimeTracker V2 hacia una arquitectura modular optimizada para entornos de hosting compartido (CPanel/PHP). 

## 1. Visión General de la Arquitectura Híbrida
Se implementará un **Router Híbrido** en el punto de entrada de la API. Este permitirá que las funcionalidades migradas se atiendan desde la nueva estructura modular (`src/Modules/`), mientras que las funcionalidades pendientes sigan siendo gestionadas por los controladores tradicionales (`src/Controllers/`).

### Beneficios:
- **Cero tiempo de inactividad**: Migración progresiva "en caliente".
- **Rollback instantáneo**: Si un módulo falla, se redirige al controlador viejo en segundos.
- **Mantenibilidad**: Código desacoplado, fácil de testear y escalar.

---

## 2. Checklist de Migración por Módulos

### Módulos de Infraestructura y Acceso (Core)
- [x] **Módulo 00: Core Engine**
  - [x] Router Híbrido (Dispatcher modular).
  - [ ] Middleware de Contexto y Tenant.
  - [ ] Gestión centralizada de Respuestas (Response API).
- [ ] **Módulo 01: Auth & Identity**
  - [ ] Login (Autenticación JWT).
  - [ ] Recuperación de Contraseña (OTP).
  - [ ] Gestión de Sesiones y Seguridad.

### Módulos de Super Administrador (Global)
- [ ] **Módulo 02: Super Admin - Tenants**
  - [ ] Listado y Gestión de Empresas (Tenants).
  - [ ] Configuración de Identidad Visual Global.
  - [ ] Alta de Administradores Maestros.
- [ ] **Módulo 03: Super Admin - Monitoring**
  - [ ] Auditoría Global de Sistema (Global Logs).
  - [ ] Dashboard Global y Telemetría del Servidor.

### Módulos de Negocio (Tenant Level)
- [ ] **Módulo 04: CRM & Project Management**
  - [ ] Gestión de Clientes y Contactos.
  - [ ] Gestión de Proyectos y Presupuestos.
- [ ] **Módulo 05: Resource Management**
  - [ ] Gestión de Usuarios y Roles.
  - [ ] Maestro de Cargos y Seniority.
  - [ ] Tarifas de Facturación y Costos.
- [ ] **Módulo 06: Time Tracking & Kanban**
  - [ ] Tracker (Carga de horas diaria/semanal).
  - [ ] Integración Kanban (Tareas y Estados).
  - [ ] Registro de tiempo desde tablero.
- [ ] **Módulo 07: Workflow & Approvals**
  - [ ] Flujo de Aprobación/Rechazo de horas.
  - [ ] Acciones Masivas y Reversión de estados.
- [ ] **Módulo 10: Configuration & Matrix**
  - [ ] Configuración de Tenant (Visual y General).
  - [ ] Matriz de Permisos por Rol.
  - [ ] Maestro de Tareas.

### Módulos de Reporting e Inteligencia
- [x] **Módulo 08: Analytics & Audit**
  - [x] Log de Auditoría por Tenant (Pagidado).
  - [ ] Heatmaps (Planificación de Capacidad).
- [ ] **Módulo 09: Intelligent Insights (AI)**
  - [ ] Alertas Predictivas (Integración Gemini).
  - [ ] Simulador de Impacto Operativo.

---

## 3. Estado de Avance
- **Progreso Actual**: 0% (Arquitectura Monolítica Activa).
- **Último Hito**: Estabilización de i18n y Paginación en Reportes.
- **Próximo Paso**: Implementación del Módulo 00 (Core Engine) y migración de Auditoría.

---

## 4. Guía de Despliegue Modular
Cada vez que un módulo sea marcado como completado:
1. Se actualizarán los repositorios en `src/Modules/[Nombre]`.
2. Se activará el ruteo en `api/index.php`.
3. Se realizará un `npm run build` para asegurar el Code-Splitting en el frontend.
