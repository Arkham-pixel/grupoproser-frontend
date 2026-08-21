export const ARNALD_AUTO_RESTORE_KEY = 'arnald_auto_restore_formkey';
export const ARNALD_PROMPT_DONE_KEY = 'arnald_draft_prompt_done';
export const ARNALD_PROMPT_LATER_KEY = 'arnald_draft_prompt_later';
export const ARNALD_PROMPT_SCANNED_KEY = 'arnald_draft_prompt_scanned';

const RUTAS_FORMULARIO_GENERAL = [
  '/complex/agregar',
  '/formularioinspeccion',
  '/ajuste',
  '/reporte-pol',
  '/formulario-maquinaria',
  '/express/carga',
  '/equidad-fdm/carga',
  '/propiedades/carga',
  '/puertos/formulario',
  '/puertos/actas/inspeccion-asegurado/nueva',
  '/puertos/actas/nueva',
  '/puertos/actas/caso/nueva',
  '/seguros-alfa/carga',
  '/zurich/carga',
  '/bbva-cat/carga',
  '/previsora/carga',
  '/allias/carga',
  '/sura/carga',
  '/catastrofico',
  '/riesgos/agregar',
];

function normalizarRuta(pathname = '') {
  const p = String(pathname || '').replace(/\/$/, '');
  return p || '/';
}

/** Alta / formato desde el menú (Formularios u “Agregar caso”), no desde Acciones del reporte. */
export function esRutaFormularioGeneral(pathname = '') {
  const p = normalizarRuta(pathname);
    if (p.includes('/editar')) return false;
    if (p === '/catastrofico') return true;
  return RUTAS_FORMULARIO_GENERAL.some((ruta) => p === ruta || p.startsWith(`${ruta}/`));
}

/** Caso concreto abierto desde Acciones del reporte (liquidador, informe, edición). */
export function esRutaCasoEspecifico(pathname = '', search = '') {
  const p = normalizarRuta(pathname);
  const q = new URLSearchParams(search || '');
  const tieneCaso = Boolean(q.get('casoId') || q.get('id'));
  if (p.startsWith('/editar-caso/')) return true;
  if (p.startsWith('/complex/editar')) return true;
  if (p.startsWith('/sura/editar')) return true;
  if (p.startsWith('/catastrofico/editar')) return true;
  if (p.startsWith('/riesgos/editar')) return true;
  if (p.includes('/editar/')) return true;
  if ((p.endsWith('/caso') || p.includes('/caso')) && tieneCaso) return true;
  if (p.includes('/liquidador') && tieneCaso) return true;
  if (p.includes('/informe-unico') && tieneCaso) return true;
  return false;
}

export function clavePromptGeneral(pathname = '') {
  return `arnald_general_prompted:${normalizarRuta(pathname)}`;
}

export function describirBorrador(formKey = '', titulo = '') {
  if (titulo) return titulo;
  const k = String(formKey);
  if (k.startsWith('alfa-ws:')) return 'Seguros Alfa · liquidador / informe';
  if (k === 'alfa:nuevo') return 'Seguros Alfa · caso nuevo';
  if (k.startsWith('alfa:')) return 'Seguros Alfa · caso';
  if (k.startsWith('zurich-ws:')) return 'Zurich · liquidador / informe';
  if (k.includes('zurich:') && k.endsWith(':nuevo')) return 'Zurich · caso nuevo';
  if (k.startsWith('zurich:')) return 'Zurich · caso';
  if (k.startsWith('bbva-cat-listado-ws:')) return 'BBVA CAT · listado / liquidador / informe';
  if (k.startsWith('bbva-cat-ws:')) return 'BBVA CAT · liquidador / informe';
  if (k.includes('bbva-cat:') && k.endsWith(':nuevo')) return 'BBVA CAT · caso nuevo';
  if (k.startsWith('bbva-cat:')) return 'BBVA CAT · caso';
  if (k.startsWith('previsora-listado-ws:')) return 'Previsora · listado / liquidador / informe';
  if (k.startsWith('previsora-ws:')) return 'Previsora · liquidador / informe';
  if (k.includes('previsora:') && k.endsWith(':nuevo')) return 'Previsora · caso nuevo';
  if (k.startsWith('previsora:')) return 'Previsora · caso';
  if (k.startsWith('allias-listado-ws:')) return 'Allias · listado / liquidador / informe';
  if (k.startsWith('allias-ws:')) return 'Allias · liquidador / informe';
  if (k.includes('allias:') && k.endsWith(':nuevo')) return 'Allias · caso nuevo';
  if (k.startsWith('allias:')) return 'Allias · caso';
  if (k.startsWith('sura-ws:')) return 'Sura · workspace del caso';
  if (k === 'formulario-sura-nuevo') return 'Sura · caso nuevo';
  if (k.startsWith('formulario-sura-')) return 'Sura · caso';
  if (k === 'formulario-complex-nuevo') return 'Complex · caso nuevo';
  if (k.startsWith('formulario-complex-')) return 'Complex · caso';
  if (k === 'equidad-fdm:nuevo') return 'Equidad FDM · caso nuevo';
  if (k.startsWith('equidad-fdm-liq:')) return 'Equidad FDM · liquidador';
  if (k.startsWith('equidad-fdm:')) return 'Equidad FDM · caso';
  if (k === 'catastrofico:nuevo') return 'Formulario catastrófico';
  if (k.startsWith('catastrofico:')) return 'Formulario catastrófico';
  return k || 'Formulario';
}

