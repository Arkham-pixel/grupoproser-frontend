import {
  ESTADO_INICIAL_CASO_EXPORTACION,
  BUQUE_VACIO,
  INFORME_EXPORTACION_VACIO,
  normalizarRegistroFotograficoMercancia,
  migrarSupervisionPagina4,
  normalizarRegistrosFotograficosContenedores,
  normalizarPuntos,
} from './puertosCasoExportacionState';
import { normalizarImagenCargada } from './puertosCasoImagenUtils';

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

export function normalizarInformeExportacion(informe = {}) {
  const buque = { ...BUQUE_VACIO, ...(informe.buque || {}) };
  if (buque.imagenBuque) {
    buque.imagenBuque = normalizarImagenCargada(buque.imagenBuque);
  }
  const supervision = migrarSupervisionPagina4(informe);
  const registroMercancia = normalizarRegistroFotograficoMercancia(informe);
  const mapImgs = (arr) => (arr || []).map(normalizarImagenCargada);

  return {
    ...INFORME_EXPORTACION_VACIO,
    ...informe,
    buque,
    lineasMercancia: Array.isArray(informe.lineasMercancia) ? informe.lineasMercancia : [],
    seguimiento: Array.isArray(informe.seguimiento) ? informe.seguimiento : [],
    imagenesContenedoresMercancia: mapImgs(registroMercancia.imagenesContenedoresMercancia),
    imagenesVehiculosMercancia: mapImgs(registroMercancia.imagenesVehiculosMercancia),
    imagenesContenidoCajas: mapImgs(informe.imagenesContenidoCajas),
    imagenesRegistroMercancia: [],
    ...supervision,
    imagenesRegistroInicialSupervision: mapImgs(supervision.imagenesRegistroInicialSupervision),
    imagenesCondicionCarga: mapImgs(supervision.imagenesCondicionCarga),
    imagenesInspeccionArribo: mapImgs(supervision.imagenesInspeccionArribo),
    imagenesEquiposOperacion: mapImgs(supervision.imagenesEquiposOperacion),
    imagenesCondicionesMeteo: mapImgs(supervision.imagenesCondicionesMeteo),
    conclusionesTexto: informe.conclusionesTexto || '',
    conclusionesPuntos: normalizarPuntos(informe.conclusionesPuntos),
    registrosFotograficosSupervision: normalizarRegistrosFotograficosContenedores(
      informe.registrosFotograficosSupervision
    ).map((r) => ({
      ...r,
      imagenes: (r.imagenes || []).map(normalizarImagenCargada),
    })),
    registrosFotograficosContenedores: normalizarRegistrosFotograficosContenedores(
      informe.registrosFotograficosContenedores
    ).map((r) => ({
      ...r,
      imagenes: (r.imagenes || []).map(normalizarImagenCargada),
    })),
  };
}

/** Normaliza un caso devuelto por la API para el formulario o el PDF. */
export function normalizarCasoApiParaFormulario(caso) {
  if (!caso) return { ...ESTADO_INICIAL_CASO_EXPORTACION };
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
    ...ESTADO_INICIAL_CASO_EXPORTACION,
    ...caso,
    informeExportacion: normalizarInformeExportacion(caso.informeExportacion),
  };
  fechas.forEach((f) => {
    out[f] = formatearFechaInput(caso[f]);
  });
  if (out.informeExportacion.buque?.fechaArribo) {
    out.informeExportacion.buque.fechaArribo = formatearFechaInput(
      out.informeExportacion.buque.fechaArribo
    );
  }
  return out;
}
