import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { FaFileExcel } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import {
  deleteCasoBbvaCat,
  fetchAllCasosBbvaCat,
} from '../../services/bbvaCatService.js';
import FormularioBbvaCat from './FormularioBbvaCat.jsx';
import ArchiveroBbvaCat from './ArchiveroBbvaCat.jsx';
import AccionesBbvaCatMenu from './AccionesBbvaCatMenu.jsx';
import MapaBloquesBbvaCatPanel from './MapaBloquesBbvaCatPanel.jsx';
import { coordsUbicacionPredio, urlGoogleMaps } from './bbvaCatGeocodeHelpers.js';
import {
  BBVA_CAT_REPORTE_PAGE_SIZE,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
  formatDate,
  labelSeveridadCat,
  normTexto,
  evidenciaAplicaSi,
  normalizeEvidenciaItem,
  esChecklistCatLleno,
} from './bbvaCatHelpers.js';
import {
  expressBadge,
  expressBtnPrimary,
  expressBtnSecondary,
  expressPageSubtitle,
  expressPageTitle,
  expressScope,
  expressTableHead,
  expressTableWrap,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  Campo,
  ExpressAvisoModal,
  ExpressFilterSection,
  ExpressModal,
  InputFenix,
  SelectFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo p-2 dark:bg-[#0F0F0F] sm:p-4';
const wrap = 'w-full min-w-0 space-y-4 sm:space-y-6';

/** Orden exacto hoja BD del consolidado + consecutivo/docs internos */
const COLUMNAS = [
  { clave: 'consecutivo', labelKey: 'consecutivo' },
  { clave: 'asegurado', labelKey: 'asegurado' },
  { clave: 'riskId', labelKey: 'riskId' },
  { clave: 'distanciaEpicentroKm', labelKey: 'distanciaEpicentroKm' },
  { clave: 'tipoNegocioHomologado', labelKey: 'tipoNegocioHomologado' },
  { clave: 'catUbicacionReferencia', labelKey: 'catUbicacionReferencia' },
  { clave: 'addressNumber', labelKey: 'addressNumber' },
  { clave: 'direccionInspeccionSugerida', labelKey: 'direccionInspeccionSugerida' },
  { clave: 'linkGoogleMaps', labelKey: 'linkGoogleMaps' },
  { clave: 'grupoInspeccion', labelKey: 'grupoInspeccion' },
  { clave: 'afectacion', labelKey: 'afectacion' },
  { clave: 'gradoAfectacion', labelKey: 'gradoAfectacion' },
  { clave: 'lucroCesante', labelKey: 'lucroCesante' },
  { clave: 'fechaInspeccion', labelKey: 'fechaInspeccion' },
  { clave: 'observacionesCat', labelKey: 'observacionesCat' },
  { clave: 'siniestro', labelKey: 'siniestro' },
  { clave: 'tipoIdentificacion', labelKey: 'tipoIdentificacion' },
  { clave: 'identificacion', labelKey: 'identificacion' },
  { clave: 'tomador', labelKey: 'tomador' },
  { clave: 'ajustador', labelKey: 'ajustador' },
  { clave: 'numeroPoliza', labelKey: 'numeroPoliza' },
  { clave: 'tipoPoliza', labelKey: 'tipoPoliza' },
  { clave: 'causa', labelKey: 'causa' },
  { clave: 'direccionPredio', labelKey: 'direccionPredio' },
  { clave: 'numeroCredito', labelKey: 'numeroCredito' },
  { clave: 'informacionContacto', labelKey: 'informacionContacto' },
  { clave: 'correo', labelKey: 'correo' },
  { clave: 'celular', labelKey: 'celular' },
  { clave: 'canalRadicacion', labelKey: 'canalRadicacion' },
  { clave: 'ciudad', labelKey: 'ciudad' },
  { clave: 'departamento', labelKey: 'departamento' },
  { clave: 'fechaSiniestro', labelKey: 'fechaSiniestro' },
  { clave: 'valorAseguradoInmueble', labelKey: 'valorAseguradoInmueble' },
  { clave: 'valorAseguradoContenidos', labelKey: 'valorAseguradoContenidos' },
  { clave: 'cobertura', labelKey: 'cobertura' },
  { clave: 'estadoPagoPrimas', labelKey: 'estadoPagoPrimas' },
  { clave: 'valorReservaPreventivaPromedio', labelKey: 'valorReservaPreventivaPromedio' },
  { clave: 'valorComercialInmueble', labelKey: 'valorComercialInmueble' },
  { clave: 'reserva', labelKey: 'reserva' },
  { clave: 'valorReclamado', labelKey: 'valorReclamado' },
  { clave: 'valorLiquidado', labelKey: 'valorLiquidado' },
  { clave: 'fechaUltimoDocumento', labelKey: 'fechaUltimoDocumento' },
  { clave: 'fechaLiquidado', labelKey: 'fechaLiquidado' },
  { clave: 'fechaAceptacionLiquidacion', labelKey: 'fechaAceptacionLiquidacion' },
  { clave: 'fechaEnvioAseguradora', labelKey: 'fechaEnvioAseguradora' },
  { clave: 'estado', labelKey: 'estado' },
  { clave: 'modalidadAtencion', labelKey: 'modalidadAtencion' },
  { clave: 'fechaCasoNuevo', labelKey: 'fechaCasoNuevo' },
  { clave: 'fechaCoordinandoInspeccion', labelKey: 'fechaCoordinandoInspeccion' },
  { clave: 'fechaAnalisisCaso', labelKey: 'fechaAnalisisCaso' },
  { clave: 'fechaSolicitudDocumento', labelKey: 'fechaSolicitudDocumento' },
  { clave: 'fechaRecepcionDocumento', labelKey: 'fechaRecepcionDocumento' },
  { clave: 'fechaObjecion', labelKey: 'fechaObjecion' },
  { clave: 'fechaAutorizacionAnalista', labelKey: 'fechaAutorizacionAnalista' },
  { clave: 'fechaCasoParaPago', labelKey: 'fechaCasoParaPago' },
  { clave: 'diasEnEstado', labelKey: 'diasEnEstado' },
  { clave: 'ultimaGestion', labelKey: 'ultimaGestion' },
  { clave: 'documentoFaltante', labelKey: 'documentoFaltante' },
  { clave: 'observaciones', labelKey: 'observaciones' },
  { clave: 'severidadCat', labelKey: 'severidadCat' },
  { clave: 'accesoPredio', labelKey: 'accesoPredio' },
  { clave: 'docs', labelKey: 'docs' },
];

const CAMPOS_MONEDA = new Set([
  'valorReclamado',
  'valorLiquidado',
  'reserva',
  'valorAseguradoInmueble',
  'valorAseguradoContenidos',
  'valorReservaPreventivaPromedio',
  'valorComercialInmueble',
]);
const CAMPOS_FECHA = new Set([
  'fechaSiniestro',
  'fechaInspeccion',
  'fechaUltimoDocumento',
  'fechaLiquidado',
  'fechaAceptacionLiquidacion',
  'fechaEnvioAseguradora',
  'fechaAsignacion',
  'fechaVisita',
  'fechaCasoNuevo',
  'fechaCoordinandoInspeccion',
  'fechaAnalisisCaso',
  'fechaSolicitudDocumento',
  'fechaRecepcionDocumento',
  'fechaObjecion',
  'fechaAutorizacionAnalista',
  'fechaCasoParaPago',
  'ultimaGestion',
]);

/** Encabezados de export en el mismo orden/nombre que la hoja BD */
const buildExportRow = (caso) => ({
  Consecutivo: caso.consecutivo ?? '',
  'INSURED NAME': caso.asegurado ?? '',
  'Risk ID': caso.riskId ?? '',
  'Distancia Epicentro km': caso.distanciaEpicentroKm ?? '',
  'Tipo_negocio Homologado': caso.tipoNegocioHomologado ?? '',
  'CAT Ubicación Referencia': caso.catUbicacionReferencia ?? '',
  'Address Number': caso.addressNumber ?? '',
  'Dirección inspección sugerida': caso.direccionInspeccionSugerida ?? '',
  'Link Google Maps': caso.linkGoogleMaps ?? '',
  'Grupo Inspección': caso.grupoInspeccion ?? '',
  Afectación: caso.afectacion ?? '',
  'Grado afetación': caso.gradoAfectacion ?? '',
  'Lucro cesante': caso.lucroCesante ?? '',
  'Fecha inspección': formatDate(caso.fechaInspeccion),
  observaciones: caso.observacionesCat ?? '',
  SINIESTRO: caso.siniestro ?? '',
  'TIPO IDENTIFICACIÓN': caso.tipoIdentificacion ?? '',
  IDENTIFICACIÓN: caso.identificacion ?? '',
  TOMADOR: caso.tomador ?? '',
  AJUSTADOR: caso.ajustador ?? '',
  'N° PÓLIZA': caso.numeroPoliza ?? '',
  'TIPO PÓLIZA': caso.tipoPoliza ?? '',
  CAUSA: caso.causa ?? '',
  'DIRECCIÓN PREDIO': caso.direccionPredio ?? '',
  'N CRÉDITO': caso.numeroCredito ?? '',
  'INFORMACION DE CONTACTO': caso.informacionContacto ?? '',
  CORREO: caso.correo ?? '',
  CELULAR: caso.celular ?? '',
  'CANAL DE RADICACIÓN': caso.canalRadicacion ?? '',
  CIUDAD: caso.ciudad ?? '',
  DEPARTAMENTO: caso.departamento ?? '',
  'FECHA SINIESTRO': formatDate(caso.fechaSiniestro),
  'VALOR ASEGURADO INMUEBLE': caso.valorAseguradoInmueble ?? '',
  'VALOR ASEGURADO CONTENIDOS': caso.valorAseguradoContenidos ?? '',
  COBERTURA: caso.cobertura ?? '',
  'ESTADO PAGO PRIMAS': caso.estadoPagoPrimas ?? '',
  'VALOR RESERVA PREVENTIVA PROMEDIO': caso.valorReservaPreventivaPromedio ?? '',
  'VALOR COMERCIAL INMUEBLE': caso.valorComercialInmueble ?? '',
  RESERVA: caso.reserva ?? '',
  'VALOR RECLAMADO': caso.valorReclamado ?? '',
  'VALOR LIQUIDADO': caso.valorLiquidado ?? '',
  'FECHA ULTIMO DOCUMENTO': formatDate(caso.fechaUltimoDocumento),
  'FECHA LIQUIDADO': formatDate(caso.fechaLiquidado),
  'FECHA ACEPTACIÓN LIQUIDACIÓN': formatDate(caso.fechaAceptacionLiquidacion),
  'FECHA ENVÍO A LA ASEGURADORA': formatDate(caso.fechaEnvioAseguradora),
  ESTADO: caso.estado ?? '',
  MODALIDAD: caso.modalidadAtencion ?? '',
  'FECHA CASO NUEVO': formatDate(caso.fechaCasoNuevo),
  'FECHA COORDINANDO INSPECCIÓN': formatDate(caso.fechaCoordinandoInspeccion),
  'FECHA ANÁLISIS': formatDate(caso.fechaAnalisisCaso),
  'FECHA SOLICITUD DOCUMENTO': formatDate(caso.fechaSolicitudDocumento),
  'FECHA RECEPCIÓN DOCUMENTO': formatDate(caso.fechaRecepcionDocumento),
  'FECHA OBJECIÓN': formatDate(caso.fechaObjecion),
  'FECHA AUTORIZACIÓN ANALISTA': formatDate(caso.fechaAutorizacionAnalista),
  'FECHA CASO PARA PAGO': formatDate(caso.fechaCasoParaPago),
  'DÍAS EN ESTADO': caso.diasEnEstado ?? '',
  'ÚLTIMA GESTIÓN': formatDate(caso.ultimaGestion),
  'DOCUMENTO FALTANTE': caso.documentoFaltante ?? '',
  'SEVERIDAD CAT': caso.severidadCat ?? '',
  'SEVERIDAD CAT DESCRIPCION': labelSeveridadCat(caso.severidadCat),
  'ACCESO PREDIO': caso.accesoPredio ?? '',
  'OBSERVACIONES CAT': caso.observacionesCat ?? '',
  'EVIDENCIA FOTO GENERAL': evidenciaAplicaSi(caso.evidenciaCat?.fotoGeneral) ? 'SI' : 'NO',
  'EVIDENCIA FOTO DANOS': evidenciaAplicaSi(caso.evidenciaCat?.fotoDanos) ? 'SI' : 'NO',
  'EVIDENCIA EQUIPOS CRITICOS': evidenciaAplicaSi(caso.evidenciaCat?.equiposCriticos) ? 'SI' : 'NO',
  'EVIDENCIA MITIGACION': evidenciaAplicaSi(caso.evidenciaCat?.mitigacion) ? 'SI' : 'NO',
  'EVIDENCIA NO ACCESO': evidenciaAplicaSi(caso.evidenciaCat?.noAcceso) ? 'SI' : 'NO',
  'OBS FOTO GENERAL': normalizeEvidenciaItem(caso.evidenciaCat?.fotoGeneral).observacion || '',
  'OBS FOTO DANOS': normalizeEvidenciaItem(caso.evidenciaCat?.fotoDanos).observacion || '',
  'OBS EQUIPOS CRITICOS': normalizeEvidenciaItem(caso.evidenciaCat?.equiposCriticos).observacion || '',
  'OBS MITIGACION': normalizeEvidenciaItem(caso.evidenciaCat?.mitigacion).observacion || '',
  'OBS NO ACCESO': normalizeEvidenciaItem(caso.evidenciaCat?.noAcceso).observacion || '',
  Documentos: Array.isArray(caso.archivos) ? caso.archivos.length : 0,
});

export default function ReporteBbvaCat() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const soloChecklistLleno = false;
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCiudad, setFiltroCiudad] = useState('');
  const [filtroDepto, setFiltroDepto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroAjustador, setFiltroAjustador] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [pagina, setPagina] = useState(1);
  const [casoEdicion, setCasoEdicion] = useState(null);
  const [casoArchivero, setCasoArchivero] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [bloqueSeleccionadoId, setBloqueSeleccionadoId] = useState(null);
  const [idsBloqueSeleccionado, setIdsBloqueSeleccionado] = useState([]);

  const recargar = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await fetchAllCasosBbvaCat(2000, { soloChecklistLleno });
      setCasos(soloChecklistLleno ? data.filter(esChecklistCatLleno) : data);
      if (silencioso) setError(null);
    } catch (err) {
      if (!silencioso) {
        setError(err.message || t('bbvaCat.report.loadError'));
      }
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, [t, soloChecklistLleno]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  useEffect(() => {
    if (!soloChecklistLleno) return undefined;
    const alVolverVisible = () => {
      if (document.visibilityState === 'visible') recargar({ silencioso: true });
    };
    const onFocus = () => recargar({ silencioso: true });
    document.addEventListener('visibilitychange', alVolverVisible);
    window.addEventListener('focus', onFocus);
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === 'visible') recargar({ silencioso: true });
    }, 25000);
    return () => {
      document.removeEventListener('visibilitychange', alVolverVisible);
      window.removeEventListener('focus', onFocus);
      window.clearInterval(intervalo);
    };
  }, [soloChecklistLleno, recargar]);

  const ciudades = useMemo(() => buildOpcionesFiltro(casos, 'ciudad'), [casos]);
  const departamentos = useMemo(() => buildOpcionesFiltro(casos, 'departamento'), [casos]);
  const estados = useMemo(() => buildOpcionesFiltro(casos, 'estado'), [casos]);
  const ajustadores = useMemo(() => buildOpcionesFiltro(casos, 'ajustador'), [casos]);

  const filtrados = useMemo(() => {
    const q = normTexto(busqueda);
    const idsBloque = new Set((idsBloqueSeleccionado || []).map(String));
    return casos.filter((c) => {
      if (idsBloque.size > 0 && !idsBloque.has(String(c._id))) return false;
      if (!coincideFiltroTexto(c.ciudad, filtroCiudad)) return false;
      if (!coincideFiltroTexto(c.departamento, filtroDepto)) return false;
      if (!coincideFiltroTexto(c.estado, filtroEstado)) return false;
      if (!coincideFiltroTexto(c.ajustador, filtroAjustador)) return false;
      if (fechaInicio || fechaFin) {
        if (!fechaEnRango(c.fechaSiniestro || c.createdAt, fechaInicio, fechaFin)) return false;
      }
      if (!q) return true;
      const blob = [
        c.consecutivo,
        c.siniestro,
        c.tipoIdentificacion,
        c.identificacion,
        c.asegurado,
        c.tomador,
        c.ajustador,
        c.numeroPoliza,
        c.tipoPoliza,
        c.causa,
        c.numeroCredito,
        c.ciudad,
        c.departamento,
        c.estado,
        c.informacionContacto,
        c.correo,
        c.celular,
        c.canalRadicacion,
        c.direccionPredio,
        c.observaciones,
      ]
        .map(normTexto)
        .join(' ');
      return blob.includes(q);
    });
  }, [
    casos,
    busqueda,
    filtroCiudad,
    filtroDepto,
    filtroEstado,
    filtroAjustador,
    fechaInicio,
    fechaFin,
    idsBloqueSeleccionado,
  ]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / BBVA_CAT_REPORTE_PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * BBVA_CAT_REPORTE_PAGE_SIZE;
  const paginaItems = filtrados.slice(desde, desde + BBVA_CAT_REPORTE_PAGE_SIZE);

  useEffect(() => {
    setPagina(1);
  }, [
    busqueda,
    filtroCiudad,
    filtroDepto,
    filtroEstado,
    filtroAjustador,
    fechaInicio,
    fechaFin,
    idsBloqueSeleccionado,
  ]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroCiudad('');
    setFiltroDepto('');
    setFiltroEstado('');
    setFiltroAjustador('');
    setFechaInicio('');
    setFechaFin('');
    setBloqueSeleccionadoId(null);
    setIdsBloqueSeleccionado([]);
  };

  const obtenerValorCelda = (item, clave) => {
    if (clave === 'docs') return Array.isArray(item.archivos) ? item.archivos.length : 0;
    if (clave === 'severidadCat') return labelSeveridadCat(item.severidadCat);
    if (CAMPOS_MONEDA.has(clave)) {
      return item[clave] === null || item[clave] === undefined ? '—' : formatCurrency(item[clave]);
    }
    if (CAMPOS_FECHA.has(clave)) return formatDate(item[clave]) || '—';
    const valor = item[clave];
    return valor === null || valor === undefined || valor === '' ? '—' : String(valor);
  };

  const exportarExcel = () => {
    if (!filtrados.length) {
      setAviso({ tipo: 'info', titulo: t('bbvaCat.report.noData'), mensaje: t('bbvaCat.report.noDataExport') });
      return;
    }
    try {
      const rows = filtrados.map(buildExportRow);
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'BBVA CAT');
      XLSX.writeFile(wb, `bbvaCat-cat-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      setAviso({
        tipo: 'error',
        titulo: t('bbvaCat.report.exportError'),
        mensaje: err.message || t('bbvaCat.report.exportErrorMessage'),
      });
    }
  };

  const solicitarEliminar = (item) => {
      setAviso({
        tipo: 'warning',
        titulo: t('bbvaCat.report.confirmDeleteTitle'),
        mensaje: t('bbvaCat.report.confirmDeleteMessage', {
          caseNumber: item.consecutivo || item.identificacion,
        }),
        onConfirm: async () => {
          try {
            await deleteCasoBbvaCat(item._id);
            setAviso({
              tipo: 'success',
              titulo: t('bbvaCat.report.deleted'),
              mensaje: t('bbvaCat.report.caseDeleted', {
                caseNumber: item.consecutivo || '',
              }),
            });
            await recargar();
          } catch (err) {
            setAviso({
              tipo: 'error',
              titulo: t('bbvaCat.report.deleteError'),
              mensaje: err.message || t('bbvaCat.report.deleteErrorMessage'),
            });
          }
        },
      });
    };

  const filtrosActivos = Boolean(
    busqueda ||
      filtroCiudad ||
      filtroDepto ||
      filtroEstado ||
      filtroAjustador ||
      fechaInicio ||
      fechaFin ||
      bloqueSeleccionadoId
  );

  return (
    <div className={`${expressScope} ${root}`}>
      <div className={wrap}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className={expressBadge}>BBVA CAT · CAT</span>
            <div>
              <h1 className={expressPageTitle}>{t('bbvaCat.report.title')}</h1>
              <p className={expressPageSubtitle}>
                {soloChecklistLleno
                  ? t('bbvaCat.report.subtitleChecklist')
                  : t('bbvaCat.report.subtitle')}
              </p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <Link
                to="/bbva-cat/dashboard"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                {t('nav.bbvaCatDashboard')}
              </Link>
              <span className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm">
                {t('nav.bbvaCatReport')}
              </span>
            </nav>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={expressBtnSecondary} onClick={exportarExcel} disabled={loading}>
              <FaFileExcel />
              {t('bbvaCat.report.exportExcel')}
            </button>
          </div>
        </header>

        <ExpressFilterSection
          title={t('bbvaCat.report.filters')}
          showClear={filtrosActivos}
          onClear={limpiarFiltros}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Campo label={t('common.search')}>
              <InputFenix
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t('bbvaCat.report.searchPlaceholder')}
              />
            </Campo>
            <Campo label={t('bbvaCat.fields.ciudad')}>
              <SelectFenix value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)}>
                <option value="">{t('bbvaCat.report.all')}</option>
                {ciudades.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('bbvaCat.fields.departamento')}>
              <SelectFenix value={filtroDepto} onChange={(e) => setFiltroDepto(e.target.value)}>
                <option value="">{t('bbvaCat.report.all')}</option>
                {departamentos.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('bbvaCat.fields.estado')}>
              <SelectFenix value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">{t('bbvaCat.report.all')}</option>
                {estados.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('bbvaCat.fields.ajustador')}>
              <SelectFenix
                value={filtroAjustador}
                onChange={(e) => setFiltroAjustador(e.target.value)}
              >
                <option value="">{t('bbvaCat.report.all')}</option>
                {ajustadores.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('bbvaCat.report.from')}>
              <InputFenix type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </Campo>
            <Campo label={t('bbvaCat.report.to')}>
              <InputFenix type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </Campo>
          </div>
          <p className="mt-4 font-body text-sm text-gray-500 dark:text-gray-400">
            {loading
              ? t('common.loading')
              : t('bbvaCat.report.recordsSummary', {
                  count: filtrados.length,
                  page: paginaActual,
                  totalPages: totalPaginas,
                })}
          </p>
        </ExpressFilterSection>

        <MapaBloquesBbvaCatPanel
          ciudad={filtroCiudad}
          estado={filtroEstado}
          bloqueSeleccionadoId={bloqueSeleccionadoId}
          onBloqueChange={(bloqueId, casoIds) => {
            setBloqueSeleccionadoId(bloqueId);
            setIdsBloqueSeleccionado(casoIds || []);
            setPagina(1);
          }}
          compact
        />

        <div className={`${expressTableWrap} w-full min-w-0`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className={expressTableHead}>
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 dark:bg-gray-900/50">
                    {t('bbvaCat.report.actions')}
                  </th>
                  {COLUMNAS.map((col) => (
                    <th key={col.clave} className="px-4 py-3">
                      {col.clave === 'docs'
                        ? t('bbvaCat.report.docs')
                        : col.clave === 'consecutivo'
                          ? t('bbvaCat.report.consecutivo')
                          : t(`bbvaCat.fields.${col.labelKey}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
                {loading ? (
                  <tr>
                    <td colSpan={COLUMNAS.length + 1} className="px-4 py-8 text-center text-sm text-gray-500">
                      {t('bbvaCat.report.loadingCases')}
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={COLUMNAS.length + 1} className="px-4 py-8 text-center text-sm text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNAS.length + 1} className="px-4 py-8 text-center text-sm text-gray-500">
                      {soloChecklistLleno
                        ? t('bbvaCat.report.noCasesChecklist')
                        : t('bbvaCat.report.noCases')}
                    </td>
                  </tr>
                ) : (
                  paginaItems.map((item) => {
                    const coords = coordsUbicacionPredio(item);
                    const mapsUrl = coords ? urlGoogleMaps(coords.lat, coords.lng) : '';
                    const resaltado =
                      idsBloqueSeleccionado.length === 1 &&
                      String(idsBloqueSeleccionado[0]) === String(item._id);
                    return (
                    <tr
                      key={item._id}
                      className={`transition hover:bg-gray-50/80 dark:hover:bg-gray-900/30 ${
                        resaltado ? 'bg-amber-50/80 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <td
                        className={`sticky left-0 z-20 whitespace-nowrap px-4 py-3 ${
                          resaltado
                            ? 'bg-amber-50/80 dark:bg-amber-950/20'
                            : 'bg-white dark:bg-[#1A1A1A]'
                        }`}
                      >
                        <AccionesBbvaCatMenu
                          docsCount={item.archivos?.length || 0}
                          tieneLiquidador={!!item.liquidador}
                          tieneInforme={!!item.informeUnico || !!item.historialCatastroficoId}
                          onGestionar={() => setCasoEdicion(item)}
                          onArchivero={() => setCasoArchivero(item)}
                          onAbrirCaso={() =>
                            navigate(`/bbva-cat/caso?casoId=${item._id}&tab=cat`, {
                              state: { casoBbvaCat: item },
                            })
                          }
                          onLiquidador={() =>
                            navigate(`/bbva-cat/liquidador?casoId=${item._id}&tab=liquidador`, {
                              state: { casoBbvaCat: item },
                            })
                          }
                          onInformeUnico={() =>
                            navigate(`/bbva-cat/informe-unico?casoId=${item._id}&tab=informe`, {
                              state: { casoBbvaCat: item },
                            })
                          }
                          onEliminar={() => solicitarEliminar(item)}
                        />
                      </td>
                      {COLUMNAS.map((col) => (
                        <td
                          key={col.clave}
                          className={
                            col.clave === 'direccionPredio' || col.clave === 'observaciones'
                              ? 'max-w-xs whitespace-normal px-4 py-3 font-body text-sm text-gray-800 dark:text-gray-200'
                              : 'whitespace-nowrap px-4 py-3 font-body text-sm text-gray-800 dark:text-gray-200'
                          }
                          title={
                            col.clave === 'direccionPredio'
                              ? String(item.direccionPredio || '')
                              : undefined
                          }
                        >
                          {col.clave === 'linkGoogleMaps' && item.linkGoogleMaps ? (
                            <a
                              href={item.linkGoogleMaps}
                              target="_blank"
                              rel="noreferrer"
                              className="text-fenix-primario underline"
                            >
                              Maps
                            </a>
                          ) : col.clave === 'direccionPredio' ? (
                            <div className="space-y-1">
                              <div>{obtenerValorCelda(item, col.clave)}</div>
                              {mapsUrl && (
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-semibold text-fenix-primario underline"
                                >
                                  {t('bbvaCat.bloques.openMaps')}
                                </a>
                              )}
                            </div>
                          ) : (
                            obtenerValorCelda(item, col.clave)
                          )}
                        </td>
                      ))}
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && filtrados.length > 0 && totalPaginas > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={paginaActual <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                {t('common.previous')}
              </button>
              <span className="font-body text-sm text-gray-500">
                {paginaActual} / {totalPaginas}
              </span>
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={paginaActual >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </div>
      </div>

      {casoEdicion && (
        <ExpressModal
          open
          onClose={() => setCasoEdicion(null)}
          title={t('bbvaCat.page.editCase', { caseNumber: casoEdicion.consecutivo || '' })}
          wide
        >
          <FormularioBbvaCat
            embed
            origen="cat"
            initialData={casoEdicion}
            onClose={() => setCasoEdicion(null)}
            onSaved={async () => {
              setCasoEdicion(null);
              await recargar();
            }}
          />
        </ExpressModal>
      )}

      {casoArchivero && (
        <ExpressModal
          open
          onClose={() => setCasoArchivero(null)}
          title={t('bbvaCat.archive.title')}
          wide
        >
          <ArchiveroBbvaCat
            caso={casoArchivero}
            onClose={() => setCasoArchivero(null)}
            onChanged={(actualizado) => {
              setCasoArchivero(actualizado);
              setCasos((prev) =>
                prev.map((c) => (c._id === actualizado._id ? { ...c, ...actualizado } : c))
              );
            }}
          />
        </ExpressModal>
      )}

      {aviso && (
        <ExpressAvisoModal
          open
          tipo={aviso.tipo}
          titulo={aviso.titulo}
          mensaje={aviso.mensaje}
          onClose={() => setAviso(null)}
          onConfirm={aviso.onConfirm}
        />
      )}
    </div>
  );
}
