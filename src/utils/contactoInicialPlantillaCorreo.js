import {
  idsDocumentosPorDefecto,
  NOTAS_GENERALES_SOLICITUD,
  detectarRamoContactoInicial,
  documentosSeleccionadosOrdenados,
  documentosSugeridosPorRamo,
} from '../config/contactoInicialDocumentosPorRamo.js';

const FIRMA_AJUSTADORA = 'PROSER AJUSTES S.A.S.';

function formatearFechasInspeccion(opcionesInspeccion = [], { html = false } = {}) {
  const fechasOpciones = (opcionesInspeccion.length ? opcionesInspeccion : [{ fecha: '', hora: '' }]).slice(
    0,
    3
  );
  const lineas = fechasOpciones
    .filter((op) => String(op?.fecha || '').trim())
    .map((op) => formatearFechaHoraOpcion(op.fecha, op.hora));

  if (!lineas.length) {
    const placeholders = [
      '[Fecha opción 1] – [Hora]',
      '[Fecha opción 2] – [Hora]',
      '[Fecha opción 3] – [Hora]',
    ];
    return html ? placeholders.map((l) => escapeHtml(l)).join('<br>') : placeholders.join('\n');
  }

  return html ? lineas.map((l) => escapeHtml(l)).join('<br>') : lineas.join('\n');
}

function formatearFechaHoraOpcion(fecha, hora) {
  if (!fecha) return '';
  const partes = fecha.split('-');
  if (partes.length === 3) {
    const [y, m, d] = partes;
    const fechaTxt = `${d}/${m}/${y}`;
    return hora ? `${fechaTxt} – ${hora}` : fechaTxt;
  }
  return hora ? `${fecha} – ${hora}` : fecha;
}

function ordenarIdsDocumentos(documentosSeleccionados) {
  if (Array.isArray(documentosSeleccionados)) {
    return [...documentosSeleccionados].filter(Boolean).sort();
  }
  if (documentosSeleccionados instanceof Set) {
    return Array.from(documentosSeleccionados).sort();
  }
  return [];
}

function formatearItemDocumento(d) {
  if (typeof d === 'string') return `• ${d}`;
  const prefijo = d.numero ? `${d.numero}. ` : '• ';
  return `${prefijo}${d.label}`;
}

function listaDocumentos(items) {
  if (!items?.length) {
    return '• (Seleccione los documentos requeridos en la plataforma)';
  }
  return items.map(formatearItemDocumento).join('\n');
}

function listaDocumentosHtml(items) {
  if (!items?.length) {
    return '• (Seleccione los documentos requeridos en la plataforma)';
  }
  return items
    .map((d) => {
      const texto = typeof d === 'string' ? d : d.label;
      const prefijo = typeof d === 'string' || !d.numero ? '• ' : `${d.numero}. `;
      return `${prefijo}${escapeHtml(texto)}`;
    })
    .join('<br>');
}

function escapeHtml(texto = '') {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function negritaHtml(texto = '') {
  return `<strong>${escapeHtml(texto)}</strong>`;
}

function introDocumentos({ preambuloRamo = '', html = false } = {}) {
  if (!preambuloRamo?.trim()) return '';
  return html ? escapeHtml(preambuloRamo) : preambuloRamo;
}

function bloqueIntroDocumentos(intro, docs, notas = '') {
  const bloques = [intro, docs, notas].filter(Boolean);
  return bloques.join('\n\n');
}

function limpiarTextoAsunto(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto || texto === '—') return '';
  return texto;
}

/**
 * Asunto sugerido para el correo de contacto inicial.
 */
