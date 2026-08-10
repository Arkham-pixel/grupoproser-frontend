import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer } from 'recharts';
import { FaChartBar, FaChartLine, FaCheckCircle, FaClipboardList, FaExclamationTriangle, FaInbox, FaInfoCircle, FaTable } from 'react-icons/fa';
import { esUsuarioGerenteFacturacion } from '../../config/gerentesFacturacion';
import {
  combinarFechaHoraInputs,
  combinarHora12A24,
  horaActualHHMM,
  normalizarHoraEscrita,
  partirFechaHoraParaInputs,
  partirHora12Desde24,
} from '../../utils/complexFechaHoraUtils.js';
import {
  complexBadge,
  complexBtnFormAction,
  complexBtnDanger,
  complexBtnGhost,
  complexHint,
  complexNavTabActive,
  complexNavTabIdle,
  complexCard,
  complexCardBody,
  complexCardHeader,
  complexChartCard,
  complexInput,
  complexLabel,
  complexMetricCard,
  complexModalOverlay,
  complexPageSubtitle,
  complexPageTitle,
  complexSelect,
} from './complexFenixUi.js';

const COMPLEX_AVISO_ESTILOS = {
  warning: {
    icon: FaExclamationTriangle,
    iconWrap: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-900/50',
  },
  error: {
    icon: FaExclamationTriangle,
    iconWrap: 'bg-red-50 text-fenix-primario dark:bg-red-950/40 dark:text-red-400',
    border: 'border-red-200 dark:border-red-900/50',
  },
  info: {
    icon: FaInfoCircle,
    iconWrap: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700',
  },
  success: {
    icon: FaCheckCircle,
    iconWrap: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
    border: 'border-gray-200 dark:border-gray-700',
  },
};

