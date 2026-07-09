/**
 * Solicitud básica de documentos — COMPLEX (protocolo oficial).
 * Fuente: SOLICITUD BASICA DE DTOS- COMPLEX.pdf
 */

/** Documentos administrativos habituales (complemento operativo, no sustituyen la lista del PDF). */
export const DOCUMENTOS_COMUNES = [
  { id: 'poliza', label: 'Copia de la póliza de seguros vigente' },
  { id: 'identificacion', label: 'Copia del documento de identidad del asegurado o reclamante' },
  { id: 'poder', label: 'Poder debidamente conferido (cuando actúe apoderado o intermediario)' },
  { id: 'certificacion_bancaria', label: 'Certificación bancaria actualizada' },
  { id: 'rut', label: 'RUT actualizado' },
];

export const NOTAS_GENERALES_SOLICITUD = {
  nota1:
    'NOTA GENERAL 1: La anterior solicitud corresponde a una relación inicial de documentos básicos para el análisis del siniestro. En caso de que, con ocasión de la revisión técnica, jurídica, contable o documental, surjan dudas, inconsistencias, aclaraciones pendientes o necesidad de soportes adicionales para establecer la ocurrencia, modalidad, causa, alcance, cuantía o procedencia de la reclamación, estos serán requeridos oportunamente al asegurado, de conformidad con lo contemplado en el artículo 1077 del Código de Comercio.',
  nota2:
    'NOTA GENERAL 2: Así mismo, agradecemos informar si existen bienes recuperables o salvamento, indicando su ubicación, estado actual y persona responsable de su custodia, con el fin de coordinar las gestiones correspondientes.',
};

