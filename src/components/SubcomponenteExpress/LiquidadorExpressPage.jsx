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
import {
  calcularLiquidacion,
  aplicaFormatoSalvamento,
} from './liquidadorExpressHelpers.js';
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

  // Con casoId siempre partimos de null y esperamos el GET (el state del form no trae liquidador).
  const [casoExpress, setCasoExpress] = useState(
    casoIdFromQuery ? null : location.state?.casoExpress ?? null
  );
  const [liquidadorState, setLiquidadorState] = useState(null);
  const [totalesState, setTotalesState] = useState(null);
  const [cargandoCaso, setCargandoCaso] = useState(Boolean(casoIdFromQuery));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const casoId = casoExpress?._id || casoIdFromQuery || null;

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (casoIdFromQuery) {
        setCargandoCaso(true);
        setError('');
        try {
          const caso = await getSiniestroExpressById(casoIdFromQuery);
          if (!cancelado) setCasoExpress(caso);
        } catch (err) {
          if (!cancelado) {
            setError(err.message || 'No se pudo cargar el caso Express.');
            // Fallback: state de navegación si el GET falla
            if (location.state?.casoExpress) {
              setCasoExpress(location.state.casoExpress);
            }
          }
        } finally {
          if (!cancelado) setCargandoCaso(false);
        }
        return;
      }

      if (location.state?.casoExpress) {
        setCasoExpress(location.state.casoExpress);
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

  const handleGuardarEnCaso = async (liquidadorArg, totalesArg) => {
    if (!casoId) {
      setError('Debe abrir el liquidador desde un caso Express ya guardado (reporte o carga).');
      return;
    }
    const liquidador = liquidadorArg || liquidadorState;
    const totales = totalesArg || totalesState || calcularLiquidacion(liquidador || {});
    if (!liquidador) {
      setError('No hay datos del liquidador para guardar.');
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      // 1) Guardar JSON del liquidador primero (no depende de generar Word/Excel)
      const guardadoInicial = await guardarLiquidadorEnCasoExpress({
        casoId,
        liquidador,
        valorIndemnizacion: totales.totalIndemnizar,
        archivos: [],
        anexosActuales: casoExpress?.anexos || [],
        anexosSalvamentoActuales: casoExpress?.anexosSalvamento || [],
        casoBase: casoExpress || {},
      });
      const casoTrasJson = guardadoInicial?.caso || guardadoInicial;
      setCasoExpress(casoTrasJson);
      setLiquidadorState(liquidador);
      setTotalesState(totales);

      // 2) Generar y adjuntar documentos (si falla, el liquidador ya quedó en el caso)
      let archivosOk = true;
      let archivosError = null;
      try {
        const incluirSalvamento = aplicaFormatoSalvamento(liquidador, casoTrasJson || casoExpress);
        const generadores = [
          generarLiquidadorExpressExcelBlob(liquidador, totales, { incluirSalvamento }),
          generarReciboIndemnizacionBlob(liquidador, totales),
          generarChecklistExpressBlob(liquidador, totales),
        ];
        if (incluirSalvamento) {
          generadores.push(generarSalvamentoExpressBlob(liquidador));
        }

        const generados = await Promise.all(generadores);

        const guardadoArchivos = await guardarLiquidadorEnCasoExpress({
          casoId,
          liquidador,
          valorIndemnizacion: totales.totalIndemnizar,
          archivos: generados,
          anexosActuales: casoTrasJson?.anexos || [],
          anexosSalvamentoActuales: casoTrasJson?.anexosSalvamento || [],
          casoBase: casoTrasJson || casoExpress || {},
        });
        const casoFinal = guardadoArchivos?.caso || guardadoArchivos;
        archivosOk = guardadoArchivos?.archivosOk !== false;
        archivosError = guardadoArchivos?.archivosError || null;
        setCasoExpress(casoFinal);
      } catch (errArchivos) {
        archivosOk = false;
        archivosError = errArchivos?.message || 'No se pudieron generar/adjuntar Word/Excel';
        console.error(errArchivos);
      }

      if (archivosOk) {
        const conSalvamento = aplicaFormatoSalvamento(liquidador, casoExpress);
        setMensaje(
          conSalvamento
            ? 'Liquidador guardado en el caso. Se actualizó el valor de indemnización y se adjuntaron Excel + Word en documentos.'
            : 'Liquidador guardado. Salvamento no aplica: se omitió la hoja/formato SALVAMENTO; liquidación, checklist y recibo sí se generaron.'
        );
      } else {
        setMensaje(
          `Liquidador guardado en el caso (conceptos y totales OK). Advertencia archivos: ${archivosError || 'revise anexos'}.`
        );
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo guardar el liquidador en el caso.');
    } finally {
      setGuardando(false);
    }
  };

  const volverHref = casoId ? `/express/reporte` : '/express/carga';

  const liquidadorKey = casoExpress
    ? `${casoExpress._id || 'sin-id'}-${casoExpress.liquidador ? 'con' : 'sin'}-liq`
    : 'nuevo';

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
                  onClick={() => handleGuardarEnCaso(liquidadorState, totalesState)}
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
        {!casoId && !cargandoCaso && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            Modo maqueta: puede descargar Word/Excel, pero para guardar en documentos del caso ábralo con el botón{' '}
            <strong>Liquidador</strong> desde el reporte o desde la ficha del caso.
          </p>
        )}

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="font-body text-sm text-gray-500">Cargando liquidador del caso…</p>
            ) : (
              <LiquidadorExpress
                key={liquidadorKey}
                casoExpress={casoExpress}
                valorInicial={
                  casoExpress?.liquidador ? null : casoExpress?.valorIndemnizacion
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
