import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FaPaperclip,
  FaPlus,
  FaTicketAlt,
  FaTimes,
  FaComment,
  FaInbox,
  FaUser,
} from 'react-icons/fa';
import { BASE_URL, resolveUploadsUrl } from '../../config/apiConfig.js';

const TIPOS = [
  { value: 'queja', label: 'Queja / problema' },
  { value: 'bug', label: 'Error (bug)' },
  { value: 'mejora', label: 'Mejora' },
  { value: 'otro', label: 'Otro' },
];

const PRIORIDADES = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
];

const MODULOS = [
  'plataforma',
  'inicio',
  'complex',
  'express',
  'equidad-fdm',
  'equidad-cat',
  'seguros-alfa',
  'zurich',
  'bbva-cat',
  'allianz',
  'previsora',
  'sura',
  'puertos',
  'riesgos',
  'registro-fotografico',
  'otro',
];

const ESTADOS = [
  { value: 'abierto', label: 'Abierto' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'resuelto', label: 'Resuelto' },
  { value: 'cerrado', label: 'Cerrado' },
];

const ESTADO_STYLES = {
  abierto: 'bg-blue-50 text-blue-700 border-blue-200',
  en_progreso: 'bg-amber-50 text-amber-800 border-amber-200',
  resuelto: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cerrado: 'bg-gray-100 text-gray-600 border-gray-200',
};

const PRIORIDAD_STYLES = {
  baja: 'text-gray-600',
  media: 'text-amber-700',
  alta: 'text-red-700 font-semibold',
};

function etiquetaEstado(estado) {
  return ESTADOS.find((e) => e.value === estado)?.label || estado;
}

function etiquetaTipo(tipo) {
  return TIPOS.find((t) => t.value === tipo)?.label || tipo;
}

function authHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

function puedeVerBandejaTicketsLocal() {
  const login = String(localStorage.getItem('login') || '')
    .trim()
    .toLowerCase();
  // Misma lista por defecto que backend TICKETS_NOTIFY_LOGINS
  const logins = String(import.meta.env.VITE_TICKETS_BANDEJA_LOGINS || '1065012991')
    .split(/[,;]+/)
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(login && logins.includes(login));
}

const FORM_INICIAL = {
  titulo: '',
  descripcion: '',
  tipo: 'queja',
  modulo: 'plataforma',
  prioridad: 'media',
};

