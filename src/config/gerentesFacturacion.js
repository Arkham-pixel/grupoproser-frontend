export const GERENTES_FACTURACION_OPCIONES = [
  { clave: 'elkin', nombre: 'Elkin Tapia Gutiérrez' },
  { clave: 'iskharly', nombre: 'Iskharly José Tapia Gutierrez' },
  { clave: 'adriana', nombre: 'Adriana Angulo Funes' },
];

/** Oscar Atencio — ve la bandeja de todos los jefes */
export const LOGIN_SUPERVISOR_BANDEJA = '1065012991';

const LOGIN_A_GERENTE = {
  '72287602': 'elkin',
  '72007205': 'iskharly',
  '1143263277': 'adriana',
};

export function gerenteDesdeLogin(login) {
  return LOGIN_A_GERENTE[String(login || '').trim()] || null;
}

export function esSupervisorBandeja(login) {
  return String(login || '').trim() === LOGIN_SUPERVISOR_BANDEJA;
}

/** Solo jefes y Oscar Atencio (1065012991). */
export function esUsuarioGerenteFacturacion(login) {
  if (esSupervisorBandeja(login)) return true;
  return Boolean(gerenteDesdeLogin(login));
}

export function puedeElegirGerenteEnBandeja(login) {
  return esSupervisorBandeja(login);
}

export function nombreGerente(clave) {
  const op = GERENTES_FACTURACION_OPCIONES.find((g) => g.clave === clave);
  return op?.nombre || clave || '—';
}

export const TIPO_ENVIO_LABELS = {
  control_horas: 'Control de horas',
  gerencia: 'Envío a gerencia / facturación',
};
