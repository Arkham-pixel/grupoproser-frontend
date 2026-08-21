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
import { patchDeducibleDesdeTomadorAlfa } from './tomadoresAlfaCatalogo.js';
import { fusionarLiquidadorSinPerderPresupuestoNsr } from '../SubcomponenteEvaluacionSismicaNSR10/protegerPresupuestoNsr10.js';
import { descargarFiniquitoAlfaWord } from './generarFiniquitoAlfaWord.js';
import {
  descargarInformeCatAlfaExcel,
  generarInformeCatAlfaExcelBlob,
} from './generarInformeCatAlfaExcel.js';
import {
  archivarBlobEnCasoAlfa,
  MIME_ARCHIVO_ALFA,
} from './archivarDocumentoAlfa.js';
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
  onArchivoArchivado,
  liquidadorInicial = null,
} = {}) {
  const { t } = useTranslation();
  const [liquidador, setLiquidador] = useState(() =>
    fusionarLiquidadorSinPerderPresupuestoNsr(
      liquidadorInicial || mapCasoAlfaALiquidador(casoAlfa || {}),
      mapCasoAlfaALiquidador(casoAlfa || {})
    )
  );
  const [casoLocal, setCasoLocal] = useState(() => ({ ...(casoAlfa || {}) }));
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [exportando, setExportando] = useState('');
  const casoId = casoAlfa?._id ? String(casoAlfa._id) : '';

  useEffect(() => {
    const desdeCaso = mapCasoAlfaALiquidador(casoAlfa || {});
    // Preferir el más completo: evita que un liquidadorInicial vacío tape el del servidor
    setLiquidador(
      fusionarLiquidadorSinPerderPresupuestoNsr(liquidadorInicial || desdeCaso, desdeCaso)
    );
    setCasoLocal({ ...(casoAlfa || {}) });
    // Solo al cambiar de caso (el remount del workspace ya trae liquidadorInicial hidratado)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (campo === 'tomador') {
      setCasoLocal((c) => ({ ...c, tomador: valor }));
      onCasoChange?.((casoPrev) => (casoPrev ? { ...casoPrev, tomador: valor } : casoPrev));
    }
    setLiquidador((prev) => {
      const next = {
        ...prev,
        encabezado: { ...(prev.encabezado || {}), [campo]: valor },
      };
      if (campo === 'valorAseguradoInmueble') {
        const liq = prev.liquidacionCatastrofico || {};
        next.liquidacionCatastrofico = {
          ...liq,
          valorAsegurado: valor,
        };
      }
      if (campo === 'tomador') {
        const liq = prev.liquidacionCatastrofico || {};
        const cfgActual = liq.deducibleConfigPresupuesto || liq.deducibleConfig || {};
        const cfg = patchDeducibleDesdeTomadorAlfa(valor, cfgActual);
        next.liquidacionCatastrofico = {
          ...liq,
          deducibleConfig: cfg,
          deducibleConfigPresupuesto: cfg,
          deducible: cfg.texto,
        };
      }
      return next;
    });
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

  const MIME = MIME_ARCHIVO_ALFA;

  const appendArchivoAlCaso = (creado) => {
    if (!creado || !onCasoChange) return;
    onCasoChange((prev) => {
      if (!prev) return prev;
      const list = Array.isArray(prev.archivos) ? prev.archivos : [];
      const id = creado?._id ? String(creado._id) : null;
      if (id) {
        const idx = list.findIndex((a) => String(a._id) === id);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = { ...list[idx], ...creado };
          return { ...prev, archivos: next };
        }
      }
      // Tras replace, el backend puede haber limpiado duplicados del mismo slot
      const et = String(creado.etiqueta || '').toUpperCase();
      const ext = String(creado.nombreOriginal || '')
        .toLowerCase()
        .match(/\.([a-z0-9]+)$/)?.[1];
      let filtered = list;
      if (creado.replaced && et && ext) {
        filtered = list.filter((a) => {
          if (String(a._id) === id) return true;
          if (String(a.etiqueta || '').toUpperCase() !== et) return true;
          const aExt = String(a.nombreOriginal || a.nombreArchivo || '')
            .toLowerCase()
            .match(/\.([a-z0-9]+)$/)?.[1];
          return aExt !== ext;
        });
      }
      return { ...prev, archivos: [...filtered, creado] };
    });
  };

  const copiarAlArchivero = async (blob, nombre, mime, etiqueta = 'LIQUIDACION') => {
    if (!casoId) {
      throw new Error(
        t('segurosAlfa.settlement.archiveNeedsCase', {
          defaultValue: 'Guarde el caso antes de copiar al archivero.',
        })
      );
    }
    const creado = await archivarBlobEnCasoAlfa({
      casoId,
      blob,
      nombre,
      mime,
      etiqueta,
    });
    appendArchivoAlCaso(creado);
    if (typeof onArchivoArchivado === 'function') onArchivoArchivado(creado);
    return creado;
  };

  const mensajeArchivado = (creado) =>
    creado?.replaced
      ? t('segurosAlfa.archive.sharepoint.replacedOk', {
          defaultValue:
            'Documento actualizado en el archivero (sobrescrito). En cola hacia SharePoint.',
        })
      : t('segurosAlfa.archive.sharepoint.queuedOk', {
          defaultValue:
            'Guardado en ARNALD. En cola hacia SharePoint (SINIESTROS).',
        });

  const handleGuardar = async () => {
    if (!onGuardarEnCaso) return;
    setError('');
    setMensaje('');
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
      // El workspace archiva el Excel CAT tras guardar (cola SharePoint)
      await onGuardarEnCaso(conDetalle, totales);
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosAlfa.settlement.saveError'));
    }
  };

  /** Genera Excel CAT y lo deja en archivero (cola SharePoint). */
  const archivarExcelCatAlfa = async ({ descargar = false } = {}) => {
    const opts = {
      caso: { ...(casoAlfa || {}), ...casoLocal },
      liquidador: { ...liquidador, detalleLiquidacionCat: itemsDetalle },
      totales,
      informe: casoAlfa?.informeUnico || null,
    };
    const resultado = descargar
      ? await descargarInformeCatAlfaExcel(opts)
      : await generarInformeCatAlfaExcelBlob(opts);
    return copiarAlArchivero(
      resultado?.blob,
      resultado?.filename || resultado?.nombre,
      MIME.xlsx,
      'LIQUIDACION'
    );
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
          const creado = await copiarAlArchivero(blob, nombre, mime, 'LIQUIDACION');
          setMensaje(mensajeArchivado(creado));
        } catch (errArchivo) {
          console.error('No se pudo guardar en el archivero:', errArchivo);
          setError(
            errArchivo?.message ||
              t('segurosAlfa.settlement.archiveError', {
                defaultValue: 'No se pudo guardar en el archivero.',
              })
          );
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
      const creado = await archivarExcelCatAlfa({ descargar: true });
      setMensaje(mensajeArchivado(creado));
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
