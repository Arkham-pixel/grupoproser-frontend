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
import {
  sincronizarFotosNsrEnInformeCaso,
  subirFotoFilaNsrSura,
} from './syncFotosNsrAlInformeSura.js';

const grid3 = 'grid grid-cols-1 gap-4 sm:grid-cols-3';

/**
 * Liquidador Sura = evaluación NSR-10 completa (portada / eval / dictamen / presupuesto)
 * + diagrama de liquidación, mismo motor que Catastrófico Complex.
 */
export default function LiquidadorSegurosSura({
  casoSura = null,
  onGuardarEnCaso,
  guardandoCaso = false,
  onEstadoChange,
  onCasoChange,
}) {
  const { t } = useTranslation();
  const [liquidador, setLiquidador] = useState(() => mapCasoSuraALiquidador(casoSura || {}));
  const [error, setError] = useState('');
  const [exportando, setExportando] = useState('');
  const casoId = casoSura?._id ? String(casoSura._id) : '';

  useEffect(() => {
    setLiquidador(mapCasoSuraALiquidador(casoSura || {}));
  }, [casoSura?._id]);

  const totales = useMemo(() => calcularLiquidacionSura(liquidador), [liquidador]);
  const enc = liquidador.encabezado || {};

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
      casoBase: casoSura || {},
      itemsNsr: items,
    });
    if (actualizado) onCasoChange?.(actualizado);
  };

  const handleUploadFotoFila = async (index, file, item) => {
    const patch = await subirFotoFilaNsrSura({ casoId, file, item });
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
            <span>{t('segurosSura.settlement.totalPay')}</span>
            <span>$ {formatearMonto(totales.totalIndemnizar)}</span>
          </div>
        </div>
      </section>

      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>
          {t('segurosSura.settlement.nsrTitle', { defaultValue: 'Evaluación y liquidador NSR-10' })}
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
