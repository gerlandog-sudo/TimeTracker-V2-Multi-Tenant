const fs = require('fs');

let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const replacements = [
  ["Error al procesar el cargo", "t('config.error_process_position')"],
  ["Error al procesar la tarea", "t('config.error_process_task')"],
  ["'Confirmar Eliminación'", "t('config.delete_title')"],
  ["'¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.'", "t('config.delete_message')"],
  ["'No se puede eliminar el elemento.'", "t('config.error_delete')"],
  ["'Error al guardar la configuración. Verifica la conexión con la base de datos.'", "t('config.error_save')"],
  ["Nombre de la Empresa", "{t('config.company_name')}"],
  ["Moneda Base", "{t('config.base_currency')}"],
  ["Dólares (USD)", "{t('config.currency_usd')}"],
  ["Pesos Argentinos (ARS)", "{t('config.currency_ars')}"],
  ["Euros (EUR)", "{t('config.currency_eur')}"],
  ["Identidad Visual", "{t('config.visual_identity')}"],
  ["Logo de la Empresa", "{t('config.company_logo')}"],
  ["Subir Imagen", "{t('config.upload_image')}"],
  ["> Eliminar", "> {t('config.remove')}"],
  ["Se recomienda un logo con fondo transparente (PNG/SVG) de máximo 500KB.", "{t('config.logo_hint')}"],
  [">Sin Logo<", ">{t('config.no_logo')}<"],
  ["Colores de la Plataforma", "{t('config.platform_colors')}"],
  ["Restaurar colores por defecto", "{t('config.reset_colors')}"],
  ["Color Primario", "{t('config.primary_color')}"],
  ["Color Secundario", "{t('config.secondary_color')}"],
  ["Color de Acento", "{t('config.accent_color')}"],
  ["Fondo Sidebar", "{t('config.sidebar_bg')}"],
  ["Texto Sidebar", "{t('config.sidebar_text')}"],
  ["Colores de Estados (Tracker)", "{t('config.tracker_colors')}"],
  [">Aprobadas<", ">{t('config.color_approved')}<"],
  [">Enviadas<", ">{t('config.color_submitted')}<"],
  [">Rechazadas<", ">{t('config.color_rejected')}<"],
  [">Borrador<", ">{t('config.color_draft')}<"],
  ["¡Cambios guardados con éxito!", "{t('config.save_success')}"],
  ["Los cambios se aplicarán a todos los usuarios inmediatamente.", "{t('config.apply_global')}"],
  [">Guardar Cambios", ">{t('config.save_changes')}"],
  ["Control de Acceso por Rol", "{t('config.role_access')}"],
  ["Guardar Permisos", "{t('config.save_permissions')}"],
  ["Funcionalidad", "{t('config.feature')}"],
  ["* El rol Administrador tiene acceso total por defecto y no puede ser modificado para evitar bloqueos del sistema.", "{t('config.admin_hint')}"],
  ["Nuevo Cargo", "{t('config.new_position')}"],
  ["Nombre del Cargo", "{t('config.position_name')}"],
  ["No hay cargos definidos", "{t('config.no_positions')}"],
  ["Editar Cargo", "{t('config.edit_position')}"],
  ["Nueva Tarea", "{t('config.new_task')}"],
  ["Nombre de la Tarea", "{t('config.task_name')}"],
  ["No hay tareas definidas", "{t('config.no_tasks')}"],
  ["Editar Tarea", "{t('config.edit_task')}"],
  ["Nueva Tarifa", "{t('config.new_rate')}"],
  ["Editar Tarifa", "{t('config.edit_rate')}"],
  ["No hay tarifas definidas", "{t('config.no_rates')}"]
];

for (const [search, replace] of replacements) {
    content = content.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
}

fs.writeFileSync('src/pages/Settings.tsx', content);
