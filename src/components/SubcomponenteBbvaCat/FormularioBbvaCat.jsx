import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaFileExcel, FaSave, FaUndo, FaUpload } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../../config/apiConfig.js';
import {
  crearCasoBbvaCat,
  actualizarCasoBbvaCat,
} from '../../services/bbvaCatService.js';
import {
  crearCasoBbvaCatListado,
  actualizarCasoBbvaCatListado,
} from '../../services/bbvaCatListadoService.js';
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
import CampoFranjaCoordinacion from '../AgendaCatastrofico/CampoFranjaCoordinacion.jsx';
import {
  CAMPOS_NUMERICOS_BBVA_CAT,
  CAMPOS_DECIMAL_BBVA_CAT,
  FECHA_ACCION_POR_ESTADO_BBVA_CAT,
  FORM_VACIO_BBVA_CAT,
  MODALIDADES_BBVA_CAT,
  homologarEstadoBbvaCat,
  muestraZonaDocumentoPagoBbvaCat,
  fechaParaInput,
  diasEnEstadoBbvaCat,
  ultimaGestionBbvaCat,
  formatDate,
  TIPOS_IDENTIFICACION_BBVA_CAT,
  TIPOS_POLIZA_BBVA_CAT,
  esTipoPolizaOtroBbvaCat,
  GRADOS_AFECTACION_BBVA_CAT,
  OPCIONES_SI_NO_BBVA_CAT,
  TIPOS_NEGOCIO_HOMOLOGADO_BBVA_CAT,
  construirFormDesdecasoBbvaCat,
  diferenciaValoresProserBbvaCat,
  formatCurrency,
  formatMilesInput,
  normalizeEvidenciaCat,
  valorALiquidarEsCeroCalculadoBbvaCat,
} from './bbvaCatHelpers.js';
import CampoTomadorBbvaCat from './CampoTomadorBbvaCat.jsx';
import ModalImportarExcelBbvaCat, {
  esAdminOSoporteBbvaCat,
} from './ModalImportarExcelBbvaCat.jsx';
import CamposAsignacionCaso from '../shared/CamposAsignacionCaso.jsx';
import SelectBuscable from '../SelectBuscable.jsx';
import { esRolSoloBbva, obtenerRolAlmacenado } from '../../config/roles.js';
import {
  attrsCampoCaso,
  esRolInspector,
  filtrarPayloadCasoPorRol,
  obtenerContextoPermisoCaso,
  puedeEditarCampoCaso,
} from '../../utils/permisosCasoPorRol.js';
import {
  asegurarOpcionActual,
  mapCatalogoCatastroficoAOpciones,
  mapResponsablesAOpciones,
  resolverLiderPorModulo,
} from '../../utils/catalogosAsignacionCatastrofico.js';
import useArnaldFormDraft from '../../hooks/useArnaldFormDraft.js';
import ArnaldDraftChrome from '../ArnaldDraftChrome.jsx';
import BarraEstadosBbvaCat from './BarraEstadosBbvaCat.jsx';
import AdjuntoDocumentoPagoBbvaCat from './AdjuntoDocumentoPagoBbvaCat.jsx';

const BbvaCatRoot = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

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

