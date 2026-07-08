function toDatetimeLocal(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) {
    const s = String(valor);
    return s.length >= 16 ? s.slice(0, 16) : s;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

function toDateInput(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor).slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function generarNroActaSugerido() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `BV${y}${m}${d}${seq}`;
}

export function estadoInicialActaFormulario() {
  const hoy = new Date();
  const fecha = toDateInput(hoy);
  const hora = `${String(hoy.getHours()).padStart(2, '0')}:${String(hoy.getMinutes()).padStart(2, '0')}`;
  return {
    _id: '',
    regional: '',
    nroActa: generarNroActaSugerido(),
    fechaActa: `${fecha}T${hora}`,
    fechaLlegada: fecha,
    ciudad: '',
    tipoInspeccion: '',
    inspector: '',
    estado: 'Activo',
    aseguradora: '',
    sucursal: '',
    asegurado: '',
    mercancia: '',
    empaque: '',
    nroPiezas: '0',
    fechaConstruccion: fecha,
    pedido: '',
    paisOrigen: '',
    paisDestino: '',
    tipoTransporte: '',
    motonave: '',
    puertoOrigen: '',
    puertoArribo: '',
    registro: '',
    docTransporte: '',
    transportadora: '',
    remesa: '',
    conductor: '',
    cedula: '',
    placa: '',
    modelo: '',
    marca: '',
    celular: '',
    origenDespacho: '',
    destinoDespacho: '',
    cartaPorte: '',
    lugarReconocimiento: '',
    contacto: '',
    pesoTara: '',
    pesoNeto: '',
    pesoBruto: '',
    averiaSiNo: '',
    tipoAveria: '',
    observaciones: '',
    recomendaciones: '',
    documentosAdjuntos: {
      facturaComercial: false,
      listaEmpaque: false,
      docTransporte: false,
    },
  };
}

export function actaApiAFormulario(doc = {}) {
  const ext = doc.transporteExterior || {};
  const int = doc.transporteInterior || {};
  const det = doc.detalleInspeccion || {};
  return {
    _id: doc._id || '',
    regional: doc.regional || '',
    nroActa: doc.nroActa || '',
    fechaActa: toDatetimeLocal(doc.fechaActa),
    fechaLlegada: toDateInput(doc.fechaLlegada),
    ciudad: doc.ciudad || '',
    tipoInspeccion: doc.tipoInspeccion || '',
    inspector: doc.nombreInspector || '',
    estado: doc.estado || 'Activo',
    aseguradora: doc.codiAsgrdra || '',
    sucursal: doc.sucursal || '',
    asegurado: doc.asegurado || '',
    mercancia: doc.mercancia || '',
    empaque: doc.empaque || '',
    nroPiezas: doc.nroPiezas != null ? String(doc.nroPiezas) : '0',
    fechaConstruccion: toDateInput(doc.fechaConstruccion),
    pedido: doc.pedido || '',
    paisOrigen: ext.paisOrigen || '',
    paisDestino: ext.paisDestino || '',
    tipoTransporte: ext.tipoTransporte || '',
    motonave: ext.motonave || '',
    puertoOrigen: ext.puertoOrigen || '',
    puertoArribo: ext.puertoArribo || '',
    registro: ext.registro || '',
    docTransporte: ext.docTransporte || '',
    transportadora: int.transportadora || '',
    remesa: int.remesa || '',
    conductor: int.conductor || '',
    cedula: int.cedula || '',
    placa: int.placa || '',
    modelo: int.modelo || '',
    marca: int.marca || '',
    celular: int.celular || '',
    origenDespacho: int.origenDespacho || '',
    destinoDespacho: int.destinoDespacho || '',
    cartaPorte: int.cartaPorte || '',
    lugarReconocimiento: det.lugarReconocimiento || '',
    contacto: det.contacto || '',
    pesoTara: det.pesoTara != null ? String(det.pesoTara) : '',
    pesoNeto: det.pesoNeto != null ? String(det.pesoNeto) : '',
    pesoBruto: det.pesoBruto != null ? String(det.pesoBruto) : '',
    averiaSiNo: det.averiaSiNo || '',
    tipoAveria: det.tipoAveria || '',
    observaciones: doc.observaciones || '',
    recomendaciones: doc.recomendaciones || '',
    documentosAdjuntos:
      doc.documentosAdjuntos ||
      (typeof doc.documentos === 'object' && !Array.isArray(doc.documentos)
        ? doc.documentos
        : {
            facturaComercial: false,
            listaEmpaque: false,
            docTransporte: false,
          }),
  };
}

