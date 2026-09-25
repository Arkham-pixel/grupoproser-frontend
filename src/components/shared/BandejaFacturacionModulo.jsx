import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { FaInbox, FaSearch, FaSync, FaEdit, FaTrash } from 'react-icons/fa';
import {
  obtenerBandejaFacturacionModulo,
  corregirEnvioBandejaFacturacionModulo,
  eliminarEnvioBandejaFacturacionModulo,
} from '../../services/facturacionBandejaModuloService.js';
import { formatearFechaUI } from '../../utils/fechaUtils';
import {
  GERENTES_FACTURACION_OPCIONES,
  labelTipoEnvio,
  puedeElegirGerenteEnBandeja,
  puedeAdministrarBandejaFacturacion,
  nombreGerente,
  puedeVerFacturacionAllianz,
  puedeVerFacturacionPrevisora,
  puedeVerFacturacionSura,
} from '../../config/gerentesFacturacion';
import {
  expressBtnPrimary,
  expressBtnSecondary,
  expressCard,
  expressPageSubtitle,
  expressPageTitle,
  expressScope,
  expressTableHead,
  expressTableScroll,
  expressTableWrap,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { Campo, InputFenix, SelectFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';

const CONFIG_MODULO = {
  allianz: {
    nombre: 'Allianz',
    ruta: '/allianz/bandeja-facturacion',
    tituloKey: 'nav.allianzBillingTray',
    puedeVer: puedeVerFacturacionAllianz,
    tieneOrigen: true,
    abrirCaso: (fila) =>
      fila.origen === 'listado'
        ? `/allianz/listado/caso?casoId=${fila.casoId}`
        : `/allianz/liquidador?casoId=${fila.casoId}`,
    links: [{ to: '/allianz/listado/reporte', labelKey: 'nav.allianzListadoReport' }],
  },
  previsora: {
    nombre: 'Previsora',
    ruta: '/previsora/bandeja-facturacion',
    tituloKey: 'nav.previsoraBillingTray',
    puedeVer: puedeVerFacturacionPrevisora,
    tieneOrigen: true,
    abrirCaso: (fila) =>
      fila.origen === 'listado'
        ? `/previsora/listado/caso?casoId=${fila.casoId}`
        : `/previsora/liquidador?casoId=${fila.casoId}`,
    links: [{ to: '/previsora/listado/reporte', labelKey: 'nav.previsoraListadoReport' }],
  },
  sura: {
    nombre: 'SURA',
    ruta: '/sura/bandeja-facturacion',
    tituloKey: 'nav.suraBillingTray',
    puedeVer: puedeVerFacturacionSura,
    tieneOrigen: false,
    abrirCaso: (fila) =>
      `/sura/editar?casoId=${fila.casoId}&tab=facturacion&abrirControlHoras=1`,
    links: [{ to: '/sura/reporte', labelKey: 'nav.suraReport' }],
  },
};

export default function BandejaFacturacionModulo({ modulo }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cfg = CONFIG_MODULO[modulo];
  const login = localStorage.getItem('login') || '';
  const esSupervisor = puedeElegirGerenteEnBandeja(login);
  const puedeAdministrar = puedeAdministrarBandejaFacturacion(login);
  const puedeAcceder = Boolean(cfg && cfg.puedeVer(login));

  const [gerenteFiltro, setGerenteFiltro] = useState('todos');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filaEditando, setFilaEditando] = useState(null);
  const [nuevoGerenteCorreccion, setNuevoGerenteCorreccion] = useState('');
  const [guardandoAdmin, setGuardandoAdmin] = useState(false);

  const cargar = useCallback(async () => {
    if (!puedeAcceder || !cfg) return;
    setCargando(true);
    setError('');
    try {
      const verTodos = gerenteFiltro === 'todos' || !gerenteFiltro;
      const data = await obtenerBandejaFacturacionModulo(modulo, {
        gerente: verTodos ? undefined : gerenteFiltro,
        tipo: tipoFiltro,
        desde: desde || undefined,
        hasta: hasta || undefined,
        q: busqueda.trim() || undefined,
        verTodos,
      });
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(e.message || t('complex.ui.bandeja_facturacion.error_cargar'));
      setItems([]);
    } finally {
      setCargando(false);
    }
  }, [puedeAcceder, cfg, modulo, gerenteFiltro, tipoFiltro, desde, hasta, busqueda, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirCaso = (fila) => {
    if (!fila?.casoId || !cfg) return;
    navigate(cfg.abrirCaso(fila), {
      state: { returnPath: cfg.ruta, tab: 'facturacion', abrirControlHoras: true },
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

  const guardarCorreccion = async () => {
    if (!filaEditando || !nuevoGerenteCorreccion) return;
    setGuardandoAdmin(true);
    try {
      await corregirEnvioBandejaFacturacionModulo(modulo, {
        ...payloadEnvio(filaEditando),
        nuevoGerente: nuevoGerenteCorreccion,
      });
      setFilaEditando(null);
      await cargar();
    } catch (e) {
      alert(e.message || t('complex.ui.bandeja_facturacion.error_corregir'));
    } finally {
      setGuardandoAdmin(false);
    }
  };

  const quitarEnvio = async (fila) => {
    const ok = window.confirm(
      t('complex.ui.bandeja_facturacion.confirmar_quitar', {
        nombre: fila.nombreGerente || nombreGerente(fila.gerente),
        caso: fila.nmroAjste || fila.casoId,
      })
    );
    if (!ok) return;
    setGuardandoAdmin(true);
    try {
      await eliminarEnvioBandejaFacturacionModulo(modulo, payloadEnvio(fila));
      await cargar();
    } catch (e) {
      alert(e.message || t('complex.ui.bandeja_facturacion.error_quitar'));
    } finally {
      setGuardandoAdmin(false);
    }
  };

  const tituloGerente = useMemo(() => {
    if (gerenteFiltro === 'todos' || !gerenteFiltro) {
      return t('zurich.bandejaFacturacion.todosLosEnvios');
    }
    return nombreGerente(gerenteFiltro);
  }, [gerenteFiltro, t]);

  const etiquetaOrigen = (origen) =>
    origen === 'listado'
      ? t('zurich.bandejaFacturacion.origenListado')
      : t('zurich.bandejaFacturacion.origenCat');

  if (!puedeAcceder) {
    return <Navigate to="/inicio" replace />;
  }

  const colSpan = (cfg.tieneOrigen ? 14 : 13) + (puedeAdministrar ? 1 : 0);

  return (
    <div className={`${expressScope} p-4 sm:p-6`}>
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className={`${expressPageTitle} flex items-center gap-2`}>
            <FaInbox className="text-fenix-primario" />
            {t(cfg.tituloKey)}
          </h1>
          <p className={expressPageSubtitle}>
            {t('nav.bandejaModuloSubtitle', {
              modulo: cfg.nombre,
              destino: tituloGerente,
            })}
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          {cfg.links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>
      </header>

      <div className={`${expressCard} mb-6 space-y-4 p-4`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {esSupervisor && (
            <Campo label={t('complex.ui.bandeja_facturacion.jefe_gerente')}>
              <SelectFenix value={gerenteFiltro} onChange={(e) => setGerenteFiltro(e.target.value)}>
                <option value="todos">{t('complex.ui.bandeja_facturacion.todos')}</option>
                {GERENTES_FACTURACION_OPCIONES.map((g) => (
                  <option key={g.clave} value={g.clave}>
                    {g.nombre}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
          )}
          <Campo label={t('complex.ui.bandeja_facturacion.tipo_de_envio')}>
            <SelectFenix value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
              <option value="todos">{t('complex.ui.bandeja_facturacion.todos')}</option>
              <option value="control_horas">
                {t('complex.ui.bandeja_facturacion.control_de_horas')}
              </option>
              <option value="gerencia">
                {t('complex.ui.bandeja_facturacion.gerencia_facturacion')}
              </option>
            </SelectFenix>
          </Campo>
          <Campo label={t('complex.ui.bandeja_facturacion.desde')}>
            <InputFenix type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </Campo>
          <Campo label={t('complex.ui.bandeja_facturacion.hasta')}>
            <InputFenix type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </Campo>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-sm">
            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
              {t('complex.ui.bandeja_facturacion.buscar')}
            </span>
            <div className="relative">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-900"
                placeholder={t('zurich.bandejaFacturacion.buscarPlaceholder')}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && cargar()}
              />
            </div>
          </label>
          <button type="button" className={expressBtnPrimary} onClick={cargar} disabled={cargando}>
            <FaSearch className="inline mr-2" />
            {t('complex.ui.bandeja_facturacion.buscar')}
          </button>
          <button type="button" className={expressBtnSecondary} onClick={cargar} disabled={cargando}>
            <FaSync className={`inline mr-2 ${cargando ? 'animate-spin' : ''}`} />
            {t('complex.ui.bandeja_facturacion.actualizar')}
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300">
          {cargando
            ? t('complex.ui.bandeja_facturacion.cargando')
            : t('complex.ui.bandeja_facturacion.envios_registrados', {
                count: items.length,
                plural: items.length === 1 ? '' : 's',
              })}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('complex.ui.bandeja_facturacion.hint_control_hecho')}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <div className={`${expressTableWrap} w-full min-w-0`}>
        <div className={expressTableScroll}>
          <table className="min-w-[1480px] w-full table-auto divide-y divide-gray-200 dark:divide-gray-800">
            <thead className={expressTableHead}>
              <tr>
                {cfg.tieneOrigen && (
                  <th className="px-3 py-3 text-left">{t('zurich.bandejaFacturacion.modulo')}</th>
                )}
                <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.no_ajuste')}</th>
                <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.siniestro')}</th>
                <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.asegurado')}</th>
                <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.responsable')}</th>
                <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.tipo_envio')}</th>
                <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.control')}</th>
                <th className="px-3 py-3 text-right">{t('complex.ui.bandeja_facturacion.valor_sin_iva')}</th>
                <th className="px-3 py-3 text-right">{t('complex.ui.bandeja_facturacion.valor_con_iva')}</th>
                <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.jefe_destino')}</th>
                <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.correo')}</th>
                <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.fecha_envio')}</th>
                <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.enviado_por')}</th>
                <th className="px-3 py-3 text-center">{t('complex.ui.bandeja_facturacion.accion')}</th>
                {puedeAdministrar && (
                  <th className="px-3 py-3 text-center">{t('complex.ui.bandeja_facturacion.corregir')}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
              {!cargando && items.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-gray-500">
                    {t('complex.ui.bandeja_facturacion.no_hay_casos_en_la_bandeja_con_los_filtros_actuales')}
                  </td>
                </tr>
              )}
              {items.map((fila, idx) => (
                <tr
                  key={`${fila.casoId}-${fila.fechaEnvio}-${idx}`}
                  className="hover:bg-gray-50/80 dark:hover:bg-gray-900/30"
                >
                  {cfg.tieneOrigen && (
                    <td className="whitespace-nowrap px-3 py-3 text-sm">{etiquetaOrigen(fila.origen)}</td>
                  )}
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-medium">
                    {fila.nmroAjste || '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm">{fila.nmroSinstro || '—'}</td>
                  <td className="px-3 py-3 text-sm">{fila.asgrBenfcro || '—'}</td>
                  <td className="px-3 py-3 text-sm">{fila.nombreResponsable || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm">
                    {labelTipoEnvio(fila.tipoEnvio, t)}
                    {fila.pendienteNotificar ? (
                      <span className="mt-0.5 block text-[11px] font-medium text-amber-700 dark:text-amber-400">
                        {t('complex.ui.bandeja_facturacion.sin_notificar')}
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm">
                    {fila.tieneControlHoras ? (
                      <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {t('complex.ui.bandeja_facturacion.control_hecho')}
                        {Number(fila.totalHoras) > 0
                          ? ` · ${Number(fila.totalHoras).toFixed(2)} h`
                          : ''}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium tabular-nums">
                    {Number(fila.valorSinIva) > 0
                      ? new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          maximumFractionDigits: 0,
                        }).format(fila.valorSinIva)
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-semibold tabular-nums text-fenix-primario">
                    {Number(fila.valorConIva) > 0
                      ? new Intl.NumberFormat('es-CO', {
                          style: 'currency',
                          currency: 'COP',
                          maximumFractionDigits: 0,
                        }).format(fila.valorConIva)
                      : '—'}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    {fila.pendienteNotificar
                      ? t('complex.ui.bandeja_facturacion.sin_notificar')
                      : fila.nombreGerente || nombreGerente(fila.gerente)}
                  </td>
                  <td className="break-all px-3 py-3 text-xs">{fila.emailDestinatario || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm">
                    {formatearFechaUI(fila.fechaEnvio) || '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm">{fila.enviadoPor || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-center">
                    <button
                      type="button"
                      className={expressBtnPrimary}
                      onClick={() => abrirCaso(fila)}
                    >
                      {t('complex.ui.bandeja_facturacion.ver_caso')}
                    </button>
                  </td>
                  {puedeAdministrar && (
                    <td className="whitespace-nowrap px-3 py-3 text-center">
                      {fila.pendienteNotificar ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            className={`${expressBtnSecondary} !px-2 !py-1 text-xs`}
                            disabled={guardandoAdmin}
                            onClick={() => {
                              setFilaEditando(fila);
                              setNuevoGerenteCorreccion(fila.gerente || 'elkin');
                            }}
                          >
                            <FaEdit className="inline" /> {t('complex.ui.bandeja_facturacion.jefe')}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                            disabled={guardandoAdmin}
                            onClick={() => quitarEnvio(fila)}
                          >
                            <FaTrash className="inline" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-gray-900">
            <h2 className="mb-3 text-lg font-semibold">
              {t('complex.ui.bandeja_facturacion.corregir_jefe_destinatario')}
            </h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              {filaEditando.nmroAjste || filaEditando.casoId} — {filaEditando.nombreGerente}
            </p>
            <Campo label={t('complex.ui.bandeja_facturacion.nuevo_jefe_destinatario')}>
              <SelectFenix
                value={nuevoGerenteCorreccion}
                onChange={(e) => setNuevoGerenteCorreccion(e.target.value)}
              >
                {GERENTES_FACTURACION_OPCIONES.map((g) => (
                  <option key={g.clave} value={g.clave}>
                    {g.nombre}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={expressBtnSecondary}
                onClick={() => setFilaEditando(null)}
              >
                {t('complex.ui.bandeja_facturacion.cancelar')}
              </button>
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={guardandoAdmin}
                onClick={guardarCorreccion}
              >
                {t('complex.ui.bandeja_facturacion.guardar_correccion')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
