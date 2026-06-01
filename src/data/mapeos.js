// Mapeo de códigos a nombres legibles
export const mapeoEstados = {
  '1': 'PENDIENTE DOCUMENTOS',
  '2': 'PENDIENTE ACEPTACION CLIENTE', 
  '3': 'PENDIENTE ACEPTACION CIFRAS',
  '4': 'EN PROCESO',
  '5': 'CERRADO',
  '6': 'CANCELADO',
  '9': 'SUSPENDIDO',
  '10': 'REVISION',
  '13': 'FINALIZADO',
  '17': 'FACTURADO'
};

export const mapeoAseguradoras = {
  '860002534': 'SURA',
  '860028415': 'AXA COLPATRIA',
  '860002184': 'LIBERTY SEGUROS',
  '860002400': 'MAPFRE',
  '860002503': 'ALLIANZ',
  '860031979': 'ZURICH',
  '901287348': 'LA PREVISORA',
  '8600261825': 'BOLIVAR',
  '8600377079': 'SEGUROS GENERALES',
  '8909034079': 'MUNDIAL DE SEGUROS',
  '8917000379': 'LA EQUIDAD',
  '8002260984': 'POSITIVA',
  '8600095786': 'ALFA',
  '123': 'OTRA ASEGURADORA'
};

export const mapeoResponsables = {
  '72134505': 'Juan Pérez',
  '72134506': 'María García',
  '72134507': 'Carlos López',
  '72134508': 'Ana Rodríguez',
  '72134509': 'Luis Martínez',
  '72134510': 'Carmen Sánchez',
  '72134511': 'Roberto Torres',
  '72134512': 'Isabel Morales',
  '72134513': 'Fernando Jiménez',
  '72134514': 'Patricia Ruiz'
};

// Función para obtener nombre legible
export const obtenerNombre = (codigo, mapeo) => {
  return mapeo[codigo] || codigo || 'Sin definir';
};

// Función para obtener nombre de estado
export const obtenerNombreEstado = (codigo) => {
  return obtenerNombre(codigo, mapeoEstados);
};

// Función para obtener nombre de aseguradora
export const obtenerNombreAseguradora = (codigo) => {
  return obtenerNombre(codigo, mapeoAseguradoras);
};

// Función para obtener nombre de responsable
export const obtenerNombreResponsable = (codigo) => {
  return obtenerNombre(codigo, mapeoResponsables);
}; 