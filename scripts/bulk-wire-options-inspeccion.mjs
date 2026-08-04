import fs from 'fs';

const FI = 'inspection.ui.formulario_inspeccion';
const path = 'src/components/FormularioInspeccion.jsx';
let s = fs.readFileSync(path, 'utf8');

const newKeys = {
  hasAlarm: { es: 'Tiene alarma', en: 'Has alarm' },
  loadingAssistant: { es: 'Cargando asistente...', en: 'Loading assistant...' },
  castInPlaceBeams: { es: '1 = trabes coladas en sitio', en: '1 = cast-in-place beams' },
  prefabricatedBeams: { es: '2 = trabes prefabricadas', en: '2 = prefabricated beams' },
  solidSlabs: { es: '3 = losas macizas', en: '3 = solid slabs' },
  lightweightSlabs: { es: '4 = losas aligeradas', en: '4 = lightweight slabs' },
  radioOnly: { es: 'Radio', en: 'Radio' },
  internet: { es: 'Internet', en: 'Internet' },
  cable: { es: 'Cable', en: 'Cable' },
  motion: { es: 'Movimiento', en: 'Motion' },
  infrared: { es: 'Infrarrojos', en: 'Infrared' },
  continuous: { es: 'Continuo', en: 'Continuous' },
  occasional: { es: 'Occasional', en: 'Occasional' },
  remote: { es: 'Remoto', en: 'Remote' },
  byEvents: { es: 'Por eventos', en: 'By events' },
  localServer: { es: 'Servidor local', en: 'Local server' },
  hidden: { es: 'Oculto', en: 'Hidden' },
  visible: { es: 'Visible', en: 'Visible' },
  administrativeOffice: { es: 'Oficina administrativa', en: 'Administrative office' },
  noPerimeterFencing: { es: 'Sin cerramiento perimetral', en: 'No perimeter fencing' },
  freeAccess: { es: 'Acceso libre', en: 'Free access' },
  dayShiftLabel: { es: 'Diurna', en: 'Day shift' },
  nightShiftLabel: { es: 'Nocturna', en: 'Night shift' },
};

// Fix occasional ES value - I used wrong EN as key for es. Fix:
newKeys.occasional = { es: 'Ocasional', en: 'Occasional' };

for (const lang of ['es', 'en']) {
  const lp = `src/locales/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(lp, 'utf8'));
  const target = data.inspection.ui.formulario_inspeccion;
  let added = 0;
  for (const [k, v] of Object.entries(newKeys)) {
    if (target[k] === undefined) {
      target[k] = v[lang];
      added++;
    }
  }
  fs.writeFileSync(lp, JSON.stringify(data, null, 2) + '\n');
  console.log(`locales ${lang} +${added}`);
}

function escapeReg(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Map Spanish option DISPLAY text -> key (value attribute stays Spanish)
const optionMap = [
  ['1 = trabes coladas en sitio', 'castInPlaceBeams'],
  ['2 = trabes prefabricadas', 'prefabricatedBeams'],
  ['3 = losas macizas', 'solidSlabs'],
  ['4 = losas aligeradas', 'lightweightSlabs'],
  ['Almacenamiento en silos, tanques o contenedores', 'storageSilos'],
  ['Almacenamiento en pallets', 'storagePallets'],
  ['Almacenamiento al aire libre', 'storageOpenAir'],
  ['Empaque combustible', 'combustiblePackaging'],
  ['Sin cerramiento perimetral', 'noPerimeterFencing'],
  ['Oficina administrativa', 'administrativeOffice'],
  ['Servidor local', 'localServer'],
  ['Acceso libre', 'freeAccess'],
  ['Por eventos', 'byEvents'],
  ['Infrarrojos', 'infrared'],
  ['Movimiento', 'motion'],
  ['Continuo', 'continuous'],
  ['Ocasional', 'occasional'],
  ['Remoto', 'remote'],
  ['Combustibles', 'combustibles'],
  ['Inflamables', 'flammables'],
  ['Explosivos', 'explosives'],
  ['Corrosivos', 'corrosives'],
  ['Extremo', 'extreme'],
  ['Deficiente', 'deficient'],
  ['Adecuado', 'adequate'],
  ['Regular', 'regular'],
  ['Internet', 'internet'],
  ['Oculto', 'hidden'],
  ['Visible', 'visible'],
  ['Cable', 'cable'],
  ['Radio', 'radioOnly'],
  ['Sacos', 'sacks'],
  ['Bidones', 'drums'],
  ['Bajo', 'low'],
  ['Medio', 'medium'],
  ['Alto', 'high'],
  ['24 horas', 'hours24'],
  ['Diurna', 'dayShift'],
  ['Nocturna', 'nightShift'],
];

let count = 0;

// Simple JSX text replacements
const textReplacements = [
  ['Cargando mapa...', 'loadingMap'],
  ['Cargando asistente...', 'loadingAssistant'],
  ['Tiene alarma', 'hasAlarm'],
  ['Personal que realiza mantenimiento', 'maintenanceStaff'],
];

for (const [es, key] of textReplacements) {
  const repl = `{t('${FI}.${key}')}`;
  const re = new RegExp(`>(\\s*)${escapeReg(es)}(\\s*)<`, 'g');
  s = s.replace(re, (m, a, b) => {
    count++;
    return `>${a}${repl}${b}<`;
  });
  // Word helpers
  const re2 = new RegExp(`encabezadoTabla\\("${escapeReg(es)}"`, 'g');
  s = s.replace(re2, () => {
    count++;
    return `encabezadoTabla(t('${FI}.${key}')`;
  });
}

// Option display: <option value="ES">ES</option> -> <option value="ES">{t(...)}</option>
// Also <option value="">ES</option>
for (const [es, key] of optionMap) {
  const repl = `{t('${FI}.${key}')}`;
  // exact match between tags for option content
  const re = new RegExp(`(<option\\s+[^>]*>)(\\s*)${escapeReg(es)}(\\s*)(</option>)`, 'g');
  s = s.replace(re, (m, open, a, b, close) => {
    count++;
    return `${open}${a}${repl}${b}${close}`;
  });
}

fs.writeFileSync(path, s);
console.log('replacements', count);

// residual quick check
const leftovers = [
  'Cargando mapa...',
  'Tiene alarma',
  'Personal que realiza mantenimiento',
  'Cargando asistente...',
  '>Bajo<',
  '>Combustibles<',
  '>Movimiento<',
  'trabes coladas',
];
for (const x of leftovers) {
  console.log(x, s.includes(x) ? 'STILL' : 'gone');
}
