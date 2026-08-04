import fs from 'fs';

const FI = 'inspection.ui.formulario_inspeccion';
const P = (k) => `{t('${FI}.${k}')}`;

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const labelMap = [
  ['Requiere permiso de vertimientos o emisiones contaminantes', 'requiresDischargePermit'],
  ['Genera vertimiento de aguas residuales contaminantes', 'generatesContaminatedWastewater'],
  ['Cuenta con planta de tratamiento de aguas residuales', 'hasWastewaterTreatmentPlant'],
  ['Cuenta con plan de manejo integral de residuos peligrosos', 'hasHazardousWastePlan'],
  ['Generan niveles de ruido que afecten a los vecinos', 'noiseAffectsNeighbors'],
  ['Requiere licencia ambiental para su funcionamiento', 'requiresEnvironmentalLicense'],
  ['Valor proyectado facturación para el presente año', 'projectedBillingCurrentYear'],
  ['Capacidad instalada de la planta de producción', 'installedProductionCapacity'],
  ['Índice promedio de capacidad utilizada', 'averageCapacityIndex'],
  ['Bombeo, estación de bomberos y cortafuegos', 'pumpingFireStationFirewalls'],
  ['Plan de continuidad del negocio documentado', 'businessContinuityPlan'],
  ['Complejidad de la actividad o proceso', 'activityComplexity'],
  ['Valor facturación del año anterior', 'previousYearBilling'],
  ['Incidencia sobre la producción (%)', 'productionImpactPct'],
  ['Origen de la maquinaria crítica', 'criticalMachineryOrigin'],
  ['Periodicidad de los mantenimientos', 'maintenanceFrequency'],
  ['Número de líneas de producción', 'productionLinesCount'],
  ['Promedio de edad de los equipos', 'averageEquipmentAge'],
  ['Estación de bomberos — nombre', 'fireStationName'],
  ['Almacenamiento de agua para RCI', 'rciWaterStorage'],
  ['Descripción del Equipamiento', 'equipmentDescription'],
  ['Bitácoras de mantenimiento', 'maintenanceLogs'],
  ['Hay convenios con otras empresas', 'hasAgreementsWithOtherCompanies'],
  ['Tiempo de respuesta (minutos)', 'responseTimeMinutes'],
  ['Cuenta con detectores de humo', 'hasSmokeDetectors'],
  ['Valor nómina mensual', 'monthlyPayrollValue'],
  ['9.1 PML (PÉRDIDA MÁXIMA PROBABLE)', 'pmlTitle'],
  ['Análisis y comentarios', 'analysisAndComments'],
  ['Tipo de mantenimiento', 'maintenanceType'],
  ['Mejoras después del siniestro', 'improvementsAfterClaim'],
  ['Altura máxima del almacén', 'maxWarehouseHeight'],
  ['Altura máxima de estantería', 'maxShelvingHeight'],
  ['Matriz de compatibilidad', 'compatibilityMatrix'],
  ['Número de vigilantes', 'guardsCount'],
  ['Cuenta con vigilancia', 'hasSecurity'],
  ['Ubicación del grabador', 'recorderLocation'],
  ['Sistema de detección', 'detectionSystem'],
  ['Procesos Críticos', 'criticalProcesses'],
  ['Maquinaria crítica', 'criticalMachinery'],
  ['Valor del siniestro', 'claimValue'],
  ['PLANTAS ELÉCTRICAS', 'electricPlants'],
  ['Agregar Transformador', 'addTransformer'],
  ['SISTEMA DE AGUA', 'waterSystem'],
  ['EQUIPO DE BOMBEO', 'pumpingEquipment'],
  ['Contratada con', 'contractedWith'],
  ['Sala de control', 'controlRoom'],
  ['De 2000 a 5000 m2', 'area2000to5000'],
  ['De 1000 a 2000 m2', 'area1000to2000'],
  ['De 500 a 1000 m2', 'area500to1000'],
  ['Menos de 500 m2', 'areaUnder500'],
  ['Señalización', 'signaling'],
  ['Instalación', 'installation'],
  ['Descripción', 'description'],
  ['Comentarios', 'comments'],
  ['Cantidad', 'quantity'],
  ['Presión', 'pressure'],
  ['Almacén', 'warehouseStore'],
  ['Por incendio', 'byFire'],
  ['Energía', 'energy'],
  ['TENSIÓN', 'voltage'],
  ['Año', 'year'],
];

