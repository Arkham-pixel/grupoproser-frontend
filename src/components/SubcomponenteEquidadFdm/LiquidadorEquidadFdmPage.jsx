import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import LiquidadorEquidadFdm from './LiquidadorEquidadFdm.jsx';
import { FdmPageHeader } from './EquidadFdmUiBlocks.jsx';
import {
  expressBtnGhost,
  expressBtnPrimary,
  expressCard,
  expressCardBody,
  expressPageWrap,
  expressScope,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { getCasoFdmById, guardarLiquidadorEnCasoFdm } from '../../services/equidadFdmService.js';
import { calcularLiquidacionFdm } from './liquidadorEquidadFdmHelpers.js';

const fdmRoot = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export default function LiquidadorEquidadFdmPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');

  const [casoFdm, setCasoFdm] = useState(location.state?.casoFdm ?? null);
  const [liquidadorState, setLiquidadorState] = useState(null);
  const [totalesState, setTotalesState] = useState(null);
  const [cargandoCaso, setCargandoCaso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const casoId = casoFdm?._id || casoIdFromQuery || null;

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (!casoIdFromQuery && location.state?.casoFdm) {
        setCasoFdm(location.state.casoFdm);
        return;
      }
      if (!casoIdFromQuery) return;
      setCargandoCaso(true);
      setError('');
      try {
        const caso = await getCasoFdmById(casoIdFromQuery);
        if (!cancelado) setCasoFdm(caso);
      } catch (err) {
        if (!cancelado) setError(err.message || 'No se pudo cargar el caso Equidad FDM.');
      } finally {
        if (!cancelado) setCargandoCaso(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [casoIdFromQuery, location.state]);

  const subtitulo = useMemo(() => {
    if (casoFdm?.nombre) {
      return `${casoFdm.nombre}${casoFdm.consecutivo ? ` · ${casoFdm.consecutivo}` : ''}${
        casoFdm.polizaAfectar ? ` · Póliza ${casoFdm.polizaAfectar}` : ''
      }`;
    }
    return 'Complete la liquidación o importe un Excel del modelo. Para guardar en el caso, ábralo desde el reporte.';
  }, [casoFdm]);

  const handleEstadoChange = (liq, tot) => {
    setLiquidadorState(liq);
    setTotalesState(tot);
  };

  const handleGuardarEnCaso = async () => {
    if (!casoId) {
      setError('Debe abrir el liquidador desde un caso FDM ya guardado (botón Liquidador del reporte).');
      return;
    }
    const liquidador = liquidadorState;
    const totales = totalesState || calcularLiquidacionFdm(liquidador || {});
    if (!liquidador) {
      setError('No hay datos del liquidador para guardar.');
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = await guardarLiquidadorEnCasoFdm({
        casoId,
        liquidador,
        totales,
        casoBase: casoFdm || {},
      });
      setCasoFdm(actualizado);
      setMensaje(
        'Liquidador guardado en el caso. Se actualizaron pérdida, deducible, total liquidado y valor indemnizado.'
      );
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo guardar el liquidador en el caso.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className={`${fdmRoot} ${expressScope}`}>
      <div className={expressPageWrap}>
        <FdmPageHeader
          title="Liquidador Equidad FDM"
          subtitle={subtitulo}
          activePath="/equidad-fdm/liquidador"
          actions={
            <div className="flex flex-wrap gap-2">
              {casoId && (
                <button
                  type="button"
                  className={expressBtnPrimary}
                  onClick={handleGuardarEnCaso}
                  disabled={guardando || cargandoCaso}
                >
                  <FaSave />
                  {guardando
                    ? 'Guardando…'
                    : casoFdm?.liquidador
                      ? 'Actualizar en caso'
                      : 'Guardar en caso'}
                </button>
              )}
              <Link to="/equidad-fdm/reporte" className={expressBtnGhost}>
                <FaArrowLeft />
                Volver al reporte
              </Link>
            </div>
          }
        />

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
        {mensaje && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
            {mensaje}
          </p>
        )}
        {!casoId && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            Modo maqueta: puede importar Excel y descargar Excel/Word, pero para guardar en el caso use el botón{' '}
            <strong>Liquidador</strong> desde el reporte.
          </p>
        )}

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="font-body text-sm text-gray-500">Cargando caso…</p>
            ) : (
              <LiquidadorEquidadFdm
                key={casoFdm?._id || 'nuevo'}
                casoFdm={casoFdm}
                onEstadoChange={handleEstadoChange}
                onGuardarEnCaso={casoId ? handleGuardarEnCaso : null}
                guardandoCaso={guardando}
                tieneLiquidadorGuardado={Boolean(casoFdm?.liquidador)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
