import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileAlt, FaFileSignature, FaFileWord } from 'react-icons/fa';
import {
  expressFormSection,
  expressSectionTitle,
} from '../SubcomponenteExpress/expressFenixUi.js';
import { normalizarTipoInformePrevisora } from './liquidadorPrevisoraHelpers.js';

const cardBase =
  'flex h-full flex-col rounded-xl border p-4 text-left transition hover:border-fenix-primario/50 disabled:cursor-not-allowed disabled:opacity-60';
const cardIdle =
  'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900';
const cardActive =
  'border-fenix-primario bg-fenix-primario/5 dark:border-fenix-primario dark:bg-fenix-primario/10';

/**
 * Selector de informe preliminar / final / único (Previsora).
 * Preliminar y final se complementan; el único es el expediente aparte.
 * Final y único se alimentan del liquidador (presupuesto NSR-10).
 */
export default function SelectorTipoInformePrevisora({
  tipo = 'unico',
  onElegir,
  disabled = false,
  compacto = false,
}) {
  const { t } = useTranslation();
  const actual = normalizarTipoInformePrevisora(tipo, 'unico');

  return (
    <section className={compacto ? 'mb-4' : expressFormSection}>
      <h3 className={expressSectionTitle}>{t('previsora.reportUnique.typeLabel')}</h3>
      <p className="mb-3 font-body text-sm text-gray-600 dark:text-gray-400">
        {t('previsora.reportUnique.typeHint')}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          disabled={disabled}
          className={`${cardBase} ${actual === 'preliminar' ? cardActive : cardIdle}`}
          onClick={() => onElegir?.('preliminar')}
        >
          <FaFileAlt className="mb-2 text-fenix-primario" />
          <span className="font-body text-sm font-semibold text-gray-900 dark:text-white">
            {t('previsora.reportUnique.typePreliminar')}
          </span>
          <span className="mt-1 font-body text-xs text-gray-500">
            {t('previsora.reportUnique.typePreliminarHint')}
          </span>
        </button>
        <button
          type="button"
          disabled={disabled}
          className={`${cardBase} ${actual === 'final' ? cardActive : cardIdle}`}
          onClick={() => onElegir?.('final')}
        >
          <FaFileSignature className="mb-2 text-fenix-primario" />
          <span className="font-body text-sm font-semibold text-gray-900 dark:text-white">
            {t('previsora.reportUnique.typeFinal')}
          </span>
          <span className="mt-1 font-body text-xs text-gray-500">
            {t('previsora.reportUnique.typeFinalHint')}
          </span>
        </button>
        <button
          type="button"
          disabled={disabled}
          className={`${cardBase} ${actual === 'unico' ? cardActive : cardIdle}`}
          onClick={() => onElegir?.('unico')}
        >
          <FaFileWord className="mb-2 text-fenix-primario" />
          <span className="font-body text-sm font-semibold text-gray-900 dark:text-white">
            {t('previsora.reportUnique.typeUnico')}
          </span>
          <span className="mt-1 font-body text-xs text-gray-500">
            {t('previsora.reportUnique.typeUnicoHint')}
          </span>
        </button>
      </div>
    </section>
  );
}
