import React from 'react';
import { FaCheckCircle, FaClock, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import { complexHint } from './complexFenixUi';

export default function ProtocoloSeguimientoPanel({ cfg, estado }) {
  if (!cfg) return null;

  const badge = (() => {
    if (estado?.completado) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <FaCheckCircle aria-hidden />
          Fase cerrada
        </span>
      );
    }
    if (estado?.esUrgente) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/40 dark:text-red-300">
          <FaExclamationTriangle aria-hidden />
          Seguimiento vencido
        </span>
      );
    }
    if (estado?.activo) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
          <FaClock aria-hidden />
          Seguimiento activo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        <FaInfoCircle aria-hidden />
        Pendiente de inicio
      </span>
    );
  })();

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-body text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Protocolo — Fase {cfg.fase}
        </p>
        {badge}
      </div>
      <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
        <div>
          <dt className="font-body text-xs text-gray-500 dark:text-gray-400">Plazo</dt>
          <dd className="font-body font-medium text-gray-800 dark:text-gray-200">{cfg.plazo}</dd>
        </div>
        <div>
          <dt className="font-body text-xs text-gray-500 dark:text-gray-400">Responsable</dt>
          <dd className="font-body font-medium text-gray-800 dark:text-gray-200">{cfg.responsable}</dd>
        </div>
        <div className="md:col-span-2">
          <dt className="font-body text-xs text-gray-500 dark:text-gray-400">Entregable / evidencia</dt>
          <dd className="font-body text-gray-700 dark:text-gray-300">{cfg.entregable}</dd>
        </div>
        <div className="md:col-span-2">
          <dt className="font-body text-xs text-gray-500 dark:text-gray-400">Control operativo</dt>
          <dd className="font-body text-gray-700 dark:text-gray-300">{cfg.control}</dd>
        </div>
      </dl>
      {cfg.notaProtocolo && (
        <p className={`${complexHint} mt-3 border-t border-gray-200 pt-3 dark:border-gray-700`}>
          {cfg.notaProtocolo}
        </p>
      )}
    </div>
  );
}
