/**
 * Deducibles y letreros del liquidador BBVA CAT.
 * Tipos: deudores (crédito hipotecario) y leasing.
 * CAT / terremoto: 2% del valor asegurable, mínimo 3 SMMLV (el mayor).
 */

import {
  DEFAULT_DEDUCIBLE_CATASTROFICO,
  SMMLV_DEFAULT,
  SMMLV_POR_ANIO,
} from '../SubcomponenteFormularioCatastrofico/catalogoPresupuestoCatastrofico.js';
import { parsearNumero } from '../SubcomponenteExpress/liquidadorExpressHelpers.js';

export const TIPO_LIQUIDADOR_DEUDORES = 'deudores';
export const TIPO_LIQUIDADOR_LEASING = 'leasing';

export const TIPOS_LIQUIDADOR_BBVA_CAT = [
  { id: TIPO_LIQUIDADOR_DEUDORES, label: 'Liquidador deudores' },
  { id: TIPO_LIQUIDADOR_LEASING, label: 'Liquidador leasing' },
];

export const NIT_BBVA_COLOMBIA = '860.003.020-1';

export const DEDUCIBLE_CAT_BBVA = {
  porcentaje: 2,
  cantidadSMMLV: 3,
  base: 'valor_asegurable',
  basePct: 'valor_global',
  modo: 'max_pct_minimo',
  texto:
    '2% del valor asegurable sin ser inferior a 3 SMMLV (terremoto, temblor, erupción volcánica, maremoto, tsunami y eventos catastróficos)',
};

/** Excel «Liquidador Deudores»: 3 SMMLV o 2 % del valor global (el mayor). */
export const DEDUCIBLE_DEUDORES_BBVA = {
  ...DEDUCIBLE_CAT_BBVA,
  cantidadSMMLV: 3,
  porcentaje: 2,
  basePct: 'valor_global',
};

/**
 * Excel «Liquidador leasing» (incendio): 1,5 SMMLV o 15 % de la pérdida.
 * Si el ramo es CAT / terremoto, se mantiene 3 SMMLV o 2 % (misma póliza).
 */
export const DEDUCIBLE_LEASING_BBVA = {
  porcentaje: 15,
  cantidadSMMLV: 1.5,
  base: 'valor_asegurable',
  basePct: 'subtotal',
  modo: 'max_pct_minimo',
  texto: '1,5 SMMLV o 15% de la pérdida (se aplica el mayor)',
};

export const TEXTO_DEDUCIBLE_AVISO_BBVA =
  'Es importante que tengas en cuenta que para los amparos de terremoto, temblor o erupción volcánica, maremoto o tsunami y eventos catastróficos de la naturaleza aplica un deducible del 2% del valor asegurable sin ser inferior a 3 SMMLV.';

export const TEXTO_OBJETO_POLIZA_BBVA =
  'El Seguro tiene por objeto amparar todos los bienes inmuebles dados en garantía como respaldo a la Cartera de Crédito del BBVA Colombia y a la Cartera de Terceros administrada por BBVA Colombia, contra los riesgos de incendio y peligros aliados, incluyendo terremoto, AMIT y los relacionados en el literal «amparos»; adquiriendo el banco en todos los casos la calidad de tomador y primer beneficiario a título oneroso, quedando con la facultad para ceder y endosar sus derechos.';

export const TEXTO_PAZ_Y_SALVO_BBVA =
  'Una vez realizado el pago anteriormente solicitado declaramos a BBVA SEGUROS COLOMBIA S.A., a paz y salvo para con nosotros en todo lo relacionado con el mencionado siniestro y por lo tanto cedemos a favor de BBVA SEGUROS COLOMBIA S.A., todos los derechos y acciones que nos corresponda contra los terceros responsables del siniestro y sobre los cuales certificamos no haber cedido ni renunciado a los mismos. Además nos comprometemos a no dirigir ninguna acción o gestión que obstaculice en cualquier forma el ejercicio de los derechos y acciones que competen al BBVA SEGUROS COLOMBIA S.A. Todo lo anterior de conformidad con los artículos 1096 y 1097 del Código de Comercio.';

export const TEXTO_AUTORIZACION_DEUDORES_BBVA =
  `TENIENDO EN CUENTA QUE EL ÚNICO BENEFICIARIO EN LA PÓLIZA ES BANCO BBVA COLOMBIA S.A, AUTORIZO CONSIGNAR A LA CUENTA DE BBVA COLOMBIA S.A NIT ${NIT_BBVA_COLOMBIA}, EL VALOR DE LA INDEMNIZACIÓN AL CRÉDITO HIPOTECARIO`;

