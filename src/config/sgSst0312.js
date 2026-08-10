/**
 * Resolución 0312 de 2019 — catálogo y reglas de aplicación.
 *
 * CAP1 (≤10, riesgo I–III): solo evalúa 7 ítems (Art. 3). El resto de la tabla
 * Art. 27 queda en "No aplica" con puntaje máximo automático.
 * CAP2 (11–50, I–III): ítems del Art. 9; resto No aplica automático.
 * CAP3 (>50 o riesgo IV–V): tabla completa.
 */

export const CLASES_RIESGO = [
  { value: 'I', label: 'I — Mínimo' },
  { value: 'II', label: 'II — Bajo' },
  { value: 'III', label: 'III — Medio' },
  { value: 'IV', label: 'IV — Alto' },
  { value: 'V', label: 'V — Máximo' },
];

export const PERFILES_EVALUACION = {
  CAP1: 'CAP1',
  CAP2: 'CAP2',
  CAP3: 'CAP3',
};

export const PERFIL_META = {
  CAP1: {
    id: 'CAP1',
    titulo: 'Capítulo 1 — Microempresa (≤10)',
    subtitulo:
      'Diez (10) o menos trabajadores, riesgo I, II o III. Solo evaluás 7 ítems; el resto del formato queda No aplica con puntaje completo (Art. 3 / Art. 27).',
  },
  CAP2: {
    id: 'CAP2',
    titulo: 'Capítulo 2 — Pequeña empresa (11–50)',
    subtitulo:
      'Once (11) a cincuenta (50) trabajadores, riesgo I, II o III. Se evalúan los ítems del Art. 9; el resto No aplica con puntaje completo.',
  },
  CAP3: {
    id: 'CAP3',
    titulo: 'Capítulo 3 — Tabla completa',
    subtitulo:
      'Más de cincuenta (50) trabajadores, o cualquier tamaño con riesgo IV o V. Se evalúa la tabla completa (Art. 16 / Art. 27).',
  },
};

export function resolverPerfil0312(numTrabajadores, claseRiesgo) {
  const n = Number(numTrabajadores);
  const riesgo = String(claseRiesgo || '').toUpperCase();
  if (!Number.isFinite(n) || n < 1) return null;
  if (!['I', 'II', 'III', 'IV', 'V'].includes(riesgo)) return null;

  const riesgoAlto = riesgo === 'IV' || riesgo === 'V';
  if (riesgoAlto || n > 50) return PERFILES_EVALUACION.CAP3;
  if (n <= 10) return PERFILES_EVALUACION.CAP1;
  return PERFILES_EVALUACION.CAP2;
}

/** Códigos Art. 27 que SÍ se evalúan en cada perfil (el resto = No aplica automático). */
export const CODIGOS_APLICABLES = {
  // Art. 3 — 7 estándares
  CAP1: ['1.1.1', '1.1.4', '1.2.1', '2.4.1', '3.1.4', '4.1.1', '4.2.1'],
  // Art. 9 — estándares para 11–50 / I–III
  CAP2: [
    '1.1.1',
    '1.1.3',
    '1.1.4',
    '1.1.6',
    '1.1.7',
    '1.1.8',
    '1.2.1',
    '2.1.1',
    '2.4.1',
    '2.5.1',
    '3.1.1',
    '3.1.2',
    '3.1.4',
    '3.1.6',
    '3.2.1',
    '3.2.2',
    '4.1.1',
    '4.1.2',
    '4.2.5',
    '4.2.6',
    '5.1.1',
    '5.1.2',
    '6.1.3',
  ],
  CAP3: null, // todos
};

