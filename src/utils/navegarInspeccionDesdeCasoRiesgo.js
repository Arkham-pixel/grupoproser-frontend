import historialService, { TIPOS_FORMULARIOS } from '../services/historialService.js';
import { buildPrefillInspeccionDesdeCasoRiesgo } from './prefillInspeccionDesdeCasoRiesgo.js';

const normalizarClave = (valor) =>
  String(valor || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

const idDeFormulario = (f) => f?._id || f?.id || null;

const listaFormularios = (resp) => {
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.formularios)) return resp.formularios;
  return [];
};

/**
 * Misma idea que el botón «Ajuste» de Complex: abre el informe de inspección
 * con datos del cliente precargados desde el caso de riesgo.
 *
 * @param {import('react-router-dom').NavigateFunction} navigate
 * @param {object} caso
 * @param {object} [opts]
 * @param {string} [opts.returnPath]
 * @param {string} [opts.origen]
 * @param {array} [opts.aseguradoras]
 * @param {array} [opts.ciudades]
 */
export async function navegarInspeccionDesdeCasoRiesgo(navigate, caso, opts = {}) {
  const casoId = String(caso?._id || caso?.id_riesgo || caso?.id || caso?.casoId || '').trim();
  const nmroRiesgo = String(caso?.nmroRiesgo || '').trim();
  const nmroNormalizado = normalizarClave(nmroRiesgo);
  const returnPath = opts.returnPath || '/riesgos/exportar';

  const prefill = buildPrefillInspeccionDesdeCasoRiesgo(caso, {
    aseguradoras: opts.aseguradoras || [],
    ciudades: opts.ciudades || [],
  });

  const stateRetorno = {
    ...prefill,
    casoId: casoId || prefill.casoId || '',
    nmroRiesgo: nmroRiesgo || prefill.nmroRiesgo || '',
    origen: opts.origen || 'reporte-riesgo',
    returnPath,
    desdeRiesgo: true,
    prefillDesdeCaso: prefill,
  };

  try {
    if (casoId) {
      const porCaso = await historialService.obtenerFormulariosPorCaso(casoId);
      const inspeccionExistente = listaFormularios(porCaso)
        .filter((h) => h?.tipo === TIPOS_FORMULARIOS.INSPECCION)
        .sort((a, b) => {
          const fa = new Date(a?.fechaModificacion || a?.updatedAt || a?.fechaCreacion || 0).getTime();
          const fb = new Date(b?.fechaModificacion || b?.updatedAt || b?.fechaCreacion || 0).getTime();
          return fb - fa;
        })[0];

      const idExistente = idDeFormulario(inspeccionExistente);
      if (idExistente) {
        navigate(`/formularioinspeccion/editar/${idExistente}`, { state: stateRetorno });
        return;
      }
    }

    if (nmroNormalizado || casoId) {
      const historialInspecciones = await historialService.obtenerHistorial({
        tipo: TIPOS_FORMULARIOS.INSPECCION,
        limite: 1000,
      });

      const mismas = listaFormularios(historialInspecciones)
        .filter((f) => {
          const datos = f?.datos || {};
          const claves = [
            f?.casoId,
            datos.casoId,
            datos.nmroRiesgo,
            datos.numeroCaso,
            f?.numeroCaso,
          ]
            .map(normalizarClave)
            .filter(Boolean);
          return (
            (casoId && claves.includes(normalizarClave(casoId))) ||
            (nmroNormalizado && claves.includes(nmroNormalizado))
          );
        })
        .sort((a, b) => {
          const fa = new Date(a?.fechaModificacion || a?.updatedAt || a?.fechaCreacion || 0).getTime();
          const fb = new Date(b?.fechaModificacion || b?.updatedAt || b?.fechaCreacion || 0).getTime();
          return fb - fa;
        });

      const idExistente = idDeFormulario(mismas[0]);
      if (idExistente) {
        navigate(`/formularioinspeccion/editar/${idExistente}`, { state: stateRetorno });
        return;
      }
    }
  } catch (error) {
    console.warn(
      '⚠️ No se pudo validar continuidad del informe de inspección, se abrirá modo nuevo:',
      error?.message || error
    );
  }

  navigate('/formularioinspeccion', { state: stateRetorno });
}
