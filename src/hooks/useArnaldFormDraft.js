import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { registerArnaldDraftFlusher } from '../services/arnaldDraftFlushRegistry.js';
import {
  borrarBorradorLocal,
  escribirBorradorLocal,
  leerBorradorLocal,
} from '../services/arnaldDraftLocalStore.js';
import {
  ARNALD_AUTO_RESTORE_KEY,
  esRutaCasoEspecifico,
  esRutaFormularioGeneral,
} from '../services/arnaldDraftRoutes.js';
import {
  eliminarBorradorArnald,
  guardarBorradorArnald,
  obtenerBorradorArnald,
} from '../services/arnaldPlataformaService.js';

function snapshot(data) {
  try {
    return JSON.stringify(data ?? {});
  } catch {
    return '';
  }
}

function esPayloadVacio(data) {
  const snap = snapshot(data);
  return !snap || snap === '{}' || snap === 'null' || snap === '[]';
}

function elegirMasReciente(local, remoto) {
  if (local?.payload && !remoto?.payload) return { ...local, source: 'local' };
  if (remoto?.payload && !local?.payload) return { ...remoto, source: 'server' };
  if (!local?.payload && !remoto?.payload) return null;
  const tLocal = new Date(local.savedAt || 0).getTime();
  const tRemoto = new Date(remoto.savedAt || 0).getTime();
  return tLocal >= tRemoto
    ? { ...local, source: 'local' }
    : { ...remoto, source: 'server' };
}

/**
 * Borrador a prueba de cierre de sesión: primero disco local, luego Mongo, con reintento.
 */