export default function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [puedeBandeja, setPuedeBandeja] = useState(() => puedeVerBandejaTicketsLocal());
  const [vista, setVista] = useState(() => (puedeVerBandejaTicketsLocal() ? 'todos' : 'mios'));
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [archivos, setArchivos] = useState([]); // { file, previewUrl }
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [comentario, setComentario] = useState('');
  const [estadoEdicion, setEstadoEdicion] = useState('abierto');
  const [guardandoDetalle, setGuardandoDetalle] = useState(false);

  const cargarTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        vista: puedeBandeja && vista === 'todos' ? 'todos' : 'mios',
      });
      const res = await fetch(`${BASE_URL}/api/tickets?${qs}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.mensaje || 'No se pudieron cargar los tickets');
      }
      if (typeof data.meta?.puedeBandeja === 'boolean') {
        setPuedeBandeja(data.meta.puedeBandeja);
      }
      setTickets(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message || 'Error cargando tickets');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [puedeBandeja, vista]);

  useEffect(() => {
    cargarTickets();
  }, [cargarTickets]);

  const abrirDetalle = useCallback(async (id) => {
    if (!id) return;
    setCargandoDetalle(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/api/tickets/${id}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.mensaje || 'No se pudo abrir el ticket');
      }
      setDetalle(data.data);
      setEstadoEdicion(data.data.estado || 'abierto');
      setComentario('');
      if (typeof data.meta?.puedeBandeja === 'boolean') {
        setPuedeBandeja(data.meta.puedeBandeja);
      }
      setSearchParams({ id: String(id) }, { replace: true });
    } catch (err) {
      setError(err.message || 'Error abriendo ticket');
    } finally {
      setCargandoDetalle(false);
    }
  }, [setSearchParams]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id && (!detalle || String(detalle._id) !== String(id))) {
      abrirDetalle(id);
    }
    // Solo reaccionar a cambios de query id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const cerrarDetalle = () => {
    setDetalle(null);
    setSearchParams({}, { replace: true });
  };

  const liberarPreviews = useCallback((lista) => {
    (lista || []).forEach((item) => {
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
  }, []);

  useEffect(() => {
    return () => liberarPreviews(archivos);
    // Solo al desmontar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeForm = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onArchivos = (e) => {
    const list = Array.from(e.target.files || []).slice(0, 5);
    liberarPreviews(archivos);
    const siguientes = list.map((file) => {
      const esImagen =
        /^image\//i.test(file.type) || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
      return {
        file,
        previewUrl: esImagen ? URL.createObjectURL(file) : null,
      };
    });
    setArchivos(siguientes);
    e.target.value = '';
  };

  const quitarArchivo = (index) => {
    setArchivos((prev) => {
      const copia = [...prev];
      const [quitado] = copia.splice(index, 1);
      if (quitado?.previewUrl) URL.revokeObjectURL(quitado.previewUrl);
      return copia;
    });
  };

  const crearTicket = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    setExito('');

    const buildFormData = () => {
      const fd = new FormData();
      fd.append('titulo', form.titulo.trim());
      fd.append('descripcion', form.descripcion.trim());
      fd.append('tipo', form.tipo);
      fd.append('modulo', form.modulo);
      fd.append('prioridad', form.prioridad);
      archivos.forEach((item) => fd.append('adjuntos', item.file));
      return fd;
    };

    const intentar = async () => {
      const res = await fetch(`${BASE_URL}/api/tickets`, {
        method: 'POST',
        headers: authHeaders(),
        body: buildFormData(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        const err = new Error(data.mensaje || 'No se pudo crear el ticket');
        err.status = res.status;
        throw err;
      }
      return data;
    };

    try {
      let data;
      try {
        data = await intentar();
      } catch (primerError) {
        if (!primerError.status || primerError.status >= 500) {
          await new Promise((r) => setTimeout(r, 800));
          data = await intentar();
        } else {
          throw primerError;
        }
      }

      setExito(data.mensaje || 'Ticket creado. Los avisos se envían en segundo plano.');
      setForm(FORM_INICIAL);
      liberarPreviews(archivos);
      setArchivos([]);
      setMostrarForm(false);
      await cargarTickets();
      if (data.data?._id) await abrirDetalle(data.data._id);
    } catch (err) {
      setError(err.message || 'Error creando ticket');
    } finally {
      setEnviando(false);
    }
  };

  const guardarGestion = async () => {
    if (!detalle?._id) return;
    setGuardandoDetalle(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/api/tickets/${detalle._id}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          estado: estadoEdicion,
          comentario: comentario.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.mensaje || 'No se pudo actualizar');
      }
      setDetalle(data.data);
      setComentario('');
      await cargarTickets();
      setExito('Ticket actualizado');
    } catch (err) {
      setError(err.message || 'Error actualizando ticket');
    } finally {
      setGuardandoDetalle(false);
    }
  };

  const enviarComentarioUsuario = async () => {
    if (!detalle?._id || !comentario.trim()) return;
    setGuardandoDetalle(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/api/tickets/${detalle._id}/comentarios`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ texto: comentario.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.mensaje || 'No se pudo comentar');
      }
      setDetalle(data.data);
      setComentario('');
      await cargarTickets();
    } catch (err) {
      setError(err.message || 'Error al comentar');
    } finally {
      setGuardandoDetalle(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <FaTicketAlt className="text-fenix-primario" />
            Tickets de plataforma
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
            Reporta quejas, errores o mejoras. Soporte recibe un correo en{' '}
            <span className="font-medium">danalyst@proserpuertos.com.co</span> y tú
            recibes confirmación.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMostrarForm((v) => {
              if (v) {
                liberarPreviews(archivos);
                setArchivos([]);
                setForm(FORM_INICIAL);
              }
              return !v;
            });
            setExito('');
            setError('');
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          {mostrarForm ? <FaTimes /> : <FaPlus />}
          {mostrarForm ? 'Cancelar' : 'Nuevo reporte'}
        </button>
      </div>

      {(error || exito) && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            error
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {error || exito}
        </div>
      )}

      {mostrarForm && (
        <form
          onSubmit={crearTicket}
          className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]"
        >
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
            Describir el problema
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2 block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
                Título *
              </span>
              <input
                name="titulo"
                value={form.titulo}
                onChange={onChangeForm}
                required
                maxLength={200}
                placeholder="Ej. No puedo subir fotos HEIC en registro fotográfico"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">Tipo</span>
              <select
                name="tipo"
                value={form.tipo}
                onChange={onChangeForm}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
                Módulo
              </span>
              <select
                name="modulo"
                value={form.modulo}
                onChange={onChangeForm}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              >
                {MODULOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
                Prioridad
              </span>
              <select
                name="prioridad"
                value={form.prioridad}
                onChange={onChangeForm}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              >
                {PRIORIDADES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2 block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
                Capturas / adjuntos (máx. 5)
              </span>
              <input
                type="file"
                accept="image/*,.pdf,.heic,.heif"
                multiple
                onChange={onArchivos}
                className="w-full text-sm"
              />
              {archivos.length > 0 && (
                <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                  {archivos.map((item, index) => (
                    <li
                      key={`${item.file.name}-${item.file.size}-${index}`}
                      className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                    >
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="h-28 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-28 flex-col items-center justify-center gap-1 px-2 text-center text-xs text-gray-500">
                          <FaPaperclip className="text-base" />
                          <span className="line-clamp-2 break-all">{item.file.name}</span>
                        </div>
                      )}
                      <p
                        className="truncate px-2 py-1 text-[11px] text-gray-600 dark:text-gray-300"
                        title={item.file.name}
                      >
                        {item.file.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => quitarArchivo(index)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
                        title="Quitar"
                        aria-label={`Quitar ${item.file.name}`}
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </label>
            <label className="sm:col-span-2 block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-200">
                Descripción *
              </span>
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={onChangeForm}
                required
                rows={5}
                maxLength={5000}
                placeholder="Qué pasó, en qué pantalla, y qué esperabas que ocurriera…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-lg bg-fenix-primario px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {enviando ? 'Enviando…' : 'Enviar ticket'}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setVista('mios')}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
            vista === 'mios'
              ? 'bg-fenix-primario text-white'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
          }`}
        >
          <FaUser /> Mis tickets
        </button>
        {puedeBandeja && (
          <button
            type="button"
            onClick={() => setVista('todos')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
              vista === 'todos'
                ? 'bg-fenix-primario text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
            }`}
          >
            <FaInbox /> Bandeja soporte
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]">
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Cargando tickets…</p>
        ) : tickets.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            No hay tickets todavía. Crea el primero con &quot;Nuevo reporte&quot;.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {tickets.map((t) => (
              <li key={t._id}>
                <button
                  type="button"
                  onClick={() => abrirDetalle(t._id)}
                  className="flex w-full flex-col gap-2 px-4 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-gray-900/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">{t.numero}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          ESTADO_STYLES[t.estado] || ESTADO_STYLES.abierto
                        }`}
                      >
                        {etiquetaEstado(t.estado)}
                      </span>
                      <span className={`text-xs ${PRIORIDAD_STYLES[t.prioridad] || ''}`}>
                        {t.prioridad}
                      </span>
                    </div>
                    <p className="mt-1 truncate font-medium text-gray-900 dark:text-white">
                      {t.titulo}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {etiquetaTipo(t.tipo)} · {t.modulo}
                      {vista === 'todos' ? ` · ${t.creadoPorNombre || t.creadoPorLogin}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {t.createdAt ? new Date(t.createdAt).toLocaleString('es-CO') : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(detalle || cargandoDetalle) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-xl dark:bg-[#1A1A1A] sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4 dark:border-gray-800 dark:bg-[#1A1A1A]">
              <div>
                <p className="text-xs font-semibold text-gray-500">{detalle?.numero || '…'}</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {detalle?.titulo || 'Cargando…'}
                </h3>
              </div>
              <button
                type="button"
                onClick={cerrarDetalle}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Cerrar"
              >
                <FaTimes />
              </button>
            </div>

            {cargandoDetalle || !detalle ? (
              <p className="p-6 text-sm text-gray-500">Cargando detalle…</p>
            ) : (
              <div className="space-y-5 p-5">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span
                    className={`rounded-full border px-2 py-0.5 font-semibold ${
                      ESTADO_STYLES[detalle.estado]
                    }`}
                  >
                    {etiquetaEstado(detalle.estado)}
                  </span>
                  <span className="rounded-full border border-gray-200 px-2 py-0.5">
                    {etiquetaTipo(detalle.tipo)}
                  </span>
                  <span className="rounded-full border border-gray-200 px-2 py-0.5">
                    {detalle.modulo}
                  </span>
                  <span className={`rounded-full border border-gray-200 px-2 py-0.5 ${PRIORIDAD_STYLES[detalle.prioridad]}`}>
                    Prioridad {detalle.prioridad}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Reportado por
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {detalle.creadoPorNombre || detalle.creadoPorLogin}
                    {detalle.creadoPorEmail ? ` · ${detalle.creadoPorEmail}` : ''}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Descripción
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                    {detalle.descripcion}
                  </p>
                </div>

                {detalle.adjuntos?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Adjuntos
                    </p>
                    <ul className="space-y-2">
                      {detalle.adjuntos.map((a) => {
                        const url = resolveUploadsUrl(a.ruta);
                        const esImg = /^image\//i.test(a.tipoMime || '') || /\.(jpe?g|png|gif|webp|heic)$/i.test(a.nombre || '');
                        return (
                          <li key={a.ruta}>
                            {esImg && url ? (
                              <a href={url} target="_blank" rel="noreferrer">
                                <img
                                  src={url}
                                  alt={a.nombre}
                                  className="max-h-48 rounded-lg border border-gray-200 object-contain dark:border-gray-700"
                                />
                              </a>
                            ) : (
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-fenix-primario hover:underline"
                              >
                                <FaPaperclip /> {a.nombre || 'Archivo'}
                              </a>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <FaComment /> Comentarios
                  </p>
                  {detalle.comentarios?.length ? (
                    <ul className="space-y-3">
                      {detalle.comentarios.map((c) => (
                        <li
                          key={c._id || `${c.autorLogin}-${c.creadoEn}`}
                          className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-900/40"
                        >
                          <p className="text-xs text-gray-500">
                            {c.autorNombre || c.autorLogin}
                            {c.creadoEn
                              ? ` · ${new Date(c.creadoEn).toLocaleString('es-CO')}`
                              : ''}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                            {c.texto}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">Sin comentarios aún.</p>
                  )}
                </div>

                {puedeBandeja ? (
                  <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Gestión soporte
                    </p>
                    <label className="block text-sm">
                      <span className="mb-1 block text-gray-600">Estado</span>
                      <select
                        value={estadoEdicion}
                        onChange={(e) => setEstadoEdicion(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                      >
                        {ESTADOS.map((e) => (
                          <option key={e.value} value={e.value}>
                            {e.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-gray-600">Comentario (opcional)</span>
                      <textarea
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                        placeholder="Respuesta o nota interna de seguimiento…"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={guardandoDetalle}
                      onClick={guardarGestion}
                      className="rounded-lg bg-fenix-primario px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {guardandoDetalle ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                    <label className="block text-sm">
                      <span className="mb-1 block text-gray-600">Agregar comentario</span>
                      <textarea
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                        placeholder="Información adicional…"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={guardandoDetalle || !comentario.trim()}
                      onClick={enviarComentarioUsuario}
                      className="rounded-lg bg-fenix-primario px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {guardandoDetalle ? 'Enviando…' : 'Enviar comentario'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
