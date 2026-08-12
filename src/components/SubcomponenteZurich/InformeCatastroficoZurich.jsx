import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FaExternalLinkAlt, FaFileAlt, FaSave } from 'react-icons/fa';
import historialService, { TIPOS_FORMULARIOS } from '../../services/historialService.js';
import { actualizarCasoZurich } from '../../services/zurichService.js';
import {
  expressAlertError,
  expressAlertSuccess,
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
  expressFormSection,
  expressSectionTitle,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { Campo, SelectFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { buildCatastroficoNavStateDesdeZurich } from './prefillCatastroficoDesdeZurich.js';
import DisclaimerCatZurich from './DisclaimerCatZurich.jsx';
import InformeUnicoZurich from './InformeUnicoZurich.jsx';
import {
  ACCESO_PREDIO_ZURICH,
  EVIDENCIA_CAT_KEYS,
  EVIDENCIA_CAT_VACIA,
  SEVERIDAD_CAT_ZURICH,
  normalizeEvidenciaCat,
} from './zurichHelpers.js';

const normalizarClaveCaso = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

/**
 * Pestaña Informe Zurich:
 * 1) Formulario CAT (severidad / acceso / evidencias / observaciones)
 * 2) Informe único completo (como Alfa)
 * 3) Acceso opcional al informe catastrófico de Complex
 */
export default function InformeCatastroficoZurich({
  casoZurich = null,
  onCasoChange,
  onEstadoChange,
  onLiquidadorChange,
  onGuardarEnCaso,
  guardandoCaso = false,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [abriendo, setAbriendo] = useState(false);
  const [guardandoCat, setGuardandoCat] = useState(false);

  const [severidadCat, setSeveridadCat] = useState(
    casoZurich?.severidadCat != null ? String(casoZurich.severidadCat) : ''
  );
  const [accesoPredio, setAccesoPredio] = useState(casoZurich?.accesoPredio || '');
  const [observacionesCat, setObservacionesCat] = useState(casoZurich?.observacionesCat || '');
  const [evidenciaCat, setEvidenciaCat] = useState(() =>
    normalizeEvidenciaCat(casoZurich?.evidenciaCat)
  );

  useEffect(() => {
    setSeveridadCat(casoZurich?.severidadCat != null ? String(casoZurich.severidadCat) : '');
    setAccesoPredio(casoZurich?.accesoPredio || '');
    setObservacionesCat(casoZurich?.observacionesCat || '');
    setEvidenciaCat(normalizeEvidenciaCat(casoZurich?.evidenciaCat));
  }, [casoZurich?._id, casoZurich?.updatedAt]);

  const setAplica = (clave, aplica) => {
    setEvidenciaCat((prev) => ({
      ...prev,
      [clave]: { ...(prev[clave] || { aplica: null, observacion: '' }), aplica },
    }));
  };

  const setObservacionItem = (clave, observacion) => {
    setEvidenciaCat((prev) => ({
      ...prev,
      [clave]: { ...(prev[clave] || { aplica: null, observacion: '' }), observacion },
    }));
  };

  const guardarCat = async () => {
    if (!casoZurich?._id) {
      setError(t('zurich.reportUnique.savedCaseRequired'));
      return;
    }
    setGuardandoCat(true);
    setError('');
    setMensaje('');
    try {
      const evidencia = normalizeEvidenciaCat(evidenciaCat);
      const payload = {
        ...casoZurich,
        severidadCat: severidadCat ? Number(severidadCat) : null,
        accesoPredio: accesoPredio || null,
        observacionesCat: observacionesCat || null,
        evidenciaCat: { ...EVIDENCIA_CAT_VACIA, ...evidencia },
      };
      delete payload._id;
      delete payload.__v;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.archivos;
      const actualizado = await actualizarCasoZurich(casoZurich._id, payload);
      onCasoChange?.(actualizado);
      setMensaje(t('zurich.cat.savedOk'));
    } catch (err) {
      setError(err.message || t('zurich.cat.savedError'));
    } finally {
      setGuardandoCat(false);
    }
  };

  const abrirCatastroficoComplex = async () => {
    if (!casoZurich?._id) {
      setError(t('zurich.reportUnique.savedCaseRequired'));
      return;
    }
    setAbriendo(true);
    setError('');
    try {
      const casoConCat = {
        ...casoZurich,
        severidadCat: severidadCat ? Number(severidadCat) : casoZurich.severidadCat,
        accesoPredio: accesoPredio || casoZurich.accesoPredio,
        observacionesCat: observacionesCat || casoZurich.observacionesCat,
        evidenciaCat: normalizeEvidenciaCat(evidenciaCat),
      };
      const stateRetorno = buildCatastroficoNavStateDesdeZurich(
        casoConCat,
        `/zurich/caso?casoId=${casoZurich._id}&tab=informe`
      );

      let idExistente = casoZurich.historialCatastroficoId || null;
      if (!idExistente) {
        const historial = await historialService.obtenerHistorial({
          tipo: TIPOS_FORMULARIOS.CATASTROFICO,
          limite: 1000,
        });
        const clave = normalizarClaveCaso(casoZurich.consecutivo || casoZurich.siniestro);
        const mismoCaso = (Array.isArray(historial) ? historial : [])
          .filter((f) => {
            const posibles = [
              f?.numeroCaso,
              f?.datos?.numeroCaso,
              f?.datos?.zurichCasoId,
            ]
              .map(normalizarClaveCaso)
              .filter(Boolean);
            return (
              posibles.includes(clave) ||
              String(f?.datos?.zurichCasoId || '') === String(casoZurich._id)
            );
          })
          .sort((a, b) => {
            const fa = new Date(a?.fechaModificacion || a?.updatedAt || 0).getTime();
            const fb = new Date(b?.fechaModificacion || b?.updatedAt || 0).getTime();
            return fb - fa;
          });
        idExistente = mismoCaso[0]?._id || mismoCaso[0]?.id || null;
      }

      if (idExistente && idExistente !== casoZurich.historialCatastroficoId) {
        try {
          const actualizado = await actualizarCasoZurich(casoZurich._id, {
            ...casoZurich,
            historialCatastroficoId: String(idExistente),
          });
          onCasoChange?.(actualizado);
        } catch {
          // no bloquea
        }
      }

      if (idExistente) {
        navigate(`/catastrofico/editar/${idExistente}`, { state: stateRetorno });
      } else {
        navigate('/catastrofico', { state: stateRetorno });
      }
    } catch (err) {
      setError(err.message || t('zurich.reportUnique.openError'));
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <div className="space-y-6">
      {error ? <div className={expressAlertError}>{error}</div> : null}
      {mensaje ? <div className={expressAlertSuccess}>{mensaje}</div> : null}

      {/* ——— CAT (Manual Zurich) ——— */}
      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('zurich.sections.catInspection')}</h3>
        <DisclaimerCatZurich className="mb-4" />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('zurich.fields.severidadCat')}>
            <SelectFenix value={severidadCat} onChange={(e) => setSeveridadCat(e.target.value)}>
              <option value="">{t('common.select')}</option>
              {SEVERIDAD_CAT_ZURICH.map((s) => (
                <option key={s.valor} value={String(s.valor)}>
                  {s.label}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <Campo label={t('zurich.fields.accesoPredio')}>
            <SelectFenix value={accesoPredio} onChange={(e) => setAccesoPredio(e.target.value)}>
              <option value="">{t('common.select')}</option>
              {ACCESO_PREDIO_ZURICH.map((op) => (
                <option key={op} value={op}>
                  {t(`zurich.cat.acceso.${op}`, { defaultValue: op })}
                </option>
              ))}
            </SelectFenix>
          </Campo>
        </div>

        <div className="mt-4 space-y-3">
          <p className="mb-1 font-body text-sm font-semibold text-gray-700 dark:text-gray-200">
            {t('zurich.cat.evidenciaTitle')}
          </p>
          <p className="font-body text-xs text-gray-500 dark:text-gray-400">
            {t('zurich.cat.evidenciaHint')}
          </p>
          {EVIDENCIA_CAT_KEYS.map((item) => {
            const fila = evidenciaCat?.[item.key] || { aplica: null, observacion: '' };
            return (
              <div
                key={item.key}
                className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
              >
                <p className="font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {t(`zurich.cat.evidencia.${item.key}`)}
                </p>
                <p className="mb-2 font-body text-xs text-gray-500 dark:text-gray-400">
                  {t(`zurich.cat.evidenciaCuando.${item.obligatorio}`)}
                </p>
                <div className="mb-2 flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 font-body text-sm">
                    <input
                      type="radio"
                      name={`inf-aplica-${item.key}`}
                      checked={fila.aplica === 'SI'}
                      onChange={() => setAplica(item.key, 'SI')}
                    />
                    Aplica
                  </label>
                  <label className="inline-flex items-center gap-2 font-body text-sm">
                    <input
                      type="radio"
                      name={`inf-aplica-${item.key}`}
                      checked={fila.aplica === 'NO'}
                      onChange={() => setAplica(item.key, 'NO')}
                    />
                    No aplica
                  </label>
                </div>
                <textarea
                  className="min-h-[56px] w-full rounded border border-gray-200 bg-white px-2 py-1.5 font-body text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                  value={fila.observacion || ''}
                  onChange={(e) => setObservacionItem(item.key, e.target.value)}
                  placeholder="Observación de esta sección…"
                />
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <Campo label={t('zurich.fields.observacionesCat')}>
            <textarea
              className="min-h-[96px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm text-gray-800 outline-none focus:border-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              value={observacionesCat}
              onChange={(e) => setObservacionesCat(e.target.value)}
              placeholder={t('zurich.placeholders.observacionesCat')}
            />
          </Campo>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={expressBtnPrimary}
            onClick={guardarCat}
            disabled={guardandoCat || !casoZurich?._id}
          >
            <FaSave className="mr-2 inline" />
            {guardandoCat ? t('zurich.actions.saving') : t('zurich.cat.saveCat')}
          </button>
          <button
            type="button"
            className={expressBtnSecondary}
            onClick={abrirCatastroficoComplex}
            disabled={abriendo || !casoZurich?._id}
          >
            <FaFileAlt className="mr-2 inline" />
            {t('zurich.reportUnique.openCatastrofico')}
            <FaExternalLinkAlt className="ml-2 inline text-xs opacity-80" />
          </button>
          <button
            type="button"
            className={expressBtnGhost}
            onClick={() => navigate('/zurich/reporte')}
          >
            {t('zurich.workspace.backToReport')}
          </button>
        </div>
      </section>

      {/* ——— Informe único (como Alfa) ——— */}
      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('zurich.workspace.tabUniqueReport')}</h3>
        <InformeUnicoZurich
          casoZurich={casoZurich}
          onEstadoChange={onEstadoChange}
          onLiquidadorChange={onLiquidadorChange}
          onGuardarEnCaso={onGuardarEnCaso}
          onCasoChange={onCasoChange}
          guardandoCaso={guardandoCaso}
        />
      </section>
    </div>
  );
}
