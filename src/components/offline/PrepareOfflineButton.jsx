/**
 * Botón para prefetch de caso/formulario a IndexedDB.
 */
import React, { useState } from 'react';
import { prepareCaseOffline } from '../../services/offlinePrepareService.js';
import { OFFLINE_FIRST_ENABLED } from '../../config/autoSaveConfig.js';

export default function PrepareOfflineButton({
  caseId,
  caseNumber,
  formType,
  historialId,
  caseMeta,
  catalogos,
  className = '',
  style = {},
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  if (!OFFLINE_FIRST_ENABLED) return null;

  const onClick = async () => {
    setBusy(true);
    setMsg('');
    try {
      await prepareCaseOffline({
        caseId,
        caseNumber,
        formType,
        historialId,
        caseMeta,
        catalogos,
      });
      setMsg('Listo para trabajar sin conexión');
    } catch (e) {
      setMsg(e?.message || 'No se pudo preparar offline');
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  return (
    <div className={className} style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <button
        type="button"
        disabled={busy}
        onClick={onClick}
        style={{
          minHeight: 40,
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #cbd5e1',
          background: '#fff',
          fontWeight: 600,
          fontSize: 13,
          cursor: busy ? 'wait' : 'pointer',
          ...style,
        }}
        title="Descarga el caso y el formulario a este dispositivo"
      >
        {busy ? 'Preparando…' : 'Preparar para trabajar sin conexión'}
      </button>
      {msg ? <span style={{ fontSize: 12, color: '#047857' }}>{msg}</span> : null}
    </div>
  );
}
