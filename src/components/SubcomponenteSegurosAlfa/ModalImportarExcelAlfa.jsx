import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaFileExcel, FaTimes, FaUpload, FaCheck, FaDownload } from 'react-icons/fa';
import {
  previewImportExcelAlfa,
  executeImportExcelAlfa,
  urlReporteImportExcelAlfa,
  getImportExcelAlfaStatus,
} from '../../services/segurosAlfaService.js';
import {
  expressBtnGhost,
  expressBtnPrimary,
} from '../SubcomponenteExpress/expressFenixUi.js';

const ACTION_LABEL = {
  CREATED: 'Nuevo',
  UPDATED: 'Actualizar',
  UNCHANGED: 'Sin cambios',
  REJECTED: 'Error',
  AMBIGUOUS: 'Ambiguo',
};

function mapSessionToPreview(payload) {
  const session = payload?.import || payload;
  const rows = payload?.rows || session?.sampleRows || [];
  const totals = session?.totals || {};
  return {
    importSessionId: String(session?._id || session?.id || ''),
    sheetName: session?.sheetName,
    alreadyImported: Boolean(session?.alreadyImported),
    totalRows: totals.rows ?? rows.length,
    created: totals.created ?? 0,
    updated: totals.updated ?? 0,
    unchanged: totals.unchanged ?? 0,
    rejected: totals.rejected ?? 0,
    ambiguous: totals.ambiguous ?? 0,
    insights: session?.insights || null,
    sampleRows: (rows.length ? rows : session?.sampleRows || []).map((r) => ({
      rowNumber: r.rowNumber,
      action: r.action,
      matchedCaseId: r.matchedCaseId ? String(r.matchedCaseId) : null,
      candidateCaseIds: (r.candidateCaseIds || []).map(String),
      consecutivo: r.matchedConsecutivo || r.previewSnapshot?.consecutivoArnald,
      consecutivoArnald: r.matchedConsecutivo || r.previewSnapshot?.consecutivoArnald,
      matchStrategy: r.matchStrategy,
      matchEvidence: r.matchEvidence,
      identificacion: r.previewSnapshot?.identificacion || r.payload?.identificacion,
      numeroCredito: r.previewSnapshot?.numeroCredito,
      numeroPolizaActual: r.previewSnapshot?.numeroPolizaActual,
      numeroPolizaExcel: r.previewSnapshot?.numeroPolizaExcel,
      siniestroActual: r.previewSnapshot?.siniestroActual,
      siniestroExcel: r.previewSnapshot?.siniestroExcel,
      estadoActual: r.previewSnapshot?.estadoActual,
      estadoExcel: r.previewSnapshot?.estadoExcel,
      estadoAction: r.previewSnapshot?.estadoAction,
      estadoGestionActual: r.previewSnapshot?.estadoGestionActual,
      estadoGestionExcel: r.previewSnapshot?.estadoGestionExcel,
      estadoGestionAction: r.previewSnapshot?.estadoGestionAction,
      changeFields: r.previewSnapshot?.changeFields || Object.keys(r.changes || {}),
      changes: r.changes,
      ignoredFields: r.ignoredFields,
      warnings: r.warnings || [],
      claimNumberEventPending: Boolean(r.claimNumberEventPending || r.claimNumberAssigned),
      message: r.message,
      errorCode: r.errorCode,
    })),
    source: session?.source,
  };
}

/**
 * Modal IMPORTAR EXCEL (admin/soporte):
 * Seleccionar → Analizar → Preview → Confirmar → Resultado
 * También puede abrir un preview ya generado (SharePoint auto).
 */
