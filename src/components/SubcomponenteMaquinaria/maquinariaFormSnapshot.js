/** Fuente única para guardado, carga y exportación del formulario de maquinaria */

import { normalizarImagenCargada } from './maquinariaImagenUtils.js';

export function construirSnapshotMaquinaria(s) {
  return {
    numeroActa: s.nombre || '',
    fechaInspeccion: s.fecha || '',
    ciudad: s.ciudadFecha || '',
    aseguradora: s.aseguradora || '',
    asegurado: s.nombreAsegurado || '',
    tipoMaquinaria: s.nombreMaquinaria || '',
    referencia: s.referencia || '',
    saludo: s.saludo || '',
    cuerpo: s.cuerpo || '',
    destinatario: s.aseguradora || '',
    equipo: s.nombreMaquinaria || '',
    marca: s.marca || '',
    modelo: s.modelo || '',
    linea: s.linea || '',
    tomador: s.nombreAsegurado || '',
    lugar: s.lugar || '',
    ubicacion: s.ubicacion || '',
    departamento: s.departamento || '',
    inspectorSeleccionado: s.inspectorSeleccionado || '',
    codiInspector: s.codiInspector || '',
    cargoSeleccionado: s.cargoSeleccionado || '',
    firmanteInspector: s.inspectorSeleccionado || '',
    codigoInspector: s.cargoSeleccionado || '',
    descripcion: s.descripcion || '',
    motorDiesel: s.motorDiesel || '',
    sistemaLocomocion: s.sistemaLocomocion || '',
    locomocion: s.sistemaLocomocion || '',
    color: s.color || '',
    estadoOperativo: s.estadoOperativo || '',
    cabina: s.cabina || '',
    funcion: s.funcion || '',
    equipoContraincendio: s.equipoContraincendio || '',
    equipoRadio: s.equipoRadio || '',
    radiodeOperacion: s.radiodeOperacion || '',
    electrico: s.electrico || '',
    mecanico: s.mecanico || '',
    hidraulico: s.hidraulico || '',
    pintura: s.pintura || '',
    chasis: s.chasis || '',
    mantenimiento: s.mantenimiento || '',
    funcionamiento: s.funcionamiento || '',
    tipoProteccion: s.tipoProteccion || '',
    recomendaciones: s.recomendaciones || '',
    imagenesRegistro: s.imagenesRegistro || [],
    fotoPrincipalImagen: s.fotoPrincipalImagen || null,
    descripcionFotoPrincipal: s.descripcionFotoPrincipal || '',
    firmaClienteNombre: s.firmaClienteNombre || '',
    firmaClienteCargo: s.firmaClienteCargo || '',
    firmaClienteEmail: s.firmaClienteEmail || '',
    firmaCliente: s.firmaCliente || '',
    inspectorFuncionarioId: s.inspectorFuncionarioId || '',
    inspectorFirmaImagen: s.inspectorFirmaImagen || '',
  };
}

export function snapshotALocalStorage(s) {
  return {
    nombre: s.nombre,
    fecha: s.fecha,
    nombreAsegurado: s.nombreAsegurado,
    nombreMaquinaria: s.nombreMaquinaria,
    ciudadFecha: s.ciudadFecha,
    referencia: s.referencia,
    saludo: s.saludo,
    cuerpo: s.cuerpo,
    aseguradora: s.aseguradora,
    marca: s.marca,
    modelo: s.modelo,
    linea: s.linea,
    lugar: s.lugar,
    ubicacion: s.ubicacion,
    departamento: s.departamento,
    inspectorSeleccionado: s.inspectorSeleccionado,
    codiInspector: s.codiInspector,
    cargoSeleccionado: s.cargoSeleccionado,
    descripcion: s.descripcion,
    motorDiesel: s.motorDiesel,
    sistemaLocomocion: s.sistemaLocomocion,
    color: s.color,
    estadoOperativo: s.estadoOperativo,
    cabina: s.cabina,
    funcion: s.funcion,
    equipoContraincendio: s.equipoContraincendio,
    equipoRadio: s.equipoRadio,
    radiodeOperacion: s.radiodeOperacion,
    electrico: s.electrico,
    mecanico: s.mecanico,
    hidraulico: s.hidraulico,
    pintura: s.pintura,
    chasis: s.chasis,
    mantenimiento: s.mantenimiento,
    funcionamiento: s.funcionamiento,
    tipoProteccion: s.tipoProteccion,
    recomendaciones: s.recomendaciones,
    imagenesRegistro: s.imagenesRegistro,
    fotoPrincipalImagen: s.fotoPrincipalImagen,
    descripcionFotoPrincipal: s.descripcionFotoPrincipal,
    firmaClienteNombre: s.firmaClienteNombre,
    firmaClienteCargo: s.firmaClienteCargo,
    firmaClienteEmail: s.firmaClienteEmail,
    firmaCliente: s.firmaCliente,
    inspectorFuncionarioId: s.inspectorFuncionarioId,
    inspectorFirmaImagen: s.inspectorFirmaImagen,
  };
}

