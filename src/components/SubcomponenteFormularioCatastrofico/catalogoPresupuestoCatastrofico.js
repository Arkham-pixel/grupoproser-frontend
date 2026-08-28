/**
 * Catálogo / tarifario del presupuesto de daños (informe único / catastrófico).
 * Regla: el primer caso guardado en ciudad+ubicacionRiesgo fija unitarios del sitio;
 * los siguientes los heredan (editables). Sin referencia de sitio → catálogo base.
 * Cantidades y observaciones siguen por caso.
 */

import {
  ANIOS_SMMLV,
  DIAS_SMDLV,
  SMMLV_ANIO_MAS_RECIENTE,
  SMMLV_DEFAULT,
  SMMLV_POR_ANIO,
  numDeducible,
  parsearNumero,
  resolverSmmlvPorAnio,
  valorSmdlvDesdeSmmlv,
} from '../SubcomponenteExpress/liquidadorExpressHelpers.js';
import {
  filasOtrosAmparosActivos,
  sumarOtrosAmparos,
} from '../liquidacion/otrosAmparosLiquidacion.js';

const catalogoPorId = new Map();

export const CATALOGO_PRESUPUESTO_CATASTROFICO = [
  {
    id: 'aseo_general',
    actividad: 'ASEO GENERAL / M2',
    unidad: 'M2',
    valorUnitario: 10000,
    observacionDefault:
      'Procede por labores de retiro de lodo, sedimentos y residuos arrastrados por la inundación. Actividad indispensable para saneamiento inicial post-evento.',
  },
  {
    id: 'desmonte_aparato_sanitario',
    actividad: 'DESMONTE APARATO SANITARIO / UN',
    unidad: 'UN',
    valorUnitario: 25000,
    observacionDefault: '',
  },
  {
    id: 'desmonte_cielo_raso',
    actividad: 'DESMONTE CIELO RASO / M2',
    unidad: 'M2',
    valorUnitario: 8000,
    observacionDefault:
      'Procede por absorción de humedad y pérdida de estabilidad del material tras exposición prolongada a inundación.',
  },
  {
    id: 'desmonte_piso',
    actividad: 'DESMONTE DE PISO / M2',
    unidad: 'M2',
    valorUnitario: 13600,
    observacionDefault:
      'Se paga por pérdida de adherencia, levantamiento o contaminación estructural del acabado por saturación hídrica.',
  },
  {
    id: 'limpieza_pozo_septico',
    actividad: 'LIMPIEZA POZO SEPTICO',
    unidad: 'GLB',
    valorUnitario: 490000,
    observacionDefault: '',
  },
  {
    id: 'plantilla_concretos',
    actividad: 'PLANTILLA CONCRETOS / M2',
    unidad: 'M2',
    valorUnitario: 46000,
    observacionDefault:
      'La inundación prolongada produce saturación del estrato de apoyo; la reposición de la plantilla puede ser técnicamente procedente.',
  },
  {
    id: 'relleno',
    actividad: 'RELLENO / M3',
    unidad: 'M3',
    valorUnitario: 51000,
    observacionDefault: '',
  },
  {
    id: 'combo_sanitario',
    actividad: 'COMBO SANITARIO',
    unidad: 'UN',
    valorUnitario: 500000,
    observacionDefault: '',
  },
  {
    id: 'retiro_estuco',
    actividad: 'RETIRO Y APLICACIÓN DE ESTUCO',
    unidad: 'M2',
    valorUnitario: 25000,
    observacionDefault:
      'Procede por desprendimiento, fisuración y contaminación de superficies afectadas por humedad capilar.',
  },
  {
    id: 'pintura_muros_interior',
    actividad: 'PINTURA MUROS INTERIOR / M2 (3 MANOS)',
    unidad: 'M2',
    valorUnitario: 12000,
    observacionDefault:
      'Se reconoce por deterioro, manchas y proliferación biológica posterior a la inundación.',
  },
  {
    id: 'pintura_fachada',
    actividad: 'PINTURA FACHADA / M2 (3 MANOS)',
    unidad: 'M2',
    valorUnitario: 14000,
    observacionDefault:
      'Procede por marcas de nivel de agua, desprendimientos y deterioro superficial.',
  },
  {
    id: 'pintura_cielo_raso',
    actividad: 'PINTURA CIELO RASO / M2',
    unidad: 'M2',
    valorUnitario: 14000,
    observacionDefault:
      'Se paga por manchas, deformaciones y afectación por humedad acumulada.',
  },
  {
    id: 'piso_ceramico',
    actividad: 'PISO CERÁMICO + GUARDAESCOBA / M2',
    unidad: 'M2',
    valorUnitario: 55801,
    observacionDefault:
      'Procede cuando existe levantamiento, fractura o pérdida de adherencia por saturación.',
  },
  {
    id: 'cielo_raso',
    actividad: 'CIELO RASO / M2',
    unidad: 'M2',
    valorUnitario: 65500,
    observacionDefault:
      'Aplica en reposición total por pérdida estructural del elemento liviano.',
  },
  {
    id: 'salidas_electricas',
    actividad: 'SALIDAS ELÉCTRICAS (CABLEADO + TUBERÍA + PUNTO ELÉCTRICO)',
    unidad: 'UN',
    valorUnitario: 157900,
    observacionDefault:
      'Procede cuando hubo inmersión de redes, riesgo de cortocircuito o pérdida de aislamiento.',
  },
  {
    id: 'puerta_ppal',
    actividad: 'PUERTA PPAL 1-120',
    unidad: 'UN',
    valorUnitario: 900000,
    observacionDefault: '',
  },
  {
    id: 'puerta_alcoba',
    actividad: 'PUERTA ALCOBA 90',
    unidad: 'UN',
    valorUnitario: 450000,
    observacionDefault:
      'Procede por afectación de madera/MDF expuesta a agua prolongada.',
  },
  {
    id: 'puerta_bano',
    actividad: 'PUERTA BAÑO 70',
    unidad: 'UN',
    valorUnitario: 300000,
    observacionDefault:
      'Se paga cuando se evidencia deterioro irreversible por absorción de humedad.',
  },
  {
    id: 'carpinteria_interior',
    actividad: 'CARPINTERÍA INTERIOR (RH)',
    unidad: 'UN',
    valorUnitario: 550000,
    observacionDefault:
      'Procede si hubo hinchamiento o delaminación por contacto directo con agua.',
  },
  {
    id: 'carpinteria_premium',
    actividad: 'CARPINTERÍA PREMIUM MELAMINA / ML / CLOSET',
    unidad: 'ML',
    valorUnitario: 850000,
    observacionDefault:
      'Se reconoce cuando se compromete su estabilidad estructural y acabado.',
  },
  {
    id: 'pintura_exterior_metal',
    actividad: 'PINTURA EXTERIOR METAL',
    unidad: 'GLB',
    valorUnitario: 1200000,
    observacionDefault: 'Aplica si hubo oxidación acelerada posterior al evento.',
  },
  {
    id: 'pintura_interna_metal',
    actividad: 'PINTURA INTERNA METAL',
    unidad: 'UN',
    valorUnitario: 300000,
    observacionDefault: 'Procede por deterioro superficial y corrosión incipiente.',
  },
  {
    id: 'pintura_puertas_metalicas',
    actividad: 'PINTURA PUERTAS METÁLICAS',
    unidad: 'UN',
    valorUnitario: 300000,
    observacionDefault:
      'Se paga cuando el agua generó oxidación o desprendimiento del recubrimiento.',
  },
  {
    id: 'division_bano',
    actividad: 'DIVISIÓN DE BAÑO',
    unidad: 'UN',
    valorUnitario: 450000,
    observacionDefault: '',
  },
  {
    id: 'otros_costos',
    actividad: 'OTROS COSTOS',
    unidad: 'GLB',
    valorUnitario: 350000,
    observacionDefault: '',
  },
];

