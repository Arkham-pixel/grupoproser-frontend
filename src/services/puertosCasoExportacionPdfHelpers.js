import { getImageUrlCandidates } from '../utils/imageUtils';
import { getPuertosImagenDisplayUrl } from '../components/PuertosActas/puertosCasoImagenUtils';
import { calcularTotalMercancia } from '../components/PuertosActas/puertosCasoExportacionState';

export const PDF_FONT = {
  family: 'RobotoCondensed',
  familyBold: 'RobotoCondensedBold',
  headerTitle: 22,
  title: 14,
  body: 12,
  table: 10,
  caption: 9,
};

export const PDF_COLORS = {
  /** Verde corporativo Bolívar — título «REPORTE DE SUPERVISIÓN». */
  greenBrand: [0, 107, 43],
  /** Fondo de la franja del encabezado (sage, como el Word). */
  greenBarBg: [137, 180, 155],
  green: [0, 107, 43],
  greenBar: [137, 180, 155],
  greenDark: [0, 100, 55],
  text: [33, 33, 33],
  muted: [90, 90, 90],
  border: [180, 180, 180],
  headerBg: [240, 240, 240],
  labelBg: [245, 245, 245],
  white: [255, 255, 255],
  gold: [199, 152, 54],
};

export const PDF_MARGINS = { top: 18, left: 15, right: 15, bottom: 20 };
export const PDF_HEADER = { barH: 22, espacioContenido: 12 };
export const PDF_PAGE = { w: 210, h: 297 };
export const PDF_CONTENT_W = PDF_PAGE.w - PDF_MARGINS.left - PDF_MARGINS.right;

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const MESES_MAY = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

export function formatearFechaLarga(fecha) {
  if (!fecha) return '';
  const iso = String(fecha).includes('T') ? fecha.split('T')[0] : fecha;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(fecha);
  return `${MESES[d.getMonth()]} ${d.getDate()} de ${d.getFullYear()}`;
}

export function formatearFechaMayus(fecha) {
  if (!fecha) return '';
  const iso = String(fecha).includes('T') ? fecha.split('T')[0] : fecha;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(fecha).toUpperCase();
  return `${MESES_MAY[d.getMonth()]} ${d.getDate()} DE ${d.getFullYear()}`;
}

export function formatearFechaCorta(fecha) {
  if (!fecha) return '';
  const iso = String(fecha).includes('T') ? fecha.split('T')[0] : fecha;
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return String(fecha);
  return `${d}/${m}/${y}`;
}

export function textoPunto(punto) {
  if (!punto) return '';
  return typeof punto === 'string' ? punto : punto.texto || '';
}

export async function imagenInformeABase64(imagen) {
  if (!imagen) return null;
  const candidatos = getImageUrlCandidates(imagen);
  const display = getPuertosImagenDisplayUrl(imagen);
  const urls = [...new Set([display, ...candidatos].filter(Boolean))];

  for (const url of urls) {
    const data = await urlABase64(url);
    if (data) return data;
  }
  return null;
}

async function urlABase64(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await blobABase64(blob);
  } catch {
    return null;
  }
}

function blobABase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

export async function assetImportadoABase64(assetUrl) {
  try {
    const res = await fetch(assetUrl);
    if (!res.ok) return null;
    return blobABase64(await res.blob());
  } catch {
    return null;
  }
}

export function detectarFormatoImagen(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return 'JPEG';
  if (dataUrl.includes('image/png')) return 'PNG';
  if (dataUrl.includes('image/webp')) return 'WEBP';
  if (dataUrl.includes('image/jfif') || dataUrl.includes('image/jpeg')) return 'JPEG';
  return 'JPEG';
}

export function obtenerNombreAseguradora(formData, aseguradoraOptions = []) {
  const opt = aseguradoraOptions.find((a) => a.value === formData.codiAsgrdra);
  return (
    opt?.label ||
    formData.nombreAseguradora ||
    'SEGUROS BOLÍVAR S.A.'
  ).toUpperCase();
}

export function obtenerInspector(formData, responsables = []) {
  const opt = responsables.find((r) => r.value === formData.codiRespnsble);
  return (opt?.label || formData.nombreResponsable || formData.creadoPor || '').toUpperCase();
}

function normalizarNumeroContenedor(numero) {
  return String(numero || '').replace(/\s+/g, '').toUpperCase();
}

