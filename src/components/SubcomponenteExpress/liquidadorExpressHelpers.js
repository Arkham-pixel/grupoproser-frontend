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

/** Días del mes para SMDLV (salario mínimo diario legal vigente). */
export const DIAS_SMDLV = 30;

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
    /** 'SMMLV' = salario mínimo mensual | 'SMDLV' = salario mínimo diario */
    tipoMinimo: 'SMMLV',
    cantidadSMMLV: 4,
    cantidadSMDLV: 10,
    anioSMMLV: SMMLV_ANIO_MAS_RECIENTE,
    valorSMMLV: SMMLV_DEFAULT,
    valorSMDLV: Math.round(SMMLV_DEFAULT / DIAS_SMDLV),
  },
  checklist: {
    fecha: '',
    tipoProducto: '',
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
    documentos: DOCUMENTOS_SOPORTE.map(() => ''),
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

/** SMDLV = SMMLV / 30 (redondeo a pesos enteros). */
export function valorSmdlvDesdeSmmlv(valorSMMLV) {
  const n = parsearNumero(valorSMMLV);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n / DIAS_SMDLV);
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

/** Formato monetario con símbolo: `$ 1.750.905` o `$ 1.750.905,50`. Vacío si no hay valor. */
export function formatearMontoConPeso(valor) {
  if (valor === '' || valor === null || valor === undefined) return '';
  const stripped = String(valor).replace(/[$\s]/g, '');
  if (stripped === '' || stripped === '-') return '';
  const n = typeof valor === 'number' ? valor : parsearNumero(valor);
  if (!Number.isFinite(n)) return '';
  return `$ ${formatearMonto(n)}`;
}

/**
 * Formatea en vivo mientras se escribe (permite coma decimal en progreso).
 * Ej: `1750905` → `$ 1.750.905` ; `$ 1.750,` se conserva al teclear decimales.
 */
export function formatearInputMoneda(raw) {
  if (raw === null || raw === undefined) return '';
  const str = String(raw);
  const negativo = /^-/.test(str.replace(/[$\s]/g, '')) || str.trim().startsWith('-$');
  let cleaned = str.replace(/[^\d,]/g, '');
  if (!cleaned) return '';

  const commaIndex = cleaned.indexOf(',');
  let intDigits;
  let decDigits = '';
  let conComa = false;

  if (commaIndex === -1) {
    intDigits = cleaned;
  } else {
    conComa = true;
    intDigits = cleaned.slice(0, commaIndex);
    decDigits = cleaned
      .slice(commaIndex + 1)
      .replace(/,/g, '')
      .slice(0, 2);
  }

  intDigits = intDigits.replace(/^0+(?=\d)/, '');
  if (intDigits === '') intDigits = '0';

  const intFormatted = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const signo = negativo ? '-' : '';
  if (conComa) {
    return `$ ${signo}${intFormatted},${decDigits}`;
  }
  return `$ ${signo}${intFormatted}`;
}

/** Redondea a pesos enteros (sin centavos). Usado en recibo y documentos legales. */
export function redondearPesos(valor) {
  const n = typeof valor === 'number' ? valor : parsearNumero(valor);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

export function numDeducible(valor, defaultVal) {
  if (valor === '') return 0;
  if (valor === null || valor === undefined) return defaultVal;
  const n = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'));
  return Number.isNaN(n) ? defaultVal : n;
}

function textoConcepto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
}

function itemConceptoTieneContenido(item) {
  if (!item || typeof item !== 'object') return false;
  return Boolean(
    textoConcepto(item.concepto) ||
      textoConcepto(item.detalle) ||
      textoConcepto(item.valor) ||
      parsearNumero(item.valor)
  );
}

function normalizarItemConcepto(item = {}, idx = 0) {
  const concepto = textoConcepto(
    item.concepto ?? item.descripcion ?? item.item ?? item.nombre ?? item.conceptoNombre
  );
  const detalle = textoConcepto(
    item.detalle ?? item.observacion ?? item.descripcion ?? item.concepto
  );
  const valorRaw =
    item.valor ??
    item.monto ??
    item.valorAjustado ??
    item.ajustado ??
    item.valorIndemnizable ??
    item.reclamado ??
    '';
  return {
    id: item.id || `concepto-${idx + 1}`,
    concepto,
    detalle: detalle && detalle !== concepto ? detalle : detalle || concepto,
    valor: valorRaw,
  };
}

function listaDesdeCampoConceptos(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') return Object.values(raw);
  return [];
}

/**
 * Ítems de la hoja FORMATO_LIQUIDACION.
 * Prioriza `conceptos`; si vienen vacíos o con otra forma, usa el análisis del checklist.
 * El PDF/Excel del liquidador no depende de que el checklist esté diligenciado.
 */
export function listaConceptosLiquidador(liquidador = {}) {
  const desdeConceptos = listaDesdeCampoConceptos(liquidador.conceptos)
    .map((item, idx) => normalizarItemConcepto(item, idx))
    .filter(itemConceptoTieneContenido);
  if (desdeConceptos.length) return desdeConceptos;

  const analisis = listaDesdeCampoConceptos(liquidador.checklist?.itemsAnalisis);
  return analisis
    .map((item, idx) =>
      normalizarItemConcepto(
        {
          id: item.id,
          concepto: item.descripcion,
          detalle: item.observacion || item.descripcion,
          valor: item.ajustado || item.reclamado,
        },
        idx
      )
    )
    .filter(itemConceptoTieneContenido);
}

export function calcularLiquidacion(liquidador) {
  const conceptos = listaDesdeCampoConceptos(liquidador.conceptos)
    .map((item, idx) => normalizarItemConcepto(item, idx))
    .filter(itemConceptoTieneContenido);
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

  const valorSMDLVAuto = valorSmdlvDesdeSmmlv(valorSMMLV);
  const valorSMDLV = parsearNumero(
    liquidador.deducible?.valorSMDLV != null && liquidador.deducible?.valorSMDLV !== ''
      ? liquidador.deducible.valorSMDLV
      : valorSMDLVAuto
  );
  const cantidadSMDLV = numDeducible(liquidador.deducible?.cantidadSMDLV, 10);
  const deducibleSMDLV = valorSMDLV * cantidadSMDLV;

  const tipoMinimo =
    liquidador.deducible?.tipoMinimo === 'SMDLV' ? 'SMDLV' : 'SMMLV';
  const deducibleMinimo = tipoMinimo === 'SMDLV' ? deducibleSMDLV : deducibleSMMLV;
  const deducibleAplicado = Math.max(deduciblePorcentaje, deducibleMinimo);
  const totalIndemnizar = totalPerdida - deducibleAplicado;
  const usaMinimo = deducibleMinimo > deduciblePorcentaje;

  return {
    totalPerdida,
    deduciblePorcentaje,
    deducibleSMMLV,
    deducibleSMDLV,
    deducibleAplicado,
    totalIndemnizar,
    usaSMMLV: tipoMinimo === 'SMMLV' && usaMinimo,
    usaSMDLV: tipoMinimo === 'SMDLV' && usaMinimo,
    usaMinimo,
    tipoMinimo,
    porcentaje,
    cantidadSMMLV,
    cantidadSMDLV,
    valorSMMLV,
    valorSMDLV,
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

/** Nombre del usuario logueado (misma fuente que ELABORADO POR en FORMATO_LIQUIDACION). */
export function nombreUsuarioPlataforma() {
  if (typeof localStorage === 'undefined') return '';
  return (
    localStorage.getItem('nombre') ||
    localStorage.getItem('login') ||
    ''
  ).trim();
}

function pareceCodigoOCedula(valor) {
  return /^\d{5,}$/.test(String(valor || '').trim());
}

/**
 * Nombre a mostrar como «Ajustador» en check-list / documentos.
 * Es quien diligencia o imprime (usuario de sesión), no el responsable asignado al caso.
 */
export function nombreAjustadorParaDocumento(ajustadorChecklist = '') {
  const plataforma = nombreUsuarioPlataforma();
  if (plataforma) return plataforma;
  const guardado = String(ajustadorChecklist || '').trim();
  if (guardado && !pareceCodigoOCedula(guardado)) return guardado;
  return guardado;
}

/**
 * Nombre del ajustador para checklist: usuario que diligencia/imprime.
 * Los argumentos adicionales se aceptan por compatibilidad de llamadas existentes,
 * pero no se usan (antes resolvían al asignado del caso).
 */
export function resolverNombreAjustadorChecklist(ajustador) {
  return nombreAjustadorParaDocumento(ajustador || '');
}

export function liquidadorConNombreAjustador(liquidador, obtenerNombreResponsable, codigoResponsable = '') {
  if (!liquidador) return liquidador;
  const nombre = resolverNombreAjustadorChecklist(
    liquidador.checklist?.ajustador,
    obtenerNombreResponsable,
    codigoResponsable
  );
  return {
    ...liquidador,
    checklist: {
      ...(liquidador.checklist || {}),
      ajustador: nombre,
    },
  };
}

export function mapCasoExpressALiquidador(caso = {}, opciones = {}) {
  const { obtenerNombreResponsable } = opciones;
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
      valorSMDLV: valorSmdlvDesdeSmmlv(smmlv.valor),
    },
    checklist: {
      ...DEFAULT_LIQUIDADOR_EXPRESS.checklist,
      fecha: hoy,
      riesgoAsegurado: caso.aseguradoBeneficiario || '',
      coberturaAfectada: caso.amparo || '',
      descripcionEvento: caso.observacionesSeguimiento || '',
      ajustador: resolverNombreAjustadorChecklist('', obtenerNombreResponsable, ''),
      salvamento: caso.salvamentoAplica === 'aplica' ? 'Aplica' : 'No Aplica',
      salvamentoDetalle: caso.valorSalvamento ? String(caso.valorSalvamento) : '',
      fechaFormalizacion: caso.fechaUltimoDocumento
        ? String(caso.fechaUltimoDocumento).slice(0, 10)
        : '',
      reclamoFormalizado: caso.fechaUltimoDocumento ? 'Sí' : 'No',
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
        if (!dedMerged.tipoMinimo) dedMerged.tipoMinimo = 'SMMLV';
        if (dedMerged.valorSMDLV == null || dedMerged.valorSMDLV === '') {
          dedMerged.valorSMDLV = valorSmdlvDesdeSmmlv(
            dedMerged.valorSMMLV || resolverSmmlvPorAnio(dedMerged.anioSMMLV).valor
          );
        }
        if (dedMerged.cantidadSMDLV == null || dedMerged.cantidadSMDLV === '') {
          dedMerged.cantidadSMDLV = DEFAULT_LIQUIDADOR_EXPRESS.deducible.cantidadSMDLV;
        }
        return dedMerged;
      })(),
      checklist: {
        ...DEFAULT_LIQUIDADOR_EXPRESS.checklist,
        ...base.checklist,
        ...(liq.checklist || {}),
        documentos: normalizarListaEstadosDocumentos(
          Array.isArray(liq.checklist?.documentos)
            ? liq.checklist.documentos
            : base.checklist.documentos
        ),
        itemsAnalisis: Array.isArray(liq.checklist?.itemsAnalisis)
          ? liq.checklist.itemsAnalisis
          : base.checklist.itemsAnalisis,
        // Quien diligencia/imprime ahora; no el responsable histórico del caso ni un nombre guardado previo.
        ajustador: resolverNombreAjustadorChecklist('', obtenerNombreResponsable, ''),

        // Formalización = fecha de último documento del caso (campo del formulario Express)
        fechaFormalizacion: caso.fechaUltimoDocumento
          ? String(caso.fechaUltimoDocumento).slice(0, 10)
          : liq.checklist?.fechaFormalizacion || base.checklist.fechaFormalizacion || '',
        reclamoFormalizado: caso.fechaUltimoDocumento
          ? 'Sí'
          : liq.checklist?.reclamoFormalizado || base.checklist.reclamoFormalizado || 'No',
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
  return conceptos.map((c, idx) => {
    const concepto = String(c.concepto ?? '').trim();
    const detalle = String(c.detalle ?? '').trim();
    // En liquidación, el texto largo suele ir en Detalle; Concepto a veces es solo el ítem (1, 2…).
    const conceptoEsSoloIndice = /^\d+([.-]\d+)*$/.test(concepto);
    const descripcion = conceptoEsSoloIndice
      ? detalle || concepto
      : concepto || detalle || '';

    const observacionExplicit = String(c.observacion ?? '').trim();
    // Si Concepto y Detalle son textos distintos, el detalle puede ir como observación.
    const observacion =
      observacionExplicit ||
      (!conceptoEsSoloIndice && concepto && detalle && detalle !== concepto ? detalle : '');

    return {
      id: c.id || `${Date.now()}-${idx}`,
      descripcion,
      reclamado: c.valor || '',
      ajustado: c.valor || '',
      observacion: observacion === descripcion ? '' : observacion,
    };
  });
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

/** Partes del monto ($88.636. + 936 + ) tal como vienen en la plantilla CONTRATO_REEMBOLSO.docx */
export function formatearMontoContratoPartes(valor) {
  const montoFmt = formatearMonto(valor);
  const lastDot = montoFmt.lastIndexOf('.');
  if (lastDot < 0) {
    return {
      prefijo: `($${montoFmt}.`,
      sufijo: '00',
      cierre: ')',
    };
  }
  return {
    prefijo: `($${montoFmt.slice(0, lastDot + 1)}`,
    sufijo: montoFmt.slice(lastDot + 1),
    cierre: ')',
  };
}

/**
 * Descripción del siniestro para ANTECEDENTE - PRIMERO del contrato de reembolso.
 */
export function buildContratoReembolsoDescripcion(liquidador = {}) {
  const chk = liquidador.checklist || {};
  const propia = (chk.descripcionEvento || '').trim();
  if (propia) return propia;

  const enc = liquidador.encabezado || {};
  const { texto } = textoDescripcionSiniestroRecibo(liquidador);
  if (enc.fechaSiniestro) {
    const fecha = formatearFechaSiniestroLarga(enc.fechaSiniestro);
    return `El día ${fecha} ${texto.charAt(0).toLowerCase()}${texto.slice(1)}`;
  }
  return texto;
}

/**
 * Valores en orden de aparición de los marcadores amarillos en CONTRATO_REEMBOLSO.docx.
 * Comentarios plantilla:
 * - PRIMERA estipulación (1.er bloque amarillo): valor total del reclamo (totalPerdida)
 * - xxx: deducible aplicado
 * - SEGUNDA estipulación (2.º bloque amarillo): valor a indemnizar (totalIndemnizar)
 */
export function buildContratoReembolsoReplacements(liquidador, totales) {
  const enc = liquidador.encabezado || {};
  const totalReclamo = totales?.totalPerdida ?? 0;
  const montoIndemnizar = totales?.totalIndemnizar ?? 0;
  const deducible = totales?.deducibleAplicado ?? 0;

  const letrasReclamo = `${montoALetras(totalReclamo)} PESOS `;
  const letrasIndemnizar = `${montoALetras(montoIndemnizar)} PESOS `;
  const partesReclamo = formatearMontoContratoPartes(totalReclamo);
  const partesIndemnizar = formatearMontoContratoPartes(montoIndemnizar);
  const deducibleTxt =
    deducible > 0 ? `$${formatearMonto(deducible)}` : formatearMonto(deducible);

  const bloqueReclamo = [
    letrasReclamo,
    'M/CtE ',
    partesReclamo.prefijo,
    partesReclamo.sufijo,
    partesReclamo.cierre,
  ];
  const bloqueIndemnizar = [
    letrasIndemnizar,
    'M/CtE ',
    partesIndemnizar.prefijo,
    partesIndemnizar.sufijo,
    partesIndemnizar.cierre,
  ];

  return [
    enc.reclamo || '',
    enc.zc || '',
    enc.asegurado || '',
    enc.asegurado || '',
    '', // «encontraban» en plantilla: queda cubierto por la descripción del siniestro
    ...bloqueReclamo,
    deducibleTxt,
    ...bloqueIndemnizar,
  ];
}

/** Vista previa del contrato de reembolso (datos clave del Word). */
export function buildContratoReembolsoPreview(liquidador, totales) {
  const enc = liquidador.encabezado || {};
  const totalReclamo = redondearPesos(totales?.totalPerdida ?? 0);
  const montoIndemnizar = redondearPesos(totales?.totalIndemnizar ?? 0);
  const deducible = redondearPesos(totales?.deducibleAplicado ?? 0);
  return {
    titulo: 'Contrato de Reembolso',
    reclamo: enc.reclamo || '—',
    zc: enc.zc || '—',
    asegurado: enc.asegurado || '—',
    poliza: enc.poliza || '—',
    descripcion: buildContratoReembolsoDescripcion(liquidador),
    totalReclamo: formatearMonto(totalReclamo),
    totalReclamoLetras: `${montoALetras(totalReclamo)} PESOS`,
    deducible: formatearMonto(deducible),
    totalIndemnizar: formatearMonto(montoIndemnizar),
    totalIndemnizarLetras: `${montoALetras(montoIndemnizar)} PESOS`,
  };
}

/** Vista previa del contrato de transacción (datos clave del Word). */
export function buildContratoTransaccionPreview(liquidador, totales) {
  const enc = liquidador.encabezado || {};
  const chk = liquidador.checklist || {};
  const montoIndemnizar = redondearPesos(totales?.totalIndemnizar ?? 0);
  const deducible = redondearPesos(totales?.deducibleAplicado ?? 0);
  return {
    titulo: 'Contrato de Transacción',
    poliza: enc.poliza || '—',
    siniestro: enc.reclamo || '—',
    tomador: nombreTomadorContratoTransaccion(liquidador) || '—',
    reclamante: nombreReclamanteContratoTransaccion(liquidador),
    nit: enc.nit || '—',
    vigenciaDesde: chk.vigenciaDesde || '—',
    vigenciaHasta: chk.vigenciaHasta || '—',
    fechaSiniestro: formatearFechaSiniestroLarga(enc.fechaSiniestro) || '—',
    descripcion: buildContratoTransaccionDescripcionSegundo(liquidador) || '—',
    oficina: oficinaAfectadaContratoTransaccion(liquidador),
    totalIndemnizar: formatearMonto(montoIndemnizar),
    totalIndemnizarLetras: `${montoALetras(montoIndemnizar)} PESOS MONEDA CORRIENTE`,
    deducible: formatearMonto(deducible),
    deducibleLetras: `${montoALetras(deducible)} PESOS MONEDA CORRIENTE`,
  };
}

/** Tomador de la póliza en contrato de transacción (RC). */
export function nombreTomadorContratoTransaccion(liquidador = {}) {
  const chk = liquidador.checklist || {};
  const enc = liquidador.encabezado || {};
  return (chk.riesgoAsegurado || enc.asegurado || '').trim();
}

function splitIsoAFechaPartes(iso) {
  if (!iso) return null;
  const base = String(iso).slice(0, 10);
  const [yyyy, mm, dd] = base.split('-');
  if (!yyyy || !mm || !dd) return null;
  return {
    dd: String(Number(dd)),
    mm: mm.padStart(2, '0'),
    yyyy,
  };
}

/** Partes amarillas de vigencia «desde» (7 runs) en CONTRATO_TRANSACCION.docx */
export function splitVigenciaDesdeAmarilloTransaccion(iso) {
  const p = splitIsoAFechaPartes(iso);
  if (!p) return ['', '', '', '', '', '', ''];
  return [p.dd, '/', p.mm[0], p.mm[1], `/${p.yyyy.slice(0, 2)}`, p.yyyy[2], p.yyyy[3]];
}

/** Partes amarillas de vigencia «hasta» (5 runs) en CONTRATO_TRANSACCION.docx */
export function splitVigenciaHastaAmarilloTransaccion(iso) {
  const p = splitIsoAFechaPartes(iso);
  if (!p) return ['', '', '', '', ''];
  if (p.yyyy.startsWith('202')) {
    return [p.dd, '/', p.mm, '/202', p.yyyy[3]];
  }
  return [p.dd, '/', p.mm, `/${p.yyyy.slice(0, 3)}`, p.yyyy[3]];
}

/** Partes amarillas de «Que el día … de … de 2.0xx» (6 runs). */
export function splitFechaSiniestroSegundoTransaccion(iso) {
  const p = splitIsoAFechaPartes(iso);
  if (!p) return ['', ' de ', '', ' de 2.0', '', ''];
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  const mes = Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('es-CO', { month: 'long' });
  return [p.dd, ' de ', mes, ' de 2.0', p.yyyy[2], p.yyyy[3]];
}

export function bloqueMontoTransaccionAmarillo(valor, numRuns) {
  const monto = redondearPesos(valor);
  const letras = montoALetras(monto);
  const partes = formatearMontoContratoPartes(monto);
  const texto = `${letras} PESOS MONEDA CORRIENTE ${partes.prefijo}${partes.sufijo}${partes.cierre}`;
  const out = new Array(numRuns).fill('');
  out[0] = texto;
  return out;
}

/** Cuerpo del SEGUNDO considerando (sin prefijo «Que el día …»). */
export function buildContratoTransaccionDescripcionSegundo(liquidador = {}) {
  const chk = liquidador.checklist || {};
  const propia = (chk.descripcionEvento || '').trim();
  if (propia) {
    const match = propia.match(/^que el día\s.+?,\s*(.+)$/i);
    return match ? match[1].trim() : propia;
  }
  const texto = buildContratoReembolsoDescripcion(liquidador);
  return texto
    .replace(/^El día\s.+?,\s*/i, '')
    .replace(/^Que el día\s.+?,\s*/i, '')
    .trim();
}

export function oficinaAfectadaContratoTransaccion(liquidador = {}) {
  const enc = liquidador.encabezado || {};
  const detalle = (liquidador.conceptos || [])
    .map((c) => (c.detalle || c.concepto || '').trim())
    .find(Boolean);
  return detalle || enc.cobertura || '—';
}

/**
 * Valores en orden de los 72 marcadores amarillos en CONTRATO_TRANSACCION.docx.
 */
export function buildContratoTransaccionReplacements(liquidador, totales) {
  const enc = liquidador.encabezado || {};
  const chk = liquidador.checklist || {};
  const poliza = enc.poliza || '';
  const siniestro = enc.reclamo || '';
  const tomador = nombreTomadorContratoTransaccion(liquidador);
  const tomadorSinPunto = tomador.replace(/\.\s*$/, '');

  const vigDesde = splitVigenciaDesdeAmarilloTransaccion(chk.vigenciaDesde);
  const vigHasta = splitVigenciaHastaAmarilloTransaccion(chk.vigenciaHasta);
  const fechaSiniestro = splitFechaSiniestroSegundoTransaccion(enc.fechaSiniestro);
  const descSegundo = buildContratoTransaccionDescripcionSegundo(liquidador);

  const bloqueIndemnizar = bloqueMontoTransaccionAmarillo(totales?.totalIndemnizar ?? 0, 21);
  const bloqueDeducible = bloqueMontoTransaccionAmarillo(totales?.deducibleAplicado ?? 0, 11);

  const cierresTomador = [tomadorSinPunto, '.', tomadorSinPunto, '.', tomadorSinPunto, '.'];

  return [
    poliza,
    siniestro,
    tomador,
    tomadorSinPunto,
    '.',
    poliza,
    tomadorSinPunto,
    '.',
    ...vigDesde,
    ...vigHasta,
    poliza,
    'Que el día ',
    ...fechaSiniestro,
    ', ',
    descSegundo,
    poliza,
    tomadorSinPunto,
    '.',
    poliza,
    ...bloqueIndemnizar,
    ...bloqueDeducible,
    ...cierresTomador,
  ];
}

/** Nombre del reclamante: no usar el de ejemplo «Diego». Línea en blanco para completar. */
export function nombreReclamanteContratoTransaccion(liquidador = {}) {
  const enc = liquidador.encabezado || {};
  const chk = liquidador.checklist || {};
  const asegurado = (enc.asegurado || '').trim();
  const tomador = nombreTomadorContratoTransaccion(liquidador);
  const riesgo = (chk.riesgoAsegurado || '').trim();

  // Solo si el asegurado es claramente distinto del tomador (p. ej. tercero reclamante)
  if (
    asegurado &&
    asegurado.toUpperCase() !== tomador.toUpperCase() &&
    asegurado.toUpperCase() !== riesgo.toUpperCase() &&
    !/DIEGO\s+FERNEY/i.test(asegurado)
  ) {
    return asegurado;
  }
  return '____________________________';
}

export function buildContratoTransaccionTextReplacements(liquidador = {}) {
  const enc = liquidador.encabezado || {};
  const reclamante = nombreReclamanteContratoTransaccion(liquidador);
  const nit = (enc.nit || '').trim();
  const oficina = oficinaAfectadaContratoTransaccion(liquidador);
  const tomador = nombreTomadorContratoTransaccion(liquidador);
  const tomadorSinPunto = tomador.replace(/\.\s*$/, '');
  const tomadorTxt = tomadorSinPunto || '________';
  const docTxt = nit || '________________';
  const oficinaTxt = oficina && oficina !== '—' ? oficina : '________';

  return [
    // Nombre partido en plantilla: «D» + «IEGO FERNEY ROJAS» / firma «Diego Ferney Rojas»
    ['DIEGO FERNEY ROJAS', reclamante],
    ['Diego Ferney Rojas', reclamante],
    // Documento (partido: «XXX de » + «Xxx»)
    ['XXX de Xxx', docTxt],
    ['XXX de XXX', docTxt],
    // ACUERDO / PRIMERO-OBJETO: «que ampara a …» viene sin resaltado amarillo en la plantilla
    ['TORRE 26 CENTRO EMPRESARIAL P.H.', tomador || tomadorTxt],
    ['TORRE 26 CENTRO EMPRESARIAL P.H', tomadorTxt],
    // Oficina afectada
    ['oficina XXX', `oficina ${oficinaTxt}`],
    ['oficina xx', `oficina ${oficinaTxt}`],
  ];
}

/**
 * Detalle del liquidador para el recibo: va justo después del monto (tras la coma).
 * Prioriza la descripción del evento del checklist; si no hay, usa conceptos; luego texto genérico.
 */
export function textoDetalleLiquidadorRecibo(liquidador = {}) {
  const chk = liquidador.checklist || {};
  const propia = (chk.descripcionEvento || '').trim();
  if (propia) return { texto: propia, esGenerico: false };

  const lineas = (liquidador.conceptos || [])
    .map((c) => {
      const concepto = (c.concepto || '').trim();
      const detalle = (c.detalle || '').trim();
      if (concepto && detalle) return `${concepto}: ${detalle}`;
      return concepto || detalle;
    })
    .filter(Boolean);
  if (lineas.length) return { texto: lineas.join('; '), esGenerico: false };

  return textoDescripcionSiniestroRecibo(liquidador);
}

export function buildReciboPreview(liquidador, totales) {
  const h = liquidador.encabezado || {};
  const monto = redondearPesos(totales.totalIndemnizar);
  const letras = montoALetras(monto);
  const fechaSiniestro =
    formatearFechaSiniestroLarga(h.fechaSiniestro) || '—';
  const { texto: detalle } = textoDetalleLiquidadorRecibo(liquidador);

  return {
    titulo: 'Recibo de Indemnización',
    reclamo: h.reclamo || '—',
    asegurado: h.asegurado || '—',
    nit: h.nit || '—',
    poliza: h.poliza || '—',
    fecha: fechaSiniestro,
    valor: formatearMonto(monto),
    valorLetras: `${letras} PESOS MONEDA CORRIENTE`,
    detalle,
    anio: String(new Date().getFullYear()),
    parrafoPrincipal: `Declaramos que hemos recibido de Zúrich Colombia Seguros S.A. la suma de ${letras} PESOS MONEDA CORRIENTE ($${formatearMonto(monto)}), ${detalle}.`,
  };
}

export function normalizarEstadoDocumento(valor) {
  if (valor === true || valor === 'Aplica') return 'Aplica';
  if (valor === 'No Aplica') return 'No Aplica';
  return '';
}

/** Alinea la lista al catálogo de documentos y convierte booleanos viejos (true → Aplica). */
export function normalizarListaEstadosDocumentos(documentos = []) {
  return DOCUMENTOS_SOPORTE.map((_, idx) => normalizarEstadoDocumento(documentos[idx]));
}

export function documentoChecklistFinalizado(valor) {
  const estado = normalizarEstadoDocumento(valor);
  return estado === 'Aplica' || estado === 'No Aplica';
}

export function etiquetaEstadoDocumento(valor) {
  const estado = normalizarEstadoDocumento(valor);
  if (estado === 'Aplica') return '✓ Aplica';
  if (estado === 'No Aplica') return 'No Aplica';
  return '';
}

export function pctDocumentosMarcados(documentos = []) {
  const lista = normalizarListaEstadosDocumentos(documentos);
  if (!lista.length) return 0;
  const marcados = lista.filter(documentoChecklistFinalizado).length;
  return Math.round((marcados / lista.length) * 100);
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
