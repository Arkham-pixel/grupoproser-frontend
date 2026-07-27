/**
 * Construye un objeto compatible con FormularioInspeccion
 * a partir de una fila/caso de riesgos.
 * Solo incluye claves con valor no vacío.
 */

const toTrim = (v) => String(v ?? '').trim();

const toIsoDateInput = (valor) => {
  if (valor === undefined || valor === null || valor === '') return '';
  try {
    const d = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

const labelDeObjeto = (valor) => {
  if (valor == null) return '';
  if (typeof valor === 'object') {
    return toTrim(valor.label || valor.rzonSocial || valor.descMunicipio || valor.nombre || '');
  }
  return toTrim(valor);
};

/**
 * Extrae ciudad y departamento desde string u objeto (react-select / catálogo).
 */
export function extraerCiudadYDepartamento(ciudad) {
  let ciudadSiniestro = '';
  let departamentoSiniestro = '';
  let municipioNombre = '';

  if (!ciudad) {
    return { ciudadSiniestro, departamentoSiniestro, municipioNombre };
  }

  if (typeof ciudad === 'object' && ciudad !== null) {
    const ciudadLabel = toTrim(ciudad.label);
    const ciudadValue = toTrim(ciudad.value || ciudad.descMunicipio);
    const ciudadNombre = toTrim(ciudad.descMunicipio || ciudad.nombre);

    if (ciudadLabel.includes(' - ')) {
      ciudadSiniestro = ciudadLabel.split(' - ')[0].trim();
      departamentoSiniestro =
        ciudadLabel.split(' - ')[1]?.trim() ||
        toTrim(ciudad.departamento || ciudad.descDepto);
    } else {
      ciudadSiniestro = ciudadNombre || ciudadValue || ciudadLabel;
      departamentoSiniestro = toTrim(ciudad.departamento || ciudad.descDepto);
    }
    municipioNombre = ciudadNombre || ciudadSiniestro;
    return { ciudadSiniestro, departamentoSiniestro, municipioNombre };
  }

  const ciudadStr = toTrim(ciudad);
  if (ciudadStr.includes(' - ')) {
    ciudadSiniestro = ciudadStr.split(' - ')[0].trim();
    departamentoSiniestro = ciudadStr.split(' - ')[1]?.trim() || '';
  } else {
    ciudadSiniestro = ciudadStr;
  }
  municipioNombre = ciudadSiniestro;
  return { ciudadSiniestro, departamentoSiniestro, municipioNombre };
}

export function resolverNombreAseguradora(aseguradora, aseguradoras = []) {
  if (!aseguradora) return '';
  if (typeof aseguradora === 'object') {
    return toTrim(aseguradora.rzonSocial || aseguradora.label);
  }
  const codigoONombre = toTrim(aseguradora);
  const encontrada = (aseguradoras || []).find(
    (a) =>
      String(a.codiAsgrdra) === codigoONombre ||
      String(a.cod1Asgrdra) === codigoONombre ||
      a.rzonSocial === codigoONombre
  );
  return encontrada ? encontrada.rzonSocial : codigoONombre;
}

function resolverCiudadDesdeCatalogo(codigo, ciudades = []) {
  const codigoStr = toTrim(codigo);
  if (!codigoStr || !Array.isArray(ciudades) || ciudades.length === 0) return '';

  const ciudad = ciudades.find((c) => {
    const candidates = [
      c.value,
      c.codiMunicipio,
      c.cod1Mun1c1p1o,
      c.cod1Cpoblado,
      c.codiPoblado,
    ].map((v) => toTrim(v));
    return candidates.includes(codigoStr);
  });

  if (!ciudad) return '';
  if (ciudad.label) return toTrim(ciudad.label);
  if (ciudad.descMunicipio && ciudad.descDepto) {
    return `${ciudad.descMunicipio} - ${ciudad.descDepto}`;
  }
  return toTrim(ciudad.descMunicipio || ciudad.descPoblado || '');
}

/**
 * Normaliza texto para comparar nombres (sin acentos / mayúsculas).
 */
export function normalizarTextoComparacion(valor) {
  return toTrim(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

/**
 * @param {object} caso - fila del reporte o formData de AgregarCasoRiesgo
 * @param {{ aseguradoras?: array, ciudades?: array }} [opts]
 */
export function buildPrefillInspeccionDesdeCasoRiesgo(caso, opts = {}) {
  if (!caso || typeof caso !== 'object') return {};

  const { aseguradoras = [], ciudades = [] } = opts;

  // Zona "Iniciar Inspección" del caso de riesgo → zona cliente del informe
  const nombreEmpresa = toTrim(
    caso.asegurado || caso.asgrBenfcro || caso.nombreCliente || caso.nombreEmpresa
  );
  const direccionCompleta = toTrim(
    caso.direccion || caso.codDireccion || caso.direccionRiesgo
  );

  const codigoAseguradora = toTrim(
    caso.codiAsgrdra ||
      caso.aseguradora_codigo ||
      (typeof caso.aseguradora === 'string' ? caso.aseguradora : caso.aseguradora?.codiAsgrdra) ||
      ''
  );
  // En Activación, "Cliente" es la aseguradora (código o nombre)
  const aseguradoraNombre =
    resolverNombreAseguradora(
      caso.codiAsgrdra || caso.aseguradora || caso.nombreAseguradora,
      aseguradoras
    ) || toTrim(caso.nombreAseguradora);

  let ciudadFuente = caso.ciudad;
  if (!ciudadFuente || (typeof ciudadFuente === 'string' && /^\d+$/.test(ciudadFuente.trim()))) {
    const codigoCiudad =
      (typeof caso.ciudad === 'object' ? '' : caso.ciudad) ||
      caso.codigoPoblado ||
      caso.ciudadSucursal ||
      caso.municipio;
    const desdeCatalogo = resolverCiudadDesdeCatalogo(codigoCiudad, ciudades);
    ciudadFuente =
      (typeof caso.ciudad === 'object' ? caso.ciudad : null) ||
      desdeCatalogo ||
      caso.descripcionCiudad ||
      caso.nombreCiudad ||
      codigoCiudad ||
      '';
  }

  const { ciudadSiniestro, departamentoSiniestro, municipioNombre } =
    extraerCiudadYDepartamento(ciudadFuente);

  const quienSolicitaNombre = labelDeObjeto(caso.quienSolicita || caso.funcSolicita);
  const clasificacionNombre = labelDeObjeto(
    caso.clasificacion || caso.rzonDescripcion || caso.codiClasificacion
  );
  const inspectorNombre = labelDeObjeto(
    caso.responsable || caso.codiIspector || caso.inspector || caso.nmbrRespnsble
  );

  const fechaInspeccion = toIsoDateInput(
    caso.fechaInspeccion || caso.fchaInspccion || caso.fecha
  );
  const fechaAsignacion = toIsoDateInput(
    caso.fechaAsignacion || caso.fchaAsgncion
  );

  const casoId = toTrim(caso._id || caso.id_riesgo || caso.id || caso.casoId);
  const nmroRiesgo = toTrim(caso.nmroRiesgo);

  const out = {
    // Nombre del Cliente / Empresa en el informe = Asegurado del caso
    nombreCliente: nombreEmpresa || undefined,
    nombreEmpresa: nombreEmpresa || undefined,
    asegurado: nombreEmpresa || undefined,
    // Dirección
    direccion: direccionCompleta || undefined,
    direccionRiesgo: direccionCompleta || undefined,
    // Ciudad / municipio
    municipio: municipioNombre || ciudadSiniestro || undefined,
    departamento: departamentoSiniestro || undefined,
    ciudad_siniestro: ciudadSiniestro || undefined,
    departamento_siniestro: departamentoSiniestro || undefined,
    ciudad: ciudadSiniestro || undefined,
    // Aseguradora (= Cliente en Activación)
    aseguradora: aseguradoraNombre || undefined,
    aseguradora_codigo: codigoAseguradora || undefined,
    quienSolicita: quienSolicitaNombre || undefined,
    clasificacion: clasificacionNombre || undefined,
    inspector: inspectorNombre || undefined,
    coordenadasRiesgo: toTrim(caso.coordenadasRiesgo || caso.coordenadas) || undefined,
    fechaInspeccion: fechaInspeccion || undefined,
    fechaAsignacion: fechaAsignacion || undefined,
    fecha: fechaInspeccion || fechaAsignacion || undefined,
    nmroRiesgo: nmroRiesgo || undefined,
    casoId: casoId || undefined,
    desdeRiesgo: true,
  };

  return Object.fromEntries(
    Object.entries(out).filter(([, v]) => {
      if (v === undefined || v === null) return false;
      if (typeof v === 'boolean') return true;
      return String(v).trim() !== '';
    })
  );
}
