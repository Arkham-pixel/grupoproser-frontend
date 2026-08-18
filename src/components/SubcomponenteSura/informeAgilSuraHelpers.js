import { TIPOS_INMUEBLE_CONTENIDOS_NSR10 } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import {
  calcularLiquidacionSura,
  defaultInformeUnicoSura,
  encabezadoDesdeCasoSura,
  formatearMonto,
  mapCasoSuraALiquidador,
} from './liquidadorSuraHelpers.js';

export const VALOR_OTROS_INFORME_AGIL = 'Otros';

export const OPCIONES_PAGO_INFORME_AGIL = ['Caja', 'Transferencia'];
export const OPCIONES_SI_NO_INFORME_AGIL = ['Sí', 'No'];
export const OPCIONES_ARTICULO_INFORME_AGIL = ['Edificio', 'Contenido', 'Edificio y contenido'];

const normTxt = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase();

export function esOpcionOtros(valor) {
  return /^OTROS?$/.test(normTxt(valor));
}

/** Ocupaciones ya usadas en Sura (NSR-10) + Otros. */
export const ACTIVIDADES_INFORME_AGIL = [
  ...TIPOS_INMUEBLE_CONTENIDOS_NSR10.filter((tipo) => !esOpcionOtros(tipo)),
  VALOR_OTROS_INFORME_AGIL,
];

const matchOpcion = (valor, opciones = []) => {
  const n = normTxt(valor);
  if (!n) return '';
  return opciones.find((op) => normTxt(op) === n) || '';
};

const matchArticulo = (valor) => {
  const n = normTxt(valor);
  if (!n) return '';
  const tieneEdificio = n.includes('EDIFICIO');
  const tieneContenido = n.includes('CONTENIDO');
  if (tieneEdificio && tieneContenido) return 'Edificio y contenido';
  if (tieneContenido) return 'Contenido';
  if (tieneEdificio) return 'Edificio';
  return matchOpcion(valor, OPCIONES_ARTICULO_INFORME_AGIL);
};

/** Texto que va al Excel: si eligió Otros, usa el texto libre. */
export function valorActividadInformeAgil(informe = {}) {
  if (esOpcionOtros(informe.actividad)) {
    const otro = String(informe.actividadOtro || '').trim();
    return otro || VALOR_OTROS_INFORME_AGIL;
  }
  return String(informe.actividad || '').trim();
}

export function normalizarCamposSelectInformeAgil(form = {}) {
  const next = { ...form };
  const pago = matchOpcion(form.pagoTransferenciaOCaja, OPCIONES_PAGO_INFORME_AGIL);
  if (pago) next.pagoTransferenciaOCaja = pago;
  const siNo = matchOpcion(form.cuentaEmbargada, OPCIONES_SI_NO_INFORME_AGIL);
  if (siNo) next.cuentaEmbargada = siNo;
  const articulo = matchArticulo(form.articulo);
  if (articulo) next.articulo = articulo;

  const act = String(form.actividad || '').trim();
  if (act) {
    const catalogoSinOtros = ACTIVIDADES_INFORME_AGIL.filter((op) => !esOpcionOtros(op));
    const match = matchOpcion(act, catalogoSinOtros);
    if (match) {
      next.actividad = match;
    } else if (esOpcionOtros(act)) {
      next.actividad = VALOR_OTROS_INFORME_AGIL;
    } else {
      next.actividad = VALOR_OTROS_INFORME_AGIL;
      next.actividadOtro = String(form.actividadOtro || act).trim();
    }
  }
  if (!esVacio(form.actividadOtro) && esVacio(next.actividadOtro)) {
    next.actividadOtro = form.actividadOtro;
  }
  return next;
}

const fechaInput = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const texto = (...vals) => {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s && s !== 'null' && s !== 'undefined') return s;
  }
  return '';
};

const vigenciaDesdeCaso = (caso = {}) => {
  const ini = fechaInput(caso.fechaInicioPoliza);
  const fin = fechaInput(caso.fechaFinPoliza);
  if (ini && fin) return `${ini} a ${fin}`;
  return ini || fin || '';
};

const lugarHechos = (caso = {}, enc = {}) => {
  const dir = texto(enc.direccion, caso.direccionPredio);
  const ciudad = texto(enc.ciudad, caso.ciudad, caso.ciudadSiniestro, caso.nombreCiudad);
  const depto = texto(enc.departamento, caso.departamento, caso.departamentoCiudad);
  return [dir, ciudad, depto].filter(Boolean).join(' / ');
};

