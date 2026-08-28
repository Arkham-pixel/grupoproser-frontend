import { useEffect, useRef } from 'react';
import { AUTOSAVE_DEBOUNCE_MS } from '../config/autoSaveConfig.js';
import { checkConnectivity } from '../services/connectivityService.js';
import { setAutosaveUiStatus } from '../services/autosaveOfflineService.js';
import {
  guardarInformeAgilEnCasoAllianz,
  guardarInformeUnicoEnCasoAllianz,
  guardarLiquidadorEnCasoAllianz,
} from '../services/allianzService.js';
import { liquidadorParaPersistir } from '../components/SubcomponenteEvaluacionSismicaNSR10/protegerPresupuestoNsr10.js';

const TAB_INFORME = 'informe';
const TAB_AGIL = 'informe-agil';

async function persistirPayload({
  casoId,
  payload,
  casoBase,
  guardarLiquidador,
  guardarInforme,
  guardarInformeAgil,
}) {
  if (payload.tipo === 'informe') {
    return guardarInforme({
      casoId,
      informeUnico: payload.data,
      casoBase,
    });
  }
  if (payload.tipo === 'agil') {
    return guardarInformeAgil({
      casoId,
      informeAgil: payload.data,
      casoBase,
    });
  }
  return guardarLiquidador({
    casoId,
    liquidador: liquidadorParaPersistir(payload.data, casoBase.liquidador),
    totales: payload.totales || {},
    casoBase,
  });
}

function snapKey(tipo) {
  if (tipo === 'informe') return 'informe';
  if (tipo === 'agil') return 'agil';
  return 'liquidador';
}

/**
 * Autoguardado del workspace Allianz (liquidador / informe / informe ágil).
 */
export default function useAllianzCasoAutosave({
  casoId,
  casoAllianz,
  tabActivo,
  liquidadorState,
  totalesState,
  informeState,
  informeAgilState,
  onCasoActualizado,
  enabled = true,
  guardarLiquidador = guardarLiquidadorEnCasoAllianz,
  guardarInforme = guardarInformeUnicoEnCasoAllianz,
  guardarInformeAgil = guardarInformeAgilEnCasoAllianz,
} = {}) {
  const casoRef = useRef(casoAllianz);
  const savingRef = useRef(false);
  const pendingFlushRef = useRef(null);
  const lastSnap = useRef({ liquidador: '', informe: '', agil: '' });
  const readyRef = useRef(false);

  casoRef.current = casoAllianz;

  useEffect(() => {
    readyRef.current = false;
    lastSnap.current = { liquidador: '', informe: '', agil: '' };
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
            guardarInformeAgil,
          });
          lastSnap.current[key] = JSON.stringify(payload.data);
          onCasoActualizado?.(actualizado);
          setAutosaveUiStatus({
            state: 'synced',
            pendingCount: 0,
            message: 'Sincronizado',
          });
        } catch (err) {
          console.error('Autoguardado Allianz:', err);
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
    if (tabActivo === TAB_AGIL && informeAgilState) {
      scheduleSave({ tipo: 'agil', data: informeAgilState });
    }

    return () => timers.forEach((t) => clearTimeout(t));
  }, [
    casoId,
    enabled,
    tabActivo,
    liquidadorState,
    totalesState,
    informeState,
    informeAgilState,
    onCasoActualizado,
    guardarLiquidador,
    guardarInforme,
    guardarInformeAgil,
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
          guardarInformeAgil,
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
  }, [casoId, enabled, onCasoActualizado, guardarLiquidador, guardarInforme, guardarInformeAgil]);
}
