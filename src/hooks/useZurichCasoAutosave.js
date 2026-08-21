import { useEffect, useRef } from 'react';
import { AUTOSAVE_DEBOUNCE_MS } from '../config/autoSaveConfig.js';
import { checkConnectivity } from '../services/connectivityService.js';
import { setAutosaveUiStatus } from '../services/autosaveOfflineService.js';
import {
  guardarInformeUnicoEnCasoZurich,
  guardarLiquidadorEnCasoZurich,
} from '../services/zurichService.js';
import { fusionarLiquidadorSinPerderPresupuestoNsr } from '../components/SubcomponenteEvaluacionSismicaNSR10/protegerPresupuestoNsr10.js';

const TAB_INFORME = 'informe';

/**
 * Autoguardado del workspace Zurich (liquidador / informe)
 * hacia la API, actualizando el indicador de sincronización.
 * El liquidador NSR también se guarda si se edita desde el informe único.
 */
export default function useZurichCasoAutosave({
  casoId,
  casoZurich,
  tabActivo,
  liquidadorState,
  totalesState,
  informeState,
  onCasoActualizado,
  enabled = true,
  guardarLiquidador = guardarLiquidadorEnCasoZurich,
  guardarInforme = guardarInformeUnicoEnCasoZurich,
} = {}) {
  const casoRef = useRef(casoZurich);
  const savingRef = useRef(false);
  const pendingFlushRef = useRef(null);
  const lastLiqSnap = useRef('');
  const lastInfSnap = useRef('');
  const readyRef = useRef(false);

  casoRef.current = casoZurich;

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
      const snap = JSON.stringify(payload.data);
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
            lastInfSnap.current = JSON.stringify(payload.data);
          } else {
            actualizado = await guardarLiquidador({
              casoId,
              liquidador: fusionarLiquidadorSinPerderPresupuestoNsr(
                payload.data,
                base.liquidador
              ),
              totales: payload.totales || {},
              casoBase: base,
            });
            lastLiqSnap.current = JSON.stringify(payload.data);
          }
          onCasoActualizado?.(actualizado);
          setAutosaveUiStatus({
            state: 'synced',
            pendingCount: 0,
            message: 'Sincronizado',
          });
        } catch (err) {
          console.error('Autoguardado Zurich:', err);
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

    // Siempre vigilar liquidador (también desde tab informe con modoLiquidador)
    if (liquidadorState) {
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
          lastInfSnap.current = JSON.stringify(payload.data);
        } else {
          actualizado = await guardarLiquidador({
            casoId,
            liquidador: fusionarLiquidadorSinPerderPresupuestoNsr(
              payload.data,
              base.liquidador
            ),
            totales: payload.totales || {},
            casoBase: base,
          });
          lastLiqSnap.current = JSON.stringify(payload.data);
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
