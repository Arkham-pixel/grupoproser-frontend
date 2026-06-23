/** Secciones del informe de inspección de riesgo (formulario + Word). */
export const SECCIONES_INFORME_INSPECCION = [
  {
    id: 'informe',
    ref: '0.',
    titulo: 'INFORME DE INSPECCIÓN',
    pagina: '2',
    obligatoria: true,
    seleccionable: false,
  },
  {
    id: 'informacionGeneral',
    ref: '1.',
    titulo: 'INFORMACIÓN GENERAL',
    pagina: '8',
    obligatoria: true,
  },
  {
    id: 'descripcionEmpresa',
    ref: '2.',
    titulo: 'DESCRIPCIÓN GENERAL DE LA EMPRESA',
    pagina: '9',
  },
  {
    id: 'infraestructura',
    ref: '3.',
    titulo: 'INFRAESTRUCTURA',
    pagina: '10',
  },
  {
    id: 'procesos',
    ref: '4.',
    titulo: 'PROCESOS',
    pagina: '11',
  },
  {
    id: 'linderos',
    ref: '5.',
    titulo: 'LINDEROS',
    pagina: '12',
    subIndices: [{ ref: '5.1', titulo: 'MAPA DE UBICACIÓN', pagina: '13' }],
  },
  {
    id: 'sustraccion',
    ref: '6.',
    titulo: 'SUSTRACCIÓN - PROTECCIONES FÍSICAS',
    pagina: '14',
  },
  {
    id: 'caracteristicasAmbientales',
    ref: '7.',
    titulo: 'CARACTERÍSTICAS OPERATIVAS AMBIENTALES',
    pagina: '15',
  },
  {
    id: 'proteccionIncendios',
    ref: '8.',
    titulo: 'PROTECCIÓN Y PREVENCIÓN CONTRA INCENDIOS',
    pagina: '16',
  },
  {
    id: 'lucroCesante',
    ref: '9.',
    titulo: 'LUCRO CESANTE',
    pagina: '17',
  },
  {
    id: 'pml',
    ref: '9.1',
    titulo: 'PML (PÉRDIDA MÁXIMA PROBABLE)',
    pagina: '18',
  },
  {
    id: 'procesosCriticos',
    ref: '10.',
    titulo: 'PROCESOS CRÍTICOS Y RIESGOS MEDIOAMBIENTALES',
    pagina: '19',
  },
  {
    id: 'roturaMaquinaria',
    ref: '11.',
    titulo: 'POR ROTURA DE MAQUINARIA',
    pagina: '20',
  },
  {
    id: 'maquinaria',
    ref: '12.',
    titulo: 'MAQUINARIA, EQUIPOS Y MANTENIMIENTO',
    pagina: '21',
  },
  {
    id: 'serviciosIndustriales',
    ref: '13.',
    titulo: 'SERVICIOS INDUSTRIALES',
    pagina: '22',
  },
  {
    id: 'siniestralidad',
    ref: '14.',
    titulo: 'SINIESTRALIDAD',
    pagina: '23',
  },
  {
    id: 'almacenamiento',
    ref: '15.',
    titulo: 'ALMACENAMIENTO',
    pagina: '24',
  },
  {
    id: 'analisisRiesgos',
    ref: '16.',
    titulo: 'ANÁLISIS Y CLASIFICACIÓN DE RIESGOS',
    pagina: '25',
    subIndices: [
      { ref: '16.1', titulo: 'ANÁLISIS DE RIESGOS', pagina: '25' },
      { ref: '16.2', titulo: 'CLASIFICACIÓN DE RIESGOS', pagina: '26' },
      { ref: '16.3', titulo: 'CALIFICACIÓN DEL RIESGO (R) E ÍNDICE DE VULNERABILIDAD', pagina: '27' },
      { ref: '16.4', titulo: 'MATRIZ DE CALOR DE RIESGOS', pagina: '28' },
    ],
  },
  {
    id: 'recomendaciones',
    ref: '17.',
    titulo: 'RECOMENDACIONES',
    pagina: '29',
    obligatoria: true,
  },
  {
    id: 'registroFotografico',
    ref: '18.',
    titulo: 'REGISTRO FOTOGRÁFICO',
    pagina: '30',
    obligatoria: true,
  },
];

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

/** Filas para la tabla de contenido (índice) en pantalla. */
export function obtenerFilasIndiceInforme(seccionesActivas) {
  const filas = [];
  for (const seccion of SECCIONES_INFORME_INSPECCION) {
    filas.push({
      tipo: 'principal',
      id: seccion.id,
      ref: seccion.ref,
      titulo: seccion.titulo,
      pagina: seccion.pagina,
      obligatoria: Boolean(seccion.obligatoria),
      seleccionable: seccion.seleccionable !== false && !seccion.obligatoria,
      activa: estaSeccionInformeActiva(seccionesActivas, seccion.id),
    });
    if (seccion.subIndices?.length) {
      for (const sub of seccion.subIndices) {
        filas.push({
          tipo: 'sub',
          parentId: seccion.id,
          ref: sub.ref,
          titulo: sub.titulo,
          pagina: sub.pagina,
          activa: estaSeccionInformeActiva(seccionesActivas, seccion.id),
        });
      }
    }
  }
  return filas;
}

/** Filas del índice que irán al Word (solo secciones activas). */
export function obtenerFilasIndiceWord(seccionesActivas) {
  return obtenerFilasIndiceInforme(seccionesActivas).filter((fila) => {
    if (fila.tipo === 'principal') return fila.activa;
    return estaSeccionInformeActiva(seccionesActivas, fila.parentId);
  });
}
