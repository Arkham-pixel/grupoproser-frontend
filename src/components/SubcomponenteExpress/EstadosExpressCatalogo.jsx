import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaCheck, FaEdit, FaPlus, FaTimes, FaTrashAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import {
  actualizarEstadoExpress,
  crearEstadoExpress,
  eliminarEstadoExpress,
  getEstadosExpress,
} from '../../services/estadosExpressService.js';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnPrimary,
  expressBtnSecondary,
  expressInput,
  expressTableHead,
  expressTableWrap,
} from './expressFenixUi.js';
import { ExpressAvisoModal, InputFenix } from './ExpressUiBlocks.jsx';

const codigoDe = (estado) => Number(estado?.codiEstdo ?? estado?.codiEstado) || 0;
const descDe = (estado) => String(estado?.descEstdo ?? estado?.descEstado ?? '').trim();

export function EstadosExpressCatalogo() {
  const { t } = useTranslation();
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevo, setNuevo] = useState({ codiEstdo: '', descEstdo: '' });
  const [editandoId, setEditandoId] = useState(null);
  const [editando, setEditando] = useState({ codiEstdo: '', descEstdo: '' });
  const [aviso, setAviso] = useState({ open: false, titulo: '', mensaje: '', tipo: 'warning' });

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEstadosExpress();
      const ordenados = [...data].sort((a, b) => codigoDe(a) - codigoDe(b));
      setEstados(ordenados);
    } catch (err) {
      setError(err.message);
      setEstados([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const siguienteCodigo = useMemo(() => {
    if (estados.length === 0) return 1;
    return Math.max(...estados.map(codigoDe)) + 1;
  }, [estados]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toUpperCase();
    if (!q) return estados;
    return estados.filter((e) => {
      const cod = String(codigoDe(e));
      const desc = descDe(e).toUpperCase();
      return cod.includes(q) || desc.includes(q);
    });
  }, [estados, busqueda]);

  const abrirCrear = () => {
    setNuevo({ codiEstdo: String(siguienteCodigo), descEstdo: '' });
    setMostrarFormulario(true);
    setError(null);
    setSuccess(null);
  };

  const crear = async (event) => {
    event.preventDefault();
    const codiEstdo = Number(nuevo.codiEstdo);
    const descEstdo = nuevo.descEstdo.trim();
    if (!codiEstdo || !descEstdo) {
      setError(t('express.statusCatalog.codeAndDescriptionRequired'));
      return;
    }
    setGuardando(true);
    setError(null);
    setSuccess(null);
    try {
      await crearEstadoExpress(codiEstdo, descEstdo);
      setSuccess(t('express.statusCatalog.created'));
      setMostrarFormulario(false);
      setNuevo({ codiEstdo: '', descEstdo: '' });
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (estado) => {
    setEditandoId(estado._id);
    setEditando({
      codiEstdo: String(codigoDe(estado)),
      descEstdo: descDe(estado),
    });
    setError(null);
    setSuccess(null);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditando({ codiEstdo: '', descEstdo: '' });
  };

  const guardarEdicion = async (estado) => {
    const codiEstdo = Number(editando.codiEstdo);
    const descEstdo = editando.descEstdo.trim();
    if (!codiEstdo || !descEstdo) {
      setError(t('express.statusCatalog.codeAndDescriptionRequired'));
      return;
    }
    setGuardando(true);
    setError(null);
    setSuccess(null);
    try {
      await actualizarEstadoExpress(estado._id, { codiEstdo, descEstdo });
      setSuccess(t('express.statusCatalog.updated'));
      cancelarEdicion();
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = (estado) => {
    setAviso({
      open: true,
      titulo: t('express.statusCatalog.deleteTitle'),
      mensaje: t('express.statusCatalog.deleteConfirm', { description: descDe(estado), code: codigoDe(estado) }),
      tipo: 'warning',
      onConfirm: () => eliminar(estado),
    });
  };

  const eliminar = async (estado) => {
    setAviso((prev) => ({ ...prev, open: false }));
    setGuardando(true);
    setError(null);
    setSuccess(null);
    try {
      await eliminarEstadoExpress(estado._id);
      setSuccess(t('express.statusCatalog.deleted'));
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-body text-sm text-gray-600 dark:text-gray-400">
          {t('express.statusCatalog.description')}
        </p>
        <button
          type="button"
          className={mostrarFormulario ? expressBtnSecondary : expressBtnPrimary}
          onClick={() => (mostrarFormulario ? setMostrarFormulario(false) : abrirCrear())}
          disabled={guardando}
        >
          {mostrarFormulario ? (
            <>
              <FaTimes className="mr-2 inline" />
              {t('common.cancel')}
            </>
          ) : (
            <>
              <FaPlus className="mr-2 inline" />
              {t('express.statusCatalog.newStatus')}
            </>
          )}
        </button>
      </div>

      {mostrarFormulario && (
        <form
          onSubmit={crear}
          className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/30 sm:grid-cols-2"
        >
          <div>
            <label className="mb-1 block font-body text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('express.statusCatalog.code')} *
            </label>
            <InputFenix
              type="number"
              min={1}
              value={nuevo.codiEstdo}
              onChange={(e) => setNuevo((p) => ({ ...p, codiEstdo: e.target.value }))}
              disabled={guardando}
            />
          </div>
          <div>
            <label className="mb-1 block font-body text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('express.statusCatalog.descriptionLabel')} *
            </label>
            <InputFenix
              value={nuevo.descEstdo}
              onChange={(e) => setNuevo((p) => ({ ...p, descEstdo: e.target.value }))}
              placeholder={t('express.statusCatalog.descriptionPlaceholder')}
              disabled={guardando}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className={expressBtnPrimary} disabled={guardando}>
              {t('express.statusCatalog.saveStatus')}
            </button>
          </div>
        </form>
      )}

      <input
        type="search"
        className={expressInput}
        placeholder={t('express.statusCatalog.searchPlaceholder')}
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      {error && <div className={expressAlertError}>{error}</div>}
      {success && <div className={expressAlertSuccess}>{success}</div>}

      <div className={expressTableWrap}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className={expressTableHead}>
              <tr>
                <th className="px-4 py-3 text-left">{t('express.statusCatalog.code')}</th>
                <th className="px-4 py-3 text-left">{t('express.statusCatalog.descriptionLabel')}</th>
                <th className="px-4 py-3 text-right">{t('express.menu.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                    {t('express.statusCatalog.loading')}
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm italic text-gray-500">
                    {t('express.statusCatalog.noStatuses')}
                  </td>
                </tr>
              ) : (
                filtrados.map((estado) => (
                  <tr key={estado._id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/40">
                    {editandoId === estado._id ? (
                      <>
                        <td className="px-4 py-2">
                          <InputFenix
                            type="number"
                            min={1}
                            value={editando.codiEstdo}
                            onChange={(e) =>
                              setEditando((p) => ({ ...p, codiEstdo: e.target.value }))
                            }
                            disabled={guardando}
                            className="!py-1.5"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <InputFenix
                            value={editando.descEstdo}
                            onChange={(e) =>
                              setEditando((p) => ({ ...p, descEstdo: e.target.value }))
                            }
                            disabled={guardando}
                            className="!py-1.5"
                            autoFocus
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className={`${expressBtnPrimary} !py-1.5 !text-xs`}
                              onClick={() => guardarEdicion(estado)}
                              disabled={guardando}
                            >
                              <FaCheck />
                            </button>
                            <button
                              type="button"
                              className={`${expressBtnSecondary} !py-1.5 !text-xs`}
                              onClick={cancelarEdicion}
                              disabled={guardando}
                            >
                              <FaTimes />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="whitespace-nowrap px-4 py-3 font-body text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {codigoDe(estado)}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-gray-800 dark:text-gray-200">
                          {descDe(estado)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className={`${expressBtnSecondary} !py-1.5 !text-xs`}
                              onClick={() => iniciarEdicion(estado)}
                              disabled={guardando}
                              title={t('express.catalogs.editName')}
                            >
                              <FaEdit />
                            </button>
                            <button
                              type="button"
                              className={`${expressBtnSecondary} !border-red-200 !py-1.5 !text-xs !text-red-700 hover:!bg-red-50`}
                              onClick={() => confirmarEliminar(estado)}
                              disabled={guardando}
                              title={t('express.menu.delete')}
                            >
                              <FaTrashAlt />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="font-body text-xs text-gray-500">
        {t('express.statusCatalog.summary', { filtered: filtrados.length, total: estados.length })}
      </p>

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
}

export default EstadosExpressCatalogo;
