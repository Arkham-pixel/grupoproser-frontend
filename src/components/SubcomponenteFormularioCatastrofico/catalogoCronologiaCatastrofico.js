/**
 * Cronologías fijas por departamento / evento catastrófico.
 * Varía según el departamento del caso (Córdoba ≠ La Guajira ≠ Atlántico…).
 * Si no hay plantilla en código, se reutiliza la imagen del primer caso
 * guardado en ese departamento (igual que el tarifario por ubicación).
 */
import cronologiaInundacionesCordoba2026 from '../../assets/catastrofico/cronologia-inundaciones-cordoba-2026.jpg';
import historialService, { TIPOS_FORMULARIOS } from '../../services/historialService.js';

export const CATALOGO_CRONOLOGIA_CATASTROFICO = [
  {
    id: 'inundaciones-cordoba-rio-sinu-2026',
    departamento: 'Córdoba',
    nombre: 'Inundaciones Córdoba / Río Sinú (2026)',
    aliases: [
      'cordoba',
      'córdoba',
      'desbordamiento rio sinu',
      'desbordamiento río sinú',
      'inundacion cordoba',
      'inundación córdoba',
      'rio sinu',
      'río sinú',
      'monteria',
      'montería',
      'lorica',
      'cerete',
      'cereté',
    ],
    imagenUrl: cronologiaInundacionesCordoba2026,
    leyenda: 'Diagrama cronología de la emergencia',
  },
  // Agregar aquí más departamentos cuando exista la infografía:
  // { id: '...', departamento: 'La Guajira', nombre: '...', aliases: [...], imagenUrl: ..., leyenda: '...' },
];

export const normalizarTextoCronologia = (v) =>
  String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

export function claveDepartamentoCronologia(departamento) {
  return normalizarTextoCronologia(departamento);
}

export function obtenerCronologiaPorId(id) {
  return CATALOGO_CRONOLOGIA_CATASTROFICO.find((c) => c.id === id) || null;
}

export function listarCronologiasCatalogo() {
  return [...CATALOGO_CRONOLOGIA_CATASTROFICO];
}

function matchPorDepartamento(departamento) {
  const dep = claveDepartamentoCronologia(departamento);
  if (!dep) return null;
  return (
    CATALOGO_CRONOLOGIA_CATASTROFICO.find(
      (c) => claveDepartamentoCronologia(c.departamento) === dep
    ) || null
  );
}

function matchPorAliases(haystack) {
  const h = normalizarTextoCronologia(haystack);
  if (!h) return null;
  return (
    CATALOGO_CRONOLOGIA_CATASTROFICO.find((c) =>
      (c.aliases || []).some((a) => h.includes(normalizarTextoCronologia(a)))
    ) || null
  );
}

/**
 * Resuelve la cronología del caso.
 * Prioridad:
 * 1) Imagen ya fijada en el formulario (imagenCronologia)
 * 2) Id explícito de catálogo
 * 3) Departamento del caso
 * 4) Aliases (solo si ayudan a inferir departamento; no fuerza Córdoba)
 * No cae al de Córdoba si el departamento es otro.
 */
export function resolverCronologiaCatastrofico(formData = {}) {
  const imagenFija = formData.imagenCronologia;
  if (imagenFija && typeof imagenFija === 'string' && imagenFija.trim()) {
    return {
      id: formData.cronologiaCatastroficoId || 'custom-departamento',
      departamento: formData.departamento || '',
      nombre:
        formData.cronologiaNombre ||
        `Cronología ${formData.departamento || 'personalizada'}`,
      imagenUrl: imagenFija,
      leyenda: formData.cronologiaLeyenda || 'Diagrama cronología de la emergencia',
      origen: 'formulario',
    };
  }

  const idSel = String(formData.cronologiaCatastroficoId || '').trim();
  if (idSel && idSel !== 'custom-departamento') {
    const porId = obtenerCronologiaPorId(idSel);
    if (porId) return { ...porId, origen: 'catalogo' };
  }

  const porDep = matchPorDepartamento(formData.departamento);
  if (porDep) return { ...porDep, origen: 'departamento' };

  // Si aún no hay departamento, intentar inferir por ciudad/evento
  // pero NO devolver Córdoba por defecto ante cualquier caso.
  const haystack = [
    formData.departamento,
    formData.ciudad,
    formData.tipoEvento,
    formData.tipoSiniestro,
    formData.ubicacionRiesgo,
  ].join(' ');
  const porAlias = matchPorAliases(haystack);
  if (porAlias) {
    // Solo aceptar alias si no contradice un departamento ya escrito
    const depForm = claveDepartamentoCronologia(formData.departamento);
    const depCat = claveDepartamentoCronologia(porAlias.departamento);
    if (!depForm || depForm === depCat) {
      return { ...porAlias, origen: 'alias' };
    }
  }

  return null;
}

export async function cargarImagenCronologiaComoDataUrl(cronologia) {
  if (!cronologia?.imagenUrl) return null;
  const src = cronologia.imagenUrl;
  if (typeof src === 'string' && src.startsWith('data:')) return src;
  try {
    const resp = await fetch(src);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Busca en historial la primera cronología fijada para el mismo departamento.
 * Así un catastrófico en La Guajira reutiliza la imagen del primer caso de La Guajira.
 */
export async function buscarCronologiaPorDepartamento({
  departamento,
  excluirHistorialId = null,
} = {}) {
  const clave = claveDepartamentoCronologia(departamento);
  if (!clave) return null;

  let formularios = [];
  try {
    formularios = await historialService.obtenerHistorial({
      tipo: TIPOS_FORMULARIOS.CATASTROFICO,
      limite: 1000,
    });
  } catch (error) {
    console.warn(
      '⚠️ No se pudo cargar historial para cronología por departamento:',
      error?.message || error
    );
    return null;
  }

  const excluir = String(excluirHistorialId || '').trim();
  const mismos = (Array.isArray(formularios) ? formularios : [])
    .filter((f) => {
      const id = String(f?._id || f?.id || '').trim();
      if (excluir && id && id === excluir) return false;
      const datos = f?.datos || f || {};
      return claveDepartamentoCronologia(datos.departamento) === clave;
    })
    .filter((f) => {
      const datos = f?.datos || f || {};
      const img = datos.imagenCronologia;
      return typeof img === 'string' && img.trim().length > 0;
    })
    .sort((a, b) => {
      const ta = new Date(a?.fechaCreacion || a?.createdAt || 0).getTime();
      const tb = new Date(b?.fechaCreacion || b?.createdAt || 0).getTime();
      return ta - tb;
    });

  const primero = mismos[0];
  if (!primero) return null;
  const datos = primero.datos || primero;
  return {
    id: datos.cronologiaCatastroficoId || 'custom-departamento',
    departamento: datos.departamento || departamento,
    nombre:
      datos.cronologiaNombre ||
      `Cronología ${datos.departamento || departamento}`,
    imagenUrl: datos.imagenCronologia,
    leyenda: datos.cronologiaLeyenda || 'Diagrama cronología de la emergencia',
    origen: 'historial',
    fuenteId: String(primero._id || primero.id || ''),
  };
}
