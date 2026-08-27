import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import { FaCog, FaFileExcel, FaPlus } from 'react-icons/fa';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  deleteCasoAlfa,
  fetchAllCasosAlfa,
  getCasoAlfaById,
} from '../../services/segurosAlfaService.js';
import FormularioSegurosAlfa from './FormularioSegurosAlfa.jsx';
import ArchiveroSegurosAlfa from './ArchiveroSegurosAlfa.jsx';
import AccionesAlfaMenu from './AccionesAlfaMenu.jsx';
import AlfaControlSeguimientoBanner from './AlfaControlSeguimientoBanner.jsx';
import MapaBloquesAlfaPanel from './MapaBloquesAlfaPanel.jsx';
import AlfaCondicionesMenu from './AlfaCondicionesMenu.jsx';
import SelectBuscable from '../SelectBuscable.jsx';
import {
  coordsUbicacionPredio,
  urlGoogleMaps,
} from './alfaGeocodeHelpers.js';
import {
  ALFA_REPORTE_PAGE_SIZE,
  ESTADOS_ALFA,
  buildOpcionesFiltro,
  cargarColumnasReporteAlfa,
  cargarFiltrosReporteAlfa,
  coincideFiltroTexto,
  contarKpisGestionAlfa,
  casoAlfaVenceSla2Dias,
  casoAlfaTieneFechaLlamada,
  fechaEnRango,
  formatCurrency,
  formatDate,
  guardarColumnasReporteAlfa,
  guardarFiltrosReporteAlfa,
  homologarEstadoAlfa,
  limpiarFiltrosReporteAlfaStorage,
  normTexto,
} from './segurosAlfaHelpers.js';

/**
 * Mapa de bloques cercanos en el reporte Alfa.
 * false = oculto en UI (código y panel se conservan para reactivar luego).
 */
const MOSTRAR_MAPA_BLOQUES_CERCANOS = false;

/** Liquidador “real”: ítems de presupuesto o detalle CAT (o bandera del listado). */
function casoTieneLiquidadorConContenido(caso) {
  if (typeof caso?.tieneLiquidadorConContenido === 'boolean') {
    return caso.tieneLiquidadorConContenido;
  }
  const liq = caso?.liquidador;
  if (!liq || typeof liq !== 'object') return false;
  const items = liq?.evaluacionSismicaNSR10?.presupuesto?.items;
  const det = liq?.detalleLiquidacionCat;
  const texto = (it = {}) =>
    String(it?.actividad || it?.concepto || it?.descripcion || it?.componente || '').trim();
  const nItems = Array.isArray(items) ? items.filter((it) => texto(it)).length : 0;
  const nDet = Array.isArray(det) ? det.filter((it) => texto(it)).length : 0;
  return nItems > 0 || nDet > 0;
}

function casoTieneLiquidadorObj(caso) {
  if (typeof caso?.tieneLiquidador === 'boolean') return caso.tieneLiquidador;
  return Boolean(caso?.liquidador && typeof caso.liquidador === 'object');
}

function casoTieneInforme(caso) {
  if (typeof caso?.tieneInforme === 'boolean') return caso.tieneInforme;
  return Boolean(caso?.informeUnico && typeof caso.informeUnico === 'object');
}

