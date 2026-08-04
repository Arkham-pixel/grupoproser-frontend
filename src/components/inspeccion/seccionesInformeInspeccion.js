/** Secciones del informe de inspección de riesgo (formulario + Word). */
export const SECCIONES_INFORME_INSPECCION = [
  {
    id: 'informe',
    ref: '0.',
    titulo: 'INFORME DE INSPECCIÓN',
    tituloKey: 'inspection.sections.informe',
    pagina: '2',
    obligatoria: true,
    seleccionable: false,
  },
  {
    id: 'informacionGeneral',
    ref: '1.',
    titulo: 'INFORMACIÓN GENERAL',
    tituloKey: 'inspection.sections.informacionGeneral',
    pagina: '8',
    obligatoria: true,
  },
  {
    id: 'descripcionEmpresa',
    ref: '2.',
    titulo: 'DESCRIPCIÓN GENERAL DE LA EMPRESA',
    tituloKey: 'inspection.sections.descripcionEmpresa',
    pagina: '9',
  },
  {
    id: 'infraestructura',
    ref: '3.',
    titulo: 'INFRAESTRUCTURA',
    tituloKey: 'inspection.sections.infraestructura',
    pagina: '10',
  },
  {
    id: 'procesos',
    ref: '4.',
    titulo: 'PROCESOS',
    tituloKey: 'inspection.sections.procesos',
    pagina: '11',
  },
  {
    id: 'linderos',
    ref: '5.',
    titulo: 'LINDEROS',
    tituloKey: 'inspection.sections.linderos',
    pagina: '12',
    subIndices: [
      {
        ref: '5.1',
        titulo: 'MAPA DE UBICACIÓN',
        tituloKey: 'inspection.sections.mapaUbicacion',
        pagina: '13',
      },
    ],
  },
  {
    id: 'sustraccion',
    ref: '6.',
    titulo: 'SUSTRACCIÓN - PROTECCIONES FÍSICAS',
    tituloKey: 'inspection.sections.sustraccion',
    pagina: '14',
  },
  {
    id: 'caracteristicasAmbientales',
    ref: '7.',
    titulo: 'CARACTERÍSTICAS OPERATIVAS AMBIENTALES',
    tituloKey: 'inspection.sections.caracteristicasAmbientales',
    pagina: '15',
  },
  {
    id: 'proteccionIncendios',
    ref: '8.',
    titulo: 'PROTECCIÓN Y PREVENCIÓN CONTRA INCENDIOS',
    tituloKey: 'inspection.sections.proteccionIncendios',
    pagina: '16',
  },
  {
    id: 'lucroCesante',
    ref: '9.',
    titulo: 'LUCRO CESANTE',
    tituloKey: 'inspection.sections.lucroCesante',
    pagina: '17',
  },
  {
    id: 'pml',
    ref: '9.1',
    titulo: 'PML (PÉRDIDA MÁXIMA PROBABLE)',
    tituloKey: 'inspection.sections.pml',
    pagina: '18',
  },
  {
    id: 'procesosCriticos',
    ref: '10.',
    titulo: 'PROCESOS CRÍTICOS Y RIESGOS MEDIOAMBIENTALES',
    tituloKey: 'inspection.sections.procesosCriticos',
    pagina: '19',
  },
  {
    id: 'roturaMaquinaria',
    ref: '11.',
    titulo: 'POR ROTURA DE MAQUINARIA',
    tituloKey: 'inspection.sections.roturaMaquinaria',
    pagina: '20',
  },
  {
    id: 'maquinaria',
    ref: '12.',
    titulo: 'MAQUINARIA, EQUIPOS Y MANTENIMIENTO',
    tituloKey: 'inspection.sections.maquinaria',
    pagina: '21',
  },
  {
    id: 'serviciosIndustriales',
    ref: '13.',
    titulo: 'SERVICIOS INDUSTRIALES',
    tituloKey: 'inspection.sections.serviciosIndustriales',
    pagina: '22',
  },
  {
    id: 'siniestralidad',
    ref: '14.',
    titulo: 'SINIESTRALIDAD',
    tituloKey: 'inspection.sections.siniestralidad',
    pagina: '23',
  },
  {
    id: 'almacenamiento',
    ref: '15.',
    titulo: 'ALMACENAMIENTO',
    tituloKey: 'inspection.sections.almacenamiento',
    pagina: '24',
  },
  {
    id: 'analisisRiesgos',
    ref: '16.',
    titulo: 'ANÁLISIS Y CLASIFICACIÓN DE RIESGOS',
    tituloKey: 'inspection.sections.analisisRiesgos',
    pagina: '25',
    subIndices: [
      {
        ref: '16.1',
        titulo: 'ANÁLISIS DE RIESGOS',
        tituloKey: 'inspection.sections.analisisRiesgosSub',
        pagina: '25',
      },
      {
        ref: '16.2',
        titulo: 'CLASIFICACIÓN DE RIESGOS',
        tituloKey: 'inspection.sections.clasificacionRiesgos',
        pagina: '26',
      },
      {
        ref: '16.3',
        titulo: 'CALIFICACIÓN DEL RIESGO (R) E ÍNDICE DE VULNERABILIDAD',
        tituloKey: 'inspection.sections.calificacionRiesgo',
        pagina: '27',
      },
      {
        ref: '16.4',
        titulo: 'MATRIZ DE CALOR DE RIESGOS',
        tituloKey: 'inspection.sections.matrizCalor',
        pagina: '28',
      },
    ],
  },
  {
    id: 'recomendaciones',
    ref: '17.',
    titulo: 'RECOMENDACIONES',
    tituloKey: 'inspection.sections.recomendaciones',
    pagina: '29',
    obligatoria: true,
  },
  {
    id: 'registroFotografico',
    ref: '18.',
    titulo: 'REGISTRO FOTOGRÁFICO',
    tituloKey: 'inspection.sections.registroFotografico',
    pagina: '30',
    obligatoria: true,
  },
];

