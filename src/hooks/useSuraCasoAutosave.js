import { useEffect, useRef } from 'react';
import { AUTOSAVE_DEBOUNCE_MS } from '../config/autoSaveConfig.js';
import { checkConnectivity } from '../services/connectivityService.js';
import { setAutosaveUiStatus } from '../services/autosaveOfflineService.js';
import { serializarFotosAgilSura } from '../components/SubcomponenteSura/informeAgilSuraHelpers.js';
import { sincronizarFotosAgilEnInformeCaso } from '../components/SubcomponenteSura/syncFotosNsrAlInformeSura.js';
import {
  guardarInformeUnicoEnCasoSura,
  guardarLiquidadorEnCasoSura,
  guardarSeccionCasoSura,
} from '../services/segurosSuraService.js';
import { fusionarLiquidadorSinPerderPresupuestoNsr } from '../components/SubcomponenteEvaluacionSismicaNSR10/protegerPresupuestoNsr10.js';

const TAB_DOCUMENTOS = new Set(['informe', 'informe-unico', 'documentos']);
const TAB_AGIL = new Set(['informe-agil']);
const TAB_SALVAMENTO = new Set(['salvamento']);
const TAB_FOTOS = new Set(['fotos']);

function serializarSnap(data) {
  try {
    return JSON.stringify(data);
  } catch (err) {
    console.error('Autoguardado Sura: no se pudo serializar', err);
    return `dirty:${Date.now()}`;
  }
}

/**
 * Autoguardado del workspace Sura (presupuesto / documentos / informe ágil / fotos / salvamento).
 */
export default function useSuraCasoAutosave({
  casoId,
  casoSura,
  tabActivo,
  liquidadorState,
  totalesState,
  informeState,
  informeAgilState,
  salvamentoState,
  fotosAgilState,
  onCasoActualizado,
  enabled = true,
} = {}) {
  const casoRef = useRef(casoSura);
  const savingRef = useRef(false);
  const pendingFlushRef = useRef(null);
  const lastSnap = useRef({ liquidador: '', informe: '', agil: '', salvamento: '', fotos: '' });
  const readyRef = useRef(false);

  casoRef.current = casoSura;

  useEffect(() => {
    readyRef.current = false;
    lastSnap.current = { liquidador: '', informe: '', agil: '', salvamento: '', fotos: '' };
  }, [casoId]);

  useEffect(() => {
    if (!enabled || !casoId) return undefined;

    const timers = [];

    const persist = async (payload) => {
      const base = casoRef.current || {};
      if (payload.tipo === 'informe') {
        return guardarInformeUnicoEnCasoSura({
          casoId,
          informeUnico: payload.data,
          casoBase: base,
        });
      }
      if (payload.tipo === 'agil') {
        return guardarSeccionCasoSura({
          casoId,
          casoBase: base,
          patch: { informeAgil: payload.data },
        });
      }
      if (payload.tipo === 'salvamento') {
        return guardarSeccionCasoSura({
          casoId,
          casoBase: base,
          patch: { salvamento: payload.data },
        });
      }
      if (payload.tipo === 'fotos') {
        return sincronizarFotosAgilEnInformeCaso({
          casoId,
          casoBase: base,
          fotosAgil: payload.data,
        });
      }
      return guardarLiquidadorEnCasoSura({
        casoId,
        liquidador: fusionarLiquidadorSinPerderPresupuestoNsr(
          payload.data,
          base.liquidador
        ),
        totales: payload.totales || {},
        casoBase: base,
      });
    };

    const scheduleSave = (payload) => {
      if (!payload?.data) return;
      const snap = serializarSnap(payload.data);
      const key = payload.tipo;
      const prevSnap = lastSnap.current[key];

      if (!readyRef.current) readyRef.current = true;
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
          const actualizado = await persist(payload);
          lastSnap.current[key] = serializarSnap(payload.data);
          onCasoActualizado?.(actualizado);
          setAutosaveUiStatus({
            state: 'synced',
            pendingCount: 0,
            message: 'Sincronizado',
          });
        } catch (err) {
          console.error('Autoguardado Sura:', err);
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
      scheduleSave({ tipo: 'liquidador', data: liquidadorState, totales: totalesState });
    }
    if (TAB_DOCUMENTOS.has(tabActivo) && informeState) {
      scheduleSave({ tipo: 'informe', data: informeState });
    }
    if (TAB_AGIL.has(tabActivo) && informeAgilState) {
      scheduleSave({ tipo: 'agil', data: informeAgilState });
    }
    if (TAB_SALVAMENTO.has(tabActivo) && salvamentoState) {
      scheduleSave({ tipo: 'salvamento', data: salvamentoState });
    }
    if (TAB_FOTOS.has(tabActivo) && Array.isArray(fotosAgilState)) {
      scheduleSave({ tipo: 'fotos', data: serializarFotosAgilSura(fotosAgilState) });
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
    salvamentoState,
    fotosAgilState,
    onCasoActualizado,
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
          actualizado = await guardarInformeUnicoEnCasoSura({
            casoId,
            informeUnico: payload.data,
            casoBase: base,
          });
        } else if (payload.tipo === 'agil') {
          actualizado = await guardarSeccionCasoSura({
            casoId,
            casoBase: base,
            patch: { informeAgil: payload.data },
          });
        } else if (payload.tipo === 'salvamento') {
          actualizado = await guardarSeccionCasoSura({
            casoId,
            casoBase: base,
            patch: { salvamento: payload.data },
          });
        } else if (payload.tipo === 'fotos') {
          actualizado = await sincronizarFotosAgilEnInformeCaso({
            casoId,
            casoBase: base,
            fotosAgil: payload.data,
          });
        } else {
          actualizado = await guardarLiquidadorEnCasoSura({
            casoId,
            liquidador: fusionarLiquidadorSinPerderPresupuestoNsr(
              payload.data,
              base.liquidador
            ),
            totales: payload.totales || {},
            casoBase: base,
          });
        }
        lastSnap.current[payload.tipo] = serializarSnap(payload.data);
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
  }, [casoId, enabled, onCasoActualizado]);
}
