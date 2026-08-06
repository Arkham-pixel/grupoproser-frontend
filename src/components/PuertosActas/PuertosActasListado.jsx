import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  FaBoxes,
} from 'react-icons/fa';
import { BASE_URL } from '../../config/apiConfig.js';
import { eliminarRegistroPuertos, listarRegistrosPuertos } from '../../services/puertosService.js';
import { generarPdfInformeExportacionDesdeId } from '../../services/puertosCasoExportacionPdfService.js';
import { generarPdfInformeGranelDesdeId } from '../../services/puertosCasoGranelPdfService.js';
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
import { esRegistroInspeccionAsegurado, esRegistroInspeccionMotorysa } from './puertosTipoRegistro.js';

const FORMATOS = [
  {
    id: 'acta',
    labelKey: 'ports.ui.tipos.acta',
    nuevaTo: '/puertos/actas/nueva',
    nuevaLabelKey: 'ports.ui.listado.nuevaActa',
    icon: FaPlus,
  },
  {
    id: 'caso_exportacion',
    labelKey: 'ports.ui.listado.informeExportacion',
    nuevaTo: '/puertos/actas/caso/nueva',
    nuevaLabelKey: 'ports.ui.listado.informeExportacion',
    icon: FaFileAlt,
  },
  {
    id: 'caso_granel',
    labelKey: 'ports.ui.listado.inspeccionGranel',
    nuevaTo: '/puertos/actas/granel/nueva',
    nuevaLabelKey: 'ports.ui.listado.inspeccionGranel',
    icon: FaBoxes,
  },
  {
    id: 'inspeccion_asegurado',
    labelKey: 'ports.ui.listado.inspeccionAsegurado',
    nuevaTo: '/puertos/actas/inspeccion-asegurado/nueva',
    nuevaLabelKey: 'ports.ui.listado.inspeccionAsegurado',
    icon: FaShip,
  },
  {
    id: 'inspeccion_motorysa',
    labelKey: 'ports.ui.listado.inspeccionMotorysa',
    nuevaTo: '/puertos/actas/inspeccion-motorysa/nueva',
    nuevaLabelKey: 'ports.ui.listado.inspeccionMotorysa',
    icon: FaShip,
  },
];

const FORMATOS_VALIDOS = new Set(FORMATOS.map((f) => f.id));

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
  if (esRegistroInspeccionMotorysa(registro)) {
    return `/puertos/actas/inspeccion-motorysa/editar/${registro.id}`;
  }
  if (esRegistroInspeccionAsegurado(registro)) {
    return `/puertos/actas/inspeccion-asegurado/editar/${registro.id}`;
  }
  if (registro.tipoRegistro === 'caso_granel') {
    return `/puertos/actas/granel/editar/${registro.id}`;
  }
  if (registro.tipoRegistro === 'caso_exportacion') {
    return `/puertos/actas/caso/editar/${registro.id}`;
  }
  return `/puertos/actas/editar/${registro.id}`;
}

function rutaVer(registro) {
  if (esRegistroInspeccionMotorysa(registro)) {
    return `/puertos/actas/inspeccion-motorysa/editar/${registro.id}`;
  }
  if (esRegistroInspeccionAsegurado(registro)) {
    return `/puertos/actas/inspeccion-asegurado/editar/${registro.id}`;
  }
  if (registro.tipoRegistro === 'caso_granel') {
    return `/puertos/actas/granel/ver/${registro.id}`;
  }
  if (registro.tipoRegistro === 'caso_exportacion') {
    return `/puertos/actas/caso/ver/${registro.id}`;
  }
  return `/puertos/actas/editar/${registro.id}?modo=ver`;
}

function rutaFotos(registro) {
  if (esRegistroInspeccionMotorysa(registro)) {
    return `/puertos/actas/inspeccion-motorysa/editar/${registro.id}?fotos=1`;
  }
  if (esRegistroInspeccionAsegurado(registro)) {
    return `/puertos/actas/inspeccion-asegurado/editar/${registro.id}?fotos=1`;
  }
  if (registro.tipoRegistro === 'caso_granel') {
    return `/puertos/actas/granel/editar/${registro.id}?fotos=1`;
  }
  if (registro.tipoRegistro === 'caso_exportacion') {
    return `/puertos/actas/caso/editar/${registro.id}?fotos=1`;
  }
  return `/puertos/actas/editar/${registro.id}?fotos=1`;
}

