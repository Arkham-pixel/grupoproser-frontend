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
  expressAlertSuccess,
  expressFormSection,
  expressSectionTitle,
} from '../SubcomponenteExpress/expressFenixUi.js';
import ChecklistEvaluacionSismicaNSR10 from '../SubcomponenteEvaluacionSismicaNSR10/ChecklistEvaluacionSismicaNSR10.jsx';
import { RECARGOS_PRESUPUESTO_NSR10_CAT } from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import CampoTomadorAllianz from './CampoTomadorAllianz.jsx';
import { formatMilesInput } from './allianzHelpers.js';
import {
  calcularLiquidacionAllianz,
  cuadroLiquidacionAllianz,
  desgloseDeducibleTerremotoAllianz,
  formDataNsrDesdeLiquidadorAllianz,
  formatearMonto,
  mapcasoAllianzALiquidador,
  parsearNumero,
  patchDeduciblePresupuestoAllianz,
} from './liquidadorAllianzHelpers.js';
import { descargarFiniquitoAllianzWord } from './generarFiniquitoAllianzWord.js';
import { descargarLiquidadorAllianzExcel } from './generarLiquidadorAllianzExcel.js';
import { descargarLiquidadorAllianzPdf } from './generarLiquidadorAllianzPdf.js';
import { allianzArchivosApi } from './allianzArchivosApi.js';
import OtrosAmparosLiquidacion from '../liquidacion/OtrosAmparosLiquidacion.jsx';
import { defaultOtrosAmparos } from '../liquidacion/otrosAmparosLiquidacion.js';
import CotizacionPdfLiquidacion from '../liquidacion/CotizacionPdfLiquidacion.jsx';
import {
  serializarPaginasCotizacion,
  montoCotizacionPdf,
  usaCotizacionComoBasePresupuesto,
} from '../liquidacion/cotizacionPdfLiquidacion.js';
import EditorDeducibleLibreAllianz from './EditorDeducibleLibreAllianz.jsx';

const grid3 = 'grid grid-cols-1 gap-4 sm:grid-cols-3';

