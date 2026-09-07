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
import {
  RECARGOS_PRESUPUESTO_NSR10_CAT,
  REGLAS_DEDUCIBLE_SURA,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import CampoTomadorSura from './CampoTomadorSura.jsx';
import {
  calcularLiquidacionSura,
  formDataNsrDesdeLiquidadorSura,
  formatearMonto,
  mapCasoSuraALiquidador,
} from './liquidadorSuraHelpers.js';
import { descargarFiniquitoSuraWord } from './generarFiniquitoSuraWord.js';
import { descargarLiquidadorSuraExcel } from './generarLiquidadorSuraExcel.js';
import { descargarLiquidadorSuraPdf } from './generarLiquidadorSuraPdf.js';
import CotizacionPdfLiquidacion from '../liquidacion/CotizacionPdfLiquidacion.jsx';
import {
  montoCotizacionPdf,
  usaCotizacionComoBasePresupuesto,
} from '../liquidacion/cotizacionPdfLiquidacion.js';
import {
  eliminarArchivoSura,
  getCasoSuraById,
  subirArchivoSura,
  actualizarArchivoSura,
  urlDescargaArchivoSura,
} from '../../services/segurosSuraService.js';

const grid3 = 'grid grid-cols-1 gap-4 sm:grid-cols-3';

const suraArchivosApi = {
  getById: getCasoSuraById,
  subir: subirArchivoSura,
  eliminar: eliminarArchivoSura,
  actualizar: actualizarArchivoSura,
  url: urlDescargaArchivoSura,
};

/**
 * Liquidador Sura = evaluación NSR-10 completa (portada / eval / dictamen / presupuesto)
 * + cotización PDF opcional + diagrama de liquidación.
 */
export default function LiquidadorSegurosSura({
  casoSura = null,
  onGuardarEnCaso,
  guardandoCaso = false,
  onEstadoChange,
  onCasoChange,
  liquidadorInicial = null,
}) {
  const { t } = useTranslation();
  const [liquidador, setLiquidador] = useState(() =>
    liquidadorInicial || mapCasoSuraALiquidador(casoSura || {})
  );
  const [error, setError] = useState('');
  const [exportando, setExportando] = useState('');

  useEffect(() => {
    setLiquidador(liquidadorInicial || mapCasoSuraALiquidador(casoSura || {}));
  }, [casoSura?._id]);

  const totales = useMemo(() => calcularLiquidacionSura(liquidador), [liquidador]);
  const enc = liquidador.encabezado || {};
  const tieneCotizacionPdf =
    (Array.isArray(liquidador.cotizacionPdf?.paginas) && liquidador.cotizacionPdf.paginas.length) ||
    liquidador.cotizacionPdf?.archivoPdf;
  const usaCotizBase = usaCotizacionComoBasePresupuesto(liquidador.cotizacionPdf);

  useEffect(() => {
    onEstadoChange?.(liquidador, totales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liquidador, totales]);

  const formDataNsr = useMemo(
    () => formDataNsrDesdeLiquidadorSura(liquidador, casoSura || {}),
    [liquidador, casoSura]
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

  const appendArchivosAlCaso = (creados = []) => {
    const lista = (Array.isArray(creados) ? creados : [creados]).filter(Boolean);
    if (!lista.length) return;
    onCasoChange?.((prev) => {
      if (!prev) return prev;
      const actuales = Array.isArray(prev.archivos) ? prev.archivos : [];
      const ids = new Set(actuales.map((a) => String(a?._id || '')).filter(Boolean));
      const extra = lista.filter((a) => a?._id && !ids.has(String(a._id)));
      if (!extra.length) return prev;
      return { ...prev, archivos: [...actuales, ...extra] };
    });
  };

  const handleCotizacionChange = (cotizacionPdf) => {
    setLiquidador((prev) => ({ ...prev, cotizacionPdf }));
  };

  const handleGuardar = async () => {
    if (!onGuardarEnCaso) return;
    setError('');
    try {
      await onGuardarEnCaso(liquidador, totales);
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosSura.settlement.saveError'));
    }
  };

  const correrExport = async (tipo, fn) => {
    setError('');
    setExportando(tipo);
    try {
      await fn(liquidador, totales);
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosSura.settlement.exportError'));
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
            onClick={() => correrExport('excel', descargarLiquidadorSuraExcel)}
          >
            <FaFileExcel /> Excel
          </button>
          <button
            type="button"
            className={expressBtnSecondary}
            disabled={!!exportando}
            onClick={() => correrExport('pdf', descargarLiquidadorSuraPdf)}
          >
            <FaFilePdf /> PDF
          </button>
          <button
            type="button"
            className={expressBtnGhost}
            disabled={!!exportando}
            onClick={() => correrExport('finiquito', descargarFiniquitoSuraWord)}
          >
            <FaFileWord /> {t('segurosSura.settlement.downloadFiniquito')}
          </button>
        </div>
        {onGuardarEnCaso && (
          <button
            type="button"
            className={expressBtnPrimary}
            disabled={guardandoCaso}
            onClick={handleGuardar}
          >
            {guardandoCaso
              ? t('segurosSura.settlement.saving')
              : t('segurosSura.settlement.saveToCase')}
          </button>
        )}
      </div>

      {error && <p className={expressAlertError}>{error}</p>}

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('segurosSura.settlement.headerTitle')}</h3>
        <div className={grid3}>
          <CampoTomadorSura
            className="sm:col-span-3"
            value={enc.tomador}
            onChange={(valor) => actualizarEncabezado('tomador', valor)}
            mostrarGestion={false}
          />
          <Campo label={t('segurosSura.settlement.insured')}>
            <InputFenix
              value={enc.asegurado || ''}
              onChange={(e) => actualizarEncabezado('asegurado', e.target.value)}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.numeroPoliza')}>
            <InputFenix
              value={enc.poliza || ''}
              onChange={(e) => actualizarEncabezado('poliza', e.target.value)}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.siniestro')}>
            <InputFenix
              value={enc.siniestro || ''}
              onChange={(e) => actualizarEncabezado('siniestro', e.target.value)}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.identificacion')}>
            <InputFenix
              value={enc.identificacion || ''}
              onChange={(e) => actualizarEncabezado('identificacion', e.target.value)}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.cobertura')}>
            <InputFenix
              value={enc.cobertura || ''}
              onChange={(e) => actualizarEncabezado('cobertura', e.target.value)}
            />
          </Campo>
          <Campo label={t('segurosSura.fields.direccionPredio')}>
            <InputFenix
              value={enc.direccion || ''}
              onChange={(e) => actualizarEncabezado('direccion', e.target.value)}
            />
          </Campo>
        </div>

        <div className="mt-4">
          <CotizacionPdfLiquidacion
            value={liquidador.cotizacionPdf}
            onChange={handleCotizacionChange}
            casoId={casoSura?._id}
            api={suraArchivosApi}
            archivosCaso={casoSura?.archivos || []}
            onArchivosCreados={appendArchivosAlCaso}
            onArchivosEliminados={(ids) => {
              const setIds = new Set((ids || []).map((id) => String(id || '')).filter(Boolean));
              if (!setIds.size) return;
              onCasoChange?.((prev) => {
                if (!prev) return prev;
                const actuales = Array.isArray(prev.archivos) ? prev.archivos : [];
                return {
                  ...prev,
                  archivos: actuales.filter((a) => !setIds.has(String(a?._id))),
                };
              });
            }}
            disabled={!!exportando || guardandoCaso}
            i18nPrefix="segurosSura.settlement"
          />
        </div>

        <div className="mt-4 grid max-w-xl grid-cols-1 gap-1 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>
              {usaCotizBase
                ? t('segurosSura.settlement.totalDamagesQuote', {
                    defaultValue: 'Total daños (cotización PDF)',
                  })
                : 'Total daños (NSR-10)'}
            </span>
            <span>$ {formatearMonto(totales.totalDanios)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>
              {usaCotizBase
                ? t('segurosSura.settlement.deductibleQuote', {
                    defaultValue: 'Deducible cotización',
                  })
                : 'Deducible presupuesto'}
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
            <span>Suma neta (edificio + contenidos)</span>
            <span>
              ${' '}
              {formatearMonto(
                (Number(totales.diagrama?.deduciblePresupuesto?.neto) || 0) +
                  (Number(totales.diagrama?.deducibleContenidos?.neto) || 0)
              )}
            </span>
          </div>
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>Gastos de hospedaje (sin deducible)</span>
            <span>$ {formatearMonto(totales.diagrama?.gastosHospedaje)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>Otros amparos (sin deducible)</span>
            <span>$ {formatearMonto(totales.totalOtrosAmparos)}</span>
          </div>
          <div className="flex justify-between px-4 py-2 text-sm font-bold">
            <span>{t('segurosSura.settlement.totalPay')}</span>
            <span>$ {formatearMonto(totales.totalIndemnizar)}</span>
          </div>
        </div>
        {usaCotizBase && (
          <p className="mt-2 text-xs text-gray-500">
            {t('segurosSura.settlement.quoteDeductibleNote', {
              defaultValue:
                'El tope del deducible de edificio es el monto de la cotización; el % se calcula sobre el valor asegurable cuando está diligenciado.',
            })}
          </p>
        )}
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {tieneCotizacionPdf
            ? t('segurosSura.settlement.nsrTitleQuote', {
                defaultValue: 'Liquidador · Contenidos y totales (cotización PDF)',
              })
            : t('segurosSura.settlement.nsrTitle', {
                defaultValue: 'Evaluación y liquidador NSR-10',
              })}
        </h3>
        <ChecklistEvaluacionSismicaNSR10
          formData={formDataNsr}
          onInputChange={handleNsrChange}
          modoLiquidador={false}
          habilitarUploadFotos={false}
          recargosPresupuesto={RECARGOS_PRESUPUESTO_NSR10_CAT}
          reglasDeduciblePorCobertura={REGLAS_DEDUCIBLE_SURA}
          ocultarPresupuestoEscrito={Boolean(tieneCotizacionPdf && usaCotizBase)}
          totalPresupuestoOverride={
            usaCotizBase ? montoCotizacionPdf(liquidador.cotizacionPdf) : null
          }
        />
      </section>
    </div>
  );
}
