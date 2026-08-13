import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { FaFileExcel, FaPlus } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import {
  deleteCasoAlfa,
  fetchAllCasosAlfa,
} from '../../services/segurosAlfaService.js';
import FormularioSegurosAlfa from './FormularioSegurosAlfa.jsx';
import ArchiveroSegurosAlfa from './ArchiveroSegurosAlfa.jsx';
import AccionesAlfaMenu from './AccionesAlfaMenu.jsx';
import AlfaControlSeguimientoBanner from './AlfaControlSeguimientoBanner.jsx';
import MapaBloquesAlfaPanel from './MapaBloquesAlfaPanel.jsx';
import {
  ALFA_REPORTE_PAGE_SIZE,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
  formatDate,
  normTexto,
} from './segurosAlfaHelpers.js';
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
  { clave: 'siniestro', labelKey: 'siniestro' },
  { clave: 'identificacion', labelKey: 'identificacion' },
  { clave: 'asegurado', labelKey: 'asegurado' },
  { clave: 'tomador', labelKey: 'tomador' },
  { clave: 'ajustador', labelKey: 'ajustador' },
  { clave: 'numeroPoliza', labelKey: 'numeroPoliza' },
  { clave: 'direccionPredio', labelKey: 'direccionPredio' },
  { clave: 'numeroCredito', labelKey: 'numeroCredito' },
  { clave: 'informacionContacto', labelKey: 'informacionContacto' },
  { clave: 'correo', labelKey: 'correo' },
  { clave: 'canalRadicacion', labelKey: 'canalRadicacion' },
  { clave: 'ciudad', labelKey: 'ciudad' },
  { clave: 'departamento', labelKey: 'departamento' },
  { clave: 'fechaSiniestro', labelKey: 'fechaSiniestro' },
  { clave: 'fechaLlamada', labelKey: 'fechaLlamada' },
  { clave: 'valorAseguradoInmueble', labelKey: 'valorAseguradoInmueble' },
  { clave: 'valorAseguradoContenidos', labelKey: 'valorAseguradoContenidos' },
  { clave: 'cobertura', labelKey: 'cobertura' },
  { clave: 'estadoPagoPrimas', labelKey: 'estadoPagoPrimas' },
  { clave: 'valorReservaPreventivaPromedio', labelKey: 'valorReservaPreventivaPromedio' },
  { clave: 'valorComercialInmueble', labelKey: 'valorComercialInmueble' },
  { clave: 'reserva', labelKey: 'reserva' },
  { clave: 'valorReclamado', labelKey: 'valorReclamado' },
  { clave: 'valorLiquidado', labelKey: 'valorLiquidado' },
  { clave: 'fechaInspeccion', labelKey: 'fechaInspeccion' },
  { clave: 'fechaUltimoDocumento', labelKey: 'fechaUltimoDocumento' },
  { clave: 'fechaLiquidado', labelKey: 'fechaLiquidado' },
  { clave: 'fechaAceptacionLiquidacion', labelKey: 'fechaAceptacionLiquidacion' },
  { clave: 'fechaEnvioAseguradora', labelKey: 'fechaEnvioAseguradora' },
  { clave: 'estado', labelKey: 'estado' },
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
  'fechaLlamada',
  'fechaInspeccion',
  'fechaUltimoDocumento',
  'fechaLiquidado',
  'fechaAceptacionLiquidacion',
  'fechaEnvioAseguradora',
]);