export const RAMOS_CONTACTO_INICIAL = {
  maquinaria: {
    etiqueta: '1. Siniestros de maquinaria y equipo',
    documentos: [
      {
        id: 'maq_1',
        numero: 1,
        label:
          'Aviso detallado del siniestro, indicando fecha, hora, lugar, descripción de los hechos y circunstancias en las que ocurrió el evento.',
      },
      {
        id: 'maq_2',
        numero: 2,
        label:
          'Hoja de vida, ficha técnica o documento de identificación de la maquinaria afectada, en el que se evidencie como mínimo: marca, modelo, número de serie, año de fabricación, capacidad, función, ubicación y demás características relevantes.',
      },
      {
        id: 'maq_3',
        numero: 3,
        label:
          'Registro fotográfico del equipo afectado, incluyendo vistas generales, placas de identificación, número de serie y detalle de las partes o componentes afectados.',
      },
      {
        id: 'maq_4',
        numero: 4,
        label:
          'Informe técnico o diagnóstico del daño, emitido por personal interno calificado, servicio técnico autorizado, fabricante o proveedor especializado, en el cual se indique: daños evidenciados, causa probable de la falla, rotura o avería, componentes afectados, posibilidad de reparación o necesidad de reemplazo y recomendaciones técnicas.',
      },
      {
        id: 'maq_5',
        numero: 5,
        label:
          'Historial de mantenimiento preventivo y correctivo de la maquinaria afectada, correspondiente como mínimo a los últimos tres meses anteriores al siniestro. Cuando aplique, incluir bitácoras de operación, registros de inspección, órdenes de servicio y reportes de fallas previas.',
      },
      {
        id: 'maq_6',
        numero: 6,
        label:
          'Cotización de reparación o reemplazo de los componentes afectados, discriminando mano de obra, repuestos, materiales, tiempos de ejecución y condiciones de garantía. En caso de que la reparación ya haya sido realizada, aportar facturas, cuentas de cobro o soportes definitivos del gasto.',
      },
      {
        id: 'maq_7',
        numero: 7,
        label:
          'Factura histórica de compra de la maquinaria o equipo afectado. En caso de no contar con esta, aportar certificación del revisor fiscal o contador en la que se acredite la propiedad, fecha de adquisición, valor en libros y estado contable del activo.',
      },
      {
        id: 'maq_8',
        numero: 8,
        label:
          'Soporte de preexistencia y operación del equipo, tales como inventario de activos, registro contable, fotografías anteriores al siniestro, contratos de mantenimiento, certificados de instalación o documentos que permitan acreditar que el equipo se encontraba en operación antes del evento.',
      },
      {
        id: 'maq_9',
        numero: 9,
        label:
          'Soportes de gastos adicionales, en caso de haberse generado, tales como desmontaje, transporte, diagnóstico, almacenamiento, pruebas, limpieza, preservación o medidas adoptadas para evitar la agravación del daño.',
      },
    ],
  },
  equipo_electrico: {
    etiqueta: '2. Siniestros de equipo eléctrico y/o electrónico / equipo médico',
    documentos: [
      {
        id: 'ee_1',
        numero: 1,
        label:
          'Aviso detallado del siniestro, indicando fecha, hora, lugar, descripción de los hechos y circunstancias en las que ocurrió el evento.',
      },
      {
        id: 'ee_2',
        numero: 2,
        label:
          'Hoja de vida, ficha técnica o documento de identificación del equipo afectado, en el que se evidencie como mínimo: marca, modelo, número de serie, año de fabricación, capacidad, ubicación, función y demás características técnicas relevantes.',
      },
      {
        id: 'ee_3',
        numero: 3,
        label:
          'Registro fotográfico del equipo afectado, incluyendo vistas generales, placas de identificación, número de serie, conexiones, ubicación de instalación y detalle de las partes afectadas.',
      },
      {
        id: 'ee_4',
        numero: 4,
        label:
          'Informe técnico o diagnóstico del daño, emitido por personal interno calificado, servicio técnico autorizado, fabricante o proveedor especializado, en el cual se indique: daños evidenciados, causa probable de la falla, rotura o avería, componentes afectados, posibilidad de reparación o necesidad de reemplazo y recomendaciones técnicas.',
      },
      {
        id: 'ee_5',
        numero: 5,
        label:
          'Historial de mantenimiento preventivo y correctivo del equipo afectado, correspondiente como mínimo a los últimos tres meses anteriores al siniestro. Cuando aplique, incluir órdenes de servicio, reportes de revisión, bitácoras de funcionamiento y antecedentes de fallas.',
      },
      {
        id: 'ee_6',
        numero: 6,
        label:
          'Cotización de reparación o reemplazo de los componentes afectados, discriminando mano de obra, repuestos, materiales, tiempos de ejecución y condiciones de garantía. En caso de que la reparación ya haya sido realizada, aportar facturas, cuentas de cobro o soportes definitivos del gasto.',
      },
      {
        id: 'ee_7',
        numero: 7,
        label:
          'Factura histórica de compra del equipo afectado. En caso de no contar con esta, aportar certificación del revisor fiscal o contador en la que se acredite la propiedad, fecha de adquisición, valor en libros y estado contable del activo.',
      },
    ],
  },
  incendio: {
    etiqueta: '3. Siniestros de incendio',
    preambulo:
      'Para la atención de siniestros derivados de incendio, conato de incendio, humo, hollín, calor, explosión o eventos asociados, se deberá solicitar como mínimo la siguiente documentación:',
    documentos: [
      {
        id: 'inc_1',
        numero: 1,
        label:
          'Aviso detallado del siniestro, indicando fecha, hora, lugar, descripción de los hechos, circunstancias de ocurrencia, área de inicio aparente, personas presentes y medidas adoptadas para controlar el evento.',
      },
      {
        id: 'inc_2',
        numero: 2,
        label:
          'Registro fotográfico y/o videográfico del siniestro, incluyendo imágenes del área afectada, punto probable de origen, extensión de los daños, bienes afectados, labores de atención de emergencia y salvamento disponible.',
      },
      {
        id: 'inc_3',
        numero: 3,
        label:
          'Informe del Cuerpo de Bomberos de la ciudad correspondiente, en el que conste la atención de la emergencia, fecha y hora de intervención, área afectada, labores realizadas y causa probable del incendio, si esta fue determinada.',
      },
      {
        id: 'inc_4',
        numero: 4,
        label:
          'Carta formal de reclamación, firmada por el revisor fiscal o contador, indicando los bienes afectados, concepto reclamado y cuantía estimada de la pérdida.',
      },
      {
        id: 'inc_5',
        numero: 5,
        label:
          'Inventario general de mercancías, materias primas, productos en proceso o producto terminado existente al momento del siniestro, con corte al cierre del día anterior o a la fecha del evento, según el sistema contable, software de inventarios o registros internos de la empresa. Este inventario deberá estar debidamente valorizado.',
      },
      {
        id: 'inc_6',
        numero: 6,
        label:
          'Inventario físico de la mercancía afectada por fuego, humo, hollín, calor o agua utilizada en la atención de la emergencia, debidamente valorizado según facturas de compra, costos de adquisición o registros contables. Este documento deberá identificar cantidades, referencias, estado de afectación y posible condición de salvamento.',
      },
      {
        id: 'inc_7',
        numero: 7,
        label:
          'Relación detallada de contenidos afectados, incluyendo muebles, enseres, equipos eléctricos y electrónicos, maquinaria, herramientas, sistemas de seguridad, CCTV, alarmas, equipos de comunicación y demás bienes impactados por el evento.',
      },
      {
        id: 'inc_8',
        numero: 8,
        label:
          'Soportes de propiedad y preexistencia de los bienes afectados, tales como facturas de compra, inventarios contables, registros de activos fijos, certificaciones del contador o revisor fiscal, fotografías anteriores, actas de entrega o documentos equivalentes.',
      },
      {
        id: 'inc_9',
        numero: 9,
        label:
          'Informe técnico de los equipos eléctricos, electrónicos o tecnológicos afectados, en el que se indiquen daños, causa probable, posibilidad de reparación o reemplazo y cotización correspondiente.',
      },
      {
        id: 'inc_10',
        numero: 10,
        label:
          'Informe técnico de daños en la edificación, cuando exista afectación de estructura, cubierta, muros, fachadas, instalaciones eléctricas, redes hidráulicas, acabados, cielo raso, pisos, puertas, ventanas u otros elementos constructivos. El informe deberá incluir alcance de los daños, causa, pruebas pertinentes y presupuesto de reparación.',
      },
      {
        id: 'inc_11',
        numero: 11,
        label:
          'Presupuestos, cotizaciones, facturas definitivas o cuentas de cobro relacionadas con las reparaciones de la edificación, instalaciones eléctricas, cielo raso, acabados, redes, equipos o demás bienes afectados.',
      },
      {
        id: 'inc_12',
        numero: 12,
        label:
          'Relación de gastos incurridos en labores de emergencia, remoción, limpieza, disposición de escombros, adecuación, readecuación, protección, custodia o preservación de bienes, debidamente soportados con facturas, cuentas de cobro, recibos o comprobantes de pago.',
      },
      {
        id: 'inc_13',
        numero: 13,
        label:
          'Soportes de intervención de autoridades o entidades externas, cuando aplique, tales como policía, gestión del riesgo, empresa de energía, autoridades ambientales, administración del inmueble, parque industrial o copropiedad.',
      },
      {
        id: 'inc_14',
        numero: 14,
        label:
          'Relación del salvamento, indicando bienes recuperables, mercancía parcialmente afectada, equipos susceptibles de reparación, residuos aprovechables y lugar donde se encuentran almacenados.',
      },
      {
        id: 'inc_15',
        numero: 15,
        label:
          'Soportes contables de compras, ventas, kardex, inventarios, movimientos de mercancía y registros de producción, cuando la reclamación incluya mercancías, materias primas, producto en proceso o producto terminado.',
      },
    ],
  },
  hurto: {
    etiqueta: '4. Siniestros de hurto simple y/o calificado',
    documentos: [
      {
        id: 'hur_1',
        numero: 1,
        label:
          'Aviso detallado del siniestro, indicando fecha, hora, lugar, descripción de los hechos, circunstancias en las que ocurrió el evento, forma en que fue advertido el hurto y bienes presuntamente sustraídos.',
      },
      {
        id: 'hur_2',
        numero: 2,
        label:
          'Denuncia penal instaurada ante la autoridad competente, en la que se detallen los hechos, fecha de ocurrencia, lugar, bienes hurtados y demás circunstancias conocidas por el asegurado.',
      },
      {
        id: 'hur_3',
        numero: 3,
        label:
          'Relación detallada de los bienes reclamados, indicando descripción, marca, modelo, referencia, número de serie, cantidad, valor reclamado, fecha de adquisición y ubicación habitual de cada bien.',
      },
      {
        id: 'hur_4',
        numero: 4,
        label:
          'Soportes de propiedad y preexistencia de los bienes hurtados, tales como facturas de compra, inventarios contables, registros de activos fijos, certificación del contador o revisor fiscal.',
      },
      {
        id: 'hur_5',
        numero: 5,
        label:
          'Registro fotográfico del lugar de los hechos, incluyendo accesos, puertas, ventanas, cerraduras, rejas, muros, techos, bodegas, vitrinas, cajas fuertes, archivadores o zonas donde se encontraban los bienes sustraídos.',
      },
      {
        id: 'hur_6',
        numero: 6,
        label:
          'Videos de cámaras de seguridad o CCTV, propios o de terceros, que registren el momento del hurto, ingreso de los presuntos responsables, movimientos sospechosos o condiciones del lugar antes y después del evento. Soportes del sistema de seguridad, cuando existan, tales como reporte de alarma, monitoreo de empresa de vigilancia, registro de activaciones, informe de central de monitoreo, bitácora de vigilancia, minuta de portería o control de acceso.',
      },
      {
        id: 'hur_7',
        numero: 7,
        label:
          'Cotización de reposición de los bienes hurtados, con características iguales o similares a los bienes reclamados, discriminando valor unitario, cantidad, impuestos y condiciones comerciales.',
      },
      {
        id: 'hur_8',
        numero: 8,
        label:
          'Cotizaciones, facturas o cuentas de cobro por reparación de daños materiales derivados del hurto, tales como arreglo de cerraduras, puertas, ventanas, rejas, vidrios, muros, techos, cajas fuertes, alarmas o sistemas de seguridad.',
      },
      {
        id: 'hur_9',
        numero: 9,
        label:
          'Informe o certificación contable, cuando se reclamen inventarios, mercancías, dinero, títulos valores o bienes registrados contablemente, indicando existencia previa, valor en libros, costo de adquisición y afectación económica reclamada.',
      },
      {
        id: 'hur_10',
        numero: 10,
        label:
          'Kardex, movimientos de inventario, registros de entrada y salida, compras y ventas, cuando la reclamación involucre mercancías, materias primas, producto terminado, repuestos o inventarios comerciales (si aplica).',
      },
      {
        id: 'hur_11',
        numero: 11,
        label:
          'Arqueo de caja, cierre diario, comprobantes contables y soportes de manejo de efectivo, cuando el reclamo incluya dinero en efectivo, cheques, bonos, títulos valores u otros valores bajo custodia (si aplica).',
      },
      {
        id: 'hur_12',
        numero: 12,
        label:
          'Informe de la empresa de seguridad, donde se indique las circunstancias de tiempo y lugar al momento de la ocurrencia del hurto.',
      },
    ],
  },
  vidrios: {
    etiqueta: '8. Siniestros de rotura de vidrios',
    documentos: [
      {
        id: 'vid_1',
        numero: 1,
        label:
          'Aviso detallado del siniestro, indicando fecha, hora, lugar, descripción de los hechos y circunstancias en las que ocurrió la rotura del vidrio.',
      },
      { id: 'vid_2', numero: 2, label: 'Registro fotográfico del daño.' },
      {
        id: 'vid_3',
        numero: 3,
        label:
          'Cotización de reposición del vidrio afectado o factura de reposición de este en el caso que haya sido reemplazado.',
      },
      {
        id: 'vid_4',
        numero: 4,
        label:
          'Informe de administración, vigilancia, portería o copropiedad, cuando el evento haya ocurrido en edificio, centro comercial, conjunto residencial, parque industrial o inmueble sometido a administración (si aplica).',
      },
      {
        id: 'vid_5',
        numero: 5,
        label:
          'Videos de cámaras de seguridad o CCTV, cuando existan, que permitan verificar la ocurrencia del evento, el momento de la rotura, la intervención de terceros o las condiciones del área antes y después del hecho (si aplica).',
      },
    ],
  },
  trdm: {
    etiqueta: '9. Siniestros de temblor o TRDM (daños en estructura civil)',
    documentos: [
      {
        id: 'trd_1',
        numero: 1,
        label:
          'Aviso detallado del siniestro, indicando fecha, hora, lugar, descripción de los hechos y circunstancias en las que ocurrió el evento.',
      },
      {
        id: 'trd_2',
        numero: 2,
        label: 'Relación detallada de los bienes, valores o conceptos reclamados.',
      },
      { id: 'trd_3', numero: 3, label: 'Actas, reportes internos o informe de incidente.' },
      {
        id: 'trd_4',
        numero: 4,
        label: 'Informe técnico de causa raíz, emitido por personal calificado (anexar matrícula profesional).',
      },
      {
        id: 'trd_5',
        numero: 5,
        label: 'Presupuesto de reparación elaborado por personal calificado (anexar matrícula profesional).',
      },
      {
        id: 'trd_6',
        numero: 6,
        label: 'Memoria de cantidades y APU elaborado por personal calificado (anexar matrícula profesional).',
      },
      { id: 'trd_7', numero: 7, label: 'Registro fotográfico del evento.' },
    ],
  },
  transporte: {
    etiqueta: '10. Siniestros de transporte / marine',
    documentos: [
      {
        id: 'tra_1',
        numero: 1,
        label:
          'Aviso detallado del siniestro, indicando fecha, hora, lugar, descripción de los hechos y circunstancias en las que ocurrió.',
      },
      { id: 'tra_2', numero: 2, label: 'Relato del conductor.' },
      { id: 'tra_3', numero: 3, label: 'Copia del B/L o conocimiento de embarque (si aplica).' },
      { id: 'tra_4', numero: 4, label: 'Copia de manifiesto de carga (si aplica).' },
      {
        id: 'tra_5',
        numero: 5,
        label:
          'Denuncia penal o noticia criminal presentada ante la autoridad competente (si aplica).',
      },
      {
        id: 'tra_6',
        numero: 6,
        label: 'Documento que acredite el transporte de los bienes que resultaron afectados.',
      },
      {
        id: 'tra_7',
        numero: 7,
        label:
          'Certificación de valor a costo de la mercancía por parte del generador (sin la utilidad generada por venta).',
      },
      {
        id: 'tra_8',
        numero: 8,
        label: 'Registros de temperatura, humedad, cadena de frío o monitoreo (si aplica).',
      },
      { id: 'tra_9', numero: 9, label: 'Informe de autoridades de tránsito / croquis (si aplica).' },
      {
        id: 'tra_10',
        numero: 10,
        label: 'Informe de autoridad portuaria, naviera, agente de carga o puerto.',
      },
      {
        id: 'tra_11',
        numero: 11,
        label:
          'Informe de seguridad, monitoreo, trazabilidad GPS o reporte de la empresa de transporte.',
      },
    ],
  },
  rce_lesiones: {
    etiqueta: '11. RCE — Lesiones',
    documentos: [
      {
        id: 'rcl_1',
        numero: 1,
        label: 'Reclamación por parte del tercero de las circunstancias de tiempo, modo y lugar.',
      },
      {
        id: 'rcl_2',
        numero: 2,
        label: 'Relación detallada y valorizada de los perjuicios reclamados.',
      },
      {
        id: 'rcl_3',
        numero: 3,
        label:
          'Registro fotográfico, videos, informes, actas o reportes del lugar de ocurrencia del evento, cuando existan, que permitan validar los hechos.',
      },
      { id: 'rcl_4', numero: 4, label: 'Epicrisis del afectado.' },
      { id: 'rcl_5', numero: 5, label: 'Historia clínica completa del afectado.' },
      { id: 'rcl_6', numero: 6, label: 'Certificado de incapacidad definitiva.' },
      {
        id: 'rcl_7',
        numero: 7,
        label:
          'Dictamen de pérdida de capacidad laboral o concepto médico de secuelas, en caso de que existan lesiones permanentes, limitaciones funcionales o afectación definitiva.',
      },
      {
        id: 'rcl_8',
        numero: 8,
        label: 'En caso de existir denuncia en fiscalía — dictamen de medicina legal.',
      },
      {
        id: 'rcl_9',
        numero: 9,
        label:
          'Facturas de gastos médicos incurridos (copagos, soportes de los gastos por atención).',
      },
      {
        id: 'rcl_10',
        numero: 10,
        label:
          'Gastos incurridos para la manutención del lesionado en busca del restablecimiento de su salud (facturas o recibos).',
      },
      {
        id: 'rcl_11',
        numero: 11,
        label:
          'Certificación laboral del lesionado, cuando se reclame lucro cesante, indicando cargo, salario, tipo de contrato y periodo de ausencia laboral.',
      },
      {
        id: 'rcl_12',
        numero: 12,
        label:
          'Soportes de ingresos del lesionado, según corresponda: desprendibles de nómina, certificación de ingresos, contrato laboral, declaración de renta, RUT, extractos bancarios o certificación de contador público.',
      },
    ],
  },
  rce_muerte: {
    etiqueta: '11. RCE — Muerte',
    documentos: [
      {
        id: 'rcm_1',
        numero: 1,
        label: 'Reclamación por parte del tercero de las circunstancias de tiempo, modo y lugar.',
      },
      {
        id: 'rcm_2',
        numero: 2,
        label:
          'Registro fotográfico, videos, informes, actas o reportes del lugar de ocurrencia del evento, cuando existan, que permitan validar los hechos.',
      },
      { id: 'rcm_3', numero: 3, label: 'Registro civil de defunción.' },
      {
        id: 'rcm_4',
        numero: 4,
        label:
          'Historia clínica, epicrisis o soportes médicos de atención, cuando la persona fallecida haya recibido atención médica con ocasión del evento reclamado.',
      },
      {
        id: 'rcm_5',
        numero: 5,
        label: 'Informe de necropsia, acta de inspección técnica, dictamen de medicina legal.',
      },
      {
        id: 'rcm_6',
        numero: 6,
        label:
          'Documentos que acrediten el parentesco o vínculo con la persona fallecida, según corresponda: registro civil de nacimiento, registro civil de matrimonio, declaración de unión marital de hecho, registros civiles de hijos, padres, cónyuge o compañeros permanentes.',
      },
      {
        id: 'rcm_7',
        numero: 7,
        label:
          'Relación detallada y valorizada de los perjuicios reclamados, discriminando daño emergente, gastos funerarios, lucro cesante, perjuicios morales u otros conceptos pretendidos.',
      },
      {
        id: 'rcm_8',
        numero: 8,
        label:
          'Facturas y soportes de pago de gastos funerarios, exequiales, traslados, servicios religiosos, cremación, inhumación u otros gastos directamente asociados, cuando sean objeto de reclamación.',
      },
      {
        id: 'rcm_9',
        numero: 9,
        label: 'Soportes de ingresos de la persona fallecida, en caso de reclamarse lucro cesante.',
      },
      {
        id: 'rcm_10',
        numero: 10,
        label:
          'Soportes que acrediten dependencia económica de los reclamantes, cuando se reclame lucro cesante.',
      },
    ],
  },
  general: {
    etiqueta: 'General / no especificado',
    documentos: [
      {
        id: 'gen_1',
        numero: 1,
        label:
          'Aviso detallado del siniestro, indicando fecha, hora, lugar, descripción de los hechos y circunstancias en las que ocurrió el evento.',
      },
      { id: 'gen_2', numero: 2, label: 'Registro fotográfico del daño o afectación.' },
      {
        id: 'gen_3',
        numero: 3,
        label: 'Relación detallada de bienes o conceptos reclamados, debidamente valorizada.',
      },
      {
        id: 'gen_4',
        numero: 4,
        label: 'Soportes de propiedad y preexistencia de los bienes afectados (si aplica).',
      },
      {
        id: 'gen_5',
        numero: 5,
        label: 'Cotizaciones, presupuestos o facturas relacionadas con la reparación o reposición (si existen).',
      },
    ],
  },
};

