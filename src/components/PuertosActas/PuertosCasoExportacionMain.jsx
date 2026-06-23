import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaSave, FaFilePdf, FaArrowLeft } from 'react-icons/fa';
import { BASE_URL } from '../../config/apiConfig.js';
import {
  getPuertosCaso,
  crearPuertosCaso,
  actualizarPuertosCaso,
} from '../../services/puertosService.js';
import {
  ESTADO_INICIAL_CASO_EXPORTACION,
  INFORME_EXPORTACION_VACIO,
  BUQUE_VACIO,
  normalizarRegistroFotograficoMercancia,
  migrarSupervisionPagina4,
  normalizarRegistrosFotograficosContenedores,
  normalizarPuntos,
} from './puertosCasoExportacionState';
import { procesarInformeExportacionImagenes } from '../../services/puertosCasoImagenService.js';
import { generarPdfInformeExportacion } from '../../services/puertosCasoExportacionPdfService.js';
import { normalizarImagenCargada } from './puertosCasoImagenUtils';
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

const SECCIONES = [
  {
    id: 'portada',
    numero: 1,
    titulo: 'Portada — Reporte de supervisión',
    subtitulo: 'Solicitud, aseguradora, creado por, consecutivo',
  },
  {
    id: 'datosIntro',
    numero: 2,
    titulo: 'Datos generales e introducción',
    subtitulo: 'Exportador, operación portuaria, texto introductorio',
  },
  {
    id: 'buqueMercancia',
    numero: 3,
    titulo: 'Particularidades del buque y mercancía',
    subtitulo: 'Motonave, puertos, tabla de carga',
  },
  {
    id: 'supervision',
    numero: 4,
    titulo: 'Reporte de supervisión',
    subtitulo: 'Seguimiento contenedores, sellos, comentarios',
  },
  {
    id: 'conclusiones',
    numero: 5,
    titulo: 'Conclusiones y registro por contenedor',
    subtitulo: 'Comentarios finales y fotos con sellos por N° contenedor',
  },
];

const ABIERTAS_INICIAL = {
  portada: true,
  datosIntro: false,
  buqueMercancia: false,
  supervision: false,
  conclusiones: false,
};