export function aplicarDatosMaquinaria(datos, setters) {
  if (!datos || typeof datos !== 'object') return;
  const v = (val, fb = '') => (val !== undefined && val !== null ? val : fb);

  setters.setNombre(v(datos.numeroActa, ''));
  setters.setFecha(v(datos.fechaInspeccion, ''));
  setters.setNombreAsegurado(v(datos.asegurado, ''));
  setters.setNombreMaquinaria(v(datos.tipoMaquinaria || datos.equipo, ''));
  setters.setCiudadFecha(v(datos.ciudad, ''));
  setters.setReferencia(v(datos.referencia, ''));
  setters.setSaludo(v(datos.saludo, ''));
  setters.setCuerpo(v(datos.cuerpo, ''));
  setters.setAseguradora(v(datos.aseguradora || datos.destinatario, ''));
  setters.setMarca(v(datos.marca, ''));
  setters.setModelo(v(datos.modelo, ''));
  setters.setLinea(v(datos.linea, ''));
  setters.setLugar(v(datos.lugar, ''));
  setters.setUbicacion(v(datos.ubicacion, ''));
  setters.setDepartamento(v(datos.departamento, ''));
  setters.setInspectorSeleccionado(v(datos.inspectorSeleccionado || datos.firmanteInspector, ''));
  setters.setCodiInspector(v(datos.codiInspector, ''));
  setters.setCargoSeleccionado(v(datos.cargoSeleccionado || datos.codigoInspector, ''));
  setters.setDescripcion(v(datos.descripcion, ''));
  setters.setMotorDiesel(v(datos.motorDiesel, ''));
  setters.setSistemaLocomocion(v(datos.sistemaLocomocion || datos.locomocion, ''));
  setters.setColor(v(datos.color, ''));
  setters.setEstadoOperativo(v(datos.estadoOperativo, ''));
  setters.setCabina(v(datos.cabina, ''));
  setters.setFuncion(v(datos.funcion, ''));
  setters.setEquipoContraincendio(v(datos.equipoContraincendio, ''));
  setters.setEquipoRadio(v(datos.equipoRadio, ''));
  setters.setRadiodeOperacion(v(datos.radiodeOperacion, ''));
  setters.setElectrico(v(datos.electrico, ''));
  setters.setMecanico(v(datos.mecanico, ''));
  setters.setHidraulico(v(datos.hidraulico, ''));
  setters.setPintura(v(datos.pintura, ''));
  setters.setChasis(v(datos.chasis, ''));
  setters.setMantenimiento(v(datos.mantenimiento, ''));
  setters.setFuncionamiento(v(datos.funcionamiento, ''));
  setters.setTipoProteccion(v(datos.tipoProteccion, ''));
  setters.setRecomendaciones(v(datos.recomendaciones || datos.observaciones, ''));
  setters.setImagenesRegistro(v(datos.imagenesRegistro, []));
  if (datos.fotoPrincipalImagen) {
    setters.setFotoPrincipalImagen(normalizarImagenCargada(datos.fotoPrincipalImagen));
  } else if (datos.fotoPrincipalPreview || datos.fotoPrincipal) {
    setters.setFotoPrincipalImagen(
      normalizarImagenCargada({
        id: 'legacy-foto-principal',
        src: datos.fotoPrincipalPreview || undefined,
        preview: datos.fotoPrincipalPreview || undefined,
        descripcion: datos.descripcionFotoPrincipal || '',
        nombre: 'foto_principal.jpg',
      })
    );
  } else {
    setters.setFotoPrincipalImagen(null);
  }
  setters.setDescripcionFotoPrincipal(v(datos.descripcionFotoPrincipal, ''));
  if (setters.setFirmaClienteNombre) setters.setFirmaClienteNombre(v(datos.firmaClienteNombre, ''));
  if (setters.setFirmaClienteCargo) setters.setFirmaClienteCargo(v(datos.firmaClienteCargo, ''));
  if (setters.setFirmaClienteEmail) setters.setFirmaClienteEmail(v(datos.firmaClienteEmail, ''));
  if (setters.setFirmaCliente) setters.setFirmaCliente(v(datos.firmaCliente, ''));
  if (setters.setInspectorFuncionarioId) setters.setInspectorFuncionarioId(v(datos.inspectorFuncionarioId, ''));
  if (setters.setInspectorFirmaImagen) setters.setInspectorFirmaImagen(v(datos.inspectorFirmaImagen, ''));
}

