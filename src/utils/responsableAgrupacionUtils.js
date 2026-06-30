import {
  buildResponsableResolverIndex,
  normCatalogoTexto,
  resolverCodigoResponsable,
} from '../components/SubcomponenteExpress/expressHelpers.js';

function singularizarApellidoToken(token) {
  if (!token || token.length <= 2) return token;
  if (token.endsWith('S')) return token.slice(0, -1);
  return token;
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
  const responsableId = caso?.responsable || caso?.codiIspector;
  if (!responsableId) {
    return { clave: 'sin_asignar', nombre: 'Sin asignar' };
  }

  const porCodigo = claveAgrupacionResponsable(responsableId, catalogoResponsables);
  const nombreLookup =
    typeof obtenerNombreResponsable === 'function'
      ? obtenerNombreResponsable(responsableId)
      : '';

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
    porCodigo.nombre,
    elegirNombreMostrarResponsable(nombreDesdeLookup, porNombre?.nombre || '')
  );

  return { clave, nombre };
}
