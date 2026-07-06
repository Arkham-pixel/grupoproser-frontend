import arnaldLogo from '../img/ArnaldDataFlow.png';
import arnaldIcon from '../img/ArnaldIcon.png';
import logoProser from '../img/Logo.png';

async function urlABase64(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Logos embebibles en HTML/PDF autónomo (base64) */
export async function cargarAssetsReporte() {
  try {
    const [logoPlataforma, iconoPlataforma, logoEmpresa] = await Promise.all([
      urlABase64(arnaldLogo),
      urlABase64(arnaldIcon),
      urlABase64(logoProser),
    ]);
    return {
      logoPlataforma,
      iconoPlataforma,
      logoEmpresa,
      arnaldLogoUrl: arnaldLogo,
      arnaldIconUrl: arnaldIcon,
      logoEmpresaUrl: logoProser,
    };
  } catch (error) {
    console.warn('No se pudieron cargar los logos del reporte:', error);
    return {
      logoPlataforma: null,
      iconoPlataforma: null,
      logoEmpresa: null,
      arnaldLogoUrl: arnaldLogo,
      arnaldIconUrl: arnaldIcon,
      logoEmpresaUrl: logoProser,
    };
  }
}
