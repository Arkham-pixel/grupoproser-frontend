import {
  calcularLiquidacionSura,
  encabezadoDesdeCasoSura,
  formatearMonto,
  mapCasoSuraALiquidador,
} from './liquidadorSuraHelpers.js';

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
  if (inmueble && contenidos) return 'EDIFICIO, CONTENIDOS';
  if (contenidos) return 'CONTENIDOS';
  if (inmueble) return 'EDIFICIO';
  return texto(caso.amprAfctdo, caso.cobertura);
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
  { key: 'pagoTransferenciaOCaja', label: 'PAGO POR TRANSFERENCIA O CAJA', row: 8, tipo: 'text' },
  { key: 'cuentaBancaria', label: 'CUENTA BANCARIA', row: 9, tipo: 'text' },
  { key: 'cuentaEmbargada', label: 'CUENTA EMBARGADA?', row: 10, tipo: 'text' },
  { key: 'siniestroAjustador', label: 'SINIESTRO AJUSTADOR (si aplica)', row: 11, tipo: 'text' },
  { key: 'poliza', label: 'PÓLIZA', row: 12, tipo: 'text' },
  { key: 'vigenciaPoliza', label: 'VIGENCIA DE LA PÓLIZA', row: 13, tipo: 'text' },
  { key: 'sucursal', label: 'SUCURSAL', row: 14, tipo: 'text' },
  { key: 'intermediario', label: 'INTERMEDIARIO', row: 15, tipo: 'text' },
  { key: 'coaseguro', label: 'COASEGURO', row: 16, tipo: 'text' },
  { key: 'fechaOcurrencia', label: 'FECHA OCURRENCIA SINIESTRO', row: 17, tipo: 'date' },
  { key: 'fechaAviso', label: 'FECHA AVISO SINIESTRO', row: 18, tipo: 'date' },
  { key: 'fechaAsignacion', label: 'FECHA ASIGNACIÓN SINIESTRO', row: 19, tipo: 'date' },
  { key: 'fechaAtencion', label: 'FECHA DE ATENCIÓN DEL SINIESTRO', row: 20, tipo: 'date' },
  { key: 'fechaCierreEnvio', label: 'FECHA DE CIERRE Y ENVÍO DE INFORME', row: 21, tipo: 'date' },
  { key: 'fechaUltimoDocumento', label: 'FECHA ÚLTIMO DOCUMENTO', row: 22, tipo: 'date' },
  { key: 'envioInformacionAnalista', label: 'ENVÍO INFORMACIÓN POR ANALISTA', row: 23, tipo: 'text' },
  { key: 'lugarHechos', label: 'LUGAR DE LOS HECHOS (dirección/ciudad)', row: 24, tipo: 'textarea' },
  { key: 'actividad', label: 'ACTIVIDAD', row: 25, tipo: 'text' },
  { key: 'causaSiniestro', label: 'CAUSA DEL SINIESTRO', row: 26, tipo: 'textarea' },
  { key: 'conceptoPerdida', label: 'CONCEPTO DE LA PÉRDIDA', row: 27, tipo: 'textarea' },
  { key: 'amparoAfectado', label: 'AMPARO AFECTADO', row: 28, tipo: 'text' },
  { key: 'articulo', label: 'ARTÍCULO (EDIFICIO, CONTENIDOS)', row: 29, tipo: 'text' },
  { key: 'valorReclamado', label: 'VALOR RECLAMADO', row: 30, tipo: 'text' },
  { key: 'valorAsegurado', label: 'VALOR ASEGURADO', row: 31, tipo: 'text' },
  { key: 'solicitudDocumentos', label: 'SOLICITUD DOCUMENTOS (SI APLICA)', row: 32, tipo: 'textarea' },
  { key: 'valorSugeridoIndemnizar', label: 'VALOR SUGERIDO INDEMNIZAR', row: 33, tipo: 'text' },
  { key: 'deducibleAplicar', label: 'DEDUCIBLE A APLICAR', row: 34, tipo: 'text' },
  { key: 'valorSugeridoLuegoDeducible', label: 'VALOR SUGERIDO LUEGO DE DEDUCIBLE', row: 35, tipo: 'text' },
  { key: 'auxilioInterrupcion', label: 'AUXILIO POR INTERRUPCIÓN (Si aplica)', row: 36, tipo: 'text' },
  { key: 'valorFinalEstimadoPerdida', label: 'VALOR FINAL ESTIMADO DE LA PÉRDIDA', row: 37, tipo: 'text' },
  { key: 'salvamento', label: 'SALVAMENTO', row: 38, tipo: 'text' },
  { key: 'subrogacion', label: 'SUBROGACIÓN', row: 39, tipo: 'text' },
  { key: 'analista', label: 'ANALISTA', row: 40, tipo: 'text' },
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
  const enc = encabezadoDesdeCasoSura(caso);
  const liq = liquidador || mapCasoSuraALiquidador(caso);
  const tot = totales || calcularLiquidacionSura(liq);
  const sal = salvamento || defaultSalvamentoSura(caso);
  const ident = texto(enc.identificacion, caso.identificacion, caso.numDocumento);
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
    siniestroNro: texto(enc.siniestro, caso.siniestro, caso.nmroSinstro),
    tomador: texto(enc.tomador, caso.tomador),
    nitTomador: '',
    asegurado: texto(enc.asegurado, caso.asegurado, caso.asgrBenfcro),
    nitAsegurado: ident,
    pagoTransferenciaOCaja: '',
    cuentaBancaria: '',
    cuentaEmbargada: '',
    siniestroAjustador: texto(enc.consecutivo, caso.nmroAjste, caso.consecutivo),
    poliza: texto(enc.poliza, caso.numeroPoliza, caso.nmroPolza),
    vigenciaPoliza: vigenciaDesdeCaso(caso),
    sucursal: texto(enc.ciudad, caso.ciudad, caso.ciudadSiniestro),
    intermediario: texto(caso.nombIntermediario, caso.intermediario),
    coaseguro: '',
    fechaOcurrencia: fechaInput(caso.fechaSiniestro || caso.fchaSinstro || enc.fechaSiniestro),
    fechaAviso: '',
    fechaAsignacion: fechaInput(caso.fchaAsgncion),
    fechaAtencion: fechaInput(caso.fechaInspeccion || caso.fchaInspccion),
    fechaCierreEnvio: fechaInput(
      caso.fechaEnvioAseguradora || caso.fechaLiquidado || caso.informeUnico?.fechaInforme
    ),
    fechaUltimoDocumento: fechaInput(caso.fechaUltimoDocumento),
    envioInformacionAnalista: '',
    lugarHechos: lugarHechos(caso, enc),
    actividad: '',
    causaSiniestro: texto(caso.causa_siniestro, caso.cobertura, enc.evento, 'TERREMOTO'),
    conceptoPerdida: texto(caso.descSinstro, caso.informeUnico?.descripcionDanios),
    amparoAfectado: texto(caso.amprAfctdo, caso.cobertura, enc.cobertura),
    articulo: articuloDesdeCaso(caso),
    valorReclamado:
      caso.valorReclamado != null && caso.valorReclamado !== ''
        ? formatearMonto(caso.valorReclamado)
        : tot.totalReclamado
          ? formatearMonto(tot.totalReclamado)
          : '',
    valorAsegurado: valorAseguradoDesdeCaso(caso),
    solicitudDocumentos: '',
    valorSugeridoIndemnizar: valorSug,
    deducibleAplicar: texto(tot.deducibleTexto, tot.diagrama?.deducible, 'No aplica'),
    valorSugeridoLuegoDeducible: valorSug,
    auxilioInterrupcion: hospedaje,
    valorFinalEstimadoPerdida: tot.totalDanios ? formatearMonto(tot.totalDanios) : '',
    salvamento: salvamentoTxt,
    subrogacion: '',
    analista: texto(
      caso.funcAsgrdraNombre,
      caso.ajustador,
      enc.ajustador,
      caso.informeUnico?.ajustadorNombre
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
  return merged;
}

export function fusionarVaciosInformeAgil(actual = {}, computed = {}) {
  const next = { ...actual };
  for (const campo of CAMPOS_INFORME_AGIL) {
    if (esVacio(next[campo.key]) && !esVacio(computed[campo.key])) {
      next[campo.key] = computed[campo.key];
    }
  }
  return next;
}

export function fotosNsrDesdeLiquidador(liquidador = {}) {
  const items = liquidador?.evaluacionSismicaNSR10?.items;
  if (!Array.isArray(items)) return [];
  return items
    .map((it, index) => ({ ...it, _indexNsr: index }))
    .filter((it) => it?.fotoArchivoId || it?.fotoRuta || it?.fotoPreview);
}

export function filasPresupuestoDesdeLiquidador(liquidador = {}) {
  const items = liquidador?.evaluacionSismicaNSR10?.presupuesto?.items;
  if (!Array.isArray(items)) return [];
  return items.filter((it) => String(it?.actividad || it?.componente || '').trim());
}
