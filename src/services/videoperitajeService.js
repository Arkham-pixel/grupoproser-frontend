import { BASE_URL } from '../config/apiConfig.js';

const API = `${BASE_URL}/api/videoperitaje`;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function parseJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || data.message || 'Error de videoperitaje');
    err.status = response.status;
    err.code = data.code;
    err.payload = data;
    throw err;
  }
  return data;
}

export async function crearSesionVideoperitaje(payload) {
  const response = await fetch(`${API}/sesiones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return parseJson(response);
}

export async function listarSesionesVideoperitaje(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  const response = await fetch(`${API}/sesiones${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  });
  return parseJson(response);
}

export async function obtenerSesionVideoperitaje(id) {
  const response = await fetch(`${API}/sesiones/${id}`, { headers: authHeaders() });
  return parseJson(response);
}

export async function tokenLivekitPerito(id) {
  const response = await fetch(`${API}/sesiones/${id}/token-livekit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  return parseJson(response);
}

export async function finalizarSesionVideoperitaje(id, body = {}) {
  const response = await fetch(`${API}/sesiones/${id}/finalizar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function cancelarSesionVideoperitaje(id) {
  const response = await fetch(`${API}/sesiones/${id}/cancelar`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return parseJson(response);
}

export async function eliminarSesionVideoperitaje(id) {
  const response = await fetch(`${API}/sesiones/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseJson(response);
}

export async function vaciarHistorialVideoperitaje() {
  const response = await fetch(`${API}/sesiones`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseJson(response);
}

export async function reenviarInvitacionVideoperitaje(id) {
  const response = await fetch(`${API}/sesiones/${id}/reenviar`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return parseJson(response);
}

export async function subirFotoPeritoVideoperitaje(id, blob, { descripcion, pasoId, filename, tipo } = {}) {
  const esVideo = tipo === 'video' || String(blob?.type || '').startsWith('video/');
  const name = filename || (esVideo ? `grabacion-${Date.now()}.webm` : `captura-${Date.now()}.jpg`);
  const extra = { descripcion, pasoId, filename: name, tipo: esVideo ? 'video' : 'foto' };
  if (!esVideo) {
    const directo = await subirDirectoS3(`${API}/sesiones/${id}/uploads`, blob, extra, authHeaders());
    if (directo) return directo;
  }
  const fd = new FormData();
  fd.append('archivo', blob, name);
  if (descripcion) fd.append('descripcion', descripcion);
  if (pasoId) fd.append('pasoId', pasoId);
  if (esVideo) fd.append('tipo', 'video');
  const response = await fetch(`${API}/sesiones/${id}/fotos`, {
    method: 'POST',
    headers: authHeaders(),
    body: fd,
  });
  return parseJson(response);
}

export async function listarPlantillasVideoperitaje(archivadas = false) {
  const qs = archivadas ? '?archivadas=1' : '';
  const response = await fetch(`${API}/plantillas${qs}`, { headers: authHeaders() });
  return parseJson(response);
}

export async function crearPlantillaVideoperitaje(payload) {
  const response = await fetch(`${API}/plantillas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return parseJson(response);
}

export async function actualizarPlantillaVideoperitaje(id, payload) {
  const response = await fetch(`${API}/plantillas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return parseJson(response);
}

export async function archivarPlantillaVideoperitaje(id) {
  const response = await fetch(`${API}/plantillas/${id}/archivar`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return parseJson(response);
}

export async function obtenerSesionPublica(token) {
  const response = await fetch(`${API}/public/${encodeURIComponent(token)}`);
  return parseJson(response);
}

export async function joinSesionPublica(token, geo) {
  const response = await fetch(`${API}/public/${encodeURIComponent(token)}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ geo }),
  });
  return parseJson(response);
}

export async function subirFotoPublicaVideoperitaje(token, blob, { pasoId, descripcion, filename, tipo } = {}) {
  const esVideo = tipo === 'video' || String(blob?.type || '').startsWith('video/');
  const name = filename || (esVideo ? `grabacion-${Date.now()}.webm` : `foto-${Date.now()}.jpg`);
  const extra = { descripcion, pasoId, filename: name, tipo: esVideo ? 'video' : 'foto' };
  const directo = await subirDirectoS3(
    `${API}/public/${encodeURIComponent(token)}/uploads`,
    blob,
    extra
  );
  if (directo) return directo;
  const fd = new FormData();
  fd.append('archivo', blob, name);
  if (pasoId) fd.append('pasoId', pasoId);
  if (descripcion) fd.append('descripcion', descripcion);
  if (esVideo) fd.append('tipo', 'video');
  const response = await fetch(`${API}/public/${encodeURIComponent(token)}/fotos`, {
    method: 'POST',
    body: fd,
  });
  return parseJson(response);
}

async function subirDirectoS3(baseUploads, blob, extra = {}, headers = {}) {
  try {
    const contentType = blob.type || (extra.tipo === 'video' ? 'video/webm' : 'image/jpeg');
    const pre = await fetch(`${baseUploads}/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        filename: extra.filename,
        contentType,
        tipo: extra.tipo,
        pasoId: extra.pasoId,
        descripcion: extra.descripcion,
        tamaño: blob.size,
      }),
    });
    const pj = await pre.json().catch(() => ({}));
    if (!pre.ok || pj.modo !== 's3' || !pj.uploadUrl) return null;
    const put = await fetch(pj.uploadUrl, {
      method: 'PUT',
      headers: pj.headers || { 'Content-Type': contentType },
      body: blob,
    });
    if (!put.ok) return null;
    const done = await fetch(`${baseUploads}/completar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        key: pj.key,
        filename: extra.filename,
        contentType,
        tamaño: blob.size,
        tipo: extra.tipo,
        pasoId: extra.pasoId,
        descripcion: extra.descripcion,
      }),
    });
    return parseJson(done);
  } catch {
    return null;
  }
}

export async function completarPasoPublicoVideoperitaje(token, pasoId) {
  const response = await fetch(`${API}/public/${encodeURIComponent(token)}/pasos/completar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pasoId }),
  });
  return parseJson(response);
}

export function capturarFrameDeVideo(videoEl) {
  if (!videoEl || !videoEl.videoWidth) return Promise.resolve(null);
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(videoEl, 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
}

export function leerGeoNavegador() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });
}