export const AIU_PORCENTAJE_DEFAULT = 0.2;
export const HOSPEDAJE_PORCENTAJE_DEFAULT = 0.01;

/** Deducible numérico al estilo Express (MAX % vs mínimo SMMLV/SMDLV). */
export const DEFAULT_DEDUCIBLE_CATASTROFICO = {
  aplica: true,
  /** max_pct_minimo | solo_porcentaje | solo_minimo | valor_fijo | no_aplica */
  modo: 'max_pct_minimo',
  valorFijo: 0,
  porcentaje: 10,
  tipoMinimo: 'SMMLV',
  cantidadSMMLV: 4,
  cantidadSMDLV: 10,
  anioSMMLV: SMMLV_ANIO_MAS_RECIENTE,
  valorSMMLV: SMMLV_DEFAULT,
  valorSMDLV: Math.round(SMMLV_DEFAULT / DIAS_SMDLV),
  texto: '',
};

export {
  ANIOS_SMMLV,
  SMMLV_POR_ANIO,
  SMMLV_ANIO_MAS_RECIENTE,
  SMMLV_DEFAULT,
  valorSmdlvDesdeSmmlv,
};

for (const item of CATALOGO_PRESUPUESTO_CATASTROFICO) {
  catalogoPorId.set(item.id, item);
}