/** Secciones del formato tipo SURA (misma estructura de la tabla Art. 27). */
export const GRUPOS_SURA = [
  { id: 'recursos', ciclo: 'I. PLANEAR', titulo: 'RECURSOS (10%)', peso: 10 },
  { id: 'capacitacion', ciclo: 'I. PLANEAR', titulo: 'CAPACITACIÓN EN EL SG-SST (6%)', peso: 6 },
  { id: 'gestion_integral', ciclo: 'I. PLANEAR', titulo: 'GESTIÓN INTEGRAL DEL SG-SST (15%)', peso: 15 },
  { id: 'gestion_salud', ciclo: 'II. HACER', titulo: 'GESTIÓN DE LA SALUD (20%)', peso: 20 },
  { id: 'peligros', ciclo: 'II. HACER', titulo: 'GESTIÓN DE PELIGROS Y RIESGOS (30%)', peso: 30 },
  { id: 'amenazas', ciclo: 'II. HACER', titulo: 'GESTIÓN DE AMENAZAS (10%)', peso: 10 },
  { id: 'verificar', ciclo: 'III. VERIFICAR', titulo: 'VERIFICACIÓN DEL SG-SST (5%)', peso: 5 },
  { id: 'mejoramiento', ciclo: 'IV. ACTUAR', titulo: 'MEJORAMIENTO (10%)', peso: 10 },
];

export function grupoSuraDesdeCodigo(codigo) {
  if (codigo.startsWith('1.1.')) return 'recursos';
  if (codigo.startsWith('1.2.')) return 'capacitacion';
  if (codigo.startsWith('2.')) return 'gestion_integral';
  if (codigo.startsWith('3.')) return 'gestion_salud';
  if (codigo.startsWith('4.')) return 'peligros';
  if (codigo.startsWith('5.')) return 'amenazas';
  if (codigo.startsWith('6.')) return 'verificar';
  if (codigo.startsWith('7.')) return 'mejoramiento';
  return 'recursos';
}

