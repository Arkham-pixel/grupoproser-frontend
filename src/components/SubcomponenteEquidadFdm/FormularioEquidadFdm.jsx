import React, { useCallback, useEffect, useState } from 'react';
import { FaSave, FaUndo } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../../config/apiConfig.js';
import { crearCasoFdm, actualizarCasoFdm } from '../../services/equidadFdmService.js';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
  expressCard,
  expressCardBody,
  expressCardHeader,
  expressFormSection,
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
import { FdmPageHeader } from './EquidadFdmUiBlocks.jsx';
import { CAMPOS_NUMERICOS_FDM, ESTADOS_FDM, EVENTOS_FDM, MUNICIPIOS_FDM, fechaParaInput, formatMiles, formatMilesInput, normalizarMunicipioFdm, parseMontoFdm } from './equidadFdmHelpers.js';
import useArnaldFormDraft from '../../hooks/useArnaldFormDraft.js';
import ArnaldDraftChrome from '../ArnaldDraftChrome.jsx';

const fdmRoot = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

const OPCIONES_SI_NO = ['SI', 'NO'];
const OPCIONES_APLICA = ['APLICA', 'NO APLICA'];

const FORM_VACIO = {
  nombre: '',
  cedula: '',
  celular: '',
  correo: '',
  direccionAfectada: '',
  municipio: '',
  departamento: '',
  oficinaRadicadora: '',
  tipoNegocio: '',
  polizaDanosVigente: '',
  polizaAfectar: '',
  orden: '',
  vigenciaPoliza: '',
  afectacionesAnteriores: '',
  siniestroIndemnizado: '',
  primas: '',
  subsidioEmpresarial: '',
  cobertura: '',
  evento: '',
  ajustador: '',
  aif: '',
  caso: '',
  siniestro: '',
  estado: 'PENDIENTE',
  fechaRegistro: '',
  fechaAviso: '',
  fechaLiquidacion: '',
  fechaCausacion: '',
  fechaGiro: '',
  valorEdificio: '',
  valorContenido: '',
  valoresIndemnizables: '',
  perdidaContenidos: '',
  perdidaEdificio: '',
  totalPerdida: '',
  deducible: '',
  totalLiquidado: '',
  subsidio: '',
  valorIndemnizadoAjustador: '',
  valorIndemnizado: '',
  valorObjecion: '',
  observaciones: '',
  detalle: '',
};

const construirFormDesdeCaso = (caso = {}) => ({
  ...FORM_VACIO,
  ...Object.fromEntries(
    Object.keys(FORM_VACIO).map((clave) => {
      const valor = caso[clave];
      if (valor === null || valor === undefined) return [clave, ''];
      if (clave.startsWith('fecha')) return [clave, fechaParaInput(valor)];
      if (CAMPOS_NUMERICOS_FDM.includes(clave)) return [clave, formatMiles(valor)];
      if (clave === 'municipio') return [clave, normalizarMunicipioFdm(valor)];
      return [clave, String(valor)];
    })
  ),
});

const aNumero = (valor) => parseMontoFdm(valor);