/** Cantidad estilo Word: «1 x 40'» (evita duplicar cuando el tipo ya incluye la cantidad). */
function textoCantidadContenedor(c = {}) {
  const cantidad = String(c.cantidad || '').trim();
  const tipo = String(c.tipoContenedor || '').trim().replace(/\s+/g, ' ');
  if (cantidad && tipo) {
    const tipoLower = tipo.toLowerCase();
    if (tipoLower.startsWith(`${cantidad.toLowerCase()} x`)) return tipo;
    return `${cantidad} x ${tipo}`;
  }
  return tipo || cantidad;
}

/**
 * Consolida el seguimiento para la tabla del informe con celdas combinadas:
 * - Cada vehículo (fila) abarca sus porciones de carga (una por contenedor).
 * - Si la carga restante de un vehículo se completa con el siguiente (casilla
 *   «continúa anterior» o mismo N° de contenedor repetido), el contenedor se
 *   une en una sola celda y consolida llenado y sellos, dejando los bultos de
 *   cada vehículo en su propia subfila (conteo consolidado de la carga).
 */
export function construirSeguimientoConsolidado(seguimiento = []) {
  const filas = [];
  const vehiculos = [];
  const contenedores = [];

  seguimiento.forEach((f) => {
    const conts = f.contenedores?.length ? f.contenedores : [{}];
    vehiculos.push({
      inicio: filas.length,
      fin: filas.length + conts.length - 1,
      lineasIngreso: [
        formatearFechaCorta(f.fecha),
        f.entradaVehiculo ? `Entrada: ${f.entradaVehiculo}` : '',
        f.salidaVehiculo ? `Salida: ${f.salidaVehiculo}` : '',
      ].filter(Boolean),
      placa: f.placa || '',
      descargueInicio: f.descargueInicio || '',
      descargueFin: f.descargueFin || '',
    });

    conts.forEach((c, idx) => {
      const numeroNorm = normalizarNumeroContenedor(c.numeroContenedor);
      const previo = contenedores[contenedores.length - 1];
      const previoEsConsecutivo = Boolean(previo) && previo.fin === filas.length - 1;
      const continuaPrevio =
        previoEsConsecutivo &&
        ((idx === 0 && Boolean(c.continuaAnterior)) ||
          (Boolean(numeroNorm) && previo.numeroNorm === numeroNorm));

      let bultos = String(c.bultos || '').trim();
      if (!bultos && idx === 0) bultos = String(f.bultos || '').trim();

      if (continuaPrevio) {
        previo.fin = filas.length;
        if (!previo.numeroNorm && numeroNorm) {
          previo.numero = c.numeroContenedor || '';
          previo.numeroNorm = numeroNorm;
        }
        if (!previo.cantidad) previo.cantidad = textoCantidadContenedor(c);
        if (!previo.llenadoInicio) previo.llenadoInicio = c.llenadoInicio || '';
        if (c.llenadoFin) previo.llenadoFin = c.llenadoFin;
        [c.sello1, c.sello2]
          .filter(Boolean)
          .forEach((s) => {
            if (!previo.sellos.includes(s)) previo.sellos.push(s);
          });
      } else {
        contenedores.push({
          inicio: filas.length,
          fin: filas.length,
          numero: c.numeroContenedor || '',
          numeroNorm,
          cantidad: textoCantidadContenedor(c),
          llenadoInicio: c.llenadoInicio || '',
          llenadoFin: c.llenadoFin || '',
          sellos: [c.sello1, c.sello2].filter(Boolean),
        });
      }

      filas.push({
        bultos,
        vehIdx: vehiculos.length - 1,
        contIdx: contenedores.length - 1,
      });
    });
  });

  return { filas, vehiculos, contenedores };
}

/** Encabezados y anchos (mm) de la tabla de seguimiento consolidada. */
export const SEGUIMIENTO_COLS_MM = [26, 18, 12, 12, 14, 18, 30, 12, 12, 22];

/** Divide los comentarios del reporte en viñetas (una por línea no vacía). */
export function puntosComentariosSupervision(comentarios) {
  return String(comentarios || '')
    .split('\n')
    .map((l) => l.trim().replace(/^[-•*]\s*/, ''))
    .filter(Boolean);
}

export function resumenMercancia(informe) {
  const lineas = informe.lineasMercancia || [];
  return {
    lineas,
    total: calcularTotalMercancia(lineas),
  };
}

