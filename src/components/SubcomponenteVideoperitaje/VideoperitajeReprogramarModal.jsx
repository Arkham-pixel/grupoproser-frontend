import React, { useEffect, useState } from 'react';
import { reprogramarSesionVideoperitaje } from '../../services/videoperitajeService.js';
import {
  datetimeLocalBogotaToIso,
  formatFechaHoraBogota,
  isoToDatetimeLocalBogota,
} from '../../utils/videoperitajeFecha.js';
import { vpBtnGhost, vpBtnPrimary, vpInput, vpLabel } from './videoperitajeUi.js';

export default function VideoperitajeReprogramarModal({ sesion, open, onClose, onDone }) {
  const [programadaAt, setProgramadaAt] = useState('');
  const [notificar, setNotificar] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !sesion) return;
    setProgramadaAt(isoToDatetimeLocalBogota(sesion.programadaAt) || '');
    setNotificar(true);
    setError('');
  }, [open, sesion]);

  if (!open || !sesion) return null;

  const handleGuardar = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await reprogramarSesionVideoperitaje(sesion._id, {
        programadaAt: programadaAt ? datetimeLocalBogotaToIso(programadaAt) : null,
        notificar,
      });
      onDone?.(r);
      onClose?.();
    } catch (err) {
      setError(err.message || 'No se pudo reprogramar');
    } finally {
      setBusy(false);
    }
  };

  const preview = programadaAt
    ? formatFechaHoraBogota(datetimeLocalBogotaToIso(programadaAt))
    : 'Sin hora (se puede entrar de inmediato)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-950">
        <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">
          Reprogramar videollamada
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {sesion.expediente || sesion.aseguradoNombre || 'Sesión'}
          {sesion.programadaAt
            ? ` · actual: ${formatFechaHoraBogota(sesion.programadaAt)}`
            : ' · sin hora programada'}
        </p>

        <label className="mt-4 block">
          <span className={vpLabel}>Nueva fecha y hora (Colombia)</span>
          <input
            className={vpInput}
            type="datetime-local"
            value={programadaAt}
            onChange={(e) => setProgramadaAt(e.target.value)}
          />
          <span className="mt-1 block text-xs text-gray-500">
            Quedará: <strong>{preview}</strong>. Vacío = sin programación (entrada inmediata).
          </span>
        </label>

        <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={notificar}
            onChange={(e) => setNotificar(e.target.checked)}
          />
          Avisar al asegurado (WhatsApp / correo con la nueva hora)
        </label>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={vpBtnGhost} onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className={vpBtnPrimary} onClick={handleGuardar} disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>

        {notificar && (
          <p className="mt-3 break-all text-xs text-gray-400">
            Se generará un enlace nuevo al guardar.
            {sesion.celular ? ` Celular: ${sesion.celular}` : ''}
            {sesion.email ? ` · Email: ${sesion.email}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

