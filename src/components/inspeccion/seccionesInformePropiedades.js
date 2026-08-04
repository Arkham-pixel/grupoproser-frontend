import { PLANTILLA_RESIDENCIAL, idsAreasDesdePlantilla, subIndicesDesdePlantilla } from './propiedadesAreasConfig.js';

/** Secciones fijas del informe (el grupo de áreas es dinámico según clase/tipo). */
export const SECCIONES_INFORME_PROPIEDADES = [
  {
    id: 'informe',
    ref: '0.',
    titulo: 'REPORTE DE INSPECCIÓN DE PROPIEDAD',
    tituloKey: 'inspection.ui.formulario_propiedades.sections.informe',
    obligatoria: true,
    seleccionable: false,
  },
  {
    id: 'informacionGeneral',
    ref: '1.',
    titulo: 'INFORMACIÓN GENERAL DEL INMUEBLE',
    tituloKey: 'inspection.ui.formulario_propiedades.sections.informacionGeneral',
    obligatoria: true,
  },
  {
    id: 'informacionJuridica',
    ref: '1.2',
    titulo: 'INFORMACIÓN JURÍDICA DEL INMUEBLE',
    tituloKey: 'inspection.ui.formulario_propiedades.sections.informacionJuridica',
    anexoDe: 'informacionGeneral',
  },
  {
    id: 'inspeccionMetrica',
    ref: '2.',
    titulo: 'INSPECCIÓN MÉTRICA',
    tituloKey: 'inspection.ui.formulario_propiedades.sections.inspeccionMetrica',
  },
  {
    id: 'inspeccionPorAreas',
    ref: '3.',
    titulo: 'INSPECCIÓN POR ÁREAS',
    tituloKey: 'inspection.ui.formulario_propiedades.sections.inspeccionPorAreas',
    esGrupo: true,
    seleccionable: false,
  },
  {
    id: 'conclusiones',
    ref: '4.',
    titulo: 'CONCLUSIONES',
    tituloKey: 'inspection.ui.formulario_propiedades.sections.conclusiones',
    obligatoria: true,
  },
  {
    id: 'observacionesPrincipales',
    ref: '4.1',
    titulo: 'PRINCIPALES OBSERVACIONES',
    tituloKey: 'inspection.ui.formulario_propiedades.sections.observacionesPrincipales',
    anexoDe: 'conclusiones',
  },
  {
    id: 'firmas',
    ref: '',
    titulo: 'FIRMAS',
    tituloKey: 'inspection.ui.formulario_propiedades.sections.firmas',
    obligatoria: true,
    seleccionable: false,
  },
];

function tituloSeccion(cfg, t) {
  if (typeof t === 'function' && cfg.tituloKey) {
    const translated = t(cfg.tituloKey);
    if (translated && translated !== cfg.tituloKey) return translated;
  }
  return cfg.titulo;
}

function tituloAreaIndice(sub, t) {
  if (typeof t === 'function' && sub?.id) {
    const key = `inspection.ui.formulario_propiedades.areas.${sub.id}`;
    const translated = t(key);
    if (translated && translated !== key) return String(translated).toUpperCase();
  }
  return sub.titulo;
}

export function obtenerSubIndicesAreas(plantilla = PLANTILLA_RESIDENCIAL) {
  return subIndicesDesdePlantilla(plantilla);
}

export function crearSeccionesActivasPorDefecto(plantilla = PLANTILLA_RESIDENCIAL) {
  const idsAreas = idsAreasDesdePlantilla(plantilla);
  const base = Object.fromEntries(
    SECCIONES_INFORME_PROPIEDADES.filter((s) => s.seleccionable !== false && !s.esGrupo).map((s) => [s.id, true])
  );
  for (const id of idsAreas) {
    base[id] = true;
  }
  return base;
}

export function normalizarSeccionesActivas(guardadas, plantilla = PLANTILLA_RESIDENCIAL) {
  const idsAreas = idsAreasDesdePlantilla(plantilla);
  const base = crearSeccionesActivasPorDefecto(plantilla);
  if (!guardadas || typeof guardadas !== 'object') return base;

  for (const seccion of SECCIONES_INFORME_PROPIEDADES) {
    if (seccion.seleccionable === false || seccion.esGrupo) continue;
    if (guardadas[seccion.id] !== undefined) {
      base[seccion.id] = Boolean(guardadas[seccion.id]);
    }
  }
  for (const id of idsAreas) {
    if (guardadas[id] !== undefined) {
      base[id] = Boolean(guardadas[id]);
    }
  }

  for (const seccion of SECCIONES_INFORME_PROPIEDADES) {
    if (seccion.obligatoria) base[seccion.id] = true;
  }

  return base;
}

export function estaSeccionPropiedadesActiva(seccionesActivas, id, plantilla = PLANTILLA_RESIDENCIAL) {
  const subIndices = obtenerSubIndicesAreas(plantilla);
  const esSubArea = subIndices.some((x) => x.id === id);

  const cfg = SECCIONES_INFORME_PROPIEDADES.find((s) => s.id === id);
  if (!cfg && esSubArea) {
    return seccionesActivas?.[id] !== false;
  }
  if (!cfg) return true;

  if (cfg.obligatoria || cfg.seleccionable === false) return true;
  if (cfg.esGrupo) {
    return subIndices.some((sub) => estaSeccionPropiedadesActiva(seccionesActivas, sub.id, plantilla));
  }
  return seccionesActivas?.[id] !== false;
}

