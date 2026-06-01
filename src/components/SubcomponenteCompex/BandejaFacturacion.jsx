import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaInbox, FaSearch, FaSync, FaEdit, FaTrash } from 'react-icons/fa';
import {
  obtenerBandejaFacturacion,
  corregirEnvioBandejaFacturacion,
  eliminarEnvioBandejaFacturacion,
} from '../../services/complexService';
import { getEstados } from '../../services/estadosService';
import { BASE_URL } from '../../config/apiConfig';
import { crearResolverNombreAseguradora } from '../../utils/aseguradoraResolver';
import { formatearFechaUI } from '../../utils/fechaUtils';
import {
  GERENTES_FACTURACION_OPCIONES,
  TIPO_ENVIO_LABELS,
  esUsuarioGerenteFacturacion,
  puedeElegirGerenteEnBandeja,
  puedeAdministrarBandejaFacturacion,
  gerenteDesdeLogin,
  nombreGerente,
  resolverNombreEstadoDesdeCatalogo,
} from '../../config/gerentesFacturacion';
import {
  complexPageWrapWide,
  complexCard,
  complexPageTitle,
  complexPageSubtitle,
  complexBtnPrimary,
  complexBtnSecondary,
  complexInput,
  complexSelect,
  complexTableGrid,
  complexTableThDivider,
  complexTableTdDivider,
  complexTableBtnGestionar,
  complexInfoPanel,
} from './complexFenixUi';
import { ComplexNavTabs } from './ComplexUiBlocks';

