import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaCheck,
  FaFileExcel,
  FaMinus,
  FaSync,
  FaTimes,
  FaUpload,
} from 'react-icons/fa';
import {
  actualizarFacilitadorSura,
  importarFacilitadoresSura,
  listarFacilitadoresSura,
  sugerirFacilitadoresDesdeArnald,
} from '../../services/suraFacilitadoresService.js';
import { formatDate, fechaParaInput } from './segurosSuraHelpers.js';
import {
  CRITERIOS_FACILITADOR,
  descargarPlantillaFacilitadores,
  erroresFilaPortal,
  filaParaInput,
  normalizarSinoNa,
  parsearPlantillaFacilitadores,
} from './suraFacilitadoresHelpers.js';
import {
  expressBadge,
  expressBtnPrimary,
  expressBtnSecondary,
  expressPageSubtitle,
  expressPageTitle,
  expressScope,
  expressTableHead,
  expressTableScroll,
  expressTableWrap,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { ExpressAvisoModal } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo p-2 dark:bg-[#0F0F0F] sm:p-4';
const wrap = 'w-full min-w-0 space-y-4 sm:space-y-6';
const navLink =
  'inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200';
const navActive =
  'inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm';

const inputSm =
  'w-full min-w-[7rem] rounded-md border border-gray-200 bg-white px-2 py-1.5 font-body text-xs text-gray-800 dark:border-gray-700 dark:bg-[#0F0F0F] dark:text-gray-200';

/** Solo Visita se edita con chulo / X / N/A; se guarda al hacer clic. */
function MarcaVisitaEditable({ value, disabled, onPick }) {
  const v = normalizarSinoNa(value);
  const btn = (marca, activeClass, Icon, title) => {
    const activo = v === marca;
    return (
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={() => onPick(marca)}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-white transition ${
          activo ? activeClass : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'
        } disabled:cursor-wait disabled:opacity-60`}
      >
        <Icon className="text-xs" />
      </button>
    );
  };
  return (
    <div className="flex items-center gap-1">
      {btn('SI', 'bg-emerald-600', FaCheck, 'Visita hecha (SI)')}
      {btn('NO', 'bg-red-600', FaTimes, 'Visita no hecha (NO)')}
      {btn('N/A', 'bg-amber-500', FaMinus, 'No aplica (N/A)')}
    </div>
  );
}

function Dato({ children }) {
  const txt = children == null || children === '' ? '—' : String(children);
  return (
    <span className="font-body text-xs text-gray-800 dark:text-gray-200">{txt}</span>
  );
}

function hoyIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ReporteFacilitadoresSura() {
  const fileRef = useRef(null);
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [soloInvalidos, setSoloInvalidos] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [guardandoId, setGuardandoId] = useState('');

  const recargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listarFacilitadoresSura();
      setFilas(data.map(filaParaInput));
    } catch (err) {
      setAviso({
        tipo: 'error',
        titulo: 'Error',
        mensaje: err.message || 'No se pudo cargar la plantilla de facilitadores.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const resumen = useMemo(() => {
    let invalid = 0;
    let ok = 0;
    for (const f of filas) {
      if (erroresFilaPortal(f).length) invalid += 1;
      else ok += 1;
    }
    return { total: filas.length, ok, invalid };
  }, [filas]);

  const visibles = useMemo(() => {
    const q = String(busqueda || '')
      .trim()
      .toLowerCase();
    return filas.filter((f) => {
      if (soloInvalidos && !erroresFilaPortal(f).length) return false;
      if (!q) return true;
      return (
        String(f.reclamacion || '').toLowerCase().includes(q) ||
        String(f.ultimoComentario || '').toLowerCase().includes(q) ||
        String(f.estadoSiniestro || '').toLowerCase().includes(q)
      );
    });
  }, [filas, busqueda, soloInvalidos]);

  const onImportar = async (file) => {
    if (!file) return;
    setBusy('import');
    try {
      const rows = await parsearPlantillaFacilitadores(file);
      const result = await importarFacilitadoresSura(rows);
      setFilas((result.data || []).map(filaParaInput));
      setAviso({
        tipo: 'success',
        titulo: 'Plantilla cargada',
        mensaje: `Se aplicaron los SI / NO / N/A del Excel. Creados: ${result.created || 0}. Actualizados: ${result.updated || 0}.`,
      });
    } catch (err) {
      setAviso({
        tipo: 'error',
        titulo: 'Importación',
        mensaje: err.message || 'No se pudo importar la plantilla.',
      });
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onSugerir = async () => {
    setBusy('sugerir');
    try {
      const result = await sugerirFacilitadoresDesdeArnald();
      setFilas((result.data || []).map(filaParaInput));
      setAviso({
        tipo: 'success',
        titulo: 'Actualizado desde gestionar',
        mensaje: `Se tomaron datos de los casos SURA (visita, informe, cierre). Filas tocadas: ${result.filled || 0}.`,
      });
    } catch (err) {
      setAviso({
        tipo: 'error',
        titulo: 'Completar desde Arnald',
        mensaje: err.message || 'No se pudo completar desde Arnald.',
      });
    } finally {
      setBusy('');
    }
  };

  const onExportar = () => {
    if (!filas.length) {
      setAviso({
        tipo: 'info',
        titulo: 'Sin datos',
        mensaje: 'No hay filas para descargar.',
      });
      return;
    }
    const invalid = filas.filter((f) => erroresFilaPortal(f).length).length;
    try {
      descargarPlantillaFacilitadores(filas);
      if (invalid) {
        setAviso({
          tipo: 'warning',
          titulo: 'Excel descargado con alertas',
          mensaje: `${invalid} fila(s) aún no cumplen las reglas del portal.`,
        });
      }
    } catch (err) {
      setAviso({
        tipo: 'error',
        titulo: 'Exportar',
        mensaje: err.message || 'No se pudo generar el Excel.',
      });
    }
  };

  /** Solo se edita detalle de visita (marca + fecha + criterio). Guarda solo, sin botón. */
  const guardarDetalleVisita = async (id, patch) => {
    setGuardandoId(id);
    try {
      const actualizada = await actualizarFacilitadorSura(id, patch);
      setFilas((prev) =>
        prev.map((f) => (f._id === id ? { ...f, ...filaParaInput(actualizada) } : f))
      );
    } catch (err) {
      setAviso({
        tipo: 'error',
        titulo: 'No se pudo guardar',
        mensaje: err.message || 'Error al guardar el detalle de visita.',
      });
    } finally {
      setGuardandoId('');
    }
  };

  const marcarVisita = (fila, marca) => {
    const patch = { visitaRealizada: marca };
    if (marca === 'SI') {
      patch.fechaVisita = fila.fechaVisita || hoyIso();
    } else {
      patch.fechaVisita = '';
    }
    setFilas((prev) =>
      prev.map((f) =>
        f._id === fila._id
          ? { ...f, visitaRealizada: marca, fechaVisita: patch.fechaVisita || '' }
          : f
      )
    );
    void guardarDetalleVisita(fila._id, patch);
  };

  return (
    <div className={`${expressScope} ${root}`}>
      <div className={wrap}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className={expressBadge}>Portal de Facilitadores</span>
            <div>
              <h1 className={expressPageTitle}>Plantilla Facilitadores SURA</h1>
              <p className={expressPageSubtitle}>
                Lo demás lo alimentan el Excel y Gestionar. Aquí solo se edita el detalle de visita:
                chulo = hecha, X = no, guion = N/A. Se guarda al marcar; no hace falta botón Guardar.
                También puede fijar la fecha y el criterio (Crítico / Medio / Bajo).
              </p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <Link to="/sura/reporte" className={navLink}>
                Reporte Sura
              </Link>
              <span className={navActive}>Facilitadores</span>
              <Link to="/sura/mis-casos" className={navLink}>
                Mis Casos Asignados
              </Link>
            </nav>
            <div className="flex flex-wrap gap-3 font-body text-sm text-gray-600 dark:text-gray-400">
              <span>{resumen.total} filas</span>
              <span className="text-emerald-700 dark:text-emerald-400">{resumen.ok} listas</span>
              <span className="text-amber-700 dark:text-amber-400">
                {resumen.invalid} con faltantes
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => onImportar(e.target.files?.[0])}
            />
            <button
              type="button"
              className={expressBtnPrimary}
              disabled={Boolean(busy)}
              onClick={() => fileRef.current?.click()}
            >
              <FaUpload />
              {busy === 'import' ? 'Importando…' : 'Cargar plantilla SURA'}
            </button>
            <button
              type="button"
              className={expressBtnSecondary}
              disabled={Boolean(busy) || !filas.length}
              onClick={onSugerir}
            >
              <FaSync />
              {busy === 'sugerir' ? 'Actualizando…' : 'Actualizar desde casos'}
            </button>
            <button
              type="button"
              className={expressBtnSecondary}
              disabled={!filas.length}
              onClick={onExportar}
            >
              <FaFileExcel />
              Descargar para el líder
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#1A1A1A]">
          <label className="min-w-[14rem] flex-1 font-body text-sm">
            <span className="mb-1 block font-semibold text-gray-700 dark:text-gray-300">Buscar</span>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Reclamación, comentario o estado…"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#1A1A1A] dark:text-gray-200"
            />
          </label>
          <label className="inline-flex items-center gap-2 pb-2 font-body text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={soloInvalidos}
              onChange={(e) => setSoloInvalidos(e.target.checked)}
            />
            Solo filas con faltantes
          </label>
          <button type="button" className={expressBtnSecondary} onClick={recargar} disabled={loading}>
            Recargar
          </button>
        </div>

        <div className={expressTableWrap}>
          <div className={expressTableScroll}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className={expressTableHead}>
                <tr>
                  <th className="px-3 py-3 text-left">Reclamación</th>
                  <th className="px-3 py-3 text-left">Asignación</th>
                  <th className="px-3 py-3 text-left">1.er contacto</th>
                  <th className="px-3 py-3 text-left">Visita</th>
                  <th className="px-3 py-3 text-left">Fecha visita</th>
                  <th className="px-3 py-3 text-left">Criterio</th>
                  <th className="px-3 py-3 text-left">Último comentario</th>
                  <th className="px-3 py-3 text-left">Informe</th>
                  <th className="px-3 py-3 text-left">Fecha informe</th>
                  <th className="px-3 py-3 text-left">Docs</th>
                  <th className="px-3 py-3 text-left">Fecha docs</th>
                  <th className="px-3 py-3 text-left">Cerrado</th>
                  <th className="px-3 py-3 text-left">Fecha cierre</th>
                  <th className="px-3 py-3 text-left">Estado</th>
                  <th className="px-3 py-3 text-left">Portal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
                {loading ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-8 text-center text-sm text-gray-500">
                      Cargando plantilla…
                    </td>
                  </tr>
                ) : visibles.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-4 py-8 text-center text-sm text-gray-500">
                      {filas.length
                        ? 'No hay filas con esos filtros.'
                        : 'Cargue la plantilla SURA o actualice desde los casos.'}
                    </td>
                  </tr>
                ) : (
                  visibles.map((fila) => {
                    const errs = erroresFilaPortal(fila);
                    const busyRow = guardandoId === fila._id;
                    return (
                      <tr
                        key={fila._id}
                        className="align-middle hover:bg-gray-50/80 dark:hover:bg-gray-900/30"
                      >
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-gray-800 dark:text-gray-200">
                          {fila.reclamacion}
                        </td>
                        <td className="px-3 py-3">
                          <Dato>{formatDate(fila.fechaAsignacion)}</Dato>
                        </td>
                        <td className="px-3 py-3">
                          <Dato>{formatDate(fila.fechaPrimerContacto)}</Dato>
                        </td>
                        <td className="px-3 py-3">
                          <MarcaVisitaEditable
                            value={fila.visitaRealizada}
                            disabled={busyRow}
                            onPick={(marca) => marcarVisita(fila, marca)}
                          />
                        </td>
                        <td className="px-3 py-3">
                          {normalizarSinoNa(fila.visitaRealizada) === 'SI' ? (
                            <input
                              type="date"
                              className={inputSm}
                              disabled={busyRow}
                              value={fechaParaInput(fila.fechaVisita)}
                              onChange={(e) => {
                                const fechaVisita = e.target.value;
                                setFilas((prev) =>
                                  prev.map((f) =>
                                    f._id === fila._id ? { ...f, fechaVisita } : f
                                  )
                                );
                              }}
                              onBlur={(e) => {
                                void guardarDetalleVisita(fila._id, {
                                  visitaRealizada: 'SI',
                                  fechaVisita: e.target.value,
                                });
                              }}
                            />
                          ) : (
                            <Dato>{''}</Dato>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <select
                            className={inputSm}
                            disabled={busyRow}
                            value={fila.criterioDetalle || ''}
                            onChange={(e) => {
                              const criterioDetalle = e.target.value;
                              setFilas((prev) =>
                                prev.map((f) =>
                                  f._id === fila._id ? { ...f, criterioDetalle } : f
                                )
                              );
                              void guardarDetalleVisita(fila._id, { criterioDetalle });
                            }}
                          >
                            <option value="">—</option>
                            {CRITERIOS_FACILITADOR.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="max-w-[14rem] px-3 py-3">
                          <Dato>{fila.ultimoComentario}</Dato>
                        </td>
                        <td className="px-3 py-3">
                          <Dato>{normalizarSinoNa(fila.informeEnviado) || ''}</Dato>
                        </td>
                        <td className="px-3 py-3">
                          <Dato>{formatDate(fila.fechaInforme)}</Dato>
                        </td>
                        <td className="px-3 py-3">
                          <Dato>{normalizarSinoNa(fila.documentacionCompleta) || ''}</Dato>
                        </td>
                        <td className="px-3 py-3">
                          <Dato>{formatDate(fila.fechaDocumentacionCompleta)}</Dato>
                        </td>
                        <td className="px-3 py-3">
                          <Dato>
                            {normalizarSinoNa(fila.casoCerrado, { permitirNA: false }) || ''}
                          </Dato>
                        </td>
                        <td className="px-3 py-3">
                          <Dato>{formatDate(fila.fechaCierre)}</Dato>
                        </td>
                        <td className="px-3 py-3">
                          <Dato>{fila.estadoSiniestro}</Dato>
                        </td>
                        <td className="px-3 py-3 font-body text-xs">
                          {errs.length ? (
                            <span
                              className="text-amber-700 dark:text-amber-400"
                              title={errs.join(', ')}
                            >
                              Falta: {errs.slice(0, 2).join(', ')}
                              {errs.length > 2 ? '…' : ''}
                            </span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {aviso && (
        <ExpressAvisoModal
          open
          tipo={aviso.tipo}
          titulo={aviso.titulo}
          mensaje={aviso.mensaje}
          onClose={() => setAviso(null)}
        />
      )}
    </div>
  );
}
