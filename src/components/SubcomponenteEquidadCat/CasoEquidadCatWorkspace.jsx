import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaSave } from 'react-icons/fa';
import LiquidadorEquidadFdm from '../SubcomponenteEquidadFdm/LiquidadorEquidadFdm.jsx';
import InformeUnicoEquidadCat from './InformeUnicoEquidadCat.jsx';
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
  fetchAllCasosEquidadCat,
  getCasoEquidadCatById,
  guardarInformeUnicoEnCasoEquidadCat,
  guardarLiquidadorEnCasoEquidadCat,
  subirArchivoEquidadCat,
} from '../../services/equidadCatService.js';
import { calcularLiquidacionFdm } from '../SubcomponenteEquidadFdm/liquidadorEquidadFdmHelpers.js';
import { casoEquidadCatComoFdm } from './equidadCatLiquidadorAdapter.js';
import { generarLiquidadorFdmExcelBlob } from '../SubcomponenteEquidadFdm/generarLiquidadorFdmExcel.js';
import { eliminarBorradorArnald } from '../../services/arnaldPlataformaService.js';
import { borrarBorradorLocal } from '../../services/arnaldDraftLocalStore.js';
import useEquidadCatCasoAutosave from '../../hooks/useEquidadCatCasoAutosave.js';
import { setAutosaveUiStatus } from '../../services/autosaveOfflineService.js';
import useArnaldFormDraft from '../../hooks/useArnaldFormDraft.js';
import ArnaldDraftChrome from '../ArnaldDraftChrome.jsx';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export const TABS_EQUIDAD_CAT = {
  LIQUIDADOR: 'liquidador',
  INFORME: 'informe',
};

const STORAGE_CASO = 'equidadCatCasoId';
const RUTA_REPORTE = '/equidad-cat/reporte';

function tabDesdePathname(pathname) {
  const p = String(pathname || '');
  if (p.includes('/informe-unico')) return TABS_EQUIDAD_CAT.INFORME;
  if (p.includes('/liquidador') || p.includes('/caso')) return TABS_EQUIDAD_CAT.LIQUIDADOR;
  return null;
}

function leerCasoIdSesion() {
  try {
    return sessionStorage.getItem(STORAGE_CASO) || '';
  } catch {
    return '';
  }
}

function guardarCasoIdSesion(id) {
  try {
    if (id) sessionStorage.setItem(STORAGE_CASO, String(id));
  } catch {
    /* ignore */
  }
}

function rutaPublicaTab(tab) {
  if (tab === TABS_EQUIDAD_CAT.INFORME) return '/equidad-cat/informe-unico';
  return '/equidad-cat/liquidador';
}

const pillClass = (activo) =>
  `rounded-lg px-4 py-2 font-body text-sm font-semibold transition ${
    activo
      ? 'bg-fenix-primario text-white'
      : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
  }`;

/**
 * Workspace Equidad CAT: liquidador FDM + informe único CAT.
 */
