import React, { useEffect, useMemo, useState } from 'react';
import { FaCheckCircle, FaFileInvoiceDollar } from 'react-icons/fa';
import {
  Campo,
  InputFenix,
  SelectFenix,
} from '../SubcomponenteCompex/FacturacionHelpers.jsx';
import {
  complexBtnPrimary,
  complexBtnSecondary,
  complexInfoPanel,
} from '../SubcomponenteCompex/complexFenixUi.js';
import {
  buscarRangoZurichPorId,
  construirPaqueteFacturacionZurich,
  formatearCopZurich,
  opcionesTarifaZurich,
  parsearValorLiquidadoZurich,
  resolverTarifaHonorariosZurich,
} from '../SubcomponenteCompex/controlHoras/tarifaHonorariosZurich.js';

function textoOGuion(valor) {
  const t = String(valor ?? '').trim();
  return t || '—';
}

/**
 * Zurich factura por tarifa (no control de horas).
 * Lista de precios por valor liquidado → un paquete a facturar / notificar.
 */
export default function TarifaZurichFacturacion({
  form = {},
  initialData = null,
  onAplicarPaquete,
  guardando = false,
}) {
  const valorLiquidado = form.valorLiquidado;
  const tarifaSugerida = useMemo(
    () => resolverTarifaHonorariosZurich(valorLiquidado),
    [valorLiquidado]
  );

  const [rangoId, setRangoId] = useState(
    () => form.paquete_facturacion?.rangoId || form.tarifa_rango_id || tarifaSugerida.rangoId || ''
  );

  useEffect(() => {
    const guardado = form.paquete_facturacion?.rangoId || form.tarifa_rango_id;
    if (guardado) {
      const rango = buscarRangoZurichPorId(guardado);
      const vl = parsearValorLiquidadoZurich(valorLiquidado);
      if (rango?.modo === 'porcentaje' && (vl == null || vl <= 0) && tarifaSugerida.rangoId) {
        setRangoId(tarifaSugerida.rangoId);
        return;
      }
      setRangoId(guardado);
      return;
    }
    if (tarifaSugerida.rangoId) setRangoId(tarifaSugerida.rangoId);
  }, [
    form.paquete_facturacion?.rangoId,
    form.tarifa_rango_id,
    tarifaSugerida.rangoId,
    valorLiquidado,
  ]);

  const tarifaElegida = useMemo(
    () => resolverTarifaHonorariosZurich(valorLiquidado, rangoId || null),
    [valorLiquidado, rangoId]
  );

  const opciones = useMemo(() => opcionesTarifaZurich(), []);
  const paqueteActual = form.paquete_facturacion;
  const rangoActual = buscarRangoZurichPorId(rangoId);

  const aplicar = async () => {
    if (!tarifaElegida?.rangoId) {
      alert('Seleccione un rango de la lista de precios Zurich.');
      return;
    }
    if (rangoActual?.modo === 'porcentaje') {
      const vl = parsearValorLiquidadoZurich(valorLiquidado);
      if (vl == null || vl <= 0) {
        alert(
          'El rango del 1,5% necesita el valor liquidado (ajuste bruto) del caso. Complételo en datos del caso.'
        );
        return;
      }
    }
    if (tarifaElegida.honorarios == null || tarifaElegida.honorarios < 0) {
      alert('No se pudo calcular el honorario de la tarifa seleccionada.');
      return;
    }
    const paquete = construirPaqueteFacturacionZurich({
      valorLiquidado,
      tarifa: tarifaElegida,
    });
    if (!paquete || !onAplicarPaquete) return;
    await onAplicarPaquete(paquete);
  };

  return (
    <div className="space-y-4">
      <div className={complexInfoPanel}>
        <p className="mb-3 flex items-center gap-2 font-body text-base font-semibold text-gray-800 dark:text-gray-100">
          <FaFileInvoiceDollar className="text-fenix-primario" />
          Zurich — facturación por tarifa (no control de horas)
        </p>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          Elija el rango según valor liquidado. Los honorarios fijos o el 1,5% del ajuste bruto
          quedan como el paquete a facturar y notificar.
        </p>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <span className="text-xs uppercase tracking-wide text-gray-500">ZC</span>
            <p className="font-medium">{textoOGuion(form.zc || initialData?.zc)}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-gray-500">Siniestro</span>
            <p className="font-medium">{textoOGuion(form.siniestro)}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-gray-500">Póliza</span>
            <p className="font-medium">{textoOGuion(form.numeroPoliza)}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-gray-500">Tipo de póliza</span>
            <p className="font-medium">{textoOGuion(form.tipoPoliza)}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-gray-500">Asegurado</span>
            <p className="font-medium">{textoOGuion(form.asegurado)}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-gray-500">Estado</span>
            <p className="font-medium">{textoOGuion(form.estado)}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-gray-500">Valor liquidado</span>
            <p className="text-lg font-semibold text-fenix-primario">
              {formatearCopZurich(tarifaSugerida.valorLiquidado)}
            </p>
          </div>
          <div className="sm:col-span-2">
            <span className="text-xs uppercase tracking-wide text-gray-500">Tarifa sugerida</span>
            <p className="font-medium">{tarifaSugerida.label || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Campo label="Lista de precios (tarifa)">
            <SelectFenix value={rangoId} onChange={(e) => setRangoId(e.target.value)}>
              <option value="">Seleccione un rango…</option>
              {opciones.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.label}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <Campo label="Honorarios del paquete">
            <InputFenix
              type="text"
              readOnly
              value={
                tarifaElegida.honorarios != null
                  ? formatearCopZurich(tarifaElegida.honorarios)
                  : ''
              }
            />
          </Campo>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={complexBtnPrimary}
            style={{ width: 'auto' }}
            disabled={guardando || !tarifaElegida.rangoId}
            onClick={aplicar}
          >
            <FaCheckCircle />
            {guardando ? 'Guardando…' : 'Aplicar paquete a facturar'}
          </button>
          {tarifaSugerida.rangoId && rangoId !== tarifaSugerida.rangoId && (
            <button
              type="button"
              className={complexBtnSecondary}
              onClick={() => setRangoId(tarifaSugerida.rangoId)}
            >
              Usar rango sugerido por valor liquidado
            </button>
          )}
        </div>
      </div>

      {paqueteActual?.honorarios != null && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100">
          <strong>Paquete listo:</strong> {formatearCopZurich(paqueteActual.honorarios)}
          {paqueteActual.rangoLabel ? ` · ${paqueteActual.rangoLabel}` : ''}
          {paqueteActual.fecha ? ` · ${paqueteActual.fecha}` : ''}
        </div>
      )}
    </div>
  );
}