export function esItemCatalogoCatastrofico(item) {
  return Boolean(item?.id && catalogoPorId.has(item.id));
}

export function obtenerItemCatalogoCatastrofico(id) {
  return catalogoPorId.get(id) || null;
}

/** Fija actividad, unidad y valor unitario según el tarifario catastrófico. */
export function fijarPreciosDesdeCatalogo(items = []) {
  return (items || []).map((item) => {
    const base = catalogoPorId.get(item?.id);
    if (!base) return item;
    return {
      ...item,
      actividad: base.actividad,
      unidad: base.unidad,
      valorUnitario: base.valorUnitario,
    };
  });
}

/** Normaliza texto para comparar ciudad / ubicación. */
export function normalizarTextoUbicacion(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Clave de sitio: ciudad + ubicacionRiesgo. Vacía si falta alguno. */
export function normalizarClaveUbicacionCatastrofico(ciudad, ubicacionRiesgo) {
  const c = normalizarTextoUbicacion(ciudad);
  const u = normalizarTextoUbicacion(ubicacionRiesgo);
  if (!c || !u) return '';
  return `${c}|${u}`;
}

export function claveUbicacionDesdeFormulario(datos = {}) {
  return normalizarClaveUbicacionCatastrofico(datos?.ciudad, datos?.ubicacionRiesgo);
}

/**
 * Copia valorUnitario (y actividad/unidad si vienen) desde itemsOrigen por id.
 * Conserva cantidad y observacion del destino.
 */
export function aplicarPreciosDesdeReferencia(itemsDestino = [], itemsOrigen = []) {
  const porId = new Map();
  (itemsOrigen || []).forEach((item) => {
    if (item?.id) porId.set(item.id, item);
  });
  return (itemsDestino || []).map((item) => {
    const ref = porId.get(item?.id);
    if (!ref) return item;
    return {
      ...item,
      valorUnitario: ref.valorUnitario ?? item.valorUnitario,
      ...(ref.actividad != null && ref.actividad !== '' ? { actividad: ref.actividad } : {}),
      ...(ref.unidad != null && ref.unidad !== '' ? { unidad: ref.unidad } : {}),
    };
  });
}

export function crearItemsPresupuestoDesdeCatalogo() {
  return CATALOGO_PRESUPUESTO_CATASTROFICO.map((item) => ({
    id: item.id,
    actividad: item.actividad,
    unidad: item.unidad,
    valorUnitario: item.valorUnitario,
    cantidad: 0,
    observacion: item.observacionDefault || '',
  }));
}

export function calcularValorFinalItem(item) {
  const vu = Number(item?.valorUnitario) || 0;
  const cant = Number(item?.cantidad) || 0;
  return Math.round(vu * cant * 100) / 100;
}

export function calcularResumenPresupuesto(items = [], aiuPorcentaje = AIU_PORCENTAJE_DEFAULT) {
  const costoDirecto = (items || []).reduce((acc, item) => acc + calcularValorFinalItem(item), 0);
  const aiu = Math.round(costoDirecto * (Number(aiuPorcentaje) || 0) * 100) / 100;
  const total = Math.round((costoDirecto + aiu) * 100) / 100;
  return { costoDirecto, aiu, total };
}

/** Normaliza liquidacion.deducible (string legacy) + deducibleConfig. */
export function normalizarDeducibleCatastrofico(liquidacion = {}) {
  const raw = liquidacion?.deducibleConfig;
  const base = {
    ...DEFAULT_DEDUCIBLE_CATASTROFICO,
    ...(raw && typeof raw === 'object' ? raw : {}),
  };
  const anioRef = Number(base.anioSMMLV) || SMMLV_ANIO_MAS_RECIENTE;
  const smmlvResuelto = resolverSmmlvPorAnio(anioRef);
  const valorSMMLV =
    base.valorSMMLV === ''
      ? 0
      : parsearNumero(
          base.valorSMMLV != null ? base.valorSMMLV : smmlvResuelto.valor ?? SMMLV_DEFAULT
        );
  const valorSMDLV =
    base.valorSMDLV === ''
      ? 0
      : parsearNumero(
          base.valorSMDLV != null && base.valorSMDLV !== ''
            ? base.valorSMDLV
            : valorSmdlvDesdeSmmlv(valorSMMLV)
        );
  const textoLegacy =
    typeof liquidacion?.deducible === 'string' ? liquidacion.deducible.trim() : '';
  const modo = ['solo_porcentaje', 'solo_minimo', 'valor_fijo', 'no_aplica'].includes(base.modo)
    ? base.modo
    : 'max_pct_minimo';
  return {
    ...base,
    aplica: modo !== 'no_aplica' && base.aplica !== false,
    modo,
    valorFijo: numDeducible(base.valorFijo, 0),
    porcentaje: numDeducible(base.porcentaje, 10),
    tipoMinimo: base.tipoMinimo === 'SMDLV' ? 'SMDLV' : 'SMMLV',
    cantidadSMMLV: numDeducible(base.cantidadSMMLV, 4),
    cantidadSMDLV: numDeducible(base.cantidadSMDLV, 10),
    anioSMMLV: smmlvResuelto.anio,
    valorSMMLV,
    valorSMDLV,
    texto: String(base.texto || '').trim() || textoLegacy,
  };
}

/**
 * Calcula deducible sobre una base (p. ej. suma completa / daños).
 * Misma regla Express: MAX(% de la base, mínimo SMMLV|SMDLV).
 */
export function calcularDeducibleEstiloExpress(base = 0, deducibleConfig = {}) {
  const cfg = {
    ...DEFAULT_DEDUCIBLE_CATASTROFICO,
    ...(deducibleConfig && typeof deducibleConfig === 'object' ? deducibleConfig : {}),
  };
  const totalBase = Number(base) || 0;
  const porcentaje = numDeducible(cfg.porcentaje, 10);
  const deduciblePorcentaje = totalBase * (porcentaje / 100);

  const anioRef = Number(cfg.anioSMMLV) || SMMLV_ANIO_MAS_RECIENTE;
  const smmlvResuelto = resolverSmmlvPorAnio(anioRef);
  const valorSMMLV = parsearNumero(
    cfg.valorSMMLV != null && cfg.valorSMMLV !== ''
      ? cfg.valorSMMLV
      : smmlvResuelto.valor ?? SMMLV_DEFAULT
  );
  const cantidadSMMLV = numDeducible(cfg.cantidadSMMLV, 4);
  const deducibleSMMLV = valorSMMLV * cantidadSMMLV;

  const valorSMDLV = parsearNumero(
    cfg.valorSMDLV != null && cfg.valorSMDLV !== ''
      ? cfg.valorSMDLV
      : valorSmdlvDesdeSmmlv(valorSMMLV)
  );
  const cantidadSMDLV = numDeducible(cfg.cantidadSMDLV, 10);
  const deducibleSMDLV = valorSMDLV * cantidadSMDLV;

  const tipoMinimo = cfg.tipoMinimo === 'SMDLV' ? 'SMDLV' : 'SMMLV';
  const deducibleMinimo = tipoMinimo === 'SMDLV' ? deducibleSMDLV : deducibleSMMLV;
  const modo = ['solo_porcentaje', 'solo_minimo', 'valor_fijo', 'no_aplica'].includes(cfg.modo)
    ? cfg.modo
    : 'max_pct_minimo';
  if (modo === 'no_aplica' || cfg.aplica === false) {
    return {
      aplica: false,
      totalBase,
      porcentaje,
      deduciblePorcentaje: 0,
      deducibleSMMLV: 0,
      deducibleSMDLV: 0,
      deducibleAplicado: 0,
      usaMinimo: false,
      tipoMinimo,
      cantidadSMMLV,
      cantidadSMDLV,
      valorSMMLV,
      valorSMDLV,
      anioSMMLV: smmlvResuelto.anio,
      texto: String(cfg.texto || '').trim() || 'No aplica',
      modo,
      valorFijo: 0,
    };
  }

  const valorFijo = numDeducible(cfg.valorFijo, 0);
  let deducibleAplicadoBruto = Math.max(deduciblePorcentaje, deducibleMinimo);
  if (modo === 'solo_porcentaje') deducibleAplicadoBruto = deduciblePorcentaje;
  else if (modo === 'solo_minimo') deducibleAplicadoBruto = deducibleMinimo;
  else if (modo === 'valor_fijo') deducibleAplicadoBruto = valorFijo;

  const aplica = true;
  const deducibleAplicado = Math.round(Math.min(deducibleAplicadoBruto, totalBase) * 100) / 100;
  const usaMinimo = modo === 'solo_minimo' || (modo === 'max_pct_minimo' && deducibleMinimo > deduciblePorcentaje);
  const textoAuto =
    modo === 'valor_fijo'
      ? `Valor fijo`
      : modo === 'solo_porcentaje'
        ? `${porcentaje}%`
        : modo === 'solo_minimo'
          ? `Mínimo ${tipoMinimo === 'SMDLV' ? cantidadSMDLV : cantidadSMMLV} ${tipoMinimo}`
          : `${porcentaje}% · Mínimo ${
              tipoMinimo === 'SMDLV' ? cantidadSMDLV : cantidadSMMLV
            } ${tipoMinimo}`;
  const texto = String(cfg.texto || '').trim() || textoAuto;

  return {
    aplica,
    totalBase,
    porcentaje,
    deduciblePorcentaje: Math.round(deduciblePorcentaje * 100) / 100,
    deducibleSMMLV: Math.round(deducibleSMMLV * 100) / 100,
    deducibleSMDLV: Math.round(deducibleSMDLV * 100) / 100,
    deducibleAplicado,
    usaMinimo,
    tipoMinimo,
    cantidadSMMLV,
    cantidadSMDLV,
    valorSMMLV,
    valorSMDLV,
    anioSMMLV: smmlvResuelto.anio,
    texto,
    modo,
    valorFijo: numDeducible(cfg.valorFijo, 0),
  };
}

function brutoDeducibleSinTope(calc = {}) {
  if (calc.modo === 'solo_porcentaje') return calc.deduciblePorcentaje || 0;
  if (calc.modo === 'solo_minimo') {
    return calc.tipoMinimo === 'SMDLV' ? calc.deducibleSMDLV || 0 : calc.deducibleSMMLV || 0;
  }
  if (calc.modo === 'valor_fijo') return calc.valorFijo || 0;
  const minimo =
    calc.tipoMinimo === 'SMDLV' ? calc.deducibleSMDLV || 0 : calc.deducibleSMMLV || 0;
  return Math.max(calc.deduciblePorcentaje || 0, minimo);
}

function redondearCopDeducible(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function montoMinimoDeducible(calc = {}) {
  return calc.tipoMinimo === 'SMDLV' ? calc.deducibleSMDLV || 0 : calc.deducibleSMMLV || 0;
}

/**
 * SMMLV/SMDLV y % sobre pérdida o valor asegurable.
 * Si hay cálculo por artículo, no se cuenta el deducible general: solo esa suma, con tope en la pérdida.
 */
export function aplicarMayorEntreSmmlvYPctOVa({
  calcGeneral = {},
  porArticulos = null,
  topePerdida = 0,
  forzarPorArticulo = false,
} = {}) {
  const noAplica = calcGeneral.modo === 'no_aplica' || calcGeneral.aplica === false;
  const artN = Number(porArticulos);
  const tieneArticulos =
    Boolean(forzarPorArticulo) ||
    (porArticulos != null &&
      porArticulos !== '' &&
      Number.isFinite(artN) &&
      artN > 0);
  const smmlv =
    noAplica || tieneArticulos ? 0 : montoMinimoDeducible(calcGeneral);
  const pctGeneral =
    noAplica || tieneArticulos ? 0 : calcGeneral.deduciblePorcentaje || 0;
  const montoPctOVa = tieneArticulos
    ? Number.isFinite(artN)
      ? artN
      : 0
    : pctGeneral;
  const bruto = Math.max(smmlv, montoPctOVa);
  const tope = Math.max(0, Number(topePerdida) || 0);
  const aplicado = redondearCopDeducible(Math.min(bruto, tope));
  const ganaSmmlv = !tieneArticulos && smmlv > montoPctOVa;
  const tipoMinimo = calcGeneral.tipoMinimo || 'SMMLV';
  const tipoGanador = tieneArticulos
    ? 'pct_va'
    : ganaSmmlv
      ? tipoMinimo
      : '%';
  const texto = tieneArticulos
    ? 'Cálculo por artículo: no se resta el deducible general (SMMLV / %)'
    : ganaSmmlv
      ? `Se aplica el mayor: ${tipoMinimo}`
      : 'Se aplica el mayor: % sobre pérdida o valor asegurable';
  return {
    montoSmmlv: redondearCopDeducible(smmlv),
    montoPctOVa: redondearCopDeducible(montoPctOVa),
    porArticulosMonto: tieneArticulos ? redondearCopDeducible(Number.isFinite(artN) ? artN : 0) : 0,
    tieneArticulos,
    aplicado,
    ganaSmmlv,
    tipoGanador,
    tipoGanadorLabel: tieneArticulos
      ? 'por artículo'
      : ganaSmmlv
        ? tipoMinimo
        : '%',
    texto,
    aplica: aplicado > 0,
  };
}

/**
 * Si baseDeducible = valor_asegurable, el % se calcula sobre el VA y se topea con la pérdida.
 * Sin VA no se aplica (evita caer al % de la pérdida).
 */
export function calcularDeducibleSobreBaseConfig(
  deducibleConfig = {},
  { perdida = 0, valorAsegurado = 0 } = {}
) {
  const cfg =
    deducibleConfig && typeof deducibleConfig === 'object' ? deducibleConfig : {};
  const usaVa = String(cfg.baseDeducible || '') === 'valor_asegurable';
  const perdidaN = Number(perdida) || 0;
  const va = Number(valorAsegurado) || 0;

  if (!usaVa) {
    return calcularDeducibleEstiloExpress(perdidaN, cfg);
  }
  if (!(va > 0)) {
    const calc = calcularDeducibleEstiloExpress(0, cfg);
    return {
      ...calc,
      aplica: false,
      deducibleAplicado: 0,
      requiereValorAsegurado: true,
      texto: String(cfg.texto || '').trim() || 'Indique el valor asegurado para calcular el deducible',
    };
  }

  const calc = calcularDeducibleEstiloExpress(va, cfg);
  const bruto = brutoDeducibleSinTope(calc);
  const deducibleAplicado =
    perdidaN > 0
      ? Math.round(Math.min(bruto, perdidaN) * 100) / 100
      : Math.round(bruto * 100) / 100;
  return {
    ...calc,
    deducibleAplicado,
    requiereValorAsegurado: false,
    usaMinimo: bruto > (calc.deduciblePorcentaje || 0),
  };
}

export function calcularDiagramaLiquidacion({
  valorAsegurado = 0,
  /** Si viene y es > 0, el % de contenidos va sobre este VA (no el del inmueble). */
  valorAseguradoContenidos = null,
  totalDanios = 0,
  totalPresupuesto = null,
  totalContenidos = null,
  /** @deprecated usar deducibleConfigContenidos; se mantiene por compat. */
  baseDeducible = null,
  hospedajePorcentaje = HOSPEDAJE_PORCENTAJE_DEFAULT,
  hospedajeManual = null,
  deducible = '',
  deducibleConfig = null,
  deducibleConfigContenidos = null,
  deducibleConfigPresupuesto = null,
  otrosAmparos = [],
  /** Suma por artículo (contenidos). Compite con SMMLV; se aplica el mayor. */
  deducibleContenidosPorArticulos = null,
  /** Suma por ítem (presupuesto). Compite con SMMLV; se aplica el mayor. */
  deduciblePresupuestoPorArticulos = null,
  usaDeduciblePorArticuloContenidos = false,
  usaDeduciblePorArticuloPresupuesto = false,
  /** Suma de (pérdida − deducible) por categoría. Si viene, sustituye total − deducible global. */
  contenidosNetoPorArticulo = null,
  presupuestoNetoPorArticulo = null,
} = {}) {
  const va = Number(valorAsegurado) || 0;
  const vaContN = Number(valorAseguradoContenidos);
  const vaCont = vaContN > 0 ? vaContN : va;
  const danios = Number(totalDanios) || 0;
  const presupuestoN =
    totalPresupuesto === null || totalPresupuesto === undefined || totalPresupuesto === ''
      ? null
      : Number(totalPresupuesto) || 0;
  const contenidosN =
    totalContenidos === null || totalContenidos === undefined || totalContenidos === ''
      ? null
      : Number(totalContenidos) || 0;
  const hospedaje =
    hospedajeManual !== null && hospedajeManual !== undefined && hospedajeManual !== ''
      ? Number(hospedajeManual) || 0
      : Math.round(va * (Number(hospedajePorcentaje) || 0));

  const cfgContenidos = normalizarDeducibleCatastrofico({
    deducible,
    deducibleConfig:
      deducibleConfigContenidos && typeof deducibleConfigContenidos === 'object'
        ? deducibleConfigContenidos
        : deducibleConfig && typeof deducibleConfig === 'object'
          ? deducibleConfig
          : typeof deducible === 'object' && deducible
            ? deducible
            : undefined,
  });
  const cfgPresupuesto = normalizarDeducibleCatastrofico({
    deducibleConfig:
      deducibleConfigPresupuesto && typeof deducibleConfigPresupuesto === 'object'
        ? deducibleConfigPresupuesto
        : undefined,
  });

  const baseContenidos =
    baseDeducible !== null && baseDeducible !== undefined && baseDeducible !== ''
      ? Number(baseDeducible) || 0
      : contenidosN != null
        ? contenidosN
        : 0;
  const basePresupuesto = presupuestoN != null ? presupuestoN : Math.max(0, danios - baseContenidos);

  const calcCont = calcularDeducibleSobreBaseConfig(cfgContenidos, {
    perdida: baseContenidos,
    valorAsegurado: vaCont,
  });
  const calcPres = calcularDeducibleSobreBaseConfig(cfgPresupuesto, {
    perdida: basePresupuesto,
    valorAsegurado: va,
  });
  const mayorCont = aplicarMayorEntreSmmlvYPctOVa({
    calcGeneral: calcCont,
    porArticulos: deducibleContenidosPorArticulos,
    topePerdida: baseContenidos,
    forzarPorArticulo: Boolean(usaDeduciblePorArticuloContenidos),
  });
  const mayorPres = aplicarMayorEntreSmmlvYPctOVa({
    calcGeneral: calcPres,
    porArticulos: deduciblePresupuestoPorArticulos,
    topePerdida: basePresupuesto,
    forzarPorArticulo: Boolean(usaDeduciblePorArticuloPresupuesto),
  });
  const usaDeduciblePorArticulo = mayorCont.tieneArticulos;
  const usaDeduciblePresupuestoPorArticulo = mayorPres.tieneArticulos;
  const netoArticuloCont = Number(contenidosNetoPorArticulo);
  const usarNetoArticuloCont =
    Boolean(usaDeduciblePorArticulo) &&
    contenidosNetoPorArticulo != null &&
    contenidosNetoPorArticulo !== '' &&
    Number.isFinite(netoArticuloCont);
  const netoArticuloPres = Number(presupuestoNetoPorArticulo);
  const usarNetoArticuloPres =
    Boolean(usaDeduciblePresupuestoPorArticulo) &&
    presupuestoNetoPorArticulo != null &&
    presupuestoNetoPorArticulo !== '' &&
    Number.isFinite(netoArticuloPres);
  const contenidosNeto = usarNetoArticuloCont
    ? Math.max(0, Math.round(netoArticuloCont * 100) / 100)
    : Math.max(0, baseContenidos - mayorCont.aplicado);
  const presupuestoNeto = usarNetoArticuloPres
    ? Math.max(0, Math.round(netoArticuloPres * 100) / 100)
    : Math.max(0, basePresupuesto - mayorPres.aplicado);
  const deducibleContenidosAplicado = usarNetoArticuloCont
    ? Math.round(Math.max(0, baseContenidos - contenidosNeto) * 100) / 100
    : mayorCont.aplicado;
  const deduciblePresupuestoAplicado = usarNetoArticuloPres
    ? Math.round(Math.max(0, basePresupuesto - presupuestoNeto) * 100) / 100
    : mayorPres.aplicado;
  const sumaDeducibles =
    Math.round((deducibleContenidosAplicado + deduciblePresupuestoAplicado) * 100) / 100;
  const sumaNeta = Math.round((presupuestoNeto + contenidosNeto) * 100) / 100;
  const totalOtrosAmparos = sumarOtrosAmparos(otrosAmparos);
  const indemnizacionPrincipal = Math.round((sumaNeta + hospedaje) * 100) / 100;
  const totalIndemnizar =
    Math.round((indemnizacionPrincipal + totalOtrosAmparos) * 100) / 100;

  // Compat: campos “deducible*” apuntan a contenidos (histórico)
  return {
    valorAsegurado: va,
    danios,
    totalPresupuesto: presupuestoN,
    totalContenidos: contenidosN,
    baseDeducible: baseContenidos,
    baseDeduciblePresupuesto: basePresupuesto,
    gastosHospedaje: hospedaje,
    deducible: mayorCont.texto,
    deducibleAplicado: deducibleContenidosAplicado,
    deduciblePorcentaje: mayorCont.montoPctOVa,
    deducibleSMMLV: mayorCont.montoSmmlv,
    deducibleSMDLV: calcCont.deducibleSMDLV,
    deducibleUsaMinimo: mayorCont.ganaSmmlv,
    deducibleTipoMinimo: calcCont.tipoMinimo,
    deducibleAplica: mayorCont.aplica,
    deduciblePorcentajeCfg: calcCont.porcentaje,
    deducibleCantidadSMMLV: calcCont.cantidadSMMLV,
    deducibleCantidadSMDLV: calcCont.cantidadSMDLV,
    deducibleContenidos: {
      ...calcCont,
      ...mayorCont,
      aplicado: deducibleContenidosAplicado,
      neto: contenidosNeto,
      porArticulos: usaDeduciblePorArticulo,
      usaMinimo: mayorCont.ganaSmmlv,
      texto: mayorCont.texto,
    },
    deduciblePresupuesto: {
      ...calcPres,
      ...mayorPres,
      aplicado: deduciblePresupuestoAplicado,
      neto: presupuestoNeto,
      porArticulos: usaDeduciblePresupuestoPorArticulo,
      usaMinimo: mayorPres.ganaSmmlv,
      texto: mayorPres.texto,
    },
    requiereValorAsegurado: Boolean(
      calcPres.requiereValorAsegurado || calcCont.requiereValorAsegurado
    ),
    sumaDeducibles,
    sumaNeta,
    indemnizacionPrincipal,
    totalOtrosAmparos,
    otrosAmparos: filasOtrosAmparosActivos(otrosAmparos),
    totalIndemnizar,
  };
}
