import { tituloArea } from '../components/inspeccion/propiedadesAreasConfig.js';

function esNoConforme(cumple) {
  return String(cumple || '').toLowerCase() === 'no';
}

function esParcial(cumple) {
  return String(cumple || '').toLowerCase() === 'parcialmente';
}

function etiquetaCumple(cumple) {
  if (esNoConforme(cumple)) return 'No conforme';
  if (esParcial(cumple)) return 'Parcialmente conforme';
  return '';
}

function recogerHallazgosDeItems(items, nombreArea, hallazgos) {
  if (!Array.isArray(items)) return;
  items.forEach((item) => {
    if (!esNoConforme(item.cumple) && !esParcial(item.cumple)) return;
    const partes = [];
    if (item.sintoma?.trim()) partes.push(`Síntoma: ${item.sintoma.trim()}`);
    if (item.observacion?.trim()) partes.push(`Observación: ${item.observacion.trim()}`);
    hallazgos.push({
      area: nombreArea,
      parametro: item.parametro?.trim() || 'Sin parámetro',
      cumple: etiquetaCumple(item.cumple),
      esNo: esNoConforme(item.cumple),
      esParcial: esParcial(item.cumple),
      detalle: partes.join('. '),
    });
  });
}

function agregarHallazgosArea(hallazgos, items, nombreArea, incluirArea, areaId) {
  if (incluirArea && !incluirArea(areaId)) return;
  recogerHallazgosDeItems(items, nombreArea, hallazgos);
}

/**
 * Recorre areasData según la plantilla efectiva y devuelve ítems No / Parcialmente.
 */
export function recogerHallazgosInspeccion(areasData, areasEfectivas, opciones = {}) {
  const hallazgos = [];
  const numAlcobas = parseInt(opciones.numAlcobas, 10) || 0;
  const incluirArea = opciones.incluirArea;

  if (!areasData || !areasEfectivas?.length) return hallazgos;

  for (const areaCfg of areasEfectivas) {
    if (areaCfg.tipo === 'alcobas') {
      if (incluirArea && !incluirArea('alcobas')) continue;
      for (let i = 1; i <= numAlcobas; i++) {
        agregarHallazgosArea(
          hallazgos,
          areasData.alcobas?.[i],
          tituloArea('alcoba', areasEfectivas, i),
          null,
          'alcobas'
        );
        agregarHallazgosArea(
          hallazgos,
          areasData.banosAlcobas?.[i],
          tituloArea('banoAlcoba', areasEfectivas, i),
          null,
          'alcobas'
        );
        agregarHallazgosArea(
          hallazgos,
          areasData.closetsAlcobas?.[i],
          tituloArea('closetAlcoba', areasEfectivas, i),
          null,
          'alcobas'
        );
      }
      continue;
    }

    const areaId = areaCfg.id;
    const nombre = areaCfg.titulo || tituloArea(areaId, areasEfectivas);
    agregarHallazgosArea(hallazgos, areasData[areaId], nombre, incluirArea, areaId);
  }

  if (areasData.banoPrincipal?.length) {
    const yaEnPlantilla = areasEfectivas.some((a) => a.id === 'banoPrincipal');
    if (!yaEnPlantilla) {
      agregarHallazgosArea(
        hallazgos,
        areasData.banoPrincipal,
        tituloArea('banoPrincipal', areasEfectivas),
        incluirArea,
        'banoPrincipal'
      );
    }
  }

  return hallazgos;
}

export function generarTextoObservacionesPrincipales(hallazgos) {
  if (!hallazgos.length) {
    return 'No se registraron hallazgos parciales ni no conformes en las áreas inspeccionadas.';
  }

  return hallazgos
    .map((h, idx) => {
      const extra = h.detalle ? ` ${h.detalle}` : '';
      return `${idx + 1}. ${h.area} — ${h.parametro}: ${h.cumple}.${extra}`;
    })
    .join('\n');
}

export function generarTextoConclusiones(hallazgos) {
  if (!hallazgos.length) {
    return 'Tras la inspección por áreas, no se identificaron ítems parciales ni no conformes. El inmueble cumple satisfactoriamente con los parámetros evaluados en las zonas revisadas.';
  }

  const noConformes = hallazgos.filter((h) => h.esNo);
  const parciales = hallazgos.filter((h) => h.esParcial);
  const partes = [];

  if (noConformes.length) {
    partes.push(`${noConformes.length} ítem(s) no conforme(s)`);
  }
  if (parciales.length) {
    partes.push(`${parciales.length} ítem(s) parcialmente conforme(s)`);
  }

  return `Tras la inspección se identificaron ${partes.join(' y ')} en las zonas evaluadas. Se recomienda atender los hallazgos relacionados en las principales observaciones, priorizando los puntos no conformes, y ejecutar las reparaciones o ajustes necesarios para asegurar el buen estado del inmueble.`;
}

export function generarResumenInspeccion(areasData, areasEfectivas, opciones = {}) {
  const hallazgos = recogerHallazgosInspeccion(areasData, areasEfectivas, opciones);
  return {
    hallazgos,
    observacionesPrincipales: generarTextoObservacionesPrincipales(hallazgos),
    conclusiones: generarTextoConclusiones(hallazgos),
  };
}
