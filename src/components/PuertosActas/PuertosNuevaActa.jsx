import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PuertosFotosActa from './PuertosFotosActa';
import PuertosDocumentosAdjuntos from './PuertosDocumentosAdjuntos';
import PuertosFacturacionActa from './PuertosFacturacionActa';
import PuertosObservacionesActa from './PuertosObservacionesActa';
import SelectorCatalogoPuertos from './SelectorCatalogoPuertos';
import { fetchPuertosCatalogo } from '../../services/puertosCatalogoService.js';
import {
  crearPuertosActa,
  actualizarPuertosActa,
  getPuertosActa,
} from '../../services/puertosService.js';
import { generarPdfActaPuertos } from '../../services/puertosActaPdfService.js';
import {
  actaApiAFormulario,
  estadoInicialActaFormulario,
  formularioAActaApi,
  validarFormularioActa,
} from './puertosActaMapper.js';
import {
  filtrarSucursalesPorAseguradora,
  sucursalAutomatica,
  sucursalPerteneceAAseguradora,
} from '../../utils/filtrarSucursalesAseguradora.js';
import {
  elegirHtmlMasCompleto,
  leerHtmlEditoresActaPuertos,
} from './puertosActaEditoresHtml.js';
import { FaSave, FaFilePdf, FaEraser, FaSync, FaArrowLeft } from 'react-icons/fa';

function Seccion({ titulo, children, cols = 4 }) {
  const gridCls =
    cols === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-visible">
      <header className="px-5 py-3 bg-slate-100 dark:bg-slate-700/80 border-b border-slate-200 dark:border-slate-600 rounded-t-xl">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{titulo}</h3>
      </header>
      <div className={`p-5 grid ${gridCls} gap-4 relative z-0`}>{children}</div>
    </section>
  );
}

