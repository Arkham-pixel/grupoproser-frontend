/**
 * Plantilla oficial de Control de Horas (todas las compañías).
 *
 * Amarillo = ítem fijo (actividad y horas bloqueadas; todos los siniestros).
 * El resto puede variar actividad/horas, eliminarse o ampliarse.
 *
 * Dos liquidadores (lista desplegable):
 * - preliminar: plantilla del Excel 19 sept (preliminar + final)
 * - unico: misma estructura fija; ítems de informe adaptados (el Excel único se refinará)
 */

export const TIPOS_LIQUIDADOR_CONTROL_HORAS = [
  { id: 'preliminar', etiqueta: 'Liquidador preliminar' },
  { id: 'unico', etiqueta: 'Liquidador único' },
];

export const TIPO_LIQUIDADOR_DEFAULT = 'preliminar';

export const TIPO_ITEM_FIJO = 'fijo';
export const TIPO_ITEM_VARIABLE = 'variable';
export const TIPO_ITEM_EXTRA = 'extra';

const normalizarActividad = (texto) =>
  String(texto || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const item = (def) => ({
  horas_viaje: 0,
  horas_campo: 0,
  horas_oficina: 0,
  horas_secretaria: 0,
  cargo: 'Ajustador',
  funcionarioDefault: '',
  ...def,
});

/** Ítems amarillos: actividad y horas fijas. Van en todo siniestro. */
export const ITEMS_FIJOS_CONTROL_HORAS = [
  item({
    id: 'recibo_back',
    grupo: 'inicio',
    tipo_item: TIPO_ITEM_FIJO,
    descripcion:
      'Recibo back de asignación, cargue documental en plataforma y coordinación de la inspección',
    funcionarioDefault: 'Nombre Gestor Documental',
    cargo: 'Ajustador',
    horas_oficina: 2,
    fechaDesde: 'asignacion',
  }),
  item({
    id: 'verificacion_poliza',
    grupo: 'inicio',
    tipo_item: TIPO_ITEM_FIJO,
    descripcion:
      'Verificación de póliza con condiciones particulares y condiciones generales que aplican a la misma.',
    funcionarioDefault: 'Nombre Ajustador',
    cargo: 'Ajustador',
    horas_oficina: 2,
    fechaDesde: 'asignacion',
    usaAjustador: true,
  }),
  item({
    id: 'soporte_sistema',
    grupo: 'cierre',
    tipo_item: TIPO_ITEM_FIJO,
    descripcion:
      'Soporte sistema, cargue de documentación en plataformas, envio de correo y otras labores',
    funcionarioDefault: 'Soporte Tecnico y sistemas',
    cargo: 'Ajustador',
    horas_oficina: 2.5,
    fechaDesde: 'asignacion',
  }),
];

/** Ítems que pueden variar actividad y horas; se pueden modificar o eliminar. */
export const ITEMS_VARIABLES_POR_TIPO = {
  preliminar: [
    item({
      id: 'inspeccion',
      tipo_item: TIPO_ITEM_VARIABLE,
      descripcion: 'Inspección',
      funcionarioDefault: 'Nombre Ajustador o Inspector',
      cargo: 'Ingeniero.',
      horas_viaje: 1,
      horas_campo: 2,
      fechaDesde: 'inspeccion',
      usaAjustador: true,
    }),
    item({
      id: 'informe_preliminar',
      tipo_item: TIPO_ITEM_VARIABLE,
      descripcion: 'Informe Preliminar',
      funcionarioDefault: 'Nombre Ajustador o Inspector',
      cargo: 'Ingeniero.',
      horas_oficina: 2.5,
      usaAjustador: true,
    }),
    item({
      id: 'verificacion_docs',
      tipo_item: TIPO_ITEM_VARIABLE,
      descripcion: 'Verificación documentos entregados por el asegurado',
      funcionarioDefault: 'Nombre Ajustador o Inspector',
      cargo: 'Ingeniero.',
      horas_oficina: 2,
      usaAjustador: true,
    }),
    item({
      id: 'analisis_informe_final',
      tipo_item: TIPO_ITEM_VARIABLE,
      descripcion: 'Análisis de cobertura e Informe Final',
      funcionarioDefault: 'Nombre Ajustador',
      cargo: 'Ingeniero.',
      horas_oficina: 2,
      usaAjustador: true,
    }),
    item({
      id: 'presentacion_cifras',
      tipo_item: TIPO_ITEM_VARIABLE,
      descripcion: 'Presentación de cifras',
      funcionarioDefault: 'Nombre Ajustador',
      cargo: 'Ingeniero.',
      horas_oficina: 1,
      usaAjustador: true,
    }),
  ],
  unico: [
    item({
      id: 'inspeccion',
      tipo_item: TIPO_ITEM_VARIABLE,
      descripcion: 'Inspección',
      funcionarioDefault: 'Nombre Ajustador o Inspector',
      cargo: 'Ingeniero.',
      horas_viaje: 1,
      horas_campo: 2,
      fechaDesde: 'inspeccion',
      usaAjustador: true,
    }),
    item({
      id: 'informe_unico',
      tipo_item: TIPO_ITEM_VARIABLE,
      descripcion: 'Informe Único',
      funcionarioDefault: 'Nombre Ajustador o Inspector',
      cargo: 'Ingeniero.',
      horas_oficina: 4,
      usaAjustador: true,
    }),
    item({
      id: 'verificacion_docs',
      tipo_item: TIPO_ITEM_VARIABLE,
      descripcion: 'Verificación documentos entregados por el asegurado',
      funcionarioDefault: 'Nombre Ajustador o Inspector',
      cargo: 'Ingeniero.',
      horas_oficina: 2,
      usaAjustador: true,
    }),
    item({
      id: 'presentacion_cifras',
      tipo_item: TIPO_ITEM_VARIABLE,
      descripcion: 'Presentación de cifras',
      funcionarioDefault: 'Nombre Ajustador',
      cargo: 'Ingeniero.',
      horas_oficina: 1,
      usaAjustador: true,
    }),
  ],
};

const INDICE_POR_ID = (() => {
  const mapa = new Map();
  ITEMS_FIJOS_CONTROL_HORAS.forEach((it) => mapa.set(it.id, it));
  Object.values(ITEMS_VARIABLES_POR_TIPO).forEach((lista) => {
    lista.forEach((it) => {
      if (!mapa.has(it.id)) mapa.set(it.id, it);
    });
  });
  return mapa;
})();

const INDICE_POR_DESCRIPCION = (() => {
  const mapa = new Map();
  const registrar = (it) => {
    mapa.set(normalizarActividad(it.descripcion), it);
  };
  ITEMS_FIJOS_CONTROL_HORAS.forEach(registrar);
  Object.values(ITEMS_VARIABLES_POR_TIPO).forEach((lista) => lista.forEach(registrar));
  // Alias del Excel (typo "Analis")
  mapa.set(normalizarActividad('Analis de cobertura e Informe Final'), INDICE_POR_ID.get('analisis_informe_final'));
  return mapa;
})();

export const normalizarTipoLiquidadorControlHoras = (valor, fallback = TIPO_LIQUIDADOR_DEFAULT) => {
  const t = String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (t === 'unico' || t === 'unica' || t === 'informe unico') return 'unico';
  if (t === 'preliminar' || t === 'preliminar y final' || t === 'final') return 'preliminar';
  return fallback;
};

export const itemsFijosControlHoras = () => ITEMS_FIJOS_CONTROL_HORAS;

export const itemsVariablesControlHoras = (tipo) => {
  const t = normalizarTipoLiquidadorControlHoras(tipo);
  return ITEMS_VARIABLES_POR_TIPO[t] || ITEMS_VARIABLES_POR_TIPO.preliminar;
};

export const plantillaItemsControlHoras = (tipo) => {
  const fijos = itemsFijosControlHoras();
  return [
    ...fijos.filter((it) => it.grupo === 'inicio'),
    ...itemsVariablesControlHoras(tipo),
    ...fijos.filter((it) => it.grupo === 'cierre'),
  ];
};

export const buscarItemCatalogoControlHoras = (fila = {}) => {
  if (fila.catalogo_id && INDICE_POR_ID.has(fila.catalogo_id)) {
    return INDICE_POR_ID.get(fila.catalogo_id);
  }
  const desc = normalizarActividad(fila.descripcion);
  if (desc && INDICE_POR_DESCRIPCION.has(desc)) {
    return INDICE_POR_DESCRIPCION.get(desc);
  }
  return null;
};

export const esFilaFijaControlHoras = (fila = {}) => {
  if (fila.fijo === true || fila.tipo_item === TIPO_ITEM_FIJO) return true;
  const cat = buscarItemCatalogoControlHoras(fila);
  return Boolean(cat && cat.tipo_item === TIPO_ITEM_FIJO);
};

const CAMPOS_HORAS_LIQUIDADOR = ['horas_viaje', 'horas_campo', 'horas_oficina', 'horas_secretaria'];

/** Si el liquidador trae horas (> 0) en esa columna, no se puede bajar de 1. */
export const minimoHorasCampoLiquidador = (fila = {}, campo) => {
  if (!CAMPOS_HORAS_LIQUIDADOR.includes(campo)) return 0;
  const cat = buscarItemCatalogoControlHoras(fila);
  if (!cat) return 0;
  const n = Number(cat[campo]);
  return Number.isFinite(n) && n > 0 ? 1 : 0;
};

export const limitarHorasCampoLiquidador = (fila = {}, campo, valor) => {
  const minimo = minimoHorasCampoLiquidador(fila, campo);
  if (valor === '' || valor === null || valor === undefined) {
    return minimo > 0 ? minimo : '';
  }
  const n = Number(valor);
  if (!Number.isFinite(n)) return minimo > 0 ? minimo : valor;
  if (minimo > 0 && n < minimo) return minimo;
  if (n < 0) return 0;
  return valor;
};

export const inferirTipoLiquidadorDesdeFilas = (filas = []) => {
  const textos = (filas || []).map((f) => normalizarActividad(f.descripcion));
  if (textos.some((t) => t.includes('INFORME UNICO'))) return 'unico';
  if (textos.some((t) => t.includes('INFORME PRELIMINAR') || t.includes('INFORME FINAL'))) {
    return 'preliminar';
  }
  return TIPO_LIQUIDADOR_DEFAULT;
};
