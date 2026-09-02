import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCalendarAlt } from 'react-icons/fa';
import { obtenerAgendaCatastroficoHoy } from '../../services/agendaCatastroficoService.js';
import { rutaEventoAgenda, tituloEventoAgenda } from './agendaCatastroficoUtils.js';

const POLL_MS = 60 * 1000;

export default function AgendaCatastroficoMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState([]);
  const cajaRef = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const res = await obtenerAgendaCatastroficoHoy();
      setItems(res.data || []);
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
      if (cajaRef.current && !cajaRef.current.contains(ev.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [abierto, cargar]);

  const hoy = items.length;

  return (
    <div className="relative" ref={cajaRef}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-fenix-primario dark:hover:bg-gray-800"
        title={t('layout.agenda', { defaultValue: 'Agenda catastrófica' })}
        aria-label={t('layout.agenda', { defaultValue: 'Agenda catastrófica' })}
        aria-expanded={abierto}
      >
        <FaCalendarAlt className="text-lg" />
        {hoy > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
            {hoy > 99 ? '99+' : hoy}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {t('agendaCatastrofico.today', { defaultValue: 'Agenda de hoy' })}
            </p>
            <button
              type="button"
              className="text-xs font-medium text-fenix-primario hover:underline"
              onClick={() => {
                setAbierto(false);
                navigate('/agenda-catastrofico');
              }}
            >
              {t('agendaCatastrofico.openCalendar', { defaultValue: 'Ver calendario' })}
            </button>
          </div>
          <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-gray-500">
                {t('agendaCatastrofico.emptyToday', {
                  defaultValue: 'No hay inspecciones coordinadas para hoy.',
                })}
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={`${item.modulo}-${item.id}`}
                  type="button"
                  onClick={() => {
                    setAbierto(false);
                    navigate(rutaEventoAgenda(item));
                  }}
                  className="block w-full border-b border-gray-50 px-3 py-2.5 text-left last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                >
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {item.todoElDia
                      ? t('agendaCatastrofico.allDay', { defaultValue: 'Todo el día' })
                      : `${item.horaInicio} – ${item.horaFin}`}
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      {item.etiquetaModulo}
                    </span>
                  </p>
                  <p className="truncate text-xs text-gray-500">{tituloEventoAgenda(item)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
