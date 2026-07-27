/** Utilidades del liquidador Express (equivalente FORMATO_LIQUIDACION + export Word) */

/** SMMLV Colombia por año (actualizar cada enero cuando salga el decreto). */
export const SMMLV_POR_ANIO = {
  2018: 781242,
  2019: 828116,
  2020: 877803,
  2021: 908526,
  2022: 1000000,
  2023: 1160000,
  2024: 1300000,
  2025: 1423500,
  2026: 1750905,
};

export const ANIOS_SMMLV = Object.keys(SMMLV_POR_ANIO)
  .map(Number)
  .sort((a, b) => b - a);

export const SMMLV_ANIO_MAS_RECIENTE = ANIOS_SMMLV[0];
export const SMMLV_DEFAULT = SMMLV_POR_ANIO[SMMLV_ANIO_MAS_RECIENTE];
/** @deprecated usar SMMLV_DEFAULT */
export const SMMLV_DEFAULT_2026 = SMMLV_DEFAULT;

/** Resuelve año y valor SMMLV (si el año no está en tabla, usa el más cercano ≤ año o el más reciente). */
export function resolverSmmlvPorAnio(anio) {
  const n = Number(anio);
  if (Number.isFinite(n) && SMMLV_POR_ANIO[n] != null) {
    return { anio: n, valor: SMMLV_POR_ANIO[n] };
  }
  if (Number.isFinite(n)) {
    const menorOIgual = ANIOS_SMMLV.find((a) => a <= n);
    if (menorOIgual != null) {
      return { anio: menorOIgual, valor: SMMLV_POR_ANIO[menorOIgual] };
    }
    const mayor = ANIOS_SMMLV[ANIOS_SMMLV.length - 1];
    return { anio: mayor, valor: SMMLV_POR_ANIO[mayor] };
  }
  return { anio: SMMLV_ANIO_MAS_RECIENTE, valor: SMMLV_DEFAULT };
}

export function anioDesdeFecha(fechaISO) {
  if (!fechaISO) return null;
  const raw = String(fechaISO).slice(0, 4);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1990 && n <= 2100 ? n : null;
}

export const OPCIONES_APLICA = ['Aplica', 'No Aplica'];

export const NOTAS_SALVAMENTO = [
  'Todo salvamento debe contar registro fotográfico actualizado y debe estar cargado al respectivo ZC.',
  'En la descripción del salvamento y de aplicar debe quedar relacionada la marca y serial del equipo.',
  'En caso de que el salvamento corresponda a grado alimenticio o de consumo humano se debe notificar por correo para dar prioridad al mismo.',
  'En las especificaciones del daño se debe dejar estipulado a qué correspondió el daño y si el salvamento presenta algún tipo de despiece realizado que hubiera podido afectar el estado del salvamento.',
  'En la casilla de comentarios se deben dejar observaciones adicionales, tales como posibles valores de venta, si es recomendable realizar disposición final del mismo, etc.',
];

export const DOCUMENTOS_SOPORTE = [
  'Comunicación del asegurado donde indique las circunstancias de tiempo, modo y lugar en que ocurrieron los hechos',
  'Informe técnico de firma especializada acerca del alcance de los daños y causa de los mismos indicando la posibilidad de reparación',
  'Factura de adquisición y/o certificación emitida por el Contador o Revisor fiscal del generador',
  'Cotización y/o factura de reparación o reposición del bien afectado por uno de iguales o similares características',
  'Registro fotográfico o fílmico de los bienes afectados',
  'Denuncia penal instaurada ante autoridad competente',
  'Hoja de vida de la máquina que incluya las tres últimas bitácoras de mantenimiento previo al siniestro',
];

export const DEFAULT_LIQUIDADOR_EXPRESS = {
  encabezado: {
    reclamo: '',
    zc: '',
    asegurado: '',
    nit: '',
    poliza: '',
    fechaSiniestro: '',
    cobertura: '',
    deducibleTexto: '',
  },
  conceptos: [],
  deducible: {
    porcentaje: 10,
    cantidadSMMLV: 4,
    anioSMMLV: SMMLV_ANIO_MAS_RECIENTE,
    valorSMMLV: SMMLV_DEFAULT,
  },
  checklist: {
    fecha: '',
    tipoProducto: 'TRDM',
    vigenciaDesde: '',
    vigenciaHasta: '',
    riesgoAsegurado: '',
    coberturaAfectada: '',
    garantias: 'No Aplica',
    exclusiones: 'No Aplica',
    objecion: 'No Aplica',
    tipoPerdida: 'Parcial',
    aplicaDemerito: 'No Aplica',
    limiteAsegurado: '',
    salvamento: 'No Aplica',
    salvamentoDetalle: '',
    recobro: 'No Aplica',
    indicadoresFraude: 'No Aplica',
    descripcionEvento: '',
    documentos: DOCUMENTOS_SOPORTE.map(() => false),
    reclamoFormalizado: 'Sí',
    fechaFormalizacion: '',
    itemsAnalisis: [],
    comentariosAdicionales: 'Para este caso no aplica',
    ajustador: '',
  },
  salvamento: {
    subTarea: 'SALVAMENTO',
    descripcion: '',
    cantidad: '',
    marca: '',
    serial: 'N/D',
    especificacionDano: '',
    ubicacion: '',
    contactoEntrega: '',
    nacionalizado: 'NO',
    generaCustodia: 'NO',
    valorCustodia: '',
    registroFotografico: 'NO',
    indemnizado: 'NO',
    valorIndemnizado: '',
    ofertaNonCash: 'NO',
    valorNonCash: '',
    comentarios: '',
  },
};

