/**
 * Deducible CAT terremoto Allianz: mayor entre 2% del valor asegurable y 3 SMMLV.
 * Zurich usa su propia regla (3% / 3 SMMLV) en liquidadorZurichHelpers.
 */
import { parsearNumero, formatearMonto as formatearMontoExpress } from '../SubcomponenteExpress/liquidadorExpressHelpers.js';
import { DEFAULT_DEDUCIBLE_CATASTROFICO } from '../SubcomponenteFormularioCatastrofico/catalogoPresupuestoCatastrofico.js';

export const REGLA_TERREMOTO_ALLIANZ = {
  porcentaje: 2,
  cantidadSMMLV: 3,
  modo: 'max_pct_minimo',
  tipoMinimo: 'SMMLV',
};

export const TEXTO_DEDUCIBLE_TERREMOTO_CAT =
  '2% del valor asegurable, mínimo 3 SMMLV (terremoto)';

export function pareceDeducibleGenericoCat(cfg = {}) {
  if (!cfg || typeof cfg !== 'object') return true;
  const pct = Number(cfg.porcentaje);
  const cant = Number(cfg.cantidadSMMLV);
  if (!Number.isFinite(pct) || !Number.isFinite(cant)) return true;
  if (cant === 4) return true;
  if (pct === 10) return true;
  // Port Zurich → Allianz: 3% no aplica aquí.
  if (pct === 3) return true;
  return cfg.porcentaje == null && cfg.cantidadSMMLV == null;
}

export function valorAseguradoPresupuestoCat(liquidador = {}) {
  const liq = liquidador.liquidacionCatastrofico || {};
  const enc = liquidador.encabezado || {};
  return (
    parsearNumero(enc.valorAseguradoInmueble) ||
    parsearNumero(liq.valorAsegurado) ||
    0
  );
}

export function valorAseguradoContenidosCat(liquidador = {}) {
  const enc = liquidador.encabezado || {};
  return parsearNumero(enc.valorAseguradoContenidos) || 0;
}

/**
 * Allianz: conserva la fórmula que escribió el usuario.
 * Si hay valor asegurable de inmueble, el % va sobre ese VA (tope: PDF o NSR).
 * Sin VA, cae a la pérdida para que el mínimo SMMLV sí aplique.
 */
export function configDeduciblePresupuestoParaCalculoAllianz(liquidador = {}) {
  const liq = liquidador.liquidacionCatastrofico || {};
  const va = valorAseguradoPresupuestoCat(liquidador);
  const guardado =
    liq.deducibleConfigPresupuesto && typeof liq.deducibleConfigPresupuesto === 'object'
      ? liq.deducibleConfigPresupuesto
      : null;
  const cfg = guardado
    ? { ...DEFAULT_DEDUCIBLE_CATASTROFICO, ...guardado }
    : configDeducibleTerremotoCat({}, { valorAsegurado: va });
  return {
    ...cfg,
    aplica: cfg.modo === 'no_aplica' ? false : cfg.aplica !== false,
    baseDeducible: va > 0 ? 'valor_asegurable' : cfg.baseDeducible || 'perdida',
  };
}

/** Equidad CAT reutiliza la misma fórmula CAT (2% / 3 SMMLV) del informe único. */
export const configDeduciblePresupuestoParaCalculoEquidadCat =
  configDeduciblePresupuestoParaCalculoAllianz;

export function configDeducibleTerremotoCat(cfgActual = {}, { valorAsegurado = 0 } = {}) {
  const va = Number(valorAsegurado) || 0;
  return {
    ...DEFAULT_DEDUCIBLE_CATASTROFICO,
    ...(cfgActual && typeof cfgActual === 'object' ? cfgActual : {}),
    aplica: true,
    modo: REGLA_TERREMOTO_ALLIANZ.modo,
    porcentaje: REGLA_TERREMOTO_ALLIANZ.porcentaje,
    cantidadSMMLV: REGLA_TERREMOTO_ALLIANZ.cantidadSMMLV,
    tipoMinimo: REGLA_TERREMOTO_ALLIANZ.tipoMinimo,
    baseDeducible: va > 0 ? 'valor_asegurable' : 'perdida',
    texto: TEXTO_DEDUCIBLE_TERREMOTO_CAT,
  };
}

