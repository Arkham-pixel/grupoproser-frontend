import { useEffect, useRef } from 'react';
import { AUTOSAVE_DEBOUNCE_MS } from '../config/autoSaveConfig.js';
import { checkConnectivity } from '../services/connectivityService.js';
import { setAutosaveUiStatus } from '../services/autosaveOfflineService.js';
import {
  guardarInformeUnicoEnCasoEquidadCat,
  guardarLiquidadorEnCasoEquidadCat,
} from '../services/equidadCatService.js';

const TAB_INFORME = 'informe';

async function persistirPayload({
  casoId,
  payload,
  casoBase,
  guardarLiquidador,
  guardarInforme,
}) {
  if (payload.tipo === 'informe') {
    return guardarInforme({
      casoId,
      informeUnico: payload.data,
      casoBase,
    });
  }
  return guardarLiquidador({
    casoId,
    liquidador: payload.data,
    totales: payload.totales || {},
    casoBase,
  });
}

function snapKey(tipo) {
  return tipo === 'informe' ? 'informe' : 'liquidador';
}

/**
 * Autoguardado del workspace Equidad CAT (liquidador FDM / informe único).
 */
export default function useEquidadCatCasoAutosave({
  casoId,
  casoEquidadCat,
  tabActivo,
  liquidadorState,
  totalesState,
  informeState,
  onCasoActualizado,
  enabled = true,
  guardarLiquidador = guardarLiquidadorEnCasoEquidadCat,
  guardarInforme = guardarInformeUnicoEnCasoEquidadCat,
} = {}) {
  const casoRef = useRef(casoEquidadCat);
  const savingRef = useRef(false);
  const pendingFlushRef = useRef(null);
  const lastSnap = useRef({ liquidador: '', informe: '' });
  const readyRef = useRef(false);

  casoRef.current = casoEquidadCat;

  useEffect(() => {
    readyRef.current = false;
    lastSnap.current = { liquidador: '', informe: '' };
  }, [casoId]);

  useEffect(() => {
    if (!enabled || !casoId) return undefined;

    const timers = [];

    const scheduleSave = (payload) => {
      if (!payload?.data) return;
      const key = snapKey(payload.tipo);
      const snap = JSON.stringify(payload.data);
      const prevSnap = lastSnap.current[key];

      if (!readyRef.current) {
        readyRef.current = true;
      }
      if (!prevSnap) {
        lastSnap.current[key] = snap;
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
          const actualizado = await persistirPayload({
            casoId,
            payload,
            casoBase: casoRef.current || {},
            guardarLiquidador,
            guardarInforme,
          });
          lastSnap.current[key] = JSON.stringify(payload.data);
          onCasoActualizado?.(actualizado);
          setAutosaveUiStatus({
            state: 'synced',
            pendingCount: 0,
            message: 'Sincronizado',
          });
        } catch (err) {
          console.error('Autoguardado Equidad CAT:', err);
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
        const actualizado = await persistirPayload({
          casoId,
          payload,
          casoBase: casoRef.current || {},
          guardarLiquidador,
          guardarInforme,
        });
        lastSnap.current[snapKey(payload.tipo)] = JSON.stringify(payload.data);
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
