import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaInbox, FaSearch, FaSync } from 'react-icons/fa';
import { obtenerBandejaFacturacion } from '../../services/complexService';
import { formatearFechaUI } from '../../utils/fechaUtils';
import {
  GERENTES_FACTURACION_OPCIONES,
  TIPO_ENVIO_LABELS,
  esUsuarioGerenteFacturacion,
  puedeElegirGerenteEnBandeja,
  gerenteDesdeLogin,
  nombreGerente,
} from '../../config/gerentesFacturacion';
import {
  complexPageWrap,
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
  const gerentePropio = gerenteDesdeLogin(login);

  const [gerenteFiltro, setGerenteFiltro] = useState(gerentePropio || (esSupervisor ? 'elkin' : ''));
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

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

  const tituloGerente = useMemo(() => nombreGerente(gerenteFiltro), [gerenteFiltro]);

  const abrirCaso = (casoId) => {
    if (!casoId) return;
    navigate(`/editar-caso/${casoId}`, {
      state: { returnPath: '/complex/bandeja-facturacion' },
    });
  };

  if (!puedeAcceder) {
    return (
      <div className={complexPageWrap}>
        <div className={complexCard}>
          <p className="text-gray-600 dark:text-gray-300">
            Esta vista está disponible solo para los jefes de facturación autorizados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={complexPageWrap}>
      <header className="mb-6 space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-fenix-primario/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-fenix-primario">
          <FaInbox /> Facturación
        </span>
        <h1 className={complexPageTitle}>Bandeja de casos para facturar</h1>
        <p className={complexPageSubtitle}>
          Casos que los ajustadores enviaron a {tituloGerente}. Abra cada caso sin buscarlo en el reporte
          completo.
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
                placeholder="No. ajuste, siniestro, asegurado…"
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
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <div className={complexCard}>
        <div className="overflow-x-auto">
          <table className={complexTableGrid}>
            <thead>
              <tr>
                <th className={complexTableThDivider}>No. Ajuste</th>
                <th className={complexTableThDivider}>Siniestro</th>
                <th className={complexTableThDivider}>Asegurado</th>
                <th className={complexTableThDivider}>Responsable</th>
                <th className={complexTableThDivider}>Tipo envío</th>
                <th className={complexTableThDivider}>Jefe destino</th>
                <th className={complexTableThDivider}>Correo</th>
                <th className={complexTableThDivider}>Fecha envío</th>
                <th className={complexTableThDivider}>Enviado por</th>
                <th className={complexTableThDivider}>Estado</th>
                <th className={complexTableThDivider}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {!cargando && items.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No hay casos en la bandeja con los filtros actuales.
                  </td>
                </tr>
              )}
              {items.map((fila, idx) => (
                <tr key={`${fila.casoId}-${fila.fechaEnvio}-${idx}`}>
                  <td className={complexTableTdDivider}>{fila.nmroAjste || '—'}</td>
                  <td className={complexTableTdDivider}>{fila.nmroSinstro || '—'}</td>
                  <td className={complexTableTdDivider}>{fila.asgrBenfcro || '—'}</td>
                  <td className={complexTableTdDivider}>{fila.nombreResponsable || '—'}</td>
                  <td className={complexTableTdDivider}>
                    {TIPO_ENVIO_LABELS[fila.tipoEnvio] || fila.tipoEnvio}
                    {fila.rolEnvio === 'copia' ? ' (copia)' : ''}
                  </td>
                  <td className={complexTableTdDivider}>
                    {fila.nombreGerente || nombreGerente(fila.gerente)}
                  </td>
                  <td className={complexTableTdDivider}>{fila.emailDestinatario || '—'}</td>
                  <td className={complexTableTdDivider}>
                    {formatearFechaUI(fila.fechaEnvio) || '—'}
                  </td>
                  <td className={complexTableTdDivider}>{fila.enviadoPor || '—'}</td>
                  <td className={complexTableTdDivider}>{fila.descripcionEstado || fila.codiEstdo || '—'}</td>
                  <td className={complexTableTdDivider}>
                    <button
                      type="button"
                      className={complexTableBtnGestionar}
                      onClick={() => abrirCaso(fila.casoId)}
                    >
                      Ver caso
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