export function rutaDesdeFormKey(formKey = '') {
  const k = String(formKey);
  if (k === 'formulario-complex-nuevo') return '/complex/agregar';
  if (k.startsWith('formulario-complex-')) {
    return `/editar-caso/${k.slice('formulario-complex-'.length)}`;
  }
  if (k === 'formulario-sura-nuevo') return '/sura/carga';
  if (k.startsWith('formulario-sura-')) return '/sura/editar';
  if (k.startsWith('alfa-ws:')) return `/seguros-alfa/caso?casoId=${k.slice('alfa-ws:'.length)}`;
  if (k === 'alfa:nuevo') return '/seguros-alfa/carga';
  if (k.startsWith('alfa:')) return `/seguros-alfa/caso?casoId=${k.slice('alfa:'.length)}`;
  if (k.startsWith('zurich-ws:')) return `/zurich/caso?casoId=${k.slice('zurich-ws:'.length)}`;
  if (k.startsWith('zurich:listado')) return '/zurich/carga';
  if (k.startsWith('zurich:')) return '/zurich/caso';
  if (k.startsWith('bbva-cat-listado-ws:')) return `/bbva-cat/listado/caso?casoId=${k.slice('bbva-cat-listado-ws:'.length)}`;
  if (k.startsWith('bbva-cat-ws:')) return `/bbva-cat/caso?casoId=${k.slice('bbva-cat-ws:'.length)}`;
  if (k.startsWith('bbva-cat:listado')) return '/bbva-cat/carga';
  if (k.startsWith('bbva-cat:')) return '/bbva-cat/caso';
  if (k.startsWith('previsora-listado-ws:')) return `/previsora/listado/caso?casoId=${k.slice('previsora-listado-ws:'.length)}`;
  if (k.startsWith('previsora-ws:')) return `/previsora/caso?casoId=${k.slice('previsora-ws:'.length)}`;
  if (k.startsWith('previsora:listado')) return '/previsora/carga';
  if (k.startsWith('previsora:')) return '/previsora/caso';
  if (k.startsWith('allias-listado-ws:')) return `/allias/listado/caso?casoId=${k.slice('allias-listado-ws:'.length)}`;
  if (k.startsWith('allias-ws:')) return `/allias/liquidador?casoId=${k.slice('allias-ws:'.length)}`;
  if (k.startsWith('allias:listado')) return '/allias/carga';
  if (k.startsWith('allias:')) return '/allias/liquidador';
  if (k.startsWith('sura-ws:')) return `/sura/caso?casoId=${k.slice('sura-ws:'.length)}`;
  if (k === 'equidad-fdm:nuevo') return '/equidad-fdm/carga';
  if (k.startsWith('equidad-fdm-liq:')) {
    return `/equidad-fdm/liquidador?casoId=${k.slice('equidad-fdm-liq:'.length)}`;
  }
  if (k.startsWith('equidad-fdm:')) return '/equidad-fdm/carga';
  if (k === 'catastrofico:nuevo') return '/catastrofico';
  if (k.startsWith('catastrofico:')) {
    const id = k.slice('catastrofico:'.length);
    return id && id !== 'nuevo' ? `/catastrofico/editar/${id}` : '/catastrofico';
  }
  return '/inicio';
}
