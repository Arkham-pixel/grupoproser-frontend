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

const FIELD_LABELS = {
  nombre: 'Nombre',
  cedula: 'Cédula',
  celular: 'Celular',
  direccionAfectada: 'Dirección',
  municipio: 'Municipio',
  departamento: 'Departamento',
  oficinaRadicadora: 'Oficina radicadora',
  ajustador: 'Ajustador',
  aif: 'AIF',
  polizaDanosVigente: 'Póliza daños vigente',
  polizaAfectar: 'Póliza a afectar',
  orden: 'Orden',
  vigenciaPoliza: 'Vigencia póliza',
  caso: 'Caso',
  siniestro: 'Siniestro',
  estado: 'Estado',
  observaciones: 'Observaciones',
  cobertura: 'Cobertura',
  valorEdificio: 'Valor edificio',
  valorContenido: 'Valor contenido',
  valoresIndemnizables: 'Valores indemnizables',
  perdidaContenidos: 'Pérdida contenidos',
  perdidaEdificio: 'Pérdida edificio',
  totalPerdida: 'Total pérdida',
  deducible: 'Deducible',
  subsidio: 'Subsidio',
  totalLiquidado: 'Total liquidado',
  valorIndemnizadoAjustador: 'Valor indemnizado ajustador',
  valorIndemnizado: 'Valor indemnizado',
  fechaRegistro: 'Fecha registro',
  fechaAviso: 'Fecha aviso',
  fechaLiquidacion: 'Fecha liquidación',
  evento: 'Evento',
};

const CREATE_PREVIEW_FIELDS = [
  'cedula',
  'celular',
  'direccionAfectada',
  'municipio',
  'departamento',
  'ajustador',
  'oficinaRadicadora',
  'polizaDanosVigente',
  'siniestro',
  'estado',
  'evento',
];

