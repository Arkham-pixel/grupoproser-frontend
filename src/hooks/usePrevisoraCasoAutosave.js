import { useEffect, useRef } from 'react';
import { AUTOSAVE_DEBOUNCE_MS } from '../config/autoSaveConfig.js';
import { checkConnectivity } from '../services/connectivityService.js';
import { setAutosaveUiStatus } from '../services/autosaveOfflineService.js';
import {
  guardarInformeUnicoEnCasoPrevisora,
  guardarLiquidadorEnCasoPrevisora,
} from '../services/previsoraService.js';
import { liquidadorParaPersistir } from '../components/SubcomponenteEvaluacionSismicaNSR10/protegerPresupuestoNsr10.js';
import { normalizarTipoInformePrevisora } from '../components/SubcomponentePrevisora/liquidadorPrevisoraHelpers.js';

const TAB_INFORME = 'informe';

/** Comparación barata: evita JSON.stringify de base64 y del checklist NSR-10. */
function snapDataParaComparar(tipo, data) {
  if (!data || typeof data !== 'object') return '';
  if (tipo === 'informe') {
    const {
      imagenMapa,
      fotosInspeccion,
      fotosCotizacion,
      filasPolizaCobertura,
      actaAjustadorFirmaImagen,
      firmaAjustador,
      ...rest
    } = data;
    const firmaLen = (v) =>
      typeof v === 'string' && v ? `len:${v.length}:${v.slice(0, 16)}` : '';
    return JSON.stringify({
      ...rest,
      imagenMapa: firmaLen(imagenMapa),
      actaAjustadorFirmaImagen: firmaLen(actaAjustadorFirmaImagen),
      firmaAjustador: firmaLen(firmaAjustador),
      fotosInspeccion: (Array.isArray(fotosInspeccion) ? fotosInspeccion : []).map(
        (f) => f?._id || f?.ruta || f?.nombreOriginal || f?.nombre || ''
      ),
      fotosCotizacion: (Array.isArray(fotosCotizacion) ? fotosCotizacion : []).map(
        (f) => f?._id || f?.ruta || f?.page || ''
      ),
      filasPolizaCobertura: (Array.isArray(filasPolizaCobertura)
        ? filasPolizaCobertura
        : []
      ).map(
        (f) =>
          `${f?.concepto || ''}|${String(f?.analisis || '').length}|${String(f?.conclusion || '').length}`
      ),
    });
  }
  return JSON.stringify({
    modelo: data.modelo,
    observaciones: data.observaciones,
    encabezado: data.encabezado,
    nItemsNsr: Array.isArray(data.evaluacionSismicaNSR10?.presupuesto?.items)
      ? data.evaluacionSismicaNSR10.presupuesto.items.length
      : 0,
    nContenidos: Array.isArray(data.evaluacionSismicaNSR10?.contenidos?.items)
      ? data.evaluacionSismicaNSR10.contenidos.items.length
      : 0,
    cotizacionPdf: data.cotizacionPdf
      ? {
          archivoPdf: data.cotizacionPdf.archivoPdf?._id || data.cotizacionPdf.archivoPdf || null,
          paginas: Array.isArray(data.cotizacionPdf.paginas)
            ? data.cotizacionPdf.paginas.length
            : 0,
        }
      : null,
    liquidacionCatastrofico: data.liquidacionCatastrofico,
    otrosAmparos: Array.isArray(data.otrosAmparos) ? data.otrosAmparos.length : 0,
  });
}

/**
 * Autoguardado del workspace Previsora (liquidador / informe)
 * hacia la API, actualizando el indicador de sincronización.
 * El liquidador NSR también se guarda si se edita desde el informe único.
 */
