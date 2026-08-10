import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaArrowLeft,
  FaBullseye,
  FaSearch,
  FaChartBar,
  FaFire,
  FaShieldAlt,
  FaSpinner,
  FaFileAlt,
} from 'react-icons/fa';
import InformacionMatriz from './InformacionMatriz';
import IdentificacionRiesgos from './IdentificacionRiesgos';
import ValoracionRiesgos from './ValoracionRiesgos';
import MapaCalorRiesgos from './MapaCalorRiesgos';
import GestionRiesgos from './GestionRiesgos';
import { normalizarGestionRiesgos } from './gestionRiesgosHelpers';
import FormAutoSaveControls from '../AutoSave/FormAutoSaveControls';
import { ReporteService } from '../../services/reporteService';
import { MatrizRiesgoService } from '../../services/matrizRiesgoService';
import { guardarDatosReporteMatriz, urlReporteMatriz } from './matrizReporteStorage';
import { useFormAutoSave } from '../../hooks/useFormAutoSave';
import './matrizFenixTheme.css';

/** Referencias estables para no crear arrays nuevos en cada render */
const RIESGOS_IDENTIFICACION_VACIOS = [];
const FILAS_IDENTIFICACION_VACIAS = [];

const DATOS_MATRIZ_VACIOS = {
  informacion: {},
  identificacion: {},
  valoracion: {},
  mapaCalor: {},
  gestionRiesgos: {},
};

const SECCIONES_NAV = [
  {
    id: 'informacion',
    titleKey: 'riskMatrix.information',
    descriptionKey: 'riskMatrix.informationDescription',
    icon: FaBullseye,
  },
  {
    id: 'identificacion',
    titleKey: 'riskMatrix.identification',
    descriptionKey: 'riskMatrix.identificationDescription',
    icon: FaSearch,
  },
  {
    id: 'valoracion',
    titleKey: 'riskMatrix.assessment',
    descriptionKey: 'riskMatrix.assessmentDescription',
    icon: FaChartBar,
  },
  {
    id: 'mapa-calor',
    titleKey: 'riskMatrix.heatMap',
    descriptionKey: 'riskMatrix.heatMapDescription',
    icon: FaFire,
  },
  {
    id: 'gestion-riesgos',
    titleKey: 'riskMatrix.management',
    descriptionKey: 'riskMatrix.managementDescription',
    icon: FaShieldAlt,
  },
];

const inputSelectClass =
  'min-w-[11rem] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-fenix-primario focus:outline-none focus:ring-1 focus:ring-fenix-primario dark:border-gray-700 dark:bg-[#1A1A1A] dark:text-gray-200';