/** Encabezados de export en el mismo orden/nombre que la hoja BD */
const buildExportRow = (caso) => ({
  Consecutivo: caso.consecutivo ?? '',
  SINIESTRO: caso.siniestro ?? '',
  IDENTIFICACIÓN: caso.identificacion ?? '',
  ASEGURADO: caso.asegurado ?? '',
  TOMADOR: caso.tomador ?? '',
  AJUSTADOR: caso.ajustador ?? '',
  'N° PÓLIZA': caso.numeroPoliza ?? '',
  'DIRECCIÓN PREDIO': caso.direccionPredio ?? '',
  'N CRÉDITO': caso.numeroCredito ?? '',
  'INFORMACION DE CONTACTO': caso.informacionContacto ?? '',
  CORREO: caso.correo ?? '',
  'CANAL DE RADICACIÓN': caso.canalRadicacion ?? '',
  CIUDAD: caso.ciudad ?? '',
  DEPARTAMENTO: caso.departamento ?? '',
  'FECHA SINIESTRO': formatDate(caso.fechaSiniestro),
  'FECHA DE LLAMADA': formatDate(caso.fechaLlamada),
  'VALOR ASEGURADO INMUEBLE': caso.valorAseguradoInmueble ?? '',
  'VALOR ASEGURADO CONTENIDOS': caso.valorAseguradoContenidos ?? '',
  COBERTURA: caso.cobertura ?? '',
  'ESTADO PAGO PRIMAS': caso.estadoPagoPrimas ?? '',
  'VALOR RESERVA PREVENTIVA PROMEDIO': caso.valorReservaPreventivaPromedio ?? '',
  'VALOR COMERCIAL INMUEBLE': caso.valorComercialInmueble ?? '',
  RESERVA: caso.reserva ?? '',
  'VALOR RECLAMADO': caso.valorReclamado ?? '',
  'VALOR LIQUIDADO': caso.valorLiquidado ?? '',
  'FECHA INSPECCIÓN': formatDate(caso.fechaInspeccion),
  'FECHA ULTIMO DOCUMENTO': formatDate(caso.fechaUltimoDocumento),
  'FECHA LIQUIDADO': formatDate(caso.fechaLiquidado),
  'FECHA ACEPTACIÓN LIQUIDACIÓN': formatDate(caso.fechaAceptacionLiquidacion),
  'FECHA ENVÍO A LA ASEGURADORA': formatDate(caso.fechaEnvioAseguradora),
  ESTADO: caso.estado ?? '',
  Documentos: Array.isArray(caso.archivos) ? caso.archivos.length : 0,
});

