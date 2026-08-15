import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getBaseTerremotoFdmStatus,
  checkBaseTerremotoFdm,
  dismissBaseTerremotoFdmNotification,
  getBaseTerremotoFdmImportSession,
  executeBaseTerremotoFdmImport,
} from '../../services/equidadFdmService.js';
import {
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { ExpressModal } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';

const esAdminOSoporte = () => {
  const rol = String(localStorage.getItem('rol') || '')
    .trim()
    .toLowerCase();
  return rol === 'admin' || rol === 'soporte' || rol === 'administrador' || rol === 'support';
};

const toneClass = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100',
  info: 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100',
  warning:
    'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100',
  error:
    'border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100',
  neutral:
    'border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
};

/**
 * Banner sync Excel SharePoint SEGUROS EQUIDAD ↔ Equidad FDM.
 */
export default function EquidadFdmBaseTerremotoBanner({ onCompleted }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const puedeAdmin = esAdminOSoporte();

  const source = status?.source;
  const summary = source?.summary || {};

  const cargarStatus = useCallback(async () => {
    try {
      setError(null);
      const data = await getBaseTerremotoFdmStatus();
      setStatus(data);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el estado del Excel Equidad');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarStatus();
    const id = setInterval(cargarStatus, 60_000);
    return () => clearInterval(id);
  }, [cargarStatus]);

  const tone = useMemo(() => {
    if (source?.status === 'error') return 'error';
    if (source?.status === 'requires_review') return 'warning';
    if (source?.status === 'updates_available' || source?.hasChanges) return 'info';
    if (source?.status === 'up_to_date') return 'ok';
    return 'neutral';
  }, [source?.status, source?.hasChanges]);

  const abrirPreview = async () => {
    const sessionId = source?.lastPreviewSessionId;
    if (!sessionId) {
      setModalError('No hay preview disponible. Pulse «Buscar actualizaciones».');
      setModalOpen(true);
      return;
    }
    setModalOpen(true);
    setLoadingPreview(true);
    setModalError(null);
    try {
      const session = await getBaseTerremotoFdmImportSession(sessionId);
      setRows(
        (session.rows || []).filter((r) =>
          ['CREATE', 'UPDATE', 'AMBIGUOUS', 'REJECTED'].includes(r.action)
        )
      );
    } catch (err) {
      setModalError(err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCheck = async () => {
    if (!puedeAdmin) return;
    setChecking(true);
    setError(null);
    try {
      const result = await checkBaseTerremotoFdm({ force: true });
      setStatus({ source: result.source });
      if (result.sessionId || result.hasChanges || result.source?.hasIncidents) {
        setModalOpen(true);
        setLoadingPreview(true);
        setModalError(null);
        try {
          const sid = result.sessionId || result.source?.lastPreviewSessionId;
          if (!sid) throw new Error('No hay preview disponible.');
          const session = await getBaseTerremotoFdmImportSession(sid);
          setRows(
            (session.rows || []).filter((r) =>
              ['CREATE', 'UPDATE', 'AMBIGUOUS', 'REJECTED'].includes(r.action)
            )
          );
        } catch (err) {
          setModalError(err.message);
        } finally {
          setLoadingPreview(false);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const handleExecute = async () => {
    if (!puedeAdmin) return;
    const sessionId = source?.lastPreviewSessionId;
    if (!sessionId) return;
    if (!window.confirm('¿Aplicar los cambios del Excel de SEGUROS EQUIDAD a ARNALD?')) return;
    setExecuting(true);
    setModalError(null);
    try {
      await executeBaseTerremotoFdmImport(sessionId);
      setModalOpen(false);
      await cargarStatus();
      if (typeof onCompleted === 'function') onCompleted();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setExecuting(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await dismissBaseTerremotoFdmNotification();
      await cargarStatus();
    } catch {
      /* ignore */
    }
  };

  if (loading && !source) {
    return (
      <div className={`rounded-xl border px-4 py-3 font-body text-sm ${toneClass.neutral}`}>
        Cargando estado Excel SharePoint (SEGUROS EQUIDAD)…
      </div>
    );
  }

  return (
    <>
      <div className={`rounded-xl border px-4 py-3 ${toneClass[tone]}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="font-heading text-sm font-bold">
              SharePoint · SEGUROS EQUIDAD
              {source?.fileName ? ` · ${source.fileName}` : ''}
            </p>
            <p className="font-body text-xs opacity-90">
              {error
                ? error
                : source?.status === 'updates_available'
                  ? `Actualizaciones disponibles: +${summary.created || 0} nuevos · ${summary.updated || 0} cambios`
                  : source?.status === 'requires_review'
                    ? `Requiere revisión (${summary.ambiguous || 0} ambiguos · ${summary.rejected || 0} rechazados)`
                    : source?.status === 'up_to_date'
                      ? 'ARNALD y el Excel están al día'
                      : source?.lastOutcome || 'Sin verificación reciente'}
            </p>
            {source?.notification?.pending && source?.notification?.message && (
              <p className="font-body text-xs font-semibold">{source.notification.message}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {puedeAdmin && (
              <button
                type="button"
                className={expressBtnSecondary}
                onClick={handleCheck}
                disabled={checking}
              >
                {checking ? 'Buscando…' : 'Buscar actualizaciones'}
              </button>
            )}
            {(source?.hasChanges || source?.hasIncidents || source?.lastPreviewSessionId) && (
              <button type="button" className={expressBtnPrimary} onClick={abrirPreview}>
                Ver cambios
              </button>
            )}
            {source?.notification?.pending && (
              <button type="button" className={expressBtnGhost} onClick={handleDismiss}>
                Descartar aviso
              </button>
            )}
          </div>
        </div>
      </div>

      <ExpressModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Actualizaciones Excel Equidad"
        wide
      >
        <div className="space-y-3 p-3 sm:p-4">
          {modalError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {modalError}
            </p>
          )}
          <p className="font-body text-sm text-gray-600 dark:text-gray-300">
            Crear: {summary.created || 0} · Actualizar: {summary.updated || 0} · Ambiguos:{' '}
            {summary.ambiguous || 0} · Sin cambios: {summary.unchanged || 0}
          </p>
          <div className="max-h-[50vh] overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
            {loadingPreview ? (
              <p className="p-4 text-sm text-gray-500">Cargando preview…</p>
            ) : rows.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No hay filas con cambios en el preview.</p>
            ) : (
              <table className="min-w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-3 py-2">Acción</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Cédula</th>
                    <th className="px-3 py-2">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((r, i) => (
                    <tr key={`${r.action}-${r.excelRow}-${i}`} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2 font-semibold">{r.action}</td>
                      <td className="px-3 py-2">{r.nombre || '—'}</td>
                      <td className="px-3 py-2">{r.cedula || '—'}</td>
                      <td className="px-3 py-2">
                        {r.changes
                          ? Object.keys(r.changes).join(', ')
                          : r.reason || r.consecutivo || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={expressBtnGhost} onClick={() => setModalOpen(false)}>
              Cerrar
            </button>
            {puedeAdmin && (
              <button
                type="button"
                className={expressBtnPrimary}
                onClick={handleExecute}
                disabled={executing || !(summary.created || summary.updated)}
              >
                {executing ? 'Aplicando…' : 'Actualizar ARNALD'}
              </button>
            )}
          </div>
        </div>
      </ExpressModal>
    </>
  );
}
