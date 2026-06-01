import { useState, useEffect } from 'react';

/**
 * Hook para manejar Google Identity Services Token Client
 * Se asegura de cargar el SDK y de inicializar el client solo cuando window.google esté disponible
 */
export function useDriveToken() {
  const [tokenClient, setTokenClient] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    // Carga dinámica del SDK si no está presente
    const loadGisScript = () => {
      if (window.google && window.google.accounts) {
        initTokenClient();
      } else {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initTokenClient;
        document.body.appendChild(script);
      }
    };

    // Inicializa el Token Client cuando el SDK esté listo
    const initTokenClient = () => {
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        console.error('Google Identity Services SDK no está disponible');
        return;
      }
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: 'TU_CLIENT_ID.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive.file',
        hosted_domain: 'proserpuertos.com.co',
        callback: (resp) => {
          if (resp.error) {
            console.error('Error obteniendo token:', resp);
          } else {
            setAccessToken(resp.access_token);
          }
        },
      });
      setTokenClient(client);
    };

    loadGisScript();
  }, []);

  /**
   * Solicita al usuario autorización de token
   */
  const requestAccess = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } else {
      console.warn('TokenClient no está inicializado aún');
    }
  };

  return { accessToken, requestAccess };
}
