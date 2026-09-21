import { DEFAULT_DEDUCIBLE_CATASTROFICO } from '../SubcomponenteFormularioCatastrofico/catalogoPresupuestoCatastrofico.js';
import {
  parsearNumero,
  resolverSmmlvPorAnio,
  valorSmdlvDesdeSmmlv,
} from '../SubcomponenteExpress/liquidadorExpressHelpers.js';

/**
 * Deducible por módulo CAT (el que ya usa el liquidador robusto).
 * Express no inventa otra fórmula: solo la deja visible y la aplica al presupuesto.
 */
export const REGLAS_DEDUCIBLE_CAT_EXPRESS = {
  zurich: {
    label: 'Zurich · terremoto',
    hint: 'Mayor entre 3% del valor asegurable y 3 SMMLV. Tope: la pérdida.',
    porcentaje: 3,
    cantidadSMMLV: 3,
    modo: 'max_pct_minimo',
    tipoMinimo: 'SMMLV',
    base: 'valor_asegurable',
    usaSid: false,
  },
  allianz: {
    label: 'Allianz · terremoto',
    hint: 'Mayor entre 2% del valor asegurable y 3 SMMLV. Tope: la pérdida.',
    porcentaje: 2,
    cantidadSMMLV: 3,
    modo: 'max_pct_minimo',
    tipoMinimo: 'SMMLV',
    base: 'valor_asegurable',
    usaSid: false,
  },
  sura: {
    label: 'Sura · terremoto',
    hint: 'Mayor entre 2% del valor asegurable y 3 SMMLV. Tope: la pérdida.',
    porcentaje: 2,
    cantidadSMMLV: 3,
    modo: 'max_pct_minimo',
    tipoMinimo: 'SMMLV',
    base: 'valor_asegurable',
    usaSid: false,
  },
  equidad: {
    label: 'Equidad CAT · terremoto',
    hint: 'Mayor entre 2% del valor asegurable y 3 SMMLV. Tope: la pérdida.',
    porcentaje: 2,
    cantidadSMMLV: 3,
    modo: 'max_pct_minimo',
    tipoMinimo: 'SMMLV',
    base: 'valor_asegurable',
    usaSid: false,
  },
  alfa: {
    label: 'Alfa · según tomador',
    hint: 'Por defecto 2% del valor SID y mínimo 2 SMMLV. El tomador/póliza puede cambiar la base.',
    porcentaje: 2,
    cantidadSMMLV: 2,
    modo: 'max_pct_minimo',
    tipoMinimo: 'SMMLV',
    base: 'valor_asegurable',
    usaSid: true,
  },
  previsora: {
    label: 'Previsora · póliza',
    hint: 'Se toma el deducible ya cargado en el caso. Si no hay, 10% / 4 SMMLV (editable).',
    porcentaje: DEFAULT_DEDUCIBLE_CATASTROFICO.porcentaje,
    cantidadSMMLV: DEFAULT_DEDUCIBLE_CATASTROFICO.cantidadSMMLV,
    modo: 'max_pct_minimo',
    tipoMinimo: 'SMMLV',
    base: 'valor_asegurable',
    usaSid: false,
  },
};

export function reglaDeducibleModulo(modulo = '') {
  return REGLAS_DEDUCIBLE_CAT_EXPRESS[String(modulo || '').toLowerCase()] || null;
}

export function valorAseguradoParaExpress(liquidador = {}, modulo = '') {
  const regla = reglaDeducibleModulo(modulo);
  const enc = liquidador.encabezado || {};
  const liq = liquidador.liquidacionCatastrofico || {};
  if (regla?.usaSid) {
    return (
      parsearNumero(enc.valorAseguradoSid) ||
      parsearNumero(liq.valorAsegurado) ||
      0
    );
  }
  return (
    parsearNumero(enc.valorAseguradoInmueble) ||
    parsearNumero(liq.valorAsegurado) ||
    0
  );
}

function cfgGuardado(liquidador = {}) {
  const liq = liquidador.liquidacionCatastrofico || {};
  return (
    (liq.deducibleConfigPresupuesto && typeof liq.deducibleConfigPresupuesto === 'object'
      ? liq.deducibleConfigPresupuesto
      : null) ||
    (liq.deducibleConfig && typeof liq.deducibleConfig === 'object' ? liq.deducibleConfig : null) ||
    {}
  );
}