/** Modal de aviso/confirmación dentro de la plataforma (sin alert/confirm del navegador) */
export function ComplexAvisoModal({
  open,
  onClose,
  titulo,
  mensaje = '',
  tipo = 'info',
  botonTexto,
  onConfirm,
  confirmTexto,
  cancelTexto,
  confirmVariant = 'danger',
  zIndexClass = 'z-[60]',
}) {
  const { t } = useTranslation();
  if (!open) return null;

  const tituloFinal = titulo ?? t('complex.ui.complex_ui_blocks.atencion');
  const botonTextoFinal = botonTexto ?? t('complex.ui.complex_ui_blocks.entendido');
  const confirmTextoFinal = confirmTexto ?? t('complex.ui.complex_ui_blocks.si');
  const cancelTextoFinal = cancelTexto ?? t('complex.ui.complex_ui_blocks.no');

  const estilo = COMPLEX_AVISO_ESTILOS[tipo] || COMPLEX_AVISO_ESTILOS.info;
  const Icono = estilo.icon;
  const esConfirmacion = typeof onConfirm === 'function';
  const confirmClass = confirmVariant === 'danger' ? complexBtnDanger : complexBtnFormAction;

  return (
    <div
      className={`${complexModalOverlay} ${zIndexClass} backdrop-blur-[2px]`}
      role="presentation"
      onClick={onClose}
    >      <div
        className={`w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-[#1A1A1A] ${estilo.border}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="complex-aviso-titulo"
        aria-describedby="complex-aviso-mensaje"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 px-5 py-5 sm:px-6">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${estilo.iconWrap}`}
          >
            <Icono className="text-xl" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              id="complex-aviso-titulo"
              className="font-heading text-lg font-bold text-gray-900 dark:text-white"
            >
              {tituloFinal}
            </h2>
            <p
              id="complex-aviso-mensaje"
              className="mt-2 whitespace-pre-line font-body text-sm leading-relaxed text-gray-600 dark:text-gray-300"
            >
              {mensaje}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          {esConfirmacion ? (
            <>
              <button type="button" className={complexBtnFormAction} onClick={onClose}>
                {cancelTextoFinal}
              </button>
              <button type="button" className={confirmClass} onClick={onConfirm}>
                {confirmTextoFinal}
              </button>
            </>
          ) : (
            <button type="button" className={complexBtnFormAction} onClick={onClose}>
              {botonTextoFinal}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function navComplexItems() {
  const base = [
    { path: '/complex/dashboard', icon: FaChartLine, labelKey: 'nav.dashboard' },
    { path: '/complex/indicadores-alertas', icon: FaChartBar, labelKey: 'nav.indicators' },
    { path: '/complex/excel', icon: FaTable, labelKey: 'nav.report' },
    { path: '/complex/mis-casos', icon: FaClipboardList, labelKey: 'nav.myCases' },
  ];
  const login = localStorage.getItem('login') || '';
  if (esUsuarioGerenteFacturacion(login)) {
    return [
      ...base,
      { path: '/complex/bandeja-facturacion', icon: FaInbox, labelKey: 'nav.billingTray' },
    ];
  }
  return base;
}

export function ComplexNavTabs({ activePath }) {
  const { t: translate } = useTranslation();
  const items = navComplexItems();
  return (
    <nav className="flex flex-wrap gap-2" aria-label={translate("complex.ui.complex_ui_blocks.navegacion_complex")}>
      {items.map(({ path, icon: Icon, labelKey }) => {
        const activo = activePath === path;
        return (
          <Link
            key={path}
            to={path}
            className={activo ? complexNavTabActive : complexNavTabIdle}
          >
            {React.createElement(Icon, { className: 'text-sm' })}
            {translate(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

export function ComplexPageHeader({ badge = 'Complex', title, subtitle, actions, activePath }) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-3">
        {badge && <span className={complexBadge}>{badge}</span>}
        <div>
          <h1 className={complexPageTitle}>{title}</h1>
          {subtitle && <p className={complexPageSubtitle}>{subtitle}</p>}
        </div>
        {activePath && <ComplexNavTabs activePath={activePath} />}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function ComplexMetricCard({ label, value, hint }) {
  return (
    <div className={complexMetricCard}>
      <p className="font-body text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 font-accent text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {hint && <p className="mt-1 font-body text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

export function ComplexFilterSection({ title, children, onClear, showClear }) {
  const { t } = useTranslation();
  const titleFinal = title ?? t('complex.ui.complex_ui_blocks.filtros');
  return (
    <section className={complexCard}>
      <div className={`${complexCardHeader} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">{titleFinal}</h2>
        {showClear && onClear && (
          <button type="button" onClick={onClear} className={complexBtnGhost}>{t("complex.ui.complex_ui_blocks.limpiar_filtros")}</button>
        )}
      </div>
      <div className={complexCardBody}>{children}</div>
    </section>
  );
}

export function ComplexChartCard({ title, empty, children, className = '', subtitle }) {
  const { t } = useTranslation();
  return (
    <div className={`${complexChartCard} min-w-0 ${className}`}>
      <div className="mb-4">
        <h3 className="font-heading text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && (
          <p className="mt-1 font-body text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      {empty ? (
        <p className="font-body text-sm text-gray-500 dark:text-gray-400">{t("complex.ui.complex_ui_blocks.no_hay_datos_disponibles_para_mostrar")}</p>
      ) : (
        <div className="min-w-0">{children}</div>
      )}
    </div>
  );
}

/** Contenedor con altura fija para ResponsiveContainer (evita gráficos colapsados o gigantes) */
export function ComplexChartPlot({ height, children }) {
  return (
    <div className="w-full min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function Campo({ label, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label className={complexLabel}>{label}</label>}
      {children}
    </div>
  );
}

export function InputFenix({ className = '', ...props }) {
  return <input className={`${complexInput} ${className}`} {...props} />;
}

export function SelectFenix({ children, className = '', ...props }) {
  return (
    <select className={`${complexSelect} ${className}`} {...props}>
      {children}
    </select>
  );
}

/**
 * Fecha + hora de hitos de protocolo.
 * - Fecha: input date nativo.
 * - Hora: selects 12h (hora / minuto / a.m.|p.m.) + campo de escritura libre
 *   (acepta 11, 11:00, 1100, 11am…) para no pelear con type="time" en Windows.
 */
export function InputFechaHoraProtocolo({
  name,
  value = '',
  onChange,
  onBlur,
  hint,
  className = '',
  min = '2024-01-01',
  max = '2100-12-31',
  disabled = false,
  required = false,
  id,
}) {
  const { t } = useTranslation();
  const { fecha, hora } = partirFechaHoraParaInputs(value);
  const partes = hora
    ? partirHora12Desde24(hora)
    : { hora12: '', minuto: '', ampm: 'am' };
  const [textoHora, setTextoHora] = useState(() => {
    if (!hora) return '';
    const p = partirHora12Desde24(hora);
    return p.hora12 ? `${p.hora12}:${p.minuto} ${p.ampm === 'pm' ? 'p. m.' : 'a. m.'}` : '';
  });

  useEffect(() => {
    if (!hora) {
      setTextoHora('');
      return;
    }
    const p = partirHora12Desde24(hora);
    if (!p.hora12) return;
    setTextoHora(`${p.hora12}:${p.minuto} ${p.ampm === 'pm' ? 'p. m.' : 'a. m.'}`);
  }, [hora]);

  const emitir = (nuevaFecha, nuevaHora) => {
    if (!onChange || !name) return;
    const combinado = combinarFechaHoraInputs(nuevaFecha, nuevaHora);
    // Evita el salto de scroll al cambiar selects de hora (Chrome remonta/reflow).
    const scrollers = [];
    if (typeof document !== 'undefined') {
      let el = document.activeElement;
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        const oy = style.overflowY;
        if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && el.scrollHeight > el.clientHeight) {
          scrollers.push({ el, top: el.scrollTop });
        }
        el = el.parentElement;
      }
      scrollers.push({ el: document.documentElement, top: window.scrollY });
    }
    onChange({ target: { name, value: combinado } });
    if (!scrollers.length) return;
    const restaurar = () => {
      for (const { el, top } of scrollers) {
        if (el === document.documentElement) {
          if (Math.abs(window.scrollY - top) > 1) window.scrollTo(0, top);
        } else if (Math.abs(el.scrollTop - top) > 1) {
          el.scrollTop = top;
        }
      }
    };
    requestAnimationFrame(() => {
      restaurar();
      requestAnimationFrame(restaurar);
    });
  };

  const emitirDesde12 = (h12, minuto, ampm, fechaBase = fecha) => {
    const h24 = combinarHora12A24(h12, minuto, ampm);
    if (!h24 || !fechaBase) return;
    emitir(fechaBase, h24);
  };

  const aplicarTextoHora = (texto) => {
    const normalizada = normalizarHoraEscrita(texto);
    if (!normalizada) return false;
    if (!fecha) return false;
    emitir(fecha, normalizada);
    return true;
  };

  const minutosOpts = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const horasOpts = Array.from({ length: 12 }, (_, i) => String(i + 1));

  return (
    <div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <input
          id={id}
          type="date"
          name={`${name}__fecha`}
          value={fecha}
          min={min}
          max={max}
          disabled={disabled}
          required={required}
          className={`${complexInput} ${className}`}
          onChange={(e) => {
            const nuevaFecha = e.target.value;
            if (!nuevaFecha) {
              emitir('', '');
              return;
            }
            // Si aún no hay hora, usa la hora actual del dispositivo.
            emitir(nuevaFecha, hora || horaActualHHMM());
          }}
          onBlur={onBlur}
          aria-label={t("complex.ui.complex_ui_blocks.fecha")}
        />
        <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
          <select
            name={`${name}__hora12`}
            className={`${complexSelect} ${className}`}
            value={partes.hora12 || ''}
            disabled={disabled || !fecha}
            onChange={(e) =>
              emitirDesde12(e.target.value, partes.minuto || '00', partes.ampm || 'am')
            }
            aria-label={t("complex.ui.complex_ui_blocks.hora")}
          >
            <option value="">{t("complex.ui.complex_ui_blocks.hora")}</option>
            {horasOpts.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <select
            name={`${name}__minuto`}
            className={`${complexSelect} ${className}`}
            value={partes.minuto || ''}
            disabled={disabled || !fecha}
            onChange={(e) =>
              emitirDesde12(partes.hora12 || '12', e.target.value, partes.ampm || 'am')
            }
            aria-label={t("complex.ui.complex_ui_blocks.minutos")}
          >
            <option value="">{t("complex.ui.complex_ui_blocks.min")}</option>
            {minutosOpts.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            name={`${name}__ampm`}
            className={`${complexSelect} ${className} min-w-[4.5rem]`}
            value={partes.ampm || 'am'}
            disabled={disabled || !fecha}
            onChange={(e) =>
              emitirDesde12(partes.hora12 || '12', partes.minuto || '00', e.target.value)
            }
            aria-label={t("complex.ui.complex_ui_blocks.a_m_o_p_m")}
          >
            <option value="am">{t("complex.ui.complex_ui_blocks.a_m")}</option>
            <option value="pm">{t("complex.ui.complex_ui_blocks.p_m")}</option>
          </select>
        </div>
      </div>
      <div className="mt-1.5">
        <input
          type="text"
          inputMode="numeric"
          name={`${name}__horaTexto`}
          value={textoHora}
          disabled={disabled || !fecha}
          placeholder={t("complex.ui.complex_ui_blocks.escribir_hora_11_11_30_11am")}
          className={`${complexInput} ${className}`}
          onChange={(e) => setTextoHora(e.target.value)}
          onBlur={(e) => {
            const ok = aplicarTextoHora(e.target.value);
            if (!ok && hora) {
              const p = partirHora12Desde24(hora);
              setTextoHora(
                p.hora12 ? `${p.hora12}:${p.minuto} ${p.ampm === 'pm' ? 'p. m.' : 'a. m.'}` : ''
              );
            }
            onBlur?.(e);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              aplicarTextoHora(textoHora);
              e.currentTarget.blur();
            }
          }}
          aria-label={t("complex.ui.complex_ui_blocks.escribir_hora")}
        />
      </div>
      {hint !== false && (
        <p className={complexHint}>
          {hint || t('complex.ui.complex_ui_blocks.hint_fecha_hora')}
        </p>
      )}
    </div>
  );
}