function Campo({ label, obligatorio = false, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {obligatorio && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100';

const TIPOS_CATALOGO_FORM = [
  'regional',
  'inspector',
  'empaque',
  'tipo_averia',
  'tipo_inspeccion',
  'tipo_transporte',
  'tipo_mercancia',
  'aseguradora',
  'asegurado',
  'sucursal',
  'estado_acta',
];

function BotonesAccion({ onGrabar, onPdf, onLimpiar, guardando, generandoPdf, soloLectura, t }) {
  return (
    <div className="flex flex-wrap gap-2">
      {!soloLectura && (
        <button
          type="button"
          onClick={onGrabar}
          disabled={guardando || generandoPdf}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          <FaSave /> {guardando ? t('ports.ui.common.saving') : t('ports.ui.common.save')}
        </button>
      )}
      <button
        type="button"
        onClick={onPdf}
        disabled={guardando || generandoPdf}
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        <FaFilePdf /> {generandoPdf ? t('ports.ui.common.generatingPdf') : t('ports.ui.common.pdf')}
      </button>
      {!soloLectura && (
        <button
          type="button"
          onClick={onLimpiar}
          disabled={guardando || generandoPdf}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 disabled:opacity-60"
        >
          <FaEraser /> {t('ports.ui.common.clear')}
        </button>
      )}
    </div>
  );
}

export default function PuertosNuevaActa() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const esEdicion = Boolean(id);
  const soloLectura = searchParams.get('modo') === 'ver';
  const tf = (key) => t(`ports.ui.actas.fields.${key}`);
  const tp = (key) => t(`ports.ui.actas.placeholders.${key}`);

  const [fotos, setFotos] = useState([]);
  const [form, setForm] = useState(estadoInicialActaFormulario);
  const [catalogos, setCatalogos] = useState({});
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [cargandoActa, setCargandoActa] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [errorCatalogos, setErrorCatalogos] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [editorSyncKey, setEditorSyncKey] = useState(() => (esEdicion ? `edit-${id}` : 'nueva'));
  const observacionesRef = useRef(null);

  const setCampo = useCallback((campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  const sucursalesFiltradas = useMemo(
    () => filtrarSucursalesPorAseguradora(form.aseguradora, catalogos.sucursal || []),
    [form.aseguradora, catalogos.sucursal]
  );

  /** Al cambiar aseguradora: limpiar sucursal inválida o marcar la única candidata. */
  const handleAseguradoraChange = (nuevaAseguradora) => {
    setForm((prev) => {
      const next = { ...prev, aseguradora: nuevaAseguradora };
      if (!nuevaAseguradora) {
        next.sucursal = '';
        return next;
      }
      const auto = sucursalAutomatica(nuevaAseguradora, catalogos.sucursal || []);
      if (auto) {
        next.sucursal = auto;
        return next;
      }
      if (
        prev.sucursal &&
        !sucursalPerteneceAAseguradora(nuevaAseguradora, prev.sucursal, catalogos.sucursal || [])
      ) {
        next.sucursal = '';
      }
      return next;
    });
  };

  // Si el catálogo de sucursales llega después y hay aseguradora sin sucursal (o inválida), completar.
  useEffect(() => {
    if (!form.aseguradora || !(catalogos.sucursal || []).length) return;
    const auto = sucursalAutomatica(form.aseguradora, catalogos.sucursal);
    if (auto && form.sucursal !== auto) {
      // Solo autocompletar si está vacío o no pertenece a la aseguradora
      if (
        !form.sucursal ||
        !sucursalPerteneceAAseguradora(form.aseguradora, form.sucursal, catalogos.sucursal)
      ) {
        setCampo('sucursal', auto);
      }
    } else if (
      form.sucursal &&
      !sucursalPerteneceAAseguradora(form.aseguradora, form.sucursal, catalogos.sucursal) &&
      filtrarSucursalesPorAseguradora(form.aseguradora, catalogos.sucursal).length > 0
    ) {
      setCampo('sucursal', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reaccionar a catálogo/aseguradora
  }, [form.aseguradora, catalogos.sucursal]);

  const mensajeValidacion = (campoKey) =>
    t('ports.ui.actas.validation.required', { field: tf(campoKey) });

  const cargarCatalogos = useCallback(async () => {
    setCargandoCatalogos(true);
    setErrorCatalogos(null);
    try {
      const resultados = await Promise.all(
        TIPOS_CATALOGO_FORM.map(async (tipo) => {
          const data = await fetchPuertosCatalogo(tipo);
          return [tipo, Array.isArray(data) ? data : []];
        })
      );
      setCatalogos(Object.fromEntries(resultados));
    } catch (err) {
      setErrorCatalogos(err.message);
    } finally {
      setCargandoCatalogos(false);
    }
  }, []);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  useEffect(() => {
    if (!esEdicion) return;
    let cancelado = false;
    (async () => {
      setCargandoActa(true);
      setError('');
      try {
        const doc = await getPuertosActa(id);
        if (cancelado) return;
        setForm(actaApiAFormulario(doc));
        setEditorSyncKey(`edit-${id}-${doc.updatedAt || doc.actualizadoEn || Date.now()}`);
        setFotos(
          (doc.fotos || []).map((f, i) => ({
            id: f.id || `foto-${i}`,
            src: f.src || '',
            ruta: f.ruta || '',
            nombre: f.nombre || '',
            descripcion: f.descripcion || '',
          }))
        );
      } catch (err) {
        if (!cancelado) setError(err.message || t('ports.ui.actas.loadError'));
      } finally {
        if (!cancelado) setCargandoActa(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [esEdicion, id, t]);

  const recargarTipo = async (tipo) => {
    try {
      const data = await fetchPuertosCatalogo(tipo);
      setCatalogos((prev) => ({ ...prev, [tipo]: Array.isArray(data) ? data : [] }));
    } catch (err) {
      setErrorCatalogos(err.message);
    }
  };

  const obtenerFormConTextos = () => {
    const desdeDom = leerHtmlEditoresActaPuertos();
    const desdeFlush = observacionesRef.current?.flush?.() || {};
    const observaciones = elegirHtmlMasCompleto(
      desdeDom.observaciones,
      desdeFlush.observaciones,
      form.observaciones
    );
    const recomendaciones = elegirHtmlMasCompleto(
      desdeDom.recomendaciones,
      desdeFlush.recomendaciones,
      form.recomendaciones
    );
    return {
      ...form,
      observaciones,
      recomendaciones,
    };
  };

  const handlePdf = async () => {
    const formActual = obtenerFormConTextos();
    const campoFaltante = validarFormularioActa(formActual);
    if (campoFaltante) {
      setError(mensajeValidacion(campoFaltante));
      return;
    }
    setGenerandoPdf(true);
    setError('');
    try {
      await generarPdfActaPuertos(formActual, fotos, {
        documentosAdjuntos: formActual.documentosAdjuntos,
      });
    } catch (err) {
      setError(err.message || t('ports.ui.actas.pdfError'));
    } finally {
      setGenerandoPdf(false);
    }
  };

  const handleGrabar = async () => {
    const formActual = obtenerFormConTextos();
    const campoFaltante = validarFormularioActa(formActual);
    if (campoFaltante) {
      setError(mensajeValidacion(campoFaltante));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const payload = formularioAActaApi(formActual, { fotos });
      // Garantiza que el HTML no se pierda aunque el mapper falle en algún caso
      payload.observaciones = formActual.observaciones || '';
      payload.recomendaciones = formActual.recomendaciones || '';

      const resultado = esEdicion
        ? await actualizarPuertosActa(id, payload)
        : await crearPuertosActa(payload);

      const mapped = actaApiAFormulario(resultado);
      // Si la API no devolviera textos, conserva lo que acabamos de grabar
      setForm({
        ...mapped,
        observaciones: mapped.observaciones || formActual.observaciones || '',
        recomendaciones:
          mapped.recomendaciones || formActual.recomendaciones || '',
      });
      setMensaje(
        t('ports.ui.actas.saveSuccess', { id: resultado.nroActa || resultado._id })
      );
      if (!esEdicion && resultado._id) {
        navigate(`/puertos/actas/editar/${resultado._id}`, { replace: true });
      }
    } catch (err) {
      setError(err.message || t('ports.ui.actas.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  const handleLimpiar = () => {
    setForm(estadoInicialActaFormulario());
    setFotos([]);
    setMensaje('');
    setError('');
    setEditorSyncKey(`nueva-${Date.now()}`);
  };

  if (cargandoActa) {
    return (
      <div className="py-16 text-center text-slate-500">
        {t('ports.ui.actas.loadingActa')}
      </div>
    );
  }

  const titulo = soloLectura
    ? t('ports.ui.actas.titleView')
    : esEdicion
      ? t('ports.ui.actas.titleEdit')
      : t('ports.ui.actas.titleNew');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate('/puertos/actas')}
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-sky-600"
          >
            <FaArrowLeft /> {t('ports.ui.common.backToList')}
          </button>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{titulo}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('ports.ui.actas.subtitle')}</p>
        </div>
        <BotonesAccion
          onGrabar={handleGrabar}
          onPdf={handlePdf}
          onLimpiar={handleLimpiar}
          guardando={guardando}
          generandoPdf={generandoPdf}
          soloLectura={soloLectura}
          t={t}
        />
      </div>

      {mensaje && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {errorCatalogos && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100 flex flex-wrap items-center justify-between gap-2">
          <span>{t('ports.ui.actas.catalogError', { error: errorCatalogos })}</span>
          <button
            type="button"
            onClick={cargarCatalogos}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-400 px-3 py-1 text-xs font-semibold"
          >
            <FaSync /> {t('ports.ui.common.retry')}
          </button>
        </div>
      )}

      <Seccion titulo={t('ports.ui.actas.sections.basic')}>
        <SelectorCatalogoPuertos
          label={tf('regional')}
          obligatorio
          tipo="regional"
          items={catalogos.regional}
          value={form.regional}
          onChange={(v) => setCampo('regional', v)}
          onRefresh={() => recargarTipo('regional')}
          cargando={cargandoCatalogos}
        />
        <Campo label={tf('nroActa')} obligatorio>
          <input
            className={inputCls}
            placeholder={tp('nroActa')}
            value={form.nroActa}
            onChange={(e) => setCampo('nroActa', e.target.value)}
          />
        </Campo>
        <Campo label={tf('fechaActa')} obligatorio>
          <input
            type="datetime-local"
            className={inputCls}
            value={form.fechaActa}
            onChange={(e) => setCampo('fechaActa', e.target.value)}
          />
        </Campo>
        <Campo label={tf('fechaLlegada')} obligatorio>
          <input
            type="date"
            className={inputCls}
            value={form.fechaLlegada}
            onChange={(e) => setCampo('fechaLlegada', e.target.value)}
          />
        </Campo>
        <Campo label={tf('ciudad')}>
          <input
            className={inputCls}
            placeholder={tp('ciudad')}
            value={form.ciudad}
            onChange={(e) => setCampo('ciudad', e.target.value)}
          />
        </Campo>
        <SelectorCatalogoPuertos
          label={tf('tipoInspeccion')}
          obligatorio
          tipo="tipo_inspeccion"
          items={catalogos.tipo_inspeccion}
          value={form.tipoInspeccion}
          onChange={(v) => setCampo('tipoInspeccion', v)}
          onRefresh={() => recargarTipo('tipo_inspeccion')}
          cargando={cargandoCatalogos}
        />
        <SelectorCatalogoPuertos
          label={tf('inspector')}
          obligatorio
          tipo="inspector"
          items={catalogos.inspector}
          value={form.inspector}
          onChange={(v) => setCampo('inspector', v)}
          onRefresh={() => recargarTipo('inspector')}
          cargando={cargandoCatalogos}
        />
        <SelectorCatalogoPuertos
          label={tf('estado')}
          obligatorio
          tipo="estado_acta"
          items={catalogos.estado_acta}
          value={form.estado}
          onChange={(v) => setCampo('estado', v)}
          onRefresh={() => recargarTipo('estado_acta')}
          cargando={cargandoCatalogos}
        />
      </Seccion>

      <Seccion titulo={t('ports.ui.actas.sections.insured')}>
        <SelectorCatalogoPuertos
          label={tf('aseguradora')}
          obligatorio
          tipo="aseguradora"
          items={catalogos.aseguradora}
          value={form.aseguradora}
          onChange={handleAseguradoraChange}
          onRefresh={() => recargarTipo('aseguradora')}
          cargando={cargandoCatalogos}
        />
        <div className="space-y-1">
          <SelectorCatalogoPuertos
            label={tf('sucursal')}
            obligatorio
            tipo="sucursal"
            items={form.aseguradora ? sucursalesFiltradas : []}
            value={form.sucursal}
            onChange={(v) => setCampo('sucursal', v)}
            onRefresh={() => recargarTipo('sucursal')}
            cargando={cargandoCatalogos}
            disabled={!form.aseguradora}
            placeholder={
              form.aseguradora
                ? undefined
                : t('ports.ui.actas.placeholders.selectAseguradoraFirst')
            }
          />
          {form.aseguradora && sucursalesFiltradas.length === 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {t('ports.ui.actas.hints.noBranchesForInsurer')}
            </p>
          )}
          {form.aseguradora && sucursalesFiltradas.length > 1 && !form.sucursal && (
            <p className="text-xs text-slate-500">
              {t('ports.ui.actas.hints.pickBranch', { count: sucursalesFiltradas.length })}
            </p>
          )}
        </div>
        <SelectorCatalogoPuertos
          label={tf('asegurado')}
          obligatorio
          tipo="asegurado"
          items={catalogos.asegurado}
          value={form.asegurado}
          onChange={(v) => setCampo('asegurado', v)}
          onRefresh={() => recargarTipo('asegurado')}
          cargando={cargandoCatalogos}
        />
        <SelectorCatalogoPuertos
          label={tf('mercancia')}
          obligatorio
          tipo="tipo_mercancia"
          items={catalogos.tipo_mercancia}
          value={form.mercancia}
          onChange={(v) => setCampo('mercancia', v)}
          onRefresh={() => recargarTipo('tipo_mercancia')}
          cargando={cargandoCatalogos}
        />
        <SelectorCatalogoPuertos
          label={tf('empaque')}
          obligatorio
          tipo="empaque"
          items={catalogos.empaque}
          value={form.empaque}
          onChange={(v) => setCampo('empaque', v)}
          onRefresh={() => recargarTipo('empaque')}
          cargando={cargandoCatalogos}
        />
        <Campo label={tf('nroPiezas')}>
          <input
            type="number"
            className={inputCls}
            placeholder="0"
            min="0"
            value={form.nroPiezas}
            onChange={(e) => setCampo('nroPiezas', e.target.value)}
          />
        </Campo>
        <Campo label={tf('fechaConstruccion')} obligatorio>
          <input
            type="date"
            className={inputCls}
            value={form.fechaConstruccion}
            onChange={(e) => setCampo('fechaConstruccion', e.target.value)}
          />
        </Campo>
        <Campo label={tf('pedido')}>
          <input
            className={inputCls}
            placeholder={tp('pedido')}
            value={form.pedido}
            onChange={(e) => setCampo('pedido', e.target.value)}
          />
        </Campo>
      </Seccion>

      <Seccion titulo={t('ports.ui.actas.sections.exteriorTransport')}>
        <Campo label={tf('paisOrigen')}>
          <input
            className={inputCls}
            placeholder={tp('paisOrigen')}
            value={form.paisOrigen}
            onChange={(e) => setCampo('paisOrigen', e.target.value)}
          />
        </Campo>
        <Campo label={tf('paisDestino')}>
          <input
            className={inputCls}
            placeholder={tp('paisDestino')}
            value={form.paisDestino}
            onChange={(e) => setCampo('paisDestino', e.target.value)}
          />
        </Campo>
        <SelectorCatalogoPuertos
          label={tf('tipoTransporte')}
          tipo="tipo_transporte"
          items={catalogos.tipo_transporte}
          value={form.tipoTransporte}
          onChange={(v) => setCampo('tipoTransporte', v)}
          onRefresh={() => recargarTipo('tipo_transporte')}
          cargando={cargandoCatalogos}
        />
        <Campo label={tf('motonave')}>
          <input
            className={inputCls}
            placeholder={tp('motonave')}
            value={form.motonave}
            onChange={(e) => setCampo('motonave', e.target.value)}
          />
        </Campo>
        <Campo label={tf('puertoOrigen')}>
          <input
            className={inputCls}
            placeholder={tp('puertoOrigen')}
            value={form.puertoOrigen}
            onChange={(e) => setCampo('puertoOrigen', e.target.value)}
          />
        </Campo>
        <Campo label={tf('puertoArribo')}>
          <input
            className={inputCls}
            placeholder={tp('puertoArribo')}
            value={form.puertoArribo}
            onChange={(e) => setCampo('puertoArribo', e.target.value)}
          />
        </Campo>
        <Campo label={tf('registro')}>
          <input
            className={inputCls}
            placeholder={tp('registro')}
            value={form.registro}
            onChange={(e) => setCampo('registro', e.target.value)}
          />
        </Campo>
        <Campo label={tf('docTransporte')}>
          <input
            className={inputCls}
            placeholder={tp('docTransporte')}
            value={form.docTransporte}
            onChange={(e) => setCampo('docTransporte', e.target.value)}
          />
        </Campo>
      </Seccion>

      <Seccion titulo={t('ports.ui.actas.sections.interiorTransport')}>
        <Campo label={tf('transportadora')}>
          <input
            className={inputCls}
            placeholder={tp('transportadora')}
            value={form.transportadora}
            onChange={(e) => setCampo('transportadora', e.target.value)}
          />
        </Campo>
        <Campo label={tf('remesa')}>
          <input
            className={inputCls}
            placeholder={tp('remesa')}
            value={form.remesa}
            onChange={(e) => setCampo('remesa', e.target.value)}
          />
        </Campo>
        <Campo label={tf('conductor')}>
          <input
            className={inputCls}
            placeholder={tp('conductor')}
            value={form.conductor}
            onChange={(e) => setCampo('conductor', e.target.value)}
          />
        </Campo>
        <Campo label={tf('cedula')}>
          <input
            className={inputCls}
            placeholder={tp('cedula')}
            value={form.cedula}
            onChange={(e) => setCampo('cedula', e.target.value)}
          />
        </Campo>
        <Campo label={tf('placa')}>
          <input
            className={inputCls}
            placeholder={tp('placa')}
            value={form.placa}
            onChange={(e) => setCampo('placa', e.target.value)}
          />
        </Campo>
        <Campo label={tf('modelo')}>
          <input
            className={inputCls}
            placeholder={tp('modelo')}
            value={form.modelo}
            onChange={(e) => setCampo('modelo', e.target.value)}
          />
        </Campo>
        <Campo label={tf('marca')}>
          <input
            className={inputCls}
            placeholder={tp('marca')}
            value={form.marca}
            onChange={(e) => setCampo('marca', e.target.value)}
          />
        </Campo>
        <Campo label={tf('celular')}>
          <input
            type="tel"
            className={inputCls}
            placeholder={tp('celular')}
            value={form.celular}
            onChange={(e) => setCampo('celular', e.target.value)}
          />
        </Campo>
        <Campo label={tf('origenDespacho')}>
          <input
            className={inputCls}
            placeholder={tp('origenDespacho')}
            value={form.origenDespacho}
            onChange={(e) => setCampo('origenDespacho', e.target.value)}
          />
        </Campo>
        <Campo label={tf('destinoDespacho')}>
          <input
            className={inputCls}
            placeholder={tp('destinoDespacho')}
            value={form.destinoDespacho}
            onChange={(e) => setCampo('destinoDespacho', e.target.value)}
          />
        </Campo>
        <Campo label={tf('cartaPorte')} className="lg:col-span-2">
          <input
            className={inputCls}
            placeholder={tp('cartaPorte')}
            value={form.cartaPorte}
            onChange={(e) => setCampo('cartaPorte', e.target.value)}
          />
        </Campo>
      </Seccion>

      <Seccion titulo={t('ports.ui.actas.sections.inspectionDetail')} cols={3}>
        <Campo label={tf('lugarReconocimiento')} obligatorio>
          <input
            className={inputCls}
            placeholder={tp('lugarReconocimiento')}
            value={form.lugarReconocimiento}
            onChange={(e) => setCampo('lugarReconocimiento', e.target.value)}
          />
        </Campo>
        <Campo label={tf('contacto')} obligatorio>
          <input
            className={inputCls}
            placeholder={tp('contacto')}
            value={form.contacto}
            onChange={(e) => setCampo('contacto', e.target.value)}
          />
        </Campo>
        <Campo label={tf('pesoTara')}>
          <input
            type="number"
            className={inputCls}
            placeholder={tp('pesoTara')}
            min="0"
            step="0.01"
            value={form.pesoTara}
            onChange={(e) => setCampo('pesoTara', e.target.value)}
          />
        </Campo>
        <Campo label={tf('pesoNeto')}>
          <input
            type="number"
            className={inputCls}
            placeholder={tp('pesoNeto')}
            min="0"
            step="0.01"
            value={form.pesoNeto}
            onChange={(e) => setCampo('pesoNeto', e.target.value)}
          />
        </Campo>
        <Campo label={tf('pesoBruto')}>
          <input
            type="number"
            className={inputCls}
            placeholder={tp('pesoBruto')}
            min="0"
            step="0.01"
            value={form.pesoBruto}
            onChange={(e) => setCampo('pesoBruto', e.target.value)}
          />
        </Campo>
        <Campo label={tf('averiaSiNo')} obligatorio>
          <select
            className={inputCls}
            value={form.averiaSiNo}
            onChange={(e) => setCampo('averiaSiNo', e.target.value)}
          >
            <option value="">{t('ports.ui.common.select')}</option>
            <option value="si">{t('ports.ui.common.yes')}</option>
            <option value="no">{t('ports.ui.common.no')}</option>
          </select>
        </Campo>
        <SelectorCatalogoPuertos
          label={tf('tipoAveria')}
          tipo="tipo_averia"
          items={catalogos.tipo_averia}
          value={form.tipoAveria}
          onChange={(v) => setCampo('tipoAveria', v)}
          onRefresh={() => recargarTipo('tipo_averia')}
          cargando={cargandoCatalogos}
        />
      </Seccion>

      <PuertosFotosActa fotos={fotos} onChange={setFotos} soloLectura={soloLectura} />
      <PuertosDocumentosAdjuntos
        tipos={form.documentosAdjuntos}
        onChangeTipos={(documentosAdjuntos) => setCampo('documentosAdjuntos', documentosAdjuntos)}
        soloLectura={soloLectura}
      />
      <PuertosFacturacionActa />
      <PuertosObservacionesActa
        ref={observacionesRef}
        observaciones={form.observaciones}
        recomendaciones={form.recomendaciones}
        onChange={setCampo}
        soloLectura={soloLectura}
        syncKey={editorSyncKey}
      />

      <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-600">
        <BotonesAccion
          onGrabar={handleGrabar}
          onPdf={handlePdf}
          onLimpiar={handleLimpiar}
          guardando={guardando}
          generandoPdf={generandoPdf}
          soloLectura={soloLectura}
          t={t}
        />
      </div>
    </div>
  );
}
