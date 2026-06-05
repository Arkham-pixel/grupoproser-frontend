/**
 * URL del API vía variables de entorno (Vite).
 *
 * Desarrollo: frontend/.env → VITE_API_BASE_URL=http://localhost:3000
 * Producción: frontend/.env.production → backend Coolify
 */

import { logAppEnvironment, debug, isDebugEnabled } from '../utils/appLogger.js';

const trimOrigin = (url) =>
  typeof url === 'string' ? url.trim().replace(/\/+$/, '') : '';

const envApiBase = trimOrigin(import.meta.env.VITE_API_BASE_URL);

const isDevelopment =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  /^51(73|74|75)$/.test(window.location.port) ||
  window.location.port === '3000';

const DEFAULT_DEV = 'http://localhost:3000';
const COOLIFY_BACKEND = 'https://arnaldbackend.grupoproser.com.co';
const DEFAULT_PROD = COOLIFY_BACKEND;

/** API según dónde se sirve el front (un solo build, dos despliegues). */
const API_BY_FRONTEND_HOST = {
  'aplicacion.grupoproser.com.co': 'https://aplicacion.grupoproser.com.co',
  'arnalddataflow.grupoproser.com.co': COOLIFY_BACKEND,
  'arnald.grupoproser.com.co': COOLIFY_BACKEND,
};

function isLocalhostUrl(url) {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function resolveBaseUrl() {
  const hostname = window.location.hostname;

  if (API_BY_FRONTEND_HOST[hostname]) {
    return API_BY_FRONTEND_HOST[hostname];
  }

  // Cualquier front *.grupoproser.com.co en HTTPS → backend según despliegue.
  if (!isDevelopment && hostname.endsWith('.grupoproser.com.co')) {
    if (hostname === 'aplicacion.grupoproser.com.co') {
      return 'https://aplicacion.grupoproser.com.co';
    }
    return COOLIFY_BACKEND;
  }

  // En producción, ignorar VITE_API_BASE_URL si apunta a localhost (build mal configurado en Coolify).
  if (envApiBase && (isDevelopment || !isLocalhostUrl(envApiBase))) {
    return envApiBase;
  }

  return isDevelopment ? DEFAULT_DEV : DEFAULT_PROD;
}

export const BASE_URL = resolveBaseUrl();

// Fallback de uploads en dev (datos/imágenes en servidor de producción)
export const PROD_URL =
  trimOrigin(import.meta.env.VITE_UPLOADS_BASE_URL) || DEFAULT_PROD;

export const isDevelopmentEnv = isDevelopment;

logAppEnvironment({
  isDev: isDevelopmentEnv,
  apiUrl: BASE_URL,
  storageHint: isDevelopmentEnv
    ? 'localhost + bucket S3 (/api/storage/file)'
    : `${BASE_URL}/api/storage/file`,
});

/**
 * Devuelve candidatos de URL para recursos subidos (por ejemplo `/uploads/...`).
 * - En PROD: solo usa `BASE_URL`
 * - En DEV: intenta primero `BASE_URL` (localhost) y si no existe, permite fallback a `PROD_URL`
 */
export function getUploadsUrlCandidates(rutaOrUrl) {
  if (!rutaOrUrl || typeof rutaOrUrl !== 'string') return [];

  if (rutaOrUrl.startsWith('data:') || rutaOrUrl.startsWith('blob:')) return [rutaOrUrl];

  if (rutaOrUrl.startsWith('http://') || rutaOrUrl.startsWith('https://')) return [rutaOrUrl];

  if (rutaOrUrl.startsWith('s3:')) {
    const ref = encodeURIComponent(rutaOrUrl);
    const storagePath = `/api/storage/file?ref=${ref}`;
    const localUrl = `${BASE_URL}${storagePath}`;
    if (isDevelopmentEnv) {
      // 1) Ruta relativa → proxy de Vite → backend local (sin CORS).
      // 2) Backend local con credenciales S3 (mismo bucket que producción).
      // No usar prod en dev: arnaldbackend no envía CORS a localhost y redirige a S3.
      return [storagePath, localUrl];
    }
    return [localUrl];
  }

  if (rutaOrUrl.startsWith('/uploads/')) {
    const list = [`${BASE_URL}${rutaOrUrl}`];
    if (isDevelopmentEnv) list.push(`${PROD_URL}${rutaOrUrl}`);
    return list;
  }

  if (rutaOrUrl.startsWith('/')) return [`${BASE_URL}${rutaOrUrl}`];

  return [rutaOrUrl];
}

export function resolveUploadsUrl(rutaOrUrl) {
  return getUploadsUrlCandidates(rutaOrUrl)[0] || null;
}

/** Rutas guardadas en BD: local (/uploads/...), S3 (s3:clave) o URL pública/CDN. */
export function isStoredUploadPath(rutaOrUrl) {
  if (!rutaOrUrl || typeof rutaOrUrl !== 'string') return false;
  const t = rutaOrUrl.trim();
  if (t.startsWith('/uploads/') || t.startsWith('s3:') || t.startsWith('s3://')) return true;
  if (t.startsWith('http://') || t.startsWith('https://')) return true;
  return false;
}

export async function apiRequest(endpoint, options = {}) {
  try {
    const url = `${BASE_URL}/api${endpoint}`;

    debug(`🌐 ${options.method || 'GET'} ${url}`);

    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (options.body) {
      config.data = options.body;
      delete config.body;
    }

    const axios = await import('axios');
    const response = await axios.default(url, config);

    return response.data;
  } catch (error) {
    console.error(`❌ Error en ${endpoint}:`, error.message);
    throw error;
  }
}

export const API_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  USUARIOS: '/usuarios',
  USUARIO_BY_ID: (id) => `/usuarios/${id}`,
  CASOS_COMPLEX: '/casos',
  CASOS_RIESGO: '/casos-riesgo',
  SINIESTROS: '/siniestros',
  ESTADOS: '/estados',
  CIUDADES: '/ciudades',
  RESPONSABLES: '/responsables',
  FUNCIONARIOS_ASEGURADORA: '/funcionarios-aseguradora',
  FUNCIONARIOS: '/funcionarios',
  PRODUCTOS_SECUNDARIOS: '/productos-secundarios',
  CLIENTES: '/clientes',
  TAREAS: '/tareas',
  COMUNICADOS: '/comunicados',
  UPLOAD: '/upload',
};

export function showConfig() {
  logAppEnvironment({
    isDev: isDevelopmentEnv,
    apiUrl: BASE_URL,
    storageHint: isDevelopmentEnv
      ? 'localhost + bucket S3 (/api/storage/file)'
      : `${BASE_URL}/api/storage/file`,
  });
  if (!isDebugEnabled) return;
  debug('=== Detalle de configuración ===');
  debug(`Hostname: ${window.location.hostname}`);
  debug(`Puerto: ${window.location.port}`);
  debug(`PROD_URL (fallback): ${PROD_URL}`);
}

export default {
  BASE_URL,
  PROD_URL,
  isDevelopment: isDevelopmentEnv,
  apiRequest,
  API_ENDPOINTS,
  showConfig,
  getUploadsUrlCandidates,
  resolveUploadsUrl,
};
