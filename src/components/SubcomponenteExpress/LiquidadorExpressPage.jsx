import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import LiquidadorExpress from './LiquidadorExpress.jsx';
import { ExpressPageHeader } from './ExpressUiBlocks.jsx';
import {
  expressBtnGhost,
  expressBtnPrimary,
  expressCard,
  expressCardBody,
  expressPageWrap,
  expressScope,
} from './expressFenixUi.js';
import {
  getSiniestroExpressById,
  guardarLiquidadorEnCasoExpress,
} from '../../services/expressService.js';
import { calcularLiquidacion } from './liquidadorExpressHelpers.js';
import { generarReciboIndemnizacionBlob } from './generarReciboIndemnizacionWord.js';
import { generarLiquidadorExpressExcelBlob } from './generarLiquidadorExpressExcel.js';
import {
  generarChecklistExpressBlob,
  generarSalvamentoExpressBlob,
} from './generarFormatosExpressWord.js';

export default function LiquidadorExpressPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');

  const [casoExpress, setCasoExpress] = useState(location.state?.casoExpress ?? null);
  const [liquidadorState, setLiquidadorState] = useState(null);
  const [totalesState, setTotalesState] = useState(null);
  const [cargandoCaso, setCargandoCaso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const casoId = casoExpress?._id || casoIdFromQuery || null;

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (!casoIdFromQuery && location.state?.casoExpress) {
        setCasoExpress(location.state.casoExpress);
        return;
      }
      if (!casoIdFromQuery) return;
      setCargandoCaso(true);
      setError('');
      try {
        const caso = await getSiniestroExpressById(casoIdFromQuery);
        if (!cancelado) setCasoExpress(caso);
      } catch (err) {
        if (!cancelado) {
          setError(err.message || 'No se pudo cargar el caso Express.');
        }
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
    if (casoExpress?.numeroSiniestro) {
      return `Caso ${casoExpress.numeroSiniestro}${casoExpress.consecutivo ? ` · ${casoExpress.consecutivo}` : ''}`;
    }
    return 'Complete la liquidación. Para guardar en documentos del caso, ábralo desde un caso Express guardado.';
  }, [casoExpress]);

  const handleEstadoChange = (liq, tot) => {
    setLiquidadorState(liq);
    setTotalesState(tot);
  };

  const handleGuardarEnCaso = async () => {
    if (!casoId) {
      setError('Debe abrir el liquidador desde un caso Express ya guardado (reporte o carga).');
      return;
    }
    const liquidador = liquidadorState;
    const totales = totalesState || calcularLiquidacion(liquidador || {});
    if (!liquidador) {
      setError('No hay datos del liquidador para guardar.');
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const [excel, recibo, checklist, salvamento] = await Promise.all([
        generarLiquidadorExpressExcelBlob(liquidador, totales),
        generarReciboIndemnizacionBlob(liquidador, totales),
        generarChecklistExpressBlob(liquidador, totales),
        generarSalvamentoExpressBlob(liquidador),
      ]);

      const actualizado = await guardarLiquidadorEnCasoExpress({
        casoId,
        liquidador,
        valorIndemnizacion: totales.totalIndemnizar,
        archivos: [excel, recibo, checklist, salvamento],
        anexosActuales: casoExpress?.anexos || [],
        anexosSalvamentoActuales: casoExpress?.anexosSalvamento || [],
        casoBase: casoExpress || {},
      });

      setCasoExpress(actualizado);
      setMensaje(
        'Liquidador guardado en el caso. Se actualizó el valor de indemnización y se adjuntaron Excel + Word en documentos.'
      );
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo guardar el liquidador en el caso.');
    } finally {
      setGuardando(false);
    }
  };

  const volverHref = casoId
    ? `/express/reporte`
    : '/express/carga';

  return (
    <div className={expressScope}>
      <div className={expressPageWrap}>
        <ExpressPageHeader
          badge="Express"
          title="Liquidador Express"
          subtitle={subtitulo}
          activePath="/express/liquidador"
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
                    : casoExpress?.liquidador
                      ? 'Actualizar en caso'
                      : 'Guardar en caso'}
                </button>
              )}
              <Link to={volverHref} className={expressBtnGhost}>
                <FaArrowLeft />
                Volver
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
            Modo maqueta: puede descargar Word/Excel, pero para guardar en documentos del caso ábralo con el botón{' '}
            <strong>Liquidador</strong> desde el reporte o desde la ficha del caso.
          </p>
        )}

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="font-body text-sm text-gray-500">Cargando caso…</p>
            ) : (
              <LiquidadorExpress
                key={casoExpress?._id || 'nuevo'}
                casoExpress={casoExpress}
                valorInicial={
                  casoExpress?.liquidador
                    ? null
                    : casoExpress?.valorIndemnizacion
                }
                casoId={casoId}
                onEstadoChange={handleEstadoChange}
                onGuardarEnCaso={casoId ? handleGuardarEnCaso : null}
                guardandoCaso={guardando}
                tieneLiquidadorGuardado={Boolean(casoExpress?.liquidador)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