export default function ReporteSegurosAlfa() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllCasosAlfa();
      setCasos(data);
    } catch (err) {
      setError(err.message || t('segurosAlfa.report.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    recargar();
  }, [recargar]);

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
        c.identificacion,
        c.asegurado,
        c.tomador,
        c.ajustador,
        c.numeroPoliza,
        c.numeroCredito,
        c.ciudad,
        c.departamento,
        c.estado,
        c.informacionContacto,
        c.canalRadicacion,
        c.direccionPredio,
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

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ALFA_REPORTE_PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * ALFA_REPORTE_PAGE_SIZE;
  const paginaItems = filtrados.slice(desde, desde + ALFA_REPORTE_PAGE_SIZE);

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
    if (CAMPOS_MONEDA.has(clave)) {
      return item[clave] === null || item[clave] === undefined ? '—' : formatCurrency(item[clave]);
    }
    if (CAMPOS_FECHA.has(clave)) return formatDate(item[clave]) || '—';
    const valor = item[clave];
    return valor === null || valor === undefined || valor === '' ? '—' : String(valor);
  };

  const exportarExcel = () => {
    if (!filtrados.length) {
      setAviso({ tipo: 'info', titulo: t('segurosAlfa.report.noData'), mensaje: t('segurosAlfa.report.noDataExport') });
      return;
    }
    try {
      const rows = filtrados.map(buildExportRow);
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Seguros Alfa');
      XLSX.writeFile(wb, `seguros-alfa-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      setAviso({
        tipo: 'error',
        titulo: t('segurosAlfa.report.exportError'),
        mensaje: err.message || t('segurosAlfa.report.exportErrorMessage'),
      });
    }
  };

  const solicitarEliminar = (item) => {
      setAviso({
        tipo: 'warning',
        titulo: t('segurosAlfa.report.confirmDeleteTitle'),
        mensaje: t('segurosAlfa.report.confirmDeleteMessage', {
          caseNumber: item.consecutivo || item.identificacion,
        }),
        onConfirm: async () => {
          try {
            await deleteCasoAlfa(item._id);
            setAviso({
              tipo: 'success',
              titulo: t('segurosAlfa.report.deleted'),
              mensaje: t('segurosAlfa.report.caseDeleted', {
                caseNumber: item.consecutivo || '',
              }),
            });
            await recargar();
          } catch (err) {
            setAviso({
              tipo: 'error',
              titulo: t('segurosAlfa.report.deleteError'),
              mensaje: err.message || t('segurosAlfa.report.deleteErrorMessage'),
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
            <span className={expressBadge}>Seguros Alfa</span>
            <div>
              <h1 className={expressPageTitle}>{t('segurosAlfa.report.title')}</h1>
              <p className={expressPageSubtitle}>{t('segurosAlfa.report.subtitle')}</p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <Link
                to="/seguros-alfa/carga"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                <FaPlus />
                {t('nav.alfaAddCase')}
              </Link>
              <span className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm">
                {t('nav.alfaReport')}
              </span>
            </nav>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={expressBtnSecondary} onClick={exportarExcel} disabled={loading}>
              <FaFileExcel />
              {t('segurosAlfa.report.exportExcel')}
            </button>
          </div>
        </header>

        <AlfaControlSeguimientoBanner
          onCompleted={async () => {
            await recargar();
          }}
        />

        <ExpressFilterSection
          title={t('segurosAlfa.report.filters')}
          showClear={filtrosActivos}
          onClear={limpiarFiltros}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Campo label={t('common.search')}>
              <InputFenix
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={t('segurosAlfa.report.searchPlaceholder')}
              />
            </Campo>
            <Campo label={t('segurosAlfa.fields.ciudad')}>
              <SelectFenix value={filtroCiudad} onChange={(e) => setFiltroCiudad(e.target.value)}>
                <option value="">{t('segurosAlfa.report.all')}</option>
                {ciudades.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('segurosAlfa.fields.departamento')}>
              <SelectFenix value={filtroDepto} onChange={(e) => setFiltroDepto(e.target.value)}>
                <option value="">{t('segurosAlfa.report.all')}</option>
                {departamentos.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('segurosAlfa.fields.estado')}>
              <SelectFenix value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">{t('segurosAlfa.report.all')}</option>
                {estados.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('segurosAlfa.fields.ajustador')}>
              <SelectFenix
                value={filtroAjustador}
                onChange={(e) => setFiltroAjustador(e.target.value)}
              >
                <option value="">{t('segurosAlfa.report.all')}</option>
                {ajustadores.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('segurosAlfa.report.from')}>
              <InputFenix type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </Campo>
            <Campo label={t('segurosAlfa.report.to')}>
              <InputFenix type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </Campo>
          </div>
          <p className="mt-4 font-body text-sm text-gray-500 dark:text-gray-400">
            {loading
              ? t('common.loading')
              : t('segurosAlfa.report.recordsSummary', {
                  count: filtrados.length,
                  page: paginaActual,
                  totalPages: totalPaginas,
                })}
          </p>
        </ExpressFilterSection>

        <MapaBloquesAlfaPanel
          ciudad={filtroCiudad}
          estado={filtroEstado}
          bloqueSeleccionadoId={bloqueSeleccionadoId}
          onBloqueChange={(bloqueId, casoIds) => {
            setBloqueSeleccionadoId(bloqueId);
            setIdsBloqueSeleccionado(casoIds || []);
          }}
          compact
        />

        <div className={`${expressTableWrap} w-full min-w-0`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className={expressTableHead}>
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 dark:bg-gray-900/50">
                    {t('segurosAlfa.report.actions')}
                  </th>
                  {COLUMNAS.map((col) => (
                    <th key={col.clave} className="px-4 py-3">
                      {col.clave === 'docs'
                        ? t('segurosAlfa.report.docs')
                        : col.clave === 'consecutivo'
                          ? t('segurosAlfa.report.consecutivo')
                          : t(`segurosAlfa.fields.${col.labelKey}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
                {loading ? (
                  <tr>
                    <td colSpan={COLUMNAS.length + 1} className="px-4 py-8 text-center text-sm text-gray-500">
                      {t('segurosAlfa.report.loadingCases')}
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
                      {t('segurosAlfa.report.noCases')}
                    </td>
                  </tr>
                ) : (
                  paginaItems.map((item) => (
                    <tr key={item._id} className="transition hover:bg-gray-50/80 dark:hover:bg-gray-900/30">
                      <td className="sticky left-0 z-20 whitespace-nowrap bg-white px-4 py-3 dark:bg-[#1A1A1A]">
                        <AccionesAlfaMenu
                          docsCount={item.archivos?.length || 0}
                          tieneLiquidador={!!item.liquidador}
                          tieneInforme={!!item.informeUnico}
                          onGestionar={() => setCasoEdicion(item)}
                          onArchivero={() => setCasoArchivero(item)}
                          onAbrirCaso={() =>
                            navigate(`/seguros-alfa/caso?casoId=${item._id}&tab=liquidador`, {
                              state: { casoAlfa: item },
                            })
                          }
                          onEliminar={() => solicitarEliminar(item)}
                        />
                      </td>
                      {COLUMNAS.map((col) => (
                        <td
                          key={col.clave}
                          className="whitespace-nowrap px-4 py-3 font-body text-sm text-gray-800 dark:text-gray-200"
                        >
                          {obtenerValorCelda(item, col.clave)}
                        </td>
                      ))}
                    </tr>
                  ))
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
          title={t('segurosAlfa.page.editCase', { caseNumber: casoEdicion.consecutivo || '' })}
          wide
        >
          <FormularioSegurosAlfa
            embed
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
          title={t('segurosAlfa.archive.title')}
          wide
        >
          <ArchiveroSegurosAlfa
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
