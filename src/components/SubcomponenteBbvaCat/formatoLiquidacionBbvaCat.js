/**
 * Formato oficial LIQUIDACIÓN DE INDEMNIZACIÓN BBVA (Excel Libro1).
 * Hojas: Liquidador Deudores / Liquidador leasing.
 * Fórmulas alineadas a la plantilla: 4 tipos de deducible y MAX aplicable.
 */

import { parsearNumero } from '../SubcomponenteExpress/liquidadorExpressHelpers.js';
import { montoCotizacionPdf } from '../liquidacion/cotizacionPdfLiquidacion.js';
import {
  inferirTipoLiquidadorBbvaCat,
  reglaDeduciblePorTipoBbvaCat,
  TIPO_LIQUIDADOR_DEUDORES,
} from './deduciblesBbvaCat.js';

export const RAMOS_BBVA_CAT = [
  'EQUIPO ELÉCTRICO Y ELECTRÓNICO',
  'MAQUINARIA Y EQUIPO',
  'SUSTRACCIÓN',
  'INCENDIO',
  'TERREMOTO',
  'AMIT',
  'ROTURA DE MAQUINARIA',
  'RCE',
  'MANEJO GLOBAL COMERCIAL',
  'TRANSPORTES',
];

/** Tabla SMMLV de la plantilla Excel + años oficiales recientes. */
export const SMMLV_TABLA_BBVA = {
  2003: 332000,
  2004: 358000,
  2005: 381500,
  2006: 408000,
  2007: 433700,
  2008: 461500,
  2009: 496900,
  2010: 515000,
  2011: 535600,
  2012: 566700,
  2013: 589500,
  2014: 616000,
  2015: 644350,
  2016: 689455,
  2017: 737717,
  2018: 781242,
  2019: 828616,
  2020: 877803,
  2021: 908526,
  2022: 1000000,
  2023: 1160000,
  2024: 1300000,
  2025: 1423500,
  2026: 1750905,
};

export const ANIOS_SMMLV_BBVA = Object.keys(SMMLV_TABLA_BBVA)
  .map(Number)
  .sort((a, b) => a - b);

export const VALOR_GLOBAL = 'Valor Global';

export function esValorGlobal(valor) {
  return String(valor ?? '')
    .trim()
    .toLowerCase()
    .includes('valor global');
}

export function smmlvPorAnioBbva(anio) {
  const n = Number(anio);
  if (Number.isFinite(n) && SMMLV_TABLA_BBVA[n] != null) return SMMLV_TABLA_BBVA[n];
  if (Number.isFinite(n)) {
    const menor = [...ANIOS_SMMLV_BBVA].reverse().find((a) => a <= n);
    if (menor != null) return SMMLV_TABLA_BBVA[menor];
  }
  return SMMLV_TABLA_BBVA[2026];
}

export function anioDesdeFechaBbva(fechaISO) {
  if (!fechaISO) return '';
  if (fechaISO instanceof Date && !Number.isNaN(fechaISO.getTime())) {
    return fechaISO.getFullYear();
  }
  const raw = String(fechaISO).trim();
  const iso = raw.match(/^(\d{4})/);
  if (iso) return Number(iso[1]);
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '' : d.getFullYear();
}

export function diasEntreFechasBbva(desde, hasta) {
  const a = fechaDateBbva(desde);
  const b = fechaDateBbva(hasta);
  if (!a || !b) return '';
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86400000);
}