function formatPreviewValue(value) {
  if (value == null || value === '') return '—';
  if (value instanceof Date) return value.toLocaleDateString('es-CO');
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('es-CO');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function fieldLabel(key) {
  return FIELD_LABELS[key] || key;
}

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
  const [sessionTotals, setSessionTotals] = useState(null);
  const [selectedExcelRows, setSelectedExcelRows] = useState(() => new Set());
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [modalError, setModalError] = useState(null);
  const puedeAdmin = esAdminOSoporte();

  const source = status?.source;
  const summary = sessionTotals || source?.summary || {};

  const applicableRows = useMemo(
    () => rows.filter((r) => r.action === 'CREATE' || r.action === 'UPDATE'),
    [rows]
  );

  const applySession = (session) => {
    setSessionTotals(session?.totals || null);
    const nextRows = (session?.rows || []).filter((r) =>
      ['CREATE', 'UPDATE', 'AMBIGUOUS', 'REJECTED'].includes(r.action)
    );
    setRows(nextRows);
    setSelectedExcelRows(
      new Set(
        nextRows
          .filter((r) => r.action === 'CREATE' || r.action === 'UPDATE')
          .map((r) => Number(r.excelRow))
          .filter((n) => Number.isFinite(n))
      )
    );
  };

  const toggleExcelRow = (excelRow) => {
    const key = Number(excelRow);
    setSelectedExcelRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllApplicable = () => {
    setSelectedExcelRows(
      new Set(
        applicableRows.map((r) => Number(r.excelRow)).filter((n) => Number.isFinite(n))
      )
    );
  };

  const clearApplicable = () => setSelectedExcelRows(new Set());

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
      applySession(session);
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
          applySession(session);
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
    const excelRows = [...selectedExcelRows];
    if (excelRows.length === 0) {
      setModalError('Marca al menos una fila para aplicar, o desmarca las que no quieras.');
      return;
    }
    if (
      !window.confirm(
        `¿Aplicar ${excelRows.length} fila(s) del Excel de SEGUROS EQUIDAD a ARNALD?`
      )
    ) {
      return;
    }
    setExecuting(true);
    setModalError(null);
    try {
      await executeBaseTerremotoFdmImport(sessionId, { excelRows });
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
        extraWide
      >
        <div className="space-y-3 p-3 sm:p-4">
          {modalError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {modalError}
            </p>
          )}
          <p className="font-body text-sm text-gray-600 dark:text-gray-300">
            Comparación Excel (SharePoint) → ARNALD. Crear: {summary.created || 0} · Actualizar:{' '}
            {summary.updated || 0} · Ambiguos: {summary.ambiguous || 0} · Sin cambios:{' '}
            {summary.unchanged || 0}
          </p>
          <p className="font-body text-xs text-gray-500 dark:text-gray-400">
            Desmarca las filas que no quieras aplicar (por ejemplo las que ya corregiste a mano). Solo
            las marcadas se escriben en ARNALD al pulsar «Actualizar ARNALD».
          </p>
          {applicableRows.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                Seleccionadas: {selectedExcelRows.size} / {applicableRows.length}
              </span>
              <button type="button" className={expressBtnGhost} onClick={selectAllApplicable}>
                Marcar todas
              </button>
              <button type="button" className={expressBtnGhost} onClick={clearApplicable}>
                Quitar todas
              </button>
            </div>
          )}
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
            {loadingPreview ? (
              <p className="p-4 text-sm text-gray-500">Cargando preview…</p>
            ) : rows.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No hay filas con cambios en el preview.</p>
            ) : (
              <table className="min-w-[1180px] w-full text-left text-xs">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-3 py-2 whitespace-nowrap">Aplicar</th>
                    <th className="px-3 py-2 whitespace-nowrap">Acción</th>
                    <th className="px-3 py-2 whitespace-nowrap">Fila Excel</th>
                    <th className="px-3 py-2 whitespace-nowrap">Consecutivo</th>
                    <th className="px-3 py-2 min-w-[160px]">Nombre</th>
                    <th className="px-3 py-2 whitespace-nowrap">Cédula</th>
                    <th className="px-3 py-2 min-w-[140px]">Campo</th>
                    <th className="px-3 py-2 min-w-[180px]">Valor en ARNALD</th>
                    <th className="px-3 py-2 min-w-[180px]">Valor en Excel</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 300).flatMap((r, i) => {
                    const rowKey = `${r.action}-${r.excelRow}-${i}`;
                    const canSelect = r.action === 'CREATE' || r.action === 'UPDATE';
                    const checked = canSelect && selectedExcelRows.has(Number(r.excelRow));
                    const selectCell = (
                      <td className="px-3 py-2 align-top">
                        {canSelect ? (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleExcelRow(r.excelRow)}
                            aria-label={`Aplicar fila ${r.excelRow}`}
                          />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    );
                    const baseCells = (
                      <>
                        {selectCell}
                        <td className="px-3 py-2 align-top font-semibold whitespace-nowrap">
                          {r.action}
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">
                          {r.excelRow ?? '—'}
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">
                          {r.consecutivo || '—'}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {r.nombre || r.payload?.nombre || '—'}
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">
                          {r.cedula || r.payload?.cedula || '—'}
                        </td>
                      </>
                    );
                    const emptyLead = (
                      <>
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2" />
                      </>
                    );

                    if (r.action === 'UPDATE' && r.changes && Object.keys(r.changes).length > 0) {
                      return Object.entries(r.changes).map(([field, diff], j) => (
                        <tr
                          key={`${rowKey}-${field}`}
                          className={`border-t border-gray-100 dark:border-gray-800 ${
                            canSelect && !checked ? 'opacity-50' : ''
                          }`}
                        >
                          {j === 0 ? baseCells : emptyLead}
                          <td className="px-3 py-2 align-top font-medium">{fieldLabel(field)}</td>
                          <td className="px-3 py-2 align-top text-amber-800 dark:text-amber-200">
                            {formatPreviewValue(diff?.from)}
                          </td>
                          <td className="px-3 py-2 align-top font-semibold text-emerald-800 dark:text-emerald-200">
                            {formatPreviewValue(diff?.to)}
                          </td>
                        </tr>
                      ));
                    }

                    if (r.action === 'CREATE') {
                      const payload = r.payload || {};
                      const entries = CREATE_PREVIEW_FIELDS.filter(
                        (f) => payload[f] != null && payload[f] !== ''
                      ).map((f) => [f, payload[f]]);
                      if (entries.length === 0) {
                        return [
                          <tr
                            key={rowKey}
                            className={`border-t border-gray-100 dark:border-gray-800 ${
                              !checked ? 'opacity-50' : ''
                            }`}
                          >
                            {baseCells}
                            <td className="px-3 py-2" colSpan={3}>
                              Caso nuevo (sin más campos en el Excel)
                            </td>
                          </tr>,
                        ];
                      }
                      return entries.map(([field, value], j) => (
                        <tr
                          key={`${rowKey}-${field}`}
                          className={`border-t border-gray-100 dark:border-gray-800 ${
                            !checked ? 'opacity-50' : ''
                          }`}
                        >
                          {j === 0 ? baseCells : emptyLead}
                          <td className="px-3 py-2 align-top font-medium">{fieldLabel(field)}</td>
                          <td className="px-3 py-2 align-top text-gray-400">— (no existe)</td>
                          <td className="px-3 py-2 align-top font-semibold text-emerald-800 dark:text-emerald-200">
                            {formatPreviewValue(value)}
                          </td>
                        </tr>
                      ));
                    }

                    return [
                      <tr key={rowKey} className="border-t border-gray-100 dark:border-gray-800">
                        {baseCells}
                        <td className="px-3 py-2 align-top" colSpan={3}>
                          {r.reason ||
                            (r.candidatos?.length
                              ? `Candidatos: ${r.candidatos
                                  .map((c) => c.consecutivo || c.cedula || c.id)
                                  .join(', ')}`
                              : '—')}
                        </td>
                      </tr>,
                    ];
                  })}
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
                disabled={executing || selectedExcelRows.size === 0}
              >
                {executing
                  ? 'Aplicando…'
                  : `Actualizar ARNALD (${selectedExcelRows.size})`}
              </button>
            )}
          </div>
        </div>
      </ExpressModal>
    </>
  );
}
