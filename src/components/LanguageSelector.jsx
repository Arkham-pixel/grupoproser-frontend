import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSelector({ compact = false }) {
  const { t } = useTranslation();
  const { locale, setLocale } = useLanguage();

  return (
    <label className={`flex items-center gap-2 ${compact ? '' : 'text-sm text-gray-600'}`}>
      {!compact && <span>{t('language.label')}</span>}
      <select
        aria-label={t('language.label')}
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
        className={`rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 shadow-sm focus:border-fenix-primario focus:outline-none ${
          compact ? 'min-w-[4.5rem]' : ''
        }`}
      >
        <option value="es">{compact ? 'ES' : t('language.spanish')}</option>
        <option value="en">{compact ? 'EN' : t('language.english')}</option>
      </select>
    </label>
  );
}