export function generarAsuntoContactoInicial({
  numeroSiniestro = '',
  numeroPoliza = '',
  nombreAsegurado = '',
  nombreAseguradora = '',
}) {
  const partes = [];
  const sin = limpiarTextoAsunto(numeroSiniestro);
  const pol = limpiarTextoAsunto(numeroPoliza);
  const aseg = limpiarTextoAsunto(nombreAsegurado);
  const comp = limpiarTextoAsunto(nombreAseguradora);

  if (sin) partes.push(`Siniestro ${sin}`);
  if (pol) partes.push(`Póliza ${pol}`);
  if (aseg) partes.push(aseg);
  if (comp) partes.push(comp);

  return partes.length
    ? partes.join(' | ')
    : 'Contacto inicial — PROSER AJUSTES S.A.S.';
}

export function generarPlantillaContactoInicial({
  nombreDestinatario = '',
  tipoDestinatario = 'intermediario',
  numeroSiniestro = '',
  numeroAjuste = '',
  opcionesInspeccion = [],
  documentosSeleccionados = [],
  nombreAjustador = '',
  preambuloRamo = '',
  incluirNotasGenerales = false,
}) {
  const saludoNombre =
    nombreDestinatario?.trim() ||
    (tipoDestinatario === 'asegurado'
      ? 'asegurado(a)'
      : tipoDestinatario === 'reclamante'
        ? 'reclamante'
        : 'intermediario(a)');

  const referencia =
    numeroSiniestro && numeroSiniestro !== '—'
      ? `siniestro No. ${numeroSiniestro}${numeroAjuste ? ` (ajuste ${numeroAjuste})` : ''}`
      : numeroAjuste
        ? `caso de ajuste No. ${numeroAjuste}`
        : 'siniestro en referencia';

  const fechasTexto = formatearFechasInspeccion(opcionesInspeccion);

  const docs = listaDocumentos(documentosSeleccionados);
  const firmaAjustador = nombreAjustador?.trim() || '[Nombre del ajustador]';
  const intro = introDocumentos({ preambuloRamo });
  const notas =
    incluirNotasGenerales
      ? `${NOTAS_GENERALES_SOLICITUD.nota1}\n\n${NOTAS_GENERALES_SOLICITUD.nota2}`
      : '';
  const solicitudDocumentos = bloqueIntroDocumentos(intro, docs, notas);

  return `Cordial saludo, estimado(a) ${saludoNombre}:

Por medio del presente correo nos permitimos presentarnos como ${FIRMA_AJUSTADORA}, firma ajustadora designada por la compañía de seguros para llevar a cabo el proceso de ajuste correspondiente al ${referencia}.

Con el fin de dar continuidad a la atención del caso, agradecemos nos confirme su disponibilidad para realizar la inspección del riesgo afectado en alguna de las siguientes fechas propuestas:

${fechasTexto}

${solicitudDocumentos}

Agradecemos su amable colaboración y quedamos atentos a la confirmación de la fecha de inspección, así como al envío de la documentación solicitada.

Cordialmente,
${firmaAjustador}
${FIRMA_AJUSTADORA}`;
}

