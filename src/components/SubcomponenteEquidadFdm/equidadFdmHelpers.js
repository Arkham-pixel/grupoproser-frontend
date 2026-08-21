import { crearFechaLocal } from '../../utils/fechaUtils.js';

export const FDM_COLUMNAS_STORAGE_KEY = 'equidad-fdm-reporte-columnas-v7-hecho';
/** Checklist «hecho» solo para el usuario con filtro de archivos (local). */
export const FDM_CHECKLIST_STORAGE_KEY = 'equidad-fdm-reporte-checklist-v1';
export const FDM_REPORTE_PAGE_SIZE = 25;

export const cargarChecklistFdm = () => {
  try {
    const raw = localStorage.getItem(FDM_CHECKLIST_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map(String).filter(Boolean));
  } catch {
    return new Set();
  }
};

export const guardarChecklistFdm = (idsSet) => {
  try {
    localStorage.setItem(
      FDM_CHECKLIST_STORAGE_KEY,
      JSON.stringify([...(idsSet || [])].map(String))
    );
  } catch {
    /* ignore */
  }
};

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

/** Evento por defecto del reporte (lote actual). `evento=` en URL = todos. */
export const FDM_EVENTO_DEFAULT = 'TERREMOTO 10 AGOSTO 2026';

export const leerFiltrosReporteFdm = (searchParams) => {
  const sp = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams();
  return {
    busqueda: sp.get(FDM_FILTRO_Q) || '',
    filtroAjustador: sp.get(FDM_FILTRO_AJUSTADOR) || '',
    filtroEstado: sp.get(FDM_FILTRO_ESTADO) || '',
    // Sin clave → terremoto (lote actual). `evento=` → todos los eventos.
    filtroEvento: sp.has(FDM_FILTRO_EVENTO)
      ? sp.get(FDM_FILTRO_EVENTO) || ''
      : FDM_EVENTO_DEFAULT,
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
      if ('filtroEvento' in patch) {
        apply(FDM_FILTRO_EVENTO, patch.filtroEvento, { keepEmpty: true });
      }
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

/** Parsea monto es-CO / en-US / número. Conserva decimales (ej. 1.313.178,75). */
export const parseMontoFdm = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  let numero = String(valor).replace(/[^\d.,-]/g, '').trim();
  if (!numero || numero === '-' || numero === '.' || numero === ',') return null;

  if (numero.includes(',') && numero.includes('.')) {
    if (numero.lastIndexOf(',') > numero.lastIndexOf('.')) {
      numero = numero.replace(/\./g, '').replace(',', '.');
    } else {
      numero = numero.replace(/,/g, '');
    }
  } else if (numero.includes(',')) {
    const partes = numero.split(',');
    if (partes.length === 2 && partes[1].length <= 2) {
      numero = `${partes[0].replace(/\./g, '')}.${partes[1]}`;
    } else {
      numero = numero.replace(/,/g, '');
    }
  } else if (numero.includes('.')) {
    const partes = numero.split('.');
    // 5.500.000 o 1.750.905 (miles) vs 1313178.75 (decimal)
    if (partes.length > 2 || (partes.length === 2 && partes[1].length === 3)) {
      numero = numero.replace(/\./g, '');
    }
  }

  const n = Number(numero);
  return Number.isFinite(n) ? n : null;
};

/** Formatea monto es-CO conservando hasta 2 decimales: 1313178.75 → 1.313.178,75 */
export const formatMiles = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';
  const n = typeof valor === 'number' ? valor : parseMontoFdm(valor);
  if (n === null || Number.isNaN(n)) return '';
  const hasDecimals = Math.abs(n % 1) > 1e-9;
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);
};

/** Mientras se escribe: miles con punto y decimales con coma. */
export const formatMilesInput = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';
  const s = String(valor);
  const cleaned = s.replace(/[^\d,]/g, '');
  const commaIdx = cleaned.indexOf(',');
  let enteros = (commaIdx >= 0 ? cleaned.slice(0, commaIdx) : cleaned).replace(/^0+(?=\d)/, '');
  const decimales = commaIdx >= 0 ? cleaned.slice(commaIdx + 1).replace(/,/g, '').slice(0, 2) : null;
  const enterosFmt = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (commaIdx >= 0) return `${enterosFmt},${decimales ?? ''}`;
  return enterosFmt;
};

