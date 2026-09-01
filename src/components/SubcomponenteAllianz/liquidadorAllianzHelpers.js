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

export const CONCEPTOS_POLIZA_UNICO_ALLIANZ = [
  'Vigencia',
  'Ubicación del riesgo',
  'Evento',
  'Interés afectado',
  'Deducible',
  'Infraseguro',
];

export const CONCEPTOS_POLIZA_PRELIMINAR_ALLIANZ = [
  'Vigencia',
  'Modalidad de aseguramiento',
  'Evento',
  'Áreas comunes',
  'Áreas privadas',
  'Maquinaria y equipo',
  'Equipo electrónico',
  'Deducible terremoto',
  'Reserva preliminar',
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

export function plantillaFilasPolizaAllianz(tipoInforme = 'unico') {
  const conceptos =
    normalizarTipoInformeAllianz(tipoInforme, 'unico') === 'preliminar'
      ? CONCEPTOS_POLIZA_PRELIMINAR_ALLIANZ
      : CONCEPTOS_POLIZA_UNICO_ALLIANZ;
  return conceptos.map((concepto) => ({
    concepto,
    analisis: '',
    conclusion: '',
  }));
}

function textoNoVacioAllianz(valor) {
  const s = String(valor ?? '')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s || s === '—' || s === '-' || /^n\/?a$/i.test(s) || s === 'null' || s === 'undefined') {
    return '';
  }
  return s;
}

