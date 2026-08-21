import { formatDate, formatNumber, getAppLocale } from '../../utils/locale.js';
import { formatMiles } from './bbvaCatHelpers.js';
import {
  calcularCriterioFinal,
  calcularResumenTotalesNsr10,
  calcularTotalesPresupuesto,
  fusionarEvaluacionSismicaNSR10Guardada,
  normalizarItemsRespuesta,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import {
  calcularDiagramaLiquidacion,
  DEFAULT_DEDUCIBLE_CATASTROFICO,
  HOSPEDAJE_PORCENTAJE_DEFAULT,
} from '../SubcomponenteFormularioCatastrofico/catalogoPresupuestoCatastrofico.js';

export const SMMLV_POR_ANIO = {
  2024: 1300000,
  2025: 1423500,
  2026: 1750905,
};
export const SMMLV_DEFAULT = SMMLV_POR_ANIO[2026];

/** Texto fijo editable: información general del evento (consolidado terremoto BbvaCat). */
export const INFO_EVENTO_DEFAULT_BBVA_CAT = `El presente informe se elabora en el marco de la atención del evento sísmico / catastrófico reportado ante BBVA Seguros, conforme a la visita de inspección realizada al predio asegurado y a la documentación aportada por el tomador/asegurado.

La evaluación técnica tiene por objeto verificar la existencia y alcance de los daños, confrontarlos con las coberturas de la póliza vigente y cuantificar las pérdidas indemnizables de acuerdo con las condiciones particulares del contrato de seguro.`;

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
export function crearItemBbvaCat(item = '', valor = '', id) {
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
    return crearItemBbvaCat(it.item || '', it.valor ?? '', it.id);
  }
  const valor = it.valorIndemnizable || it.valorReclamado || '';
  return crearItemBbvaCat(it.concepto || '', valor, it.id);
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

export function liquidacionCatastroficoDefaultBbvaCat(caso = {}) {
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

export function encabezadoDesdecasoBbvaCat(caso = {}) {
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
    valorAseguradoInmueble: c.valorAseguradoInmueble ?? '',
  };
}

/** Prefill portada NSR desde caso BBVA CAT */
export function prefillNsrDesdecasoBbvaCat(caso = {}, encabezado = {}) {
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
  };
}

export const DEFAULT_LIQUIDADOR_BbvaCat = {
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
    valorAseguradoInmueble: '',
  },
  evaluacionSismicaNSR10: null,
  liquidacionCatastrofico: liquidacionCatastroficoDefaultBbvaCat(),
  indemnizacionSugerida: '',
  observaciones: '',
};

export function esLiquidadorNsrBbvaCat(liquidador = {}) {
  if (!liquidador || typeof liquidador !== 'object') return false;
  if (liquidador.modelo === 'nsr10') return true;
  if (liquidador.evaluacionSismicaNSR10) return true;
  if (liquidador.liquidacionCatastrofico) return true;
  return false;
}

/**
 * Totales BbvaCat = presupuesto NSR-10 + contenidos + diagrama (suma + hospedaje).
 * Compat: expone totalIndemnizar / totalIndemnizable para finiquito e informe.
 */
export function calcularLiquidacionBbvaCat(liquidador = {}) {
  const evalData = liquidador.evaluacionSismicaNSR10 || {};
  const presupuesto = evalData.presupuesto || { items: [] };
  const totalesPres = calcularTotalesPresupuesto(presupuesto);
  const resumen = calcularResumenTotalesNsr10(evalData);
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
  };
}

