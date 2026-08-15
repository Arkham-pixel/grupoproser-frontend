import { crearFechaLocal } from '../../utils/fechaUtils.js';

export const FDM_COLUMNAS_STORAGE_KEY = 'equidad-fdm-reporte-columnas-v2';
export const FDM_REPORTE_PAGE_SIZE = 25;

/** Query keys del reporte (persistencia en URL, sin localStorage). */
export const FDM_FILTRO_Q = 'q';
export const FDM_FILTRO_AJUSTADOR = 'ajustador';
export const FDM_FILTRO_ESTADO = 'estado';
export const FDM_FILTRO_EVENTO = 'evento';
export const FDM_FILTRO_NUEVOS = 'nuevos';
export const FDM_FILTRO_DESDE = 'desde';
export const FDM_FILTRO_HASTA = 'hasta';
export const FDM_FILTRO_CIUDAD = 'ciudad';
export const FDM_FILTRO_PAGE = 'page';

export const leerFiltrosReporteFdm = (searchParams) => {
  const sp = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams();
  return {
    busqueda: sp.get(FDM_FILTRO_Q) || '',
    filtroAjustador: sp.get(FDM_FILTRO_AJUSTADOR) || '',
    filtroEstado: sp.get(FDM_FILTRO_ESTADO) || '',
    filtroEvento: sp.get(FDM_FILTRO_EVENTO) || '',
    // Sin clave → solo nuevos (comportamiento histórico). `nuevos=` → todos.
    filtroNuevos: sp.has(FDM_FILTRO_NUEVOS) ? sp.get(FDM_FILTRO_NUEVOS) || '' : 'nuevos',
    fechaInicio: sp.get(FDM_FILTRO_DESDE) || '',
    fechaFin: sp.get(FDM_FILTRO_HASTA) || '',
    ciudad: sp.get(FDM_FILTRO_CIUDAD) || '',
    pagina: Math.max(1, Number(sp.get(FDM_FILTRO_PAGE)) || 1),
  };
};

/** Actualiza filtros en la URL (replace). `nuevos: ''` se guarda como clave vacía = ver todos. */
export const patchFiltrosReporteFdm = (setSearchParams, patch = {}, { resetPage = true } = {}) => {
  setSearchParams(
    (prev) => {
      const next = new URLSearchParams(prev);
      const apply = (key, value, { keepEmpty = false } = {}) => {
        if (value === null || value === undefined || (value === '' && !keepEmpty)) {
          next.delete(key);
          return;
        }
        next.set(key, String(value));
      };

      if ('busqueda' in patch) apply(FDM_FILTRO_Q, patch.busqueda);
      if ('filtroAjustador' in patch) apply(FDM_FILTRO_AJUSTADOR, patch.filtroAjustador);
      if ('filtroEstado' in patch) apply(FDM_FILTRO_ESTADO, patch.filtroEstado);
      if ('filtroEvento' in patch) apply(FDM_FILTRO_EVENTO, patch.filtroEvento);
      if ('filtroNuevos' in patch) apply(FDM_FILTRO_NUEVOS, patch.filtroNuevos, { keepEmpty: true });
      if ('fechaInicio' in patch) apply(FDM_FILTRO_DESDE, patch.fechaInicio);
      if ('fechaFin' in patch) apply(FDM_FILTRO_HASTA, patch.fechaFin);
      if ('ciudad' in patch) apply(FDM_FILTRO_CIUDAD, patch.ciudad);
      if ('pagina' in patch) apply(FDM_FILTRO_PAGE, patch.pagina === 1 ? '' : patch.pagina);

      if (resetPage && !('pagina' in patch)) next.delete(FDM_FILTRO_PAGE);
      return next;
    },
    { replace: true }
  );
};

export const hrefReporteFdmConFiltros = (qs) => {
  const raw = String(qs || '').replace(/^\?/, '');
  return raw ? `/equidad-fdm/reporte?${raw}` : '/equidad-fdm/reporte';
};

/** Login que solo ve casos con documentos en el archivero */
export const LOGIN_FDM_SOLO_CON_ARCHIVOS = '1065012991';

export const ESTADOS_FDM = ['PENDIENTE', 'LIQUIDADO', 'OBJETADO', 'GIRADO'];
export const EVENTOS_FDM = ['OLA INVERNAL', 'TERREMOTO 10 AGOSTO 2026'];

export const cantidadArchivosFdm = (caso = {}) =>
  Array.isArray(caso?.archivos) ? caso.archivos.length : 0;

export const casoTieneArchivosFdm = (caso = {}) => cantidadArchivosFdm(caso) > 0;

export const loginActualFdm = () => {
  try {
    const directo = localStorage.getItem('login');
    if (directo) return String(directo).trim();
    const raw = localStorage.getItem('usuario');
    if (!raw) return '';
    const u = JSON.parse(raw);
    return String(u?.login || u?.usuario || u?.id || '').trim();
  } catch {
    return '';
  }
};

