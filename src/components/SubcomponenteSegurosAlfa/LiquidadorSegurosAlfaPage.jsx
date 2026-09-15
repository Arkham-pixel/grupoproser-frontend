import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import LiquidadorSegurosAlfa from './LiquidadorSegurosAlfa.jsx';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
  expressCard,
  expressCardBody,
  expressPageWrap,
  expressScope,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  getCasoAlfaById,
  guardarInformeUnicoEnCasoAlfa,
  guardarLiquidadorEnCasoAlfa,
} from '../../services/segurosAlfaService.js';
import { calcularLiquidacionAlfa, defaultInformeUnicoAlfa } from './liquidadorAlfaHelpers.js';
import {
  archivarBlobEnCasoAlfa,
  MIME_ARCHIVO_ALFA,
} from './archivarDocumentoAlfa.js';
import {
  extraerConsecutivoAlfaDeNombre,
  parsearInformeCatAlfaExcel,
} from './parsearInformeCatAlfaExcel.js';
import {
  fusionarFotosInspeccionAlfa,
  subirFotosAnexosCatAlCaso,
} from './subirFotosAnexosCatAlfa.js';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export default function LiquidadorSegurosAlfaPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');

  const [casoAlfa, setCasoAlfa] = useState(location.state?.casoAlfa ?? null);
  const [liquidadorState, setLiquidadorState] = useState(null);
  const [totalesState, setTotalesState] = useState(null);
  const [cargandoCaso, setCargandoCaso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const casoId = casoAlfa?._id || casoIdFromQuery || null;

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (!casoIdFromQuery && location.state?.casoAlfa) {
        setCasoAlfa(location.state.casoAlfa);
        return;
      }
      if (!casoIdFromQuery) return;
      setCargandoCaso(true);
      setError('');
      try {
        const caso = await getCasoAlfaById(casoIdFromQuery);
        if (!cancelado) setCasoAlfa(caso);
      } catch (err) {
        if (!cancelado) setError(err.message || t('segurosAlfa.settlement.loadError'));
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
    if (casoAlfa?.tomador || casoAlfa?.siniestro) {
      return `${casoAlfa.tomador || '—'}${casoAlfa.consecutivo ? ` · ${casoAlfa.consecutivo}` : ''}${
        casoAlfa.siniestro ? ` · ${casoAlfa.siniestro}` : ''
      }`;
    }
    return t('segurosAlfa.settlement.subtitle');
  }, [casoAlfa, t]);

  const handleEstadoChange = (liq, tot) => {
    setLiquidadorState(liq);
    setTotalesState(tot);
  };

  const handleGuardarEnCaso = async (liqArg, totArg) => {
    if (!casoId) {
      setError(t('segurosAlfa.settlement.savedCaseRequired'));
      return;
    }
    const liquidador = liqArg || liquidadorState;
    const totales = totArg || totalesState || calcularLiquidacionAlfa(liquidador || {});
    if (!liquidador) {
      setError(t('segurosAlfa.settlement.noData'));
      return;
    }

    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = await guardarLiquidadorEnCasoAlfa({
        casoId,
        liquidador,
        totales,
        casoBase: casoAlfa || {},
      });
      setCasoAlfa(actualizado);
      setMensaje(t('segurosAlfa.settlement.savedMessage'));
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosAlfa.settlement.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  const handleImportarExcelCat = async (file) => {
    if (!casoId) {
      throw new Error(t('segurosAlfa.settlement.savedCaseRequired'));
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const parsed = await parsearInformeCatAlfaExcel(file, {
        caso: casoAlfa || {},
        liquidadorActual: liquidadorState,
      });
      const nextLiq = { ...parsed.liquidador, excelCatOrigen: 'manual' };
      const totales = calcularLiquidacionAlfa(nextLiq);
      const informeBase =
        (casoAlfa?.informeUnico && typeof casoAlfa.informeUnico === 'object'
          ? casoAlfa.informeUnico
          : null) || defaultInformeUnicoAlfa(casoAlfa || {});

      let fotosSubidas = { fotosMeta: [], nOk: 0, nFail: 0 };
      if (Array.isArray(parsed.fotosAnexos) && parsed.fotosAnexos.length) {
        fotosSubidas = await subirFotosAnexosCatAlCaso({
          casoId,
          fotosAnexos: parsed.fotosAnexos,
          onArchivoCreado: (creado) => {
            setCasoAlfa((prev) => {
              if (!prev || !creado) return prev;
              const archivos = Array.isArray(prev.archivos) ? [...prev.archivos] : [];
              return { ...prev, archivos: [...archivos, creado] };
            });
          },
        });
      }

      const nextInforme = {
        ...informeBase,
        analisisGeneral: {
          ...(informeBase.analisisGeneral || {}),
          ...(parsed.analisisGeneral || {}),
        },
        ajustadorNombre:
          nextLiq.encabezado?.ajustador || informeBase.ajustadorNombre || '',
        fotosInspeccion: fusionarFotosInspeccionAlfa(
          informeBase.fotosInspeccion,
          fotosSubidas.fotosMeta
        ),
      };

      setLiquidadorState(nextLiq);
      setTotalesState(totales);

      const actualizadoLiq = await guardarLiquidadorEnCasoAlfa({
        casoId,
        liquidador: nextLiq,
        totales,
        casoBase: { ...(casoAlfa || {}), informeUnico: nextInforme },
      });
      const actualizadoInf = await guardarInformeUnicoEnCasoAlfa({
        casoId,
        informeUnico: nextInforme,
        casoBase: actualizadoLiq || casoAlfa || {},
      });

      let archivo = null;
      try {
        archivo = await archivarBlobEnCasoAlfa({
          casoId,
          blob: file,
          nombre: file.name || 'Informe_CAT_Seguros_Alfa.xlsx',
          mime: MIME_ARCHIVO_ALFA.xlsx,
          etiqueta: 'LIQUIDACION',
        });
      } catch (errArchivo) {
        console.error(errArchivo);
      }

      const casoFinal = actualizadoInf || actualizadoLiq;
      if (casoFinal) setCasoAlfa(casoFinal);

      const consecArchivo =
        parsed.consecutivoArchivo || extraerConsecutivoAlfaDeNombre(file.name);
      const consecCaso = String(casoAlfa?.consecutivo || '').trim();
      const avisoConsec =
        consecArchivo && consecCaso && consecArchivo !== consecCaso.toUpperCase()
          ? ` Atención: el archivo parece de ${consecArchivo} y este caso es ${consecCaso}.`
          : '';
      const avisoFotos =
        fotosSubidas.nOk > 0
          ? ` ${fotosSubidas.nOk} foto(s) de ANEXOS subidas.`
          : parsed.nFotos > 0 && fotosSubidas.nOk === 0
            ? ' No se pudieron subir las fotos del Excel.'
            : '';
      const msg = [
        `Excel importado a ARNALD: liquidador (${parsed.nItems} ítem(s)) e informe.`,
        avisoFotos,
        archivo ? ' Archivo en archivero.' : '',
        avisoConsec,
      ].join('');
      setMensaje(msg);
      return { nItems: parsed.nItems, nFotos: fotosSubidas.nOk, archivo, mensaje: msg };
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo importar el Excel CAT.');
      throw err;
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className={`${root} ${expressScope}`}>
      <div className={expressPageWrap}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-fenix-primario">
              Seguros Alfa
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('segurosAlfa.settlement.title')}
            </h1>
            <p className="mt-1 font-body text-sm text-gray-600 dark:text-gray-400">{subtitulo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {casoId && (
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={guardando || !liquidadorState}
                onClick={() => handleGuardarEnCaso()}
              >
                <FaSave />{' '}
                {guardando
                  ? t('segurosAlfa.settlement.saving')
                  : t('segurosAlfa.settlement.saveToCase')}
              </button>
            )}
            <Link to="/seguros-alfa/reporte" className={expressBtnGhost}>
              <FaArrowLeft /> {t('segurosAlfa.settlement.backReport')}
            </Link>
          </div>
        </div>

        {mensaje && <p className={`mb-4 ${expressAlertSuccess}`}>{mensaje}</p>}
        {error && <p className={`mb-4 ${expressAlertError}`}>{error}</p>}

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('segurosAlfa.settlement.loading')}</p>
            ) : (
              <LiquidadorSegurosAlfa
                casoAlfa={casoAlfa}
                onEstadoChange={handleEstadoChange}
                onGuardarEnCaso={casoId ? handleGuardarEnCaso : undefined}
                onImportarExcelCat={casoId ? handleImportarExcelCat : undefined}
                onCasoChange={setCasoAlfa}
                guardandoCaso={guardando}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