function esGenerico(cfg = {}) {
  const pct = Number(cfg.porcentaje);
  const cant = Number(cfg.cantidadSMMLV);
  if (cfg.porcentaje == null && cfg.cantidadSMMLV == null) return true;
  if (!Number.isFinite(pct) || !Number.isFinite(cant)) return true;
  return pct === 10 && cant === 4;
}

export function configDeducibleExpress(liquidador = {}, modulo = '') {
  const regla = reglaDeducibleModulo(modulo);
  const guardado = cfgGuardado(liquidador);
  const va = valorAseguradoParaExpress(liquidador, modulo);
  if (!regla) {
    return {
      ...DEFAULT_DEDUCIBLE_CATASTROFICO,
      ...guardado,
      baseDeducible: va > 0 ? 'valor_asegurable' : 'perdida',
    };
  }
  const usarRegla =
    esGenerico(guardado) &&
    String(guardado.modo || '') !== 'valor_fijo' &&
    String(modulo).toLowerCase() !== 'previsora';
  const base = usarRegla
    ? {
        ...DEFAULT_DEDUCIBLE_CATASTROFICO,
        ...guardado,
        porcentaje: regla.porcentaje,
        cantidadSMMLV: regla.cantidadSMMLV,
        modo: regla.modo,
        tipoMinimo: regla.tipoMinimo,
        aplica: true,
      }
    : { ...DEFAULT_DEDUCIBLE_CATASTROFICO, ...guardado };
  const basePct = String(base.basePctDeducible || base.baseDeducible || '').trim();
  return {
    ...base,
    aplica: base.modo === 'no_aplica' ? false : base.aplica !== false,
    baseDeducible:
      basePct === 'perdida' || basePct === 'perdida_total'
        ? 'perdida'
        : va > 0
          ? 'valor_asegurable'
          : 'perdida',
    basePctDeducible:
      basePct === 'perdida' || basePct === 'perdida_total'
        ? 'perdida'
        : va > 0
          ? 'valor_asegurable'
          : 'perdida',
    texto:
      base.texto ||
      `${regla.porcentaje}% · mínimo ${regla.cantidadSMMLV} ${regla.tipoMinimo}`,
  };
}

export function patchDeducibleExpress(liquidador = {}, patch = {}, modulo = '') {
  const liq = liquidador.liquidacionCatastrofico || {};
  const actual = configDeducibleExpress(liquidador, modulo);
  const cfg = { ...actual, ...patch };
  if (patch.anioSMMLV != null) {
    const sm = resolverSmmlvPorAnio(patch.anioSMMLV);
    cfg.anioSMMLV = sm.anio;
    cfg.valorSMMLV = sm.valor;
    cfg.valorSMDLV = valorSmdlvDesdeSmmlv(sm.valor);
  }
  if (patch.modo === 'no_aplica') cfg.aplica = false;
  else if (patch.modo) cfg.aplica = true;
  if (patch.valorFijo != null) {
    cfg.valorFijo = patch.valorFijo;
    cfg.modo = 'valor_fijo';
    cfg.aplica = true;
  }
  const va = valorAseguradoParaExpress(liquidador, modulo);
  if (patch.basePctDeducible) {
    cfg.baseDeducible = patch.basePctDeducible;
    cfg.basePctDeducible = patch.basePctDeducible;
  } else if (va > 0 && !cfg.basePctDeducible) {
    cfg.baseDeducible = 'valor_asegurable';
    cfg.basePctDeducible = 'valor_asegurable';
  }
  const regla = reglaDeducibleModulo(modulo);
  if (cfg.modo === 'valor_fijo') {
    cfg.texto = 'Valor fijo';
  } else if (patch.porcentaje != null || patch.cantidadSMMLV != null || patch.modo != null) {
    cfg.texto =
      cfg.modo === 'no_aplica'
        ? 'No aplica'
        : `${cfg.porcentaje ?? regla?.porcentaje}% · mínimo ${
            cfg.cantidadSMMLV ?? regla?.cantidadSMMLV
          } ${cfg.tipoMinimo || 'SMMLV'}`;
  }
  return {
    ...liquidador,
    liquidacionCatastrofico: {
      ...liq,
      deducibleConfig: cfg,
      deducibleConfigPresupuesto: cfg,
      deducible: cfg.texto != null ? cfg.texto : liq.deducible,
    },
  };
}
