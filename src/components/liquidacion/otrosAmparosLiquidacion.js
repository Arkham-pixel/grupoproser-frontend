import { formatNumber, getAppLocale } from '../../utils/locale.js';

/**
 * Amparos adicionales (arriendo, retiro de escombros, etc.).
 * Se liquidan por aparte: no llevan deducible ni AIU del amparo edificio.
 * Compartido por Alfa y los liquidadores CAT NSR-10.
 */

function parsearNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return 0;
  if (typeof valor === 'number') return Number.isNaN(valor) ? 0 : valor;
  let numero = String(valor).replace(/[^\d.,-]/g, '');
  if (numero.includes(',') && numero.includes('.')) {
    numero = numero.replace(/\./g, '').replace(',', '.');
  } else if (numero.includes('.') && !numero.includes(',')) {
    const partes = numero.split('.');
    if (partes.length > 2 || (partes[1] && partes[1].length === 3)) {
      numero = numero.replace(/\./g, '');
    }
  } else if (numero.includes(',')) {
    numero = numero.replace(',', '.');
  }
  const n = parseFloat(numero);
  return Number.isNaN(n) ? 0 : n;
}

function formatearMonto(valor) {
  const n = typeof valor === 'number' ? valor : parsearNumero(valor);
  if (Number.isNaN(n)) return '0';
  return formatNumber(n, getAppLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export const TIPOS_OTROS_AMPAROS = [
  { id: 'arriendo', nombre: 'Arriendo / pérdida de rentas', unidadDefault: 'mes' },
  { id: 'retiro_escombros', nombre: 'Retiro de escombros', unidadDefault: 'm³' },
  { id: 'otro', nombre: 'Otro amparo (sin deducible)', unidadDefault: 'glb' },
];

/** Unidades frecuentes para cantidad × valor unitario. */
export const UNIDADES_OTROS_AMPAROS = [
  'm³',
  'm²',
  'ml',
  'und',
  'glb',
  'mes',
  'día',
  'kg',
  'ton',
];

const ALIAS_UNIDAD = {
  m3: 'm³',
  M3: 'm³',
  'M³': 'm³',
  mt3: 'm³',
  mts3: 'm³',
  m2: 'm²',
  M2: 'm²',
  'M²': 'm²',
  mt2: 'm²',
  unds: 'und',
  unidad: 'und',
  unidades: 'und',
  global: 'glb',
  meses: 'mes',
  dia: 'día',
  dias: 'día',
  días: 'día',
};

export function normalizarUnidadOtroAmparo(unidad) {
  const raw = String(unidad || '').trim();
  if (!raw) return '';
  if (ALIAS_UNIDAD[raw]) return ALIAS_UNIDAD[raw];
  const lower = raw.toLowerCase();
  if (ALIAS_UNIDAD[lower]) return ALIAS_UNIDAD[lower];
  return raw;
}

export function nombreTipoOtroAmparo(tipo, nombreLibre = '') {
  const cat = TIPOS_OTROS_AMPAROS.find((t) => t.id === tipo);
  if (tipo === 'otro' && String(nombreLibre || '').trim()) {
    return String(nombreLibre).trim();
  }
  return cat?.nombre || 'Otro amparo (sin deducible)';
}

export function nuevoOtroAmparo(parcial = {}) {
  const tipo = parcial.tipo || 'otro';
  const cat =
    TIPOS_OTROS_AMPAROS.find((t) => t.id === tipo) ||
    TIPOS_OTROS_AMPAROS[TIPOS_OTROS_AMPAROS.length - 1];
  const fila = {
    id: parcial.id || `oa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tipo,
    nombre: parcial.nombre || cat.nombre,
    aplica: parcial.aplica !== false,
    cantidad: parcial.cantidad ?? 1,
    unidad: normalizarUnidadOtroAmparo(parcial.unidad || cat.unidadDefault || 'glb'),
    valorUnitario: parcial.valorUnitario ?? '',
    valor: parcial.valor ?? '',
    observacion: parcial.observacion || '',
  };
  return recalcularValorOtroAmparo(fila);
}

export function defaultOtrosAmparos() {
  return [
    nuevoOtroAmparo({ tipo: 'arriendo', id: 'oa-arriendo' }),
    nuevoOtroAmparo({ tipo: 'retiro_escombros', id: 'oa-escombros' }),
  ];
}

/**
 * Valor = cantidad × valor unitario (cuando ambos están).
 * Si falta alguno, conserva el valor manual (si lo hay).
 */
export function recalcularValorOtroAmparo(fila = {}) {
  const cant = parsearNumero(fila.cantidad);
  const vu = parsearNumero(fila.valorUnitario);
  const tieneCant =
    fila.cantidad !== '' && fila.cantidad != null && !Number.isNaN(cant);
  const tieneVu =
    fila.valorUnitario !== '' &&
    fila.valorUnitario != null &&
    String(fila.valorUnitario).trim() !== '';
  if (tieneCant && tieneVu) {
    return {
      ...fila,
      valor: Math.round(cant * vu * 100) / 100,
    };
  }
  const manual = parsearNumero(fila.valor);
  return {
    ...fila,
    valor: manual > 0 ? manual : fila.valor === 0 || fila.valor === '0' ? 0 : fila.valor || '',
  };
}

/** Valor a mostrar en UI: siempre prioriza cantidad × vlr. unitario. */
export function valorMostrarOtroAmparo(fila = {}) {
  return recalcularValorOtroAmparo(fila).valor;
}

export function normalizarOtrosAmparos(lista) {
  if (!Array.isArray(lista) || !lista.length) return defaultOtrosAmparos();
  return lista.map((it) => nuevoOtroAmparo(it));
}

export function esOtroAmparoActivo(it = {}) {
  if (!it || it.aplica === false) return false;
  return parsearNumero(valorMostrarOtroAmparo(it)) > 0;
}

export function filasOtrosAmparosActivos(lista = []) {
  return (Array.isArray(lista) ? lista : []).filter(esOtroAmparoActivo);
}

export function sumarOtrosAmparos(lista = []) {
  return (
    Math.round(
      filasOtrosAmparosActivos(lista).reduce(
        (acc, it) => acc + parsearNumero(valorMostrarOtroAmparo(it)),
        0
      ) * 100
    ) / 100
  );
}

export function textoResumenOtrosAmparos(lista = []) {
  const activos = filasOtrosAmparosActivos(lista);
  if (!activos.length) return '';
  return activos
    .map((it) => {
      const nombre = nombreTipoOtroAmparo(it.tipo, it.nombre);
      const extra = String(it.observacion || '').trim();
      return extra
        ? `${nombre}: $ ${formatearMonto(it.valor)} (${extra})`
        : `${nombre}: $ ${formatearMonto(it.valor)}`;
    })
    .join('; ');
}
