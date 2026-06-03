// Configuración de URLs de la API (legacy; preferir apiConfig.js)
const HOST = typeof window !== 'undefined' ? window.location.hostname : '';
const config = {
  API_BASE_URL:
    HOST === 'aplicacion.grupoproser.com.co'
      ? 'https://aplicacion.grupoproser.com.co'
      : 'https://arnalddataflowbackend.grupoproser.com.co',
};

export default config;