import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  FaInbox,
  FaSearch,
  FaSync,
  FaEdit,
  FaTrash,
  FaFolder,
  FaFolderOpen,
  FaCheck,
  FaFileExcel,
  FaChevronDown,
  FaChevronRight,
} from 'react-icons/fa';
import {
  obtenerBandejaFacturacionZurich,
  corregirEnvioBandejaFacturacionZurich,
  eliminarEnvioBandejaFacturacionZurich,
  obtenerZonaFacturacionZurich,
  crearLoteFacturacionZurich,
  quitarCasoDeLoteZurich,
  cerrarLoteFacturacionZurich,
} from '../../services/zurichService.js';
import { formatearFechaUI } from '../../utils/fechaUtils';
import {
  GERENTES_FACTURACION_OPCIONES,
  labelTipoEnvio,
  puedeElegirGerenteEnBandeja,
  puedeAdministrarBandejaFacturacion,
  gerenteDesdeLogin,
  nombreGerente,
  esLiderZurichFacturacion,
  puedeVerBandejaFacturacionZurich,
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

const RUTA_BANDEJA = '/zurich/bandeja-facturacion';

const formatearCop = (valor) => {
  if (valor == null || valor === '' || !Number.isFinite(Number(valor))) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Math.round(Number(valor)));
};

