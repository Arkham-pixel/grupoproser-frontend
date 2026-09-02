import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FaChevronLeft,
  FaChevronRight,
  FaCalendarDay,
  FaCalendarWeek,
} from 'react-icons/fa';
import { obtenerEventosAgendaCatastrofico, obtenerPersonasAgendaCatastrofico } from '../../services/agendaCatastroficoService.js';
import {
  addDaysYmd,
  COLORES_MODULO_AGENDA,
  detalleHoverAgenda,
  diasSemana,
  etiquetaDiaCorto,
  etiquetaMes,
  HORA_FIN_AGENDA,
  HORA_INICIO_AGENDA,
  horaAMinutos,
  inicioSemanaYmd,
  rutaEventoAgenda,
  tituloEventoAgenda,
  ymdLocal,
} from './agendaCatastroficoUtils.js';

const PX_HORA = 52;

function colorModulo(modulo) {
  return COLORES_MODULO_AGENDA[modulo] || 'bg-gray-600';
}

function TooltipHoverAgenda({ ev, x, y, t }) {
  if (!ev || typeof document === 'undefined') return null;
  const d = detalleHoverAgenda(ev, t);
  const left = Math.min(x + 14, window.innerWidth - 280);
  const top = Math.min(y + 16, window.innerHeight - 160);
  return createPortal(
    <div
      className="pointer-events-none fixed z-[80] max-w-[16.5rem] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-xl dark:border-gray-700 dark:bg-gray-900"
      style={{ left, top }}
      role="tooltip"
    >
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{d.hora}</p>
      {d.personas.length ? (
        d.personas.map((p) => (
          <p key={`${p.rol}-${p.nombre}`} className="mt-0.5 text-gray-700 dark:text-gray-200">
            <span className="text-gray-500">{p.rol}:</span> {p.nombre}
          </p>
        ))
      ) : (
        <p className="mt-0.5 text-gray-500">
          {t('agendaCatastrofico.unassigned', { defaultValue: 'Sin ajustador ni inspector' })}
        </p>
      )}
      {(d.caso || d.asegurado) && (
        <p className="mt-1 truncate text-gray-500">
          {[d.caso, d.asegurado].filter(Boolean).join(' · ')}
        </p>
      )}
      {d.modulo ? <p className="text-[10px] uppercase tracking-wide text-gray-400">{d.modulo}</p> : null}
    </div>,
    document.body
  );
}

function EventoBloque({ ev, onOpen, onHover }) {
  const ini = horaAMinutos(ev.horaInicio) ?? HORA_INICIO_AGENDA * 60;
  const fin = horaAMinutos(ev.horaFin) ?? ini + 60;
  const top = ((ini - HORA_INICIO_AGENDA * 60) / 60) * PX_HORA;
  const height = Math.max(22, ((fin - ini) / 60) * PX_HORA - 2);
  return (
    <button
      type="button"
      onClick={() => onOpen(ev)}
      onMouseEnter={(e) => onHover(ev, e.clientX, e.clientY)}
      onMouseMove={(e) => onHover(ev, e.clientX, e.clientY)}
      onMouseLeave={() => onHover(null)}
      className={`absolute left-1 right-1 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight text-white shadow-sm ${colorModulo(ev.modulo)}`}
      style={{ top, height }}
    >
      <span className="block font-semibold">
        {ev.horaInicio}–{ev.horaFin} {ev.inspector || ev.ajustador || ''}
      </span>
      <span className="block truncate opacity-90">
        {ev.siniestro || ev.consecutivo} {ev.asegurado ? `· ${ev.asegurado}` : ''}
      </span>
    </button>
  );
}

