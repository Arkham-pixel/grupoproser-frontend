import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { FaSave, FaFilePdf, FaEraser, FaSync, FaArrowLeft } from 'react-icons/fa';

function Seccion({ titulo, children, cols = 4 }) {
  const gridCls =
    cols === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <header className="px-5 py-3 bg-slate-100 dark:bg-slate-700/80 border-b border-slate-200 dark:border-slate-600">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{titulo}</h3>
      </header>
      <div className={`p-5 grid ${gridCls} gap-4`}>{children}</div>
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
  'sucursal',
  'estado_acta',
];

function BotonesAccion({ onGrabar, onPdf, onLimpiar, guardando, generandoPdf, soloLectura }) {
  return (
    <div className="flex flex-wrap gap-2">
      {!soloLectura && (
        <button
          type="button"
          onClick={onGrabar}
          disabled={guardando || generandoPdf}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          <FaSave /> {guardando ? 'Guardando…' : 'Grabar'}
        </button>
      )}
      <button
        type="button"
        onClick={onPdf}
        disabled={guardando || generandoPdf}
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        <FaFilePdf /> {generandoPdf ? 'Generando PDF…' : 'PDF'}
      </button>
      {!soloLectura && (
        <button
          type="button"
          onClick={onLimpiar}
          disabled={guardando || generandoPdf}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 disabled:opacity-60"
        >
          <FaEraser /> Limpiar
        </button>
      )}
    </div>
  );
}

