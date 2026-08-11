import React, { useEffect, useState } from 'react';
import { getSyncStatus, syncPendingChanges, retryFailedSync } from '../../services/syncService.js';
import { estimateStorage, getPendingQueueItems } from '../../services/offlineDatabase.js';
import { offlineDb } from '../../offline/db.js';

export default function SyncPanel({ onClose }) {
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [forms, setForms] = useState([]);
  const [storage, setStorage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setSummary(await getSyncStatus());
    setItems(await getPendingQueueItems());
    const allForms = await offlineDb.forms.toArray();
    setForms(
      allForms
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
        .slice(0, 30)
    );
    setStorage(await estimateStorage());
  };

  useEffect(() => {
    load();
  }, []);

  const syncNow = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await syncPendingChanges({ force: true });
      setMsg(
        res.ok
          ? 'Sincronización completada'
          : res.reason === 'offline'
            ? 'Sin conexión real'
            : `Sincronizado con avisos (${res.failed || 0} errores)`
      );
      await load();
    } catch (e) {
      setMsg(e?.message || 'Error al sincronizar');
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    setBusy(true);
    try {
      await retryFailedSync();
      setMsg('Reintento lanzado');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const pct =
    storage?.quota > 0 ? Math.round((storage.usage / storage.quota) * 100) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 12,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(560px, 100%)',
          maxHeight: '85vh',
          overflow: 'auto',
          background: '#fff',
          borderRadius: 16,
          padding: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Estado de sincronización</h2>
          <button type="button" onClick={onClose} style={{ border: 0, background: 'transparent', fontSize: 20 }}>
            ×
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#64748b' }}>
          Pendientes: {summary?.totalPending ?? '…'} · Formularios cola:{' '}
          {summary?.pendingChanges ?? '…'} · Fotos: {summary?.pendingPhotos ?? '…'} · Adjuntos:{' '}
          {summary?.pendingAttachments ?? '…'}
        </p>
        {pct != null && pct >= 80 ? (
          <p style={{ fontSize: 13, color: '#b45309' }}>
            Almacenamiento local al {pct}%. Libera espacio o sincroniza fotos pendientes.
          </p>
        ) : null}
        {storage?.quota > 0 ? (
          <p style={{ fontSize: 12, color: '#64748b' }}>
            Uso local: {Math.round((storage.usage || 0) / (1024 * 1024))} MB /{' '}
            {Math.round(storage.quota / (1024 * 1024))} MB
          </p>
        ) : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            disabled={busy}
            onClick={syncNow}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 0,
              borderRadius: 8,
              padding: '10px 14px',
              fontWeight: 600,
              minHeight: 44,
            }}
          >
            {busy ? 'Sincronizando…' : 'Sincronizar ahora'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={retry}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '10px 14px',
              fontWeight: 600,
              minHeight: 44,
              background: '#fff',
            }}
          >
            Reintentar fallidos
          </button>
        </div>
        {msg ? <p style={{ fontSize: 13, color: '#0f172a' }}>{msg}</p> : null}

        <h3 style={{ fontSize: 14, marginTop: 8 }}>Formularios locales</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {forms.map((f) => (
            <li
              key={f.id}
              style={{
                borderTop: '1px solid #e2e8f0',
                padding: '10px 0',
                fontSize: 13,
              }}
            >
              <strong>{f.formType}</strong> · {f.caseId || f.historialId || f.id.slice(0, 8)}
              <div style={{ color: '#64748b' }}>
                {f.syncStatus === 'synced' ? '✓ Sincronizado' : `⚠ ${f.syncStatus}`}
                {f.updatedAt ? ` · ${new Date(f.updatedAt).toLocaleString()}` : ''}
              </div>
            </li>
          ))}
          {!forms.length ? (
            <li style={{ color: '#94a3b8', fontSize: 13 }}>Sin copias locales</li>
          ) : null}
        </ul>

        <h3 style={{ fontSize: 14 }}>Cola</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.slice(0, 40).map((it) => (
            <li key={it.id} style={{ borderTop: '1px solid #e2e8f0', padding: '8px 0', fontSize: 12 }}>
              {it.operation} · {it.entityType} · {it.status}
              {it.lastError ? ` · ${it.lastError}` : ''}
            </li>
          ))}
          {!items.length ? (
            <li style={{ color: '#94a3b8', fontSize: 13 }}>Cola vacía</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
