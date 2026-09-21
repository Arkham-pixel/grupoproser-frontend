import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { BASE_URL } from '../config/apiConfig.js';
import { authFetch } from '../services/authFetch.js';
import { resolverUrlArchivo } from '../services/storageSignedUrl.js';

function esVideo(m) {
  return m?.tipo === 'video' || String(m?.tipoMime || '').startsWith('video/');
}

function extensionDe(m) {
  const name = String(m?.nombreOriginal || m?.nombreArchivo || '');
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  if (ext) return ext;
  return esVideo(m) ? '.webm' : '.jpg';
}

function slug(texto) {
  return String(texto || 'evidencias')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60) || 'evidencias';
}

async function blobDeMedia(m) {
  try {
    const url = m.url || (await resolverUrlArchivo(m.ruta));
    if (url) {
      const r = await fetch(url);
      if (r.ok) return r.blob();
    }
  } catch {
    /* CORS del bucket: bajar por el proxy autenticado */
  }
  const proxy = `${BASE_URL}/api/storage/file?ref=${encodeURIComponent(m.ruta || '')}`;
  const r = await authFetch(proxy);
  if (!r.ok) throw new Error(`No se pudo descargar ${m.nombreOriginal || 'archivo'}`);
  return r.blob();
}

export async function descargarBloqueVideoperitaje(medias, { nombre = 'Videoperitaje' } = {}) {
  const lista = (medias || []).filter((m) => m?.ruta || m?.url);
  if (!lista.length) throw new Error('Este bloque no tiene archivos');

  const zip = new JSZip();
  const carpeta = zip.folder(slug(nombre));
  const pad = String(lista.length).length;
  await Promise.all(
    lista.map(async (m, i) => {
      const blob = await blobDeMedia(m);
      const n = String(i + 1).padStart(pad, '0');
      const tipo = esVideo(m) ? 'grabacion' : 'foto';
      const file = `${n}_${tipo}${extensionDe(m)}`;
      carpeta.file(file, blob);
    })
  );
  const out = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  saveAs(out, `${slug(nombre)}.zip`);
}
