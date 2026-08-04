import { useTranslation } from 'react-i18next';

/** Selector para incluir junto a cada acción de descargar, enviar o exportar. */
export default function DocumentLanguageSelector({ value = 'es', onChange, id = 'document-language' }) {
  const { t } = useTranslation();
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm text-gray-700">
      <span>{t('language.label')}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="rounded border border-gray-300 bg-white px-2 py-1"
      >
        <option value="es">{t('language.spanish')}</option>
        <option value="en">{t('language.english')}</option>
      </select>
    </label>
  );
}