const articuloDesdeCaso = (caso = {}) => {
  const inmueble = caso.valorAseguradoInmueble != null && caso.valorAseguradoInmueble !== '';
  const contenidos = caso.valorAseguradoContenidos != null && caso.valorAseguradoContenidos !== '';
  if (inmueble && contenidos) return 'Edificio y contenido';
  if (contenidos) return 'Contenido';
  if (inmueble) return 'Edificio';
  return matchArticulo(texto(caso.amprAfctdo, caso.cobertura));
};

const valorAseguradoDesdeCaso = (caso = {}) => {
  const a = Number(caso.valorAseguradoInmueble) || 0;
  const b = Number(caso.valorAseguradoContenidos) || 0;
  const total = a + b;
  if (total > 0) return formatearMonto(total);
  if (caso.valorAseguradoInmueble) return formatearMonto(caso.valorAseguradoInmueble);
  return '';
};

/** Campos del Formato Ágil (hoja InformeAgil), fila Excel = row. */
export const CAMPOS_INFORME_AGIL = [
  { key: 'siniestroNro', label: 'SINIESTRO NRO.', row: 3, tipo: 'text' },
  { key: 'tomador', label: 'TOMADOR', row: 4, tipo: 'text' },
  { key: 'nitTomador', label: 'NIT/CC.', row: 5, tipo: 'text' },
  { key: 'asegurado', label: 'ASEGURADO', row: 6, tipo: 'text' },
  { key: 'nitAsegurado', label: 'NIT/CC.', row: 7, tipo: 'text' },
  { key: 'correo', label: 'CORREO ELECTRÓNICO', row: 8, tipo: 'text' },
  { key: 'celular', label: 'CELULAR / TELÉFONO', row: 9, tipo: 'text' },
  {
    key: 'pagoTransferenciaOCaja',
    label: 'PAGO POR TRANSFERENCIA O CAJA',
    row: 10,
    tipo: 'select',
    opciones: OPCIONES_PAGO_INFORME_AGIL,
  },
  { key: 'cuentaBancaria', label: 'CUENTA BANCARIA', row: 11, tipo: 'text' },
  {
    key: 'cuentaEmbargada',
    label: 'CUENTA EMBARGADA?',
    row: 12,
    tipo: 'select',
    opciones: OPCIONES_SI_NO_INFORME_AGIL,
  },
  { key: 'siniestroAjustador', label: 'SINIESTRO AJUSTADOR (si aplica)', row: 13, tipo: 'text' },
  { key: 'poliza', label: 'PÓLIZA', row: 14, tipo: 'text' },
  { key: 'vigenciaPoliza', label: 'VIGENCIA DE LA PÓLIZA', row: 15, tipo: 'text' },
  { key: 'sucursal', label: 'SUCURSAL', row: 16, tipo: 'text' },
  { key: 'intermediario', label: 'INTERMEDIARIO', row: 17, tipo: 'text' },
  { key: 'coaseguro', label: 'COASEGURO', row: 18, tipo: 'text' },
  { key: 'fechaOcurrencia', label: 'FECHA OCURRENCIA SINIESTRO', row: 19, tipo: 'date' },
  { key: 'fechaAviso', label: 'FECHA AVISO SINIESTRO', row: 20, tipo: 'date' },
  { key: 'fechaAsignacion', label: 'FECHA ASIGNACIÓN SINIESTRO', row: 21, tipo: 'date' },
  { key: 'fechaAtencion', label: 'FECHA DE ATENCIÓN DEL SINIESTRO', row: 22, tipo: 'date' },
  { key: 'fechaCierreEnvio', label: 'FECHA DE CIERRE Y ENVÍO DE INFORME', row: 23, tipo: 'date' },
  { key: 'fechaUltimoDocumento', label: 'FECHA ÚLTIMO DOCUMENTO', row: 24, tipo: 'date' },
  { key: 'envioInformacionAnalista', label: 'ENVÍO INFORMACIÓN POR ANALISTA', row: 25, tipo: 'text' },
  { key: 'lugarHechos', label: 'LUGAR DE LOS HECHOS (dirección/ciudad)', row: 26, tipo: 'textarea' },
  {
    key: 'actividad',
    label: 'ACTIVIDAD',
    row: 27,
    tipo: 'select',
    opciones: ACTIVIDADES_INFORME_AGIL,
    conOtros: true,
  },
  { key: 'causaSiniestro', label: 'CAUSA DEL SINIESTRO', row: 28, tipo: 'textarea' },
  { key: 'conceptoPerdida', label: 'CONCEPTO DE LA PÉRDIDA', row: 29, tipo: 'textarea' },
  { key: 'amparoAfectado', label: 'AMPARO AFECTADO', row: 30, tipo: 'text' },
  {
    key: 'articulo',
    label: 'ARTÍCULO (EDIFICIO, CONTENIDOS)',
    row: 31,
    tipo: 'select',
    opciones: OPCIONES_ARTICULO_INFORME_AGIL,
  },
  { key: 'valorReclamado', label: 'VALOR RECLAMADO', row: 32, tipo: 'text' },
  { key: 'valorAsegurado', label: 'VALOR ASEGURADO', row: 33, tipo: 'text' },
  { key: 'solicitudDocumentos', label: 'SOLICITUD DOCUMENTOS (SI APLICA)', row: 34, tipo: 'textarea' },
  { key: 'valorSugeridoIndemnizar', label: 'VALOR SUGERIDO INDEMNIZAR', row: 35, tipo: 'text' },
  { key: 'deducibleAplicar', label: 'DEDUCIBLE A APLICAR', row: 36, tipo: 'text' },
  { key: 'valorSugeridoLuegoDeducible', label: 'VALOR SUGERIDO LUEGO DE DEDUCIBLE', row: 37, tipo: 'text' },
  { key: 'auxilioInterrupcion', label: 'AUXILIO POR INTERRUPCIÓN (Si aplica)', row: 38, tipo: 'text' },
  { key: 'valorFinalEstimadoPerdida', label: 'VALOR FINAL ESTIMADO DE LA PÉRDIDA', row: 39, tipo: 'text' },
  { key: 'salvamento', label: 'SALVAMENTO', row: 40, tipo: 'text' },
  { key: 'subrogacion', label: 'SUBROGACIÓN', row: 41, tipo: 'text' },
  { key: 'analista', label: 'ANALISTA', row: 42, tipo: 'text' },
];

