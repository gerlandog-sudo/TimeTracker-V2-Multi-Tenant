const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

async function run() {
  const esArRaw = fs.readFileSync('src/i18n/locales/es_AR.json', 'utf8');
  const enUsRaw = fs.readFileSync('src/i18n/locales/en_US.json', 'utf8');

  // es_ES: Just copy from es_AR and change a few voseo things to tuteo natively
  let esEsRaw = esArRaw
    .replace(/Ajustá/g, 'Ajusta')
    .replace(/Ingresá/g, 'Ingresa')
    .replace(/Revisá/g, 'Revisa')
    .replace(/Confirmá/g, 'Confirma')
    .replace(/Seleccioná/g, 'Selecciona')
    .replace(/Hs/g, 'H');
  fs.writeFileSync('src/i18n/locales/es_ES.json', esEsRaw);
  console.log('es_ES.json created.');

  // en_GB: Just copy from en_US and change color to colour
  let enGbRaw = enUsRaw
    .replace(/Color/g, 'Colour')
    .replace(/color/g, 'colour');
  fs.writeFileSync('src/i18n/locales/en_GB.json', enGbRaw);
  console.log('en_GB.json created.');

  // pt_BR: Use AI to translate es_AR to Portuguese (Brazil)
  console.log('Translating to pt_BR...');
  const promptPtBr = `Eres un experto traductor a Portugués de Brasil (pt_BR).
Por favor, traduce el siguiente archivo JSON. MANTEN LA ESTRUCTURA JSON Y LAS CLAVES INTACTAS.
Solo traduce el valor de cada clave al Portugués de Brasil (ejemplo: "Dashboard" -> "Painel", "Configuración" -> "Configurações").
Asegúrate de que la salida sea un JSON válido. No uses Markdown, solo devuelve el objeto JSON crudo en texto.
Asegurate de incluir TODAS y cada una de las claves y valores.

JSON A TRADUCIR:
${esArRaw}`;

  const resBr = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: promptPtBr,
  });

  let ptBrRaw = resBr.text.replace(/```json/g, '').replace(/```/g, '').trim();
  fs.writeFileSync('src/i18n/locales/pt_BR.json', ptBrRaw);
  console.log('pt_BR.json created.');

  // pt_PT: Use AI to translate to Portuguese (Portugal)
  console.log('Translating to pt_PT...');
  const promptPtPt = `Eres un experto traductor a Portugués de Europa/Portugal (pt_PT).
Por favor, traduce el siguiente archivo JSON. MANTEN LA ESTRUCTURA JSON Y LAS CLAVES INTACTAS.
Solo traduce el valor de cada clave al Portugués de Portugal. 
Asegúrate de que la salida sea un JSON válido. No uses Markdown, solo devuelve el objeto JSON crudo en texto.
Asegurate de incluir TODAS y cada una de las claves y valores.

JSON A TRADUCIR:
${esArRaw}`;

  const resPt = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: promptPtPt,
  });

  let ptPtRaw = resPt.text.replace(/```json/g, '').replace(/```/g, '').trim();
  fs.writeFileSync('src/i18n/locales/pt_PT.json', ptPtRaw);
  console.log('pt_PT.json created.');
}

run().catch(console.error);
