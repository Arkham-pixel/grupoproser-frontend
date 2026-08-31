import { formatDate, formatNumber, getAppLocale } from '../../utils/locale.js';
import { formatMiles } from './allianzHelpers.js';
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
import {
  esXmlWordOoXml,
  parsearMontoInformeSeguro,
  sanitizarInformeUnicoCamposWord,
} from '../../utils/limpiarTextoInformeWord.js';
import { fotosInformeDesdeCaso, sanitizarInformeUnicoFotos } from '../fotosInformeUnicoHelpers.js';
import {
  fotosCotizacionDesdeLiquidador,
  serializarCotizacionPdf,
  serializarPaginasCotizacion,
  usaCotizacionComoBasePresupuesto,
  montoCotizacionPdf,
} from '../liquidacion/cotizacionPdfLiquidacion.js';
import {
  configDeduciblePresupuestoParaCalculoAllianz,
  configDeducibleTerremotoCat,
  desgloseDeducibleTerremoto,
  TEXTO_DEDUCIBLE_TERREMOTO_CAT,
  valorAseguradoPresupuestoCat,
} from '../liquidacion/deducibleTerremotoCat.js';

export const TEXTO_DEDUCIBLE_TERREMOTO_ALLIANZ = TEXTO_DEDUCIBLE_TERREMOTO_CAT;

export const SMMLV_POR_ANIO = {
  2024: 1300000,
  2025: 1423500,
  2026: 1750905,
};
export const SMMLV_DEFAULT = SMMLV_POR_ANIO[2026];

/** Texto fijo editable: información general del evento (consolidado terremoto Allianz). */
export const INFO_EVENTO_DEFAULT_ALLIANZ = `El presente informe se elabora en el marco de la atención del evento sísmico / catastrófico reportado ante Allianz Seguros, conforme a la visita de inspección realizada al predio asegurado y a la documentación aportada por el tomador/asegurado.

La evaluación técnica tiene por objeto verificar la existencia y alcance de los daños, confrontarlos con las coberturas de la póliza vigente y cuantificar las pérdidas indemnizables de acuerdo con las condiciones particulares del contrato de seguro.`;

export const NIVELES_AFECTACION_ALLIANZ = [
  'CRÍTICO',
  'ALTO',
  'MEDIO–ALTO',
  'MEDIO',
  'POR DEFINIR',
];

