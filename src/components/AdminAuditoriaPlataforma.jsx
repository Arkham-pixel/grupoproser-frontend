import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaHistory, FaInbox, FaSearch, FaSync } from 'react-icons/fa';
import {
  listarBorradoresAdminArnald,
  listarLogsArnald,
} from '../services/arnaldPlataformaService.js';

const ACCIONES = ['', 'LOGIN', 'LOGOUT', 'NAVIGATE', 'CREATE', 'UPDATE', 'DELETE'];

function formatearFecha(valor, locale) {
  if (!valor) return '—';
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(valor));
  } catch {
    return String(valor);
  }
}

export default function AdminAuditoriaPlataforma() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-CO';
  const [tab, setTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({
    q: '',
    login: '',
    accion: '',
    modulo: '',
  });

  const cargarLogs = useCallback(async (pagina = 1, actuales = filtros) => {
    setLoading(true);
    setError('');
    try {
      const data = await listarLogsArnald({
        ...actuales,
        page: pagina,
        limit: 50,
      });
      setLogs(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || pagina);
    } catch (err) {
      setError(err.message || t('plataforma.audit.loadError'));
    } finally {
      setLoading(false);
    }
  }, [filtros, t]);

  const cargarBorradores = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listarBorradoresAdminArnald({
        login: filtros.login,
        modulo: filtros.modulo,
        limit: 200,
      });
      setDrafts(data.items || []);
    } catch (err) {
      setError(err.message || t('plataforma.audit.loadError'));
    } finally {
      setLoading(false);
    }
  }, [filtros.login, filtros.modulo, t]);

  useEffect(() => {
    if (tab === 'logs') cargarLogs(1);
    else cargarBorradores();
    // Solo al cambiar de pestaña
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const onBuscar = (e) => {
    e.preventDefault();
    if (tab === 'logs') cargarLogs(1);
    else cargarBorradores();
  };

  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-white">
        {t('plataforma.audit.title')}
      </h1>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
        {t('plataforma.audit.subtitle')}
      </p>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('logs')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
            tab === 'logs' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          }`}
        >
          <FaHistory /> {t('plataforma.audit.tabLogs')}
        </button>
        <button
          type="button"
          onClick={() => setTab('drafts')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
            tab === 'drafts' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          }`}
        >
          <FaInbox /> {t('plataforma.audit.tabDrafts')}
        </button>
      </div>

      <form onSubmit={onBuscar} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
        <input
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder={t('plataforma.audit.search')}
          value={filtros.q}
          onChange={(e) => setFiltros((p) => ({ ...p, q: e.target.value }))}
        />
        <input
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder={t('plataforma.audit.user')}
          value={filtros.login}
          onChange={(e) => setFiltros((p) => ({ ...p, login: e.target.value }))}
        />
        {tab === 'logs' ? (
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            value={filtros.accion}
            onChange={(e) => setFiltros((p) => ({ ...p, accion: e.target.value }))}
          >
            {ACCIONES.map((a) => (
              <option key={a || 'all'} value={a}>
                {a || t('plataforma.audit.allActions')}
              </option>
            ))}
          </select>
        ) : (
          <div />
        )}
        <input
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder={t('plataforma.audit.module')}
          value={filtros.modulo}
          onChange={(e) => setFiltros((p) => ({ ...p, modulo: e.target.value }))}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white dark:bg-red-600"
          >
            <FaSearch /> {t('plataforma.audit.filter')}
          </button>
          <button
            type="button"
            onClick={() => (tab === 'logs' ? cargarLogs(page) : cargarBorradores())}
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:text-white"
            title={t('plataforma.audit.refresh')}
          >
            <FaSync />
          </button>
        </div>
      </form>

      {error ? (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">{t('plataforma.audit.loading')}</p>
      ) : tab === 'logs' ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <tr>
                  <th className="px-3 py-2">{t('plataforma.audit.when')}</th>
                  <th className="px-3 py-2">{t('plataforma.audit.user')}</th>
                  <th className="px-3 py-2">{t('plataforma.audit.action')}</th>
                  <th className="px-3 py-2">{t('plataforma.audit.module')}</th>
                  <th className="px-3 py-2">{t('plataforma.audit.detail')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                      {t('plataforma.audit.empty')}
                    </td>
                  </tr>
                ) : (
                  logs.map((row) => (
                    <tr key={row._id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="whitespace-nowrap px-3 py-2 text-gray-700 dark:text-gray-200">
                        {formatearFecha(row.occurredAt, locale)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {row.nombre || row.login || '—'}
                        </div>
                        <div className="text-xs text-gray-500">{row.login}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-semibold dark:bg-gray-700 dark:text-gray-100">
                          {row.accion}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.modulo}</td>
                      <td className="max-w-md px-3 py-2 text-gray-600 dark:text-gray-300">
                        {row.resumen || row.ruta}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
            <span>
              {t('plataforma.audit.total', { count: total })}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => cargarLogs(page - 1)}
                className="rounded border px-3 py-1 disabled:opacity-40 dark:border-gray-600"
              >
                {t('plataforma.audit.prev')}
              </button>
              <span>
                {page} / {pages}
              </span>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => cargarLogs(page + 1)}
                className="rounded border px-3 py-1 disabled:opacity-40 dark:border-gray-600"
              >
                {t('plataforma.audit.next')}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <tr>
                <th className="px-3 py-2">{t('plataforma.audit.when')}</th>
                <th className="px-3 py-2">{t('plataforma.audit.user')}</th>
                <th className="px-3 py-2">{t('plataforma.audit.module')}</th>
                <th className="px-3 py-2">{t('plataforma.audit.form')}</th>
                <th className="px-3 py-2">{t('plataforma.audit.expires')}</th>
              </tr>
            </thead>
            <tbody>
              {drafts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    {t('plataforma.audit.emptyDrafts')}
                  </td>
                </tr>
              ) : (
                drafts.map((row) => (
                  <tr key={row._id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="whitespace-nowrap px-3 py-2 text-gray-700 dark:text-gray-200">
                      {formatearFecha(row.savedAt, locale)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {row.nombre || row.login || '—'}
                      </div>
                      <div className="text-xs text-gray-500">{row.login}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.modulo}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.formKey}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {formatearFecha(row.expiresAt, locale)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
