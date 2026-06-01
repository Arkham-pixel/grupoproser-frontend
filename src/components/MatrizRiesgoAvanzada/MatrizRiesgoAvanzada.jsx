import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FaArrowLeft,
  FaBullseye,
  FaSearch,
  FaChartBar,
  FaFire,
  FaShieldAlt,
  FaSpinner,
} from 'react-icons/fa';
import InformacionMatriz from './InformacionMatriz';
import IdentificacionRiesgos from './IdentificacionRiesgos';
import ValoracionRiesgos from './ValoracionRiesgos';
import MapaCalorRiesgos from './MapaCalorRiesgos';
import GestionRiesgos from './GestionRiesgos';
import { ReporteService } from '../../services/reporteService';
import { MatrizRiesgoService } from '../../services/matrizRiesgoService';
import './matrizFenixTheme.css';

/** Referencias estables para no crear arrays nuevos en cada render */
const RIESGOS_IDENTIFICACION_VACIOS = [];
const FILAS_IDENTIFICACION_VACIAS = [];

const SECCIONES_NAV = [
  {
    id: 'informacion',
    titulo: 'Información',
    descripcion: 'Guía de uso y tutorial de la herramienta',
    icon: FaBullseye,
  },
  {
    id: 'identificacion',
    titulo: 'Identificación',
    descripcion: 'Identificación y categorización de riesgos',
    icon: FaSearch,
  },
  {
    id: 'valoracion',
    titulo: 'Valoración',
    descripcion: 'Valoración y análisis de probabilidad e impacto',
    icon: FaChartBar,
  },
  {
    id: 'mapa-calor',
    titulo: 'Mapa de Calor',
    descripcion: 'Visualización de la matriz de riesgos',
    icon: FaFire,
  },
  {
    id: 'gestion-riesgos',
    titulo: 'Gestión de Riesgos',
    descripcion: 'Recomendaciones y seguimiento de implementación',
    icon: FaShieldAlt,
  },
];

const inputSelectClass =
  'min-w-[11rem] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-fenix-primario focus:outline-none focus:ring-1 focus:ring-fenix-primario dark:border-gray-700 dark:bg-[#1A1A1A] dark:text-gray-200';