export function aplicarDeducibleTerremotoEnLiquidacion(
  liquidacion = {},
  { valorAseguradoInmueble = 0, forzar = false } = {}
) {
  const liq = liquidacion && typeof liquidacion === 'object' ? { ...liquidacion } : {};
  const vaGuardado = parsearNumero(liq.valorAsegurado);
  const vaCaso = parsearNumero(valorAseguradoInmueble);
  const va = vaGuardado || vaCaso;
  if (!(vaGuardado > 0) && vaCaso > 0) {
    liq.valorAsegurado = vaCaso;
  }
  const cfgActual = liq.deducibleConfigPresupuesto || {};
  const yaEsTerremoto =
    Number(cfgActual.porcentaje) === REGLA_TERREMOTO_ALLIANZ.porcentaje &&
    Number(cfgActual.cantidadSMMLV) === REGLA_TERREMOTO_ALLIANZ.cantidadSMMLV;
  if (!forzar && !pareceDeducibleGenericoCat(cfgActual) && !yaEsTerremoto) {
    return liq;
  }
  const cfgPres = configDeducibleTerremotoCat(cfgActual, { valorAsegurado: va });
  return {
    ...liq,
    deducibleConfigPresupuesto: cfgPres,
    deducible: cfgPres.texto,
  };
}

export function migrarLiquidadorDeducibleTerremoto(
  liquidador = {},
  caso = {},
  { forzar = false } = {}
) {
  const liq = liquidador && typeof liquidador === 'object' ? liquidador : {};
  return {
    ...liq,
    liquidacionCatastrofico: aplicarDeducibleTerremotoEnLiquidacion(
      liq.liquidacionCatastrofico || {},
      {
        valorAseguradoInmueble:
          caso.valorAseguradoInmueble ?? liq.encabezado?.valorAseguradoInmueble,
        forzar,
      }
    ),
  };
}

export function configDeduciblePresupuestoParaCalculoTerremoto(liquidador = {}) {
  const liq = liquidador.liquidacionCatastrofico || {};
  const va = valorAseguradoPresupuestoCat(liquidador);
  return configDeducibleTerremotoCat(liq.deducibleConfigPresupuesto || {}, {
    valorAsegurado: va,
  });
}

export function desgloseDeducibleTerremoto(
  liquidador = {},
  diagrama = null,
  formatear = formatearMontoExpress
) {
  const diag = diagrama || {};
  const pres = diag.deduciblePresupuesto || {};
  const va = valorAseguradoPresupuestoCat(liquidador);
  const pct = Number(pres.porcentaje) || REGLA_TERREMOTO_ALLIANZ.porcentaje;
  const cant = Number(pres.cantidadSMMLV) || REGLA_TERREMOTO_ALLIANZ.cantidadSMMLV;
  const montoPct = Number(pres.montoPctOVa) || 0;
  const montoSmmlv = Number(pres.montoSmmlv) || 0;
  const aplicado = Number(pres.aplicado) || 0;
  const etiquetaPct = va > 0
    ? `${pct}% del valor asegurable`
    : `${pct}% (falta valor asegurable; se compara el mínimo)`;
  return {
    porcentaje: pct,
    cantidadSMMLV: cant,
    valorAsegurado: va,
    montoPct,
    montoSmmlv,
    aplicado,
    etiquetaPct,
    etiquetaSmmlv: `${cant} SMMLV`,
    etiquetaAplicado: 'Deducible terremoto aplicado (el mayor)',
    texto:
      `Terremoto: mayor entre ${etiquetaPct} ($${formatear(montoPct)}) y ${cant} SMMLV ($${formatear(montoSmmlv)}). Aplicado: $${formatear(aplicado)}.`,
  };
}
