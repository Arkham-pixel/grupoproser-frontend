/** Utilidades del liquidador Equidad FDM (ModeloLiquidación + Constancia Word) */
import { formatDate, formatNumber, getAppLocale } from '../../utils/locale.js';

export const SMMLV_POR_ANIO = {
  2020: 877803,
  2021: 908526,
  2022: 1000000,
  2023: 1160000,
  2024: 1300000,
  2025: 1423500,
  2026: 1750905,
};

export const SMMLV_DEFAULT = SMMLV_POR_ANIO[2026];

export const DEFAULT_LIQUIDADOR_FDM = {
  encabezado: {
    tomador: 'FUNDACION DE LA MUJER',
    asegurado: '',
    poliza: '',
    orden: '',
    siniestro: '',
    caso: '',
    cedula: '',
    fechaSiniestro: '',
    direccion: '',
    evento: 'ANEGACION',
    ramo: 'microseguros daños basico empresa',
    agencia: 'Bucaramanga',
    ciudadFirma: '',
    fechaImpreso: '',
  },
  contenidos: [],
  edificios: [],
  tipoInmuebleContenidos: '',
  deducible: {
    anioSMMLV: 2026,
    valorSMMLV: SMMLV_DEFAULT,
    cantidadSMMLV: 0.75,
    porcentaje: 10,
  },
  subsidio: 0,
};