/** Tabla de valores Art. 27 (peso total 100). Orden = Excel SURA. */
export const ITEMS_ART27 = [
  { codigo: '1.1.1', valor: 0.5, ciclo: 'I. PLANEAR', estandar: 'Recursos', item: 'Responsable del SG-SST', criterio: 'Asignar persona que diseñe e implemente el SG-SST según perfil exigido.', modoVerificacion: 'Documento de asignación y hoja de vida con soportes.' },
  { codigo: '1.1.2', valor: 0.5, ciclo: 'I. PLANEAR', estandar: 'Recursos', item: 'Responsabilidades en el SG-SST', criterio: 'Asignar y documentar responsabilidades en SST en todos los niveles.', modoVerificacion: 'Soporte de asignación de responsabilidades.' },
  { codigo: '1.1.3', valor: 0.5, ciclo: 'I. PLANEAR', estandar: 'Recursos', item: 'Asignación de recursos para el SG-SST', criterio: 'Definir y asignar talento humano, recursos financieros, técnicos y tecnológicos.', modoVerificacion: 'Evidencias de asignación de recursos.' },
  { codigo: '1.1.4', valor: 0.5, ciclo: 'I. PLANEAR', estandar: 'Recursos', item: 'Afiliación al Sistema General de Riesgos Laborales', criterio: 'Garantizar afiliación a Salud, Pensión y Riesgos Laborales.', modoVerificacion: 'Soportes de afiliación y pago.' },
  { codigo: '1.1.5', valor: 0.5, ciclo: 'I. PLANEAR', estandar: 'Recursos', item: 'Trabajadores de alto riesgo y pensión especial', criterio: 'Identificar trabajadores en alto riesgo y cotización especial cuando aplique.', modoVerificacion: 'Listado e identificación de alto riesgo.' },
  { codigo: '1.1.6', valor: 0.5, ciclo: 'I. PLANEAR', estandar: 'Recursos', item: 'Conformación COPASST / Vigía', criterio: 'Conformar y garantizar funcionamiento del COPASST o Vigía según norma.', modoVerificacion: 'Actas de conformación y reuniones.' },
  { codigo: '1.1.7', valor: 0.5, ciclo: 'I. PLANEAR', estandar: 'Recursos', item: 'Capacitación COPASST / Vigía', criterio: 'Capacitar a integrantes del COPASST o Vigía.', modoVerificacion: 'Soportes de capacitación.' },
  { codigo: '1.1.8', valor: 0.5, ciclo: 'I. PLANEAR', estandar: 'Recursos', item: 'Comité de Convivencia Laboral', criterio: 'Conformar y garantizar funcionamiento del Comité de Convivencia.', modoVerificacion: 'Actas de conformación y reuniones.' },
  { codigo: '1.2.1', valor: 2, ciclo: 'I. PLANEAR', estandar: 'Capacitación', item: 'Programa de capacitación PyP', criterio: 'Elaborar y ejecutar programa de capacitación en promoción y prevención.', modoVerificacion: 'Programa y planillas firmadas.' },
  { codigo: '1.2.2', valor: 2, ciclo: 'I. PLANEAR', estandar: 'Capacitación', item: 'Inducción y reinducción SG-SST', criterio: 'Inducción y reinducción a todos los trabajadores.', modoVerificacion: 'Listas y soportes de inducción/reinducción.' },
  { codigo: '1.2.3', valor: 2, ciclo: 'I. PLANEAR', estandar: 'Capacitación', item: 'Curso virtual 50 horas', criterio: 'Responsable del SG-SST con curso virtual de 50 horas.', modoVerificacion: 'Certificado del curso de 50 horas.' },
  { codigo: '2.1.1', valor: 1, ciclo: 'I. PLANEAR', estandar: 'Gestión integral', item: 'Política de SST', criterio: 'Política escrita, firmada, fechada y comunicada.', modoVerificacion: 'Política y evidencias de divulgación.' },
  { codigo: '2.2.1', valor: 1, ciclo: 'I. PLANEAR', estandar: 'Gestión integral', item: 'Objetivos del SG-SST', criterio: 'Objetivos claros, medibles, con metas y documentados.', modoVerificacion: 'Documento de objetivos y difusión.' },
  { codigo: '2.3.1', valor: 1, ciclo: 'I. PLANEAR', estandar: 'Gestión integral', item: 'Evaluación inicial del SG-SST', criterio: 'Evaluación inicial e identificación de prioridades.', modoVerificacion: 'Documento de evaluación inicial.' },
  { codigo: '2.4.1', valor: 2, ciclo: 'I. PLANEAR', estandar: 'Gestión integral', item: 'Plan Anual de Trabajo', criterio: 'Plan con objetivos, metas, responsabilidades, recursos y cronograma firmado.', modoVerificacion: 'Plan Anual de Trabajo.' },
  { codigo: '2.5.1', valor: 2, ciclo: 'I. PLANEAR', estandar: 'Gestión integral', item: 'Conservación documental', criterio: 'Archivo y retención documental del SG-SST.', modoVerificacion: 'Sistema de archivo y muestreo de registros.' },
  { codigo: '2.6.1', valor: 1, ciclo: 'I. PLANEAR', estandar: 'Gestión integral', item: 'Rendición de cuentas', criterio: 'Rendición de cuentas anual del SG-SST.', modoVerificacion: 'Registros de rendición de cuentas.' },
  { codigo: '2.7.1', valor: 2, ciclo: 'I. PLANEAR', estandar: 'Gestión integral', item: 'Matriz legal', criterio: 'Matriz legal actualizada de normas aplicables.', modoVerificacion: 'Matriz legal.' },
  { codigo: '2.8.1', valor: 1, ciclo: 'I. PLANEAR', estandar: 'Gestión integral', item: 'Comunicación', criterio: 'Mecanismos de comunicación interna y externa en SST.', modoVerificacion: 'Evidencia de mecanismos de comunicación.' },
  { codigo: '2.9.1', valor: 1, ciclo: 'I. PLANEAR', estandar: 'Gestión integral', item: 'Adquisiciones', criterio: 'Procedimiento SST para adquisición de productos y servicios.', modoVerificacion: 'Procedimiento y cumplimiento.' },
  { codigo: '2.10.1', valor: 2, ciclo: 'I. PLANEAR', estandar: 'Gestión integral', item: 'Contratación / proveedores', criterio: 'Criterios SST para selección de proveedores y contratistas.', modoVerificacion: 'Documento de criterios SST.' },
  { codigo: '2.11.1', valor: 1, ciclo: 'I. PLANEAR', estandar: 'Gestión integral', item: 'Gestión del cambio', criterio: 'Evaluar impacto SST de cambios internos o externos.', modoVerificacion: 'Procedimiento de gestión del cambio.' },
  { codigo: '3.1.1', valor: 1, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Perfil sociodemográfico y diagnóstico de salud', criterio: 'Descripción sociodemográfica y diagnóstico de condiciones de salud.', modoVerificacion: 'Documento consolidado.' },
  { codigo: '3.1.2', valor: 1, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Actividades de medicina del trabajo y PyP', criterio: 'Actividades de medicina del trabajo, promoción y prevención.', modoVerificacion: 'Evidencias de ejecución.' },
  { codigo: '3.1.3', valor: 1, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Perfiles de cargo al médico', criterio: 'Informar al médico los perfiles de cargo y medio de trabajo.', modoVerificacion: 'Soportes enviados al médico.' },
  { codigo: '3.1.4', valor: 1, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Evaluaciones médicas ocupacionales', criterio: 'Evaluaciones médicas según peligros/riesgos y periodicidad.', modoVerificacion: 'Conceptos de aptitud y frecuencia definida.' },
  { codigo: '3.1.5', valor: 1, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Custodia de historias clínicas', criterio: 'Custodia a cargo de IPS o médico ocupacional.', modoVerificacion: 'Soportes de custodia.' },
  { codigo: '3.1.6', valor: 1, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Restricciones y recomendaciones médicas', criterio: 'Cumplir restricciones y recomendaciones médico-laborales.', modoVerificacion: 'Evidencias de acatamiento.' },
  { codigo: '3.1.7', valor: 1, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Estilos de vida y entornos saludables', criterio: 'Programa de estilos de vida y entornos saludables.', modoVerificacion: 'Programa y registros.' },
  { codigo: '3.1.8', valor: 1, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Agua potable y servicios sanitarios', criterio: 'Agua potable, sanitarios y disposición de basuras.', modoVerificacion: 'Observación / evidencias.' },
  { codigo: '3.1.9', valor: 1, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Manejo de residuos', criterio: 'Eliminación adecuada de residuos, incluidos peligrosos.', modoVerificacion: 'Evidencias y contratos de disposición.' },
  { codigo: '3.2.1', valor: 2, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Reporte de AT y EL', criterio: 'Reportar AT/EL a ARL, EPS y Dirección Territorial cuando aplique.', modoVerificacion: 'FURAT / FUREL y tiempos de reporte.' },
  { codigo: '3.2.2', valor: 2, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Investigación de incidentes, AT y EL', criterio: 'Investigar con participación del COPASST.', modoVerificacion: 'Investigaciones y acciones.' },
  { codigo: '3.2.3', valor: 1, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Registro y análisis estadístico', criterio: 'Registro estadístico y análisis de AT/EL.', modoVerificacion: 'Registros y análisis.' },
  { codigo: '3.3.1', valor: 1, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Frecuencia de accidentalidad', criterio: 'Medir frecuencia de accidentalidad mínimo mensual.', modoVerificacion: 'Indicadores.' },
  { codigo: '3.3.2', valor: 1, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Severidad de accidentalidad', criterio: 'Medir severidad mínimo mensual.', modoVerificacion: 'Indicadores.' },
  { codigo: '3.3.3', valor: 1, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Mortalidad por AT', criterio: 'Medir mortalidad por AT mínimo anual.', modoVerificacion: 'Indicadores.' },
  { codigo: '3.3.4', valor: 1, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Prevalencia de EL', criterio: 'Medir prevalencia de enfermedad laboral mínimo anual.', modoVerificacion: 'Indicadores.' },
  { codigo: '3.3.5', valor: 1, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Incidencia de EL', criterio: 'Medir incidencia de enfermedad laboral mínimo anual.', modoVerificacion: 'Indicadores.' },
  { codigo: '3.3.6', valor: 1, ciclo: 'II. HACER', estandar: 'Gestión de la salud', item: 'Ausentismo por causa médica', criterio: 'Medir ausentismo por incapacidad mínimo mensual.', modoVerificacion: 'Indicadores.' },
  { codigo: '4.1.1', valor: 4, ciclo: 'II. HACER', estandar: 'Peligros y riesgos', item: 'Metodología de identificación de peligros', criterio: 'Definir y aplicar metodología de identificación, evaluación y valoración.', modoVerificacion: 'Documento de metodología y aplicación.' },
  { codigo: '4.1.2', valor: 4, ciclo: 'II. HACER', estandar: 'Peligros y riesgos', item: 'Identificación con participación', criterio: 'Identificar peligros con participación de todos los niveles; actualizar mínimo anual.', modoVerificacion: 'Evidencias de participación y actualización.' },
  { codigo: '4.1.3', valor: 3, ciclo: 'II. HACER', estandar: 'Peligros y riesgos', item: 'Sustancias carcinógenas / toxicidad aguda', criterio: 'Identificar sustancias carcinógenas o con toxicidad aguda cuando aplique.', modoVerificacion: 'Listas de materias primas e insumos.' },
  { codigo: '4.1.4', valor: 4, ciclo: 'II. HACER', estandar: 'Peligros y riesgos', item: 'Mediciones ambientales', criterio: 'Mediciones ambientales de riesgos prioritarios químicos, físicos y/o biológicos.', modoVerificacion: 'Informes de mediciones.' },
  { codigo: '4.2.1', valor: 2.5, ciclo: 'II. HACER', estandar: 'Peligros y riesgos', item: 'Medidas de prevención y control', criterio: 'Ejecutar medidas de prevención y control según jerarquía.', modoVerificacion: 'Evidencias de ejecución.' },
  { codigo: '4.2.2', valor: 2.5, ciclo: 'II. HACER', estandar: 'Peligros y riesgos', item: 'Verificación de aplicación por trabajadores', criterio: 'Verificar que los trabajadores apliquen las medidas.', modoVerificacion: 'Soportes de verificación.' },
  { codigo: '4.2.3', valor: 2.5, ciclo: 'II. HACER', estandar: 'Peligros y riesgos', item: 'Procedimientos e instructivos', criterio: 'Elaborar y entregar procedimientos, instructivos y fichas.', modoVerificacion: 'Documentos y entrega a trabajadores.' },
  { codigo: '4.2.4', valor: 2.5, ciclo: 'II. HACER', estandar: 'Peligros y riesgos', item: 'Inspecciones a instalaciones y equipos', criterio: 'Inspecciones sistemáticas con participación del COPASST.', modoVerificacion: 'Formatos e informes de inspección.' },
  { codigo: '4.2.5', valor: 2.5, ciclo: 'II. HACER', estandar: 'Peligros y riesgos', item: 'Mantenimiento periódico', criterio: 'Mantenimiento de instalaciones, equipos, máquinas y herramientas.', modoVerificacion: 'Reportes de mantenimiento.' },
  { codigo: '4.2.6', valor: 2.5, ciclo: 'II. HACER', estandar: 'Peligros y riesgos', item: 'Entrega de EPP', criterio: 'Entregar EPP, reponerlos y capacitar; verificar contratistas.', modoVerificacion: 'Actas de entrega y capacitaciones.' },
  { codigo: '5.1.1', valor: 5, ciclo: 'II. HACER', estandar: 'Amenazas', item: 'Plan de prevención y respuesta ante emergencias', criterio: 'Plan de emergencias con amenazas, vulnerabilidad y divulgación.', modoVerificacion: 'Plan y evidencias de divulgación.' },
  { codigo: '5.1.2', valor: 5, ciclo: 'II. HACER', estandar: 'Amenazas', item: 'Brigada de emergencias', criterio: 'Conformar, capacitar y dotar la brigada.', modoVerificacion: 'Conformación, capacitación y dotación.' },
  { codigo: '6.1.1', valor: 1.25, ciclo: 'III. VERIFICAR', estandar: 'Verificación', item: 'Indicadores del SG-SST', criterio: 'Definir indicadores mínimos del SG-SST.', modoVerificacion: 'Indicadores e informe de resultados.' },
  { codigo: '6.1.2', valor: 1.25, ciclo: 'III. VERIFICAR', estandar: 'Verificación', item: 'Auditoría anual', criterio: 'Auditoría anual del SG-SST.', modoVerificacion: 'Soportes de auditoría.' },
  { codigo: '6.1.3', valor: 1.25, ciclo: 'III. VERIFICAR', estandar: 'Verificación', item: 'Revisión por la alta dirección', criterio: 'Revisión anual por la alta dirección.', modoVerificacion: 'Acta / soportes de revisión.' },
  { codigo: '6.1.4', valor: 1.25, ciclo: 'III. VERIFICAR', estandar: 'Verificación', item: 'Planificación de auditoría con COPASST', criterio: 'Planificar auditoría con participación del COPASST.', modoVerificacion: 'Evidencias de planificación conjunta.' },
  { codigo: '7.1.1', valor: 2.5, ciclo: 'IV. ACTUAR', estandar: 'Mejoramiento', item: 'Acciones preventivas y correctivas', criterio: 'Definir e implementar acciones con base en supervisión e indicadores.', modoVerificacion: 'Evidencias de acciones.' },
  { codigo: '7.1.2', valor: 2.5, ciclo: 'IV. ACTUAR', estandar: 'Mejoramiento', item: 'Mejora por revisión de alta dirección', criterio: 'Acciones de mejora tras revisión de alta dirección.', modoVerificacion: 'Evidencias de mejora.' },
  { codigo: '7.1.3', valor: 2.5, ciclo: 'IV. ACTUAR', estandar: 'Mejoramiento', item: 'Mejora por investigaciones AT/EL', criterio: 'Acciones de mejora tras investigaciones.', modoVerificacion: 'Evidencias y efectividad.' },
  { codigo: '7.1.4', valor: 2.5, ciclo: 'IV. ACTUAR', estandar: 'Mejoramiento', item: 'Plan de mejoramiento ante autoridad/ARL', criterio: 'Implementar medidas solicitadas por autoridades y ARL.', modoVerificacion: 'Evidencias de cumplimiento.' },
].map((it) => {
  const grupoId = grupoSuraDesdeCodigo(it.codigo);
  const grupo = GRUPOS_SURA.find((g) => g.id === grupoId);
  return {
    ...it,
    id: `art27-${it.codigo.replace(/\./g, '-')}`,
    grupoId,
    grupoTitulo: grupo?.titulo || it.estandar,
  };
});

/** Textos hoja Instrucciones (formato tipo SURA / Res. 0312). */
export const INSTRUCCIONES_SURA = [
  'Complete la portada con los datos de la empresa (trabajadores, clase de riesgo, ciudad, sector y responsable).',
  'Según tamaño y riesgo, el sistema determina qué ítems debe evaluar. El resto queda en “No aplica” con el puntaje máximo (Res. 0312).',
  'En cada ítem marque Cumple, No cumple o No aplica. Adjunte evidencias y, si no cumple, registre plan de acción, responsable, plazo y recursos.',
  'La calificación oficial se obtiene sumando el valor (%) de cada ítem cumplido o no aplicable sobre 100 (igual que el Excel oficial).',
  'El avance de diligenciamiento es independiente: solo mide cuántos estándares exigibles ya respondió (Cumple o No cumple). Puede diferir del % oficial y ambos son correctos.',
  'Revise la Tabla de valores, los gráficos (cumplimiento oficial vs diligenciamiento) y los criterios ARL que interpretan el % oficial.',
];

/** Criterios de evaluación (misma lógica del Excel ARL). */
export const CRITERIOS_EVALUACION = [
  {
    nivel: 'CRITICO',
    rango: 'Menor a 60%',
    titulo: 'Crítico',
    accion:
      'El empleador debe realizar un plan de mejora inmediato. Debe reportar a la ARL el avance a más tardar cada tres (3) meses.',
  },
  {
    nivel: 'MODERADO',
    rango: 'Entre 60% y 85%',
    titulo: 'Moderadamente aceptable',
    accion:
      'El empleador debe elaborar un plan de mejora. Debe reportar a la ARL el avance a más tardar cada seis (6) meses.',
  },
  {
    nivel: 'ACEPTABLE',
    rango: 'Mayor a 85%',
    titulo: 'Aceptable',
    accion:
      'Mantener evidencias actualizadas y continuar mejorando en el Plan Anual de Trabajo del SG-SST.',
  },
];

/** Páginas del formato SURA: Instrucciones → secciones → Tabla → Gráficos → Criterios. */
export function construirPaginasSura(itemsLista) {
  const porGrupo = new Map();
  for (const it of itemsLista) {
    if (!porGrupo.has(it.grupoId)) porGrupo.set(it.grupoId, []);
    porGrupo.get(it.grupoId).push(it);
  }
  const secciones = GRUPOS_SURA.map((g) => {
    const items = porGrupo.get(g.id) || [];
    if (!items.length) return null;
    return {
      tipo: 'seccion',
      id: g.id,
      ciclo: g.ciclo,
      titulo: g.titulo,
      peso: g.peso,
      items,
      aplicables: items.filter((i) => i.aplica).length,
    };
  }).filter(Boolean);

  return [
    {
      tipo: 'instrucciones',
      id: 'instrucciones',
      ciclo: 'INICIO',
      titulo: 'INSTRUCCIONES',
      peso: 0,
      items: [],
      aplicables: 0,
    },
    ...secciones,
    {
      tipo: 'resumen',
      id: 'tabla_valores',
      ciclo: 'RESUMEN',
      titulo: 'TABLA DE VALORES Y CALIFICACIÓN',
      peso: 100,
      items: [],
      aplicables: 0,
    },
    {
      tipo: 'graficos',
      id: 'graficos',
      ciclo: 'RESUMEN',
      titulo: 'GRÁFICOS POR ESTÁNDAR Y CICLO',
      peso: 100,
      items: [],
      aplicables: 0,
    },
    {
      tipo: 'criterios',
      id: 'criterios',
      ciclo: 'CIERRE',
      titulo: 'CRITERIOS DE EVALUACIÓN',
      peso: 0,
      items: [],
      aplicables: 0,
    },
  ];
}

/** Resumen de puntaje por grupo SURA y por ciclo PHVA (para gráficos). */
export function calcularResumenPorGrupo(perfilId, respuestasMap = {}) {
  const items = itemsPorPerfil(perfilId);
  const porGrupo = GRUPOS_SURA.map((g) => {
    const delGrupo = items.filter((it) => it.grupoId === g.id);
    let obtenido = 0;
    let posible = 0;
    for (const it of delGrupo) {
      posible += it.valor;
      const est = respuestasMap[it.id]?.estado || '';
      obtenido += calificacionDeItem(it.valor, est);
    }
    const pct = posible > 0 ? Math.round((obtenido / posible) * 1000) / 10 : 0;
    return {
      id: g.id,
      ciclo: g.ciclo,
      titulo: g.titulo,
      peso: g.peso,
      obtenido: Math.round(obtenido * 10) / 10,
      posible: Math.round(posible * 10) / 10,
      pct,
      nombreCorto: g.titulo.replace(/\s*\(\d+%\)\s*$/, ''),
    };
  });

  const ciclosOrden = ['I. PLANEAR', 'II. HACER', 'III. VERIFICAR', 'IV. ACTUAR'];
  const porCiclo = ciclosOrden.map((ciclo) => {
    const grupos = porGrupo.filter((g) => g.ciclo === ciclo);
    const obtenido = grupos.reduce((s, g) => s + g.obtenido, 0);
    const posible = grupos.reduce((s, g) => s + g.posible, 0);
    const pct = posible > 0 ? Math.round((obtenido / posible) * 1000) / 10 : 0;
    return {
      ciclo,
      obtenido: Math.round(obtenido * 10) / 10,
      posible: Math.round(posible * 10) / 10,
      pct,
      peso: grupos.reduce((s, g) => s + g.peso, 0),
    };
  });

  return { porGrupo, porCiclo };
}

export const ESTADOS_ITEM = {
  PENDIENTE: '',
  CUMPLE: 'cumple',
  NO_CUMPLE: 'no_cumple',
  NO_APLICA: 'no_aplica',
};

/** Fórmula Excel: Cumple o No aplica = valor del ítem; No cumple / pendiente = 0. */
export function calificacionDeItem(valor, estado) {
  if (estado === ESTADOS_ITEM.CUMPLE || estado === ESTADOS_ITEM.NO_APLICA) {
    return Number(valor) || 0;
  }
  return 0;
}

/** Formato colombiano del Excel: 0,5% */
export function formatearValorPct(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '0%';
  return `${String(n).replace('.', ',')}%`;
}

export const TEXTO_NO_APLICA_AUTO =
  'No aplica según tamaño y clase de riesgo (Resolución 0312 de 2019). El formato otorga el puntaje máximo automáticamente.';

export function itemAplicaAlPerfil(perfilId, codigo) {
  if (perfilId === PERFILES_EVALUACION.CAP3) return true;
  const lista = CODIGOS_APLICABLES[perfilId];
  if (!lista) return true;
  return lista.includes(codigo);
}

/** Todos los ítems Art. 27 enriquecidos con flag aplica. */
export function itemsPorPerfil(perfilId) {
  return ITEMS_ART27.map((it) => ({
    ...it,
    aplica: itemAplicaAlPerfil(perfilId, it.codigo),
  }));
}

export function itemsAplicables(perfilId) {
  return itemsPorPerfil(perfilId).filter((it) => it.aplica);
}

export function respuestaVacia(aplica) {
  return {
    estado: aplica ? ESTADOS_ITEM.PENDIENTE : ESTADOS_ITEM.NO_APLICA,
    evidencias: aplica ? '' : TEXTO_NO_APLICA_AUTO,
    planAccion: '',
    responsable: '',
    fechaPlazo: '',
    recursos: '',
    fundamentos: '',
  };
}

export function construirRespuestasIniciales(perfilId) {
  return ITEMS_ART27.map((it) => {
    const aplica = itemAplicaAlPerfil(perfilId, it.codigo);
    return {
      itemId: it.id,
      codigo: it.codigo,
      ...respuestaVacia(aplica),
    };
  });
}

/**
 * Completa respuestas faltantes (casos viejos)
 * y fuerza No aplica en no exigibles del perfil.
 */
export function sincronizarRespuestas(perfilId, respuestasMap = {}) {
  const out = { ...respuestasMap };
  for (const it of ITEMS_ART27) {
    const aplica = itemAplicaAlPerfil(perfilId, it.codigo);
    const actual = out[it.id] || {};
    if (!aplica) {
      out[it.id] = {
        ...respuestaVacia(false),
        ...actual,
        estado: ESTADOS_ITEM.NO_APLICA,
        evidencias: actual.evidencias || TEXTO_NO_APLICA_AUTO,
      };
    } else if (!out[it.id]) {
      out[it.id] = respuestaVacia(true);
    } else {
      out[it.id] = { ...respuestaVacia(true), ...actual };
    }
  }
  return out;
}

/** Puntaje tipo tabla Art. 27: Cumple y No aplica = valor; No cumple / pendiente = 0. */
export function calcularPuntaje(perfilId, respuestasMap = {}) {
  const items = itemsPorPerfil(perfilId);
  let obtenido = 0;
  let posible = 0;
  let cumple = 0;
  let noCumple = 0;
  let noAplica = 0;
  let pendientesAplicables = 0;
  let respondidosAplicables = 0;
  const totalAplicables = items.filter((i) => i.aplica).length;

  for (const it of items) {
    posible += it.valor;
    const est = respuestasMap[it.id]?.estado || '';
    const puntos = calificacionDeItem(it.valor, est);
    obtenido += puntos;
    if (est === ESTADOS_ITEM.CUMPLE) {
      cumple += 1;
      if (it.aplica) respondidosAplicables += 1;
    } else if (est === ESTADOS_ITEM.NO_APLICA) {
      noAplica += 1;
    } else if (est === ESTADOS_ITEM.NO_CUMPLE) {
      noCumple += 1;
      if (it.aplica) respondidosAplicables += 1;
    } else if (it.aplica) {
      pendientesAplicables += 1;
    }
  }

  const pct = posible > 0 ? Math.round((obtenido / posible) * 1000) / 10 : 0;
  let nivel = 'CRITICO';
  if (pct > 85) nivel = 'ACEPTABLE';
  else if (pct >= 60) nivel = 'MODERADO';

  return {
    obtenido,
    posible,
    pct,
    nivel,
    cumple,
    noCumple,
    noAplica,
    pendientesAplicables,
    respondidosAplicables,
    totalAplicables,
    totalItems: items.length,
  };
}

/** @deprecated alias — compatibilidad */
export const ITEMS_CAP1_ART3 = itemsAplicables(PERFILES_EVALUACION.CAP1);
