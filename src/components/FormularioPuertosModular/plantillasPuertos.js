/** Plantillas y datos predefinidos para informes de Puertos */

export const EMPRESA_BOLIVAR = 'SEGUROS BOLÍVAR S.A';

/** Contactos conocidos de Seguros Bolívar (el usuario puede elegir otro y editar manualmente) */
export const CONTACTOS_BOLIVAR = [
  {
    id: 'latorre',
    nombreContacto: 'Ing. Gabriel Ignacio Latorre Duarte',
    cargoContacto: 'Ingeniero de Prevención y Control de Riesgos',
    gerenciaContacto: '',
    empresaCliente: EMPRESA_BOLIVAR,
    emailContacto: '',
    ciudadContacto: 'Bogotá, Colombia',
  },
  {
    id: 'ramirez',
    nombreContacto: 'Ing. Andrea Carolina Ramírez Ruiz',
    cargoContacto: 'Ingeniera de Prevención y Control de Riesgos',
    gerenciaContacto: 'Gerencia de Clientes Corporativos',
    empresaCliente: EMPRESA_BOLIVAR,
    emailContacto: '',
    ciudadContacto: 'Bogotá, Colombia',
  },
];

/** @deprecated Usar CONTACTOS_BOLIVAR */
export const CONTACTOS_ASEGURADORA = {
  BOLIVAR: CONTACTOS_BOLIVAR[0],
};

export const ASEGURADOS = {
  METROKIA: {
    asegurado: 'METROKIA',
    nombreCliente: 'METROKIA',
  },
  TOYOTA: {
    asegurado: 'AUTOMOTORES TOYOTA COLOMBIA S.A.S',
    nombreCliente: 'AUTOMOTORES TOYOTA COLOMBIA S.A.S',
  },
};