export function extraerDireccionObservacionesAllianz(observaciones) {
  const partes = String(observaciones || '')
    .split(/[|\n;]+/)
    .map((p) => p.replace(/\t/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const esFecha = (t) =>
    /\b(gmt|utc|est|edt|eastern|daylight|lunes|martes|miercoles|jueves|viernes|sabado|domingo|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(
      t
    ) || /^\d{4}-\d{2}-\d{2}/.test(t);
  const esSoloNumero = (t) => /^\d{1,5}$/.test(t);
  const pareceDir = (t) =>
    /\b(kr|cl|cra|cr|carrera|calle|av|avenida|diag|transversal|tv|km|apto|apartamento|torre|barrio|#)\b/i.test(
      t
    ) || /\d\s*#/.test(t);
  const candidatas = partes.filter((p) => !esFecha(p) && !esSoloNumero(p));
  const hallada = candidatas.find(pareceDir);
  if (hallada) return hallada;
  const entero = String(observaciones || '').replace(/\s+/g, ' ').trim();
  return pareceDir(entero) && !esFecha(entero) ? entero : '';
}

export function resolverTomadorAllianz(caso = {}, enc = {}) {
  return (
    textoNoVacioAllianz(caso.tomador) ||
    textoNoVacioAllianz(enc.tomador) ||
    textoNoVacioAllianz(caso.asegurado) ||
    textoNoVacioAllianz(enc.asegurado) ||
    textoNoVacioAllianz(caso.informacionContacto) ||
    ''
  );
}

export function resolverCoberturaAllianz(caso = {}, enc = {}) {
  return (
    textoNoVacioAllianz(caso.cobertura) ||
    textoNoVacioAllianz(enc.cobertura) ||
    textoNoVacioAllianz(enc.evento) ||
    textoNoVacioAllianz(caso.causa) ||
    textoNoVacioAllianz(enc.causa) ||
    'TERREMOTO'
  );
}

export function resolverFechaInspeccionAllianz(caso = {}) {
  return caso.fechaInspeccion || caso.fechaVisita || '';
}

export function fusionarEncabezadoAllianz(base = {}, guardado = {}) {
  const out = { ...(base || {}) };
  Object.entries(guardado || {}).forEach(([clave, valor]) => {
    const t = textoNoVacioAllianz(valor);
    if (t) out[clave] = valor;
  });
  return out;
}

export function resolverDireccionPredioAllianz(caso = {}, enc = {}, info = {}) {
  const directa =
    textoNoVacioAllianz(caso.direccionPredio) ||
    textoNoVacioAllianz(enc.direccion) ||
    textoNoVacioAllianz(info.direccionRiesgo);
  if (directa) return directa;
  const deObs = extraerDireccionObservacionesAllianz(caso.observaciones);
  if (deObs) return deObs;
  return [caso.ciudad || enc.ciudad, caso.departamento || enc.departamento]
    .map((x) => textoNoVacioAllianz(x))
    .filter(Boolean)
    .join(', ');
}

function textoInformeAllianz(v) {
  return String(v ?? '').trim();
}

function claveConceptoPolizaAllianz(valor) {
  return textoInformeAllianz(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function conceptoPolizaCoincideAllianz(fila, ...needles) {
  const k = claveConceptoPolizaAllianz(fila?.concepto);
  if (!k) return false;
  return needles.some((n) => k.includes(claveConceptoPolizaAllianz(n)));
}

function analisisConceptoPolizaAllianz(fila, ctx = {}) {
  const caso = ctx.caso || {};
  const enc = ctx.encabezado || {};
  const info = ctx.informe || {};
  const liq = ctx.liquidador || caso.liquidador || {};
  const tomador = resolverTomadorAllianz(caso, enc);
  const poliza = textoInformeAllianz(caso.numeroPoliza || enc.poliza);
  const cobertura = resolverCoberturaAllianz(caso, enc);
  const direccion = resolverDireccionPredioAllianz(caso, enc, info);
  const ciudad = textoInformeAllianz(caso.ciudad || enc.ciudad);
  const depto = textoInformeAllianz(caso.departamento || enc.departamento);
  const ini = caso.fechaInicioPoliza || enc.fechaInicioPoliza;
  const fin = caso.fechaFinPoliza || enc.fechaFinPoliza;

  if (conceptoPolizaCoincideAllianz(fila, 'vigencia')) {
    if (ini || fin) {
      return {
        analisis: `${poliza ? `Póliza ${poliza}. ` : ''}${tomador ? `Tomador/asegurado: ${tomador}. ` : ''}Vigencia del ${formatDateLarga(ini)} al ${formatDateLarga(fin)}, según ficha de Gestionar.`,
        conclusion: 'EN VIGENCIA',
      };
    }
    if (poliza) {
      return {
        analisis: `Póliza ${poliza}${tomador ? `, asegurado ${tomador}` : ''}. Las fechas de vigencia no constan en Gestionar.`,
        conclusion: 'PENDIENTE VIGENCIA',
      };
    }
    return { analisis: '', conclusion: '' };
  }

  if (conceptoPolizaCoincideAllianz(fila, 'ubicacion')) {
    const geo = [ciudad, depto].filter(Boolean).join(' / ');
    const lugar =
      direccion && geo && ciudad && direccion.toLowerCase().includes(ciudad.toLowerCase())
        ? direccion
        : [direccion, geo].filter(Boolean).join('. ');
    if (!lugar) return { analisis: '', conclusion: '' };
    return {
      analisis: `Ubicación del riesgo según Gestionar: ${lugar}.`,
      conclusion: 'RIESGO IDENTIFICADO',
    };
  }

  if (conceptoPolizaCoincideAllianz(fila, 'evento')) {
    if (!cobertura) return { analisis: '', conclusion: '' };
    return {
      analisis: `El expediente (Gestionar) registra causa / cobertura ${cobertura}.`,
      conclusion: 'EVENTO AMPARADO',
    };
  }

  if (conceptoPolizaCoincideAllianz(fila, 'interes afectado', 'interes')) {
    const vaInm = parsearNumero(caso.valorAseguradoInmueble || enc.valorAseguradoInmueble);
    const vaCont = parsearNumero(caso.valorAseguradoContenidos || enc.valorAseguradoContenidos);
    const partes = [];
    if (vaInm > 0) partes.push(`inmueble $ ${formatearMonto(vaInm)}`);
    if (vaCont > 0) partes.push(`contenidos $ ${formatearMonto(vaCont)}`);
    if (!partes.length) return { analisis: '', conclusion: '' };
    return {
      analisis: `Interés afectado según valores asegurados en Gestionar: ${partes.join(' y ')}.`,
      conclusion: 'SEGÚN PÓLIZA / GESTIONAR',
    };
  }

  if (conceptoPolizaCoincideAllianz(fila, 'modalidad')) {
    const vaInm = parsearNumero(caso.valorAseguradoInmueble || enc.valorAseguradoInmueble);
    const vaCont = parsearNumero(caso.valorAseguradoContenidos || enc.valorAseguradoContenidos);
    const partes = [];
    if (vaInm > 0) partes.push(`valor asegurado inmueble $ ${formatearMonto(vaInm)}`);
    if (vaCont > 0) partes.push(`contenidos $ ${formatearMonto(vaCont)}`);
    if (!partes.length) return { analisis: '', conclusion: '' };
    return {
      analisis: `Según Gestionar se registra ${partes.join(' y ')}.`,
      conclusion: 'SEGÚN PÓLIZA / GESTIONAR',
    };
  }

  if (conceptoPolizaCoincideAllianz(fila, 'deducible')) {
    const textoCfg =
      textoInformeAllianz(liq?.liquidacionCatastrofico?.deducibleConfigPresupuesto?.texto) ||
      textoInformeAllianz(liq?.deducible) ||
      TEXTO_DEDUCIBLE_TERREMOTO_ALLIANZ;
    return {
      analisis: `Condición de deducible tomada de Gestionar / liquidador: ${textoCfg}.`,
      conclusion: textoCfg,
    };
  }

  if (conceptoPolizaCoincideAllianz(fila, 'infraseguro')) {
    return {
      analisis:
        'No consta en Gestionar una relación valor asegurado vs. valor comercial que permita declarar infraseguro. Queda sujeto a la inspección y a la carátula de póliza.',
      conclusion: 'POR DEFINIR',
    };
  }

  if (conceptoPolizaCoincideAllianz(fila, 'reserva')) {
    const reserva = reservaSugeridaAllianz(info) || parsearNumero(caso.reserva);
    if (!(reserva > 0)) return { analisis: '', conclusion: '' };
    return {
      analisis: `Reserva preliminar según presupuesto / ficha de Gestionar: $ ${formatearMonto(reserva)}.`,
      conclusion: `$ ${formatearMonto(reserva)}`,
    };
  }

  if (conceptoPolizaCoincideAllianz(fila, 'remocion', 'escombros')) {
    return {
      analisis:
        'La remoción de escombros se reconocerá conforme a las condiciones de la póliza Allianz, una vez cuantificada en la inspección.',
      conclusion: 'SEGÚN PÓLIZA',
    };
  }

  if (conceptoPolizaCoincideAllianz(fila, 'honorarios')) {
    return {
      analisis:
        'Los honorarios profesionales se reconocerán si están amparados en la póliza y se acreditan con soportes.',
      conclusion: 'SEGÚN PÓLIZA',
    };
  }

  if (conceptoPolizaCoincideAllianz(fila, 'exclusion')) {
    return {
      analisis:
        'Se revisarán las exclusiones de la carátula y de las condiciones generales Allianz frente al evento reportado.',
      conclusion: 'POR VERIFICAR',
    };
  }

  if (conceptoPolizaCoincideAllianz(fila, 'concepto preliminar')) {
    return {
      analisis: `Reclamo asociado a ${cobertura || 'terremoto'} según la ficha de Gestionar. Queda sujeto a la carátula de póliza y a la inspección.`,
      conclusion: 'EN ESTUDIO',
    };
  }

  return { analisis: '', conclusion: '' };
}

/**
 * Completa el análisis de póliza con datos de Gestionar sin pisar lo que ya escribió el ajustador.
 */
export function completarFilasPolizaCoberturaAllianz(filas, ctx = {}) {
  const tipo = normalizarTipoInformeAllianz(ctx.informe?.tipoInforme, 'unico');
  const plantilla = plantillaFilasPolizaAllianz(tipo);
  const origen = Array.isArray(filas) && filas.length ? [...filas] : plantilla;
  const vistos = new Set(origen.map((f) => claveConceptoPolizaAllianz(f?.concepto)).filter(Boolean));
  plantilla.forEach((row) => {
    const k = claveConceptoPolizaAllianz(row.concepto);
    if (k && !vistos.has(k)) {
      origen.push({ ...row });
      vistos.add(k);
    }
  });
  return origen.map((fila) => {
    if (textoInformeAllianz(fila?.analisis) || textoInformeAllianz(fila?.conclusion)) return fila;
    const auto = analisisConceptoPolizaAllianz(fila, ctx);
    if (!auto.analisis && !auto.conclusion) return fila;
    return { ...fila, analisis: auto.analisis, conclusion: auto.conclusion };
  });
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

export function itemPresupuestoNsrTieneDatoAllianz(it = {}) {
  return Boolean(
    String(it?.actividad || '').trim() ||
      String(it?.componente || '').trim() ||
      String(it?.capitulo || '').trim() ||
      Number(it?.cantidad) > 0 ||
      parsearNumero(it?.valorUnitario) > 0 ||
      parsearNumero(it?.total) > 0
  );
}

export function presupuestoNsrTieneDatosAllianz(liquidador = {}) {
  const items = liquidador?.evaluacionSismicaNSR10?.presupuesto?.items;
  return (Array.isArray(items) ? items : []).some(itemPresupuestoNsrTieneDatoAllianz);
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
    incluirPresupuestoNsrEnWord: limpio.incluirPresupuestoNsrEnWord !== false,
    fotosCotizacion: serializarPaginasCotizacion(limpio.fotosCotizacion),
  };
}

/** Quita File/blob/preview del liquidador antes de guardar en Mongo. */
export function sanitizarLiquidadorAllianz(liquidador = {}) {
  if (!liquidador || typeof liquidador !== 'object') return liquidador;
  return {
    ...liquidador,
    cotizacionPdf: serializarCotizacionPdf(liquidador.cotizacionPdf),
    filasCotizacionVsPresupuesto: serializarFilasCotizacionVsPresupuestoAllianz(
      liquidador.filasCotizacionVsPresupuesto
    ),
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
  const cobertura = resolverCoberturaAllianz(c, {});
  return {
    tomador: resolverTomadorAllianz(c, {}),
    asegurado: c.asegurado || c.informacionContacto || c.tomador || '',
    poliza: c.numeroPoliza || '',
    tipoPoliza: c.tipoPoliza || '',
    credito: c.numeroCredito || '',
    siniestro: c.siniestro || c.identificacion || '',
    consecutivo: c.consecutivo || '',
    identificacion: c.identificacion || '',
    tipoIdentificacion: c.tipoIdentificacion || '',
    causa: c.causa || '',
    fechaSiniestro: fechaInput(c.fechaSiniestro),
    fechaInicioPoliza: fechaInput(c.fechaInicioPoliza),
    fechaFinPoliza: fechaInput(c.fechaFinPoliza),
    direccion: resolverDireccionPredioAllianz(c),
    ciudad: c.ciudad || '',
    departamento: c.departamento || '',
    cobertura,
    evento: cobertura,
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
    fechaInspeccion: fechaInput(caso.fechaInspeccion || caso.fechaVisita),
    asegurado: encabezado.asegurado || caso.asegurado || caso.informacionContacto || '',
    poliza: encabezado.poliza || caso.numeroPoliza || '',
    municipio: encabezado.ciudad || caso.ciudad || '',
    ciudad: encabezado.ciudad || caso.ciudad || '',
    direccion: encabezado.direccion || resolverDireccionPredioAllianz(caso, encabezado),
    direccionRiesgo: encabezado.direccion || resolverDireccionPredioAllianz(caso, encabezado),
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
  filasCotizacionVsPresupuesto: [],
};

export function esLiquidadorNsrAllianz(liquidador = {}) {
  if (!liquidador || typeof liquidador !== 'object') return false;
  if (liquidador.modelo === 'nsr10') return true;
  if (liquidador.evaluacionSismicaNSR10) return true;
  if (liquidador.liquidacionCatastrofico) return true;
  return false;
}

/**
 * Liquidación de la cotización del asegurado (PDF/Excel), independiente del NSR-10.
 * Aplica la misma fórmula de deducible de póliza sobre el monto cotizado.
 */
export function calcularLiquidacionCotizacionAllianz(liquidador = {}) {
  const monto = Math.round((montoCotizacionPdf(liquidador.cotizacionPdf) || 0) * 100) / 100;
  const vacio = {
    monto: 0,
    diagrama: {},
    desglose: desgloseDeducibleTerremotoAllianz(liquidador, {}),
    deducibleAplicado: 0,
    neto: 0,
    gastosHospedaje: 0,
    totalOtrosAmparos: 0,
    otrosAmparos: [],
    total: 0,
  };
  if (!(monto > 0)) return vacio;
  const liq = liquidador.liquidacionCatastrofico || {};
  const cfg = configDeduciblePresupuestoParaCalculoAllianz(liquidador);
  const diagrama = calcularDiagramaLiquidacion({
    valorAsegurado: valorAseguradoPresupuestoCat(liquidador),
    totalDanios: monto,
    totalPresupuesto: monto,
    totalContenidos: 0,
    hospedajePorcentaje: liq.hospedajePorcentaje,
    hospedajeManual: liq.hospedajeManual,
    deducible: liq.deducible,
    deducibleConfig: cfg,
    deducibleConfigContenidos: cfg,
    deducibleConfigPresupuesto: cfg,
    otrosAmparos: liquidador.otrosAmparos,
  });
  const desglose = desgloseDeducibleTerremotoAllianz(liquidador, diagrama);
  const deducibleAplicado = Number(diagrama.sumaDeducibles || diagrama.deducibleAplicado || 0) || 0;
  const neto = Math.max(0, Math.round((monto - deducibleAplicado) * 100) / 100);
  const gastosHospedaje = Number(diagrama.gastosHospedaje) || 0;
  const totalOtrosAmparos = Number(diagrama.totalOtrosAmparos) || 0;
  const total = Number(diagrama.totalIndemnizar) || neto;
  return {
    monto,
    diagrama,
    desglose,
    deducibleAplicado,
    neto,
    gastosHospedaje,
    totalOtrosAmparos,
    otrosAmparos: diagrama.otrosAmparos || [],
    total,
  };
}

/**
 * Totales Allianz = dos liquidadores: cotización del asegurado y presupuesto NSR-10 del ajustador.
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
  const montoCotiz = montoCotizacionPdf(liquidador.cotizacionPdf);
  const totalPresupuesto = resumen.totalPresupuesto;
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
    ...argsDeduciblesPorArticuloDiagrama(liq, resumen),
  });
  const items = normalizarItemsRespuesta(evalData.items);
  const criterio = calcularCriterioFinal(items);
  const totalReclamado =
    parsearNumero(liquidador.valorReclamadoCaso) || (montoCotiz > 0 ? montoCotiz : sumaCompleta);

  return {
    modelo: 'nsr10',
    presupuesto: totalesPres,
    contenidos: resumen.contenidos,
    totalPresupuesto,
    totalContenidos: resumen.totalContenidos,
    sumaCompleta,
    subtotal: totalesPres.subtotal,
    aiu: totalesPres.aiu,
    imprevistos: totalesPres.imprevistos,
    impuestos: totalesPres.impuestos,
    totalDanios: sumaCompleta,
    origenPresupuesto: 'nsr10',
    cotizacionMonto: montoCotiz,
    diagrama,
    criterio,
    totalIndemnizar: diagrama.totalIndemnizar,
    totalIndemnizable: diagrama.totalIndemnizar,
    totalPerdida: sumaCompleta,
    totalReclamado,
    deducibleAplicado: diagrama.sumaDeducibles || diagrama.deducibleAplicado || 0,
    deducibleTexto:
      String(liq.deducible || liq.deducibleConfigPresupuesto?.texto || '').trim() ||
      desgloseDeducibleTerremotoAllianz(liquidador, diagrama).texto,
    subtotalContenidos: resumen.totalContenidos,
    subtotalEdificios: totalPresupuesto,
    diferencia: Math.round(((totalReclamado - (diagrama.totalIndemnizar || 0)) * 100)) / 100,
    usaSMMLV: Boolean(diagrama.deducibleUsaMinimo && diagrama.deducibleTipoMinimo === 'SMMLV'),
    totalOtrosAmparos: diagrama.totalOtrosAmparos || 0,
    otrosAmparos: diagrama.otrosAmparos || [],
    liquidacionCotizacion: calcularLiquidacionCotizacionAllianz(liquidador),
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
  const cot = tot.liquidacionCotizacion || {};
  const usaCotiz = Number(cot.monto) > 0 && !(Number(tot.totalDanios) > 0);
  const observaciones = String(liquidador.observaciones || '').trim()
    || String(cuadro.deducibleTexto || tot.deducibleTexto || '').trim();
  const filas = [];
  if (Number(cot.monto) > 0) {
    filas.push({
      n: filas.length + 1,
      bienAfectado: `${bienAfectadoAllianz(enc)} — cotización`,
      valorReclamado: cot.monto,
      valorLiquidacion: cot.neto,
      cobertura: String(enc.cobertura || enc.evento || '1').trim() || '1',
    });
  }
  if (Number(tot.totalDanios) > 0 || !filas.length) {
    filas.push({
      n: filas.length + 1,
      bienAfectado: bienAfectadoAllianz(enc),
      valorReclamado: cuadro.valorReclamado,
      valorLiquidacion: cuadro.valorSugeridoIndemnizar,
      cobertura: String(enc.cobertura || enc.evento || '1').trim() || '1',
    });
  }
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
    valorTotalReclamado: usaCotiz ? cot.monto : cuadro.valorReclamado,
    valorTotalLiquidacion: usaCotiz ? cot.monto : cuadro.valorSugeridoIndemnizar,
    deducible: usaCotiz ? cot.deducibleAplicado : cuadro.deducibleMonto,
    valorAIndemnizar: usaCotiz ? cot.neto : cuadro.valorSugeridoLuegoDeducible,
    filas,
    observaciones,
  };
}

/** Filas planas del presupuesto NSR; la cotización PDF queda como reclamado de referencia. */
export function itemsPlanosAllianz(liquidador = {}) {
  const items = liquidador?.evaluacionSismicaNSR10?.presupuesto?.items;
  const nsr = (Array.isArray(items) ? items : [])
    .filter((it) => String(it?.actividad || it?.componente || '').trim())
    .map((it) => ({
      id: it.id,
      concepto: it.actividad || it.componente || 'Ítem',
      valorReclamado: '',
      valorIndemnizable: it.total ?? '',
      cantidad: it.cantidad,
      valorUnitario: it.valorUnitario,
    }));
  const monto = montoCotizacionPdf(liquidador.cotizacionPdf);
  if (!(monto > 0)) return nsr;
  const nombre = String(liquidador.cotizacionPdf?.nombreOriginal || '').trim();
  return [
    {
      id: 'cotizacion-pdf',
      concepto: nombre
        ? `Cotización del asegurado (${nombre})`
        : 'Cotización del asegurado (PDF)',
      valorReclamado: monto,
      valorIndemnizable: '',
    },
    ...nsr,
  ];
}

export function filaCotizacionVsPresupuestoAllianz(fila = {}) {
  return {
    id: fila.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    concepto: String(fila.concepto || ''),
    valorCotizacion: fila.valorCotizacion ?? '',
    valorPresupuesto: fila.valorPresupuesto ?? '',
    observaciones: String(fila.observaciones || ''),
  };
}

export function serializarFilasCotizacionVsPresupuestoAllianz(filas = []) {
  return (Array.isArray(filas) ? filas : []).map((fila) => ({
    id: String(fila?.id || ''),
    concepto: String(fila?.concepto || ''),
    valorCotizacion: fila?.valorCotizacion ?? '',
    valorPresupuesto: fila?.valorPresupuesto ?? '',
    observaciones: String(fila?.observaciones || ''),
  }));
}

/**
 * Ítem de la cotización que no se paga (presupuesto 0) o se reconoce por menor valor.
 * Filas vacías o con presupuesto ≥ cotización no salen al Word.
 */
export function motivoFilaCotizacionVsPresupuestoAllianz(fila = {}) {
  const concepto = String(fila.concepto || '').trim();
  const cotiz = parsearNumero(fila.valorCotizacion);
  const ppto = parsearNumero(fila.valorPresupuesto);
  const obs = String(fila.observaciones || '').trim();
  if (!concepto && cotiz <= 0 && ppto <= 0 && !obs) return null;
  if (cotiz > 0 && ppto <= 0) return 'no_paga';
  if (cotiz > 0 && ppto < cotiz) return 'menor_valor';
  return null;
}

export function diferenciaFilaCotizacionVsPresupuestoAllianz(fila = {}) {
  return (
    Math.round(
      (parsearNumero(fila.valorCotizacion) - parsearNumero(fila.valorPresupuesto)) * 100
    ) / 100
  );
}

export function filaCotizacionVsTieneDatoAllianz(fila = {}) {
  const f = filaCotizacionVsPresupuestoAllianz(fila);
  return Boolean(
    String(f.concepto || '').trim() ||
      parsearNumero(f.valorCotizacion) > 0 ||
      parsearNumero(f.valorPresupuesto) > 0 ||
      String(f.observaciones || '').trim()
  );
}

export function filasConDatoCotizacionVsPresupuestoAllianz(filas = []) {
  return (Array.isArray(filas) ? filas : [])
    .map((fila) => filaCotizacionVsPresupuestoAllianz(fila))
    .filter(filaCotizacionVsTieneDatoAllianz);
}

export function filasBreveCotizacionVsPresupuestoAllianz(filas = []) {
  return filasConDatoCotizacionVsPresupuestoAllianz(filas).filter((fila) =>
    motivoFilaCotizacionVsPresupuestoAllianz(fila)
  );
}

export function etiquetaMotivoCotizacionVsPresupuestoAllianz(motivo) {
  if (motivo === 'no_paga') return 'No se paga';
  if (motivo === 'menor_valor') return 'Menor valor';
  return '';
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
      encabezado: fusionarEncabezadoAllianz(base.encabezado, guardado.encabezado),
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
    encabezado: fusionarEncabezadoAllianz(base.encabezado, guardado.encabezado),
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
    filasCotizacionVsPresupuesto: serializarFilasCotizacionVsPresupuestoAllianz(
      guardado.filasCotizacionVsPresupuesto
    ),
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
  const tipo = guardado
    ? normalizarTipoInformeAllianz(guardado.tipoInforme, 'unico')
    : 'unico';
  const encabezado = encabezadoDesdecasoAllianz(caso);
  const ctxPoliza = (informe) => ({
    caso,
    encabezado,
    informe: { tipoInforme: tipo, ...(informe || {}) },
    liquidador: caso.liquidador,
  });
  const base = {
    tipoInforme: tipo,
    fechaInforme: fechaInput(new Date()),
    ajustadorNombre: caso.ajustador || '',
    infoEvento: INFO_EVENTO_DEFAULT_ALLIANZ,
    descripcionDanios: '',
    coordenadasRiesgo: '',
    imagenMapa: '',
    direccionRiesgo: resolverDireccionPredioAllianz(caso, encabezado, guardado || {}),
    analisisCobertura: '',
    reservaSugerida: '',
    filasDanios: plantillaFilasDaniosAllianz(),
    filasPolizaCobertura: completarFilasPolizaCoberturaAllianz(
      plantillaFilasPolizaAllianz(tipo),
      ctxPoliza(null)
    ),
    filasPresupuestoPreliminar: plantillaFilasPresupuestoPreliminarAllianz(),
    conclusiones: '',
    recomendacion: '',
    fotosSeleccionadas: [],
    fotosInspeccion: fotosInformeDesdeCaso(caso, guardado),
    fotosCotizacion: fotosCotizacionDesdeLiquidador(caso.liquidador || {}, guardado),
    incluirPresupuestoNsrEnWord: true,
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
    tipoInforme: tipo,
    ajustadorNombre: guardado.ajustadorNombre || guardado.actaAjustadorNombre || base.ajustadorNombre,
    actaAjustadorNombre:
      guardado.actaAjustadorNombre || guardado.ajustadorNombre || base.actaAjustadorNombre,
    infoEvento: guardado.infoEvento || base.infoEvento,
    descripcionDanios: guardado.descripcionDanios || base.descripcionDanios,
    coordenadasRiesgo: guardado.coordenadasRiesgo || base.coordenadasRiesgo,
    imagenMapa: guardado.imagenMapa || base.imagenMapa,
    direccionRiesgo:
      textoNoVacioAllianz(guardado.direccionRiesgo) || base.direccionRiesgo,
    reservaSugerida: guardado.reservaSugerida ?? base.reservaSugerida,
    filasDanios: usarPlantillaSiVacio(guardado.filasDanios, base.filasDanios),
    filasPolizaCobertura: completarFilasPolizaCoberturaAllianz(
      usarPlantillaSiVacio(guardado.filasPolizaCobertura, base.filasPolizaCobertura),
      ctxPoliza(guardado)
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