/** Evita reinyectar liquidador/informe (base64) al array del reporte. */
function fusionarCasoEnListadoAlfa(prev, actualizado = {}) {
  const { liquidador, informeUnico, ...rest } = actualizado;
  return {
    ...prev,
    ...rest,
    tieneLiquidador: Boolean(
      actualizado.tieneLiquidador ??
        (liquidador && typeof liquidador === 'object') ??
        prev.tieneLiquidador
    ),
    tieneInforme: Boolean(
      actualizado.tieneInforme ??
        (informeUnico && typeof informeUnico === 'object') ??
        prev.tieneInforme
    ),
    tieneLiquidadorConContenido:
      typeof actualizado.tieneLiquidadorConContenido === 'boolean'
        ? actualizado.tieneLiquidadorConContenido
        : Boolean(prev.tieneLiquidadorConContenido),
  };
}
import {
  expressBadge,
  expressBtnPrimary,
  expressBtnSecondary,
  expressPageSubtitle,
  expressPageTitle,
  expressScope,
  expressTableHead,
  expressTableScroll,
  expressTableWrap,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  Campo,
  ExpressAvisoModal,
  ExpressFilterSection,
  ExpressModal,
  InputFenix,
  SelectFenix,
  ThOrdenable,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { filtrarCasosPorAsignacionUsuario, coincidenPersonas, esSesionColaFechaLlamadaAlfa } from '../../utils/permisosCasoPorRol.js';
import { aplicarOrdenTabla, useOrdenTabla } from '../../hooks/useOrdenTabla.js';

function valorOrdenAlfa(item, clave) {
  if (clave === 'docs') return Array.isArray(item.archivos) ? item.archivos.length : 0;
  if (clave === 'estado') return homologarEstadoAlfa(item.estado, item);
  return item[clave];
}

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo p-2 dark:bg-[#0F0F0F] sm:p-4';
const wrap = 'w-full min-w-0 space-y-4 sm:space-y-6';

/** Orden exacto hoja BD del consolidado + consecutivo/docs internos */
const COLUMNAS = [
  { clave: 'consecutivo', labelKey: 'consecutivo' },
  { clave: 'siniestro', labelKey: 'siniestro' },
  { clave: 'identificacion', labelKey: 'identificacion' },
  { clave: 'asegurado', labelKey: 'asegurado' },
  { clave: 'tomador', labelKey: 'tomador' },
  { clave: 'ajustadorLider', labelKey: 'ajustadorLider' },
  { clave: 'ajustador', labelKey: 'ajustador' },
  { clave: 'inspector', labelKey: 'inspector' },
  { clave: 'numeroPoliza', labelKey: 'numeroPoliza' },
  { clave: 'direccionPredio', labelKey: 'direccionPredio' },
  { clave: 'numeroCredito', labelKey: 'numeroCredito' },
  { clave: 'informacionContacto', labelKey: 'informacionContacto' },
  { clave: 'correo', labelKey: 'correo' },
  { clave: 'celular', labelKey: 'celular' },
  { clave: 'canalRadicacion', labelKey: 'canalRadicacion' },
  { clave: 'ciudad', labelKey: 'ciudad' },
  { clave: 'departamento', labelKey: 'departamento' },
  { clave: 'fechaAviso', labelKey: 'fechaAviso' },
  { clave: 'fechaSiniestro', labelKey: 'fechaSiniestro' },
  { clave: 'fechaLlamada', labelKey: 'fechaLlamada' },
  { clave: 'observacionLlamada', labelKey: 'observacionLlamada' },
  { clave: 'valorAseguradoSid', labelKey: 'valorAseguradoSid' },
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
  { clave: 'zonaAsignada', labelKey: 'zonaAsignada' },
  { clave: 'estado', labelKey: 'estado' },
  { clave: 'docs', labelKey: 'docs' },
];

const COLUMNAS_INICIALES_VISIBLES = [
  'consecutivo',
  'siniestro',
  'identificacion',
  'asegurado',
  'tomador',
  'ajustadorLider',
  'ajustador',
  'inspector',
  'numeroPoliza',
  'direccionPredio',
  'ciudad',
  'departamento',
  'fechaSiniestro',
  'cobertura',
  'valorAseguradoInmueble',
  'reserva',
  'valorReclamado',
  'valorLiquidado',
  'estado',
  'docs',
];

function labelColumnaAlfa(t, col) {
  if (col.clave === 'docs') return t('segurosAlfa.report.docs');
  if (col.clave === 'consecutivo') return t('segurosAlfa.report.consecutivo');
  if (col.clave === 'zonaAsignada') {
    return t('segurosAlfa.fields.zonaAsignada', { defaultValue: 'Zona' });
  }
  return t(`segurosAlfa.fields.${col.labelKey}`);
}

const CAMPOS_MONEDA = new Set([
  'valorReclamado',
  'valorLiquidado',
  'reserva',
  'valorAseguradoSid',
  'valorAseguradoInmueble',
  'valorAseguradoContenidos',
  'valorReservaPreventivaPromedio',
  'valorComercialInmueble',
]);
const CAMPOS_FECHA = new Set([
  'fechaAviso',
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
  'AJUSTADOR LÍDER': caso.ajustadorLider ?? '',
  AJUSTADOR: caso.ajustador ?? '',
  INSPECTOR: caso.inspector ?? '',
  'N° PÓLIZA': caso.numeroPoliza ?? '',
  'DIRECCIÓN PREDIO': caso.direccionPredio ?? '',
  'N CRÉDITO': caso.numeroCredito ?? '',
  'INFORMACION DE CONTACTO': caso.informacionContacto ?? '',
  CORREO: caso.correo ?? '',
  CELULAR: caso.celular ?? '',
  'CANAL DE RADICACIÓN': caso.canalRadicacion ?? '',
  CIUDAD: caso.ciudad ?? '',
  DEPARTAMENTO: caso.departamento ?? '',
  'FECHA AVISO': formatDate(caso.fechaAviso),
  'FECHA SINIESTRO': formatDate(caso.fechaSiniestro),
  'FECHA DE LLAMADA': formatDate(caso.fechaLlamada),
  'OBSERVACIÓN LLAMADA': caso.observacionLlamada ?? '',
  'VALOR ASEGURADO SID': caso.valorAseguradoSid ?? '',
  'VALOR ASEGURADO INMUEBLE': caso.valorAseguradoInmueble ?? '',
  'VALOR ASEGURADO CONTENIDOS': caso.valorAseguradoContenidos ?? '',
  COBERTURA: caso.cobertura ?? '',
  'ESTADO PAGO PRIMAS': caso.estadoPagoPrimas ?? '',
  'VALOR RESERVA ACTUARIAL': caso.valorReservaPreventivaPromedio ?? '',
  'VALOR COMERCIAL INMUEBLE': caso.valorComercialInmueble ?? '',
  RESERVA: caso.reserva ?? '',
  'VALOR RECLAMADO': caso.valorReclamado ?? '',
  'VALOR LIQUIDADO': caso.valorLiquidado ?? '',
  'FECHA INSPECCIÓN': formatDate(caso.fechaInspeccion),
  'FECHA ULTIMO DOCUMENTO': formatDate(caso.fechaUltimoDocumento),
  'FECHA LIQUIDADO': formatDate(caso.fechaLiquidado),
  'FECHA ACEPTACIÓN LIQUIDACIÓN': formatDate(caso.fechaAceptacionLiquidacion),
  'FECHA ENVÍO A LA ASEGURADORA': formatDate(caso.fechaEnvioAseguradora),
  'ESTADO GESTION': caso.estadoGestion ?? '',
  'ESTADO SINIESTRO': homologarEstadoAlfa(caso.estado, caso),
  OBSERVACION: caso.observacionesGestion ?? '',
  ZONA: caso.zonaAsignada ?? '',
  'FUERA DE ZONA': caso.fueraDeZona ? 'SI' : 'NO',
  Documentos: Array.isArray(caso.archivos) ? caso.archivos.length : 0,
});

export default function ReporteSegurosAlfa() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filtrosIniciales = useMemo(() => cargarFiltrosReporteAlfa(), []);
  const skipPageResetRef = useRef(true);
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState(filtrosIniciales.busqueda);
  const [filtroCiudad, setFiltroCiudad] = useState(filtrosIniciales.filtroCiudad);
  const [filtroDepto, setFiltroDepto] = useState(filtrosIniciales.filtroDepto);
  const [filtroEstado, setFiltroEstado] = useState(filtrosIniciales.filtroEstado);
  const [filtroAjustadorLider, setFiltroAjustadorLider] = useState(
    filtrosIniciales.filtroAjustadorLider
  );
  const [filtroAjustador, setFiltroAjustador] = useState(filtrosIniciales.filtroAjustador);
  const [filtroInspector, setFiltroInspector] = useState(filtrosIniciales.filtroInspector);
  const [filtroTomador, setFiltroTomador] = useState(filtrosIniciales.filtroTomador);
  const [filtroCobertura, setFiltroCobertura] = useState(filtrosIniciales.filtroCobertura);
  const [filtroCanal, setFiltroCanal] = useState(filtrosIniciales.filtroCanal);
  const [filtroEstadoPago, setFiltroEstadoPago] = useState(filtrosIniciales.filtroEstadoPago);
  const [filtroZona, setFiltroZona] = useState(filtrosIniciales.filtroZona);
  const [tipoFecha, setTipoFecha] = useState(filtrosIniciales.tipoFecha || 'fechaSiniestro');
  const [fechaInicio, setFechaInicio] = useState(filtrosIniciales.fechaInicio);
  const [fechaFin, setFechaFin] = useState(filtrosIniciales.fechaFin);
  /** '' | 'liquidador' | 'informe' | 'alguno' | 'ambos' | 'cascaron' */
  const [filtroDocumento, setFiltroDocumento] = useState(filtrosIniciales.filtroDocumento);
  const [filtroSla, setFiltroSla] = useState(filtrosIniciales.filtroSla);
  const [soloMisCasos, setSoloMisCasos] = useState(Boolean(filtrosIniciales.soloMisCasos));
  const [pagina, setPagina] = useState(filtrosIniciales.pagina || 1);
  const { orden, cambiarOrden } = useOrdenTabla();
  const [casoEdicion, setCasoEdicion] = useState(null);
  const [casoArchivero, setCasoArchivero] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [bloqueSeleccionadoId, setBloqueSeleccionadoId] = useState(null);
  const [idsBloqueSeleccionado, setIdsBloqueSeleccionado] = useState([]);
  const [mapaReloadToken, setMapaReloadToken] = useState(0);
  const [columnasVisibles, setColumnasVisibles] = useState(() => {
    const guardadas = cargarColumnasReporteAlfa(COLUMNAS);
    if (guardadas?.length) return guardadas;
    return COLUMNAS.filter((c) => COLUMNAS_INICIALES_VISIBLES.includes(c.clave));
  });
  const [modalColumnasOpen, setModalColumnasOpen] = useState(false);
  const [columnasOrdenadas, setColumnasOrdenadas] = useState([]);
  const [seleccionTemporal, setSeleccionTemporal] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const colaFechaLlamada = esSesionColaFechaLlamadaAlfa();

  const recargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllCasosAlfa();
      setCasos(filtrarCasosPorAsignacionUsuario(data));
    } catch (err) {
      setError(err.message || t('segurosAlfa.report.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // Abrir Archivero desde ?archivero=<casoId> (p.ej. banner del workspace)
  useEffect(() => {
    const archiveroId = searchParams.get('archivero');
    if (!archiveroId || casoArchivero) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const fromList = casos.find((c) => String(c._id) === String(archiveroId));
        const caso = fromList || (await getCasoAlfaById(archiveroId));
        if (!cancelled && caso) setCasoArchivero(caso);
      } catch (err) {
        console.warn('No se pudo abrir archivero desde query:', err?.message);
      } finally {
        if (!cancelled) {
          const next = new URLSearchParams(searchParams);
          next.delete('archivero');
          setSearchParams(next, { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, casos, casoArchivero]);

  const ciudades = useMemo(() => buildOpcionesFiltro(casos, 'ciudad'), [casos]);
  const departamentos = useMemo(() => buildOpcionesFiltro(casos, 'departamento'), [casos]);
  const estados = useMemo(() => {
    const porNorm = new Map();
    for (const e of ESTADOS_ALFA) {
      porNorm.set(normTexto(e), { value: e, label: e, n: 0 });
    }
    for (const c of casos) {
      const h = homologarEstadoAlfa(c.estado, c);
      const k = normTexto(h);
      if (!porNorm.has(k)) porNorm.set(k, { value: h, label: h, n: 0 });
      porNorm.get(k).n += 1;
    }
    return [...porNorm.values()].map((o) => ({
      value: o.value,
      label: `${o.label} (${o.n})`,
    }));
  }, [casos]);
  const lideres = useMemo(() => buildOpcionesFiltro(casos, 'ajustadorLider'), [casos]);
  const ajustadores = useMemo(() => buildOpcionesFiltro(casos, 'ajustador'), [casos]);
  const inspectores = useMemo(() => buildOpcionesFiltro(casos, 'inspector'), [casos]);
  const tomadores = useMemo(() => buildOpcionesFiltro(casos, 'tomador'), [casos]);
  const coberturas = useMemo(() => buildOpcionesFiltro(casos, 'cobertura'), [casos]);
  const canales = useMemo(() => buildOpcionesFiltro(casos, 'canalRadicacion'), [casos]);
  const estadosPago = useMemo(() => buildOpcionesFiltro(casos, 'estadoPagoPrimas'), [casos]);
  const zonas = useMemo(() => buildOpcionesFiltro(casos, 'zonaAsignada'), [casos]);
  const kpisGestion = useMemo(() => {
    const fuente = colaFechaLlamada
      ? casos.filter((c) => !casoAlfaTieneFechaLlamada(c))
      : casos;
    return contarKpisGestionAlfa(fuente);
  }, [casos, colaFechaLlamada]);

  const resumenDocs = useMemo(() => {
    let conLiq = 0;
    let conLiqVacio = 0;
    let conInf = 0;
    let conAmbos = 0;
    let conAlguno = 0;
    for (const c of casos) {
      const liqReal = casoTieneLiquidadorConContenido(c);
      const liqObj = casoTieneLiquidadorObj(c);
      const inf = casoTieneInforme(c);
      if (liqReal) conLiq += 1;
      else if (liqObj) conLiqVacio += 1;
      if (inf) conInf += 1;
      if (liqReal && inf) conAmbos += 1;
      if (liqReal || inf) conAlguno += 1;
    }
    return { conLiq, conLiqVacio, conInf, conAmbos, conAlguno, total: casos.length };
  }, [casos]);

  const filtrados = useMemo(() => {
    const q = normTexto(busqueda);
    const idsBloque = new Set((idsBloqueSeleccionado || []).map(String));
    const login =
      typeof localStorage !== 'undefined' ? localStorage.getItem('login') || '' : '';
    const nombre =
      typeof localStorage !== 'undefined' ? localStorage.getItem('nombre') || '' : '';
    const cedula =
      typeof localStorage !== 'undefined' ? localStorage.getItem('cedula') || '' : '';
    const misClaves = [nombre, login, cedula].filter(Boolean);
    const campoFecha =
      tipoFecha === 'fechaAviso' ||
      tipoFecha === 'fechaInspeccion' ||
      tipoFecha === 'fechaLlamada'
        ? tipoFecha
        : 'fechaSiniestro';

    return casos.filter((c) => {
      if (idsBloque.size > 0 && !idsBloque.has(String(c._id))) return false;
      if (!coincideFiltroTexto(c.ciudad, filtroCiudad)) return false;
      if (!coincideFiltroTexto(c.departamento, filtroDepto)) return false;
      if (!coincideFiltroTexto(homologarEstadoAlfa(c.estado, c), filtroEstado)) return false;
      if (!coincideFiltroTexto(c.ajustadorLider, filtroAjustadorLider)) return false;
      if (!coincideFiltroTexto(c.ajustador, filtroAjustador)) return false;
      if (!coincideFiltroTexto(c.inspector, filtroInspector)) return false;
      if (!coincideFiltroTexto(c.tomador, filtroTomador)) return false;
      if (!coincideFiltroTexto(c.cobertura, filtroCobertura)) return false;
      if (!coincideFiltroTexto(c.canalRadicacion, filtroCanal)) return false;
      if (!coincideFiltroTexto(c.estadoPagoPrimas, filtroEstadoPago)) return false;
      if (!coincideFiltroTexto(c.zonaAsignada, filtroZona)) return false;
      if (fechaInicio || fechaFin) {
        const fechaRef = c[campoFecha] || c.fechaSiniestro || c.createdAt;
        if (!fechaEnRango(fechaRef, fechaInicio, fechaFin)) return false;
      }

      const tieneLiq = casoTieneLiquidadorConContenido(c);
      const tieneLiqObj = casoTieneLiquidadorObj(c);
      const tieneInf = casoTieneInforme(c);
      if (filtroDocumento === 'liquidador' && !tieneLiq) return false;
      if (filtroDocumento === 'informe' && !tieneInf) return false;
      if (filtroDocumento === 'alguno' && !tieneLiq && !tieneInf) return false;
      if (filtroDocumento === 'ambos' && !(tieneLiq && tieneInf)) return false;
      if (filtroDocumento === 'cascaron' && !(tieneLiqObj && !tieneLiq)) return false;
      if (filtroSla === 'vencido' && !casoAlfaVenceSla2Dias(c)) return false;
      if (filtroSla === 'ok' && casoAlfaVenceSla2Dias(c)) return false;

      if (soloMisCasos && misClaves.length) {
        const ok = misClaves.some(
          (k) =>
            coincidenPersonas(c.ajustador, k) ||
            coincidenPersonas(c.inspector, k) ||
            coincidenPersonas(c.ajustadorLider, k)
        );
        if (!ok) return false;
      }

      if (colaFechaLlamada && !q && casoAlfaTieneFechaLlamada(c)) return false;

      if (!q) return true;
      const blob = [
        c.consecutivo,
        c.siniestro,
        c.identificacion,
        c.asegurado,
        c.tomador,
        c.ajustadorLider,
        c.ajustador,
        c.inspector,
        c.numeroPoliza,
        c.numeroCredito,
        c.ciudad,
        c.departamento,
        c.estado,
        c.informacionContacto,
        c.correo,
        c.celular,
        c.canalRadicacion,
        c.direccionPredio,
        c.observacionLlamada,
        c.cobertura,
        c.zonaAsignada,
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
    filtroAjustadorLider,
    filtroAjustador,
    filtroInspector,
    filtroTomador,
    filtroCobertura,
    filtroCanal,
    filtroEstadoPago,
    filtroZona,
    tipoFecha,
    fechaInicio,
    fechaFin,
    idsBloqueSeleccionado,
    filtroDocumento,
    filtroSla,
    soloMisCasos,
    colaFechaLlamada,
  ]);

  const casosOrdenados = useMemo(
    () => aplicarOrdenTabla(filtrados, orden, valorOrdenAlfa),
    [filtrados, orden]
  );

  const totalPaginas = Math.max(1, Math.ceil(casosOrdenados.length / ALFA_REPORTE_PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * ALFA_REPORTE_PAGE_SIZE;
  const paginaItems = casosOrdenados.slice(desde, desde + ALFA_REPORTE_PAGE_SIZE);

  useEffect(() => {
    if (skipPageResetRef.current) {
      skipPageResetRef.current = false;
      return;
    }
    setPagina(1);
  }, [
    busqueda,
    filtroCiudad,
    filtroDepto,
    filtroEstado,
    filtroAjustadorLider,
    filtroAjustador,
    filtroInspector,
    filtroTomador,
    filtroCobertura,
    filtroCanal,
    filtroEstadoPago,
    filtroZona,
    tipoFecha,
    fechaInicio,
    fechaFin,
    idsBloqueSeleccionado,
    filtroDocumento,
    filtroSla,
    soloMisCasos,
    orden.campo,
    orden.asc,
  ]);

  useEffect(() => {
    guardarFiltrosReporteAlfa({
      busqueda,
      filtroCiudad,
      filtroDepto,
      filtroEstado,
      filtroSla,
      filtroAjustadorLider,
      filtroAjustador,
      filtroInspector,
      filtroTomador,
      filtroCobertura,
      filtroCanal,
      filtroEstadoPago,
      filtroZona,
      filtroDocumento,
      tipoFecha,
      fechaInicio,
      fechaFin,
      soloMisCasos,
      pagina: paginaActual,
    });
  }, [
    busqueda,
    filtroCiudad,
    filtroDepto,
    filtroEstado,
    filtroSla,
    filtroAjustadorLider,
    filtroAjustador,
    filtroInspector,
    filtroTomador,
    filtroCobertura,
    filtroCanal,
    filtroEstadoPago,
    filtroZona,
    filtroDocumento,
    tipoFecha,
    fechaInicio,
    fechaFin,
    soloMisCasos,
    paginaActual,
  ]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroCiudad('');
    setFiltroDepto('');
    setFiltroEstado('');
    setFiltroSla('');
    setFiltroAjustadorLider('');
    setFiltroAjustador('');
    setFiltroInspector('');
    setFiltroTomador('');
    setFiltroCobertura('');
    setFiltroCanal('');
    setFiltroEstadoPago('');
    setFiltroZona('');
    setTipoFecha('fechaSiniestro');
    setFechaInicio('');
    setFechaFin('');
    setFiltroDocumento('');
    setSoloMisCasos(false);
    setBloqueSeleccionadoId(null);
    setIdsBloqueSeleccionado([]);
    setPagina(1);
    limpiarFiltrosReporteAlfaStorage();
  };

  const abrirPersonalizarColumnas = () => {
    setSeleccionTemporal(columnasVisibles.map((c) => c.clave));
    const ordenActual = columnasVisibles.map((c) => c.clave);
    const noVisibles = COLUMNAS.filter((c) => !ordenActual.includes(c.clave));
    setColumnasOrdenadas([...columnasVisibles, ...noVisibles]);
    setModalColumnasOpen(true);
  };

  const guardarColumnasPersonalizadas = () => {
    const seleccionadas = columnasOrdenadas.filter((c) => seleccionTemporal.includes(c.clave));
    const finalCols = seleccionadas.length ? seleccionadas : COLUMNAS.slice(0, 8);
    setColumnasVisibles(finalCols);
    guardarColumnasReporteAlfa(finalCols);
    setModalColumnasOpen(false);
  };

  const handleDragStart = (index) => setDraggedIndex(index);
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const next = [...columnasOrdenadas];
    const item = next[draggedIndex];
    next.splice(draggedIndex, 1);
    next.splice(index, 0, item);
    setColumnasOrdenadas(next);
    setDraggedIndex(index);
  };
  const handleDragEnd = () => setDraggedIndex(null);
  const toggleColumna = (clave) => {
    setSeleccionTemporal((prev) =>
      prev.includes(clave) ? prev.filter((c) => c !== clave) : [...prev, clave]
    );
  };

  const obtenerValorCelda = (item, clave) => {
    if (clave === 'docs') return Array.isArray(item.archivos) ? item.archivos.length : 0;
    if (clave === 'estado') return homologarEstadoAlfa(item.estado, item);
    if (CAMPOS_MONEDA.has(clave)) {
      return item[clave] === null || item[clave] === undefined ? '—' : formatCurrency(item[clave]);
    }
    if (CAMPOS_FECHA.has(clave)) return formatDate(item[clave]) || '—';
    const valor = item[clave];
    return valor === null || valor === undefined || valor === '' ? '—' : String(valor);
  };

  const exportarExcel = () => {
    if (!casosOrdenados.length) {
      setAviso({ tipo: 'info', titulo: t('segurosAlfa.report.noData'), mensaje: t('segurosAlfa.report.noDataExport') });
      return;
    }
    try {
      const rows = casosOrdenados.map(buildExportRow);
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
      filtroSla ||
      filtroAjustadorLider ||
      filtroAjustador ||
      filtroInspector ||
      filtroTomador ||
      filtroCobertura ||
      filtroCanal ||
      filtroEstadoPago ||
      filtroZona ||
      fechaInicio ||
      fechaFin ||
      filtroDocumento ||
      soloMisCasos ||
      bloqueSeleccionadoId ||
      (tipoFecha && tipoFecha !== 'fechaSiniestro')
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
            <AlfaCondicionesMenu />
            <button
              type="button"
              className={expressBtnSecondary}
              onClick={abrirPersonalizarColumnas}
              disabled={loading}
            >
              <FaCog />
              {t('segurosAlfa.report.columns', { defaultValue: 'Columnas' })}
            </button>
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

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['Sin contactar', kpisGestion.sinContactar],
            ['Contactado y programado', kpisGestion.contactadoProgramado],
            ['Inspeccionado', kpisGestion.inspeccionado],
            ['Solicitud docs', kpisGestion.solicitudDocumentos],
            ['Sin respuesta', kpisGestion.sinRespuesta],
            ['Definidos', kpisGestion.definidos],
          ].map(([label, n]) => (
            <div
              key={label}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{n}</div>
            </div>
          ))}
        </div>
        {(kpisGestion.slaVencido > 0 || kpisGestion.fueraDeZona > 0) && (
          <p className="text-sm text-amber-800 dark:text-amber-200">
            SLA vencidos: {kpisGestion.slaVencido} · Fuera de zona: {kpisGestion.fueraDeZona}
          </p>
        )}

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
            {colaFechaLlamada ? (
              <p className="md:col-span-2 lg:col-span-3 font-body text-sm text-amber-800 dark:text-amber-200">
                {t('segurosAlfa.report.callDateQueueHint')}
              </p>
            ) : null}
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
              <SelectBuscable
                options={estados}
                value={filtroEstado}
                onChange={(v) => setFiltroEstado(v || '')}
                placeholder={t('segurosAlfa.report.all')}
                emptyLabel={t('segurosAlfa.report.all')}
                searchPlaceholder="Buscar estado…"
                noResultsText="Sin estados"
              />
            </Campo>
            <Campo label="SLA 2 días">
              <SelectFenix value={filtroSla} onChange={(e) => setFiltroSla(e.target.value)}>
                <option value="">Todos</option>
                <option value="vencido">Vencidos post-inspección</option>
                <option value="ok">Dentro de plazo</option>
              </SelectFenix>
            </Campo>
            <Campo label={t('segurosAlfa.fields.ajustadorLider')}>
              <SelectFenix
                value={filtroAjustadorLider}
                onChange={(e) => setFiltroAjustadorLider(e.target.value)}
              >
                <option value="">{t('segurosAlfa.report.all')}</option>
                {lideres.map((o) => (
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
            <Campo label={t('segurosAlfa.fields.inspector')}>
              <SelectFenix
                value={filtroInspector}
                onChange={(e) => setFiltroInspector(e.target.value)}
              >
                <option value="">{t('segurosAlfa.report.all')}</option>
                {inspectores.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('segurosAlfa.fields.tomador')}>
              <SelectFenix value={filtroTomador} onChange={(e) => setFiltroTomador(e.target.value)}>
                <option value="">{t('segurosAlfa.report.all')}</option>
                {tomadores.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('segurosAlfa.fields.cobertura')}>
              <SelectFenix
                value={filtroCobertura}
                onChange={(e) => setFiltroCobertura(e.target.value)}
              >
                <option value="">{t('segurosAlfa.report.all')}</option>
                {coberturas.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('segurosAlfa.fields.canalRadicacion')}>
              <SelectFenix value={filtroCanal} onChange={(e) => setFiltroCanal(e.target.value)}>
                <option value="">{t('segurosAlfa.report.all')}</option>
                {canales.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('segurosAlfa.fields.estadoPagoPrimas')}>
              <SelectFenix
                value={filtroEstadoPago}
                onChange={(e) => setFiltroEstadoPago(e.target.value)}
              >
                <option value="">{t('segurosAlfa.report.all')}</option>
                {estadosPago.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label={t('segurosAlfa.fields.zonaAsignada', { defaultValue: 'Zona' })}>
              <SelectFenix value={filtroZona} onChange={(e) => setFiltroZona(e.target.value)}>
                <option value="">{t('segurosAlfa.report.all')}</option>
                {zonas.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectFenix>
            </Campo>
            <Campo label="Filtrar fechas por">
              <SelectFenix value={tipoFecha} onChange={(e) => setTipoFecha(e.target.value)}>
                <option value="fechaSiniestro">Fecha siniestro</option>
                <option value="fechaAviso">Fecha aviso</option>
                <option value="fechaInspeccion">Fecha inspección</option>
                <option value="fechaLlamada">Fecha llamada</option>
              </SelectFenix>
            </Campo>
            <Campo label={t('segurosAlfa.report.from')}>
              <InputFenix type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </Campo>
            <Campo label={t('segurosAlfa.report.to')}>
              <InputFenix type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </Campo>
            <Campo label="Con liquidador / informe">
              <SelectFenix
                value={filtroDocumento}
                onChange={(e) => setFiltroDocumento(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="alguno">Con liquidador o informe</option>
                <option value="liquidador">Solo con liquidador</option>
                <option value="informe">Solo con informe</option>
                <option value="ambos">Con liquidador e informe</option>
                <option value="cascaron">Cascarón vacío (liq. sin ítems)</option>
              </SelectFenix>
            </Campo>
            <Campo label="Asignación">
              <label className="flex h-10 cursor-pointer items-center gap-2 font-body text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-fenix-primario"
                  checked={soloMisCasos}
                  onChange={(e) => setSoloMisCasos(e.target.checked)}
                />
                Solo mis casos (mi usuario)
              </label>
            </Campo>
          </div>
          {!loading && (
            <p className="mt-3 font-body text-sm text-gray-600 dark:text-gray-300">
              En total: <strong>{resumenDocs.total}</strong> · liquidador con ítems:{' '}
              <strong>{resumenDocs.conLiq}</strong>
              {resumenDocs.conLiqVacio > 0 ? (
                <>
                  {' '}
                  · cascarón vacío: <strong>{resumenDocs.conLiqVacio}</strong>
                </>
              ) : null}{' '}
              · con informe: <strong>{resumenDocs.conInf}</strong> · con ambos:{' '}
              <strong>{resumenDocs.conAmbos}</strong>
            </p>
          )}
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

        {MOSTRAR_MAPA_BLOQUES_CERCANOS ? (
          <MapaBloquesAlfaPanel
            ciudad={filtroCiudad}
            estado={filtroEstado}
            bloqueSeleccionadoId={bloqueSeleccionadoId}
            reloadToken={mapaReloadToken}
            onBloqueChange={(bloqueId, casoIds) => {
              setBloqueSeleccionadoId(bloqueId);
              setIdsBloqueSeleccionado(casoIds || []);
              setPagina(1);
            }}
            compact
          />
        ) : null}

        <div className={`${expressTableWrap} w-full min-w-0`}>
          <div className={expressTableScroll}>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className={expressTableHead}>
                <tr>
                  <th className="sticky left-0 top-0 z-30 bg-gray-50 px-4 py-3 dark:bg-gray-900">
                    {t('segurosAlfa.report.actions')}
                  </th>
                  {columnasVisibles.map((col) => (
                    <ThOrdenable
                      key={col.clave}
                      campo={col.clave}
                      orden={orden}
                      onOrdenar={cambiarOrden}
                    >
                      {labelColumnaAlfa(t, col)}
                    </ThOrdenable>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-[#1A1A1A]">
                {loading ? (
                  <tr>
                    <td colSpan={columnasVisibles.length + 1} className="px-4 py-8 text-center text-sm text-gray-500">
                      {t('segurosAlfa.report.loadingCases')}
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={columnasVisibles.length + 1} className="px-4 py-8 text-center text-sm text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={columnasVisibles.length + 1} className="px-4 py-8 text-center text-sm text-gray-500">
                      {t('segurosAlfa.report.noCases')}
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
                        className={`sticky left-0 z-10 whitespace-nowrap px-4 py-3 ${
                          resaltado
                            ? 'bg-amber-50/80 dark:bg-amber-950/20'
                            : 'bg-white dark:bg-[#1A1A1A]'
                        }`}
                      >
                        <AccionesAlfaMenu
                          docsCount={item.archivos?.length || 0}
                          tieneLiquidador={casoTieneLiquidadorConContenido(item)}
                          tieneInforme={casoTieneInforme(item)}
                          onGestionar={() => setCasoEdicion(item)}
                          onArchivero={() => setCasoArchivero(item)}
                          onAbrirCaso={() =>
                            navigate(`/seguros-alfa/caso?casoId=${item._id}&tab=liquidador`)
                          }
                          onEliminar={() => solicitarEliminar(item)}
                        />
                      </td>
                      {columnasVisibles.map((col) => (
                        <td
                          key={col.clave}
                          className={
                            col.clave === 'observacionLlamada' || col.clave === 'direccionPredio'
                              ? 'max-w-xs whitespace-normal px-4 py-3 font-body text-sm text-gray-800 dark:text-gray-200'
                              : 'whitespace-nowrap px-4 py-3 font-body text-sm text-gray-800 dark:text-gray-200'
                          }
                          title={
                            col.clave === 'observacionLlamada'
                              ? String(item.observacionLlamada || '')
                              : col.clave === 'direccionPredio'
                                ? String(item.direccionPredio || '')
                                : undefined
                          }
                        >
                          {col.clave === 'direccionPredio' ? (
                            <div className="space-y-1">
                              <div>{obtenerValorCelda(item, col.clave)}</div>
                              {mapsUrl && (
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-semibold text-fenix-primario underline"
                                >
                                  {t('segurosAlfa.bloques.openMaps')}
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
          title={t('segurosAlfa.page.editCase', { caseNumber: casoEdicion.consecutivo || '' })}
          wide
        >
          <FormularioSegurosAlfa
            embed
            initialData={casoEdicion}
            onClose={() => setCasoEdicion(null)}
            onSaved={async (guardado) => {
              if (guardado?._id) {
                setCasos((prev) =>
                  prev.map((c) =>
                    String(c._id) === String(guardado._id) ? fusionarCasoEnListadoAlfa(c, guardado) : c
                  )
                );
              }
              setCasoEdicion(null);
              await recargar();
              setMapaReloadToken((n) => n + 1);
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
                prev.map((c) =>
                  String(c._id) === String(actualizado._id)
                    ? fusionarCasoEnListadoAlfa(c, actualizado)
                    : c
                )
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

      <ExpressModal
        open={modalColumnasOpen}
        onClose={() => setModalColumnasOpen(false)}
        title={t('segurosAlfa.report.customizeColumns', {
          defaultValue: 'Personalizar columnas',
        })}
      >
        <div className="p-4 sm:p-6">
          <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
            {t('segurosAlfa.report.columnsHelp', {
              defaultValue:
                'Arrastra para ordenar. Marca o desmarca para mostrar u ocultar. Se guarda en este navegador.',
            })}
          </p>
          <div className="mb-4 max-h-60 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-700 sm:max-h-80">
            {columnasOrdenadas.map((campo, index) => (
              <div
                key={campo.clave}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`mb-1 flex cursor-move items-center gap-3 rounded-md px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  draggedIndex === index ? 'bg-fenix-primario/10' : ''
                }`}
              >
                <span className="text-gray-400">⠿</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-fenix-primario"
                  checked={seleccionTemporal.includes(campo.clave)}
                  onChange={() => toggleColumna(campo.clave)}
                />
                <span className="font-body text-sm text-gray-800 dark:text-gray-200">
                  {labelColumnaAlfa(t, campo)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={expressBtnSecondary}
              onClick={() => setModalColumnasOpen(false)}
            >
              {t('common.cancel', { defaultValue: 'Cancelar' })}
            </button>
            <button
              type="button"
              className={expressBtnPrimary}
              onClick={guardarColumnasPersonalizadas}
            >
              {t('common.save', { defaultValue: 'Guardar' })}
            </button>
          </div>
        </div>
      </ExpressModal>
    </div>
  );
}