export function parsearNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return 0;
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
  let numero = String(valor).replace(/[^\d.,-]/g, '');
  if (numero.includes(',') && numero.includes('.')) {
    numero = numero.replace(/\./g, '').replace(',', '.');
  } else if (numero.includes('.') && !numero.includes(',')) {
    numero = numero.replace(/\./g, '');
  } else if (numero.includes(',')) {
    numero = numero.replace(',', '.');
  }
  const n = parseFloat(numero);
  return isNaN(n) ? 0 : n;
}

export function formatearMonto(valor) {
  const n = typeof valor === 'number' ? valor : parsearNumero(valor);
  if (isNaN(n)) return '0';
  const esNegativo = n < 0;
  const formateado = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
  return esNegativo ? `-${formateado}` : formateado;
}

export function numDeducible(valor, defaultVal) {
  if (valor === '' || valor === null || valor === undefined) return defaultVal;
  const n = typeof valor === 'number' ? valor : parseFloat(valor);
  return isNaN(n) ? defaultVal : n;
}

export function calcularLiquidacion(liquidador) {
  const conceptos = liquidador.conceptos || [];
  const totalPerdida = conceptos.reduce(
    (sum, item) => sum + parsearNumero(item.valor),
    0
  );

  const porcentaje = numDeducible(liquidador.deducible?.porcentaje, 10);
  const deduciblePorcentaje = totalPerdida * (porcentaje / 100);

  const anioRef =
    Number(liquidador.deducible?.anioSMMLV) ||
    anioDesdeFecha(liquidador.encabezado?.fechaSiniestro) ||
    SMMLV_ANIO_MAS_RECIENTE;
  const smmlvResuelto = resolverSmmlvPorAnio(anioRef);
  const valorSMMLV = parsearNumero(
    liquidador.deducible?.valorSMMLV ?? smmlvResuelto.valor ?? SMMLV_DEFAULT
  );
  const cantidadSMMLV = numDeducible(liquidador.deducible?.cantidadSMMLV, 4);
  const deducibleSMMLV = valorSMMLV * cantidadSMMLV;

  const deducibleAplicado = Math.max(deduciblePorcentaje, deducibleSMMLV);
  const totalIndemnizar = totalPerdida - deducibleAplicado;
  const usaSMMLV = deducibleSMMLV > deduciblePorcentaje;

  return {
    totalPerdida,
    deduciblePorcentaje,
    deducibleSMMLV,
    deducibleAplicado,
    totalIndemnizar,
    usaSMMLV,
    porcentaje,
    cantidadSMMLV,
    valorSMMLV,
    anioSMMLV: smmlvResuelto.anio,
  };
}

/** Convierte entero COP a letras (simplificado, estilo recibo indemnización) */
const UNIDADES = [
  '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE',
  'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS',
  'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE',
];
const DECENAS = [
  '', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA',
];
const CENTENAS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
];

function seccionMenor100(n) {
  if (n === 0) return '';
  if (n < 30) return UNIDADES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d === 2) return u === 0 ? 'VEINTE' : `VEINTI${UNIDADES[u].toLowerCase()}`.replace('veintiuno', 'VEINTIÚN');
  return u === 0 ? DECENAS[d] : `${DECENAS[d]} Y ${UNIDADES[u]}`;
}

function seccionMenor1000(n) {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const r = n % 100;
  const cent = c === 1 && r > 0 ? 'CIENTO' : CENTENAS[c];
  return r === 0 ? cent : `${cent} ${seccionMenor100(r)}`.trim();
}