const ALIAS_RAMO = [
  { patron: /VIDRIO/i, key: 'vidrios' },
  { patron: /TEMBLOR|ESTRUCTURA CIVIL/i, key: 'trdm' },
  { patron: /\bTRDM\b/i, key: 'trdm' },
  { patron: /INCENDIO|CONATO|HUMO|HOLL[IÍ]N|EXPLOSI[OÓ]N/i, key: 'incendio' },
  { patron: /HURTO|SUSTRAC|ROBO/i, key: 'hurto' },
  {
    patron: /ELECTR[IÍ]CO|ELECTR[OÓ]NICO|EQUIPO M[EÉ]DICO|MEDICO HOSPITALARIO/i,
    key: 'equipo_electrico',
  },
  { patron: /MAQUINARIA|ROTURA DE MAQUINARIA/i, key: 'maquinaria' },
  { patron: /TRANSPORTE|MARINE|MAR[IÍ]TIMO|EMBARQUE|MANIFIESTO/i, key: 'transporte' },
  { patron: /RCE|RESPONSABILIDAD CIVIL/i, key: 'rce_lesiones' },
  { patron: /TODO RIESGO|DA[ÑN]O MATERIAL|RIESGO INDUSTRIAL/i, key: 'incendio' },
  { patron: /HOGAR|VIVIENDA|APARTAMENTO|CASA/i, key: 'incendio' },
  { patron: /AUTO|VEH[IÍ]CULO|MOTOCICLETA|SOAT/i, key: 'general' },
  { patron: /LUCRO|CESANTE/i, key: 'general' },
];

