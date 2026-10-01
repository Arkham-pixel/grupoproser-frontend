import { useEffect, useRef } from 'react';
import { AUTOSAVE_DEBOUNCE_MS } from '../config/autoSaveConfig.js';
import { checkConnectivity } from '../services/connectivityService.js';
import { setAutosaveUiStatus } from '../services/autosaveOfflineService.js';
import {
  guardarInformeUnicoEnCasoAlfa,
  guardarLiquidadorEnCasoAlfa,
} from '../services/segurosAlfaService.js';
import { scoreContenidoLiquidadorNsr } from '../components/SubcomponenteEvaluacionSismicaNSR10/protegerPresupuestoNsr10.js';

const TAB_INFORME = 'informe';

/**
 * Autoguardado del workspace Seguros Alfa (liquidador / informe).
 * Generación (seq): un PUT en vuelo con snapshot viejo no pisa uno más nuevo
 * (p. ej. borrar ítems mientras aún guardaba la versión anterior).
 */
export default function useAlfaCasoAutosave({
  casoId,
  casoAlfa,
  tabActivo,
  liquidadorState,
  totalesState,
  informeState,
  onCasoActualizado,
  enabled = true,
} = {}) {
  const casoRef = useRef(casoAlfa);
  const savingRef = useRef(false);
  const pendingFlushRef = useRef(null);
  const lastLiqSnap = useRef('');
  const lastInfSnap = useRef('');
  const readyRef = useRef(false);
  const liqGenRef = useRef(0);
  const infGenRef = useRef(0);
  const liquidadorRef = useRef(liquidadorState);
  const informeRef = useRef(informeState);

  casoRef.current = casoAlfa;
  liquidadorRef.current = liquidadorState;
  informeRef.current = informeState;

  useEffect(() => {
    readyRef.current = false;
    lastLiqSnap.current = '';
    lastInfSnap.current = '';
    liqGenRef.current = 0;
    infGenRef.current = 0;
    pendingFlushRef.current = null;
  }, [casoId]);

  useEffect(() => {
    if (liquidadorState) liqGenRef.current += 1;
  }, [liquidadorState]);

  useEffect(() => {
    if (informeState) infGenRef.current += 1;
  }, [informeState]);

  useEffect(() => {
    if (!enabled || !casoId) return undefined;

    const timers = [];

    const persist = async (payload, genAtSchedule) => {
      if (!payload?.data) return;
      const isInf = payload.tipo === 'informe';
      const genNow = () => (isInf ? infGenRef.current : liqGenRef.current);
      // Ya hay una edición más nueva: descartar este snapshot
      if (genAtSchedule !== genNow()) return;

      if (savingRef.current) {
        pendingFlushRef.current = { payload, gen: genAtSchedule };
        return;
      }

      const online = await checkConnectivity();
      if (!online) {
        setAutosaveUiStatus({
          state: 'offline',
          message: 'Sin conexión — cambios pendientes de guardar',
        });
        pendingFlushRef.current = { payload, gen: genAtSchedule };
        return;
      }

      if (genAtSchedule !== genNow()) return;

      savingRef.current = true;
      setAutosaveUiStatus({ state: 'saving', message: 'Guardando…' });
      try {
        const base = casoRef.current || {};
        let actualizado;
        if (isInf) {
          actualizado = await guardarInformeUnicoEnCasoAlfa({
            casoId,
            informeUnico: payload.data,
            casoBase: {
              ...base,
              liquidador: liquidadorRef.current || base.liquidador,
            },
          });
        } else if (scoreContenidoLiquidadorNsr(payload.data) === 0) {
          lastLiqSnap.current = JSON.stringify(payload.data);
          setAutosaveUiStatus({ state: 'idle', message: '' });
          return;
        } else {
          actualizado = await guardarLiquidadorEnCasoAlfa({
            casoId,
            liquidador: payload.data,
            totales: payload.totales || {},
            casoBase: {
              ...base,
              informeUnico: informeRef.current || base.informeUnico,
            },
          });
        }

        if (genAtSchedule !== genNow()) {
          // Llegó tarde: no actualizar snap ni caso (el pendiente/nuevo guardado manda)
          return;
        }

        if (isInf) lastInfSnap.current = JSON.stringify(payload.data);
        else lastLiqSnap.current = JSON.stringify(payload.data);

        onCasoActualizado?.(actualizado);
        setAutosaveUiStatus({
          state: 'synced',
          pendingCount: 0,
          message: 'Sincronizado',
        });
      } catch (err) {
        console.error('Autoguardado Alfa:', err);
        setAutosaveUiStatus({
          state: 'error',
          message: err?.message || 'Error al sincronizar',
        });
      } finally {
        savingRef.current = false;
        const pending = pendingFlushRef.current;
        pendingFlushRef.current = null;
        if (pending?.payload && pending.gen === genNow()) {
          timers.push(setTimeout(() => persist(pending.payload, pending.gen), 0));
        }
      }
    };

    const scheduleSave = (payload) => {
      if (!payload?.data) return;
      const snap = JSON.stringify(payload.data);
      const isInf = payload.tipo === 'informe';
      const prevSnap = isInf ? lastInfSnap.current : lastLiqSnap.current;
      const genAtSchedule = isInf ? infGenRef.current : liqGenRef.current;

      if (!readyRef.current) {
        readyRef.current = true;
      }
      if (!prevSnap) {
        if (isInf) lastInfSnap.current = snap;
        else lastLiqSnap.current = snap;
        return;
      }
      if (snap === prevSnap) return;

      const timer = setTimeout(() => {
        persist(payload, genAtSchedule);
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
  ]);

  useEffect(() => {
    if (!enabled || !casoId) return undefined;
    const onOnline = async () => {
      const ok = await checkConnectivity({ force: true });
      const pending = pendingFlushRef.current;
      if (!ok || !pending?.payload || savingRef.current) return;
      pendingFlushRef.current = null;
      const { payload, gen } = pending;
      const isInf = payload.tipo === 'informe';
      const genNow = isInf ? infGenRef.current : liqGenRef.current;
      if (gen !== genNow) return;

      savingRef.current = true;
      setAutosaveUiStatus({ state: 'syncing', message: 'Sincronizando…' });
      try {
        const base = casoRef.current || {};
        let actualizado;
        if (isInf) {
          actualizado = await guardarInformeUnicoEnCasoAlfa({
            casoId,
            informeUnico: payload.data,
            casoBase: {
              ...base,
              liquidador: liquidadorRef.current || base.liquidador,
            },
          });
          if (gen === infGenRef.current) {
            lastInfSnap.current = JSON.stringify(payload.data);
            onCasoActualizado?.(actualizado);
          }
        } else if (scoreContenidoLiquidadorNsr(payload.data) === 0) {
          lastLiqSnap.current = JSON.stringify(payload.data);
          setAutosaveUiStatus({ state: 'idle', message: '' });
          return;
        } else {
          actualizado = await guardarLiquidadorEnCasoAlfa({
            casoId,
            liquidador: payload.data,
            totales: payload.totales || {},
            casoBase: {
              ...base,
              informeUnico: informeRef.current || base.informeUnico,
            },
          });
          if (gen === liqGenRef.current) {
            lastLiqSnap.current = JSON.stringify(payload.data);
            onCasoActualizado?.(actualizado);
          }
        }
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
  }, [casoId, enabled, onCasoActualizado]);
}
