import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { resolveUploadsUrl } from '../../config/apiConfig.js';
import { authFetch } from '../../services/authFetch.js';
import { resolverUrlArchivo } from '../../services/storageSignedUrl.js';
import { esArchivoAjustadorBbvaCat } from './bbvaCatHelpers.js';

function safeSeg(valor, fallback = 'SIN_NOMBRE') {
  const s = String(valor || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return s || fallback;
}

function nombreArchivo(arch) {
  return (
    String(arch?.nombreOriginal || arch?.nombreArchivo || '').trim() ||
    `archivo_${String(arch?._id || Date.now()).slice(-8)}`
  );
}

function etiquetaCarpeta(arch) {
  return safeSeg(arch?.etiqueta || 'GENERAL', 'GENERAL');
}

function uniquePath(usados, carpeta, nombre) {
  let base = `${carpeta}/${safeSeg(nombre, 'archivo')}`;
  if (!usados.has(base.toLowerCase())) {
    usados.add(base.toLowerCase());
    return base;
  }
  const dot = nombre.lastIndexOf('.');
  const stem = dot > 0 ? nombre.slice(0, dot) : nombre;
  const ext = dot > 0 ? nombre.slice(dot) : '';
  let i = 2;
  while (i < 9999) {
    const candidato = `${carpeta}/${safeSeg(`${stem}_${i}${ext}`, `archivo_${i}`)}`;
    if (!usados.has(candidato.toLowerCase())) {
      usados.add(candidato.toLowerCase());
      return candidato;
    }
    i += 1;
  }
  const fallback = `${carpeta}/${Date.now()}_${safeSeg(nombre)}`;
  usados.add(fallback.toLowerCase());
  return fallback;
}

async function fetchBlobArchivo(ruta) {
  const raw = String(ruta || '').trim();
  if (!raw) throw new Error('Sin ruta');

  const intentos = [];
  try {
    const firmada = await resolverUrlArchivo(raw);
    if (firmada) {
      // URL firmada S3: sin Authorization. Proxy API: con token.
      const usaAuth = /\/api\//i.test(firmada);
      intentos.push({ url: firmada, auth: usaAuth });
    }
  } catch {
    /* fallback abajo */
  }
  const proxy = resolveUploadsUrl(raw);
  if (proxy && !intentos.some((i) => i.url === proxy)) {
    intentos.push({ url: proxy, auth: true });
  }

  let ultimo = null;
  for (const it of intentos) {
    try {
      const res = it.auth ? await authFetch(it.url) : await fetch(it.url);
      if (!res.ok) {
        ultimo = new Error(`HTTP ${res.status}`);
        continue;
      }
      return await res.blob();
    } catch (err) {
      ultimo = err;
    }
  }
  throw ultimo || new Error('No se pudo descargar el archivo');
}

/**
 * Descarga un ZIP del archivero BBVA organizado en carpetas:
 *   {caso}/01_Analista/{ETIQUETA}/archivo
 *   {caso}/02_Ajustador/{ETIQUETA}/archivo
 */
export async function descargarArchiveroBbvaCatZip({
  caso = {},
  archivos = [],
  onProgreso,
} = {}) {
  const lista = (Array.isArray(archivos) ? archivos : []).filter((a) => a?.ruta);
  if (!lista.length) {
    throw new Error('EMPTY');
  }

  const idCaso = safeSeg(
    caso.consecutivo || caso.zc || caso.siniestro || caso.identificacion || caso._id,
    'BBVA_CAT'
  );
  const raiz = `BBVA_CAT_${idCaso}`;
  const zip = new JSZip();
  const usados = new Set();
  const fallidos = [];
  let ok = 0;

  for (let i = 0; i < lista.length; i += 1) {
    const arch = lista[i];
    onProgreso?.({ current: i + 1, total: lista.length, nombre: nombreArchivo(arch) });
    const origen = esArchivoAjustadorBbvaCat(arch) ? '02_Ajustador' : '01_Analista';
    const carpeta = `${raiz}/${origen}/${etiquetaCarpeta(arch)}`;
    const path = uniquePath(usados, carpeta, nombreArchivo(arch));
    try {
      const blob = await fetchBlobArchivo(arch.ruta);
      zip.file(path, blob);
      ok += 1;
    } catch (err) {
      fallidos.push({
        nombre: nombreArchivo(arch),
        error: err?.message || String(err),
      });
    }
  }

  if (!ok) {
    throw new Error('ALL_FAILED');
  }

  const leeme = [
    `Archivero BBVA CAT — ${idCaso}`,
    `Asegurado: ${caso.asegurado || '—'}`,
    `STRO/ZC: ${caso.siniestro || caso.zc || '—'}`,
    '',
    'Estructura (quién sube qué):',
    '  01_Analista/POLIZA/     → el analista solo carga la póliza',
    '  02_Ajustador/INFORME/   → informe único Word (copia al generar)',
    '  02_Ajustador/FOTOS/     → fotos de inspección',
    '  02_Ajustador/{OTROS}/   → liquidación, pago y demás del ajustador',
    '',
    `Archivos incluidos: ${ok}`,
    fallidos.length
      ? `No se pudieron incluir (${fallidos.length}):\n${fallidos
          .map((f) => `  - ${f.nombre}: ${f.error}`)
          .join('\n')}`
      : 'Todos los archivos se incluyeron correctamente.',
    '',
    `Generado: ${new Date().toLocaleString('es-CO')}`,
  ].join('\n');
  zip.file(`${raiz}/00_LEEME.txt`, leeme);

  const out = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const fecha = new Date().toISOString().slice(0, 10);
  saveAs(out, `Archivero_BBVA_CAT_${idCaso}_${fecha}.zip`);
  return { ok, fallidos, total: lista.length };
}
