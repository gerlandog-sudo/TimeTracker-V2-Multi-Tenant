# 🛠 PLAN MAESTRO: DESACOPLAMIENTO MODULAR (MONOLITO MODULAR)
**Proyecto**: TimeTracker V2 Multi-Tenant  
**Objetivo**: Transformar el monolito actual en una flota de servicios independientes preparados para escalar.  
**Estado**: 🟢 Planificado | ⚪ En Ejecución | ⚪ Completado

---

## 📅 HITO 1: INFRAESTRUCTURA Y CONTRATOS (Cimientos)
Este paso prepara el "terreno" donde vivirán los nuevos servicios.

- [ ] **1.1 Estructura de Directorios**: Crear carpetas `api/src/Services`, `api/src/Repositories` y `api/src/Interfaces`.
- [ ] **1.2 Base Core**: Crear la clase `BaseService` para estandarizar la gestión de errores y logs en todos los servicios.
- [ ] **1.3 Base Data**: Crear la clase `BaseRepository` para centralizar la conexión a la base de datos de forma segura.
- [ ] **1.4 Service Locator**: Implementar un mecanismo simple para que los controladores puedan pedir servicios sin instanciarlos manualmente.

---

## 🏗 HITO 2: DOMINIO DE IDENTIDAD (El Corazón)
Separar quién es el usuario y qué puede hacer.

- [ ] **2.1 AuthService**: Mover la lógica de JWT, Login y Reset de Password a un servicio dedicado.
- [ ] **2.2 UserRepository**: Centralizar todas las consultas de la tabla `users` (CRUD, búsquedas, validación de email).
- [ ] **2.3 RoleService**: Mover la gestión de permisos y roles a una lógica modular.
- [ ] **2.4 Refactor de Controllers**: Limpiar `AuthController` y `UsersController` para que solo llamen al `AuthService`.

---

## 📊 HITO 3: DOMINIO OPERACIONAL (El Negocio)
El núcleo del Tracker y el Kanban.

- [ ] **3.1 TrackerService**: Mover el registro de horas, validación de límites y estados (draft, approved).
- [ ] **3.2 KanbanService**: Lógica de movimiento de tarjetas, cambios de prioridad y tiempos de inicio/fin.
- [ ] **3.3 ProjectRepository**: Centralizar consultas de proyectos y presupuestos.
- [ ] **3.4 ClientRepository**: Centralizar gestión de datos legales y de contacto de clientes.

---

## 💰 HITO 4: DOMINIO FINANCIERO Y REPORTES
Cálculos complejos y rentabilidad.

- [ ] **4.1 FinanceService**: Centralizar el cálculo de `actual_revenue` y costos por hora (evitando duplicar SQL en Clientes y Proyectos).
- [ ] **4.2 ReportService**: Mover la generación de reportes IA y simulaciones de costos a un módulo aislado.
- [ ] **4.3 ConfigService**: Gestión de marca blanca (colores, logos) como servicio independiente.

---

## 📢 HITO 5: BUS DE EVENTOS (Desacoplamiento Total)
Hacer que los servicios se hablen mediante mensajes, no por código.

- [ ] **5.1 EventDispatcher**: Crear el motor de eventos interno.
- [ ] **5.2 Auditoría Automática**: Hacer que cada acción (crear, borrar, editar) dispare un evento que el `AuditService` atrape y guarde automáticamente.
- [ ] **5.3 Sistema de Notificaciones**: Desacoplar el envío de emails para que sea una consecuencia de los eventos del sistema.

---

## 🏁 HITO 6: LIMPIEZA Y CIERRE DE FASE
- [ ] **6.1 Auditoría de "Thin Controllers"**: Verificar que ningún controlador tenga más de 10-15 líneas de lógica.
- [ ] **6.2 Eliminación de Código Muerto**: Borrar funciones obsoletas que quedaron en el monolito.
- [ ] **6.3 Prueba de Humo Final**: Validación de flujo completo de usuario (Registro -> Tracker -> Aprobación -> Reporte).

---

### ⚠️ MATRIZ DE RIESGOS (Para tener presente en cada paso)
1. **Riesgo**: Rotura de la sesión JWT. **Protección**: No tocaremos el `AuthMiddleware` hasta que el `AuthService` sea estable.
2. **Riesgo**: Cálculos financieros erróneos. **Protección**: Compararemos los resultados del servicio nuevo vs los del código viejo antes de borrar.
3. **Riesgo**: Error de carga en cPanel. **Protección**: Usamos carga automática (PSR-4) para evitar miles de `require_once`.

---
*Este plan es una hoja de ruta viva. No avanzaremos al siguiente Hito sin que el anterior esté marcado como completado y validado.*
