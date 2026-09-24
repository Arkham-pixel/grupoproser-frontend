import React, { useEffect, useState } from 'react';
import {
  asignarSesionACasoVideoperitaje,
  buscarCasosVideoperitaje,
  listarModulosCasoVideoperitaje,
} from '../../services/videoperitajeService.js';
import { vpBtnGhost, vpBtnPrimary, vpInput, vpLabel } from './videoperitajeUi.js';

const MODULOS_FALLBACK = [
  { id: 'bbva-cat', label: 'BBVA CAT' },
  { id: 'bbva-cat-listado', label: 'BBVA CAT listado' },
  { id: 'seguros-alfa', label: 'Seguros Alfa' },
  { id: 'zurich', label: 'Zurich' },
  { id: 'allianz', label: 'Allianz' },
  { id: 'previsora', label: 'Previsora' },
  { id: 'equidad-cat', label: 'Equidad CAT' },
];

/**
 * Asigna una sesión creada sin caso a un expediente de módulo CAT/etc.
 */
export default function VideoperitajeAsignarCasoModal({ open, sesion, onClose, onAssigned }) {
  const [modulos, setModulos] = useState(MODULOS_FALLBACK);
  const [modulo, setModulo] = useState('bbva-cat');
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState([]);
  const [casoId, setCasoId] = useState('');
  const [busy, setBusy] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setQ('');
    setResultados([]);
    setCasoId('');
    setBusy(false);
    listarModulosCasoVideoperitaje()
      .then((r) => {
        if (r.data?.length) setModulos(r.data);
      })
      .catch(() => {});
  }, [open, sesion?._id]);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setResultados([]);
      return undefined;
    }
    let cancel = false;
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const r = await buscarCasosVideoperitaje({ modulo, q: q.trim(), limit: 20 });
        if (!cancel) {
          setResultados(r.data || []);
          setCasoId('');
        }
      } catch (err) {
        if (!cancel) setError(err.message);
      } finally {
        if (!cancel) setBuscando(false);
      }
    }, 320);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [open, modulo, q]);

  if (!open || !sesion) return null;

  const asignar = async () => {
    if (!casoId) {
      setError('Seleccione un caso de la lista');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await asignarSesionACasoVideoperitaje(sesion._id, { modulo, casoId });
      onAssigned?.(r);
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-950">
        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">
          Asignar a un caso
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Esta videollamada se hizo sin caso. Elija el módulo y el expediente para adjuntar
          fotos/videos al archivo.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Sesión: {sesion.expediente || sesion.aseguradoNombre || sesion._id}
        </p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className={vpLabel}>Módulo</span>
            <select
              className={vpInput}
              value={modulo}
              onChange={(e) => {
                setModulo(e.target.value);
                setResultados([]);
                setCasoId('');
              }}
            >
              {modulos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={vpLabel}>Buscar caso (expediente, siniestro, asegurado)</span>
            <input
              className={vpInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Escriba al menos 2 caracteres…"
              autoFocus
            />
          </label>

          <div className="max-h-56 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
            {buscando && <p className="p-3 text-sm text-gray-500">Buscando…</p>}
            {!buscando && q.trim().length >= 2 && resultados.length === 0 && (
              <p className="p-3 text-sm text-gray-500">Sin resultados</p>
            )}
            {!buscando &&
              resultados.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  className={`block w-full border-b border-gray-100 px-3 py-2 text-left text-sm last:border-0 dark:border-gray-800 ${
                    casoId === c._id
                      ? 'bg-fenix-primario/10 font-semibold text-fenix-primario'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                  onClick={() => setCasoId(c._id)}
                >
                  {c.etiqueta}
                </button>
              ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={vpBtnGhost} onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button
              type="button"
              className={vpBtnPrimary}
              disabled={busy || !casoId}
              onClick={asignar}
            >
              {busy ? 'Asignando…' : 'Asignar y adjuntar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
