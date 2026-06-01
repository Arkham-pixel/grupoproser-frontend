import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaCheck, FaEdit, FaPlus, FaTimes, FaTrashAlt } from 'react-icons/fa';
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

const TABS = [
  { id: 'estados', label: 'Estados' },
  { id: 'amparo', label: 'Amparos' },
  { id: 'analista', label: 'Analistas' },
  { id: 'intermediario', label: 'Intermediarios' },
];

const CatalogosExpress = () => {
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
      setSuccess('Ítem agregado al catálogo Express.');
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
      await actualizarExpressCatalogo(item._id, nombre);
      setSuccess('Nombre actualizado. Los casos Express con ese valor también se actualizaron.');
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
      titulo: 'Eliminar del catálogo',
      mensaje: `¿Eliminar «${item.nombre}»? Los casos ya guardados conservan el valor histórico.`,
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
      setSuccess('Ítem eliminado.');
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const tabActual = TABS.find((t) => t.id === tab);

  if (!puedeEditar) {
    return (
      <div className={expressPageWrap}>
        <section className={expressCard}>
          <div className={`${expressCardBody} ${expressAlertError}`}>
            Acceso denegado. Solo administración, soporte o usuarios autorizados pueden editar los
            catálogos Express.
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
            badge="Administración"
            title="Catálogos Express"
            subtitle="Estados del proceso, amparos, analistas e intermediarios usados en Carga Express."
          />
        </div>

        <div className={`${expressCardBody} space-y-6`}>
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
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
                    Nuevo {tabActual?.label?.slice(0, -1) ?? 'ítem'}
                  </label>
                  <InputFenix
                    value={nuevo}
                    onChange={(e) => setNuevo(e.target.value)}
                    placeholder={`Nombre de ${tabActual?.label?.toLowerCase() ?? 'catálogo'}…`}
                    disabled={guardando}
                  />
                </div>
                <button type="submit" className={expressBtnPrimary} disabled={guardando || !nuevo.trim()}>
                  <FaPlus className="mr-2 inline" />
                  Agregar
                </button>
              </form>

              {tab === 'intermediario' && !editandoId && (
                <input
                  type="search"
                  className={expressInput}
                  placeholder="Buscar intermediario…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              )}

              {error && <div className={expressAlertError}>{error}</div>}
              {success && <div className={expressAlertSuccess}>{success}</div>}

              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                {loading ? (
                  <p className="p-4 font-body text-sm text-gray-500">Cargando…</p>
                ) : filtrados.length === 0 ? (
                  <p className="p-4 font-body text-sm italic text-gray-500">
                    No hay registros. Agregue uno arriba o ejecute el seed en backend.
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
                                title="Guardar"
                              >
                                <FaCheck />
                              </button>
                              <button
                                type="button"
                                className={`${expressBtnSecondary} !py-1.5 !text-xs`}
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
                                className={`${expressBtnSecondary} !py-1.5 !text-xs`}
                                onClick={() => iniciarEdicion(item)}
                                disabled={guardando}
                                title="Editar nombre"
                              >
                                <FaEdit />
                              </button>
                              <button
                                type="button"
                                className={`${expressBtnSecondary} !border-red-200 !py-1.5 !text-xs !text-red-700 hover:!bg-red-50`}
                                onClick={() => confirmarEliminar(item)}
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
                {filtrados.length} de {items.length} en {tabActual?.label}. Use el ícono de lápiz para
                editar el nombre; los casos Express existentes se actualizan automáticamente.
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
        confirmTexto="Eliminar"
      />
    </div>
  );
};

export default CatalogosExpress;