const newKeys = {
  requiresDischargePermit: {
    es: 'Requiere permiso de vertimientos o emisiones contaminantes',
    en: 'Requires a discharge or pollutant emissions permit',
  },
  generatesContaminatedWastewater: {
    es: 'Genera vertimiento de aguas residuales contaminantes',
    en: 'Generates contaminated wastewater discharge',
  },
  hasWastewaterTreatmentPlant: {
    es: 'Cuenta con planta de tratamiento de aguas residuales',
    en: 'Has a wastewater treatment plant',
  },
  hasHazardousWastePlan: {
    es: 'Cuenta con plan de manejo integral de residuos peligrosos',
    en: 'Has an integrated hazardous waste management plan',
  },
  noiseAffectsNeighbors: {
    es: 'Generan niveles de ruido que afecten a los vecinos',
    en: 'Generates noise levels that affect neighbors',
  },
  pumpingFireStationFirewalls: {
    es: 'Bombeo, estación de bomberos y cortafuegos',
    en: 'Pumping, fire station and firewalls',
  },
  businessContinuityPlan: {
    es: 'Plan de continuidad del negocio documentado',
    en: 'Documented business continuity plan',
  },
  hasAgreementsWithOtherCompanies: {
    es: 'Hay convenios con otras empresas',
    en: 'There are agreements with other companies',
  },
  hasSmokeDetectors: { es: 'Cuenta con detectores de humo', en: 'Has smoke detectors' },
  pmlTitle: { es: '9.1 PML (PÉRDIDA MÁXIMA PROBABLE)', en: '9.1 PML (PROBABLE MAXIMUM LOSS)' },
  improvementsAfterClaim: { es: 'Mejoras después del siniestro', en: 'Improvements after the claim' },
  compatibilityMatrix: { es: 'Matriz de compatibilidad', en: 'Compatibility matrix' },
  hasSecurity: { es: 'Cuenta con vigilancia', en: 'Has security guards' },
  detectionSystem: { es: 'Sistema de detección', en: 'Detection system' },
  electricPlants: { es: 'PLANTAS ELÉCTRICAS', en: 'ELECTRIC PLANTS' },
  addTransformer: { es: 'Agregar Transformador', en: 'Add transformer' },
  waterSystem: { es: 'SISTEMA DE AGUA', en: 'WATER SYSTEM' },
  pumpingEquipment: { es: 'EQUIPO DE BOMBEO', en: 'PUMPING EQUIPMENT' },
  controlRoom: { es: 'Sala de control', en: 'Control room' },
  area2000to5000: { es: 'De 2000 a 5000 m2', en: 'From 2,000 to 5,000 m²' },
  area1000to2000: { es: 'De 1000 a 2000 m2', en: 'From 1,000 to 2,000 m²' },
  area500to1000: { es: 'De 500 a 1000 m2', en: 'From 500 to 1,000 m²' },
  areaUnder500: { es: 'Menos de 500 m2', en: 'Less than 500 m²' },
  warehouseStore: { es: 'Almacén', en: 'Warehouse' },
  byFire: { es: 'Por incendio', en: 'By fire' },
  energy: { es: 'Energía', en: 'Energy' },
  rciWaterStorage: { es: 'Almacenamiento de agua para RCI', en: 'Water storage for RCI' },
};

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

for (const [es, key] of labelMap) {
  const repl = P(key);
  const re1 = new RegExp(`>(\\s*)${escapeReg(es)}(\\s*)<`, 'g');
  out = out.replace(re1, (m, a, b) => {
    count++;
    return `>${a}${repl}${b}<`;
  });
  const re2 = new RegExp(`celdaEncabezadoInfo\\("${escapeReg(es)}"`, 'g');
  out = out.replace(re2, () => {
    count++;
    return `celdaEncabezadoInfo(t('${FI}.${key}')`;
  });
  const re3 = new RegExp(`encabezadoTabla\\("${escapeReg(es)}"`, 'g');
  out = out.replace(re3, () => {
    count++;
    return `encabezadoTabla(t('${FI}.${key}')`;
  });
  const re4 = new RegExp(`text:\\s*"${escapeReg(es)}"`, 'g');
  out = out.replace(re4, () => {
    count++;
    return `text: t('${FI}.${key}')`;
  });
}

fs.writeFileSync(path, out);
console.log('replacements:', count);
