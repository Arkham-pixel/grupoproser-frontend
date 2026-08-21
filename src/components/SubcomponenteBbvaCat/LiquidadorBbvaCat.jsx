import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileExcel, FaFilePdf, FaFileWord } from 'react-icons/fa';
import {
  Campo,
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
  InputFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  expressAlertError,
  expressFormSection,
  expressSectionTitle,
} from '../SubcomponenteExpress/expressFenixUi.js';
import ChecklistEvaluacionSismicaNSR10 from '../SubcomponenteEvaluacionSismicaNSR10/ChecklistEvaluacionSismicaNSR10.jsx';
import CampoTomadorBbvaCat from './CampoTomadorBbvaCat.jsx';
import {
  calcularLiquidacionBbvaCat,
  formDataNsrDesdeLiquidadorBbvaCat,
  formatearMonto,
  mapcasoBbvaCatALiquidador,
} from './liquidadorBbvaCatHelpers.js';
import { descargarFiniquitoBbvaCatWord } from './generarFiniquitoBbvaCatWord.js';
import { descargarLiquidadorBbvaCatExcel } from './generarLiquidadorBbvaCatExcel.js';
import { descargarLiquidadorBbvaCatPdf } from './generarLiquidadorBbvaCatPdf.js';

const grid3 = 'grid grid-cols-1 gap-4 sm:grid-cols-3';

/**
 * Liquidador BbvaCat = evaluación NSR-10 completa (portada / eval / dictamen / presupuesto)
 * + diagrama de liquidación, mismo motor que Catastrófico Complex.
 */
