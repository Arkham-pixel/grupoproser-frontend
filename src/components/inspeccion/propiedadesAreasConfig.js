/** Parámetros predefinidos reutilizables por tipo de zona. */
export const CAMPOS_AREA = {
  estandar: [
    { name: 'Muros', key: 'muros' },
    { name: 'Pintura y/o estuco', key: 'pintura' },
    { name: 'Pisos', key: 'pisos' },
    { name: 'Ventanería y puertas', key: 'ventanas' },
    { name: 'Salidas eléctricas', key: 'salidasElectricas' },
    { name: 'Aseo', key: 'aseo' },
  ],
  cocina: [
    { name: 'Muros', key: 'muros' },
    { name: 'Pintura y/o estuco', key: 'pintura' },
    { name: 'Pisos', key: 'pisos' },
    { name: 'Ventanería y puertas de vidrio', key: 'ventanas' },
    { name: 'Mesones', key: 'mesones' },
    { name: 'Aparatos de cocina y zona de ropas', key: 'aparatos' },
    { name: 'Aparatos eléctricos', key: 'aparatosElectricos' },
    { name: 'Salidas hidráulicas y de gas', key: 'salidasHidraulicas' },
    { name: 'Salidas eléctricas', key: 'salidasElectricas' },
    { name: 'Aseo', key: 'aseo' },
    { name: 'Carpintería de madera', key: 'carpinteria' },
  ],
  ropas: [
    { name: 'Muros', key: 'muros' },
    { name: 'Pintura y/o estuco', key: 'pintura' },
    { name: 'Pisos', key: 'pisos' },
    { name: 'Ventanería y puertas de vidrio', key: 'ventanas' },
    { name: 'Aparatos eléctricos', key: 'aparatosElectricos' },
    { name: 'Salidas hidráulicas y de gas', key: 'salidasHidraulicas' },
    { name: 'Salidas eléctricas', key: 'salidasElectricas' },
    { name: 'Aseo', key: 'aseo' },
    { name: 'Carpintería de madera', key: 'carpinteria' },
  ],
  sala: [
    { name: 'Muros', key: 'muros' },
    { name: 'Pintura y/o estuco', key: 'pintura' },
    { name: 'Pisos', key: 'pisos' },
    { name: 'Ventanería y puertas de vidrio', key: 'ventanas' },
    { name: 'Kit de AA', key: 'kitAA' },
    { name: 'Carpintería metálica', key: 'carpinteriaMetalica' },
    { name: 'Salidas eléctricas', key: 'salidasElectricas' },
    { name: 'Aseo', key: 'aseo' },
  ],
  banio: [
    { name: 'Muros', key: 'muros' },
    { name: 'Pintura y/o estuco', key: 'pintura' },
    { name: 'Pisos', key: 'pisos' },
    { name: 'Ventanería y puertas de vidrio', key: 'ventanas' },
    { name: 'Enchapes', key: 'enchapes' },
    { name: 'Salidas hidráulicas y de gas', key: 'salidasHidraulicas' },
    { name: 'Salidas eléctricas', key: 'salidasElectricas' },
    { name: 'Aseo', key: 'aseo' },
    { name: 'Incrustaciones', key: 'incrustaciones' },
    { name: 'Carpintería de madera', key: 'carpinteria' },
  ],
  alcoba: [
    { name: 'Muros', key: 'muros' },
    { name: 'Pintura y/o estuco', key: 'pintura' },
    { name: 'Pisos', key: 'pisos' },
    { name: 'Enchapes', key: 'enchapes' },
    { name: 'Salidas eléctricas', key: 'salidasElectricas' },
    { name: 'Aseo', key: 'aseo' },
    { name: 'Carpintería de madera', key: 'carpinteria' },
  ],
  closet: [
    { name: 'Puertas del closet', key: 'puertasCloset' },
    { name: 'Interior del closet', key: 'interiorCloset' },
    { name: 'Estanterías', key: 'estanterias' },
    { name: 'Barras colgadoras', key: 'barrasColgadoras' },
    { name: 'Cajones', key: 'cajones' },
    { name: 'Pisos', key: 'pisos' },
    { name: 'Pintura y/o estuco', key: 'pintura' },
    { name: 'Iluminación interna', key: 'iluminacionInterna' },
    { name: 'Ventilación', key: 'ventilacion' },
    { name: 'Herrajes y accesorios', key: 'herrajesAccesorios' },
    { name: 'Carpintería de madera', key: 'carpinteria' },
  ],
  oficina: [
    { name: 'Muros y divisiones', key: 'muros' },
    { name: 'Pisos y alfombras', key: 'pisos' },
    { name: 'Cielo raso', key: 'cieloRaso' },
    { name: 'Iluminación', key: 'iluminacion' },
    { name: 'Salidas eléctricas y datos', key: 'salidasElectricas' },
    { name: 'Mobiliario fijo', key: 'mobiliario' },
    { name: 'Aseo', key: 'aseo' },
  ],
  comercial: [
    { name: 'Muros y divisiones', key: 'muros' },
    { name: 'Pisos', key: 'pisos' },
    { name: 'Fachada y vitrinas', key: 'fachada' },
    { name: 'Iluminación comercial', key: 'iluminacion' },
    { name: 'Salidas eléctricas', key: 'salidasElectricas' },
    { name: 'Aseo', key: 'aseo' },
  ],
  industrial: [
    { name: 'Estructura y cerramiento', key: 'estructura' },
    { name: 'Pisos industriales', key: 'pisos' },
    { name: 'Iluminación', key: 'iluminacion' },
    { name: 'Instalaciones eléctricas', key: 'salidasElectricas' },
    { name: 'Instalaciones hidráulicas', key: 'salidasHidraulicas' },
    { name: 'Ventilación y extracción', key: 'ventilacion' },
    { name: 'Señalización y seguridad', key: 'senalizacion' },
    { name: 'Aseo', key: 'aseo' },
  ],
  exterior: [
    { name: 'Fachada', key: 'fachada' },
    { name: 'Accesos y puertas', key: 'accesos' },
    { name: 'Ventanería exterior', key: 'ventanas' },
    { name: 'Impermeabilización', key: 'impermeabilizacion' },
    { name: 'Señalización', key: 'senalizacion' },
    { name: 'Aseo', key: 'aseo' },
  ],
  equipos: [
    { name: 'Estado general', key: 'estadoGeneral' },
    { name: 'Funcionamiento', key: 'funcionamiento' },
    { name: 'Seguridad', key: 'seguridad' },
    { name: 'Mantenimiento', key: 'mantenimiento' },
    { name: 'Observaciones técnicas', key: 'observaciones' },
  ],
  cocineta: [
    { name: 'Muros y enchapes', key: 'muros' },
    { name: 'Pisos', key: 'pisos' },
    { name: 'Mesón / barra', key: 'mesones' },
    { name: 'Nevera / microondas', key: 'electrodomesticos' },
    { name: 'Salidas eléctricas', key: 'salidasElectricas' },
    { name: 'Salidas hidráulicas', key: 'salidasHidraulicas' },
    { name: 'Aseo', key: 'aseo' },
  ],
};

