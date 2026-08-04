import React, { useEffect, useMemo, useState } from 'react';
import { FaSave, FaUndo } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
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
import { ESTADOS_FDM, fechaParaInput } from './equidadFdmHelpers.js';

const fdmRoot = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

const OPCIONES_SI_NO = ['SI', 'NO'];
const OPCIONES_APLICA = ['APLICA', 'NO APLICA'];

const FORM_VACIO = {
  nombre: '',
  cedula: '',
  celular: '',
  direccionAfectada: '',
  municipio: '',
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
  ajustador: '',
  aif: '',
  caso: '',
  siniestro: '',
  estado: 'PENDIENTE',
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
      return [clave, String(valor)];
    })
  ),
});

const aNumero = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return null;
  const n = Number(String(valor).replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? null : n;
};

const FormularioEquidadFdm = ({ initialData = null, embed = false, onClose, onSaved }) => {
  const { t } = useTranslation();
  const esEdicion = Boolean(initialData?._id);
  const [form, setForm] = useState(() =>
    initialData ? construirFormDesdeCaso(initialData) : { ...FORM_VACIO }
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  useEffect(() => {
    setForm(initialData ? construirFormDesdeCaso(initialData) : { ...FORM_VACIO });
    setError(null);
    setExito(null);
  }, [initialData]);

  const setCampo = (clave) => (e) => {
    const valor = e?.target ? e.target.value : e;
    setForm((prev) => {
      const siguiente = { ...prev, [clave]: valor };

      // Recalcula totales de pérdida y liquidación al cambiar sus componentes
      if (['perdidaContenidos', 'perdidaEdificio', 'deducible', 'subsidio'].includes(clave)) {
        const contenidos = aNumero(siguiente.perdidaContenidos) ?? 0;
        const edificio = aNumero(siguiente.perdidaEdificio) ?? 0;
        const deducible = aNumero(siguiente.deducible) ?? 0;
        const subsidio = aNumero(siguiente.subsidio) ?? 0;
        const totalPerdida = contenidos + edificio;
        siguiente.totalPerdida = totalPerdida ? String(totalPerdida) : '';
        const totalLiquidado = totalPerdida - deducible + subsidio;
        siguiente.totalLiquidado = totalPerdida ? String(Math.max(0, totalLiquidado)) : '';
      }

      return siguiente;
    });
  };

  const camposNumericos = useMemo(
    () => [
      'valorEdificio',
      'valorContenido',
      'valoresIndemnizables',
      'perdidaContenidos',
      'perdidaEdificio',
      'totalPerdida',
      'deducible',
      'totalLiquidado',
      'subsidio',
      'valorIndemnizadoAjustador',
      'valorIndemnizado',
    ],
    []
  );

  const construirPayload = () => {
    const payload = { ...form };
    camposNumericos.forEach((clave) => {
      payload[clave] = aNumero(payload[clave]);
    });
    return payload;
  };

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
          <Campo label={t('equidadFdm.fields.affectedAddress')}>
            <InputFenix value={form.direccionAfectada} onChange={setCampo('direccionAfectada')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.municipality')}>
            <InputFenix value={form.municipio} onChange={setCampo('municipio')} placeholder={t('equidadFdm.placeholders.municipality')} />
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
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('equidadFdm.sections.caseManagement')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('equidadFdm.fields.adjuster')}>
            <InputFenix value={form.ajustador} onChange={setCampo('ajustador')} />
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
            <InputFenix type="number" min="0" value={form.valorEdificio} onChange={setCampo('valorEdificio')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.contentsValue')}>
            <InputFenix type="number" min="0" value={form.valorContenido} onChange={setCampo('valorContenido')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.insurableValues')}>
            <InputFenix
              type="number"
              min="0"
              value={form.valoresIndemnizables}
              onChange={setCampo('valoresIndemnizables')}
            />
          </Campo>
          <Campo label={t('equidadFdm.fields.contentsLoss')}>
            <InputFenix
              type="number"
              min="0"
              value={form.perdidaContenidos}
              onChange={setCampo('perdidaContenidos')}
            />
          </Campo>
          <Campo label={t('equidadFdm.fields.buildingLoss')}>
            <InputFenix type="number" min="0" value={form.perdidaEdificio} onChange={setCampo('perdidaEdificio')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.totalLoss')}>
            <InputFenix type="number" min="0" value={form.totalPerdida} onChange={setCampo('totalPerdida')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.deductible')}>
            <InputFenix type="number" min="0" value={form.deducible} onChange={setCampo('deducible')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.subsidy')}>
            <InputFenix type="number" min="0" value={form.subsidio} onChange={setCampo('subsidio')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.totalSettled')}>
            <InputFenix type="number" min="0" value={form.totalLiquidado} onChange={setCampo('totalLiquidado')} />
          </Campo>
          <Campo label={t('equidadFdm.fields.adjusterIndemnity')}>
            <InputFenix
              type="number"
              min="0"
              value={form.valorIndemnizadoAjustador}
              onChange={setCampo('valorIndemnizadoAjustador')}
            />
          </Campo>
          <Campo label={t('equidadFdm.fields.indemnity')}>
            <InputFenix
              type="number"
              min="0"
              value={form.valorIndemnizado}
              onChange={setCampo('valorIndemnizado')}
            />
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
    return <div className={`${expressScope}`}>{contenidoFormulario}</div>;
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
    </div>
  );
};

export default FormularioEquidadFdm;
