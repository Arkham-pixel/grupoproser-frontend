import React, { startTransition, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileExcel, FaFileWord } from 'react-icons/fa';
import {
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  expressAlertError,
  expressAlertSuccess,
} from '../SubcomponenteExpress/expressFenixUi.js';
import FormatoLiquidacionAlfa from './FormatoLiquidacionAlfa.jsx';
import {
  calcularLiquidacionAlfa,
  mapCasoAlfaALiquidador,
  nuevoItemDetalleLiquidacionCat,
  recalcularTotalesFilaDetalleCat,
  resolverDetalleLiquidacionCat,
  sincronizarDetalleCatConPresupuestoNsr,
  SMMLV_POR_ANIO,
} from './liquidadorAlfaHelpers.js';
import { descargarFiniquitoAlfaWord } from './generarFiniquitoAlfaWord.js';
import { descargarInformeCatAlfaExcel } from './generarInformeCatAlfaExcel.js';
import { subirArchivoAlfa } from '../../services/segurosAlfaService.js';
import {
  aplicarCatalogoAFilaPresupuesto,
  formatMilesNsr10,
} from '../SubcomponenteEvaluacionSismicaNSR10/catalogoEvaluacionSismicaNSR10.js';
import { buscarItemBasePrecios } from '../SubcomponenteEvaluacionSismicaNSR10/basePreciosPresupuesto.js';

