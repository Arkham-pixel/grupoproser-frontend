import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { FaArrowLeft, FaFileExcel, FaSave } from 'react-icons/fa';
import LiquidadorSegurosSura from './LiquidadorSegurosSura.jsx';
import InformeUnicoSegurosSura from './InformeUnicoSegurosSura.jsx';
import InformeAgilSura from './InformeAgilSura.jsx';
import FotosLiquidadorSura from './FotosLiquidadorSura.jsx';
import SalvamentoSura from './SalvamentoSura.jsx';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
  expressCard,
  expressCardBody,
  expressPageWrap,
  expressScope,
} from '../SubcomponenteExpress/expressFenixUi.js';
import {
  getCasoSuraById,
  guardarInformeUnicoEnCasoSura,
  guardarLiquidadorEnCasoSura,
  guardarSeccionCasoSura,
} from '../../services/segurosSuraService.js';
import { calcularLiquidacionSura, itemsPlanosSura, mapCasoSuraALiquidador } from './liquidadorSuraHelpers.js';
import { fusionarLiquidadorSinPerderPresupuestoNsr } from '../SubcomponenteEvaluacionSismicaNSR10/protegerPresupuestoNsr10.js';
import { descargarFormatoAgilSuraExcel } from './generarFormatoAgilSuraExcel.js';
import { defaultFotosAgilSura, serializarFotosAgilSura } from './informeAgilSuraHelpers.js';
import { sincronizarFotosAgilEnInformeCaso } from './syncFotosNsrAlInformeSura.js';
import useSuraCasoAutosave from '../../hooks/useSuraCasoAutosave.js';
import { setAutosaveUiStatus } from '../../services/autosaveOfflineService.js';
import useArnaldFormDraft from '../../hooks/useArnaldFormDraft.js';
import ArnaldDraftChrome from '../ArnaldDraftChrome.jsx';
import SelectorTipoInformeSura from './SelectorTipoInformeSura.jsx';

const root = 'min-h-full w-full min-w-0 bg-fenix-fondo dark:bg-[#0F0F0F] p-4 sm:p-6';

export const TABS_SURA = {
  INFORME_AGIL: 'informe-agil',
  PRESUPUESTO: 'presupuesto',
  FOTOS: 'fotos',
  DOCUMENTOS: 'documentos',
  SALVAMENTO: 'salvamento',
  /** alias legado */
  LIQUIDADOR: 'presupuesto',
  INFORME: 'documentos',
};

const TABS_ORDEN = [
  TABS_SURA.INFORME_AGIL,
  TABS_SURA.PRESUPUESTO,
  TABS_SURA.FOTOS,
  TABS_SURA.DOCUMENTOS,
  TABS_SURA.SALVAMENTO,
];

function normalizarTab(raw) {
  if (raw === 'liquidador' || raw === TABS_SURA.PRESUPUESTO) return TABS_SURA.PRESUPUESTO;
  if (raw === 'informe' || raw === 'informe-unico' || raw === TABS_SURA.DOCUMENTOS) {
    return TABS_SURA.DOCUMENTOS;
  }
  if (raw === TABS_SURA.FOTOS) return TABS_SURA.FOTOS;
  if (raw === TABS_SURA.SALVAMENTO) return TABS_SURA.SALVAMENTO;
  return TABS_SURA.INFORME_AGIL;
}

const pillClass = (activo) =>
  `rounded-lg px-4 py-2 font-body text-sm font-semibold transition ${
    activo
      ? 'bg-fenix-primario text-white'
      : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
  }`;

/**
 * Workspace Sura: Formato ágil
 * 1 Informe ágil · 2 Presupuesto · 3 Fotos · 4 Documentos · 5 Salvamento
 */