export default function PuertosActasListado() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  const formatoInicial = FORMATOS_VALIDOS.has(searchParams.get('formato'))
    ? searchParams.get('formato')
    : 'acta';

  const [formato, setFormato] = useState(formatoInicial);
  const [filtrosPorFormato, setFiltrosPorFormato] = useState(() => ({
    acta: filtrosVaciosFormato('acta'),
    caso_exportacion: filtrosVaciosFormato('caso_exportacion'),
    caso_granel: filtrosVaciosFormato('caso_granel'),
    inspeccion_asegurado: filtrosVaciosFormato('inspeccion_asegurado'),
    inspeccion_motorysa: filtrosVaciosFormato('inspeccion_motorysa'),
  }));
  const [aplicadosPorFormato, setAplicadosPorFormato] = useState(() => ({
    acta: filtrosVaciosFormato('acta'),
    caso_exportacion: filtrosVaciosFormato('caso_exportacion'),
    caso_granel: filtrosVaciosFormato('caso_granel'),
    inspeccion_asegurado: filtrosVaciosFormato('inspeccion_asegurado'),
    inspeccion_motorysa: filtrosVaciosFormato('inspeccion_motorysa'),
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
    if (esRegistroInspeccionMotorysa(registro)) {
      return t('ports.ui.tipos.inspeccion_motorysa');
    }
    if (esRegistroInspeccionAsegurado(registro)) {
      return t('ports.ui.tipos.inspeccion_asegurado');
    }
    const key = registro?.tipoRegistro;
    if (key === 'acta' || key === 'caso_exportacion' || key === 'caso_granel') {
      return t(`ports.ui.tipos.${key}`);
    }
    return key || t('ports.ui.tipos.registro');
  };

  const cargar = useCallback(
    async (tipo, filtrosBusqueda) => {
      setCargando(true);
      setError('');
      try {
        const data = await listarRegistrosPuertos(
          filtrosParaApi({ ...filtrosBusqueda, tipo, estado: '' })
        );
        setRegistros(data.registros || []);
      } catch (err) {
        setError(err.message || t('ports.ui.listado.loadError'));
        setRegistros([]);
      } finally {
        setCargando(false);
      }
    },
    [t]
  );

  useEffect(() => {
    cargar(formato, aplicadosPorFormato[formato]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar / cambio de formato vía handler
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
    const filtrosFmt = aplicadosPorFormato[nuevoFormato];
    cargar(nuevoFormato, filtrosFmt);
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
      if (fila.tipoRegistro === 'caso_granel') {
        await generarPdfInformeGranelDesdeId(fila.id, { aseguradoraOptions, responsables });
        return;
      }
      if (fila.tipoRegistro === 'acta') {
        await generarPdfActaPuertosDesdeId(fila.id);
        return;
      }
      alert(t('ports.ui.listado.pdfUnavailable'));
    } catch (err) {
      console.error(err);
      alert(
        t('ports.ui.listado.pdfError', {
          error: err.message || t('ports.ui.common.unknownError'),
        })
      );
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
      alert(
        t('ports.ui.listado.wordError', {
          error: err.message || t('ports.ui.common.unknownError'),
        })
      );
    } finally {
      setWordCargandoId(null);
    }
  };

  const handleExportarExcel = () => {
    setExportandoExcel(true);
    try {
      exportarTrazabilidadPuertosExcel(registros);
    } catch (err) {
      alert(err.message || t('ports.ui.listado.exportExcelError'));
    } finally {
      setExportandoExcel(false);
    }
  };

  const handleEliminar = async (fila) => {
    const etiqueta = etiquetaTipo(fila);
    const referencia = fila.nroReferencia || fila.id;
    const confirmar = window.confirm(
      t('ports.ui.listado.deleteConfirm', { tipo: etiqueta, referencia })
    );
    if (!confirmar) return;

    setEliminandoId(fila.id);
    setError('');
    try {
      await eliminarRegistroPuertos(fila);
      setRegistros((prev) => prev.filter((r) => r.id !== fila.id));
    } catch (err) {
      setError(err.message || t('ports.ui.listado.deleteError'));
    } finally {
      setEliminandoId(null);
    }
  };

  const accionesFila = (fila) => [
    {
      icon: FaEdit,
      title: t('ports.ui.common.edit'),
      onClick: () => navigate(rutaEditar(fila)),
      danger: false,
    },
    {
      icon: FaEye,
      title: t('ports.ui.common.view'),
      onClick: () => navigate(rutaVer(fila)),
      danger: false,
    },
    {
      icon: FaFilePdf,
      title:
        pdfCargandoId === fila.id ? t('ports.ui.common.generatingPdf') : t('ports.ui.common.pdf'),
      onClick: () => handlePdf(fila),
      danger: true,
      disabled: pdfCargandoId === fila.id,
    },
    ...(fila.tipoRegistro === 'caso_exportacion'
      ? [
          {
            icon: FaFileWord,
            title:
              wordCargandoId === fila.id
                ? t('ports.ui.common.generatingWord')
                : t('ports.ui.common.word'),
            onClick: () => handleWord(fila),
            danger: false,
            disabled: wordCargandoId === fila.id,
          },
        ]
      : []),
    {
      icon: FaCamera,
      title: t('ports.ui.common.photos'),
      onClick: () => navigate(rutaFotos(fila)),
      danger: false,
    },
    {
      icon: FaTrash,
      title:
        eliminandoId === fila.id ? t('ports.ui.common.deleting') : t('ports.ui.common.delete'),
      onClick: () => handleEliminar(fila),
      danger: true,
      disabled: eliminandoId === fila.id,
    },
  ];

  const filtrosActivos = contarFiltrosFormato(filtrosAplicados);
  const dash = t('ports.ui.common.dash');

  const etiquetaCliente = (fila) => {
    const cliente = String(fila?.asegurado || '').trim();
    if (cliente) return cliente;
    const beneficiario = String(fila?.beneficiario || '').trim();
    return beneficiario || dash;
  };

  const etiquetaAseguradora = (fila) => {
    const raw = String(fila?.aseguradora || '').trim();
    if (!raw) return dash;
    const encontrada = aseguradoraOptions.find(
      (o) =>
        String(o.value) === raw ||
        String(o.label || '').toUpperCase() === raw.toUpperCase()
    );
    const label = String(encontrada?.label || '').trim();
    return label || raw;
  };

  const columnas = useMemo(() => {
    const base = [
      'actions',
      'number',
      'inspectionType',
      'regional',
      'date',
      'client',
      'insurer',
      'beneficiary',
    ];
    if (formato === 'caso_exportacion' || formato === 'caso_granel') base.push('progress');
    return base;
  }, [formato]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={puertosPageTitle}>{t('ports.ui.listado.title')}</h2>
          <p className={puertosPageSubtitle}>
            {cargando
              ? t('ports.ui.listado.loading')
              : `${t(formatoMeta.labelKey)} · ${t('ports.ui.listado.recordsCount', {
                  count: registros.length,
                })}${
                  filtrosActivos
                    ? t('ports.ui.listado.filtersActive', { count: filtrosActivos })
                    : ''
                }`}
          </p>
        </div>
        <Link
          to={formatoMeta.nuevaTo}
          className={formato === 'acta' ? puertosBtnSecondary : puertosBtnPrimary}
        >
          <IconoFormato /> {t(formatoMeta.nuevaLabelKey)}
        </Link>
      </div>

      {/* Menú de formatos */}
      <nav className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-800">
        {FORMATOS.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => cambiarFormato(id)}
            className={formato === id ? puertosTabActive : puertosTabIdle}
          >
            <Icon />
            {t(labelKey)}
          </button>
        ))}
      </nav>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {t('ports.ui.listado.errorBackend', { error })}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMostrarFiltros((v) => !v)}
          className={puertosBtnSecondary}
        >
          <FaFilter />{' '}
          {mostrarFiltros ? t('ports.ui.listado.hideFilters') : t('ports.ui.listado.showFilters')}
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
          <FaSync className={cargando ? 'animate-spin' : ''} /> {t('ports.ui.listado.update')}
        </button>
        <button
          type="button"
          onClick={handleExportarExcel}
          disabled={exportandoExcel || cargando || registros.length === 0}
          className={puertosBtnSecondary}
        >
          <FaFileExcel />{' '}
          {exportandoExcel ? t('ports.ui.listado.exporting') : t('ports.ui.listado.exportExcel')}
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
          tituloExtra={t(formatoMeta.labelKey)}
        />
      )}

      <div className={puertosTableWrap}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className={puertosTableHead}>
              <tr>
                {columnas.map((col) => (
                  <th
                    key={col}
                    className={`px-3 py-2.5 font-semibold ${
                      col === 'actions' ? 'whitespace-nowrap' : ''
                    }`}
                  >
                    {t(`ports.ui.listado.columns.${col}`)}
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
                    {t('ports.ui.listado.empty')}
                  </td>
                </tr>
              )}
              {cargando && (
                <tr>
                  <td
                    colSpan={columnas.length}
                    className="px-4 py-10 text-center font-body text-gray-500"
                  >
                    {t('ports.ui.listado.loading')}
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
                      {fila.nroReferencia || dash}
                    </td>
                    <td className={puertosTableTd}>{fila.tipoInspeccion || dash}</td>
                    <td className={`${puertosTableTd} notranslate`} translate="no">
                      {fila.regional || dash}
                    </td>
                    <td className={`${puertosTableTd} whitespace-nowrap`}>
                      {fila.fecha || dash}
                    </td>
                    <td className={`${puertosTableTd} notranslate`} translate="no">
                      {etiquetaCliente(fila)}
                    </td>
                    <td className={`${puertosTableTd} notranslate`} translate="no">
                      {etiquetaAseguradora(fila)}
                    </td>
                    <td className={puertosTableTd}>
                      {fila.mercancia || fila.beneficiario || dash}
                    </td>
                    {formato === 'caso_exportacion' || formato === 'caso_granel' ? (
                      <td className={`${puertosTableTd} whitespace-nowrap text-center`}>
                        {fila.avance || dash}
                      </td>
                    ) : null}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
