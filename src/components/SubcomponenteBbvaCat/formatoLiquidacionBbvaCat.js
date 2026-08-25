/**
 * Formato oficial LIQUIDACIÓN DE INDEMNIZACIÓN BBVA (Excel Libro1).
 * Hojas: Liquidador Deudores / Liquidador leasing.
 * Fórmulas alineadas a la plantilla: 4 tipos de deducible y MAX aplicable.
 */

import { parsearNumero } from '../SubcomponenteExpress/liquidadorExpressHelpers.js';
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
  if (saved && typeof saved === 'object' && saved.tipo === tipo) {
    return {
      ...base,
      ...saved,
      tipo,
      basePct: saved.basePct || base.basePct,
    };
  }
  const cfg =
    liquidador.liquidacionCatastrofico?.deducibleConfigPresupuesto ||
    liquidador.liquidacionCatastrofico?.deducibleConfig ||
    {};
  const pct = Number(cfg.porcentaje);
  const cant = Number(cfg.cantidadSMMLV);
  return {
    ...base,
    smmlv: Number.isFinite(cant) && cant > 0 ? cant : base.smmlv,
    porcentaje:
      Number.isFinite(pct) && pct > 0
        ? pct > 1
          ? pct / 100
          : pct
        : base.porcentaje,
    tipo,
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

/**
 * Réplica de fórmulas de fila (H, J, M, N, O) de la plantilla.
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

  const valorAsegurable = parsearNumero(fila.valorAsegurable);
  let pctResponsabilidad = 1;
  if (global || esValorGlobal(valorAseguradoFecha)) {
    pctResponsabilidad = 1;
  } else if (valorAsegurable > 0 && parsearNumero(valorAseguradoFecha) > 0) {
    pctResponsabilidad = Math.min(1, parsearNumero(valorAseguradoFecha) / valorAsegurable);
  } else if (fila.pctResponsabilidad != null && fila.pctResponsabilidad !== '') {
    const p = parsearNumero(fila.pctResponsabilidad);
    pctResponsabilidad = p > 1 ? Math.min(1, p / 100) : Math.min(1, Math.max(0, p));
  }

  const perdidaIn = parsearNumero(fila.valorPerdida);
  const valorPerdida = perdidaIn || valorAsegurable;
  const demerito = parsearDemeritoBbva(fila.demerito);
  const valorReal = valorAsegurable ? redondear(valorAsegurable * (1 - demerito)) : 0;
  const perdidaBase =
    valorReal && valorPerdida ? redondear(Math.min(valorReal, valorPerdida)) : valorReal || valorPerdida;
  const perdidaIndemnizable = redondear(perdidaBase * pctResponsabilidad);

  return {
    ...fila,
    descripcion,
    valorAsegurado: global ? VALOR_GLOBAL : vaRaw,
    indiceVariable: fila.indiceVariable ?? 0,
    valorAseguradoFecha,
    valorAsegurable: fila.valorAsegurable,
    pctResponsabilidad,
    valorPerdida: fila.valorPerdida === '' || fila.valorPerdida == null ? valorAsegurable || '' : fila.valorPerdida,
    demerito: fila.demerito ?? 0,
    valorReal,
    perdidaBase,
    perdidaIndemnizable: descripcion || valorAsegurable || valorPerdida ? perdidaIndemnizable : 0,
  };
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
      fuente: it.catalogoId ? 'Base precios general' : '',
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
  let basePorcentaje = valorGlobal;
  if (basePct === 'subtotal') {
    basePorcentaje = subTotal || sumaAsegurable || valorGlobal;
  } else {
    basePorcentaje = valorGlobal || sumaAsegurable;
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
 * Sub Total = MIN(suma indemnizable, valor global) si hay valor global.
 * Deducible = MAX(SMMLV, %, USD, pesos).
 * Valor a indemnizar = MAX(0, subtotal − deducible).
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
  const subTotal =
    valorGlobal > 0 ? redondear(Math.min(sumaIndemnizable, valorGlobal)) : sumaIndemnizable;
  const dedFmt = resolverDeducibleFormatoBbvaCat(liquidador);
  const tipos = calcularTiposDeducibleBbvaCat({
    deducibleFormato: dedFmt,
    anio: ctx.anio,
    valorGlobal,
    subTotal,
    sumaAsegurable,
    trm: enc.trm,
  });
  const deducibleAplicable = redondear(Math.min(tipos.aplicable, subTotal || tipos.aplicable));
  const valorAIndemnizar = redondear(Math.max(0, subTotal - deducibleAplicable));
  return {
    ctx,
    detalle,
    valorGlobal,
    sumaIndemnizable,
    subTotal,
    tiposDeducible: tipos,
    deducibleAplicable,
    valorAIndemnizar,
    deducibleFormato: dedFmt,
  };
}

export const LOGO_BBVA_URL = `${import.meta.env.BASE_URL || '/'}templates/logo-bbva.png`;
export const PLANTILLA_LIQUIDADOR_BBVA_URL = `${
  import.meta.env.BASE_URL || '/'
}templates/Liquidador_BBVA_CAT.xlsx`;