export default function CasoEquidadCatWorkspace({ tabInicial = null } = {}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');
  const tabFromQuery = searchParams.get('tab');

  const tabDesdeRuta = useMemo(
    () => tabDesdePathname(location.pathname) || tabInicial,
    [location.pathname, tabInicial]
  );

  const tabActivo = useMemo(() => {
    const raw = tabFromQuery || tabDesdeRuta || TABS_EQUIDAD_CAT.LIQUIDADOR;
    if (raw === TABS_EQUIDAD_CAT.INFORME || raw === 'informe-unico') {
      return TABS_EQUIDAD_CAT.INFORME;
    }
    return TABS_EQUIDAD_CAT.LIQUIDADOR;
  }, [tabFromQuery, tabDesdeRuta]);

  useEffect(() => {
    if (tabFromQuery || !tabDesdeRuta) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabDesdeRuta);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (casoIdFromQuery) return;
    const stored = leerCasoIdSesion();
    if (!stored) return;
    const next = new URLSearchParams(searchParams);
    next.set('casoId', stored);
    if (!next.get('tab') && tabDesdeRuta) next.set('tab', tabDesdeRuta);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [casoEquidadCat, setCasoEquidadCat] = useState(location.state?.casoEquidadCat ?? null);
  const [liquidadorState, setLiquidadorState] = useState(null);
  const [totalesState, setTotalesState] = useState(null);
  const [informeState, setInformeState] = useState(null);
  const [cargandoCaso, setCargandoCaso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [draftToRestore, setDraftToRestore] = useState(null);
  const [restoreNonce, setRestoreNonce] = useState(0);
  const [busquedaCaso, setBusquedaCaso] = useState('');
  const [listaCasos, setListaCasos] = useState([]);

  const casoId = casoEquidadCat?._id || casoIdFromQuery || null;

  useEffect(() => {
    if (casoId) guardarCasoIdSesion(casoId);
  }, [casoId]);

  useEffect(() => {
    setLiquidadorState(null);
    setInformeState(null);
    setTotalesState(null);
  }, [casoIdFromQuery]);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (!casoIdFromQuery && location.state?.casoEquidadCat) {
        const caso = location.state.casoEquidadCat;
        setCasoEquidadCat(caso);
        setLiquidadorState((prev) => prev || caso?.liquidador || null);
        setInformeState((prev) => prev || caso?.informeUnico || null);
        if (caso?.liquidador) {
          setTotalesState((prev) => prev || calcularLiquidacionFdm(caso.liquidador));
        }
        return;
      }
      if (!casoIdFromQuery) return;
      setCargandoCaso(true);
      setError('');
      try {
        const caso = await getCasoEquidadCatById(casoIdFromQuery);
        if (!cancelado) {
          setCasoEquidadCat(caso);
          setLiquidadorState((prev) => prev || caso?.liquidador || null);
          setInformeState((prev) => prev || caso?.informeUnico || null);
          if (caso?.liquidador) {
            setTotalesState((prev) => prev || calcularLiquidacionFdm(caso.liquidador));
          }
        }
      } catch (err) {
        if (!cancelado) setError(err.message || t('equidadCat.workspace.loadError'));
      } finally {
        if (!cancelado) setCargandoCaso(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [casoIdFromQuery, location.state, t]);

  useEffect(() => {
    if (casoIdFromQuery) return undefined;
    let cancelado = false;
    fetchAllCasosEquidadCat()
      .then((data) => {
        if (!cancelado) setListaCasos(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelado) setListaCasos([]);
      });
    return () => {
      cancelado = true;
    };
  }, [casoIdFromQuery]);

  const setTab = useCallback(
    (tab) => {
      const next = new URLSearchParams(searchParams);
      next.set('tab', tab);
      if (casoId) next.set('casoId', casoId);
      const qs = next.toString();
      navigate(`${rutaPublicaTab(tab)}?${qs}`, { replace: true });
      setMensaje('');
      setError('');
    },
    [casoId, searchParams, navigate]
  );

  const subtitulo = useMemo(() => {
    if (casoEquidadCat?.asegurado || casoEquidadCat?.siniestro) {
      return [casoEquidadCat.asegurado, casoEquidadCat.consecutivo, casoEquidadCat.siniestro]
        .filter(Boolean)
        .join(' · ');
    }
    return t('equidadCat.workspace.subtitleListado');
  }, [casoEquidadCat, t]);

  const casosFiltradosPicker = useMemo(() => {
    const q = String(busquedaCaso || '')
      .trim()
      .toLowerCase();
    if (!q) return listaCasos;
    return listaCasos.filter((c) => {
      const blob = [
        c.consecutivo,
        c.asegurado,
        c.siniestro,
        c.identificacion,
        c.ciudad,
        c.numeroPoliza,
        c.causa,
      ]
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return blob.includes(q);
    });
  }, [listaCasos, busquedaCaso]);

  const casoConSecciones = useCallback(
    () => ({
      ...(casoEquidadCat || {}),
      liquidador: liquidadorState || casoEquidadCat?.liquidador,
      informeUnico: informeState || casoEquidadCat?.informeUnico,
    }),
    [casoEquidadCat, liquidadorState, informeState]
  );

  const casoFdm = useMemo(
    () => casoEquidadCatComoFdm(casoConSecciones()),
    [casoEquidadCat, liquidadorState, informeState]
  );

  const handleGuardarLiquidador = async (liqArg, totArg) => {
    if (!casoId) {
      setError(t('equidadCat.settlement.savedCaseRequired'));
      return;
    }
    const liquidador = liqArg || liquidadorState;
    const totales = totArg || totalesState || calcularLiquidacionFdm(liquidador || {});
    if (!liquidador) {
      setError(t('equidadCat.settlement.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = await guardarLiquidadorEnCasoEquidadCat({
        casoId,
        liquidador,
        totales,
        casoBase: casoConSecciones(),
      });
      try {
        const { blob, nombre } = await generarLiquidadorFdmExcelBlob(liquidador, totales);
        const file = new File([blob], nombre, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        await subirArchivoEquidadCat(casoId, file, 'MODELO_LIQUIDACION', {
          reemplazarMismaEtiqueta: true,
          descripcion: 'Modelo de liquidación generado desde el liquidador FDM',
        });
        const conArchivos = await getCasoEquidadCatById(casoId);
        setCasoEquidadCat(conArchivos);
      } catch (archErr) {
        console.warn('Liquidador guardado, pero no se pudo subir el Excel al archivero:', archErr);
        setCasoEquidadCat(actualizado);
      }
      setLiquidadorState(liquidador);
      try {
        const draftKey = `equidad-cat-ws:${casoId}`;
        borrarBorradorLocal(draftKey);
        await eliminarBorradorArnald(draftKey);
      } catch {
        /* el caso ya quedó en Mongo */
      }
      setMensaje(t('equidadCat.settlement.savedMessage'));
      setAutosaveUiStatus({
        state: 'synced',
        pendingCount: 0,
        message: 'Sincronizado',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('equidadCat.settlement.saveError'));
      setAutosaveUiStatus({
        state: 'error',
        message: err.message || 'Error al sincronizar',
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarInforme = async (informeArg) => {
    if (!casoId) {
      setError(t('equidadCat.reportUnique.savedCaseRequired'));
      return;
    }
    const informe = informeArg || informeState;
    if (!informe) {
      setError(t('equidadCat.reportUnique.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = await guardarInformeUnicoEnCasoEquidadCat({
        casoId,
        informeUnico: { ...informe, tipoInforme: 'unico' },
        casoBase: casoConSecciones(),
      });
      setCasoEquidadCat(actualizado);
      setMensaje(t('equidadCat.reportUnique.savedMessage'));
      setAutosaveUiStatus({
        state: 'synced',
        pendingCount: 0,
        message: 'Sincronizado',
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('equidadCat.reportUnique.saveError'));
      setAutosaveUiStatus({
        state: 'error',
        message: err.message || 'Error al sincronizar',
      });
    } finally {
      setGuardando(false);
    }
  };

  const etiquetaTabInforme = t('equidadCat.workspace.tabUniqueReport');

  const handleGuardarActual = () => {
    if (tabActivo === TABS_EQUIDAD_CAT.INFORME) return handleGuardarInforme();
    return handleGuardarLiquidador();
  };

  const onCasoDesdeAutosave = useCallback((actualizado) => {
    if (actualizado) setCasoEquidadCat(actualizado);
  }, []);

  useEquidadCatCasoAutosave({
    casoId,
    casoEquidadCat,
    tabActivo,
    liquidadorState,
    totalesState,
    informeState,
    onCasoActualizado: onCasoDesdeAutosave,
    enabled: Boolean(casoId) && !cargandoCaso,
    guardarLiquidador: guardarLiquidadorEnCasoEquidadCat,
    guardarInforme: guardarInformeUnicoEnCasoEquidadCat,
  });

  const draftPayload = useMemo(
    () => ({
      liquidador: liquidadorState,
      totales: totalesState,
      informe: informeState,
    }),
    [liquidadorState, totalesState, informeState]
  );
  const onDraftRestoreAvailable = useCallback((info) => {
    setDraftToRestore(info);
    setShowDraftRestore(true);
  }, []);
  const { draftStatus, lastDraftAt, discardDraft, consumeDraft } = useArnaldFormDraft({
    formKey: casoId ? `equidad-cat-ws:${casoId}` : '',
    modulo: 'equidad-cat',
    recursoId: casoId || '',
    titulo: 'Workspace Equidad CAT',
    formData: draftPayload,
    enabled: Boolean(casoId) && !cargandoCaso,
    onRestoreAvailable: onDraftRestoreAvailable,
  });

  const mostrarBotonGuardarSuperior = Boolean(casoId);

  return (
    <div className={`${root} ${expressScope}`}>
      <div className={expressPageWrap}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-fenix-primario">
              Equidad CAT
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {tabActivo === TABS_EQUIDAD_CAT.INFORME
                ? etiquetaTabInforme
                : t('equidadCat.workspace.tabSettlement')}
            </h1>
            <p className="mt-1 font-body text-sm text-gray-600 dark:text-gray-400">{subtitulo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {mostrarBotonGuardarSuperior && (
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={
                  guardando ||
                  (tabActivo === TABS_EQUIDAD_CAT.INFORME ? !informeState : !liquidadorState)
                }
                onClick={handleGuardarActual}
              >
                <FaSave />{' '}
                {guardando ? t('equidadCat.workspace.saving') : t('equidadCat.workspace.saveCurrent')}
              </button>
            )}
            <Link to={RUTA_REPORTE} className={expressBtnGhost}>
              <FaArrowLeft /> {t('equidadCat.workspace.backReport')}
            </Link>
          </div>
        </div>

        {!casoId && !cargandoCaso && (
          <div className="mb-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            <p>
              {t('equidadCat.workspace.pickCaseListado')}{' '}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => navigate(RUTA_REPORTE)}
              >
                {t('equidadCat.workspace.goReport')}
              </button>
            </p>
            <label className="block font-semibold text-amber-950 dark:text-amber-50">
              {t('common.search')}
              <input
                type="search"
                value={busquedaCaso}
                onChange={(e) => setBusquedaCaso(e.target.value)}
                placeholder={t('equidadCat.report.searchPlaceholder')}
                className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 font-body text-sm text-gray-800 dark:border-amber-800 dark:bg-gray-950 dark:text-gray-100"
              />
            </label>
            {casosFiltradosPicker.length > 0 && (
              <ul className="max-h-48 overflow-auto rounded-lg border border-amber-200 bg-white dark:border-amber-800 dark:bg-gray-950">
                {casosFiltradosPicker.slice(0, 12).map((c) => (
                  <li key={c._id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-amber-100 dark:text-gray-100 dark:hover:bg-amber-950"
                      onClick={() => {
                        const next = new URLSearchParams(searchParams);
                        next.set('casoId', c._id);
                        next.set('tab', tabActivo || TABS_EQUIDAD_CAT.LIQUIDADOR);
                        setSearchParams(next);
                      }}
                    >
                      {[c.consecutivo, c.asegurado, c.siniestro, c.ciudad]
                        .filter(Boolean)
                        .join(' · ') || c._id}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {mensaje && <p className={`mb-4 ${expressAlertSuccess}`}>{mensaje}</p>}
        {error && <p className={`mb-4 ${expressAlertError}`}>{error}</p>}

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={pillClass(tabActivo === TABS_EQUIDAD_CAT.LIQUIDADOR)}
            onClick={() => setTab(TABS_EQUIDAD_CAT.LIQUIDADOR)}
          >
            1. {t('equidadCat.workspace.tabSettlement')}
          </button>
          <button
            type="button"
            className={pillClass(tabActivo === TABS_EQUIDAD_CAT.INFORME)}
            onClick={() => setTab(TABS_EQUIDAD_CAT.INFORME)}
          >
            2. {etiquetaTabInforme}
          </button>
        </div>

        <div className={expressCard}>
          <div className={expressCardBody}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('equidadCat.workspace.loading')}</p>
            ) : tabActivo === TABS_EQUIDAD_CAT.INFORME ? (
              <InformeUnicoEquidadCat
                key={`inf-${casoId}-${restoreNonce}`}
                origen="listado"
                casoEquidadCat={casoEquidadCat}
                informeInicial={informeState}
                liquidadorFdm={liquidadorState || casoEquidadCat?.liquidador}
                onEstadoChange={setInformeState}
                onIrLiquidador={() => setTab(TABS_EQUIDAD_CAT.LIQUIDADOR)}
                onGuardarEnCaso={casoId ? handleGuardarInforme : undefined}
                onCasoChange={setCasoEquidadCat}
                guardandoCaso={guardando}
              />
            ) : (
              <LiquidadorEquidadFdm
                key={`liq-${casoId}-${restoreNonce}`}
                casoFdm={casoFdm}
                onEstadoChange={(liq, tot) => {
                  setLiquidadorState(liq);
                  setTotalesState(tot);
                }}
                onGuardarEnCaso={casoId ? handleGuardarLiquidador : undefined}
                guardandoCaso={guardando}
                tieneLiquidadorGuardado={Boolean(casoEquidadCat?.liquidador)}
              />
            )}
          </div>
        </div>
      </div>
      <ArnaldDraftChrome
        draftStatus={draftStatus}
        lastDraftAt={lastDraftAt}
        consumeDraft={consumeDraft}
        showRestore={showDraftRestore}
        savedDataToRestore={draftToRestore}
        onRestore={() => {
          const data = draftToRestore?.data || {};
          setCasoEquidadCat((prev) => ({
            ...(prev || {}),
            liquidador: data.liquidador || prev?.liquidador,
            informeUnico: data.informe || prev?.informeUnico,
          }));
          if (data.liquidador) setLiquidadorState(data.liquidador);
          if (data.totales) setTotalesState(data.totales);
          if (data.informe) setInformeState(data.informe);
          setRestoreNonce((n) => n + 1);
          setShowDraftRestore(false);
        }}
        onDiscard={() => {
          discardDraft();
          setShowDraftRestore(false);
          setDraftToRestore(null);
        }}
        onCancel={() => setShowDraftRestore(false)}
      />
      <Outlet />
    </div>
  );
}

export function RedirectEquidadCatLiquidador() {
  return <CasoEquidadCatWorkspace tabInicial={TABS_EQUIDAD_CAT.LIQUIDADOR} />;
}

export function RedirectEquidadCatInforme() {
  return <CasoEquidadCatWorkspace tabInicial={TABS_EQUIDAD_CAT.INFORME} />;
}

export function RedirectEquidadCatWorkspace() {
  return <CasoEquidadCatWorkspace tabInicial={TABS_EQUIDAD_CAT.LIQUIDADOR} />;
}