/** No usar nombres de archivo como pie de foto en el PDF. */
export function captionImagenPdf(imagen) {
  const descripcion = (imagen?.descripcion || '').trim();
  if (descripcion) return descripcion;
  const nombre = (imagen?.nombre || '').trim();
  if (!nombre) return '';
  if (/\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(nombre)) return '';
  if (/captura|screenshot|pantalla|image|img_|photo|foto/i.test(nombre)) return '';
  return nombre;
}

/**
 * Consolida la mercancía de un mismo caso para el informe (estilo Word):
 * una subfila por producto (producto + cantidad) y las columnas N° contenedores,
 * B/L, tipo de carga y destino combinadas verticalmente cuando la línea
 * siguiente repite el valor o lo deja vacío.
 */
export function construirMercanciaConsolidada(lineas = []) {
  const base = lineas.length ? lineas : [{}];
  const productos = base.map((l) => ({
    producto: String(l.producto || '').trim(),
    cantidad: String(l.cantidad || '').trim(),
  }));

  const construirGrupos = (campo) => {
    const grupos = [];
    base.forEach((l, i) => {
      const valor = String(l[campo] || '').trim();
      const previo = grupos[grupos.length - 1];
      const compatible =
        previo &&
        (valor === '' ||
          previo.valor === '' ||
          previo.valor.toLowerCase() === valor.toLowerCase());
      if (compatible) {
        previo.fin = i;
        if (!previo.valor) previo.valor = valor;
      } else {
        grupos.push({ inicio: i, fin: i, valor });
      }
    });
    return grupos;
  };

  return {
    productos,
    grupos: {
      numCont: construirGrupos('numContenedores'),
      bl: construirGrupos('bl'),
      tipoCarga: construirGrupos('tipoCarga'),
      destino: construirGrupos('destino'),
    },
  };
}

/**
 * Distribuye fotos de mercancía: bloque 2×2 del Word (sección 3) y resto para supervisión.
 */
export function prepararFotosSeccion3Mercancia(informe = {}) {
  let cajas = [...(informe.imagenesContenidoCajas || [])];
  let contenedores = [...(informe.imagenesContenedoresMercancia || [])];
  const legacy = informe.imagenesRegistroMercancia || [];

  if (!cajas.length && !contenedores.length && legacy.length) {
    cajas = legacy.slice(0, 3);
    contenedores = legacy.slice(3);
  }

  const fila1 = cajas.splice(0, 2);
  const cajaFila2 = cajas.shift() || null;
  let contenedorFila2 = contenedores.shift() || null;
  let leyendaDerechaFila2 = 'Contenedor (es) asignado (s)';

  if (!contenedorFila2 && cajas.length) {
    contenedorFila2 = cajas.shift();
    leyendaDerechaFila2 = 'Contenido de la mercancía';
  }

  const fila2 = [];
  const leyendasFila2 = [];
  if (cajaFila2) {
    fila2.push(cajaFila2);
    leyendasFila2.push('Contenido de la mercancía');
  }
  if (contenedorFila2) {
    fila2.push(contenedorFila2);
    leyendasFila2.push(leyendaDerechaFila2);
  }

  return {
    fila1,
    fila2,
    leyendasFila2,
    extras: {
      contenedores: [...contenedores, ...cajas],
      vehiculos: [...(informe.imagenesVehiculosMercancia || [])],
    },
    tieneFotos: fila1.length > 0 || fila2.length > 0,
  };
}

/** Agrupa fotos del registro inicial de supervisión como en el Word. */
export function agruparFotosSupervisionInicial(imagenes = []) {
  const grupos = { contenedores: [], vehiculos: [], bodega: [] };
  const sinClasificar = [];
  (imagenes || []).forEach((img) => {
    const d = (img.descripcion || img.nombre || '').toLowerCase();
    if (/bodega|almacenad/i.test(d)) grupos.bodega.push(img);
    else if (/veh[ií]culo|sello|placa|camion|precinto/i.test(d)) grupos.vehiculos.push(img);
    else if (/contenedor|apto/i.test(d)) grupos.contenedores.push(img);
    else sinClasificar.push(img);
  });
  if (sinClasificar.length) {
    const tercio = Math.max(1, Math.ceil(sinClasificar.length / 3));
    grupos.contenedores.push(...sinClasificar.slice(0, tercio));
    grupos.vehiculos.push(...sinClasificar.slice(tercio, tercio * 2));
    grupos.bodega.push(...sinClasificar.slice(tercio * 2));
  }
  return grupos;
}