export const esUsuarioFdmSoloConArchivos = () =>
  String(loginActualFdm()) === LOGIN_FDM_SOLO_CON_ARCHIVOS;

export const CAMPOS_NUMERICOS_FDM = [
  'valorEdificio',
  'valorContenido',
  'valoresIndemnizables',
  'perdidaContenidos',
  'perdidaEdificio',
  'totalPerdida',
  'deducible',
  'totalLiquidado',
  'subsidio',
  'valorIndemnizadoAjustador',
  'valorIndemnizado',
];

/** Formatea entero con puntos de miles (es-CO): 5000000 → 5.000.000 */
export const formatMiles = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';
  const digitos = String(valor).replace(/[^\d]/g, '');
  if (!digitos) return '';
  const sinCeros = digitos.replace(/^0+(?=\d)/, '');
  return sinCeros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const formatMilesInput = (valor) => formatMiles(valor);

export const esCasoNuevoFdm = (caso = {}) => caso?.esNuevo === true;

export const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '$0';
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

export const parseDate = (value) => crearFechaLocal(value);

export const formatDate = (value) => {
  const date = crearFechaLocal(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const fechaEnRango = (fecha, desde, hasta) => {
  const iso = formatDate(fecha);
  if (!iso) return false;
  if (desde && iso < desde) return false;
  if (hasta && iso > hasta) return false;
  return true;
};

export const normTexto = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

/** Opciones únicas para un select de filtro a partir de los casos */
export const buildOpcionesFiltro = (casos = [], campo) => {
  const porNorm = new Map();
  for (const item of casos) {
    const raw = item?.[campo];
    if (!raw) continue;
    const norm = normTexto(raw);
    if (!norm) continue;
    if (!porNorm.has(norm)) {
      porNorm.set(norm, { value: norm, label: String(raw).trim() });
    }
  }
  return [...porNorm.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'));
};

export const coincideFiltroTexto = (valorCaso, filtro) => {
  if (!filtro) return true;
  return normTexto(valorCaso) === normTexto(filtro);
};

export const SIN_CIUDAD_FDM = 'SIN CIUDAD';

export const ciudadClaveFdm = (caso = {}) => {
  const norm = normTexto(caso.municipio);
  return norm || SIN_CIUDAD_FDM;
};

/** Ciudades del lote, ordenadas por cantidad (Cali, Quibdó, etc.). */
export const buildCiudadesFdm = (casos = []) => {
  const porNorm = new Map();
  for (const item of casos) {
    const value = ciudadClaveFdm(item);
    const crudo = String(item.municipio || '').replace(/\s+/g, ' ').trim();
    if (!porNorm.has(value)) {
      porNorm.set(value, {
        value,
        label: value === SIN_CIUDAD_FDM ? 'Sin ciudad' : crudo.toUpperCase(),
        count: 0,
      });
    }
    porNorm.get(value).count += 1;
  }
  return [...porNorm.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label, 'es');
  });
};

/** Fecha ISO (YYYY-MM-DD) para inputs date desde valores de la API */
export const fechaParaInput = (value) => formatDate(value);

/** Aplica filtros del reporte FDM. `soloConArchivos` es exclusivo del login especial. */
export const aplicarFiltrosCasosFdm = (
  casos = [],
  {
    soloConArchivos = false,
    busqueda = '',
    filtroAjustador = '',
    filtroEstado = '',
    filtroEvento = '',
    filtroNuevos = '',
    fechaInicio = '',
    fechaFin = '',
  } = {}
) => {
  let resultado = [...casos];

  if (soloConArchivos) {
    resultado = resultado.filter((item) => casoTieneArchivosFdm(item));
  }

  if (busqueda) {
    const termino = busqueda.toLowerCase();
    resultado = resultado.filter((item) =>
      [
        item.consecutivo,
        item.nombre,
        item.cedula,
        item.celular,
        item.direccionAfectada,
        item.municipio,
        item.ajustador,
        item.caso,
        item.siniestro,
        item.evento,
        item.polizaAfectar,
      ]
        .filter(Boolean)
        .some((campo) => campo.toString().toLowerCase().includes(termino))
    );
  }
  if (filtroAjustador) {
    resultado = resultado.filter((item) => coincideFiltroTexto(item.ajustador, filtroAjustador));
  }
  if (filtroEstado) {
    resultado = resultado.filter((item) => coincideFiltroTexto(item.estado, filtroEstado));
  }
  if (filtroEvento) {
    resultado = resultado.filter((item) => coincideFiltroTexto(item.evento, filtroEvento));
  }
  if (filtroNuevos === 'nuevos') {
    resultado = resultado.filter((item) => esCasoNuevoFdm(item));
  } else if (filtroNuevos === 'anteriores') {
    resultado = resultado.filter((item) => !esCasoNuevoFdm(item));
  }
  if (fechaInicio || fechaFin) {
    resultado = resultado.filter((item) =>
      fechaEnRango(
        item.fechaRegistro || item.fechaLiquidacion || item.fechaAviso || item.createdAt,
        fechaInicio,
        fechaFin
      )
    );
  }
  return resultado;
};