export default function CasoSegurosSuraWorkspace({ tabInicial = null } = {}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdFromQuery = searchParams.get('casoId') || searchParams.get('id');
  const tabFromQuery = searchParams.get('tab');

  const tabActivo = useMemo(
    () => normalizarTab(tabFromQuery || tabInicial || TABS_SURA.INFORME_AGIL),
    [tabInicial, tabFromQuery]
  );

  useEffect(() => {
    if (tabFromQuery || !tabInicial) return;
    const next = new URLSearchParams(searchParams);
    next.set('tab', normalizarTab(tabInicial));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [casoSura, setCasoSura] = useState(location.state?.casoSura ?? null);
  const [liquidadorState, setLiquidadorState] = useState(null);
  const [totalesState, setTotalesState] = useState(null);
  const [informeState, setInformeState] = useState(null);
  const [informeAgilState, setInformeAgilState] = useState(null);
  const [salvamentoState, setSalvamentoState] = useState(null);
  const [fotosAgilState, setFotosAgilState] = useState(null);
  const [cargandoCaso, setCargandoCaso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [draftToRestore, setDraftToRestore] = useState(null);
  const [restoreNonce, setRestoreNonce] = useState(0);
  const [mostrarInformeUnico, setMostrarInformeUnico] = useState(false);

  const casoId = casoSura?._id || casoIdFromQuery || null;

  const aplicarCasoCargado = (caso) => {
    setCasoSura(caso);
    const liq = mapCasoSuraALiquidador(caso || {});
    setLiquidadorState(liq);
    setTotalesState(calcularLiquidacionSura(liq));
    setFotosAgilState(defaultFotosAgilSura(caso || {}, liq));
  };

  const casoConSecciones = useCallback(
    () => ({
      ...(casoSura || {}),
      informeAgil: informeAgilState || casoSura?.informeAgil,
      salvamento: salvamentoState || casoSura?.salvamento,
      fotosAgil: serializarFotosAgilSura(
        fotosAgilState ?? defaultFotosAgilSura(casoSura || {}, liquidadorState)
      ),
      liquidador: liquidadorState || casoSura?.liquidador,
      informeUnico: informeState || casoSura?.informeUnico,
    }),
    [casoSura, informeAgilState, salvamentoState, fotosAgilState, liquidadorState, informeState]
  );

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      if (!casoIdFromQuery && location.state?.casoSura) {
        aplicarCasoCargado(location.state.casoSura);
        return;
      }
      if (!casoIdFromQuery) return;
      setCargandoCaso(true);
      setError('');
      try {
        const caso = await getCasoSuraById(casoIdFromQuery);
        if (!cancelado) aplicarCasoCargado(caso);
      } catch (err) {
        if (!cancelado) setError(err.message || t('segurosSura.workspace.loadError'));
      } finally {
        if (!cancelado) setCargandoCaso(false);
      }
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [casoIdFromQuery, location.state, t]);

  const setTab = useCallback(
    (tab) => {
      const next = new URLSearchParams(searchParams);
      next.set('tab', tab);
      if (casoId) next.set('casoId', casoId);
      setSearchParams(next, { replace: true });
      setMensaje('');
      setError('');
    },
    [casoId, searchParams, setSearchParams]
  );

  const subtitulo = useMemo(() => {
    if (casoSura?.tomador || casoSura?.siniestro) {
      return `${casoSura.tomador || '—'}${casoSura.consecutivo ? ` · ${casoSura.consecutivo}` : ''}${
        casoSura.siniestro ? ` · ${casoSura.siniestro}` : ''
      }`;
    }
    return t('segurosSura.workspace.subtitle');
  }, [casoSura, t]);

  const handleGuardarLiquidador = async (liqArg, totArg) => {
    if (!casoId) {
      setError(t('segurosSura.settlement.savedCaseRequired'));
      return;
    }
    const liquidador = liqArg || liquidadorState;
    const totales = totArg || totalesState || calcularLiquidacionSura(liquidador || {});
    if (!liquidador) {
      setError(t('segurosSura.settlement.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = await guardarLiquidadorEnCasoSura({
        casoId,
        liquidador,
        totales,
        casoBase: casoConSecciones(),
      });
      const servidorPerdioPresupuesto =
        itemsPlanosSura(liquidador).length > 0 &&
        itemsPlanosSura(actualizado?.liquidador).length === 0;
      setCasoSura(
        servidorPerdioPresupuesto ? { ...actualizado, liquidador } : actualizado
      );
      setLiquidadorState(liquidador);
      setTotalesState(totales);
      setMensaje(t('segurosSura.settlement.savedMessage'));
      setAutosaveUiStatus({ state: 'synced', pendingCount: 0, message: 'Sincronizado' });
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosSura.settlement.saveError'));
      setAutosaveUiStatus({ state: 'error', message: err.message || 'Error al sincronizar' });
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarInforme = async (informeArg) => {
    if (!casoId) {
      setError(t('segurosSura.reportUnique.savedCaseRequired'));
      return;
    }
    const informe = informeArg || informeState;
    if (!informe) {
      setError(t('segurosSura.reportUnique.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = await guardarInformeUnicoEnCasoSura({
        casoId,
        informeUnico: informe,
        casoBase: casoConSecciones(),
      });
      setCasoSura(actualizado);
      setMensaje(t('segurosSura.reportUnique.savedMessage'));
      setAutosaveUiStatus({ state: 'synced', pendingCount: 0, message: 'Sincronizado' });
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosSura.reportUnique.saveError'));
      setAutosaveUiStatus({ state: 'error', message: err.message || 'Error al sincronizar' });
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarInformeAgil = async (agilArg) => {
    if (!casoId) {
      setError(t('segurosSura.informeAgil.savedCaseRequired'));
      return;
    }
    const informeAgil = agilArg || informeAgilState;
    if (!informeAgil) {
      setError(t('segurosSura.informeAgil.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = await guardarSeccionCasoSura({
        casoId,
        casoBase: casoConSecciones(),
        patch: { informeAgil },
      });
      setCasoSura(actualizado);
      setMensaje(t('segurosSura.informeAgil.savedMessage'));
      setAutosaveUiStatus({ state: 'synced', pendingCount: 0, message: 'Sincronizado' });
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosSura.informeAgil.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarSalvamento = async (salArg) => {
    if (!casoId) {
      setError(t('segurosSura.salvamento.savedCaseRequired'));
      return;
    }
    const salvamento = salArg || salvamentoState;
    if (!salvamento) {
      setError(t('segurosSura.salvamento.noData'));
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = await guardarSeccionCasoSura({
        casoId,
        casoBase: casoConSecciones(),
        patch: { salvamento },
      });
      setCasoSura(actualizado);
      setMensaje(t('segurosSura.salvamento.savedMessage'));
      setAutosaveUiStatus({ state: 'synced', pendingCount: 0, message: 'Sincronizado' });
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosSura.salvamento.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarFotosAgil = async (fotosArg) => {
    if (!casoId) {
      setError(t('segurosSura.fotosAgil.savedCaseRequired'));
      return;
    }
    const fotosAgil = serializarFotosAgilSura(
      fotosArg ?? fotosAgilState ?? defaultFotosAgilSura(casoSura || {}, liquidadorState)
    );
    setGuardando(true);
    setError('');
    setMensaje('');
    try {
      const actualizado = await sincronizarFotosAgilEnInformeCaso({
        casoId,
        casoBase: casoConSecciones(),
        fotosAgil,
      });
      setCasoSura(actualizado);
      setFotosAgilState(Array.isArray(actualizado?.fotosAgil) ? actualizado.fotosAgil : fotosAgil);
      if (actualizado?.informeUnico) setInformeState(actualizado.informeUnico);
      setMensaje(t('segurosSura.fotosAgil.savedMessage'));
      setAutosaveUiStatus({ state: 'synced', pendingCount: 0, message: 'Sincronizado' });
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosSura.fotosAgil.saveError'));
    } finally {
      setGuardando(false);
    }
  };

  const handleGuardarActual = () => {
    if (tabActivo === TABS_SURA.DOCUMENTOS) return handleGuardarInforme();
    if (tabActivo === TABS_SURA.INFORME_AGIL) return handleGuardarInformeAgil();
    if (tabActivo === TABS_SURA.SALVAMENTO) return handleGuardarSalvamento();
    if (tabActivo === TABS_SURA.FOTOS) return handleGuardarFotosAgil();
    return handleGuardarLiquidador();
  };

  const handleExcelAgil = async () => {
    setError('');
    setExportando(true);
    try {
      await descargarFormatoAgilSuraExcel({
        casoSura: casoConSecciones(),
        informeAgil: informeAgilState,
        liquidador: liquidadorState,
        totales: totalesState,
        informeUnico: informeState,
        salvamento: salvamentoState,
        fotosAgil: fotosAgilState,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || t('segurosSura.workspace.excelError'));
    } finally {
      setExportando(false);
    }
  };

  const puedeGuardar = useMemo(() => {
    if (!casoId || guardando) return false;
    if (tabActivo === TABS_SURA.DOCUMENTOS) return Boolean(informeState);
    if (tabActivo === TABS_SURA.INFORME_AGIL) return Boolean(informeAgilState);
    if (tabActivo === TABS_SURA.SALVAMENTO) return Boolean(salvamentoState);
    if (tabActivo === TABS_SURA.FOTOS) return fotosAgilState != null;
    return Boolean(liquidadorState);
  }, [
    casoId,
    guardando,
    tabActivo,
    informeState,
    informeAgilState,
    salvamentoState,
    fotosAgilState,
    liquidadorState,
  ]);

  const onCasoDesdeAutosave = useCallback((actualizado) => {
    if (actualizado) setCasoSura(actualizado);
  }, []);

  useSuraCasoAutosave({
    casoId,
    casoSura,
    tabActivo,
    liquidadorState,
    totalesState,
    informeState,
    informeAgilState,
    salvamentoState,
    fotosAgilState,
    onCasoActualizado: onCasoDesdeAutosave,
    enabled: Boolean(casoId) && !cargandoCaso,
  });

  const draftPayload = useMemo(
    () => ({
      liquidador: liquidadorState,
      totales: totalesState,
      informe: informeState,
      informeAgil: informeAgilState,
      salvamento: salvamentoState,
      fotosAgil: fotosAgilState,
    }),
    [liquidadorState, totalesState, informeState, informeAgilState, salvamentoState, fotosAgilState]
  );
  const onDraftRestoreAvailable = useCallback((info) => {
    setDraftToRestore(info);
    setShowDraftRestore(true);
  }, []);
  const { draftStatus, lastDraftAt, discardDraft, consumeDraft } = useArnaldFormDraft({
    formKey: casoId ? `sura-ws:${casoId}` : '',
    modulo: 'sura',
    recursoId: casoId || '',
    titulo: 'Workspace Sura',
    formData: draftPayload,
    enabled: Boolean(casoId) && !cargandoCaso,
    onRestoreAvailable: onDraftRestoreAvailable,
  });

  const etiquetasTab = {
    [TABS_SURA.INFORME_AGIL]: t('segurosSura.workspace.tabAgileReport'),
    [TABS_SURA.PRESUPUESTO]: t('segurosSura.workspace.tabBudget'),
    [TABS_SURA.FOTOS]: t('segurosSura.workspace.tabPhotos'),
    [TABS_SURA.DOCUMENTOS]: t('segurosSura.workspace.tabDocuments'),
    [TABS_SURA.SALVAMENTO]: t('segurosSura.workspace.tabSalvage'),
  };

  return (
    <div className={`${root} ${expressScope}`}>
      <div className={expressPageWrap}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-fenix-primario">
              Seguros Sura
            </p>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              {t('segurosSura.workspace.title')}
            </h1>
            <p className="mt-1 font-body text-sm text-gray-600 dark:text-gray-400">{subtitulo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {casoId && (
              <button
                type="button"
                className={expressBtnSecondary}
                disabled={exportando}
                onClick={handleExcelAgil}
              >
                <FaFileExcel />{' '}
                {exportando
                  ? t('segurosSura.workspace.exporting')
                  : t('segurosSura.workspace.downloadAgileExcel')}
              </button>
            )}
            {casoId && (
              <button
                type="button"
                className={expressBtnPrimary}
                disabled={!puedeGuardar}
                onClick={handleGuardarActual}
              >
                <FaSave />{' '}
                {guardando
                  ? t('segurosSura.workspace.saving')
                  : t('segurosSura.workspace.saveCurrent')}
              </button>
            )}
            <Link to="/sura/reporte" className={expressBtnGhost}>
              <FaArrowLeft /> {t('segurosSura.workspace.backReport')}
            </Link>
          </div>
        </div>

        {!casoId && !cargandoCaso && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            {t('segurosSura.workspace.pickCase')}{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => navigate('/sura/reporte')}
            >
              {t('segurosSura.workspace.goReport')}
            </button>
          </p>
        )}

        {mensaje && <p className={`mb-4 ${expressAlertSuccess}`}>{mensaje}</p>}
        {error && <p className={`mb-4 ${expressAlertError}`}>{error}</p>}

        <div className="mb-4 flex flex-wrap gap-2">
          {TABS_ORDEN.map((tab, idx) => (
            <button
              key={tab}
              type="button"
              className={pillClass(tabActivo === tab)}
              onClick={() => setTab(tab)}
            >
              {idx + 1}. {etiquetasTab[tab]}
            </button>
          ))}
        </div>

        <div className={expressCard}>
          <div className={expressCardBody} key={`sura-ws-${casoId}-${restoreNonce}`}>
            {cargandoCaso ? (
              <p className="text-sm text-gray-500">{t('segurosSura.workspace.loading')}</p>
            ) : tabActivo === TABS_SURA.INFORME_AGIL ? (
              <InformeAgilSura
                casoSura={casoSura}
                liquidador={liquidadorState}
                totales={totalesState}
                salvamento={salvamentoState}
                onEstadoChange={setInformeAgilState}
                onGuardarEnCaso={casoId ? handleGuardarInformeAgil : undefined}
                guardandoCaso={guardando}
              />
            ) : tabActivo === TABS_SURA.FOTOS ? (
              <FotosLiquidadorSura
                casoId={casoId}
                fotos={fotosAgilState || []}
                onFotosChange={setFotosAgilState}
                onGuardarEnCaso={casoId ? () => handleGuardarFotosAgil() : undefined}
                onCasoChange={setCasoSura}
                guardandoCaso={guardando}
              />
            ) : tabActivo === TABS_SURA.DOCUMENTOS ? (
              <div>
                <SelectorTipoInformeSura
                  casoSura={casoSura}
                  modoUnicoActivo={mostrarInformeUnico}
                  onElegirUnico={() => setMostrarInformeUnico(true)}
                />
                {mostrarInformeUnico ? (
                  <InformeUnicoSegurosSura
                    casoSura={casoSura}
                    fotosAgil={fotosAgilState || casoSura?.fotosAgil || []}
                    liquidadorInicial={liquidadorState}
                    onEstadoChange={setInformeState}
                    onLiquidadorChange={(liq, tot) => {
                      setLiquidadorState((prev) => fusionarLiquidadorSinPerderPresupuestoNsr(liq, prev));
                      setTotalesState(tot);
                    }}
                    onGuardarEnCaso={casoId ? handleGuardarInforme : undefined}
                    onCasoChange={setCasoSura}
                    guardandoCaso={guardando}
                  />
                ) : (
                  <p className="font-body text-sm text-gray-500 dark:text-gray-400">
                    Elija preliminar o final para abrir el formato de Complex, o informe único
                    para diligenciar el Word de SURA aquí.
                  </p>
                )}
              </div>
            ) : tabActivo === TABS_SURA.SALVAMENTO ? (
              <SalvamentoSura
                casoSura={casoSura}
                onEstadoChange={setSalvamentoState}
                onGuardarEnCaso={casoId ? handleGuardarSalvamento : undefined}
                onCasoChange={setCasoSura}
                guardandoCaso={guardando}
              />
            ) : (
              <LiquidadorSegurosSura
                casoSura={casoSura}
                liquidadorInicial={liquidadorState}
                onEstadoChange={(liq, tot) => {
                  setLiquidadorState((prev) => fusionarLiquidadorSinPerderPresupuestoNsr(liq, prev));
                  setTotalesState(tot);
                }}
                onGuardarEnCaso={casoId ? handleGuardarLiquidador : undefined}
                guardandoCaso={guardando}
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
          setCasoSura((prev) => ({
            ...(prev || {}),
            liquidador: data.liquidador || prev?.liquidador,
            informeUnico: data.informe || prev?.informeUnico,
            informeAgil: data.informeAgil || prev?.informeAgil,
            salvamento: data.salvamento || prev?.salvamento,
            fotosAgil: data.fotosAgil || prev?.fotosAgil,
          }));
          if (data.liquidador) setLiquidadorState(data.liquidador);
          if (data.totales) setTotalesState(data.totales);
          if (data.informe) setInformeState(data.informe);
          if (data.informeAgil) setInformeAgilState(data.informeAgil);
          if (data.salvamento) setSalvamentoState(data.salvamento);
          if (data.fotosAgil) setFotosAgilState(data.fotosAgil);
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
    </div>
  );
}

export function RedirectSuraLiquidador() {
  return <CasoSegurosSuraWorkspace tabInicial={TABS_SURA.PRESUPUESTO} />;
}

export function RedirectSuraInforme() {
  return <CasoSegurosSuraWorkspace tabInicial={TABS_SURA.DOCUMENTOS} />;
}
