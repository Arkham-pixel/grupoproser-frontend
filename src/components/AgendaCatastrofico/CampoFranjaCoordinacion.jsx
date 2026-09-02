import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Campo, InputFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { obtenerDisponibilidadAgendaCatastrofico } from '../../services/agendaCatastroficoService.js';
import {
  HORA_DIA_COMPLETO_FIN,
  HORA_DIA_COMPLETO_INICIO,
  horaAMinutos,
  slotOcupadoPor,
  slotsHoraAgenda,
} from './agendaCatastroficoUtils.js';

function valorDeChange(eOrValor) {
  return eOrValor?.target ? eOrValor.target.value : eOrValor;
}

export default function CampoFranjaCoordinacion({
  labelFecha,
  fecha,
  horaInicio,
  horaFin,
  onFecha,
  onHoraInicio,
  onHoraFin,
  ajustador = '',
  inspector = '',
  casoId = '',
  disabled = false,
}) {
  const { t } = useTranslation();
  const [ocupados, setOcupados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const slots = useMemo(() => slotsHoraAgenda(), []);
  const minDiaCompleto = horaAMinutos(HORA_DIA_COMPLETO_INICIO);
  const maxDiaCompleto = horaAMinutos(HORA_DIA_COMPLETO_FIN);

  useEffect(() => {
    let cancel = false;
    if (!fecha) {
      setOcupados([]);
      return undefined;
    }
    setCargando(true);
    obtenerDisponibilidadAgendaCatastrofico({
      fecha,
      ajustador,
      inspector,
      excludeId: casoId,
    })
      .then((res) => {
        if (!cancel) setOcupados(res.ocupados || []);
      })
      .catch(() => {
        if (!cancel) setOcupados([]);
      })
      .finally(() => {
        if (!cancel) setCargando(false);
      });
    return () => {
      cancel = true;
    };
  }, [fecha, ajustador, inspector, casoId]);

  const iniMin = horaAMinutos(horaInicio);
  const finMin = horaAMinutos(horaFin);
  const esDiaCompleto =
    iniMin != null && finMin != null && iniMin === minDiaCompleto && finMin === maxDiaCompleto;

  const cambiarFecha = (e) => {
    const valor = valorDeChange(e);
    onFecha(e);
    if (!valor) {
      onHoraInicio('');
      onHoraFin('');
    }
  };

  const aplicarFranja = (inicio, fin, minutosInicio, minutosFin) => {
    if (disabled) return;
    const choque = slotOcupadoPor(minutosInicio, minutosFin, ocupados);
    if (choque) return;
    if (iniMin === minutosInicio && finMin === minutosFin) {
      onHoraInicio('');
      onHoraFin('');
      return;
    }
    onHoraInicio(inicio);
    onHoraFin(fin);
  };

  const faltaEquipo = !String(ajustador || '').trim() && !String(inspector || '').trim();

  return (
    <div className="col-span-full grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Campo label={labelFecha}>
        <InputFenix type="date" value={fecha || ''} onChange={cambiarFecha} disabled={disabled} />
      </Campo>
      {fecha ? (
        <div className="col-span-full">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            {t('agendaCatastrofico.pickSlot', {
              defaultValue: 'Franja horaria del ajustador / inspector',
            })}
          </p>
          {faltaEquipo && (
            <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">
              {t('agendaCatastrofico.assignPeopleFirst', {
                defaultValue:
                  'Asigne ajustador o inspector para ver y bloquear su disponibilidad.',
              })}
            </p>
          )}
          <p className="mb-2 text-xs text-gray-500">
            {t('agendaCatastrofico.slotHint', {
              defaultValue:
                'Una visita sencilla bloquea 1 h 40 min (20 min antes, 1 h de inspección y 20 min después). Día completo ocupa de 08:00 a 17:00.',
            })}
          </p>
          {horaInicio && horaFin && (
            <p className="mb-2 text-sm font-semibold text-fenix-primario">
              {t('agendaCatastrofico.selectedRange', {
                defaultValue: 'Asignado: {{inicio}} – {{fin}}',
                inicio: horaInicio,
                fin: horaFin,
              })}
            </p>
          )}
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                disabled ||
                cargando ||
                Boolean(slotOcupadoPor(minDiaCompleto, maxDiaCompleto, ocupados))
              }
              onClick={() =>
                aplicarFranja(
                  HORA_DIA_COMPLETO_INICIO,
                  HORA_DIA_COMPLETO_FIN,
                  minDiaCompleto,
                  maxDiaCompleto
                )
              }
              className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                esDiaCompleto
                  ? 'border-fenix-primario bg-fenix-primario text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
              }`}
            >
              {t('agendaCatastrofico.fullDaySlot', { defaultValue: 'Día completo (08:00–17:00)' })}
            </button>
            <button
              type="button"
              disabled={
                disabled ||
                cargando ||
                Boolean(slotOcupadoPor(iniMin ?? minDiaCompleto, maxDiaCompleto, ocupados))
              }
              onClick={() =>
                aplicarFranja(
                  horaInicio || HORA_DIA_COMPLETO_INICIO,
                  HORA_DIA_COMPLETO_FIN,
                  iniMin ?? minDiaCompleto,
                  maxDiaCompleto
                )
              }
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              {t('agendaCatastrofico.untilEndOfDay', { defaultValue: 'Hasta 17:00' })}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
            {slots.map((slot) => {
              const choque = slotOcupadoPor(slot.minutosInicio, slot.minutosFin, ocupados);
              const seleccionado =
                iniMin != null &&
                finMin != null &&
                slot.minutosInicio === iniMin &&
                slot.minutosFin === finMin;
              const titulo = choque
                ? t('agendaCatastrofico.slotTaken', {
                    defaultValue: '{{inicio}} – {{fin}} · {{quien}} · {{caso}} ({{modulo}})',
                    inicio: choque.horaInicio || slot.inicio,
                    fin: choque.horaFin || slot.fin,
                    quien: [choque.inspector, choque.ajustador].filter(Boolean).join(' / ') || '—',
                    caso: choque.siniestro || choque.consecutivo || choque.asegurado || '',
                    modulo: choque.etiquetaModulo || '',
                  })
                : `${slot.inicio} – ${slot.fin}`;
              return (
                <button
                  key={slot.inicio}
                  type="button"
                  disabled={disabled || Boolean(choque) || cargando}
                  title={titulo}
                  onClick={() =>
                    aplicarFranja(slot.inicio, slot.fin, slot.minutosInicio, slot.minutosFin)
                  }
                  className={`rounded-md border px-2 py-2 text-left text-xs font-medium transition ${
                    choque
                      ? 'cursor-not-allowed border-red-200 bg-red-50 text-red-400 line-through dark:border-red-900 dark:bg-red-950/40 dark:text-red-500'
                      : seleccionado
                        ? 'border-fenix-primario bg-fenix-primario text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-fenix-primario hover:bg-red-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
                  }`}
                >
                  <span className="block">{slot.inicio}</span>
                  <span className="block text-[10px] opacity-80">
                    {choque
                      ? t('agendaCatastrofico.blocked', { defaultValue: 'Ocupado' })
                      : t('agendaCatastrofico.simpleVisit', {
                          defaultValue: 'Sencilla {{fin}}',
                          fin: slot.fin,
                        })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