function convertirEnteroATexto(n) {
  if (n === 0) return 'CERO';
  if (n < 1000) return seccionMenor1000(n);

  const millones = Math.floor(n / 1_000_000);
  const restoMillones = n % 1_000_000;
  const miles = Math.floor(restoMillones / 1000);
  const unidades = restoMillones % 1000;

  const partes = [];
  if (millones > 0) {
    partes.push(
      millones === 1 ? 'UN MILLÓN' : `${convertirEnteroATexto(millones)} MILLONES`
    );
  }
  if (miles > 0) {
    partes.push(miles === 1 ? 'MIL' : `${seccionMenor1000(miles)} MIL`);
  }
  if (unidades > 0) {
    partes.push(seccionMenor1000(unidades));
  }
  return partes.join(' ').replace(/\s+/g, ' ').trim();
}

export function montoALetras(valor) {
  const n = Math.abs(typeof valor === 'number' ? valor : parsearNumero(valor));
  const entero = Math.floor(n);
  const centavos = Math.round((n - entero) * 100);

  let texto = convertirEnteroATexto(entero);
  if (centavos > 0) {
    texto += ` CON ${String(centavos).padStart(2, '0')}/100`;
  }
  return texto;
}

/**
 * ¿Debe generarse/mostrarse la hoja y el Word de SALVAMENTO?
 * Prioriza el flag del caso Express; si no hay, usa el checklist del liquidador.
 */
export function aplicaFormatoSalvamento(liquidador = {}, casoExpress = null) {
  const delCaso = casoExpress?.salvamentoAplica;
  if (delCaso === 'aplica') return true;
  if (delCaso === 'no_aplica') return false;

  const delChecklist = liquidador?.checklist?.salvamento;
  if (delChecklist === 'Aplica') return true;
  if (delChecklist === 'No Aplica') return false;

  return false;
}

export function mapCasoExpressALiquidador(caso = {}) {
  const hoy = new Date().toISOString().slice(0, 10);
  const fechaSiniestro = caso.fechaSiniestro
    ? String(caso.fechaSiniestro).slice(0, 10)
    : '';
  const anioSiniestro = anioDesdeFecha(fechaSiniestro) || SMMLV_ANIO_MAS_RECIENTE;
  const smmlv = resolverSmmlvPorAnio(anioSiniestro);

  const base = {
    ...DEFAULT_LIQUIDADOR_EXPRESS,
    encabezado: {
      ...DEFAULT_LIQUIDADOR_EXPRESS.encabezado,
      reclamo: caso.numeroSiniestro || '',
      zc: caso.codigoWorkflow || caso.consecutivo || '',
      asegurado: caso.aseguradoBeneficiario || '',
      nit: caso.nit || '',
      poliza: caso.numeroPoliza || caso.liquidador?.encabezado?.poliza || '',
      fechaSiniestro,
      cobertura: caso.amparo || '',
    },
    deducible: {
      ...DEFAULT_LIQUIDADOR_EXPRESS.deducible,
      anioSMMLV: smmlv.anio,
      valorSMMLV: smmlv.valor,
    },
    checklist: {
      ...DEFAULT_LIQUIDADOR_EXPRESS.checklist,
      fecha: hoy,
      riesgoAsegurado: caso.aseguradoBeneficiario || '',
      coberturaAfectada: caso.amparo || '',
      descripcionEvento: caso.observacionesSeguimiento || '',
      ajustador: caso.responsable || '',
      salvamento: caso.salvamentoAplica === 'aplica' ? 'Aplica' : 'No Aplica',
      salvamentoDetalle: caso.valorSalvamento ? String(caso.valorSalvamento) : '',
    },
    salvamento: {
      ...DEFAULT_LIQUIDADOR_EXPRESS.salvamento,
      descripcion: caso.salvamentoAplica === 'aplica' ? (caso.valorSalvamento ? `Valor ref: ${caso.valorSalvamento}` : '') : '',
    },
  };

  if (caso.liquidador && typeof caso.liquidador === 'object') {
    const liq = caso.liquidador;
    return {
      ...DEFAULT_LIQUIDADOR_EXPRESS,
      ...liq,
      encabezado: {
        ...DEFAULT_LIQUIDADOR_EXPRESS.encabezado,
        ...base.encabezado,
        ...(liq.encabezado || {}),
        // Preferir lo guardado; si viene vacío, completar desde el caso
        reclamo: liq.encabezado?.reclamo || base.encabezado.reclamo,
        zc: liq.encabezado?.zc || base.encabezado.zc,
        asegurado: liq.encabezado?.asegurado || base.encabezado.asegurado,
        nit: liq.encabezado?.nit || base.encabezado.nit,
        poliza: liq.encabezado?.poliza || base.encabezado.poliza,
        fechaSiniestro: liq.encabezado?.fechaSiniestro || base.encabezado.fechaSiniestro,
        cobertura: liq.encabezado?.cobertura || base.encabezado.cobertura,
      },
      deducible: (() => {
        const dedMerged = {
          ...DEFAULT_LIQUIDADOR_EXPRESS.deducible,
          ...base.deducible,
          ...(liq.deducible || {}),
        };
        if (!dedMerged.anioSMMLV) {
          const anio =
            anioDesdeFecha(liq.encabezado?.fechaSiniestro || base.encabezado.fechaSiniestro) ||
            SMMLV_ANIO_MAS_RECIENTE;
          const smmlvFix = resolverSmmlvPorAnio(anio);
          dedMerged.anioSMMLV = smmlvFix.anio;
          if (!dedMerged.valorSMMLV) dedMerged.valorSMMLV = smmlvFix.valor;
        }
        return dedMerged;
      })(),
      checklist: {
        ...DEFAULT_LIQUIDADOR_EXPRESS.checklist,
        ...base.checklist,
        ...(liq.checklist || {}),
        documentos: Array.isArray(liq.checklist?.documentos)
          ? liq.checklist.documentos
          : base.checklist.documentos,
        itemsAnalisis: Array.isArray(liq.checklist?.itemsAnalisis)
          ? liq.checklist.itemsAnalisis
          : base.checklist.itemsAnalisis,
      },
      salvamento: {
        ...DEFAULT_LIQUIDADOR_EXPRESS.salvamento,
        ...base.salvamento,
        ...(liq.salvamento || {}),
      },
      conceptos: Array.isArray(liq.conceptos) ? liq.conceptos : [],
    };
  }

  return base;
}

