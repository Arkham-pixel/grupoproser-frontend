/**
 * Ítems fijos del liquidador express CAT.
 * Solo IDs de basePreciosPresupuesto.js (los más usados en casos < $50 M).
 */

export const TIPOS_RIESGO_EXPRESS = [
  { id: 'casa', label: 'Casa' },
  { id: 'apartamento', label: 'Apartamento' },
  { id: 'negocio', label: 'Negocio / local' },
];

/** Núcleo común: casa, apartamento y negocio. */
export const IDS_EXPRESS_CORE = [
  'bp_0011_DEMOLICION_REVOQUE_ESTUCO_Y_PINTURA_MUROS',
  'bp_0006_DEMOLICION_ESTUCO_Y_PINTURA_MUROS',
  'bp_0001_DEMOLICION_ENCHAPE_DE_PISO',
  'bp_0010_DEMOLICION_MURO',
  'bp_0007_DEMOLICION_GUARDAESCOBA',
  'bp_0017_DESMONTE_MARCOS_Y_PUERTAS',
  'bp_0018_DESMONTE_MUEBLE_MADERA',
  'bp_0013_DESMONTE_DE_APARATOS_SANITARIOS',
  'bp_0020_DESMONTE_VENTANA_EXISTENTE',
  'bp_0048_SELLADO_DE_GRIETAS_CON_MORTERO_DE_REPARACION',
  'bp_0049_SELLADO_Y_REPARACION_DE_GRIETAS_CON_GRAPA_METALI',
  'bp_0047_SELLADO_DE_FISURAS_CON_MASILLA_ELASTOMERICA',
  'bp_0307_RASQUETEADA_LIJADA_RESANE',
  'bp_0073_REPELLO_MURO_1_3',
  'bp_0305_ESTUCO_SOBRE_RESANE',
  'bp_0306_FILOS_DILATACIONES',
  'bp_0303_ESTUCO_PLASTICO_MURO_PASTA',
  'bp_0302_ESTUCO_PLASTICO_CIELO_PASTA',
  'bp_0311_VINILO_MURO_TIPO_1_3M',
  'bp_0313_VINILO_CIELO_TIPO_1_3M',
  'bp_0242_ALISTADO_PISO_4_CM',
  'bp_0254_CERAMICA_60_70_CM_X60_70_CM_TRAF_3_4',
  'bp_0294_GUARDAESCOBA_PORCELANATO_7X30CM',
  'bp_0450_COLOC_PUERTA_MADERA',
  'bp_0441_INSTALACION_APARATO_SANITARIO',
  'bp_0951_CARGUE_Y_RETIRO_DE_SOBRANTES',
  'bp_0934_LIMPIEZA_GENERAL',
  'bp_0937_LIMPIEZA_LAVADO_SUPERFICIE',
];

/** Extra negocio (está en la base; cielo falso / ladrillo farol no tienen desmonte equivalente). */
export const IDS_EXPRESS_NEGOCIO = ['bp_0014_DESMONTE_DE_CUBIERTA'];

export const FUENTE_EXPRESS = 'Liquidador express';

export function idsExpressPorTipo(tipo = 'casa') {
  const t = String(tipo || 'casa').toLowerCase();
  if (t === 'negocio') return [...IDS_EXPRESS_CORE, ...IDS_EXPRESS_NEGOCIO];
  return [...IDS_EXPRESS_CORE];
}

export function esIdExpress(catalogoId) {
  const id = String(catalogoId || '');
  return IDS_EXPRESS_CORE.includes(id) || IDS_EXPRESS_NEGOCIO.includes(id);
}
