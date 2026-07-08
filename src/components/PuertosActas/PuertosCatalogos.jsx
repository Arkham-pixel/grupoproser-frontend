import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaCheck, FaEdit, FaPlus, FaSync, FaTimes, FaTrashAlt } from 'react-icons/fa';
import {
  actualizarPuertosCatalogo,
  crearPuertosCatalogo,
  eliminarPuertosCatalogo,
  fetchPuertosCatalogo,
  labelTipoCatalogo,
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
  const puedeEditar = puedeEditarCatalogosPuertos();
  const [tab, setTab] = useState('inspector');
  const [items, setItems] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [editandoNombre, setEditandoNombre] = useState('');
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPuertosCatalogo(tab);
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
    setSuccess(null);
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
      await crearPuertosCatalogo(tab, nombre);
      setNuevo('');
      setSuccess(`«${nombre}» agregado a ${labelTipoCatalogo(tab).toLowerCase()}.`);
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
      setError('El nombre no puede quedar vacío.');
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
      await actualizarPuertosCatalogo(item._id, nombre);
      setSuccess('Nombre actualizado. Las actas existentes con ese valor también se actualizaron.');
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
      setSuccess(`«${item.nombre}» eliminado del catálogo.`);
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
        `Catálogos inicializados (${resultado.creados ?? 0} nuevos, ${resultado.reactivados ?? 0} reactivados).`
      );
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (!puedeEditar) {
    return (
      <div className={puertosAlertInfo}>
        Acceso denegado. Solo administración, soporte o usuarios del módulo Puertos pueden gestionar
        estos catálogos.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={puertosPageTitle}>Catálogos de Puertos</h2>
          <p className={puertosPageSubtitle}>
            Inspectores, empaques, tipos de avería y demás listas usadas en actas y formularios.
          </p>
        </div>
        <button
          type="button"
          className={puertosBtnSecondary}
          onClick={reiniciarDefaults}
          disabled={guardando}
          title="Cargar valores iniciales del sistema"
        >
          <FaSync />
          Restaurar valores base
        </button>
      </div>

      <section className={puertosCard}>
        <div className={`${puertosCardHeader} flex flex-wrap gap-2`}>
          {TIPOS_CATALOGO_PUERTOS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`rounded-lg px-3 py-1.5 font-body text-sm font-semibold transition ${
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

        <div className={`${puertosCardBody} space-y-4`}>
          <form onSubmit={agregar} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block font-body text-sm font-semibold text-gray-700 dark:text-gray-200">
                Nuevo ítem — {labelTipoCatalogo(tab)}
              </label>
              <input
                type="text"
                className={puertosInput}
                value={nuevo}
                onChange={(e) => setNuevo(e.target.value)}
                placeholder={`Nombre para ${labelTipoCatalogo(tab).toLowerCase()}…`}
                disabled={guardando}
              />
            </div>
            <button type="submit" className={puertosBtnPrimary} disabled={guardando || !nuevo.trim()}>
              <FaPlus />
              Agregar
            </button>
          </form>

          <input
            type="search"
            className={puertosInput}
            placeholder={`Buscar en ${labelTipoCatalogo(tab).toLowerCase()}…`}
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
              <p className="p-4 font-body text-sm text-gray-500">Cargando…</p>
            ) : filtrados.length === 0 ? (
              <p className="p-4 font-body text-sm italic text-gray-500">
                No hay registros. Agregue uno arriba o use «Restaurar valores base».
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
                        <input
                          type="text"
                          className={puertosInput}
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
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            className={`${puertosBtnPrimary} !py-1.5 !text-xs`}
                            onClick={() => guardarEdicion(item)}
                            disabled={guardando}
                            title="Guardar"
                          >
                            <FaCheck />
                          </button>
                          <button
                            type="button"
                            className={`${puertosBtnSecondary} !py-1.5 !text-xs`}
                            onClick={cancelarEdicion}
                            disabled={guardando}
                            title="Cancelar"
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
                            className={`${puertosBtnSecondary} !py-1.5 !text-xs`}
                            onClick={() => iniciarEdicion(item)}
                            disabled={guardando}
                            title="Editar nombre"
                          >
                            <FaEdit />
                          </button>
                          <button
                            type="button"
                            className={`${puertosBtnDanger} !py-1.5 !text-xs`}
                            onClick={() => setConfirmarEliminar(item)}
                            disabled={guardando}
                            title="Eliminar"
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
            {filtrados.length} de {items.length} en {labelTipoCatalogo(tab)}. Los cambios de nombre se
            reflejan en actas ya guardadas.
          </p>
        </div>
      </section>

      {confirmarEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
              Eliminar del catálogo
            </h3>
            <p className="mt-2 font-body text-sm text-gray-600 dark:text-gray-300">
              ¿Eliminar «{confirmarEliminar.nombre}»? Las actas ya guardadas conservan el valor
              histórico.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className={puertosBtnSecondary}
                onClick={() => setConfirmarEliminar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={puertosBtnDanger}
                onClick={() => eliminar(confirmarEliminar)}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
