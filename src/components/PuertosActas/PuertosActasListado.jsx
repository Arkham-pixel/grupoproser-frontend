import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaEdit,
  FaEye,
  FaFilePdf,
  FaCamera,
  FaPlus,
  FaFilter,
  FaSync,
  FaFileExcel,
  FaFileAlt,
  FaShip,
} from 'react-icons/fa';
import { BASE_URL } from '../../config/apiConfig.js';
import { listarRegistrosPuertos } from '../../services/puertosService.js';
import { generarPdfInformeExportacionDesdeId } from '../../services/puertosCasoExportacionPdfService.js';
import PuertosActasFiltros from './PuertosActasFiltros.jsx';
import {
  contarFiltrosActivos,
  exportarTrazabilidadPuertosExcel,
  FILTROS_PUERTOS_VACIOS,
  filtrosParaApi,
} from './puertosActasTrazabilidad.js';
import {
  resolverEtiquetaEstadoPuertos,
  codigoEstadoPuertos,
  claseBadgeEstadoPuertos,
} from './puertosEstadoLabels.js';
import {
  puertosBadge,
  puertosBadgeAlt,
  puertosBtnPrimary,
  puertosBtnSecondary,
  puertosPageSubtitle,
  puertosPageTitle,
  puertosTableHead,
  puertosTableRowEven,
  puertosTableRowOdd,
  puertosTableTd,
  puertosTableWrap,
} from './puertosFenixUi';
import { esRegistroInspeccionAsegurado } from './puertosTipoRegistro.js';

const TIPO_LABEL = {
  acta: 'Acta',
  caso_exportacion: 'Caso exportación',
  inspeccion_asegurado: 'Inspección asegurado',
};

function rutaEditar(registro) {
  if (esRegistroInspeccionAsegurado(registro)) {
    return `/puertos/actas/inspeccion-asegurado/editar/${registro.id}`;
  }
  if (registro.tipoRegistro === 'caso_exportacion') {
    return `/puertos/actas/caso/editar/${registro.id}`;
  }
  return `/puertos/actas/editar/${registro.id}`;
}

function rutaVer(registro) {
  if (esRegistroInspeccionAsegurado(registro)) {
    return `/puertos/actas/inspeccion-asegurado/editar/${registro.id}`;
  }
  if (registro.tipoRegistro === 'caso_exportacion') {
    return `/puertos/actas/caso/ver/${registro.id}`;
  }
  return `/puertos/actas/editar/${registro.id}?modo=ver`;
}

function rutaFotos(registro) {
  if (esRegistroInspeccionAsegurado(registro)) {
    return `/puertos/actas/inspeccion-asegurado/editar/${registro.id}?fotos=1`;
  }
  if (registro.tipoRegistro === 'caso_exportacion') {
    return `/puertos/actas/caso/editar/${registro.id}?fotos=1`;
  }
  return `/puertos/actas/editar/${registro.id}?fotos=1`;
}

