import fs from 'fs';

const path = 'src/components/FormularioInspeccion.jsx';
let s = fs.readFileSync(path, 'utf8');

const map = [
  ['1. INFORMACIÓN GENERAL', "tituloSeccionUi('informacionGeneral', t('inspection.ui.formulario_inspeccion.generalInformation'))"],
  ['2. DESCRIPCIÓN GENERAL DE LA EMPRESA', "tituloSeccionUi('descripcionEmpresa', t('inspection.ui.formulario_inspeccion.companyDescription'))"],
  ['3. INFRAESTRUCTURA', "tituloSeccionUi('infraestructura', t('inspection.ui.formulario_inspeccion.infrastructure'))"],
  ['4. PROCESOS', "tituloSeccionUi('procesos', t('inspection.ui.formulario_inspeccion.processes'))"],
  ['5. LINDEROS', "tituloSeccionUi('linderos', t('inspection.sections.linderos'))"],
  ['6. SUSTRACCIÓN - PROTECCIONES FÍSICAS', "tituloSeccionUi('sustraccion', t('inspection.ui.formulario_inspeccion.section6Title'))"],
  ['7. CARACTERÍSTICAS OPERATIVAS AMBIENTALES', "tituloSeccionUi('caracteristicasAmbientales', t('inspection.ui.formulario_inspeccion.section7Title'))"],
  ['8. PROTECCIÓN Y PREVENCIÓN CONTRA INCENDIOS', "tituloSeccionUi('proteccionIncendios', t('inspection.ui.formulario_inspeccion.section8Title'))"],
  ['9. LUCRO CESANTE', "tituloSeccionUi('lucroCesante', t('inspection.ui.formulario_inspeccion.section9Title'))"],
  ['10. PROCESOS CRÍTICOS Y RIESGOS MEDIOAMBIENTALES', "tituloSeccionUi('procesosCriticos', t('inspection.ui.formulario_inspeccion.section10Title'))"],
  ['11. POR ROTURA DE MAQUINARIA', "tituloSeccionUi('roturaMaquinaria', t('inspection.ui.formulario_inspeccion.section11Title'))"],
  ['12. MAQUINARIA, EQUIPOS Y MANTENIMIENTO', "tituloSeccionUi('maquinaria', t('inspection.ui.formulario_inspeccion.section12Title'))"],
  ['13. SERVICIOS INDUSTRIALES', "tituloSeccionUi('serviciosIndustriales', t('inspection.ui.formulario_inspeccion.section13Title'))"],
  ['14. SINIESTRALIDAD', "tituloSeccionUi('siniestralidad', t('inspection.ui.formulario_inspeccion.section14Title'))"],
  ['15. ALMACENAMIENTO', "tituloSeccionUi('almacenamiento', t('inspection.ui.formulario_inspeccion.section15Title'))"],
  ['17. RECOMENDACIONES', "tituloSeccionUi('recomendaciones', t('inspection.ui.formulario_inspeccion.section17Title'))"],
];

let n = 0;
for (const [plain, expr] of map) {
  const escaped = plain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(<(?:h2|h3)[^>]*>\\s*)${escaped}(\\s*</(?:h2|h3)>)`, 'g');
  let hit = false;
  s = s.replace(re, (_m, a, b) => {
    n += 1;
    hit = true;
    return `${a}{${expr}}${b}`;
  });
  if (!hit) {
    const re2 = new RegExp(`(<(?:h2|h3)[\\s\\S]*?>\\s*)${escaped}(\\s*</(?:h2|h3)>)`);
    s = s.replace(re2, (_m, a, b) => {
      n += 1;
      hit = true;
      return `${a}{${expr}}${b}`;
    });
  }
  if (!hit) console.log('MISS', plain);
}

fs.writeFileSync(path, s);
console.log('replaced', n);
