import {
  NOTAS_PROTOCOLO_EXPRESS,
  PROTOCOLO_EXPRESS_OBJETIVO,
  RESUMEN_PLAZOS_PROTOCOLO_EXPRESS,
} from './protocoloExpressDefaults.js';
import { PASOS_INICIO_RAPIDO } from '../components/MatrizRiesgoAvanzada/matrizContenidoShared.js';
import { normalizarRol, ROLES_CONTRACTOR, ROL_CATASTROFICOS, ROL_SOLO_EQUIDAD } from './roles.js';

const EXCLUIR_CONTRACTOR = [...ROLES_CONTRACTOR];
const EXCLUIR_CONTRACTOR_SIN_EQUIDAD = ROLES_CONTRACTOR.filter((r) => r !== ROL_SOLO_EQUIDAD);

const pasosMatriz = PASOS_INICIO_RAPIDO.map(
  ({ paso, titulo, descripcion }) => `${paso}. **${titulo}:** ${descripcion}`
);

const plazosExpress = RESUMEN_PLAZOS_PROTOCOLO_EXPRESS.map(
  ({ titulo, valor }) => `**${titulo}:** ${valor}`
);

export const HELP_MODULES = [
  {
    id: 'primeros-pasos',
    titulo: 'Primeros pasos',
    descripcion: 'Conozca la navegación, su cuenta, las tareas y los accesos principales.',
    icono: 'home',
    ruta: '/inicio',
    palabrasClave: ['inicio', 'cuenta', 'perfil', 'buscar', 'tareas', 'sesión', 'tema'],
    articulos: [
      {
        titulo: 'Navegación y búsqueda',
        descripcion:
          'Use el menú lateral para abrir los módulos. La lupa de la barra superior abre Inicio y enfoca el buscador de tareas.',
        pasos: [
          'Expanda o contraiga el menú lateral con el primer icono de la barra superior.',
          'Seleccione una opción del menú para entrar al módulo correspondiente.',
          'Use la lupa para filtrar sus tareas desde la página de Inicio.',
        ],
      },
      {
        titulo: 'Cuenta y sesión',
        descripcion:
          'Desde el menú de usuario puede consultar su perfil y configurar su cuenta. La sesión se cierra automáticamente al terminar su tiempo de vigencia.',
        ruta: '/cuenta',
        pasos: ['Abra el menú de usuario en la parte superior derecha.', 'Seleccione Mi cuenta o Cuenta.'],
      },
    ],
  },
  {
    id: 'complex',
    titulo: 'COMPLEX',
    descripcion: 'Gestione casos, trazabilidad, subtareas, alertas, indicadores y reportes de siniestros.',
    icono: 'briefcase',
    ruta: '/complex/mis-casos',
    palabrasClave: ['casos', 'siniestros', 'trazabilidad', 'subtareas', 'alertas', 'indicadores', 'facturación'],
    excluirRoles: EXCLUIR_CONTRACTOR,
    manualCompleto: true,
    articulos: [
      {
        titulo: 'Flujo de trabajo',
        descripcion: 'Cree un caso, complete su trazabilidad, haga seguimiento y consulte los reportes.',
        ruta: '/complex/agregar',
        pasos: [
          'Cree el caso desde Agregar caso Complex.',
          'Registre las fechas y documentos de cada etapa de la trazabilidad.',
          'Consulte Mis casos, Mis subtareas y las alertas para dar seguimiento.',
        ],
      },
      {
        titulo: 'Alertas y cumplimiento',
        descripcion: 'Las alertas muestran plazos próximos a vencerse o vencidos. La campana lleva a sus alertas personales.',
        ruta: '/complex/mis-alertas',
        pasos: ['Revise la campana de la barra superior.', 'Abra Mis alertas y atienda primero los casos vencidos.'],
      },
    ],
  },
  {
    id: 'riesgos',
    titulo: 'Riesgos e inspecciones',
    descripcion: 'Registre casos de riesgo, inspecciones y consulte sus indicadores o exportaciones.',
    icono: 'shield',
    ruta: '/riesgos/dashboard',
    palabrasClave: ['riesgos', 'inspección', 'dashboard', 'exportar', 'formulario'],
    excluirRoles: ['visualizador', 'puertos', 'externo', ...EXCLUIR_CONTRACTOR],
    articulos: [
      {
        titulo: 'Gestión de casos de riesgo',
        descripcion: 'Registre un caso, complete los datos de evaluación y consulte el tablero.',
        ruta: '/riesgos/agregar',
        pasos: ['Cree el caso de riesgo.', 'Complete la información solicitada.', 'Consulte el dashboard o exporte el resultado.'],
      },
      {
        titulo: 'Formulario de inspección',
        descripcion: 'Use el formulario para capturar los datos de la visita y conservar el historial.',
        ruta: '/formularioinspeccion',
      },
    ],
  },
  {
    id: 'risk-intelligence',
    titulo: 'Risk Intelligence',
    descripcion: 'Identifique, evalúe y visualice riesgos mediante matrices y mapas de calor.',
    icono: 'chart',
    ruta: '/matrices-riesgo',
    palabrasClave: ['matriz', 'mapa de calor', 'identificar', 'evaluar', 'risk intelligence'],
    excluirRoles: ['puertos', 'externo', ...EXCLUIR_CONTRACTOR],
    articulos: [
      {
        titulo: 'Matriz de riesgos',
        descripcion: 'El proceso guía la identificación, evaluación y visualización de los riesgos.',
        ruta: '/matriz-riesgo-avanzada',
        pasos: pasosMatriz,
      },
      {
        titulo: 'Consulta de matrices',
        descripcion: 'Abra el listado para consultar y continuar trabajando las matrices registradas.',
        ruta: '/matrices-riesgo',
      },
    ],
  },
  {
    id: 'express',
    titulo: 'Express',
    descripcion: 'Administre casos Express desde el cargue hasta el liquidador, protocolo y reporte.',
    icono: 'bolt',
    ruta: '/express/carga',
    palabrasClave: ['express', 'cargue', 'liquidador', 'protocolo', 'ans', 'reporte'],
    excluirRoles: ['visualizador', 'puertos', 'externo', ...EXCLUIR_CONTRACTOR],
    articulos: [
      {
        titulo: 'Flujo Express',
        descripcion: 'Cargue el caso, gestione su liquidación y consulte el protocolo o reporte.',
        ruta: '/express/carga',
        pasos: ['Cargue el caso.', 'Complete la liquidación.', 'Revise el protocolo y el reporte para dar seguimiento.'],
      },
      {
        titulo: 'Protocolo y plazos ANS',
        descripcion: PROTOCOLO_EXPRESS_OBJETIVO,
        ruta: '/express/protocolo',
        pasos: [...plazosExpress, ...NOTAS_PROTOCOLO_EXPRESS],
      },
    ],
  },
  {
    id: 'equidad-fdm',
    titulo: 'Equidad FDM',
    descripcion: 'Realice el cargue, la liquidación, el seguimiento del dashboard y los reportes.',
    icono: 'balance',
    ruta: '/equidad-fdm/reporte',
    palabrasClave: ['equidad', 'fdm', 'carga', 'liquidador', 'dashboard', 'reporte', 'bandeja'],
    excluirRoles: ['visualizador', 'puertos', 'externo', ...EXCLUIR_CONTRACTOR_SIN_EQUIDAD],
    articulos: [
      {
        titulo: 'Bandeja Equidad FDM',
        descripcion: 'Consulte el reporte/bandeja de casos Equidad FDM y filtre por ciudad o estado.',
        ruta: '/equidad-fdm/reporte',
        pasos: ['Abra Bandeja Equidad FDM.', 'Use filtros y ventanas por ciudad.', 'Exporte Excel si lo necesita.'],
      },
    ],
  },
  {
    id: 'equidad-cat',
    titulo: 'Equidad CAT',
    descripcion: 'Agregue casos, consulte el dashboard y el reporte, liquide con el modelo FDM y genere el informe único.',
    icono: 'balance',
    ruta: '/equidad-cat/reporte',
    palabrasClave: ['equidad', 'cat', 'carga', 'liquidador', 'fdm', 'informe', 'dashboard', 'reporte', 'archivero'],
    excluirRoles: [
      'visualizador',
      'puertos',
      'externo',
      ...ROLES_CONTRACTOR.filter((r) => r !== ROL_CATASTROFICOS),
    ],
    articulos: [
      {
        titulo: 'Agregar y reportar casos',
        descripcion: 'Cree o importe casos del listado y consulte el reporte, mis casos y el dashboard.',
        ruta: '/equidad-cat/carga',
        pasos: [
          'Abra Equidad CAT > Agregar caso.',
          'Registre siniestro, asegurado, identificación y ciudad, o importe un Excel si es admin/soporte.',
          'Consulte Reporte, Mis casos y Dashboard para el seguimiento.',
        ],
      },
      {
        titulo: 'Liquidador FDM e informe único',
        descripcion: 'El liquidador es el mismo de Equidad FDM. El informe único se genera desde el workspace del caso.',
        ruta: '/equidad-cat/liquidador',
        pasos: [
          'Desde el reporte, abra Liquidador o Informe único del caso.',
          'Complete contenidos, edificios y deducible en el liquidador FDM y guarde; el Excel queda en el archivero.',
          'En la pestaña Informe único complete el documento y descargue el Word.',
        ],
      },
    ],
  },
  {
    id: 'propiedades',
    titulo: 'Propiedades',
    descripcion: 'Cree casos de propiedades, realice inspecciones y consulte sus resultados.',
    icono: 'building',
    ruta: '/propiedades/carga',
    palabrasClave: ['propiedades', 'caso', 'inspección', 'dashboard', 'reporte'],
    excluirRoles: ['visualizador', 'puertos', 'externo', ...EXCLUIR_CONTRACTOR],
    articulos: [
      {
        titulo: 'Casos de propiedades',
        descripcion: 'Registre el caso y complete la inspección desde el flujo del caso cuando corresponda.',
        ruta: '/propiedades/carga',
        pasos: ['Cree el caso en Carga.', 'Abra la inspección desde el caso.', 'Revise Dashboard y Reporte.'],
      },
    ],
  },
  {
    id: 'puertos',
    titulo: 'Puertos',
    descripcion: 'Gestione actas, inspecciones, casos de exportación y catálogos de Puertos.',
    icono: 'ship',
    ruta: '/puertos/actas',
    palabrasClave: ['puertos', 'actas', 'asegurado', 'inspección', 'exportación', 'catálogos'],
    excluirRoles: ['visualizador', 'externo', ...EXCLUIR_CONTRACTOR],
    articulos: [
      {
        titulo: 'Actas e inspecciones',
        descripcion: 'Consulte el listado de actas o cree una nueva según los permisos asignados.',
        ruta: '/puertos/actas',
        pasos: ['Abra Actas.', 'Cree o edite un acta.', 'Complete la inspección del asegurado cuando aplique.'],
      },
      {
        titulo: 'Catálogos',
        descripcion: 'Consulte los catálogos autorizados para mantener datos consistentes.',
        ruta: '/puertos/actas/catalogos',
      },
    ],
  },
  {
    id: 'formularios-documentos',
    titulo: 'Formularios y documentos',
    descripcion: 'Acceda a formularios transversales, historial y gestión documental.',
    icono: 'file',
    ruta: '/historial',
    palabrasClave: ['formularios', 'ajuste', 'pol', 'maquinaria', 'historial', 'documentos'],
    excluirRoles: ['visualizador', 'puertos', 'externo', ...EXCLUIR_CONTRACTOR],
    articulos: [
      {
        titulo: 'Formularios transversales',
        descripcion: 'Use los accesos del menú Formularios para registrar ajustes, POL o maquinaria.',
        ruta: '/ajuste',
        pasos: ['Seleccione el formulario requerido.', 'Registre la información.', 'Consulte el historial cuando necesite retomarlo.'],
      },
      {
        titulo: 'Historial',
        descripcion: 'Consulte los formularios guardados y retome la edición cuando tenga permisos.',
        ruta: '/historial',
      },
    ],
  },
  {
    id: 'administracion',
    titulo: 'Administración',
    descripcion: 'Administre usuarios, catálogos, responsables y la configuración operativa.',
    icono: 'cog',
    ruta: '/admin/usuarios',
    palabrasClave: ['administración', 'usuarios', 'catálogos', 'responsables', 'intermediarios', 'soporte'],
    rolesPermitidos: ['admin', 'administrador', 'soporte'],
    articulos: [
      {
        titulo: 'Usuarios y configuración',
        descripcion: 'Gestione usuarios, responsables, intermediarios y catálogos desde el menú Administración.',
        ruta: '/admin/usuarios',
        pasos: ['Abra la sección administrativa correspondiente.', 'Actualice los datos autorizados.', 'Verifique los permisos antes de guardar.'],
      },
      {
        titulo: 'Alertas Complex',
        descripcion: 'Los administradores y soporte pueden consultar el sistema general de alertas.',
        ruta: '/complex/alertas',
      },
    ],
  },
];