export function defaultSalvamentoSura(caso = {}) {
  const guardado = caso.salvamento && typeof caso.salvamento === 'object' ? caso.salvamento : {};
  return {
    aplica: guardado.aplica || 'no_aplica',
    descripcion: guardado.descripcion || '',
    cantidad: guardado.cantidad || '',
    pesoAproximado: guardado.pesoAproximado || '',
    ubicacionFisica: guardado.ubicacionFisica || '',
    contactoRecoleccion: guardado.contactoRecoleccion || '',
    aseguradoOferta: guardado.aseguradoOferta || '',
    requiereNacionalizacion: guardado.requiereNacionalizacion || '',
    condicionesEspeciales: guardado.condicionesEspeciales || '',
    fotos: Array.isArray(guardado.fotos) ? guardado.fotos : [],
  };
}

export function computarInformeAgilDesdeCaso({
  caso = {},
  liquidador = null,
  totales = null,
  salvamento = null,
} = {}) {
  const casoSafe = caso && typeof caso === 'object' ? caso : {};
  const enc = encabezadoDesdeCasoSura(casoSafe);
  const liq = liquidador || mapCasoSuraALiquidador(casoSafe);
  const tot = totales || calcularLiquidacionSura(liq);
  const sal = salvamento || defaultSalvamentoSura(casoSafe);
  const ident = texto(enc.identificacion, casoSafe.identificacion, casoSafe.numDocumento);
  const valorSug = tot.totalIndemnizar ? formatearMonto(tot.totalIndemnizar) : '';
  const hospedaje = tot.diagrama?.gastosHospedaje
    ? formatearMonto(tot.diagrama.gastosHospedaje)
    : '';
  const salvamentoTxt =
    sal.aplica === 'aplica'
      ? texto(sal.descripcion, 'Aplica')
      : sal.aplica === 'no_aplica'
        ? 'No aplica'
        : '';

  return {
    siniestroNro: texto(enc.siniestro, casoSafe.siniestro, casoSafe.nmroSinstro),
    tomador: texto(enc.tomador, casoSafe.tomador),
    nitTomador: '',
    asegurado: texto(enc.asegurado, casoSafe.asegurado, casoSafe.asgrBenfcro),
    nitAsegurado: ident,
    correo: texto(casoSafe.correo, enc.correo),
    celular: texto(casoSafe.celular, enc.celular),
    pagoTransferenciaOCaja: '',
    cuentaBancaria: '',
    cuentaEmbargada: '',
    siniestroAjustador: texto(enc.consecutivo, casoSafe.nmroAjste, casoSafe.consecutivo),
    poliza: texto(enc.poliza, casoSafe.numeroPoliza, casoSafe.nmroPolza),
    vigenciaPoliza: vigenciaDesdeCaso(casoSafe),
    sucursal: texto(enc.ciudad, casoSafe.ciudad, casoSafe.ciudadSiniestro),
    intermediario: texto(casoSafe.nombIntermediario, casoSafe.intermediario),
    coaseguro: '',
    fechaOcurrencia: fechaInput(casoSafe.fechaSiniestro || casoSafe.fchaSinstro || enc.fechaSiniestro),
    fechaAviso: '',
    fechaAsignacion: fechaInput(casoSafe.fchaAsgncion),
    fechaAtencion: fechaInput(casoSafe.fechaInspeccion || casoSafe.fchaInspccion),
    fechaCierreEnvio: fechaInput(
      casoSafe.fechaEnvioAseguradora || casoSafe.fechaLiquidado || casoSafe.informeUnico?.fechaInforme
    ),
    fechaUltimoDocumento: fechaInput(casoSafe.fechaUltimoDocumento),
    envioInformacionAnalista: '',
    lugarHechos: lugarHechos(casoSafe, enc),
    actividad: '',
    causaSiniestro: texto(casoSafe.causa_siniestro, casoSafe.cobertura, enc.evento, 'TERREMOTO'),
    conceptoPerdida: texto(casoSafe.descSinstro, casoSafe.informeUnico?.descripcionDanios),
    amparoAfectado: texto(casoSafe.amprAfctdo, casoSafe.cobertura, enc.cobertura),
    articulo: articuloDesdeCaso(casoSafe),
    valorReclamado:
      casoSafe.valorReclamado != null && casoSafe.valorReclamado !== ''
        ? formatearMonto(casoSafe.valorReclamado)
        : tot.totalReclamado
          ? formatearMonto(tot.totalReclamado)
          : '',
    valorAsegurado: valorAseguradoDesdeCaso(casoSafe),
    solicitudDocumentos: '',
    valorSugeridoIndemnizar: valorSug,
    deducibleAplicar: texto(tot.deducibleTexto, tot.diagrama?.deducible, 'No aplica'),
    valorSugeridoLuegoDeducible: valorSug,
    auxilioInterrupcion: hospedaje,
    valorFinalEstimadoPerdida: tot.totalDanios ? formatearMonto(tot.totalDanios) : '',
    salvamento: salvamentoTxt,
    subrogacion: '',
    analista: texto(
      casoSafe.funcAsgrdraNombre,
      casoSafe.ajustador,
      enc.ajustador,
      casoSafe.informeUnico?.ajustadorNombre
    ),
  };
}

