export const GERENTES_FACTURACION_OPCIONES = [
  { clave: 'elkin', nombre: 'Elkin Tapia Gutiérrez' },
  { clave: 'iskharly', nombre: 'Iskharly José Tapia Gutierrez' },
  { clave: 'adriana', nombre: 'Adriana Angulo Funes' },
];

/** Oscar Atencio — ve la bandeja de todos los jefes y puede administrarla */
export const LOGIN_SUPERVISOR_BANDEJA = '1065012991';

/** Usuarios que pueden ver la bandeja de todos los jefes (selector de gerente) */
export const LOGINS_SUPERVISORES_BANDEJA = [
  LOGIN_SUPERVISOR_BANDEJA,
  '1140829957', // Arnaldo Andrés Tapia Gutierrez
];

const LOGIN_A_GERENTE = {
  '72287602': 'elkin',
  '72007205': 'iskharly',
  '1143263277': 'adriana',
};

export function gerenteDesdeLogin(login) {
  return LOGIN_A_GERENTE[String(login || '').trim()] || null;
}

export function esSupervisorBandeja(login) {
  return LOGINS_SUPERVISORES_BANDEJA.includes(String(login || '').trim());
}

/** Solo jefes y Oscar Atencio (1065012991). */
export function esUsuarioGerenteFacturacion(login) {
  if (esSupervisorBandeja(login)) return true;
  return Boolean(gerenteDesdeLogin(login));
}

export function puedeElegirGerenteEnBandeja(login) {
  return esSupervisorBandeja(login);
}

/** Solo Oscar: corregir destinatario o quitar registros de la bandeja. */
export function puedeAdministrarBandejaFacturacion(login) {
  return String(login || '').trim() === LOGIN_SUPERVISOR_BANDEJA;
}

export function nombreGerente(clave) {
  const op = GERENTES_FACTURACION_OPCIONES.find((g) => g.clave === clave);
  if (op) return op.nombre;
  if (String(clave || '').toLowerCase() === 'ladys') return 'Ladys Andrea Escalante';
  return clave || '—';
}

export const LOGIN_LIDER_ZURICH_FACTURACION = '1041899782';

/** Previsora: solo estas personas ven Facturación / control de horas. */
export const LOGINS_FACTURACION_PREVISORA = [
  '1065012991', // Oscar Atencia
  '72287602', // Elkin Tapia Gutiérrez
  '1143263277', // Adriana Angulo Funes
  '72007205', // Iskharly José Tapia Gutierrez
  '45765743', // Yaneth Del Carmen Vitola Suarez
];

export function puedeVerFacturacionPrevisora(login) {
  return LOGINS_FACTURACION_PREVISORA.includes(String(login || '').trim());
}

/** Zurich: solo estas personas ven Facturación / control de horas y la bandeja. */
export const LOGINS_FACTURACION_ZURICH = [
  '1065012991', // Oscar Atencia
  '72287602', // Elkin Tapia Gutiérrez
  '1143263277', // Adriana Angulo Funes
  '1130615470', // Sindy Marcela Gomez Gomez
  '1041899782', // Ladys Andrea Escalante Bossio
];

export function puedeVerFacturacionZurich(login) {
  return LOGINS_FACTURACION_ZURICH.includes(String(login || '').trim());
}

/** Sura: solo estas personas ven Facturación / control de horas. */
export const LOGINS_FACTURACION_SURA = [
  '1065012991', // Oscar Atencia
  '72287602', // Elkin Tapia Gutiérrez
  '1143263277', // Adriana Angulo Funes
  '72134505', // Bernardo Sojo Guzmán
  '66901947', // Ligia Garcia (Catastróficos)
];

export function puedeVerFacturacionSura(login) {
  return LOGINS_FACTURACION_SURA.includes(String(login || '').trim());
}

/** Allianz: solo estas personas ven Facturación / control de horas. */
export const LOGINS_FACTURACION_ALLIANZ = [
  '1065012991', // Oscar Atencia
  '72287602', // Elkin Tapia Gutiérrez
  '1143263277', // Adriana Angulo Funes
  '72288319', // Mario Alberto Pinilla de la Torre
  '1140829957', // Arnaldo Andrés Tapia Gutierrez
  '1088828255', // Juana Maria Hincapie (Catastróficos)
];

export function puedeVerFacturacionAllianz(login) {
  return LOGINS_FACTURACION_ALLIANZ.includes(String(login || '').trim());
}

function haystackNombre(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s*\([^)]*\)/g, ' ')
    .trim()
    .toUpperCase();
}

export function esLiderZurichFacturacion(login, nombre) {
  if (String(login || '').trim() === LOGIN_LIDER_ZURICH_FACTURACION) return true;
  const hay = haystackNombre(nombre);
  return hay.includes('LADYS') && hay.includes('ESCALANTE');
}

/** Solo la lista autorizada de Facturación Zurich. */
export function puedeVerBandejaFacturacionZurich(login) {
  return puedeVerFacturacionZurich(login);
}

export const TIPO_ENVIO_LABELS = {
  control_horas: 'Control de horas',
  gerencia: 'Envío a gerencia / facturación',
};

export const TIPO_ENVIO_I18N_KEYS = {
  control_horas: 'tipo_control_horas',
  gerencia: 'tipo_gerencia',
};

export function labelTipoEnvio(tipo, t) {
  const key = TIPO_ENVIO_I18N_KEYS[tipo];
  if (typeof t === 'function' && key) {
    return t(`complex.ui.bandeja_facturacion.${key}`);
  }
  return TIPO_ENVIO_LABELS[tipo] || tipo;
}

/** Resuelve código de estado → nombre legible (mismo criterio que el reporte Complex). */
export function resolverNombreEstadoDesdeCatalogo(fila, estadosCatalogo = []) {
  const catalogo = Array.isArray(estadosCatalogo) ? estadosCatalogo : [];
  const candidatos = [];

  for (const v of [
    fila?.codiEstdo,
    fila?.codi_estado,
    fila?.estado,
    fila?.nombreEstado,
    fila?.descripcionEstado,
  ]) {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      candidatos.push(String(v).trim());
    }
  }

  const unicos = [...new Set(candidatos)];

  for (const valor of unicos) {
    if (!/^\d+$/.test(valor)) continue;
    const hit = catalogo.find((e) => {
      const cod = String(e.codiEstdo ?? e.codiEstado ?? '').trim();
      return cod === valor || cod === String(Number(valor));
    });
    if (hit) return (hit.descEstdo ?? hit.descEstado ?? '').trim() || valor;
  }

  for (const valor of unicos) {
    if (/^\d+$/.test(valor)) continue;
    const upper = valor.toUpperCase();
    const hitLabel = catalogo.find(
      (e) => String(e.descEstdo ?? e.descEstado ?? '').trim().toUpperCase() === upper
    );
    if (hitLabel) return hitLabel.descEstdo ?? hitLabel.descEstado ?? valor;
    if (valor.length > 1) return valor;
  }

  for (const valor of unicos) {
    if (/^\d+$/.test(valor)) return valor;
  }
  return '—';
}