export default function BandejaFacturacionZurich() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = localStorage.getItem('login') || '';
  const nombre = localStorage.getItem('nombre') || '';
  const esSupervisor = puedeElegirGerenteEnBandeja(login);
  const esLider = esLiderZurichFacturacion(login, nombre);
  const puedeAdministrar = puedeAdministrarBandejaFacturacion(login);
  const gerentePropio = gerenteDesdeLogin(login);
  const puedeAcceder = puedeVerBandejaFacturacionZurich(login, nombre);
  const veTodosPorDefecto = puedeAcceder;

  const [vista, setVista] = useState('zona'); // zona | envios
  const [gerenteFiltro, setGerenteFiltro] = useState(
    veTodosPorDefecto ? 'todos' : gerentePropio || ''
  );
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [items, setItems] = useState([]);
  const [sueltos, setSueltos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [seleccionSueltos, setSeleccionSueltos] = useState(() => new Set());
  const [loteExpandido, setLoteExpandido] = useState(null);
  const [nombreLote, setNombreLote] = useState('');
  const [cerrarLoteId, setCerrarLoteId] = useState(null);
  const [numeroFacturaCierre, setNumeroFacturaCierre] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filaEditando, setFilaEditando] = useState(null);
  const [nuevoGerenteCorreccion, setNuevoGerenteCorreccion] = useState('');
  const [guardandoAdmin, setGuardandoAdmin] = useState(false);

  const cargarZona = useCallback(async () => {
    if (!puedeAcceder) return;
    setCargando(true);
    setError('');
    try {
      const data = await obtenerZonaFacturacionZurich({
        q: busqueda.trim() || undefined,
      });
      setSueltos(Array.isArray(data.sueltos) ? data.sueltos : []);
      setLotes(Array.isArray(data.lotes) ? data.lotes : []);
      setSeleccionSueltos(new Set());
    } catch (e) {
      setError(e.message || 'Error al cargar la zona de facturación');
      setSueltos([]);
      setLotes([]);
    } finally {
      setCargando(false);
    }
  }, [puedeAcceder, busqueda]);

  const cargarEnvios = useCallback(async () => {
    if (!puedeAcceder) return;
    setCargando(true);
    setError('');
    try {
      const verTodos = gerenteFiltro === 'todos' || (!gerenteFiltro && veTodosPorDefecto);
      const data = await obtenerBandejaFacturacionZurich({
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
  }, [puedeAcceder, gerenteFiltro, tipoFiltro, desde, hasta, busqueda, veTodosPorDefecto, t]);

  const cargar = useCallback(async () => {
    if (vista === 'zona') await cargarZona();
    else await cargarEnvios();
  }, [vista, cargarZona, cargarEnvios]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirCaso = (fila, { facturar = false } = {}) => {
    if (!fila?.casoId) return;
    const path = fila.origen === 'listado' ? '/zurich/listado/caso' : '/zurich/caso';
    const tab = facturar ? 'cat' : '';
    const qs = new URLSearchParams({ casoId: fila.casoId });
    if (tab) qs.set('tab', tab);
    navigate(`${path}?${qs.toString()}`, {
      state: {
        returnPath: RUTA_BANDEJA,
        ...(facturar ? { abrirGestionar: true, abrirTabFacturacion: true } : {}),
      },
    });
  };

  const toggleSuelto = (casoId) => {
    setSeleccionSueltos((prev) => {
      const next = new Set(prev);
      if (next.has(casoId)) next.delete(casoId);
      else next.add(casoId);
      return next;
    });
  };

  const crearLoteDesdeSeleccion = async () => {
    const casos = sueltos
      .filter((c) => seleccionSueltos.has(c.casoId))
      .map((c) => ({ casoId: c.casoId, origen: c.origen }));
    if (!casos.length) {
      alert('Seleccione al menos un caso suelto para armar la carpeta/lote.');
      return;
    }
    setGuardandoAdmin(true);
    try {
      await crearLoteFacturacionZurich({
        nombre: nombreLote.trim() || undefined,
        casos,
      });
      setNombreLote('');
      await cargarZona();
    } catch (e) {
      alert(e.message || 'No se pudo crear el lote');
    } finally {
      setGuardandoAdmin(false);
    }
  };

  const quitarDelLote = async (lote, caso) => {
    if (!window.confirm(`¿Quitar ${caso.consecutivo || caso.zc || caso.casoId} del lote?`)) return;
    setGuardandoAdmin(true);
    try {
      await quitarCasoDeLoteZurich(lote._id, { casoId: caso.casoId, origen: caso.origen });
      await cargarZona();
    } catch (e) {
      alert(e.message || 'No se pudo quitar del lote');
    } finally {
      setGuardandoAdmin(false);
    }
  };

  const confirmarCerrarLote = async () => {
    if (!cerrarLoteId) return;
    setGuardandoAdmin(true);
    try {
      const loteCerrar = lotes.find((l) => String(l._id) === String(cerrarLoteId));
      await cerrarLoteFacturacionZurich(cerrarLoteId, {
        numero_factura: numeroFacturaCierre.trim() || undefined,
        fecha_factura: new Date().toISOString().slice(0, 10),
      });
      if (loteCerrar) {
        exportarExcelLote({
          ...loteCerrar,
          estado: 'cerrado',
          numero_factura: numeroFacturaCierre.trim() || loteCerrar.numero_factura || '',
        });
      }
      setCerrarLoteId(null);
      setNumeroFacturaCierre('');
      await cargarZona();
    } catch (e) {
      alert(e.message || 'No se pudo cerrar el lote');
    } finally {
      setGuardandoAdmin(false);
    }
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
      await corregirEnvioBandejaFacturacionZurich({
        ...payloadEnvio(filaEditando),
        nuevoGerente: nuevoGerenteCorreccion,
      });
      setFilaEditando(null);
      await cargarEnvios();
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
      await eliminarEnvioBandejaFacturacionZurich(payloadEnvio(fila));
      await cargarEnvios();
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

  const lotesAbiertos = useMemo(() => lotes.filter((l) => l.estado === 'abierto'), [lotes]);
  const lotesCerrados = useMemo(() => lotes.filter((l) => l.estado !== 'abierto'), [lotes]);

  const filaCasoExcel = useCallback(
    (c, lote = null) => ({
      ...(lote
        ? {
            'Código lote': lote.codigo || '',
            'Nombre lote': lote.nombre || '',
            'Estado lote': lote.estado === 'abierto' ? 'Abierto' : 'Facturado',
            'N° factura': lote.numero_factura || '',
          }
        : {}),
      Módulo: etiquetaOrigen(c.origen),
      Consecutivo: c.consecutivo || '',
      ZC: c.zc || '',
      STRO: c.siniestro || '',
      Asegurado: c.asegurado || '',
      Estado: c.estado || '',
      'Estado facturación': c.etiquetaFacturacion || c.estadoFacturacion || 'Por facturar',
      'Valor liquidado': c.valorLiquidado ?? '',
      Honorarios: c.honorarios ?? '',
      'Tarifa rango': c.tarifa_rango_id || '',
      Marcado: formatearFechaUI(c.fechaMarcaFacturar) || '',
      Ajustador: c.ajustador || '',
    }),
    // etiquetaOrigen usa t; basta con t
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );

  const descargarWorkbook = (wb, nombreBase) => {
    XLSX.writeFile(wb, `${nombreBase}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportarExcelZona = useCallback(() => {
    const filasSueltos = sueltos.map((c) => filaCasoExcel(c));
    const filasLotes = lotes.map((l) => ({
      Código: l.codigo || '',
      Nombre: l.nombre || '',
      Estado: l.estado === 'abierto' ? 'Abierto' : 'Facturado',
      'N° casos': (l.casos || []).length,
      'Total honorarios': l.totalHonorarios ?? '',
      'N° factura': l.numero_factura || '',
      'Fecha factura': formatearFechaUI(l.fecha_factura) || '',
      'Fecha cierre': formatearFechaUI(l.fechaCierre) || '',
      Creado: formatearFechaUI(l.createdAt) || '',
      'Creado por': l.creadoPor?.nombre || l.creadoPor?.login || '',
    }));

    const filasDetalleLotes = [];
    for (const l of lotes) {
      for (const c of l.casos || []) {
        filasDetalleLotes.push(filaCasoExcel(c, l));
      }
    }

    if (!filasSueltos.length && !filasLotes.length) {
      alert(t('zurich.bandejaFacturacion.exportEmpty'));
      return;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(filasSueltos.length ? filasSueltos : [{ Info: 'Sin casos sueltos' }]),
      'Casos sueltos'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(filasLotes.length ? filasLotes : [{ Info: 'Sin lotes' }]),
      'Lotes'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        filasDetalleLotes.length ? filasDetalleLotes : [{ Info: 'Sin casos en lotes' }]
      ),
      'Detalle lotes'
    );
    descargarWorkbook(wb, 'zurich-facturacion');
  }, [sueltos, lotes, t, filaCasoExcel]);

  const exportarExcelLote = useCallback(
    (lote) => {
      if (!lote) return;
      const filas = (lote.casos || []).map((c) => filaCasoExcel(c, lote));
      if (!filas.length) {
        alert(t('zurich.bandejaFacturacion.exportEmpty'));
        return;
      }
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), 'Casos del lote');
      const codigo = String(lote.codigo || lote._id || 'lote').replace(/[^\w.-]+/g, '_');
      descargarWorkbook(wb, `zurich-lote-${codigo}`);
    },
    [filaCasoExcel, t]
  );

  const exportarExcelEnvios = useCallback(() => {
    if (!items.length) {
      alert(t('zurich.bandejaFacturacion.exportEmptyEnvios'));
      return;
    }
    const filas = items.map((fila) => ({
      Módulo: etiquetaOrigen(fila.origen),
      Consecutivo: fila.nmroAjste || '',
      ZC: fila.zc || '',
      STRO: fila.nmroSinstro || '',
      Asegurado: fila.asgrBenfcro || '',
      Estado: fila.estado || fila.nombreEstado || '',
      'Valor liquidado': fila.valorLiquidado ?? '',
      Honorarios: fila.honorariosTarifa ?? fila.valorSinIva ?? '',
      Responsable: fila.nombreResponsable || '',
      'Tipo envío': labelTipoEnvio(fila.tipoEnvio, t),
      'Jefe destino': fila.nombreGerente || nombreGerente(fila.gerente) || '',
      'Fecha envío': formatearFechaUI(fila.fechaEnvio) || '',
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), 'Envíos notificados');
    descargarWorkbook(wb, 'zurich-envios-notificados');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, t]);

  if (!puedeAcceder) {
    return <Navigate to="/inicio" replace />;
  }

  return (
    <div className={`${expressScope} p-4 sm:p-6`}>
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className={`${expressPageTitle} flex items-center gap-2`}>
            <FaInbox className="text-fenix-primario" />
            {t('nav.zurichBillingTray')}
          </h1>
          <p className={expressPageSubtitle}>
            {t('zurich.bandejaFacturacion.subtitle', { destino: 'Zurich' })}
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
          <button
            type="button"
            className={vista === 'zona' ? expressBtnPrimary : expressBtnSecondary}
            onClick={() => setVista('zona')}
          >
            <FaFolder className="inline mr-1" /> Zona / lotes
          </button>
          <button
            type="button"
            className={vista === 'envios' ? expressBtnPrimary : expressBtnSecondary}
            onClick={() => setVista('envios')}
          >
            Envios notificados
          </button>
          <button
            type="button"
            className={expressBtnPrimary}
            onClick={vista === 'zona' ? exportarExcelZona : exportarExcelEnvios}
            disabled={cargando}
            title={t('zurich.bandejaFacturacion.exportExcel')}
          >
            <FaFileExcel className="inline mr-1" />
            {t('zurich.bandejaFacturacion.exportExcel')}
          </button>
          <Link
            to="/zurich/listado/reporte"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            {t('nav.zurichListadoReport')}
          </Link>
        </nav>
      </header>

      <div className={`${expressCard} mb-6 space-y-4 p-4`}>
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
          <button
            type="button"
            className={expressBtnSecondary}
            onClick={vista === 'zona' ? exportarExcelZona : exportarExcelEnvios}
            disabled={cargando}
          >
            <FaFileExcel className="inline mr-2" />
            {t('zurich.bandejaFacturacion.exportExcel')}
          </button>
        </div>

        {vista === 'envios' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(esSupervisor || esLider) && (
              <Campo label={t('complex.ui.bandeja_facturacion.jefe_gerente')}>
                <SelectFenix
                  value={gerenteFiltro}
                  onChange={(e) => setGerenteFiltro(e.target.value)}
                >
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
        )}

        <p className="text-sm text-gray-600 dark:text-gray-300">
          {cargando
            ? t('complex.ui.bandeja_facturacion.cargando')
            : vista === 'zona'
              ? `${sueltos.length} caso(s) suelto(s) · ${lotesAbiertos.length} lote(s) abierto(s) · ${lotesCerrados.length} cerrado(s)`
              : t('complex.ui.bandeja_facturacion.envios_registrados', {
                  count: items.length,
                  plural: items.length === 1 ? '' : 's',
                })}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {vista === 'zona' ? (
        <div className="space-y-6">
          <section className={`${expressCard} p-4`}>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">
                  {t('zurich.bandejaFacturacion.casosSueltos')}
                </h2>
                <p className="text-sm text-gray-500">
                  {t('zurich.bandejaFacturacion.casosSueltosHint')}
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <Campo label="Nombre del lote (opcional)">
                  <InputFenix
                    value={nombreLote}
                    onChange={(e) => setNombreLote(e.target.value)}
                    placeholder="Ej. Lote marzo Zurich"
                  />
                </Campo>
                <button
                  type="button"
                  className={expressBtnPrimary}
                  disabled={guardandoAdmin || seleccionSueltos.size === 0}
                  onClick={crearLoteDesdeSeleccion}
                >
                  <FaFolder className="inline mr-1" />
                  Crear lote ({seleccionSueltos.size})
                </button>
              </div>
            </div>

            <div className={`${expressTableWrap} w-full min-w-0`}>
              <div className={expressTableScroll}>
                <table className="min-w-[1100px] w-full table-auto divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className={expressTableHead}>
                    <tr>
                      <th className="w-10 px-3 py-3 text-left" />
                      <th className="px-3 py-3 text-left">Módulo</th>
                      <th className="px-3 py-3 text-left">Consecutivo</th>
                      <th className="px-3 py-3 text-left">ZC</th>
                      <th className="px-3 py-3 text-left">STRO</th>
                      <th className="px-3 py-3 text-left">Asegurado</th>
                      <th className="px-3 py-3 text-left">Valor liquidado</th>
                      <th className="px-3 py-3 text-left">Honorarios</th>
                      <th className="px-3 py-3 text-left">Marcado</th>
                      <th className="px-3 py-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
                    {!cargando && sueltos.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                          No hay casos sueltos. Use la columna Facturar en el listado Zurich.
                        </td>
                      </tr>
                    )}
                    {sueltos.map((fila) => (
                      <tr
                        key={`${fila.origen}-${fila.casoId}`}
                        className="hover:bg-gray-50/80 dark:hover:bg-gray-900/30"
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={seleccionSueltos.has(fila.casoId)}
                            onChange={() => toggleSuelto(fila.casoId)}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm">
                          {etiquetaOrigen(fila.origen)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm font-medium">
                          {fila.consecutivo || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm">{fila.zc || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm">{fila.siniestro || '—'}</td>
                        <td className="px-3 py-3 text-sm">{fila.asegurado || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm">
                          {formatearCop(fila.valorLiquidado)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm font-medium">
                          {formatearCop(fila.honorarios)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-sm">
                          {formatearFechaUI(fila.fechaMarcaFacturar) || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-center">
                          <button
                            type="button"
                            className={expressBtnSecondary}
                            onClick={() => abrirCaso(fila, { facturar: true })}
                          >
                            Gestionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className={`${expressCard} p-4`}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">
                  {t('zurich.bandejaFacturacion.carpetasLotes')}
                </h2>
                <p className="text-sm text-gray-500">
                  {t('zurich.bandejaFacturacion.carpetasHint')}
                </p>
              </div>
              <button
                type="button"
                className={expressBtnSecondary}
                onClick={exportarExcelZona}
                disabled={cargando}
              >
                <FaFileExcel className="inline mr-1" />
                {t('zurich.bandejaFacturacion.exportExcel')}
              </button>
            </div>

            <div className={`${expressTableWrap} w-full min-w-0`}>
              <div className={expressTableScroll}>
                <table className="min-w-[1100px] w-full table-auto divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className={expressTableHead}>
                    <tr>
                      <th className="w-10 px-3 py-3 text-left" />
                      <th className="px-3 py-3 text-left">Código</th>
                      <th className="px-3 py-3 text-left">Nombre</th>
                      <th className="px-3 py-3 text-left">Estado</th>
                      <th className="px-3 py-3 text-left">Casos</th>
                      <th className="px-3 py-3 text-left">Total honorarios</th>
                      <th className="px-3 py-3 text-left">N° factura</th>
                      <th className="px-3 py-3 text-left">Creado</th>
                      <th className="px-3 py-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
                    {!cargando && lotes.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                          Aún no hay lotes creados. Seleccione casos sueltos y pulse Crear lote.
                        </td>
                      </tr>
                    )}
                    {lotes.map((lote) => {
                      const abierto = lote.estado === 'abierto';
                      const expandido = loteExpandido === lote._id;
                      return (
                        <React.Fragment key={lote._id}>
                          <tr className="hover:bg-gray-50/80 dark:hover:bg-gray-900/30">
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                className="text-gray-500 hover:text-fenix-primario"
                                onClick={() => setLoteExpandido(expandido ? null : lote._id)}
                                title={expandido ? 'Ocultar casos' : 'Ver casos'}
                              >
                                {expandido ? <FaChevronDown /> : <FaChevronRight />}
                              </button>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm font-medium">
                              <span className="inline-flex items-center gap-2">
                                {abierto ? (
                                  <FaFolderOpen className="text-fenix-primario" />
                                ) : (
                                  <FaFolder className="text-emerald-600" />
                                )}
                                {lote.codigo || '—'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-sm">
                              {lote.nombre && lote.nombre !== lote.codigo ? lote.nombre : '—'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm">
                              <span
                                className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                                  abierto
                                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                                }`}
                              >
                                {abierto ? 'Abierto' : 'Facturado'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm">
                              {(lote.casos || []).length}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm font-medium">
                              {formatearCop(lote.totalHonorarios)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm">
                              {lote.numero_factura || '—'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm">
                              {formatearFechaUI(lote.createdAt) || '—'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-center">
                              <div className="flex flex-wrap items-center justify-center gap-2">
                                <button
                                  type="button"
                                  className={`${expressBtnSecondary} !px-2 !py-1 text-xs`}
                                  onClick={() => setLoteExpandido(expandido ? null : lote._id)}
                                >
                                  {expandido ? 'Ocultar' : 'Ver casos'}
                                </button>
                                <button
                                  type="button"
                                  className={`${expressBtnSecondary} !px-2 !py-1 text-xs`}
                                  disabled={!(lote.casos || []).length}
                                  onClick={() => exportarExcelLote(lote)}
                                  title={t('zurich.bandejaFacturacion.exportExcelLote')}
                                >
                                  <FaFileExcel className="inline mr-1" />
                                  Excel
                                </button>
                                {abierto && (
                                  <button
                                    type="button"
                                    className={`${expressBtnPrimary} !px-2 !py-1 text-xs`}
                                    disabled={guardandoAdmin || !(lote.casos || []).length}
                                    onClick={() => {
                                      setCerrarLoteId(lote._id);
                                      setNumeroFacturaCierre(lote.numero_factura || '');
                                    }}
                                  >
                                    <FaCheck className="inline mr-1" />
                                    Cerrar / Facturado
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expandido && (
                            <tr className="bg-gray-50/60 dark:bg-gray-900/40">
                              <td colSpan={9} className="px-4 py-3">
                                {(lote.casos || []).length === 0 ? (
                                  <p className="text-sm text-gray-500">Este lote no tiene casos.</p>
                                ) : (
                                  <table className="min-w-full text-sm">
                                    <thead>
                                      <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                                        <th className="py-2 pr-3">Módulo</th>
                                        <th className="py-2 pr-3">Consecutivo</th>
                                        <th className="py-2 pr-3">ZC</th>
                                        <th className="py-2 pr-3">STRO</th>
                                        <th className="py-2 pr-3">Asegurado</th>
                                        <th className="py-2 pr-3">Valor liquidado</th>
                                        <th className="py-2 pr-3">Honorarios</th>
                                        <th className="py-2 text-center">Acción</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(lote.casos || []).map((c) => (
                                        <tr
                                          key={`${c.origen}-${c.casoId}`}
                                          className="border-t border-gray-200 dark:border-gray-700"
                                        >
                                          <td className="py-2 pr-3">{etiquetaOrigen(c.origen)}</td>
                                          <td className="py-2 pr-3 font-medium">
                                            {c.consecutivo || '—'}
                                          </td>
                                          <td className="py-2 pr-3">{c.zc || '—'}</td>
                                          <td className="py-2 pr-3">{c.siniestro || '—'}</td>
                                          <td className="py-2 pr-3">{c.asegurado || '—'}</td>
                                          <td className="py-2 pr-3">
                                            {formatearCop(c.valorLiquidado)}
                                          </td>
                                          <td className="py-2 pr-3 font-medium">
                                            {formatearCop(c.honorarios)}
                                          </td>
                                          <td className="py-2 text-center">
                                            <button
                                              type="button"
                                              className={`${expressBtnSecondary} !px-2 !py-1 text-xs mr-1`}
                                              onClick={() => abrirCaso(c, { facturar: true })}
                                            >
                                              Ver
                                            </button>
                                            {abierto && (
                                              <button
                                                type="button"
                                                className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                                                disabled={guardandoAdmin}
                                                onClick={() => quitarDelLote(lote, c)}
                                              >
                                                Quitar
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-500">
            Histórico de notificaciones de control/gerencia ({tituloGerente}).
          </p>
          <div className={`${expressTableWrap} w-full min-w-0`}>
            <div className={expressTableScroll}>
              <table className="min-w-[1500px] w-full table-auto divide-y divide-gray-200 dark:divide-gray-800">
                <thead className={expressTableHead}>
                  <tr>
                    <th className="px-3 py-3 text-left">{t('zurich.bandejaFacturacion.modulo')}</th>
                    <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.no_ajuste')}</th>
                    <th className="px-3 py-3 text-left">ZC</th>
                    <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.siniestro')}</th>
                    <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.asegurado')}</th>
                    <th className="px-3 py-3 text-left">Estado</th>
                    <th className="px-3 py-3 text-left">Valor liquidado</th>
                    <th className="px-3 py-3 text-left">Tarifa / Honorarios</th>
                    <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.responsable')}</th>
                    <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.tipo_envio')}</th>
                    <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.jefe_destino')}</th>
                    <th className="px-3 py-3 text-left">{t('complex.ui.bandeja_facturacion.fecha_envio')}</th>
                    <th className="px-3 py-3 text-center">{t('complex.ui.bandeja_facturacion.accion')}</th>
                    {puedeAdministrar && (
                      <th className="px-3 py-3 text-center">{t('complex.ui.bandeja_facturacion.corregir')}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
                  {!cargando && items.length === 0 && (
                    <tr>
                      <td
                        colSpan={puedeAdministrar ? 14 : 13}
                        className="px-4 py-10 text-center text-gray-500"
                      >
                        {t(
                          'complex.ui.bandeja_facturacion.no_hay_casos_en_la_bandeja_con_los_filtros_actuales'
                        )}
                      </td>
                    </tr>
                  )}
                  {items.map((fila, idx) => (
                    <tr
                      key={`${fila.casoId}-${fila.fechaEnvio}-${idx}`}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-900/30"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-sm">
                        {etiquetaOrigen(fila.origen)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-medium">
                        {fila.nmroAjste || '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm">{fila.zc || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm">{fila.nmroSinstro || '—'}</td>
                      <td className="px-3 py-3 text-sm">{fila.asgrBenfcro || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm">
                        {fila.estado || fila.nombreEstado || '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm">
                        {formatearCop(fila.valorLiquidado)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-medium">
                        {formatearCop(fila.honorariosTarifa ?? fila.valorSinIva)}
                      </td>
                      <td className="px-3 py-3 text-sm">{fila.nombreResponsable || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm">
                        {labelTipoEnvio(fila.tipoEnvio, t)}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {fila.nombreGerente || nombreGerente(fila.gerente)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm">
                        {formatearFechaUI(fila.fechaEnvio) || '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-center">
                        <button
                          type="button"
                          className={expressBtnSecondary}
                          onClick={() => abrirCaso(fila)}
                        >
                          {t('complex.ui.bandeja_facturacion.ver_caso')}
                        </button>
                      </td>
                      {puedeAdministrar && (
                        <td className="whitespace-nowrap px-3 py-3 text-center">
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
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {cerrarLoteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-gray-900">
            <h2 className="mb-3 text-lg font-semibold">Cerrar lote / marcar Facturado</h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              Todos los casos del lote quedarán en Facturado (columna aparte del estado del caso).
            </p>
            <Campo label="Número de factura (opcional)">
              <InputFenix
                value={numeroFacturaCierre}
                onChange={(e) => setNumeroFacturaCierre(e.target.value)}
                placeholder="FV-…"
              />
            </Campo>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={expressBtnSecondary}
                onClick={() => setCerrarLoteId(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={guardandoAdmin}
                onClick={confirmarCerrarLote}
              >
                Confirmar Facturado
              </button>
            </div>
          </div>
        </div>
      )}

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