function esVacio(valor) {
  return valor == null || String(valor).trim() === '';
}

/** Prefill desde el caso; lo ya guardado en informeAgil gana si tiene valor. */
export function defaultInformeAgilSura(opts = {}) {
  const computed = computarInformeAgilDesdeCaso(opts);
  const guardado =
    opts.caso?.informeAgil && typeof opts.caso.informeAgil === 'object' ? opts.caso.informeAgil : {};
  const merged = { ...computed };
  for (const campo of CAMPOS_INFORME_AGIL) {
    if (!esVacio(guardado[campo.key])) merged[campo.key] = guardado[campo.key];
  }
  if (!esVacio(guardado.actividadOtro)) merged.actividadOtro = guardado.actividadOtro;
  return normalizarCamposSelectInformeAgil(merged);
}

export function fusionarVaciosInformeAgil(actual = {}, computed = {}) {
  const next = { ...actual };
  for (const campo of CAMPOS_INFORME_AGIL) {
    if (esVacio(next[campo.key]) && !esVacio(computed[campo.key])) {
      next[campo.key] = computed[campo.key];
    }
  }
  if (esVacio(next.actividadOtro) && !esVacio(computed.actividadOtro)) {
    next.actividadOtro = computed.actividadOtro;
  }
  return normalizarCamposSelectInformeAgil(next);
}

