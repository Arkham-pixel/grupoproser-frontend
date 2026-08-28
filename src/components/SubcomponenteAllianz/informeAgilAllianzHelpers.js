import {
  CAMPOS_INFORME_AGIL,
  VALOR_APLICA_INFORME_AGIL,
  VALOR_NO_APLICA_INFORME_AGIL,
  esNoAplicaInformeAgil,
  fusionarVaciosInformeAgil,
  normalizarCamposSelectInformeAgil,
} from '../SubcomponenteSura/informeAgilSuraHelpers.js';
import {
  calcularLiquidacionAllianz,
  cuadroLiquidacionAllianz,
  encabezadoDesdecasoAllianz,
  formatearMonto,
  mapcasoAllianzALiquidador,
} from './liquidadorAllianzHelpers.js';

export { CAMPOS_INFORME_AGIL };

const CAMPOS_DESDE_LIQUIDADOR = [
  'valorReclamado',
  'valorAsegurado',
  'valorSugeridoIndemnizar',
  'deducibleAplicar',
  'valorSugeridoLuegoDeducible',
  'valorFinalEstimadoPerdida',
  'auxilioInterrupcion',
];

const esVacio = (valor) => valor == null || String(valor).trim() === '';

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
  const ciudad = texto(enc.ciudad, caso.ciudad);
  const depto = texto(enc.departamento, caso.departamento);
  return [dir, ciudad, depto].filter(Boolean).join(' / ');
};

const articuloDesdeCaso = (caso = {}, enc = {}) => {
  const inmueble = Number(enc.valorAseguradoInmueble || caso.valorAseguradoInmueble) > 0;
  const contenidos = Number(enc.valorAseguradoContenidos || caso.valorAseguradoContenidos) > 0;
  if (inmueble && contenidos) return 'Edificio y contenido';
  if (contenidos && !inmueble) return 'Contenido';
  if (inmueble) return 'Edificio';
  return 'Edificio';
};

const valorAseguradoDesdeCaso = (caso = {}, enc = {}, cuadro = {}) => {
  const a = Number(enc.valorAseguradoInmueble ?? caso.valorAseguradoInmueble) || 0;
  const b = Number(enc.valorAseguradoContenidos ?? caso.valorAseguradoContenidos) || 0;
  const total = a + b;
  if (total > 0) return formatearMonto(total);
  if (cuadro.valorAsegurado > 0) return formatearMonto(cuadro.valorAsegurado);
  if (caso.valorAseguradoInmueble) return formatearMonto(caso.valorAseguradoInmueble);
  return '';
};

