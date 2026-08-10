import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaFileWord,
  FaSave,
  FaStepForward,
} from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import ActaInspeccionAjuste from '../SubcomponenteFormularioAjuste/ActaInspeccionAjuste.jsx';
import FotosPreliminarFlotante from '../SubcomponenteFormularioAjuste/FotosPreliminarFlotante.jsx';
import InspeccionFotograficaAjuste from '../SubcomponenteFormularioAjuste/InspeccionFotograficaAjuste.jsx';
import FirmaAjuste from '../SubcomponenteFormularioAjuste/FirmaAjuste.jsx';
import InformeUnicoCatastrofico from './InformeUnicoCatastrofico.jsx';
import PresupuestoDaniosCatastrofico from './PresupuestoDaniosCatastrofico.jsx';
import {
  crearItemsPresupuestoDesdeCatalogo,
  AIU_PORCENTAJE_DEFAULT,
  HOSPEDAJE_PORCENTAJE_DEFAULT,
} from './catalogoPresupuestoCatastrofico.js';
import { descargarBlob, generarWordCatastrofico } from './generarWordCatastrofico.js';
import historialService, { TIPOS_FORMULARIOS } from '../../services/historialService.js';
import { buildPrefillAjusteDesdeCasoComplex } from '../../utils/prefillAjusteDesdeCasoComplex.js';

const ESTADOS = {
  ACTA: 'actaInspeccion',
  INFORME: 'informeUnico',
};

function crearFormDataInicial(prefill = {}) {
  return {
    estadoActual: ESTADOS.ACTA,
    ciudad: '',
    destinatario: '',
    cargo: '',
    aseguradora: '',
    ciudadDestino: '',
    funcionarioAsigna: '',
    tomador: '',
    vigenciaPoliza: '',
    asegurado: '',
    identificacionActa: '',
    direccionRiesgo: '',
    ubicacionRiesgo: '',
    coordenadasRiesgo: '',
    imagenMapa: null,
    tipoEvento: '',
    tipoRiesgoActa: '',
    tipoSiniestro: '',
    numeroSiniestro: '',
    numeroCaso: '',
    fechaOcurrencia: '',
    fechaSiniestro: '',
    fechaAsignacion: '',
    fechaReporte: '',
    fechaInspeccion: '',
    horaInspeccion: '',
    descripcionRiesgo: '',
    descripcionSiniestro: '',
    actaObservaciones: '',
    antecedentes: '',
    circunstanciasSiniestro: '',
    diagramaCronologiaNota: '',
    cronologiaCatastroficoId: '',
    cronologiaNombre: '',
    cronologiaLeyenda: 'Diagrama cronología de la emergencia',
    imagenCronologia: '',
    departamento: '',
    descripcionDanios: '',
    areaLote: '',
    nivelesInmueble: '',
    claseInmueble: '',
    tipoInmueble: '',
    distribucionInmueble: [],
    espaciosAfectados: [],
    imagenesInspeccion: [],
    observacionesInforme: '',
    nombreFirmante: '',
    cargoFirmante: 'Ajustador de Siniestros',
    indemnizacionSugerida: '',
    actaClienteNombre: '',
    actaClienteCargo: '',
    actaClienteEmail: '',
    actaClienteFirma: '',
    actaAjustadorNombre: '',
    actaAjustadorCargo: '',
    actaAjustadorEmail: '',
    actaAjustadorFirmaImagen: '',
    presupuestoCatastrofico: {
      items: crearItemsPresupuestoDesdeCatalogo(),
      aiuPorcentaje: AIU_PORCENTAJE_DEFAULT,
      intro:
        'Con base en la inspección técnica realizada en el inmueble afectado, y en atención a las condiciones observadas durante la visita de campo, se elaboró el presente presupuesto de obra, el cual contempla las actividades necesarias para la atención, corrección y restitución de los daños identificados.',
    },
    liquidacionCatastrofico: {
      valorAsegurado: '',
      hospedajePorcentaje: HOSPEDAJE_PORCENTAJE_DEFAULT,
      hospedajeManual: '',
      deducible: 'No aplica',
    },
    metadata: {},
    ...prefill,
  };
}

