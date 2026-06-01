export const parsearMontoReserva = (valor) => {
  if (valor === undefined || valor === null || valor === '') return 0;
  const limpio = String(valor).replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
  const num = parseFloat(limpio);
  return Number.isNaN(num) ? 0 : num;
};

export const formatearMontoReserva = (valor) => {
  const num = typeof valor === 'number' ? valor : parsearMontoReserva(valor);
  if (num === 0 && (valor === '' || valor === null || valor === undefined)) return '';
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);
};

export const calcularTotalReservaSugeridaItems = (items) => {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + parsearMontoReserva(item?.reserva), 0);
};

/** Texto breve para celdas de la tabla detallada del Word */
export const resumenTextoParaTablaWord = (texto, maxLen = 160) => {
  const t = String(texto ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!t) return '';
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
};