const FormularioBbvaCat = ({ initialData = null, embed = false, origen = 'cat', onClose, onSaved }) => {
  const { t } = useTranslation();
  const rolUsuario = obtenerRolAlmacenado();
  const ctxPermiso = useMemo(() => obtenerContextoPermisoCaso('bbvaCat'), []);
  const soloInspector = esRolInspector(rolUsuario);
  const esEdicion = Boolean(initialData?._id);
  const esModuloListado = origen === 'listado';
  const puedeImportarExcel = esAdminOSoporteBbvaCat();
  const esAltaCliente = esModuloListado && !esEdicion;
  const formNuevoBbvaCat = () => ({
    ...FORM_VACIO_BBVA_CAT,
    estado: 'CASO NUEVO',
    fechaCasoNuevo: fechaParaInput(new Date()),
  });
  const [form, setForm] = useState(() =>
    initialData ? construirFormDesdecasoBbvaCat(initialData) : formNuevoBbvaCat()
  );
  const [guardando, setGuardando] = useState(false);
  const [modalImportOpen, setModalImportOpen] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [resumenImport, setResumenImport] = useState(null);
  const [ciudadesRaw, setCiudadesRaw] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [ajustadoresCat, setAjustadoresCat] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [draftToRestore, setDraftToRestore] = useState(null);
  const formKey = esEdicion
    ? `bbva-cat:${origen}:${initialData._id}`
    : `bbva-cat:${origen}:nuevo`;
  const onDraftRestoreAvailable = useCallback((info) => {
    setDraftToRestore(info);
    setShowDraftRestore(true);
  }, []);
  const { draftStatus, lastDraftAt, discardDraft, consumeDraft } = useArnaldFormDraft({
    formKey,
    modulo: 'bbvaCat',
    recursoId: initialData?._id || '',
    titulo: 'Caso BBVA CAT',
    formData: form,
    enabled: true,
    onRestoreAvailable: onDraftRestoreAvailable,
  });

  useEffect(() => {
    setForm(initialData ? construirFormDesdecasoBbvaCat(initialData) : formNuevoBbvaCat());
    setError(null);
    setExito(null);
    setResumenImport(null);
    // Solo al cambiar de caso: si el padre re-crea el objeto, no se borra lo escrito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?._id]);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      setCargandoCatalogos(true);
      try {
        const [resCiudades, resResp, resAj] = await Promise.all([
          fetch(`${BASE_URL}/api/ciudades`),
          fetch(`${BASE_URL}/api/responsables`),
          fetch(`${BASE_URL}/api/ajustadores-catastrofico`),
        ]);
        const dataCiudades = await resCiudades.json().catch(() => ({}));
        const dataResp = await resResp.json().catch(() => ({}));
        const dataAj = await resAj.json().catch(() => ({}));
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
        setAjustadoresCat(mapCatalogoCatastroficoAOpciones(listaAj, 'bbvaCat'));
        const lideresOpts = mapResponsablesAOpciones(listaResp);
        if (!esEdicion) {
          const liderDefault = resolverLiderPorModulo(lideresOpts, 'bbvaCat');
          if (liderDefault) {
            setForm((prev) =>
              prev.ajustadorLider ? prev : { ...prev, ajustadorLider: liderDefault }
            );
          }
        }
      } catch (err) {
        if (!cancelado) console.error('Error cargando catálogos BbvaCat:', err);
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

  const ajustadoresBbvaCat = useMemo(
    () => asegurarOpcionActual(ajustadoresCat, form.ajustador),
    [ajustadoresCat, form.ajustador]
  );

  const setCampo = (clave) => (e) => {
    if (!puedeEditarCampoCaso(rolUsuario, clave, ctxPermiso)) return;
    const valor = e?.target ? e.target.value : e;
    setForm((prev) => {
      const siguiente = { ...prev, [clave]: valor };
      if (clave === 'tipoPoliza' && !esTipoPolizaOtroBbvaCat(valor)) {
        siguiente.tipoPolizaOtro = '';
      }
      if (clave === 'estado') {
        siguiente.estado = homologarEstadoBbvaCat(valor);
        const campoFecha = FECHA_ACCION_POR_ESTADO_BBVA_CAT[siguiente.estado];
        if (campoFecha && !siguiente[campoFecha]) {
          siguiente[campoFecha] = fechaParaInput(new Date());
        }
      }
      return siguiente;
    });
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

  const camposNumericos = useMemo(() => CAMPOS_NUMERICOS_BBVA_CAT, []);

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

  const labelCuantiaEstimado = (
    <span className="inline-flex flex-wrap items-center gap-2">
      {t('bbvaCat.fields.valorEstimadoAseguradora')}
      <span className="rounded border border-dashed border-[#004481] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#004481] dark:border-sky-400 dark:text-sky-300">
        {t('bbvaCat.fields.estimadoBadge')}
      </span>
    </span>
  );

  const diferenciaProser = useMemo(
    () => diferenciaValoresProserBbvaCat(form.valorALiquidar, form.valorLiquidado),
    [form.valorALiquidar, form.valorLiquidado]
  );

  const hintCeroALiquidar = valorALiquidarEsCeroCalculadoBbvaCat({
    valorALiquidar: form.valorALiquidar,
    liquidador: initialData?.liquidador,
  });

  const bloqueDiferenciaProser = (
    <div className="md:col-span-2 lg:col-span-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/60">
      <p className="font-body text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {t('bbvaCat.fields.diferenciaProser')}
      </p>
      <p className="mt-1 font-accent text-base font-semibold text-gray-900 dark:text-white">
        {diferenciaProser.comparable
          ? formatCurrency(diferenciaProser.diferencia)
          : t('bbvaCat.fields.diferenciaNoComparable')}
      </p>
    </div>
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
        tipoPolizaOtro: esTipoPolizaOtroBbvaCat(form.tipoPoliza) ? form.tipoPolizaOtro : '',
        causa: form.causa,
        asegurado: form.asegurado,
        intermediario: form.intermediario,
        correoIntermediario: form.correoIntermediario,
        telefonoIntermediario: form.telefonoIntermediario,
        contactoIntermediario: [form.intermediario, form.correoIntermediario, form.telefonoIntermediario]
          .map((x) => String(x || '').trim())
          .filter(Boolean)
          .join(' | ') || form.contactoIntermediario,
        telefonoAsegurado: form.telefonoAsegurado,
        correoAsegurado: form.correoAsegurado,
        contactoAsegurado: [form.telefonoAsegurado, form.correoAsegurado]
          .map((x) => String(x || '').trim())
          .filter(Boolean)
          .join(' | '),
        observaciones: form.observaciones,
        reserva: aNumero(form.reserva),
        valorEstimadoAseguradora: aNumero(form.valorEstimadoAseguradora),
        valorAseguradoInmueble: aNumero(form.valorAseguradoInmueble),
        valorAseguradoContenidos: aNumero(form.valorAseguradoContenidos),
        valorReservaPreventivaPromedio: aNumero(form.valorReservaPreventivaPromedio),
        valorComercialInmueble: aNumero(form.valorComercialInmueble),
        valorReclamado: aNumero(form.valorReclamado),
        valorLiquidado: aNumero(form.valorLiquidado),
        valorALiquidar: aNumero(form.valorALiquidar),
        observacionReserva: form.observacionReserva,
        ciudad: form.ciudad,
        departamento: form.departamento,
        ajustadorLider: form.ajustadorLider,
        ajustador: form.ajustador,
        inspector: '',
        fechaAsignacion: form.fechaAsignacion,
        fechaVisita: form.fechaVisita,
        modalidadAtencion: form.modalidadAtencion,
        fechaCasoNuevo: form.fechaCasoNuevo,
        fechaCoordinandoInspeccion: form.fechaCoordinandoInspeccion,
        horaInicioCoordinacion: form.horaInicioCoordinacion,
        horaFinCoordinacion: form.horaFinCoordinacion,
        fechaAnalisisCaso: form.fechaAnalisisCaso,
        fechaSolicitudDocumento: form.fechaSolicitudDocumento,
        fechaRecepcionDocumento: form.fechaRecepcionDocumento,
        fechaObjecion: form.fechaObjecion,
        fechaObjetado: form.fechaObjetado,
        fechaAutorizacionAnalista: form.fechaAutorizacionAnalista,
        fechaCasoParaPago: form.fechaCasoParaPago,
        fechaCasoPagado: form.fechaCasoPagado,
        documentoFaltante: form.documentoFaltante,
        observacionPendienteDocumento: form.observacionPendienteDocumento,
        motivoObjecion: form.motivoObjecion,
        responsableAporteDocumento: form.responsableAporteDocumento,
        estado: homologarEstadoBbvaCat(form.estado),
      };
      if (!String(payload.identificacion || '').trim()) {
        if (payload.zc) payload.identificacion = String(payload.zc).trim();
        else if (payload.siniestro) payload.identificacion = String(payload.siniestro).trim();
      }
      return payload;
    }
    const payload = { ...form };
    payload.estado = homologarEstadoBbvaCat(payload.estado);
    if (!esTipoPolizaOtroBbvaCat(payload.tipoPoliza)) payload.tipoPolizaOtro = '';
    camposNumericos.forEach((clave) => {
      payload[clave] = aNumero(payload[clave]);
    });
    CAMPOS_DECIMAL_BBVA_CAT.forEach((clave) => {
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
        setError(t('bbvaCat.validation.zcOrStroRequired'));
        return;
      }
    } else if (!form.identificacion.trim() && !String(form.riskId || '').trim() && !String(form.zc || '').trim()) {
      setError(t('bbvaCat.validation.identificacionOrRiskRequired', {
        defaultValue: 'Indique identificación o Risk ID',
      }));
      return;
    }
    if (!form.estado.trim()) {
      setError(t('bbvaCat.validation.statusRequired'));
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
          ? await actualizarCasoBbvaCatListado(initialData._id, payload)
          : await actualizarCasoBbvaCat(initialData._id, payload);
      } else {
        if (soloInspector) {
          setError(
            t('bbvaCat.permissions.inspectorCannotCreate', {
              defaultValue: 'El inspector no puede crear casos; solo modificar el estado.',
            })
          );
          setGuardando(false);
          return;
        }
        guardado = esModuloListado
          ? await crearCasoBbvaCatListado(payload)
          : await crearCasoBbvaCat(payload);
      }
      setExito(
        esEdicion
          ? t('bbvaCat.messages.caseUpdated', { caseNumber: guardado.consecutivo || '' })
          : t('bbvaCat.messages.caseCreated', { caseNumber: guardado.consecutivo || '' })
      );
      if (!esEdicion) {
        setForm(formNuevoBbvaCat());
      }
      if (onSaved) await onSaved(guardado);
      await discardDraft();
    } catch (err) {
      console.error('Error guardando caso BBVA CAT:', err);
      setError(err.message || t('bbvaCat.messages.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  const limpiar = () => {
    setForm(initialData ? construirFormDesdecasoBbvaCat(initialData) : formNuevoBbvaCat());
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
        <h3 className={expressSectionTitle}>{t('bbvaCat.sections.datosAseguradora')}</h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('bbvaCat.sections.datosAseguradoraHint')}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('bbvaCat.fields.zc')} required={esAltaCliente}>
            <InputFenix
              value={form.zc}
              onChange={setCampo('zc')}
              placeholder={t('bbvaCat.placeholders.zc')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.siniestro')} required={esAltaCliente}>
            <InputFenix
              value={form.siniestro}
              onChange={setCampo('siniestro')}
              placeholder={t('bbvaCat.placeholders.siniestro')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.asegurado')}>
            <InputFenix value={form.asegurado} onChange={setCampo('asegurado')} />
          </Campo>
          {esModuloListado && (
            <>
          <Campo label={t('bbvaCat.fields.telefonoAsegurado')}>
            <InputFenix
              value={form.telefonoAsegurado}
              onChange={setCampo('telefonoAsegurado')}
              placeholder={t('bbvaCat.placeholders.telefonoAsegurado')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.correoAsegurado')}>
            <InputFenix
              type="email"
              value={form.correoAsegurado}
              onChange={setCampo('correoAsegurado')}
              placeholder={t('bbvaCat.placeholders.correoAsegurado')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.tipoIdentificacion')}>
            {selectSimple('tipoIdentificacion', TIPOS_IDENTIFICACION_BBVA_CAT)}
          </Campo>
          <Campo label={t('bbvaCat.fields.identificacion')}>
            <InputFenix
              value={form.identificacion}
              onChange={setCampo('identificacion')}
              placeholder={t('bbvaCat.placeholders.identificacion')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.numeroPoliza')}>
            <InputFenix
              value={form.numeroPoliza}
              onChange={setCampo('numeroPoliza')}
              placeholder={t('bbvaCat.placeholders.poliza')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.tipoPoliza')}>
            {selectSimple('tipoPoliza', TIPOS_POLIZA_BBVA_CAT)}
          </Campo>
          {esTipoPolizaOtroBbvaCat(form.tipoPoliza) && (
            <Campo label={t('bbvaCat.fields.tipoPolizaOtro')}>
              <InputFenix
                value={form.tipoPolizaOtro}
                onChange={setCampo('tipoPolizaOtro')}
                placeholder={t('bbvaCat.placeholders.tipoPolizaOtro')}
              />
            </Campo>
          )}
          <Campo
            label={t('bbvaCat.fields.causa')}
            className={esTipoPolizaOtroBbvaCat(form.tipoPoliza) ? '' : 'md:col-span-2 lg:col-span-3'}
          >
            <InputFenix
              value={form.causa}
              onChange={setCampo('causa')}
              placeholder={t('bbvaCat.placeholders.causa')}
            />
          </Campo>
            </>
          )}
          <Campo label={t('bbvaCat.fields.intermediario')}>
            <InputFenix
              value={form.intermediario}
              onChange={setCampo('intermediario')}
              placeholder={t('bbvaCat.placeholders.intermediario')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.correoIntermediario')}>
            <InputFenix
              type="email"
              value={form.correoIntermediario}
              onChange={setCampo('correoIntermediario')}
              placeholder={t('bbvaCat.placeholders.correoIntermediario')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.telefonoIntermediario')}>
            <InputFenix
              value={form.telefonoIntermediario}
              onChange={setCampo('telefonoIntermediario')}
              placeholder={t('bbvaCat.placeholders.telefonoIntermediario')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.ciudad')}>
            <SelectBuscable
              options={opcionesCiudad}
              value={form.ciudad || ''}
              onChange={(val) => setCampo('ciudad')({ target: { value: val } })}
              disabled={
                attrsCampoCaso(rolUsuario, 'ciudad', ctxPermiso).disabled ||
                (cargandoCatalogos && opcionesCiudad.length === 0)
              }
              placeholder={t('bbvaCat.placeholders.selectCity')}
              searchPlaceholder={t('common.searchEllipsis', { defaultValue: 'Buscar ciudad…' })}
              buttonClassName="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.observaciones')} className="md:col-span-2 lg:col-span-3">
            <textarea
              className="min-h-[88px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-body text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              value={form.observaciones}
              onChange={setCampo('observaciones')}
              placeholder={t('bbvaCat.placeholders.observaciones')}
            />
          </Campo>
          {esModuloListado ? (
            <>
              <h4 className="md:col-span-2 lg:col-span-3 mb-0 font-heading text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                {t('bbvaCat.sections.valuesAseguradora')}
              </h4>
              <p className="md:col-span-2 lg:col-span-3 -mt-2 mb-1 font-body text-sm text-gray-500 dark:text-gray-400">
                {t('bbvaCat.sections.valuesAseguradoraHint')}
              </p>
              <Campo label={t('bbvaCat.fields.valorAseguradoInmueble')}>
                {inputMiles('valorAseguradoInmueble')}
              </Campo>
              <Campo label={t('bbvaCat.fields.valorReclamado')}>
                {inputMiles('valorReclamado')}
              </Campo>
              <Campo label={t('bbvaCat.fields.reserva')}>{inputMiles('reserva')}</Campo>
              <Campo label={labelCuantiaEstimado}>
                {inputMiles('valorEstimadoAseguradora')}
              </Campo>
            </>
          ) : null}
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('bbvaCat.sections.datosProser')}</h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('bbvaCat.sections.datosProserHint')}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('bbvaCat.fields.estado')} required className="md:col-span-2 lg:col-span-3">
            <BarraEstadosBbvaCat
              valor={form.estado}
              disabled={Boolean(attrsCampoCaso(rolUsuario, 'estado', ctxPermiso).disabled)}
              onChange={(estado) => setCampo('estado')(estado)}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.modalidadAtencion')}>
            {selectSimple('modalidadAtencion', MODALIDADES_BBVA_CAT)}
          </Campo>
          <CamposAsignacionCaso
            form={form}
            setCampo={setCampo}
            lideres={responsables}
            ajustadores={ajustadoresBbvaCat}
            rol={rolUsuario}
            modulo="bbvaCat"
            i18nNs="bbvaCat"
            filtrarPorCiudad={false}
            mostrarInspector={false}
          />
          <Campo label={t('bbvaCat.fields.fechaAsignacion')}>
            <InputFenix
              type="date"
              value={form.fechaAsignacion}
              onChange={setCampo('fechaAsignacion')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.fechaVisita')}>
            <InputFenix
              type="date"
              value={form.fechaVisita}
              onChange={setCampo('fechaVisita')}
            />
          </Campo>
        </div>
        {soloInspector ? (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
            {t('bbvaCat.permissions.inspectorHint', {
              defaultValue:
                'Su rol de inspector solo permite ver el caso y modificar el estado.',
            })}
          </p>
        ) : null}
      </section>

      {esModuloListado ? (
        <section className={expressFormSection}>
          <h3 className={expressSectionTitle}>{t('bbvaCat.sections.valuesProser')}</h3>
          <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
            {t('bbvaCat.sections.valuesProserHint')}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Campo label={t('bbvaCat.fields.valorAseguradoContenidos')}>
              {inputMiles('valorAseguradoContenidos')}
            </Campo>
            <Campo label={t('bbvaCat.fields.valorReservaPreventivaPromedio')}>
              {inputMiles('valorReservaPreventivaPromedio')}
            </Campo>
            <Campo label={t('bbvaCat.fields.valorComercialInmueble')}>
              {inputMiles('valorComercialInmueble')}
            </Campo>
            <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2 lg:col-span-3">
              <Campo label={t('bbvaCat.fields.valorLiquidado')}>
                {inputMiles('valorLiquidado')}
              </Campo>
              <Campo label={t('bbvaCat.fields.valorALiquidar')}>
                {inputMiles('valorALiquidar')}
                {hintCeroALiquidar ? (
                  <p className="mt-1 font-body text-xs text-gray-500 dark:text-gray-400">
                    {t('bbvaCat.fields.valorALiquidarZeroHint')}
                  </p>
                ) : null}
              </Campo>
            </div>
            {bloqueDiferenciaProser}
            <Campo label={t('bbvaCat.fields.observacionReserva')} className="md:col-span-2 lg:col-span-3">
              <textarea
                className="min-h-[88px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-body text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                value={form.observacionReserva || ''}
                onChange={setCampo('observacionReserva')}
                placeholder={t('bbvaCat.placeholders.observacionReserva')}
              />
            </Campo>
          </div>
        </section>
      ) : null}

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('bbvaCat.sections.actionDates')}</h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('bbvaCat.sections.actionDatesHint')}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('bbvaCat.fields.fechaCasoNuevo')}>
            <InputFenix type="date" value={form.fechaCasoNuevo} onChange={setCampo('fechaCasoNuevo')} />
          </Campo>
          <CampoFranjaCoordinacion
            labelFecha={t('bbvaCat.fields.fechaCoordinandoInspeccion')}
            fecha={form.fechaCoordinandoInspeccion}
            horaInicio={form.horaInicioCoordinacion}
            horaFin={form.horaFinCoordinacion}
            onFecha={setCampo('fechaCoordinandoInspeccion')}
            onHoraInicio={setCampo('horaInicioCoordinacion')}
            onHoraFin={setCampo('horaFinCoordinacion')}
            ajustador={form.ajustador}
            inspector={form.inspector}
            casoId={initialData?._id}
            disabled={attrsCampoCaso(rolUsuario, 'fechaCoordinandoInspeccion', ctxPermiso).disabled}
          />
          <Campo label={t('bbvaCat.fields.fechaAnalisisCaso')}>
            <InputFenix
              type="date"
              value={form.fechaAnalisisCaso}
              onChange={setCampo('fechaAnalisisCaso')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.fechaSolicitudDocumento')}>
            <InputFenix
              type="date"
              value={form.fechaSolicitudDocumento}
              onChange={setCampo('fechaSolicitudDocumento')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.fechaRecepcionDocumento')}>
            <InputFenix
              type="date"
              value={form.fechaRecepcionDocumento}
              onChange={setCampo('fechaRecepcionDocumento')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.fechaObjecion')}>
            <InputFenix type="date" value={form.fechaObjecion} onChange={setCampo('fechaObjecion')} />
          </Campo>
          <Campo label={t('bbvaCat.fields.fechaObjetado')}>
            <InputFenix type="date" value={form.fechaObjetado} onChange={setCampo('fechaObjetado')} />
          </Campo>
          <Campo label={t('bbvaCat.fields.fechaAutorizacionAnalista')}>
            <InputFenix
              type="date"
              value={form.fechaAutorizacionAnalista}
              onChange={setCampo('fechaAutorizacionAnalista')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.fechaCasoParaPago')}>
            <InputFenix
              type="date"
              value={form.fechaCasoParaPago}
              onChange={setCampo('fechaCasoParaPago')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.fechaCasoPagado')}>
            <InputFenix
              type="date"
              value={form.fechaCasoPagado}
              onChange={setCampo('fechaCasoPagado')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.diasEnEstado')}>
            <InputFenix value={diasEnEstadoBbvaCat(form)} readOnly />
          </Campo>
          <Campo label={t('bbvaCat.fields.ultimaGestion')}>
            <InputFenix value={formatDate(ultimaGestionBbvaCat(form)) || '—'} readOnly />
          </Campo>
          <Campo label={t('bbvaCat.fields.documentoFaltante')} className="md:col-span-2 lg:col-span-3">
            <InputFenix
              value={form.documentoFaltante}
              onChange={setCampo('documentoFaltante')}
              placeholder={t('bbvaCat.placeholders.documentoFaltante')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.responsableAporteDocumento')}>
            <InputFenix
              value={form.responsableAporteDocumento}
              onChange={setCampo('responsableAporteDocumento')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.observacionPendienteDocumento')} className="md:col-span-2">
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-body text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              value={form.observacionPendienteDocumento}
              onChange={setCampo('observacionPendienteDocumento')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.motivoObjecion')} className="md:col-span-2 lg:col-span-3">
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-body text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              value={form.motivoObjecion}
              onChange={setCampo('motivoObjecion')}
            />
          </Campo>
        </div>
      </section>

      {muestraZonaDocumentoPagoBbvaCat(form.estado) && (
        <section className={expressFormSection}>
          <h3 className={expressSectionTitle}>{t('bbvaCat.sections.documentoPago')}</h3>
          <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
            {t('bbvaCat.sections.documentoPagoLead')}
          </p>
          <AdjuntoDocumentoPagoBbvaCat
            casoId={initialData?._id}
            origen={origen}
            archivosIniciales={initialData?.archivos}
            disabled={soloInspector}
          />
        </section>
      )}

      <fieldset
        disabled={soloInspector}
        className="min-w-0 space-y-5 border-0 p-0 m-0 disabled:opacity-80"
      >
      {!esModuloListado && (
      <>
      {/* CAT BBVA — campos del Excel CAT_BBVA */}
      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('bbvaCat.sections.catBbvaCat')}</h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('bbvaCat.sections.catBbvaCatHint')}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('bbvaCat.fields.riskId')}>
            <InputFenix value={form.riskId} onChange={setCampo('riskId')} placeholder="Ej: 3518" />
          </Campo>
          <Campo label={t('bbvaCat.fields.distanciaEpicentroKm')}>
            <InputFenix
              type="text"
              inputMode="decimal"
              value={form.distanciaEpicentroKm}
              onChange={setCampo('distanciaEpicentroKm')}
              placeholder="Ej: 77.92"
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.tipoNegocioHomologado')}>
            {selectSimple('tipoNegocioHomologado', TIPOS_NEGOCIO_HOMOLOGADO_BBVA_CAT)}
          </Campo>
          <Campo label={t('bbvaCat.fields.catUbicacionReferencia')}>
            <InputFenix
              value={form.catUbicacionReferencia}
              onChange={setCampo('catUbicacionReferencia')}
              placeholder="Ej: Pereira, Cali…"
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.addressNumber')}>
            <InputFenix value={form.addressNumber} onChange={setCampo('addressNumber')} />
          </Campo>
          <Campo label={t('bbvaCat.fields.direccionInspeccionSugerida')} className="md:col-span-2 lg:col-span-3">
            <InputFenix
              value={form.direccionInspeccionSugerida}
              onChange={setCampo('direccionInspeccionSugerida')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.linkGoogleMaps')} className="md:col-span-2 lg:col-span-3">
            <InputFenix
              value={form.linkGoogleMaps}
              onChange={setCampo('linkGoogleMaps')}
              placeholder="https://www.google.com/maps/…"
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.grupoInspeccion')}>
            <InputFenix value={form.grupoInspeccion} onChange={setCampo('grupoInspeccion')} />
          </Campo>
          <Campo label={t('bbvaCat.fields.afectacion')}>
            {selectSimple('afectacion', OPCIONES_SI_NO_BBVA_CAT)}
          </Campo>
          <Campo label={t('bbvaCat.fields.gradoAfectacion')}>
            {selectSimple('gradoAfectacion', GRADOS_AFECTACION_BBVA_CAT)}
          </Campo>
          <Campo label={t('bbvaCat.fields.lucroCesante')}>
            {selectSimple('lucroCesante', OPCIONES_SI_NO_BBVA_CAT)}
          </Campo>
          <Campo label={t('bbvaCat.fields.fechaInspeccion')}>
            <InputFenix
              type="date"
              value={form.fechaInspeccion}
              onChange={setCampo('fechaInspeccion')}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.observacionesCat')} className="md:col-span-2 lg:col-span-3">
            <textarea
              className="min-h-[88px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-body text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              value={form.observacionesCat}
              onChange={setCampo('observacionesCat')}
              placeholder={t('bbvaCat.placeholders.observacionesCat')}
            />
          </Campo>
        </div>
      </section>

      {/* Información general (personas / póliza) — desplegable */}
      <details className={`${expressFormSection} group`}>
        <summary className="cursor-pointer list-none font-heading text-base font-bold text-gray-900 marker:content-none dark:text-white">
          <span className="inline-flex items-center gap-2">
            <span className="text-fenix-primario transition group-open:rotate-90">▸</span>
            {t('bbvaCat.sections.generalInfo')}
          </span>
          <p className="mt-1 font-body text-sm font-normal text-gray-500">
            {t('bbvaCat.sections.generalInfoHint')}
          </p>
        </summary>

        <div className="mt-4 space-y-5 border-t border-gray-200 pt-4 dark:border-gray-700">
          <section>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              {t('bbvaCat.sections.identification')}
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Campo label={t('bbvaCat.fields.siniestro')}>
                <InputFenix
                  value={form.siniestro}
                  onChange={setCampo('siniestro')}
                  placeholder={t('bbvaCat.placeholders.siniestro')}
                />
              </Campo>
              <Campo label={t('bbvaCat.fields.tipoIdentificacion')}>
                {selectSimple('tipoIdentificacion', TIPOS_IDENTIFICACION_BBVA_CAT)}
              </Campo>
              <Campo label={t('bbvaCat.fields.identificacion')}>
                <InputFenix
                  value={form.identificacion}
                  onChange={setCampo('identificacion')}
                  placeholder={t('bbvaCat.placeholders.identificacion')}
                />
              </Campo>
              <Campo label={t('bbvaCat.fields.causa')}>
                <InputFenix
                  value={form.causa}
                  onChange={setCampo('causa')}
                  placeholder={t('bbvaCat.placeholders.causa')}
                />
              </Campo>
              <CampoTomadorBbvaCat
                value={form.tomador}
                onChange={(valor) => setForm((prev) => ({ ...prev, tomador: valor }))}
              />
              <Campo label={t('bbvaCat.fields.direccionPredio')}>
                <InputFenix value={form.direccionPredio} onChange={setCampo('direccionPredio')} />
              </Campo>
              <Campo label={t('bbvaCat.fields.informacionContacto')}>
                <InputFenix
                  value={form.informacionContacto}
                  onChange={setCampo('informacionContacto')}
                  placeholder={t('bbvaCat.placeholders.contacto')}
                />
              </Campo>
              <Campo label={t('bbvaCat.fields.correo')}>
                <InputFenix
                  type="email"
                  value={form.correo}
                  onChange={setCampo('correo')}
                  placeholder={t('bbvaCat.placeholders.correo')}
                />
              </Campo>
              <Campo label={t('bbvaCat.fields.celular')}>
                <InputFenix
                  value={form.celular}
                  onChange={setCampo('celular')}
                  placeholder={t('bbvaCat.placeholders.celular')}
                />
              </Campo>
              <Campo label={t('bbvaCat.fields.canalRadicacion')}>
                <InputFenix
                  value={form.canalRadicacion}
                  onChange={setCampo('canalRadicacion')}
                  placeholder="Ej: BBVA CAT"
                />
              </Campo>
              <Campo label={t('bbvaCat.fields.departamento')}>
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
              <Campo label={t('bbvaCat.fields.ciudad')}>
                <SelectFenix
                  value={form.ciudad}
                  onChange={setCampo('ciudad')}
                  disabled={cargandoCatalogos && ciudadesFiltradas.length === 0}
                >
                  <option value="">
                    {form.departamento
                      ? t('bbvaCat.placeholders.selectCity')
                      : t('bbvaCat.placeholders.selectDepartmentFirst')}
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
              {t('bbvaCat.sections.policyCoverage')}
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Campo label={t('bbvaCat.fields.numeroPoliza')}>
                <InputFenix
                  value={form.numeroPoliza}
                  onChange={setCampo('numeroPoliza')}
                  placeholder={t('bbvaCat.placeholders.poliza')}
                />
              </Campo>
              <Campo label={t('bbvaCat.fields.tipoPoliza')}>
                {selectSimple('tipoPoliza', TIPOS_POLIZA_BBVA_CAT)}
              </Campo>
              {esTipoPolizaOtroBbvaCat(form.tipoPoliza) && (
                <Campo label={t('bbvaCat.fields.tipoPolizaOtro')}>
                  <InputFenix
                    value={form.tipoPolizaOtro}
                    onChange={setCampo('tipoPolizaOtro')}
                    placeholder={t('bbvaCat.placeholders.tipoPolizaOtro')}
                  />
                </Campo>
              )}
              <Campo label={t('bbvaCat.fields.fechaInicioPoliza')}>
                <InputFenix
                  type="date"
                  value={form.fechaInicioPoliza}
                  onChange={setCampo('fechaInicioPoliza')}
                />
              </Campo>
              <Campo label={t('bbvaCat.fields.fechaFinPoliza')}>
                <InputFenix
                  type="date"
                  value={form.fechaFinPoliza}
                  onChange={setCampo('fechaFinPoliza')}
                />
              </Campo>
              <Campo label={t('bbvaCat.fields.numeroCredito')}>
                <InputFenix value={form.numeroCredito} onChange={setCampo('numeroCredito')} />
              </Campo>
              <Campo label={t('bbvaCat.fields.cobertura')}>
                <InputFenix
                  value={form.cobertura}
                  onChange={setCampo('cobertura')}
                  placeholder={t('bbvaCat.placeholders.cobertura')}
                />
              </Campo>
              <Campo label={t('bbvaCat.fields.estadoPagoPrimas')}>
                <InputFenix
                  value={form.estadoPagoPrimas}
                  onChange={setCampo('estadoPagoPrimas')}
                  placeholder={t('bbvaCat.placeholders.estadoPagoPrimas')}
                />
              </Campo>
            </div>
          </section>

          <section>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              {t('bbvaCat.sections.valuesAseguradora')}
            </h4>
            <p className="mb-3 font-body text-sm text-gray-500 dark:text-gray-400">
              {t('bbvaCat.sections.valuesAseguradoraHint')}
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Campo label={t('bbvaCat.fields.valorAseguradoInmueble')}>
                {inputMiles('valorAseguradoInmueble')}
              </Campo>
              <Campo label={t('bbvaCat.fields.valorReclamado')}>
                {inputMiles('valorReclamado')}
              </Campo>
              <Campo label={t('bbvaCat.fields.reserva')}>{inputMiles('reserva')}</Campo>
              <Campo label={labelCuantiaEstimado}>
                {inputMiles('valorEstimadoAseguradora')}
              </Campo>
            </div>
          </section>

          <section>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              {t('bbvaCat.sections.valuesProser')}
            </h4>
            <p className="mb-3 font-body text-sm text-gray-500 dark:text-gray-400">
              {t('bbvaCat.sections.valuesProserHint')}
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Campo label={t('bbvaCat.fields.valorAseguradoContenidos')}>
                {inputMiles('valorAseguradoContenidos')}
              </Campo>
              <Campo label={t('bbvaCat.fields.valorReservaPreventivaPromedio')}>
                {inputMiles('valorReservaPreventivaPromedio')}
              </Campo>
              <Campo label={t('bbvaCat.fields.valorComercialInmueble')}>
                {inputMiles('valorComercialInmueble')}
              </Campo>
              <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2 lg:col-span-3">
                <Campo label={t('bbvaCat.fields.valorLiquidado')}>
                  {inputMiles('valorLiquidado')}
                </Campo>
                <Campo label={t('bbvaCat.fields.valorALiquidar')}>
                  {inputMiles('valorALiquidar')}
                  {hintCeroALiquidar ? (
                    <p className="mt-1 font-body text-xs text-gray-500 dark:text-gray-400">
                      {t('bbvaCat.fields.valorALiquidarZeroHint')}
                    </p>
                  ) : null}
                </Campo>
              </div>
              {bloqueDiferenciaProser}
              <Campo label={t('bbvaCat.fields.observacionReserva')} className="md:col-span-2 lg:col-span-3">
                <textarea
                  className="min-h-[88px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-body text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  value={form.observacionReserva || ''}
                  onChange={setCampo('observacionReserva')}
                  placeholder={t('bbvaCat.placeholders.observacionReserva')}
                />
              </Campo>
            </div>
          </section>

          <section>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              {t('bbvaCat.sections.dates')}
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Campo label={t('bbvaCat.fields.fechaSiniestro')}>
                <InputFenix
                  type="date"
                  value={form.fechaSiniestro}
                  onChange={setCampo('fechaSiniestro')}
                />
              </Campo>
              <Campo label={t('bbvaCat.fields.fechaUltimoDocumento')}>
                <InputFenix
                  type="date"
                  value={form.fechaUltimoDocumento}
                  onChange={setCampo('fechaUltimoDocumento')}
                />
              </Campo>
              <Campo label={t('bbvaCat.fields.fechaLiquidado')}>
                <InputFenix
                  type="date"
                  value={form.fechaLiquidado}
                  onChange={setCampo('fechaLiquidado')}
                />
              </Campo>
              <Campo label={t('bbvaCat.fields.fechaAceptacionLiquidacion')}>
                <InputFenix
                  type="date"
                  value={form.fechaAceptacionLiquidacion}
                  onChange={setCampo('fechaAceptacionLiquidacion')}
                />
              </Campo>
              <Campo label={t('bbvaCat.fields.fechaEnvioAseguradora')}>
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
          {esEdicion ? t('bbvaCat.actions.reset') : t('bbvaCat.actions.clear')}
        </button>
        <button type="submit" className={expressBtnPrimary} disabled={guardando}>
          <FaSave />
          {guardando
            ? t('bbvaCat.actions.saving')
            : esEdicion
              ? t('bbvaCat.actions.saveChanges')
              : t('bbvaCat.actions.saveCase')}
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
    <div className={`${BbvaCatRoot} ${expressScope}`}>
      <div className={expressPageWrap}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className={expressBadge}>{esModuloListado ? 'BBVA CAT · Listado' : 'BBVA CAT · CAT'}</span>
            <div>
              <h1 className={expressPageTitle}>{t('bbvaCat.page.addTitle')}</h1>
              <p className={expressPageSubtitle}>{t('bbvaCat.page.addSubtitle')}</p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm">
                {t('nav.bbvaCatAddCase')}
              </span>
              <Link
                to={
                  esModuloListado
                    ? esRolSoloBbva()
                      ? '/bbva-cat/listado/analista'
                      : '/bbva-cat/listado/reporte'
                    : '/bbva-cat/reporte'
                }
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                {esModuloListado
                  ? esRolSoloBbva()
                    ? t('nav.bbvaCatListadoAnalista')
                    : t('nav.bbvaCatListadoReport')
                  : t('nav.bbvaCatReport')}
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
                {t('bbvaCat.bulk.title')}
              </h2>
            </div>
            <div className={expressCardBody}>
              <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-300">
                {t('bbvaCat.bulk.subtitle')}
              </p>
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={guardando}
                onClick={() => setModalImportOpen(true)}
              >
                <FaUpload />
                {t('bbvaCat.bulk.upload')}
              </button>
              <span className="ml-3 inline-flex items-center gap-2 font-body text-xs text-gray-500 dark:text-gray-400">
                <FaFileExcel />
                {t('bbvaCat.bulk.hint')}
              </span>
              {resumenImport && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <p className="font-body text-xs text-gray-500">{t('bbvaCat.bulk.received')}</p>
                    <p className="font-heading text-xl font-bold">{resumenImport.rows ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <p className="font-body text-xs text-gray-500">{t('bbvaCat.bulk.created')}</p>
                    <p className="font-heading text-xl font-bold text-fenix-primario">
                      {resumenImport.created ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <p className="font-body text-xs text-gray-500">{t('bbvaCat.bulk.updated')}</p>
                    <p className="font-heading text-xl font-bold">{resumenImport.updated ?? 0}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <ModalImportarExcelBbvaCat
          open={modalImportOpen}
          onClose={() => setModalImportOpen(false)}
          onCompleted={async (data) => {
            setResumenImport(data?.totals || null);
            setExito(t('bbvaCat.bulk.success', {
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
                ? t('bbvaCat.page.editCase', { caseNumber: initialData?.consecutivo || '' })
                : t('bbvaCat.page.newCase')}
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

export default FormularioBbvaCat;
