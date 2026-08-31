import { formatDate, formatNumber, getAppLocale } from '../../utils/locale.js';
import { formatMiles } from './segurosSuraHelpers.js';
import {
  aplicarRecargosEnEvaluacionNsr10,
  argsDeduciblesPorArticuloDiagrama,
  calcularCriterioFinal,
  calcularResumenTotalesNsr10,
  calcularTotalesPresupuesto,
  fusionarEvaluacionSismicaNSR10Guardada,
  normalizarItemsRespuesta,
  RECARGOS_PRESUPUESTO_NSR10_CAT,
  camposValorAseguradoParaNsr,
  valoresAsegurablesDesdeLiquidador,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import {
  calcularDiagramaLiquidacion,
  DEFAULT_DEDUCIBLE_CATASTROFICO,
  HOSPEDAJE_PORCENTAJE_DEFAULT,
} from '../SubcomponenteFormularioCatastrofico/catalogoPresupuestoCatastrofico.js';
import { defaultOtrosAmparos, normalizarOtrosAmparos } from '../liquidacion/otrosAmparosLiquidacion.js';

export const SMMLV_POR_ANIO = {
  2024: 1300000,
  2025: 1423500,
  2026: 1750905,
};
export const SMMLV_DEFAULT = SMMLV_POR_ANIO[2026];

/** Texto fijo editable: información general del evento (informe preliminar Sura). */
export const INFO_EVENTO_DEFAULT_SURA = `El presente informe se emite con base en la atención del evento sísmico reportado ante Seguros Sura S.A., la visita de inspección realizada al predio asegurado y la documentación aportada por el tomador/asegurado.

La evaluación técnica busca verificar la existencia y alcance de los daños, contrastarlos con las coberturas de la póliza vigente y establecer, de manera preliminar, las pérdidas indemnizables conforme a las condiciones particulares del contrato de seguro.`;

export const NIVELES_AFECTACION_SURA = [
  'CRÍTICO',
  'ALTO',
  'MEDIO–ALTO',
  'MEDIO',
  'POR DEFINIR',
];

/** Zonas de la tabla de daños del informe preliminar Sura (misma plantilla Zurich). */
export const ZONAS_DANIOS_PRELIMINAR_SURA = [
  'Fachadas',
  'Zona de acceso',
  'Muros de mampostería',
  'Muros con grietas abiertas',
  'Encuentros muro–estructura',
  'Núcleo de escaleras',
  'Cielos rasos',
  'Cubiertas y elementos livianos',
  'Aulas, oficinas y archivos',
  'Pasillos y zonas comunes',
  'Pañetes, estucos y pintura',
  'Puertas, ventanería y elementos metálicos',
  'Instalaciones y equipos adosados',
  'Columnas, vigas y sistema aporticado visible',
];

export const CONCEPTOS_POLIZA_PRELIMINAR_SURA = [
  'Vigencia',
  'Ubicación del riesgo',
  'Evento',
  'Interés afectado',
  'Deducible',
  'Infraseguro',
  'Remoción de escombros',
  'Honorarios profesionales',
  'Exclusiones',
  'Reserva preliminar',
  'Concepto preliminar',
];

export const CAPITULOS_PRESUPUESTO_PRELIMINAR_SURA = [
  '1. Preliminares, seguridad y protecciones',
  '2. Fachada – desmonte y reconstrucción de los dos últimos niveles',
  '3. Demolición y reconstrucción de mampostería interior',
  '4. Reparación de fisuras y grietas menores',
  '5. Pañetes, estucos y acabados de muros',
  '6. Pintura interior y exterior',
  '7. Cielos rasos y elementos suspendidos',
  '8. Cubiertas y estructura liviana asociada',
  '9. Carpintería metálica, ventanería, puertas y divisiones',
  '10. Instalaciones eléctricas e iluminación',
  '11. Aires acondicionados y redes complementarias',
  '12. Escaleras, circulaciones y zonas comunes',
  '13. Retiro y disposición de escombros',
  '14. Estudios, evaluación especializada y contingencias técnicas',
];

export function plantillaFilasDaniosSura() {
  return ZONAS_DANIOS_PRELIMINAR_SURA.map((zona) => ({
    zona,
    condicion: '',
    nivel: '',
  }));
}

export function plantillaFilasPolizaSura() {
  return CONCEPTOS_POLIZA_PRELIMINAR_SURA.map((concepto) => ({
    concepto,
    analisis: '',
    conclusion: '',
  }));
}

export function plantillaFilasPresupuestoPreliminarSura() {
  return CAPITULOS_PRESUPUESTO_PRELIMINAR_SURA.map((capitulo) => ({
    capitulo,
    descripcion: '',
    valor: '',
  }));
}

export const TIPOS_INFORME_SURA = ['preliminar', 'final', 'unico'];

export function normalizarTipoInformeSura(valor, fallback = 'preliminar') {
  const t = String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (t === 'preliminar' || t === 'final' || t === 'unico') return t;
  return fallback;
}

export function esInformePreliminarSura(info = {}) {
  return normalizarTipoInformeSura(info?.tipoInforme, 'preliminar') === 'preliminar';
}

export function esInformeUnicoSura(info = {}) {
  return normalizarTipoInformeSura(info?.tipoInforme, 'preliminar') === 'unico';
}

function textoInformeUnicoSura(valor) {
  return String(valor ?? '').trim();
}

/** Valores que salen en la hoja INFORME ÚNICO del Excel. */
export function valorCamposInformeUnicoSura(informe = {}, caso = {}) {
  const coordsCaso =
    caso?.ubicacionPredio?.lat != null && caso?.ubicacionPredio?.lng != null
      ? `${caso.ubicacionPredio.lat}, ${caso.ubicacionPredio.lng}`
      : '';
  const mapa = informe.imagenMapa;
  const imagenMapa =
    typeof mapa === 'string'
      ? mapa
      : textoInformeUnicoSura(mapa?.preview || mapa?.ruta || mapa?.imagen || '');
  return {
    ajustadorNombre: textoInformeUnicoSura(
      informe.ajustadorNombre || informe.actaAjustadorNombre || caso.ajustador
    ),
    fechaInforme: textoInformeUnicoSura(informe.fechaInforme),
    direccionRiesgo: textoInformeUnicoSura(informe.direccionRiesgo || caso.direccionPredio),
    coordenadasRiesgo: textoInformeUnicoSura(informe.coordenadasRiesgo || coordsCaso),
    imagenMapa: textoInformeUnicoSura(imagenMapa),
    infoEvento: textoInformeUnicoSura(informe.infoEvento),
    descripcionDanios: textoInformeUnicoSura(informe.descripcionDanios),
    analisisCobertura: textoInformeUnicoSura(informe.analisisCobertura),
    conclusiones: textoInformeUnicoSura(informe.conclusiones),
    recomendacion: textoInformeUnicoSura(informe.recomendacion),
  };
}

/** Claves i18n en segurosSura.reportUnique — campos obligatorios para enviar el único. */
export const CAMPOS_OBLIGATORIOS_INFORME_UNICO_SURA = [
  { key: 'ajustadorNombre', labelKey: 'adjuster' },
  { key: 'fechaInforme', labelKey: 'reportDate' },
  { key: 'direccionRiesgo', labelKey: 'riskAddress' },
  { key: 'coordenadasRiesgo', labelKey: 'coordinates' },
  { key: 'imagenMapa', labelKey: 'riskMap' },
  { key: 'infoEvento', labelKey: 'eventInfo' },
];

export function camposFaltantesInformeUnicoSura(informe = {}, caso = {}) {
  const valores = valorCamposInformeUnicoSura(informe, caso);
  return CAMPOS_OBLIGATORIOS_INFORME_UNICO_SURA.filter((campo) => !valores[campo.key]);
}

export function etiquetaArchivoInformeSura(tipo) {
  const t = normalizarTipoInformeSura(tipo, 'unico');
  if (t === 'preliminar') return 'INFORME_PRELIMINAR';
  if (t === 'final') return 'INFORME_FINAL';
  return 'INFORME_UNICO';
}

export function etiquetaTituloInformeSura(tipo) {
  const t = normalizarTipoInformeSura(tipo, 'preliminar');
  if (t === 'preliminar') return 'PRELIMINAR';
  if (t === 'final') return 'FINAL';
  return 'ÚNICO';
}

export function etiquetaEncabezadoInformeSura(tipo) {
  const t = normalizarTipoInformeSura(tipo, 'preliminar');
  if (t === 'preliminar') return 'Informe Preliminar Sura';
  if (t === 'final') return 'Informe Final Sura';
  return 'Informe Único Sura';
}

export function prefijoArchivoInformeSura(tipo) {
  const t = normalizarTipoInformeSura(tipo, 'preliminar');
  if (t === 'preliminar') return 'Informe_Preliminar_Sura';
  if (t === 'final') return 'Informe_Final_Sura';
  return 'Informe_Unico_Sura';
}

export function etiquetaReporteCuadroSura(tipo) {
  const t = normalizarTipoInformeSura(tipo, 'preliminar');
  if (t === 'preliminar') return 'Preliminar — Seguros Sura';
  if (t === 'final') return 'Final — Seguros Sura';
  return 'Único — Seguros Sura';
}

export function totalPresupuestoPreliminarSura(filas = []) {
  return (Array.isArray(filas) ? filas : []).reduce(
    (acc, fila) => acc + parsearNumero(fila?.valor),
    0
  );
}

export function reservaSugeridaSura(info = {}) {
  const delPresupuesto = totalPresupuestoPreliminarSura(info?.filasPresupuestoPreliminar);
  if (delPresupuesto > 0) return delPresupuesto;
  return parsearNumero(info?.reservaSugerida);
}

function usarPlantillaSiVacio(filas, plantilla) {
  return Array.isArray(filas) && filas.length ? filas : plantilla;
}

export function parsearNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return 0;
  if (typeof valor === 'number') return Number.isNaN(valor) ? 0 : valor;
  let numero = String(valor).replace(/[^\d.,-]/g, '');
  if (numero.includes(',') && numero.includes('.')) {
    numero = numero.replace(/\./g, '').replace(',', '.');
  } else if (numero.includes('.') && !numero.includes(',')) {
    const partes = numero.split('.');
    if (partes.length > 2 || (partes[1] && partes[1].length === 3)) {
      numero = numero.replace(/\./g, '');
    }
  } else if (numero.includes(',')) {
    numero = numero.replace(',', '.');
  }
  const n = parseFloat(numero);
  return Number.isNaN(n) ? 0 : n;
}

