import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaFileExcel, FaSave, FaUndo, FaUpload } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../../config/apiConfig.js';
import {
  crearCasoZurich,
  actualizarCasoZurich,
} from '../../services/zurichService.js';
import {
  crearCasoZurichListado,
  actualizarCasoZurichListado,
} from '../../services/zurichListadoService.js';
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
  TIPOS_IDENTIFICACION_ZURICH,
  TIPOS_POLIZA_ZURICH,
  GRADOS_AFECTACION_ZURICH,
  OPCIONES_SI_NO_ZURICH,
  TIPOS_NEGOCIO_HOMOLOGADO_ZURICH,
  construirFormDesdecasoZurich,
  formatMilesInput,
  normalizeEvidenciaCat,
} from './zurichHelpers.js';
import CampoTomadorZurich from './CampoTomadorZurich.jsx';
import ModalImportarExcelZurich, {
  esAdminOSoporteZurich,
} from './ModalImportarExcelZurich.jsx';
import CamposAsignacionCaso from '../shared/CamposAsignacionCaso.jsx';
import SelectBuscable from '../SelectBuscable.jsx';
import { obtenerRolAlmacenado } from '../../config/roles.js';
import {
  attrsCampoCaso,
  esRolInspector,
  filtrarPayloadCasoPorRol,
  obtenerContextoPermisoCaso,
  puedeEditarCampoCaso,
} from '../../utils/permisosCasoPorRol.js';
import {
  filtrarLideresPorModulo,
  filtrarOpcionesPorCiudad,
  asegurarOpcionActual,
  mapCatalogoCatastroficoAOpciones,
  mapResponsablesAOpciones,
  resolverLiderPorModulo,
} from '../../utils/catalogosAsignacionCatastrofico.js';
import useArnaldFormDraft from '../../hooks/useArnaldFormDraft.js';
import ArnaldDraftChrome from '../ArnaldDraftChrome.jsx';

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