export default function ModalImportarExcelAlfa({
  open,
  onClose,
  onCompleted,
  initialSessionId = null,
}) {
  const fileRef = useRef(null);
  const [step, setStep] = useState('select'); // select | preview | result
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [force, setForce] = useState(false);

  const reset = () => {
    setStep('select');
    setFile(null);
    setLoading(false);
    setError(null);
    setPreview(null);
    setResult(null);
    setForce(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  useEffect(() => {
    if (!open || !initialSessionId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getImportExcelAlfaStatus(initialSessionId);
        if (cancelled) return;
        const mapped = mapSessionToPreview(data);
        setPreview(mapped);
        setForce(Boolean(mapped.alreadyImported));
        setStep('preview');
      } catch (err) {
        if (!cancelled) setError(err.message || 'No se pudo cargar el preview');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, initialSessionId]);

  const handleAnalyze = async () => {
    if (!file) {
      setError('Seleccione un archivo Excel (.xlsx / .xls)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await previewImportExcelAlfa(file);
      setPreview(data);
      setForce(Boolean(data.alreadyImported));
      setStep('preview');
    } catch (err) {
      setError(err.message || 'Error al analizar el Excel');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!preview?.importSessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await executeImportExcelAlfa(preview.importSessionId, {
        force: force || Boolean(preview.alreadyImported),
      });
      setResult(data);
      setStep('result');
      onCompleted?.(data);
    } catch (err) {
      setError(err.message || 'Error al ejecutar la importación');
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    if (step === 'result' && result?.totals) return result.totals;
    if (preview) {
      return {
        rows: preview.totalRows ?? 0,
        created: preview.created ?? 0,
        updated: preview.updated ?? 0,
        unchanged: preview.unchanged ?? 0,
        rejected: preview.rejected ?? 0,
        ambiguous: preview.ambiguous ?? 0,
      };
    }
    return null;
  }, [step, preview, result]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
            Importar Excel Alfa
          </h2>
          <button type="button" className={expressBtnGhost} onClick={handleClose} aria-label="Cerrar">
            <FaTimes />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          {step === 'select' && (
            <div className="space-y-4">
              <p className="font-body text-sm text-gray-600 dark:text-gray-300">
                Suba el consolidado de Seguros Alfa. ARNALD analizará el archivo sin modificar
                casos hasta que confirme.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xlsm,.xls"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setError(null);
                }}
              />
              <button
                type="button"
                className={expressBtnPrimary}
                onClick={() => fileRef.current?.click()}
              >
                <FaUpload /> Seleccionar Excel
              </button>
              {file && (
                <p className="inline-flex items-center gap-2 font-body text-sm text-gray-700 dark:text-gray-200">
                  <FaFileExcel className="text-green-700" />
                  {file.name} ({Math.round(file.size / 1024)} KB)
                </p>
              )}
            </div>
          )}

          {(step === 'preview' || step === 'result') && totals && (
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ['Leídos', totals.rows],
                ['Nuevos', totals.created],
                ['Actualizar', totals.updated],
                ['Sin cambios', totals.unchanged],
                ['Rechazados', totals.rejected],
                ['Ambiguos', totals.ambiguous],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <p className="font-body text-xs text-gray-500">{label}</p>
                  <p className="font-heading text-xl font-bold">{value ?? 0}</p>
                </div>
              ))}
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-3">
              {preview.alreadyImported && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  Este archivo (mismo hash) ya fue importado. Marque &quot;Forzar&quot; para
                  re-ejecutar.
                  <label className="mt-2 flex items-center gap-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={force}
                      onChange={(e) => setForce(e.target.checked)}
                    />
                    Forzar importación
                  </label>
                </div>
              )}
              <p className="font-body text-xs text-gray-500">
                Hoja: {preview.sheetName || '—'} · Sesión: {preview.importSessionId}
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                Campo protegido: <strong>estado</strong> (ARNALD no lo actualiza desde Excel;
                si el Excel trae otro valor → <code>IGNORED_PROTECTED</code>).
                Evento <code>ALFA_CLAIM_NUMBER_ASSIGNED</code> solo queda pendiente en preview.
              </div>
              {preview.insights && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    [
                      'Placeholder→real',
                      preview.insights.placeholderPolicyToReal ??
                        preview.insights.policyPlaceholderToReal ??
                        0,
                    ],
                    ['Siniestro pendiente', preview.insights.claimNumberAssignments ?? 0],
                    ['Estado protegido ignorado', preview.insights.protectedFieldsIgnored ?? 0],
                    [
                      'Posibles duplicados BD',
                      preview.insights.possibleExistingDuplicates ??
                        preview.insights.possibleDuplicatesInDb ??
                        0,
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900"
                    >
                      <p className="font-body text-[11px] text-gray-500">{label}</p>
                      <p className="font-heading text-lg font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-2 py-2">Fila</th>
                      <th className="px-2 py-2">Acción</th>
                      <th className="px-2 py-2">Caso</th>
                      <th className="px-2 py-2">Candidatos</th>
                      <th className="px-2 py-2">Consecutivo</th>
                      <th className="px-2 py-2">Estrategia</th>
                      <th className="px-2 py-2">Evidence</th>
                      <th className="px-2 py-2">ID / Crédito</th>
                      <th className="px-2 py-2">Póliza act.→Excel</th>
                      <th className="px-2 py-2">Siniestro act.→Excel</th>
                      <th className="px-2 py-2">Estado siniestro</th>
                      <th className="px-2 py-2">Estado gestión</th>
                      <th className="px-2 py-2">Cambios</th>
                      <th className="px-2 py-2">Warnings</th>
                      <th className="px-2 py-2">Evento siniestro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(preview.sampleRows || []).map((r) => {
                      const ev = r.matchEvidence || {};
                      const evBits = [
                        ev.siniestro && 'sin',
                        ev.identificacion && 'id',
                        ev.numeroPoliza && 'pol',
                        ev.numeroCredito && 'cred',
                        ev.fechaSiniestro && 'fecha',
                        ev.direccionPredio && 'dir',
                      ].filter(Boolean);
                      const estadoLine =
                        r.estadoAction === 'IGNORED_PROTECTED'
                          ? `${r.estadoActual || '∅'}→${r.estadoExcel || '∅'} IGNORED_PROTECTED`
                          : r.estadoActual || r.estadoExcel
                            ? `${r.estadoActual || '∅'} / ${r.estadoExcel || '∅'}`
                            : '—';
                      const estadoGestionLine =
                        r.estadoGestionAction === 'IGNORED_PROTECTED'
                          ? `${r.estadoGestionActual || '∅'}→${r.estadoGestionExcel || '∅'} IGNORED_PROTECTED`
                          : r.estadoGestionActual || r.estadoGestionExcel
                            ? `${r.estadoGestionActual || '∅'} / ${r.estadoGestionExcel || '∅'}`
                            : '—';
                      return (
                        <tr
                          key={r.rowNumber}
                          className="border-t border-gray-100 dark:border-gray-800"
                        >
                          <td className="px-2 py-1.5">{r.rowNumber}</td>
                          <td className="px-2 py-1.5 font-semibold">
                            {ACTION_LABEL[r.action] || r.action}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-xs">
                            {r.matchedCaseId ? String(r.matchedCaseId).slice(-6) : '—'}
                          </td>
                          <td className="px-2 py-1.5 text-xs">
                            {r.action === 'AMBIGUOUS'
                              ? (r.candidateCaseIds || []).length
                              : '—'}
                          </td>
                          <td className="px-2 py-1.5">
                            {r.consecutivo || r.consecutivoArnald || '—'}
                          </td>
                          <td className="px-2 py-1.5 text-xs">{r.matchStrategy || '—'}</td>
                          <td className="px-2 py-1.5 text-xs">{evBits.join('+') || '—'}</td>
                          <td className="px-2 py-1.5 text-xs">
                            {(r.identificacion || '—') + ' / ' + (r.numeroCredito || '—')}
                          </td>
                          <td className="px-2 py-1.5">
                            {(r.numeroPolizaActual || '∅') + ' → ' + (r.numeroPolizaExcel || '∅')}
                          </td>
                          <td className="px-2 py-1.5">
                            {(r.siniestroActual || '∅') + ' → ' + (r.siniestroExcel || '∅')}
                          </td>
                          <td className="px-2 py-1.5 text-xs">{estadoLine}</td>
                          <td className="px-2 py-1.5 text-xs">{estadoGestionLine}</td>
                          <td className="px-2 py-1.5 text-gray-600 dark:text-gray-300">
                            {(r.changeFields || []).join(', ') ||
                              (r.changes ? Object.keys(r.changes).join(', ') : '') ||
                              r.message ||
                              '—'}
                          </td>
                          <td className="px-2 py-1.5 text-xs text-amber-800 dark:text-amber-200">
                            {(r.warnings || []).join(', ') || '—'}
                          </td>
                          <td className="px-2 py-1.5 text-xs">
                            {r.claimNumberEventPending
                              ? 'ALFA_CLAIM_NUMBER_ASSIGNED (pending)'
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'result' && result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100">
                <FaCheck /> Importación completada
                {(result.totals?.rejected > 0 || result.totals?.ambiguous > 0) &&
                  ' con observaciones.'}
              </div>
              <a
                className={`${expressBtnGhost} inline-flex`}
                href={urlReporteImportExcelAlfa(result.importSessionId)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  const token = localStorage.getItem('token');
                  fetch(urlReporteImportExcelAlfa(result.importSessionId), {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  })
                    .then((r) => r.blob())
                    .then((blob) => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `alfa-import-${result.importSessionId}.xlsx`;
                      a.click();
                      URL.revokeObjectURL(url);
                    })
                    .catch(() => setError('No se pudo descargar el reporte'));
                }}
              >
                <FaDownload /> Descargar reporte
              </a>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          {step === 'select' && (
            <>
              <button type="button" className={expressBtnGhost} onClick={handleClose}>
                Cancelar
              </button>
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={!file || loading}
                onClick={handleAnalyze}
              >
                {loading ? 'Analizando…' : 'Analizar'}
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              {!initialSessionId && (
                <button
                  type="button"
                  className={expressBtnGhost}
                  disabled={loading}
                  onClick={() => {
                    setStep('select');
                    setPreview(null);
                  }}
                >
                  Volver
                </button>
              )}
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={
                  loading ||
                  (preview?.alreadyImported && !force) ||
                  ((preview?.created ?? 0) === 0 && (preview?.updated ?? 0) === 0)
                }
                onClick={handleExecute}
              >
                {loading ? 'Procesando…' : 'Confirmar actualización'}
              </button>
            </>
          )}
          {step === 'result' && (
            <button type="button" className={expressBtnPrimary} onClick={handleClose}>
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function esAdminOSoporteAlfa() {
  const rol = String(localStorage.getItem('rol') || '')
    .trim()
    .toLowerCase();
  return rol === 'admin' || rol === 'soporte' || rol === 'administrador' || rol === 'support';
}

/** Único usuario que puede pulsar Actualizar (Excel ↔ ARNALD). */
export const LOGIN_ALFA_EXCEL_ACTUALIZAR = '1065012991';

export function esUsuarioAlfaExcelActualizar() {
  const login = String(localStorage.getItem('login') || '').trim();
  const cedula = String(localStorage.getItem('cedula') || '').trim();
  return login === LOGIN_ALFA_EXCEL_ACTUALIZAR || cedula === LOGIN_ALFA_EXCEL_ACTUALIZAR;
}