/** Filas planas del presupuesto NSR (para resúmenes). */
export function itemsPlanosBbvaCat(liquidador = {}) {
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

export function mapcasoBbvaCatALiquidador(caso = {}) {
  const encabezado = encabezadoDesdecasoBbvaCat(caso);
  const prefill = prefillNsrDesdecasoBbvaCat(caso, encabezado);
  const evalInicial = fusionarEvaluacionSismicaNSR10Guardada({}, prefill);
  const base = {
    ...DEFAULT_LIQUIDADOR_BbvaCat,
    encabezado,
    evaluacionSismicaNSR10: evalInicial,
    liquidacionCatastrofico: liquidacionCatastroficoDefaultBbvaCat(caso),
    valorReclamadoCaso:
      caso.valorReclamado != null && caso.valorReclamado !== ''
        ? formatMiles(caso.valorReclamado)
        : '',
  };

  const guardado = caso.liquidador && typeof caso.liquidador === 'object' ? caso.liquidador : null;
  if (!guardado) return base;

  // Liquidador FDM antiguo: no migrar ítems; abrir NSR fresco conservando encabezado
  if (!esLiquidadorNsrBbvaCat(guardado)) {
    return {
      ...base,
      encabezado: { ...base.encabezado, ...(guardado.encabezado || {}) },
      observaciones: guardado.observaciones || '',
      valorReclamadoCaso: guardado.valorReclamadoCaso || base.valorReclamadoCaso,
    };
  }

  return {
    ...base,
    ...guardado,
    modelo: 'nsr10',
    encabezado: { ...base.encabezado, ...(guardado.encabezado || {}) },
    evaluacionSismicaNSR10: fusionarEvaluacionSismicaNSR10Guardada(
      guardado.evaluacionSismicaNSR10,
      prefill
    ),
    liquidacionCatastrofico: {
      ...base.liquidacionCatastrofico,
      ...(guardado.liquidacionCatastrofico || {}),
    },
    indemnizacionSugerida: guardado.indemnizacionSugerida || '',
  };
}

/** formData mínimo para ChecklistEvaluacionSismicaNSR10 */
export function formDataNsrDesdeLiquidadorBbvaCat(liquidador = {}, caso = {}) {
  const enc = liquidador.encabezado || {};
  return {
    ...prefillNsrDesdecasoBbvaCat(caso, enc),
    evaluacionSismicaNSR10: liquidador.evaluacionSismicaNSR10,
    liquidacionCatastrofico: liquidador.liquidacionCatastrofico,
    indemnizacionSugerida: liquidador.indemnizacionSugerida,
    asegurado: enc.asegurado,
    ciudad: enc.ciudad,
    direccionRiesgo: enc.direccion,
    numeroPoliza: enc.poliza,
    fechaSiniestro: enc.fechaSiniestro,
    actaAjustadorNombre: enc.ajustador || caso.ajustador || '',
  };
}

export function defaultInformeUnicoBbvaCat(caso = {}) {
  const guardado =
    caso.informeUnico && typeof caso.informeUnico === 'object' ? caso.informeUnico : null;
  const base = {
    fechaInforme: fechaInput(new Date()),
    ajustadorNombre: caso.ajustador || '',
    infoEvento: INFO_EVENTO_DEFAULT_BBVA_CAT,
    descripcionDanios: '',
    coordenadasRiesgo: '',
    imagenMapa: '',
    direccionRiesgo: caso.direccionPredio || '',
    analisisCobertura: '',
    conclusiones: '',
    recomendacion: '',
    fotosSeleccionadas: [],
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
    ajustadorNombre: guardado.ajustadorNombre || guardado.actaAjustadorNombre || base.ajustadorNombre,
    actaAjustadorNombre:
      guardado.actaAjustadorNombre || guardado.ajustadorNombre || base.actaAjustadorNombre,
    infoEvento: guardado.infoEvento || base.infoEvento,
    descripcionDanios: guardado.descripcionDanios || base.descripcionDanios,
    coordenadasRiesgo: guardado.coordenadasRiesgo || base.coordenadasRiesgo,
    imagenMapa: guardado.imagenMapa || base.imagenMapa,
    direccionRiesgo: guardado.direccionRiesgo || base.direccionRiesgo,
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
