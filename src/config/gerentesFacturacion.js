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

export function puedeAdministrarBandejaFacturacion(login) {
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
