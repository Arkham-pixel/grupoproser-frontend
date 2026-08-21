import { useCallback, useEffect, useRef, useState } from 'react';
import { getDocumentosSharePointAlfa } from '../services/segurosAlfaService.js';

const POLL_NORMAL_MS = 45000;
const POLL_FAST_MS = 12000;
const BOOST_DURATION_MS = 2 * 60 * 1000;

const PRE_SYNC = new Set(['pending', 'syncing', 'pending_destination']);

/**
 * Poll del estado ClaimDocument → SharePoint para un caso Alfa.
 * Detecta transiciones a synced y permite acelerar el poll tras una subida.
 */
export default function useAlfaSharePointSyncStatus(casoId, { enabled = true } = {}) {
  const [summary, setSummary] = useState(null);
  const [syncByArchivoId, setSyncByArchivoId] = useState({});
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [justSynced, setJustSynced] = useState([]);
  const [pollMs, setPollMs] = useState(POLL_NORMAL_MS);

  const prevStatusRef = useRef(null);
  const boostUntilRef = useRef(0);
  const boostTimerRef = useRef(null);

  const applyPayload = useCallback((data) => {
    const docs = Array.isArray(data?.documents) ? data.documents : [];
    const map = {};
    for (const doc of docs) {
      map[String(doc.archivoId)] = {
        ...(doc.sync || { status: 'none' }),
        nombre: doc.nombre,
      };
    }

    const prev = prevStatusRef.current;
    if (prev) {
      const newly = [];
      for (const [id, sync] of Object.entries(map)) {
        const before = prev[id]?.status;
        const after = sync.status;
        if (after === 'synced' && PRE_SYNC.has(before)) {
          newly.push({
            archivoId: id,
            nombre: sync.nombre || docs.find((d) => String(d.archivoId) === id)?.nombre || 'documento',
            webUrl: sync.webUrl || null,
            path: sync.path || null,
          });
        }
      }
      if (newly.length) {
        setJustSynced((cur) => {
          const seen = new Set(cur.map((x) => x.archivoId));
          const merged = [...cur];
          for (const n of newly) {
            if (!seen.has(n.archivoId)) merged.push(n);
          }
          return merged;
        });
      }
    }
    prevStatusRef.current = map;
    setSyncByArchivoId(map);
    setDocuments(docs);
    setSummary(data?.summary || null);
  }, []);

  const refresh = useCallback(async () => {
    if (!casoId || !enabled) return null;
    setLoading(true);
    setError(null);
    try {
      const data = await getDocumentosSharePointAlfa(casoId);
      applyPayload(data);
      return data;
    } catch (err) {
      setError(err?.message || 'SharePoint status unavailable');
      return null;
    } finally {
      setLoading(false);
    }
  }, [applyPayload, casoId, enabled]);

  const boostPolling = useCallback(() => {
    boostUntilRef.current = Date.now() + BOOST_DURATION_MS;
    setPollMs(POLL_FAST_MS);
    if (boostTimerRef.current) clearTimeout(boostTimerRef.current);
    boostTimerRef.current = setTimeout(() => {
      if (Date.now() >= boostUntilRef.current) setPollMs(POLL_NORMAL_MS);
    }, BOOST_DURATION_MS + 50);
    // Refresco inmediato
    refresh();
  }, [refresh]);

  const clearJustSynced = useCallback(() => setJustSynced([]), []);

  const dismissJustSynced = useCallback((archivoId) => {
    setJustSynced((cur) => cur.filter((x) => x.archivoId !== archivoId));
  }, []);

  useEffect(() => {
    prevStatusRef.current = null;
    setSummary(null);
    setSyncByArchivoId({});
    setDocuments([]);
    setJustSynced([]);
    setPollMs(POLL_NORMAL_MS);
  }, [casoId]);

  useEffect(() => {
    if (!casoId || !enabled) return undefined;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await refresh();
    };
    tick();
    const timer = setInterval(tick, pollMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [casoId, enabled, pollMs, refresh]);

  useEffect(
    () => () => {
      if (boostTimerRef.current) clearTimeout(boostTimerRef.current);
    },
    []
  );

  const pendingTotal =
    (summary?.pending || 0) +
    (summary?.syncing || 0) +
    (summary?.pending_destination || 0);
  const hasActivity =
    Boolean(summary) &&
    ((summary.synced || 0) > 0 ||
      pendingTotal > 0 ||
      (summary.failed || 0) > 0 ||
      (summary.disabled || 0) > 0);

  return {
    summary,
    syncByArchivoId,
    documents,
    loading,
    error,
    refresh,
    boostPolling,
    justSynced,
    clearJustSynced,
    dismissJustSynced,
    hasActivity,
    pendingTotal,
    pollMs,
  };
}
