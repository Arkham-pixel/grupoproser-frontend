import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaFileExcel, FaSave, FaSync, FaUndo, FaUpload } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../../config/apiConfig.js';
import {
  crearCasoZurich,
  actualizarCasoZurich,
  importarCasosZurich,
  syncZurichDesdeExpress,
} from '../../services/zurichService.js';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBadge,
  expressBtnGhost,
  expressBtnPrimary,
  expressCard,
  expressCardBody,
  expressCardHeader,
  expressFormSection,
  expressPageSubtitle,
  expressPageTitle,
  expressPageWrap,
  expressScope,
  expressSectionTitle,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  Campo,
  InputFenix,
  SelectFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  CAMPOS_NUMERICOS_ZURICH,
  CAMPOS_DECIMAL_ZURICH,
  ESTADOS_ZURICH,
  FORM_VACIO_ZURICH,
  GRADOS_AFECTACION_ZURICH,
  OPCIONES_SI_NO_ZURICH,
  TIPOS_NEGOCIO_HOMOLOGADO_ZURICH,
  construirFormDesdecasoZurich,
  formatMilesInput,
  normalizeEvidenciaCat,
} from './zurichHelpers.js';
import { parsearCasosZurichDesdeExcel } from './importarZurichExcel.js';
import CampoTomadorZurich from './CampoTomadorZurich.jsx';

const ZurichRoot = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

const aNumero = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return null;
  const n = Number(String(valor).replace(/\./g, '').replace(/[^\d-]/g, ''));
  return Number.isNaN(n) ? null : n;
};

const normTxt = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase();

const opcionHuerfana = (valor, opciones = []) => {
  const v = String(valor || '').trim();
  if (!v) return false;
  return !opciones.some((op) => normTxt(op) === normTxt(v));
};

