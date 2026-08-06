import {
  ESTADO_INICIAL_CASO_GRANEL,
  BUQUE_VACIO,
  INFORME_GRANEL_VACIO,
  normalizarRegistrosFotograficosBodegas,
  normalizarFechasInspeccion,
  primeraFechaInspeccion,
  formatearFechasSeguimientoCorta,
  normalizarPuntos,
} from './puertosCasoGranelState.js';
import { normalizarImagenCargada } from './puertosCasoImagenUtils';
import { normalizarImagenesInforme } from './puertosCasoExportacionState.js';

function formatearFechaInput(valor) {
  if (!valor) return '';
  if (typeof valor === 'string' && valor.includes('T')) return valor.split('T')[0];
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  try {
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function normalizarFilaSeguimientoGranel(fila = {}) {
  const fechas = normalizarFechasInspeccion(fila.fechas);
  // Si solo hay texto legado en fecha (p.ej. "02,03,04 y 05/04/2026"), se conserva.
  const fechaTexto =
    fechas.length > 0 ? formatearFechasSeguimientoCorta(fechas) : String(fila.fecha || '').trim();
  return {
    ...fila,
    id: fila.id || Date.now() + Math.random(),
    fechas,
    fecha: fechaTexto,
    bl: fila.bl || '',
    producto: fila.producto || '',
    anunciada: fila.anunciada || '',
    buenEstado: fila.buenEstado || '',
    sobrante: fila.sobrante || '',
    faltante: fila.faltante || '',
  };
}

export function normalizarInformeGranel(informe = {}) {
  const buque = { ...BUQUE_VACIO, ...(informe.buque || {}) };
  if (buque.imagenBuque) {
    buque.imagenBuque = normalizarImagenCargada(buque.imagenBuque);
  }
  const mapImgs = (arr) => (arr || []).map(normalizarImagenCargada);

  return {
    ...INFORME_GRANEL_VACIO,
    ...informe,
    buque,
    lineasMercancia: Array.isArray(informe.lineasMercancia) ? informe.lineasMercancia : [],
    seguimientoGranel: Array.isArray(informe.seguimientoGranel)
      ? informe.seguimientoGranel.map(normalizarFilaSeguimientoGranel)
      : [],
    movimientoMercancia: Array.isArray(informe.movimientoMercancia)
      ? informe.movimientoMercancia
      : [],
    resumenEmails: Array.isArray(informe.resumenEmails)
      ? informe.resumenEmails.map((e) => ({
          id: e.id || Date.now() + Math.random(),
          fecha: e.fecha || '',
          evento: e.evento || '',
          imagenes: mapImgs(e.imagenes),
        }))
      : [],
    imagenesMercancia: mapImgs(informe.imagenesMercancia),
    imagenesCondicionCarga: mapImgs(informe.imagenesCondicionCarga),
    imagenesNovedadesAverias: mapImgs(informe.imagenesNovedadesAverias),
    imagenesEquiposOperacion: mapImgs(informe.imagenesEquiposOperacion),
    imagenesCondicionesMeteo: mapImgs(informe.imagenesCondicionesMeteo),
    equiposOperacionPuntos: normalizarPuntos(informe.equiposOperacionPuntos),
    novedadesAveriasPuntos: normalizarPuntos(informe.novedadesAveriasPuntos),
    conclusionesTexto: informe.conclusionesTexto || '',
    conclusionesPuntos: normalizarPuntos(informe.conclusionesPuntos),
    registrosFotograficosBodegas: normalizarRegistrosFotograficosBodegas(
      informe.registrosFotograficosBodegas
    ).map((r) => ({
      ...r,
      imagenes: normalizarImagenesInforme(r.imagenes).map(normalizarImagenCargada),
    })),
  };
}

export function normalizarCasoGranelApiParaFormulario(caso) {
  if (!caso) return { ...ESTADO_INICIAL_CASO_GRANEL };
  const fechas = [
    'fchaAsgncion',
    'fchaContIni',
    'fchaCoordInspeccion',
    'fchaProgInspeccion',
    'fchaInspccion',
    'fchaInfoFnal',
    'fchaFactra',
    'fechaInforme',
  ];
  const out = {
    ...ESTADO_INICIAL_CASO_GRANEL,
    ...caso,
    tipoRegistro: 'caso_granel',
    informeGranel: normalizarInformeGranel(caso.informeGranel || {}),
  };
  fechas.forEach((f) => {
    out[f] = formatearFechaInput(caso[f]);
  });
  out.fechasInspeccion = normalizarFechasInspeccion(
    caso.fechasInspeccion,
    out.fchaInspccion
  );
  if (!out.fchaInspccion) {
    out.fchaInspccion = primeraFechaInspeccion(out.fechasInspeccion);
  }
  if (out.informeGranel.buque?.fechaArribo) {
    out.informeGranel.buque.fechaArribo = formatearFechaInput(out.informeGranel.buque.fechaArribo);
  }
  return out;
}
