/** Etiquetas de estado visibles en listado, Excel y formulario. */
export const ETIQUETAS_ESTADO_PUERTOS = {
  borrador: 'Borrador',
  en_curso: 'En curso',
  terminado: 'Terminado',
  maqueta: 'Maqueta',
};

export const CODIGOS_ESTADO_FILTRO = [
  { value: '', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'terminado', label: 'Terminado' },
  { value: 'maqueta', label: 'Maqueta (actas)' },
];

const PLACEHOLDER_ESTADO = /^x{3,}$/i;

/** Normaliza códigos legacy al esquema actual. */
export function normalizarCodigoEstadoPuertos(codigo) {
  const c = String(codigo || '').trim().toLowerCase();
  if (c === 'completo') return 'terminado';
  if (c === 'iniciado' || c === 'en_progreso') return 'en_curso';
  if (c === 'borrador' || c === 'en_curso' || c === 'terminado' || c === 'maqueta') return c;
  return '';
}

export function esEstadoPlaceholder(texto) {
  const t = String(texto || '').trim();
  return !t || PLACEHOLDER_ESTADO.test(t);
}

/**
 * Etiqueta para mostrar en UI (nunca devuelve xxxxxxx).
 * Si se pasa `t` (i18n), traduce códigos conocidos vía `ports.ui.estados.*`.
 */
export function resolverEtiquetaEstadoPuertos(fila = {}, t) {
  const codigo = normalizarCodigoEstadoPuertos(fila.estadoCodigo);
  if (codigo && ETIQUETAS_ESTADO_PUERTOS[codigo]) {
    if (typeof t === 'function') {
      return t(`ports.ui.estados.${codigo}`);
    }
    return ETIQUETAS_ESTADO_PUERTOS[codigo];
  }
  if (!esEstadoPlaceholder(fila.estado)) {
    return String(fila.estado).trim();
  }
  if (typeof t === 'function') {
    return t('ports.ui.estados.borrador');
  }
  return ETIQUETAS_ESTADO_PUERTOS.borrador;
}

export function codigoEstadoPuertos(fila = {}) {
  const codigo = normalizarCodigoEstadoPuertos(fila.estadoCodigo);
  if (codigo) return codigo;
  const etiqueta = resolverEtiquetaEstadoPuertos(fila).toLowerCase();
  if (etiqueta.includes('termin')) return 'terminado';
  if (etiqueta.includes('curso')) return 'en_curso';
  if (etiqueta.includes('borrador')) return 'borrador';
  return 'borrador';
}

export function claseBadgeEstadoPuertos(codigo) {
  switch (normalizarCodigoEstadoPuertos(codigo) || codigo) {
    case 'terminado':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';
    case 'en_curso':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200';
    case 'borrador':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
    case 'maqueta':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
  }
}

export function coincideFiltroEstado(fila, filtroEstado) {
  if (!filtroEstado) return true;
  const codigoFila = codigoEstadoPuertos(fila);
  const filtro = normalizarCodigoEstadoPuertos(filtroEstado) || filtroEstado;
  return codigoFila === filtro;
}
