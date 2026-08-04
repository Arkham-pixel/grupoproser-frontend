import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaEdit,
  FaEye,
  FaFilePdf,
  FaFileWord,
  FaCamera,
  FaPlus,
  FaFilter,
  FaSync,
  FaFileExcel,
  FaFileAlt,
  FaShip,
  FaTrash,
} from 'react-icons/fa';
import { BASE_URL } from '../../config/apiConfig.js';
import { eliminarRegistroPuertos, listarRegistrosPuertos } from '../../services/puertosService.js';
import { generarPdfInformeExportacionDesdeId } from '../../services/puertosCasoExportacionPdfService.js';
import { generarWordInformeExportacionDesdeId } from '../../services/puertosCasoExportacionWordService.js';
import { generarPdfActaPuertosDesdeId } from '../../services/puertosActaPdfService.js';
import PuertosActasFiltros from './PuertosActasFiltros.jsx';
import {
  exportarTrazabilidadPuertosExcel,
  FILTROS_PUERTOS_VACIOS,
  filtrosParaApi,
} from './puertosActasTrazabilidad.js';
import {
  puertosBtnPrimary,
  puertosBtnSecondary,
  puertosPageSubtitle,
  puertosPageTitle,
  puertosTabActive,
  puertosTabIdle,
  puertosTableHead,
  puertosTableRowEven,
  puertosTableRowOdd,
  puertosTableTd,
  puertosTableWrap,
} from './puertosFenixUi';
import { esRegistroInspeccionAsegurado } from './puertosTipoRegistro.js';

const FORMATOS = [
  {
    id: 'acta',
    label: 'Acta',
    nuevaTo: '/puertos/actas/nueva',
    nuevaLabel: 'Nueva Acta',
    icon: FaPlus,
  },
  {
    id: 'caso_exportacion',
    label: 'Informe Exportación',
    nuevaTo: '/puertos/actas/caso/nueva',
    nuevaLabel: 'Informe Exportación',
    icon: FaFileAlt,
  },
  {
    id: 'inspeccion_asegurado',
    label: 'Inspección Asegurado',
    nuevaTo: '/puertos/actas/inspeccion-asegurado/nueva',
    nuevaLabel: 'Inspección Asegurado',
    icon: FaShip,
  },
];

const FORMATOS_VALIDOS = new Set(FORMATOS.map((f) => f.id));
const TIPO_LABEL = {
  acta: 'Acta',
  caso_exportacion: 'Caso exportación',
  inspeccion_asegurado: 'Inspección asegurado',
};

function filtrosVaciosFormato(tipo) {
  return { ...FILTROS_PUERTOS_VACIOS, tipo, estado: '' };
}