export default function FormularioCatastrofico() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [formData, setFormData] = useState(() =>
    crearFormDataInicial(location.state?.prefillDesdeCaso || {})
  );
  const [estadoActual, setEstadoActual] = useState(ESTADOS.ACTA);
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [historialId, setHistorialId] = useState(id && id !== 'nuevo' ? id : null);
  /** Herencia de unitarios por sitio solo en formularios nuevos; no pisa edición existente. */
  const [herenciaAutomatica, setHerenciaAutomatica] = useState(() => !id || id === 'nuevo');

  const pageBg = theme === 'dark' ? '#0f172a' : '#f8fafc';
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';

  useEffect(() => {
    const prefill = location.state?.prefillDesdeCaso;
    if (prefill && typeof prefill === 'object' && !historialId) {
      setFormData((prev) => ({
        ...prev,
        ...prefill,
        metadata: {
          ...(prev.metadata || {}),
          ...(prefill.metadata || {}),
          complexId: location.state?.complexId || prefill.metadata?.complexId,
        },
        presupuestoCatastrofico:
          prev.presupuestoCatastrofico?.items?.length
            ? prev.presupuestoCatastrofico
            : {
                items: crearItemsPresupuestoDesdeCatalogo(),
                aiuPorcentaje: AIU_PORCENTAJE_DEFAULT,
                intro: prev.presupuestoCatastrofico?.intro,
              },
      }));
    }
  }, [location.state, historialId]);

  useEffect(() => {
    let cancelled = false;
    const cargar = async () => {
      if (!id || id === 'nuevo') {
        setHerenciaAutomatica(true);
        return;
      }
      try {
        const formulario = await historialService.obtenerFormulario(id);
        if (cancelled || !formulario) return;
        const datos = formulario.datos || formulario;
        setFormData((prev) => ({
          ...crearFormDataInicial(),
          ...prev,
          ...datos,
          presupuestoCatastrofico: {
            aiuPorcentaje: AIU_PORCENTAJE_DEFAULT,
            intro:
              'Con base en la inspección técnica realizada en el inmueble afectado, y en atención a las condiciones observadas durante la visita de campo, se elaboró el presente presupuesto de obra, el cual contempla las actividades necesarias para la atención, corrección y restitución de los daños identificados.',
            ...(datos.presupuestoCatastrofico || {}),
            items:
              datos.presupuestoCatastrofico?.items?.length
                ? datos.presupuestoCatastrofico.items
                : crearItemsPresupuestoDesdeCatalogo(),
          },
        }));
        const estado =
          datos.estadoActual === ESTADOS.INFORME || formulario.estadoActual === ESTADOS.INFORME
            ? ESTADOS.INFORME
            : ESTADOS.ACTA;
        setEstadoActual(estado);
        setHistorialId(formulario._id || formulario.id || id);
        setHerenciaAutomatica(false);
      } catch (error) {
        console.error('Error cargando catastrófico:', error);
        setMensaje('No se pudo cargar el formulario guardado.');
      }
    };
    cargar();
    return () => {
      cancelled = true;
    };
  }, [id]);

  /** Compatible con Acta/Fotos (campo, valor) y con inputs sintéticos { target }. */
  const handleInputChange = (fieldOrEvent, value) => {
    if (fieldOrEvent && typeof fieldOrEvent === 'object' && fieldOrEvent.target) {
      const { name, value: v } = fieldOrEvent.target;
      if (!name) return;
      setFormData((prev) => ({ ...prev, [name]: v }));
      return;
    }
    if (
      fieldOrEvent &&
      typeof fieldOrEvent === 'object' &&
      !Array.isArray(fieldOrEvent) &&
      value === undefined
    ) {
      setFormData((prev) => ({ ...prev, ...fieldOrEvent }));
      return;
    }
    setFormData((prev) => ({ ...prev, [fieldOrEvent]: value }));
  };

  const handleMapaChange = (nuevaInfoMapa) => {
    const nuevaImagenRaw = nuevaInfoMapa.imagenMapa || nuevaInfoMapa.imagen;
    const tieneNuevaImagen =
      nuevaImagenRaw !== undefined &&
      nuevaImagenRaw !== null &&
      String(nuevaImagenRaw).trim() !== '';

    setFormData((prev) => {
      const next = { ...prev };
      if (nuevaInfoMapa.lat != null && nuevaInfoMapa.lng != null) {
        next.coordenadasRiesgo = `${nuevaInfoMapa.lat}, ${nuevaInfoMapa.lng}`;
      } else if (nuevaInfoMapa.coordenadas) {
        if (typeof nuevaInfoMapa.coordenadas === 'string') {
          next.coordenadasRiesgo = nuevaInfoMapa.coordenadas;
        } else if (
          nuevaInfoMapa.coordenadas.lat != null &&
          nuevaInfoMapa.coordenadas.lng != null
        ) {
          next.coordenadasRiesgo = `${nuevaInfoMapa.coordenadas.lat}, ${nuevaInfoMapa.coordenadas.lng}`;
        }
      }
      if (tieneNuevaImagen) {
        next.imagenMapa = nuevaImagenRaw;
      }
      if (
        nuevaInfoMapa.direccion &&
        !String(prev.direccionRiesgo || '').trim()
      ) {
        next.direccionRiesgo = nuevaInfoMapa.direccion;
      }
      return next;
    });
  };

  const tituloVista = useMemo(
    () =>
      estadoActual === ESTADOS.ACTA
        ? 'Catastrófico · Acta de inspección'
        : 'Catastrófico · Informe único',
    [estadoActual]
  );

  const guardar = async ({ avanzar = false } = {}) => {
    setGuardando(true);
    setMensaje('');
    try {
      const siguienteEstado = avanzar ? ESTADOS.INFORME : estadoActual;
      const datos = {
        ...formData,
        estadoActual: siguienteEstado,
        metadata: {
          ...(formData.metadata || {}),
          complexId: location.state?.complexId || formData.metadata?.complexId,
          numeroAjuste:
            formData.metadata?.numeroAjuste ||
            formData.numeroCaso ||
            location.state?.nmroAjste ||
            location.state?.numeroCaso,
        },
      };

      const numeroCaso =
        datos.numeroCaso ||
        location.state?.nmroAjste ||
        location.state?.numeroCaso ||
        datos.numeroSiniestro ||
        'SIN-CASO';
      const complexId =
        location.state?.complexId || datos.metadata?.complexId || '';

      const payload = {
        tipo: TIPOS_FORMULARIOS.CATASTROFICO,
        titulo: `Informe catastrófico - ${datos.asegurado || numeroCaso}`,
        asegurado: datos.asegurado || '',
        casoId: String(complexId || numeroCaso),
        numeroCaso: String(numeroCaso),
        estado: 'en_proceso',
        estadoActual: siguienteEstado,
        datos: {
          ...datos,
          casoId: String(complexId || numeroCaso),
          numeroCaso: String(numeroCaso),
        },
      };

      let resultado;
      if (historialId) {
        resultado = await historialService.actualizarFormulario(historialId, payload);
      } else {
        resultado = await historialService.guardarFormulario(payload);
        const nuevoId = resultado?._id || resultado?.id || resultado?.data?._id;
        if (nuevoId) {
          setHistorialId(String(nuevoId));
          navigate(`/catastrofico/editar/${nuevoId}`, {
            replace: true,
            state: location.state,
          });
        }
      }

      if (avanzar) setEstadoActual(ESTADOS.INFORME);
      setFormData((prev) => ({ ...prev, estadoActual: siguienteEstado }));
      setMensaje(avanzar ? 'Acta guardada. Continuando al informe único.' : 'Guardado correctamente.');
      return resultado;
    } catch (error) {
      console.error(error);
      setMensaje(error?.message || 'Error al guardar');
      return null;
    } finally {
      setGuardando(false);
    }
  };

  const generarWord = async () => {
    setGenerando(true);
    setMensaje('');
    try {
      await guardar();
      const { blob, fileName } = await generarWordCatastrofico(formData, {
        modo: estadoActual,
      });
      descargarBlob(blob, fileName);
      setMensaje(`Documento generado: ${fileName}`);
    } catch (error) {
      console.error(error);
      setMensaje(error?.message || 'Error al generar Word');
    } finally {
      setGenerando(false);
    }
  };

  const volver = () => {
    const path = location.state?.returnPath || '/complex/mis-casos';
    navigate(path);
  };

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: pageBg }}>
      <div className="mx-auto max-w-6xl space-y-4">
        <header
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
          style={{ backgroundColor: cardBg, borderColor }}
        >
          <div>
            <button
              type="button"
              onClick={volver}
              className="mb-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <FaArrowLeft /> Volver a Complex
            </button>
            <h1 className="text-xl font-bold" style={{ color: textPrimary }}>
              {tituloVista}
            </h1>
            <p className="text-sm text-slate-500">
              Flujo único: acta de inspección → informe catastrófico (sin versiones intermedia).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={guardando}
              onClick={() => guardar()}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
            >
              <FaSave /> {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              disabled={generando}
              onClick={generarWord}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <FaFileWord /> {generando ? 'Generando…' : 'Generar Word'}
            </button>
            {estadoActual === ESTADOS.ACTA && (
              <button
                type="button"
                disabled={guardando}
                onClick={() => guardar({ avanzar: true })}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <FaStepForward /> Ir a informe único
              </button>
            )}
            {estadoActual === ESTADOS.INFORME && (
              <button
                type="button"
                onClick={() => setEstadoActual(ESTADOS.ACTA)}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
                style={{ borderColor, color: textPrimary }}
              >
                Volver al acta
              </button>
            )}
          </div>
        </header>

        {mensaje ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
            {mensaje}
          </div>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              estadoActual === ESTADOS.ACTA
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100'
            }`}
            onClick={() => setEstadoActual(ESTADOS.ACTA)}
          >
            1. Acta
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              estadoActual === ESTADOS.INFORME
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100'
            }`}
            onClick={() => setEstadoActual(ESTADOS.INFORME)}
          >
            2. Informe único
          </button>
        </div>

        <div className="rounded-xl border p-4 md:p-6" style={{ backgroundColor: cardBg, borderColor }}>
          {estadoActual === ESTADOS.ACTA ? (
            <>
              <ActaInspeccionAjuste formData={formData} onInputChange={handleInputChange} />
              <FotosPreliminarFlotante formData={formData} onInputChange={handleInputChange} />
            </>
          ) : (
            <div className="space-y-8">
              <InformeUnicoCatastrofico
                formData={formData}
                onInputChange={handleInputChange}
                onMapaChange={handleMapaChange}
              />
              <InspeccionFotograficaAjuste
                formData={formData}
                onInputChange={handleInputChange}
                numeroSeccion={4}
              />
              <PresupuestoDaniosCatastrofico
                formData={formData}
                onInputChange={handleInputChange}
                historialId={historialId}
                herenciaAutomatica={herenciaAutomatica}
              />
              <FirmaAjuste formData={formData} onInputChange={handleInputChange} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Helper exportado por si se quiere prefill desde fuera sin duplicar lógica de ajuste. */
export function buildPrefillCatastroficoDesdeCasoComplex(caso) {
  return buildPrefillAjusteDesdeCasoComplex(caso);
}