export default function PuertosNuevaActa() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const esEdicion = Boolean(id);
  const soloLectura = searchParams.get('modo') === 'ver';

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

  const setCampo = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

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
        if (!cancelado) setError(err.message || 'No se pudo cargar el acta');
      } finally {
        if (!cancelado) setCargandoActa(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [esEdicion, id]);

  const recargarTipo = async (tipo) => {
    try {
      const data = await fetchPuertosCatalogo(tipo);
      setCatalogos((prev) => ({ ...prev, [tipo]: Array.isArray(data) ? data : [] }));
    } catch (err) {
      setErrorCatalogos(err.message);
    }
  };

  const handlePdf = async () => {
    const errorValidacion = validarFormularioActa(form);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }
    setGenerandoPdf(true);
    setError('');
    try {
      await generarPdfActaPuertos(form, fotos, { documentosAdjuntos: form.documentosAdjuntos });
    } catch (err) {
      setError(err.message || 'No se pudo generar el PDF');
    } finally {
      setGenerandoPdf(false);
    }
  };

  const handleGrabar = async () => {
    const errorValidacion = validarFormularioActa(form);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const payload = formularioAActaApi(form, { fotos });
      const resultado = esEdicion
        ? await actualizarPuertosActa(id, payload)
        : await crearPuertosActa(payload);

      setForm(actaApiAFormulario(resultado));
      setMensaje(`Acta guardada correctamente: ${resultado.nroActa || resultado._id}`);
      if (!esEdicion && resultado._id) {
        navigate(`/puertos/actas/editar/${resultado._id}`, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Error al guardar el acta');
    } finally {
      setGuardando(false);
    }
  };

  const handleLimpiar = () => {
    setForm(estadoInicialActaFormulario());
    setFotos([]);
    setMensaje('');
    setError('');
  };

  if (cargandoActa) {
    return (
      <div className="py-16 text-center text-slate-500">
        Cargando acta…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate('/puertos/actas')}
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-sky-600"
          >
            <FaArrowLeft /> Volver al listado
          </button>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {soloLectura ? 'Ver Acta' : esEdicion ? 'Editar Acta' : 'Módulo de Actas — Nueva Acta'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Puertos · Arnald DataFlow</p>
        </div>
        <BotonesAccion
          onGrabar={handleGrabar}
          onPdf={handlePdf}
          onLimpiar={handleLimpiar}
          guardando={guardando}
          generandoPdf={generandoPdf}
          soloLectura={soloLectura}
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
          <span>No se pudieron cargar los catálogos: {errorCatalogos}</span>
          <button
            type="button"
            onClick={cargarCatalogos}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-400 px-3 py-1 text-xs font-semibold"
          >
            <FaSync /> Reintentar
          </button>
        </div>
      )}

      <Seccion titulo="Información básica">
        <SelectorCatalogoPuertos
          label="Regional"
          obligatorio
          tipo="regional"
          items={catalogos.regional}
          value={form.regional}
          onChange={(v) => setCampo('regional', v)}
          onRefresh={() => recargarTipo('regional')}
          cargando={cargandoCatalogos}
        />
        <Campo label="Nro. de Acta" obligatorio>
          <input
            className={inputCls}
            placeholder="BV635260"
            value={form.nroActa}
            onChange={(e) => setCampo('nroActa', e.target.value)}
          />
        </Campo>
        <Campo label="Fecha de Acta" obligatorio>
          <input
            type="datetime-local"
            className={inputCls}
            value={form.fechaActa}
            onChange={(e) => setCampo('fechaActa', e.target.value)}
          />
        </Campo>
        <Campo label="Fecha Llegada" obligatorio>
          <input
            type="date"
            className={inputCls}
            value={form.fechaLlegada}
            onChange={(e) => setCampo('fechaLlegada', e.target.value)}
          />
        </Campo>
        <Campo label="Ciudad">
          <input
            className={inputCls}
            placeholder="CIUDAD"
            value={form.ciudad}
            onChange={(e) => setCampo('ciudad', e.target.value)}
          />
        </Campo>
        <SelectorCatalogoPuertos
          label="Tipo de Inspección"
          obligatorio
          tipo="tipo_inspeccion"
          items={catalogos.tipo_inspeccion}
          value={form.tipoInspeccion}
          onChange={(v) => setCampo('tipoInspeccion', v)}
          onRefresh={() => recargarTipo('tipo_inspeccion')}
          cargando={cargandoCatalogos}
        />
        <SelectorCatalogoPuertos
          label="Inspector"
          obligatorio
          tipo="inspector"
          items={catalogos.inspector}
          value={form.inspector}
          onChange={(v) => setCampo('inspector', v)}
          onRefresh={() => recargarTipo('inspector')}
          cargando={cargandoCatalogos}
        />
        <SelectorCatalogoPuertos
          label="Estado"
          obligatorio
          tipo="estado_acta"
          items={catalogos.estado_acta}
          value={form.estado}
          onChange={(v) => setCampo('estado', v)}
          onRefresh={() => recargarTipo('estado_acta')}
          cargando={cargandoCatalogos}
        />
      </Seccion>

      <Seccion titulo="Datos del asegurado">
        <SelectorCatalogoPuertos
          label="Aseguradora"
          obligatorio
          tipo="aseguradora"
          items={catalogos.aseguradora}
          value={form.aseguradora}
          onChange={(v) => setCampo('aseguradora', v)}
          onRefresh={() => recargarTipo('aseguradora')}
          cargando={cargandoCatalogos}
        />
        <SelectorCatalogoPuertos
          label="Sucursal"
          obligatorio
          tipo="sucursal"
          items={catalogos.sucursal}
          value={form.sucursal}
          onChange={(v) => setCampo('sucursal', v)}
          onRefresh={() => recargarTipo('sucursal')}
          cargando={cargandoCatalogos}
        />
        <Campo label="Asegurado" obligatorio>
          <input
            className={inputCls}
            placeholder="ASEGURADO"
            value={form.asegurado}
            onChange={(e) => setCampo('asegurado', e.target.value)}
          />
        </Campo>
        <SelectorCatalogoPuertos
          label="Tipo de mercancía"
          obligatorio
          tipo="tipo_mercancia"
          items={catalogos.tipo_mercancia}
          value={form.mercancia}
          onChange={(v) => setCampo('mercancia', v)}
          onRefresh={() => recargarTipo('tipo_mercancia')}
          cargando={cargandoCatalogos}
        />
        <SelectorCatalogoPuertos
          label="Empaque"
          obligatorio
          tipo="empaque"
          items={catalogos.empaque}
          value={form.empaque}
          onChange={(v) => setCampo('empaque', v)}
          onRefresh={() => recargarTipo('empaque')}
          cargando={cargandoCatalogos}
        />
        <Campo label="Nro. de Piezas">
          <input
            type="number"
            className={inputCls}
            placeholder="0"
            min="0"
            value={form.nroPiezas}
            onChange={(e) => setCampo('nroPiezas', e.target.value)}
          />
        </Campo>
        <Campo label="Fecha Construcción" obligatorio>
          <input
            type="date"
            className={inputCls}
            value={form.fechaConstruccion}
            onChange={(e) => setCampo('fechaConstruccion', e.target.value)}
          />
        </Campo>
        <Campo label="Pedido">
          <input
            className={inputCls}
            placeholder="NRO. PEDIDO"
            value={form.pedido}
            onChange={(e) => setCampo('pedido', e.target.value)}
          />
        </Campo>
      </Seccion>

      <Seccion titulo="Transporte exterior">
        <Campo label="País de Origen">
          <input
            className={inputCls}
            placeholder="PAÍS DE ORIGEN"
            value={form.paisOrigen}
            onChange={(e) => setCampo('paisOrigen', e.target.value)}
          />
        </Campo>
        <Campo label="País Destino Final">
          <input
            className={inputCls}
            placeholder="PAÍS DESTINO FINAL"
            value={form.paisDestino}
            onChange={(e) => setCampo('paisDestino', e.target.value)}
          />
        </Campo>
        <SelectorCatalogoPuertos
          label="Tipo de Transporte"
          tipo="tipo_transporte"
          items={catalogos.tipo_transporte}
          value={form.tipoTransporte}
          onChange={(v) => setCampo('tipoTransporte', v)}
          onRefresh={() => recargarTipo('tipo_transporte')}
          cargando={cargandoCatalogos}
        />
        <Campo label="Motonave">
          <input
            className={inputCls}
            placeholder="MOTONAVE"
            value={form.motonave}
            onChange={(e) => setCampo('motonave', e.target.value)}
          />
        </Campo>
        <Campo label="Puerto de Origen">
          <input
            className={inputCls}
            placeholder="PUERTO DE ORIGEN"
            value={form.puertoOrigen}
            onChange={(e) => setCampo('puertoOrigen', e.target.value)}
          />
        </Campo>
        <Campo label="Puerto de Arribo">
          <input
            className={inputCls}
            placeholder="PUERTO DE ARRIBO"
            value={form.puertoArribo}
            onChange={(e) => setCampo('puertoArribo', e.target.value)}
          />
        </Campo>
        <Campo label="Registro">
          <input
            className={inputCls}
            placeholder="REGISTRO"
            value={form.registro}
            onChange={(e) => setCampo('registro', e.target.value)}
          />
        </Campo>
        <Campo label="Doc. Transporte">
          <input
            className={inputCls}
            placeholder="DOC. TRANSPORTE / BL"
            value={form.docTransporte}
            onChange={(e) => setCampo('docTransporte', e.target.value)}
          />
        </Campo>
      </Seccion>

      <Seccion titulo="Transporte interior">
        <Campo label="Transportadora">
          <input
            className={inputCls}
            placeholder="TRANSPORTADORA"
            value={form.transportadora}
            onChange={(e) => setCampo('transportadora', e.target.value)}
          />
        </Campo>
        <Campo label="Remesa / Remisión">
          <input
            className={inputCls}
            placeholder="REMESA / REMISIÓN"
            value={form.remesa}
            onChange={(e) => setCampo('remesa', e.target.value)}
          />
        </Campo>
        <Campo label="Conductor">
          <input
            className={inputCls}
            placeholder="CONDUCTOR"
            value={form.conductor}
            onChange={(e) => setCampo('conductor', e.target.value)}
          />
        </Campo>
        <Campo label="Cédula">
          <input
            className={inputCls}
            placeholder="CÉDULA"
            value={form.cedula}
            onChange={(e) => setCampo('cedula', e.target.value)}
          />
        </Campo>
        <Campo label="Placa">
          <input
            className={inputCls}
            placeholder="XXX111"
            value={form.placa}
            onChange={(e) => setCampo('placa', e.target.value)}
          />
        </Campo>
        <Campo label="Modelo">
          <input
            className={inputCls}
            placeholder="MODELO"
            value={form.modelo}
            onChange={(e) => setCampo('modelo', e.target.value)}
          />
        </Campo>
        <Campo label="Marca">
          <input
            className={inputCls}
            placeholder="MARCA"
            value={form.marca}
            onChange={(e) => setCampo('marca', e.target.value)}
          />
        </Campo>
        <Campo label="Celular">
          <input
            type="tel"
            className={inputCls}
            placeholder="CELULAR"
            value={form.celular}
            onChange={(e) => setCampo('celular', e.target.value)}
          />
        </Campo>
        <Campo label="Origen Despacho">
          <input
            className={inputCls}
            placeholder="ORIGEN DESPACHO"
            value={form.origenDespacho}
            onChange={(e) => setCampo('origenDespacho', e.target.value)}
          />
        </Campo>
        <Campo label="Destino Despacho">
          <input
            className={inputCls}
            placeholder="DESTINO DESPACHO"
            value={form.destinoDespacho}
            onChange={(e) => setCampo('destinoDespacho', e.target.value)}
          />
        </Campo>
        <Campo label="Carta de Porte" className="lg:col-span-2">
          <input
            className={inputCls}
            placeholder="CARTA DE PORTE"
            value={form.cartaPorte}
            onChange={(e) => setCampo('cartaPorte', e.target.value)}
          />
        </Campo>
      </Seccion>

      <Seccion titulo="Detalle de inspección" cols={3}>
        <Campo label="Lugar de Reconocimiento" obligatorio>
          <input
            className={inputCls}
            placeholder="LUGAR DE RECONOCIMIENTO"
            value={form.lugarReconocimiento}
            onChange={(e) => setCampo('lugarReconocimiento', e.target.value)}
          />
        </Campo>
        <Campo label="Contacto" obligatorio>
          <input
            className={inputCls}
            placeholder="CONTACTO"
            value={form.contacto}
            onChange={(e) => setCampo('contacto', e.target.value)}
          />
        </Campo>
        <Campo label="Peso Tara (kg)">
          <input
            type="number"
            className={inputCls}
            placeholder="Peso Tara"
            min="0"
            step="0.01"
            value={form.pesoTara}
            onChange={(e) => setCampo('pesoTara', e.target.value)}
          />
        </Campo>
        <Campo label="Peso Neto (kg)">
          <input
            type="number"
            className={inputCls}
            placeholder="Peso Neto"
            min="0"
            step="0.01"
            value={form.pesoNeto}
            onChange={(e) => setCampo('pesoNeto', e.target.value)}
          />
        </Campo>
        <Campo label="Peso Bruto (kg)">
          <input
            type="number"
            className={inputCls}
            placeholder="Peso Bruto"
            min="0"
            step="0.01"
            value={form.pesoBruto}
            onChange={(e) => setCampo('pesoBruto', e.target.value)}
          />
        </Campo>
        <Campo label="Avería SI / NO" obligatorio>
          <select
            className={inputCls}
            value={form.averiaSiNo}
            onChange={(e) => setCampo('averiaSiNo', e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </Campo>
        <SelectorCatalogoPuertos
          label="Tipo de Avería"
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
        observaciones={form.observaciones}
        recomendaciones={form.recomendaciones}
        onChange={(campo, valor) => setCampo(campo, valor)}
        soloLectura={soloLectura}
      />

      <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-600">
        <BotonesAccion
          onGrabar={handleGrabar}
          onPdf={handlePdf}
          onLimpiar={handleLimpiar}
          guardando={guardando}
          generandoPdf={generandoPdf}
          soloLectura={soloLectura}
        />
      </div>
    </div>
  );
}
