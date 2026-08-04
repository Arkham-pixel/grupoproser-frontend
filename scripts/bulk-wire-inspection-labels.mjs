import fs from 'fs';

const FI = 'inspection.ui.formulario_inspeccion';
const P = (k) => `{t('${FI}.${k}')}`;

// Longer strings first
const labelMap = [
  ['Comentarios adicionales sobre las características de la construcción', 'constructionComments'],
  ['Comentarios adicionales sobre protección contra incendios', 'fireProtectionComments'],
  ['Producto terminado y/o Mercancías', 'finishedGoods'],
  ['Circuito Cerrado de Televisión - CCTV', 'cctv'],
  ['Personal administrativo u operativo de la empresa', 'adminOrOpsStaff'],
  ['Empresa de seguridad contratada', 'contractedSecurityCompany'],
  ['Central de monitoreo externa', 'externalMonitoringCenter'],
  ['Con cerramiento perimetral y acceso controlado', 'perimeterWithControlledAccess'],
  ['Con cerramiento perimetral sin acceso controlado', 'perimeterWithoutControlledAccess'],
  ['Captura del mapa guardada en historial', 'mapCaptureSaved'],
  ['COORDENADAS DE UBICACIÓN', 'locationCoordinates'],
  ['NÚMERO DE COLABORADORES', 'employeeCount'],
  ['Descripción de los contenidos', 'contentsDescription'],
  ['Almacenamiento en bodega cerrada', 'storageWarehouse'],
  ['Almacenamiento en estanterías', 'storageShelving'],
  ['Empaque no combustible', 'nonCombustiblePackaging'],
  ['Contenedores metálicos', 'metalContainers'],
  ['Contenedores plásticos', 'plasticContainers'],
  ['Vulnerabilidad de los contenidos', 'contentVulnerability'],
  ['Acceso a las instalaciones', 'facilityAccess'],
  ['Circulación de personas externas', 'externalPeopleCirculation'],
  ['Número de cámaras que posee', 'numberOfCameras'],
  ['Tipo de materias primas', 'rawMaterialType'],
  ['Tipo de mercancías', 'merchandiseType'],
  ['Estado de almacenamiento', 'storageCondition'],
  ['Tipo de almacenamiento', 'storageType'],
  ['Descripción de Procesos', 'processDescription'],
  ['Edificación Principal', 'mainBuilding'],
  ['Año de construcción', 'constructionYear'],
  ['Nombre de la Empresa', 'companyName'],
  ['Actividad Económica', 'economicActivity'],
  ['Persona Entrevistada', 'interviewedPerson'],
  ['HORARIO LABORAL', 'workSchedule'],
  ['Regularidad de planta', 'plantRegularity'],
  ['Mantenimiento de la cubierta', 'roofMaintenance'],
  ['No realiza mantenimiento', 'noMaintenance'],
  ['Reforzamientos estructurales', 'structuralReinforcements'],
  ['Materiales estructura', 'structuralMaterials'],
  ['Sistema estructural', 'structuralSystem'],
  ['Estructura de concreto', 'concreteStructure'],
  ['Estructura de acero', 'steelStructure'],
  ['Estructura portante', 'loadBearingStructure'],
  ['Estructura mixta', 'mixedStructure'],
  ['Estructura cubierta', 'roofStructure'],
  ['Mampostería - No reforzada', 'unreinforcedMasonry'],
  ['Mampostería - Reforzada', 'reinforcedMasonry'],
  ['Losas de cimentación', 'foundationSlabs'],
  ['Muros de contención', 'retainingWalls'],
  ['Muros de carga', 'loadBearingWalls'],
  ['Pilotes aislados', 'isolatedPiles'],
  ['Zapatas aisladas', 'isolatedFootings'],
  ['Zapatas corridas', 'stripFootings'],
  ['Concreto reforzado', 'reinforcedConcrete'],
  ['Acero estructural', 'structuralSteel'],
  ['Preventivo y correctivo', 'preventiveCorrective'],
  ['Número de pisos', 'numberOfFloors'],
  ['Área construida', 'builtArea'],
  ['Área de lote', 'lotArea'],
  ['Daños reparados', 'repairedDamage'],
  ['Daños previos', 'previousDamage'],
  ['Regular de altura', 'heightRegularity'],
  ['Ubicación del predio', 'propertyLocation'],
  ['Nivel de riesgo', 'riskLevel'],
  ['No combustibles', 'nonCombustibles'],
  ['Tipo de insumo', 'supplyType'],
  ['Tipo de monitoreo', 'monitoringType'],
  ['Cuenta con CCTV', 'hasCctv'],
  ['Solo horario laboral', 'workHoursOnly'],
  ['Solo horario nocturno', 'nightHoursOnly'],
  ['Frecuencia de grabación', 'recordingFrequency'],
  ['Tiempo de respaldo', 'backupTime'],
  ['Dispositivo de grabación', 'recordingDevice'],
  ['Empresa que monitorea', 'monitoringCompany'],
  ['Tipo de comunicación', 'communicationType'],
  ['Sistema de Alarma', 'alarmSystem'],
  ['Manejo de dinero', 'moneyHandling'],
  ['Personal de recaudo', 'collectionStaff'],
  ['Horarios de recaudo', 'collectionSchedules'],
  ['Lugar de recaudo', 'collectionPlace'],
  ['Transporte de dinero', 'moneyTransport'],
  ['No monitoreado', 'notMonitored'],
  ['No graba', 'doesNotRecord'],
  ['Más de 10', 'moreThanTen'],
  ['Municipio', 'municipality'],
  ['Departamento', 'department'],
  ['Barrio', 'neighborhood'],
  ['Cargo', 'position'],
  ['Cimentación', 'foundation'],
  ['Edificio', 'building'],
  ['Bodega', 'warehouse'],
  ['Nave Industrial', 'industrialBuilding'],
  ['Local Comercial', 'commercialPremises'],
  ['Oficina', 'office'],
  ['Casa', 'house'],
  ['Metálica', 'metal'],
  ['Concreto', 'concrete'],
  ['Mixta', 'mixed'],
  ['Mixto', 'mixed'],
  ['Madera', 'wood'],
  ['Preventivo', 'preventive'],
  ['Correctivo', 'corrective'],
  ['Predictivo', 'predictive'],
  ['Crítico', 'critical'],
  ['Tóxicos', 'toxics'],
  ['Tipo', 'type'],
];

