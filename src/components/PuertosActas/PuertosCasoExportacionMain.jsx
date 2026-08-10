import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { FaSave, FaFilePdf, FaFileWord, FaArrowLeft, FaEdit } from 'react-icons/fa';
import { BASE_URL } from '../../config/apiConfig.js';
import {
  getPuertosCaso,
  crearPuertosCaso,
  actualizarPuertosCaso,
} from '../../services/puertosService.js';
import {
  ESTADO_INICIAL_CASO_EXPORTACION,
  aplicarEstadoInformeExportacion,
} from './puertosCasoExportacionState';
import { normalizarCasoApiParaFormulario, normalizarInformeExportacion } from './puertosCasoExportacionNormalize';
import { procesarInformeExportacionImagenes } from '../../services/puertosCasoImagenService.js';
import { generarPdfInformeExportacion } from '../../services/puertosCasoExportacionPdfService.js';
import { generarWordInformeExportacion } from '../../services/puertosCasoExportacionWordService.js';
import {
  puertosBtnLink,
  puertosBtnPrimary,
  puertosBtnSecondary,
  puertosFormRoot,
  puertosPageSubtitle,
  puertosPageTitle,
  puertosPageWrap,
  puertosStickyBar,
} from './puertosFenixUi';
import PuertosCasoSeccionDesplegable from './PuertosCasoSeccionDesplegable';
import PuertosCasoPagina1 from './PuertosCasoPagina1';
import PuertosCasoPagina2 from './PuertosCasoPagina2';
import PuertosCasoPagina3 from './PuertosCasoPagina3';
import PuertosCasoPagina4 from './PuertosCasoPagina4';
import PuertosCasoPagina5 from './PuertosCasoPagina5';
import { useFormAutoSave } from '../../hooks/useFormAutoSave';
import FormAutoSaveControls from '../AutoSave/FormAutoSaveControls';

const ABIERTAS_INICIAL = {
  portada: true,
  datosIntro: false,
  buqueMercancia: false,
  supervision: false,
  conclusiones: false,
};

