import { useEffect, useState } from 'react';

/**
 * Suscribe a un media query CSS y devuelve si coincide.
 * @param {string} query ej. '(min-width: 768px)'
 */
export function useMediaQuery(query) {
  const getMatch = () =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false;

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
}

/** Contenido cards / FilterSheet: &lt; md (768px) */
export function useIsMobileContent() {
  return !useMediaQuery('(min-width: 768px)');
}

/** Shell drawer: &lt; lg (1024px) */
export function useIsMobileShell() {
  return !useMediaQuery('(min-width: 1024px)');
}

export default useMediaQuery;