export default function LiquidadorBbvaCat({
  casoBbvaCat = null,
  onGuardarEnCaso,
  guardandoCaso = false,
  onEstadoChange,
  liquidadorInicial = null,
}) {
  const { t } = useTranslation();
  const [liquidador, setLiquidador] = useState(() =>
    liquidadorInicial || mapcasoBbvaCatALiquidador(casoBbvaCat || {})
  );
  const [error, setError] = useState('');
  const [exportando, setExportando] = useState('');

  useEffect(() => {
    setLiquidador(liquidadorInicial || mapcasoBbvaCatALiquidador(casoBbvaCat || {}));
  }, [casoBbvaCat?._id]);

  const totales = useMemo(() => calcularLiquidacionBbvaCat(liquidador), [liquidador]);
  const enc = liquidador.encabezado || {};

  useEffect(() => {
    onEstadoChange?.(liquidador, totales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liquidador, totales]);

  const formDataNsr = useMemo(
    () => formDataNsrDesdeLiquidadorBbvaCat(liquidador, casoBbvaCat || {}),
    [liquidador, casoBbvaCat]
  );

  const actualizarEncabezado = (campo, valor) => {
    setLiquidador((prev) => ({
      ...prev,
      encabezado: { ...(prev.encabezado || {}), [campo]: valor },
    }));
  };

  const handleNsrChange = (patch) => {
    setLiquidador((prev) => {
      const next = { ...prev, ...patch, modelo: 'nsr10' };
      if (patch.indemnizacionSugerida != null) {
        next.indemnizacionSugerida = patch.indemnizacionSugerida;
      }
      return next;
    });
  };

  const correrExport = async (tipo, fn) => {
    setError('');
    setExportando(tipo);
    try {
      await fn(liquidador, totales);
    } catch (err) {
      console.error(err);
      setError(err.message || t('bbvaCat.settlement.exportError'));
    } finally {
      setExportando('');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={expressBtnSecondary}
            disabled={!!exportando}
            onClick={() => correrExport('excel', descargarLiquidadorBbvaCatExcel)}
          >
            <FaFileExcel /> Excel
          </button>
          <button
            type="button"
            className={expressBtnSecondary}
            disabled={!!exportando}
            onClick={() => correrExport('pdf', descargarLiquidadorBbvaCatPdf)}
          >
            <FaFilePdf /> PDF
          </button>
          <button
            type="button"
            className={expressBtnGhost}
            disabled={!!exportando}
            onClick={() => correrExport('finiquito', descargarFiniquitoBbvaCatWord)}
          >
            <FaFileWord /> {t('bbvaCat.settlement.downloadFiniquito')}
          </button>
        </div>
        {onGuardarEnCaso && (
          <button
            type="button"
            className={expressBtnPrimary}
            disabled={guardandoCaso}
            onClick={() => onGuardarEnCaso(liquidador, totales)}
          >
            {guardandoCaso
              ? t('bbvaCat.settlement.saving')
              : t('bbvaCat.settlement.saveToCase')}
          </button>
        )}
      </div>

      {error && <p className={expressAlertError}>{error}</p>}

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('bbvaCat.settlement.headerTitle')}</h3>
        <div className={grid3}>
          <CampoTomadorBbvaCat
            className="sm:col-span-3"
            value={enc.tomador}
            onChange={(valor) => actualizarEncabezado('tomador', valor)}
            mostrarGestion={false}
          />
          <Campo label={t('bbvaCat.settlement.insured')}>
            <InputFenix
              value={enc.asegurado || ''}
              onChange={(e) => actualizarEncabezado('asegurado', e.target.value)}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.numeroPoliza')}>
            <InputFenix
              value={enc.poliza || ''}
              onChange={(e) => actualizarEncabezado('poliza', e.target.value)}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.tipoPoliza')}>
            <InputFenix
              value={enc.tipoPoliza || ''}
              onChange={(e) => actualizarEncabezado('tipoPoliza', e.target.value)}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.siniestro')}>
            <InputFenix
              value={enc.siniestro || ''}
              onChange={(e) => actualizarEncabezado('siniestro', e.target.value)}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.tipoIdentificacion')}>
            <InputFenix
              value={enc.tipoIdentificacion || ''}
              onChange={(e) => actualizarEncabezado('tipoIdentificacion', e.target.value)}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.identificacion')}>
            <InputFenix
              value={enc.identificacion || ''}
              onChange={(e) => actualizarEncabezado('identificacion', e.target.value)}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.causa')}>
            <InputFenix
              value={enc.causa || ''}
              onChange={(e) => actualizarEncabezado('causa', e.target.value)}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.cobertura')}>
            <InputFenix
              value={enc.cobertura || ''}
              onChange={(e) => actualizarEncabezado('cobertura', e.target.value)}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.direccionPredio')}>
            <InputFenix
              value={enc.direccion || ''}
              onChange={(e) => actualizarEncabezado('direccion', e.target.value)}
            />
          </Campo>
        </div>
        <div className="mt-4 grid max-w-xl grid-cols-1 gap-1 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>Total daños (NSR-10)</span>
            <span>$ {formatearMonto(totales.totalDanios)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>Hospedaje</span>
            <span>$ {formatearMonto(totales.diagrama?.gastosHospedaje)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>Deducible presupuesto</span>
            <span>$ {formatearMonto(totales.diagrama?.deduciblePresupuesto?.aplicado || 0)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>Deducible contenidos</span>
            <span>
              ${' '}
              {formatearMonto(
                totales.diagrama?.deducibleContenidos?.aplicado ||
                  totales.diagrama?.deducibleAplicado ||
                  0
              )}
            </span>
          </div>
          <div className="flex justify-between px-4 py-2 text-sm font-bold">
            <span>{t('bbvaCat.settlement.totalPay')}</span>
            <span>$ {formatearMonto(totales.totalIndemnizar)}</span>
          </div>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {t('bbvaCat.settlement.nsrTitle', { defaultValue: 'Evaluación y liquidador NSR-10' })}
        </h3>
        <ChecklistEvaluacionSismicaNSR10
          formData={formDataNsr}
          onInputChange={handleNsrChange}
          modoLiquidador={false}
        />
      </section>
    </div>
  );
}
