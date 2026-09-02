import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export function idDeCaso(caso) {
  return String(caso?._id || caso?.id || '').trim();
}

/** Notificaciones antiguas iban al caso; ahora abren el reporte filtrado. */
export function rutaNotificacionAReporte(ruta = '') {
  const cruda = String(ruta || '').trim();
  if (!cruda) return cruda;
  const reglas = [
    [/^\/zurich\/listado\/caso(\?|$)/i, '/zurich/listado/reporte'],
    [/^\/zurich\/caso(\?|$)/i, '/zurich/reporte'],
    [/^\/seguros-alfa\/caso(\?|$)/i, '/seguros-alfa/reporte'],
    [/^\/sura\/caso(\?|$)/i, '/sura/reporte'],
    [/^\/bbva-cat\/listado\/caso(\?|$)/i, '/bbva-cat/listado/reporte'],
    [/^\/bbva-cat\/caso(\?|$)/i, '/bbva-cat/reporte'],
    [/^\/allianz\/listado\/caso(\?|$)/i, '/allianz/listado/reporte'],
    [/^\/allianz\/caso(\?|$)/i, '/allianz/reporte'],
    [/^\/allianz\/liquidador(\?|$)/i, '/allianz/reporte'],
    [/^\/previsora\/listado\/caso(\?|$)/i, '/previsora/listado/reporte'],
    [/^\/previsora\/caso(\?|$)/i, '/previsora/reporte'],
    [/^\/equidad-cat\/liquidador(\?|$)/i, '/equidad-cat/reporte'],
  ];
  for (const [patron, destino] of reglas) {
    if (patron.test(cruda)) {
      const qs = cruda.includes('?') ? cruda.slice(cruda.indexOf('?')) : '';
      return `${destino}${qs}`;
    }
  }
  return cruda;
}

export function useFiltroCasoExclusivo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const casoIdUrl = String(searchParams.get('casoId') || searchParams.get('id') || '').trim();

  const coincide = useCallback(
    (caso) => {
      if (!casoIdUrl) return true;
      return idDeCaso(caso) === casoIdUrl;
    },
    [casoIdUrl]
  );

  const limpiar = useCallback(() => {
    if (!casoIdUrl) return;
    const next = new URLSearchParams(searchParams);
    next.delete('casoId');
    next.delete('id');
    setSearchParams(next, { replace: true });
  }, [casoIdUrl, searchParams, setSearchParams]);

  return { casoIdUrl, coincide, limpiar, activo: Boolean(casoIdUrl) };
}
