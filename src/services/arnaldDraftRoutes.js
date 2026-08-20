export const ARNALD_AUTO_RESTORE_KEY = 'arnald_auto_restore_formkey';
export const ARNALD_PROMPT_DONE_KEY = 'arnald_draft_prompt_done';
export const ARNALD_PROMPT_LATER_KEY = 'arnald_draft_prompt_later';
export const ARNALD_PROMPT_SCANNED_KEY = 'arnald_draft_prompt_scanned';

/** Borrador creado en esta misma sesión de edición (no preguntar). */
export function esBorradorReciente(savedAt, margenMs = 15000) {
  const saved = new Date(savedAt || 0).getTime();
  if (!Number.isFinite(saved) || saved <= 0) return false;
  return Date.now() - saved < margenMs;
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
