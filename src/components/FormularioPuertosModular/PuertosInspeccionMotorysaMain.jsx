import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import Logo from '../../img/Logo.png';
import { generarWordMotorysa, META_FORMATO_MOTORYSA } from './generarWordMotorysa';
import { generarPdfMotorysa } from './generarPdfMotorysa';
import {
  crearPuertosCaso,
  actualizarPuertosCaso,
  getPuertosCaso,
} from '../../services/puertosService.js';
import {
  procesarInspeccionPuertosImagenes,
  hayImagenesPendientesInspeccion,
} from '../../services/puertosCasoImagenService.js';
import {
  formDataToCasoInspeccionMotorysa,
  casoToFormDataInspeccionMotorysa,
  casoToFormDataInspeccionMotorysaConMeta,
  sanitizarFormDataMotorysaParaGuardado,
} from '../PuertosActas/puertosInspeccionMotorysaMapper.js';
import {
  validarLimiteFotosInspeccion,
  MAX_FOTOS_SECCION_INSPECCION_ASEGURADO,
  recortarFotosInspeccionAlLimite,
} from '../PuertosActas/puertosFotosLimites.js';
import { esCasoInspeccionMotorysa } from '../PuertosActas/puertosTipoRegistro.js';
import DocumentLanguageSelector from '../DocumentLanguageSelector.jsx';
import SeccionInicialPuertos from './SeccionInicialPuertos';
import SeccionMotorysaPuertos from './SeccionMotorysaPuertos';
import InformeFotograficoMotorysa from './InformeFotograficoMotorysa';
import ConclusionesMotorysa from './ConclusionesMotorysa';
import RecomendacionesPuertos from './RecomendacionesPuertos';
import FirmaPuertos from './FirmaPuertos';
import { useFormAutoSave } from '../../hooks/useFormAutoSave';
import FormAutoSaveControls from '../AutoSave/FormAutoSaveControls';
import { EMPRESA_BOLIVAR, ASEGURADOS } from './plantillasPuertos';

const esIdPersistido = (valor) => Boolean(valor && !['nuevo', 'nueva'].includes(valor));

