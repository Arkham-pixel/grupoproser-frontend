import api from './api.js';
import { appendUploadFile } from '../utils/sanitizeUploadFileName.js';
import { BASE_URL } from '../config/apiConfig.js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  generarReporteSgSstPdf,
  generarTablaValoresCsv,
} from '../components/SubcomponenteSGSST/generarReporteSgSstPdf.js';
import { calcularPuntaje, calcularResumenPorGrupo } from '../config/sgSst0312.js';

export async function listarCasosSgSst(params = {}) {
  const { data } = await api.get('/api/sg-sst/casos', { params });
  return data?.casos || [];
}

export async function obtenerCasoSgSst(id) {
  const { data } = await api.get(`/api/sg-sst/casos/${id}`);
  return data?.caso;
}

export async function crearCasoSgSst(payload) {
  const { data } = await api.post('/api/sg-sst/casos', payload);
  return data?.caso;
}

export async function actualizarCasoSgSst(id, payload) {
  const { data } = await api.put(`/api/sg-sst/casos/${id}`, payload, {
    timeout: 30000,
  });
  return data?.caso;
}

export async function eliminarCasoSgSst(id) {
  const { data } = await api.delete(`/api/sg-sst/casos/${id}`);
  return data;
}

export async function subirEvidenciaSgSst(casoId, itemId, file) {
  const formData = new FormData();
  appendUploadFile(formData, 'archivo', file, file?.name || 'evidencia');
  const { data } = await api.post(
    `/api/sg-sst/casos/${casoId}/items/${encodeURIComponent(itemId)}/archivos`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }
  );
  return data;
}

export async function eliminarEvidenciaSgSst(casoId, archivoId) {
  const { data } = await api.delete(`/api/sg-sst/casos/${casoId}/archivos/${archivoId}`);
  return data;
}

async function fetchPaqueteZipBlob(casoId) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/api/sg-sst/casos/${casoId}/paquete`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    let msg = 'No se pudo descargar el paquete';
    try {
      const err = await response.json();
      msg = err.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return response.blob();
}

/**
 * Descarga ZIP enriquecido:
 * - Informe ejecutivo PDF (gráficos + datos clave)
 * - CSV tabla de valores
 * - JSON de puntaje / resumen por grupo
 * - Evidencias del backend
 */
export async function descargarPaqueteSgSst(casoId, numeroCaso, { caso, respuestasMap } = {}) {
  const zipBlob = await fetchPaqueteZipBlob(casoId);
  const zip = await JSZip.loadAsync(zipBlob);

  if (caso && respuestasMap) {
    const pdf = await generarReporteSgSstPdf({ caso, respuestasMap });
    zip.file(`01_${pdf.nombre}`, pdf.bytes);

    const csv = generarTablaValoresCsv({ caso, respuestasMap });
    zip.file(`02_${numeroCaso || casoId}_tabla_valores.csv`, csv);

    const progreso = calcularPuntaje(caso.perfilId, respuestasMap);
    const grupos = calcularResumenPorGrupo(caso.perfilId, respuestasMap);
    zip.file(
      `03_${numeroCaso || casoId}_puntaje_resumen.json`,
      JSON.stringify(
        {
          numeroCaso: caso.numeroCaso,
          empresa: caso.empresa,
          perfilId: caso.perfilId,
          progreso,
          porCiclo: grupos.porCiclo,
          porGrupo: grupos.porGrupo,
          generadoEn: new Date().toISOString(),
        },
        null,
        2
      )
    );

    zip.file(
      '00_LEEME.txt',
      [
        `Paquete SG-SST — ${caso.numeroCaso}`,
        '',
        'Contenido:',
        '01_*.pdf  → Informe ejecutivo: KPIs, gauge, PHVA, dona de estados, estándares, silueta, mapa corporal, tabla, plan y criterios.',
        '02_*.csv  → Tabla de valores completa (compatible Excel, separador ;).',
        '03_*.json → Puntaje y resumen por ciclo/estándar.',
        'resumen_evaluacion.json → Datos crudos del caso (backend).',
        'evidencias/ → Archivos adjuntos por ítem.',
        '',
        `Generado: ${new Date().toLocaleString('es-CO')}`,
      ].join('\n')
    );
  }

  const out = await zip.generateAsync({ type: 'blob' });
  saveAs(out, `${numeroCaso || casoId}_paquete.zip`);
}
