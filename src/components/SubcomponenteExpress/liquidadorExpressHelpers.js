/** Utilidades del liquidador Express (equivalente FORMATO_LIQUIDACION + export Word) */

export const SMMLV_DEFAULT_2026 = 1750905;

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
    valorSMMLV: SMMLV_DEFAULT_2026,
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

  const valorSMMLV = parsearNumero(liquidador.deducible?.valorSMMLV ?? SMMLV_DEFAULT_2026);
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

export function mapCasoExpressALiquidador(caso = {}) {
  const hoy = new Date().toISOString().slice(0, 10);
  return {
    ...DEFAULT_LIQUIDADOR_EXPRESS,
    encabezado: {
      ...DEFAULT_LIQUIDADOR_EXPRESS.encabezado,
      reclamo: caso.numeroSiniestro || '',
      zc: caso.codigoWorkflow || caso.consecutivo || '',
      asegurado: caso.aseguradoBeneficiario || '',
      nit: caso.nit || '',
      poliza: caso.numeroPoliza || '',
      fechaSiniestro: caso.fechaSiniestro || '',
      cobertura: caso.amparo || '',
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

export function buildReciboPreview(liquidador, totales) {
  const h = liquidador.encabezado || {};
  const monto = totales.totalIndemnizar;
  const letras = montoALetras(monto);
  const hoy = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    titulo: 'Recibo de Indemnización',
    reclamo: h.reclamo || '—',
    asegurado: h.asegurado || '—',
    nit: h.nit || '—',
    poliza: h.poliza || '—',
    fecha: hoy,
    valor: formatearMonto(monto),
    valorLetras: letras,
    anio: String(new Date().getFullYear()),
    parrafoPrincipal: `Declaramos que hemos recibido de Zúrich Colombia Seguros S.A. la suma de ${letras} MCE ($${formatearMonto(monto)}), como indemnización única, total y definitiva con ocasión de [descripción del siniestro — editar manualmente].`,
  };
}

export function pctDocumentosMarcados(documentos = []) {
  if (!documentos.length) return 0;
  const marcados = documentos.filter(Boolean).length;
  return Math.round((marcados / documentos.length) * 100);
}
