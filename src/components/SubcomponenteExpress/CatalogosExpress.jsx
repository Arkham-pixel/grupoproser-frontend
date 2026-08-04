import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaCheck, FaEdit, FaPlus, FaTimes, FaTrashAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import {
  actualizarExpressCatalogo,
  crearExpressCatalogo,
  eliminarExpressCatalogo,
  fetchExpressCatalogo,
} from '../../services/expressCatalogoService.js';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnPrimary,
  expressBtnSecondary,
  expressCard,
  expressCardBody,
  expressCardHeader,
  expressInput,
  expressPageWrap,
} from './expressFenixUi.js';
import {
  ExpressAvisoModal,
  ExpressPageHeader,
  InputFenix,
} from './ExpressUiBlocks.jsx';
import EstadosExpressCatalogo from './EstadosExpressCatalogo.jsx';
import { usuarioAutorizadoCatalogosExpress } from '../../config/expressCatalogosPermitidos.js';

const CatalogosExpress = () => {
  const { t } = useTranslation();
  const tabs = useMemo(
    () => [
      { id: 'estados', label: t('express.catalogs.tabs.statuses') },
      { id: 'amparo', label: t('express.catalogs.tabs.coverages') },
      { id: 'analista', label: t('express.catalogs.tabs.analysts') },
      { id: 'intermediario', label: t('express.catalogs.tabs.brokers') },
    ],
    [t]
  );
  const puedeEditar = usuarioAutorizadoCatalogosExpress(
    localStorage.getItem('cedula'),
    localStorage.getItem('login'),
    localStorage.getItem('email'),
    localStorage.getItem('rol')
  );

  const [tab, setTab] = useState('estados');
  const [items, setItems] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [aviso, setAviso] = useState({ open: false, titulo: '', mensaje: '', tipo: 'warning' });
  const [editandoId, setEditandoId] = useState(null);
  const [editandoNombre, setEditandoNombre] = useState('');

  const cargar = useCallback(async () => {
    if (tab === 'estados') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExpressCatalogo(tab);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    cargar();
    setNuevo('');
    setBusqueda('');
    setEditandoId(null);
    setEditandoNombre('');
  }, [cargar]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return items;
    return items.filter((i) => String(i.nombre ?? '').toUpperCase().includes(q));
  }, [items, busqueda]);

  const agregar = async (event) => {
    event.preventDefault();
    const nombre = nuevo.trim();
    if (!nombre) return;
    setGuardando(true);
    setError(null);
    setSuccess(null);
    try {
      await crearExpressCatalogo(tab, nombre);
      setNuevo('');
      setSuccess(t('express.catalogs.itemAdded'));
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (item) => {
    setEditandoId(item._id);
    setEditandoNombre(item.nombre ?? '');
    setError(null);
    setSuccess(null);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditandoNombre('');
  };

  const guardarEdicion = async (item) => {
    const nombre = editandoNombre.trim();
    if (!nombre) {
      setError(t('express.catalogs.nameRequired'));
      return;
    }
    if (nombre === item.nombre) {
      cancelarEdicion();
      return;
    }
    setGuardando(true);
    setError(null);
    setSuccess(null);
    try {
      await actualizarExpressCatalogo(item._id, nombre);
      setSuccess(t('express.catalogs.nameUpdated'));
      cancelarEdicion();
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = (item) => {
    setAviso({
      open: true,
      titulo: t('express.catalogs.deleteTitle'),
      mensaje: t('express.catalogs.deleteConfirm', { name: item.nombre }),
      tipo: 'warning',
      onConfirm: () => eliminar(item),
    });
  };

  const eliminar = async (item) => {
    setAviso((prev) => ({ ...prev, open: false }));
    setGuardando(true);
    setError(null);
    setSuccess(null);
    try {
      await eliminarExpressCatalogo(item._id);
      setSuccess(t('express.catalogs.itemDeleted'));
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const tabActual = tabs.find((item) => item.id === tab);

  if (!puedeEditar) {
    return (
      <div className={expressPageWrap}>
        <section className={expressCard}>
          <div className={`${expressCardBody} ${expressAlertError}`}>
            {t('express.catalogs.accessDenied')}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={expressPageWrap}>
      <section className={expressCard}>
        <div className={expressCardHeader}>
          <ExpressPageHeader
            badge={t('express.catalogs.administration')}
            title={t('express.catalogs.title')}
            subtitle={t('express.catalogs.subtitle')}
          />
        </div>

        <div className={`${expressCardBody} space-y-6`}>
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`rounded-lg px-4 py-2 font-body text-sm font-semibold transition ${
                  tab === t.id
                    ? 'bg-fenix-primario text-white'
                    : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
                }`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'estados' ? (
            <EstadosExpressCatalogo />
          ) : (
            <>
              <form onSubmit={agregar} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block font-body text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {t('express.catalogs.newItem', { item: tabActual?.label?.slice(0, -1) ?? t('express.catalogs.item') })}
                  </label>
                  <InputFenix
                    value={nuevo}
                    onChange={(e) => setNuevo(e.target.value)}
                    placeholder={t('express.catalogs.namePlaceholder', { catalog: tabActual?.label?.toLowerCase() ?? t('express.catalogs.catalog') })}
                    disabled={guardando}
                  />
                </div>
                <button type="submit" className={expressBtnPrimary} disabled={guardando || !nuevo.trim()}>
                  <FaPlus className="mr-2 inline" />
                  {t('express.catalogs.add')}
                </button>
              </form>

              {tab === 'intermediario' && !editandoId && (
                <input
                  type="search"
                  className={expressInput}
                  placeholder={t('express.catalogs.searchBroker')}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              )}

              {error && <div className={expressAlertError}>{error}</div>}
              {success && <div className={expressAlertSuccess}>{success}</div>}

              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                {loading ? (
                  <p className="p-4 font-body text-sm text-gray-500">{t('common.loading')}</p>
                ) : filtrados.length === 0 ? (
                  <p className="p-4 font-body text-sm italic text-gray-500">
                    {t('express.catalogs.noRecords')}
                  </p>
                ) : (
                  <ul className="max-h-[28rem] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
                    {filtrados.map((item) => (
                      <li
                        key={item._id}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-gray-900/40"
                      >
                        {editandoId === item._id ? (
                          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                            <InputFenix
                              value={editandoNombre}
                              onChange={(e) => setEditandoNombre(e.target.value)}
                              disabled={guardando}
                              className="flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  guardarEdicion(item);
                                }
                                if (e.key === 'Escape') cancelarEdicion();
                              }}
                            />
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                className={`${expressBtnPrimary} !py-1.5 !text-xs`}
                                onClick={() => guardarEdicion(item)}
                                disabled={guardando}
                                title={t('common.save')}
                              >
                                <FaCheck />
                              </button>
                              <button
                                type="button"
                                className={`${expressBtnSecondary} !py-1.5 !text-xs`}
                                onClick={cancelarEdicion}
                                disabled={guardando}
                                title={t('common.cancel')}
                              >
                                <FaTimes />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="min-w-0 flex-1 font-body text-sm text-gray-800 dark:text-gray-200">
                              {item.nombre}
                            </span>
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                className={`${expressBtnSecondary} !py-1.5 !text-xs`}
                                onClick={() => iniciarEdicion(item)}
                                disabled={guardando}
                                title={t('express.catalogs.editName')}
                              >
                                <FaEdit />
                              </button>
                              <button
                                type="button"
                                className={`${expressBtnSecondary} !border-red-200 !py-1.5 !text-xs !text-red-700 hover:!bg-red-50`}
                                onClick={() => confirmarEliminar(item)}
                                disabled={guardando}
                                title={t('express.menu.delete')}
                              >
                                <FaTrashAlt />
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="font-body text-xs text-gray-500">
                {t('express.catalogs.recordsSummary', { filtered: filtrados.length, total: items.length, catalog: tabActual?.label })}
              </p>
            </>
          )}
        </div>
      </section>

      <ExpressAvisoModal
        open={aviso.open}
        onClose={() => setAviso((prev) => ({ ...prev, open: false }))}
        titulo={aviso.titulo}
        mensaje={aviso.mensaje}
        tipo={aviso.tipo}
        onConfirm={aviso.onConfirm}
        confirmTexto={t('express.menu.delete')}
      />
    </div>
  );
};

export default CatalogosExpress;
