import fs from 'fs';

const FI = 'inspection.ui.formulario_inspeccion';
const map = [
  ['Altura máxima de la estantería', 'maxShelvingHeight'],
  ['Tipo de mercancía', 'merchandiseTypeField'],
  ['Mercancías peligrosas', 'dangerousGoods'],
  ['📋 ANÁLISIS DE RIESGOS', 'riskAnalysisTitle'],
  ['RIESGO (Sincronizado)', 'riskSyncedHeader'],
  ['RIESGO', 'riskHeader'],
  ['ANÁLISIS', 'analysisHeader'],
  ['Banco de Recomendaciones', 'recommendationBank'],
  ['Categoría', 'category'],
  ['Recomendación Predefinida', 'predefinedRecommendation'],
  ['Seleccione una recomendación para agregar...', 'selectRecommendationToAdd'],
  ['Agregar Nueva Recomendación al Banco', 'addNewRecommendationToBank'],
  ['Agregar al Banco', 'addToBank'],
  ['Esta recomendación se agregará al banco de la categoría seleccionada', 'recommendationAddedToBankHint'],
  ['Recomendaciones del informe', 'reportRecommendations'],
  ['Agregar recomendación', 'addRecommendation'],
  ['Fecha de seguimiento o control', 'followUpOrControlDate'],
  ['Asistente de IA para Recomendaciones', 'aiRecommendationsAssistant'],
  ['El asistente de IA puede ayudarte a mejorar, estructurar y generar recomendaciones basadas en toda la información del formulario de inspección.', 'aiRecommendationsHelp'],
  ['Acciones del Formulario', 'formActions'],
];

const newKeys = {
  dangerousGoods: { es: 'Mercancías peligrosas', en: 'Dangerous goods' },
  recommendationBank: { es: 'Banco de Recomendaciones', en: 'Recommendations bank' },
  category: { es: 'Categoría', en: 'Category' },
  predefinedRecommendation: { es: 'Recomendación Predefinida', en: 'Predefined recommendation' },
  selectRecommendationToAdd: {
    es: 'Seleccione una recomendación para agregar...',
    en: 'Select a recommendation to add...',
  },
  addNewRecommendationToBank: {
    es: 'Agregar Nueva Recomendación al Banco',
    en: 'Add new recommendation to the bank',
  },
  addToBank: { es: 'Agregar al Banco', en: 'Add to bank' },
  recommendationAddedToBankHint: {
    es: 'Esta recomendación se agregará al banco de la categoría seleccionada',
    en: 'This recommendation will be added to the bank for the selected category',
  },
  followUpOrControlDate: {
    es: 'Fecha de seguimiento o control',
    en: 'Follow-up or control date',
  },
  aiRecommendationsAssistant: {
    es: 'Asistente de IA para Recomendaciones',
    en: 'AI recommendations assistant',
  },
  aiRecommendationsHelp: {
    es: 'El asistente de IA puede ayudarte a mejorar, estructurar y generar recomendaciones basadas en toda la información del formulario de inspección.',
    en: 'The AI assistant can help you improve, structure, and generate recommendations based on all the information in the inspection form.',
  },
  formActions: { es: 'Acciones del Formulario', en: 'Form actions' },
};

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const lang of ['es', 'en']) {
  const path = `src/locales/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  const target = data.inspection.ui.formulario_inspeccion;
  let added = 0;
  for (const [k, v] of Object.entries(newKeys)) {
    if (target[k] === undefined) {
      target[k] = v[lang];
      added++;
    }
  }
  fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`locales ${lang}: +${added}`);
}

const path = 'src/components/FormularioInspeccion.jsx';
let out = fs.readFileSync(path, 'utf8');
let count = 0;
for (const [es, key] of map) {
  const repl = `{t('${FI}.${key}')}`;
  const re = new RegExp(`>(\\s*)${escapeReg(es)}(\\s*)<`, 'g');
  out = out.replace(re, (m, a, b) => {
    count++;
    return `>${a}${repl}${b}<`;
  });
}
fs.writeFileSync(path, out);
console.log('replacements:', count);