export const esCasoNuevoFdm = (caso = {}) => caso?.esNuevo === true;

export const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '$0';
  }
  const n = Number(value);
  const hasDecimals = Math.abs(n % 1) > 1e-9;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);
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

/** Municipios canónicos del formulario FDM (sin Santiago de Cali: usar CALI). */
export const MUNICIPIOS_FDM = Object.freeze([
  'ALCALÁ',
  'ANSERMA',
  'ANSERMANUEVO',
  'ARANZAZU',
  'ARGELIA',
  'ARMENIA-QUINDIO',
  'BOLÍVAR',
  'BUENAVENTURA',
  'BUGA',
  'BUGALAGRANDE',
  'CAICEDONIA',
  'CALARCÁ',
  'CALI',
  'CANDELARIA',
  'CARTAGO',
  'CERRITO',
  'CHINCHINÁ',
  'CIRCASIA',
  'DOSQUEBRADAS',
  'EL ÁGUILA',
  'EL DOVIO',
  'FILADELFIA',
  'FILANDIA',
  'FLORIDA',
  'GUÁTICA',
  'JAMUNDÍ',
  'LA CUMBRE',
  'LA UNIÓN-VALLE DEL CAUCA',
  'LA VICTORIA-VALLE DEL CAUCA',
  'LORICA',
  'MANIZALES',
  'MANZANARES',
  'MARQUETALIA',
  'MONTENEGRO',
  'NEIRA',
  'PALESTINA',
  'PALMIRA',
  'PENSILVANIA',
  'PEREIRA',
  'PUEBLO RICO',
  'QUIBDÓ',
  'QUIMBAYA',
  'QUINCHÍA',
  'ROLDANILLO',
  'SALENTO',
  'SAN BERNARDO DEL VIENTO',
  'SANTA ISABEL',
  'SANTA ROSA DE CABAL',
  'SANTANDER DE QUILICHAO',
  'SEVILLA',
  'TORO',
  'TULUÁ',
  'VERSALLES',
  'VIJES',
  'VILLAMARÍA',
  'YUMBO',
  'ZARZAL',
]);

/** Unifica Santiago de Cali → CALI y deja el valor en mayúsculas. */
export const normalizarMunicipioFdm = (valor) => {
  const texto = String(valor ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!texto || texto === '0') return '';
  const clave = normTexto(texto);
  if (
    !clave ||
    clave === '0' ||
    /^(N\/?A|NA|NULL|UNDEFINED|SIN CIUDAD|SIN MUNICIPIO)$/i.test(clave)
  ) {
    return '';
  }
  if (
    clave === 'SANTIAGO DE CALI' ||
    clave === 'CALI VALLE' ||
    clave === 'CALI VALLE DEL CAUCA' ||
    /^SANTIAGO DE CALI\b/.test(clave) ||
    clave === 'BUGA CENTRO'
  ) {
    if (clave === 'BUGA CENTRO') return 'BUGA';
    return 'CALI';
  }
  const exacto = MUNICIPIOS_FDM.find((m) => normTexto(m) === clave);
  return exacto || texto.toUpperCase();
};

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
  const norm = normTexto(normalizarMunicipioFdm(caso.municipio));
  return norm || SIN_CIUDAD_FDM;
};

/** Ciudades del lote, ordenadas por cantidad (Cali, Quibdó, etc.). */
export const buildCiudadesFdm = (casos = []) => {
  const porNorm = new Map();
  for (const item of casos) {
    const value = ciudadClaveFdm(item);
    if (!porNorm.has(value)) {
      porNorm.set(value, {
        value,
        label: value === SIN_CIUDAD_FDM ? 'Sin ciudad' : value,
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
        item.correo,
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
