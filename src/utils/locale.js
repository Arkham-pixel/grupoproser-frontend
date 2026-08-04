export const supportedLocales = { es: 'es-CO', en: 'en-US' };

/** Idioma de la app: es | en */
export function getAppLocale() {
  const stored = localStorage.getItem('appLocale') || 'es';
  return stored.startsWith('en') ? 'en' : 'es';
}

/** Locale BCP-47 para Intl: es-CO | en-US */
export function getIntlLocale(locale) {
  const code = locale || getAppLocale();
  if (code === 'es-CO' || code === 'en-US') return code;
  if (typeof code === 'string' && code.includes('-')) {
    return supportedLocales[code.split('-')[0]] || supportedLocales.es;
  }
  return supportedLocales[code] || supportedLocales.es;
}

function browserLocale(locale) {
  return getIntlLocale(locale);
}

export function formatDate(value, locale = getAppLocale(), options = {}) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(browserLocale(locale), options).format(date);
}

export function formatDateTime(value, locale = getAppLocale(), options = {}) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(browserLocale(locale), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options,
  }).format(date);
}

export function formatTime(value, locale = getAppLocale(), options = {}) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(browserLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options,
  }).format(date);
}

export function formatCurrency(value, locale = getAppLocale(), currency = 'COP') {
  return new Intl.NumberFormat(browserLocale(locale), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function formatNumber(value, locale = getAppLocale(), options = {}) {
  return new Intl.NumberFormat(browserLocale(locale), options).format(Number(value) || 0);
}