const optionExtras = [
  ['1 = con irregularidad', 'withIrregularity'],
  ['2 = sin irregularidad', 'withoutIrregularity'],
  ['1 = inmueble con daños previos', 'propertyWithPreviousDamage'],
  ['2 = inmueble sin daños previos', 'propertyWithoutPreviousDamage'],
];

function addKeysToLocales() {
  const newKeys = {
    yes: { es: 'Sí', en: 'Yes' },
    no: { es: 'No', en: 'No' },
    heightRegularity: { es: 'Regular de altura', en: 'Height regularity' },
    withIrregularity: { es: '1 = con irregularidad', en: '1 = with irregularity' },
    withoutIrregularity: { es: '2 = sin irregularidad', en: '2 = without irregularity' },
    propertyWithPreviousDamage: { es: '1 = inmueble con daños previos', en: '1 = property with previous damage' },
    propertyWithoutPreviousDamage: { es: '2 = inmueble sin daños previos', en: '2 = property without previous damage' },
    cctv: { es: 'Circuito Cerrado de Televisión - CCTV', en: 'Closed-Circuit Television — CCTV' },
    adminOrOpsStaff: { es: 'Personal administrativo u operativo de la empresa', en: 'Company administrative or operational staff' },
    contractedSecurityCompany: { es: 'Empresa de seguridad contratada', en: 'Contracted security company' },
    externalMonitoringCenter: { es: 'Central de monitoreo externa', en: 'External monitoring center' },
    perimeterWithControlledAccess: { es: 'Con cerramiento perimetral y acceso controlado', en: 'With perimeter fencing and controlled access' },
    perimeterWithoutControlledAccess: { es: 'Con cerramiento perimetral sin acceso controlado', en: 'With perimeter fencing without controlled access' },
    hasCctv: { es: 'Cuenta con CCTV', en: 'Has CCTV' },
    workHoursOnly: { es: 'Solo horario laboral', en: 'Working hours only' },
    nightHoursOnly: { es: 'Solo horario nocturno', en: 'Night hours only' },
    notMonitored: { es: 'No monitoreado', en: 'Not monitored' },
    doesNotRecord: { es: 'No graba', en: 'Does not record' },
    alarmSystem: { es: 'Sistema de Alarma', en: 'Alarm system' },
    moneyHandling: { es: 'Manejo de dinero', en: 'Cash handling' },
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
    console.log(`locales ${lang}: +${added} keys`);
  }
}