/** Versión HTML para copiar en Outlook conservando negrillas del protocolo. */
export function generarPlantillaContactoInicialHtml({
  nombreDestinatario = '',
  tipoDestinatario = 'intermediario',
  numeroSiniestro = '',
  numeroAjuste = '',
  opcionesInspeccion = [],
  documentosSeleccionados = [],
  nombreAjustador = '',
  preambuloRamo = '',
  incluirNotasGenerales = false,
}) {
  const saludoNombre =
    nombreDestinatario?.trim() ||
    (tipoDestinatario === 'asegurado'
      ? 'asegurado(a)'
      : tipoDestinatario === 'reclamante'
        ? 'reclamante'
        : 'intermediario(a)');

  const referencia =
    numeroSiniestro && numeroSiniestro !== '—'
      ? `siniestro No. ${escapeHtml(numeroSiniestro)}${numeroAjuste ? ` (ajuste ${escapeHtml(numeroAjuste)})` : ''}`
      : numeroAjuste
        ? `caso de ajuste No. ${escapeHtml(numeroAjuste)}`
        : 'siniestro en referencia';

  const fechasTexto = formatearFechasInspeccion(opcionesInspeccion, { html: true });

  const docs = listaDocumentosHtml(documentosSeleccionados);
  const firmaAjustador = escapeHtml(nombreAjustador?.trim() || '[Nombre del ajustador]');
  const intro = introDocumentos({ preambuloRamo, html: true });

  const notas =
    incluirNotasGenerales
      ? `<br><br>${escapeHtml(NOTAS_GENERALES_SOLICITUD.nota1)}<br><br>${escapeHtml(NOTAS_GENERALES_SOLICITUD.nota2)}`
      : '';

  const parrafoIntro = intro ? `<p>${intro}</p>` : '';
  const parrafoDocumentos = docs || notas ? `<p>${docs}${notas}</p>` : '';

  return `<div style="font-family: Calibri, Arial, sans-serif; font-size: 11pt;">
<p>Cordial saludo, estimado(a) ${escapeHtml(saludoNombre)}:</p>
<p>Por medio del presente correo nos permitimos presentarnos como ${negritaHtml(FIRMA_AJUSTADORA)}, ${negritaHtml('firma ajustadora designada')} por la compañía de seguros para llevar a cabo el proceso de ajuste correspondiente al ${referencia}.</p>
<p>Con el fin de dar continuidad a la atención del caso, agradecemos nos confirme su disponibilidad para realizar la inspección del riesgo afectado en alguna de las siguientes fechas propuestas:</p>
<p>${fechasTexto}</p>
${parrafoIntro}
${parrafoDocumentos}
<p>Agradecemos su amable colaboración y quedamos atentos a la confirmación de la fecha de inspección, así como al envío de la documentación solicitada.</p>
<p>Cordialmente,<br>${firmaAjustador}<br>${negritaHtml(FIRMA_AJUSTADORA)}</p>
</div>`;
}

export function opcionesInspeccionVacias() {
  return [
    { fecha: '', hora: '' },
    { fecha: '', hora: '' },
    { fecha: '', hora: '' },
  ];
}

/** Estado por defecto cuando el caso no tiene plantilla guardada. */
export function estadoInicialPlantillaContacto(ramoDetectado = 'general') {
  return {
    tipoDestinatario: 'intermediario',
    ramoManual: ramoDetectado,
    opcionesInspeccion: opcionesInspeccionVacias(),
    documentosSeleccionados: idsDocumentosPorDefecto(ramoDetectado),
    textoGenerado: '',
  };
}

/** Restaura el objeto guardado en BD al estado del componente. */
export function normalizarPlantillaContactoInicial(guardada, ramoDetectado = 'general') {
  const base = estadoInicialPlantillaContacto(ramoDetectado);
  if (!guardada || typeof guardada !== 'object') return base;

  const opciones = Array.isArray(guardada.opcionesInspeccion)
    ? guardada.opcionesInspeccion.slice(0, 3).map((op) => ({
        fecha: op?.fecha ? String(op.fecha).slice(0, 10) : '',
        hora: op?.hora ? String(op.hora).slice(0, 5) : '',
      }))
    : base.opcionesInspeccion;

  while (opciones.length < 3) {
    opciones.push({ fecha: '', hora: '' });
  }

  const docs = Array.isArray(guardada.documentosSeleccionados)
    ? guardada.documentosSeleccionados.filter(Boolean)
    : base.documentosSeleccionados;

  return {
    tipoDestinatario: guardada.tipoDestinatario || base.tipoDestinatario,
    ramoManual: guardada.ramoManual || ramoDetectado || base.ramoManual,
    opcionesInspeccion: opciones,
    documentosSeleccionados: docs.length ? docs : base.documentosSeleccionados,
    textoGenerado: guardada.textoGenerado || '',
  };
}

