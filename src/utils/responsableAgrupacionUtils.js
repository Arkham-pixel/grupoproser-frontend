import {
  buildResponsableResolverIndex,
  normCatalogoTexto,
  resolverCodigoResponsable,
} from '../components/SubcomponenteExpress/expressHelpers.js';

export const FILTRO_RESPONSABLE_SIN_ASIGNAR = '__sin_asignar__';

function singularizarApellidoToken(token) {
  if (!token || token.length <= 2) return token;
  if (token.endsWith('S')) return token.slice(0, -1);
  return token;
}

/** Código de responsable en casos Complex, Riesgo o Express. */
export function obtenerCodigoResponsableCaso(caso) {
  const candidatos = [
    caso?.codiRespnsble,
    caso?.codi_responble,
    caso?.responsable,
    caso?.codiIspector,
  ];

  for (const raw of candidatos) {
    const str = String(raw ?? '').trim();
    if (str && str.toLowerCase() !== 'sin asignar') return str;
  }

  return '';
}

export function esCasoSinResponsableAsignado(caso) {
  if (obtenerCodigoResponsableCaso(caso)) return false;

  const nombre = String(caso?.nombreResponsable ?? caso?.responsable_form ?? '').trim();
  return !nombre || nombre.toLowerCase() === 'sin asignar';
}

function resolverNombreDesdeCallback(caso, responsableId, obtenerNombreResponsable) {
  if (typeof obtenerNombreResponsable !== 'function') return '';

  const candidatos = [];
  try {
    const porCaso = obtenerNombreResponsable(caso);
    if (porCaso) candidatos.push(String(porCaso).trim());
  } catch {
    /* callback orientado a código */
  }

  try {
    const porCodigo = obtenerNombreResponsable(responsableId);
    if (porCodigo) candidatos.push(String(porCodigo).trim());
  } catch {
    /* callback orientado a caso */
  }

  for (const valor of candidatos) {
    if (!valor || valor === '[object Object]' || valor.toLowerCase() === 'sin asignar') continue;
    return valor;
  }

  return '';
}

/**
 * Clave estable para agrupar al mismo responsable aunque el caso traiga
 * código, nombre en distinto casing o variantes del apellido (Garcia/Garcias).
 */
export function claveAgrupacionResponsable(valorRaw, catalogoResponsables = []) {
  const raw = String(valorRaw ?? '').trim();
  if (!raw || raw.toLowerCase() === 'sin asignar') {
    return { clave: 'sin_asignar', nombre: 'Sin asignar' };
  }

  const codi = resolverCodigoResponsable(raw, catalogoResponsables);
  const index = buildResponsableResolverIndex(catalogoResponsables);
  const entry = index.porCodi.get(codi);

  if (entry?.codi) {
    return { clave: `codi:${entry.codi}`, nombre: entry.nombre || raw };
  }

  const norm = normCatalogoTexto(raw);
  const tokens = norm.split(' ').filter(Boolean);
  if (tokens.length >= 2) {
    const persona = `${tokens[0]} ${singularizarApellidoToken(tokens[1])}`;
    return { clave: `persona:${persona}`, nombre: raw };
  }

  return { clave: `norm:${norm}`, nombre: raw };
}

export function elegirNombreMostrarResponsable(actual, candidato) {
  if (!actual) return candidato || '';
  if (!candidato) return actual;

  const palabrasActual = normCatalogoTexto(actual).split(' ').filter(Boolean).length;
  const palabrasCandidato = normCatalogoTexto(candidato).split(' ').filter(Boolean).length;

  if (palabrasCandidato > palabrasActual) return candidato;
  if (palabrasCandidato < palabrasActual) return actual;

  const esTodoMayusActual = actual === actual.toUpperCase();
  const esTodoMayusCandidato = candidato === candidato.toUpperCase();
  if (esTodoMayusActual && !esTodoMayusCandidato) return candidato;
  if (!esTodoMayusActual && esTodoMayusCandidato) return actual;

  return candidato.length > actual.length ? candidato : actual;
}

export function resolverAgrupacionCaso(caso, catalogoResponsables = [], obtenerNombreResponsable) {
  const responsableId = obtenerCodigoResponsableCaso(caso);
  if (!responsableId) {
    return { clave: 'sin_asignar', nombre: 'Sin asignar' };
  }

  const nombreEnCaso = (() => {
    const candidatos = [caso?.nombreResponsable, caso?.responsable_form].filter(Boolean);
    for (const raw of candidatos) {
      const str = String(raw).trim();
      if (str && str.toLowerCase() !== 'sin asignar') return str;
    }
    return '';
  })();

  const porCodigo = claveAgrupacionResponsable(responsableId, catalogoResponsables);
  const nombreLookup = resolverNombreDesdeCallback(caso, responsableId, obtenerNombreResponsable);

  const nombreDesdeLookup =
    nombreLookup &&
    nombreLookup !== String(responsableId) &&
    nombreLookup.toLowerCase() !== 'sin asignar'
      ? nombreLookup
      : '';

  const porNombre =
    nombreDesdeLookup && normCatalogoTexto(nombreDesdeLookup) !== normCatalogoTexto(responsableId)
      ? claveAgrupacionResponsable(nombreDesdeLookup, catalogoResponsables)
      : null;

  const clave = porCodigo.clave.startsWith('codi:')
    ? porCodigo.clave
    : porNombre?.clave || porCodigo.clave;

  const nombre = elegirNombreMostrarResponsable(
    elegirNombreMostrarResponsable(porCodigo.nombre, nombreEnCaso),
    elegirNombreMostrarResponsable(nombreDesdeLookup, porNombre?.nombre || '')
  );

  return { clave, nombre };
}

export function casoCoincideFiltroResponsable(
  caso,
  filtroStr,
  { responsables = [], getNombreResponsable } = {}
) {
  if (!filtroStr || !String(filtroStr).trim()) return true;

  const filtro = String(filtroStr).trim();
  if (filtro === FILTRO_RESPONSABLE_SIN_ASIGNAR || filtro.toLowerCase() === 'sin asignar') {
    return esCasoSinResponsableAsignado(caso);
  }

  let coincide = false;
  const codigoCaso = obtenerCodigoResponsableCaso(caso);

  if (codigoCaso && codigoCaso === filtro) {
    coincide = true;
  }

  if (!coincide && typeof getNombreResponsable === 'function') {
    const nombreCaso = getNombreResponsable(caso);
    if (nombreCaso && nombreCaso.trim() !== '') {
      const nombreCasoStr = nombreCaso.trim();
      if (
        nombreCasoStr === filtro ||
        nombreCasoStr.toLowerCase() === filtro.toLowerCase()
      ) {
        coincide = true;
      }
    }
  }

  if (!coincide && responsables.length > 0) {
    const responsableEncontrado = responsables.find(
      (r) => String(r.codiRespnsble || r.codigo || '').trim() === filtro
    );
    if (responsableEncontrado) {
      const codigoResponsableStr = String(
        responsableEncontrado.codiRespnsble || responsableEncontrado.codigo || ''
      ).trim();
      const nombreCaso =
        typeof getNombreResponsable === 'function' ? getNombreResponsable(caso) : '';
      const nombreResponsableStr = String(
        responsableEncontrado.nmbrRespnsble || responsableEncontrado.nombre || ''
      ).trim();

      if (
        codigoCaso === codigoResponsableStr ||
        (nombreCaso && nombreCaso.trim() === nombreResponsableStr)
      ) {
        coincide = true;
      }
    }
  }

  return coincide;
}