function formatearFechaInput(valor) {
  if (!valor) return '';
  if (typeof valor === 'string' && valor.includes('T')) return valor.split('T')[0];
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  try {
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function normalizarInforme(informe = {}) {
  const buque = { ...BUQUE_VACIO, ...(informe.buque || {}) };
  if (buque.imagenBuque) {
    buque.imagenBuque = normalizarImagenCargada(buque.imagenBuque);
  }
  const supervision = migrarSupervisionPagina4(informe);
  const registroMercancia = normalizarRegistroFotograficoMercancia(informe);
  const mapImgs = (arr) => (arr || []).map(normalizarImagenCargada);

  return {
    ...INFORME_EXPORTACION_VACIO,
    ...informe,
    buque,
    lineasMercancia: Array.isArray(informe.lineasMercancia) ? informe.lineasMercancia : [],
    seguimiento: Array.isArray(informe.seguimiento) ? informe.seguimiento : [],
    imagenesContenedoresMercancia: mapImgs(registroMercancia.imagenesContenedoresMercancia),
    imagenesVehiculosMercancia: mapImgs(registroMercancia.imagenesVehiculosMercancia),
    imagenesContenidoCajas: mapImgs(informe.imagenesContenidoCajas),
    imagenesRegistroMercancia: [],
    ...supervision,
    imagenesRegistroInicialSupervision: mapImgs(supervision.imagenesRegistroInicialSupervision),
    imagenesCondicionCarga: mapImgs(supervision.imagenesCondicionCarga),
    imagenesInspeccionArribo: mapImgs(supervision.imagenesInspeccionArribo),
    imagenesEquiposOperacion: mapImgs(supervision.imagenesEquiposOperacion),
    imagenesCondicionesMeteo: mapImgs(supervision.imagenesCondicionesMeteo),
    conclusionesTexto: informe.conclusionesTexto || '',
    conclusionesPuntos: normalizarPuntos(informe.conclusionesPuntos),
    registrosFotograficosContenedores: normalizarRegistrosFotograficosContenedores(
      informe.registrosFotograficosContenedores
    ).map((r) => ({
      ...r,
      imagenes: (r.imagenes || []).map(normalizarImagenCargada),
    })),
  };
}

function normalizarCasoParaForm(caso) {
  if (!caso) return { ...ESTADO_INICIAL_CASO_EXPORTACION };
  const fechas = [
    'fchaAsgncion',
    'fchaContIni',
    'fchaCoordInspeccion',
    'fchaProgInspeccion',
    'fchaInspccion',
    'fchaInfoFnal',
    'fchaFactra',
    'fechaInforme',
  ];
  const out = {
    ...ESTADO_INICIAL_CASO_EXPORTACION,
    ...caso,
    informeExportacion: normalizarInforme(caso.informeExportacion),
  };
  fechas.forEach((f) => {
    out[f] = formatearFechaInput(caso[f]);
  });
  if (out.informeExportacion.buque?.fechaArribo) {
    out.informeExportacion.buque.fechaArribo = formatearFechaInput(
      out.informeExportacion.buque.fechaArribo
    );
  }
  return out;
}

export default function PuertosCasoExportacionMain() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = Boolean(id && id !== 'nueva');

  const [abiertas, setAbiertas] = useState(ABIERTAS_INICIAL);
  const [formData, setFormData] = useState(ESTADO_INICIAL_CASO_EXPORTACION);
  const [cargando, setCargando] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
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

  const onChange = useCallback((campo, valor) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  const onInformeChange = useCallback((campo, valor) => {
    setFormData((prev) => ({
      ...prev,
      informeExportacion: {
        ...prev.informeExportacion,
        [campo]:
          typeof valor === 'function' ? valor(prev.informeExportacion[campo]) : valor,
      },
    }));
  }, []);

  const onNestedInformeChange = useCallback((subObj, valor) => {
    setFormData((prev) => ({
      ...prev,
      informeExportacion: { ...prev.informeExportacion, [subObj]: valor },
    }));
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
      .then((caso) => setFormData(normalizarCasoParaForm(caso)))
      .catch((err) => {
        alert(`No se pudo cargar el caso: ${err.message}`);
        navigate('/puertos/actas');
      })
      .finally(() => setCargando(false));
  }, [id, esEdicion, navigate]);

  const recordIdCaso = esEdicion ? (id || formData._id) : null;

  const onAutoSaveServidor = useCallback(
    async (data) => {
      const casoId = id || data._id;
      if (!casoId) return;
      const informeExportacion = await procesarInformeExportacionImagenes(
        data.informeExportacion,
        casoId
      );
      const payload = {
        ...data,
        informeExportacion,
        actualizadoPor: localStorage.getItem('login') || undefined,
      };
      await actualizarPuertosCaso(casoId, payload);
    },
    [id]
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
    clearSavedData,
  } = useFormAutoSave({
    formKeyBase: 'puertos-caso-exportacion',
    recordId: recordIdCaso,
    formData,
    onServerUpdate: onAutoSaveServidor,
    serverReady: esEdicion && !cargando,
    canSaveServer: () => !guardando && !generandoPdf,
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

  const handleGuardar = async () => {
    if (!formData.codiAsgrdra?.trim()) {
      alert('Seleccione el cliente (aseguradora) en la portada.');
      abrirSeccion('portada');
      return;
    }
    if (!formData.asgrBenfcro?.trim()) {
      alert('Indique el nombre o razón social del exportador.');
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

      const payload = {
        ...formData,
        informeExportacion,
        creadoPor: formData.creadoPor || localStorage.getItem('login') || undefined,
        actualizadoPor: localStorage.getItem('login') || undefined,
      };
      const nombreAseg = aseguradoraOptions.find((a) => a.value === formData.codiAsgrdra)?.label;
      if (nombreAseg) payload.nombreAseguradora = nombreAseg;
      const nombreResp = responsables.find((r) => r.value === formData.codiRespnsble)?.label;
      if (nombreResp) payload.nombreResponsable = nombreResp;

      const resultado = esEdicion
        ? await actualizarPuertosCaso(id, payload)
        : await crearPuertosCaso(payload);

      alert(`Caso guardado: ${resultado.consecutivo || resultado._id}`);
      if (!esEdicion && resultado._id) {
        navigate(`/puertos/actas/caso/editar/${resultado._id}`, { replace: true });
      } else if (resultado.consecutivo) {
        setFormData((prev) => ({
          ...prev,
          consecutivo: resultado.consecutivo,
          informeExportacion: normalizarInforme(resultado.informeExportacion || prev.informeExportacion),
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          informeExportacion: normalizarInforme(resultado.informeExportacion || prev.informeExportacion),
        }));
      }
    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
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
      alert(`No se pudo generar el PDF: ${err.message || 'error desconocido'}`);
    } finally {
      setGenerandoPdf(false);
    }
  };

  if (cargando) {
    return (
      <div className={`${puertosFormRoot} py-16 text-center font-body text-gray-500`}>Cargando caso…</div>
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
            <h2 className={puertosPageTitle}>Informe exportación — Reporte de supervisión</h2>
            <p className={puertosPageSubtitle}>
              Formulario único · secciones desplegables
              {formData.consecutivo ? ` · ${formData.consecutivo}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FormAutoSaveControls
            placement="inline"
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
          <button type="button" onClick={handleGuardar} disabled={guardando} className={puertosBtnPrimary}>
            <FaSave /> {guardando ? 'Guardando…' : 'Grabar'}
          </button>
          <button
            type="button"
            onClick={handleGenerarPdf}
            disabled={generandoPdf || guardando}
            className={puertosBtnSecondary}
          >
            <FaFilePdf /> {generandoPdf ? 'Generando PDF…' : 'PDF'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 font-body text-sm">
        <button type="button" onClick={expandirTodas} className={puertosBtnLink}>
          Expandir todas
        </button>
        <span className="text-gray-300">|</span>
        <button type="button" onClick={colapsarTodas} className={puertosBtnLink}>
          Colapsar todas
        </button>
      </div>

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
          >
            {id === 'portada' && (
              <PuertosCasoPagina1
                formData={formData}
                onChange={onChange}
                aseguradoraOptions={aseguradoraOptions}
              />
            )}
            {id === 'datosIntro' && (
              <PuertosCasoPagina2
                formData={formData}
                onChange={onChange}
                onInformeChange={onInformeChange}
                responsables={responsables}
              />
            )}
            {id === 'buqueMercancia' && (
              <PuertosCasoPagina3
                formData={formData}
                onInformeChange={onInformeChange}
                onNestedInformeChange={onNestedInformeChange}
              />
            )}
            {id === 'supervision' && (
              <PuertosCasoPagina4 formData={formData} onInformeChange={onInformeChange} />
            )}
            {id === 'conclusiones' && (
              <PuertosCasoPagina5 formData={formData} onInformeChange={onInformeChange} />
            )}
          </PuertosCasoSeccionDesplegable>
        ))}
      </div>

      <div className="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-800">
        <button type="button" onClick={handleGuardar} disabled={guardando} className={puertosBtnPrimary}>
          <FaSave /> {guardando ? 'Guardando…' : 'Grabar'}
        </button>
      </div>
      </div>
    </div>
  );
}