export default function usePrevisoraCasoAutosave({
  casoId,
  casoPrevisora,
  tabActivo,
  liquidadorState,
  totalesState,
  informeState,
  onCasoActualizado,
  enabled = true,
  guardarLiquidador = guardarLiquidadorEnCasoPrevisora,
  guardarInforme = guardarInformeUnicoEnCasoPrevisora,
} = {}) {
  const casoRef = useRef(casoPrevisora);
  const savingRef = useRef(false);
  const pendingFlushRef = useRef(null);
  const lastLiqSnap = useRef('');
  const lastInfSnap = useRef('');
  const readyRef = useRef(false);

  casoRef.current = casoPrevisora;

  useEffect(() => {
    readyRef.current = false;
    lastLiqSnap.current = '';
    lastInfSnap.current = '';
  }, [casoId]);

  useEffect(() => {
    if (!enabled || !casoId) return undefined;

    const timers = [];

    const scheduleSave = (payload) => {
      if (!payload?.data) return;
      const snap = snapDataParaComparar(payload.tipo, payload.data);
      const isInf = payload.tipo === 'informe';
      const prevSnap = isInf ? lastInfSnap.current : lastLiqSnap.current;

      if (!readyRef.current) {
        readyRef.current = true;
      }
      if (!prevSnap) {
        if (isInf) lastInfSnap.current = snap;
        else lastLiqSnap.current = snap;
        return;
      }
      if (snap === prevSnap) return;

      const timer = setTimeout(async () => {
        if (savingRef.current) {
          pendingFlushRef.current = payload;
          return;
        }
        const online = await checkConnectivity();
        if (!online) {
          setAutosaveUiStatus({
            state: 'offline',
            message: 'Sin conexión — cambios pendientes de guardar',
          });
          pendingFlushRef.current = payload;
          return;
        }
        savingRef.current = true;
        setAutosaveUiStatus({ state: 'saving', message: 'Guardando…' });
        try {
          const base = casoRef.current || {};
          let actualizado;
          if (payload.tipo === 'informe') {
            actualizado = await guardarInforme({
              casoId,
              informeUnico: payload.data,
              casoBase: base,
            });
            lastInfSnap.current = snapDataParaComparar(payload.tipo, payload.data);
          } else {
            actualizado = await guardarLiquidador({
              casoId,
              liquidador: liquidadorParaPersistir(
                payload.data,
                base.liquidador
              ),
              totales: payload.totales || {},
              casoBase: base,
            });
            lastLiqSnap.current = snapDataParaComparar(payload.tipo, payload.data);
          }
          onCasoActualizado?.(actualizado);
          setAutosaveUiStatus({
            state: 'synced',
            pendingCount: 0,
            message: 'Sincronizado',
          });
        } catch (err) {
          console.error('Autoguardado Previsora:', err);
          setAutosaveUiStatus({
            state: 'error',
            message: err?.message || 'Error al sincronizar',
          });
        } finally {
          savingRef.current = false;
        }
      }, AUTOSAVE_DEBOUNCE_MS);
      timers.push(timer);
    };

    const tipoInforme = normalizarTipoInformePrevisora(
      informeState?.tipoInforme,
      'unico'
    );
    const esStubNsr =
      !liquidadorState?.evaluacionSismicaNSR10 &&
      Boolean(liquidadorState?.nsrOmitido || casoRef.current?.nsrOmitido);
    const liquidadorUsable =
      liquidadorState &&
      !esStubNsr &&
      !(tabActivo === TAB_INFORME && tipoInforme === 'preliminar');

    if (liquidadorUsable) {
      scheduleSave({
        tipo: 'liquidador',
        data: liquidadorState,
        totales: totalesState,
      });
    }
    if (tabActivo === TAB_INFORME && informeState) {
      scheduleSave({ tipo: 'informe', data: informeState });
    }

    return () => timers.forEach((t) => clearTimeout(t));
  }, [
    casoId,
    enabled,
    tabActivo,
    liquidadorState,
    totalesState,
    informeState,
    onCasoActualizado,
    guardarLiquidador,
    guardarInforme,
  ]);

  useEffect(() => {
    if (!enabled || !casoId) return undefined;
    const onOnline = async () => {
      const ok = await checkConnectivity({ force: true });
      if (!ok || !pendingFlushRef.current || savingRef.current) return;
      const payload = pendingFlushRef.current;
      pendingFlushRef.current = null;
      savingRef.current = true;
      setAutosaveUiStatus({ state: 'syncing', message: 'Sincronizando…' });
      try {
        const base = casoRef.current || {};
        let actualizado;
        if (payload.tipo === 'informe') {
          actualizado = await guardarInforme({
            casoId,
            informeUnico: payload.data,
            casoBase: base,
          });
          lastInfSnap.current = snapDataParaComparar(payload.tipo, payload.data);
        } else {
          actualizado = await guardarLiquidador({
            casoId,
            liquidador: liquidadorParaPersistir(
              payload.data,
              base.liquidador
            ),
            totales: payload.totales || {},
            casoBase: base,
          });
          lastLiqSnap.current = snapDataParaComparar(payload.tipo, payload.data);
        }
        onCasoActualizado?.(actualizado);
        setAutosaveUiStatus({
          state: 'synced',
          pendingCount: 0,
          message: 'Sincronizado',
        });
      } catch (err) {
        setAutosaveUiStatus({
          state: 'error',
          message: err?.message || 'Error al sincronizar',
        });
      } finally {
        savingRef.current = false;
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [casoId, enabled, onCasoActualizado, guardarLiquidador, guardarInforme]);
}
