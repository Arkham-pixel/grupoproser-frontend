export const BUQUE_VACIO = {
  origen: '',
  puertoEmbarque: '',
  puertoDescargue: '',
  nombre: '',
  bandera: '',
  tipoBuque: '',
  imo: '',
  tonelajeBruto: '',
  pesoMuerto: '',
  esloraManga: '',
  anioConstruccion: '',
  fechaArribo: '',
  imagenBuque: null,
};

export const INFORME_EXPORTACION_VACIO = {
  proposito: '',
  introduccion: '',
  buque: { ...BUQUE_VACIO },
  lineasMercancia: [],
  contenidoCajasNota: '',
  imagenesContenidoCajas: [],
  imagenesContenedoresMercancia: [],
  imagenesVehiculosMercancia: [],
  /** @deprecated usar imagenesContenedoresMercancia + imagenesVehiculosMercancia */
  imagenesRegistroMercancia: [],
  imagenesRegistroInicialSupervision: [],
  condicionCargaTexto: '',
  imagenesCondicionCarga: [],
  inspeccionArriboIntro: '',
  inspeccionArriboPuntos: [],
  imagenesInspeccionArribo: [],
  equiposOperacionIntro: '',
  equiposOperacionPuntos: [],
  imagenesEquiposOperacion: [],
  condicionesMeteoTexto: '',
  imagenesCondicionesMeteo: [],
  seguimiento: [],
  comentariosSupervision: '',
  conclusionesTexto: '',
  conclusionesPuntos: [],
  registrosFotograficosContenedores: [],
};

export const ESTADO_INICIAL_CASO_EXPORTACION = {
  consecutivo: '',
  numeroSolicitud: '',
  creadoPor: '',
  emailCreador: '',
  fechaInforme: '',
  departamentoInforme: 'Departamento de Ingeniería y Control de Riesgos',

  codiRespnsble: '',
  nombreResponsable: '',
  codiAsgrdra: '',
  nombreAseguradora: '',
  funcAsgrdraNombre: '',
  asgrBenfcro: '',
  actividad: '',
  descripcionEstado: '',
  ciudadRiesgo: '',
  laborRealizada: 'INSPECCIÓN DE CARGA – LLENADO DE CONTENEDORES EXPORTACIÓN',
  lugar: '',
  observacionesPendientes: '',

  fchaAsgncion: '',
  fchaContIni: '',
  fchaCoordInspeccion: '',
  fchaProgInspeccion: '',
  fchaInspccion: '',
  fchaInfoFnal: '',
  fchaFactra: '',
  obseContIni: '',
  obseCoordInspeccion: '',
  obseInspccion: '',
  obseInfoFnal: '',
  obseSegmnto: '',
  historialDocs: [],

  informeExportacion: { ...INFORME_EXPORTACION_VACIO, buque: { ...BUQUE_VACIO } },
};

export function nuevaLineaMercancia() {
  return {
    id: Date.now() + Math.random(),
    numContenedores: '',
    bl: '',
    producto: '',
    cantidad: '',
    tipoCarga: '',
    destino: '',
    paisDestino: '',
  };
}

export function nuevoContenedorSeguimiento() {
  return {
    id: Date.now() + Math.random(),
    cantidad: '',
    tipoContenedor: "1 x 40'",
    numeroContenedor: '',
    llenadoInicio: '',
    llenadoFin: '',
    sello1: '',
    sello2: '',
  };
}

export function nuevaFilaSeguimiento() {
  return {
    id: Date.now() + Math.random(),
    fecha: '',
    entradaVehiculo: '',
    salidaVehiculo: '',
    placa: '',
    descargueInicio: '',
    descargueFin: '',
    bultos: '',
    contenedores: [nuevoContenedorSeguimiento()],
  };
}

export function nuevoRegistroFotograficoContenedor(numeroContenedor = '') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    numeroContenedor,
    titulo: numeroContenedor
      ? `N° Contenedor ${numeroContenedor} con sellos de seguridad`
      : '',
    imagenes: [],
  };
}

export function tituloRegistroContenedor(numeroContenedor) {
  const n = String(numeroContenedor || '').trim();
  return n ? `N° Contenedor ${n} con sellos de seguridad` : '';
}

export function normalizarRegistrosFotograficosContenedores(registros = []) {
  if (!Array.isArray(registros)) return [];
  return registros.map((r) => ({
    ...nuevoRegistroFotograficoContenedor(),
    ...r,
    id: r.id || `${Date.now()}-${Math.random()}`,
    imagenes: normalizarImagenesInforme(r.imagenes),
    titulo: r.titulo || tituloRegistroContenedor(r.numeroContenedor),
  }));
}

export function nuevoPuntoInforme(texto = '') {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    texto,
  };
}