/** Sincroniza ítems de análisis desde la tabla de conceptos de liquidación */
export function conceptosAItemsAnalisis(conceptos = []) {
  return conceptos.map((c, idx) => ({
    id: c.id || `${Date.now()}-${idx}`,
    descripcion: c.concepto || c.detalle || '',
    reclamado: c.valor || '',
    ajustado: c.valor || '',
    observacion: c.observacion || c.detalle || '',
  }));
}

export function totalesItemsAnalisis(items = []) {
  const totalReclamado = items.reduce((s, i) => s + parsearNumero(i.reclamado), 0);
  const totalAjustado = items.reduce((s, i) => s + parsearNumero(i.ajustado), 0);
  return { totalReclamado, totalAjustado };
}

function formatearFechaSiniestroLarga(fechaISO) {
  if (!fechaISO) return '';
  const raw = String(fechaISO).slice(0, 10);
  const d = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function buildReciboPreview(liquidador, totales) {
  const h = liquidador.encabezado || {};
  const monto = totales.totalIndemnizar;
  const letras = montoALetras(monto);
  const fechaSiniestro =
    formatearFechaSiniestroLarga(h.fechaSiniestro) || '—';
  const { texto: descStro } = textoDescripcionSiniestroRecibo(liquidador);

  return {
    titulo: 'Recibo de Indemnización',
    reclamo: h.reclamo || '—',
    asegurado: h.asegurado || '—',
    nit: h.nit || '—',
    poliza: h.poliza || '—',
    fecha: fechaSiniestro,
    valor: formatearMonto(monto),
    valorLetras: letras,
    anio: String(new Date().getFullYear()),
    parrafoPrincipal: `Declaramos que hemos recibido de Zúrich Colombia Seguros S.A. la suma de ${letras} MCE ($${formatearMonto(monto)}), como indemnización única, total y definitiva con ocasión de ${descStro}.`,
  };
}

export function pctDocumentosMarcados(documentos = []) {
  if (!documentos.length) return 0;
  const marcados = documentos.filter(Boolean).length;
  return Math.round((marcados / documentos.length) * 100);
}

/**
 * Texto que completa «…con ocasión de _____» en el recibo de indemnización.
 * Si no hay descripción del evento, usa una fórmula jurídica genérica para que el Word no quede con marcadores vacíos.
 */
export function textoDescripcionSiniestroRecibo(liquidador = {}) {
  const chk = liquidador.checklist || {};
  const enc = liquidador.encabezado || {};
  const propia = (chk.descripcionEvento || '').trim();
  if (propia) return { texto: propia, esGenerico: false };

  const partes = [];
  const cobertura = (chk.coberturaAfectada || enc.cobertura || '').trim();
  const fecha = (enc.fechaSiniestro || '').trim();
  const reclamo = (enc.reclamo || '').trim();

  if (cobertura) {
    partes.push(`los daños y pérdidas bajo la cobertura de ${cobertura}`);
  } else {
    partes.push('los daños y pérdidas ocasionados por el siniestro reclamado');
  }

  if (fecha) {
    const d = new Date(`${fecha.slice(0, 10)}T12:00:00`);
    const fechaTxt = Number.isNaN(d.getTime())
      ? fecha
      : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    partes.push(`ocurrido el ${fechaTxt}`);
  }

  if (reclamo) {
    partes.push(`(reclamo ${reclamo})`);
  }

  partes.push('amparado por la póliza antes mencionada');

  return {
    texto: partes.join(' '),
    esGenerico: true,
  };
}