const fechaHoyLocal = () => {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, '0');
  const day = String(ahora.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function PuertosInspeccionMotorysaMain() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();

  const bgMain = theme === 'dark' ? '#1A1A1A' : '#F5F5F7';
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  const [cargando, setCargando] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [generandoWord, setGenerandoWord] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [formularioId, setFormularioId] = useState(esIdPersistido(id) ? id : null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [savedDataToRestore, setSavedDataToRestore] = useState(null);
  const [guardandoActas, setGuardandoActas] = useState(false);
  const [progresoSubida, setProgresoSubida] = useState(null);
  const [documentLocale, setDocumentLocale] = useState('es');

  const [formData, setFormData] = useState({
    contactoBolivarId: '',
    codigoReferencia: '',
    nombreContacto: '',
    cargoContacto: '',
    gerenciaContacto: '',
    emailContacto: '',
    ciudadContacto: '',
    fechasInspeccion: '',
    nombreMotonave: '',
    fechaArriboMotonave: '',
    numeroVehiculos: '',
    cantidadVehiculos: '',
    puertoDescargue: '',
    municipio: 'Buenaventura',
    fecha: fechaHoyLocal(),
    billOfLading: '',
    listaBLs: '',
    origenImportacion: '',
    comentarioPatioAlmacenamiento: '',
    recomendaciones: [],
    nombreFirmante: '',
    cargoFirmante: '',
    emailFirmante: '',
    celularFirmante: '',
    imagenFirma: null,
    archivoFirma: null,
    plantillaInforme: 'motorysa',
    codigoInforme: META_FORMATO_MOTORYSA.codigo,
    versionInforme: META_FORMATO_MOTORYSA.version,
    fechaFormatoInforme: META_FORMATO_MOTORYSA.fecha,
    clienteSeleccionado: 'MOTORYSA_BOLIVAR',
    empresaCliente: EMPRESA_BOLIVAR,
    nombreCliente: ASEGURADOS.MOTORYSA.nombreCliente,
    asegurado: ASEGURADOS.MOTORYSA.asegurado,
    patioOperacion: '',
    marcaDespacho: '',
    marcaVehiculo: '',
    modelosVehiculos: '',
    fechasDescargue: '',
    inspectores: '',
    textoLocalizacion: '',
    textoEstadoVehiculos: '',
    conclusiones: '',
    imagenesAspectoAlmacenamiento: [],
    imagenesAspectoModelo: [],
    imagenesRegistro: [],
    registrosPorVin: [],
  });

  const handleInputChange = (campo, valor) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleMultipleInputChange = (campos) => {
    setFormData((prev) => ({ ...prev, ...campos }));
  };

  const rutaEdicionActas = (casoId) => `/puertos/actas/inspeccion-motorysa/editar/${casoId}`;

  const persistirEnActas = useCallback(
    async (data, { marcarCompletado = false, silencioso = false } = {}) => {
      const idActual = esIdPersistido(formularioId) ? formularioId : null;
      const casoId = idActual || data._id || 'borrador';

      let formProcesado;
      const { datos: dataLimite } = recortarFotosInspeccionAlLimite(data);
      try {
        if (hayImagenesPendientesInspeccion(dataLimite)) {
          validarLimiteFotosInspeccion(dataLimite);
          setProgresoSubida({ lote: 0, totalLotes: 1, subidas: 0, total: 0 });
          formProcesado = await procesarInspeccionPuertosImagenes(
            dataLimite,
            casoId,
            setProgresoSubida
          );
        } else {
          formProcesado = sanitizarFormDataMotorysaParaGuardado(dataLimite);
        }
      } catch (uploadError) {
        console.error('❌ Error subiendo fotos Motorysa:', uploadError);
        throw uploadError;
      } finally {
        setProgresoSubida(null);
      }

      const payload = formDataToCasoInspeccionMotorysa({
        ...formProcesado,
        codiEstdo: marcarCompletado ? 'terminado' : data.codiEstdo || 'en_curso',
        descripcionEstado: marcarCompletado ? 'Terminado' : data.descripcionEstado || 'En curso',
      });

      const resultado = idActual
        ? await actualizarPuertosCaso(idActual, payload)
        : await crearPuertosCaso(payload);

      const nuevoId = resultado._id;
      setFormularioId(nuevoId);
      setModoEdicion(true);

      const datosServidor = casoToFormDataInspeccionMotorysa(resultado);
      if (silencioso) {
        // No pisar lo que el usuario escribe mientras corre el autoguardado
        setFormData((prev) => ({
          ...prev,
          _id: datosServidor._id || prev._id,
          consecutivo: datosServidor.consecutivo || prev.consecutivo,
          codigoReferencia: prev.codigoReferencia || datosServidor.codigoReferencia,
          imagenFirma: datosServidor.imagenFirma || prev.imagenFirma,
          imagenesAspectoAlmacenamiento:
            datosServidor.imagenesAspectoAlmacenamiento?.length
              ? datosServidor.imagenesAspectoAlmacenamiento
              : prev.imagenesAspectoAlmacenamiento,
          imagenesAspectoModelo:
            datosServidor.imagenesAspectoModelo?.length
              ? datosServidor.imagenesAspectoModelo
              : prev.imagenesAspectoModelo,
          codiEstdo: datosServidor.codiEstdo || prev.codiEstdo,
          descripcionEstado: datosServidor.descripcionEstado || prev.descripcionEstado,
        }));
      } else {
        setFormData(datosServidor);
      }

      if (!idActual) {
        window.setTimeout(() => navigate(rutaEdicionActas(nuevoId), { replace: true }), 0);
      }

      if (!silencioso) {
        alert(
          t('ports.ui.inspeccion.alerts.guardadoActas', {
            consecutivo: resultado.consecutivo ? `: ${resultado.consecutivo}` : '',
          })
        );
      }

      return resultado;
    },
    [formularioId, navigate, t]
  );

  const onAutoSaveServidor = useCallback(
    async (data) => {
      if (!esIdPersistido(formularioId)) return;
      if (hayImagenesPendientesInspeccion(data)) return;
      await persistirEnActas(data, { silencioso: true });
    },
    [formularioId, persistirEnActas]
  );

  const {
    isAutoSaveEnabled,
    lastSaveTime,
    saveStatus,
    enableAutoSave,
    disableAutoSave,
    saveNow,
    syncNow,
    pendingServerSync,
    isOnline,
    isExistingRecord,
    clearSavedData,
  } = useFormAutoSave({
    formKeyBase: 'formulario-puertos-inspeccion-motorysa',
    recordId: esIdPersistido(formularioId) ? formularioId : null,
    formData,
    onServerUpdate: onAutoSaveServidor,
    serverReady:
      esIdPersistido(formularioId) &&
      !cargando &&
      !guardandoActas &&
      !generandoWord &&
      !hayImagenesPendientesInspeccion(formData),
    canSaveServer: () =>
      !cargando &&
      !guardandoActas &&
      !generandoWord &&
      !hayImagenesPendientesInspeccion(formData),
    onRestore: (savedInfo) => {
      setSavedDataToRestore(savedInfo);
      setShowRestoreDialog(true);
    },
  });

  const handleRestoreData = useCallback(() => {
    if (!savedDataToRestore?.data) return;
    setFormData((prev) => ({ ...prev, ...savedDataToRestore.data }));
    setShowRestoreDialog(false);
    enableAutoSave();
  }, [savedDataToRestore, enableAutoSave]);

  const handleDiscardSavedData = useCallback(() => {
    clearSavedData();
    setShowRestoreDialog(false);
    setSavedDataToRestore(null);
  }, [clearSavedData]);

  const handleCancelRestore = useCallback(() => {
    setShowRestoreDialog(false);
  }, []);

  const cargarDesdeActas = async (casoId) => {
    try {
      setCargando(true);
      const caso = await getPuertosCaso(casoId);
      if (!esCasoInspeccionMotorysa(caso)) {
        alert(t('ports.ui.inspeccion.alerts.noEsMotorysa'));
        navigate('/puertos/actas');
        return;
      }
      const { datos, huboRecorte } = casoToFormDataInspeccionMotorysaConMeta(caso);
      setFormData((prev) => ({ ...prev, ...datos }));
      if (huboRecorte) {
        alert(
          t('ports.ui.inspeccion.alerts.fotosRecortadas', {
            max: MAX_FOTOS_SECCION_INSPECCION_ASEGURADO,
          })
        );
      }
      setFormularioId(casoId);
      setModoEdicion(true);
    } catch (error) {
      console.error('❌ Error al cargar caso Motorysa:', error);
      alert(t('ports.ui.inspeccion.alerts.cargarInformeError', { error: error.message }));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (esIdPersistido(id)) {
      cargarDesdeActas(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const guardarEnActas = async (options = {}) => {
    setGuardandoActas(true);
    setCargando(true);
    try {
      return await persistirEnActas(formData, options);
    } catch (error) {
      console.error('❌ Error al guardar Motorysa:', error);
      alert(t('ports.ui.inspeccion.alerts.guardarError', { error: error.message }));
      throw error;
    } finally {
      setProgresoSubida(null);
      setGuardandoActas(false);
      setCargando(false);
    }
  };

  const obtenerDataInforme = async () => {
    const resultado = await persistirEnActas(formData, { silencioso: true });
    return {
      ...formData,
      ...casoToFormDataInspeccionMotorysa(resultado),
    };
  };

  const handleGenerarWord = async () => {
    try {
      setGenerandoWord(true);
      const dataInforme = await obtenerDataInforme();
      await generarWordMotorysa(dataInforme, { locale: documentLocale });
      alert(
        t('ports.ui.inspeccion.alerts.informeMotorysaGenerado', {
          codigo: dataInforme.codigoInforme || META_FORMATO_MOTORYSA.codigo,
        })
      );
    } catch (error) {
      console.error('❌ Error al generar Word Motorysa:', error);
      alert(
        t('ports.ui.inspeccion.alerts.generarDocumentoError', {
          error: error.message || t('ports.ui.inspeccion.alerts.intenteNuevamente'),
        })
      );
    } finally {
      setGenerandoWord(false);
    }
  };

  const handleGenerarPdf = async () => {
    try {
      setGenerandoPdf(true);
      const dataInforme = await obtenerDataInforme();
      await generarPdfMotorysa(dataInforme, { locale: documentLocale });
      alert(
        t('ports.ui.inspeccion.alerts.informeMotorysaPdfGenerado', {
          codigo: dataInforme.codigoInforme || META_FORMATO_MOTORYSA.codigo,
        })
      );
    } catch (error) {
      console.error('❌ Error al generar PDF Motorysa:', error);
      alert(
        t('ports.ui.inspeccion.alerts.generarDocumentoError', {
          error: error.message || t('ports.ui.inspeccion.alerts.intenteNuevamente'),
        })
      );
    } finally {
      setGenerandoPdf(false);
    }
  };

  const handleExportarYGuardar = async () => {
    try {
      setGenerandoWord(true);
      setCargando(true);
      const resultado = await guardarEnActas({ marcarCompletado: true });
      const dataWord = {
        ...formData,
        ...casoToFormDataInspeccionMotorysa(resultado),
      };
      await generarWordMotorysa(dataWord, { locale: documentLocale });
      await generarPdfMotorysa(dataWord, { locale: documentLocale });
    } catch (error) {
      console.error('Error exportar Motorysa:', error);
      alert(t('ports.ui.inspeccion.alerts.procesoError', { error: error.message }));
    } finally {
      setGenerandoWord(false);
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: bgMain }}>
      <div
        className="max-w-5xl mx-auto rounded-lg p-4 sm:p-6"
        style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <img src={Logo} alt="Logo PROSER" className="h-12 sm:h-16 object-contain" />
            <FormAutoSaveControls
              placement="inline"
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
              onRestore={handleRestoreData}
              onDiscard={handleDiscardSavedData}
              onCancelRestore={handleCancelRestore}
            />
            {modoEdicion && (
              <div
                className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
                  color: theme === 'dark' ? '#93C5FD' : '#1E40AF',
                }}
              >
                ✏️ {t('ports.ui.inspeccion.editMode')}
              </div>
            )}
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <p className="text-xs sm:text-sm font-semibold mb-1" style={{ color: textPrimary }}>
              {t('ports.ui.inspeccion.date')}
            </p>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => handleInputChange('fecha', e.target.value)}
              className="text-xs sm:text-sm rounded px-2 py-1 w-full sm:w-auto"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`,
              }}
              disabled={cargando}
            />
          </div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: textPrimary }}>
            {t('ports.ui.inspeccion.titleMotorysa')}
          </h1>
          <p className="text-sm" style={{ color: textSecondary }}>
            {t('ports.ui.inspeccion.subtitleMotorysa')}
          </p>
        </div>

        <SeccionInicialPuertos
          formData={formData}
          onInputChange={handleInputChange}
          onMultipleChange={handleMultipleInputChange}
          cargando={cargando}
          forzarCapturaMapa={0}
          ocultarGeolocalizacion
          clientesPermitidos={['MOTORYSA_BOLIVAR', 'AUTOCOM_BOLIVAR']}
          clientePorDefecto="MOTORYSA_BOLIVAR"
          codigoReferenciaLibre
        />

        <SeccionMotorysaPuertos
          formData={formData}
          onInputChange={handleInputChange}
          cargando={cargando}
        />

        <InformeFotograficoMotorysa
          formData={formData}
          onInputChange={handleInputChange}
          cargando={cargando}
        />

        <RecomendacionesPuertos
          formData={formData}
          onInputChange={handleInputChange}
          cargando={cargando}
          tituloSeccion={t('ports.ui.formulario.recomendaciones.tituloMotorysa')}
        />

        <ConclusionesMotorysa
          formData={formData}
          onInputChange={handleInputChange}
          cargando={cargando}
        />

        <FirmaPuertos
          formData={formData}
          onInputChange={handleInputChange}
          onMultipleChange={handleMultipleInputChange}
          cargando={cargando}
        />

        <div
          className="mt-8"
          style={{
            borderTop: `1px solid ${borderColor}`,
            paddingTop: '2rem',
          }}
        >
          <div className="mb-4 flex justify-center">
            <DocumentLanguageSelector
              value={documentLocale}
              onChange={setDocumentLocale}
              id="puertos-motorysa-document-language"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <button
              type="button"
              onClick={() => guardarEnActas()}
              className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: theme === 'dark' ? '#2563EB' : '#3B82F6', color: '#FFFFFF' }}
              disabled={guardandoActas || cargando}
            >
              {guardandoActas || cargando
                ? progresoSubida
                  ? `⏳ ${t('ports.ui.inspeccion.uploadingPhotos')}`
                  : `⏳ ${t('ports.ui.common.saving')}`
                : t('ports.ui.inspeccion.saveActas')}
            </button>
            <button
              type="button"
              onClick={handleGenerarWord}
              className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: theme === 'dark' ? '#059669' : '#10B981', color: '#FFFFFF' }}
              disabled={generandoWord || cargando}
            >
              {generandoWord
                ? `⏳ ${t('ports.ui.common.generatingWord')}`
                : t('ports.ui.common.word')}
            </button>
            <button
              type="button"
              onClick={handleGenerarPdf}
              className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: theme === 'dark' ? '#DC2626' : '#EF4444', color: '#FFFFFF' }}
              disabled={generandoPdf || cargando}
            >
              {generandoPdf
                ? `⏳ ${t('ports.ui.common.generatingPdf')}`
                : t('ports.ui.common.pdf')}
            </button>
            <button
              type="button"
              onClick={handleExportarYGuardar}
              className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: theme === 'dark' ? '#7C3AED' : '#8B5CF6', color: '#FFFFFF' }}
              disabled={generandoWord || cargando}
            >
              {t('ports.ui.inspeccion.exportAndSave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