/** Zonas de la tabla de daños del informe preliminar Allianz. */
export const ZONAS_DANIOS_PRELIMINAR_ALLIANZ = [
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

export const CONCEPTOS_POLIZA_PRELIMINAR_ALLIANZ = [
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

export const CAPITULOS_PRESUPUESTO_PRELIMINAR_ALLIANZ = [
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

export function plantillaFilasDaniosAllianz() {
  return ZONAS_DANIOS_PRELIMINAR_ALLIANZ.map((zona) => ({
    zona,
    condicion: '',
    nivel: '',
  }));
}

export function plantillaFilasPolizaAllianz() {
  return CONCEPTOS_POLIZA_PRELIMINAR_ALLIANZ.map((concepto) => ({
    concepto,
    analisis: '',
    conclusion: '',
  }));
}

export function plantillaFilasPresupuestoPreliminarAllianz() {
  return CAPITULOS_PRESUPUESTO_PRELIMINAR_ALLIANZ.map((capitulo) => ({
    capitulo,
    descripcion: '',
    valor: '',
  }));
}

export const TIPOS_INFORME_ALLIANZ = ['preliminar', 'final', 'unico'];

export function normalizarTipoInformeAllianz(valor, fallback = 'unico') {
  const t = String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (t === 'preliminar' || t === 'final' || t === 'unico') return t;
  return fallback;
}

export function esInformePreliminarAllianz(info = {}) {
  return normalizarTipoInformeAllianz(info?.tipoInforme, 'unico') === 'preliminar';
}

export function esInformeUnicoAllianz(info = {}) {
  return normalizarTipoInformeAllianz(info?.tipoInforme, 'unico') === 'unico';
}

/** Tipo vigente: el del borrador en pantalla, o el guardado en el caso. */
export function tipoInformeActualAllianz(informe = null, caso = null) {
  if (informe?.tipoInforme) {
    return normalizarTipoInformeAllianz(informe.tipoInforme, 'unico');
  }
  if (caso?.informeUnico && typeof caso.informeUnico === 'object') {
    return normalizarTipoInformeAllianz(caso.informeUnico.tipoInforme, 'unico');
  }
  return 'unico';
}

/** Fusiona un borrador de informe sobre el caso para hidratar al reabrir pestañas. */
export function casoAllianzConInforme(caso = {}, informe = null) {
  if (!informe || typeof informe !== 'object') return caso || {};
  return {
    ...(caso || {}),
    informeUnico: { ...(caso?.informeUnico || {}), ...informe },
  };
}

export function etiquetaArchivoInformeAllianz(tipo) {
  const t = normalizarTipoInformeAllianz(tipo, 'unico');
  if (t === 'preliminar') return 'INFORME_PRELIMINAR';
  if (t === 'final') return 'INFORME_FINAL';
  return 'INFORME_UNICO';
}

export function etiquetaTituloInformeAllianz(tipo) {
  const t = normalizarTipoInformeAllianz(tipo, 'unico');
  if (t === 'preliminar') return 'PRELIMINAR';
  if (t === 'final') return 'FINAL';
  return 'ÚNICO';
}

export function etiquetaEncabezadoInformeAllianz(tipo) {
  const t = normalizarTipoInformeAllianz(tipo, 'unico');
  if (t === 'preliminar') return 'Informe Preliminar Allianz';
  if (t === 'final') return 'Informe Final Allianz';
  return 'Informe Único Allianz';
}

export function prefijoArchivoInformeAllianz(tipo) {
  const t = normalizarTipoInformeAllianz(tipo, 'unico');
  if (t === 'preliminar') return 'Informe_Preliminar_Allianz';
  if (t === 'final') return 'Informe_Final_Allianz';
  return 'Informe_Unico_Allianz';
}

export function etiquetaReporteCuadroAllianz(tipo) {
  const t = normalizarTipoInformeAllianz(tipo, 'unico');
  if (t === 'preliminar') return 'Preliminar — Allianz';
  if (t === 'final') return 'Final — Allianz';
  return 'Único — Allianz';
}

export function totalPresupuestoPreliminarAllianz(filas = []) {
  return (Array.isArray(filas) ? filas : []).reduce(
    (acc, fila) => acc + parsearNumero(fila?.valor),
    0
  );
}

export function reservaSugeridaAllianz(info = {}) {
  const delPresupuesto = totalPresupuestoPreliminarAllianz(info?.filasPresupuestoPreliminar);
  if (delPresupuesto > 0) return delPresupuesto;
  return parsearNumero(info?.reservaSugerida);
}

function usarPlantillaSiVacio(filas, plantilla) {
  return Array.isArray(filas) && filas.length ? filas : plantilla;
}

export function sanitizarInformeUnicoAllianz(informe = {}) {
  if (!informe || typeof informe !== 'object') return {};
  const limpio = sanitizarInformeUnicoCamposWord(informe);
  const base = sanitizarInformeUnicoFotos(limpio);
  const tipo = limpio.tipoInforme
    ? normalizarTipoInformeAllianz(limpio.tipoInforme, 'unico')
    : undefined;
  return {
    ...base,
    ...(tipo ? { tipoInforme: tipo } : {}),
    fotosCotizacion: serializarPaginasCotizacion(limpio.fotosCotizacion),
  };
}

/** Quita File/blob/preview del liquidador antes de guardar en Mongo. */
export function sanitizarLiquidadorAllianz(liquidador = {}) {
  if (!liquidador || typeof liquidador !== 'object') return liquidador;
  return {
    ...liquidador,
    cotizacionPdf: serializarCotizacionPdf(liquidador.cotizacionPdf),
  };
}

export function desgloseDeducibleTerremotoAllianz(liquidador = {}, diagrama = null) {
  return desgloseDeducibleTerremoto(liquidador, diagrama, formatearMonto);
}

export function patchDeduciblePresupuestoAllianz(liquidador = {}, patch = {}) {
  const liq = liquidador.liquidacionCatastrofico || {};
  const cfg = {
    ...configDeducibleTerremotoCat({}, {
      valorAsegurado: valorAseguradoPresupuestoCat(liquidador),
    }),
    ...(liq.deducibleConfigPresupuesto && typeof liq.deducibleConfigPresupuesto === 'object'
      ? liq.deducibleConfigPresupuesto
      : {}),
    ...patch,
  };
  if (patch.modo === 'no_aplica') cfg.aplica = false;
  else if (patch.modo) cfg.aplica = true;
  if (valorAseguradoPresupuestoCat(liquidador) > 0) {
    cfg.baseDeducible = 'valor_asegurable';
  }
  return {
    ...liquidador,
    liquidacionCatastrofico: {
      ...liq,
      deducibleConfigPresupuesto: cfg,
      deducible: cfg.texto != null ? cfg.texto : liq.deducible,
    },
  };
}

export function parsearNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return 0;
  if (typeof valor === 'number') {
    if (Number.isNaN(valor)) return 0;
    if (Math.abs(valor) > 1e15) return 0;
    return valor;
  }
  const str = String(valor);
  if (esXmlWordOoXml(str) || str.replace(/[^\d]/g, '').length > 14) {
    return parsearMontoInformeSeguro(str);
  }
  let numero = str.replace(/[^\d.,-]/g, '');
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
export function crearItemAllianz(item = '', valor = '', id) {
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
    return crearItemAllianz(it.item || '', it.valor ?? '', it.id);
  }
  const valor = it.valorIndemnizable || it.valorReclamado || '';
  return crearItemAllianz(it.concepto || '', valor, it.id);
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

export function liquidacionCatastroficoDefaultAllianz(caso = {}) {
  const c = caso && typeof caso === 'object' ? caso : {};
  const va =
    c.valorAseguradoInmueble != null && c.valorAseguradoInmueble !== ''
      ? Number(c.valorAseguradoInmueble) || ''
      : '';
  return {
    valorAsegurado: va,
    hospedajePorcentaje: HOSPEDAJE_PORCENTAJE_DEFAULT,
    hospedajeManual: '',
    deducible: TEXTO_DEDUCIBLE_TERREMOTO_CAT,
    deducibleConfig: { ...DEFAULT_DEDUCIBLE_CATASTROFICO },
    deducibleConfigPresupuesto: configDeducibleTerremotoCat(
      {},
      { valorAsegurado: Number(va) || 0 }
    ),
  };
}

export function encabezadoDesdecasoAllianz(caso = {}) {
  const c = caso && typeof caso === 'object' ? caso : {};
  return {
    tomador: c.tomador || '',
    asegurado: c.asegurado || c.informacionContacto || '',
    poliza: c.numeroPoliza || '',
    tipoPoliza: c.tipoPoliza || '',
    credito: c.numeroCredito || '',
    siniestro: c.siniestro || '',
    consecutivo: c.consecutivo || '',
    identificacion: c.identificacion || '',
    tipoIdentificacion: c.tipoIdentificacion || '',
    causa: c.causa || '',
    fechaSiniestro: fechaInput(c.fechaSiniestro),
    direccion: c.direccionPredio || '',
    ciudad: c.ciudad || '',
    departamento: c.departamento || '',
    cobertura: c.cobertura || '',
    evento: c.cobertura || 'TERREMOTO',
    ajustador: c.ajustador || '',
    telefono: c.telefonoAsegurado || c.celular || '',
    correo: c.correoAsegurado || c.correo || '',
    valorAseguradoInmueble:
      c.valorAseguradoInmueble != null && c.valorAseguradoInmueble !== ''
        ? formatMiles(c.valorAseguradoInmueble)
        : '',
    valorAseguradoContenidos:
      c.valorAseguradoContenidos != null && c.valorAseguradoContenidos !== ''
        ? formatMiles(c.valorAseguradoContenidos)
        : '',
  };
}

/** Prefill portada NSR desde caso Allianz */
export function prefillNsrDesdecasoAllianz(caso = {}, encabezado = {}) {
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

export const DEFAULT_LIQUIDADOR_Allianz = {
  modelo: 'nsr10',
  encabezado: {
    tomador: '',
    asegurado: '',
    poliza: '',
    tipoPoliza: '',
    credito: '',
    siniestro: '',
    consecutivo: '',
    identificacion: '',
    tipoIdentificacion: '',
    causa: '',
    fechaSiniestro: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    cobertura: '',
    evento: 'TERREMOTO',
    ajustador: '',
    telefono: '',
    correo: '',
    valorAseguradoInmueble: '',
    valorAseguradoContenidos: '',
  },
  evaluacionSismicaNSR10: null,
  liquidacionCatastrofico: liquidacionCatastroficoDefaultAllianz(),
  indemnizacionSugerida: '',
  observaciones: '',
  cotizacionPdf: null,
};

export function esLiquidadorNsrAllianz(liquidador = {}) {
  if (!liquidador || typeof liquidador !== 'object') return false;
  if (liquidador.modelo === 'nsr10') return true;
  if (liquidador.evaluacionSismicaNSR10) return true;
  if (liquidador.liquidacionCatastrofico) return true;
  return false;
}

/**
 * Totales Allianz = presupuesto NSR-10 o cotización PDF + contenidos + diagrama.
 * Compat: expone totalIndemnizar / totalIndemnizable para finiquito e informe.
 */
export function calcularLiquidacionAllianz(liquidador = {}) {
  const evalData = aplicarRecargosEnEvaluacionNsr10(
    liquidador.evaluacionSismicaNSR10 || {},
    RECARGOS_PRESUPUESTO_NSR10_CAT
  );
  const presupuesto = evalData.presupuesto || { items: [] };
  const valoresAsegurablesCaso = valoresAsegurablesDesdeLiquidador(liquidador);
  const totalesPres = calcularTotalesPresupuesto(presupuesto, valoresAsegurablesCaso);
  const resumen = calcularResumenTotalesNsr10(evalData, valoresAsegurablesCaso);
  const liq = liquidador.liquidacionCatastrofico || {};
  const usaCotiz = usaCotizacionComoBasePresupuesto(liquidador.cotizacionPdf);
  const montoCotiz = montoCotizacionPdf(liquidador.cotizacionPdf);
  const totalPresupuesto = usaCotiz ? montoCotiz : resumen.totalPresupuesto;
  const sumaCompleta = Math.round((totalPresupuesto + resumen.totalContenidos) * 100) / 100;
  const diagrama = calcularDiagramaLiquidacion({
    valorAsegurado: valorAseguradoPresupuestoCat(liquidador),
    totalDanios: sumaCompleta,
    totalPresupuesto,
    totalContenidos: resumen.totalContenidos,
    hospedajePorcentaje: liq.hospedajePorcentaje,
    hospedajeManual: liq.hospedajeManual,
    deducible: liq.deducible,
    deducibleConfig: liq.deducibleConfig,
    deducibleConfigContenidos: liq.deducibleConfigContenidos || liq.deducibleConfig,
    deducibleConfigPresupuesto: configDeduciblePresupuestoParaCalculoAllianz(liquidador),
    otrosAmparos: liquidador.otrosAmparos,
    ...(() => {
      const args = argsDeduciblesPorArticuloDiagrama(liq, resumen);
      if (!usaCotiz) return args;
      return {
        ...args,
        usaDeduciblePorArticuloPresupuesto: false,
        deduciblePresupuestoPorArticulos: 0,
        presupuestoNetoPorArticulo: null,
      };
    })(),
  });
  const items = normalizarItemsRespuesta(evalData.items);
  const criterio = calcularCriterioFinal(items);

  return {
    modelo: 'nsr10',
    presupuesto: totalesPres,
    contenidos: resumen.contenidos,
    totalPresupuesto,
    totalContenidos: resumen.totalContenidos,
    sumaCompleta,
    subtotal: usaCotiz ? montoCotiz : totalesPres.subtotal,
    aiu: usaCotiz ? 0 : totalesPres.aiu,
    imprevistos: usaCotiz ? 0 : totalesPres.imprevistos,
    impuestos: usaCotiz ? 0 : totalesPres.impuestos,
    totalDanios: sumaCompleta,
    origenPresupuesto: usaCotiz ? 'cotizacion' : 'nsr10',
    cotizacionMonto: montoCotiz,
    diagrama,
    criterio,
    totalIndemnizar: diagrama.totalIndemnizar,
    totalIndemnizable: diagrama.totalIndemnizar,
    totalPerdida: sumaCompleta,
    totalReclamado: parsearNumero(liquidador.valorReclamadoCaso) || sumaCompleta,
    deducibleAplicado: diagrama.sumaDeducibles || diagrama.deducibleAplicado || 0,
    deducibleTexto:
      String(liq.deducible || liq.deducibleConfigPresupuesto?.texto || '').trim() ||
      desgloseDeducibleTerremotoAllianz(liquidador, diagrama).texto,
    subtotalContenidos: resumen.totalContenidos,
    subtotalEdificios: totalPresupuesto,
    diferencia: Math.round(
      ((parsearNumero(liquidador.valorReclamadoCaso) || sumaCompleta) -
        (diagrama.totalIndemnizar || 0)) *
        100
    ) / 100,
    usaSMMLV: Boolean(diagrama.deducibleUsaMinimo && diagrama.deducibleTipoMinimo === 'SMMLV'),
    totalOtrosAmparos: diagrama.totalOtrosAmparos || 0,
    otrosAmparos: diagrama.otrosAmparos || [],
  };
}

/**
 * Cuadro 32 / 33 / 34 del formato ágil Allianz.
 * 32 = indemnización antes de deducible; 34 = 32 − deducible aplicado.
 */
export function cuadroLiquidacionAllianz(totales = {}, liquidador = {}) {
  const tot = totales && typeof totales === 'object' ? totales : {};
  const diag = tot.diagrama || {};
  const liq = liquidador?.liquidacionCatastrofico || {};
  const cfg = liq.deducibleConfigPresupuesto && typeof liq.deducibleConfigPresupuesto === 'object'
    ? liq.deducibleConfigPresupuesto
    : {};
  const deducibleMonto = Number(diag.sumaDeducibles || tot.deducibleAplicado || 0) || 0;
  const luego = Number(tot.totalIndemnizar) || 0;
  const sugerido = Math.round((luego + deducibleMonto) * 100) / 100;
  const modo = String(cfg.modo || '').trim();
  const textoLibre = String(
    cfg.texto || liq.deducible || tot.deducibleTexto || ''
  ).trim();
  const noAplica =
    modo === 'no_aplica' ||
    /^no\s*aplica$/i.test(textoLibre);
  let deducibleTexto = textoLibre;
  if (noAplica && !(deducibleMonto > 0)) {
    deducibleTexto = 'No aplica';
  } else if (textoLibre && deducibleMonto > 0 && !textoLibre.includes(formatearMonto(deducibleMonto))) {
    deducibleTexto = `${textoLibre} (${formatearMonto(deducibleMonto)})`;
  } else if (!textoLibre && deducibleMonto > 0) {
    deducibleTexto = formatearMonto(deducibleMonto);
  } else if (!deducibleTexto) {
    deducibleTexto = 'No aplica';
  }
  return {
    valorReclamado: Number(tot.totalReclamado) || Number(tot.totalDanios) || 0,
    valorAsegurado: Number(diag.valorAsegurado) || 0,
    valorSugeridoIndemnizar: sugerido,
    deducibleMonto,
    deducibleTexto,
    valorSugeridoLuegoDeducible: luego,
    valorFinalEstimadoPerdida: Number(tot.totalDanios) || 0,
  };
}

function bienAfectadoAllianz(enc = {}) {
  const causa = String(enc.causa || enc.evento || enc.cobertura || 'terremoto').trim();
  if (!causa) return 'Daños por terremoto';
  if (/dañ/i.test(causa)) return causa;
  return `Daños por ${causa}`;
}

/**
 * Datos del Informe Liquidación Allianz (misma estructura del PDF de la aseguradora).
 */
export function armarInformeLiquidacionAllianz(liquidador = {}, totales = null, caso = {}) {
  const tot = totales && typeof totales === 'object'
    ? totales
    : calcularLiquidacionAllianz(liquidador);
  const cuadro = cuadroLiquidacionAllianz(tot, liquidador);
  const enc = liquidador.encabezado || {};
  const c = caso && typeof caso === 'object' ? caso : {};
  const observaciones = String(liquidador.observaciones || '').trim()
    || String(cuadro.deducibleTexto || tot.deducibleTexto || '').trim();
  return {
    siniestro: String(enc.siniestro || c.siniestro || '').trim(),
    fechaCreacion: new Date(),
    asegurado: String(enc.asegurado || c.asegurado || '').trim(),
    identificacion: String(enc.identificacion || c.identificacion || '').trim(),
    telefono: String(
      enc.telefono || enc.telefonoAsegurado || c.telefonoAsegurado || c.celular || ''
    ).trim(),
    email: String(
      enc.correo || enc.correoAsegurado || c.correoAsegurado || c.correo || ''
    ).trim(),
    valorTotalReclamado: cuadro.valorReclamado,
    valorTotalLiquidacion: cuadro.valorSugeridoIndemnizar,
    deducible: cuadro.deducibleMonto,
    valorAIndemnizar: cuadro.valorSugeridoLuegoDeducible,
    filas: [
      {
        n: 1,
        bienAfectado: bienAfectadoAllianz(enc),
        valorReclamado: cuadro.valorReclamado,
        valorLiquidacion: cuadro.valorSugeridoIndemnizar,
        cobertura: String(enc.cobertura || enc.evento || '1').trim() || '1',
      },
    ],
    observaciones,
  };
}

/** Filas planas del presupuesto NSR o de la cotización PDF (para resúmenes). */
export function itemsPlanosAllianz(liquidador = {}) {
  if (usaCotizacionComoBasePresupuesto(liquidador.cotizacionPdf)) {
    const monto = montoCotizacionPdf(liquidador.cotizacionPdf);
    const nombre = String(liquidador.cotizacionPdf?.nombreOriginal || '').trim();
    return [
      {
        id: 'cotizacion-pdf',
        concepto: nombre ? `Cotización de reparación (${nombre})` : 'Cotización de reparación',
        valorReclamado: monto,
        valorIndemnizable: monto,
      },
    ];
  }
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

export function mapcasoAllianzALiquidador(caso = {}) {
  const encabezado = encabezadoDesdecasoAllianz(caso);
  const prefill = prefillNsrDesdecasoAllianz(caso, encabezado);
  const evalInicial = fusionarEvaluacionSismicaNSR10Guardada({}, prefill, {
    recargosPresupuesto: RECARGOS_PRESUPUESTO_NSR10_CAT,
  });
  const base = {
    ...DEFAULT_LIQUIDADOR_Allianz,
    encabezado,
    evaluacionSismicaNSR10: evalInicial,
    liquidacionCatastrofico: liquidacionCatastroficoDefaultAllianz(caso),
    otrosAmparos: defaultOtrosAmparos(),
    valorReclamadoCaso:
      caso.valorReclamado != null && caso.valorReclamado !== ''
        ? formatMiles(caso.valorReclamado)
        : '',
  };

  const guardado = caso.liquidador && typeof caso.liquidador === 'object' ? caso.liquidador : null;
  if (!guardado) return base;

  // Liquidador FDM antiguo: no migrar ítems; abrir NSR fresco conservando encabezado
  if (!esLiquidadorNsrAllianz(guardado)) {
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
    cotizacionPdf: guardado.cotizacionPdf || null,
  };
}

/** formData mínimo para ChecklistEvaluacionSismicaNSR10 */
export function formDataNsrDesdeLiquidadorAllianz(liquidador = {}, caso = {}) {
  const enc = liquidador.encabezado || {};
  return {
    ...prefillNsrDesdecasoAllianz(caso, enc),
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

export function defaultInformeUnicoAllianz(caso = {}) {
  const guardado =
    caso.informeUnico && typeof caso.informeUnico === 'object' ? caso.informeUnico : null;
  const base = {
    tipoInforme: 'unico',
    fechaInforme: fechaInput(new Date()),
    ajustadorNombre: caso.ajustador || '',
    infoEvento: INFO_EVENTO_DEFAULT_ALLIANZ,
    descripcionDanios: '',
    coordenadasRiesgo: '',
    imagenMapa: '',
    direccionRiesgo: caso.direccionPredio || '',
    analisisCobertura: '',
    reservaSugerida: '',
    filasDanios: plantillaFilasDaniosAllianz(),
    filasPolizaCobertura: plantillaFilasPolizaAllianz(),
    filasPresupuestoPreliminar: plantillaFilasPresupuestoPreliminarAllianz(),
    conclusiones: '',
    recomendacion: '',
    fotosSeleccionadas: [],
    fotosInspeccion: fotosInformeDesdeCaso(caso, guardado),
    fotosCotizacion: fotosCotizacionDesdeLiquidador(caso.liquidador || {}, guardado),
    actaAjustadorNombre: caso.ajustador || '',
    actaAjustadorCargo: '',
    actaAjustadorEmail: '',
    actaAjustadorFirmaImagen: '',
    firmaAjustador: '',
  };
  if (!guardado) return base;
  return sanitizarInformeUnicoCamposWord({
    ...base,
    ...guardado,
    tipoInforme: guardado
      ? normalizarTipoInformeAllianz(guardado.tipoInforme, 'unico')
      : 'unico',
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
    fotosInspeccion: fotosInformeDesdeCaso(caso, guardado),
    fotosCotizacion: fotosCotizacionDesdeLiquidador(caso.liquidador || {}, guardado),
  });
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
