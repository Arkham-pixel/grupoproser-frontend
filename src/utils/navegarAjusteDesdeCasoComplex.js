import historialService, { TIPOS_FORMULARIOS } from '../services/historialService.js';
import { buildPrefillAjusteDesdeCasoComplex } from './prefillAjusteDesdeCasoComplex.js';

const normalizarClaveCaso = (valor) =>
  String(valor || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

/**
 * Versión del formulario de ajuste que corresponde a la etapa de una subtarea.
 * Si la etapa no tiene versión propia se devuelve '' y el formulario abre en
 * la última versión guardada.
 */
export function estadoAjusteDesdeEtapaSubtarea(etapa) {
  const mapa = {
    inspeccion: 'actaInspeccion',
    informePreliminar: 'inicial',
    ultimoDocumento: 'actualizacion',
    reporteActividades: 'actualizacion',
    informeFinal: 'informeFinal',
    presentacionCifras: 'informeFinal',
  };
  return mapa[String(etapa || '').trim()] || '';
}

/**
 * Misma lógica que el botón «Ajuste» del reporte Complex.
 * @param {import('react-router-dom').NavigateFunction} navigate
 * @param {object} caso
 * @param {object} [opts]
 * @param {string} [opts.returnPath]
 * @param {string} [opts.origen]
 * @param {string} [opts.estadoInicial] Versión del ajuste a abrir (p. ej. 'inicial'
 *   para informe preliminar). Si se omite, el formulario abre en la última
 *   versión guardada.
 */
export async function navegarAjusteDesdeCasoComplex(navigate, caso, opts = {}) {
  const numeroSiniestro = caso?.nmroSinstro || '';
  const numeroCaso = caso?.nmroAjste || caso?.numero_ajuste || '';
  const complexId = caso?._id || caso?.casoId || '';
  const numeroCasoNormalizado = normalizarClaveCaso(numeroCaso);
  const returnPath = opts.returnPath || '/complex/mis-subtareas';

  const stateRetorno = {
    complexId,
    numeroSiniestro,
    numeroCaso,
    nmroSinstro: numeroSiniestro,
    nmroAjste: numeroCaso,
    origen: opts.origen || 'subtarea-complex',
    ...(opts.estadoInicial ? { estadoInicial: opts.estadoInicial } : {}),
    returnPath,
    prefillDesdeCaso: buildPrefillAjusteDesdeCasoComplex(caso),
  };

  try {
    if (numeroCasoNormalizado) {
      const secuenciaResp =
        await historialService.obtenerSecuenciaPorNumeroAjuste(numeroCasoNormalizado);
      const idDesdeSecuencia =
        secuenciaResp?.formularioId || secuenciaResp?.secuencia?.formularioId;
      if (idDesdeSecuencia) {
        navigate(`/ajuste/editar/${idDesdeSecuencia}`, { state: stateRetorno });
        return;
      }
    }

    const historialAjustes = await historialService.obtenerHistorial({
      tipo: TIPOS_FORMULARIOS.AJUSTE,
      limite: 1000,
    });

    const ajustesMismoCaso = (Array.isArray(historialAjustes) ? historialAjustes : [])
      .filter((f) => {
        const posiblesClaves = [
          f?.numeroCaso,
          f?.datos?.numeroCaso,
          f?.datos?.numeroAjuste,
          f?.datos?.nmroAjste,
          f?.datos?.metadata?.numeroAjuste,
          f?.trazabilidadSecuencia?.numeroAjuste,
        ]
          .map(normalizarClaveCaso)
          .filter(Boolean);
        return posiblesClaves.includes(numeroCasoNormalizado);
      })
      .sort((a, b) => {
        const fa = new Date(
          a?.fechaModificacion || a?.updatedAt || a?.fechaCreacion || 0
        ).getTime();
        const fb = new Date(
          b?.fechaModificacion || b?.updatedAt || b?.fechaCreacion || 0
        ).getTime();
        return fb - fa;
      });

    if (ajustesMismoCaso.length > 0) {
      const idExistente = ajustesMismoCaso[0]?._id || ajustesMismoCaso[0]?.id;
      if (idExistente) {
        navigate(`/ajuste/editar/${idExistente}`, { state: stateRetorno });
        return;
      }
    }
  } catch (error) {
    console.warn(
      '⚠️ No se pudo validar continuidad de ajuste, se abrirá modo nuevo:',
      error?.message || error
    );
  }

  navigate('/ajuste', { state: stateRetorno });
}