export function detectarRamoContactoInicial(tipoPoliza = '', amprAfctado = '') {
  const texto = `${tipoPoliza} ${amprAfctado}`.trim();
  if (!texto) return 'general';
  const match = ALIAS_RAMO.find(({ patron }) => patron.test(texto));
  return match?.key || 'general';
}

export function obtenerRamoContactoInicial(ramoKey) {
  return RAMOS_CONTACTO_INICIAL[ramoKey] || RAMOS_CONTACTO_INICIAL.general;
}

export function documentosSugeridosPorRamo(ramoKey) {
  const ramo = obtenerRamoContactoInicial(ramoKey);
  return {
    ramoKey: RAMOS_CONTACTO_INICIAL[ramoKey] ? ramoKey : 'general',
    etiquetaRamo: ramo.etiqueta,
    preambuloRamo: ramo.preambulo || '',
    comunes: DOCUMENTOS_COMUNES,
    especificos: ramo.documentos,
    incluirNotasGenerales: false,
  };
}

/** IDs seleccionados por defecto: solo documentos del protocolo PDF por ramo. */
export function idsDocumentosPorDefecto(ramoKey) {
  const { especificos } = documentosSugeridosPorRamo(ramoKey);
  return especificos.map((d) => d.id);
}

/** Lista ordenada de documentos seleccionados con numeración del protocolo. */
export function documentosSeleccionadosOrdenados(ramoKey, idsSeleccionados) {
  const set = idsSeleccionados instanceof Set ? idsSeleccionados : new Set(idsSeleccionados || []);
  const { comunes, especificos } = documentosSugeridosPorRamo(ramoKey);
  const protocolo = especificos
    .filter((d) => set.has(d.id))
    .map((d) => ({ numero: d.numero, label: d.label, esComun: false }));
  const administrativos = comunes
    .filter((d) => set.has(d.id))
    .map((d) => ({ label: d.label, esComun: true }));
  return [...protocolo, ...administrativos];
}