const FormularioZurich = ({ initialData = null, embed = false, onClose, onSaved }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const esEdicion = Boolean(initialData?._id);
  const [form, setForm] = useState(() =>
    initialData ? construirFormDesdecasoZurich(initialData) : { ...FORM_VACIO_ZURICH }
  );
  const [guardando, setGuardando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [resumenImport, setResumenImport] = useState(null);
  const [ciudadesRaw, setCiudadesRaw] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);

  useEffect(() => {
    setForm(initialData ? construirFormDesdecasoZurich(initialData) : { ...FORM_VACIO_ZURICH });
    setError(null);
    setExito(null);
    setResumenImport(null);
  }, [initialData]);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      setCargandoCatalogos(true);
      try {
        const [resCiudades, resResp] = await Promise.all([
          fetch(`${BASE_URL}/api/ciudades`),
          fetch(`${BASE_URL}/api/responsables`),
        ]);
        const dataCiudades = await resCiudades.json().catch(() => ({}));
        const dataResp = await resResp.json().catch(() => ({}));
        if (cancelado) return;
        const lista = Array.isArray(dataCiudades?.data)
          ? dataCiudades.data
          : Array.isArray(dataCiudades)
            ? dataCiudades
            : [];
        setCiudadesRaw(
          lista
            .map((c) => ({
              ciudad: String(c.descMunicipio || c.label || c.nombre || '').trim(),
              departamento: String(c.descDepto || c.departamento || '').trim(),
            }))
            .filter((c) => c.ciudad)
        );
        const listaResp = Array.isArray(dataResp?.data)
          ? dataResp.data
          : Array.isArray(dataResp)
            ? dataResp
            : [];
        setResponsables(
          listaResp
            .map((r) => {
              const codigo = String(r.codiRespnsble ?? r.codigo ?? r.value ?? r._id ?? '').trim();
              const nombre = String(
                r.nmbrRespnsble || r.nombre || r.nombreResponsable || r.label || ''
              ).trim();
              if (!nombre) return null;
              return {
                // Guardar y mostrar por nombre (alertas resuelven también por nombre)
                value: nombre,
                label: nombre,
                codigo,
              };
            })
            .filter(Boolean)
            .filter((r, idx, arr) => arr.findIndex((x) => x.value === r.value) === idx)
            .sort((a, b) => a.label.localeCompare(b.label, 'es'))
        );
      } catch (err) {
        if (!cancelado) console.error('Error cargando catálogos Zurich:', err);
      } finally {
        if (!cancelado) setCargandoCatalogos(false);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  const departamentos = useMemo(() => {
    const map = new Map();
    for (const c of ciudadesRaw) {
      if (!c.departamento) continue;
      const key = normTxt(c.departamento);
      if (!map.has(key)) map.set(key, c.departamento);
    }
    return [...map.values()].sort((a, b) => a.localeCompare(b, 'es'));
  }, [ciudadesRaw]);

  const ciudadesFiltradas = useMemo(() => {
    const depto = normTxt(form.departamento);
    const lista = depto
      ? ciudadesRaw.filter((c) => normTxt(c.departamento) === depto)
      : ciudadesRaw;
    const unicas = new Map();
    for (const c of lista) {
      const key = normTxt(c.ciudad);
      if (!unicas.has(key)) unicas.set(key, c.ciudad);
    }
    return [...unicas.values()].sort((a, b) => a.localeCompare(b, 'es'));
  }, [ciudadesRaw, form.departamento]);

  const setCampo = (clave) => (e) => {
    const valor = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [clave]: valor }));
  };

  const setDepartamento = (e) => {
    const valor = e?.target ? e.target.value : e;
    setForm((prev) => {
      const siguiente = { ...prev, departamento: valor };
      const deptoNorm = normTxt(valor);
      const ciudadSigueValida =
        !prev.ciudad ||
        ciudadesRaw.some(
          (c) =>
            normTxt(c.departamento) === deptoNorm && normTxt(c.ciudad) === normTxt(prev.ciudad)
        );
      if (!ciudadSigueValida) siguiente.ciudad = '';
      return siguiente;
    });
  };

  const setCampoMiles = (clave) => (e) => {
    const valor = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [clave]: formatMilesInput(valor) }));
  };

  const camposNumericos = useMemo(() => CAMPOS_NUMERICOS_ZURICH, []);

  const inputMiles = (clave) => (
    <InputFenix
      type="text"
      inputMode="numeric"
      value={form[clave]}
      onChange={setCampoMiles(clave)}
      placeholder="0"
    />
  );

  const construirPayload = () => {
    const payload = { ...form };
    camposNumericos.forEach((clave) => {
      payload[clave] = aNumero(payload[clave]);
    });
    CAMPOS_DECIMAL_ZURICH.forEach((clave) => {
      const raw = String(payload[clave] ?? '').trim().replace(',', '.');
      if (!raw) {
        payload[clave] = null;
        return;
      }
      const n = Number(raw);
      payload[clave] = Number.isNaN(n) ? null : n;
    });
    const sev = String(form.severidadCat || '').trim();
    payload.severidadCat = sev ? Number(sev) : null;
    payload.evidenciaCat = normalizeEvidenciaCat(form.evidenciaCat);
    if (!String(payload.identificacion || '').trim() && payload.riskId) {
      payload.identificacion = String(payload.riskId).trim();
    }
    return payload;
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    setExito(null);
    setResumenImport(null);
    setImportando(true);
    try {
      const { casos, hoja } = await parsearCasosZurichDesdeExcel(file);
      if (!casos.length) {
        throw new Error(t('zurich.bulk.emptyFile'));
      }
      const resumen = await importarCasosZurich(casos);
      setResumenImport({ ...resumen, hoja, archivo: file.name });
      setExito(
        t('zurich.bulk.success', {
          created: resumen.creados ?? 0,
          updated: resumen.actualizados ?? 0,
          skipped: resumen.omitidos ?? 0,
        })
      );
      if (onSaved) await onSaved(resumen);
    } catch (err) {
      console.error('Error importando Zurich:', err);
      setError(err.message || t('zurich.bulk.error'));
    } finally {
      setImportando(false);
    }
  };

  const handleSyncExpress = async () => {
    setError(null);
    setExito(null);
    setResumenImport(null);
    setImportando(true);
    try {
      const resumen = await syncZurichDesdeExpress();
      setResumenImport({
        totalRecibidos: resumen.totalExpress ?? 0,
        creados: resumen.creados ?? 0,
        actualizados: resumen.actualizados ?? 0,
        omitidos: resumen.omitidos ?? 0,
        errores: resumen.errores || [],
        hoja: 'EXPRESS',
        archivo: 'SiniestroExpress',
      });
      setExito(
        t('zurich.bulk.syncExpressSuccess', {
          created: resumen.creados ?? 0,
          updated: resumen.actualizados ?? 0,
          skipped: resumen.omitidos ?? 0,
        })
      );
      if (onSaved) await onSaved(resumen);
    } catch (err) {
      console.error('Error sync Express → Zurich:', err);
      setError(err.message || t('zurich.bulk.syncExpressError'));
    } finally {
      setImportando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (!form.identificacion.trim() && !String(form.riskId || '').trim()) {
      setError(t('zurich.validation.identificacionOrRiskRequired', {
        defaultValue: 'Indique identificación o Risk ID',
      }));
      return;
    }
    if (!form.estado.trim()) {
      setError(t('zurich.validation.statusRequired'));
      return;
    }

    setGuardando(true);
    try {
      const payload = construirPayload();
      let guardado;
      if (esEdicion) {
        guardado = await actualizarCasoZurich(initialData._id, payload);
      } else {
        guardado = await crearCasoZurich(payload);
      }
      setExito(
        esEdicion
          ? t('zurich.messages.caseUpdated', { caseNumber: guardado.consecutivo || '' })
          : t('zurich.messages.caseCreated', { caseNumber: guardado.consecutivo || '' })
      );
      if (!esEdicion) {
        setForm({ ...FORM_VACIO_ZURICH });
      }
      if (onSaved) await onSaved(guardado);
    } catch (err) {
      console.error('Error guardando caso Zurich:', err);
      setError(err.message || t('zurich.messages.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  const limpiar = () => {
    setForm(initialData ? construirFormDesdecasoZurich(initialData) : { ...FORM_VACIO_ZURICH });
    setError(null);
    setExito(null);
  };

  const selectSimple = (clave, opciones, placeholder = t('common.select')) => (
    <SelectFenix value={form[clave]} onChange={setCampo(clave)}>
      <option value="">{placeholder}</option>
      {opciones.map((op) => (
        <option key={op} value={op}>
          {op}
        </option>
      ))}
      {form[clave] && !opciones.includes(form[clave]) && (
        <option value={form[clave]}>{form[clave]}</option>
      )}
    </SelectFenix>
  );

  const contenidoFormulario = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className={expressAlertError}>{error}</div>}
      {exito && <div className={expressAlertSuccess}>{exito}</div>}

      {/* CAT Zurich — campos del Excel CAT_ZURICH */}
      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('zurich.sections.catZurich')}</h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('zurich.sections.catZurichHint')}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('zurich.fields.asegurado')}>
            <InputFenix value={form.asegurado} onChange={setCampo('asegurado')} />
          </Campo>
          <Campo label={t('zurich.fields.riskId')}>
            <InputFenix value={form.riskId} onChange={setCampo('riskId')} placeholder="Ej: 3518" />
          </Campo>
          <Campo label={t('zurich.fields.distanciaEpicentroKm')}>
            <InputFenix
              type="text"
              inputMode="decimal"
              value={form.distanciaEpicentroKm}
              onChange={setCampo('distanciaEpicentroKm')}
              placeholder="Ej: 77.92"
            />
          </Campo>
          <Campo label={t('zurich.fields.tipoNegocioHomologado')}>
            {selectSimple('tipoNegocioHomologado', TIPOS_NEGOCIO_HOMOLOGADO_ZURICH)}
          </Campo>
          <Campo label={t('zurich.fields.catUbicacionReferencia')}>
            <InputFenix
              value={form.catUbicacionReferencia}
              onChange={setCampo('catUbicacionReferencia')}
              placeholder="Ej: Pereira, Cali…"
            />
          </Campo>
          <Campo label={t('zurich.fields.addressNumber')}>
            <InputFenix value={form.addressNumber} onChange={setCampo('addressNumber')} />
          </Campo>
          <Campo label={t('zurich.fields.direccionInspeccionSugerida')} className="md:col-span-2 lg:col-span-3">
            <InputFenix
              value={form.direccionInspeccionSugerida}
              onChange={setCampo('direccionInspeccionSugerida')}
            />
          </Campo>
          <Campo label={t('zurich.fields.linkGoogleMaps')} className="md:col-span-2 lg:col-span-3">
            <InputFenix
              value={form.linkGoogleMaps}
              onChange={setCampo('linkGoogleMaps')}
              placeholder="https://www.google.com/maps/…"
            />
          </Campo>
          <Campo label={t('zurich.fields.grupoInspeccion')}>
            <InputFenix value={form.grupoInspeccion} onChange={setCampo('grupoInspeccion')} />
          </Campo>
          <Campo label={t('zurich.fields.afectacion')}>
            {selectSimple('afectacion', OPCIONES_SI_NO_ZURICH)}
          </Campo>
          <Campo label={t('zurich.fields.gradoAfectacion')}>
            {selectSimple('gradoAfectacion', GRADOS_AFECTACION_ZURICH)}
          </Campo>
          <Campo label={t('zurich.fields.lucroCesante')}>
            {selectSimple('lucroCesante', OPCIONES_SI_NO_ZURICH)}
          </Campo>
          <Campo label={t('zurich.fields.fechaInspeccion')}>
            <InputFenix
              type="date"
              value={form.fechaInspeccion}
              onChange={setCampo('fechaInspeccion')}
            />
          </Campo>
          <Campo label={t('zurich.fields.estado')} required>
            {selectSimple('estado', ESTADOS_ZURICH)}
          </Campo>
          <Campo label={t('zurich.fields.observacionesCat')} className="md:col-span-2 lg:col-span-3">
            <textarea
              className="min-h-[88px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-body text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              value={form.observacionesCat}
              onChange={setCampo('observacionesCat')}
              placeholder={t('zurich.placeholders.observacionesCat')}
            />
          </Campo>
        </div>
      </section>

      {/* Información general (personas / póliza) — desplegable */}
      <details className={`${expressFormSection} group`}>
        <summary className="cursor-pointer list-none font-heading text-base font-bold text-gray-900 marker:content-none dark:text-white">
          <span className="inline-flex items-center gap-2">
            <span className="text-fenix-primario transition group-open:rotate-90">▸</span>
            {t('zurich.sections.generalInfo')}
          </span>
          <p className="mt-1 font-body text-sm font-normal text-gray-500">
            {t('zurich.sections.generalInfoHint')}
          </p>
        </summary>

        <div className="mt-4 space-y-5 border-t border-gray-200 pt-4 dark:border-gray-700">
          <section>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              {t('zurich.sections.identification')}
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Campo label={t('zurich.fields.siniestro')}>
                <InputFenix
                  value={form.siniestro}
                  onChange={setCampo('siniestro')}
                  placeholder={t('zurich.placeholders.siniestro')}
                />
              </Campo>
              <Campo label={t('zurich.fields.identificacion')}>
                <InputFenix
                  value={form.identificacion}
                  onChange={setCampo('identificacion')}
                  placeholder={t('zurich.placeholders.identificacion')}
                />
              </Campo>
              <CampoTomadorZurich
                value={form.tomador}
                onChange={(valor) => setForm((prev) => ({ ...prev, tomador: valor }))}
              />
              <Campo label={t('zurich.fields.direccionPredio')}>
                <InputFenix value={form.direccionPredio} onChange={setCampo('direccionPredio')} />
              </Campo>
              <Campo label={t('zurich.fields.informacionContacto')}>
                <InputFenix
                  value={form.informacionContacto}
                  onChange={setCampo('informacionContacto')}
                  placeholder={t('zurich.placeholders.contacto')}
                />
              </Campo>
              <Campo label={t('zurich.fields.correo')}>
                <InputFenix
                  type="email"
                  value={form.correo}
                  onChange={setCampo('correo')}
                  placeholder={t('zurich.placeholders.correo')}
                />
              </Campo>
              <Campo label={t('zurich.fields.celular')}>
                <InputFenix
                  value={form.celular}
                  onChange={setCampo('celular')}
                  placeholder={t('zurich.placeholders.celular')}
                />
              </Campo>
              <Campo label={t('zurich.fields.canalRadicacion')}>
                <InputFenix
                  value={form.canalRadicacion}
                  onChange={setCampo('canalRadicacion')}
                  placeholder="Ej: Zurich"
                />
              </Campo>
              <Campo label={t('zurich.fields.departamento')}>
                <SelectFenix
                  value={form.departamento}
                  onChange={setDepartamento}
                  disabled={cargandoCatalogos && departamentos.length === 0}
                >
                  <option value="">{t('common.select')}</option>
                  {opcionHuerfana(form.departamento, departamentos) && (
                    <option value={form.departamento}>{form.departamento}</option>
                  )}
                  {departamentos.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={t('zurich.fields.ciudad')}>
                <SelectFenix
                  value={form.ciudad}
                  onChange={setCampo('ciudad')}
                  disabled={cargandoCatalogos && ciudadesFiltradas.length === 0}
                >
                  <option value="">
                    {form.departamento
                      ? t('zurich.placeholders.selectCity')
                      : t('zurich.placeholders.selectDepartmentFirst')}
                  </option>
                  {opcionHuerfana(form.ciudad, ciudadesFiltradas) && (
                    <option value={form.ciudad}>{form.ciudad}</option>
                  )}
                  {ciudadesFiltradas.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={t('zurich.fields.ajustador')}>
                <SelectFenix value={form.ajustador} onChange={setCampo('ajustador')}>
                  <option value="">{t('common.select')}</option>
                  {form.ajustador &&
                    !responsables.some(
                      (r) => r.value === form.ajustador || r.codigo === form.ajustador
                    ) && <option value={form.ajustador}>{form.ajustador}</option>}
                  {responsables.map((r) => (
                    <option key={r.codigo || r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
            </div>
          </section>

          <section>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              {t('zurich.sections.policyCoverage')}
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Campo label={t('zurich.fields.numeroPoliza')}>
                <InputFenix
                  value={form.numeroPoliza}
                  onChange={setCampo('numeroPoliza')}
                  placeholder={t('zurich.placeholders.poliza')}
                />
              </Campo>
              <Campo label={t('zurich.fields.fechaInicioPoliza')}>
                <InputFenix
                  type="date"
                  value={form.fechaInicioPoliza}
                  onChange={setCampo('fechaInicioPoliza')}
                />
              </Campo>
              <Campo label={t('zurich.fields.fechaFinPoliza')}>
                <InputFenix
                  type="date"
                  value={form.fechaFinPoliza}
                  onChange={setCampo('fechaFinPoliza')}
                />
              </Campo>
              <Campo label={t('zurich.fields.numeroCredito')}>
                <InputFenix value={form.numeroCredito} onChange={setCampo('numeroCredito')} />
              </Campo>
              <Campo label={t('zurich.fields.cobertura')}>
                <InputFenix
                  value={form.cobertura}
                  onChange={setCampo('cobertura')}
                  placeholder={t('zurich.placeholders.cobertura')}
                />
              </Campo>
              <Campo label={t('zurich.fields.estadoPagoPrimas')}>
                <InputFenix
                  value={form.estadoPagoPrimas}
                  onChange={setCampo('estadoPagoPrimas')}
                  placeholder={t('zurich.placeholders.estadoPagoPrimas')}
                />
              </Campo>
            </div>
          </section>

          <section>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              {t('zurich.sections.values')}
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Campo label={t('zurich.fields.valorAseguradoInmueble')}>
                {inputMiles('valorAseguradoInmueble')}
              </Campo>
              <Campo label={t('zurich.fields.valorAseguradoContenidos')}>
                {inputMiles('valorAseguradoContenidos')}
              </Campo>
              <Campo label={t('zurich.fields.valorReservaPreventivaPromedio')}>
                {inputMiles('valorReservaPreventivaPromedio')}
              </Campo>
              <Campo label={t('zurich.fields.valorComercialInmueble')}>
                {inputMiles('valorComercialInmueble')}
              </Campo>
              <Campo label={t('zurich.fields.reserva')}>{inputMiles('reserva')}</Campo>
              <Campo label={t('zurich.fields.valorReclamado')}>
                {inputMiles('valorReclamado')}
              </Campo>
              <Campo label={t('zurich.fields.valorLiquidado')}>
                {inputMiles('valorLiquidado')}
              </Campo>
            </div>
          </section>

          <section>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              {t('zurich.sections.dates')}
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Campo label={t('zurich.fields.fechaSiniestro')}>
                <InputFenix
                  type="date"
                  value={form.fechaSiniestro}
                  onChange={setCampo('fechaSiniestro')}
                />
              </Campo>
              <Campo label={t('zurich.fields.fechaUltimoDocumento')}>
                <InputFenix
                  type="date"
                  value={form.fechaUltimoDocumento}
                  onChange={setCampo('fechaUltimoDocumento')}
                />
              </Campo>
              <Campo label={t('zurich.fields.fechaLiquidado')}>
                <InputFenix
                  type="date"
                  value={form.fechaLiquidado}
                  onChange={setCampo('fechaLiquidado')}
                />
              </Campo>
              <Campo label={t('zurich.fields.fechaAceptacionLiquidacion')}>
                <InputFenix
                  type="date"
                  value={form.fechaAceptacionLiquidacion}
                  onChange={setCampo('fechaAceptacionLiquidacion')}
                />
              </Campo>
              <Campo label={t('zurich.fields.fechaEnvioAseguradora')}>
                <InputFenix
                  type="date"
                  value={form.fechaEnvioAseguradora}
                  onChange={setCampo('fechaEnvioAseguradora')}
                />
              </Campo>
            </div>
          </section>
        </div>
      </details>

      <div className="flex flex-col justify-end gap-2 sm:flex-row">
        {embed && onClose && (
          <button type="button" className={expressBtnGhost} onClick={onClose} disabled={guardando}>
            {t('common.close')}
          </button>
        )}
        <button type="button" className={expressBtnGhost} onClick={limpiar} disabled={guardando}>
          <FaUndo />
          {esEdicion ? t('zurich.actions.reset') : t('zurich.actions.clear')}
        </button>
        <button type="submit" className={expressBtnPrimary} disabled={guardando}>
          <FaSave />
          {guardando
            ? t('zurich.actions.saving')
            : esEdicion
              ? t('zurich.actions.saveChanges')
              : t('zurich.actions.saveCase')}
        </button>
      </div>
    </form>
  );

  if (embed) {
    return <div className={`${expressScope}`}>{contenidoFormulario}</div>;
  }

  return (
    <div className={`${ZurichRoot} ${expressScope}`}>
      <div className={expressPageWrap}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className={expressBadge}>Zurich</span>
            <div>
              <h1 className={expressPageTitle}>{t('zurich.page.addTitle')}</h1>
              <p className={expressPageSubtitle}>{t('zurich.page.addSubtitle')}</p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm">
                {t('nav.zurichAddCase')}
              </span>
              <Link
                to="/zurich/reporte"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                {t('nav.zurichReport')}
              </Link>
            </nav>
          </div>
        </header>

        {error && <div className={expressAlertError}>{error}</div>}
        {exito && <div className={expressAlertSuccess}>{exito}</div>}

        <section className={expressCard}>
          <div className={expressCardHeader}>
            <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
              {t('zurich.bulk.title')}
            </h2>
          </div>
          <div className={expressCardBody}>
            <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-300">
              {t('zurich.bulk.subtitle')}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm,.xls"
              className="hidden"
              onChange={handleImportExcel}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={importando || guardando}
                onClick={() => fileInputRef.current?.click()}
              >
                <FaUpload />
                {importando ? t('zurich.bulk.importing') : t('zurich.bulk.upload')}
              </button>
              <button
                type="button"
                className={expressBtnGhost}
                disabled={importando || guardando}
                onClick={handleSyncExpress}
              >
                <FaSync />
                {t('zurich.bulk.syncExpress')}
              </button>
              <span className="inline-flex items-center gap-2 font-body text-xs text-gray-500 dark:text-gray-400">
                <FaFileExcel />
                {t('zurich.bulk.hint')}
              </span>
            </div>
            <p className="mt-2 font-body text-xs text-gray-500 dark:text-gray-400">
              {t('zurich.bulk.syncExpressHint')}
            </p>
            {resumenImport && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                  <p className="font-body text-xs text-gray-500">{t('zurich.bulk.received')}</p>
                  <p className="font-heading text-xl font-bold">{resumenImport.totalRecibidos ?? 0}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                  <p className="font-body text-xs text-gray-500">{t('zurich.bulk.created')}</p>
                  <p className="font-heading text-xl font-bold text-fenix-primario">
                    {resumenImport.creados ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                  <p className="font-body text-xs text-gray-500">{t('zurich.bulk.updated')}</p>
                  <p className="font-heading text-xl font-bold text-gray-800 dark:text-gray-100">
                    {resumenImport.actualizados ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                  <p className="font-body text-xs text-gray-500">{t('zurich.bulk.skipped')}</p>
                  <p className="font-heading text-xl font-bold text-gray-600 dark:text-gray-300">
                    {resumenImport.omitidos ?? 0}
                  </p>
                </div>
              </div>
            )}
            {Array.isArray(resumenImport?.errores) && resumenImport.errores.length > 0 && (
              <details className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
                <summary className="cursor-pointer font-semibold text-amber-800 dark:text-amber-200">
                  {t('zurich.bulk.errorsTitle', { count: resumenImport.errores.length })}
                </summary>
                <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-amber-900 dark:text-amber-100">
                  {resumenImport.errores.slice(0, 50).map((errItem) => (
                    <li key={`${errItem.fila}-${errItem.motivo}`}>
                      {t('zurich.bulk.errorRow', {
                        row: errItem.fila,
                        reason: errItem.motivo,
                      })}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </section>

        <section className={expressCard}>
          <div className={expressCardHeader}>
            <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
              {esEdicion
                ? t('zurich.page.editCase', { caseNumber: initialData?.consecutivo || '' })
                : t('zurich.page.newCase')}
            </h2>
          </div>
          <div className={expressCardBody}>{contenidoFormulario}</div>
        </section>
      </div>
    </div>
  );
};

export default FormularioZurich;