export function formularioAActaApi(form, extras = {}) {
  const login = localStorage.getItem('login') || localStorage.getItem('nombre') || '';
  return {
    ...(form._id ? { _id: form._id } : {}),
    tipoRegistro: 'acta',
    nroActa: String(form.nroActa || '').trim(),
    regional: form.regional || '',
    fechaActa: form.fechaActa || null,
    fechaLlegada: form.fechaLlegada || null,
    ciudad: form.ciudad || '',
    tipoInspeccion: form.tipoInspeccion || '',
    nombreInspector: form.inspector || '',
    estado: form.estado || 'Activo',
    codiAsgrdra: form.aseguradora || '',
    sucursal: form.sucursal || '',
    asegurado: form.asegurado || '',
    mercancia: form.mercancia || '',
    empaque: form.empaque || '',
    nroPiezas: Number(form.nroPiezas) || 0,
    fechaConstruccion: form.fechaConstruccion || null,
    pedido: form.pedido || '',
    transporteExterior: {
      paisOrigen: form.paisOrigen || '',
      paisDestino: form.paisDestino || '',
      tipoTransporte: form.tipoTransporte || '',
      motonave: form.motonave || '',
      puertoOrigen: form.puertoOrigen || '',
      puertoArribo: form.puertoArribo || '',
      registro: form.registro || '',
      docTransporte: form.docTransporte || '',
    },
    transporteInterior: {
      transportadora: form.transportadora || '',
      remesa: form.remesa || '',
      conductor: form.conductor || '',
      cedula: form.cedula || '',
      placa: form.placa || '',
      modelo: form.modelo || '',
      marca: form.marca || '',
      celular: form.celular || '',
      origenDespacho: form.origenDespacho || '',
      destinoDespacho: form.destinoDespacho || '',
      cartaPorte: form.cartaPorte || '',
    },
    detalleInspeccion: {
      lugarReconocimiento: form.lugarReconocimiento || '',
      contacto: form.contacto || '',
      pesoTara: form.pesoTara || '',
      pesoNeto: form.pesoNeto || '',
      pesoBruto: form.pesoBruto || '',
      averiaSiNo: form.averiaSiNo || '',
      tipoAveria: form.tipoAveria || '',
    },
    fotos: extras.fotos || [],
    observaciones: form.observaciones || '',
    recomendaciones: form.recomendaciones || '',
    documentosAdjuntos: form.documentosAdjuntos || {},
    creadoPor: extras.creadoPor || login,
    actualizadoPor: login,
  };
}

const CAMPOS_OBLIGATORIOS = [
  { key: 'regional', label: 'Regional' },
  { key: 'nroActa', label: 'Nro. de Acta' },
  { key: 'fechaActa', label: 'Fecha de Acta' },
  { key: 'fechaLlegada', label: 'Fecha Llegada' },
  { key: 'tipoInspeccion', label: 'Tipo de Inspección' },
  { key: 'inspector', label: 'Inspector' },
  { key: 'estado', label: 'Estado' },
  { key: 'aseguradora', label: 'Aseguradora' },
  { key: 'sucursal', label: 'Sucursal' },
  { key: 'asegurado', label: 'Asegurado' },
  { key: 'mercancia', label: 'Mercancía' },
  { key: 'empaque', label: 'Empaque' },
  { key: 'fechaConstruccion', label: 'Fecha Construcción' },
  { key: 'lugarReconocimiento', label: 'Lugar de Reconocimiento' },
  { key: 'contacto', label: 'Contacto' },
  { key: 'averiaSiNo', label: 'Avería SI / NO' },
];

export function validarFormularioActa(form) {
  for (const { key, label } of CAMPOS_OBLIGATORIOS) {
    if (!String(form[key] ?? '').trim()) {
      return `Complete el campo obligatorio: ${label}`;
    }
  }
  return null;
}
