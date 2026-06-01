// src/components/Inicio.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FaRocket,
  FaClipboardList,
  FaWrench,
  FaChartBar,
  FaHome,
  FaBullhorn,
  FaSearch,
  FaStickyNote,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
} from 'react-icons/fa';
import { BASE_URL } from '../config/apiConfig.js';

const API = `${BASE_URL}/api`;
const MAX_TAREA_CHARS = 20;

function primerNombre(nombre) {
  return String(nombre || 'Usuario').trim().split(/\s+/)[0] || 'Usuario';
}

function diasDesde(fecha) {
  const hoy = new Date();
  const fechaCom = new Date(fecha);
  const diff = Math.floor((hoy - fechaCom) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Hace 1 día';
  return `Hace ${diff} días`;
}

const PRIORIDAD_STYLES = {
  ALTA: 'bg-red-100 text-red-800',
  MEDIA: 'bg-amber-100 text-amber-800',
  BAJA: 'bg-emerald-100 text-emerald-800',
};

const accesosDirectos = [
  { path: '/formularioinspeccion', icon: FaClipboardList, label: 'Formulario Inspección', key: 'inspeccion', accent: true },
  { path: '/formulario-maquinaria', icon: FaWrench, label: 'Formulario Maquinarias', key: 'maquinaria', accent: false },
  { path: '/ajuste', icon: FaChartBar, label: 'Formulario Ajuste', key: 'ajuste', accent: true },
];

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-fenix-primario focus:outline-none focus:ring-2 focus:ring-fenix-primario/20';

const btnPrimary =
  'inline-flex shrink-0 items-center justify-center rounded-lg bg-fenix-primario px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-fenix-primario/40';

const cardDashboard =
  'rounded-2xl border border-gray-100 bg-white shadow-sm';

const sectionTitle =
  'mb-5 flex items-center gap-2 border-l-4 border-fenix-primario pl-3 font-heading text-lg font-bold text-gray-900 sm:text-xl';

export default function Inicio() {
  const navigate = useNavigate();

  const [tareas, setTareas] = useState([]);
  const [nuevaTarea, setNuevaTarea] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaPrioridad, setNuevaPrioridad] = useState('MEDIA');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [editTexto, setEditTexto] = useState('');
  const [editFecha, setEditFecha] = useState('');
  const [editPrioridad, setEditPrioridad] = useState('MEDIA');
  const [editEmail, setEditEmail] = useState('');
  const [busquedaTarea, setBusquedaTarea] = useState('');

  const [comunicados, setComunicados] = useState([]);
  const [nuevoComunicado, setNuevoComunicado] = useState({ titulo: '', mensaje: '', duracion: 1 });
  const [editandoComId, setEditandoComId] = useState(null);
  const [editComunicado, setEditComunicado] = useState({ titulo: '', mensaje: '' });
  const [busquedaComunicado, setBusquedaComunicado] = useState('');
  const [usuarioActual, setUsuarioActual] = useState({ nombre: 'Usuario', rol: 'usuario', login: '', email: '' });

  const obtenerContadorUso = (key) => {
    const login = localStorage.getItem('login');
    if (!login) return 0;
    const usoData = localStorage.getItem(`acceso_directo_${login}`);
    if (!usoData) return 0;
    return JSON.parse(usoData)[key] || 0;
  };

  const incrementarUso = (key) => {
    const login = localStorage.getItem('login');
    if (!login) return;
    const uso = JSON.parse(localStorage.getItem(`acceso_directo_${login}`) || '{}');
    uso[key] = (uso[key] || 0) + 1;
    localStorage.setItem(`acceso_directo_${login}`, JSON.stringify(uso));
  };

  const accesosOrdenados = [...accesosDirectos].sort(
    (a, b) => obtenerContadorUso(b.key) - obtenerContadorUso(a.key)
  );

  const handleAccesoDirecto = (acceso) => {
    incrementarUso(acceso.key);
    navigate(acceso.path);
  };

  useEffect(() => {
    const login = localStorage.getItem('login');
    if (!login) return;

    setUsuarioActual({
      nombre: localStorage.getItem('nombre') || 'Usuario',
      rol: localStorage.getItem('rol') || 'usuario',
      login,
      email: localStorage.getItem('email') || '',
    });

    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const fetchTareas = async () => {
      try {
        const res = await axios.get(`${API}/tareas?login=${login}`, { headers });
        setTareas(Array.isArray(res.data.data) ? res.data.data : []);
      } catch {
        setTareas([]);
      }
    };
    const fetchComunicados = async () => {
      try {
        const res = await axios.get(`${API}/comunicados`, { headers });
        setComunicados(Array.isArray(res.data) ? res.data : []);
      } catch {
        setComunicados([]);
      }
    };
    fetchTareas();
    fetchComunicados();
  }, []);

  const agregarTarea = async () => {
    if (!nuevaTarea.trim() || !nuevaFecha) {
      alert('Debes ingresar la tarea y la fecha');
      return;
    }
    const hoy = new Date();
    const fechaHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    if (new Date(nuevaFecha) < fechaHoy) {
      alert('La fecha no puede ser pasada');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        `${API}/tareas`,
        {
          login: usuarioActual.login,
          texto: nuevaTarea,
          fecha: nuevaFecha,
          prioridad: nuevaPrioridad,
          emailResponsable: usuarioActual.email || nuevoEmail,
        },
        { headers }
      );
      setTareas([...tareas, res.data.data]);
      setNuevaTarea('');
      setNuevaFecha('');
      setNuevaPrioridad('MEDIA');
      setNuevoEmail('');
      alert('Tarea agregada');
    } catch {
      alert('Error al agregar tarea');
    }
  };

  const guardarEdicion = async (id) => {
    if (!editTexto.trim() || !editFecha) {
      alert('Debes ingresar la tarea y la fecha');
      return;
    }
    if (new Date(editFecha) < new Date(new Date().toISOString().slice(0, 10))) {
      alert('La fecha no puede ser pasada');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.put(
        `${API}/tareas/${id}`,
        {
          texto: editTexto,
          fecha: editFecha,
          prioridad: editPrioridad,
          emailResponsable: usuarioActual.email || editEmail,
        },
        { headers }
      );
      setTareas(tareas.map((t) => (t._id === id ? res.data.data : t)));
      setEditandoId(null);
      setEditTexto('');
      setEditFecha('');
      setEditPrioridad('MEDIA');
      setEditEmail('');
      alert('Tarea editada');
    } catch {
      alert('Error al editar tarea');
    }
  };

  const toggleCumplida = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.patch(`${API}/tareas/${id}/cumplida`, {}, { headers });
      setTareas(tareas.map((t) => (t._id === id ? res.data.data : t)));
    } catch {
      alert('Error al actualizar tarea');
    }
  };

  const eliminarTarea = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`${API}/tareas/${id}`, { headers });
      setTareas(tareas.filter((t) => t._id !== id));
      alert('Tarea eliminada');
    } catch {
      alert('Error al eliminar tarea');
    }
  };

  const puedeGestionarComunicados =
    usuarioActual.rol === 'admin' || usuarioActual.rol === 'soporte';

  const agregarComunicado = async () => {
    if (!nuevoComunicado.titulo.trim() || !nuevoComunicado.mensaje.trim() || nuevoComunicado.duracion <= 0) {
      alert('Debes ingresar título, mensaje y duración válida');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const fechaInicio = new Date();
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaInicio.getDate() + Number(nuevoComunicado.duracion));
      const res = await axios.post(
        `${API}/comunicados`,
        {
          titulo: nuevoComunicado.titulo,
          mensaje: nuevoComunicado.mensaje,
          fecha: fechaInicio,
          fechaFin,
          duracion: nuevoComunicado.duracion,
        },
        { headers }
      );
      setComunicados([...comunicados, res.data]);
      setNuevoComunicado({ titulo: '', mensaje: '', duracion: 1 });
      alert('Comunicado agregado');
    } catch {
      alert('Error al agregar comunicado');
    }
  };

  const eliminarComunicado = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`${API}/comunicados/${id}`, { headers });
      setComunicados(comunicados.filter((c) => c._id !== id));
      alert('Comunicado eliminado');
    } catch {
      alert('Error al eliminar comunicado');
    }
  };

  const iniciarEdicionCom = (com) => {
    setEditandoComId(com._id);
    setEditComunicado({ titulo: com.titulo, mensaje: com.mensaje });
  };

  const guardarEdicionCom = async (id) => {
    if (!editComunicado.titulo.trim() || !editComunicado.mensaje.trim()) {
      alert('Debes ingresar título y mensaje');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.put(`${API}/comunicados/${id}`, editComunicado, { headers });
      setComunicados(comunicados.map((c) => (c._id === id ? res.data : c)));
      setEditandoComId(null);
      setEditComunicado({ titulo: '', mensaje: '' });
      alert('Comunicado editado');
    } catch {
      alert('Error al editar comunicado');
    }
  };

  const tareasFiltradas = tareas.filter((t) =>
    t.texto?.toLowerCase().includes(busquedaTarea.toLowerCase())
  );
  const comunicadosFiltrados = comunicados.filter(
    (c) =>
      c.titulo?.toLowerCase().includes(busquedaComunicado.toLowerCase()) ||
      c.mensaje?.toLowerCase().includes(busquedaComunicado.toLowerCase())
  );

  const tareasPendientes = tareas.filter((t) => !t.cumplida).length;

  return (
    <div className="min-h-full bg-[#F5F5F7] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6 lg:space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Hola, {primerNombre(usuarioActual.nombre)}
            </h1>
            <p className="mt-1 text-sm text-gray-500 sm:text-base">Bienvenido a ARNALD Data Flow</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
              {tareasPendientes} tarea{tareasPendientes !== 1 ? 's' : ''} pendiente{tareasPendientes !== 1 ? 's' : ''}
            </span>
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
              {comunicados.length} comunicado{comunicados.length !== 1 ? 's' : ''}
            </span>
          </div>
        </header>

        {/* Accesos directos */}
        <section className={`${cardDashboard} p-5 sm:p-6`}>
          <h2 className={sectionTitle}>
            <FaRocket className="text-fenix-primario" />
            Accesos Directos
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {accesosOrdenados.map((acceso) => {
              const Icon = acceso.icon;
              return (
                <button
                  key={acceso.key}
                  type="button"
                  onClick={() => handleAccesoDirecto(acceso)}
                  className="group flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50/80 p-6 transition hover:border-fenix-primario/40 hover:bg-white hover:shadow-md"
                >
                  <Icon
                    className={`mb-3 text-3xl transition group-hover:scale-110 ${
                      acceso.accent ? 'text-fenix-primario' : 'text-gray-400 group-hover:text-gray-600'
                    }`}
                  />
                  <span className="text-center text-sm font-semibold text-gray-800">{acceso.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Grid principal */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
          {/* Mis tareas — columna ancha */}
          <section className={`${cardDashboard} p-5 sm:p-6 lg:col-span-3`}>
            <h2 className={sectionTitle}>
              <FaHome className="text-fenix-primario" />
              Mis Tareas
            </h2>

            <div className="mb-4 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    placeholder="Nueva tarea"
                    maxLength={MAX_TAREA_CHARS}
                    className={inputClass}
                    value={nuevaTarea}
                    onChange={(e) => setNuevaTarea(e.target.value)}
                  />
                  <p className="mt-1 text-right text-xs text-gray-400">
                    {nuevaTarea.length}/{MAX_TAREA_CHARS}
                  </p>
                </div>
                <input
                  type="date"
                  className={`${inputClass} sm:w-40`}
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                />
                <select
                  className={`${inputClass} sm:w-36`}
                  value={nuevaPrioridad}
                  onChange={(e) => setNuevaPrioridad(e.target.value)}
                >
                  <option value="BAJA">Baja</option>
                  <option value="MEDIA">Media</option>
                  <option value="ALTA">Alta</option>
                </select>
                <button type="button" className={btnPrimary} onClick={agregarTarea}>
                  Agregar
                </button>
              </div>

              <input
                type="email"
                placeholder="Email para alertas (opcional)"
                className={inputClass}
                value={nuevoEmail}
                onChange={(e) => setNuevoEmail(e.target.value)}
              />

              {usuarioActual.email && (
                <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                  Las alertas se enviarán a: {usuarioActual.email}
                </p>
              )}

              <div className="relative">
                <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar tarea..."
                  id="buscar-tarea-inicio"
                  className={`${inputClass} pl-9`}
                  value={busquedaTarea}
                  onChange={(e) => setBusquedaTarea(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-red-50/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                    <th className="px-3 py-3 sm:px-4">Tarea</th>
                    <th className="hidden px-3 py-3 sm:table-cell sm:px-4">Fecha</th>
                    <th className="hidden px-3 py-3 md:table-cell sm:px-4 text-center">Prioridad</th>
                    <th className="px-3 py-3 text-center sm:px-4">Estado</th>
                    <th className="px-3 py-3 text-center sm:px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tareasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                        <FaStickyNote className="mx-auto mb-2 text-3xl text-gray-300" />
                        <p>No hay tareas registradas</p>
                      </td>
                    </tr>
                  ) : (
                    tareasFiltradas.map((t, idx) => (
                      <tr
                        key={t._id}
                        className={`border-t border-gray-100 ${idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}
                      >
                        <td className="px-3 py-3 sm:px-4">
                          {editandoId === t._id ? (
                            <div className="space-y-2">
                              <input
                                className={inputClass}
                                value={editTexto}
                                onChange={(e) => setEditTexto(e.target.value)}
                              />
                              <input
                                type="email"
                                className={inputClass}
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                placeholder="Email alertas"
                              />
                            </div>
                          ) : (
                            <div>
                              <span className={t.cumplida ? 'text-gray-400 line-through' : 'text-gray-800'}>
                                {t.texto}
                              </span>
                              <span className="mt-1 block text-xs text-gray-500 sm:hidden">{t.fecha}</span>
                            </div>
                          )}
                        </td>
                        <td className="hidden px-3 py-3 text-gray-600 sm:table-cell sm:px-4">
                          {editandoId === t._id ? (
                            <input
                              type="date"
                              className={inputClass}
                              value={editFecha}
                              onChange={(e) => setEditFecha(e.target.value)}
                            />
                          ) : (
                            t.fecha
                          )}
                        </td>
                        <td className="hidden px-3 py-3 md:table-cell sm:px-4 text-center">
                          {editandoId === t._id ? (
                            <select
                              className={inputClass}
                              value={editPrioridad}
                              onChange={(e) => setEditPrioridad(e.target.value)}
                            >
                              <option value="BAJA">Baja</option>
                              <option value="MEDIA">Media</option>
                              <option value="ALTA">Alta</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                PRIORIDAD_STYLES[t.prioridad] || PRIORIDAD_STYLES.MEDIA
                              }`}
                            >
                              {t.prioridad === 'ALTA' ? 'Alta' : t.prioridad === 'BAJA' ? 'Baja' : 'Media'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center sm:px-4">
                          <input
                            type="checkbox"
                            checked={t.cumplida}
                            onChange={() => toggleCumplida(t._id)}
                            className="h-4 w-4 accent-fenix-primario"
                          />
                        </td>
                        <td className="px-3 py-3 sm:px-4">
                          <div className="flex justify-center gap-1">
                            {editandoId === t._id ? (
                              <>
                                <button
                                  type="button"
                                  className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50"
                                  onClick={() => guardarEdicion(t._id)}
                                  title="Guardar"
                                >
                                  <FaCheck />
                                </button>
                                <button
                                  type="button"
                                  className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                                  onClick={() => setEditandoId(null)}
                                  title="Cancelar"
                                >
                                  <FaTimes />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-fenix-primario"
                                  onClick={() => {
                                    setEditandoId(t._id);
                                    setEditTexto(t.texto);
                                    setEditFecha(t.fecha);
                                    setEditPrioridad(t.prioridad || 'MEDIA');
                                    setEditEmail(t.emailResponsable || '');
                                  }}
                                  title="Editar"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  type="button"
                                  className="rounded p-1.5 text-red-500 hover:bg-red-50"
                                  onClick={() => eliminarTarea(t._id)}
                                  title="Eliminar"
                                >
                                  <FaTrash />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Comunicados */}
          <section className={`${cardDashboard} p-5 sm:p-6 lg:col-span-2`}>
            <h2 className={sectionTitle}>
              <FaBullhorn className="text-gray-400" />
              Comunicados
            </h2>

            <div className="relative mb-4">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar comunicado..."
                className={`${inputClass} pl-9`}
                value={busquedaComunicado}
                onChange={(e) => setBusquedaComunicado(e.target.value)}
              />
            </div>

            {puedeGestionarComunicados && (
              <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-800">Nuevo Comunicado</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Título del comunicado"
                    className={inputClass}
                    value={nuevoComunicado.titulo}
                    onChange={(e) => setNuevoComunicado({ ...nuevoComunicado, titulo: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Mensaje del comunicado"
                    className={inputClass}
                    value={nuevoComunicado.mensaje}
                    onChange={(e) => setNuevoComunicado({ ...nuevoComunicado, mensaje: e.target.value })}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <input
                      type="number"
                      min={1}
                      placeholder="Duración (días)"
                      className={`${inputClass} sm:w-32`}
                      value={nuevoComunicado.duracion}
                      onChange={(e) =>
                        setNuevoComunicado({ ...nuevoComunicado, duracion: e.target.value })
                      }
                    />
                    <button type="button" className={btnPrimary} onClick={agregarComunicado}>
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {comunicadosFiltrados.length === 0 ? (
                <div className="py-10 text-center text-gray-500">
                  <FaBullhorn className="mx-auto mb-2 text-3xl text-gray-300" />
                  <p className="text-sm">No hay comunicados</p>
                </div>
              ) : (
                comunicadosFiltrados.map((c, idx) => (
                  <article
                    key={c._id || idx}
                    className="rounded-lg border border-gray-100 p-4 transition hover:border-gray-200 hover:bg-gray-50/50"
                  >
                    {editandoComId === c._id ? (
                      <div className="space-y-2">
                        <input
                          className={inputClass}
                          value={editComunicado.titulo}
                          onChange={(e) =>
                            setEditComunicado({ ...editComunicado, titulo: e.target.value })
                          }
                        />
                        <input
                          className={inputClass}
                          value={editComunicado.mensaje}
                          onChange={(e) =>
                            setEditComunicado({ ...editComunicado, mensaje: e.target.value })
                          }
                        />
                        <div className="flex gap-2">
                          <button type="button" className={btnPrimary} onClick={() => guardarEdicionCom(c._id)}>
                            Guardar
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                            onClick={() => setEditandoComId(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                          <h4 className="font-semibold text-gray-800">{c.titulo}</h4>
                          {puedeGestionarComunicados && (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="rounded p-1 text-gray-500 hover:text-fenix-primario"
                                onClick={() => iniciarEdicionCom(c)}
                              >
                                <FaEdit />
                              </button>
                              <button
                                type="button"
                                className="rounded p-1 text-red-500 hover:bg-red-50"
                                onClick={() => eliminarComunicado(c._id)}
                              >
                                <FaTrash />
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{c.mensaje}</p>
                        <p className="mt-2 text-xs text-gray-400">
                          {c.fecha} · {diasDesde(c.fecha)}
                          {c.fechaFin ? ` · Vigente hasta: ${c.fechaFin}` : ''}
                        </p>
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
