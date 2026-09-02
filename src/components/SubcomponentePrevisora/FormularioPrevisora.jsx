import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaFileExcel, FaSave, FaUndo, FaUpload } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../../config/apiConfig.js';
import {
  crearCasoPrevisora,
  actualizarCasoPrevisora,
} from '../../services/previsoraService.js';
import {
  crearCasoPrevisoraListado,
  actualizarCasoPrevisoraListado,
} from '../../services/previsoraListadoService.js';
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
  CAMPOS_NUMERICOS_PREVISORA,
  CAMPOS_DECIMAL_PREVISORA,
  ESTADOS_PREVISORA,
  FECHA_ACCION_POR_ESTADO_PREVISORA,
  FORM_VACIO_PREVISORA,
  MODALIDADES_PREVISORA,
  homologarEstadoPrevisora,
  fechaParaInput,
  diasEnEstadoPrevisora,
  ultimaGestionPrevisora,
  formatDate,
  TIPOS_IDENTIFICACION_PREVISORA,
  TIPOS_POLIZA_PREVISORA,
  esTipoPolizaOtroPrevisora,
  GRADOS_AFECTACION_PREVISORA,
  OPCIONES_SI_NO_PREVISORA,
  TIPOS_NEGOCIO_HOMOLOGADO_PREVISORA,
  construirFormDesdecasoPrevisora,
  formatMilesInput,
  normalizeEvidenciaCat,
} from './previsoraHelpers.js';
import CampoTomadorPrevisora from './CampoTomadorPrevisora.jsx';
import ModalImportarExcelPrevisora, {
  esAdminOSoportePrevisora,
} from './ModalImportarExcelPrevisora.jsx';
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
  asegurarOpcionActual,
  mapCatalogoCatastroficoAOpciones,
  mapResponsablesAOpciones,
  resolverLiderPorModulo,
} from '../../utils/catalogosAsignacionCatastrofico.js';
import useArnaldFormDraft from '../../hooks/useArnaldFormDraft.js';
import ArnaldDraftChrome from '../ArnaldDraftChrome.jsx';

const PrevisoraRoot = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

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

