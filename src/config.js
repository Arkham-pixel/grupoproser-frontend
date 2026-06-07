// Configuración de URLs de la API (legacy; preferir apiConfig.js)
import { API_BY_FRONTEND_HOST, DEFAULT_PROD_BACKEND } from './config/platformUrls.js';

const HOST = typeof window !== 'undefined' ? window.location.hostname : '';
const config = {
  API_BASE_URL: API_BY_FRONTEND_HOST[HOST] || DEFAULT_PROD_BACKEND,
};

export default config;
