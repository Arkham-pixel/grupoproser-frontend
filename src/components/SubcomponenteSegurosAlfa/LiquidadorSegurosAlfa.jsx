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
import CampoTomadorAlfa from './CampoTomadorAlfa.jsx';
import {
  calcularLiquidacionAlfa,
  formDataNsrDesdeLiquidadorAlfa,
  formatearMonto,
  mapCasoAlfaALiquidador,
} from './liquidadorAlfaHelpers.js';
import { descargarFiniquitoAlfaWord } from './generarFiniquitoAlfaWord.js';
import { descargarLiquidadorAlfaExcel } from './generarLiquidadorAlfaExcel.js';
import { descargarLiquidadorAlfaPdf } from './generarLiquidadorAlfaPdf.js';
import {
  sincronizarFotosNsrEnInformeCaso,
  subirFotoFilaNsrAlfa,
} from './syncFotosNsrAlInformeAlfa.js';

const grid3 = 'grid grid-cols-1 gap-4 sm:grid-cols-3';

/**
 * Liquidador Alfa = evaluación NSR-10 completa (portada / eval / dictamen / presupuesto)
 * + diagrama de liquidación, mismo motor que Catastrófico Complex.
 */
export default function LiquidadorSegurosAlfa({
  casoAlfa = null,
  onGuardarEnCaso,
  guardandoCaso = false,
  onEstadoChange,
  onCasoChange,
}) {
  const { t } = useTranslation();
  const [liquidador, setLiquidador] = useState(() => mapCasoAlfaALiquidador(casoAlfa || {}));
  const [error, setError] = useState('');
  const [exportando, setExportando] = useState('');
  const casoId = casoAlfa?._id ? String(casoAlfa._id) : '';

  useEffect(() => {
    setLiquidador(mapCasoAlfaALiquidador(casoAlfa || {}));
  }, [casoAlfa?._id]);

  const totales = useMemo(() => calcularLiquidacionAlfa(liquidador), [liquidador]);
  const enc = liquidador.encabezado || {};

  useEffect(() => {
    onEstadoChange?.(liquidador, totales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liquidador, totales]);

  const formDataNsr = useMemo(
    () => formDataNsrDesdeLiquidadorAlfa(liquidador, casoAlfa || {}),
    [liquidador, casoAlfa]
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

  const patchItemFoto = (index, fotoPatch) => {
    let itemsSnapshot = [];
    setLiquidador((prev) => {
      const evalData = prev.evaluacionSismicaNSR10 || {};
      const items = Array.isArray(evalData.items) ? [...evalData.items] : [];
      if (!items[index]) {
        itemsSnapshot = items;
        return prev;
      }
      items[index] = { ...items[index], ...fotoPatch };
      itemsSnapshot = items;
      return {
        ...prev,
        modelo: 'nsr10',
        evaluacionSismicaNSR10: { ...evalData, items },
      };
    });
    return itemsSnapshot;
  };

  const syncInformeConItems = async (items) => {
    if (!casoId) return;
    const actualizado = await sincronizarFotosNsrEnInformeCaso({
      casoId,
      casoBase: casoAlfa || {},
      itemsNsr: items,
    });
    if (actualizado) onCasoChange?.(actualizado);
  };

  const handleUploadFotoFila = async (index, file, item) => {
    const patch = await subirFotoFilaNsrAlfa({ casoId, file, item });
    const preview =
      typeof URL !== 'undefined' && file ? URL.createObjectURL(file) : '';
    const items = patchItemFoto(index, { ...patch, fotoPreview: preview });
    await syncInformeConItems(items);
  };

  const handleRemoveFotoFila = async (index) => {
    const items = patchItemFoto(index, {
      fotoRef: '',
      fotoArchivoId: '',
      fotoRuta: '',
      fotoPreview: '',
    });
    await syncInformeConItems(items);
  };

  const handleGuardar = async () => {
    if (!onGuardarEnCaso) return;
    setError('');
    try {
      const items = liquidador?.evaluacionSismicaNSR10?.items || [];
      if (casoId && items.some((it) => it?.fotoArchivoId || it?.fotoRuta)) {
        await syncInformeConItems(items);
      }
      await onGuardarEnCaso(liquidador, totales);
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosAlfa.settlement.saveError'));
    }
  };

  const correrExport = async (tipo, fn) => {
    setError('');
    setExportando(tipo);
    try {
      await fn(liquidador, totales);
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosAlfa.settlement.exportError'));
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
            onClick={() => correrExport('excel', descargarLiquidadorAlfaExcel)}
          >
            <FaFileExcel /> Excel
          </button>
          <button
            type="button"
            className={expressBtnSecondary}
            disabled={!!exportando}
            onClick={() => correrExport('pdf', descargarLiquidadorAlfaPdf)}
          >
            <FaFilePdf /> PDF
          </button>
          <button
            type="button"
            className={expressBtnGhost}
            disabled={!!exportando}
            onClick={() => correrExport('finiquito', descargarFiniquitoAlfaWord)}
          >
            <FaFileWord /> {t('segurosAlfa.settlement.downloadFiniquito')}
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
              ? t('segurosAlfa.settlement.saving')
              : t('segurosAlfa.settlement.saveToCase')}
          </button>
        )}
      </div>

      {error && <p className={expressAlertError}>{error}</p>}

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('segurosAlfa.settlement.headerTitle')}</h3>
        <div className={grid3}>
          <CampoTomadorAlfa
            className="sm:col-span-3"
            value={enc.tomador}
            onChange={(valor) => actualizarEncabezado('tomador', valor)}
            mostrarGestion={false}
          />
          <Campo label={t('segurosAlfa.settlement.insured')}>
            <InputFenix
              value={enc.asegurado || ''}
              onChange={(e) => actualizarEncabezado('asegurado', e.target.value)}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.numeroPoliza')}>
            <InputFenix
              value={enc.poliza || ''}
              onChange={(e) => actualizarEncabezado('poliza', e.target.value)}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.siniestro')}>
            <InputFenix
              value={enc.siniestro || ''}
              onChange={(e) => actualizarEncabezado('siniestro', e.target.value)}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.identificacion')}>
            <InputFenix
              value={enc.identificacion || ''}
              onChange={(e) => actualizarEncabezado('identificacion', e.target.value)}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.cobertura')}>
            <InputFenix
              value={enc.cobertura || ''}
              onChange={(e) => actualizarEncabezado('cobertura', e.target.value)}
            />
          </Campo>
          <Campo label={t('segurosAlfa.fields.direccionPredio')}>
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
          <div className="flex justify-between px-4 py-2 text-sm font-bold">
            <span>{t('segurosAlfa.settlement.totalPay')}</span>
            <span>$ {formatearMonto(totales.totalIndemnizar)}</span>
          </div>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {t('segurosAlfa.settlement.nsrTitle', { defaultValue: 'Evaluación y liquidador NSR-10' })}
        </h3>
        <ChecklistEvaluacionSismicaNSR10
          formData={formDataNsr}
          onInputChange={handleNsrChange}
          modoLiquidador={false}
          habilitarUploadFotos={Boolean(casoId)}
          onUploadFotoFila={casoId ? handleUploadFotoFila : null}
          onRemoveFotoFila={casoId ? handleRemoveFotoFila : null}
        />
      </section>
    </div>
  );
}
