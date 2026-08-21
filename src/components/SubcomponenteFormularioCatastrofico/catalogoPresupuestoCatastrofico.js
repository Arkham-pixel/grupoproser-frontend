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
  const valorSMMLV = parsearNumero(
    base.valorSMMLV != null && base.valorSMMLV !== ''
      ? base.valorSMMLV
      : smmlvResuelto.valor ?? SMMLV_DEFAULT
  );
  const valorSMDLV = parsearNumero(
    base.valorSMDLV != null && base.valorSMDLV !== ''
      ? base.valorSMDLV
      : valorSmdlvDesdeSmmlv(valorSMMLV)
  );
  const textoLegacy =
    typeof liquidacion?.deducible === 'string' ? liquidacion.deducible.trim() : '';
  return {
    ...base,
    aplica: true,
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
  const deducibleAplicadoBruto = Math.max(deduciblePorcentaje, deducibleMinimo);
  const aplica = true;
  const deducibleAplicado = Math.round(Math.min(deducibleAplicadoBruto, totalBase) * 100) / 100;
  const usaMinimo = deducibleMinimo > deduciblePorcentaje;
  const textoAuto = `${porcentaje}% · Mínimo ${
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
  };
}

export function calcularDiagramaLiquidacion({
  valorAsegurado = 0,
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
} = {}) {
  const va = Number(valorAsegurado) || 0;
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

  const calcCont = calcularDeducibleEstiloExpress(baseContenidos, cfgContenidos);
  const calcPres = calcularDeducibleEstiloExpress(basePresupuesto, cfgPresupuesto);
  const deducibleContenidosAplicado = calcCont.deducibleAplicado || 0;
  const deduciblePresupuestoAplicado = calcPres.deducibleAplicado || 0;
  const sumaDeducibles =
    Math.round((deducibleContenidosAplicado + deduciblePresupuestoAplicado) * 100) / 100;
  const presupuestoNeto = Math.max(0, basePresupuesto - deduciblePresupuestoAplicado);
  const contenidosNeto = Math.max(0, baseContenidos - deducibleContenidosAplicado);
  const sumaNeta = Math.round((presupuestoNeto + contenidosNeto) * 100) / 100;
  const totalIndemnizar = Math.round((sumaNeta + hospedaje) * 100) / 100;

  // Compat: campos “deducible*” apuntan a contenidos (histórico)
  return {
    valorAsegurado: va,
    danios,
    totalPresupuesto: presupuestoN,
    totalContenidos: contenidosN,
    baseDeducible: baseContenidos,
    baseDeduciblePresupuesto: basePresupuesto,
    gastosHospedaje: hospedaje,
    deducible: calcCont.texto,
    deducibleAplicado: deducibleContenidosAplicado,
    deduciblePorcentaje: calcCont.deduciblePorcentaje,
    deducibleSMMLV: calcCont.deducibleSMMLV,
    deducibleSMDLV: calcCont.deducibleSMDLV,
    deducibleUsaMinimo: calcCont.usaMinimo,
    deducibleTipoMinimo: calcCont.tipoMinimo,
    deducibleAplica: calcCont.aplica,
    deduciblePorcentajeCfg: calcCont.porcentaje,
    deducibleCantidadSMMLV: calcCont.cantidadSMMLV,
    deducibleCantidadSMDLV: calcCont.cantidadSMDLV,
    deducibleContenidos: {
      ...calcCont,
      aplicado: deducibleContenidosAplicado,
      neto: contenidosNeto,
    },
    deduciblePresupuesto: {
      ...calcPres,
      aplicado: deduciblePresupuestoAplicado,
      neto: presupuestoNeto,
    },
    sumaDeducibles,
    sumaNeta,
    totalIndemnizar,
  };
}