/** Prefill del formato ágil Allianz desde caso + liquidador (campos 27–39 incluidos). */
export function computarInformeAgilDesdeCasoAllianz({
  caso = {},
  liquidador = null,
  totales = null,
} = {}) {
  const casoSafe = caso && typeof caso === 'object' ? caso : {};
  const enc = encabezadoDesdecasoAllianz(casoSafe);
  const liq = liquidador || mapcasoAllianzALiquidador(casoSafe);
  const tot = totales || calcularLiquidacionAllianz(liq);
  const cuadro = cuadroLiquidacionAllianz(tot, liq);
  const ident = texto(enc.identificacion, casoSafe.identificacion);
  const tomador = texto(enc.tomador, casoSafe.tomador, casoSafe.asegurado);
  const asegurado = texto(enc.asegurado, casoSafe.asegurado);
  const hospedajeManual = Number(liq.liquidacionCatastrofico?.hospedajeManual);
  const hospedajeDiag = Number(tot.diagrama?.gastosHospedaje);
  const auxilioAplica =
    (Number.isFinite(hospedajeManual) && hospedajeManual > 0) ||
    (Number.isFinite(hospedajeDiag) && hospedajeDiag > 0);

  return {
    siniestroNro: texto(enc.siniestro, casoSafe.siniestro, casoSafe.zc),
    tomador,
    nitTomador: texto(casoSafe.identificacion, ident),
    asegurado,
    nitAsegurado: ident,
    correo: texto(casoSafe.correo, casoSafe.correoAsegurado, enc.correo),
    celular: texto(casoSafe.celular, casoSafe.telefonoAsegurado),
    pagoTransferenciaOCaja: texto(casoSafe.pagoTransferenciaOCaja),
    cuentaBancaria: texto(casoSafe.cuentaBancaria),
    cuentaEmbargada: texto(casoSafe.cuentaEmbargada) || 'No',
    siniestroAjustador: texto(enc.consecutivo, casoSafe.consecutivo),
    poliza: texto(enc.poliza, casoSafe.numeroPoliza),
    vigenciaPoliza: vigenciaDesdeCaso(casoSafe),
    sucursal: texto(enc.ciudad, casoSafe.ciudad),
    intermediario: texto(casoSafe.intermediario) || VALOR_NO_APLICA_INFORME_AGIL,
    coaseguro: texto(casoSafe.coaseguro) || VALOR_NO_APLICA_INFORME_AGIL,
    fechaOcurrencia: fechaInput(casoSafe.fechaSiniestro || enc.fechaSiniestro),
    fechaAviso: fechaInput(casoSafe.fechaLlamada),
    fechaAsignacion: fechaInput(casoSafe.fechaAsignacion),
    fechaAtencion: fechaInput(casoSafe.fechaInspeccion || casoSafe.fechaVisita),
    fechaCierreEnvio: fechaInput(
      casoSafe.fechaEnvioAseguradora || casoSafe.fechaLiquidado || casoSafe.informeUnico?.fechaInforme
    ),
    fechaUltimoDocumento: fechaInput(casoSafe.fechaUltimoDocumento),
    lugarHechos: lugarHechos(casoSafe, enc),
    actividad: '',
    causaSiniestro: texto(casoSafe.causa, enc.causa, enc.evento, 'TERREMOTO'),
    conceptoPerdida: texto(casoSafe.observaciones, casoSafe.informeUnico?.descripcionDanios),
    amparoAfectado: texto(casoSafe.cobertura, enc.cobertura, enc.evento, 'Terremoto'),
    articulo: articuloDesdeCaso(casoSafe, enc),
    valorReclamado: cuadro.valorReclamado ? formatearMonto(cuadro.valorReclamado) : '',
    valorAsegurado: valorAseguradoDesdeCaso(casoSafe, enc, cuadro),
    solicitudDocumentos: VALOR_NO_APLICA_INFORME_AGIL,
    valorSugeridoIndemnizar: cuadro.valorSugeridoIndemnizar
      ? formatearMonto(cuadro.valorSugeridoIndemnizar)
      : '',
    deducibleAplicar: cuadro.deducibleTexto || VALOR_NO_APLICA_INFORME_AGIL,
    valorSugeridoLuegoDeducible: cuadro.valorSugeridoLuegoDeducible
      ? formatearMonto(cuadro.valorSugeridoLuegoDeducible)
      : '',
    auxilioInterrupcion: auxilioAplica ? VALOR_APLICA_INFORME_AGIL : VALOR_NO_APLICA_INFORME_AGIL,
    valorFinalEstimadoPerdida: cuadro.valorFinalEstimadoPerdida
      ? formatearMonto(cuadro.valorFinalEstimadoPerdida)
      : '',
    salvamento: VALOR_NO_APLICA_INFORME_AGIL,
    subrogacion: VALOR_NO_APLICA_INFORME_AGIL,
    analista: texto(
      casoSafe.ajustador,
      casoSafe.inspector,
      casoSafe.ajustadorLider,
      casoSafe.informeUnico?.ajustadorNombre
    ),
  };
}

export function defaultInformeAgilAllianz(opts = {}) {
  const computed = computarInformeAgilDesdeCasoAllianz(opts);
  const guardado =
    opts.caso?.informeAgil && typeof opts.caso.informeAgil === 'object' ? opts.caso.informeAgil : {};
  const merged = { ...computed };
  for (const campo of CAMPOS_INFORME_AGIL) {
    if (CAMPOS_DESDE_LIQUIDADOR.includes(campo.key)) continue;
    if (!esVacio(guardado[campo.key])) merged[campo.key] = guardado[campo.key];
  }
  if (!esVacio(guardado.actividadOtro)) merged.actividadOtro = guardado.actividadOtro;
  if (!esVacio(guardado.solicitudDocumentosDetalle)) {
    merged.solicitudDocumentosDetalle = guardado.solicitudDocumentosDetalle;
  }
  return normalizarCamposSelectInformeAgil(merged);
}

/** Lo vacío se rellena del liquidador; 29–30 y 32–34 / 36 se refrescan siempre. */
export function fusionarInformeAgilAllianz(actual = {}, computed = {}) {
  const next = fusionarVaciosInformeAgil(actual, computed);
  for (const key of CAMPOS_DESDE_LIQUIDADOR) {
    if (esVacio(computed[key])) continue;
    const cur = String(next[key] || '').trim();
    if (esVacio(cur) || esNoAplicaInformeAgil(cur) || CAMPOS_DESDE_LIQUIDADOR.includes(key)) {
      next[key] = computed[key];
    }
  }
  return normalizarCamposSelectInformeAgil(next);
}
