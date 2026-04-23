const fs = require('fs');

let content = fs.readFileSync('src/pages/reports/AuditLog.tsx', 'utf8');

const replacements = [
  ["Sólo Rechazos", "t('reports.only_rejections')"],
  ["Cambios Post-Aprobación", "t('reports.post_approval')"],
  ["Umbral Anomalía (Días):", "t('reports.anomaly_threshold')"],
  ["Timestamp", "{t('reports.timestamp')}"],
  [">Usuario<", ">{t('reports.header_user')}<"],
  ["Acción / Transición", "{t('reports.action_transition')}"],
  [">Realizado por<", ">{t('reports.performed_by')}<"],
  [">Alertas<", ">{t('reports.header_alerts')}<"],
  ["No se encontraron registros de auditoría.", "{t('reports.no_records')}"],
  ["Detalle de Movimientos", "{t('reports.movement_detail')}"],
  ["Alertas Detectadas", "{t('reports.alerts_detected')}"],
  ["Contexto Original", "{t('reports.original_context')}"],
  ["> Proyecto<", "> {t('reports.project')}<"],
  ["> Re-trabajo<", "> {t('reports.re_work')}<"],
  [" rechazos<", " {t('reports.rejections')}<"],
  ["> Descripción<", "> {t('reports.description')}<"],
  [">Usuario<", ">{t('reports.header_user')}<"], // Was already replaced, but just in case
  ["Línea de tiempo", "{t('reports.timeline')}"],
  ["Todos los Usuarios", "t('reports.all_users')"],
  ["Todos los Proyectos", "t('reports.all_projects')"]
];

for (const [search, replace] of replacements) {
    if (search.startsWith('>') && search.endsWith('<')) {
        content = content.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
    } else {
        content = content.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replace);
    }
}
fs.writeFileSync('src/pages/reports/AuditLog.tsx', content);

const baseKeys = {
    "only_rejections": "Sólo Rechazos",
    "post_approval": "Cambios Post-Aprobación",
    "anomaly_threshold": "Umbral Anomalía (Días):",
    "timestamp": "Timestamp",
    "header_user": "Usuario",
    "action_transition": "Acción / Transición",
    "performed_by": "Realizado por",
    "header_alerts": "Alertas",
    "no_records": "No se encontraron registros de auditoría.",
    "movement_detail": "Detalle de Movimientos",
    "alerts_detected": "Alertas Detectadas",
    "original_context": "Contexto Original",
    "project": "Proyecto",
    "re_work": "Re-trabajo",
    "rejections": "rechazos",
    "description": "Descripción",
    "timeline": "Línea de tiempo",
    "all_users": "Todos los Usuarios",
    "all_projects": "Todos los Proyectos"
};

const enKeys = {
    "only_rejections": "Only Rejections",
    "post_approval": "Post-Approval Changes",
    "anomaly_threshold": "Anomaly Threshold (Days):",
    "timestamp": "Timestamp",
    "header_user": "User",
    "action_transition": "Action / Transition",
    "performed_by": "Performed By",
    "header_alerts": "Alerts",
    "no_records": "No audit records found.",
    "movement_detail": "Movement Details",
    "alerts_detected": "Detected Alerts",
    "original_context": "Original Context",
    "project": "Project",
    "re_work": "Rework",
    "rejections": "rejections",
    "description": "Description",
    "timeline": "Timeline",
    "all_users": "All Users",
    "all_projects": "All Projects"
};

['es_AR', 'en_US'].forEach(lang => {
    const file = `src/i18n/locales/${lang}.json`;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!data.reports) data.reports = {};
    const keys = lang === 'es_AR' ? baseKeys : enKeys;
    Object.assign(data.reports, keys);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
});