const FormularioPrevisora = ({ initialData = null, embed = false, origen = 'cat', onClose, onSaved }) => {
  const { t } = useTranslation();
  const rolUsuario = obtenerRolAlmacenado();
  const ctxPermiso = useMemo(() => obtenerContextoPermisoCaso('previsora'), []);
  const soloInspector = esRolInspector(rolUsuario);
  const esEdicion = Boolean(initialData?._id);
  const esModuloListado = origen === 'listado';
  const puedeImportarExcel = esAdminOSoportePrevisora();
  const esAltaCliente = esModuloListado && !esEdicion;
  const formNuevoPrevisora = () => ({
    ...FORM_VACIO_PREVISORA,
    estado: 'CASO NUEVO',
    fechaCasoNuevo: fechaParaInput(new Date()),
  });
  const [form, setForm] = useState(() =>
    initialData ? construirFormDesdecasoPrevisora(initialData) : formNuevoPrevisora()
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
    ? `previsora:${origen}:${initialData._id}`
    : `previsora:${origen}:nuevo`;
  const onDraftRestoreAvailable = useCallback((info) => {
    setDraftToRestore(info);
    setShowDraftRestore(true);
  }, []);
  const { draftStatus, lastDraftAt, discardDraft, consumeDraft } = useArnaldFormDraft({
    formKey,
    modulo: 'previsora',
    recursoId: initialData?._id || '',
    titulo: 'Caso Previsora',
    formData: form,
    enabled: true,
    onRestoreAvailable: onDraftRestoreAvailable,
  });

  useEffect(() => {
    setForm(initialData ? construirFormDesdecasoPrevisora(initialData) : formNuevoPrevisora());
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
        setAjustadoresCat(mapCatalogoCatastroficoAOpciones(listaAj, 'previsora'));
        setInspectoresCat(mapCatalogoCatastroficoAOpciones(listaIns, 'previsora'));
        const lideresOpts = mapResponsablesAOpciones(listaResp);
        if (!esEdicion) {
          const liderDefault = resolverLiderPorModulo(lideresOpts, 'previsora');
          if (liderDefault) {
            setForm((prev) =>
              prev.ajustadorLider ? prev : { ...prev, ajustadorLider: liderDefault }
            );
          }
        }
      } catch (err) {
        if (!cancelado) console.error('Error cargando catálogos Previsora:', err);
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

  const ajustadoresPorCiudad = useMemo(
    () => asegurarOpcionActual(ajustadoresCat, form.ajustador),
    [ajustadoresCat, form.ajustador]
  );
  const inspectoresPorCiudad = useMemo(
    () => asegurarOpcionActual(inspectoresCat, form.inspector),
    [inspectoresCat, form.inspector]
  );

  const setCampo = (clave) => (e) => {
    if (!puedeEditarCampoCaso(rolUsuario, clave, ctxPermiso)) return;
    const valor = e?.target ? e.target.value : e;
    setForm((prev) => {
      const siguiente = { ...prev, [clave]: valor };
      if (clave === 'tipoPoliza' && !esTipoPolizaOtroPrevisora(valor)) {
        siguiente.tipoPolizaOtro = '';
      }
      if (clave === 'estado') {
        siguiente.estado = homologarEstadoPrevisora(valor);
        const campoFecha = FECHA_ACCION_POR_ESTADO_PREVISORA[siguiente.estado];
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

  const camposNumericos = useMemo(() => CAMPOS_NUMERICOS_PREVISORA, []);

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
        siniestro: form.siniestro,
        noCaso: form.noCaso,
        identificacion: form.identificacion,
        tipoIdentificacion: form.tipoIdentificacion,
        numeroPoliza: form.numeroPoliza,
        tipoPoliza: form.tipoPoliza,
        tipoPolizaOtro: esTipoPolizaOtroPrevisora(form.tipoPoliza) ? form.tipoPolizaOtro : '',
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
        ciudad: form.ciudad,
        departamento: form.departamento,
        valorAseguradoInmueble: aNumero(form.valorAseguradoInmueble),
        valorAseguradoContenidos: aNumero(form.valorAseguradoContenidos),
        valorReservaPreventivaPromedio: aNumero(form.valorReservaPreventivaPromedio),
        valorComercialInmueble: aNumero(form.valorComercialInmueble),
        reserva: aNumero(form.reserva),
        observacionReserva: form.observacionReserva,
        valorReclamado: aNumero(form.valorReclamado),
        valorLiquidado: aNumero(form.valorLiquidado),
        ajustadorLider: form.ajustadorLider,
        ajustador: form.ajustador,
        inspector: form.inspector,
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
        fechaAutorizacionAnalista: form.fechaAutorizacionAnalista,
        fechaCasoParaPago: form.fechaCasoParaPago,
        documentoFaltante: form.documentoFaltante,
        observacionPendienteDocumento: form.observacionPendienteDocumento,
        motivoObjecion: form.motivoObjecion,
        responsableAporteDocumento: form.responsableAporteDocumento,
        estado: homologarEstadoPrevisora(form.estado),
      };
      if (!String(payload.identificacion || '').trim()) {
        if (payload.siniestro) payload.identificacion = String(payload.siniestro).trim();
      }
      return payload;
    }
    const payload = { ...form };
    payload.estado = homologarEstadoPrevisora(payload.estado);
    if (!esTipoPolizaOtroPrevisora(payload.tipoPoliza)) payload.tipoPolizaOtro = '';
    camposNumericos.forEach((clave) => {
      payload[clave] = aNumero(payload[clave]);
    });
    CAMPOS_DECIMAL_PREVISORA.forEach((clave) => {
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
    payload.fechaLlamada = form.fechaLlamada ? String(form.fechaLlamada).trim() : '';
    payload.observacionLlamada =
      form.observacionLlamada != null ? String(form.observacionLlamada) : '';
    payload.observacionReserva =
      form.observacionReserva != null ? String(form.observacionReserva) : '';
    if (!String(payload.identificacion || '').trim()) {
      if (payload.siniestro) payload.identificacion = String(payload.siniestro).trim();
      else if (payload.riskId) payload.identificacion = String(payload.riskId).trim();
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (esModuloListado) {
      if (!String(form.siniestro || '').trim() && !String(form.noCaso || '').trim()) {
        setError(t('previsora.validation.siniestroRequired', {
          defaultValue: 'Indique el siniestro o el No. caso',
        }));
        return;
      }
    } else if (!form.identificacion.trim() && !String(form.riskId || '').trim()) {
      setError(t('previsora.validation.identificacionOrRiskRequired', {
        defaultValue: 'Indique identificación o Risk ID',
      }));
      return;
    }
    if (!form.estado.trim()) {
      setError(t('previsora.validation.statusRequired'));
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
          ? await actualizarCasoPrevisoraListado(initialData._id, payload)
          : await actualizarCasoPrevisora(initialData._id, payload);
      } else {
        if (soloInspector) {
          setError(
            t('previsora.permissions.inspectorCannotCreate', {
              defaultValue: 'El inspector no puede crear casos; solo modificar el estado.',
            })
          );
          setGuardando(false);
          return;
        }
        guardado = esModuloListado
          ? await crearCasoPrevisoraListado(payload)
          : await crearCasoPrevisora(payload);
      }
      setExito(
        esEdicion
          ? t('previsora.messages.caseUpdated', { caseNumber: guardado.consecutivo || '' })
          : t('previsora.messages.caseCreated', { caseNumber: guardado.consecutivo || '' })
      );
      if (!esEdicion) {
        setForm(formNuevoPrevisora());
      }
      if (onSaved) await onSaved(guardado);
      await discardDraft();
    } catch (err) {
      console.error('Error guardando caso Previsora:', err);
      setError(err.message || t('previsora.messages.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  const limpiar = () => {
    setForm(initialData ? construirFormDesdecasoPrevisora(initialData) : formNuevoPrevisora());
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
        <h3 className={expressSectionTitle}>{t('previsora.sections.listadoCliente')}</h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('previsora.sections.listadoClienteHint')}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('previsora.fields.siniestro')} required={esAltaCliente}>
            <InputFenix
              value={form.siniestro}
              onChange={setCampo('siniestro')}
              placeholder={t('previsora.placeholders.siniestro')}
            />
          </Campo>
          {esModuloListado && (
            <Campo label={t('previsora.fields.noCaso', { defaultValue: 'No. caso' })}>
              <InputFenix
                value={form.noCaso}
                onChange={setCampo('noCaso')}
                placeholder={t('previsora.placeholders.noCaso', { defaultValue: 'Número de caso Previsora' })}
              />
            </Campo>
          )}
          <Campo label={t('previsora.fields.asegurado')}>
            <InputFenix value={form.asegurado} onChange={setCampo('asegurado')} />
          </Campo>
          {esModuloListado && (
            <>
          <Campo label={t('previsora.fields.telefonoAsegurado')}>
            <InputFenix
              value={form.telefonoAsegurado}
              onChange={setCampo('telefonoAsegurado')}
              placeholder={t('previsora.placeholders.telefonoAsegurado')}
            />
          </Campo>
          <Campo label={t('previsora.fields.correoAsegurado')}>
            <InputFenix
              type="email"
              value={form.correoAsegurado}
              onChange={setCampo('correoAsegurado')}
              placeholder={t('previsora.placeholders.correoAsegurado')}
            />
          </Campo>
          <Campo label={t('previsora.fields.tipoIdentificacion')}>
            {selectSimple('tipoIdentificacion', TIPOS_IDENTIFICACION_PREVISORA)}
          </Campo>
          <Campo label={t('previsora.fields.identificacion')}>
            <InputFenix
              value={form.identificacion}
              onChange={setCampo('identificacion')}
              placeholder={t('previsora.placeholders.identificacion')}
            />
          </Campo>
          <Campo label={t('previsora.fields.numeroPoliza')}>
            <InputFenix
              value={form.numeroPoliza}
              onChange={setCampo('numeroPoliza')}
              placeholder={t('previsora.placeholders.poliza')}
            />
          </Campo>
          <Campo label={t('previsora.fields.tipoPoliza')}>
            {selectSimple('tipoPoliza', TIPOS_POLIZA_PREVISORA)}
          </Campo>
          {esTipoPolizaOtroPrevisora(form.tipoPoliza) && (
            <Campo label={t('previsora.fields.tipoPolizaOtro')}>
              <InputFenix
                value={form.tipoPolizaOtro}
                onChange={setCampo('tipoPolizaOtro')}
                placeholder={t('previsora.placeholders.tipoPolizaOtro')}
              />
            </Campo>
          )}
          <Campo
            label={t('previsora.fields.causa')}
            className={esTipoPolizaOtroPrevisora(form.tipoPoliza) ? '' : 'md:col-span-2 lg:col-span-3'}
          >
            <InputFenix
              value={form.causa}
              onChange={setCampo('causa')}
              placeholder={t('previsora.placeholders.causa')}
            />
          </Campo>
            </>
          )}
          <Campo label={t('previsora.fields.intermediario')}>
            <InputFenix
              value={form.intermediario}
              onChange={setCampo('intermediario')}
              placeholder={t('previsora.placeholders.intermediario')}
            />
          </Campo>
          <Campo label={t('previsora.fields.correoIntermediario')}>
            <InputFenix
              type="email"
              value={form.correoIntermediario}
              onChange={setCampo('correoIntermediario')}
              placeholder={t('previsora.placeholders.correoIntermediario')}
            />
          </Campo>
          <Campo label={t('previsora.fields.telefonoIntermediario')}>
            <InputFenix
              value={form.telefonoIntermediario}
              onChange={setCampo('telefonoIntermediario')}
              placeholder={t('previsora.placeholders.telefonoIntermediario')}
            />
          </Campo>
          <Campo label={t('previsora.fields.ciudad')}>
            <SelectBuscable
              options={opcionesCiudad}
              value={form.ciudad || ''}
              onChange={(val) => setCampo('ciudad')({ target: { value: val } })}
              disabled={
                attrsCampoCaso(rolUsuario, 'ciudad', ctxPermiso).disabled ||
                (cargandoCatalogos && opcionesCiudad.length === 0)
              }
              placeholder={t('previsora.placeholders.selectCity')}
              searchPlaceholder={t('common.searchEllipsis', { defaultValue: 'Buscar ciudad…' })}
              buttonClassName="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </Campo>
          <Campo label={t('previsora.fields.estado')} required>
            {selectSimple('estado', ESTADOS_PREVISORA)}
          </Campo>
          <Campo label={t('previsora.fields.modalidadAtencion')}>
            {selectSimple('modalidadAtencion', MODALIDADES_PREVISORA)}
          </Campo>
          <CamposAsignacionCaso
            form={form}
            setCampo={setCampo}
            lideres={responsables}
            ajustadores={ajustadoresPorCiudad}
            inspectores={inspectoresPorCiudad}
            rol={rolUsuario}
            modulo="previsora"
            i18nNs="previsora"
            ciudadSeleccionada={form.ciudad}
            filtrarPorCiudad={false}
          />
          <Campo label={t('previsora.fields.fechaAsignacion')}>
            <InputFenix
              type="date"
              value={form.fechaAsignacion}
              onChange={setCampo('fechaAsignacion')}
            />
          </Campo>
          <Campo label={t('previsora.fields.fechaVisita')}>
            <InputFenix
              type="date"
              value={form.fechaVisita}
              onChange={setCampo('fechaVisita')}
            />
          </Campo>
          <Campo label={t('previsora.fields.observaciones')} className="md:col-span-2 lg:col-span-3">
            <textarea
              className="min-h-[88px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-body text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              value={form.observaciones}
              onChange={setCampo('observaciones')}
              placeholder={t('previsora.placeholders.observaciones')}
            />
          </Campo>
        </div>
        {soloInspector ? (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
            {t('previsora.permissions.inspectorHint', {
              defaultValue:
                'Su rol de inspector solo permite ver el caso y modificar el estado.',
            })}
          </p>
        ) : null}
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('previsora.sections.values')}</h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('previsora.sections.valuesHint')}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('previsora.fields.valorAseguradoInmueble')}>
            {inputMiles('valorAseguradoInmueble')}
          </Campo>
          <Campo label={t('previsora.fields.valorAseguradoContenidos')}>
            {inputMiles('valorAseguradoContenidos')}
          </Campo>
          <Campo label={t('previsora.fields.valorReservaPreventivaPromedio')}>
            {inputMiles('valorReservaPreventivaPromedio')}
          </Campo>
          <Campo label={t('previsora.fields.valorComercialInmueble')}>
            {inputMiles('valorComercialInmueble')}
          </Campo>
          <Campo label={t('previsora.fields.reserva')}>{inputMiles('reserva')}</Campo>
          <Campo label={t('previsora.fields.valorReclamado')}>
            {inputMiles('valorReclamado')}
          </Campo>
          <Campo label={t('previsora.fields.valorLiquidado')}>
            {inputMiles('valorLiquidado')}
          </Campo>
        </div>
        <Campo label={t('previsora.fields.observacionReserva')} className="mt-4">
          <textarea
            className="min-h-[88px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-body text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            value={form.observacionReserva || ''}
            onChange={setCampo('observacionReserva')}
            placeholder={t('previsora.placeholders.observacionReserva')}
          />
        </Campo>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('previsora.sections.actionDates')}</h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('previsora.sections.actionDatesHint')}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('previsora.fields.fechaCasoNuevo')}>
            <InputFenix type="date" value={form.fechaCasoNuevo} onChange={setCampo('fechaCasoNuevo')} />
          </Campo>
          <CampoFranjaCoordinacion
            labelFecha={t('previsora.fields.fechaCoordinandoInspeccion')}
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
          <Campo label={t('previsora.fields.fechaAnalisisCaso')}>
            <InputFenix
              type="date"
              value={form.fechaAnalisisCaso}
              onChange={setCampo('fechaAnalisisCaso')}
            />
          </Campo>
          <Campo label={t('previsora.fields.fechaSolicitudDocumento')}>
            <InputFenix
              type="date"
              value={form.fechaSolicitudDocumento}
              onChange={setCampo('fechaSolicitudDocumento')}
            />
          </Campo>
          <Campo label={t('previsora.fields.fechaRecepcionDocumento')}>
            <InputFenix
              type="date"
              value={form.fechaRecepcionDocumento}
              onChange={setCampo('fechaRecepcionDocumento')}
            />
          </Campo>
          <Campo label={t('previsora.fields.fechaObjecion')}>
            <InputFenix type="date" value={form.fechaObjecion} onChange={setCampo('fechaObjecion')} />
          </Campo>
          <Campo label={t('previsora.fields.fechaAutorizacionAnalista')}>
            <InputFenix
              type="date"
              value={form.fechaAutorizacionAnalista}
              onChange={setCampo('fechaAutorizacionAnalista')}
            />
          </Campo>
          <Campo label={t('previsora.fields.fechaCasoParaPago')}>
            <InputFenix
              type="date"
              value={form.fechaCasoParaPago}
              onChange={setCampo('fechaCasoParaPago')}
            />
          </Campo>
          <Campo label={t('previsora.fields.diasEnEstado')}>
            <InputFenix value={diasEnEstadoPrevisora(form)} readOnly />
          </Campo>
          <Campo label={t('previsora.fields.ultimaGestion')}>
            <InputFenix value={formatDate(ultimaGestionPrevisora(form)) || '—'} readOnly />
          </Campo>
          <Campo label={t('previsora.fields.documentoFaltante')} className="md:col-span-2 lg:col-span-3">
            <InputFenix
              value={form.documentoFaltante}
              onChange={setCampo('documentoFaltante')}
              placeholder={t('previsora.placeholders.documentoFaltante')}
            />
          </Campo>
          <Campo label={t('previsora.fields.responsableAporteDocumento')}>
            <InputFenix
              value={form.responsableAporteDocumento}
              onChange={setCampo('responsableAporteDocumento')}
            />
          </Campo>
          <Campo label={t('previsora.fields.observacionPendienteDocumento')} className="md:col-span-2">
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-body text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              value={form.observacionPendienteDocumento}
              onChange={setCampo('observacionPendienteDocumento')}
            />
          </Campo>
          <Campo label={t('previsora.fields.motivoObjecion')} className="md:col-span-2 lg:col-span-3">
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-body text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              value={form.motivoObjecion}
              onChange={setCampo('motivoObjecion')}
            />
          </Campo>
        </div>
      </section>

      <fieldset
        disabled={soloInspector}
        className="min-w-0 space-y-5 border-0 p-0 m-0 disabled:opacity-80"
      >
      {!esModuloListado && (
      <>
      {/* CAT Previsora — campos del Excel CAT_PREVISORA */}
      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('previsora.sections.catPrevisora')}</h3>
        <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('previsora.sections.catPrevisoraHint')}
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('previsora.fields.riskId')}>
            <InputFenix value={form.riskId} onChange={setCampo('riskId')} placeholder="Ej: 3518" />
          </Campo>
          <Campo label={t('previsora.fields.distanciaEpicentroKm')}>
            <InputFenix
              type="text"
              inputMode="decimal"
              value={form.distanciaEpicentroKm}
              onChange={setCampo('distanciaEpicentroKm')}
              placeholder="Ej: 77.92"
            />
          </Campo>
          <Campo label={t('previsora.fields.tipoNegocioHomologado')}>
            {selectSimple('tipoNegocioHomologado', TIPOS_NEGOCIO_HOMOLOGADO_PREVISORA)}
          </Campo>
          <Campo label={t('previsora.fields.catUbicacionReferencia')}>
            <InputFenix
              value={form.catUbicacionReferencia}
              onChange={setCampo('catUbicacionReferencia')}
              placeholder="Ej: Pereira, Cali…"
            />
          </Campo>
          <Campo label={t('previsora.fields.addressNumber')}>
            <InputFenix value={form.addressNumber} onChange={setCampo('addressNumber')} />
          </Campo>
          <Campo label={t('previsora.fields.direccionInspeccionSugerida')} className="md:col-span-2 lg:col-span-3">
            <InputFenix
              value={form.direccionInspeccionSugerida}
              onChange={setCampo('direccionInspeccionSugerida')}
            />
          </Campo>
          <Campo label={t('previsora.fields.linkGoogleMaps')} className="md:col-span-2 lg:col-span-3">
            <InputFenix
              value={form.linkGoogleMaps}
              onChange={setCampo('linkGoogleMaps')}
              placeholder="https://www.google.com/maps/…"
            />
          </Campo>
          <Campo label={t('previsora.fields.grupoInspeccion')}>
            <InputFenix value={form.grupoInspeccion} onChange={setCampo('grupoInspeccion')} />
          </Campo>
          <Campo label={t('previsora.fields.afectacion')}>
            {selectSimple('afectacion', OPCIONES_SI_NO_PREVISORA)}
          </Campo>
          <Campo label={t('previsora.fields.gradoAfectacion')}>
            {selectSimple('gradoAfectacion', GRADOS_AFECTACION_PREVISORA)}
          </Campo>
          <Campo label={t('previsora.fields.lucroCesante')}>
            {selectSimple('lucroCesante', OPCIONES_SI_NO_PREVISORA)}
          </Campo>
          <Campo label={t('previsora.fields.fechaInspeccion')}>
            <InputFenix
              type="date"
              value={form.fechaInspeccion}
              onChange={setCampo('fechaInspeccion')}
            />
          </Campo>
          <Campo label={t('previsora.fields.fechaLlamada')}>
            <InputFenix
              type="date"
              value={form.fechaLlamada || ''}
              onChange={setCampo('fechaLlamada')}
            />
          </Campo>
          <Campo label={t('previsora.fields.observacionLlamada')} className="md:col-span-2 lg:col-span-3">
            <textarea
              className="min-h-[88px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-body text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              value={form.observacionLlamada || ''}
              onChange={setCampo('observacionLlamada')}
              placeholder={t('previsora.placeholders.observacionLlamada')}
            />
          </Campo>
          <Campo label={t('previsora.fields.observacionesCat')} className="md:col-span-2 lg:col-span-3">
            <textarea
              className="min-h-[88px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-body text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              value={form.observacionesCat}
              onChange={setCampo('observacionesCat')}
              placeholder={t('previsora.placeholders.observacionesCat')}
            />
          </Campo>
        </div>
      </section>

      {/* Información general (personas / póliza) — desplegable */}
      <details className={`${expressFormSection} group`}>
        <summary className="cursor-pointer list-none font-heading text-base font-bold text-gray-900 marker:content-none dark:text-white">
          <span className="inline-flex items-center gap-2">
            <span className="text-fenix-primario transition group-open:rotate-90">▸</span>
            {t('previsora.sections.generalInfo')}
          </span>
          <p className="mt-1 font-body text-sm font-normal text-gray-500">
            {t('previsora.sections.generalInfoHint')}
          </p>
        </summary>

        <div className="mt-4 space-y-5 border-t border-gray-200 pt-4 dark:border-gray-700">
          <section>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              {t('previsora.sections.identification')}
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Campo label={t('previsora.fields.siniestro')}>
                <InputFenix
                  value={form.siniestro}
                  onChange={setCampo('siniestro')}
                  placeholder={t('previsora.placeholders.siniestro')}
                />
              </Campo>
              <Campo label={t('previsora.fields.tipoIdentificacion')}>
                {selectSimple('tipoIdentificacion', TIPOS_IDENTIFICACION_PREVISORA)}
              </Campo>
              <Campo label={t('previsora.fields.identificacion')}>
                <InputFenix
                  value={form.identificacion}
                  onChange={setCampo('identificacion')}
                  placeholder={t('previsora.placeholders.identificacion')}
                />
              </Campo>
              <Campo label={t('previsora.fields.causa')}>
                <InputFenix
                  value={form.causa}
                  onChange={setCampo('causa')}
                  placeholder={t('previsora.placeholders.causa')}
                />
              </Campo>
              <CampoTomadorPrevisora
                value={form.tomador}
                onChange={(valor) => setForm((prev) => ({ ...prev, tomador: valor }))}
              />
              <Campo label={t('previsora.fields.direccionPredio')}>
                <InputFenix value={form.direccionPredio} onChange={setCampo('direccionPredio')} />
              </Campo>
              <Campo label={t('previsora.fields.informacionContacto')}>
                <InputFenix
                  value={form.informacionContacto}
                  onChange={setCampo('informacionContacto')}
                  placeholder={t('previsora.placeholders.contacto')}
                />
              </Campo>
              <Campo label={t('previsora.fields.correo')}>
                <InputFenix
                  type="email"
                  value={form.correo}
                  onChange={setCampo('correo')}
                  placeholder={t('previsora.placeholders.correo')}
                />
              </Campo>
              <Campo label={t('previsora.fields.celular')}>
                <InputFenix
                  value={form.celular}
                  onChange={setCampo('celular')}
                  placeholder={t('previsora.placeholders.celular')}
                />
              </Campo>
              <Campo label={t('previsora.fields.canalRadicacion')}>
                <InputFenix
                  value={form.canalRadicacion}
                  onChange={setCampo('canalRadicacion')}
                  placeholder="Ej: Previsora"
                />
              </Campo>
              <Campo label={t('previsora.fields.departamento')}>
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
              <Campo label={t('previsora.fields.ciudad')}>
                <SelectFenix
                  value={form.ciudad}
                  onChange={setCampo('ciudad')}
                  disabled={cargandoCatalogos && ciudadesFiltradas.length === 0}
                >
                  <option value="">
                    {form.departamento
                      ? t('previsora.placeholders.selectCity')
                      : t('previsora.placeholders.selectDepartmentFirst')}
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
              {t('previsora.sections.policyCoverage')}
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Campo label={t('previsora.fields.numeroPoliza')}>
                <InputFenix
                  value={form.numeroPoliza}
                  onChange={setCampo('numeroPoliza')}
                  placeholder={t('previsora.placeholders.poliza')}
                />
              </Campo>
              <Campo label={t('previsora.fields.tipoPoliza')}>
                {selectSimple('tipoPoliza', TIPOS_POLIZA_PREVISORA)}
              </Campo>
              {esTipoPolizaOtroPrevisora(form.tipoPoliza) && (
                <Campo label={t('previsora.fields.tipoPolizaOtro')}>
                  <InputFenix
                    value={form.tipoPolizaOtro}
                    onChange={setCampo('tipoPolizaOtro')}
                    placeholder={t('previsora.placeholders.tipoPolizaOtro')}
                  />
                </Campo>
              )}
              <Campo label={t('previsora.fields.fechaInicioPoliza')}>
                <InputFenix
                  type="date"
                  value={form.fechaInicioPoliza}
                  onChange={setCampo('fechaInicioPoliza')}
                />
              </Campo>
              <Campo label={t('previsora.fields.fechaFinPoliza')}>
                <InputFenix
                  type="date"
                  value={form.fechaFinPoliza}
                  onChange={setCampo('fechaFinPoliza')}
                />
              </Campo>
              <Campo label={t('previsora.fields.numeroCredito')}>
                <InputFenix value={form.numeroCredito} onChange={setCampo('numeroCredito')} />
              </Campo>
              <Campo label={t('previsora.fields.cobertura')}>
                <InputFenix
                  value={form.cobertura}
                  onChange={setCampo('cobertura')}
                  placeholder={t('previsora.placeholders.cobertura')}
                />
              </Campo>
              <Campo label={t('previsora.fields.estadoPagoPrimas')}>
                <InputFenix
                  value={form.estadoPagoPrimas}
                  onChange={setCampo('estadoPagoPrimas')}
                  placeholder={t('previsora.placeholders.estadoPagoPrimas')}
                />
              </Campo>
            </div>
          </section>

          <section>
            <h4 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              {t('previsora.sections.dates')}
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Campo label={t('previsora.fields.fechaSiniestro')}>
                <InputFenix
                  type="date"
                  value={form.fechaSiniestro}
                  onChange={setCampo('fechaSiniestro')}
                />
              </Campo>
              <Campo label={t('previsora.fields.fechaLlamada')}>
                <InputFenix
                  type="date"
                  value={form.fechaLlamada || ''}
                  onChange={setCampo('fechaLlamada')}
                />
              </Campo>
              <Campo label={t('previsora.fields.fechaUltimoDocumento')}>
                <InputFenix
                  type="date"
                  value={form.fechaUltimoDocumento}
                  onChange={setCampo('fechaUltimoDocumento')}
                />
              </Campo>
              <Campo label={t('previsora.fields.fechaLiquidado')}>
                <InputFenix
                  type="date"
                  value={form.fechaLiquidado}
                  onChange={setCampo('fechaLiquidado')}
                />
              </Campo>
              <Campo label={t('previsora.fields.fechaAceptacionLiquidacion')}>
                <InputFenix
                  type="date"
                  value={form.fechaAceptacionLiquidacion}
                  onChange={setCampo('fechaAceptacionLiquidacion')}
                />
              </Campo>
              <Campo label={t('previsora.fields.fechaEnvioAseguradora')}>
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
          {esEdicion ? t('previsora.actions.reset') : t('previsora.actions.clear')}
        </button>
        <button type="submit" className={expressBtnPrimary} disabled={guardando}>
          <FaSave />
          {guardando
            ? t('previsora.actions.saving')
            : esEdicion
              ? t('previsora.actions.saveChanges')
              : t('previsora.actions.saveCase')}
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
    <div className={`${PrevisoraRoot} ${expressScope}`}>
      <div className={expressPageWrap}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className={expressBadge}>{esModuloListado ? 'Previsora · Listado' : 'Previsora · CAT'}</span>
            <div>
              <h1 className={expressPageTitle}>{t('previsora.page.addTitle')}</h1>
              <p className={expressPageSubtitle}>{t('previsora.page.addSubtitle')}</p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm">
                {t('nav.previsoraAddCase')}
              </span>
              <Link
                to={esModuloListado ? '/previsora/listado/reporte' : '/previsora/reporte'}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                {esModuloListado ? t('nav.previsoraListadoReport') : t('nav.previsoraReport')}
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
                {t('previsora.bulk.title')}
              </h2>
            </div>
            <div className={expressCardBody}>
              <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-300">
                {t('previsora.bulk.subtitle')}
              </p>
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={guardando}
                onClick={() => setModalImportOpen(true)}
              >
                <FaUpload />
                {t('previsora.bulk.upload')}
              </button>
              <span className="ml-3 inline-flex items-center gap-2 font-body text-xs text-gray-500 dark:text-gray-400">
                <FaFileExcel />
                {t('previsora.bulk.hint')}
              </span>
              {resumenImport && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <p className="font-body text-xs text-gray-500">{t('previsora.bulk.received')}</p>
                    <p className="font-heading text-xl font-bold">{resumenImport.rows ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <p className="font-body text-xs text-gray-500">{t('previsora.bulk.created')}</p>
                    <p className="font-heading text-xl font-bold text-fenix-primario">
                      {resumenImport.created ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <p className="font-body text-xs text-gray-500">{t('previsora.bulk.updated')}</p>
                    <p className="font-heading text-xl font-bold">{resumenImport.updated ?? 0}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <ModalImportarExcelPrevisora
          open={modalImportOpen}
          onClose={() => setModalImportOpen(false)}
          onCompleted={async (data) => {
            setResumenImport(data?.totals || null);
            setExito(t('previsora.bulk.success', {
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
                ? t('previsora.page.editCase', { caseNumber: initialData?.consecutivo || '' })
                : t('previsora.page.newCase')}
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

export default FormularioPrevisora;