const MatrizRiesgoAvanzada = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [seccionActiva, setSeccionActiva] = useState('informacion');
  const [datosMatriz, setDatosMatriz] = useState(DATOS_MATRIZ_VACIOS);
  const [formKey, setFormKey] = useState(0);
  const [mensajeReporte, setMensajeReporte] = useState('');
  const [estadoGuardado, setEstadoGuardado] = useState('idle');
  const [mensajeGuardado, setMensajeGuardado] = useState('');
  const [matrizId, setMatrizId] = useState(id || null);
  const [tipoReporte, setTipoReporte] = useState('inicial');
  const [cargando, setCargando] = useState(!!id);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const cargandoDesdeServidorRef = useRef(false);
  const datosMatrizRef = useRef(DATOS_MATRIZ_VACIOS);
  const gestionRiesgosRef = useRef(null);

  useEffect(() => {
    datosMatrizRef.current = datosMatriz;
  }, [datosMatriz]);

  const recordIdMatriz = id || matrizId || null;
  const autoguardadoActivo = Boolean(recordIdMatriz);

  const onAutoSaveServidor = useCallback(
    async (data) => {
      const matrizIdActual = id || matrizId;
      if (!matrizIdActual) return;

      const nombreEmpresa = data.informacion?.nombreEmpresa || t('riskMatrix.companyUntitled');
      const titulo = t('riskMatrix.matrixTitle', { company: nombreEmpresa });
      const datosCompletos = {
        informacion: data.informacion || {},
        identificacion: data.identificacion || {},
        valoracion: data.valoracion || {},
        mapaCalor: data.mapaCalor || {},
        gestionRiesgos: normalizarGestionRiesgos(data.gestionRiesgos || {}),
      };

      await MatrizRiesgoService.actualizarMatrizRiesgo(
        matrizIdActual,
        datosCompletos,
        titulo,
        'en_proceso'
      );
    },
    [id, matrizId, t]
  );

  const {
    isAutoSaveEnabled,
    lastSaveTime,
    saveStatus,
    enableAutoSave,
    disableAutoSave,
    clearSavedData,
    saveNow,
    syncNow,
    pendingServerSync,
    isOnline,
    isExistingRecord,
    savedDataToRestore,
    showRestoreDialog,
    handleRestoreData,
    handleDiscardSavedData,
    handleCancelRestore,
  } = useFormAutoSave({
    formKeyBase: 'matriz-riesgo',
    recordId: recordIdMatriz,
    formData: datosMatriz,
    enabled: autoguardadoActivo,
    serverReady: autoguardadoActivo,
    skipRestoreOnMount: true,
    onServerUpdate: onAutoSaveServidor,
    shouldSkipSaveRef: cargandoDesdeServidorRef,
  });

  const handleRestoreBorrador = useCallback(() => {
    handleRestoreData(setDatosMatriz, datosMatriz);
    setFormKey((k) => k + 1);
  }, [handleRestoreData, datosMatriz]);

  useEffect(() => {
    setMatrizId(id || null);
  }, [id]);

  useEffect(() => {
    const cargarMatrizExistente = async () => {
      if (id) {
        try {
          setCargando(true);
          cargandoDesdeServidorRef.current = true;
          const resultado = await MatrizRiesgoService.obtenerMatrizRiesgo(id);
          if (resultado.success && resultado.data) {
            const matriz = resultado.data;
            setMatrizId(matriz._id);
            setDatosMatriz(matriz.datosMatriz || DATOS_MATRIZ_VACIOS);
            gestionRiesgosRef.current = normalizarGestionRiesgos(
              matriz.datosMatriz?.gestionRiesgos || {}
            );
            setTipoReporte(matriz.tipo === 'matriz_riesgo_anual' ? 'anual' : 'inicial');
            setFormKey((k) => k + 1);
          }
        } catch (error) {
          console.error('Error cargando matriz:', error);
          alert(t('riskMatrix.loadMatrixError', { error: error.message }));
          navigate('/matrices-riesgo');
        } finally {
          cargandoDesdeServidorRef.current = false;
          setCargando(false);
        }
        return;
      }

      setMatrizId(null);
      gestionRiesgosRef.current = null;
      setDatosMatriz(DATOS_MATRIZ_VACIOS);
      setTipoReporte('inicial');
      setFormKey((k) => k + 1);

      if (location.state?.nuevaMatriz) {
        navigate(location.pathname, { replace: true, state: {} });
      }
    };

    cargarMatrizExistente();
  }, [id, navigate, location.pathname, location.state?.nuevaMatriz, t]);

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

  const onInformacionChange = useCallback(
    (datos) => handleDatosChange('informacion', datos),
    [handleDatosChange]
  );
  const onIdentificacionChange = useCallback(
    (datos) => handleDatosChange('identificacion', datos),
    [handleDatosChange]
  );
  const onValoracionChange = useCallback(
    (datos) => handleDatosChange('valoracion', datos),
    [handleDatosChange]
  );
  const onMapaCalorChange = useCallback(
    (datos) => handleDatosChange('mapaCalor', datos),
    [handleDatosChange]
  );
  const onGestionRiesgosChange = useCallback(
    (datos) => {
      gestionRiesgosRef.current = datos;
      handleDatosChange('gestionRiesgos', datos);
    },
    [handleDatosChange]
  );

  const handleGuardarMatriz = async () => {
    try {
      setEstadoGuardado('guardando');
      setMensajeGuardado(t('riskMatrix.saving'));

      const snapshot = datosMatrizRef.current;
      const nombreEmpresa = snapshot.informacion?.nombreEmpresa || t('riskMatrix.companyUntitled');
      const titulo = t('riskMatrix.matrixTitle', { company: nombreEmpresa });

      const datosCompletos = {
        informacion: snapshot.informacion || {},
        identificacion: snapshot.identificacion || {},
        valoracion: snapshot.valoracion || {},
        mapaCalor: snapshot.mapaCalor || {},
        gestionRiesgos: normalizarGestionRiesgos(
          gestionRiesgosRef.current ?? snapshot.gestionRiesgos ?? {}
        ),
      };

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
          await MatrizRiesgoService.actualizarMatrizRiesgo(
            idParaGuardar,
            datosCompletos,
            titulo,
            'en_proceso'
          );
          setMensajeGuardado(t('riskMatrix.updated'));
        } catch (updateError) {
          const esNoEncontrada =
            updateError.message?.includes('no encontrada') ||
            updateError.message?.includes('404');
          if (esNoEncontrada) {
            setMatrizId(null);
            await crearNueva();
            setMensajeGuardado(t('riskMatrix.savedAsNew'));
          } else {
            throw updateError;
          }
        }
      } else {
        await crearNueva();
        setMensajeGuardado(t('riskMatrix.saved'));
      }

      setEstadoGuardado('guardado');
      clearSavedData();
      setTimeout(() => {
        setMensajeGuardado('');
        setEstadoGuardado('idle');
      }, 3000);
    } catch (error) {
      console.error('Error guardando matriz:', error);
      setEstadoGuardado('error');
      setMensajeGuardado(t('riskMatrix.saveError', { error: error.message }));
      setTimeout(() => {
        setMensajeGuardado('');
        setEstadoGuardado('idle');
      }, 5000);
    }
  };

  const handleVerInformeGeneral = () => {
    try {
      setMensajeReporte(t('riskMatrix.openingReport'));
      guardarDatosReporteMatriz({
        datosMatriz: datosMatrizRef.current,
        tipoReporte,
        matrizId: recordIdMatriz,
      });
      const url = urlReporteMatriz();
      const ventana = window.open(url, '_blank', 'width=1440,height=900,scrollbars=yes,resizable=yes');
      if (!ventana) {
        setMensajeReporte(t('riskMatrix.allowPopups'));
      } else {
        setMensajeReporte(
          t('riskMatrix.reportOpened')
        );
      }
      setTimeout(() => setMensajeReporte(''), 6000);
    } catch (error) {
      console.error('Error abriendo informe general:', error);
      setMensajeReporte(t('riskMatrix.reportOpenError'));
      setTimeout(() => setMensajeReporte(''), 5000);
    }
  };

  const handleExportarReporteHTML = async () => {
    try {
      setExportandoPdf(true);
      setMensajeReporte(t('riskMatrix.generatingHtml'));
      const resultado = await ReporteService.exportarReporteHTML(
        datosMatriz,
        'reporte_matriz_riesgos',
        tipoReporte
      );
      if (resultado.success) {
        setMensajeReporte(
          resultado.mensaje ||
            t('riskMatrix.htmlDownloaded')
        );
      } else {
        setMensajeReporte(t('riskMatrix.exportError', { error: resultado.error }));
      }
      setTimeout(() => setMensajeReporte(''), 8000);
    } catch (error) {
      console.error('Error exportando reporte HTML:', error);
      setMensajeReporte(t('riskMatrix.unexpectedExportError'));
      setTimeout(() => setMensajeReporte(''), 5000);
    } finally {
      setExportandoPdf(false);
    }
  };

  const secciones = [
    {
      id: 'informacion',
      componente: (
        <InformacionMatriz
          key={`informacion-${formKey}`}
          datos={datosMatriz.informacion}
          onDatosChange={onInformacionChange}
        />
      ),
    },
    {
      id: 'identificacion',
      componente: (
        <IdentificacionRiesgos
          key={`identificacion-${formKey}`}
          datos={datosMatriz.identificacion}
          onDatosChange={onIdentificacionChange}
        />
      ),
    },
    {
      id: 'valoracion',
      componente: (
        <ValoracionRiesgos
          key={`valoracion-${formKey}`}
          datos={datosMatriz.valoracion}
          onDatosChange={onValoracionChange}
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
          key={`mapa-calor-${formKey}`}
          datos={datosMatriz}
          onDatosChange={onMapaCalorChange}
          tipoReporte={tipoReporte}
        />
      ),
    },
    {
      id: 'gestion-riesgos',
      componente: (
        <GestionRiesgos
          key={`gestion-riesgos-${formKey}`}
          datos={datosMatriz.gestionRiesgos}
          onDatosChange={onGestionRiesgosChange}
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
          {t('riskMatrix.loading')}
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
              {t('riskMatrix.sections')}
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
                  title={t(seccion.descriptionKey)}
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
                      {t(seccion.titleKey)}
                    </span>
                    <span className="mt-0.5 block font-body text-xs leading-snug text-gray-500 dark:text-gray-400">
                      {t(seccion.descriptionKey)}
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
              {t('riskMatrix.brandTitle')}
            </button>

            {navActual && (
              <p className="mb-3 font-body text-sm text-gray-500 dark:text-gray-400">
                {t(navActual.descriptionKey)}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="tipo-reporte"
                  className="font-body text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  {t('riskMatrix.reportType')}
                </label>
                <select
                  id="tipo-reporte"
                  value={tipoReporte}
                  onChange={(e) => setTipoReporte(e.target.value)}
                  className={inputSelectClass}
                  title={t('riskMatrix.selectReportType')}
                >
                  <option value="inicial">{t('riskMatrix.initialAssessment')}</option>
                  <option value="anual">{t('riskMatrix.annualAssessment')}</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <FormAutoSaveControls
                  placement="inline"
                  enabled={autoguardadoActivo}
                  isExistingRecord={isExistingRecord}
                  isAutoSaveEnabled={isAutoSaveEnabled}
                  lastSaveTime={lastSaveTime}
                  saveStatus={saveStatus}
                  enableAutoSave={enableAutoSave}
                  disableAutoSave={disableAutoSave}
                  saveNow={saveNow}
                  syncNow={syncNow}
                  pendingServerSync={pendingServerSync}
                  isOnline={isOnline}
                  showRestoreDialog={showRestoreDialog}
                  savedDataToRestore={savedDataToRestore}
                  onRestore={handleRestoreBorrador}
                  onDiscard={handleDiscardSavedData}
                  onCancelRestore={handleCancelRestore}
                />
                <button
                  type="button"
                  className="btn-fenix-primary min-w-[7.5rem] disabled:opacity-60"
                  onClick={handleGuardarMatriz}
                  disabled={estadoGuardado === 'guardando'}
                  title={t('riskMatrix.saveTitle')}
                >
                  {estadoGuardado === 'guardando' ? t('riskMatrix.saving') : t('common.save')}
                </button>
                <button
                  type="button"
                  className="btn-fenix-primary inline-flex min-w-[11rem] items-center justify-center gap-2"
                  onClick={handleVerInformeGeneral}
                  title={t('riskMatrix.viewReportTitle')}
                >
                  <FaFileAlt />
                  {t('riskMatrix.viewReport')}
                </button>
                <button
                  type="button"
                  className="btn-fenix-secondary min-w-[9rem] disabled:opacity-60"
                  onClick={handleExportarReporteHTML}
                  disabled={exportandoPdf}
                  title={t('riskMatrix.downloadHtmlTitle')}
                >
                  {exportandoPdf ? t('riskMatrix.generating') : t('riskMatrix.downloadHtml')}
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

            {!autoguardadoActivo && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-body text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                {t('riskMatrix.autoSaveHint', { save: t('common.save') })}
              </p>
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