function fechaDateBbva(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12, 0, 0);
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function redondear(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

/** Demérito Excel: 0.5 = 50%. Si el usuario escribe 50, se interpreta como 50%. */
export function parsearDemeritoBbva(valor) {
  const n = parsearNumero(valor);
  if (!n) return 0;
  if (n > 1) return Math.min(1, n / 100);
  return Math.min(1, Math.max(0, n));
}

export function parsearPorcentajeDeducibleBbva(valor) {
  const n = parsearNumero(valor);
  if (!n) return 0;
  if (n > 1) return n / 100;
  return n;
}

export function defaultDeducibleFormatoBbvaCat(tipo, ramo = '') {
  const regla = reglaDeduciblePorTipoBbvaCat(tipo, ramo);
  return {
    tipo: regla.tipo || TIPO_LIQUIDADOR_DEUDORES,
    smmlv: regla.cantidadSMMLV,
    porcentaje: regla.porcentaje / 100,
    dolares: 0,
    pesos: 0,
    basePct: regla.basePct,
  };
}

export function resolverDeducibleFormatoBbvaCat(liquidador = {}) {
  const enc = liquidador.encabezado || {};
  const tipo = inferirTipoLiquidadorBbvaCat({
    tipoLiquidador: liquidador.tipoLiquidador,
    encabezado: enc,
  });
  const ramo = enc.ramoAfectado || enc.cobertura || enc.evento || '';
  const base = defaultDeducibleFormatoBbvaCat(tipo, ramo);
  const saved = liquidador.deducibleFormato;
  const extras = {};
  if (saved && typeof saved === 'object') {
    extras.dolares = saved.dolares ?? 0;
    extras.pesos = saved.pesos ?? 0;
    const smmlvSaved = parsearNumero(saved.smmlv);
    if (smmlvSaved > 0) extras.smmlv = smmlvSaved;
    const pctSaved = parsearPorcentajeDeducibleBbva(saved.porcentaje);
    const oficial = parsearPorcentajeDeducibleBbva(base.porcentaje);
    const esResidualCinco =
      Math.abs(pctSaved - 0.05) < 1e-6 && Math.abs(oficial - 0.02) < 1e-6;
    if (pctSaved > 0 && !esResidualCinco) extras.porcentaje = pctSaved;
  }
  const cfg =
    liquidador.liquidacionCatastrofico?.deducibleConfigPresupuesto ||
    liquidador.liquidacionCatastrofico?.deducibleConfig ||
    {};
  if (extras.smmlv == null) {
    const cant = Number(cfg.cantidadSMMLV);
    if (Number.isFinite(cant) && cant > 0 && cant !== 4) extras.smmlv = cant;
  }
  return {
    ...base,
    ...extras,
    tipo,
    basePct: base.basePct,
    porcentaje: extras.porcentaje ?? base.porcentaje,
    smmlv: extras.smmlv ?? base.smmlv,
  };
}

export function nuevoItemDetalleBbvaCat(parcial = {}) {
  return {
    id: `bbva-det-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    descripcion: '',
    valorAsegurado: VALOR_GLOBAL,
    indiceVariable: 0,
    valorAseguradoFecha: VALOR_GLOBAL,
    valorAsegurable: '',
    pctResponsabilidad: 1,
    valorPerdida: '',
    demerito: 0,
    valorReal: '',
    perdidaBase: '',
    perdidaIndemnizable: '',
    catalogoId: '',
    capitulo: '',
    unidad: 'und',
    cantidad: 1,
    valorUnitario: '',
    ...parcial,
  };
}

export function contextoFechasBbvaCat(encabezado = {}, caso = {}) {
  const vigenciaDesde = encabezado.vigenciaDesde || caso.fechaInicioPoliza || '';
  const vigenciaHasta = encabezado.vigenciaHasta || caso.fechaFinPoliza || '';
  const fechaSiniestro = encabezado.fechaSiniestro || caso.fechaSiniestro || '';
  const anio = anioDesdeFechaBbva(fechaSiniestro);
  const dias = diasEntreFechasBbva(vigenciaDesde, fechaSiniestro);
  const diasVigencia = diasEntreFechasBbva(vigenciaDesde, vigenciaHasta);
  return {
    vigenciaDesde,
    vigenciaHasta,
    fechaSiniestro,
    anio,
    diasTranscurridos: dias,
    diasVigencia,
  };
}

/** Cantidad × valor unitario (base de precios). */
export function totalCantidadPorUnitarioBbvaCat(fila = {}) {
  if (fila.cantidad === '' || fila.cantidad == null) return 0;
  if (fila.valorUnitario === '' || fila.valorUnitario == null) return 0;
  const cant = parsearNumero(fila.cantidad);
  const vu = parsearNumero(fila.valorUnitario);
  if (!cant && !vu) return 0;
  return Math.round(cant * vu * 100) / 100;
}

function casiIgualMontoBbva(a, b) {
  return Math.abs(Number(a) - Number(b)) < 1.05;
}

/**
 * Réplica de fórmulas de fila (H, J, M, N, O) de la plantilla.
 * Valor real / pérdida se calculan sobre el TOTAL (cantidad × unitario), no sobre el unitario.
 */
export function calcularFilaDetalleBbvaCat(fila = {}, ctx = {}) {
  const descripcion = String(fila.descripcion || '').trim();
  const vaRaw = fila.valorAsegurado;
  const global = esValorGlobal(vaRaw);
  const indice = parsearNumero(fila.indiceVariable);
  const vaNum = global ? 0 : parsearNumero(vaRaw);
  const diasVig = Number(ctx.diasVigencia) || 0;
  const diasTrans = Number(ctx.diasTranscurridos) || 0;

  let valorAseguradoFecha = '';
  if (global) {
    valorAseguradoFecha = VALOR_GLOBAL;
  } else if (vaNum) {
    const extra =
      diasVig > 0 && indice ? (vaNum * indice * diasTrans) / diasVig : 0;
    valorAseguradoFecha = redondear(vaNum + extra);
  }

  const totalCatalogo = totalCantidadPorUnitarioBbvaCat(fila);
  const vu = parsearNumero(fila.valorUnitario);
  const cant = parsearNumero(fila.cantidad);
  let valorAsegurable = parsearNumero(fila.valorAsegurable);
  if (totalCatalogo > 0) {
    const asegurableEsUnitario =
      !valorAsegurable || (cant > 1 && casiIgualMontoBbva(valorAsegurable, vu));
    if (asegurableEsUnitario) valorAsegurable = totalCatalogo;
  }

  let pctResponsabilidad = 1;
  if (global || esValorGlobal(valorAseguradoFecha)) {
    pctResponsabilidad = 1;
  } else if (valorAsegurable > 0 && parsearNumero(valorAseguradoFecha) > 0) {
    pctResponsabilidad = Math.min(1, parsearNumero(valorAseguradoFecha) / valorAsegurable);
  } else if (fila.pctResponsabilidad != null && fila.pctResponsabilidad !== '') {
    const p = parsearNumero(fila.pctResponsabilidad);
    pctResponsabilidad = p > 1 ? Math.min(1, p / 100) : Math.min(1, Math.max(0, p));
  }

  let valorPerdida = parsearNumero(fila.valorPerdida);
  if (totalCatalogo > 0 && (!valorPerdida || (cant > 1 && casiIgualMontoBbva(valorPerdida, vu)))) {
    valorPerdida = totalCatalogo;
  }
  if (!valorPerdida) valorPerdida = valorAsegurable;

  const demerito = parsearDemeritoBbva(fila.demerito);
  const baseReal = valorAsegurable || valorPerdida;
  const valorReal = baseReal ? redondear(baseReal * (1 - demerito)) : 0;
  const perdidaBase =
    valorReal && valorPerdida ? redondear(Math.min(valorReal, valorPerdida)) : valorReal || valorPerdida;
  const perdidaIndemnizable = redondear(perdidaBase * pctResponsabilidad);

  return {
    ...fila,
    descripcion,
    valorAsegurado: global ? VALOR_GLOBAL : vaRaw,
    indiceVariable: fila.indiceVariable ?? 0,
    valorAseguradoFecha,
    valorAsegurable: valorAsegurable || fila.valorAsegurable,
    pctResponsabilidad,
    valorPerdida:
      fila.valorPerdida === '' || fila.valorPerdida == null
        ? valorAsegurable || totalCatalogo || ''
        : valorPerdida,
    demerito: fila.demerito ?? 0,
    valorReal,
    perdidaBase,
    perdidaIndemnizable: descripcion || valorAsegurable || valorPerdida ? perdidaIndemnizable : 0,
  };
}

/** Recalcula valor de la pérdida y valor asegurable = cantidad × unitario. */
export function patchFilaDetalleBbvaCat(fila = {}, patch = {}, ctx = {}) {
  const next = { ...fila, ...patch };
  const tocaronCantVu = ['cantidad', 'valorUnitario', 'catalogoId'].some((k) =>
    Object.prototype.hasOwnProperty.call(patch, k)
  );
  if (tocaronCantVu) {
    const total = totalCantidadPorUnitarioBbvaCat(next);
    if (total) {
      next.valorPerdida = total;
      next.valorAsegurable = total;
    }
  }
  return calcularFilaDetalleBbvaCat(next, ctx);
}

export function detalleLiquidacionCatDesdePresupuestoBbva(liquidador = {}) {
  const filas = [];
  const items = liquidador?.evaluacionSismicaNSR10?.presupuesto?.items;
  if (Array.isArray(items)) {
    items.forEach((it, idx) => {
      const desc = String(it.actividad || it.componente || '').trim();
      if (!desc && !it.catalogoId) return;
      const cantidad = it.cantidad ?? '';
      const valorUnitario = it.valorUnitario ?? '';
      const perdida =
        parsearNumero(it.total) || parsearNumero(valorUnitario) * parsearNumero(cantidad);
      filas.push(
        calcularFilaDetalleBbvaCat(
          nuevoItemDetalleBbvaCat({
            id: it.id || `nsr-${idx}`,
            catalogoId: it.catalogoId || '',
            capitulo: it.capitulo || '',
            descripcion: desc,
            unidad: it.unidad || 'und',
            cantidad,
            valorUnitario,
            valorAsegurado: VALOR_GLOBAL,
            valorAsegurable: perdida || '',
            valorPerdida: perdida || '',
          })
        )
      );
    });
  }
  return filas;
}

export function resolverDetalleLiquidacionBbvaCat(liquidador = {}) {
  if (Array.isArray(liquidador?.detalleLiquidacionCat)) {
    const ctx = contextoFechasBbvaCat(liquidador.encabezado || {});
    return liquidador.detalleLiquidacionCat.map((it) => calcularFilaDetalleBbvaCat(it, ctx));
  }
  return detalleLiquidacionCatDesdePresupuestoBbva(liquidador);
}

export function sincronizarDetalleBbvaConPresupuestoNsr(liquidador = {}, filasDetalle = []) {
  const evalData = liquidador.evaluacionSismicaNSR10 || {};
  const presupuesto = evalData.presupuesto || {};
  const items = (filasDetalle || [])
    .filter((it) => String(it?.descripcion || '').trim() || it?.catalogoId)
    .map((it) => ({
      id: it.id,
      catalogoId: it.catalogoId || '',
      capitulo: it.capitulo || '',
      componente: '',
      actividad: it.descripcion || '',
      unidad: it.unidad || 'und',
      cantidad: it.cantidad ?? '',
      valorUnitario: it.valorUnitario ?? '',
      total: it.perdidaIndemnizable ?? it.valorPerdida ?? '',
      prioridad: 'Medio',
      cubierto: '',
      observacion: '',
      fuente: it.catalogoId ? 'Base precios Valle del Cauca' : '',
    }));
  return {
    ...liquidador,
    detalleLiquidacionCat: filasDetalle,
    evaluacionSismicaNSR10: {
      ...evalData,
      presupuesto: {
        ...presupuesto,
        items,
      },
    },
  };
}

export function calcularTiposDeducibleBbvaCat({
  deducibleFormato = {},
  anio,
  valorGlobal = 0,
  subTotal = 0,
  sumaAsegurable = 0,
  trm = 0,
} = {}) {
  const smmlvQty = parsearNumero(deducibleFormato.smmlv);
  const pct = parsearPorcentajeDeducibleBbva(deducibleFormato.porcentaje);
  const dolares = parsearNumero(deducibleFormato.dolares);
  const pesos = parsearNumero(deducibleFormato.pesos);
  const valorSmmlv = smmlvPorAnioBbva(anio);
  const montoSmmlv = redondear(smmlvQty * valorSmmlv);
  const basePct = String(deducibleFormato.basePct || 'valor_global');
  let basePorcentaje = 0;
  if (basePct === 'subtotal') {
    basePorcentaje = subTotal || sumaAsegurable || 0;
  } else {
    basePorcentaje = valorGlobal || 0;
  }
  const montoPct = redondear(basePorcentaje * pct);
  const montoUsd = redondear(dolares * parsearNumero(trm));
  const montoPesos = redondear(pesos);
  const montos = [
    { id: 'smmlv', label: 'SMMLV', monto: montoSmmlv },
    { id: 'porcentaje', label: 'PORCENTAJE', monto: montoPct },
    { id: 'dolares', label: 'DÓLARES', monto: montoUsd },
    { id: 'pesos', label: 'PESOS / OTRO', monto: montoPesos },
  ];
  const ganador = montos.reduce(
    (best, cur) => (cur.monto > best.monto ? cur : best),
    montos[0]
  );
  return {
    smmlvQty,
    porcentaje: pct,
    dolares,
    pesos,
    valorSmmlv,
    anio: Number(anio) || '',
    basePct,
    basePorcentaje,
    montoSmmlv,
    montoPct,
    montoUsd,
    montoPesos,
    aplicable: ganador.monto,
    tipoAplicado: ganador.id,
    tipoAplicadoLabel: ganador.label,
  };
}

/**
 * Totales de plantilla:
 * Sub total = suma indemnizable de ítems.
 * AIU = % editable del subtotal (default 25%; 0 = no aplica).
 * Total = subtotal + AIU (tope valor global si existe).
 * Deducible = MAX(SMMLV, %, USD, pesos) sobre la regla (2% del valor global, no de la pérdida).
 * Valor a indemnizar = MAX(0, total − min(deducible, total)).
 */
export function calcularTotalesFormatoExcelBbvaCat(liquidador = {}, caso = {}) {
  const enc = liquidador.encabezado || {};
  const ctx = contextoFechasBbvaCat(enc, caso);
  const detalle = resolverDetalleLiquidacionBbvaCat({ ...liquidador, encabezado: enc }).map((it) =>
    calcularFilaDetalleBbvaCat(it, ctx)
  );
  const sumaIndemnizable = redondear(
    detalle.reduce((acc, it) => acc + (parsearNumero(it.perdidaIndemnizable) || 0), 0)
  );
  const sumaAsegurable = redondear(
    detalle.reduce((acc, it) => acc + (parsearNumero(it.valorAsegurable) || 0), 0)
  );
  const valorGlobal =
    parsearNumero(enc.valorGlobal) ||
    parsearNumero(enc.valorAseguradoInmueble) ||
    parsearNumero(liquidador.liquidacionCatastrofico?.valorAsegurado) ||
    0;
  const aiuPct = resolverAiuPorcentajeBbvaCat(liquidador);
  const aiu = redondear(sumaIndemnizable * aiuPct);
  const subTotal = sumaIndemnizable;
  const totalConAiu = redondear(subTotal + aiu);
  const baseIndemnizable =
    valorGlobal > 0 ? redondear(Math.min(totalConAiu, valorGlobal)) : totalConAiu;
  const dedFmt = resolverDeducibleFormatoBbvaCat(liquidador);
  const tipos = calcularTiposDeducibleBbvaCat({
    deducibleFormato: dedFmt,
    anio: ctx.anio,
    valorGlobal,
    subTotal: baseIndemnizable,
    sumaAsegurable,
    trm: enc.trm,
  });
  const deduciblePoliza = redondear(tipos.aplicable);
  const deducibleAplicable = redondear(
    Math.min(deduciblePoliza, baseIndemnizable || deduciblePoliza)
  );
  const valorAIndemnizar = redondear(Math.max(0, baseIndemnizable - deducibleAplicable));
  return {
    ctx,
    detalle,
    valorGlobal,
    sumaIndemnizable,
    subTotal,
    aiuPct,
    aiu,
    totalConAiu,
    baseIndemnizable,
    tiposDeducible: tipos,
    deduciblePoliza,
    deducibleAplicable,
    valorAIndemnizar,
    deducibleFormato: dedFmt,
  };
}

export const LOGO_BBVA_URL = `${import.meta.env.BASE_URL || '/'}templates/logo-bbva.png`;
export const PLANTILLA_LIQUIDADOR_BBVA_URL = `${
  import.meta.env.BASE_URL || '/'
}templates/Liquidador_BBVA_CAT.xlsx`;
/** Default 25%. El ajustador puede bajarlo a 0 o cambiarlo. */
export const AIU_PORCENTAJE_FORMATO_BBVA_CAT = 0.25;

/**
 * AIU del formato BBVA: fracción 0–1. Vacío en casos viejos → 25%.
 * 0 es válido (sin AIU).
 */
export function resolverAiuPorcentajeBbvaCat(liquidador = {}) {
  const cands = [
    liquidador.aiuPorcentaje,
    liquidador.evaluacionSismicaNSR10?.presupuesto?.aiuPorcentaje,
  ];
  for (const raw of cands) {
    if (raw === '' || raw == null) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) continue;
    return Math.max(0, n > 1 ? n / 100 : n);
  }
  return AIU_PORCENTAJE_FORMATO_BBVA_CAT;
}

export function etiquetaAiuBbvaCat(aiuPct) {
  const pct = Number(aiuPct);
  const n = Number.isFinite(pct) ? pct : AIU_PORCENTAJE_FORMATO_BBVA_CAT;
  const ui = Math.round(n * 10000) / 100;
  const txt = Number.isInteger(ui) ? String(ui) : String(ui);
  return `AIU (${txt}%)`;
}

function aiuPorcentajeOpcionalBbva(raw, fallback = 0) {
  if (raw === '' || raw == null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.max(0, n > 1 ? n / 100 : n);
}

/** Liquidación propia del PDF: AIU opcional (0 = no aplica) y deducible independiente del formato Excel. */
export function defaultLiquidacionCotizacionPdfBbvaCat(tipo, ramo = '') {
  return {
    aiuPorcentaje: 0,
    deducibleFormato: defaultDeducibleFormatoBbvaCat(tipo, ramo),
  };
}

export function normalizarLiquidacionCotizacionPdfBbvaCat(liquidador = {}) {
  const enc = liquidador.encabezado || {};
  const tipo = inferirTipoLiquidadorBbvaCat({
    tipoLiquidador: liquidador.tipoLiquidador,
    encabezado: enc,
  });
  const ramo = enc.ramoAfectado || enc.cobertura || enc.evento || '';
  const base = defaultLiquidacionCotizacionPdfBbvaCat(tipo, ramo);
  const raw =
    liquidador.liquidacionCotizacionPdf && typeof liquidador.liquidacionCotizacionPdf === 'object'
      ? liquidador.liquidacionCotizacionPdf
      : {};
  const savedDed =
    raw.deducibleFormato && typeof raw.deducibleFormato === 'object' ? raw.deducibleFormato : {};
  return {
    ...base,
    ...raw,
    aiuPorcentaje: aiuPorcentajeOpcionalBbva(raw.aiuPorcentaje, 0),
    deducibleFormato: {
      ...base.deducibleFormato,
      ...savedDed,
    },
  };
}

/**
 * Cotización PDF: monto + AIU opcional − deducible propio (4 tipos BBVA).
 * No usa ítems ni el deducible del formato Excel.
 */
export function calcularLiquidacionCotizacionPdfBbvaCat(liquidador = {}, caso = {}) {
  const enc = liquidador.encabezado || {};
  const ctx = contextoFechasBbvaCat(enc, caso);
  const cfg = normalizarLiquidacionCotizacionPdfBbvaCat(liquidador);
  const monto = redondear(montoCotizacionPdf(liquidador.cotizacionPdf) || 0);
  const aiuPct = cfg.aiuPorcentaje || 0;
  const aiu = redondear(monto * aiuPct);
  const totalConAiu = redondear(monto + aiu);
  const valorGlobal =
    parsearNumero(enc.valorGlobal) ||
    parsearNumero(enc.valorAseguradoInmueble) ||
    parsearNumero(liquidador.liquidacionCatastrofico?.valorAsegurado) ||
    0;
  const tipos = calcularTiposDeducibleBbvaCat({
    deducibleFormato: cfg.deducibleFormato,
    anio: ctx.anio,
    valorGlobal,
    subTotal: totalConAiu,
    sumaAsegurable: valorGlobal,
    trm: enc.trm,
  });
  const deduciblePoliza = redondear(tipos.aplicable);
  const deducibleAplicable = redondear(
    Math.min(deduciblePoliza, totalConAiu || deduciblePoliza)
  );
  const valorAIndemnizar = redondear(Math.max(0, totalConAiu - deducibleAplicable));
  return {
    activo: monto > 0,
    monto,
    aiuPct,
    aiu,
    subTotal: monto,
    totalConAiu,
    valorGlobal,
    tiposDeducible: tipos,
    deducibleFormato: cfg.deducibleFormato,
    deduciblePoliza,
    deducibleAplicable,
    valorAIndemnizar,
    ctx,
    deducibleTexto: `Aplica el mayor de SMMLV / % / USD / pesos (${tipos.tipoAplicadoLabel || 'SMMLV'})`,
  };
}

export function patchLiquidacionCotizacionPdfBbvaCat(liquidador = {}, patch = {}) {
  const actual = normalizarLiquidacionCotizacionPdfBbvaCat(liquidador);
  const next = { ...actual, ...patch };
  if (patch.deducibleFormato && typeof patch.deducibleFormato === 'object') {
    next.deducibleFormato = { ...actual.deducibleFormato, ...patch.deducibleFormato };
  }
  return { ...liquidador, liquidacionCotizacionPdf: next };
}
