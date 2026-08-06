import { BUQUE_VACIO } from './puertosCasoExportacionState.js';
import { normalizarImagenesInforme, normalizarPuntos } from './puertosCasoExportacionState.js';

export { BUQUE_VACIO };

export const INFORME_GRANEL_VACIO = {
  proposito: '',
  introduccion: '',
  buque: { ...BUQUE_VACIO },
  lineasMercancia: [],
  imagenesMercancia: [],
  seguimientoGranel: [],
  comentariosSupervision: '',
  movimientoMercancia: [],
  comentariosMovimiento: '',
  condicionCargaTexto: '',
  imagenesCondicionCarga: [],
  novedadesAveriasTexto: '',
  novedadesAveriasPuntos: [],
  imagenesNovedadesAverias: [],
  equiposOperacionIntro: '',
  equiposOperacionPuntos: [],
  imagenesEquiposOperacion: [],
  condicionesMeteoTexto: '',
  imagenesCondicionesMeteo: [],
  resumenEmails: [],
  conclusionesTexto: '',
  conclusionesPuntos: [],
  registrosFotograficosBodegas: [],
};

export const ESTADO_INICIAL_CASO_GRANEL = {
  tipoRegistro: 'caso_granel',
  consecutivo: '',
  numeroSolicitud: '',
  creadoPor: '',
  emailCreador: '',
  fechaInforme: '',
  departamentoInforme: 'Departamento de Ingeniería y Control de Riesgos',

  codiRespnsble: '',
  nombreResponsable: '',
  codiAsgrdra: '',
  nombreAseguradora: '',
  funcAsgrdraNombre: '',
  asgrBenfcro: '',
  actividad: '',
  descripcionEstado: '',
  ciudadRiesgo: '',
  laborRealizada: 'INSPECCIÓN Y CONTROL PORTUARIO - MOTONAVE CON CARGA A GRANEL',
  lugar: '',
  observacionesPendientes: '',

  fchaAsgncion: '',
  fchaContIni: '',
  fchaCoordInspeccion: '',
  fchaProgInspeccion: '',
  fchaInspccion: '',
  /** Varias fechas de inspección (como en el Word: 02, 03, 04 y 05 ABRIL 2026). */
  fechasInspeccion: [],
  fchaInfoFnal: '',
  fchaFactra: '',
  obseContIni: '',
  obseCoordInspeccion: '',
  obseInspccion: '',
  obseInfoFnal: '',
  obseSegmnto: '',
  historialDocs: [],

  informeGranel: { ...INFORME_GRANEL_VACIO, buque: { ...BUQUE_VACIO } },
};

const MESES_MAY = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

/** Normaliza y ordena fechas ISO (YYYY-MM-DD), sin duplicados. */
export function normalizarFechasInspeccion(fechas = [], fchaInspccionFallback = '') {
  const lista = Array.isArray(fechas) ? fechas : [];
  const iso = lista
    .map((f) => {
      if (!f) return '';
      const s = String(f).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      if (s.includes('T')) return s.split('T')[0];
      return '';
    })
    .filter(Boolean);
  if (!iso.length && fchaInspccionFallback) {
    const fb = String(fchaInspccionFallback).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(fb)) iso.push(fb.slice(0, 10));
  }
  return [...new Set(iso)].sort();
}

/** Primera fecha para listado / compatibilidad con fchaInspccion. */
export function primeraFechaInspeccion(fechas = []) {
  const norm = normalizarFechasInspeccion(fechas);
  return norm[0] || '';
}

/**
 * Formato Word: "02, 03, 04 y 05 ABRIL 2026".
 * Si hay meses/años distintos, lista cada fecha corta unida por comas.
 */
export function formatearFechasInspeccionMayus(fechas = []) {
  const norm = normalizarFechasInspeccion(fechas);
  if (!norm.length) return '';

  const parsed = norm.map((iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return { iso, y, m, d, mes: MESES_MAY[m - 1] };
  });

  const mismoMesAnio = parsed.every((p) => p.m === parsed[0].m && p.y === parsed[0].y);
  if (mismoMesAnio) {
    const dias = parsed.map((p) => String(p.d).padStart(2, '0'));
    let diasTxt;
    if (dias.length === 1) diasTxt = dias[0];
    else if (dias.length === 2) diasTxt = `${dias[0]} y ${dias[1]}`;
    else diasTxt = `${dias.slice(0, -1).join(', ')} y ${dias[dias.length - 1]}`;
    return `${diasTxt} ${parsed[0].mes} ${parsed[0].y}`;
  }

  return parsed
    .map((p) => `${String(p.d).padStart(2, '0')} ${p.mes} ${p.y}`)
    .join(', ');
}

