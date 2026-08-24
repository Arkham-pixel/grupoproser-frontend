import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileExcel, FaFilePdf, FaFileWord } from 'react-icons/fa';
import {
  Campo,
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
  InputFenix,
  InputMonedaExpress,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  expressAlertError,
  expressFormSection,
  expressInput,
  expressSectionTitle,
} from '../SubcomponenteExpress/expressFenixUi.js';
import LetrerosBbvaCat from './LetrerosBbvaCat.jsx';
import {
  aplicarTipoLiquidadorEnLiquidacionBbvaCat,
  esObservacionFiniquitoDefaultBbvaCat,
  inferirTipoLiquidadorBbvaCat,
  observacionesFiniquitoPorDefectoBbvaCat,
  TIPOS_LIQUIDADOR_BBVA_CAT,
} from './deduciblesBbvaCat.js';
import ChecklistEvaluacionSismicaNSR10 from '../SubcomponenteEvaluacionSismicaNSR10/ChecklistEvaluacionSismicaNSR10.jsx';
import CampoTomadorBbvaCat from './CampoTomadorBbvaCat.jsx';
import {
  calcularLiquidacionBbvaCat,
  formDataNsrDesdeLiquidadorBbvaCat,
  formatearMonto,
  mapcasoBbvaCatALiquidador,
  RECARGOS_PRESUPUESTO_BBVA_CAT,
  aplicarPresupuestoAiuBbvaCatEnEvaluacion,
} from './liquidadorBbvaCatHelpers.js';
import { descargarFiniquitoBbvaCatWord } from './generarFiniquitoBbvaCatWord.js';
import { descargarLiquidadorBbvaCatExcel } from './generarLiquidadorBbvaCatExcel.js';
import { descargarLiquidadorBbvaCatPdf } from './generarLiquidadorBbvaCatPdf.js';
import OtrosAmparosLiquidacion from '../liquidacion/OtrosAmparosLiquidacion.jsx';
import { defaultOtrosAmparos } from '../liquidacion/otrosAmparosLiquidacion.js';

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

  const tipoLiquidador = inferirTipoLiquidadorBbvaCat({
    tipoLiquidador: liquidador.tipoLiquidador,
    encabezado: enc,
    caso: casoBbvaCat || {},
  });

  const actualizarEncabezado = (campo, valor) => {
    setLiquidador((prev) => {
      const next = {
        ...prev,
        encabezado: { ...(prev.encabezado || {}), [campo]: valor },
      };
      if (campo === 'valorAseguradoInmueble') {
        const liq = prev.liquidacionCatastrofico || {};
        next.liquidacionCatastrofico = { ...liq, valorAsegurado: valor };
      }
      return next;
    });
  };

  const actualizarTipoLiquidador = (tipo) => {
    setLiquidador((prev) => {
      const obsActual = prev.observacionesFiniquito ?? '';
      const obsSiguiente = esObservacionFiniquitoDefaultBbvaCat(obsActual)
        ? observacionesFiniquitoPorDefectoBbvaCat(tipo)
        : obsActual;
      return {
        ...prev,
        tipoLiquidador: tipo,
        observacionesFiniquito: obsSiguiente,
        liquidacionCatastrofico: aplicarTipoLiquidadorEnLiquidacionBbvaCat(
          prev.liquidacionCatastrofico || {},
          tipo,
          { forzarDeducible: true }
        ),
      };
    });
  };

  const actualizarDatosFiniquito = (campo, valor) => {
    setLiquidador((prev) => ({
      ...prev,
      datosFiniquito: { ...(prev.datosFiniquito || {}), [campo]: valor },
    }));
  };

  const handleNsrChange = (patch) => {
    setLiquidador((prev) => {
      const next = { ...prev, ...patch, modelo: 'nsr10' };
      if (patch.indemnizacionSugerida != null) {
        next.indemnizacionSugerida = patch.indemnizacionSugerida;
      }
      if (next.evaluacionSismicaNSR10) {
        next.evaluacionSismicaNSR10 = aplicarPresupuestoAiuBbvaCatEnEvaluacion(
          next.evaluacionSismicaNSR10
        );
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
          <Campo label={t('bbvaCat.settlement.liquidadorType')} className="sm:col-span-3">
            <select
              className={expressInput}
              value={tipoLiquidador}
              onChange={(e) => actualizarTipoLiquidador(e.target.value)}
            >
              {TIPOS_LIQUIDADOR_BBVA_CAT.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {t(`bbvaCat.settlement.liquidadorType_${opt.id}`, { defaultValue: opt.label })}
                </option>
              ))}
            </select>
          </Campo>
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
          <Campo label={t('bbvaCat.fields.numeroCredito')}>
            <InputFenix
              value={enc.credito || ''}
              onChange={(e) => actualizarEncabezado('credito', e.target.value)}
            />
          </Campo>
          <Campo label={t('bbvaCat.fields.valorAseguradoInmueble')}>
            <InputMonedaExpress
              value={
                enc.valorAseguradoInmueble ??
                liquidador.liquidacionCatastrofico?.valorAsegurado ??
                ''
              }
              onChange={(e) => actualizarEncabezado('valorAseguradoInmueble', e.target.value)}
            />
          </Campo>
        </div>
        {totales.deducibleRequiereValorAsegurado ? (
          <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
            {t('bbvaCat.settlement.needInsuredValue')}
          </p>
        ) : null}
        <div className="mt-4">
          <OtrosAmparosLiquidacion
            otrosAmparos={liquidador.otrosAmparos}
            onChange={(filas) =>
              setLiquidador((prev) => ({
                ...prev,
                otrosAmparos: Array.isArray(filas) && filas.length ? filas : defaultOtrosAmparos(),
              }))
            }
          />
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
            <span>
              {t('bbvaCat.settlement.deductibleBudget')}
              <span className="mt-0.5 block text-[11px] font-normal text-gray-500 dark:text-gray-400">
                {totales.diagrama?.deduciblePresupuesto?.texto ||
                  t('bbvaCat.settlement.deductibleCatRule')}
              </span>
            </span>
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
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>Otros amparos (sin deducible)</span>
            <span>$ {formatearMonto(totales.totalOtrosAmparos)}</span>
          </div>
          <div className="flex justify-between px-4 py-2 text-sm font-bold">
            <span>{t('bbvaCat.settlement.totalPay')}</span>
            <span>$ {formatearMonto(totales.totalIndemnizar)}</span>
          </div>
        </div>
      </section>

      <LetrerosBbvaCat
        tipoLiquidador={tipoLiquidador}
        aceptacionIndemnizacion={liquidador.aceptacionIndemnizacion || ''}
        datosFiniquito={liquidador.datosFiniquito || {}}
        observacionesFiniquito={liquidador.observacionesFiniquito || ''}
        onAceptacionChange={(v) =>
          setLiquidador((prev) => ({ ...prev, aceptacionIndemnizacion: v }))
        }
        onDatosFiniquitoChange={actualizarDatosFiniquito}
        onObservacionesChange={(v) =>
          setLiquidador((prev) => ({ ...prev, observacionesFiniquito: v }))
        }
      />

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {t('bbvaCat.settlement.nsrTitle', { defaultValue: 'Evaluación y liquidador NSR-10' })}
        </h3>
        <ChecklistEvaluacionSismicaNSR10
          formData={formDataNsr}
          onInputChange={handleNsrChange}
          modoLiquidador={false}
          recargosPresupuesto={RECARGOS_PRESUPUESTO_BBVA_CAT}
        />
      </section>
    </div>
  );
}