export default function PuertosCasoExportacionMain() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const esEdicion = Boolean(id && id !== 'nueva');
  const soloLectura =
    location.pathname.includes('/caso/ver/') || searchParams.get('modo') === 'ver';

  const SECCIONES = useMemo(
    () => [
      {
        id: 'portada',
        numero: 1,
        titulo: t('ports.ui.casoExportacion.sections.portada.title'),
        subtitulo: t('ports.ui.casoExportacion.sections.portada.subtitle'),
      },
      {
        id: 'datosIntro',
        numero: 2,
        titulo: t('ports.ui.casoExportacion.sections.datosIntro.title'),
        subtitulo: t('ports.ui.casoExportacion.sections.datosIntro.subtitle'),
      },
      {
        id: 'buqueMercancia',
        numero: 3,
        titulo: t('ports.ui.casoExportacion.sections.buqueMercancia.title'),
        subtitulo: t('ports.ui.casoExportacion.sections.buqueMercancia.subtitle'),
      },
      {
        id: 'supervision',
        numero: 4,
        titulo: t('ports.ui.casoExportacion.sections.supervision.title'),
        subtitulo: t('ports.ui.casoExportacion.sections.supervision.subtitle'),
      },
      {
        id: 'conclusiones',
        numero: 5,
        titulo: t('ports.ui.casoExportacion.sections.conclusiones.title'),
        subtitulo: t('ports.ui.casoExportacion.sections.conclusiones.subtitle'),
      },
    ],
    [t]
  );

  const [abiertas, setAbiertas] = useState(ABIERTAS_INICIAL);
  const [formData, setFormData] = useState(ESTADO_INICIAL_CASO_EXPORTACION);
  const [cargando, setCargando] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [generandoWord, setGenerandoWord] = useState(false);
  const [aseguradoraOptions, setAseguradoraOptions] = useState([]);
  const [responsables, setResponsables] = useState([]);

  const toggleSeccion = useCallback((seccionId) => {
    setAbiertas((prev) => ({ ...prev, [seccionId]: !prev[seccionId] }));
  }, []);

  const abrirSeccion = useCallback((seccionId) => {
    setAbiertas((prev) => ({ ...prev, [seccionId]: true }));
    requestAnimationFrame(() => {
      document.getElementById(`seccion-${seccionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const onChange = useCallback(
    (campo, valor) => {
      if (soloLectura) return;
      setFormData((prev) => ({ ...prev, [campo]: valor }));
    },
    [soloLectura]
  );

  const onInformeChange = useCallback(
    (campo, valor) => {
      if (soloLectura) return;
      setFormData((prev) => ({
        ...prev,
        informeExportacion: {
          ...prev.informeExportacion,
          [campo]:
            typeof valor === 'function' ? valor(prev.informeExportacion[campo]) : valor,
        },
      }));
    },
    [soloLectura]
  );

  const onNestedInformeChange = useCallback(
    (subObj, valor) => {
      if (soloLectura) return;
      setFormData((prev) => ({
        ...prev,
        informeExportacion: { ...prev.informeExportacion, [subObj]: valor },
      }));
    },
    [soloLectura]
  );

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

  useEffect(() => {
    if (!esEdicion) {
      const hoy = new Date().toISOString().split('T')[0];
      setFormData((prev) => ({
        ...prev,
        fechaInforme: prev.fechaInforme || hoy,
      }));
      return;
    }
    setCargando(true);
    getPuertosCaso(id)
      .then((caso) => setFormData(normalizarCasoApiParaFormulario(caso)))
      .catch((err) => {
        alert(t('ports.ui.casoExportacion.alerts.loadError', { error: err.message }));
        navigate('/puertos/actas');
      })
      .finally(() => setCargando(false));
  }, [id, esEdicion, navigate, t]);

  useEffect(() => {
    if (searchParams.get('fotos') === '1') {
      setAbiertas({
        portada: false,
        datosIntro: false,
        buqueMercancia: true,
        supervision: true,
        conclusiones: searchParams.get('seccion') === 'conclusiones',
      });
      requestAnimationFrame(() => {
        document
          .getElementById('seccion-buqueMercancia')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [searchParams]);

  const recordIdCaso = esEdicion ? (id || formData._id) : null;

  const onAutoSaveServidor = useCallback(
    async (data) => {
      if (soloLectura) return;
      const casoId = id || data._id;
      if (!casoId) return;
      const informeExportacion = await procesarInformeExportacionImagenes(
        data.informeExportacion,
        casoId
      );
      const payload = aplicarEstadoInformeExportacion({
        ...data,
        informeExportacion,
        actualizadoPor: localStorage.getItem('login') || undefined,
      });
      await actualizarPuertosCaso(casoId, payload);
    },
    [id, soloLectura]
  );

  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [savedDataToRestore, setSavedDataToRestore] = useState(null);

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
    formKeyBase: 'puertos-caso-exportacion',
    recordId: recordIdCaso,
    formData,
    onServerUpdate: onAutoSaveServidor,
    serverReady: esEdicion && !cargando && !soloLectura,
    canSaveServer: () => !guardando && !generandoPdf && !generandoWord && !soloLectura,
    onRestore: (savedInfo) => {
      if (soloLectura) return;
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

  const handleGuardar = async () => {
    if (soloLectura) return;
    if (!formData.codiAsgrdra?.trim()) {
      alert(t('ports.ui.casoExportacion.alerts.selectClient'));
      abrirSeccion('portada');
      return;
    }
    if (!formData.asgrBenfcro?.trim()) {
      alert(t('ports.ui.casoExportacion.alerts.exporterRequired'));
      abrirSeccion('datosIntro');
      return;
    }

    setGuardando(true);
    try {
      const casoId = id || formData._id || formData.consecutivo || 'borrador';
      const informeExportacion = await procesarInformeExportacionImagenes(
        formData.informeExportacion,
        casoId
      );

      const payload = aplicarEstadoInformeExportacion({
        ...formData,
        informeExportacion,
        creadoPor: formData.creadoPor || localStorage.getItem('login') || undefined,
        actualizadoPor: localStorage.getItem('login') || undefined,
      });
      const nombreAseg = aseguradoraOptions.find((a) => a.value === formData.codiAsgrdra)?.label;
      if (nombreAseg) payload.nombreAseguradora = nombreAseg;
      const nombreResp = responsables.find((r) => r.value === formData.codiRespnsble)?.label;
      if (nombreResp) payload.nombreResponsable = nombreResp;

      const resultado = esEdicion
        ? await actualizarPuertosCaso(id, payload)
        : await crearPuertosCaso(payload);

      alert(t('ports.ui.casoExportacion.alerts.saved', { id: resultado.consecutivo || resultado._id }));
      if (!esEdicion && resultado._id) {
        navigate(`/puertos/actas/caso/editar/${resultado._id}`, { replace: true });
      } else if (resultado.consecutivo) {
        setFormData((prev) => ({
          ...prev,
          consecutivo: resultado.consecutivo,
          informeExportacion: normalizarInformeExportacion(resultado.informeExportacion || prev.informeExportacion),
          descripcionEstado: resultado.descripcionEstado || prev.descripcionEstado,
          codiEstdo: resultado.codiEstdo || prev.codiEstdo,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          informeExportacion: normalizarInformeExportacion(resultado.informeExportacion || prev.informeExportacion),
          descripcionEstado: resultado.descripcionEstado || prev.descripcionEstado,
          codiEstdo: resultado.codiEstdo || prev.codiEstdo,
        }));
      }
    } catch (err) {
      alert(t('ports.ui.casoExportacion.alerts.saveError', { error: err.message }));
    } finally {
      setGuardando(false);
    }
  };

  const expandirTodas = () => {
    setAbiertas(Object.fromEntries(SECCIONES.map((s) => [s.id, true])));
  };

  const colapsarTodas = () => {
    setAbiertas(Object.fromEntries(SECCIONES.map((s) => [s.id, false])));
  };

  const handleGenerarPdf = async () => {
    try {
      setGenerandoPdf(true);
      await generarPdfInformeExportacion(formData, { aseguradoraOptions, responsables });
    } catch (err) {
      console.error(err);
      alert(t('ports.ui.casoExportacion.alerts.pdfError', { error: err.message || t('ports.ui.common.unknownError') }));
    } finally {
      setGenerandoPdf(false);
    }
  };

  const handleGenerarWord = async () => {
    try {
      setGenerandoWord(true);
      await generarWordInformeExportacion(formData, { aseguradoraOptions, responsables });
    } catch (err) {
      console.error(err);
      alert(t('ports.ui.casoExportacion.alerts.wordError', { error: err.message || t('ports.ui.common.unknownError') }));
    } finally {
      setGenerandoWord(false);
    }
  };

  if (cargando) {
    return (
      <div className={`${puertosFormRoot} py-16 text-center font-body text-gray-500`}>{t('ports.ui.casoExportacion.loadingCaso')}</div>
    );
  }

  return (
    <div className={puertosFormRoot}>
      <div className={puertosPageWrap}>
      <div className={puertosStickyBar}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/puertos/actas')} className={puertosBtnSecondary}>
            <FaArrowLeft />
          </button>
          <div>
            <h2 className={puertosPageTitle}>
              {soloLectura ? t('ports.ui.casoExportacion.titleView') : t('ports.ui.casoExportacion.titleEdit')}
            </h2>
            <p className={puertosPageSubtitle}>
              {t('ports.ui.casoExportacion.subtitle')}
              {formData.consecutivo ? ` · ${formData.consecutivo}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {soloLectura && id && (
            <button
              type="button"
              onClick={() => navigate(`/puertos/actas/caso/editar/${id}`)}
              className={puertosBtnPrimary}
            >
              <FaEdit /> {t('ports.ui.common.edit')}
            </button>
          )}
          {!soloLectura && (
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
          )}
          {!soloLectura && (
            <button type="button" onClick={handleGuardar} disabled={guardando} className={puertosBtnPrimary}>
              <FaSave /> {guardando ? t('ports.ui.common.saving') : t('ports.ui.common.save')}
            </button>
          )}
          <button
            type="button"
            onClick={handleGenerarPdf}
            disabled={generandoPdf || generandoWord || guardando}
            className={puertosBtnSecondary}
          >
            <FaFilePdf /> {generandoPdf ? t('ports.ui.common.generatingPdf') : t('ports.ui.common.pdf')}
          </button>
          <button
            type="button"
            onClick={handleGenerarWord}
            disabled={generandoWord || generandoPdf || guardando}
            className={puertosBtnSecondary}
          >
            <FaFileWord /> {generandoWord ? t('ports.ui.common.generatingWord') : t('ports.ui.common.word')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 font-body text-sm">
        <button type="button" onClick={expandirTodas} className={puertosBtnLink}>
          {t('ports.ui.casoExportacion.expandAll')}
        </button>
        <span className="text-gray-300">|</span>
        <button type="button" onClick={colapsarTodas} className={puertosBtnLink}>
          {t('ports.ui.casoExportacion.collapseAll')}
        </button>
      </div>

      {soloLectura && (
        <div
          className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 font-body text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-100"
          dangerouslySetInnerHTML={{ __html: t('ports.ui.casoExportacion.readOnlyBanner') }}
        />
      )}

      <div className="space-y-3">
        {SECCIONES.map(({ id, numero, titulo, subtitulo }) => (
          <PuertosCasoSeccionDesplegable
            key={id}
            id={id}
            numero={numero}
            titulo={titulo}
            subtitulo={subtitulo}
            abierta={!!abiertas[id]}
            onToggle={toggleSeccion}
            soloLectura={soloLectura}
          >
            {id === 'portada' && (
              <PuertosCasoPagina1
                formData={formData}
                onChange={onChange}
                aseguradoraOptions={aseguradoraOptions}
                soloLectura={soloLectura}
              />
            )}
            {id === 'datosIntro' && (
              <PuertosCasoPagina2
                formData={formData}
                onChange={onChange}
                onInformeChange={onInformeChange}
                responsables={responsables}
                soloLectura={soloLectura}
              />
            )}
            {id === 'buqueMercancia' && (
              <PuertosCasoPagina3
                formData={formData}
                onInformeChange={onInformeChange}
                onNestedInformeChange={onNestedInformeChange}
                soloLectura={soloLectura}
              />
            )}
            {id === 'supervision' && (
              <PuertosCasoPagina4
                formData={formData}
                onInformeChange={onInformeChange}
                soloLectura={soloLectura}
              />
            )}
            {id === 'conclusiones' && (
              <PuertosCasoPagina5
                formData={formData}
                onInformeChange={onInformeChange}
                soloLectura={soloLectura}
              />
            )}
          </PuertosCasoSeccionDesplegable>
        ))}
      </div>

      {!soloLectura && (
      <div className="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-800">
        <button type="button" onClick={handleGuardar} disabled={guardando} className={puertosBtnPrimary}>
          <FaSave /> {guardando ? t('ports.ui.common.saving') : t('ports.ui.common.save')}
        </button>
      </div>
      )}
      </div>
    </div>
  );
}
