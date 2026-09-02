import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaBell } from 'react-icons/fa';
import {
  marcarNotificacionOperativaLeida,
  marcarTodasNotificacionesOperativasLeidas,
  obtenerMisNotificacionesOperativas,
} from '../services/notificacionesOperativasService.js';
import {
  habilitarAudioNotificaciones,
  reproducirTimbreNotificacion,
} from '../utils/timbreNotificacion.js';
import { rutaNotificacionAReporte } from '../utils/filtroCasoExclusivo.js';

const POLL_MS = 8 * 1000;

function tiempoRelativo(fecha, t) {
  const ms = Date.now() - new Date(fecha).getTime();
  if (Number.isNaN(ms) || ms < 0) return '';
  const min = Math.floor(ms / 60000);
  if (min < 1) return t('notifications.justNow');
  if (min < 60) return t('notifications.minutesAgo', { count: min });
  const horas = Math.floor(min / 60);
  if (horas < 24) return t('notifications.hoursAgo', { count: horas });
  const dias = Math.floor(horas / 24);
  return t('notifications.daysAgo', { count: dias });
}

export default function NotificacionesOperativasMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const cajaRef = useRef(null);
  const abiertoRef = useRef(false);
  const noLeidasPrevRef = useRef(null);

  useEffect(() => {
    abiertoRef.current = abierto;
  }, [abierto]);

  useEffect(() => {
    const desbloquear = () => habilitarAudioNotificaciones();
    document.addEventListener('pointerdown', desbloquear, { once: true });
    document.addEventListener('keydown', desbloquear, { once: true });
    return () => {
      document.removeEventListener('pointerdown', desbloquear);
      document.removeEventListener('keydown', desbloquear);
    };
  }, []);

  const cargar = useCallback(async () => {
    try {
      const res = await obtenerMisNotificacionesOperativas();
      const siguiente = res.noLeidas || 0;
      const anterior = noLeidasPrevRef.current;
      if (anterior !== null && siguiente > anterior && !abiertoRef.current) {
        reproducirTimbreNotificacion();
      }
      noLeidasPrevRef.current = siguiente;
      setItems(res.data || []);
      setNoLeidas(siguiente);
    } catch {
      /* sin contador */
    }
  }, []);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') cargar();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [cargar]);

  useEffect(() => {
    if (!abierto) return undefined;
    cargar();
    const onClick = (ev) => {
      if (cajaRef.current && !cajaRef.current.contains(ev.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [abierto, cargar]);

  const abrirNotificacion = async (item) => {
    setAbierto(false);
    if (item?._id && !item.leida) {
      try {
        await marcarNotificacionOperativaLeida(item._id);
        setItems((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, leida: true } : n))
        );
        setNoLeidas((n) => Math.max(0, n - 1));
      } catch {
        /* se verá en el próximo poll */
      }
    }
    if (item?.ruta) navigate(rutaNotificacionAReporte(item.ruta));
  };

  const marcarTodas = async () => {
    try {
      await marcarTodasNotificacionesOperativasLeidas();
      setItems((prev) => prev.map((n) => ({ ...n, leida: true })));
      setNoLeidas(0);
    } catch {
      /* ignore */
    }
  };

  const hayPendientes = noLeidas > 0 && !abierto;

  return (
    <div className="relative" ref={cajaRef}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`relative flex h-11 w-11 items-center justify-center rounded-lg transition hover:bg-gray-100 hover:text-fenix-primario dark:hover:bg-gray-800 ${
          hayPendientes ? 'text-fenix-primario' : 'text-gray-500'
        }`}
        title={t('layout.notifications')}
        aria-label={
          hayPendientes
            ? t('notifications.unreadAria', { count: noLeidas })
            : t('layout.notifications')
        }
        aria-expanded={abierto}
      >
        <FaBell className={`text-lg ${hayPendientes ? 'notif-bell-icon--activa' : ''}`} />
        {noLeidas > 0 && (
          <span
            className={`absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-fenix-primario px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900 ${
              hayPendientes ? 'notif-bell-badge--activa' : ''
            }`}
          >
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {t('layout.notifications')}
            </p>
            {noLeidas > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-fenix-primario hover:underline"
                onClick={marcarTodas}
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>
          <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-gray-500">
                {t('notifications.empty')}
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => abrirNotificacion(item)}
                  className={`block w-full border-b border-gray-50 px-3 py-2.5 text-left last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800 ${
                    item.leida ? 'opacity-70' : ''
                  }`}
                >
                  <span
                    className={`block text-sm ${
                      item.leida
                        ? 'font-normal text-gray-700 dark:text-gray-300'
                        : 'font-semibold text-gray-900 dark:text-gray-50'
                    }`}
                  >
                    {item.titulo}
                  </span>
                  {item.mensaje && (
                    <span className="mt-0.5 block truncate text-xs text-gray-500">
                      {item.mensaje}
                    </span>
                  )}
                  <span className="mt-1 block text-[11px] text-gray-400">
                    {tiempoRelativo(item.createdAt, t)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
