import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileExcel, FaFilePdf, FaFileWord } from 'react-icons/fa';
import {
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
} from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { expressAlertError } from '../SubcomponenteExpress/expressFenixUi.js';
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
  resolverDetalleLiquidacionBbvaCat,
  sincronizarDetalleBbvaConPresupuestoNsr,
} from './formatoLiquidacionBbvaCat.js';
import {
  calcularLiquidacionBbvaCat,
  mapcasoBbvaCatALiquidador,
} from './liquidadorBbvaCatHelpers.js';
import { descargarFiniquitoBbvaCatWord } from './generarFiniquitoBbvaCatWord.js';
import { descargarLiquidadorBbvaCatExcel } from './generarLiquidadorBbvaCatExcel.js';
import { descargarLiquidadorBbvaCatPdf } from './generarLiquidadorBbvaCatPdf.js';

/**
 * Liquidador BBVA CAT = formato Excel LIQUIDACIÓN DE INDEMNIZACION
 * (deudores / leasing) con base de precios Valle del Cauca.
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

  const correrExport = async (tipo, fn) => {
    setError('');
    setExportando(tipo);
    try {
      await fn(liquidadorExport, calcularLiquidacionBbvaCat(liquidadorExport));
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
            onClick={() => onGuardarEnCaso(liquidadorExport, totales)}
          >
            {guardandoCaso
              ? t('bbvaCat.settlement.saving')
              : t('bbvaCat.settlement.saveToCase')}
          </button>
        )}
      </div>

      {error && <p className={expressAlertError}>{error}</p>}

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
      />
    </div>
  );
}
