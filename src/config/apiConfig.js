/**
 * URL del API vía variables de entorno (Vite).
 *
 * Desarrollo: frontend/.env → VITE_API_BASE_URL=http://localhost:3000
 * Producción: frontend/.env.production → backend Coolify
 */

const trimOrigin = (url) =>
  typeof url === 'string' ? url.trim().replace(/\/+$/, '') : '';

const envApiBase = trimOrigin(import.meta.env.VITE_API_BASE_URL);

const isDevelopment =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.port === '5173' ||
  window.location.port === '3000';

const DEFAULT_DEV = 'http://localhost:3000';
const DEFAULT_PROD = 'https://arnalddataflowbackend.grupoproser.com.co';

export const BASE_URL =
  envApiBase || (isDevelopment ? DEFAULT_DEV : DEFAULT_PROD);

// Fallback de uploads en dev (datos/imágenes en servidor de producción)
export const PROD_URL =
  trimOrigin(import.meta.env.VITE_UPLOADS_BASE_URL) || DEFAULT_PROD;

export const isDevelopmentEnv = isDevelopment;

console.log(`🔧 Entorno detectado: ${isDevelopment ? 'DESARROLLO' : 'PRODUCCIÓN'}`);
console.log(`🌐 URL base API: ${BASE_URL}`);

/**
 * Devuelve candidatos de URL para recursos subidos (por ejemplo `/uploads/...`).
 * - En PROD: solo usa `BASE_URL`
 * - En DEV: intenta primero `BASE_URL` (localhost) y si no existe, permite fallback a `PROD_URL`
 */
export function getUploadsUrlCandidates(rutaOrUrl) {
  if (!rutaOrUrl || typeof rutaOrUrl !== 'string') return [];

  if (rutaOrUrl.startsWith('data:') || rutaOrUrl.startsWith('blob:')) return [rutaOrUrl];

  if (rutaOrUrl.startsWith('http://') || rutaOrUrl.startsWith('https://')) return [rutaOrUrl];

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

export async function apiRequest(endpoint, options = {}) {
  try {
    const url = `${BASE_URL}/api${endpoint}`;

    console.log(`🌐 ${options.method || 'GET'} ${url}`);

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
  console.log('🔧 === CONFIGURACIÓN ACTUAL ===');
  console.log(`📍 Entorno: ${isDevelopmentEnv ? 'DESARROLLO' : 'PRODUCCIÓN'}`);
  console.log(`🌐 URL Base API: ${BASE_URL}`);
  console.log(`🏠 Hostname: ${window.location.hostname}`);
  console.log(`🔌 Puerto: ${window.location.port}`);
  console.log('===============================');
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