function area(id, titulo, camposKey, extra = {}) {
  return {
    id,
    titulo,
    campos: CAMPOS_AREA[camposKey] || CAMPOS_AREA.estandar,
    tipo: 'simple',
    ...extra,
  };
}

function bloqueAlcobas() {
  return { id: 'alcobas', titulo: 'ALCOBAS', tipo: 'alcobas', campos: CAMPOS_AREA.alcoba };
}

/** Plantilla residencial (casa, apartamento, etc.). */
export const PLANTILLA_RESIDENCIAL = [
  area('cocina', 'Cocina', 'cocina'),
  area('ropas', 'Zona de ropas', 'ropas'),
  area('sala', 'Sala de estar', 'sala'),
  area('banioSocial', 'Baño social', 'banio'),
  bloqueAlcobas(),
];

export const PLANTILLA_OFICINA = [
  area('recepcion', 'Recepción y área de espera', 'oficina'),
  area('areaTrabajo', 'Área de trabajo / cubículos', 'oficina'),
  area('salaJuntas', 'Sala de juntas', 'oficina'),
  area('banios', 'Baños', 'banio'),
  area('cocineta', 'Cocineta / zona de café', 'cocineta'),
  area('archivo', 'Archivo y bodega documental', 'estandar'),
  area('sistemas', 'Instalaciones eléctricas, datos y HVAC', 'equipos'),
  area('fachada', 'Fachada y accesos', 'exterior'),
];

