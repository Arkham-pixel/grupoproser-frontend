import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

function authHeaders(multipart = false) {
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  if (!multipart) headers['Content-Type'] = 'application/json';
  return headers;
}

export async function obtenerEstadoEncuestaDocumentacion() {
  const res = await axios.get(`${BASE_URL}/api/encuesta-documentacion-externos/estado`, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function enviarEncuestaDocumentacion({
  nombreCompleto,
  correo,
  archivos,
  finalizar = false,
}) {
  const form = new FormData();
  form.append('nombreCompleto', nombreCompleto || '');
  form.append('correo', correo || '');
  form.append('finalizar', finalizar ? 'true' : 'false');
  Object.entries(archivos || {}).forEach(([key, file]) => {
    if (file) form.append(key, file);
  });
  const res = await axios.post(`${BASE_URL}/api/encuesta-documentacion-externos/enviar`, form, {
    headers: authHeaders(true),
  });
  return res.data;
}

/** URL autenticada de la plantilla oficial del acuerdo (mismo Word del onboarding). */
export function urlPlantillaConfidencialidadEncuesta() {
  return `${BASE_URL}/api/encuesta-documentacion-externos/plantilla-confidencialidad`;
}

export async function descargarPlantillaConfidencialidadEncuesta() {
  const res = await axios.get(urlPlantillaConfidencialidadEncuesta(), {
    headers: authHeaders(true),
    responseType: 'arraybuffer',
  });
  return res.data;
}

export async function listarRespuestasEncuestaDocumentacion({ ciclo, q } = {}) {
  const params = {};
  if (ciclo) params.ciclo = ciclo;
  if (q) params.q = q;
  const res = await axios.get(`${BASE_URL}/api/encuesta-documentacion-externos/admin/respuestas`, {
    headers: authHeaders(),
    params,
  });
  return res.data;
}

function dispararDescargaBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function descargarZipUsuarioEncuesta(userId, filenameHint) {
  const res = await axios.get(
    `${BASE_URL}/api/encuesta-documentacion-externos/admin/respuestas/${userId}/zip`,
    {
      headers: authHeaders(true),
      responseType: 'blob',
    }
  );
  const name = filenameHint || `documentacion_${userId}.zip`;
  dispararDescargaBlob(new Blob([res.data], { type: 'application/zip' }), name);
}

export async function descargarZipTodosEncuesta(ciclo) {
  const res = await axios.get(
    `${BASE_URL}/api/encuesta-documentacion-externos/admin/respuestas/zip`,
    {
      headers: authHeaders(true),
      responseType: 'blob',
      params: ciclo ? { ciclo } : undefined,
    }
  );
  const name = `encuesta_documentacion_${ciclo || 'ciclo'}.zip`;
  dispararDescargaBlob(new Blob([res.data], { type: 'application/zip' }), name);
}