export default function useArnaldFormDraft({
  formKey,
  modulo = 'plataforma',
  recursoId = '',
  titulo = '',
  formData,
  enabled = true,
  debounceMs = 800,
  shouldSkipSaveRef = null,
  onRestoreAvailable = null,
} = {}) {
  const [draftStatus, setDraftStatus] = useState('idle');
  const [lastDraftAt, setLastDraftAt] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const location = useLocation();
  const formDataRef = useRef(formData);
  const baselineRef = useRef('');
  const restoredPromptRef = useRef('');
  const skipNextPersistRef = useRef(false);
  const onRestoreAvailableRef = useRef(onRestoreAvailable);
  const mountedAtRef = useRef(Date.now());

  useEffect(() => {
    onRestoreAvailableRef.current = onRestoreAvailable;
  }, [onRestoreAvailable]);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    baselineRef.current = snapshot(formData);
    restoredPromptRef.current = '';
    mountedAtRef.current = Date.now();
    setHydrated(false);
    const t = setTimeout(() => setHydrated(true), 900);
    return () => clearTimeout(t);
  }, [formKey]);

  const persist = useCallback(
    async ({ keepalive = false, force = false } = {}) => {
      if (!enabled || !formKey) return null;
      if (!force && shouldSkipSaveRef?.current) return null;
      if (skipNextPersistRef.current && !force) {
        skipNextPersistRef.current = false;
        return null;
      }
      const data = formDataRef.current;
      if (!force && esPayloadVacio(data)) return null;
      const snap = snapshot(data);
      if (!force && snap === baselineRef.current) return null;

      const localOk = escribirBorradorLocal(formKey, data);
      if (localOk) {
        baselineRef.current = snap;
        setLastDraftAt(new Date());
        setDraftStatus(keepalive ? 'saved' : 'saving');
      }

      try {
        const res = await guardarBorradorArnald({
          formKey,
          modulo,
          recursoId,
          titulo,
          payload: data,
          keepalive,
        });
        baselineRef.current = snap;
        const when = res?.savedAt ? new Date(res.savedAt) : new Date();
        setLastDraftAt(when);
        setDraftStatus('saved');
        escribirBorradorLocal(formKey, data);
        return res;
      } catch (error) {
        // El borrador local ya quedó; 401/403 tras refresh se loguea una sola vez por racha
        if (error?.message && /401|403/.test(error.message)) {
          if (!persist._authWarned) {
            persist._authWarned = true;
            console.warn(
              '⚠️ Borrador Arnald solo en local (sesión vencida o sin permiso de sync).'
            );
          }
        } else {
          console.error('❌ Error sincronizando borrador Arnald:', error);
        }
        setDraftStatus(localOk ? 'saved' : 'error');
        return localOk ? { ok: true, local: true } : null;
      }
    },
    [enabled, formKey, modulo, recursoId, titulo, shouldSkipSaveRef]
  );

  useEffect(() => {
    if (!enabled || !formKey || !hydrated) return undefined;
    const timer = setTimeout(() => {
      persist();
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [enabled, formKey, formData, debounceMs, persist, hydrated]);

  useEffect(() => {
    return registerArnaldDraftFlusher(() => persist({ keepalive: true, force: true }));
  }, [persist]);

  useEffect(() => {
    if (!enabled || !formKey) return undefined;
    const onHide = () => {
      persist({ keepalive: true, force: true });
    };
    const onOnline = () => persist({ force: true });
    const onVis = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    const onSalirCampo = (event) => {
      const el = event.target;
      if (!el) return;
      const tag = String(el.tagName || '').toUpperCase();
      const esCampo =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el.isContentEditable;
      if (esCampo) persist();
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('focusout', onSalirCampo, true);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('focusout', onSalirCampo, true);
      window.removeEventListener('online', onOnline);
    };
  }, [enabled, formKey, persist]);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      const avisar = onRestoreAvailableRef.current;
      if (!enabled || !formKey || !avisar) return;
      if (restoredPromptRef.current === formKey) return;
      const local = leerBorradorLocal(formKey);
      let remoto = null;
      try {
        remoto = await obtenerBorradorArnald(formKey);
      } catch {
        remoto = null;
      }
      if (cancelado) return;
      const elegido = elegirMasReciente(local, remoto);
      if (!elegido?.payload || esPayloadVacio(elegido.payload)) return;
      const autoApply = sessionStorage.getItem(ARNALD_AUTO_RESTORE_KEY) === formKey;
      if (autoApply) sessionStorage.removeItem(ARNALD_AUTO_RESTORE_KEY);
      const enMenuFormulario = esRutaFormularioGeneral(location.pathname);
      const enCaso = esRutaCasoEspecifico(location.pathname, location.search);
      if (!autoApply && enMenuFormulario) return;
      if (!autoApply && !enCaso) return;
      const draftSnap = snapshot(elegido.payload);
      if (!autoApply && draftSnap === baselineRef.current) return;
      if (!autoApply && draftSnap === snapshot(formDataRef.current)) return;
      if (!autoApply && new Date(elegido.savedAt || 0).getTime() >= mountedAtRef.current - 1000) {
        return;
      }
      restoredPromptRef.current = formKey;
      avisar({
        data: elegido.payload,
        metadata: {
          savedAt: elegido.savedAt,
          formKey,
          source: elegido.source,
          autoApply,
        },
      });
    };
    const t = setTimeout(cargar, 1100);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [enabled, formKey, location.pathname, location.search]);

  const discardDraft = useCallback(async () => {
    if (!formKey) return;
    borrarBorradorLocal(formKey);
    try {
      await eliminarBorradorArnald(formKey);
    } catch {
      // el local ya se limpió
    }
    setDraftStatus('idle');
    setLastDraftAt(null);
  }, [formKey]);

  const consumeDraft = useCallback(
    async (restoredPayload) => {
      if (restoredPayload && typeof restoredPayload === 'object') {
        baselineRef.current = snapshot(restoredPayload);
      }
      skipNextPersistRef.current = true;
      await discardDraft();
    },
    [discardDraft]
  );

  return {
    draftStatus,
    lastDraftAt,
    saveDraftNow: persist,
    discardDraft,
    consumeDraft,
  };
}