export const TEXTO_AUTORIZACION_LEASING_BBVA =
  `TENIENDO EN CUENTA QUE EL ÚNICO BENEFICIARIO EN LA PÓLIZA ES BANCO BBVA COLOMBIA S.A, AUTORIZO CONSIGNAR A LA CUENTA DE BBVA COLOMBIA S.A NIT ${NIT_BBVA_COLOMBIA}, EL VALOR DE LA INDEMNIZACIÓN A LEASING BBVA`;

export const OBSERVACIONES_IVA_LEASING_BBVA =
  'PARA EL RECONOCIMIENTO DEL IVA ESTE DEBE SER SOPORTADO CON FACTURA DEBIDAMENTE CANCELADA.';

const normalizarTexto = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

export function normalizarTipoLiquidadorBbvaCat(valor) {
  const v = String(valor || '')
    .trim()
    .toLowerCase();
  if (v === TIPO_LIQUIDADOR_LEASING) return TIPO_LIQUIDADOR_LEASING;
  if (v === TIPO_LIQUIDADOR_DEUDORES) return TIPO_LIQUIDADOR_DEUDORES;
  return '';
}

export function inferirTipoLiquidadorBbvaCat({
  tipoLiquidador,
  encabezado = {},
  caso = {},
} = {}) {
  const explicit = normalizarTipoLiquidadorBbvaCat(tipoLiquidador);
  if (explicit) return explicit;
  const blob = [
    encabezado.tipoPoliza,
    encabezado.tomador,
    encabezado.asegurado,
    caso.tipoPoliza,
    caso.tomador,
    caso.asegurado,
  ].join(' ');
  if (/\bLEASING\b/.test(normalizarTexto(blob))) return TIPO_LIQUIDADOR_LEASING;
  return TIPO_LIQUIDADOR_DEUDORES;
}

export function observacionesFiniquitoPorDefectoBbvaCat(tipo) {
  return normalizarTipoLiquidadorBbvaCat(tipo) === TIPO_LIQUIDADOR_LEASING
    ? OBSERVACIONES_IVA_LEASING_BBVA
    : '';
}

export function esObservacionFiniquitoDefaultBbvaCat(texto) {
  const t = String(texto || '').trim();
  return !t || t === OBSERVACIONES_IVA_LEASING_BBVA;
}

export function textosLetrerosBbvaCat(tipo) {
  const t = inferirTipoLiquidadorBbvaCat({ tipoLiquidador: tipo });
  return {
    tipo: t,
    avisoDeducible: TEXTO_DEDUCIBLE_AVISO_BBVA,
    objetoPoliza: TEXTO_OBJETO_POLIZA_BBVA,
    pazYSalvo: TEXTO_PAZ_Y_SALVO_BBVA,
    autorizacionPago:
      t === TIPO_LIQUIDADOR_LEASING
        ? TEXTO_AUTORIZACION_LEASING_BBVA
        : TEXTO_AUTORIZACION_DEUDORES_BBVA,
    observacionesDefault: observacionesFiniquitoPorDefectoBbvaCat(t),
  };
}

function esRamoCatastroficoBbva(ramo) {
  return /TERREMOTO|TEMBLOR|ERUPCION|VOLCAN|MAREMOTO|TSUNAMI|CATASTROF/.test(
    normalizarTexto(ramo)
  );
}

export function reglaDeduciblePorTipoBbvaCat(tipo, ramo = '') {
  const t = inferirTipoLiquidadorBbvaCat({ tipoLiquidador: tipo });
  if (t === TIPO_LIQUIDADOR_LEASING && ramo && !esRamoCatastroficoBbva(ramo)) {
    return { tipo: t, ...DEDUCIBLE_LEASING_BBVA };
  }
  return { tipo: t, ...DEDUCIBLE_DEUDORES_BBVA };
}

export function pareceDeducibleGenericoCatastrofico(cfg = {}) {
  if (!cfg || typeof cfg !== 'object') return true;
  if (cfg.baseDeducible === 'valor_asegurable') return false;
  const pct = Number(cfg.porcentaje);
  const cant = Number(cfg.cantidadSMMLV);
  const esDiezYCuatro = pct === 10 && cant === 4;
  const vacio = cfg.porcentaje == null && cfg.cantidadSMMLV == null;
  return esDiezYCuatro || vacio;
}

export function patchDeducibleDesdeTipoBbvaCat(tipo, cfgActual = {}, ramo = '') {
  const regla = reglaDeduciblePorTipoBbvaCat(tipo, ramo);
  return {
    ...DEFAULT_DEDUCIBLE_CATASTROFICO,
    ...cfgActual,
    aplica: true,
    modo: regla.modo,
    porcentaje: regla.porcentaje,
    cantidadSMMLV: regla.cantidadSMMLV,
    tipoMinimo: 'SMMLV',
    baseDeducible: regla.base,
    texto: regla.texto,
    tipoLiquidadorDeducible: regla.tipo,
  };
}