export default function BandejaFacturacion() {
  const navigate = useNavigate();
  const login = localStorage.getItem('login') || '';
  const esSupervisor = puedeElegirGerenteEnBandeja(login);
  const puedeAdministrar = puedeAdministrarBandejaFacturacion(login);
  const gerentePropio = gerenteDesdeLogin(login);

  const [gerenteFiltro, setGerenteFiltro] = useState(gerentePropio || (esSupervisor ? 'elkin' : ''));
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [items, setItems] = useState([]);
  const [estadosCatalogo, setEstadosCatalogo] = useState([]);
  const [clientesCatalogo, setClientesCatalogo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filaEditando, setFilaEditando] = useState(null);
  const [nuevoGerenteCorreccion, setNuevoGerenteCorreccion] = useState('');
  const [guardandoAdmin, setGuardandoAdmin] = useState(false);

  const puedeAcceder = esUsuarioGerenteFacturacion(login);

  const cargar = useCallback(async () => {
    if (!puedeAcceder) return;
    if (!gerenteFiltro && esSupervisor) {
      setError('Seleccione el jefe para ver su bandeja');
      setItems([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    setError('');
    try {
      const data = await obtenerBandejaFacturacion({
        gerente: gerenteFiltro,
        tipo: tipoFiltro,
        desde: desde || undefined,
        hasta: hasta || undefined,
        q: busqueda.trim() || undefined,
      });
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(e.message || 'No se pudo cargar la bandeja');
      setItems([]);
    } finally {
      setCargando(false);
    }
  }, [puedeAcceder, gerenteFiltro, tipoFiltro, desde, hasta, busqueda, esSupervisor]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    getEstados()
      .then((data) => {
        const lista = Array.isArray(data) ? data : data?.data || [];
        setEstadosCatalogo(lista);
      })
      .catch(() => setEstadosCatalogo([]));
  }, []);

  useEffect(() => {
    fetch(`${BASE_URL}/api/clientes`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setClientesCatalogo(Array.isArray(data) ? data : []))
      .catch(() => setClientesCatalogo([]));
  }, []);

  const resolverNombreAseguradora = useMemo(
    () => crearResolverNombreAseguradora(clientesCatalogo),
    [clientesCatalogo]
  );

  const tituloGerente = useMemo(() => nombreGerente(gerenteFiltro), [gerenteFiltro]);

  const abrirCaso = (casoId) => {
    if (!casoId) return;
    navigate(`/editar-caso/${casoId}`, {
      state: { returnPath: '/complex/bandeja-facturacion' },
    });
  };

  const payloadEnvio = (fila) => ({
    casoId: fila.casoId,
    envioId: fila.envioId,
    envioIndice: fila.envioIndice,
    fechaEnvio: fila.fechaEnvio,
    gerente: fila.gerente,
    tipoEnvio: fila.tipoEnvio,
    enviadoPor: fila.enviadoPor,
  });

  const abrirCorreccion = (fila) => {
    setFilaEditando(fila);
    setNuevoGerenteCorreccion(fila.gerente || 'elkin');
  };

  const guardarCorreccion = async () => {
    if (!filaEditando || !nuevoGerenteCorreccion) return;
    if (nuevoGerenteCorreccion === filaEditando.gerente) {
      setFilaEditando(null);
      return;
    }
    setGuardandoAdmin(true);
    try {
      await corregirEnvioBandejaFacturacion({
        ...payloadEnvio(filaEditando),
        nuevoGerente: nuevoGerenteCorreccion,
      });
      setFilaEditando(null);
      alert(
        `Destinatario actualizado a ${nombreGerente(nuevoGerenteCorreccion)}. El caso no se duplicó; solo se corrigió el registro del envío.`
      );
      await cargar();
    } catch (e) {
      alert(e.message || 'Error al corregir');
    } finally {
      setGuardandoAdmin(false);
    }
  };

  const quitarEnvio = async (fila) => {
    const nombre = fila.nombreGerente || nombreGerente(fila.gerente);
    const msg =
      `¿Quitar este registro de envío a ${nombre}?\n\n` +
      `Caso ${fila.nmroAjste || fila.casoId} — no se elimina el caso Complex, solo la línea en la bandeja.`;
    if (!window.confirm(msg)) return;

    setGuardandoAdmin(true);
    try {
      await eliminarEnvioBandejaFacturacion(payloadEnvio(fila));
      await cargar();
    } catch (e) {
      alert(e.message || 'Error al quitar el registro');
    } finally {
      setGuardandoAdmin(false);
    }
  };

  if (!puedeAcceder) {
    return (
      <div className={complexPageWrapWide}>
        <div className={complexCard}>
          <p className="text-gray-600 dark:text-gray-300">
            Esta vista está disponible solo para los jefes de facturación autorizados.
          </p>
        </div>
      </div>
    );
  }

  const thClase = `${complexTableThDivider} px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap`;
  const tdClase = `${complexTableTdDivider} px-3 py-3 text-sm align-top`;

  return (
    <div className={complexPageWrapWide}>
      <header className="mb-6 space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-fenix-primario/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-fenix-primario">
          <FaInbox /> Facturación
        </span>
        <h1 className={complexPageTitle}>Bandeja de casos para facturar.</h1>
        <p className={complexPageSubtitle}>
          Casos que los ajustadores enviaron a {tituloGerente}. Abra cada caso sin buscarlo en el reporte
          completo.
        </p>
        {/* PRUEBA DE SICRONIZACION CON CO0LIFY */}
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          PRUEBA DE SICRONIZACION CON CO0LIFY.
        </p>
        <ComplexNavTabs activePath="/complex/bandeja-facturacion" />
      </header>

      <div className={`${complexCard} mb-6 space-y-4`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {esSupervisor && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">Jefe / gerente</span>
              <select
                className={complexSelect}
                value={gerenteFiltro}
                onChange={(e) => setGerenteFiltro(e.target.value)}
              >
                <option value="">Seleccione…</option>
                {GERENTES_FACTURACION_OPCIONES.map((g) => (
                  <option key={g.clave} value={g.clave}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">Tipo de envío</span>
            <select
              className={complexSelect}
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="control_horas">Control de horas</option>
              <option value="gerencia">Gerencia / facturación</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">Desde</span>
            <input type="date" className={complexInput} value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">Hasta</span>
            <input type="date" className={complexInput} value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">Buscar</span>
            <div className="relative">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                className={`${complexInput} pl-9`}
                placeholder="No. ajuste, siniestro, aseguradora, asegurado…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && cargar()}
              />
            </div>
          </label>
          <button type="button" className={complexBtnPrimary} onClick={cargar} disabled={cargando}>
            <FaSearch className="inline mr-2" />
            Buscar
          </button>
          <button type="button" className={complexBtnSecondary} onClick={cargar} disabled={cargando}>
            <FaSync className={`inline mr-2 ${cargando ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        <div className={complexInfoPanel}>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {cargando
              ? 'Cargando…'
              : `${items.length} envío${items.length === 1 ? '' : 's'} registrado${items.length === 1 ? '' : 's'} con el jefe destino del correo. Cada vez que se envía control de horas o gerencia, queda guardado a quién se notificó.`}
          </p>
          {puedeAdministrar && (
            <p className="mt-2 text-sm font-medium text-fenix-primario">
              Como supervisor puede corregir el jefe destinatario o quitar un registro erróneo sin duplicar
              casos ni borrar el caso en el sistema.
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <div className={`${complexCard} p-0 sm:p-0 overflow-hidden`}>
        <div className="w-full overflow-x-auto">
          <table className={`${complexTableGrid} w-full min-w-[1320px] table-auto`}>
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className={thClase}>No. Ajuste</th>
                <th className={thClase}>Siniestro</th>
                <th className={`${thClase} min-w-[140px]`}>Aseguradora</th>
                <th className={`${thClase} min-w-[140px]`}>Asegurado</th>
                <th className={`${thClase} min-w-[120px]`}>Responsable</th>
                <th className={`${thClase} min-w-[130px]`}>Tipo envío</th>
                <th className={`${thClase} min-w-[160px]`}>Jefe destino</th>
                <th className={`${thClase} min-w-[200px]`}>Correo</th>
                <th className={thClase}>Fecha envío</th>
                <th className={thClase}>Enviado por</th>
                <th className={`${thClase} min-w-[180px]`}>Estado</th>
                <th className={`${thClase} text-center`}>Acción</th>
                {puedeAdministrar && (
                  <th className={`${thClase} text-center min-w-[140px]`}>Corregir</th>
                )}
              </tr>
            </thead>
            <tbody>
              {!cargando && items.length === 0 && (
                <tr>
                  <td
                    colSpan={puedeAdministrar ? 13 : 12}
                    className="px-4 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    No hay casos en la bandeja con los filtros actuales.
                  </td>
                </tr>
              )}
              {items.map((fila, idx) => (
                <tr
                  key={`${fila.casoId}-${fila.fechaEnvio}-${idx}`}
                  className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                >
                  <td className={`${tdClase} font-medium whitespace-nowrap`}>{fila.nmroAjste || '—'}</td>
                  <td className={`${tdClase} whitespace-nowrap`}>{fila.nmroSinstro || '—'}</td>
                  <td className={tdClase}>
                    {resolverNombreAseguradora(fila.codiAsgrdra, fila.nombreAseguradora)}
                  </td>
                  <td className={tdClase}>{fila.asgrBenfcro || '—'}</td>
                  <td className={tdClase}>{fila.nombreResponsable || '—'}</td>
                  <td className={`${tdClase} whitespace-nowrap`}>
                    {TIPO_ENVIO_LABELS[fila.tipoEnvio] || fila.tipoEnvio}
                    {fila.rolEnvio === 'copia' ? ' (copia)' : ''}
                  </td>
                  <td className={tdClase}>{fila.nombreGerente || nombreGerente(fila.gerente)}</td>
                  <td className={`${tdClase} break-all text-xs sm:text-sm`}>{fila.emailDestinatario || '—'}</td>
                  <td className={`${tdClase} whitespace-nowrap`}>
                    {formatearFechaUI(fila.fechaEnvio) || '—'}
                  </td>
                  <td className={`${tdClase} whitespace-nowrap`}>{fila.enviadoPor || '—'}</td>
                  <td className={tdClase}>
                    {resolverNombreEstadoDesdeCatalogo(fila, estadosCatalogo)}
                  </td>
                  <td className={`${tdClase} text-center whitespace-nowrap`}>
                    <button
                      type="button"
                      className={complexTableBtnGestionar}
                      onClick={() => abrirCaso(fila.casoId)}
                    >
                      Ver caso
                    </button>
                  </td>
                  {puedeAdministrar && (
                    <td className={`${tdClase} text-center whitespace-nowrap`}>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          className={`${complexBtnSecondary} !px-2 !py-1 text-xs`}
                          disabled={guardandoAdmin}
                          onClick={() => abrirCorreccion(fila)}
                          title="Cambiar jefe destinatario"
                        >
                          <FaEdit className="inline" /> Jefe
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
                          disabled={guardandoAdmin}
                          onClick={() => quitarEnvio(fila)}
                          title="Quitar registro de envío"
                        >
                          <FaTrash className="inline" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filaEditando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className={`${complexCard} w-full max-w-md space-y-4`}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Corregir jefe destinatario</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Caso <strong>{filaEditando.nmroAjste}</strong> — envío del{' '}
              {formatearFechaUI(filaEditando.fechaEnvio)} actualmente a{' '}
              <strong>{nombreGerente(filaEditando.gerente)}</strong>.
            </p>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Nuevo jefe destinatario</span>
              <select
                className={complexSelect}
                value={nuevoGerenteCorreccion}
                onChange={(e) => setNuevoGerenteCorreccion(e.target.value)}
              >
                {GERENTES_FACTURACION_OPCIONES.map((g) => (
                  <option key={g.clave} value={g.clave}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-gray-500">
              No se crea un envío nuevo ni se borra el caso. Solo se actualiza este registro en la bandeja.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={complexBtnSecondary}
                disabled={guardandoAdmin}
                onClick={() => setFilaEditando(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={complexBtnPrimary}
                disabled={guardandoAdmin}
                onClick={guardarCorreccion}
              >
                {guardandoAdmin ? 'Guardando…' : 'Guardar corrección'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
