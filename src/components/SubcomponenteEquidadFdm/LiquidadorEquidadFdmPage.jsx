import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { getCasoFdmById, guardarLiquidadorEnCasoFdm, subirArchivoFdm } from '../../services/equidadFdmService.js';
import { calcularLiquidacionFdm } from './liquidadorEquidadFdmHelpers.js';
import { generarLiquidadorFdmExcelBlob } from './generarLiquidadorFdmExcel.js';

const fdmRoot = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export default function LiquidadorEquidadFdmPage() {
  const { t } = useTranslation();
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
        if (!cancelado) setError(err.message || t('equidadFdm.settlement.loadError'));
      } finally {
        if (!cancelado) setCargandoCaso(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [casoIdFromQuery, location.state, t]);

  const subtitulo = useMemo(() => {
    if (casoFdm?.nombre) {
      return `${casoFdm.nombre}${casoFdm.consecutivo ? ` · ${casoFdm.consecutivo}` : ''}${
        casoFdm.polizaAfectar ? ` · ${t('equidadFdm.settlement.policy')} ${casoFdm.polizaAfectar}` : ''
      }`;
    }
    return t('equidadFdm.settlement.subtitle');
  }, [casoFdm, t]);

  const handleEstadoChange = (liq, tot) => {
    setLiquidadorState(liq);
    setTotalesState(tot);
  };

  const handleGuardarEnCaso = async () => {
    if (!casoId) {
      setError(t('equidadFdm.settlement.savedCaseRequired'));
      return;
    }
    const liquidador = liquidadorState;
    const totales = totalesState || calcularLiquidacionFdm(liquidador || {});
    if (!liquidador) {
      setError(t('equidadFdm.settlement.noData'));
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

      // Guardar también el modelo de liquidación Excel en el archivero
      try {
        const { blob, nombre } = await generarLiquidadorFdmExcelBlob(liquidador, totales);
        const file = new File([blob], nombre, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        await subirArchivoFdm(casoId, file, 'MODELO_LIQUIDACION', {
          reemplazarMismaEtiqueta: true,
          descripcion: 'Modelo de liquidación generado desde el liquidador',
        });
        const conArchivos = await getCasoFdmById(casoId);
        setCasoFdm(conArchivos);
        setMensaje(t('equidadFdm.settlement.savedWithModelMessage'));
      } catch (archErr) {
        console.warn('Liquidador guardado, pero no se pudo subir el Excel al archivero:', archErr);
        setCasoFdm(actualizado);
        setMensaje(t('equidadFdm.settlement.savedMessage'));
      }
    } catch (err) {
      console.error(err);
      setError(err.message || t('equidadFdm.settlement.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className={`${fdmRoot} ${expressScope}`}>
      <div className={expressPageWrap}>
        <FdmPageHeader
          title={t('equidadFdm.settlement.title')}
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
                    ? t('equidadFdm.actions.saving')
                    : casoFdm?.liquidador
                      ? t('equidadFdm.settlement.updateCase')
                      : t('equidadFdm.settlement.saveCase')}
                </button>
              )}
              <Link to="/equidad-fdm/reporte" className={expressBtnGhost}>
                <FaArrowLeft />
                {t('equidadFdm.settlement.backToReport')}
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
            {t('equidadFdm.settlement.mockMode')}
          </p>
        )}

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="font-body text-sm text-gray-500">{t('equidadFdm.settlement.loadingCase')}</p>
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
