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

export function aplanarSeguimiento(seguimiento = []) {
  const filas = [];
  seguimiento.forEach((f) => {
    const contenedores = f.contenedores?.length ? f.contenedores : [{}];
    contenedores.forEach((c, idx) => {
      filas.push({
        fecha: idx === 0 ? formatearFechaCorta(f.fecha) : '',
        ingreso:
          idx === 0 && (f.entradaVehiculo || f.salidaVehiculo)
            ? `Entrada: ${f.entradaVehiculo || '—'}\nSalida: ${f.salidaVehiculo || '—'}`
            : '',
        placa: idx === 0 ? f.placa || '' : '',
        descargue:
          idx === 0 && (f.descargueInicio || f.descargueFin)
            ? `Inicio: ${f.descargueInicio || '—'}\nFinal: ${f.descargueFin || '—'}`
            : '',
        bultos: idx === 0 ? f.bultos || '' : '',
        cantidad: c.cantidad || '',
        tipo: c.tipoContenedor || '',
        numero: c.numeroContenedor || '',
        llenado:
          c.llenadoInicio || c.llenadoFin
            ? `Inicio: ${c.llenadoInicio || '—'}\nFinal: ${c.llenadoFin || '—'}`
            : '',
        sellos: [c.sello1, c.sello2].filter(Boolean).join('\n'),
      });
    });
  });
  return filas;
}

export function resumenMercancia(informe) {
  const lineas = informe.lineasMercancia || [];
  return {
    lineas,
    total: calcularTotalMercancia(lineas),
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