function contarFiltrosFormato(filtros = {}) {
  return Object.entries(filtros).filter(([k, v]) => {
    if (k === 'tipo' || k === 'estado') return false;
    return String(v || '').trim();
  }).length;
}

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
  const [searchParams, setSearchParams] = useSearchParams();

  const formatoInicial = FORMATOS_VALIDOS.has(searchParams.get('formato'))
    ? searchParams.get('formato')
    : 'acta';

  const [formato, setFormato] = useState(formatoInicial);
  const [filtrosPorFormato, setFiltrosPorFormato] = useState(() => ({
    acta: filtrosVaciosFormato('acta'),
    caso_exportacion: filtrosVaciosFormato('caso_exportacion'),
    inspeccion_asegurado: filtrosVaciosFormato('inspeccion_asegurado'),
  }));
  const [aplicadosPorFormato, setAplicadosPorFormato] = useState(() => ({
    acta: filtrosVaciosFormato('acta'),
    caso_exportacion: filtrosVaciosFormato('caso_exportacion'),
    inspeccion_asegurado: filtrosVaciosFormato('inspeccion_asegurado'),
  }));
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [pdfCargandoId, setPdfCargandoId] = useState(null);
  const [wordCargandoId, setWordCargandoId] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [aseguradoraOptions, setAseguradoraOptions] = useState([]);
  const [responsables, setResponsables] = useState([]);

  const filtros = filtrosPorFormato[formato];
  const filtrosAplicados = aplicadosPorFormato[formato];
  const formatoMeta = FORMATOS.find((f) => f.id === formato) || FORMATOS[0];
  const IconoFormato = formatoMeta.icon;

  const etiquetaTipo = (registro) => {
    if (esRegistroInspeccionAsegurado(registro)) return TIPO_LABEL.inspeccion_asegurado;
    return TIPO_LABEL[registro?.tipoRegistro] || registro?.tipoRegistro || 'Registro';
  };

  const cargar = useCallback(async (tipo, filtrosBusqueda) => {
    setCargando(true);
    setError('');
    try {
      const data = await listarRegistrosPuertos(
        filtrosParaApi({ ...filtrosBusqueda, tipo, estado: '' })
      );
      setRegistros(data.registros || []);
    } catch (err) {
      setError(err.message || 'Error al cargar registros');
      setRegistros([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar(formato, aplicadosPorFormato[formato]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const cambiarFormato = (nuevoFormato) => {
    if (!FORMATOS_VALIDOS.has(nuevoFormato) || nuevoFormato === formato) return;
    setFormato(nuevoFormato);
    setSearchParams(nuevoFormato === 'acta' ? {} : { formato: nuevoFormato }, { replace: true });
    setMostrarFiltros(false);
    cargar(nuevoFormato, aplicadosPorFormato[nuevoFormato]);
  };

  const setFiltrosActuales = (nuevos) => {
    setFiltrosPorFormato((prev) => ({
      ...prev,
      [formato]: { ...nuevos, tipo: formato, estado: '' },
    }));
  };

  const aplicarFiltros = () => {
    const aplicados = { ...filtros, tipo: formato, estado: '' };
    setAplicadosPorFormato((prev) => ({ ...prev, [formato]: aplicados }));
    cargar(formato, aplicados);
  };

  const limpiarFiltros = () => {
    const vacios = filtrosVaciosFormato(formato);
    setFiltrosPorFormato((prev) => ({ ...prev, [formato]: vacios }));
    setAplicadosPorFormato((prev) => ({ ...prev, [formato]: vacios }));
    cargar(formato, vacios);
  };

  const handlePdf = async (fila) => {
    setPdfCargandoId(fila.id);
    try {
      if (fila.tipoRegistro === 'caso_exportacion') {
        await generarPdfInformeExportacionDesdeId(fila.id, { aseguradoraOptions, responsables });
        return;
      }
      if (fila.tipoRegistro === 'acta') {
        await generarPdfActaPuertosDesdeId(fila.id);
        return;
      }
      alert('PDF no disponible para este tipo de registro.');
    } catch (err) {
      console.error(err);
      alert(`No se pudo generar el PDF: ${err.message || 'Error desconocido'}`);
    } finally {
      setPdfCargandoId(null);
    }
  };

  const handleWord = async (fila) => {
    setWordCargandoId(fila.id);
    try {
      await generarWordInformeExportacionDesdeId(fila.id, { aseguradoraOptions, responsables });
    } catch (err) {
      console.error(err);
      alert(`No se pudo generar el Word: ${err.message || 'Error desconocido'}`);
    } finally {
      setWordCargandoId(null);
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

  const handleEliminar = async (fila) => {
    const etiqueta = etiquetaTipo(fila);
    const referencia = fila.nroReferencia || fila.id;
    const confirmar = window.confirm(
      `¿Eliminar ${etiqueta} "${referencia}"?\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    setEliminandoId(fila.id);
    setError('');
    try {
      await eliminarRegistroPuertos(fila);
      setRegistros((prev) => prev.filter((r) => r.id !== fila.id));
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el registro');
    } finally {
      setEliminandoId(null);
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
    ...(fila.tipoRegistro === 'caso_exportacion'
      ? [
          {
            icon: FaFileWord,
            title: wordCargandoId === fila.id ? 'Generando Word…' : 'Word',
            onClick: () => handleWord(fila),
            danger: false,
            disabled: wordCargandoId === fila.id,
          },
        ]
      : []),
    { icon: FaCamera, title: 'Fotos', onClick: () => navigate(rutaFotos(fila)), danger: false },
    {
      icon: FaTrash,
      title: eliminandoId === fila.id ? 'Eliminando…' : 'Eliminar',
      onClick: () => handleEliminar(fila),
      danger: true,
      disabled: eliminandoId === fila.id,
    },
  ];

  const filtrosActivos = contarFiltrosFormato(filtrosAplicados);

  const etiquetaCliente = (fila) => {
    const cliente = String(fila?.asegurado || '').trim();
    if (cliente) return cliente;
    const beneficiario = String(fila?.beneficiario || '').trim();
    return beneficiario || '—';
  };

  const etiquetaAseguradora = (fila) => {
    const raw = String(fila?.aseguradora || '').trim();
    if (!raw) return '—';
    const encontrada = aseguradoraOptions.find(
      (o) =>
        String(o.value) === raw ||
        String(o.label || '').toUpperCase() === raw.toUpperCase()
    );
    return String(encontrada?.label || '').trim() || raw;
  };

  const columnas = useMemo(() => {
    const base = [
      { key: 'actions', label: 'Acciones' },
      { key: 'number', label: 'Nro. / Consecutivo' },
      { key: 'inspectionType', label: 'Tipo Inspección' },
      { key: 'regional', label: 'Regional / Ciudad' },
      { key: 'date', label: 'Fecha' },
      { key: 'client', label: 'Cliente' },
      { key: 'insurer', label: 'Aseguradora' },
      { key: 'beneficiary', label: 'Beneficiario / Tipo de mercancía' },
    ];
    if (formato === 'caso_exportacion') {
      base.push({ key: 'progress', label: 'Avance' });
    }
    return base;
  }, [formato]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={puertosPageTitle}>Actas y casos de exportación</h2>
          <p className={puertosPageSubtitle}>
            {cargando
              ? 'Cargando…'
              : `${formatoMeta.label} · ${registros.length} registro(s)${
                  filtrosActivos ? ` · ${filtrosActivos} filtro(s) activo(s)` : ''
                }`}
          </p>
        </div>
        <Link
          to={formatoMeta.nuevaTo}
          className={formato === 'acta' ? puertosBtnSecondary : puertosBtnPrimary}
        >
          <IconoFormato /> {formatoMeta.nuevaLabel}
        </Link>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-800">
        {FORMATOS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => cambiarFormato(id)}
            className={formato === id ? puertosTabActive : puertosTabIdle}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>

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
          onClick={() => cargar(formato, filtrosAplicados)}
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
          onChange={setFiltrosActuales}
          onBuscar={aplicarFiltros}
          onLimpiar={limpiarFiltros}
          cargando={cargando}
          total={registros.length}
          ocultarTipo
          tituloExtra={formatoMeta.label}
        />
      )}

      <div className={puertosTableWrap}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className={puertosTableHead}>
              <tr>
                {columnas.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2.5 font-semibold ${
                      col.key === 'actions' ? 'whitespace-nowrap' : ''
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!cargando && registros.length === 0 && (
                <tr>
                  <td
                    colSpan={columnas.length}
                    className="px-4 py-10 text-center font-body text-gray-500"
                  >
                    No hay registros con los filtros actuales.
                  </td>
                </tr>
              )}
              {cargando && (
                <tr>
                  <td
                    colSpan={columnas.length}
                    className="px-4 py-10 text-center font-body text-gray-500"
                  >
                    Cargando…
                  </td>
                </tr>
              )}
              {!cargando &&
                registros.map((fila, i) => (
                  <tr
                    key={`${fila.tipoRegistro}-${fila.id}`}
                    className={i % 2 === 0 ? puertosTableRowEven : puertosTableRowOdd}
                  >
                    <td className="whitespace-nowrap px-2 py-2">
                      <div className="flex items-center gap-1">
                        {accionesFila(fila).map(
                          ({ icon: Icon, title, onClick, danger, disabled }) => (
                            <button
                              key={title}
                              type="button"
                              onClick={onClick}
                              disabled={disabled}
                              className={`rounded-lg p-2 transition disabled:cursor-wait disabled:opacity-50 ${
                                danger
                                  ? 'text-fenix-primario hover:bg-red-50 dark:hover:bg-red-950/30'
                                  : 'text-gray-600 hover:bg-gray-100 hover:text-fenix-primario dark:text-gray-300 dark:hover:bg-gray-800'
                              }`}
                              title={title}
                            >
                              <Icon className={disabled ? 'animate-pulse' : ''} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                    <td className={`${puertosTableTd} font-medium`}>
                      {fila.nroReferencia || '—'}
                    </td>
                    <td className={puertosTableTd}>{fila.tipoInspeccion || '—'}</td>
                    <td className={puertosTableTd}>{fila.regional || '—'}</td>
                    <td className={`${puertosTableTd} whitespace-nowrap`}>
                      {fila.fecha || '—'}
                    </td>
                    <td className={puertosTableTd}>{etiquetaCliente(fila)}</td>
                    <td className={puertosTableTd}>{etiquetaAseguradora(fila)}</td>
                    <td className={puertosTableTd}>
                      {fila.mercancia || fila.beneficiario || '—'}
                    </td>
                    {formato === 'caso_exportacion' && (
                      <td className={`${puertosTableTd} whitespace-nowrap text-center`}>
                        {fila.avance || '—'}
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