const FormularioEquidadFdm = ({ initialData = null, embed = false, onClose, onSaved }) => {
  const { t } = useTranslation();
  const esEdicion = Boolean(initialData?._id);
  const [form, setForm] = useState(() =>
    initialData ? construirFormDesdeCaso(initialData) : { ...FORM_VACIO }
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [ajustadores, setAjustadores] = useState([]);
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [draftToRestore, setDraftToRestore] = useState(null);
  const formKey = esEdicion ? `equidad-fdm:${initialData._id}` : 'equidad-fdm:nuevo';
  const onDraftRestoreAvailable = useCallback((info) => {
    setDraftToRestore(info);
    setShowDraftRestore(true);
  }, []);
  const { draftStatus, lastDraftAt, discardDraft, consumeDraft } = useArnaldFormDraft({
    formKey,
    modulo: 'equidad-fdm',
    recursoId: initialData?._id || '',
    titulo: 'Caso Equidad FDM',
    formData: form,
    enabled: true,
    onRestoreAvailable: onDraftRestoreAvailable,
  });

  useEffect(() => {
    setForm(initialData ? construirFormDesdeCaso(initialData) : { ...FORM_VACIO });
    setError(null);
    setExito(null);
  }, [initialData]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/responsables`);
        const data = await res.json().catch(() => ({}));
        if (cancelado) return;
        const lista = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];
        const opciones = lista
          .map((r) => {
            const nombre = String(
              r.nmbrRespnsble || r.nombre || r.nombreResponsable || r.label || ''
            ).trim();
            return nombre || null;
          })
          .filter(Boolean)
          .filter((nombre, idx, arr) => arr.findIndex((x) => x.toLowerCase() === nombre.toLowerCase()) === idx)
          .sort((a, b) => a.localeCompare(b, 'es'));
        setAjustadores(opciones);
      } catch (err) {
        if (!cancelado) console.error('Error cargando ajustadores FDM:', err);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const setCampo = (clave) => (e) => {
    const crudo = e?.target ? e.target.value : e;
    setForm((prev) => {
      const valor = CAMPOS_NUMERICOS_FDM.includes(clave) ? formatMilesInput(crudo) : crudo;
      const siguiente = { ...prev, [clave]: valor };

      if (['perdidaContenidos', 'perdidaEdificio', 'deducible', 'subsidio'].includes(clave)) {
        const contenidos = aNumero(siguiente.perdidaContenidos) ?? 0;
        const edificio = aNumero(siguiente.perdidaEdificio) ?? 0;
        const deducible = aNumero(siguiente.deducible) ?? 0;
        const subsidio = aNumero(siguiente.subsidio) ?? 0;
        const totalPerdida = contenidos + edificio;
        siguiente.totalPerdida = totalPerdida ? formatMiles(totalPerdida) : '';
        const totalLiquidado = totalPerdida - deducible + subsidio;
        siguiente.totalLiquidado = totalPerdida ? formatMiles(Math.max(0, totalLiquidado)) : '';
      }

      return siguiente;
    });
  };

  const construirPayload = () => {
    const payload = { ...form };
    CAMPOS_NUMERICOS_FDM.forEach((clave) => {
      payload[clave] = aNumero(payload[clave]);
    });
    payload.municipio = normalizarMunicipioFdm(payload.municipio);
    return payload;
  };

  const opcionesMunicipio = (() => {
    const set = new Set(MUNICIPIOS_FDM);
    const actual = normalizarMunicipioFdm(form.municipio);
    if (actual && !set.has(actual) && !/^SANTIAGO DE CALI/i.test(actual)) {
      return [...MUNICIPIOS_FDM, actual].sort((a, b) => a.localeCompare(b, 'es'));
    }
    return MUNICIPIOS_FDM;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (!form.nombre.trim()) {
      setError(t('equidadFdm.validation.insuredNameRequired'));
      return;
    }
    if (!form.estado.trim()) {
      setError(t('equidadFdm.validation.statusRequired'));
      return;
    }

    setGuardando(true);
    try {
      const payload = construirPayload();
      let guardado;
      if (esEdicion) {
        guardado = await actualizarCasoFdm(initialData._id, payload);
      } else {
        guardado = await crearCasoFdm(payload);
      }
      setExito(
        esEdicion
          ? t('equidadFdm.messages.caseUpdated', { caseNumber: guardado.consecutivo || '' })
          : t('equidadFdm.messages.caseCreated', { caseNumber: guardado.consecutivo || '' })
      );
      if (!esEdicion) {
        setForm({ ...FORM_VACIO });
      }
      if (onSaved) await onSaved(guardado);
      await discardDraft();
    } catch (err) {
      console.error('Error guardando caso Equidad FDM:', err);
      setError(err.message || t('equidadFdm.messages.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  const limpiar = () => {
    setForm(initialData ? construirFormDesdeCaso(initialData) : { ...FORM_VACIO });
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

  const inputMiles = (clave) => (
    <InputFenix
      type="text"
      inputMode="numeric"
      value={form[clave]}
      onChange={setCampo(clave)}
      placeholder="0"
    />
  );

  const contenidoFormulario = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className={expressAlertError}>{error}</div>}
      {exito && <div className={expressAlertSuccess}>{exito}</div>}

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('equidadFdm.sections.insured')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('equidadFdm.fields.name')} required>
            <InputFenix value={form.nombre} onChange={setCampo('nombre')} placeholder={t('equidadFdm.placeholders.fullName')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.id')}>
            <InputFenix value={form.cedula} onChange={setCampo('cedula')} placeholder={t('equidadFdm.placeholders.idNumber')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.mobile')}>
            <InputFenix value={form.celular} onChange={setCampo('celular')} placeholder={t('equidadFdm.placeholders.contactMobile')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.email')}>
            <InputFenix
              type="email"
              value={form.correo}
              onChange={setCampo('correo')}
              placeholder={t('equidadFdm.placeholders.contactEmail')}
            />
          </Campo>
          <Campo label={t('equidadFdm.fields.affectedAddress')}>
            <InputFenix value={form.direccionAfectada} onChange={setCampo('direccionAfectada')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.municipality')}>
            <SelectFenix
              value={normalizarMunicipioFdm(form.municipio)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  municipio: normalizarMunicipioFdm(e.target.value),
                }))
              }
            >
              <option value="">{t('common.select')}</option>
              {opcionesMunicipio.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <Campo label={t('equidadFdm.fields.department')}>
            <InputFenix value={form.departamento} onChange={setCampo('departamento')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.filingOffice')}>
            <InputFenix value={form.oficinaRadicadora} onChange={setCampo('oficinaRadicadora')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.businessType')}>
            <InputFenix value={form.tipoNegocio} onChange={setCampo('tipoNegocio')} placeholder={t('equidadFdm.placeholders.businessType')} />
          </Campo>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('equidadFdm.sections.policyCoverage')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('equidadFdm.fields.damagePolicyActive')}>
            {selectSimple('polizaDanosVigente', OPCIONES_SI_NO)}
          </Campo>
          <Campo label={t('equidadFdm.fields.policyToAffect')}>
            <InputFenix value={form.polizaAfectar} onChange={setCampo('polizaAfectar')} placeholder={t('equidadFdm.placeholders.policy')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.order')}>
            <InputFenix value={form.orden} onChange={setCampo('orden')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.policyTerm')}>
            <InputFenix
              value={form.vigenciaPoliza}
              onChange={setCampo('vigenciaPoliza')}
              placeholder="dd/mm/aaaa-dd/mm/aaaa"
            />
          </Campo>
          <Campo label={t('equidadFdm.fields.previousLosses')}>
            {selectSimple('afectacionesAnteriores', OPCIONES_SI_NO)}
          </Campo>
          <Campo label={t('equidadFdm.fields.claimIndemnified')}>
            {selectSimple('siniestroIndemnizado', [...OPCIONES_SI_NO, 'NO APLICA'])}
          </Campo>
          <Campo label={t('equidadFdm.fields.premiumsCurrent')}>
            {selectSimple('primas', OPCIONES_SI_NO)}
          </Campo>
          <Campo label={t('equidadFdm.fields.businessSubsidy')}>
            {selectSimple('subsidioEmpresarial', OPCIONES_APLICA)}
          </Campo>
          <Campo label={t('equidadFdm.fields.coverage')}>
            <InputFenix value={form.cobertura} onChange={setCampo('cobertura')} placeholder={t('equidadFdm.placeholders.coverage')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.event')}>
            {selectSimple('evento', EVENTOS_FDM)}
          </Campo>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('equidadFdm.sections.caseManagement')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('equidadFdm.fields.adjuster')}>
            <SelectFenix value={form.ajustador} onChange={setCampo('ajustador')}>
              <option value="">{t('common.select')}</option>
              {form.ajustador &&
                !ajustadores.some((a) => a.toLowerCase() === String(form.ajustador).toLowerCase()) && (
                  <option value={form.ajustador}>{form.ajustador}</option>
                )}
              {ajustadores.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <Campo label={t('equidadFdm.fields.aif')}>
            <InputFenix value={form.aif} onChange={setCampo('aif')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.case')}>
            <InputFenix value={form.caso} onChange={setCampo('caso')} placeholder={t('equidadFdm.placeholders.caseNumber')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.claim')}>
            <InputFenix value={form.siniestro} onChange={setCampo('siniestro')} placeholder={t('equidadFdm.placeholders.claimNumber')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.status')} required>
            {selectSimple('estado', ESTADOS_FDM)}
          </Campo>
          <Campo label={t('equidadFdm.fields.registrationDate')}>
            <InputFenix type="date" value={form.fechaRegistro} onChange={setCampo('fechaRegistro')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.noticeDate')}>
            <InputFenix type="date" value={form.fechaAviso} onChange={setCampo('fechaAviso')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.settlementDate')}>
            <InputFenix type="date" value={form.fechaLiquidacion} onChange={setCampo('fechaLiquidacion')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.accrualDate')}>
            <InputFenix type="date" value={form.fechaCausacion} onChange={setCampo('fechaCausacion')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.paymentDate')}>
            <InputFenix type="date" value={form.fechaGiro} onChange={setCampo('fechaGiro')} />
          </Campo>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('equidadFdm.sections.valuesLosses')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('equidadFdm.fields.buildingValue')}>
            {inputMiles('valorEdificio')}
          </Campo>
          <Campo label={t('equidadFdm.fields.contentsValue')}>
            {inputMiles('valorContenido')}
          </Campo>
          <Campo label={t('equidadFdm.fields.insurableValues')}>
            {inputMiles('valoresIndemnizables')}
          </Campo>
          <Campo label={t('equidadFdm.fields.contentsLoss')}>
            {inputMiles('perdidaContenidos')}
          </Campo>
          <Campo label={t('equidadFdm.fields.buildingLoss')}>
            {inputMiles('perdidaEdificio')}
          </Campo>
          <Campo label={t('equidadFdm.fields.totalLoss')}>
            {inputMiles('totalPerdida')}
          </Campo>
          <Campo label={t('equidadFdm.fields.deductible')}>
            {inputMiles('deducible')}
          </Campo>
          <Campo label={t('equidadFdm.fields.subsidy')}>
            {inputMiles('subsidio')}
          </Campo>
          <Campo label={t('equidadFdm.fields.totalSettled')}>
            {inputMiles('totalLiquidado')}
          </Campo>
          <Campo label={t('equidadFdm.fields.adjusterIndemnity')}>
            {inputMiles('valorIndemnizadoAjustador')}
          </Campo>
          <Campo label={t('equidadFdm.fields.indemnity')}>
            {inputMiles('valorIndemnizado')}
          </Campo>
          <Campo label={t('equidadFdm.fields.objectionValue')}>
            <InputFenix
              value={form.valorObjecion}
              onChange={setCampo('valorObjecion')}
              placeholder={t('equidadFdm.placeholders.objection')}
            />
          </Campo>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('equidadFdm.sections.observations')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Campo label={t('equidadFdm.fields.observations')}>
            <TextareaFenix value={form.observaciones} onChange={setCampo('observaciones')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.detail')}>
            <TextareaFenix value={form.detalle} onChange={setCampo('detalle')} />
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
          {esEdicion ? t('equidadFdm.actions.reset') : t('equidadFdm.actions.clear')}
        </button>
        <button type="submit" className={expressBtnPrimary} disabled={guardando}>
          <FaSave />
          {guardando ? t('equidadFdm.actions.saving') : esEdicion ? t('equidadFdm.actions.saveChanges') : t('equidadFdm.actions.saveCase')}
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
    <div className={`${fdmRoot} ${expressScope}`}>
      <div className={expressPageWrap}>
        <FdmPageHeader
          title={t('equidadFdm.page.addTitle')}
          subtitle={t('equidadFdm.page.addSubtitle')}
          activePath="/equidad-fdm/carga"
        />
        <section className={expressCard}>
          <div className={expressCardHeader}>
            <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">
              {esEdicion
                ? t('equidadFdm.page.editCase', { caseNumber: initialData?.consecutivo || '' })
                : t('equidadFdm.page.newCase')}
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

export default FormularioEquidadFdm;