export default function PuertosActasListado() {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState([]);
  const [filtros, setFiltros] = useState({ ...FILTROS_PUERTOS_VACIOS });
  const [filtrosAplicados, setFiltrosAplicados] = useState({ ...FILTROS_PUERTOS_VACIOS });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [pdfCargandoId, setPdfCargandoId] = useState(null);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [aseguradoraOptions, setAseguradoraOptions] = useState([]);
  const [responsables, setResponsables] = useState([]);

  const cargar = useCallback(async (filtrosBusqueda = filtrosAplicados) => {
    setCargando(true);
    setError('');
    try {
      const data = await listarRegistrosPuertos(filtrosParaApi(filtrosBusqueda));
      setRegistros(data.registros || []);
    } catch (err) {
      setError(err.message || 'Error al cargar registros');
      setRegistros([]);
    } finally {
      setCargando(false);
    }
  }, [filtrosAplicados]);

  useEffect(() => {
    cargar(filtrosAplicados);
  }, []);

  useEffect(() => {
    fetch(`${BASE_URL}/api/clientes`)
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : data?.clientes || [];
        setAseguradoraOptions(
          lista
            .map((c) => ({
              value: c.codiAsgrdra || c.codigo || c._id,
              label: c.rzonSocial || c.nombIntermediario || c.nombre || c.codiAsgrdra,
            }))
            .filter((o) => o.value)
        );
      })
      .catch(() => setAseguradoraOptions([]));

    fetch(`${BASE_URL}/api/responsables`)
      .then((r) => r.json())
      .then((data) => {
        const lista =
          data?.success && Array.isArray(data.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [];
        setResponsables(
          lista
            .map((r) => {
              const rawValue = r.codiRespnsble ?? r.codigo ?? r.value ?? r._id ?? '';
              const label = r.nmbrRespnsble ?? r.nombre ?? r.label ?? '';
              const value = rawValue !== undefined && rawValue !== null ? String(rawValue) : '';
              if (!value || !label) return null;
              return { value, label };
            })
            .filter(Boolean)
        );
      })
      .catch(() => setResponsables([]));
  }, []);

  const aplicarFiltros = () => {
    setFiltrosAplicados({ ...filtros });
    cargar(filtros);
  };

  const limpiarFiltros = () => {
    const vacios = { ...FILTROS_PUERTOS_VACIOS };
    setFiltros(vacios);
    setFiltrosAplicados(vacios);
    cargar(vacios);
  };

  const handlePdf = async (fila) => {
    if (fila.tipoRegistro !== 'caso_exportacion') {
      alert('El PDF del informe de exportación está disponible solo para casos de exportación.');
      return;
    }
    setPdfCargandoId(fila.id);
    try {
      await generarPdfInformeExportacionDesdeId(fila.id, { aseguradoraOptions, responsables });
    } catch (err) {
      console.error(err);
      alert(`No se pudo generar el PDF: ${err.message || 'error desconocido'}`);
    } finally {
      setPdfCargandoId(null);
    }
  };

  const handleExportarExcel = () => {
    setExportandoExcel(true);
    try {
      exportarTrazabilidadPuertosExcel(registros);
    } catch (err) {
      alert(err.message || 'No se pudo exportar el Excel.');
    } finally {
      setExportandoExcel(false);
    }
  };

  const accionesFila = (fila) => [
    { icon: FaEdit, title: 'Editar', onClick: () => navigate(rutaEditar(fila)), danger: false },
    { icon: FaEye, title: 'Ver', onClick: () => navigate(rutaVer(fila)), danger: false },
    {
      icon: FaFilePdf,
      title: pdfCargandoId === fila.id ? 'Generando PDF…' : 'PDF',
      onClick: () => handlePdf(fila),
      danger: true,
      disabled: pdfCargandoId === fila.id,
    },
    { icon: FaCamera, title: 'Fotos', onClick: () => navigate(rutaFotos(fila)), danger: false },
  ];

  const filtrosActivos = contarFiltrosActivos(filtrosAplicados);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={puertosPageTitle}>Actas y casos de exportación</h2>
          <p className={puertosPageSubtitle}>
            {cargando
              ? 'Cargando…'
              : `${registros.length} registro(s)${filtrosActivos ? ` · ${filtrosActivos} filtro(s) activo(s)` : ''}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/puertos/actas/nueva" className={puertosBtnSecondary}>
            <FaPlus /> Nueva Acta
          </Link>
          <Link to="/puertos/actas/caso/nueva" className={puertosBtnPrimary}>
            <FaFileAlt /> Informe Exportación
          </Link>
          <Link to="/puertos/actas/inspeccion-asegurado/nueva" className={puertosBtnPrimary}>
            <FaShip /> Inspección Asegurado
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {error}. Verifique que el backend esté en ejecución.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMostrarFiltros((v) => !v)}
          className={puertosBtnSecondary}
        >
          <FaFilter /> {mostrarFiltros ? 'Ocultar filtros' : 'Filtrar'}
          {filtrosActivos > 0 && (
            <span className="rounded-full bg-fenix-primario px-2 py-0.5 text-xs text-white">
              {filtrosActivos}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => cargar(filtrosAplicados)}
          disabled={cargando}
          className={puertosBtnSecondary}
        >
          <FaSync className={cargando ? 'animate-spin' : ''} /> Actualizar
        </button>
        <button
          type="button"
          onClick={handleExportarExcel}
          disabled={exportandoExcel || cargando || registros.length === 0}
          className={puertosBtnSecondary}
        >
          <FaFileExcel /> {exportandoExcel ? 'Exportando…' : 'Exportar Excel'}
        </button>
      </div>

      {mostrarFiltros && (
        <PuertosActasFiltros
          filtros={filtros}
          onChange={setFiltros}
          onBuscar={aplicarFiltros}
          onLimpiar={limpiarFiltros}
          cargando={cargando}
          total={registros.length}
        />
      )}

      <div className={puertosTableWrap}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className={puertosTableHead}>
              <tr>
                <th className="whitespace-nowrap px-3 py-2.5 font-semibold" colSpan={4}>
                  Acciones
                </th>
                <th className="px-3 py-2.5 font-semibold">Tipo</th>
                <th className="px-3 py-2.5 font-semibold">Nro. / Consecutivo</th>
                <th className="px-3 py-2.5 font-semibold">Tipo Inspección</th>
                <th className="px-3 py-2.5 font-semibold">Regional / Ciudad</th>
                <th className="px-3 py-2.5 font-semibold">Fecha</th>
                <th className="px-3 py-2.5 font-semibold">Cliente</th>
                <th className="px-3 py-2.5 font-semibold">Beneficiario / Mercancía</th>
                <th className="px-3 py-2.5 font-semibold">Estado</th>
                <th className="px-3 py-2.5 font-semibold">Avance</th>
              </tr>
            </thead>
            <tbody>
              {!cargando && registros.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center font-body text-gray-500">
                    No hay registros con los filtros actuales.
                  </td>
                </tr>
              )}
              {registros.map((fila, i) => (
                <tr
                  key={`${fila.tipoRegistro}-${fila.id}`}
                  className={i % 2 === 0 ? puertosTableRowEven : puertosTableRowOdd}
                >
                  {accionesFila(fila).map(({ icon: Icon, title, onClick, danger, disabled }) => (
                    <td key={title} className="px-2 py-2">
                      <button
                        type="button"
                        onClick={onClick}
                        disabled={disabled}
                        className={`rounded-lg p-2 transition disabled:cursor-wait disabled:opacity-50 ${danger ? 'text-fenix-primario hover:bg-red-50 dark:hover:bg-red-950/30' : 'text-gray-600 hover:bg-gray-100 hover:text-fenix-primario dark:text-gray-300 dark:hover:bg-gray-800'}`}
                        title={title}
                      >
                        <Icon className={disabled ? 'animate-pulse' : ''} />
                      </button>
                    </td>
                  ))}
                  <td className={puertosTableTd}>
                    <span
                      className={
                        esRegistroInspeccionAsegurado(fila)
                          ? puertosBadgeAlt
                          : fila.tipoRegistro === 'caso_exportacion'
                            ? puertosBadge
                            : puertosBadgeAlt
                      }
                    >
                      {esRegistroInspeccionAsegurado(fila)
                        ? TIPO_LABEL.inspeccion_asegurado
                        : TIPO_LABEL[fila.tipoRegistro] || fila.tipoRegistro}
                    </span>
                  </td>
                  <td className={`${puertosTableTd} font-medium`}>{fila.nroReferencia || '—'}</td>
                  <td className={puertosTableTd}>{fila.tipoInspeccion || '—'}</td>
                  <td className={puertosTableTd}>{fila.regional || '—'}</td>
                  <td className={`${puertosTableTd} whitespace-nowrap`}>{fila.fecha || '—'}</td>
                  <td className={puertosTableTd}>{fila.asegurado || '—'}</td>
                  <td className={puertosTableTd}>{fila.mercancia || fila.beneficiario || '—'}</td>
                  <td className={puertosTableTd}>
                    <span
                      className={`inline-block max-w-[220px] rounded-full px-2.5 py-1 text-xs font-medium leading-snug ${claseBadgeEstadoPuertos(codigoEstadoPuertos(fila))}`}
                      title={fila.estadoDetalle || (fila.avance ? `Avance: ${fila.avance}` : resolverEtiquetaEstadoPuertos(fila))}
                    >
                      {resolverEtiquetaEstadoPuertos(fila)}
                    </span>
                  </td>
                  <td className={`${puertosTableTd} whitespace-nowrap text-center`}>
                    {fila.avance || '—'}
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
