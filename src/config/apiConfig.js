/**
 * URL del API vía variables de entorno (Vite).
 *
 * Desarrollo: frontend/.env → VITE_API_BASE_URL=http://localhost:3000
 * Producción: frontend/.env.production → backend Coolify
 */

import { devLog } from '../utils/devLog.js';
import { API_BY_FRONTEND_HOST, DEFAULT_PROD_BACKEND } from './platformUrls.js';

const trimOrigin = (url) =>
  typeof url === 'string' ? url.trim().replace(/\/+$/, '') : '';

const envApiBase = trimOrigin(import.meta.env.VITE_API_BASE_URL);

const isDevelopment =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  /^51(73|74|75)$/.test(window.location.port) ||
  window.location.port === '3000';

const DEFAULT_DEV = 'http://localhost:3000';
const DEFAULT_PROD = DEFAULT_PROD_BACKEND;

function resolveBaseUrl() {
  const hostname = window.location.hostname;
  if (API_BY_FRONTEND_HOST[hostname]) {
    return API_BY_FRONTEND_HOST[hostname];
  }
  // Vite (5173–5175): same-origin + proxy a :3000. Evita CORS ERR_NETWORK en Chrome.
  if (/^51(73|74|75)$/.test(window.location.port)) {
    return '';
  }
  if (envApiBase) return envApiBase;
  return isDevelopment ? DEFAULT_DEV : DEFAULT_PROD;
}

export const BASE_URL = resolveBaseUrl();

// Fallback de uploads en dev (datos/imágenes en servidor de producción)
export const PROD_URL =
  trimOrigin(import.meta.env.VITE_UPLOADS_BASE_URL) || DEFAULT_PROD;

export const isDevelopmentEnv = isDevelopment;

if (isDevelopmentEnv) {
  devLog(`🔧 Entorno: DESARROLLO | API: ${BASE_URL}`);
}

function storageFileUrl(baseUrl, ref) {
  return `${baseUrl}/api/storage/file?ref=${encodeURIComponent(ref)}`;
}

/** Vite (BASE_URL vacío) ya proxya a :3000; el fallback a prod cuelga el Word en 404 lentos. */
function withDevProdFallback(primary, prod) {
  const list = [primary];
  if (isDevelopmentEnv && BASE_URL && BASE_URL !== PROD_URL && prod && prod !== primary) {
    list.push(prod);
  }
  return list;
}

/**
 * Devuelve candidatos de URL para recursos subidos (por ejemplo `/uploads/...` o `s3:legacy/...`).
 * - Referencias `s3:` → preferir `/api/storage/signed-url` (front); este helper sigue
 *   armando el proxy `/api/storage/file?ref=...` como fallback (HEIC / legacy).
 * - En PROD: solo usa `BASE_URL`
 * - En DEV: intenta primero `BASE_URL` (localhost) y si no existe, permite fallback a `PROD_URL`
 */
export function getUploadsUrlCandidates(rutaOrUrl) {
  if (!rutaOrUrl || typeof rutaOrUrl !== 'string') return [];

  if (rutaOrUrl.startsWith('data:') || rutaOrUrl.startsWith('blob:')) return [rutaOrUrl];

  if (rutaOrUrl.startsWith('http://') || rutaOrUrl.startsWith('https://')) {
    // URLs antiguas guardadas como "https://backend/s3:clave" no existen como ruta;
    // extraer la referencia s3: y reenrutar por el proxy de storage.
    const s3EnUrl = rutaOrUrl.match(/^https?:\/\/[^/]+\/(s3:.+)$/i);
    if (s3EnUrl) {
      let ref = s3EnUrl[1];
      try {
        ref = decodeURIComponent(ref);
      } catch {
        // referencia sin codificar: usar tal cual
      }
      const list = withDevProdFallback(storageFileUrl(BASE_URL, ref), storageFileUrl(PROD_URL, ref));
      return list;
    }
    return [rutaOrUrl];
  }

  if (rutaOrUrl.startsWith('s3:') || rutaOrUrl.startsWith('s3://')) {
    return withDevProdFallback(storageFileUrl(BASE_URL, rutaOrUrl), storageFileUrl(PROD_URL, rutaOrUrl));
  }

  // Referencias mutiladas tipo "/s3:clave" (guardadas así por normalizaciones antiguas)
  if (/^\/s3:/i.test(rutaOrUrl)) {
    const ref = rutaOrUrl.slice(1);
    return withDevProdFallback(storageFileUrl(BASE_URL, ref), storageFileUrl(PROD_URL, ref));
  }

  if (rutaOrUrl.startsWith('/uploads/')) {
    return withDevProdFallback(`${BASE_URL}${rutaOrUrl}`, `${PROD_URL}${rutaOrUrl}`);
  }

  if (rutaOrUrl.startsWith('uploads/')) {
    const path = `/${rutaOrUrl}`;
    return withDevProdFallback(`${BASE_URL}${path}`, `${PROD_URL}${path}`);
  }

  if (rutaOrUrl.startsWith('/')) return [`${BASE_URL}${rutaOrUrl}`];

  return [rutaOrUrl];
}

export function resolveUploadsUrl(rutaOrUrl) {
  return getUploadsUrlCandidates(rutaOrUrl)[0] || null;
}

export async function apiRequest(endpoint, options = {}) {
  try {
    const url = `${BASE_URL}/api${endpoint}`;

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
  devLog('🔧 === CONFIGURACIÓN ACTUAL ===');
  devLog(`📍 Entorno: ${isDevelopmentEnv ? 'DESARROLLO' : 'PRODUCCIÓN'}`);
  devLog(`🌐 URL Base API: ${BASE_URL}`);
  devLog(`🏠 Hostname: ${window.location.hostname}`);
  devLog(`🔌 Puerto: ${window.location.port}`);
  devLog('===============================');
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