export function puedeVerModuloAyuda(modulo, rol) {
  const rolNormalizado = normalizarRol(rol);
  if (modulo.rolesPermitidos && !modulo.rolesPermitidos.includes(rolNormalizado)) return false;
  return !modulo.excluirRoles?.includes(rolNormalizado);
}

export const HELP_MANUALS = {
  'primeros-pasos': {
    titulo: 'Manual de uso de la plataforma',
    secciones: [
      {
        titulo: '1. Ingreso y navegación',
        pasos: [
          'Inicie sesión con sus credenciales. Al ingresar, la plataforma abre el módulo asignado a su rol.',
          'Use el botón de menú de la barra superior para contraer o expandir el menú lateral.',
          'Abra un módulo desde el menú lateral. Las opciones disponibles dependen de los permisos de su perfil.',
          'Use el icono de usuario, en la parte superior derecha, para entrar a **Mi cuenta** o cerrar sesión.',
        ],
      },
      {
        titulo: '2. Inicio, tareas y búsqueda',
        pasos: [
          'Abra **Inicio** para consultar sus tareas personales y los comunicados publicados.',
          'Para buscar una tarea, pulse la lupa de la barra superior o escriba directamente en el campo Buscar tarea.',
          'Use los accesos directos de Inicio para abrir los formularios que utiliza con mayor frecuencia.',
          'Revise las tareas pendientes y actualice su información desde el mismo panel cuando corresponda.',
        ],
      },
      {
        titulo: '3. Notificaciones, ayuda y cuenta',
        pasos: [
          'La campana muestra la cantidad de alertas pendientes. Al pulsarla verá sus alertas o el sistema general si tiene perfil de administración o soporte.',
          'El icono de lista abre **Mis subtareas Complex** cuando este módulo está habilitado para su perfil.',
          'Pulse el icono de interrogación para volver a este Centro de Ayuda en cualquier momento.',
          'En Cuenta puede revisar su información y las opciones que hayan sido habilitadas para su usuario.',
        ],
      },
    ],
  },
  riesgos: {
    titulo: 'Manual de Riesgos e Inspecciones',
    secciones: [
      {
        titulo: '1. Crear un caso de riesgo',
        ruta: '/riesgos/agregar',
        pasos: [
          'Abra **Riesgos > Agregar caso** desde el menú lateral.',
          'Complete los datos requeridos del caso y verifique la información antes de guardarla.',
          'Guarde el registro. Si necesita modificarlo posteriormente, ábralo desde los listados o reportes que tengan la opción de edición.',
          'Mantenga la información actualizada para que los indicadores y exportaciones reflejen datos correctos.',
        ],
      },
      {
        titulo: '2. Registrar una inspección',
        ruta: '/formularioinspeccion',
        pasos: [
          'Abra **Formulario de Inspección** desde el menú Formularios.',
          'Complete las secciones de la visita en orden y registre los datos observados.',
          'Adjunte o registre la información solicitada en cada apartado antes de continuar.',
          'Guarde el formulario y consulte el Historial si debe retomarlo o verificar registros anteriores.',
        ],
      },
      {
        titulo: '3. Consultar indicadores y exportar',
        ruta: '/riesgos/dashboard',
        pasos: [
          'Abra el **Dashboard de Riesgos** para visualizar el estado general de los casos registrados.',
          'Use los filtros disponibles para concentrarse en el periodo o grupo de interés.',
          'Abra **Exportar Riesgos** cuando necesite descargar la información para análisis o seguimiento externo.',
        ],
      },
    ],
  },
  'risk-intelligence': {
    titulo: 'Manual de Risk Intelligence',
    secciones: [
      {
        titulo: '1. Consultar o crear una matriz',
        ruta: '/matrices-riesgo',
        pasos: [
          'Abra **Matrices de Riesgo** para consultar las matrices que ya se encuentran registradas.',
          'Seleccione una matriz para continuar su gestión o abra la matriz avanzada para iniciar una nueva evaluación.',
          'Verifique que está trabajando sobre la organización o proceso correcto antes de registrar cambios.',
        ],
      },
      {
        titulo: '2. Identificar y evaluar riesgos',
        ruta: '/matriz-riesgo-avanzada',
        pasos: [
          'Registre los riesgos identificados en la categoría que corresponda.',
          'Evalúe cada riesgo según los criterios disponibles en la matriz.',
          'Complete los controles, responsables o planes de tratamiento que solicite el formulario.',
          'Revise el resultado antes de guardar para evitar inconsistencias en el mapa de calor.',
        ],
      },
      {
        titulo: '3. Analizar el mapa y el reporte',
        pasos: [
          'Consulte el mapa de calor para identificar los riesgos con mayor prioridad.',
          'Use el reporte ejecutivo cuando necesite compartir los resultados de la matriz.',
          'Actualice la matriz cuando cambien las condiciones, controles o evaluación de un riesgo.',
        ],
      },
    ],
  },
  express: {
    titulo: 'Manual de Express',
    secciones: [
      {
        titulo: '1. Cargue de casos',
        ruta: '/express/carga',
        pasos: [
          'Abra **Express > Carga** y registre la información inicial del caso.',
          'Complete los campos requeridos y valide los datos antes de guardarlos.',
          'Use los catálogos disponibles cuando el formulario los presente para mantener la información estandarizada.',
        ],
      },
      {
        titulo: '2. Liquidación y seguimiento',
        ruta: '/express/liquidador',
        pasos: [
          'Abra **Liquidador** para completar el proceso financiero u operativo del caso.',
          'Registre los datos solicitados y conserve las fechas que sustentan cada etapa.',
          'Consulte el tablero operativo para revisar el avance general y priorizar los pendientes.',
        ],
      },
      {
        titulo: '3. Protocolo y reporte',
        ruta: '/express/protocolo',
        pasos: [
          'Abra **Protocolo** para revisar el cumplimiento de los plazos ANS.',
          'Verifique los casos próximos a vencer o vencidos y complete las fechas faltantes según el flujo operativo.',
          'Abra **Reporte** para consultar o descargar la información consolidada.',
        ],
      },
    ],
  },
  'equidad-fdm': {
    titulo: 'Manual de Equidad FDM',
    secciones: [
      {
        titulo: '1. Registrar la información',
        ruta: '/equidad-fdm/carga',
        pasos: [
          'Abra **Equidad FDM > Carga**.',
          'Registre los datos del caso y complete todos los campos requeridos.',
          'Guarde la información después de verificar que el caso y los valores ingresados correspondan al registro que está gestionando.',
        ],
      },
      {
        titulo: '2. Procesar la liquidación',
        ruta: '/equidad-fdm/liquidador',
        pasos: [
          'Abra el **Liquidador** para procesar la información del caso.',
          'Revise los valores y campos calculados antes de confirmar el resultado.',
          'Corrija los datos desde el flujo autorizado si encuentra información incompleta o inconsistente.',
        ],
      },
      {
        titulo: '3. Consultar el resultado',
        ruta: '/equidad-fdm/dashboard',
        pasos: [
          'Use el **Dashboard** para consultar indicadores y el estado de los registros.',
          'Abra **Reporte** para obtener el consolidado requerido para seguimiento.',
          'Aplique los filtros de cada pantalla antes de analizar o compartir los resultados.',
        ],
      },
    ],
  },
  propiedades: {
    titulo: 'Manual de Propiedades',
    secciones: [
      {
        titulo: '1. Crear un caso de propiedades',
        ruta: '/propiedades/carga',
        pasos: [
          'Abra **Propiedades > Carga** desde el menú lateral.',
          'Complete la información del caso, asegurado y predio según los campos requeridos.',
          'Guarde el registro y confirme que aparece en el flujo de consulta correspondiente.',
        ],
      },
      {
        titulo: '2. Ejecutar la inspección',
        pasos: [
          'Abra el caso de propiedades para iniciar la inspección asociada cuando el flujo la requiera.',
          'Registre la información observada, evidencias y comentarios solicitados en cada sección.',
          'Guarde la inspección antes de salir para que los datos estén disponibles en el seguimiento del caso.',
        ],
      },
      {
        titulo: '3. Revisar indicadores y reportes',
        ruta: '/propiedades/dashboard',
        pasos: [
          'Consulte el **Dashboard** para revisar el estado de los casos de propiedades.',
          'Abra **Reporte** para consultar la información consolidada.',
          'Use filtros de periodo o estado antes de generar conclusiones operativas.',
        ],
      },
    ],
  },
  puertos: {
    titulo: 'Manual de Puertos',
    secciones: [
      {
        titulo: '1. Gestionar actas',
        ruta: '/puertos/actas',
        pasos: [
          'Abra **Puertos > Actas** para consultar los registros existentes.',
          'Seleccione Nueva acta si su perfil tiene habilitada la creación de registros.',
          'Complete los datos solicitados, revise la información y guarde el acta.',
          'Abra una acta existente desde el listado cuando necesite consultarla o editarla.',
        ],
      },
      {
        titulo: '2. Inspecciones y casos de exportación',
        ruta: '/puertos/formulario',
        pasos: [
          'Abra el formulario de inspección para registrar la información de la visita o instalación.',
          'Complete la inspección del asegurado desde la opción correspondiente cuando aplique.',
          'Use el flujo de caso de exportación para crear, consultar o editar registros de ese tipo.',
          'Guarde cada sección antes de continuar con otra operación.',
        ],
      },
      {
        titulo: '3. Catálogos',
        ruta: '/puertos/actas/catalogos',
        pasos: [
          'Abra **Catálogos** para consultar los valores autorizados en el módulo.',
          'Use estos valores en los formularios para conservar consistencia en la información.',
          'Solo modifique catálogos si su rol cuenta con ese permiso.',
        ],
      },
    ],
  },
  'formularios-documentos': {
    titulo: 'Manual de Formularios y Documentos',
    secciones: [
      {
        titulo: '1. Formularios operativos',
        ruta: '/ajuste',
        pasos: [
          'Abra el menú **Formularios** y seleccione Ajuste, POL o Maquinaria según la operación que va a registrar.',
          'Complete los campos requeridos de cada sección y valide la información antes de guardarla.',
          'Adjunte o registre los soportes solicitados por el formulario cuando estén disponibles.',
        ],
      },
      {
        titulo: '2. Consultar el historial',
        ruta: '/historial',
        pasos: [
          'Abra **Historial** para localizar formularios registrados anteriormente.',
          'Use los filtros y búsquedas de la pantalla para ubicar el registro requerido.',
          'Abra el registro para consultarlo o continuar su edición si el estado y sus permisos lo permiten.',
        ],
      },
      {
        titulo: '3. Gestión documental',
        pasos: [
          'Acceda a Gestión documental si esa opción está habilitada para su cuenta.',
          'Organice y consulte los documentos según el flujo autorizado por su perfil.',
          'No elimine ni modifique información documental fuera del procedimiento establecido.',
        ],
      },
    ],
  },
  administracion: {
    titulo: 'Manual de Administración',
    secciones: [
      {
        titulo: '1. Usuarios y perfiles',
        ruta: '/admin/usuarios',
        pasos: [
          'Abra **Administración > Usuarios**.',
          'Busque el usuario que necesita gestionar o cree un registro según las opciones habilitadas.',
          'Revise cuidadosamente el rol y los datos de contacto antes de guardar cambios.',
          'Compruebe que el usuario solo tenga los permisos necesarios para sus funciones.',
        ],
      },
      {
        titulo: '2. Catálogos y responsables',
        pasos: [
          'Abra Clientes y funcionarios, Intermediarios, Responsables o Catálogos según el dato que deba administrar.',
          'Localice el registro, valide que no exista un duplicado y aplique el cambio autorizado.',
          'Guarde y verifique que el nuevo valor esté disponible en los formularios dependientes.',
        ],
      },
      {
        titulo: '3. Alertas y seguimiento',
        ruta: '/complex/alertas',
        pasos: [
          'Abra **Alertas Complex** para consultar el sistema general de alertas.',
          'Priorice los vencimientos y asigne o gestione los casos según el procedimiento de operación.',
          'Use las estadísticas o reportes administrativos para revisar el uso y comportamiento general de la plataforma.',
        ],
      },
    ],
  },
};