export function aplicarBorradorLocal(borrador, setters) {
  if (!borrador || typeof borrador !== 'object') return;
  aplicarDatosMaquinaria(
    {
      ...borrador,
      numeroActa: borrador.nombre,
      fechaInspeccion: borrador.fecha,
      asegurado: borrador.nombreAsegurado,
      tipoMaquinaria: borrador.nombreMaquinaria,
      ciudad: borrador.ciudadFecha,
    },
    setters
  );
}

export function buscarDepartamentoPorCiudad(ciudades, nombreCiudad) {
  if (!nombreCiudad?.trim()) return null;
  const normalizar = (texto) => texto.trim().toLowerCase();
  const objetivo = normalizar(nombreCiudad);
  return ciudades.find((c) => normalizar(c.nombre) === objetivo) || null;
}

export const BORRADOR_MAQUINARIA_KEY = 'formularioMaquinariaBorrador';
export const BORRADOR_MAQUINARIA_LEGACY_KEY = 'formularioMaquinaria';

export function borradorTieneContenido(borrador) {
  if (!borrador || typeof borrador !== 'object') return false;

  const camposTexto = [
    borrador.nombre,
    borrador.fecha,
    borrador.nombreAsegurado,
    borrador.nombreMaquinaria,
    borrador.ciudadFecha,
    borrador.referencia,
    borrador.saludo,
    borrador.cuerpo,
    borrador.aseguradora,
    borrador.marca,
    borrador.descripcion,
    borrador.inspectorSeleccionado,
    borrador.cargoSeleccionado,
    borrador.recomendaciones,
    borrador.fotoPrincipalPreview,
    borrador.firmaCliente,
    borrador.firmaClienteNombre,
    borrador.inspectorFirmaImagen,
  ];

  if (camposTexto.some((v) => v && String(v).trim())) return true;
  if (borrador.fotoPrincipalImagen?.file || borrador.fotoPrincipalImagen?.ruta || borrador.fotoPrincipalImagen?.preview) {
    return true;
  }
  if (Array.isArray(borrador.imagenesRegistro) && borrador.imagenesRegistro.some((img) => img?.src || img?.ruta || img?.file || img?.preview)) {
    return true;
  }
  return false;
}

export function limpiarBorradorMaquinaria() {
  try {
    sessionStorage.removeItem(BORRADOR_MAQUINARIA_KEY);
    localStorage.removeItem(BORRADOR_MAQUINARIA_LEGACY_KEY);
  } catch {
    // ignorar errores de almacenamiento
  }
}