export function parsearNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return 0;
  if (typeof valor === 'number') return Number.isNaN(valor) ? 0 : valor;
  let numero = String(valor).replace(/[^\d.,-]/g, '');
  if (numero.includes(',') && numero.includes('.')) {
    numero = numero.replace(/\./g, '').replace(',', '.');
  } else if (numero.includes('.') && !numero.includes(',')) {
    // Si parece decimal (1.5) o miles (1.750.905)
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

export function formatearMonto(valor, { decimals = 2 } = {}) {
  const n = typeof valor === 'number' ? valor : parsearNumero(valor);
  if (Number.isNaN(n)) return '0';
  return formatNumber(n, getAppLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatearMontoConstancia(valor) {
  const n = typeof valor === 'number' ? valor : parsearNumero(valor);
  return formatNumber(Number.isNaN(n) ? 0 : n, getAppLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const UNIDADES = [
  '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE',
  'DIECIOCHO', 'DIECINUEVE',
];
const DECENAS = [
  '', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA',
];
const CENTENAS = [
  '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS',
];

/** Estilo macro ConverxNum del Excel: sin "Y", 21-29 = "Veinte Uno". */
function seccionMenor100(n) {
  if (n === 0) return '';
  if (n < 20) return UNIDADES[n];
  if (n === 20) return 'VEINTE';
  if (n < 30) return `VEINTE ${UNIDADES[n - 20]}`;
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? DECENAS[d] : `${DECENAS[d]} ${UNIDADES[u]}`;
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
    // Excel ConverxNum: "Un Millones" (no "Un Millón")
    partes.push(millones === 1 ? 'UN MILLONES' : `${convertirEnteroATexto(millones)} MILLONES`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? 'MIL' : `${seccionMenor1000(miles)} MIL`);
  }
  if (unidades > 0) partes.push(seccionMenor1000(unidades));
  return partes.join(' ').replace(/\s+/g, ' ').trim();
}

/** Estilo plantilla FDM / ConverxNum: "Un Millones ... Pesos M/Cte." */
export function montoALetrasFdm(valor) {
  const n = Math.abs(typeof valor === 'number' ? valor : parsearNumero(valor));
  const entero = Math.floor(n);
  let texto = convertirEnteroATexto(entero);
  texto = texto
    .toLowerCase()
    .split(' ')
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(' ');
  return `${texto} Pesos M/Cte.`;
}

export function numDeducible(valor, defaultVal) {
  if (valor === '' || valor === null || valor === undefined) return defaultVal;
  const n = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'));
  return Number.isNaN(n) ? defaultVal : n;
}

/**
 * Réplica exacta de las fórmulas del ModeloLiquidación (hoja Liquidador):
 *   N28  = SUM(N18:Q27)           → subtotal contenidos
 *   AE28 = SUM(AE18:AH27)         → subtotal edificios
 *   AE30 = N28+AE28               → pérdida establecida
 *   H34  = XLOOKUP(año)           → valor SMMLV
 *   H35  = H34*F35                → deducible SMMLV
 *   H36  = AE30*F36               → deducible % (referencia)
 *   AE31 = MAX(F35*H34, AE30*0.1) → deducible aplicado (Excel usa 0.1 fijo)
 *   AE32 = IF(AE30-AE31<0,0,AE30-AE31)
 *   AE33 = H33                    → subsidio
 *   AE34 = AE32+AE33              → indemnización
 */
export function calcularLiquidacionFdm(liquidador = {}) {
  const contenidos = liquidador.contenidos || [];
  const edificios = liquidador.edificios || [];

  // N28 / AE28 / AE30
  const subtotalContenidos = contenidos.reduce((s, i) => s + parsearNumero(i.valor), 0);
  const subtotalEdificios = edificios.reduce((s, i) => s + parsearNumero(i.valor), 0);
  const totalPerdida = subtotalContenidos + subtotalEdificios;

  const cantidadSMMLV = numDeducible(liquidador.deducible?.cantidadSMMLV, 0.75); // F35
  const anioSMMLV = Number(liquidador.deducible?.anioSMMLV) || new Date().getFullYear();
  const valorSMMLV = parsearNumero(
    liquidador.deducible?.valorSMMLV ?? SMMLV_POR_ANIO[anioSMMLV] ?? SMMLV_DEFAULT
  ); // H34
  const porcentajeUi = numDeducible(liquidador.deducible?.porcentaje, 10); // F36 * 100
  const tasaPctExcel = 0.1; // AE31 usa AE30*0.1 (fijo en el Excel original)

  // H35 = H34*F35
  const deducibleSMMLV = valorSMMLV * cantidadSMMLV;
  // Rama % de AE31 (siempre 10% como en Excel)
  const deduciblePorcentajeExcel = totalPerdida * tasaPctExcel;
  // H36 = AE30*F36 (lo que muestra el campo % editable)
  const deduciblePorcentaje = totalPerdida * (porcentajeUi / 100);
  // AE31 = MAX(F35*H34, AE30*0.1)
  const deducibleAplicado = Math.max(deducibleSMMLV, deduciblePorcentajeExcel);
  const usaSMMLV = deducibleSMMLV >= deduciblePorcentajeExcel;

  const subsidio = parsearNumero(liquidador.subsidio); // H33
  // AE32
  const totalAntesSubsidio = totalPerdida - deducibleAplicado < 0 ? 0 : totalPerdida - deducibleAplicado;
  // AE34
  const totalIndemnizar = totalAntesSubsidio + subsidio;

  return {
    subtotalContenidos,
    subtotalEdificios,
    totalPerdida,
    deduciblePorcentaje,
    deduciblePorcentajeExcel,
    deducibleSMMLV,
    deducibleAplicado,
    usaSMMLV,
    porcentaje: porcentajeUi,
    cantidadSMMLV,
    valorSMMLV,
    anioSMMLV,
    subsidio,
    totalAntesSubsidio,
    totalIndemnizar,
  };
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

const hoyInput = () => fechaInput(new Date());

function crearItem(item = '', valor = '', id) {
  return {
    id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    item: item || '',
    valor: valor === null || valor === undefined || valor === '' ? '' : String(valor),
    catalogoId: '',
  };
}

export function mapCasoFdmALiquidador(caso = {}) {
  const anio = new Date().getFullYear();
  const base = {
    ...DEFAULT_LIQUIDADOR_FDM,
    encabezado: {
      ...DEFAULT_LIQUIDADOR_FDM.encabezado,
      tomador: caso.tomadorLiquidador || 'FUNDACION DE LA MUJER',
      asegurado: caso.nombre || '',
      poliza: caso.polizaAfectar || '',
      orden: caso.orden || '',
      siniestro: caso.siniestro || '',
      caso: caso.caso || '',
      cedula: caso.cedula || '',
      fechaSiniestro: fechaInput(caso.fechaAviso) || fechaInput(caso.fechaLiquidacion) || '',
      direccion: caso.direccionAfectada || '',
      evento: caso.cobertura || caso.evento || 'ANEGACION',
      ramo: 'microseguros daños basico empresa',
      agencia: caso.oficinaRadicadora || 'Bucaramanga',
      ciudadFirma: caso.municipio || '',
      fechaImpreso: hoyInput(),
    },
    deducible: {
      ...DEFAULT_LIQUIDADOR_FDM.deducible,
      anioSMMLV: anio,
      valorSMMLV: SMMLV_POR_ANIO[anio] || SMMLV_DEFAULT,
    },
    subsidio: caso.subsidio ?? 0,
    contenidos: [],
    edificios: [],
  };

  if (caso.perdidaContenidos) {
    base.contenidos = [crearItem('Pérdida por contenidos (caso)', caso.perdidaContenidos)];
  }
  if (caso.perdidaEdificio) {
    base.edificios = [crearItem('Pérdida por edificio (caso)', caso.perdidaEdificio)];
  }

  if (caso.liquidador && typeof caso.liquidador === 'object') {
    return {
      ...base,
      ...caso.liquidador,
      encabezado: {
        ...base.encabezado,
        ...(caso.liquidador.encabezado || {}),
      },
      deducible: {
        ...base.deducible,
        ...(caso.liquidador.deducible || {}),
      },
      contenidos: Array.isArray(caso.liquidador.contenidos)
        ? caso.liquidador.contenidos
        : base.contenidos,
      edificios: Array.isArray(caso.liquidador.edificios)
        ? caso.liquidador.edificios
        : base.edificios,
      subsidio: caso.liquidador.subsidio ?? base.subsidio,
    };
  }

  return base;
}

function parseFechaLocal(value) {
  if (!value) return null;
  let d;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, day] = value.slice(0, 10).split('-').map(Number);
    d = new Date(y, m - 1, day, 12, 0, 0);
  } else {
    d = new Date(value);
  }
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Fecha larga en español: "lunes, 2 de febrero de 2026" */
export function fechaLargaEs(value) {
  const d = parseFechaLocal(value);
  if (!d) return value ? String(value) : '—';
  return formatDate(d, getAppLocale(), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Fecha de carta: "10 de Agosto de 2026" */
export function fechaCartaEs(value) {
  const d = parseFechaLocal(value);
  if (!d) return value ? String(value) : '—';
  const s = formatDate(d, getAppLocale(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return s.replace(/ de ([a-záéíóúüñ]+) de /i, (_, month) => {
    const cap = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
    return ` de ${cap} de `;
  });
}

export function causaEventoCarta(evento) {
  const ev = String(evento || '').toUpperCase();
  if (/TERREMOTO|TEMBLOR|SISMO/.test(ev)) return 'del terremoto';
  if (/OLA INVERNAL|ANEG|INUND/.test(ev)) return 'de la ola invernal';
  const nombre = String(evento || '').trim();
  return nombre ? `del evento ${nombre}` : 'del evento amparado';
}

export function letrasCartaCobertura(letras) {
  return String(letras || '')
    .replace(/\s*Pesos M\/Cte\.?/i, '')
    .trim();
}

export function buildConstanciaPreview(liquidador, totales) {
  const h = liquidador.encabezado || {};
  const tasaTxt = totales.usaSMMLV
    ? `${String(totales.cantidadSMMLV).replace('.', ',')} SMMLV`
    : '10%';

  return {
    tomador: h.tomador || 'FUNDACION DE LA MUJER',
    asegurado: h.asegurado || '—',
    ramo: h.ramo || '—',
    poliza: h.poliza || '—',
    orden: h.orden || '—',
    siniestro: h.siniestro || '0',
    agencia: h.agencia || 'Bucaramanga',
    cedula: h.cedula || '—',
    evento: h.evento || 'ANEGACION',
    direccion: h.direccion || '—',
    fechaSiniestroLarga: fechaLargaEs(h.fechaSiniestro),
    fechaImpresoLarga: fechaLargaEs(h.fechaImpreso || hoyInput()),
    ciudadFirma: h.ciudadFirma || 'XXX',
    totalPerdida: formatearMontoConstancia(totales.totalPerdida),
    deducible: formatearMontoConstancia(totales.deducibleAplicado),
    tasaTxt,
    subsidio: formatearMontoConstancia(totales.subsidio),
    indemnizacion: formatearMontoConstancia(totales.totalIndemnizar),
    indemnizacionLetras: montoALetrasFdm(totales.totalIndemnizar),
  };
}

export function buildCartaCoberturaPreview(liquidador, totales) {
  const c = buildConstanciaPreview(liquidador, totales);
  const h = liquidador.encabezado || {};
  return {
    ...c,
    ciudadCarta: 'Bogotá',
    fechaCarta: fechaCartaEs(h.fechaImpreso || hoyInput()),
    fechaEventoCarta: fechaCartaEs(h.fechaSiniestro || h.fechaImpreso || hoyInput()),
    causaEvento: causaEventoCarta(c.evento),
    indemnizacionLetrasCarta: letrasCartaCobertura(c.indemnizacionLetras),
  };
}

function limpiarTexto(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/\s+/g, ' ').trim();
}

function excelDateToInput(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return fechaInput(value);
  if (typeof value === 'number') {
    const utc = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(utc.getTime() + value * 86400000);
    return fechaInput(date);
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return fechaInput(d);
  }
  return fechaInput(value);
}

export function construirLiquidadorDesdeCxW(fila = {}, items = { contenidos: [], edificios: [] }) {
  const anio = new Date().getFullYear();
  const tasa = parsearNumero(fila.TASA ?? fila.tasa ?? 0.75);
  const liquidador = {
    ...DEFAULT_LIQUIDADOR_FDM,
    encabezado: {
      ...DEFAULT_LIQUIDADOR_FDM.encabezado,
      tomador: limpiarTexto(fila.TOMADOR || fila.tomador) || 'FUNDACION DE LA MUJER',
      asegurado: limpiarTexto(fila.ASEGURADO || fila.asegurado),
      poliza: limpiarTexto(fila.POLIZA || fila.poliza),
      orden: limpiarTexto(fila.ORDEN || fila.orden),
      siniestro: limpiarTexto(fila.SINIESTRO || fila.siniestro),
      cedula: limpiarTexto(fila.CEDULA || fila.cedula).replace(/,/g, ''),
      fechaSiniestro: excelDateToInput(fila.FECHA || fila.fecha),
      direccion: limpiarTexto(fila.DIRECCIÓN || fila.DIRECCION || fila.direccion),
      evento: limpiarTexto(fila.EVENTO || fila.evento) || 'ANEGACION',
      ramo: limpiarTexto(fila.RAMO || fila.ramo) || DEFAULT_LIQUIDADOR_FDM.encabezado.ramo,
      agencia: 'Bucaramanga',
      fechaImpreso: excelDateToInput(fila.IMPRESO || fila.impreso) || hoyInput(),
      ciudadFirma: '',
    },
    contenidos: items.contenidos?.length ? items.contenidos : [],
    edificios: items.edificios?.length ? items.edificios : [],
    deducible: {
      anioSMMLV: anio,
      valorSMMLV: SMMLV_POR_ANIO[anio] || SMMLV_DEFAULT,
      cantidadSMMLV: tasa || 0.75,
      porcentaje: 10,
    },
    subsidio: Math.abs(parsearNumero(fila.SUBSIDIO ?? fila.subsidio)),
  };

  // Si no hay ítems, crear uno con el valor liquidado total
  if (!liquidador.contenidos.length && !liquidador.edificios.length) {
    const total = parsearNumero(fila['VALOR LIQUIDADO'] ?? fila.valorLiquidado);
    if (total > 0) {
      liquidador.contenidos = [crearItem('Pérdida importada desde Excel', total)];
    }
  }

  return liquidador;
}

export { crearItem, limpiarTexto, excelDateToInput, hoyInput, fechaInput };
