const fs = require('fs');

const engFiles = ['src/i18n/locales/en_US.json', 'src/i18n/locales/en_GB.json'];
const ptFiles = ['src/i18n/locales/pt_BR.json', 'src/i18n/locales/pt_PT.json'];
const esFiles = ['src/i18n/locales/es_AR.json', 'src/i18n/locales/es_ES.json'];

[...engFiles, ...ptFiles, ...esFiles].forEach(file => {
  let content = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  if (engFiles.includes(file)) {
    content.reports.end_of_budget = "End of Budget";
    content.reports.in_weeks = "In {{weeks}} wks";
    content.reports.undefined = "Undefined";
    content.reports.senior_participation = "Senior Participation";
    content.reports.attention = "Attention:";
    content.reports.writing_rec = "Drafting recommendation...";
  } else if (ptFiles.includes(file)) {
    content.reports.end_of_budget = "Fim do Orçamento";
    content.reports.in_weeks = "Em {{weeks}} sem.";
    content.reports.undefined = "Indefinido";
    content.reports.senior_participation = "Participação Sênior";
    content.reports.attention = "Atenção:";
    content.reports.writing_rec = "Redigindo recomendação...";
  } else {
    content.reports.end_of_budget = "Fin de Budget";
    content.reports.in_weeks = "En {{weeks}} sem.";
    content.reports.undefined = "Indefinido";
    content.reports.senior_participation = "Participación Senior";
    content.reports.attention = "Atención:";
    content.reports.writing_rec = "Redactando recomendación...";
  }
  
  fs.writeFileSync(file, JSON.stringify(content, null, 2));
});
console.log('Missing report keys fixed in JSON files.');