export const PLANTILLA_CONSULTORIO = [
  area('recepcion', 'Recepción', 'oficina'),
  area('salaEspera', 'Sala de espera', 'estandar'),
  area('consultorio', 'Consultorio / sala de atención', 'oficina'),
  area('banios', 'Baños', 'banio'),
  area('equiposMedicos', 'Equipos médicos', 'equipos'),
  area('fachada', 'Fachada y accesos', 'exterior'),
];

export const PLANTILLA_LOCAL_COMERCIAL = [
  area('areaVentas', 'Área de ventas', 'comercial'),
  area('bodega', 'Bodega / almacén', 'estandar'),
  area('banios', 'Baños', 'banio'),
  area('vitrina', 'Vitrina y escaparate', 'comercial'),
  area('fachada', 'Fachada y accesos', 'exterior'),
];

export const PLANTILLA_BODEGA_COMERCIAL = [
  area('areaAlmacenamiento', 'Área de almacenamiento', 'industrial'),
  area('muelleCarga', 'Muelle / zona de carga', 'industrial'),
  area('oficinaAdmin', 'Oficina administrativa', 'oficina'),
  area('banios', 'Baños', 'banio'),
  area('fachada', 'Fachada y accesos', 'exterior'),
];

export const PLANTILLA_LOCAL_CC = [
  area('areaVentas', 'Área de ventas', 'comercial'),
  area('bodega', 'Bodega', 'estandar'),
  area('banios', 'Baños', 'banio'),
  area('accesosComunes', 'Accesos y áreas comunes del centro comercial', 'exterior'),
];

export const PLANTILLA_INDUSTRIAL = [
  area('areaOperativa', 'Área operativa / producción', 'industrial'),
  area('bodegaAlmacen', 'Bodega y almacenamiento', 'industrial'),
  area('oficinasAdmin', 'Oficinas administrativas', 'oficina'),
  area('baniosVestieres', 'Baños y vestieres', 'banio'),
  area('sistemasInstalaciones', 'Sistemas e instalaciones', 'equipos'),
  area('maquinariaEquipos', 'Maquinaria y equipos', 'equipos'),
  area('fachadaCerramiento', 'Fachada y cerramiento', 'exterior'),
];

export const PLANTILLA_MIXTO_EDIFICIO = [
  area('areasComunes', 'Áreas comunes', 'estandar'),
  area('localesComerciales', 'Locales comerciales', 'comercial'),
  area('oficinas', 'Oficinas', 'oficina'),
  area('parqueaderos', 'Parqueaderos', 'exterior'),
  area('banios', 'Baños', 'banio'),
  area('fachada', 'Fachada', 'exterior'),
];

export const PLANTILLA_MIXTO_CASA_LOCAL = [
  ...PLANTILLA_RESIDENCIAL.filter((a) => a.id !== 'alcobas'),
  area('localComercial', 'Local comercial', 'comercial'),
  bloqueAlcobas(),
];

export const PLANTILLA_MIXTO_APTO_OFICINA = [
  area('sala', 'Sala / área social', 'sala'),
  area('cocina', 'Cocina', 'cocina'),
  area('banioSocial', 'Baño', 'banio'),
  bloqueAlcobas(),
  area('oficinaHogar', 'Oficina en el inmueble', 'oficina'),
];

export const PLANTILLA_INST_EDUCATIVO = [
  area('aulas', 'Aulas y salones', 'estandar'),
  area('biblioteca', 'Biblioteca / sala de estudio', 'estandar'),
  area('administracion', 'Administración', 'oficina'),
  area('cocinaComedor', 'Cocina y comedor', 'cocina'),
  area('banios', 'Baños', 'banio'),
  area('circulaciones', 'Circulaciones y escaleras', 'estandar'),
  area('zonasDeportivas', 'Zonas deportivas / recreativas', 'exterior'),
  area('fachada', 'Fachada y accesos', 'exterior'),
];

