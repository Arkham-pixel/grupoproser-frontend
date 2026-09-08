import React, { useEffect, useMemo, useState } from 'react';
import { FaFileExcel, FaSave, FaUndo, FaUpload } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../../config/apiConfig.js';
import { crearCasoSura, actualizarCasoSura } from '../../services/segurosSuraService.js';
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
  TextareaFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import CampoFranjaCoordinacion from '../AgendaCatastrofico/CampoFranjaCoordinacion.jsx';
import {
  CAMPOS_NUMERICOS_SURA,
  ESTADOS_SURA,
  FORM_VACIO_SURA,
  construirFormDesdeCasoSura,
  formatMilesInput,
} from './segurosSuraHelpers.js';
import CampoTomadorSura from './CampoTomadorSura.jsx';
import ModalImportarExcelSura, {
  esAdminOSoporteSura,
} from './ModalImportarExcelSura.jsx';
import CamposAsignacionCaso from '../shared/CamposAsignacionCaso.jsx';
import SelectorDepartamentoCiudad from '../shared/SelectorDepartamentoCiudad.jsx';
import { obtenerRolAlmacenado } from '../../config/roles.js';
import {
  attrsCampoCaso,
  esRolInspector,
  esSesionConPermisoLiderSura,
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
import {
  aplicarCambioDepartamento,
  extraerListaCiudadesApi,
  mapearCiudadesDesdeApi,
} from '../../utils/ciudadesColombia.js';

const suraRoot = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

const aNumero = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return null;
  const n = Number(String(valor).replace(/\./g, '').replace(/[^\d-]/g, ''));
  return Number.isNaN(n) ? null : n;
};

const FormularioSegurosSura = ({ initialData = null, embed = false, onClose, onSaved }) => {
  const { t } = useTranslation();
  const rolUsuario = obtenerRolAlmacenado();
  const ctxPermiso = useMemo(() => obtenerContextoPermisoCaso('sura'), []);
  const soloInspector = esRolInspector(rolUsuario) && !esSesionConPermisoLiderSura();
  const esEdicion = Boolean(initialData?._id);
  const puedeImportarExcel = esAdminOSoporteSura();
  const [form, setForm] = useState(() =>
    initialData ? construirFormDesdeCasoSura(initialData) : { ...FORM_VACIO_SURA }
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

  useEffect(() => {
    setForm(initialData ? construirFormDesdeCasoSura(initialData) : { ...FORM_VACIO_SURA });
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
        setCiudadesRaw(mapearCiudadesDesdeApi(extraerListaCiudadesApi(dataCiudades)));
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
        setAjustadoresCat(mapCatalogoCatastroficoAOpciones(listaAj, 'sura'));
        setInspectoresCat(mapCatalogoCatastroficoAOpciones(listaIns, 'sura'));
        const lideresOpts = mapResponsablesAOpciones(listaResp);
        if (!esEdicion) {
          const liderDefault = resolverLiderPorModulo(lideresOpts, 'sura');
          if (liderDefault) {
            setForm((prev) =>
              prev.ajustadorLider ? prev : { ...prev, ajustadorLider: liderDefault }
            );
          }
        }
      } catch (err) {
        if (!cancelado) console.error('Error cargando catálogos Seguros Sura:', err);
      } finally {
        if (!cancelado) setCargandoCatalogos(false);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, []);

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
    setForm((prev) => ({ ...prev, [clave]: valor }));
  };

  const setDepartamento = (valor) => {
    if (!puedeEditarCampoCaso(rolUsuario, 'departamento', ctxPermiso)) return;
    setForm((prev) =>
      aplicarCambioDepartamento(prev, valor, ciudadesRaw, {
        departamentoKey: 'departamento',
        departamentoCiudadKey: null,
        ciudadKey: 'ciudad',
      })
    );
  };

  const setCiudad = (val) => {
    if (!puedeEditarCampoCaso(rolUsuario, 'ciudad', ctxPermiso)) return;
    setForm((prev) => ({ ...prev, ciudad: val }));
  };

  const setCampoMiles = (clave) => (e) => {
    if (!puedeEditarCampoCaso(rolUsuario, clave, ctxPermiso)) return;
    const valor = e?.target ? e.target.value : e;
    setForm((prev) => ({ ...prev, [clave]: formatMilesInput(valor) }));
  };

  const camposNumericos = useMemo(() => CAMPOS_NUMERICOS_SURA, []);

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
    const payload = { ...form };
    camposNumericos.forEach((clave) => {
      payload[clave] = aNumero(payload[clave]);
    });
    // Asegurar campos ARNALD de llamada (no dependen de Excel/SharePoint)
    payload.fechaLlamada = form.fechaLlamada ? String(form.fechaLlamada).trim() : '';
    payload.observacionLlamada =
      form.observacionLlamada != null ? String(form.observacionLlamada) : '';
    payload.observacionReserva =
      form.observacionReserva != null ? String(form.observacionReserva) : '';
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (!form.identificacion.trim()) {
      setError(t('segurosSura.validation.identificacionRequired'));
      return;
    }
    if (!form.estado.trim()) {
      setError(t('segurosSura.validation.statusRequired'));
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
        guardado = await actualizarCasoSura(initialData._id, payload);
      } else {
        if (soloInspector) {
          setError(
            t('segurosSura.permissions.inspectorCannotCreate', {
              defaultValue: 'El inspector no puede crear casos; solo modificar el estado.',
            })
          );
          setGuardando(false);
          return;
        }
        guardado = await crearCasoSura(payload);
      }
      setExito(
        esEdicion
          ? t('segurosSura.messages.caseUpdated', { caseNumber: guardado.consecutivo || '' })
          : t('segurosSura.messages.caseCreated', { caseNumber: guardado.consecutivo || '' })
      );
      if (esEdicion) {
        setForm(construirFormDesdeCasoSura(guardado));
      } else {
        setForm({ ...FORM_VACIO_SURA });
      }
      if (onSaved) await onSaved(guardado);
    } catch (err) {
      console.error('Error guardando caso Seguros Sura:', err);
      setError(err.message || t('segurosSura.messages.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  const limpiar = () => {
    setForm(initialData ? construirFormDesdeCasoSura(initialData) : { ...FORM_VACIO_SURA });
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
        <h3 className={expressSectionTitle}>{t('segurosSura.sections.identification')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('segurosSura.fields.siniestro')}>
            <InputFenix
              value={form.siniestro}
              onChange={setCampo('siniestro')}
              placeholder={t('segurosSura.placeholders.siniestro')}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.identificacion')} required>
            <InputFenix
              value={form.identificacion}
              onChange={setCampo('identificacion')}
              placeholder={t('segurosSura.placeholders.identificacion')}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.asegurado')}>
            <InputFenix value={form.asegurado} onChange={setCampo('asegurado')} />
          </Campo>
          <CampoTomadorSura
            value={form.tomador}
            onChange={(valor) => setForm((prev) => ({ ...prev, tomador: valor }))}
          />
          <Campo label={t('segurosSura.fields.direccionPredio')}>
            <InputFenix value={form.direccionPredio} onChange={setCampo('direccionPredio')} />
          </Campo>
          <Campo label={t('segurosSura.fields.informacionContacto')}>
            <InputFenix
              value={form.informacionContacto}
              onChange={setCampo('informacionContacto')}
              placeholder={t('segurosSura.placeholders.contacto')}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.correo')}>
            <InputFenix
              type="email"
              value={form.correo}
              onChange={setCampo('correo')}
              placeholder={t('segurosSura.placeholders.correo')}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.celular')}>
            <InputFenix
              value={form.celular}
              onChange={setCampo('celular')}
              placeholder={t('segurosSura.placeholders.celular')}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.canalRadicacion')}>
            <InputFenix
              value={form.canalRadicacion}
              onChange={setCampo('canalRadicacion')}
              placeholder="Ej: Seguros Sura"
            />
          </Campo>
          <SelectorDepartamentoCiudad
            ciudadesRaw={ciudadesRaw}
            departamento={form.departamento}
            ciudad={form.ciudad}
            onDepartamentoChange={setDepartamento}
            onCiudadChange={setCiudad}
            cargando={cargandoCatalogos}
            disabledDepartamento={!puedeEditarCampoCaso(rolUsuario, 'departamento', ctxPermiso)}
            disabledCiudad={attrsCampoCaso(rolUsuario, 'ciudad', ctxPermiso).disabled}
            i18nNs="segurosSura"
            buttonClassName="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <Campo label={t('segurosSura.fields.sede')} className="md:col-span-2 lg:col-span-3">
            <InputFenix
              value={form.sede || ''}
              onChange={setCampo('sede')}
              placeholder={t('segurosSura.placeholders.sede')}
              autoComplete="off"
            />
          </Campo>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('segurosSura.sections.policyCoverage')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('segurosSura.fields.numeroPoliza')}>
            <InputFenix
              value={form.numeroPoliza}
              onChange={setCampo('numeroPoliza')}
              placeholder={t('segurosSura.placeholders.poliza')}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.fechaInicioPoliza')}>
            <InputFenix
              type="date"
              value={form.fechaInicioPoliza}
              onChange={setCampo('fechaInicioPoliza')}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.fechaFinPoliza')}>
            <InputFenix
              type="date"
              value={form.fechaFinPoliza}
              onChange={setCampo('fechaFinPoliza')}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.numeroCredito')}>
            <InputFenix value={form.numeroCredito} onChange={setCampo('numeroCredito')} />
          </Campo>
          <Campo label={t('segurosSura.fields.cobertura')}>
            <InputFenix
              value={form.cobertura}
              onChange={setCampo('cobertura')}
              placeholder={t('segurosSura.placeholders.cobertura')}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.estadoPagoPrimas')}>
            <InputFenix
              value={form.estadoPagoPrimas}
              onChange={setCampo('estadoPagoPrimas')}
              placeholder={t('segurosSura.placeholders.estadoPagoPrimas')}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.estado')} required>
            {selectSimple('estado', ESTADOS_SURA)}
          </Campo>
          <CamposAsignacionCaso
            form={form}
            setCampo={setCampo}
            lideres={responsables}
            ajustadores={ajustadoresPorCiudad}
            inspectores={inspectoresPorCiudad}
            rol={rolUsuario}
            modulo="sura"
            i18nNs="segurosSura"
            ciudadSeleccionada={form.ciudad}
            filtrarPorCiudad={false}
          />
        </div>
        {soloInspector ? (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
            {t('segurosSura.permissions.inspectorHint', {
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
        <h3 className={expressSectionTitle}>{t('segurosSura.sections.values')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('segurosSura.fields.valorAseguradoInmueble')}>
            {inputMiles('valorAseguradoInmueble')}
          </Campo>
          <Campo label={t('segurosSura.fields.valorAseguradoContenidos')}>
            {inputMiles('valorAseguradoContenidos')}
          </Campo>
          <Campo label={t('segurosSura.fields.valorReservaPreventivaPromedio')}>
            {inputMiles('valorReservaPreventivaPromedio')}
          </Campo>
          <Campo label={t('segurosSura.fields.valorComercialInmueble')}>
            {inputMiles('valorComercialInmueble')}
          </Campo>
          <Campo label={t('segurosSura.fields.reserva')}>{inputMiles('reserva')}</Campo>
          <Campo label={t('segurosSura.fields.valorReclamado')}>
            {inputMiles('valorReclamado')}
          </Campo>
          <Campo label={t('segurosSura.fields.valorLiquidado')}>
            {inputMiles('valorLiquidado')}
          </Campo>
        </div>
        <Campo label={t('segurosSura.fields.observacionReserva')} className="mt-4">
          <TextareaFenix
            rows={3}
            value={form.observacionReserva || ''}
            onChange={setCampo('observacionReserva')}
            placeholder={t('segurosSura.placeholders.observacionReserva')}
          />
        </Campo>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('segurosSura.sections.dates')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('segurosSura.fields.fechaSiniestro')}>
            <InputFenix type="date" value={form.fechaSiniestro} onChange={setCampo('fechaSiniestro')} />
          </Campo>
          <Campo label={t('segurosSura.fields.fechaLlamada')}>
            <InputFenix
              type="date"
              value={form.fechaLlamada}
              onChange={setCampo('fechaLlamada')}
            />
          </Campo>
          <CampoFranjaCoordinacion
            labelFecha={t('segurosSura.fields.fechaInspeccion')}
            fecha={form.fechaInspeccion}
            horaInicio={form.horaInicioCoordinacion}
            horaFin={form.horaFinCoordinacion}
            onFecha={setCampo('fechaInspeccion')}
            onHoraInicio={setCampo('horaInicioCoordinacion')}
            onHoraFin={setCampo('horaFinCoordinacion')}
            ajustador={form.ajustador}
            inspector={form.inspector}
            casoId={initialData?._id}
            disabled={attrsCampoCaso(rolUsuario, 'fechaInspeccion', ctxPermiso).disabled}
          />
        </div>
        <Campo label={t('segurosSura.fields.observacionLlamada')} className="mt-4">
          <TextareaFenix
            rows={3}
            value={form.observacionLlamada || ''}
            onChange={setCampo('observacionLlamada')}
            placeholder={t('segurosSura.placeholders.observacionLlamada')}
          />
        </Campo>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('segurosSura.fields.fechaUltimoDocumento')}>
            <InputFenix
              type="date"
              value={form.fechaUltimoDocumento}
              onChange={setCampo('fechaUltimoDocumento')}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.fechaLiquidado')}>
            <InputFenix
              type="date"
              value={form.fechaLiquidado}
              onChange={setCampo('fechaLiquidado')}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.fechaAceptacionLiquidacion')}>
            <InputFenix
              type="date"
              value={form.fechaAceptacionLiquidacion}
              onChange={setCampo('fechaAceptacionLiquidacion')}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.fechaEnvioAseguradora')}>
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
          {esEdicion ? t('segurosSura.actions.reset') : t('segurosSura.actions.clear')}
        </button>
        <button type="submit" className={expressBtnPrimary} disabled={guardando}>
          <FaSave />
          {guardando
            ? t('segurosSura.actions.saving')
            : esEdicion
              ? t('segurosSura.actions.saveChanges')
              : t('segurosSura.actions.saveCase')}
        </button>
      </div>
    </form>
  );

  if (embed) {
    return <div className={`${expressScope}`}>{contenidoFormulario}</div>;
  }

  return (
    <div className={`${suraRoot} ${expressScope}`}>
      <div className={expressPageWrap}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className={expressBadge}>Seguros Sura</span>
            <div>
              <h1 className={expressPageTitle}>{t('segurosSura.page.addTitle')}</h1>
              <p className={expressPageSubtitle}>{t('segurosSura.page.addSubtitle')}</p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm">
                {t('nav.suraAddCase')}
              </span>
              <Link
                to="/sura/reporte"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                {t('nav.suraReport')}
              </Link>
            </nav>
          </div>
        </header>

        {error && <div className={expressAlertError}>{error}</div>}
        {exito && <div className={expressAlertSuccess}>{exito}</div>}

        {puedeImportarExcel && !esEdicion && (
          <section className={expressCard}>
            <div className={expressCardHeader}>
              <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
                Importar Excel
              </h2>
            </div>
            <div className={expressCardBody}>
              <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-300">
                Analice y confirme un Excel de SURA (hoja BD o PENDIENTES).
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

        <ModalImportarExcelSura
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

        <section className={expressCard}>
          <div className={expressCardHeader}>
            <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
              {esEdicion
                ? t('segurosSura.page.editCase', { caseNumber: initialData?.consecutivo || '' })
                : t('segurosSura.page.newCase')}
            </h2>
          </div>
          <div className={expressCardBody}>{contenidoFormulario}</div>
        </section>
      </div>
    </div>
  );
};

export default FormularioSegurosSura;