/**
 * Liquidador Alfa = FORMATO LIQUIDACIÓN (Excel CAT).
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
  const [casoLocal, setCasoLocal] = useState(() => ({ ...(casoAlfa || {}) }));
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [exportando, setExportando] = useState('');
  const casoId = casoAlfa?._id ? String(casoAlfa._id) : '';

  useEffect(() => {
    setLiquidador(mapCasoAlfaALiquidador(casoAlfa || {}));
    setCasoLocal({ ...(casoAlfa || {}) });
  }, [casoAlfa?._id]);

  const totales = useMemo(() => calcularLiquidacionAlfa(liquidador), [liquidador]);
  const enc = liquidador.encabezado || {};
  const itemsDetalle = useMemo(
    () => resolverDetalleLiquidacionCat(liquidador, totales),
    [liquidador, totales]
  );

  useEffect(() => {
    onEstadoChange?.(liquidador, totales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liquidador, totales]);

  const actualizarEncabezado = (campo, valor) => {
    setLiquidador((prev) => ({
      ...prev,
      encabezado: { ...(prev.encabezado || {}), [campo]: valor },
    }));
  };

  const actualizarCasoCampo = (campo, valor) => {
    setCasoLocal((prev) => ({ ...prev, [campo]: valor }));
    onCasoChange?.((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  };

  const actualizarDeducible = (campoOPatch, valor) => {
    setLiquidador((prev) => {
      const liq = prev.liquidacionCatastrofico || {};
      const patch =
        campoOPatch && typeof campoOPatch === 'object'
          ? { ...campoOPatch }
          : { [campoOPatch]: valor };
      if (patch.anioSMMLV != null && patch.valorSMMLV == null) {
        const anioSel = Number(patch.anioSMMLV);
        const vSmmlv = SMMLV_POR_ANIO[anioSel];
        if (vSmmlv != null) {
          patch.valorSMMLV = vSmmlv;
          patch.valorSMDLV = Math.round(vSmmlv / 30);
        }
      }
      const cfg = {
        ...(liq.deducibleConfigPresupuesto || liq.deducibleConfig || {}),
        ...patch,
        aplica: true,
      };
      return {
        ...prev,
        liquidacionCatastrofico: {
          ...liq,
          deducibleConfig: cfg,
          deducibleConfigPresupuesto: cfg,
          valorAsegurado:
            Object.prototype.hasOwnProperty.call(patch, 'valorAsegurado')
              ? patch.valorAsegurado
              : liq.valorAsegurado ?? prev.encabezado?.valorAseguradoInmueble,
        },
      };
    });
  };

  const actualizarAiu = (aiuPorcentaje) => {
    setLiquidador((prev) => {
      const evalData = prev.evaluacionSismicaNSR10 || {};
      const presupuesto = evalData.presupuesto || {};
      return {
        ...prev,
        modelo: 'nsr10',
        evaluacionSismicaNSR10: {
          ...evalData,
          presupuesto: {
            ...presupuesto,
            aiuPorcentaje:
              Number.isFinite(Number(aiuPorcentaje)) ? Number(aiuPorcentaje) : 0.05,
          },
        },
      };
    });
  };

  const setDetalle = (filas) => {
    setLiquidador((prev) => sincronizarDetalleCatConPresupuestoNsr(prev, filas));
  };

  const materializarDetalle = () =>
    resolverDetalleLiquidacionCat(liquidador, totales).map((it) => ({ ...it }));

  const handleItemChange = (index, patch = {}) => {
    const base = materializarDetalle();
    if (!base[index]) return;
    const next = { ...base[index], ...patch };
    const tocaronCantVu = Object.prototype.hasOwnProperty.call(patch, 'cantidad')
      || Object.prototype.hasOwnProperty.call(patch, 'valorUnitario');
    if (tocaronCantVu || !Object.prototype.hasOwnProperty.call(patch, 'valorPerdida')) {
      base[index] = recalcularTotalesFilaDetalleCat(next);
    } else {
      base[index] = {
        ...next,
        valorReal: next.valorReal === '' || next.valorReal == null ? next.valorPerdida : next.valorReal,
      };
    }
    setDetalle(base);
  };

  const handleCatalogoItem = (index, catalogoId) => {
    const base = materializarDetalle();
    if (!base[index]) return;
    if (catalogoId === '__custom__') {
      base[index] = {
        ...base[index],
        catalogoId: '',
      };
      setDetalle(base);
      return;
    }
    const hit = buscarItemBasePrecios(catalogoId);
    const aplicado = aplicarCatalogoAFilaPresupuesto(
      {
        catalogoId: base[index].catalogoId,
        capitulo: base[index].capitulo,
        actividad: base[index].descripcion,
        unidad: base[index].unidad,
        valorUnitario: base[index].valorUnitario,
      },
      hit
    );
    base[index] = recalcularTotalesFilaDetalleCat({
      ...base[index],
      catalogoId: aplicado.catalogoId || '',
      capitulo: aplicado.capitulo || base[index].capitulo || hit?.capitulo || '',
      descripcion: aplicado.actividad || '',
      unidad: aplicado.unidad || 'und',
      valorUnitario:
        aplicado.valorUnitario != null && aplicado.valorUnitario !== ''
          ? aplicado.valorUnitario
          : hit?.valorUnitario != null
            ? formatMilesNsr10(hit.valorUnitario)
            : '',
      cantidad: base[index].cantidad === '' || base[index].cantidad == null ? 1 : base[index].cantidad,
    });
    setDetalle(base);
  };

  const handleAddItem = () => {
    const base = materializarDetalle();
    setDetalle([...base, nuevoItemDetalleLiquidacionCat()]);
  };

  const handleRemoveItem = (index) => {
    const base = materializarDetalle();
    base.splice(index, 1);
    setDetalle(base);
  };

  const MIME = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };

  const appendArchivoAlCaso = (creado) => {
    if (!creado || !onCasoChange) return;
    onCasoChange((prev) => {
      if (!prev) return prev;
      const list = Array.isArray(prev.archivos) ? prev.archivos : [];
      return { ...prev, archivos: [...list, creado] };
    });
  };

  const copiarAlArchivero = async (blob, nombre, mime) => {
    if (!casoId) {
      setMensaje(t('segurosAlfa.settlement.archiveNeedsCase'));
      return;
    }
    if (!blob || !nombre) return;
    const file = new File([blob], nombre, { type: mime });
    const creado = await subirArchivoAlfa(casoId, file, 'LIQUIDACION');
    appendArchivoAlCaso(creado);
    setMensaje(t('segurosAlfa.settlement.archiveSaved'));
  };

  const handleGuardar = async () => {
    if (!onGuardarEnCaso) return;
    setError('');
    try {
      const conDetalle = {
        ...liquidador,
        detalleLiquidacionCat: itemsDetalle,
        encabezado: {
          ...enc,
          valorAseguradoInmueble:
            enc.valorAseguradoInmueble ?? liquidador.liquidacionCatastrofico?.valorAsegurado,
        },
        liquidacionCatastrofico: {
          ...(liquidador.liquidacionCatastrofico || {}),
          valorAsegurado:
            liquidador.liquidacionCatastrofico?.valorAsegurado ?? enc.valorAseguradoInmueble,
        },
      };
      await onGuardarEnCaso(conDetalle, totales);
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosAlfa.settlement.saveError'));
    }
  };

  const correrExport = async (tipo, fn, mime) => {
    setError('');
    setMensaje('');
    setExportando(tipo);
    try {
      const resultado = await fn(
        { ...liquidador, detalleLiquidacionCat: itemsDetalle },
        totales
      );
      const blob = resultado?.blob;
      const nombre = resultado?.nombre || resultado?.filename;
      if (blob && nombre) {
        try {
          await copiarAlArchivero(blob, nombre, mime);
        } catch (errArchivo) {
          console.warn('No se pudo guardar en el archivero:', errArchivo);
          setError(t('segurosAlfa.settlement.archiveError'));
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosAlfa.settlement.exportError'));
    } finally {
      setExportando('');
    }
  };

  const exportarExcelCat = async () => {
    setError('');
    setMensaje('');
    setExportando('excel');
    try {
      const resultado = await descargarInformeCatAlfaExcel({
        caso: { ...(casoAlfa || {}), ...casoLocal },
        liquidador: { ...liquidador, detalleLiquidacionCat: itemsDetalle },
        totales,
        informe: casoAlfa?.informeUnico || null,
      });
      try {
        await copiarAlArchivero(
          resultado?.blob,
          resultado?.filename || resultado?.nombre,
          MIME.xlsx
        );
      } catch (errArchivo) {
        console.warn('No se pudo guardar el Excel CAT en el archivero:', errArchivo);
        setError(t('segurosAlfa.settlement.archiveError'));
      }
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
            onClick={exportarExcelCat}
            title="Informe CAT Alfa (Liquidador + Análisis + anexos)"
          >
            <FaFileExcel /> Excel CAT
          </button>
          <button
            type="button"
            className={expressBtnGhost}
            disabled={!!exportando}
            onClick={() => correrExport('finiquito', descargarFiniquitoAlfaWord, MIME.docx)}
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

      {mensaje && <p className={expressAlertSuccess}>{mensaje}</p>}
      {error && <p className={expressAlertError}>{error}</p>}

      <FormatoLiquidacionAlfa
        caso={casoLocal}
        encabezado={enc}
        liquidacionCatastrofico={liquidador.liquidacionCatastrofico || {}}
        itemsDetalle={itemsDetalle}
        totales={totales}
        observaciones={liquidador.observaciones || ''}
        liquidadoPor={enc.ajustador || casoLocal.ajustador || ''}
        datosBancarios={liquidador.datosBancarios || {}}
        aiuPorcentaje={
          liquidador.evaluacionSismicaNSR10?.presupuesto?.aiuPorcentaje ?? 0.05
        }
        aceptacionIndemnizacion={liquidador.aceptacionIndemnizacion || ''}
        firmaCliente={liquidador.firmaCliente || ''}
        nombreFirmante={
          liquidador.nombreFirmante ||
          enc.asegurado ||
          enc.tomador ||
          casoLocal.asegurado ||
          casoLocal.tomador ||
          ''
        }
        onEncabezadoChange={actualizarEncabezado}
        onCasoCampoChange={actualizarCasoCampo}
        onDeducibleChange={actualizarDeducible}
        onAiuChange={actualizarAiu}
        onItemChange={handleItemChange}
        onCatalogoItem={handleCatalogoItem}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        onObservacionesChange={(v) =>
          setLiquidador((prev) => ({ ...prev, observaciones: v }))
        }
        onLiquidadoPorChange={(v) => actualizarEncabezado('ajustador', v)}
        onDatosBancariosChange={(campo, valor) =>
          setLiquidador((prev) => ({
            ...prev,
            datosBancarios: {
              ...(prev.datosBancarios || {}),
              [campo]: valor,
            },
          }))
        }
        onAceptacionChange={(v) =>
          setLiquidador((prev) => ({ ...prev, aceptacionIndemnizacion: v }))
        }
        onFirmaClienteChange={(v) => {
          // Transición: el data URL no debe bloquear el hilo al firmar
          startTransition(() => {
            setLiquidador((prev) => ({ ...prev, firmaCliente: v }));
          });
        }}
        onNombreFirmanteChange={(v) =>
          setLiquidador((prev) => ({ ...prev, nombreFirmante: v }))
        }
      />
    </div>
  );
}