const MIME = {
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  finiquito: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/**
 * Liquidador Allianz = mismo motor que Zurich: encabezado, cotización PDF,
 * presupuesto NSR-10 y diagrama de liquidación con deducible de terremoto.
 */
export default function LiquidadorAllianz({
  casoAllianz = null,
  onGuardarEnCaso,
  guardandoCaso = false,
  onEstadoChange,
  onCasoChange,
  origen = 'cat',
  liquidadorInicial = null,
  embeberEnInforme = false,
  onInformePatch,
}) {
  const { t } = useTranslation();
  const api = useMemo(() => allianzArchivosApi(origen), [origen]);
  const [liquidador, setLiquidador] = useState(() =>
    liquidadorInicial || mapcasoAllianzALiquidador(casoAllianz || {})
  );
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [exportando, setExportando] = useState('');

  useEffect(() => {
    setLiquidador(liquidadorInicial || mapcasoAllianzALiquidador(casoAllianz || {}));
  }, [casoAllianz?._id]);

  const totales = useMemo(() => calcularLiquidacionAllianz(liquidador), [liquidador]);
  const cuadroAgil = useMemo(
    () => cuadroLiquidacionAllianz(totales, liquidador),
    [totales, liquidador]
  );
  const desgloseDed = useMemo(
    () => desgloseDeducibleTerremotoAllianz(liquidador, totales.diagrama),
    [liquidador, totales.diagrama]
  );
  const enc = liquidador.encabezado || {};
  const tieneCotizacionPdf = Boolean(
    (Array.isArray(liquidador.cotizacionPdf?.paginas) && liquidador.cotizacionPdf.paginas.length) ||
      liquidador.cotizacionPdf?.archivoPdf
  );

  useEffect(() => {
    onEstadoChange?.(liquidador, totales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liquidador, totales]);

  const formDataNsr = useMemo(
    () => formDataNsrDesdeLiquidadorAllianz(liquidador, casoAllianz || {}),
    [liquidador, casoAllianz]
  );

  const actualizarEncabezado = (campo, valor) => {
    setLiquidador((prev) => ({
      ...prev,
      encabezado: { ...(prev.encabezado || {}), [campo]: valor },
    }));
  };

  const actualizarValorAsegurable = (campo, crudo) => {
    const valor = formatMilesInput(crudo);
    setLiquidador((prev) => {
      const encabezado = { ...(prev.encabezado || {}), [campo]: valor };
      const liq = { ...(prev.liquidacionCatastrofico || {}) };
      const vaInmueble = parsearNumero(encabezado.valorAseguradoInmueble);
      if (campo === 'valorAseguradoInmueble') {
        liq.valorAsegurado = vaInmueble || '';
        if (vaInmueble > 0) {
          liq.deducibleConfigPresupuesto = {
            ...(liq.deducibleConfigPresupuesto || {}),
            baseDeducible: 'valor_asegurable',
          };
        }
      }
      return { ...prev, encabezado, liquidacionCatastrofico: liq };
    });
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
    onInformePatch?.({
      fotosCotizacion: serializarPaginasCotizacion(cotizacionPdf?.paginas),
    });
  };

  const actualizarDeduciblePresupuesto = (patch) => {
    setLiquidador((prev) => patchDeduciblePresupuestoAllianz(prev, patch));
  };

  const copiarAlArchivero = async (blob, nombre, mime) => {
    const casoId = casoAllianz?._id;
    if (!casoId || !blob || !nombre) return;
    const file = new File([blob], nombre, { type: mime });
    const creado = await api.subir(casoId, file, 'LIQUIDACION');
    appendArchivosAlCaso([creado]);
    setMensaje(t('allianz.settlement.archiveSaved'));
  };

  const correrExport = async (tipo, fn) => {
    setError('');
    setMensaje('');
    setExportando(tipo);
    try {
      const resultado = await fn(liquidador, totales);
      const blob = resultado?.blob;
      const nombre = resultado?.filename || resultado?.nombre;
      if (blob && nombre) {
        try {
          await copiarAlArchivero(blob, nombre, MIME[tipo] || 'application/octet-stream');
        } catch (errArchivo) {
          console.warn('No se pudo guardar en el archivero Allianz:', errArchivo);
          setError(t('allianz.settlement.archiveError'));
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || t('allianz.settlement.exportError'));
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
            onClick={() => correrExport('excel', descargarLiquidadorAllianzExcel)}
          >
            <FaFileExcel /> Excel
          </button>
          <button
            type="button"
            className={expressBtnSecondary}
            disabled={!!exportando}
            onClick={() => correrExport('pdf', descargarLiquidadorAllianzPdf)}
          >
            <FaFilePdf /> PDF
          </button>
          <button
            type="button"
            className={expressBtnGhost}
            disabled={!!exportando}
            onClick={() => correrExport('finiquito', descargarFiniquitoAllianzWord)}
          >
            <FaFileWord /> {t('allianz.settlement.downloadFiniquito')}
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
              ? t('allianz.settlement.saving')
              : t('allianz.settlement.saveToCase')}
          </button>
        )}
      </div>

      {error && <p className={expressAlertError}>{error}</p>}
      {mensaje && <p className={expressAlertSuccess}>{mensaje}</p>}

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('allianz.settlement.headerTitle')}</h3>
        <div className={grid3}>
          <CampoTomadorAllianz
            className="sm:col-span-3"
            value={enc.tomador}
            onChange={(valor) => actualizarEncabezado('tomador', valor)}
            mostrarGestion={false}
          />
          <Campo label={t('allianz.settlement.insured')}>
            <InputFenix
              value={enc.asegurado || ''}
              onChange={(e) => actualizarEncabezado('asegurado', e.target.value)}
            />
          </Campo>
          <Campo label={t('allianz.fields.numeroPoliza')}>
            <InputFenix
              value={enc.poliza || ''}
              onChange={(e) => actualizarEncabezado('poliza', e.target.value)}
            />
          </Campo>
          <Campo label={t('allianz.fields.tipoPoliza')}>
            <InputFenix
              value={enc.tipoPoliza || ''}
              onChange={(e) => actualizarEncabezado('tipoPoliza', e.target.value)}
            />
          </Campo>
          <Campo label={t('allianz.fields.siniestro')}>
            <InputFenix
              value={enc.siniestro || ''}
              onChange={(e) => actualizarEncabezado('siniestro', e.target.value)}
            />
          </Campo>
          <Campo label={t('allianz.fields.tipoIdentificacion')}>
            <InputFenix
              value={enc.tipoIdentificacion || ''}
              onChange={(e) => actualizarEncabezado('tipoIdentificacion', e.target.value)}
            />
          </Campo>
          <Campo label={t('allianz.fields.identificacion')}>
            <InputFenix
              value={enc.identificacion || ''}
              onChange={(e) => actualizarEncabezado('identificacion', e.target.value)}
            />
          </Campo>
          <Campo label={t('allianz.fields.causa')}>
            <InputFenix
              value={enc.causa || ''}
              onChange={(e) => actualizarEncabezado('causa', e.target.value)}
            />
          </Campo>
          <Campo label={t('allianz.fields.cobertura')}>
            <InputFenix
              value={enc.cobertura || ''}
              onChange={(e) => actualizarEncabezado('cobertura', e.target.value)}
            />
          </Campo>
          <Campo label={t('allianz.fields.direccionPredio')}>
            <InputFenix
              value={enc.direccion || ''}
              onChange={(e) => actualizarEncabezado('direccion', e.target.value)}
            />
          </Campo>
          <Campo label={t('allianz.settlement.insuredValueBuilding')}>
            <InputFenix
              inputMode="numeric"
              value={enc.valorAseguradoInmueble || ''}
              onChange={(e) => actualizarValorAsegurable('valorAseguradoInmueble', e.target.value)}
            />
          </Campo>
        </div>
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
        <div className="mt-4">
          <CotizacionPdfLiquidacion
            i18nPrefix="allianz.settlement"
            value={liquidador.cotizacionPdf}
            onChange={handleCotizacionChange}
            casoId={casoAllianz?._id}
            api={api}
            archivosCaso={casoAllianz?.archivos || []}
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
          />
        </div>
        <div className="mt-4 max-w-xl">
          <EditorDeducibleLibreAllianz
            cfg={liquidador.liquidacionCatastrofico?.deducibleConfigPresupuesto || {}}
            onChange={actualizarDeduciblePresupuesto}
            disabled={!!exportando || guardandoCaso}
          />
        </div>
        <div className="mt-4 grid max-w-xl grid-cols-1 gap-1 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>
              {totales.origenPresupuesto === 'cotizacion'
                ? t('allianz.settlement.totalDamagesQuote')
                : t('allianz.settlement.totalDamagesNsr')}
            </span>
            <span>$ {formatearMonto(totales.totalDanios)}</span>
          </div>
          {totales.origenPresupuesto === 'cotizacion' && (
            <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
              <span>{t('allianz.settlement.totalQuote')}</span>
              <span>$ {formatearMonto(totales.cotizacionMonto)}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>Hospedaje</span>
            <span>$ {formatearMonto(totales.diagrama?.gastosHospedaje)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>{desgloseDed.etiquetaPct}</span>
            <span>$ {formatearMonto(desgloseDed.montoPct)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>{desgloseDed.etiquetaSmmlv}</span>
            <span>$ {formatearMonto(desgloseDed.montoSmmlv)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>{desgloseDed.etiquetaAplicado}</span>
            <span>$ {formatearMonto(desgloseDed.aplicado)}</span>
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
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>{t('allianz.settlement.suggestedIndemnify')}</span>
            <span>$ {formatearMonto(cuadroAgil.valorSugeridoIndemnizar)}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 px-4 py-2 text-sm dark:border-gray-700">
            <span>{t('allianz.settlement.deductibleToApply')}</span>
            <span>$ {formatearMonto(cuadroAgil.deducibleMonto)}</span>
          </div>
          <div className="flex justify-between px-4 py-2 text-sm font-bold">
            <span>{t('allianz.settlement.suggestedAfterDeductible')}</span>
            <span>$ {formatearMonto(cuadroAgil.valorSugeridoLuegoDeducible)}</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {cuadroAgil.deducibleTexto || totales.deducibleTexto || desgloseDed.texto}
        </p>
      </section>

      <section className={expressFormSection}>
        {!embeberEnInforme && (
          <h3 className={expressSectionTitle}>
            {tieneCotizacionPdf
              ? t('allianz.settlement.nsrTitleQuote')
              : t('allianz.settlement.nsrTitle', {
                  defaultValue: 'Evaluación y liquidador NSR-10',
                })}
          </h3>
        )}
        <ChecklistEvaluacionSismicaNSR10
          formData={formDataNsr}
          onInputChange={handleNsrChange}
          modoLiquidador={embeberEnInforme}
          recargosPresupuesto={RECARGOS_PRESUPUESTO_NSR10_CAT}
          ocultarPresupuestoEscrito={tieneCotizacionPdf}
          totalPresupuestoOverride={
            usaCotizacionComoBasePresupuesto(liquidador.cotizacionPdf)
              ? montoCotizacionPdf(liquidador.cotizacionPdf)
              : null
          }
        />
      </section>
    </div>
  );
}