export default function AgendaCatastroficoPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fechaUrl = ymdLocal(searchParams.get('fecha') || '');
  const locale = i18n.language?.startsWith('en') ? 'en' : 'es';
  const [vista, setVista] = useState(fechaUrl ? 'dia' : 'semana');
  const [ancla, setAncla] = useState(fechaUrl || ymdLocal());
  const [persona, setPersona] = useState('');
  const [rolVista, setRolVista] = useState('');
  const [eventos, setEventos] = useState([]);
  const [personas, setPersonas] = useState({ ajustadores: [], inspectores: [] });
  const [alcance, setAlcance] = useState('global');
  const [cargando, setCargando] = useState(false);
  const [hover, setHover] = useState(null);

  const lunes = useMemo(() => inicioSemanaYmd(ancla), [ancla]);
  const dias = useMemo(
    () => (vista === 'dia' ? [ancla] : diasSemana(lunes)),
    [vista, ancla, lunes]
  );
  const desde = dias[0];
  const hasta = dias[dias.length - 1];

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await obtenerEventosAgendaCatastrofico({
        desde,
        hasta,
        persona,
        rol: rolVista,
      });
      setEventos(res.data || []);
      setAlcance(res.alcance || 'global');
    } catch {
      setEventos([]);
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, persona, rolVista]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!fechaUrl) return;
    setAncla(fechaUrl);
    setVista('dia');
  }, [fechaUrl]);

  useEffect(() => {
    obtenerPersonasAgendaCatastrofico()
      .then(setPersonas)
      .catch(() => setPersonas({ ajustadores: [], inspectores: [] }));
  }, []);

  const horas = useMemo(
    () => Array.from({ length: HORA_FIN_AGENDA - HORA_INICIO_AGENDA }, (_, i) => HORA_INICIO_AGENDA + i),
    []
  );

  const porDia = useMemo(() => {
    const map = {};
    for (const d of dias) map[d] = { timed: [], allDay: [] };
    for (const ev of eventos) {
      if (!map[ev.fecha]) continue;
      if (ev.todoElDia) map[ev.fecha].allDay.push(ev);
      else map[ev.fecha].timed.push(ev);
    }
    return map;
  }, [dias, eventos]);

  const nombresUnicos = useMemo(() => {
    const seen = new Map();
    for (const p of [...personas.ajustadores, ...personas.inspectores]) {
      const k = String(p.nombre || '').trim().toUpperCase();
      if (k && !seen.has(k)) seen.set(k, p.nombre);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, 'es'));
  }, [personas]);

  const mostrarHover = (ev, x, y) => {
    if (!ev) {
      setHover(null);
      return;
    }
    setHover({ ev, x, y });
  };

  const mover = (dir) => {
    const step = vista === 'dia' ? 1 : 7;
    setAncla((prev) => addDaysYmd(prev, dir * step));
  };

  const tituloRango =
    vista === 'dia'
      ? etiquetaDiaCorto(ancla, locale)
      : `${etiquetaDiaCorto(desde, locale)} – ${etiquetaDiaCorto(hasta, locale)}`;

  return (
    <div className="min-h-full bg-fenix-fondo p-4 dark:bg-[#0F0F0F] sm:p-6">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('agendaCatastrofico.title', { defaultValue: 'Agenda catastrófica' })}
          </h1>
          <p className="text-sm text-gray-500">
            {t('agendaCatastrofico.subtitle', {
              defaultValue:
                'Inspecciones coordinadas de ajustadores e inspectores. Las franjas ocupadas no se pueden volver a asignar.',
            })}
            {alcance === 'asignados'
              ? ` ${t('agendaCatastrofico.onlyMine', {
                  defaultValue: 'Solo ves los casos donde figuras como ajustador o inspector.',
                })}`
              : alcance === 'area'
                ? ` ${t('agendaCatastrofico.areaLead', {
                    defaultValue: 'Como líder de área ves todas las inspecciones de tu módulo.',
                  })}`
                : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
            onClick={() => setAncla(ymdLocal())}
          >
            {t('agendaCatastrofico.todayBtn', { defaultValue: 'Hoy' })}
          </button>
          <button type="button" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => mover(-1)}>
            <FaChevronLeft />
          </button>
          <button type="button" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => mover(1)}>
            <FaChevronRight />
          </button>
          <p className="min-w-[12rem] text-sm font-semibold capitalize text-gray-800 dark:text-gray-100">
            {etiquetaMes(ancla, locale)} · {tituloRango}
          </p>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              className={`flex items-center gap-1 px-3 py-2 text-sm ${vista === 'semana' ? 'bg-fenix-primario text-white' : ''}`}
              onClick={() => setVista('semana')}
            >
              <FaCalendarWeek /> {t('agendaCatastrofico.week', { defaultValue: 'Semana' })}
            </button>
            <button
              type="button"
              className={`flex items-center gap-1 px-3 py-2 text-sm ${vista === 'dia' ? 'bg-fenix-primario text-white' : ''}`}
              onClick={() => setVista('dia')}
            >
              <FaCalendarDay /> {t('agendaCatastrofico.day', { defaultValue: 'Día' })}
            </button>
          </div>
          {alcance !== 'asignados' && (
          <>
          <select
            className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={rolVista}
            onChange={(e) => setRolVista(e.target.value)}
          >
            <option value="">{t('agendaCatastrofico.allRoles', { defaultValue: 'Ajustadores e inspectores' })}</option>
            <option value="ajustador">{t('roles.ajustador', { defaultValue: 'Ajustador' })}</option>
            <option value="inspector">{t('roles.inspector', { defaultValue: 'Inspector' })}</option>
          </select>
          <select
            className="max-w-[16rem] rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
          >
            <option value="">{t('agendaCatastrofico.allPeople', { defaultValue: 'Todo el equipo' })}</option>
            {nombresUnicos.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          </>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        {cargando && (
          <p className="border-b border-gray-100 px-3 py-2 text-xs text-gray-500 dark:border-gray-800">
            {t('common.loading', { defaultValue: 'Cargando…' })}
          </p>
        )}
        <div className="grid" style={{ gridTemplateColumns: `4rem repeat(${dias.length}, minmax(0, 1fr))` }}>
          <div className="border-b border-gray-100 bg-gray-50 p-2 text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-900" />
          {dias.map((d) => (
            <div
              key={d}
              className={`border-b border-l border-gray-100 p-2 text-center text-sm font-semibold capitalize dark:border-gray-800 ${
                d === ymdLocal() ? 'bg-red-50 text-fenix-primario dark:bg-red-950/30' : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              {etiquetaDiaCorto(d, locale)}
            </div>
          ))}

          <div className="border-b border-gray-100 px-1 py-1 text-[10px] text-gray-400 dark:border-gray-800">
            {t('agendaCatastrofico.allDay', { defaultValue: 'Todo el día' })}
          </div>
          {dias.map((d) => (
            <div key={`all-${d}`} className="min-h-[2.5rem] space-y-1 border-b border-l border-gray-100 p-1 dark:border-gray-800">
              {(porDia[d]?.allDay || []).map((ev) => (
                <button
                  key={`${ev.modulo}-${ev.id}`}
                  type="button"
                  onClick={() => navigate(rutaEventoAgenda(ev))}
                  onMouseEnter={(e) => mostrarHover(ev, e.clientX, e.clientY)}
                  onMouseMove={(e) => mostrarHover(ev, e.clientX, e.clientY)}
                  onMouseLeave={() => mostrarHover(null)}
                  className={`block w-full truncate rounded px-1 py-0.5 text-left text-[11px] text-white ${colorModulo(ev.modulo)}`}
                >
                  {tituloEventoAgenda(ev)}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="max-h-[min(70vh,44rem)] overflow-auto">
          <div className="grid" style={{ gridTemplateColumns: `4rem repeat(${dias.length}, minmax(0, 1fr))` }}>
            <div>
              {horas.map((h) => (
                <div
                  key={h}
                  className="border-b border-gray-50 pr-2 text-right text-[11px] text-gray-400 dark:border-gray-900"
                  style={{ height: PX_HORA }}
                >
                  {`${String(h).padStart(2, '0')}:00`}
                </div>
              ))}
            </div>
            {dias.map((d) => (
              <div
                key={`col-${d}`}
                className="relative border-l border-gray-100 dark:border-gray-800"
                style={{ height: horas.length * PX_HORA }}
              >
                {horas.map((h) => (
                  <div
                    key={`${d}-${h}`}
                    className="border-b border-gray-50 dark:border-gray-900"
                    style={{ height: PX_HORA }}
                  />
                ))}
                {(porDia[d]?.timed || []).map((ev) => (
                  <EventoBloque
                    key={`${ev.modulo}-${ev.id}`}
                    ev={ev}
                    onHover={mostrarHover}
                    onOpen={(item) => navigate(rutaEventoAgenda(item))}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {hover?.ev ? <TooltipHoverAgenda ev={hover.ev} x={hover.x} y={hover.y} t={t} /> : null}
    </div>
  );
}
