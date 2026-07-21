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
  registrosFotograficosSupervision: [],
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
    /** La carga de este vehículo complementa el último contenedor del vehículo anterior. */
    continuaAnterior: false,
    bultos: '',
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
      (img) => ({ ...img, descripcion: img.descripcion || 'Contenido de la mercancía' })
    ),
    ...(Array.isArray(informe.imagenesContenedoresAsignados)
      ? informe.imagenesContenedoresAsignados
      : []
    ).map((img) => ({ ...img, descripcion: img.descripcion || 'Contenedor (es) asignado (s)' })),
  ];
  return legacy;
}

const textoEstado = (v) => String(v || '').trim();

function lineaMercanciaCompleta(linea) {
  return textoEstado(linea?.producto) && textoEstado(linea?.cantidad);
}

export const SECCIONES_ESTADO_EXPORTACION = [
  {
    id: 'portada',
    nombre: 'Portada',
    completada: (caso) =>
      textoEstado(caso.numeroSolicitud) &&
      textoEstado(caso.codiAsgrdra) &&
      textoEstado(caso.fechaInforme),
  },
  {
    id: 'datosIntro',
    nombre: 'Datos generales',
    completada: (caso) => {
      const inf = caso.informeExportacion || {};
      return (
        textoEstado(caso.asgrBenfcro) &&
        textoEstado(caso.actividad) &&
        textoEstado(inf.introduccion)
      );
    },
  },
  {
    id: 'buqueMercancia',
    nombre: 'Buque y mercancía',
    completada: (caso) => {
      const inf = caso.informeExportacion || {};
      const buque = inf.buque || {};
      const lineas = Array.isArray(inf.lineasMercancia) ? inf.lineasMercancia : [];
      return (
        textoEstado(buque.nombre) &&
        textoEstado(buque.fechaArribo) &&
        lineas.some(lineaMercanciaCompleta)
      );
    },
  },
  {
    id: 'supervision',
    nombre: 'Supervisión',
    completada: (caso) => {
      const inf = caso.informeExportacion || {};
      const seguimiento = Array.isArray(inf.seguimiento) ? inf.seguimiento : [];
      const tieneSeguimiento = seguimiento.some(
        (fila) =>
          textoEstado(fila.fecha) ||
          textoEstado(fila.placa) ||
          (Array.isArray(fila.contenedores) &&
            fila.contenedores.some((c) => textoEstado(c.numeroContenedor)))
      );
      const tieneFotos =
        (inf.imagenesRegistroInicialSupervision?.length || 0) > 0 ||
        (inf.imagenesCondicionCarga?.length || 0) > 0 ||
        (inf.imagenesInspeccionArribo?.length || 0) > 0;
      return tieneSeguimiento || tieneFotos || textoEstado(inf.comentariosSupervision);
    },
  },
  {
    id: 'conclusiones',
    nombre: 'Conclusiones',
    completada: (caso) => {
      const inf = caso.informeExportacion || {};
      const puntos = Array.isArray(inf.conclusionesPuntos) ? inf.conclusionesPuntos : [];
      const registros = Array.isArray(inf.registrosFotograficosContenedores)
        ? inf.registrosFotograficosContenedores
        : [];
      return (
        textoEstado(inf.conclusionesTexto) ||
        puntos.some((p) => textoEstado(typeof p === 'string' ? p : p?.texto)) ||
        registros.some((r) => (r.imagenes?.length || 0) > 0)
      );
    },
  },
];

/** Estado automático según secciones completadas del informe de exportación. */
export function calcularEstadoInformeExportacion(caso = {}) {
  const completadas = SECCIONES_ESTADO_EXPORTACION.filter((s) => s.completada(caso));
  const total = SECCIONES_ESTADO_EXPORTACION.length;
  const n = completadas.length;
  const pendiente = SECCIONES_ESTADO_EXPORTACION.find((s) => !s.completada(caso));

  if (n === 0 && !textoEstado(caso.consecutivo) && !textoEstado(caso.numeroSolicitud)) {
    return { codigo: 'borrador', etiqueta: 'Borrador', progreso: 0, total, detalle: '' };
  }

  if (n === total) {
    return {
      codigo: 'terminado',
      etiqueta: 'Terminado',
      progreso: total,
      total,
      detalle: `${total}/${total} secciones`,
    };
  }

  return {
    codigo: 'en_curso',
    etiqueta: 'En curso',
    progreso: n,
    total,
    detalle: `${n}/${total} secciones${pendiente?.nombre ? ` · pendiente: ${pendiente.nombre}` : ''}`,
    seccionPendiente: pendiente?.nombre || '',
  };
}

export function aplicarEstadoInformeExportacion(datos = {}) {
  const estado = calcularEstadoInformeExportacion(datos);
  return {
    ...datos,
    codiEstdo: estado.codigo,
    descripcionEstado: estado.etiqueta,
  };
}
