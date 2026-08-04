import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaEdit, FaPlus, FaSync, FaTimes, FaTrashAlt } from 'react-icons/fa';
import {
  actualizarPuertosCatalogo,
  crearPuertosCatalogo,
  eliminarPuertosCatalogo,
  fetchPuertosCatalogo,
  seedPuertosCatalogos,
  TIPOS_CATALOGO_PUERTOS,
} from '../../services/puertosCatalogoService.js';
import { esRolPuertos, obtenerRolAlmacenado } from '../../config/roles.js';
import {
  puertosAlertInfo,
  puertosBtnDanger,
  puertosBtnPrimary,
  puertosBtnSecondary,
  puertosCard,
  puertosCardBody,
  puertosCardHeader,
  puertosInput,
  puertosPageSubtitle,
  puertosPageTitle,
} from './puertosFenixUi.js';

function puedeEditarCatalogosPuertos() {
  const rol = obtenerRolAlmacenado();
  return rol === 'admin' || rol === 'administrador' || rol === 'soporte' || esRolPuertos(rol);
}

export default function PuertosCatalogos() {
  const { t } = useTranslation();
  const puedeEditar = puedeEditarCatalogosPuertos();
  const [tab, setTab] = useState('inspector');
  const [items, setItems] = useState([]);
  const [aseguradoras, setAseguradoras] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const [nuevaAseguradora, setNuevaAseguradora] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [editandoNombre, setEditandoNombre] = useState('');
  const [editandoAseguradora, setEditandoAseguradora] = useState('');
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  const esSucursal = tab === 'sucursal';

  const labelTipo = useCallback(
    (tipo) => t(`ports.ui.catalogos.tipos.${tipo}`, { defaultValue: tipo }),
    [t]
  );

  const cargarAseguradoras = useCallback(async () => {
    try {
      const data = await fetchPuertosCatalogo('aseguradora');
      setAseguradoras(Array.isArray(data) ? data : []);
    } catch {
      setAseguradoras([]);
    }
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPuertosCatalogo(tab);
      setItems(Array.isArray(data) ? data : []);
      if (tab === 'sucursal') await cargarAseguradoras();
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab, cargarAseguradoras]);

  useEffect(() => {
    cargar();
    setNuevo('');
    setNuevaAseguradora('');
    setBusqueda('');
    setEditandoId(null);
    setEditandoNombre('');
    setEditandoAseguradora('');
    setSuccess(null);
  }, [cargar]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return items;
    return items.filter((i) => {
      const nombre = String(i.nombre ?? '').toUpperCase();
      const padre = String(i.aseguradoraNombre ?? '').toUpperCase();
      return nombre.includes(q) || padre.includes(q);
    });
  }, [items, busqueda]);

  const agregar = async (event) => {
    event.preventDefault();
    const nombre = nuevo.trim();
    if (!nombre) return;
    if (esSucursal && !nuevaAseguradora.trim()) {
      setError(t('ports.ui.catalogos.insurerRequired'));
      return;
    }
    setGuardando(true);
    setError(null);
    setSuccess(null);
    try {
      const guardado = await crearPuertosCatalogo(
        tab,
        nombre,
        esSucursal ? { aseguradoraNombre: nuevaAseguradora.trim() } : {}
      );
      setNuevo('');
      setNuevaAseguradora('');
      const msg =
        esSucursal && guardado?.aseguradoraNombre
          ? t('ports.ui.catalogos.addedWithInsurer', {
              name: nombre,
              insurer: guardado.aseguradoraNombre,
            })
          : t('ports.ui.catalogos.added', { name: nombre, tipo: labelTipo(tab).toLowerCase() });
      setSuccess(msg);
      await cargar();
    } catch (err) {
      setError(err.message || t('ports.ui.common.unknownError'));
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (item) => {
    setEditandoId(item._id);
    setEditandoNombre(item.nombre ?? '');
    setEditandoAseguradora(item.aseguradoraNombre ?? '');
    setError(null);
    setSuccess(null);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditandoNombre('');
    setEditandoAseguradora('');
  };

  const guardarEdicion = async (item) => {
    const nombre = editandoNombre.trim();
    if (!nombre) {
      setError(t('ports.ui.catalogos.nameEmpty'));
      return;
    }
    if (esSucursal && !editandoAseguradora.trim()) {
      setError(t('ports.ui.catalogos.insurerRequired'));
      return;
    }
    const sinCambios =
      nombre === item.nombre &&
      (!esSucursal || editandoAseguradora.trim() === (item.aseguradoraNombre || ''));
    if (sinCambios) {
      cancelarEdicion();
      return;
    }
    setGuardando(true);
    setError(null);
    setSuccess(null);
    try {
      await actualizarPuertosCatalogo(item._id, {
        nombre,
        ...(esSucursal ? { aseguradoraNombre: editandoAseguradora.trim() } : {}),
      });
      setSuccess(t('ports.ui.catalogos.updated'));
      cancelarEdicion();
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (item) => {
    setConfirmarEliminar(null);
    setGuardando(true);
    setError(null);
    setSuccess(null);
    try {
      await eliminarPuertosCatalogo(item._id);
      setSuccess(t('ports.ui.catalogos.deleted', { name: item.nombre }));
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const reiniciarDefaults = async () => {
    setGuardando(true);
    setError(null);
    setSuccess(null);
    try {
      const resultado = await seedPuertosCatalogos();
      setSuccess(
        t('ports.ui.catalogos.seeded', {
          creados: resultado.creados ?? 0,
          reactivados: resultado.reactivados ?? 0,
        })
      );
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (!puedeEditar) {
    return <div className={puertosAlertInfo}>{t('ports.ui.catalogos.accessDenied')}</div>;
  }

  const selectAseguradoraCls = `${puertosInput} notranslate`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={puertosPageTitle}>{t('ports.ui.catalogos.title')}</h2>
          <p className={puertosPageSubtitle}>{t('ports.ui.catalogos.subtitle')}</p>
        </div>
        <button
          type="button"
          className={puertosBtnSecondary}
          onClick={reiniciarDefaults}
          disabled={guardando}
          title={t('ports.ui.catalogos.restoreTitle')}
        >
          <FaSync />
          {t('ports.ui.catalogos.restoreBase')}
        </button>
      </div>

      <section className={puertosCard}>
        <div className={`${puertosCardHeader} flex flex-wrap gap-2`}>
          {TIPOS_CATALOGO_PUERTOS.map((tipoItem) => (
            <button
              key={tipoItem.id}
              type="button"
              className={`rounded-lg px-3 py-1.5 font-body text-sm font-semibold transition ${
                tab === tipoItem.id
                  ? 'bg-fenix-primario text-white'
                  : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
              }`}
              onClick={() => setTab(tipoItem.id)}
            >
              {labelTipo(tipoItem.id)}
            </button>
          ))}
        </div>

        <div className={`${puertosCardBody} space-y-4`}>
          {esSucursal && (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-100">
              {t('ports.ui.catalogos.branchInsurerHint')}
            </p>
          )}

          <form onSubmit={agregar} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block font-body text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t('ports.ui.catalogos.newItem', { tipo: labelTipo(tab) })}
              </label>
              <input
                type="text"
                className={puertosInput}
                value={nuevo}
                onChange={(e) => setNuevo(e.target.value)}
                placeholder={t('ports.ui.catalogos.namePlaceholder', {
                  tipo: labelTipo(tab).toLowerCase(),
                })}
                disabled={guardando}
              />
            </div>
            {esSucursal && (
              <div className="sm:w-64">
                <label className="mb-1 block font-body text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {t('ports.ui.catalogos.insurerLabel')} <span className="text-red-500">*</span>
                </label>
                <select
                  className={selectAseguradoraCls}
                  value={nuevaAseguradora}
                  onChange={(e) => setNuevaAseguradora(e.target.value)}
                  disabled={guardando || aseguradoras.length === 0}
                  required
                >
                  <option value="">{t('ports.ui.common.select')}</option>
                  {aseguradoras.map((a) => (
                    <option key={a._id || a.nombre} value={a.nombre}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
                {aseguradoras.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    {t('ports.ui.catalogos.noInsurersYet')}
                  </p>
                )}
              </div>
            )}
            <button
              type="submit"
              className={puertosBtnPrimary}
              disabled={guardando || !nuevo.trim() || (esSucursal && !nuevaAseguradora)}
            >
              <FaPlus />
              {t('ports.ui.catalogos.add')}
            </button>
          </form>

          <input
            type="search"
            className={puertosInput}
            placeholder={t('ports.ui.catalogos.searchPlaceholder', {
              tipo: labelTipo(tab).toLowerCase(),
            })}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
              {success}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            {loading ? (
              <p className="p-4 font-body text-sm text-gray-500">{t('ports.ui.common.loading')}</p>
            ) : filtrados.length === 0 ? (
              <p className="p-4 font-body text-sm italic text-gray-500">
                {t('ports.ui.catalogos.empty')}
              </p>
            ) : (
              <ul
                className="notranslate max-h-[28rem] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800"
                translate="no"
              >
                {filtrados.map((item) => (
                  <li
                    key={item._id}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-gray-900/40"
                  >
                    {editandoId === item._id ? (
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          className={`${puertosInput} notranslate`}
                          translate="no"
                          value={editandoNombre}
                          onChange={(e) => setEditandoNombre(e.target.value)}
                          disabled={guardando}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              guardarEdicion(item);
                            }
                            if (e.key === 'Escape') cancelarEdicion();
                          }}
                        />
                        {esSucursal && (
                          <select
                            className={`${selectAseguradoraCls} sm:w-56`}
                            value={editandoAseguradora}
                            onChange={(e) => setEditandoAseguradora(e.target.value)}
                            disabled={guardando}
                          >
                            <option value="">{t('ports.ui.common.select')}</option>
                            {editandoAseguradora &&
                              !aseguradoras.some((a) => a.nombre === editandoAseguradora) && (
                                <option value={editandoAseguradora}>{editandoAseguradora}</option>
                              )}
                            {aseguradoras.map((a) => (
                              <option key={a._id || a.nombre} value={a.nombre}>
                                {a.nombre}
                              </option>
                            ))}
                          </select>
                        )}
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            className={`${puertosBtnPrimary} !py-1.5 !text-xs`}
                            onClick={() => guardarEdicion(item)}
                            disabled={guardando}
                            title={t('ports.ui.catalogos.save')}
                          >
                            <FaCheck />
                          </button>
                          <button
                            type="button"
                            className={`${puertosBtnSecondary} !py-1.5 !text-xs`}
                            onClick={cancelarEdicion}
                            disabled={guardando}
                            title={t('ports.ui.catalogos.cancel')}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0 flex-1">
                          <span
                            className="notranslate block font-body text-sm text-gray-800 dark:text-gray-200"
                            translate="no"
                            lang="es"
                          >
                            {item.nombre}
                          </span>
                          {esSucursal && (
                            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                              {item.aseguradoraNombre
                                ? t('ports.ui.catalogos.linkedInsurer', {
                                    name: item.aseguradoraNombre,
                                  })
                                : t('ports.ui.catalogos.unlinkedInsurer')}
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            className={`${puertosBtnSecondary} !py-1.5 !text-xs`}
                            onClick={() => iniciarEdicion(item)}
                            disabled={guardando}
                            title={t('ports.ui.catalogos.editName')}
                          >
                            <FaEdit />
                          </button>
                          <button
                            type="button"
                            className={`${puertosBtnDanger} !py-1.5 !text-xs`}
                            onClick={() => setConfirmarEliminar(item)}
                            disabled={guardando}
                            title={t('ports.ui.catalogos.delete')}
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
            {t('ports.ui.catalogos.summary', {
              filtered: filtrados.length,
              total: items.length,
              tipo: labelTipo(tab),
            })}
          </p>
        </div>
      </section>

      {confirmarEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
              {t('ports.ui.catalogos.deleteTitle')}
            </h3>
            <p className="mt-2 font-body text-sm text-gray-600 dark:text-gray-300">
              {t('ports.ui.catalogos.deleteConfirm', { name: confirmarEliminar.nombre })}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className={puertosBtnSecondary}
                onClick={() => setConfirmarEliminar(null)}
              >
                {t('ports.ui.catalogos.cancel')}
              </button>
              <button
                type="button"
                className={puertosBtnDanger}
                onClick={() => eliminar(confirmarEliminar)}
              >
                {t('ports.ui.catalogos.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
