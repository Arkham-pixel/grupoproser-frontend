import React from 'react';
import { useTranslation } from 'react-i18next';
import { Campo, InputFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  expressFormSection,
  expressInput,
  expressSectionTitle,
  expressTextarea,
} from '../SubcomponenteExpress/expressFenixUi.js';
import PadFirmaCliente from '../liquidacion/PadFirmaCliente.jsx';
import { textosLetrerosBbvaCat } from './deduciblesBbvaCat.js';

const MESES = [
  { id: '1', label: 'enero' },
  { id: '2', label: 'febrero' },
  { id: '3', label: 'marzo' },
  { id: '4', label: 'abril' },
  { id: '5', label: 'mayo' },
  { id: '6', label: 'junio' },
  { id: '7', label: 'julio' },
  { id: '8', label: 'agosto' },
  { id: '9', label: 'septiembre' },
  { id: '10', label: 'octubre' },
  { id: '11', label: 'noviembre' },
  { id: '12', label: 'diciembre' },
];

export default function LetrerosBbvaCat({
  tipoLiquidador,
  aceptacionIndemnizacion = '',
  datosFiniquito = {},
  observacionesFiniquito = '',
  firmaCliente = '',
  nombreFirmante = '',
  onAceptacionChange,
  onDatosFiniquitoChange,
  onObservacionesChange,
  onFirmaClienteChange,
  onNombreFirmanteChange,
}) {
  const { t } = useTranslation();
  const textos = textosLetrerosBbvaCat(tipoLiquidador);
  const ciudad = datosFiniquito.ciudadFirma || '';
  const dia = datosFiniquito.diaFirma || '';
  const mes = datosFiniquito.mesFirma || '';
  const anio = datosFiniquito.anioFirma || '';

  return (
    <section className={expressFormSection}>
      <h3 className={expressSectionTitle}>{t('bbvaCat.settlement.letrerosTitle')}</h3>

      <div className="space-y-3 rounded-lg border border-amber-200/80 bg-amber-50/70 p-4 text-sm leading-relaxed text-gray-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-gray-100">
        <p>
          <span className="font-semibold">{t('bbvaCat.settlement.deductiblesNotice')}: </span>
          {textos.avisoDeducible}
        </p>
        <p>
          <span className="font-semibold">{t('bbvaCat.settlement.policyObject')}: </span>
          {textos.objetoPoliza}
        </p>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
        {textos.pazYSalvo}
      </p>

      <div className="mt-4 space-y-3 rounded-lg border border-gray-200 bg-white/80 px-3 py-3 dark:border-gray-700 dark:bg-gray-900/40">
        <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
          {t('bbvaCat.settlement.indemnityDecision')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-semibold dark:border-gray-600 dark:bg-gray-900/40">
            <input
              type="radio"
              name="aceptacionIndemnizacionBbva"
              className="h-4 w-4 accent-[#1F4E79]"
              checked={aceptacionIndemnizacion === 'ACEPTO'}
              onChange={() => onAceptacionChange?.('ACEPTO')}
            />
            {t('bbvaCat.settlement.acceptIndemnity')}
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-semibold dark:border-gray-600 dark:bg-gray-900/40">
            <input
              type="radio"
              name="aceptacionIndemnizacionBbva"
              className="h-4 w-4 accent-[#1F4E79]"
              checked={aceptacionIndemnizacion === 'RECHAZO'}
              onChange={() => onAceptacionChange?.('RECHAZO')}
            />
            {t('bbvaCat.settlement.rejectIndemnity')}
          </label>
        </div>
        {!aceptacionIndemnizacion ? (
          <p className="text-center text-[11px] text-amber-800 dark:text-amber-200">
            {t('bbvaCat.settlement.selectIndemnity')}
          </p>
        ) : null}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
        {t('bbvaCat.settlement.signatureLead')}{' '}
        <span className="font-semibold underline">{ciudad || '________________'}</span>
        {', '}
        {t('bbvaCat.settlement.signatureOnThe')}{' '}
        <span className="font-semibold underline">{dia || '________'}</span>{' '}
        {t('bbvaCat.settlement.signatureDaysOf')}{' '}
        <span className="font-semibold underline">
          {MESES.find((m) => m.id === String(Number(mes)))?.label || mes || '________'}
        </span>{' '}
        {t('bbvaCat.settlement.signatureOf')}{' '}
        <span className="font-semibold underline">{anio || '________'}</span>.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Campo label={t('bbvaCat.settlement.signatureCity')}>
          <InputFenix
            value={ciudad}
            onChange={(e) => onDatosFiniquitoChange?.('ciudadFirma', e.target.value)}
            placeholder={t('bbvaCat.settlement.signatureCityPlaceholder')}
          />
        </Campo>
        <Campo label={t('bbvaCat.settlement.signatureDay')}>
          <InputFenix
            inputMode="numeric"
            value={dia}
            onChange={(e) => onDatosFiniquitoChange?.('diaFirma', e.target.value)}
          />
        </Campo>
        <Campo label={t('bbvaCat.settlement.signatureMonth')}>
          <select
            className={expressInput}
            value={mes}
            onChange={(e) => onDatosFiniquitoChange?.('mesFirma', e.target.value)}
          >
            <option value="">{t('bbvaCat.settlement.signatureMonthPlaceholder')}</option>
            {MESES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label={t('bbvaCat.settlement.signatureYear')}>
          <InputFenix
            inputMode="numeric"
            value={anio}
            onChange={(e) => onDatosFiniquitoChange?.('anioFirma', e.target.value)}
          />
        </Campo>
      </div>

      <div className="mt-4 space-y-3 rounded-lg border border-orange-200/80 bg-white/70 p-3 dark:border-orange-900/40 dark:bg-gray-900/30">
        <Campo label={t('bbvaCat.settlement.signerName')}>
          <InputFenix
            value={nombreFirmante || ''}
            onChange={(e) => onNombreFirmanteChange?.(e.target.value)}
            placeholder={t('bbvaCat.settlement.signerNamePlaceholder')}
          />
        </Campo>
        <PadFirmaCliente
          value={firmaCliente || ''}
          onChange={onFirmaClienteChange}
          label={t('bbvaCat.settlement.clientSignature')}
        />
      </div>

      <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-semibold uppercase leading-relaxed text-gray-800 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-100">
        {textos.autorizacionPago}
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-orange-200 dark:border-orange-900/40">
        <div className="bg-orange-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-800 dark:bg-orange-950/50 dark:text-orange-100">
          {t('bbvaCat.settlement.notes')}
        </div>
        <textarea
          className={`${expressTextarea} rounded-none border-0`}
          rows={3}
          value={observacionesFiniquito}
          onChange={(e) => onObservacionesChange?.(e.target.value)}
        />
      </div>
    </section>
  );
}