/** Campos editables de la plantilla (sin texto generado ni metadatos). */
export function firmaEstadoPlantillaContactoInicial({
  tipoDestinatario,
  ramoManual,
  opcionesInspeccion,
  documentosSeleccionados,
}) {
  const docs = ordenarIdsDocumentos(documentosSeleccionados);

  return JSON.stringify({
    tipoDestinatario: tipoDestinatario || 'intermediario',
    ramoManual: ramoManual || 'general',
    opcionesInspeccion: (opcionesInspeccion || opcionesInspeccionVacias()).slice(0, 3).map((op) => ({
      fecha: op?.fecha ? String(op.fecha).slice(0, 10) : '',
      hora: op?.hora ? String(op.hora).slice(0, 5) : '',
    })),
    documentosSeleccionados: docs,
  });
}

/** Firma estable para evitar bucles al sincronizar texto/asunto generados. */
export function firmaContenidoPlantillaContactoInicial({ textoGenerado = '', asuntoGenerado = '' } = {}) {
  return JSON.stringify({
    textoGenerado: textoGenerado || '',
    asuntoGenerado: asuntoGenerado || '',
  });
}

/** Serializa el estado del componente para guardar en MongoDB. */
export function serializarPlantillaContactoInicial({
  tipoDestinatario,
  ramoManual,
  opcionesInspeccion,
  documentosSeleccionados,
  textoGenerado,
  asuntoGenerado,
  actualizadoEn,
}) {
  const docs = ordenarIdsDocumentos(documentosSeleccionados);

  const payload = {
    tipoDestinatario: tipoDestinatario || 'intermediario',
    ramoManual: ramoManual || 'general',
    opcionesInspeccion: (opcionesInspeccion || opcionesInspeccionVacias()).slice(0, 3).map((op) => ({
      fecha: op?.fecha ? String(op.fecha).slice(0, 10) : '',
      hora: op?.hora ? String(op.hora).slice(0, 5) : '',
    })),
    documentosSeleccionados: docs,
    textoGenerado: textoGenerado || '',
    asuntoGenerado: asuntoGenerado || '',
  };

  if (actualizadoEn) {
    payload.actualizadoEn = actualizadoEn;
  }

  return payload;
}

function resolverNombreDestinatarioPlantilla(tipoDestinatario, formData = {}) {
  if (tipoDestinatario === 'asegurado') return formData.asgrBenfcro || '';
  if (tipoDestinatario === 'reclamante') {
    return formData.asgrBenfcro || formData.nombIntermediario || '';
  }
  return formData.nombIntermediario || '';
}

/** Genera asunto y cuerpo al guardar el caso (no en cada render). */
export function enriquecerPlantillaContactoInicial(
  plantillaEstado,
  formData = {},
  nombreAjustador = ''
) {
  if (!plantillaEstado || typeof plantillaEstado !== 'object') return plantillaEstado;

  const ramoManual =
    plantillaEstado.ramoManual ||
    detectarRamoContactoInicial(formData.tipoPoliza, formData.amprAfctdo);
  const docsRamo = documentosSugeridosPorRamo(ramoManual);
  const tipoDestinatario = plantillaEstado.tipoDestinatario || 'intermediario';
  const documentosSeleccionados = documentosSeleccionadosOrdenados(
    ramoManual,
    plantillaEstado.documentosSeleccionados || []
  );

  const textoGenerado = generarPlantillaContactoInicial({
    nombreDestinatario: resolverNombreDestinatarioPlantilla(tipoDestinatario, formData),
    tipoDestinatario,
    numeroSiniestro: formData.nmroSinstro,
    numeroAjuste: formData.nmroAjste,
    opcionesInspeccion: plantillaEstado.opcionesInspeccion,
    documentosSeleccionados,
    nombreAjustador,
    preambuloRamo: docsRamo.preambuloRamo,
    incluirNotasGenerales: docsRamo.incluirNotasGenerales,
  });

  const asuntoGenerado = generarAsuntoContactoInicial({
    numeroSiniestro: formData.nmroSinstro,
    numeroPoliza: formData.nmroPolza,
    nombreAsegurado: formData.asgrBenfcro,
    nombreAseguradora: formData.nombreCliente || formData.codiAsgrdra,
  });

  return {
    ...plantillaEstado,
    ramoManual,
    textoGenerado,
    asuntoGenerado,
  };
}
