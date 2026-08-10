import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api.js';

const LanguageContext = createContext(null);
const VALID_LOCALES = new Set(['es', 'en']);

/** Normaliza códigos tipo en-US / es-CO a es|en. */
// eslint-disable-next-line react-refresh/only-export-components -- La normalización se reutiliza fuera del proveedor.
export function normalizeLocale(lang) {
  const raw = String(lang || '').toLowerCase().trim();
  if (raw.startsWith('en')) return 'en';
  if (raw.startsWith('es')) return 'es';
  return 'es';
}

function readStoredLocale() {
  try {
    return normalizeLocale(localStorage.getItem('appLocale') || 'es');
  } catch {
    return 'es';
  }
}

export function LanguageProvider({ children }) {
  const { i18n } = useTranslation();
  const [locale, setLocaleState] = useState(() =>
    normalizeLocale(i18n.language || i18n.resolvedLanguage || readStoredLocale())
  );

  // Mantener estado local sincronizado con i18n (changeLanguage, detector, login).
  useEffect(() => {
    const sync = (lng) => {
      const next = normalizeLocale(lng || i18n.language || i18n.resolvedLanguage);
      setLocaleState(next);
      try {
        localStorage.setItem('appLocale', next);
      } catch {
        /* ignore */
      }
      document.documentElement.lang = next;
    };

    sync(i18n.language);
    i18n.on('languageChanged', sync);
    return () => {
      i18n.off('languageChanged', sync);
    };
  }, [i18n]);

  // Al montar: forzar el locale persistido (evita que el detector pise la preferencia).
  useEffect(() => {
    const stored = readStoredLocale();
    if (normalizeLocale(i18n.language) !== stored) {
      i18n.changeLanguage(stored);
    }
    document.documentElement.lang = stored;
    document.documentElement.setAttribute('translate', 'no');
    document.documentElement.classList.add('notranslate');
  }, [i18n]);

  const setLocale = useCallback(
    async (nextLocale, { sync = true } = {}) => {
      const normalized = normalizeLocale(nextLocale);
      if (!VALID_LOCALES.has(normalized)) return;
      if (normalized === locale && normalizeLocale(i18n.language) === normalized) return;

      await i18n.changeLanguage(normalized);
      localStorage.setItem('appLocale', normalized);
      document.documentElement.lang = normalized;
      setLocaleState(normalized);

      if (sync && localStorage.getItem('token')) {
        try {
          await api.patch('/api/secur-auth/perfil/locale', { locale: normalized });
        } catch {
          // El idioma local sigue siendo válido cuando el servidor no está disponible.
        }
      }
    },
    [i18n, locale]
  );

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- El hook es la API pública del contexto.
export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage debe usarse dentro de LanguageProvider');
  return value;
}