export function formatearMonto(valor, { decimals = 0 } = {}) {
  const n = typeof valor === 'number' ? valor : parsearNumero(valor);
  if (Number.isNaN(n)) return '0';
  return formatNumber(n, getAppLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** @deprecated compat — ítems FDM ya no se usan en el flujo activo */
export function crearItemSura(item = '', valor = '', id) {
  return {
    id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    item: item || '',
    valor:
      valor === null || valor === undefined || valor === '' ? '' : formatMiles(valor),
  };
}

/** @deprecated */
export function migrarItemLegacy(it = {}) {
  if (it.item != null || (it.valor != null && it.concepto == null)) {
    return crearItemSura(it.item || '', it.valor ?? '', it.id);
  }
  const valor = it.valorIndemnizable || it.valorReclamado || '';
  return crearItemSura(it.concepto || '', valor, it.id);
}

const fechaInput = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function liquidacionCatastroficoDefaultSura(caso = {}) {
  const c = caso && typeof caso === 'object' ? caso : {};
  const va =
    c.valorAseguradoInmueble != null && c.valorAseguradoInmueble !== ''
      ? Number(c.valorAseguradoInmueble) || ''
      : '';
  return {
    valorAsegurado: va,
    hospedajePorcentaje: HOSPEDAJE_PORCENTAJE_DEFAULT,
    hospedajeManual: '',
    deducible: 'No aplica',
    deducibleConfig: { ...DEFAULT_DEDUCIBLE_CATASTROFICO },
    deducibleConfigPresupuesto: { ...DEFAULT_DEDUCIBLE_CATASTROFICO },
  };
}

export function encabezadoDesdeCasoSura(caso = {}) {
  const c = caso && typeof caso === 'object' ? caso : {};
  return {
    tomador: c.tomador || '',
    asegurado: c.asegurado || c.asgrBenfcro || c.informacionContacto || '',
    poliza: c.numeroPoliza || c.nmroPolza || '',
    credito: c.numeroCredito || '',
    siniestro: c.siniestro || c.nmroSinstro || '',
    consecutivo: c.consecutivo || '',
    identificacion: c.identificacion || c.numDocumento || '',
    correo: c.correo || '',
    celular: c.celular || '',
    fechaSiniestro: fechaInput(c.fechaSiniestro || c.fchaSinstro),
    direccion: c.direccionPredio || c.direccion || '',
    ciudad: c.ciudad || c.ciudadSiniestro || '',
    departamento: c.departamento || c.departamentoCiudad || '',
    cobertura: c.cobertura || c.causa_siniestro || '',
    evento: c.cobertura || c.causa_siniestro || 'TERREMOTO',
    ajustador: c.ajustador || c.nombreResponsable || '',
    valorAseguradoInmueble: c.valorAseguradoInmueble ?? '',
    valorAseguradoContenidos: c.valorAseguradoContenidos ?? '',
  };
}

/** Prefill portada NSR desde caso Sura */
export function prefillNsrDesdeCasoSura(caso = {}, encabezado = {}) {
  return {
    fechaInspeccion: fechaInput(caso.fechaInspeccion),
    asegurado: encabezado.asegurado || caso.asegurado || caso.informacionContacto || '',
    poliza: encabezado.poliza || caso.numeroPoliza || '',
    municipio: encabezado.ciudad || caso.ciudad || '',
    ciudad: encabezado.ciudad || caso.ciudad || '',
    direccion: encabezado.direccion || caso.direccionPredio || '',
    direccionRiesgo: encabezado.direccion || caso.direccionPredio || '',
    fechaSiniestro: encabezado.fechaSiniestro || fechaInput(caso.fechaSiniestro),
    fechaOcurrencia: encabezado.fechaSiniestro || fechaInput(caso.fechaSiniestro),
    inspector: caso.ajustador || '',
    tipoEvento: encabezado.evento || caso.cobertura || 'TERREMOTO',
    ...camposValorAseguradoParaNsr(caso, encabezado),
  };
}

export const DEFAULT_LIQUIDADOR_SURA = {
  modelo: 'nsr10',
  encabezado: {
    tomador: '',
    asegurado: '',
    poliza: '',
    credito: '',
    siniestro: '',
    consecutivo: '',
    identificacion: '',
    correo: '',
    celular: '',
    fechaSiniestro: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    cobertura: '',
    evento: 'TERREMOTO',
    ajustador: '',
    valorAseguradoInmueble: '',
    valorAseguradoContenidos: '',
  },
  evaluacionSismicaNSR10: null,
  liquidacionCatastrofico: liquidacionCatastroficoDefaultSura(),
  indemnizacionSugerida: '',
  observaciones: '',
};

export function esLiquidadorNsrSura(liquidador = {}) {
  if (!liquidador || typeof liquidador !== 'object') return false;
  if (liquidador.modelo === 'nsr10') return true;
  if (liquidador.evaluacionSismicaNSR10) return true;
  if (liquidador.liquidacionCatastrofico) return true;
  return false;
}

/**
 * Totales Sura = presupuesto NSR-10 + contenidos + diagrama (suma + hospedaje).
 * Compat: expone totalIndemnizar / totalIndemnizable para finiquito e informe.
 */
export function calcularLiquidacionSura(liquidador = {}) {
  const evalData = aplicarRecargosEnEvaluacionNsr10(
    liquidador.evaluacionSismicaNSR10 || {},
    RECARGOS_PRESUPUESTO_NSR10_CAT
  );
  const presupuesto = evalData.presupuesto || { items: [] };
  const valoresAsegurablesCaso = valoresAsegurablesDesdeLiquidador(liquidador);
  const totalesPres = calcularTotalesPresupuesto(presupuesto, valoresAsegurablesCaso);
  const resumen = calcularResumenTotalesNsr10(evalData, valoresAsegurablesCaso);
  const liq = liquidador.liquidacionCatastrofico || {};
  const diagrama = calcularDiagramaLiquidacion({
    valorAsegurado: liq.valorAsegurado,
    totalDanios: resumen.sumaCompleta,
    totalPresupuesto: resumen.totalPresupuesto,
    totalContenidos: resumen.totalContenidos,
    hospedajePorcentaje: liq.hospedajePorcentaje,
    hospedajeManual: liq.hospedajeManual,
    deducible: liq.deducible,
    deducibleConfig: liq.deducibleConfig,
    deducibleConfigContenidos: liq.deducibleConfigContenidos || liq.deducibleConfig,
    deducibleConfigPresupuesto: liq.deducibleConfigPresupuesto,
    otrosAmparos: liquidador.otrosAmparos,
    ...argsDeduciblesPorArticuloDiagrama(liq, resumen),
  });
  const items = normalizarItemsRespuesta(evalData.items);
  const criterio = calcularCriterioFinal(items);

  return {
    modelo: 'nsr10',
    presupuesto: totalesPres,
    contenidos: resumen.contenidos,
    totalPresupuesto: resumen.totalPresupuesto,
    totalContenidos: resumen.totalContenidos,
    sumaCompleta: resumen.sumaCompleta,
    subtotal: totalesPres.subtotal,
    aiu: totalesPres.aiu,
    imprevistos: totalesPres.imprevistos,
    impuestos: totalesPres.impuestos,
    totalDanios: resumen.sumaCompleta,
    diagrama,
    criterio,
    totalIndemnizar: diagrama.totalIndemnizar,
    totalIndemnizable: diagrama.totalIndemnizar,
    totalPerdida: resumen.sumaCompleta,
    totalReclamado: parsearNumero(liquidador.valorReclamadoCaso) || resumen.sumaCompleta,
    deducibleAplicado: diagrama.sumaDeducibles || diagrama.deducibleAplicado || 0,
    deducibleTexto: [
      diagrama.deduciblePresupuesto?.aplica ? `Presupuesto: ${diagrama.deduciblePresupuesto.texto}` : null,
      diagrama.deducibleContenidos?.aplica || diagrama.deducibleAplica
        ? `Contenidos: ${diagrama.deducibleContenidos?.texto || diagrama.deducible}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ') || diagrama.deducible,
    subtotalContenidos: resumen.totalContenidos,
    subtotalEdificios: resumen.totalPresupuesto,
    diferencia: 0,
    usaSMMLV: Boolean(diagrama.deducibleUsaMinimo && diagrama.deducibleTipoMinimo === 'SMMLV'),
    totalOtrosAmparos: diagrama.totalOtrosAmparos || 0,
    otrosAmparos: diagrama.otrosAmparos || [],
  };
}

/** Filas planas del presupuesto NSR (para resúmenes). */
export function itemsPlanosSura(liquidador = {}) {
  const items = liquidador?.evaluacionSismicaNSR10?.presupuesto?.items;
  if (!Array.isArray(items) || !items.length) return [];
  return items
    .filter((it) => String(it?.actividad || it?.componente || '').trim())
    .map((it) => ({
      id: it.id,
      concepto: it.actividad || it.componente || 'Ítem',
      valorReclamado: '',
      valorIndemnizable: it.total ?? '',
      cantidad: it.cantidad,
      valorUnitario: it.valorUnitario,
    }));
}

export function mapCasoSuraALiquidador(caso = {}) {
  const c = caso && typeof caso === 'object' ? caso : {};
  const encabezado = encabezadoDesdeCasoSura(c);
  const prefill = prefillNsrDesdeCasoSura(c, encabezado);
  const evalInicial = fusionarEvaluacionSismicaNSR10Guardada({}, prefill, {
    recargosPresupuesto: RECARGOS_PRESUPUESTO_NSR10_CAT,
  });
  const base = {
    ...DEFAULT_LIQUIDADOR_SURA,
    encabezado,
    evaluacionSismicaNSR10: evalInicial,
    liquidacionCatastrofico: liquidacionCatastroficoDefaultSura(c),
    otrosAmparos: defaultOtrosAmparos(),
    valorReclamadoCaso:
      c.valorReclamado != null && c.valorReclamado !== ''
        ? formatMiles(c.valorReclamado)
        : '',
  };

  const guardado = c.liquidador && typeof c.liquidador === 'object' ? c.liquidador : null;
  if (!guardado) return base;

  // Liquidador FDM antiguo: no migrar ítems; abrir NSR fresco conservando encabezado
  if (!esLiquidadorNsrSura(guardado)) {
    return {
      ...base,
      encabezado: { ...base.encabezado, ...(guardado.encabezado || {}) },
      observaciones: guardado.observaciones || '',
      valorReclamadoCaso: guardado.valorReclamadoCaso || base.valorReclamadoCaso,
      otrosAmparos: Array.isArray(guardado.otrosAmparos)
        ? normalizarOtrosAmparos(guardado.otrosAmparos)
        : defaultOtrosAmparos(),
    };
  }

  return {
    ...base,
    ...guardado,
    modelo: 'nsr10',
    encabezado: { ...base.encabezado, ...(guardado.encabezado || {}) },
    evaluacionSismicaNSR10: fusionarEvaluacionSismicaNSR10Guardada(
      guardado.evaluacionSismicaNSR10,
      prefill,
      { recargosPresupuesto: RECARGOS_PRESUPUESTO_NSR10_CAT }
    ),
    liquidacionCatastrofico: {
      ...base.liquidacionCatastrofico,
      ...(guardado.liquidacionCatastrofico || {}),
    },
    indemnizacionSugerida: guardado.indemnizacionSugerida || '',
    otrosAmparos: Array.isArray(guardado.otrosAmparos)
      ? normalizarOtrosAmparos(guardado.otrosAmparos)
      : defaultOtrosAmparos(),
  };
}

/** formData mínimo para ChecklistEvaluacionSismicaNSR10 */
export function formDataNsrDesdeLiquidadorSura(liquidador = {}, caso = {}) {
  const enc = liquidador.encabezado || {};
  return {
    ...prefillNsrDesdeCasoSura(caso, enc),
    ...camposValorAseguradoParaNsr(caso, enc),
    evaluacionSismicaNSR10: liquidador.evaluacionSismicaNSR10,
    liquidacionCatastrofico: liquidador.liquidacionCatastrofico,
    indemnizacionSugerida: liquidador.indemnizacionSugerida,
    otrosAmparos: liquidador.otrosAmparos,
    asegurado: enc.asegurado,
    ciudad: enc.ciudad,
    direccionRiesgo: enc.direccion,
    numeroPoliza: enc.poliza,
    fechaSiniestro: enc.fechaSiniestro,
    actaAjustadorNombre: enc.ajustador || caso.ajustador || '',
  };
}

export function defaultInformeUnicoSura(caso = {}) {
  const guardado =
    caso.informeUnico && typeof caso.informeUnico === 'object' ? caso.informeUnico : null;
  const base = {
    tipoInforme: 'preliminar',
    fechaInforme: fechaInput(new Date()),
    ajustadorNombre: caso.ajustador || '',
    infoEvento: INFO_EVENTO_DEFAULT_SURA,
    descripcionDanios: '',
    coordenadasRiesgo: '',
    imagenMapa: '',
    direccionRiesgo: caso.direccionPredio || '',
    analisisCobertura: '',
    reservaSugerida: '',
    filasDanios: plantillaFilasDaniosSura(),
    filasPolizaCobertura: plantillaFilasPolizaSura(),
    filasPresupuestoPreliminar: plantillaFilasPresupuestoPreliminarSura(),
    conclusiones: '',
    recomendacion: '',
    reservaRecomendada: '',
    anticipoRecomendado: '',
    fotosSeleccionadas: [],
    fotosInspeccion: [],
    actaAjustadorNombre: caso.ajustador || '',
    actaAjustadorCargo: '',
    actaAjustadorEmail: '',
    actaAjustadorFirmaImagen: '',
    firmaAjustador: '',
  };
  if (!guardado) return base;
  return {
    ...base,
    ...guardado,
    tipoInforme: guardado
      ? normalizarTipoInformeSura(guardado.tipoInforme, 'unico')
      : 'preliminar',
    ajustadorNombre: guardado.ajustadorNombre || guardado.actaAjustadorNombre || base.ajustadorNombre,
    actaAjustadorNombre:
      guardado.actaAjustadorNombre || guardado.ajustadorNombre || base.actaAjustadorNombre,
    infoEvento: guardado.infoEvento || base.infoEvento,
    descripcionDanios: guardado.descripcionDanios || base.descripcionDanios,
    coordenadasRiesgo: guardado.coordenadasRiesgo || base.coordenadasRiesgo,
    imagenMapa: guardado.imagenMapa || base.imagenMapa,
    direccionRiesgo: guardado.direccionRiesgo || base.direccionRiesgo,
    reservaSugerida: guardado.reservaSugerida ?? base.reservaSugerida,
    filasDanios: usarPlantillaSiVacio(guardado.filasDanios, base.filasDanios),
    filasPolizaCobertura: usarPlantillaSiVacio(
      guardado.filasPolizaCobertura,
      base.filasPolizaCobertura
    ),
    filasPresupuestoPreliminar: usarPlantillaSiVacio(
      guardado.filasPresupuestoPreliminar,
      base.filasPresupuestoPreliminar
    ),
    fotosInspeccion: Array.isArray(guardado.fotosInspeccion)
      ? guardado.fotosInspeccion
      : base.fotosInspeccion,
  };
}

export function formatDateLarga(value) {
  if (!value) return '—';
  try {
    return formatDate(value, getAppLocale(), {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
}
