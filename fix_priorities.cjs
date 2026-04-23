const fs = require('fs');

const engFiles = ['src/i18n/locales/en_US.json', 'src/i18n/locales/en_GB.json'];
const ptFiles = ['src/i18n/locales/pt_BR.json', 'src/i18n/locales/pt_PT.json'];
const esFiles = ['src/i18n/locales/es_AR.json', 'src/i18n/locales/es_ES.json'];

[...engFiles, ...ptFiles, ...esFiles].forEach(file => {
  let content = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  if (engFiles.includes(file)) {
    content.kanban.priority_low = "Low";
    content.kanban.priority_medium = "Medium";
    content.kanban.priority_high = "High";
    
    content.reports.priority_low = "Low";
    content.reports.priority_medium = "Medium";
    content.reports.priority_critical = "Critical";
  } else if (ptFiles.includes(file)) {
    content.kanban.priority_low = "Baixa";
    content.kanban.priority_medium = "Média";
    content.kanban.priority_high = "Alta";
    
    content.reports.priority_low = "Baixa";
    content.reports.priority_medium = "Média";
    content.reports.priority_critical = "Crítica";
  } else {
    content.kanban.priority_low = "Baja";
    content.kanban.priority_medium = "Media";
    content.kanban.priority_high = "Alta";
    
    content.reports.priority_low = "Baja";
    content.reports.priority_medium = "Media";
    content.reports.priority_critical = "Crítica";
  }
  
  fs.writeFileSync(file, JSON.stringify(content, null, 2));
});
console.log('Priorities fixed in JSON files.');
