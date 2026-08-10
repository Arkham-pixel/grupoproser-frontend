import historialService, { TIPOS_FORMULARIOS } from '../../services/historialService.js';
import {
  AIU_PORCENTAJE_DEFAULT,
  claveUbicacionDesdeFormulario,
} from './catalogoPresupuestoCatastrofico.js';

const fechaFormulario = (f) => {
  const raw =
    f?.fechaCreacion ||
    f?.createdAt ||
    f?.fechaModificacion ||
    f?.updatedAt ||
    f?.datos?.fechaCreacion ||
    0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
};

/**
 * Busca el primer informe catastrófico guardado en la misma ciudad+ubicacionRiesgo.
 * @param {{ ciudad?: string, ubicacionRiesgo?: string, excluirHistorialId?: string|null }} opts
 * @returns {Promise<null|{ fuenteId: string, items: array, aiuPorcentaje: number, asegurado: string, numeroCaso: string, clave: string }>}
 */
export async function buscarTarifarioUbicacionCatastrofico({
  ciudad,
  ubicacionRiesgo,
  excluirHistorialId = null,
} = {}) {
  const clave = claveUbicacionDesdeFormulario({ ciudad, ubicacionRiesgo });
  if (!clave) return null;

  let formularios = [];
  try {
    formularios = await historialService.obtenerHistorial({
      tipo: TIPOS_FORMULARIOS.CATASTROFICO,
      limite: 1000,
    });
  } catch (error) {
    console.warn('⚠️ No se pudo cargar historial para tarifario por ubicación:', error?.message || error);
    return null;
  }

  const excluir = String(excluirHistorialId || '').trim();
  const mismos = (Array.isArray(formularios) ? formularios : [])
    .filter((f) => {
      const id = String(f?._id || f?.id || '').trim();
      if (excluir && id && id === excluir) return false;
      const datos = f?.datos || f || {};
      return claveUbicacionDesdeFormulario(datos) === clave;
    })
    .filter((f) => {
      const items = f?.datos?.presupuestoCatastrofico?.items || f?.presupuestoCatastrofico?.items;
      return Array.isArray(items) && items.length > 0;
    })
    .sort((a, b) => fechaFormulario(a) - fechaFormulario(b));

  const primero = mismos[0];
  if (!primero) return null;

  const datos = primero.datos || primero;
  const presupuesto = datos.presupuestoCatastrofico || {};
  return {
    fuenteId: String(primero._id || primero.id || ''),
    items: presupuesto.items || [],
    aiuPorcentaje:
      presupuesto.aiuPorcentaje != null ? presupuesto.aiuPorcentaje : AIU_PORCENTAJE_DEFAULT,
    asegurado: datos.asegurado || primero.asegurado || '',
    numeroCaso: datos.numeroCaso || primero.numeroCaso || '',
    clave,
  };
}