export function configDeducibleContenidosDefaultBbvaCat() {
  return {
    ...DEFAULT_DEDUCIBLE_CATASTROFICO,
    aplica: false,
    modo: 'no_aplica',
    porcentaje: 0,
    cantidadSMMLV: 0,
    texto: 'No aplica',
  };
}

/**
 * Deducible CAT BBVA: MAX(2% valor asegurable, 3 SMMLV), tope la pérdida.
 */
export function calcularDeducibleBbvaCat({
  valorAsegurado = 0,
  totalDanios = 0,
  deducibleConfig = {},
} = {}) {
  const cfg = {
    ...DEDUCIBLE_CAT_BBVA,
    ...(deducibleConfig && typeof deducibleConfig === 'object' ? deducibleConfig : {}),
  };
  const va = parsearNumero(valorAsegurado);
  const danios = parsearNumero(totalDanios);
  const porcentaje = Number(cfg.porcentaje);
  const pct = Number.isFinite(porcentaje) ? porcentaje : DEDUCIBLE_CAT_BBVA.porcentaje;
  const cantidadSMMLV = Number(cfg.cantidadSMMLV);
  const cant = Number.isFinite(cantidadSMMLV)
    ? cantidadSMMLV
    : DEDUCIBLE_CAT_BBVA.cantidadSMMLV;
  const anio = Number(cfg.anioSMMLV) || 2026;
  const valorSMMLV =
    parsearNumero(cfg.valorSMMLV) || SMMLV_POR_ANIO[anio] || SMMLV_DEFAULT;
  const deducibleSMMLV = cant > 0 ? Math.round(cant * valorSMMLV * 100) / 100 : 0;
  const texto =
    cfg.texto || `${pct}% del valor asegurable · Mínimo ${cant} SMMLV (se aplica el mayor)`;

  if (!va) {
    return {
      aplica: false,
      requiereValorAsegurado: true,
      baseDeducible: 'valor_asegurable',
      valorAsegurado: 0,
      porcentaje: pct,
      cantidadSMMLV: cant,
      valorSMMLV,
      anioSMMLV: anio,
      deduciblePorcentaje: 0,
      deducibleSMMLV,
      deducibleAplicado: 0,
      usaMinimo: false,
      texto: 'Indique el valor asegurado para calcular el deducible',
    };
  }

  const deduciblePorcentaje = Math.round(va * (pct / 100) * 100) / 100;
  const bruto = Math.max(deduciblePorcentaje, deducibleSMMLV);
  const usaMinimo = deducibleSMMLV > deduciblePorcentaje;
  const deducibleAplicado =
    danios > 0
      ? Math.round(Math.min(bruto, danios) * 100) / 100
      : Math.round(bruto * 100) / 100;

  return {
    aplica: true,
    requiereValorAsegurado: false,
    baseDeducible: 'valor_asegurable',
    valorAsegurado: va,
    porcentaje: pct,
    cantidadSMMLV: cant,
    valorSMMLV,
    anioSMMLV: anio,
    deduciblePorcentaje,
    deducibleSMMLV,
    deducibleAplicado,
    usaMinimo,
    texto,
  };
}

export function aplicarTipoLiquidadorEnLiquidacionBbvaCat(
  liquidacion = {},
  tipo,
  { forzarDeducible = false } = {}
) {
  const liq = liquidacion && typeof liquidacion === 'object' ? { ...liquidacion } : {};
  const cfgActual = liq.deducibleConfigPresupuesto || liq.deducibleConfig || {};
  const debePatch = forzarDeducible || pareceDeducibleGenericoCatastrofico(cfgActual);
  const cfgPres = debePatch
    ? patchDeducibleDesdeTipoBbvaCat(tipo, cfgActual)
    : {
        ...cfgActual,
        baseDeducible: cfgActual.baseDeducible || 'valor_asegurable',
      };
  const cfgCont = liq.deducibleConfigContenidos;
  const contenidosDefault =
    !cfgCont || pareceDeducibleGenericoCatastrofico(cfgCont)
      ? configDeducibleContenidosDefaultBbvaCat()
      : cfgCont;
  return {
    ...liq,
    deducibleConfig: { ...cfgPres },
    deducibleConfigPresupuesto: { ...cfgPres },
    deducibleConfigContenidos: contenidosDefault,
    deducible: cfgPres.texto,
  };
}