export function construirNumeracionActiva(seccionesActivas, plantilla = PLANTILLA_RESIDENCIAL, t) {
  const subIndices = obtenerSubIndicesAreas(plantilla);
  const numeracion = new Map();
  let n = 0;

  for (const cfg of SECCIONES_INFORME_PROPIEDADES) {
    const titulo = tituloSeccion(cfg, t);

    if (cfg.id === 'informe') {
      numeracion.set('informe', {
        ref: cfg.ref,
        titulo,
        encabezado: `${cfg.ref} ${titulo}`.trim(),
      });
      continue;
    }

    if (cfg.anexoDe) {
      if (!estaSeccionPropiedadesActiva(seccionesActivas, cfg.id, plantilla)) continue;
      const padre = numeracion.get(cfg.anexoDe);
      const sufijo = cfg.ref.includes('.') ? cfg.ref.split('.').slice(1).join('.') : '1';
      const ref = padre?.numero != null ? `${padre.numero}.${sufijo}` : cfg.ref;
      numeracion.set(cfg.id, {
        ref,
        titulo,
        encabezado: `${ref} ${titulo}`,
      });
      continue;
    }

    if (cfg.esGrupo) {
      const subsActivos = subIndices.filter((sub) =>
        estaSeccionPropiedadesActiva(seccionesActivas, sub.id, plantilla)
      );
      if (subsActivos.length === 0) continue;
      n += 1;
      const entry = {
        ref: `${n}.`,
        titulo,
        encabezado: `${n}. ${titulo}`,
        numero: n,
        subIndices: [],
      };
      subsActivos.forEach((sub, idx) => {
        const subTitulo = tituloAreaIndice(sub, t);
        const subEntry = {
          id: sub.id,
          ref: `${n}.${idx + 1}`,
          titulo: subTitulo,
          encabezado: `${n}.${idx + 1} ${subTitulo}`,
        };
        entry.subIndices.push(subEntry);
        numeracion.set(sub.id, subEntry);
      });
      numeracion.set(cfg.id, entry);
      continue;
    }

    if (cfg.id === 'firmas') {
      numeracion.set('firmas', { ref: '', titulo, encabezado: titulo });
      continue;
    }

    if (!estaSeccionPropiedadesActiva(seccionesActivas, cfg.id, plantilla)) continue;

    n += 1;
    numeracion.set(cfg.id, {
      ref: `${n}.`,
      titulo,
      encabezado: `${n}. ${titulo}`,
      numero: n,
    });
  }

  return numeracion;
}

export function obtenerFilasIndicePropiedades(seccionesActivas, plantilla = PLANTILLA_RESIDENCIAL, t) {
  const subIndices = obtenerSubIndicesAreas(plantilla);
  const numeracion = construirNumeracionActiva(seccionesActivas, plantilla, t);
  const filas = [];

  for (const seccion of SECCIONES_INFORME_PROPIEDADES) {
    if (seccion.esGrupo) {
      const num = numeracion.get(seccion.id);
      const algunaActiva = subIndices.some((sub) =>
        estaSeccionPropiedadesActiva(seccionesActivas, sub.id, plantilla)
      );
      filas.push({
        tipo: 'principal',
        id: seccion.id,
        ref: algunaActiva && num ? num.ref : '—',
        titulo: tituloSeccion(seccion, t),
        obligatoria: false,
        seleccionable: false,
        activa: algunaActiva,
      });
      subIndices.forEach((sub) => {
        const subNum = numeracion.get(sub.id);
        const activa = estaSeccionPropiedadesActiva(seccionesActivas, sub.id, plantilla);
        filas.push({
          tipo: 'sub',
          id: sub.id,
          parentId: seccion.id,
          ref: activa && subNum ? subNum.ref : '—',
          titulo: tituloAreaIndice(sub, t),
          obligatoria: false,
          seleccionable: true,
          activa,
        });
      });
      continue;
    }

    if (seccion.anexoDe) {
      const activa = estaSeccionPropiedadesActiva(seccionesActivas, seccion.id, plantilla);
      const num = numeracion.get(seccion.id);
      filas.push({
        tipo: 'sub',
        id: seccion.id,
        parentId: seccion.anexoDe,
        ref: activa && num ? num.ref : '—',
        titulo: tituloSeccion(seccion, t),
        obligatoria: Boolean(seccion.obligatoria),
        seleccionable: !seccion.obligatoria && seccion.seleccionable !== false,
        activa,
      });
      continue;
    }

    const activa = estaSeccionPropiedadesActiva(seccionesActivas, seccion.id, plantilla);
    const num = numeracion.get(seccion.id);

    filas.push({
      tipo: 'principal',
      id: seccion.id,
      ref: activa && num ? num.ref : '—',
      titulo: tituloSeccion(seccion, t),
      obligatoria: Boolean(seccion.obligatoria),
      seleccionable: seccion.seleccionable !== false && !seccion.obligatoria,
      activa,
    });
  }

  return filas;
}

export function obtenerFilasIndiceWordPropiedades(seccionesActivas, plantilla = PLANTILLA_RESIDENCIAL, t) {
  return obtenerFilasIndicePropiedades(seccionesActivas, plantilla, t).filter((fila) => {
    if (fila.tipo === 'principal') {
      if (fila.id === 'informe') return true;
      return fila.activa;
    }
    return fila.activa;
  });
}