export function nuevaLineaMercanciaGranel() {
  return {
    id: Date.now() + Math.random(),
    bl: '',
    producto: '',
    tipoCarga: 'Carga a granel',
    cantidad: '',
    destino: '',
  };
}

/**
 * Formato compacto del Word en seguimiento: "02,03,04 y 05/04/2026".
 */
export function formatearFechasSeguimientoCorta(fechas = []) {
  const norm = normalizarFechasInspeccion(fechas);
  if (!norm.length) return '';

  const parsed = norm.map((iso) => {
    const [y, m, d] = iso.split('-');
    return { y, m, d: String(Number(d)).padStart(2, '0'), iso };
  });

  const mismoMesAnio = parsed.every((p) => p.m === parsed[0].m && p.y === parsed[0].y);
  if (mismoMesAnio) {
    const dias = parsed.map((p) => p.d);
    const sufijo = `/${parsed[0].m}/${parsed[0].y}`;
    if (dias.length === 1) return `${dias[0]}${sufijo}`;
    if (dias.length === 2) return `${dias[0]} y ${dias[1]}${sufijo}`;
    return `${dias.slice(0, -1).join(',')} y ${dias[dias.length - 1]}${sufijo}`;
  }

  return parsed.map((p) => `${p.d}/${p.m}/${p.y}`).join(', ');
}

/** Texto Fecha de una fila de seguimiento (array fechas o string legado). */
export function textoFechaSeguimientoGranel(fila = {}) {
  if (Array.isArray(fila.fechas) && fila.fechas.length) {
    return formatearFechasSeguimientoCorta(fila.fechas);
  }
  return String(fila.fecha || '').trim();
}

export function nuevaFilaSeguimientoGranel(fechasIniciales = []) {
  const fechas = normalizarFechasInspeccion(fechasIniciales);
  return {
    id: Date.now() + Math.random(),
    fechas,
    fecha: formatearFechasSeguimientoCorta(fechas),
    bl: '',
    producto: '',
    anunciada: '',
    buenEstado: '',
    sobrante: '',
    faltante: '',
  };
}

export function nuevaFilaMovimientoMercancia() {
  return {
    id: Date.now() + Math.random(),
    producto: '',
    tipoCarga: 'Carga a granel',
    cantidad: '',
    cantPeso: '',
    unidadPeso: 'Kilos',
    destino: '',
  };
}

export function nuevoResumenEmail() {
  return {
    id: Date.now() + Math.random(),
    fecha: '',
    evento: '',
    imagenes: [],
  };
}

export function nuevoRegistroFotograficoBodega(titulo = '') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    titulo: titulo || '',
    imagenes: [],
  };
}

export function calcularTotalMercanciaGranel(lineas = []) {
  return (lineas || []).reduce((acc, l) => acc + parseCantidadEuropea(l.cantidad), 0);
}

/** Parsea "1.650,00" / "1650.00" / "1,650.00" a número. */
export function parseCantidadEuropea(valor) {
  if (valor == null || valor === '') return 0;
  let s = String(valor).trim().replace(/[^\d.,-]/g, '');
  if (!s) return 0;
  const tieneComa = s.includes(',');
  const tienePunto = s.includes('.');
  if (tieneComa && tienePunto) {
    // El separador decimal es el que aparece al final
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (tieneComa) {
    const partes = s.split(',');
    s = partes.length === 2 && partes[1].length <= 3
      ? `${partes[0].replace(/\./g, '')}.${partes[1]}`
      : s.replace(/,/g, '');
  } else if (tienePunto) {
    const partes = s.split('.');
    // "1.650" con 3 decimales → miles; "1.65" → decimal
    if (partes.length === 2 && partes[1].length === 3 && partes[0].length <= 3) {
      // Ambiguo: en granel suele ser miles (1.650 = 1650)
      s = partes.join('');
    } else if (partes.length > 2) {
      s = partes.join('');
    }
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Formato de cantidad para PDF/Word (miles con punto, decimales con coma). */
export function formatearCantidadEuropea(n, decimales = 2) {
  if (!Number.isFinite(n)) return '—';
  const fijo = n.toFixed(decimales);
  const [ent, dec] = fijo.split('.');
  const entFmt = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimales > 0 ? `${entFmt},${dec}` : entFmt;
}

export function aplicarEstadoInformeGranel(datos = {}) {
  // El backend recalcula estado; aquí solo aseguramos tipoRegistro
  return {
    ...datos,
    tipoRegistro: 'caso_granel',
  };
}

export function normalizarRegistrosFotograficosBodegas(registros = []) {
  if (!Array.isArray(registros)) return [];
  return registros.map((r) => ({
    ...nuevoRegistroFotograficoBodega(),
    ...r,
    id: r.id || `${Date.now()}-${Math.random()}`,
    imagenes: normalizarImagenesInforme(r.imagenes),
  }));
}

export { normalizarPuntos };
