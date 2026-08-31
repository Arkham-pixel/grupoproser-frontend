/**
 * Formato de montos en pesos colombianos (COP).
 *
 * Separadores de miles (equivalentes):
 *   punto     61.642.000
 *   apóstrofo/tilde  61'642.000   (Excel, presupuestos, PDFs)
 * Decimal (si viene): coma  61.642,50
 *
 * La “tilde” de cotizaciones ($61'642.000) es el apóstrofo (o un ~);
 * aquí se trata igual que el punto de miles.
 */

/** Apóstrofo, comilla tipográfica, acento, prima, tilde (~) y puntos raros de PDF. */
export const RE_SEPARADOR_MILES_COP =
  /[\u0027\u2019\u2018\u201B\u00B4\u2032\u2035\u02BC\u02B9\uFF07`\u007E\u02DC\u223C\uFF5E\u00B7\u2024\uFF0E]/g;

const CLASE_TILDE =
  "\\u0027\\u2019\\u2018\\u201B\\u00B4\\u2032\\u2035\\u02BC\\u02B9\\uFF07`\\u007E\\u02DC\\u223C\\uFF5E";

export function normalizarSeparadoresMilesCOP(texto = '') {
  return String(texto)
    .replace(/\u00A0/g, ' ')
    .replace(RE_SEPARADOR_MILES_COP, '.');
}

/** Deja $61'642.000 / $61 ~ 642 . 000 como $61.642.000 para el regex y el parseo. */
export function compactarMontosEnLineaCOP(linea = '') {
  return normalizarSeparadoresMilesCOP(linea)
    .replace(/(\d)\s*\.\s*(?=\d)/g, '$1.')
    .replace(/(\d{1,3}(?:\.\d{3})+)\s*[.]?\s*000\b/g, '$1.000')
    .replace(/(\d{1,3})\.(\d{3})000\b/g, '$1.$2.000');
}

export function documentoUsaTildeMiles(rows = []) {
  const re = new RegExp(`\\d\\s*[${CLASE_TILDE}]\\s*\\d{3}`);
  return (Array.isArray(rows) ? rows : [rows]).some((l) => re.test(String(l || '')));
}

function gruposMilesCOP(crudo = '') {
  return compactarMontosEnLineaCOP(crudo)
    .replace(/[^\d.]+/g, '')
    .split('.')
    .filter(Boolean);
}

/**
 * `$61'642` / `61.642` (dos grupos y el último no es 000):
 * el PDF cortó el `.000` de los millones → 61.642.000.
 */
export function esMontoMillonesTruncadoCOP(crudo, monto) {
  const n = Number.isFinite(Number(monto)) ? Number(monto) : parsearMontoCOP(crudo);
  if (!(n >= 1000 && n < 1000000)) return false;
  const grupos = gruposMilesCOP(String(crudo || ''));
  if (grupos.length !== 2) return false;
  if (!/^\d{1,3}$/.test(grupos[0]) || !/^\d{3}$/.test(grupos[1])) return false;
  return grupos[1] !== '000';
}

export function completarMillonesTruncadosCOP(crudo, monto) {
  const n = Number.isFinite(Number(monto)) ? Number(monto) : parsearMontoCOP(crudo);
  return esMontoMillonesTruncadoCOP(crudo, n) ? n * 1000 : n;
}

export function parsearMontoCOP(valor) {
  if (valor === '' || valor === null || valor === undefined) return 0;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  let numero = compactarMontosEnLineaCOP(valor).replace(/[^\d.,-]/g, '');
  if (!numero) return 0;
  if (numero.includes(',') && numero.includes('.')) {
    const ultimoPunto = numero.lastIndexOf('.');
    const ultimaComa = numero.lastIndexOf(',');
    if (ultimoPunto > ultimaComa) {
      const decimales = numero.slice(ultimoPunto + 1);
      numero =
        decimales.length === 3
          ? numero.replace(/[.,]/g, '')
          : numero.replace(/,/g, '');
    } else {
      numero = numero.replace(/\./g, '').replace(',', '.');
    }
  } else if (numero.includes('.') && !numero.includes(',')) {
    const partes = numero.split('.');
    if (partes.length === 2 && /^\d{3}000+$/.test(partes[1])) {
      numero = `${partes[0]}${partes[1]}`;
    } else if (partes.length > 2 || (partes[1] && partes[1].length === 3)) {
      numero = numero.replace(/\./g, '');
    }
  } else if (numero.includes(',')) {
    const partes = numero.split(',');
    if (partes.length > 2 || (partes[1] && partes[1].length === 3 && !numero.includes('.'))) {
      numero = numero.replace(/,/g, '');
    } else {
      numero = numero.replace(',', '.');
    }
  }
  const n = parseFloat(numero);
  return Number.isFinite(n) ? n : 0;
}

const SEP = `[.'\\s${CLASE_TILDE}]`;

/** Detecta $61'642.000, $61.642.000, $61~642.000, 12,450.00, etc. */
export const RE_MONTO_COP = new RegExp(
  `\\$\\s*\\d{1,3}(?:${SEP}\\d{3})+(?:,\\d{1,2})?` +
    `|\\$\\s*\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?` +
    `|\\$\\s*\\d+(?:[.,]\\d{2})?` +
    `|\\d{1,3}(?:${SEP}\\d{3}){1,4}(?:,\\d{1,2})?` +
    `|\\d{1,3}(?:,\\d{3}){1,4}(?:\\.\\d{2})?` +
    `|\\d{4,}(?:[.,]\\d{2})?`,
  'g'
);
