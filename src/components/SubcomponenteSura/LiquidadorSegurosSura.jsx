import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileExcel, FaFilePdf, FaFileWord } from 'react-icons/fa';
import {
  Campo,
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
  InputFenix,
  SelectFenix,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  expressAlertError,
  expressFormSection,
  expressSectionTitle,
} from '../SubcomponenteExpress/expressFenixUi.js';
import ChecklistEvaluacionSismicaNSR10 from '../SubcomponenteEvaluacionSismicaNSR10/ChecklistEvaluacionSismicaNSR10.jsx';
import {
  AIU_PORCENTAJE_DEFAULT_NSR10_CAT,
  formatMilesInputNsr10,
  formatMilesNsr10,
  parseMontoNsr10,
  RECARGOS_PRESUPUESTO_NSR10_CAT,
  REGLAS_DEDUCIBLE_SURA,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import SeccionModoLiquidadorCat from '../SubcomponenteLiquidadorCatExpress/SeccionModoLiquidadorCat.jsx';
import {
  ANIOS_SMMLV,
  DEFAULT_DEDUCIBLE_CATASTROFICO,
  resolverBasePctElegida,
  SMMLV_POR_ANIO,
  valorSmdlvDesdeSmmlv,
} from '../SubcomponenteFormularioCatastrofico/catalogoPresupuestoCatastrofico.js';
import CampoTomadorSura from './CampoTomadorSura.jsx';
import {
  calcularLiquidacionSura,
  formDataNsrDesdeLiquidadorSura,
  formatearMonto,
  mapCasoSuraALiquidador,
  parsearNumero,
  resolverValorAsegurableDesdeCasoSura,
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

  const deducibleCfgPresupuesto = {
    ...DEFAULT_DEDUCIBLE_CATASTROFICO,
    ...(liquidador.liquidacionCatastrofico?.deducibleConfigPresupuesto || {}),
  };
  const esSmdlvPresupuesto = deducibleCfgPresupuesto.tipoMinimo === 'SMDLV';
  const basePctElegida = resolverBasePctElegida(deducibleCfgPresupuesto);
  const esPctSobrePerdida = basePctElegida === 'perdida';
  const esPctSobreValorAsegurable = basePctElegida === 'valor_asegurable';
  const valorAsegurableCasoN = resolverValorAsegurableDesdeCasoSura(casoSura, {
    ...liquidador,
    informeAgil: casoSura?.informeAgil || liquidador.informeAgil,
  });
  const valorAsegurableActualN =
    parsearNumero(liquidador.liquidacionCatastrofico?.valorAsegurado) ||
    parsearNumero(liquidador.encabezado?.valorAseguradoInmueble) ||
    valorAsegurableCasoN ||
    0;
  const valorAsegurableActual =
    valorAsegurableActualN > 0 ? valorAsegurableActualN : '';
  const valorAsegurableCaso =
    valorAsegurableCasoN > 0 ? valorAsegurableCasoN : '';

  const actualizarDeduciblePresupuesto = (patch, extras = {}) => {
    setLiquidador((prev) => {
      const liq = prev.liquidacionCatastrofico || {};
      const base = {
        ...DEFAULT_DEDUCIBLE_CATASTROFICO,
        ...(liq.deducibleConfigPresupuesto || {}),
      };
      const nextLiq = {
        ...liq,
        deducibleConfigPresupuesto: { ...base, ...patch },
        ...extras.liquidacionCatastrofico,
      };
      const nextEnc = extras.encabezado
        ? { ...(prev.encabezado || {}), ...extras.encabezado }
        : prev.encabezado;
      return {
        ...prev,
        encabezado: nextEnc,
        liquidacionCatastrofico: nextLiq,
        informeAgil: casoSura?.informeAgil || prev.informeAgil || null,
      };
    });
  };

  const actualizarValorAsegurable = (raw) => {
    const fmt = formatMilesInputNsr10(raw);
    const n = parseMontoNsr10(fmt);
    setLiquidador((prev) => {
      const liq = prev.liquidacionCatastrofico || {};
      const enc = prev.encabezado || {};
      return {
        ...prev,
        encabezado: {
          ...enc,
          valorAseguradoInmueble: fmt,
        },
        liquidacionCatastrofico: {
          ...liq,
          valorAsegurado: n == null ? '' : n,
        },
        informeAgil: casoSura?.informeAgil || prev.informeAgil || null,
      };
    });
  };

  const elegirBasePctDeducible = (base) => {
    const esVa = base === 'valor_asegurable';
    const delCaso = resolverValorAsegurableDesdeCasoSura(casoSura, {
      ...liquidador,
      informeAgil: casoSura?.informeAgil || liquidador.informeAgil,
    });
    const extras =
      esVa && delCaso > 0
        ? {
            liquidacionCatastrofico: { valorAsegurado: delCaso },
            encabezado: {
              valorAseguradoInmueble: formatMilesInputNsr10(String(delCaso)),
            },
          }
        : {};
    actualizarDeduciblePresupuesto(
      {
        basePctDeducible: base,
        baseDeducible: base,
      },
      extras
    );
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

        {usaCotizBase && (
          <div className="mt-4 max-w-xl space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('segurosSura.settlement.quoteDeductibleTitle', {
                  defaultValue: 'Deducible de la cotización',
                })}
              </h4>
              <p className="mt-1 text-xs text-gray-500">
                {t('segurosSura.settlement.quoteDeductibleHint', {
                  defaultValue:
                    'Indique si el % va sobre valor asegurable o sobre la pérdida (cotización). Se aplica el mayor entre ese % y el mínimo SMMLV/SMDLV, con tope en el monto de la cotización.',
                })}
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                {t('segurosSura.settlement.quoteDeductibleBase', {
                  defaultValue: 'El % deducible se calcula sobre',
                })}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`${esPctSobreValorAsegurable ? expressBtnPrimary : expressBtnGhost} !px-3 !py-1.5 text-xs`}
                  disabled={!!exportando || guardandoCaso}
                  onClick={() => elegirBasePctDeducible('valor_asegurable')}
                >
                  Valor asegurable
                </button>
                <button
                  type="button"
                  className={`${esPctSobrePerdida ? expressBtnPrimary : expressBtnGhost} !px-3 !py-1.5 text-xs`}
                  disabled={!!exportando || guardandoCaso}
                  onClick={() => elegirBasePctDeducible('perdida')}
                >
                  Pérdida (cotización)
                </button>
              </div>
              {!basePctElegida && (
                <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">
                  {t('segurosSura.settlement.quoteDeductibleBaseRequired', {
                    defaultValue:
                      'Elija la base del %: valor asegurable (p. ej. 3% VA) o pérdida de la cotización.',
                  })}
                </p>
              )}
            </div>
            {(esPctSobreValorAsegurable || !basePctElegida) && (
              <Campo label="Valor asegurable (inmueble)">
                <InputFenix
                  type="text"
                  inputMode="decimal"
                  disabled={!!exportando || guardandoCaso}
                  value={
                    formatMilesNsr10(valorAsegurableActual) ||
                    String(valorAsegurableActual ?? '')
                  }
                  onChange={(e) => actualizarValorAsegurable(e.target.value)}
                  placeholder={
                    parsearNumero(valorAsegurableCaso) > 0
                      ? `Del caso: $ ${formatMilesNsr10(valorAsegurableCaso)}`
                      : 'Escriba el valor asegurable'
                  }
                />
                {parsearNumero(valorAsegurableCaso) > 0 &&
                  parsearNumero(valorAsegurableActual) !==
                    parsearNumero(valorAsegurableCaso) && (
                    <button
                      type="button"
                      className="mt-1 text-xs font-semibold text-blue-700 dark:text-blue-300"
                      disabled={!!exportando || guardandoCaso}
                      onClick={() => actualizarValorAsegurable(String(valorAsegurableCaso))}
                    >
                      Traer valor asegurable del caso ($ {formatMilesNsr10(valorAsegurableCaso)})
                    </button>
                  )}
              </Campo>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`${!esSmdlvPresupuesto ? expressBtnPrimary : expressBtnGhost} !px-3 !py-1.5 text-xs`}
                disabled={!!exportando || guardandoCaso}
                onClick={() =>
                  actualizarDeduciblePresupuesto({
                    tipoMinimo: 'SMMLV',
                    cantidadSMMLV:
                      deducibleCfgPresupuesto.cantidadSMMLV === '' ||
                      deducibleCfgPresupuesto.cantidadSMMLV == null
                        ? deducibleCfgPresupuesto.cantidadSMDLV ?? 4
                        : deducibleCfgPresupuesto.cantidadSMMLV,
                  })
                }
              >
                SMMLV (mensual)
              </button>
              <button
                type="button"
                className={`${esSmdlvPresupuesto ? expressBtnPrimary : expressBtnGhost} !px-3 !py-1.5 text-xs`}
                disabled={!!exportando || guardandoCaso}
                onClick={() =>
                  actualizarDeduciblePresupuesto({
                    tipoMinimo: 'SMDLV',
                    cantidadSMDLV:
                      deducibleCfgPresupuesto.cantidadSMDLV === '' ||
                      deducibleCfgPresupuesto.cantidadSMDLV == null
                        ? deducibleCfgPresupuesto.cantidadSMMLV ?? 10
                        : deducibleCfgPresupuesto.cantidadSMDLV,
                  })
                }
              >
                SMDLV (diario)
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo label="% deducible">
                <InputFenix
                  type="text"
                  inputMode="decimal"
                  disabled={!!exportando || guardandoCaso}
                  value={
                    deducibleCfgPresupuesto.porcentaje === '' ||
                    deducibleCfgPresupuesto.porcentaje == null
                      ? ''
                      : String(deducibleCfgPresupuesto.porcentaje)
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
                    if ((raw.match(/\./g) || []).length > 1) return;
                    actualizarDeduciblePresupuesto({
                      porcentaje: raw === '' ? '' : raw,
                    });
                  }}
                />
              </Campo>
              <Campo label={esSmdlvPresupuesto ? 'Cant. SMDLV' : 'Cant. SMMLV'}>
                <InputFenix
                  type="text"
                  inputMode="decimal"
                  disabled={!!exportando || guardandoCaso}
                  value={
                    esSmdlvPresupuesto
                      ? deducibleCfgPresupuesto.cantidadSMDLV ?? ''
                      : deducibleCfgPresupuesto.cantidadSMMLV ?? ''
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
                    if ((raw.match(/\./g) || []).length > 1) return;
                    actualizarDeduciblePresupuesto(
                      esSmdlvPresupuesto
                        ? { cantidadSMDLV: raw, tipoMinimo: 'SMDLV' }
                        : { cantidadSMMLV: raw, tipoMinimo: 'SMMLV' }
                    );
                  }}
                />
              </Campo>
              <Campo label="Año SMMLV">
                <SelectFenix
                  disabled={!!exportando || guardandoCaso}
                  value={deducibleCfgPresupuesto.anioSMMLV ?? ''}
                  onChange={(e) => {
                    const anio = Number(e.target.value);
                    const valorSMMLV = SMMLV_POR_ANIO[anio];
                    actualizarDeduciblePresupuesto({
                      anioSMMLV: anio,
                      valorSMMLV,
                      valorSMDLV: valorSmdlvDesdeSmmlv(valorSMMLV),
                    });
                  }}
                >
                  {ANIOS_SMMLV.map((anio) => (
                    <option key={anio} value={anio}>
                      {anio} — $ {formatMilesNsr10(SMMLV_POR_ANIO[anio])}
                    </option>
                  ))}
                </SelectFenix>
              </Campo>
              <Campo label={esSmdlvPresupuesto ? 'Valor SMDLV' : 'Valor SMMLV'}>
                <InputFenix
                  type="text"
                  inputMode="decimal"
                  disabled={!!exportando || guardandoCaso}
                  value={
                    esSmdlvPresupuesto
                      ? formatMilesNsr10(deducibleCfgPresupuesto.valorSMDLV) ||
                        String(deducibleCfgPresupuesto.valorSMDLV ?? '')
                      : formatMilesNsr10(deducibleCfgPresupuesto.valorSMMLV) ||
                        String(deducibleCfgPresupuesto.valorSMMLV ?? '')
                  }
                  onChange={(e) => {
                    const fmt = formatMilesInputNsr10(e.target.value);
                    if (esSmdlvPresupuesto) {
                      actualizarDeduciblePresupuesto({
                        valorSMDLV: fmt,
                        tipoMinimo: 'SMDLV',
                      });
                      return;
                    }
                    const n = parseMontoNsr10(fmt);
                    actualizarDeduciblePresupuesto({
                      valorSMMLV: fmt,
                      valorSMDLV:
                        n == null
                          ? deducibleCfgPresupuesto.valorSMDLV
                          : valorSmdlvDesdeSmmlv(n),
                      tipoMinimo: 'SMMLV',
                    });
                  }}
                />
              </Campo>
            </div>
          </div>
        )}

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
        {usaCotizBase ? (
          <p className="mt-2 text-xs text-gray-500">
            {t('segurosSura.settlement.quoteDeductibleNote', {
              defaultValue:
                'El tope del deducible de edificio es el monto de la cotización. Si la cotización está desfasada, desmarque «Usar este monto como base…» y liquide con el presupuesto NSR-10 en la pestaña Presupuesto.',
            })}
          </p>
        ) : tieneCotizacionPdf ? (
          <p className="mt-2 text-xs text-gray-500">
            {t('segurosSura.settlement.quoteNotBaseNote', {
              defaultValue:
                'La cotización PDF queda de referencia. La liquidación usa el presupuesto NSR-10 que diligencie el ajustador en Presupuesto.',
            })}
          </p>
        ) : null}
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {t('segurosSura.settlement.nsrTitle', {
            defaultValue: 'Evaluación y liquidador NSR-10',
          })}
        </h3>
        <SeccionModoLiquidadorCat
          modulo="sura"
          liquidador={liquidador}
          onLiquidadorChange={setLiquidador}
          aiuPorcentaje={
            Number(liquidador?.evaluacionSismicaNSR10?.presupuesto?.aiuPorcentaje) ||
            AIU_PORCENTAJE_DEFAULT_NSR10_CAT
          }
          disabled={!!exportando || guardandoCaso}
        >
        <ChecklistEvaluacionSismicaNSR10
          formData={formDataNsr}
          onInputChange={handleNsrChange}
          modoLiquidador={false}
          habilitarUploadFotos={false}
          recargosPresupuesto={RECARGOS_PRESUPUESTO_NSR10_CAT}
          reglasDeduciblePorCobertura={REGLAS_DEDUCIBLE_SURA}
          ocultarPresupuestoEscrito={false}
          totalPresupuestoOverride={
            usaCotizBase ? montoCotizacionPdf(liquidador.cotizacionPdf) : null
          }
        />
        </SeccionModoLiquidadorCat>
      </section>
    </div>
  );
}
