import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listarRespuestasEncuestaDocumentacion,
  descargarZipUsuarioEncuesta,
  descargarZipTodosEncuesta,
} from '../../services/encuestaDocumentacionExternosService';

function fmtFecha(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

export default function EncuestaDocumentacionAdmin() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [busyAll, setBusyAll] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listarRespuestasEncuestaDocumentacion({ q: q.trim() || undefined });
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'No se pudo cargar el listado');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    cargar();
  }, []); // primera carga

  const items = data?.items || [];
  const campos = data?.campos || [];

  const resumen = useMemo(
    () => ({
      total: data?.total ?? 0,
      conDocumentos: data?.conDocumentos ?? 0,
      finalizados: data?.finalizados ?? 0,
      ciclo: data?.ciclo || '—',
    }),
    [data]
  );

  const onDescargarUsuario = async (row) => {
    setBusyId(row.id);
    setError('');
    try {
      await descargarZipUsuarioEncuesta(row.id, `${row.login}_documentacion.zip`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al descargar ZIP');
    } finally {
      setBusyId(null);
    }
  };

  const onDescargarTodos = async () => {
    setBusyAll(true);
    setError('');
    try {
      await descargarZipTodosEncuesta(resumen.ciclo);
    } catch (err) {
      let msg = err.message || 'Error al descargar ZIP';
      try {
        if (err.response?.data instanceof Blob) {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed?.message) msg = parsed.message;
        } else if (err.response?.data?.message) {
          msg = err.response.data.message;
        }
      } catch {
        /* ignore */
      }
      setError(msg);
    } finally {
      setBusyAll(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Encuesta de documentación – respuestas
        </h1>
        <p className="mt-1 text-sm text-slate-600 max-w-3xl">
          Aquí ve quién ya envió documentos del ciclo {resumen.ciclo}. Puede bajar la carpeta ZIP de
          cada persona o un ZIP con todas las carpetas.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Respuestas</p>
          <p className="text-2xl font-semibold text-slate-900">{resumen.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Con documentos</p>
          <p className="text-2xl font-semibold text-slate-900">{resumen.conDocumentos}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Marcaron “Ya terminé”</p>
          <p className="text-2xl font-semibold text-slate-900">{resumen.finalizados}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') cargar();
          }}
          placeholder="Buscar por nombre, login o correo…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={cargar}
          disabled={loading}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? 'Cargando…' : 'Buscar'}
        </button>
        <button
          type="button"
          onClick={onDescargarTodos}
          disabled={busyAll || !resumen.conDocumentos}
          className="rounded-lg bg-[#7b3fa0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6a3590] disabled:opacity-60"
        >
          {busyAll ? 'Preparando ZIP…' : 'Bajar todas las carpetas'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Usuario</th>
              <th className="px-3 py-2 font-medium">Rol</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Docs</th>
              <th className="px-3 py-2 font-medium">Último envío</th>
              <th className="px-3 py-2 font-medium">Documentos</th>
              <th className="px-3 py-2 font-medium text-right">Descarga</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  Cargando respuestas…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  Todavía no hay envíos en este ciclo.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-900">
                      {row.nombreCompleto || row.name}
                    </div>
                    <div className="text-xs text-slate-500">{row.login}</div>
                    <div className="text-xs text-slate-500">{row.correo || row.email}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{row.role}</td>
                  <td className="px-3 py-3">
                    {row.completada ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        Finalizado
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                        En progreso
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-800">
                    {row.cantidadDocumentos}/{campos.length || 6}
                  </td>
                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">
                    {fmtFecha(row.ultimoEnvioEn)}
                  </td>
                  <td className="px-3 py-3">
                    <ul className="space-y-0.5 text-xs text-slate-600">
                      {campos.map((c) => {
                        const ok = row.documentos?.[c.key]?.cargado;
                        return (
                          <li key={c.key} className={ok ? 'text-emerald-700' : 'text-slate-400'}>
                            {ok ? '✓' : '·'} {c.label}
                          </li>
                        );
                      })}
                    </ul>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      disabled={busyId === row.id || row.cantidadDocumentos === 0}
                      onClick={() => onDescargarUsuario(row)}
                      className="rounded-lg border border-[#7b3fa0] px-3 py-1.5 text-xs font-semibold text-[#7b3fa0] hover:bg-purple-50 disabled:opacity-50"
                    >
                      {busyId === row.id ? 'Bajando…' : 'Bajar carpeta'}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
