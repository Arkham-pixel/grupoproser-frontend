import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FaExternalLinkAlt, FaFileAlt, FaSave } from 'react-icons/fa';
import historialService, { TIPOS_FORMULARIOS } from '../../services/historialService.js';
import { actualizarCasoAllias } from '../../services/alliasService.js';
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
import { buildCatastroficoNavStateDesdeAllias } from './prefillCatastroficoDesdeAllias.js';
import DisclaimerCatAllias from './DisclaimerCatAllias.jsx';
import InformeUnicoAllias from './InformeUnicoAllias.jsx';
import {
  ACCESO_PREDIO_ALLIAS,
  EVIDENCIA_CAT_KEYS,
  EVIDENCIA_CAT_VACIA,
  SEVERIDAD_CAT_ALLIAS,
  normalizeEvidenciaCat,
} from './alliasHelpers.js';

const normalizarClaveCaso = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');

/**
 * Pestaña Informe Allias:
 * 1) Formulario CAT (severidad / acceso / evidencias / observaciones)
 * 2) Informe único completo (como Alfa)
 * 3) Acceso opcional al informe catastrófico de Complex
 */
export default function InformeCatastroficoAllias({
  casoAllias = null,
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
    casoAllias?.severidadCat != null ? String(casoAllias.severidadCat) : ''
  );
  const [accesoPredio, setAccesoPredio] = useState(casoAllias?.accesoPredio || '');
  const [observacionesCat, setObservacionesCat] = useState(casoAllias?.observacionesCat || '');
  const [evidenciaCat, setEvidenciaCat] = useState(() =>
    normalizeEvidenciaCat(casoAllias?.evidenciaCat)
  );

  useEffect(() => {
    setSeveridadCat(casoAllias?.severidadCat != null ? String(casoAllias.severidadCat) : '');
    setAccesoPredio(casoAllias?.accesoPredio || '');
    setObservacionesCat(casoAllias?.observacionesCat || '');
    setEvidenciaCat(normalizeEvidenciaCat(casoAllias?.evidenciaCat));
  }, [casoAllias?._id, casoAllias?.updatedAt]);

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
    if (!casoAllias?._id) {
      setError(t('allias.reportUnique.savedCaseRequired'));
      return;
    }
    setGuardandoCat(true);
    setError('');
    setMensaje('');
    try {
      const evidencia = normalizeEvidenciaCat(evidenciaCat);
      const payload = {
        ...casoAllias,
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
      const actualizado = await actualizarCasoAllias(casoAllias._id, payload);
      onCasoChange?.(actualizado);
      setMensaje(t('allias.cat.savedOk'));
    } catch (err) {
      setError(err.message || t('allias.cat.savedError'));
    } finally {
      setGuardandoCat(false);
    }
  };

  const abrirCatastroficoComplex = async () => {
    if (!casoAllias?._id) {
      setError(t('allias.reportUnique.savedCaseRequired'));
      return;
    }
    setAbriendo(true);
    setError('');
    try {
      const casoConCat = {
        ...casoAllias,
        severidadCat: severidadCat ? Number(severidadCat) : casoAllias.severidadCat,
        accesoPredio: accesoPredio || casoAllias.accesoPredio,
        observacionesCat: observacionesCat || casoAllias.observacionesCat,
        evidenciaCat: normalizeEvidenciaCat(evidenciaCat),
      };
      const stateRetorno = buildCatastroficoNavStateDesdeAllias(
        casoConCat,
        `/allias/informe-unico?casoId=${casoAllias._id}&tab=informe`
      );

      let idExistente = casoAllias.historialCatastroficoId || null;
      if (!idExistente) {
        const historial = await historialService.obtenerHistorial({
          tipo: TIPOS_FORMULARIOS.CATASTROFICO,
          limite: 1000,
        });
        const clave = normalizarClaveCaso(casoAllias.consecutivo || casoAllias.siniestro);
        const mismoCaso = (Array.isArray(historial) ? historial : [])
          .filter((f) => {
            const posibles = [
              f?.numeroCaso,
              f?.datos?.numeroCaso,
              f?.datos?.alliasCasoId,
            ]
              .map(normalizarClaveCaso)
              .filter(Boolean);
            return (
              posibles.includes(clave) ||
              String(f?.datos?.alliasCasoId || '') === String(casoAllias._id)
            );
          })
          .sort((a, b) => {
            const fa = new Date(a?.fechaModificacion || a?.updatedAt || 0).getTime();
            const fb = new Date(b?.fechaModificacion || b?.updatedAt || 0).getTime();
            return fb - fa;
          });
        idExistente = mismoCaso[0]?._id || mismoCaso[0]?.id || null;
      }

      if (idExistente && idExistente !== casoAllias.historialCatastroficoId) {
        try {
          const actualizado = await actualizarCasoAllias(casoAllias._id, {
            ...casoAllias,
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
      setError(err.message || t('allias.reportUnique.openError'));
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <div className="space-y-6">
      {error ? <div className={expressAlertError}>{error}</div> : null}
      {mensaje ? <div className={expressAlertSuccess}>{mensaje}</div> : null}

      {/* ——— CAT (Manual Allias) ——— */}
      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('allias.sections.catInspection')}</h3>
        <DisclaimerCatAllias className="mb-4" />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Campo label={t('allias.fields.severidadCat')}>
            <SelectFenix value={severidadCat} onChange={(e) => setSeveridadCat(e.target.value)}>
              <option value="">{t('common.select')}</option>
              {SEVERIDAD_CAT_ALLIAS.map((s) => (
                <option key={s.valor} value={String(s.valor)}>
                  {s.label}
                </option>
              ))}
            </SelectFenix>
          </Campo>
          <Campo label={t('allias.fields.accesoPredio')}>
            <SelectFenix value={accesoPredio} onChange={(e) => setAccesoPredio(e.target.value)}>
              <option value="">{t('common.select')}</option>
              {ACCESO_PREDIO_ALLIAS.map((op) => (
                <option key={op} value={op}>
                  {t(`allias.cat.acceso.${op}`, { defaultValue: op })}
                </option>
              ))}
            </SelectFenix>
          </Campo>
        </div>

        <div className="mt-4 space-y-3">
          <p className="mb-1 font-body text-sm font-semibold text-gray-700 dark:text-gray-200">
            {t('allias.cat.evidenciaTitle')}
          </p>
          <p className="font-body text-xs text-gray-500 dark:text-gray-400">
            {t('allias.cat.evidenciaHint')}
          </p>
          {EVIDENCIA_CAT_KEYS.map((item) => {
            const fila = evidenciaCat?.[item.key] || { aplica: null, observacion: '' };
            return (
              <div
                key={item.key}
                className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
              >
                <p className="font-body text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {t(`allias.cat.evidencia.${item.key}`)}
                </p>
                <p className="mb-2 font-body text-xs text-gray-500 dark:text-gray-400">
                  {t(`allias.cat.evidenciaCuando.${item.obligatorio}`)}
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
          <Campo label={t('allias.fields.observacionesCat')}>
            <textarea
              className="min-h-[96px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm text-gray-800 outline-none focus:border-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              value={observacionesCat}
              onChange={(e) => setObservacionesCat(e.target.value)}
              placeholder={t('allias.placeholders.observacionesCat')}
            />
          </Campo>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={expressBtnPrimary}
            onClick={guardarCat}
            disabled={guardandoCat || !casoAllias?._id}
          >
            <FaSave className="mr-2 inline" />
            {guardandoCat ? t('allias.actions.saving') : t('allias.cat.saveCat')}
          </button>
          <button
            type="button"
            className={expressBtnSecondary}
            onClick={abrirCatastroficoComplex}
            disabled={abriendo || !casoAllias?._id}
          >
            <FaFileAlt className="mr-2 inline" />
            {t('allias.reportUnique.openCatastrofico')}
            <FaExternalLinkAlt className="ml-2 inline text-xs opacity-80" />
          </button>
          <button
            type="button"
            className={expressBtnGhost}
            onClick={() => navigate('/allias/reporte')}
          >
            {t('allias.workspace.backToReport')}
          </button>
        </div>
      </section>

      {/* ——— Informe único (como Alfa) ——— */}
      <section className={expressFormSection}>
        <h3 className={expressSectionTitle}>{t('allias.workspace.tabUniqueReport')}</h3>
        <InformeUnicoAllias
          casoAllias={casoAllias}
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