const FormularioZurich = ({ initialData = null, embed = false, origen = 'cat', onClose, onSaved }) => {
  const { t } = useTranslation();
  const rolUsuario = obtenerRolAlmacenado();
  const ctxPermiso = useMemo(() => obtenerContextoPermisoCaso('zurich'), []);
  const soloInspector = esRolInspector(rolUsuario);
  const esEdicion = Boolean(initialData?._id);
  const esModuloListado = origen === 'listado';
  const puedeImportarExcel = esAdminOSoporteZurich();
  const esAltaCliente = esModuloListado && !esEdicion;
  const [form, setForm] = useState(() =>
    initialData ? construirFormDesdecasoZurich(initialData) : { ...FORM_VACIO_ZURICH }
  );
  const [guardando, setGuardando] = useState(false);
  const [modalImportOpen, setModalImportOpen] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [resumenImport, setResumenImport] = useState(null);
  const [ciudadesRaw, setCiudadesRaw] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [ajustadoresCat, setAjustadoresCat] = useState([]);
  const [inspectoresCat, setInspectoresCat] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [draftToRestore, setDraftToRestore] = useState(null);
  const formKey = esEdicion
    ? `zurich:${origen}:${initialData._id}`
    : `zurich:${origen}:nuevo`;
  const onDraftRestoreAvailable = useCallback((info) => {
    setDraftToRestore(info);
    setShowDraftRestore(true);
  }, []);
  const { draftStatus, lastDraftAt, discardDraft, consumeDraft } = useArnaldFormDraft({
    formKey,
    modulo: 'zurich',
    recursoId: initialData?._id || '',
    titulo: 'Caso Zurich',
    formData: form,
    enabled: true,
    onRestoreAvailable: onDraftRestoreAvailable,
  });

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
        const [resCiudades, resResp, resAj, resIns] = await Promise.all([
          fetch(`${BASE_URL}/api/ciudades`),
          fetch(`${BASE_URL}/api/responsables`),
          fetch(`${BASE_URL}/api/ajustadores-catastrofico`),
          fetch(`${BASE_URL}/api/inspectores-catastrofico`),
        ]);
        const dataCiudades = await resCiudades.json().catch(() => ({}));
        const dataResp = await resResp.json().catch(() => ({}));
        const dataAj = await resAj.json().catch(() => ({}));
        const dataIns = await resIns.json().catch(() => ({}));
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
        setResponsables(mapResponsablesAOpciones(listaResp));
        const listaAj = Array.isArray(dataAj?.data) ? dataAj.data : Array.isArray(dataAj) ? dataAj : [];
        const listaIns = Array.isArray(dataIns?.data)
          ? dataIns.data
          : Array.isArray(dataIns)
            ? dataIns
            : [];
        setAjustadoresCat(mapCatalogoCatastroficoAOpciones(listaAj));
        setInspectoresCat(mapCatalogoCatastroficoAOpciones(listaIns));
        const lideresOpts = mapResponsablesAOpciones(listaResp);
        if (!esEdicion) {
          const liderDefault = resolverLiderPorModulo(lideresOpts, 'zurich');
          if (liderDefault) {
            setForm((prev) =>
              prev.ajustadorLider ? prev : { ...prev, ajustadorLider: liderDefault }
            );
          }
        }
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

  const opcionesCiudad = useMemo(() => {
    const fuente = esModuloListado
      ? ciudadesRaw.map((c) => c.ciudad)
      : ciudadesFiltradas;
    const unicas = new Map();
    for (const ciudad of fuente) {
      const key = normTxt(ciudad);
      if (key && !unicas.has(key)) unicas.set(key, ciudad);
    }
    const base = [...unicas.values()]
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((c) => ({ value: c, label: c }));
    const actual = String(form.ciudad || '').trim();
    if (actual && !base.some((c) => normTxt(c.value) === normTxt(actual))) {
      return [{ value: actual, label: actual }, ...base];
    }
    return base;
  }, [ciudadesRaw, ciudadesFiltradas, esModuloListado, form.ciudad]);

  const ajustadoresPorCiudad = useMemo(() => {
    const filtrados = filtrarOpcionesPorCiudad(ajustadoresCat, form.ciudad);
    return asegurarOpcionActual(filtrados, form.ajustador);
  }, [ajustadoresCat, form.ciudad, form.ajustador]);
  const inspectoresPorCiudad = useMemo(() => {
    const filtrados = filtrarOpcionesPorCiudad(inspectoresCat, form.ciudad);
    return asegurarOpcionActual(filtrados, form.inspector);
  }, [inspectoresCat, form.ciudad, form.inspector]);
  const lideresZurich = useMemo(
    () => filtrarLideresPorModulo(responsables, 'zurich'),
    [responsables]
  );

  const setCampo = (clave) => (e) => {
    if (!puedeEditarCampoCaso(rolUsuario, clave, ctxPermiso)) return;
    const valor = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [clave]: valor }));
  };

  const setDepartamento = (e) => {
    if (!puedeEditarCampoCaso(rolUsuario, 'departamento', ctxPermiso)) return;
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
    if (!puedeEditarCampoCaso(rolUsuario, clave, ctxPermiso)) return;
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
      {...attrsCampoCaso(rolUsuario, clave, ctxPermiso)}
    />
  );

  const construirPayload = () => {
    if (esModuloListado) {
      const payload = {
        zc: form.zc,
        siniestro: form.siniestro,
        identificacion: form.identificacion,
        tipoIdentificacion: form.tipoIdentificacion,
        numeroPoliza: form.numeroPoliza,
        tipoPoliza: form.tipoPoliza,
        causa: form.causa,
        asegurado: form.asegurado,
        intermediario: form.intermediario,
        correoIntermediario: form.correoIntermediario,
        telefonoIntermediario: form.telefonoIntermediario,
        contactoIntermediario: [form.intermediario, form.correoIntermediario, form.telefonoIntermediario]
          .map((x) => String(x || '').trim())
          .filter(Boolean)
          .join(' | ') || form.contactoIntermediario,
        contactoAsegurado: form.contactoAsegurado,
        observaciones: form.observaciones,
        ciudad: form.ciudad,
        departamento: form.departamento,
        ajustadorLider: form.ajustadorLider,
        ajustador: form.ajustador,
        inspector: form.inspector,
        fechaAsignacion: form.fechaAsignacion,
        fechaVisita: form.fechaVisita,
        estado: form.estado,
      };
      if (!String(payload.identificacion || '').trim()) {
        if (payload.zc) payload.identificacion = String(payload.zc).trim();
        else if (payload.siniestro) payload.identificacion = String(payload.siniestro).trim();
      }
      return payload;
    }
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
    if (!String(payload.identificacion || '').trim()) {
      if (payload.zc) payload.identificacion = String(payload.zc).trim();
      else if (payload.siniestro) payload.identificacion = String(payload.siniestro).trim();
      else if (payload.riskId) payload.identificacion = String(payload.riskId).trim();
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (esModuloListado) {
      if (!String(form.zc || '').trim() && !String(form.siniestro || '').trim()) {
        setError(t('zurich.validation.zcOrStroRequired'));
        return;
      }
    } else if (!form.identificacion.trim() && !String(form.riskId || '').trim() && !String(form.zc || '').trim()) {
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
      const bruto = construirPayload();
      const { payload } = filtrarPayloadCasoPorRol(
        rolUsuario,
        bruto,
        esEdicion ? initialData || {} : {},
        ctxPermiso
      );
      let guardado;
      if (esEdicion) {
        guardado = esModuloListado
          ? await actualizarCasoZurichListado(initialData._id, payload)
          : await actualizarCasoZurich(initialData._id, payload);
      } else {
        if (soloInspector) {
          setError(
            t('zurich.permissions.inspectorCannotCreate', {
              defaultValue: 'El inspector no puede crear casos; solo modificar el estado.',
            })
          );
          setGuardando(false);
          return;
        }
        guardado = esModuloListado
          ? await crearCasoZurichListado(payload)
          : await crearCasoZurich(payload);
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
      await discardDraft();
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
    <SelectFenix
      value={form[clave]}
      onChange={setCampo(clave)}
      {...attrsCampoCaso(rolUsuario, clave, ctxPermiso)}
    >
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

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('zurich.sections.listadoCliente')}</h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('zurich.sections.listadoClienteHint')}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('zurich.fields.zc')} required={esAltaCliente}>
            <InputFenix
              value={form.zc}
              onChange={setCampo('zc')}
              placeholder={t('zurich.placeholders.zc')}
            />
          </Campo>
          <Campo label={t('zurich.fields.siniestro')} required={esAltaCliente}>
            <InputFenix
              value={form.siniestro}
              onChange={setCampo('siniestro')}
              placeholder={t('zurich.placeholders.siniestro')}
            />
          </Campo>
          <Campo label={t('zurich.fields.asegurado')}>
            <InputFenix value={form.asegurado} onChange={setCampo('asegurado')} />
          </Campo>
          {esModuloListado && (
            <>
          <Campo label={t('zurich.fields.tipoIdentificacion')}>
            {selectSimple('tipoIdentificacion', TIPOS_IDENTIFICACION_ZURICH)}
          </Campo>
          <Campo label={t('zurich.fields.identificacion')}>
            <InputFenix
              value={form.identificacion}
              onChange={setCampo('identificacion')}
              placeholder={t('zurich.placeholders.identificacion')}
            />
          </Campo>
          <Campo label={t('zurich.fields.numeroPoliza')}>
            <InputFenix
              value={form.numeroPoliza}
              onChange={setCampo('numeroPoliza')}
              placeholder={t('zurich.placeholders.poliza')}
            />
          </Campo>
          <Campo label={t('zurich.fields.tipoPoliza')}>
            {selectSimple('tipoPoliza', TIPOS_POLIZA_ZURICH)}
          </Campo>
          <Campo label={t('zurich.fields.causa')} className="md:col-span-2 lg:col-span-3">
            <InputFenix
              value={form.causa}
              onChange={setCampo('causa')}
              placeholder={t('zurich.placeholders.causa')}
            />
          </Campo>
            </>
          )}
          <Campo label={t('zurich.fields.intermediario')}>
            <InputFenix
              value={form.intermediario}
              onChange={setCampo('intermediario')}
              placeholder={t('zurich.placeholders.intermediario')}
            />
          </Campo>
          <Campo label={t('zurich.fields.correoIntermediario')}>
            <InputFenix
              type="email"
              value={form.correoIntermediario}
              onChange={setCampo('correoIntermediario')}
              placeholder={t('zurich.placeholders.correoIntermediario')}
            />
          </Campo>
          <Campo label={t('zurich.fields.telefonoIntermediario')}>
            <InputFenix
              value={form.telefonoIntermediario}
              onChange={setCampo('telefonoIntermediario')}
              placeholder={t('zurich.placeholders.telefonoIntermediario')}
            />
          </Campo>
          <Campo label={t('zurich.fields.contactoAsegurado')} className="md:col-span-2 lg:col-span-3">
            <InputFenix
              value={form.contactoAsegurado}
              onChange={setCampo('contactoAsegurado')}
              placeholder={t('zurich.placeholders.contactoAsegurado')}
            />
          </Campo>
          <Campo label={t('zurich.fields.ciudad')}>
            <SelectBuscable
              options={opcionesCiudad}
              value={form.ciudad || ''}
              onChange={(val) => setCampo('ciudad')({ target: { value: val } })}
              disabled={
                attrsCampoCaso(rolUsuario, 'ciudad', ctxPermiso).disabled ||
                (cargandoCatalogos && opcionesCiudad.length === 0)
              }
              placeholder={t('zurich.placeholders.selectCity')}
              searchPlaceholder={t('common.searchEllipsis', { defaultValue: 'Buscar ciudad…' })}
              buttonClassName="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </Campo>
          <Campo label={t('zurich.fields.estado')} required>
            {selectSimple('estado', ESTADOS_ZURICH)}
          </Campo>
          <CamposAsignacionCaso
            form={form}
            setCampo={setCampo}
            lideres={lideresZurich}
            ajustadores={ajustadoresPorCiudad}
            inspectores={inspectoresPorCiudad}
            rol={rolUsuario}
            modulo="zurich"
            i18nNs="zurich"
            ciudadSeleccionada={form.ciudad}
            filtrarPorCiudad
          />
          <Campo label={t('zurich.fields.fechaAsignacion')}>
            <InputFenix
              type="date"
              value={form.fechaAsignacion}
              onChange={setCampo('fechaAsignacion')}
            />
          </Campo>
          <Campo label={t('zurich.fields.fechaVisita')}>
            <InputFenix
              type="date"
              value={form.fechaVisita}
              onChange={setCampo('fechaVisita')}
            />
          </Campo>
          <Campo label={t('zurich.fields.observaciones')} className="md:col-span-2 lg:col-span-3">
            <textarea
              className="min-h-[88px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-body text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              value={form.observaciones}
              onChange={setCampo('observaciones')}
              placeholder={t('zurich.placeholders.observaciones')}
            />
          </Campo>
        </div>
        {soloInspector ? (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
            {t('zurich.permissions.inspectorHint', {
              defaultValue:
                'Su rol de inspector solo permite ver el caso y modificar el estado.',
            })}
          </p>
        ) : null}
      </section>

      <fieldset
        disabled={soloInspector}
        className="min-w-0 space-y-5 border-0 p-0 m-0 disabled:opacity-80"
      >
      {!esModuloListado && (
      <>
      {/* CAT Zurich — campos del Excel CAT_ZURICH */}
      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('zurich.sections.catZurich')}</h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('zurich.sections.catZurichHint')}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              <Campo label={t('zurich.fields.tipoIdentificacion')}>
                {selectSimple('tipoIdentificacion', TIPOS_IDENTIFICACION_ZURICH)}
              </Campo>
              <Campo label={t('zurich.fields.identificacion')}>
                <InputFenix
                  value={form.identificacion}
                  onChange={setCampo('identificacion')}
                  placeholder={t('zurich.placeholders.identificacion')}
                />
              </Campo>
              <Campo label={t('zurich.fields.causa')}>
                <InputFenix
                  value={form.causa}
                  onChange={setCampo('causa')}
                  placeholder={t('zurich.placeholders.causa')}
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
              <Campo label={t('zurich.fields.tipoPoliza')}>
                {selectSimple('tipoPoliza', TIPOS_POLIZA_ZURICH)}
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
      </>
      )}
      </fieldset>

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
    return (
      <div className={`${expressScope}`}>
        {contenidoFormulario}
        <ArnaldDraftChrome
          draftStatus={draftStatus}
          lastDraftAt={lastDraftAt}
          consumeDraft={consumeDraft}
          showRestore={showDraftRestore}
          savedDataToRestore={draftToRestore}
          onRestore={() => {
            if (draftToRestore?.data) setForm((prev) => ({ ...prev, ...draftToRestore.data }));
            setShowDraftRestore(false);
          }}
          onDiscard={() => {
            discardDraft();
            setShowDraftRestore(false);
            setDraftToRestore(null);
          }}
          onCancel={() => setShowDraftRestore(false)}
        />
      </div>
    );
  }

  return (
    <div className={`${ZurichRoot} ${expressScope}`}>
      <div className={expressPageWrap}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className={expressBadge}>{esModuloListado ? 'Zurich · Listado' : 'Zurich · CAT'}</span>
            <div>
              <h1 className={expressPageTitle}>{t('zurich.page.addTitle')}</h1>
              <p className={expressPageSubtitle}>{t('zurich.page.addSubtitle')}</p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm">
                {t('nav.zurichAddCase')}
              </span>
              <Link
                to={esModuloListado ? '/zurich/listado/reporte' : '/zurich/reporte'}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                {esModuloListado ? t('nav.zurichListadoReport') : t('nav.zurichReport')}
              </Link>
            </nav>
          </div>
        </header>

        {error && <div className={expressAlertError}>{error}</div>}
        {exito && <div className={expressAlertSuccess}>{exito}</div>}

        {puedeImportarExcel && !esEdicion && esModuloListado && (
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
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={guardando}
                onClick={() => setModalImportOpen(true)}
              >
                <FaUpload />
                {t('zurich.bulk.upload')}
              </button>
              <span className="ml-3 inline-flex items-center gap-2 font-body text-xs text-gray-500 dark:text-gray-400">
                <FaFileExcel />
                {t('zurich.bulk.hint')}
              </span>
              {resumenImport && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <p className="font-body text-xs text-gray-500">{t('zurich.bulk.received')}</p>
                    <p className="font-heading text-xl font-bold">{resumenImport.rows ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <p className="font-body text-xs text-gray-500">{t('zurich.bulk.created')}</p>
                    <p className="font-heading text-xl font-bold text-fenix-primario">
                      {resumenImport.created ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <p className="font-body text-xs text-gray-500">{t('zurich.bulk.updated')}</p>
                    <p className="font-heading text-xl font-bold">{resumenImport.updated ?? 0}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <ModalImportarExcelZurich
          open={modalImportOpen}
          onClose={() => setModalImportOpen(false)}
          onCompleted={async (data) => {
            setResumenImport(data?.totals || null);
            setExito(t('zurich.bulk.success', {
              created: data?.totals?.created ?? 0,
              updated: data?.totals?.updated ?? 0,
              skipped: data?.totals?.skipped ?? 0,
            }));
            if (onSaved) await onSaved(data);
          }}
        />

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
      <ArnaldDraftChrome
        draftStatus={draftStatus}
        lastDraftAt={lastDraftAt}
        consumeDraft={consumeDraft}
        showRestore={showDraftRestore}
        savedDataToRestore={draftToRestore}
        onRestore={() => {
          if (draftToRestore?.data) setForm((prev) => ({ ...prev, ...draftToRestore.data }));
          setShowDraftRestore(false);
        }}
        onDiscard={() => {
          discardDraft();
          setShowDraftRestore(false);
          setDraftToRestore(null);
        }}
        onCancel={() => setShowDraftRestore(false)}
      />
    </div>
  );
};

export default FormularioZurich;
