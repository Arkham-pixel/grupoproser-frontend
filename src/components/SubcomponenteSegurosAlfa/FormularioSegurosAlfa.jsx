import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaFileExcel, FaSave, FaUndo, FaUpload } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../../config/apiConfig.js';
import {
  crearCasoAlfa,
  actualizarCasoAlfa,
  crearPredioVinculadoAlfa,
} from '../../services/segurosAlfaService.js';
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
  ExpressModal,
  InputFenix,
  SelectFenix,
  TextareaFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  CAMPOS_NUMERICOS_ALFA,
  ESTADOS_REQUIEREN_OBS_ALFA,
  FORM_VACIO_ALFA,
  PLANTILLA_COMUNICACION_BAJO_DEDUCIBLE,
  construirFormDesdeCasoAlfa,
  estadoGestionDesdeEstadoAlfa,
  formatMilesInput,
  homologarEstadoAlfa,
  casoAlfaVenceSla2Dias,
  casoTieneEvidenciaComunicacionBajoDeducible,
} from './segurosAlfaHelpers.js';
import BarraEstadosSegurosAlfa from './BarraEstadosSegurosAlfa.jsx';
import CampoTomadorAlfa from './CampoTomadorAlfa.jsx';
import ModalImportarExcelAlfa, {
  esUsuarioAlfaExcelActualizar,
} from './ModalImportarExcelAlfa.jsx';
import AlfaControlSeguimientoBanner from './AlfaControlSeguimientoBanner.jsx';
import CamposAsignacionCaso from '../shared/CamposAsignacionCaso.jsx';
import SelectBuscable from '../SelectBuscable.jsx';
import { obtenerRolAlmacenado } from '../../config/roles.js';
import {
  attrsCampoCaso,
  esRolInspector,
  filtrarPayloadCasoPorRol,
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

const alfaRoot = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

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

const FormularioSegurosAlfa = ({ initialData = null, embed = false, onClose, onSaved }) => {
  const { t } = useTranslation();
  const rolUsuario = obtenerRolAlmacenado();
  const soloInspector = esRolInspector(rolUsuario);
  const esEdicion = Boolean(initialData?._id);
  const puedeImportarExcel = esUsuarioAlfaExcelActualizar();
  const [form, setForm] = useState(() =>
    initialData ? construirFormDesdeCasoAlfa(initialData) : { ...FORM_VACIO_ALFA }
  );
  const [guardando, setGuardando] = useState(false);
  const [modalImportOpen, setModalImportOpen] = useState(false);
  const [modalPredioOpen, setModalPredioOpen] = useState(false);
  const [predioForm, setPredioForm] = useState({
    direccionPredio: '',
    ciudad: '',
    departamento: '',
    zonaAsignada: '',
  });
  const [guardandoPredio, setGuardandoPredio] = useState(false);
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

  const formKey = esEdicion ? `alfa:${initialData._id}` : 'alfa:nuevo';
  const onDraftRestoreAvailable = useCallback((info) => {
    setDraftToRestore(info);
    setShowDraftRestore(true);
  }, []);
  const { draftStatus, lastDraftAt, discardDraft, consumeDraft } = useArnaldFormDraft({
    formKey,
    modulo: 'alfa',
    recursoId: initialData?._id || '',
    titulo: 'Caso Alfa',
    formData: form,
    enabled: true,
    onRestoreAvailable: onDraftRestoreAvailable,
  });

  useEffect(() => {
    setForm(initialData ? construirFormDesdeCasoAlfa(initialData) : { ...FORM_VACIO_ALFA });
    setError(null);
    setExito(null);
    setResumenImport(null);
    // Solo al cambiar de caso (no en cada re-render del objeto initialData)
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
        setAjustadoresCat(mapCatalogoCatastroficoAOpciones(listaAj, 'alfa'));
        setInspectoresCat(mapCatalogoCatastroficoAOpciones(listaIns, 'alfa'));
        const lideresOpts = mapResponsablesAOpciones(listaResp);
        if (!esEdicion) {
          const liderDefault = resolverLiderPorModulo(lideresOpts, 'alfa');
          if (liderDefault) {
            setForm((prev) =>
              prev.ajustadorLider ? prev : { ...prev, ajustadorLider: liderDefault }
            );
          }
        }
      } catch (err) {
        if (!cancelado) console.error('Error cargando catálogos Seguros Alfa:', err);
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
    const base = ciudadesFiltradas.map((c) => ({ value: c, label: c }));
    const actual = String(form.ciudad || '').trim();
    if (actual && !ciudadesFiltradas.some((c) => normTxt(c) === normTxt(actual))) {
      return [{ value: actual, label: actual }, ...base];
    }
    return base;
  }, [ciudadesFiltradas, form.ciudad]);

  const ajustadoresPorCiudad = useMemo(() => {
    const filtrados = filtrarOpcionesPorCiudad(ajustadoresCat, form.ciudad);
    return asegurarOpcionActual(filtrados, form.ajustador);
  }, [ajustadoresCat, form.ciudad, form.ajustador]);
  const inspectoresPorCiudad = useMemo(() => {
    const filtrados = filtrarOpcionesPorCiudad(inspectoresCat, form.ciudad);
    return asegurarOpcionActual(filtrados, form.inspector);
  }, [inspectoresCat, form.ciudad, form.inspector]);
  const lideresSoloSilvia = useMemo(
    () => filtrarLideresPorModulo(responsables, 'alfa'),
    [responsables]
  );

  const setCampo = (clave) => (e) => {
    if (!puedeEditarCampoCaso(rolUsuario, clave)) return;
    const valor = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [clave]: valor }));
  };

  const setDepartamento = (e) => {
    if (!puedeEditarCampoCaso(rolUsuario, 'departamento')) return;
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
    if (!puedeEditarCampoCaso(rolUsuario, clave)) return;
    const valor = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [clave]: formatMilesInput(valor) }));
  };

  const camposNumericos = useMemo(() => CAMPOS_NUMERICOS_ALFA, []);

  const inputMiles = (clave) => (
    <InputFenix
      type="text"
      inputMode="numeric"
      value={form[clave]}
      onChange={setCampoMiles(clave)}
      placeholder="0"
      {...attrsCampoCaso(rolUsuario, clave)}
    />
  );

  const construirPayload = () => {
    const payload = { ...form };
    camposNumericos.forEach((clave) => {
      payload[clave] = aNumero(payload[clave]);
    });
    // Asegurar campos ARNALD de llamada (no dependen de Excel/SharePoint)
    payload.fechaLlamada = form.fechaLlamada ? String(form.fechaLlamada).trim() : '';
    payload.observacionLlamada =
      form.observacionLlamada != null ? String(form.observacionLlamada) : '';
    payload.fueraDeZona = Boolean(form.fueraDeZona);
    payload.observacionesGestion =
      form.observacionesGestion != null ? String(form.observacionesGestion) : '';
    payload.estado = homologarEstadoAlfa(form.estado, form);
    payload.estadoGestion = estadoGestionDesdeEstadoAlfa(payload.estado);
    payload.zonaAsignada = form.zonaAsignada || '';
    payload.noAceptacionOferta = Boolean(form.noAceptacionOferta);
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (!form.identificacion.trim()) {
      setError(t('segurosAlfa.validation.identificacionRequired'));
      return;
    }
    if (!form.estado.trim()) {
      setError(t('segurosAlfa.validation.statusRequired'));
      return;
    }
    if (
      ESTADOS_REQUIEREN_OBS_ALFA.has(homologarEstadoAlfa(form.estado, form)) &&
      !String(form.observacionesGestion || '').trim()
    ) {
      setError(
        'Observaciones de gestión obligatorias para Sin respuesta / Solicitud de documentos.'
      );
      return;
    }
    if (form.fueraDeZona && !String(form.observacionesGestion || '').trim()) {
      setError('Caso fuera de zona: indique en observaciones la reasignación / aviso.');
      return;
    }
    if (form.noAceptacionOferta && !String(form.observacionesGestion || '').trim()) {
      setError('No aceptación de oferta: las observaciones de gestión son obligatorias.');
      return;
    }
    if (
      String(form.estado || '').toUpperCase() === 'CERRADO' &&
      form.fechaComunicacionBajoDeducible &&
      !casoTieneEvidenciaComunicacionBajoDeducible(esEdicion ? initialData : form)
    ) {
      setError(
        'Cierre bajo deducible: cargue evidencia en archivero (COMUNICACION / OBJECION_DEDUCIBLE) antes de cerrar.'
      );
      return;
    }

    setGuardando(true);
    try {
      const bruto = construirPayload();
      const { payload } = filtrarPayloadCasoPorRol(
        rolUsuario,
        bruto,
        esEdicion ? initialData || {} : {}
      );
      let guardado;
      if (esEdicion) {
        guardado = await actualizarCasoAlfa(initialData._id, payload);
      } else {
        if (soloInspector) {
          setError(
            t('segurosAlfa.permissions.inspectorCannotCreate', {
              defaultValue: 'El inspector no puede crear casos; solo modificar el estado.',
            })
          );
          setGuardando(false);
          return;
        }
        guardado = await crearCasoAlfa(payload);
      }
      setExito(
        esEdicion
          ? t('segurosAlfa.messages.caseUpdated', { caseNumber: guardado.consecutivo || '' })
          : t('segurosAlfa.messages.caseCreated', { caseNumber: guardado.consecutivo || '' })
      );
      if (esEdicion) {
        setForm(construirFormDesdeCasoAlfa(guardado));
      } else {
        setForm({ ...FORM_VACIO_ALFA });
      }
      if (onSaved) await onSaved(guardado);
      await discardDraft();
    } catch (err) {
      console.error('Error guardando caso Seguros Alfa:', err);
      setError(err.message || t('segurosAlfa.messages.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  const limpiar = () => {
    setForm(initialData ? construirFormDesdeCasoAlfa(initialData) : { ...FORM_VACIO_ALFA });
    setError(null);
    setExito(null);
  };

  const selectSimple = (clave, opciones, placeholder = t('common.select')) => (
    <SelectFenix
      value={form[clave]}
      onChange={setCampo(clave)}
      {...attrsCampoCaso(rolUsuario, clave)}
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
        <h3 className={expressSectionTitle}>{t('segurosAlfa.sections.identification')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('segurosAlfa.fields.siniestro')}>
            <InputFenix
              value={form.siniestro}
              onChange={setCampo('siniestro')}
              placeholder={t('segurosAlfa.placeholders.siniestro')}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.identificacion')} required>
            <InputFenix
              value={form.identificacion}
              onChange={setCampo('identificacion')}
              placeholder={t('segurosAlfa.placeholders.identificacion')}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.asegurado')}>
            <InputFenix value={form.asegurado} onChange={setCampo('asegurado')} />
          </Campo>
          <CampoTomadorAlfa
            value={form.tomador}
            onChange={(valor) => setForm((prev) => ({ ...prev, tomador: valor }))}
          />
          <Campo label={t('segurosAlfa.fields.direccionPredio')}>
            <InputFenix value={form.direccionPredio} onChange={setCampo('direccionPredio')} />
          </Campo>
          <Campo label={t('segurosAlfa.fields.informacionContacto')}>
            <InputFenix
              value={form.informacionContacto}
              onChange={setCampo('informacionContacto')}
              placeholder={t('segurosAlfa.placeholders.contacto')}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.correo')}>
            <InputFenix
              type="email"
              value={form.correo}
              onChange={setCampo('correo')}
              placeholder={t('segurosAlfa.placeholders.correo')}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.celular')}>
            <InputFenix
              value={form.celular}
              onChange={setCampo('celular')}
              placeholder={t('segurosAlfa.placeholders.celular')}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.canalRadicacion')}>
            <InputFenix
              value={form.canalRadicacion}
              onChange={setCampo('canalRadicacion')}
              placeholder="Ej: Seguros Alfa"
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.departamento')}>
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
          <Campo label={t('segurosAlfa.fields.ciudad')}>
            <SelectBuscable
              options={opcionesCiudad}
              value={form.ciudad || ''}
              onChange={(val) => setCampo('ciudad')({ target: { value: val } })}
              disabled={
                attrsCampoCaso(rolUsuario, 'ciudad').disabled ||
                (cargandoCatalogos && ciudadesFiltradas.length === 0)
              }
              placeholder={
                form.departamento
                  ? t('segurosAlfa.placeholders.selectCity')
                  : t('segurosAlfa.placeholders.selectDepartmentFirst')
              }
              searchPlaceholder={t('common.searchEllipsis', { defaultValue: 'Buscar ciudad…' })}
              buttonClassName="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </Campo>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('segurosAlfa.sections.policyCoverage')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('segurosAlfa.fields.numeroPoliza')}>
            <InputFenix
              value={form.numeroPoliza}
              onChange={setCampo('numeroPoliza')}
              placeholder={t('segurosAlfa.placeholders.poliza')}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.fechaInicioPoliza')}>
            <InputFenix
              type="date"
              value={form.fechaInicioPoliza}
              onChange={setCampo('fechaInicioPoliza')}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.fechaFinPoliza')}>
            <InputFenix
              type="date"
              value={form.fechaFinPoliza}
              onChange={setCampo('fechaFinPoliza')}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.numeroCredito')}>
            <InputFenix value={form.numeroCredito} onChange={setCampo('numeroCredito')} />
          </Campo>
          <Campo label={t('segurosAlfa.fields.cobertura')}>
            <InputFenix
              value={form.cobertura}
              onChange={setCampo('cobertura')}
              placeholder={t('segurosAlfa.placeholders.cobertura')}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.estadoPagoPrimas')}>
            <InputFenix
              value={form.estadoPagoPrimas}
              onChange={setCampo('estadoPagoPrimas')}
              placeholder={t('segurosAlfa.placeholders.estadoPagoPrimas')}
            />
          </Campo>
          <div className="md:col-span-2 lg:col-span-3">
            <Campo label={t('segurosAlfa.fields.estado')} required>
              <BarraEstadosSegurosAlfa
                valor={form.estado}
                disabled={!puedeEditarCampoCaso(rolUsuario, 'estado')}
                onChange={(estado) => {
                  if (!puedeEditarCampoCaso(rolUsuario, 'estado')) return;
                  setForm((prev) => ({ ...prev, estado }));
                }}
              />
            </Campo>
          </div>
          <Campo label="Zona asignada">
            <InputFenix
              value={form.zonaAsignada || ''}
              onChange={setCampo('zonaAsignada')}
              placeholder="Ej. Cali / Valle"
            />
          </Campo>
          <Campo label="Fuera de zona">
            <SelectFenix
              value={form.fueraDeZona ? '1' : '0'}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, fueraDeZona: e.target.value === '1' }))
              }
            >
              <option value="0">No</option>
              <option value="1">Sí — informar reasignación</option>
            </SelectFenix>
          </Campo>
          <CamposAsignacionCaso
            form={form}
            setCampo={setCampo}
            lideres={lideresSoloSilvia}
            ajustadores={ajustadoresPorCiudad}
            inspectores={inspectoresPorCiudad}
            rol={rolUsuario}
            modulo="alfa"
            i18nNs="segurosAlfa"
            ciudadSeleccionada={form.ciudad}
            filtrarPorCiudad
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3">
          <Campo label="Observaciones de gestión">
            <TextareaFenix
              value={form.observacionesGestion || ''}
              onChange={setCampo('observacionesGestion')}
              rows={3}
              placeholder="No aceptación, falta de contacto, info pendiente, acceso, inconsistencias…"
            />
          </Campo>
          <Campo label="No aceptación de oferta">
            <SelectFenix
              value={form.noAceptacionOferta ? '1' : '0'}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  noAceptacionOferta: e.target.value === '1',
                }))
              }
            >
              <option value="0">No</option>
              <option value="1">Sí — exige observación</option>
            </SelectFenix>
          </Campo>
          {esEdicion && casoAlfaVenceSla2Dias(form) ? (
            <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
              SLA 2 días: la inspección ya venció sin documentación/estado actualizado.
            </p>
          ) : null}
          {form.fueraDeZona ? (
            <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
              Caso fuera de zona asignada: no atender sin autorización; deje constancia en observaciones.
            </p>
          ) : null}
          {esEdicion ? (
            <div className="flex flex-wrap items-end gap-3">
              <button
                type="button"
                className={expressBtnGhost}
                onClick={() => {
                  setPredioForm({
                    direccionPredio: '',
                    ciudad: form.ciudad || '',
                    departamento: form.departamento || '',
                    zonaAsignada: form.zonaAsignada || '',
                  });
                  setModalPredioOpen(true);
                }}
              >
                Crear predio vinculado
              </button>
              <Campo label="Comunicación bajo deducible (fecha envío)">
                <InputFenix
                  type="date"
                  value={form.fechaComunicacionBajoDeducible || ''}
                  onChange={setCampo('fechaComunicacionBajoDeducible')}
                />
              </Campo>
              <button
                type="button"
                className={expressBtnGhost}
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    observacionesGestion: [
                      String(prev.observacionesGestion || '').trim(),
                      PLANTILLA_COMUNICACION_BAJO_DEDUCIBLE,
                    ]
                      .filter(Boolean)
                      .join('\n\n'),
                  }));
                  setExito(
                    'Plantilla bajo deducible insertada. Cargue evidencia COMUNICACION/OBJECION_DEDUCIBLE en archivero.'
                  );
                }}
              >
                Insertar plantilla bajo deducible
              </button>
            </div>
          ) : null}
        </div>
        {soloInspector ? (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
            {t('segurosAlfa.permissions.inspectorHint', {
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
      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('segurosAlfa.sections.values')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('segurosAlfa.fields.valorAseguradoSid', { defaultValue: 'Valor asegurado SID' })}>
            {inputMiles('valorAseguradoSid')}
          </Campo>
          <Campo label={t('segurosAlfa.fields.valorAseguradoInmueble')}>
            {inputMiles('valorAseguradoInmueble')}
          </Campo>
          <Campo label={t('segurosAlfa.fields.valorAseguradoContenidos')}>
            {inputMiles('valorAseguradoContenidos')}
          </Campo>
          <Campo label={t('segurosAlfa.fields.valorReservaPreventivaPromedio')}>
            {inputMiles('valorReservaPreventivaPromedio')}
          </Campo>
          <Campo label={t('segurosAlfa.fields.valorComercialInmueble')}>
            {inputMiles('valorComercialInmueble')}
          </Campo>
          <Campo label={t('segurosAlfa.fields.reserva')}>{inputMiles('reserva')}</Campo>
          <Campo label={t('segurosAlfa.fields.valorReclamado')}>
            {inputMiles('valorReclamado')}
          </Campo>
          <Campo label={t('segurosAlfa.fields.valorLiquidado')}>
            {inputMiles('valorLiquidado')}
          </Campo>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('segurosAlfa.sections.dates')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('segurosAlfa.fields.fechaAviso', { defaultValue: 'Fecha aviso' })}>
            <InputFenix type="date" value={form.fechaAviso} onChange={setCampo('fechaAviso')} />
          </Campo>
          <Campo label={t('segurosAlfa.fields.fechaSiniestro')}>
            <InputFenix type="date" value={form.fechaSiniestro} onChange={setCampo('fechaSiniestro')} />
          </Campo>
          <Campo label={t('segurosAlfa.fields.fechaLlamada')}>
            <InputFenix
              type="date"
              value={form.fechaLlamada}
              onChange={setCampo('fechaLlamada')}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.fechaInspeccion')}>
            <InputFenix
              type="date"
              value={form.fechaInspeccion}
              onChange={setCampo('fechaInspeccion')}
            />
          </Campo>
        </div>
        <Campo label={t('segurosAlfa.fields.observacionLlamada')} className="mt-4">
          <TextareaFenix
            rows={3}
            value={form.observacionLlamada || ''}
            onChange={setCampo('observacionLlamada')}
            placeholder={t('segurosAlfa.placeholders.observacionLlamada')}
          />
        </Campo>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('segurosAlfa.fields.fechaUltimoDocumento')}>
            <InputFenix
              type="date"
              value={form.fechaUltimoDocumento}
              onChange={setCampo('fechaUltimoDocumento')}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.fechaLiquidado')}>
            <InputFenix
              type="date"
              value={form.fechaLiquidado}
              onChange={setCampo('fechaLiquidado')}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.fechaAceptacionLiquidacion')}>
            <InputFenix
              type="date"
              value={form.fechaAceptacionLiquidacion}
              onChange={setCampo('fechaAceptacionLiquidacion')}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.fechaEnvioAseguradora')}>
            <InputFenix
              type="date"
              value={form.fechaEnvioAseguradora}
              onChange={setCampo('fechaEnvioAseguradora')}
            />
          </Campo>
        </div>
      </section>
      </fieldset>

      <div className="flex flex-col justify-end gap-2 sm:flex-row">
        {embed && onClose && (
          <button type="button" className={expressBtnGhost} onClick={onClose} disabled={guardando}>
            {t('common.close')}
          </button>
        )}
        <button type="button" className={expressBtnGhost} onClick={limpiar} disabled={guardando}>
          <FaUndo />
          {esEdicion ? t('segurosAlfa.actions.reset') : t('segurosAlfa.actions.clear')}
        </button>
        <button type="submit" className={expressBtnPrimary} disabled={guardando}>
          <FaSave />
          {guardando
            ? t('segurosAlfa.actions.saving')
            : esEdicion
              ? t('segurosAlfa.actions.saveChanges')
              : t('segurosAlfa.actions.saveCase')}
        </button>
      </div>
    </form>
  );

  const modalPredioVinculado = (
    <ExpressModal
      open={modalPredioOpen}
      onClose={() => {
        if (guardandoPredio) return;
        setModalPredioOpen(false);
      }}
      title="Crear predio vinculado"
    >
      <div className="space-y-4 p-4 sm:p-6">
        <p className="font-body text-sm text-gray-600 dark:text-gray-300">
          Se crea un caso independiente (nuevo consecutivo y expediente) con el mismo
          siniestro/póliza/tomador y la dirección que indiques.
        </p>
        <Campo label="Dirección del predio" required>
          <InputFenix
            value={predioForm.direccionPredio}
            onChange={(e) =>
              setPredioForm((prev) => ({ ...prev, direccionPredio: e.target.value }))
            }
            placeholder="Nueva dirección / predio"
            autoFocus
          />
        </Campo>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label={t('segurosAlfa.fields.ciudad')}>
            <InputFenix
              value={predioForm.ciudad}
              onChange={(e) =>
                setPredioForm((prev) => ({ ...prev, ciudad: e.target.value }))
              }
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.departamento')}>
            <InputFenix
              value={predioForm.departamento}
              onChange={(e) =>
                setPredioForm((prev) => ({ ...prev, departamento: e.target.value }))
              }
            />
          </Campo>
        </div>
        <Campo label="Zona asignada">
          <InputFenix
            value={predioForm.zonaAsignada}
            onChange={(e) =>
              setPredioForm((prev) => ({ ...prev, zonaAsignada: e.target.value }))
            }
          />
        </Campo>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            type="button"
            className={expressBtnGhost}
            disabled={guardandoPredio}
            onClick={() => setModalPredioOpen(false)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={expressBtnPrimary}
            disabled={guardandoPredio || !String(predioForm.direccionPredio || '').trim()}
            onClick={async () => {
              const dir = String(predioForm.direccionPredio || '').trim();
              if (!dir || !initialData?._id) return;
              setGuardandoPredio(true);
              setError(null);
              try {
                const creado = await crearPredioVinculadoAlfa(initialData._id, {
                  direccionPredio: dir,
                  ciudad: predioForm.ciudad || form.ciudad,
                  departamento: predioForm.departamento || form.departamento,
                  zonaAsignada: predioForm.zonaAsignada || form.zonaAsignada,
                });
                setModalPredioOpen(false);
                setExito(
                  `Predio vinculado creado: ${creado?.consecutivo || creado?._id || 'OK'}`
                );
                if (onSaved) await onSaved(creado);
              } catch (err) {
                setError(err.message || 'No se pudo crear el predio vinculado');
              } finally {
                setGuardandoPredio(false);
              }
            }}
          >
            {guardandoPredio ? 'Creando…' : 'Crear predio'}
          </button>
        </div>
      </div>
    </ExpressModal>
  );

  if (embed) {
    return (
      <div className={`${expressScope}`}>
        {contenidoFormulario}
        {modalPredioVinculado}
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
    <div className={`${alfaRoot} ${expressScope}`}>
      <div className={expressPageWrap}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className={expressBadge}>Seguros Alfa</span>
            <div>
              <h1 className={expressPageTitle}>{t('segurosAlfa.page.addTitle')}</h1>
              <p className={expressPageSubtitle}>{t('segurosAlfa.page.addSubtitle')}</p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm">
                {t('nav.alfaAddCase')}
              </span>
              <Link
                to="/seguros-alfa/reporte"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                {t('nav.alfaReport')}
              </Link>
            </nav>
          </div>
        </header>

        {error && <div className={expressAlertError}>{error}</div>}
        {exito && <div className={expressAlertSuccess}>{exito}</div>}

        {!esEdicion && (
          <AlfaControlSeguimientoBanner
            onCompleted={(data) => {
              setResumenImport(data?.totals || null);
              setExito(
                data?.successMessage || '✓ ARNALD está actualizado con Seguros Alfa'
              );
            }}
          />
        )}
        {esEdicion ? (
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-md border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900">
              Estado: <strong>{form.estado || '—'}</strong>
            </span>
            {form.grupoReclamacion ? (
              <span className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-100">
                Grupo: {form.grupoReclamacion}
              </span>
            ) : null}
          </div>
        ) : null}

        {puedeImportarExcel && !esEdicion && (
          <section className={expressCard}>
            <div className={expressCardHeader}>
              <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
                Importar Excel
              </h2>
            </div>
            <div className={expressCardBody}>
              <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-300">
                Analice y confirme un Excel de Seguros Alfa (preview → execute). Solo el usuario autorizado.
              </p>
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={guardando}
                onClick={() => {
                  setModalImportOpen(true);
                }}
              >
                <FaUpload />
                Importar Excel
              </button>
              <span className="ml-3 inline-flex items-center gap-2 font-body text-xs text-gray-500 dark:text-gray-400">
                <FaFileExcel />
                .xlsx / .xls
              </span>
              {resumenImport && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <p className="font-body text-xs text-gray-500">Leídos</p>
                    <p className="font-heading text-xl font-bold">{resumenImport.rows ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <p className="font-body text-xs text-gray-500">Creados</p>
                    <p className="font-heading text-xl font-bold text-fenix-primario">
                      {resumenImport.created ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                    <p className="font-body text-xs text-gray-500">Actualizados</p>
                    <p className="font-heading text-xl font-bold">{resumenImport.updated ?? 0}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <ModalImportarExcelAlfa
          open={modalImportOpen}
          onClose={() => {
            setModalImportOpen(false);
          }}
          onCompleted={async (data) => {
            setResumenImport(data?.totals || null);
            setExito('Importación Excel completada');
            if (onSaved) await onSaved(data);
          }}
        />

        {modalPredioVinculado}

        <section className={expressCard}>
          <div className={expressCardHeader}>
            <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
              {esEdicion
                ? t('segurosAlfa.page.editCase', { caseNumber: initialData?.consecutivo || '' })
                : t('segurosAlfa.page.newCase')}
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

export default FormularioSegurosAlfa;