export function normalizarPuntos(puntos = []) {
  if (!Array.isArray(puntos)) return [];
  return puntos.map((p) =>
    typeof p === 'string'
      ? nuevoPuntoInforme(p)
      : { ...nuevoPuntoInforme(), ...p, id: p.id || `${Date.now()}-${Math.random()}` }
  );
}

export function normalizarImagenesInforme(arr = []) {
  if (!Array.isArray(arr)) return [];
  return arr.map((img) =>
    typeof img === 'object' ? { ...img, id: img.id || `${Date.now()}-${Math.random()}` } : img
  );
}

/** Migra campos legacy de supervisión a la estructura por bloques del Word. */
export function migrarSupervisionPagina4(informe = {}) {
  const imagenesRegistroInicialSupervision =
    informe.imagenesRegistroInicialSupervision?.length
      ? informe.imagenesRegistroInicialSupervision
      : informe.imagenesRegistroSupervision || [];

  return {
    imagenesRegistroInicialSupervision: normalizarImagenesInforme(imagenesRegistroInicialSupervision),
    condicionCargaTexto: informe.condicionCargaTexto || informe.condicionCarga || '',
    imagenesCondicionCarga: normalizarImagenesInforme(informe.imagenesCondicionCarga),
    inspeccionArriboIntro: informe.inspeccionArriboIntro || '',
    inspeccionArriboPuntos: normalizarPuntos(informe.inspeccionArriboPuntos),
    imagenesInspeccionArribo: normalizarImagenesInforme(informe.imagenesInspeccionArribo),
    equiposOperacionIntro: informe.equiposOperacionIntro || '',
    equiposOperacionPuntos: normalizarPuntos(informe.equiposOperacionPuntos),
    imagenesEquiposOperacion: normalizarImagenesInforme(informe.imagenesEquiposOperacion),
    condicionesMeteoTexto: informe.condicionesMeteoTexto || '',
    imagenesCondicionesMeteo: normalizarImagenesInforme(informe.imagenesCondicionesMeteo),
  };
}

export function calcularTotalMercancia(lineas = []) {
  return lineas.reduce((sum, l) => sum + (parseInt(l.cantidad, 10) || 0), 0);
}

export function calcularNumContenedoresMercancia(lineas = []) {
  const total = lineas.reduce((sum, l) => sum + (parseInt(l.numContenedores, 10) || 0), 0);
  return total > 0 ? total : lineas.length;
}

function clasificarImagenRegistroMercancia(img) {
  const d = (img.descripcion || img.nombre || '').toLowerCase();
  if (/veh[ií]culo|sello|placa|camion|truck|precinto/i.test(d)) return 'vehiculo';
  if (/contenedor|interior vac|identificaci/i.test(d)) return 'contenedor';
  return 'contenedor';
}

/** Separa el registro fotográfico de mercancía en contenedores y vehículos (como el Word). */
export function normalizarRegistroFotograficoMercancia(informe = {}) {
  const tieneUnificado = (informe.imagenesRegistroMercancia?.length || 0) > 0;

  if (!tieneUnificado) {
    const contenedores = normalizarImagenesInforme(informe.imagenesContenedoresMercancia);
    const vehiculos = normalizarImagenesInforme(informe.imagenesVehiculosMercancia);
    if (contenedores.length || vehiculos.length) {
      return { imagenesContenedoresMercancia: contenedores, imagenesVehiculosMercancia: vehiculos };
    }
  }

  const contenedores = normalizarImagenesInforme(informe.imagenesContenedoresAsignados);
  const vehiculos = normalizarImagenesInforme(informe.imagenesVehiculosAsignados);
  const merged = normalizarImagenesRegistroMercancia(informe);

  merged.forEach((img) => {
    const tipo = clasificarImagenRegistroMercancia(img);
    if (tipo === 'vehiculo') vehiculos.push(img);
    else contenedores.push(img);
  });

  return {
    imagenesContenedoresMercancia: contenedores,
    imagenesVehiculosMercancia: vehiculos,
  };
}

/** Une arrays legacy (dos zonas) en una sola lista con descripción sugerida. */
export function normalizarImagenesRegistroMercancia(informe = {}) {
  if (Array.isArray(informe.imagenesRegistroMercancia) && informe.imagenesRegistroMercancia.length) {
    return informe.imagenesRegistroMercancia.map((img) =>
      typeof img === 'object' ? { ...img, id: img.id || `${Date.now()}-${Math.random()}` } : img
    );
  }
  const legacy = [
    ...(Array.isArray(informe.imagenesContenidoCajas) ? informe.imagenesContenidoCajas : []).map(
      (img) => ({ ...img, descripcion: img.descripcion || 'Contenido de las cajas' })
    ),
    ...(Array.isArray(informe.imagenesContenedoresAsignados)
      ? informe.imagenesContenedoresAsignados
      : []
    ).map((img) => ({ ...img, descripcion: img.descripcion || 'Contenedores asignados' })),
  ];
  return legacy;
}