export const PLANTILLA_INST_SALUD = [
  area('consultorios', 'Consultorios', 'oficina'),
  area('urgencias', 'Urgencias / triage', 'estandar'),
  area('salasEspera', 'Salas de espera', 'estandar'),
  area('banios', 'Baños', 'banio'),
  area('equiposMedicos', 'Equipos médicos', 'equipos'),
  area('circulaciones', 'Circulaciones', 'estandar'),
  area('fachada', 'Fachada y accesos', 'exterior'),
];

export const PLANTILLA_INST_RELIGIOSO = [
  area('salonPrincipal', 'Salón principal / templo', 'estandar'),
  area('oficinas', 'Oficinas y salas auxiliares', 'oficina'),
  area('banios', 'Baños', 'banio'),
  area('fachada', 'Fachada y accesos', 'exterior'),
];

export const PLANTILLA_INST_GUBERNAMENTAL = [
  area('oficinas', 'Oficinas', 'oficina'),
  area('salasAtencion', 'Salas de atención al público', 'estandar'),
  area('archivo', 'Archivo', 'estandar'),
  area('banios', 'Baños', 'banio'),
  area('fachada', 'Fachada y accesos', 'exterior'),
];

export const PLANTILLA_INST_OTRO = [
  area('areasGenerales', 'Áreas generales', 'estandar'),
  area('banios', 'Baños', 'banio'),
  area('circulaciones', 'Circulaciones', 'estandar'),
  area('fachada', 'Fachada y accesos', 'exterior'),
];

/** Mapa clase + tipo → plantilla de áreas. */
const PLANTILLAS_ESPECIFICAS = {
  'Comercial::Oficina': PLANTILLA_OFICINA,
  'Comercial::Consultorio': PLANTILLA_CONSULTORIO,
  'Comercial::Local comercial': PLANTILLA_LOCAL_COMERCIAL,
  'Comercial::Bodega comercial': PLANTILLA_BODEGA_COMERCIAL,
  'Comercial::Local en centro comercial': PLANTILLA_LOCAL_CC,
  'Industrial::Bodega industrial': PLANTILLA_INDUSTRIAL,
  'Industrial::Nave industrial': PLANTILLA_INDUSTRIAL,
  'Industrial::Planta industrial': PLANTILLA_INDUSTRIAL,
  'Industrial::Taller': PLANTILLA_INDUSTRIAL,
  'Mixto::Edificio mixto': PLANTILLA_MIXTO_EDIFICIO,
  'Mixto::Casa con local comercial': PLANTILLA_MIXTO_CASA_LOCAL,
  'Mixto::Apartamento con oficina': PLANTILLA_MIXTO_APTO_OFICINA,
  'Institucional::Edificio educativo': PLANTILLA_INST_EDUCATIVO,
  'Institucional::Edificio de salud': PLANTILLA_INST_SALUD,
  'Institucional::Edificio religioso': PLANTILLA_INST_RELIGIOSO,
  'Institucional::Edificio gubernamental': PLANTILLA_INST_GUBERNAMENTAL,
  'Institucional::Otro institucional': PLANTILLA_INST_OTRO,
};

const PLANTILLAS_POR_CLASE = {
  Residencial: PLANTILLA_RESIDENCIAL,
  Comercial: PLANTILLA_LOCAL_COMERCIAL,
  Industrial: PLANTILLA_INDUSTRIAL,
  Mixto: PLANTILLA_MIXTO_EDIFICIO,
  Institucional: PLANTILLA_INST_OTRO,
};

export function clavePlantillaAreas(clase, tipo) {
  if (!clase) return '';
  if (tipo) return `${clase}::${tipo}`;
  return clase;
}

export function resolverPlantillaAreas(clase, tipo) {
  if (!clase) return [...PLANTILLA_RESIDENCIAL];
  const clave = clavePlantillaAreas(clase, tipo);
  if (tipo && PLANTILLAS_ESPECIFICAS[clave]) {
    return PLANTILLAS_ESPECIFICAS[clave].map((a) => ({ ...a, campos: [...(a.campos || [])] }));
  }
  const porClase = PLANTILLAS_POR_CLASE[clase] || PLANTILLA_RESIDENCIAL;
  return porClase.map((a) => ({ ...a, campos: [...(a.campos || [])] }));
}