export function fotosNsrDesdeLiquidador(liquidador = {}) {
  const items = liquidador?.evaluacionSismicaNSR10?.items;
  if (!Array.isArray(items)) return [];
  return items
    .map((it, index) => ({ ...it, _indexNsr: index }))
    .filter((it) => it?.fotoArchivoId || it?.fotoRuta || it?.fotoPreview);
}

/** Convierte ítems NSR con foto al formato de galería de la pestaña Fotos. */
export function fotosAgilDesdeNsr(liquidador = {}) {
  return fotosNsrDesdeLiquidador(liquidador).map((it) => ({
    _id: it.fotoArchivoId || undefined,
    ruta: it.fotoRuta || '',
    preview: it.fotoPreview || '',
    nombre: it.fotoRef || it.elemento || it.codigo || 'Foto',
    nombreOriginal: it.fotoRef || '',
    descripcion: [it.codigo, it.elemento].filter(Boolean).join(' — ') || it.fotoRef || '',
    origen: 'liquidador-nsr10',
    codigoNsr: it.codigo || '',
  }));
}

/**
 * Fotos de la pestaña 3 del formato ágil.
 * Si el caso ya tiene `fotosAgil` (aunque esté vacío), se respeta.
 * Si no, se migran las fotos NSR-10 históricas.
 */
export function defaultFotosAgilSura(caso = {}, liquidador = null) {
  if (Array.isArray(caso?.fotosAgil)) return caso.fotosAgil;
  return fotosAgilDesdeNsr(liquidador || caso?.liquidador || {});
}

/** Quita File/blob antes de persistir el caso. */
export function serializarFotosAgilSura(fotos = []) {
  return (Array.isArray(fotos) ? fotos : [])
    .map((f) => ({
      _id: f?._id || undefined,
      ruta: f?.ruta || f?.fotoRuta || '',
      nombre: f?.nombre || f?.nombreOriginal || '',
      nombreOriginal: f?.nombreOriginal || f?.nombre || '',
      descripcion: f?.descripcion || '',
      tipoMime: f?.tipoMime || '',
      origen: f?.origen || 'fotos-agil',
      codigoNsr: f?.codigoNsr || '',
    }))
    .filter((f) => f._id || f.ruta);
}

/**
 * Fusiona la galería de la pestaña Fotos en informeUnico.fotosInspeccion
 * sin borrar las subidas a mano en Documentos.
 */
export function fusionarFotosAgilEnInforme(fotosInforme = [], fotosAgil = []) {
  const desdeAgil = serializarFotosAgilSura(fotosAgil).map((f) => ({
    ...f,
    origen: f.origen === 'liquidador-nsr10' ? 'liquidador-nsr10' : 'fotos-agil',
  }));
  const idsAgil = new Set(desdeAgil.map((f) => String(f._id || '')).filter(Boolean));
  const rutasAgil = new Set(desdeAgil.map((f) => String(f.ruta || '')).filter(Boolean));

  const base = (Array.isArray(fotosInforme) ? fotosInforme : []).filter((f) => {
    if (f?.origen === 'fotos-agil' || f?.origen === 'liquidador-nsr10') {
      const id = String(f._id || '');
      const ruta = String(f.ruta || '');
      if (id && idsAgil.has(id)) return false;
      if (!id && ruta && rutasAgil.has(ruta)) return false;
      if (f?.origen === 'fotos-agil') return false;
    }
    return true;
  });

  const sinDup = base.filter((f) => {
    if (f?._id && idsAgil.has(String(f._id))) return false;
    if (f?.ruta && rutasAgil.has(String(f.ruta))) return false;
    return true;
  });

  return [...sinDup, ...desdeAgil];
}

/** Informe único con las fotos de la pestaña 3 ya mezcladas. */
export function informeUnicoConFotosAgil(caso = {}) {
  const informe = defaultInformeUnicoSura(caso);
  return {
    ...informe,
    fotosInspeccion: fusionarFotosAgilEnInforme(
      informe.fotosInspeccion,
      Array.isArray(caso.fotosAgil) ? caso.fotosAgil : []
    ),
  };
}

export function filasPresupuestoDesdeLiquidador(liquidador = {}) {
  const items = liquidador?.evaluacionSismicaNSR10?.presupuesto?.items;
  if (!Array.isArray(items)) return [];
  return items.filter((it) => String(it?.actividad || it?.componente || '').trim());
}