const MatrizRiesgoAvanzada = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [seccionActiva, setSeccionActiva] = useState('informacion');
  const [datosMatriz, setDatosMatriz] = useState({
    informacion: {},
    identificacion: {},
    valoracion: {},
    mapaCalor: {},
    gestionRiesgos: {},
  });
  const [mensajeReporte, setMensajeReporte] = useState('');
  const [estadoGuardado, setEstadoGuardado] = useState('idle');
  const [mensajeGuardado, setMensajeGuardado] = useState('');
  const [matrizId, setMatrizId] = useState(id || null);
  const [tipoReporte, setTipoReporte] = useState('inicial');
  const [cargando, setCargando] = useState(!!id);

  useEffect(() => {
    setMatrizId(id || null);
  }, [id]);

  useEffect(() => {
    const cargarMatrizExistente = async () => {
      if (id) {
        try {
          setCargando(true);
          const resultado = await MatrizRiesgoService.obtenerMatrizRiesgo(id);
          if (resultado.success && resultado.data) {
            const matriz = resultado.data;
            setMatrizId(matriz._id);
            setDatosMatriz(
              matriz.datosMatriz || {
                informacion: {},
                identificacion: {},
                valoracion: {},
                mapaCalor: {},
                gestionRiesgos: {},
              }
            );
            setTipoReporte(matriz.tipo === 'matriz_riesgo_anual' ? 'anual' : 'inicial');
          }
        } catch (error) {
          console.error('Error cargando matriz:', error);
          alert('Error al cargar la matriz: ' + error.message);
          navigate('/matrices-riesgo');
        } finally {
          setCargando(false);
        }
      } else {
        setMatrizId(null);
        const datosGuardados = localStorage.getItem('matrizRiesgos');
        if (datosGuardados) {
          try {
            const datosParseados = JSON.parse(datosGuardados);
            if (datosParseados && typeof datosParseados === 'object') {
              setDatosMatriz({
                informacion: datosParseados.informacion || {},
                identificacion: datosParseados.identificacion || {},
                valoracion: datosParseados.valoracion || {},
                mapaCalor: datosParseados.mapaCalor || {},
                gestionRiesgos: datosParseados.gestionRiesgos || {},
              });
            }
          } catch (error) {
            console.error('Error al cargar datos guardados:', error);
            localStorage.removeItem('matrizRiesgos');
          }
        }
      }
    };

    cargarMatrizExistente();
  }, [id, navigate]);

  useEffect(() => {
    const esRutaMatriz = location.pathname.includes('/matriz-riesgo-avanzada');
    if (!esRutaMatriz) return;

    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('matrizRiesgos', JSON.stringify(datosMatriz));
      } catch (error) {
        console.error('Error al guardar datos:', error);
        try {
          localStorage.removeItem('matrizRiesgos');
          localStorage.setItem('matrizRiesgos', JSON.stringify(datosMatriz));
        } catch (e) {
          console.error('Error crítico al guardar:', e);
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [datosMatriz, location.pathname]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const esRutaMatriz = window.location.pathname.includes('/matriz-riesgo-avanzada');
      if (esRutaMatriz) {
        try {
          localStorage.setItem('matrizRiesgos', JSON.stringify(datosMatriz));
        } catch (error) {
          console.error('Error al guardar antes de salir:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [datosMatriz]);

  useEffect(() => {
    const esRutaMatriz = location.pathname.includes('/matriz-riesgo-avanzada');
    if (!esRutaMatriz) {
      localStorage.removeItem('matrizRiesgos');
    }

    return () => {
      setTimeout(() => {
        const sigueEnRutaMatriz = window.location.pathname.includes('/matriz-riesgo-avanzada');
        if (!sigueEnRutaMatriz) {
          localStorage.removeItem('matrizRiesgos');
        }
      }, 100);
    };
  }, [location.pathname]);

  const handleDatosChange = useCallback((seccion, datos) => {
    setDatosMatriz((prev) => {
      try {
        const prevStr = JSON.stringify(prev[seccion] ?? {});
        const nextStr = JSON.stringify(datos ?? {});
        if (prevStr === nextStr) return prev;
      } catch {
        // continuar
      }
      return { ...prev, [seccion]: datos };
    });
  }, []);

  const handleGuardarMatriz = async () => {
    try {
      setEstadoGuardado('guardando');
      setMensajeGuardado('Guardando matriz de riesgo...');

      const nombreEmpresa = datosMatriz.informacion?.nombreEmpresa || 'Empresa Sin Nombre';
      const titulo = `Matriz de Riesgo - ${nombreEmpresa}`;

      const datosCompletos = {
        informacion: datosMatriz.informacion || {},
        identificacion: datosMatriz.identificacion || {},
        valoracion: datosMatriz.valoracion || {},
        mapaCalor: datosMatriz.mapaCalor || {},
        gestionRiesgos: datosMatriz.gestionRiesgos || {},
      };

      let resultado;
      const idEnUrl = id || null;
      const idParaGuardar = idEnUrl || matrizId;

      const crearNueva = async () => {
        const creada = await MatrizRiesgoService.crearMatrizRiesgo(
          datosCompletos,
          nombreEmpresa,
          titulo
        );
        const nuevoId = creada.data?.id || creada.data?._id;
        if (nuevoId) {
          setMatrizId(nuevoId);
          navigate(`/matriz-riesgo-avanzada/${nuevoId}`, { replace: true });
        }
        return creada;
      };

      if (idParaGuardar) {
        try {
          resultado = await MatrizRiesgoService.actualizarMatrizRiesgo(
            idParaGuardar,
            datosCompletos,
            titulo,
            'en_proceso'
          );
          setMensajeGuardado('Matriz actualizada exitosamente');
        } catch (updateError) {
          const esNoEncontrada =
            updateError.message?.includes('no encontrada') ||
            updateError.message?.includes('404');
          if (esNoEncontrada) {
            setMatrizId(null);
            resultado = await crearNueva();
            setMensajeGuardado('Matriz guardada como nueva (la anterior ya no existía)');
          } else {
            throw updateError;
          }
        }
      } else {
        resultado = await crearNueva();
        setMensajeGuardado('Matriz guardada exitosamente');
      }

      setEstadoGuardado('guardado');
      setTimeout(() => {
        setMensajeGuardado('');
        setEstadoGuardado('idle');
      }, 3000);
    } catch (error) {
      console.error('Error guardando matriz:', error);
      setEstadoGuardado('error');
      setMensajeGuardado(`Error: ${error.message}`);
      setTimeout(() => {
        setMensajeGuardado('');
        setEstadoGuardado('idle');
      }, 5000);
    }
  };

  const handleGenerarReporte = async () => {
    try {
      setMensajeReporte('Generando reporte completo...');
      const resultado = await ReporteService.mostrarReporte(datosMatriz, tipoReporte);
      if (resultado.success) {
        setMensajeReporte('Reporte generado. Se abrió en una nueva ventana.');
      } else {
        setMensajeReporte(`Error al generar reporte: ${resultado.error}`);
      }
      setTimeout(() => setMensajeReporte(''), 5000);
    } catch (error) {
      console.error('Error generando reporte:', error);
      setMensajeReporte('Error inesperado al generar el reporte');
      setTimeout(() => setMensajeReporte(''), 5000);
    }
  };

  const handleExportarReporte = async () => {
    try {
      setMensajeReporte('Exportando reporte como HTML...');
      const resultado = await ReporteService.exportarReporteHTML(
        datosMatriz,
        'reporte_matriz_riesgos',
        tipoReporte
      );
      if (resultado.success) {
        setMensajeReporte(`Reporte exportado: ${resultado.nombreArchivo}`);
      } else {
        setMensajeReporte(`Error al exportar: ${resultado.error}`);
      }
      setTimeout(() => setMensajeReporte(''), 5000);
    } catch (error) {
      console.error('Error exportando reporte:', error);
      setMensajeReporte('Error inesperado al exportar el reporte');
      setTimeout(() => setMensajeReporte(''), 5000);
    }
  };

  const secciones = [
    {
      id: 'informacion',
      componente: (
        <InformacionMatriz
          datos={datosMatriz.informacion}
          onDatosChange={(datos) => handleDatosChange('informacion', datos)}
        />
      ),
    },
    {
      id: 'identificacion',
      componente: (
        <IdentificacionRiesgos
          datos={datosMatriz.identificacion}
          onDatosChange={(datos) => handleDatosChange('identificacion', datos)}
        />
      ),
    },
    {
      id: 'valoracion',
      componente: (
        <ValoracionRiesgos
          datos={datosMatriz.valoracion}
          onDatosChange={(datos) => handleDatosChange('valoracion', datos)}
          riesgosIdentificacion={datosMatriz.identificacion?.riesgos ?? RIESGOS_IDENTIFICACION_VACIOS}
          filasIdentificacionFormulario={
            datosMatriz.identificacion?.filasFormulario ?? FILAS_IDENTIFICACION_VACIAS
          }
        />
      ),
    },
    {
      id: 'mapa-calor',
      componente: (
        <MapaCalorRiesgos
          datos={datosMatriz}
          onDatosChange={(datos) => handleDatosChange('mapaCalor', datos)}
          tipoReporte={tipoReporte}
        />
      ),
    },
    {
      id: 'gestion-riesgos',
      componente: (
        <GestionRiesgos
          datos={datosMatriz.gestionRiesgos}
          onDatosChange={(datos) => handleDatosChange('gestionRiesgos', datos)}
        />
      ),
    },
  ];

  const seccionActual = secciones.find((s) => s.id === seccionActiva);
  const navActual = SECCIONES_NAV.find((s) => s.id === seccionActiva);

  if (cargando) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-fenix-fondo dark:bg-[#0F0F0F]">
        <FaSpinner className="animate-spin text-3xl text-fenix-primario" aria-hidden />
        <p className="font-body text-sm text-gray-600 dark:text-gray-400">
          Cargando matriz de riesgo...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-fenix-fondo dark:bg-[#0F0F0F]">
      <div className="grid h-full min-h-0 w-full grid-cols-1 lg:grid-cols-[minmax(220px,260px)_1fr]">
        {/* Columna Secciones */}
        <aside className="flex min-h-0 flex-col border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-[#141414] lg:border-b-0 lg:border-r">
          <div className="shrink-0 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Secciones
            </h2>
          </div>
          <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
            {SECCIONES_NAV.map((seccion) => {
              const Icon = seccion.icon;
              const activo = seccionActiva === seccion.id;
              return (
                <button
                  key={seccion.id}
                  type="button"
                  onClick={() => setSeccionActiva(seccion.id)}
                  title={seccion.descripcion}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    activo
                      ? 'border-l-4 border-fenix-primario border-gray-100 bg-red-50 shadow-sm dark:border-gray-800 dark:bg-red-950/25'
                      : 'border-gray-100 bg-white shadow-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-[#1A1A1A] dark:hover:bg-gray-800/80'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      activo
                        ? 'bg-fenix-primario/10 text-fenix-primario'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    <Icon className="text-base" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block font-heading text-sm font-semibold ${
                        activo ? 'text-fenix-primario' : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {seccion.titulo}
                    </span>
                    <span className="mt-0.5 block font-body text-xs leading-snug text-gray-500 dark:text-gray-400">
                      {seccion.descripcion}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Columna principal */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-[#1A1A1A] sm:px-6">
            <button
              type="button"
              onClick={() => navigate('/matrices-riesgo')}
              className="mb-3 flex items-center gap-2 font-heading text-lg font-bold text-gray-800 transition hover:text-fenix-primario dark:text-white"
            >
              <FaArrowLeft className="text-sm text-fenix-primario" />
              Matriz de Riesgo
            </button>

            {navActual && (
              <p className="mb-3 font-body text-sm text-gray-500 dark:text-gray-400">
                {navActual.descripcion}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="tipo-reporte"
                  className="font-body text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  Tipo de reporte
                </label>
                <select
                  id="tipo-reporte"
                  value={tipoReporte}
                  onChange={(e) => setTipoReporte(e.target.value)}
                  className={inputSelectClass}
                  title="Selecciona el tipo de reporte a generar"
                >
                  <option value="inicial">Valoración inicial</option>
                  <option value="anual">Valoración anual</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-fenix-primary min-w-[7.5rem] disabled:opacity-60"
                  onClick={handleGuardarMatriz}
                  disabled={estadoGuardado === 'guardando'}
                  title="Guardar matriz de riesgo en la base de datos"
                >
                  {estadoGuardado === 'guardando' ? 'Guardando…' : 'Guardar'}
                </button>
                <button
                  type="button"
                  className="btn-fenix-secondary min-w-[7.5rem]"
                  onClick={handleGenerarReporte}
                  title="Generar reporte completo en nueva ventana"
                >
                  Ver reporte
                </button>
                <button
                  type="button"
                  className="btn-fenix-secondary min-w-[7.5rem]"
                  onClick={handleExportarReporte}
                  title="Exportar como HTML"
                >
                  Exportar HTML
                </button>
              </div>
            </div>

            {(mensajeGuardado || mensajeReporte) && (
              <div className="mt-3 space-y-2">
                {mensajeGuardado && (
                  <p
                    className={`rounded-lg px-3 py-2 font-body text-sm ${
                      estadoGuardado === 'error'
                        ? 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'
                        : estadoGuardado === 'guardando'
                          ? 'border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                          : 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                    }`}
                  >
                    {mensajeGuardado}
                  </p>
                )}
                {mensajeReporte && (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-body text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                    {mensajeReporte}
                  </p>
                )}
              </div>
            )}
          </div>

          <div
            className="matriz-fenix-scope min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6"
            id={`${seccionActiva}-section`}
          >
            {seccionActual?.componente}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatrizRiesgoAvanzada;
