import React, { useEffect, useMemo, useState } from 'react';
import { FaFileExcel, FaSave, FaUndo, FaUpload } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../../config/apiConfig.js';
import { crearCasoAlfa, actualizarCasoAlfa } from '../../services/segurosAlfaService.js';
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
import {
  CAMPOS_NUMERICOS_ALFA,
  ESTADOS_ALFA,
  FORM_VACIO_ALFA,
  construirFormDesdeCasoAlfa,
  formatMilesInput,
} from './segurosAlfaHelpers.js';
import CampoTomadorAlfa from './CampoTomadorAlfa.jsx';
import ModalImportarExcelAlfa, {
  esAdminOSoporteAlfa,
} from './ModalImportarExcelAlfa.jsx';
import AlfaControlSeguimientoBanner from './AlfaControlSeguimientoBanner.jsx';

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
  const esEdicion = Boolean(initialData?._id);
  const puedeImportarExcel = esAdminOSoporteAlfa();
  const [form, setForm] = useState(() =>
    initialData ? construirFormDesdeCasoAlfa(initialData) : { ...FORM_VACIO_ALFA }
  );
  const [guardando, setGuardando] = useState(false);
  const [modalImportOpen, setModalImportOpen] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [resumenImport, setResumenImport] = useState(null);
  const [ciudadesRaw, setCiudadesRaw] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(false);

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

  const camposNumericos = useMemo(() => CAMPOS_NUMERICOS_ALFA, []);

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
    // Asegurar campos ARNALD de llamada (no dependen de Excel/SharePoint)
    payload.fechaLlamada = form.fechaLlamada ? String(form.fechaLlamada).trim() : '';
    payload.observacionLlamada =
      form.observacionLlamada != null ? String(form.observacionLlamada) : '';
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

    setGuardando(true);
    try {
      const payload = construirPayload();
      let guardado;
      if (esEdicion) {
        guardado = await actualizarCasoAlfa(initialData._id, payload);
      } else {
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
            <SelectFenix
              value={form.ciudad}
              onChange={setCampo('ciudad')}
              disabled={cargandoCatalogos && ciudadesFiltradas.length === 0}
            >
              <option value="">
                {form.departamento
                  ? t('segurosAlfa.placeholders.selectCity')
                  : t('segurosAlfa.placeholders.selectDepartmentFirst')}
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
          <Campo label={t('segurosAlfa.fields.estado')} required>
            {selectSimple('estado', ESTADOS_ALFA)}
          </Campo>
          <Campo label={t('segurosAlfa.fields.ajustador')}>
            <SelectFenix value={form.ajustador} onChange={setCampo('ajustador')}>
              <option value="">{t('common.select')}</option>
              {form.ajustador &&
                !responsables.some((r) => r.value === form.ajustador || r.codigo === form.ajustador) && (
                  <option value={form.ajustador}>{form.ajustador}</option>
                )}
              {responsables.map((r) => (
                <option key={r.codigo || r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </SelectFenix>
          </Campo>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('segurosAlfa.sections.values')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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

  if (embed) {
    return <div className={`${expressScope}`}>{contenidoFormulario}</div>;
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

        {puedeImportarExcel && !esEdicion && (
          <section className={expressCard}>
            <div className={expressCardHeader}>
              <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
                Importar Excel
              </h2>
            </div>
            <div className={expressCardBody}>
              <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-300">
                Analice y confirme un Excel de Seguros Alfa (preview → execute). Solo admin/soporte.
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
    </div>
  );
};

export default FormularioSegurosAlfa;