function tituloSeccion(cfg, t) {
  if (typeof t === 'function' && cfg.tituloKey) {
    const translated = t(cfg.tituloKey);
    if (translated && translated !== cfg.tituloKey) return translated;
  }
  return cfg.titulo;
}

export function crearSeccionesActivasPorDefecto() {
  return Object.fromEntries(
    SECCIONES_INFORME_INSPECCION
      .filter((s) => s.seleccionable !== false)
      .map((s) => [s.id, true])
  );
}

export function normalizarSeccionesActivas(guardadas) {
  const base = crearSeccionesActivasPorDefecto();
  if (!guardadas || typeof guardadas !== 'object') return base;

  for (const seccion of SECCIONES_INFORME_INSPECCION) {
    if (seccion.seleccionable === false) continue;
    if (guardadas[seccion.id] !== undefined) {
      base[seccion.id] = Boolean(guardadas[seccion.id]);
    }
  }

  for (const seccion of SECCIONES_INFORME_INSPECCION) {
    if (seccion.obligatoria) base[seccion.id] = true;
  }

  return base;
}

export function estaSeccionInformeActiva(seccionesActivas, id) {
  const cfg = SECCIONES_INFORME_INSPECCION.find((s) => s.id === id);
  if (!cfg) return true;
  if (cfg.obligatoria || cfg.seleccionable === false) return true;
  return seccionesActivas?.[id] !== false;
}

/** Numeración dinámica según secciones activas (formulario + Word). */
export function construirNumeracionActiva(seccionesActivas, t) {
  const numeracion = new Map();
  let n = 0;

  for (const cfg of SECCIONES_INFORME_INSPECCION) {
    const titulo = tituloSeccion(cfg, t);

    if (cfg.id === 'informe') {
      numeracion.set('informe', {
        ref: cfg.ref,
        titulo,
        encabezado: `${cfg.ref} ${titulo}`.trim(),
      });
      continue;
    }

    if (!estaSeccionInformeActiva(seccionesActivas, cfg.id)) continue;

    if (cfg.id === 'pml') {
      const lucro = numeracion.get('lucroCesante');
      if (lucro?.numero != null) {
        numeracion.set('pml', {
          ref: `${lucro.numero}.1`,
          titulo,
          encabezado: `${lucro.numero}.1 ${titulo}`,
        });
      } else {
        n += 1;
        numeracion.set('pml', {
          ref: `${n}.`,
          titulo,
          encabezado: `${n}. ${titulo}`,
          numero: n,
        });
      }
      continue;
    }

    n += 1;
    const ref = `${n}.`;
    const entry = {
      ref,
      titulo,
      encabezado: `${ref} ${titulo}`,
      numero: n,
      subIndices: [],
    };

    if (cfg.subIndices?.length) {
      cfg.subIndices.forEach((sub, idx) => {
        const subTitulo = tituloSeccion(sub, t);
        entry.subIndices.push({
          ref: `${n}.${idx + 1}`,
          titulo: subTitulo,
          encabezado: `${n}.${idx + 1} ${subTitulo}`,
          pagina: sub.pagina,
        });
      });
    }

    numeracion.set(cfg.id, entry);
  }

  return numeracion;
}

/** Filas para la tabla de contenido (índice) en pantalla. */
export function obtenerFilasIndiceInforme(seccionesActivas, t) {
  const numeracion = construirNumeracionActiva(seccionesActivas, t);
  const filas = [];

  for (const seccion of SECCIONES_INFORME_INSPECCION) {
    const activa = estaSeccionInformeActiva(seccionesActivas, seccion.id);
    const num = numeracion.get(seccion.id);
    const titulo = tituloSeccion(seccion, t);

    filas.push({
      tipo: 'principal',
      id: seccion.id,
      ref: activa && num ? num.ref : '—',
      titulo,
      pagina: activa ? seccion.pagina : '',
      obligatoria: Boolean(seccion.obligatoria),
      seleccionable: seccion.seleccionable !== false && !seccion.obligatoria,
      activa,
    });

    if (seccion.subIndices?.length) {
      seccion.subIndices.forEach((sub, idx) => {
        const subNum = num?.subIndices?.[idx];
        filas.push({
          tipo: 'sub',
          parentId: seccion.id,
          ref: activa && subNum ? subNum.ref : '—',
          titulo: tituloSeccion(sub, t),
          pagina: activa ? sub.pagina : '',
          activa,
        });
      });
    }
  }

  return filas;
}

/** Filas del índice que irán al Word (solo secciones activas). */
export function obtenerFilasIndiceWord(seccionesActivas, t) {
  return obtenerFilasIndiceInforme(seccionesActivas, t).filter((fila) => {
    if (fila.tipo === 'principal') return fila.activa;
    return estaSeccionInformeActiva(seccionesActivas, fila.parentId);
  });
}
