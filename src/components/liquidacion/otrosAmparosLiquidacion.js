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
  { id: 'retiro_escombros', nombre: 'Retiro de escombros', unidadDefault: 'glb' },
  { id: 'otro', nombre: 'Otro amparo (sin deducible)', unidadDefault: 'glb' },
];

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
  return {
    id: parcial.id || `oa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tipo,
    nombre: parcial.nombre || cat.nombre,
    aplica: parcial.aplica !== false,
    cantidad: parcial.cantidad ?? 1,
    unidad: parcial.unidad || cat.unidadDefault || 'glb',
    valorUnitario: parcial.valorUnitario ?? '',
    valor: parcial.valor ?? '',
    observacion: parcial.observacion || '',
  };
}

export function defaultOtrosAmparos() {
  return [
    nuevoOtroAmparo({ tipo: 'arriendo', id: 'oa-arriendo' }),
    nuevoOtroAmparo({ tipo: 'retiro_escombros', id: 'oa-escombros' }),
  ];
}

export function recalcularValorOtroAmparo(fila = {}) {
  const cant = parsearNumero(fila.cantidad);
  const vu = parsearNumero(fila.valorUnitario);
  const tieneCantVu =
    fila.cantidad !== '' &&
    fila.cantidad != null &&
    fila.valorUnitario !== '' &&
    fila.valorUnitario != null;
  const valor =
    tieneCantVu && (cant > 0 || vu > 0)
      ? Math.round(cant * vu * 100) / 100
      : parsearNumero(fila.valor);
  return {
    ...fila,
    valor: valor || fila.valor || '',
  };
}

export function normalizarOtrosAmparos(lista) {
  if (!Array.isArray(lista) || !lista.length) return defaultOtrosAmparos();
  return lista.map((it) => nuevoOtroAmparo(it));
}

export function esOtroAmparoActivo(it = {}) {
  if (!it || it.aplica === false) return false;
  return parsearNumero(it.valor) > 0;
}

export function filasOtrosAmparosActivos(lista = []) {
  return (Array.isArray(lista) ? lista : []).filter(esOtroAmparoActivo);
}

export function sumarOtrosAmparos(lista = []) {
  return (
    Math.round(
      filasOtrosAmparosActivos(lista).reduce((acc, it) => acc + parsearNumero(it.valor), 0) * 100
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
