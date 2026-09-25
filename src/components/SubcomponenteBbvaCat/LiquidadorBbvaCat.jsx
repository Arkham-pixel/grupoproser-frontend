import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileExcel, FaFilePdf, FaFileWord } from 'react-icons/fa';
import {
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import {
  expressAlertError,
  expressFormSection,
} from '../SubcomponenteExpress/expressFenixUi.js';
import CotizacionPdfLiquidacion from '../liquidacion/CotizacionPdfLiquidacion.jsx';
import { serializarPaginasCotizacion } from '../liquidacion/cotizacionPdfLiquidacion.js';
import { bbvaCatArchivosApi } from './bbvaCatArchivosApi.js';
import {
  aplicarTipoLiquidadorEnLiquidacionBbvaCat,
  esObservacionFiniquitoDefaultBbvaCat,
  observacionesFiniquitoPorDefectoBbvaCat,
} from './deduciblesBbvaCat.js';
import FormatoLiquidacionBbvaCat from './FormatoLiquidacionBbvaCat.jsx';
import {
  contextoFechasBbvaCat,
  defaultDeducibleFormatoBbvaCat,
  nuevoItemDetalleBbvaCat,
  patchFilaDetalleBbvaCat,
  patchLiquidacionCotizacionPdfBbvaCat,
  resolverDetalleLiquidacionBbvaCat,
  sincronizarDetalleBbvaConPresupuestoNsr,
} from './formatoLiquidacionBbvaCat.js';
import LiquidacionCotizacionPdfBbvaCat from './LiquidacionCotizacionPdfBbvaCat.jsx';
import {
  calcularLiquidacionBbvaCat,
  mapcasoBbvaCatALiquidador,
  parsearNumero,
} from './liquidadorBbvaCatHelpers.js';
import { descargarFiniquitoBbvaCatWord } from './generarFiniquitoBbvaCatWord.js';
import {
  descargarLiquidadorBbvaCatExcel,
} from './generarLiquidadorBbvaCatExcel.js';
import {
  descargarLiquidadorBbvaCatPdf,
  generarLiquidadorBbvaCatPdfBlob,
} from './generarLiquidadorBbvaCatPdf.js';
import {
  esLiquidadorBbvaCatArchivado,
  reemplazarArchivosArchiveroBbvaCat,
} from './reemplazarArchivoArchiveroBbvaCat.js';

/**
 * Liquidador BBVA CAT = formato Excel LIQUIDACIÓN DE INDEMNIZACION
 * (deudores / leasing) con base de precios Valle del Cauca.
 */
export default function LiquidadorBbvaCat({
  casoBbvaCat = null,
  onGuardarEnCaso,
  guardandoCaso = false,
  onEstadoChange,
  onCasoChange,
  onInformePatch,
  origen = 'cat',
  liquidadorInicial = null,
}) {
  const { t } = useTranslation();
  const api = useMemo(() => bbvaCatArchivosApi(origen), [origen]);
  const [liquidador, setLiquidador] = useState(() =>
    liquidadorInicial || mapcasoBbvaCatALiquidador(casoBbvaCat || {})
  );
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [exportando, setExportando] = useState('');
  const [guardandoLocal, setGuardandoLocal] = useState(false);

  useEffect(() => {
    setLiquidador(liquidadorInicial || mapcasoBbvaCatALiquidador(casoBbvaCat || {}));
  }, [casoBbvaCat?._id]);

  // Arrastra valor asegurado del gestionar si el liquidador aún no tiene valor global.
  useEffect(() => {
    const vaCaso = parsearNumero(casoBbvaCat?.valorAseguradoInmueble);
    if (!(vaCaso > 0)) return;
    setLiquidador((prev) => {
      const enc = prev.encabezado || {};
      const tiene =
        parsearNumero(enc.valorGlobal) > 0 ||
        parsearNumero(enc.valorAseguradoInmueble) > 0 ||
        parsearNumero(prev.liquidacionCatastrofico?.valorAsegurado) > 0;
      if (tiene) return prev;
      return {
        ...prev,
        encabezado: {
          ...enc,
          valorGlobal: vaCaso,
          valorAseguradoInmueble: vaCaso,
        },
        liquidacionCatastrofico: {
          ...(prev.liquidacionCatastrofico || {}),
          valorAsegurado: vaCaso,
        },
      };
    });
  }, [casoBbvaCat?._id, casoBbvaCat?.valorAseguradoInmueble]);

  const totales = useMemo(() => calcularLiquidacionBbvaCat(liquidador), [liquidador]);
  const enc = liquidador.encabezado || {};

  useEffect(() => {
    onEstadoChange?.(liquidador, totales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liquidador, totales]);

  const itemsDetalle = useMemo(
    () => resolverDetalleLiquidacionBbvaCat(liquidador),
    [liquidador]
  );

  const actualizarEncabezado = (campo, valor) => {
    setLiquidador((prev) => {
      const next = {
        ...prev,
        encabezado: { ...(prev.encabezado || {}), [campo]: valor },
      };
      if (campo === 'valorAseguradoInmueble' || campo === 'valorGlobal') {
        const liq = prev.liquidacionCatastrofico || {};
        next.liquidacionCatastrofico = { ...liq, valorAsegurado: valor };
        next.encabezado.valorGlobal = valor;
        next.encabezado.valorAseguradoInmueble = valor;
      }
      if (campo === 'ramoAfectado') {
        next.deducibleFormato = defaultDeducibleFormatoBbvaCat(prev.tipoLiquidador, valor);
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
        deducibleFormato: defaultDeducibleFormatoBbvaCat(
          tipo,
          prev.encabezado?.ramoAfectado || prev.encabezado?.cobertura
        ),
        liquidacionCatastrofico: aplicarTipoLiquidadorEnLiquidacionBbvaCat(
          prev.liquidacionCatastrofico || {},
          tipo,
          { forzarDeducible: true }
        ),
      };
    });
  };

  const setDetalle = (filas) => {
    setLiquidador((prev) => sincronizarDetalleBbvaConPresupuestoNsr(prev, filas));
  };

  const materializarDetalle = () =>
    resolverDetalleLiquidacionBbvaCat(liquidador).map((it) => ({ ...it }));

  const handleItemChange = (index, patch = {}) => {
    const base = materializarDetalle();
    if (!base[index]) return;
    const ctx = contextoFechasBbvaCat(liquidador.encabezado || {}, casoBbvaCat || {});
    base[index] = patchFilaDetalleBbvaCat(base[index], patch, ctx);
    setDetalle(base);
  };

  const handleAddItem = () => {
    setDetalle([...materializarDetalle(), nuevoItemDetalleBbvaCat()]);
  };

  const handleRemoveItem = (index) => {
    const base = materializarDetalle();
    base.splice(index, 1);
    setDetalle(base);
  };

  const liquidadorExport = { ...liquidador, detalleLiquidacionCat: itemsDetalle };

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

  const quitarArchivosDelCaso = (ids = []) => {
    const borrar = new Set((ids || []).map((id) => String(id || '')).filter(Boolean));
    if (!borrar.size) return;
    onCasoChange?.((prev) => {
      if (!prev) return prev;
      const actuales = Array.isArray(prev.archivos) ? prev.archivos : [];
      return {
        ...prev,
        archivos: actuales.filter((a) => !borrar.has(String(a?._id || ''))),
      };
    });
  };

  const esArchivoLiquidadorViejo = esLiquidadorBbvaCatArchivado;

  const archivarLiquidadorBlob = async ({ blob, filename }) => {
    if (!blob || !filename || !casoBbvaCat?._id) return null;
    const mime =
      /\.pdf$/i.test(filename)
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const file = new File([blob], filename, { type: mime });

    let archivosActuales = Array.isArray(casoBbvaCat.archivos) ? casoBbvaCat.archivos : [];
    try {
      const fresco = await api.getById(casoBbvaCat._id);
      if (Array.isArray(fresco?.archivos)) {
        archivosActuales = fresco.archivos;
        onCasoChange?.(fresco);
      }
    } catch (err) {
      console.warn('No se pudo refrescar archivos antes de archivar liquidador:', err);
    }

    const creado = await reemplazarArchivosArchiveroBbvaCat({
      api,
      casoId: casoBbvaCat._id,
      archivosActuales,
      file,
      etiqueta: 'LIQUIDACION',
      origenCarga: 'ajustador',
      descripcion: 'Liquidador actualizado (reemplaza versión anterior)',
      coincide: esArchivoLiquidadorViejo,
      onAppend: appendArchivosAlCaso,
      onRemoveIds: quitarArchivosDelCaso,
    });

    try {
      const fresco = await api.getById(casoBbvaCat._id);
      if (fresco) onCasoChange?.(fresco);
    } catch {
      /* el archivo ya quedó subido */
    }
    return creado;
  };

  const handleCotizacionChange = (cotizacionPdf) => {
    setLiquidador((prev) => ({ ...prev, cotizacionPdf }));
    onInformePatch?.({
      fotosCotizacion: serializarPaginasCotizacion(cotizacionPdf?.paginas),
    });
  };

  const correrExport = async (tipo, fn) => {
    setError('');
    setMensaje('');
    setExportando(tipo);
    try {
      const resultado = await fn(liquidadorExport, calcularLiquidacionBbvaCat(liquidadorExport));
      if ((tipo === 'pdf' || tipo === 'excel') && resultado?.blob) {
        try {
          await archivarLiquidadorBlob(resultado);
          setMensaje(t('bbvaCat.settlement.exportSavedArchive'));
        } catch (errArchivo) {
          console.warn('No se pudo guardar el liquidador en el archivero BBVA:', errArchivo);
          setError(t('bbvaCat.settlement.exportArchiveError'));
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || t('bbvaCat.settlement.exportError'));
    } finally {
      setExportando('');
    }
  };

  const handleGuardarYArchivar = async () => {
    if (!onGuardarEnCaso) return;
    setError('');
    setMensaje('');
    setGuardandoLocal(true);
    try {
      await onGuardarEnCaso(liquidadorExport, totales);
      if (casoBbvaCat?._id) {
        try {
          const pdfBlob = await generarLiquidadorBbvaCatPdfBlob(
            liquidadorExport,
            calcularLiquidacionBbvaCat(liquidadorExport)
          );
          const enc = liquidadorExport?.encabezado || {};
          const safe = String(enc.siniestro || enc.consecutivo || 'BBVA')
            .replace(/[^\w.-]+/g, '_')
            .slice(0, 40);
          await archivarLiquidadorBlob({
            blob: pdfBlob,
            filename: `Liquidador_BBVA_CAT_${safe}.pdf`,
          });
          setMensaje(t('bbvaCat.settlement.savedAndArchived'));
        } catch (errArchivo) {
          console.warn('Liquidador guardado, pero no se actualizó el archivero:', errArchivo);
          setMensaje(t('bbvaCat.settlement.savedMessage'));
          setError(t('bbvaCat.settlement.exportArchiveError'));
        }
      } else {
        setMensaje(t('bbvaCat.settlement.savedMessage'));
      }
    } catch (err) {
      console.error(err);
      setError(err.message || t('bbvaCat.settlement.saveError'));
    } finally {
      setGuardandoLocal(false);
    }
  };

  const ocupado = guardandoCaso || guardandoLocal || !!exportando;

  return (
    <div className="space-y-5">
      <p className="rounded-md border border-[#004481]/15 bg-sky-50/70 px-3 py-2 font-body text-xs leading-relaxed text-[#004481] dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200">
        {t('bbvaCat.settlement.archiveHint')}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={expressBtnSecondary}
            disabled={ocupado}
            onClick={() => correrExport('excel', descargarLiquidadorBbvaCatExcel)}
          >
            <FaFileExcel /> Excel
          </button>
          <button
            type="button"
            className={expressBtnSecondary}
            disabled={ocupado}
            onClick={() => correrExport('pdf', descargarLiquidadorBbvaCatPdf)}
          >
            <FaFilePdf /> PDF
          </button>
          <button
            type="button"
            className={expressBtnGhost}
            disabled={ocupado}
            onClick={() => correrExport('finiquito', descargarFiniquitoBbvaCatWord)}
          >
            <FaFileWord /> {t('bbvaCat.settlement.downloadFiniquito')}
          </button>
        </div>
        {onGuardarEnCaso && (
          <button
            type="button"
            className={expressBtnPrimary}
            disabled={ocupado}
            onClick={handleGuardarYArchivar}
          >
            {ocupado && (guardandoCaso || guardandoLocal)
              ? t('bbvaCat.settlement.savingArchive')
              : t('bbvaCat.settlement.saveToCase')}
          </button>
        )}
      </div>

      {error && <p className={expressAlertError}>{error}</p>}
      {mensaje && !error ? (
        <p className="font-body text-sm text-emerald-700 dark:text-emerald-300">{mensaje}</p>
      ) : null}

      <section className={expressFormSection}>
        <CotizacionPdfLiquidacion
          i18nPrefix="bbvaCat.settlement"
          value={liquidador.cotizacionPdf}
          onChange={handleCotizacionChange}
          casoId={casoBbvaCat?._id}
          api={api}
          archivosCaso={casoBbvaCat?.archivos || []}
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
          mostrarUsarComoBase={false}
          usarComoBasePorDefecto={false}
        />
        <LiquidacionCotizacionPdfBbvaCat
          liquidador={liquidador}
          caso={casoBbvaCat || {}}
          disabled={!!exportando || guardandoCaso}
          onDeducibleChange={(dedPatch) =>
            setLiquidador((prev) =>
              patchLiquidacionCotizacionPdfBbvaCat(prev, { deducibleFormato: dedPatch })
            )
          }
          onAiuChange={(aiuPorcentaje) =>
            setLiquidador((prev) => patchLiquidacionCotizacionPdfBbvaCat(prev, { aiuPorcentaje }))
          }
          onValorGlobalChange={(valor) => actualizarEncabezado('valorGlobal', valor)}
        />
      </section>

      <FormatoLiquidacionBbvaCat
        caso={casoBbvaCat || {}}
        encabezado={enc}
        liquidador={liquidador}
        itemsDetalle={itemsDetalle}
        onEncabezadoChange={actualizarEncabezado}
        onTipoLiquidadorChange={actualizarTipoLiquidador}
        onDeducibleFormatoChange={(patch) =>
          setLiquidador((prev) => ({
            ...prev,
            deducibleFormato: { ...(prev.deducibleFormato || {}), ...patch },
          }))
        }
        onItemChange={handleItemChange}
        onAddItem={handleAddItem}
        onRemoveItem={handleRemoveItem}
        onLiquidadoPorChange={(v) => setLiquidador((prev) => ({ ...prev, liquidadoPor: v }))}
        onAreaLiquidadorChange={(v) => setLiquidador((prev) => ({ ...prev, areaLiquidador: v }))}
        onObservacionesChange={(v) =>
          setLiquidador((prev) => ({ ...prev, observacionesFiniquito: v }))
        }
        onAceptacionChange={(v) =>
          setLiquidador((prev) => ({ ...prev, aceptacionIndemnizacion: v }))
        }
        onDatosFiniquitoChange={(campo, valor) =>
          setLiquidador((prev) => ({
            ...prev,
            datosFiniquito: { ...(prev.datosFiniquito || {}), [campo]: valor },
          }))
        }
        onFirmaClienteChange={(v) => setLiquidador((prev) => ({ ...prev, firmaCliente: v }))}
        onNombreFirmanteChange={(v) => setLiquidador((prev) => ({ ...prev, nombreFirmante: v }))}
        onAiuChange={(aiuPorcentaje) => setLiquidador((prev) => ({ ...prev, aiuPorcentaje }))}
        onOtrosAmparosChange={(filas) =>
          setLiquidador((prev) => ({
            ...prev,
            otrosAmparos: filas,
          }))
        }
      />
    </div>
  );
}
