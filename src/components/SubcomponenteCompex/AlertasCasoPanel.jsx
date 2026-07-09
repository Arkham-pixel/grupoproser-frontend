import React, { useEffect, useState } from 'react';
import { FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import { obtenerAlertasCaso } from '../../services/alertasComplexService.js';

export default function AlertasCasoPanel({ numeroAjuste, casoId }) {
  const [alertas, setAlertas] = useState(null);
  const [loading, setLoading] = useState(false);

  const identificador = numeroAjuste || casoId;

  useEffect(() => {
    if (!identificador) return;
    let activo = true;
    setLoading(true);
    obtenerAlertasCaso(identificador)
      .then((data) => {
        if (activo) setAlertas(data);
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, [identificador]);

  if (loading || !alertas?.totalAlertas) return null;

  const altas = alertas.alertas.filter((a) => a.prioridad === 'ALTA');

  return (
    <div
      className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/20"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <FaExclamationTriangle className="mt-0.5 shrink-0 text-fenix-primario" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-white">
            {alertas.totalAlertas} alerta(s) de protocolo
            {altas.length > 0 ? ` · ${altas.length} prioridad alta` : ''}
          </p>
          <ul className="mt-2 space-y-1.5">
            {alertas.alertas.slice(0, 4).map((a, i) => (
              <li key={`${a.tipo}-${i}`} className="text-sm text-gray-700 dark:text-gray-300">
                {a.mensaje}
              </li>
            ))}
            {alertas.alertas.length > 4 && (
              <li className="text-xs text-gray-500">+ {alertas.alertas.length - 4} más en Mis alertas</li>
            )}
          </ul>
        </div>
        <FaInfoCircle className="hidden shrink-0 text-gray-400 sm:block" title="Protocolo Arnald" />
      </div>
    </div>
  );
}
