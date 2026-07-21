import { esUsuarioGerenteFacturacion } from '../../config/gerentesFacturacion';
import { getUploadsUrlCandidates } from '../../config/apiConfig.js';

/** Resuelve URL usable en el navegador (S3 vía proxy /api/storage/file). */
export function urlArchivoSubtarea(archivo) {
  if (!archivo) return '';
  const candidatos = [
    archivo.url,
    archivo.ruta,
    archivo.filename,
  ].filter(Boolean);
  for (const valor of candidatos) {
    let v = String(valor).trim();
    if (!v) continue;
    // Solo nombre de archivo local → ruta uploads
    if (
      !v.startsWith('http') &&
      !v.startsWith('s3:') &&
      !v.startsWith('/') &&
      !v.includes('\\')
    ) {
      v = `/uploads/${v}`;
    }
    const url = getUploadsUrlCandidates(v)[0];
    if (url) return url;
  }
  return '';
}

export function puedeGestionarSubtareasFrontend(codiRespnsbleCaso) {
  const login = String(localStorage.getItem('login') || '').trim();
  const rol = String(localStorage.getItem('rol') || '').trim().toLowerCase();
  if (
    rol === 'admin' ||
    rol === 'administrador' ||
    rol === 'gerencia' ||
    rol === 'gerente' ||
    rol.includes('gerencia')
  ) {
    return true;
  }
  if (esUsuarioGerenteFacturacion(login)) return true;
  const codi = String(codiRespnsbleCaso || '').trim();
  return Boolean(login && codi && login === codi);
}

export const SEMAFORO_STYLES = {
  verde: {
    label: 'Al día',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
  },
  amarillo: {
    label: 'En curso / próximo a vencer',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
  },
  rojo: {
    label: 'Vencida',
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50',
  },
  gris: {
    label: 'Cancelada',
    dot: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  },
};

export const ESTADO_LABELS = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

export function formatearFechaSubtarea(fecha) {
  if (!fecha) return '—';
  try {
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatearFechaHoraSubtarea(fecha) {
  if (!fecha) return '—';
  try {
    return new Date(fecha).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/** Texto de duración (usa campos del API o calcula desde fechas). */
export function formatearDuracionSubtarea(subtarea) {
  if (!subtarea) return null;
  if (subtarea.duracionTrabajoTexto) return subtarea.duracionTrabajoTexto;
  const ms = subtarea.duracionTrabajoMs;
  if (ms == null || Number.isNaN(Number(ms)) || ms < 0) return null;
  const totalMin = Math.round(Number(ms) / 60000);
  if (totalMin < 1) return 'menos de 1 min';
  if (totalMin < 60) return `${totalMin} min`;
  const horas = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (horas < 48) return mins > 0 ? `${horas} h ${mins} min` : `${horas} h`;
  const dias = Math.floor(horas / 24);
  const horasRest = horas % 24;
  return horasRest > 0 ? `${dias} d ${horasRest} h` : `${dias} d`;
}