const TODAS_LAS_PLANTILLAS = [
  PLANTILLA_RESIDENCIAL,
  PLANTILLA_OFICINA,
  PLANTILLA_CONSULTORIO,
  PLANTILLA_LOCAL_COMERCIAL,
  PLANTILLA_BODEGA_COMERCIAL,
  PLANTILLA_LOCAL_CC,
  PLANTILLA_INDUSTRIAL,
  PLANTILLA_MIXTO_EDIFICIO,
  PLANTILLA_MIXTO_CASA_LOCAL,
  PLANTILLA_MIXTO_APTO_OFICINA,
  PLANTILLA_INST_EDUCATIVO,
  PLANTILLA_INST_SALUD,
  PLANTILLA_INST_RELIGIOSO,
  PLANTILLA_INST_GUBERNAMENTAL,
  PLANTILLA_INST_OTRO,
];

/** Títulos legibles por id de área (fallback si no hay plantilla en contexto). */
export const TITULOS_AREA_POR_ID = (() => {
  const map = {
    alcoba: 'Alcoba',
    banoAlcoba: 'Baño de alcoba',
    closetAlcoba: 'Closet de alcoba',
    banoPrincipal: 'Baño principal',
    banioSocial: 'Baño social',
    cocina: 'Cocina',
    ropas: 'Zona de ropas',
    sala: 'Sala de estar',
    alcobas: 'Alcobas',
  };
  for (const plantilla of TODAS_LAS_PLANTILLAS) {
    for (const a of plantilla) {
      if (a.tipo === 'alcobas') {
        map.alcobas = a.titulo;
      } else if (a.id) {
        map[a.id] = a.titulo;
      }
    }
  }
  return map;
})();

function humanizarIdArea(areaId) {
  if (TITULOS_AREA_POR_ID[areaId]) return TITULOS_AREA_POR_ID[areaId];
  const texto = String(areaId)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/banio/gi, 'baño')
    .trim();
  if (!texto) return areaId;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** IDs de áreas simples (sin alcobas) para índice y secciones activas. */
export function idsAreasDesdePlantilla(plantilla) {
  return plantilla.flatMap((a) => (a.tipo === 'alcobas' ? ['alcobas'] : [a.id]));
}

export function subIndicesDesdePlantilla(plantilla) {
  return plantilla.map((a) => ({
    id: a.tipo === 'alcobas' ? 'alcobas' : a.id,
    titulo: a.titulo.toUpperCase(),
  }));
}

export function obtenerCamposArea(areaId, plantilla) {
  if (areaId === 'banoAlcoba' || areaId === 'banoPrincipal') return CAMPOS_AREA.banio;
  if (areaId === 'closetAlcoba') return CAMPOS_AREA.closet;
  if (areaId === 'alcoba') return CAMPOS_AREA.alcoba;
  const cfg = plantilla?.find((a) => a.id === areaId);
  return cfg?.campos || CAMPOS_AREA.estandar;
}

export function tituloArea(areaId, plantilla, alcobaNum = null) {
  if (areaId === 'alcoba' && alcobaNum) return `Alcoba ${alcobaNum}`;
  if (areaId === 'banoAlcoba' && alcobaNum) return `Baño — Alcoba ${alcobaNum}`;
  if (areaId === 'closetAlcoba' && alcobaNum) return `Closet — Alcoba ${alcobaNum}`;
  const cfg = plantilla?.find((a) => a.id === areaId);
  if (cfg?.titulo) return cfg.titulo;
  return humanizarIdArea(areaId);
}

/** Compatibilidad: mapa plano id → campos (residencial + comunes). */
export const CAMPOS_BASE_LEGACY = {
  cocina: CAMPOS_AREA.cocina,
  ropas: CAMPOS_AREA.ropas,
  sala: CAMPOS_AREA.sala,
  banioSocial: CAMPOS_AREA.banio,
  banoPrincipal: CAMPOS_AREA.banio,
  alcoba: CAMPOS_AREA.alcoba,
  closet: CAMPOS_AREA.closet,
};
