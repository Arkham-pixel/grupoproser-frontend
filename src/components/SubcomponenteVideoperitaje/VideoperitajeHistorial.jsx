import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash, FaVideo } from 'react-icons/fa';
import {
  cancelarSesionVideoperitaje,
  eliminarSesionVideoperitaje,
  listarSesionesVideoperitaje,
  obtenerCupoVideoperitaje,
  reenviarInvitacionVideoperitaje,
  vaciarHistorialVideoperitaje,
} from '../../services/videoperitajeService.js';
import VideoperitajeIniciarModal from './VideoperitajeIniciarModal.jsx';
import VideoperitajeAsignarCasoModal from './VideoperitajeAsignarCasoModal.jsx';
import {
  etiquetaEstado,
  etiquetaTipo,
  urlPortalAsegurado,
  vpBtnGhost,
  vpBtnPrimary,
  vpCard,
  vpInput,
  vpPage,
  vpWrap,
} from './videoperitajeUi.js';
import { sesionEsAdminVideoperitaje } from '../../config/videoperitajePermitidos.js';

function sesionSinCaso(s) {
  return !s?.casoId || !s?.modulo || s.modulo === 'independiente';
}

export default function VideoperitajeHistorial() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [asignarSesion, setAsignarSesion] = useState(null);
  const [aviso, setAviso] = useState('');
  const [cupo, setCupo] = useState(null);
  const [cupoError, setCupoError] = useState('');
  const [cupoLoading, setCupoLoading] = useState(false);
  const esAdmin = sesionEsAdminVideoperitaje();

  const casoId = params.get('casoId') || '';
  const modulo = params.get('modulo') || '';

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await listarSesionesVideoperitaje({
        q,
        estado,
        casoId,
        modulo,
        limit: 50,
      });
      setRows(r.data || []);
      setTotal(r.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [q, estado, casoId, modulo]);

  const cargarCupo = useCallback(async () => {
    if (!sesionEsAdminVideoperitaje()) {
      setCupo(null);
      setCupoError('');
      setCupoLoading(false);
      return;
    }
    setCupoLoading(true);
    setCupoError('');
    try {
      const r = await obtenerCupoVideoperitaje(modulo || 'independiente');
      setCupo(r.data || null);
      if (!r.data) setCupoError('No se recibió el cupo de suscripción');
    } catch (err) {
      setCupo(null);
      setCupoError(err.message || 'No se pudo cargar el cupo');
    } finally {
      setCupoLoading(false);
    }
  }, [modulo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    cargarCupo();
  }, [cargarCupo]);

  const cupoAgotado =
    esAdmin && cupo && cupo.limite != null && Number(cupo.restantes) <= 0;

  return (
    <div className={vpPage}>
      <div className={vpWrap}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-fenix-primario">
              Grupo Proser
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('videoperitaje.title')}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{t('videoperitaje.subtitle', { total })}</p>
            {!esAdmin && (
              <p className="mt-1 text-xs text-gray-400">
                Solo ves las videollamadas que tú creaste.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/videoperitaje/plantillas" className={vpBtnGhost}>
              {t('videoperitaje.templates')}
            </Link>
            {esAdmin && total > 0 && (
              <button
                type="button"
                className={vpBtnGhost}
                onClick={async () => {
                  if (!window.confirm(t('videoperitaje.confirmClearHistory'))) return;
                  try {
                    const r = await vaciarHistorialVideoperitaje();
                    setAviso(t('videoperitaje.historyCleared', { count: r.deleted || 0 }));
                    cargar();
                    cargarCupo();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              >
                <FaTrash /> {t('videoperitaje.clearHistory')}
              </button>
            )}
            <button
              type="button"
              className={vpBtnPrimary}
              onClick={() => setModal(true)}
              disabled={cupoAgotado}
              title={cupoAgotado ? cupo?.mensaje : undefined}
            >
              <FaPlus /> {t('videoperitaje.newSession')}
            </button>
          </div>
        </div>

        {esAdmin && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              cupoAgotado
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
                : cupoError
                  ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
                  : cupo?.restantes != null && cupo.restantes <= 5
                    ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
                    : 'border-fenix-primario/30 bg-fenix-primario/5 text-gray-800 dark:border-fenix-primario/40 dark:bg-gray-950 dark:text-gray-100'
            }`}
          >
            <p className="font-semibold">Cupo de suscripción (solo admin)</p>
            {cupoLoading && <p className="mt-0.5 text-gray-500">Cargando cupo…</p>}
            {!cupoLoading && cupoError && (
              <p className="mt-0.5">
                No se pudo cargar el cupo: {cupoError}. Reinicia el backend y recarga.
              </p>
            )}
            {!cupoLoading && !cupoError && cupo && (
              <>
                <p className="mt-0.5 font-medium">
                  Suscripción{cupo.plan ? ` · ${cupo.plan}` : ''}
                  {cupo.compania?.nombre || cupo.compania?.codigo
                    ? ` · ${cupo.compania.nombre || cupo.compania.codigo}`
                    : ''}
                </p>
                <p className="mt-0.5">
                  {cupo.limite == null ? (
                    <>Sin límite semanal configurado · usadas esta semana: {cupo.usadas}</>
                  ) : (
                    <>
                      Quedan <strong>{cupo.restantes}</strong> de {cupo.limite} videoperitajes
                      esta semana
                      <span className="text-gray-500 dark:text-gray-400">
                        {' '}
                        (usadas: {cupo.usadas})
                      </span>
                    </>
                  )}
                </p>
              </>
            )}
          </div>
        )}

        <div className={`${vpCard} mb-4 flex flex-wrap gap-3`}>
          <input
            className={`${vpInput} max-w-sm`}
            placeholder={t('videoperitaje.search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className={`${vpInput} max-w-xs`} value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">{t('videoperitaje.allStatuses')}</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="finalizada">Finalizada</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>

        {aviso && <p className="mb-3 text-sm text-green-700">{aviso}</p>}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className={vpCard}>
          {loading ? (
            <p className="text-sm text-gray-500">{t('common.loading')}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500">{t('videoperitaje.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800">
                    <th className="py-2 pr-3">{t('videoperitaje.file')}</th>
                    <th className="py-2 pr-3">{t('videoperitaje.insured')}</th>
                    <th className="py-2 pr-3">Caso</th>
                    <th className="py-2 pr-3">{t('videoperitaje.type')}</th>
                    <th className="py-2 pr-3">{t('videoperitaje.status')}</th>
                    <th className="py-2 pr-3">{t('videoperitaje.created')}</th>
                    <th className="py-2">{t('videoperitaje.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s._id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-3 font-medium">{s.expediente || '—'}</td>
                      <td className="py-2 pr-3">{s.aseguradoNombre || s.celular || '—'}</td>
                      <td className="py-2 pr-3 text-xs text-gray-500">
                        {sesionSinCaso(s) ? (
                          <span className="text-amber-700">Sin caso</span>
                        ) : (
                          <span>
                            {s.modulo}
                            {s.adjuntadoAlCaso ? ' · adjunto' : ''}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3">{etiquetaTipo(s.tipo)}</td>
                      <td className="py-2 pr-3">{etiquetaEstado(s.estado)}</td>
                      <td className="py-2 pr-3">
                        {s.createdAt ? new Date(s.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          {s.tipo === 'live' && s.estado !== 'cancelada' && (
                            <Link to={`/videoperitaje/sala/${s._id}`} className={vpBtnGhost}>
                              <FaVideo /> {t('videoperitaje.enterRoom')}
                            </Link>
                          )}
                          {s.tipo === 'guided' && (
                            <Link to={`/videoperitaje/sala/${s._id}`} className={vpBtnGhost}>
                              {t('videoperitaje.viewProgress')}
                            </Link>
                          )}
                          {(s.estado === 'pendiente' || s.estado === 'en_proceso') && (
                            <>
                              <button
                                type="button"
                                className={vpBtnGhost}
                                onClick={async () => {
                                  try {
                                    const r = await reenviarInvitacionVideoperitaje(s._id);
                                    setAviso(
                                      urlPortalAsegurado(r.urlPublica) || t('videoperitaje.resent')
                                    );
                                  } catch (err) {
                                    setError(err.message);
                                  }
                                }}
                              >
                                {t('videoperitaje.resend')}
                              </button>
                              <button
                                type="button"
                                className={vpBtnGhost}
                                onClick={async () => {
                                  if (!window.confirm(t('videoperitaje.confirmCancel'))) return;
                                  try {
                                    await cancelarSesionVideoperitaje(s._id);
                                    cargar();
                                  } catch (err) {
                                    setError(err.message);
                                  }
                                }}
                              >
                                {t('common.cancel')}
                              </button>
                            </>
                          )}
                          {sesionSinCaso(s) && (
                            <button
                              type="button"
                              className={vpBtnGhost}
                              onClick={() => setAsignarSesion(s)}
                            >
                              Asignar a caso
                            </button>
                          )}
                          <button
                            type="button"
                            className={vpBtnGhost}
                            onClick={async () => {
                              if (!window.confirm(t('videoperitaje.confirmDelete'))) return;
                              try {
                                await eliminarSesionVideoperitaje(s._id);
                                setAviso(t('videoperitaje.sessionDeleted'));
                                cargar();
                              } catch (err) {
                                setError(err.message);
                              }
                            }}
                          >
                            <FaTrash /> {t('videoperitaje.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <VideoperitajeIniciarModal
        open={modal}
        onClose={() => setModal(false)}
        onCreated={() => {
          cargar();
          cargarCupo();
        }}
        casoId={casoId}
        modulo={modulo || 'independiente'}
      />
      <VideoperitajeAsignarCasoModal
        open={Boolean(asignarSesion)}
        sesion={asignarSesion}
        onClose={() => setAsignarSesion(null)}
        onAssigned={(r) => {
          setAviso(r.mensaje || 'Sesión asignada al caso');
          cargar();
          cargarCupo();
        }}
      />
    </div>
  );
}
