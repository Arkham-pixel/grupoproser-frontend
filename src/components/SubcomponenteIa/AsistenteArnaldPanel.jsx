import React, { useEffect, useState } from 'react';
import { FaTimes, FaMagic, FaPaperPlane } from 'react-icons/fa';
import { arnaldIaHabilitado } from '../../config/arnaldFeatures.js';
import {
  chatArnaldIa,
  estadoArnaldIa,
  sugerirInformeCasoIa,
} from '../../services/arnaldIaService.js';
import AsistenteArnaldFabIcon from './AsistenteArnaldFabIcon.jsx';
import './asistenteArnaldFab.css';

/**
 * Nube flotante: analiza evidencias del caso y aplica textos al informe automáticamente.
 */
export default function AsistenteArnaldPanel({
  modulo = '',
  casoId = '',
  onAplicarSugerencias,
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [provider, setProvider] = useState('');
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    if (!arnaldIaHabilitado()) return undefined;
    estadoArnaldIa()
      .then((s) => setProviders(s.providers || []))
      .catch(() => setProviders([]));
    return undefined;
  }, []);

  if (!arnaldIaHabilitado()) return null;

  const aplicarAuto = (s) => {
    if (!s || typeof onAplicarSugerencias !== 'function') return false;
    const hay =
      Boolean(s.descripcionDanios?.trim()) ||
      Boolean(s.conclusiones?.trim()) ||
      Boolean(s.recomendacion?.trim());
    if (!hay) return false;
    onAplicarSugerencias(s);
    setAviso('Campos del informe actualizados automáticamente. Revise y guarde.');
    return true;
  };

  const completarInforme = async () => {
    if (!casoId || !modulo) {
      setError('Abra un caso para completar el informe con IA.');
      return;
    }
    setAbierto(true);
    setBusy(true);
    setError('');
    setAviso('');
    setRespuesta('');
    try {
      const r = await sugerirInformeCasoIa({ modulo, casoId });
      setProvider(r.providerName || r.provider || '');
      const s = r.sugerencias || {};
      setRespuesta(
        [
          s.descripcionDanios && `Daños:\n${s.descripcionDanios}`,
          s.conclusiones && `Conclusiones:\n${s.conclusiones}`,
          s.recomendacion && `Recomendación:\n${s.recomendacion}`,
        ]
          .filter(Boolean)
          .join('\n\n') || r.text || ''
      );
      aplicarAuto(s);
    } catch (err) {
      setError(err.message || 'Error IA');
    } finally {
      setBusy(false);
    }
  };

  const enviar = async () => {
    if (!texto.trim()) return;
    const pregunta = texto.trim();
    const pideCampos =
      /conclusion|recomend|completar|llenar|daños|danios|informe|cotizaci/i.test(pregunta);

    if (pideCampos && casoId && modulo) {
      setTexto('');
      await completarInforme();
      return;
    }

    setBusy(true);
    setError('');
    setAviso('');
    setRespuesta('');
    try {
      const r = await chatArnaldIa([{ role: 'user', content: pregunta }], { modulo, casoId });
      setProvider(r.providerName || r.provider || '');
      const extra =
        r.nAdjuntos > 0 ? `\n\n_(Analizó ${r.nAdjuntos} evidencia(s) del caso)_` : '';
      setRespuesta((r.text || '') + extra);
      setTexto('');
    } catch (err) {
      setError(err.message || 'Error IA');
    } finally {
      setBusy(false);
    }
  };

  const fabLabel = abierto ? 'Cerrar asistente Arnald' : 'Abrir asistente Arnald';
  const fabClass = [
    'pointer-events-auto arnald-fab-btn',
    abierto ? 'is-open' : '',
    busy ? 'is-busy' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="arnald-fab-root pointer-events-none fixed right-10 top-[68px] z-[80] flex flex-col items-end gap-3 sm:right-12">
      <button
        type="button"
        className={fabClass}
        onClick={() => setAbierto((v) => !v)}
        aria-label={fabLabel}
        aria-expanded={abierto}
        aria-busy={busy}
        aria-controls="arnald-asistente-panel"
        title={fabLabel}
      >
        <span className="arnald-fab-ring" aria-hidden="true" />
        <AsistenteArnaldFabIcon className="arnald-fab-icon" />
      </button>

      {abierto && (
        <div
          id="arnald-asistente-panel"
          role="dialog"
          aria-label="Asistente Arnald"
          className="pointer-events-auto w-[min(100vw-1.5rem,380px)] max-h-[min(70vh,520px)] overflow-hidden border border-white/60 bg-white/95 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.35)] backdrop-blur-md dark:border-gray-600/60 dark:bg-gray-900/95"
          style={{ borderRadius: '0.5rem 1.75rem 1.75rem 1.75rem' }}
        >
          <div className="flex items-center justify-between bg-gradient-to-r from-[#c8102e] to-[#a00d25] px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold tracking-wide">Asistente Arnald</p>
              <p className="text-[10px] text-white/80">
                Fotos + cotización → llena el informe
                {provider ? ` · ${provider}` : ''}
              </p>
            </div>
            <button
              type="button"
              className="rounded-full p-1.5 hover:bg-white/15"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar asistente"
            >
              <FaTimes />
            </button>
          </div>

          <div className="max-h-[min(58vh,440px)] space-y-2 overflow-y-auto p-3">
            <p className="text-[11px] text-gray-500">
              {providers.length
                ? `IA: ${providers.map((p) => p.name).join(', ')}`
                : 'Configure GEMINI_API_KEY en el backend'}
            </p>

            {casoId && (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-fenix-primario px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                disabled={busy}
                onClick={completarInforme}
              >
                <FaMagic />
                {busy ? 'Analizando y llenando…' : 'Llenar informe automáticamente'}
              </button>
            )}

            <div className="flex gap-2">
              <textarea
                className="min-h-[72px] flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50/90 p-2 text-sm dark:border-gray-700 dark:bg-gray-950"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Pregunta libre…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    enviar();
                  }
                }}
              />
              <button
                type="button"
                className="self-end rounded-2xl bg-gray-900 px-3 py-2 text-white disabled:opacity-40 dark:bg-fenix-primario"
                disabled={busy || !texto.trim()}
                onClick={enviar}
                aria-label="Enviar"
              >
                <FaPaperPlane />
              </button>
            </div>

            {aviso && (
              <p className="rounded-xl bg-green-50 px-2 py-1.5 text-xs font-medium text-green-800 dark:bg-green-950/40 dark:text-green-200">
                {aviso}
              </p>
            )}
            {error && (
              <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded-xl bg-red-50 p-2 text-[11px] text-red-700 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </pre>
            )}
            {respuesta && (
              <div className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-2 text-xs dark:bg-gray-950">
                {respuesta}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