function replaceInJsx(s) {
  let out = s;
  let count = 0;

  const all = [...labelMap, ...optionExtras];
  for (const [es, key] of all) {
    // JSX text node: >ES< or >\n  ES\n<
    const patterns = [
      // exact between tags with optional whitespace
      new RegExp(`(>)(\\s*)${escapeReg(es)}(\\s*)(<)`, 'g'),
      // option text already covered by above
      // Word helpers: celdaEncabezadoInfo("ES"
      new RegExp(`(celdaEncabezadoInfo\\(|encabezadoTabla\\(|new Paragraph\\(\\{\\s*text:\\s*)"${escapeReg(es)}"`, 'g'),
    ];

    for (const re of patterns) {
      out = out.replace(re, (match, p1, p2, p3, p4) => {
        // First pattern groups: >, ws, es, ws, <
        if (p4 === '<' || match.includes('>' + (p2 || ''))) {
          if (typeof p4 === 'string' && p4 === '<') {
            count++;
            return `${p1}${p2}${P(key)}${p3}${p4}`;
          }
        }
        // Second pattern: function("ES" -> function(t(...)
        if (match.startsWith('celdaEncabezadoInfo') || match.startsWith('encabezadoTabla') || match.startsWith('new Paragraph')) {
          count++;
          return `${p1}${P(key).replace(/^\{|\}$/g, '')}`; // without outer braces for JS expr... wait
        }
        return match;
      });
    }
  }

  // Simpler dedicated passes for JSX text
  out = s; // reset - do cleaner approach
  count = 0;

  for (const [es, key] of all) {
    const repl = P(key);
    // >ES<
    const re1 = new RegExp(`>(\\s*)${escapeReg(es)}(\\s*)<`, 'g');
    out = out.replace(re1, (m, a, b) => {
      count++;
      return `>${a}${repl}${b}<`;
    });
  }

  // Sí / No options display text only (keep value)
  out = out.replace(/<option value="Sí">Sí<\/option>/g, () => {
    count++;
    return `<option value="Sí">{t('${FI}.yes')}</option>`;
  });
  out = out.replace(/<option value="No">No<\/option>/g, () => {
    count++;
    return `<option value="No">{t('${FI}.no')}</option>`;
  });
  // Also value={true} style? skip

  // Word generation common headers
  for (const [es, key] of all) {
    const re = new RegExp(`celdaEncabezadoInfo\\("${escapeReg(es)}"`, 'g');
    out = out.replace(re, () => {
      count++;
      return `celdaEncabezadoInfo(t('${FI}.${key}')`;
    });
    const re2 = new RegExp(`encabezadoTabla\\("${escapeReg(es)}"`, 'g');
    out = out.replace(re2, () => {
      count++;
      return `encabezadoTabla(t('${FI}.${key}')`;
    });
    const re3 = new RegExp(`text:\\s*"${escapeReg(es)}"`, 'g');
    out = out.replace(re3, () => {
      count++;
      return `text: t('${FI}.${key}')`;
    });
  }

  return { out, count };
}

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

addKeysToLocales();
const path = 'src/components/FormularioInspeccion.jsx';
const s = fs.readFileSync(path, 'utf8');
const { out, count } = replaceInJsx(s);
fs.writeFileSync(path, out);
console.log('replacements:', count);

// verify letter still ok + sample labels
const checks = [
  ['Nombre de la Empresa', false],
  ["t('inspection.ui.formulario_inspeccion.companyName')", true],
  ['Ciudad:', false],
  ['chooseFile', true],
  ['letterIntroduction', true],
  ['Municipio\n', false],
];
for (const [c, want] of checks) {
  const found = out.includes(c);
  console.log(c.slice(0, 50), found === want ? 'OK' : `FAIL found=${found} want=${want}`);
}
