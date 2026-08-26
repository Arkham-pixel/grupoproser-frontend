import React from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import {
  FaBolt,
  FaChartLine,
  FaClipboardList,
  FaCalculator,
  FaCheckCircle,
  FaChevronDown,
  FaChevronRight,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTable,
  FaTimes,
} from 'react-icons/fa';
import {
  combinarFechaHoraInputs,
  horaActualHHMM,
  partirFechaHoraParaInputs,
  partirHora12Desde24,
} from '../../utils/complexFechaHoraUtils.js';
import {
  anexoExpressSePuedePrevisualizar,
  descargarAnexoExpress,
  puedeAccederAnexoExpress,
  verAnexoExpress,
} from './expressHelpers.js';
import { etiquetaLegibleAnexoExpress } from '../../services/expressService.js';
import {
  formatearInputMoneda,
  formatearMontoConPeso,
} from './liquidadorExpressHelpers.js';
import {
  expressBadge,
  expressBtnGhost,
  expressBtnPrimary,
  expressBtnSecondary,
  expressCard,
  expressDocBtn,
  expressDocBtnDanger,
  expressCardBody,
  expressCardHeader,
  expressDropzoneActive,
  expressDropzoneBase,
  expressInput,
  expressLabel,
  expressMetricCard,
  expressPageSubtitle,
  expressPageTitle,
  expressSelect,
  expressTextarea,
} from './expressFenixUi';

const NAV_EXPRESS = [
  { path: '/express/carga', icon: FaBolt, key: 'load' },
  { path: '/express/liquidador', icon: FaCalculator, key: 'settlement' },
  { path: '/express/protocolo', icon: FaChartLine, key: 'protocol' },
  { path: '/express/tablero', icon: FaClipboardList, key: 'board' },
  { path: '/express/reporte', icon: FaTable, key: 'report' },
];

export function ExpressNavTabs({ activePath }) {
  const { t } = useTranslation();
  return (
    <nav className="flex flex-wrap gap-2" aria-label={t('express.navigation')}>
      {NAV_EXPRESS.map(({ path, icon: Icon, key }) => {
        const activo = activePath === path;
        return (
          <Link
            key={path}
            to={path}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 font-body text-sm font-semibold transition ${
              activo
                ? 'bg-fenix-primario text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-700 hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
            }`}
          >
            {React.createElement(Icon, { className: 'text-sm' })}
            {t(`express.nav.${key}`)}
          </Link>
        );
      })}
    </nav>
  );
}

export function ExpressPageHeader({ badge = 'Express', title, subtitle, actions, activePath }) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-3">
        {badge && <span className={expressBadge}>{badge}</span>}
        <div>
          <h1 className={expressPageTitle}>{title}</h1>
          {subtitle && <p className={expressPageSubtitle}>{subtitle}</p>}
        </div>
        {activePath && <ExpressNavTabs activePath={activePath} />}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function ExpressMetricCard({ label, value, hint }) {
  return (
    <div className={expressMetricCard}>
      <p className="font-body text-sm font-medium leading-snug text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 font-accent text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {hint && <p className="mt-1 font-body text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

/** Contenedor con altura fija para ResponsiveContainer (evita gráficos colapsados a ancho/alto 0). */
export function ExpressChartPlot({ height, children }) {
  return (
    <div className="w-full min-w-0" style={{ height, minHeight: height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function ExpressFilterSection({ title = 'Filtros', children, onClear, showClear }) {
  const { t } = useTranslation();
  return (
    <section className={expressCard}>
      <div className={`${expressCardHeader} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        {showClear && onClear && (
          <button type="button" onClick={onClear} className={expressBtnGhost}>
            {t('express.actions.clearFilters')}
          </button>
        )}
      </div>
      <div className={expressCardBody}>{children}</div>
    </section>
  );
}

export function Campo({ label, required, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label className={expressLabel}>
          {label}
          {required && <span className="ml-0.5 text-fenix-primario">*</span>}
        </label>
      )}
      {children}
    </div>
  );
}

export function InputFenix({ className = '', ...props }) {
  return <input className={`${expressInput} ${className}`} {...props} />;
}

/**
 * Input monetario COP: muestra `$` y miles con puntos (es-CO).
 * Emite el string ya formateado; parsearNumero lo interpreta al calcular/guardar.
 */
export function InputMonedaExpress({
  className = '',
  value = '',
  onChange,
  onBlur,
  placeholder = '$ 0',
  name,
  id,
  ...props
}) {
  const shown =
    value === '' || value === null || value === undefined
      ? ''
      : formatearInputMoneda(value);

  const emitir = (event, nextValue) => {
    if (!onChange) return;
    onChange({
      ...event,
      target: {
        ...event.target,
        name: name ?? event.target?.name,
        id: id ?? event.target?.id,
        value: nextValue,
      },
    });
  };

  return (
    <input
      {...props}
      className={`${expressInput} ${className}`}
      type="text"
      inputMode="decimal"
      name={name}
      id={id}
      value={shown}
      placeholder={placeholder}
      onChange={(e) => emitir(e, formatearInputMoneda(e.target.value))}
      onBlur={(e) => {
        const final = formatearMontoConPeso(e.target.value);
        if (final !== shown) emitir(e, final);
        onBlur?.(e);
      }}
    />
  );
}

export function SelectFenix({ children, className = '', ...props }) {
  return (
    <select className={`${expressSelect} ${className}`} {...props}>
      {children}
    </select>
  );
}

/**
 * Fecha de hitos ANS Express (solo calendario en pantalla).
 * Al elegir fecha guarda también la hora en el valor (actual o la ya registrada).
 */
function formatearHoraLegibleExpress(hora24) {
  const p = partirHora12Desde24(hora24);
  if (!p.hora12) return '';
  return `${p.hora12}:${p.minuto} ${p.ampm === 'pm' ? 'p. m.' : 'a. m.'}`;
}

export function InputFechaHoraExpress({
  name,
  value = '',
  onChange,
  onBlur,
  className = '',
  min = '2024-01-01',
  max = '2100-12-31',
  disabled = false,
  required = false,
  id,
}) {
  const { t } = useTranslation();
  const { fecha, hora } = partirFechaHoraParaInputs(value);
  const horaLegible = fecha && hora ? formatearHoraLegibleExpress(hora) : '';

  const emitir = (nuevaFecha, nuevaHora) => {
    if (!onChange || !name) return;
    const combinado = combinarFechaHoraInputs(nuevaFecha, nuevaHora);
    onChange({ target: { name, value: combinado } });
  };

  return (
    <div>
      {horaLegible ? (
        <p
          className="mb-1 font-body text-[11px] leading-tight text-gray-400 dark:text-gray-500"
          title={t('express.time.autoSaved')}
        >
          {horaLegible}
        </p>
      ) : (
        <p
          className="mb-1 min-h-[14px] font-body text-[11px] leading-tight text-transparent"
          aria-hidden
        >
          —
        </p>
      )}
      <input
        id={id}
        type="date"
        name={`${name}__fecha`}
        value={fecha}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        className={`${expressInput} ${className}`}
        onChange={(e) => {
          const nuevaFecha = e.target.value;
          if (!nuevaFecha) {
            emitir('', '');
            return;
          }
          emitir(nuevaFecha, hora || horaActualHHMM());
        }}
        onBlur={onBlur}
        aria-label={horaLegible ? t('express.time.dateTimeRecorded', { time: horaLegible }) : t('express.time.date')}
      />
    </div>
  );
}

export function TextareaFenix({ className = '', ...props }) {
  return <textarea className={`${expressTextarea} ${className}`} {...props} />;
}

export function DropzoneFenix({ getRootProps, getInputProps, isDragActive, children }) {
  const { t } = useTranslation();
  const rootProps = getRootProps ? getRootProps() : {};
  return (
    <div
      {...rootProps}
      className={`${expressDropzoneBase} ${isDragActive ? expressDropzoneActive : ''}`}
    >
      {getInputProps && <input {...getInputProps()} />}
      {children ?? (
        <p
          className={`font-body text-sm ${
            isDragActive ? 'font-medium text-fenix-primario' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          {isDragActive
            ? t('express.dropzone.dropHere')
            : t('express.dropzone.selectFiles')}
        </p>
      )}
    </div>
  );
}

export function SeccionAcordeon({ abierto, onToggle, icon: Icon, titulo, subtitulo, children }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-4 px-4 py-4 text-left transition sm:px-5 ${
          abierto ? 'bg-gray-50/80 dark:bg-gray-900/30' : 'hover:bg-gray-50/50 dark:hover:bg-gray-900/20'
        }`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-fenix-primario dark:bg-red-950/30">
          {React.createElement(Icon, { className: 'text-lg' })}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-base font-bold text-gray-800 dark:text-white">{titulo}</h3>
          {subtitulo && (
            <p className="mt-0.5 font-body text-xs text-gray-500 dark:text-gray-400">{subtitulo}</p>
          )}
        </div>
        <span className="shrink-0 text-gray-400">
          {abierto ? <FaChevronDown /> : <FaChevronRight />}
        </span>
      </button>
      {abierto && (
        <div className="space-y-4 border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-5">
          {children}
        </div>
      )}
    </div>
  );
}

export function ExpressModal({ open, onClose, title, children, wide = false, extraWide = false }) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div
        className={`relative flex max-h-[95vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1A1A1A] ${
          extraWide ? 'max-w-[96vw]' : wide ? 'max-w-6xl' : 'max-w-lg'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="express-modal-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-6">
          <h2 id="express-modal-title" className="font-heading text-lg font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-fenix-primario dark:hover:bg-gray-800"
            title={t('common.close')}
          >
            <FaTimes />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

const AVISO_ESTILOS = {
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
    iconWrap: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-900/50',
  },
  success: {
    icon: FaCheckCircle,
    iconWrap: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-900/50',
  },
};

/** Aviso modal alineado al diseño Fénix (reemplaza alert() del navegador) */
export function ExpressAvisoModal({
  open,
  onClose,
  titulo = 'Atención',
  mensaje = '',
  tipo = 'warning',
  botonTexto = 'Entendido',
  onConfirm,
  confirmTexto = 'Confirmar',
  cancelTexto = 'Cancelar',
  confirmando = false,
}) {
  if (!open) return null;

  const estilo = AVISO_ESTILOS[tipo] || AVISO_ESTILOS.warning;
  const Icono = estilo.icon;
  const esConfirmacion = typeof onConfirm === 'function';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl dark:bg-[#1A1A1A] ${estilo.border}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="express-aviso-titulo"
        aria-describedby="express-aviso-mensaje"
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
              id="express-aviso-titulo"
              className="font-heading text-lg font-bold text-gray-900 dark:text-white"
            >
              {titulo}
            </h2>
            <p
              id="express-aviso-mensaje"
              className="mt-2 font-body text-sm leading-relaxed text-gray-600 dark:text-gray-300"
            >
              {mensaje}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6">
          {esConfirmacion ? (
            <>
              <button
                type="button"
                className={expressBtnGhost}
                onClick={onClose}
                disabled={confirmando}
              >
                {cancelTexto}
              </button>
              <button
                type="button"
                className={expressBtnPrimary}
                onClick={onConfirm}
                disabled={confirmando}
                autoFocus
              >
                {confirmando ? 'Procesando…' : confirmTexto}
              </button>
            </>
          ) : (
            <button type="button" className={expressBtnPrimary} onClick={onClose} autoFocus>
              {botonTexto}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FilaAnexoExpress({
  anexo,
  onQuitar,
  onAviso,
  onDescargarPdfLiquidador,
  onDescargarPdfChecklist,
  onDescargarPdfSalvamento,
}) {
  const accesible = puedeAccederAnexoExpress(anexo);
  const etiqueta = etiquetaLegibleAnexoExpress(anexo);
  const tituloDescarga = etiqueta.archivo || anexo.nombre || 'documento';
  const puedeVer = accesible && anexoExpressSePuedePrevisualizar(anexo);
  const esExcelLiquidador = etiqueta.badge === 'Excel';
  const esChecklistWord = etiqueta.badge === 'Check-list';
  const esSalvamentoWord = etiqueta.badge === 'Salvamento';

  const handleVer = () => {
    const resultado = verAnexoExpress(anexo);
    if (!resultado.ok && onAviso) {
      onAviso(resultado.error, 'Documento', 'warning');
    }
  };

  const handleDescargar = () => {
    const resultado = descargarAnexoExpress({ ...anexo, nombre: tituloDescarga });
    if (!resultado.ok && onAviso) {
      onAviso(resultado.error, 'Documento', 'warning');
    }
  };

  return (
    <li className="rounded-lg border border-gray-100 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-[#1A1A1A]">
      <div className="min-w-0" title={etiqueta.archivo || etiqueta.titulo}>
        <div className="flex flex-wrap items-center gap-2">
          {etiqueta.badge && (
            <span className="shrink-0 rounded bg-fenix-primario/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fenix-primario">
              {etiqueta.badge}
            </span>
          )}
          <span className="font-body text-sm font-semibold text-gray-900 dark:text-gray-100">
            {etiqueta.titulo}
          </span>
        </div>
        {etiqueta.esLiquidador && etiqueta.archivo && etiqueta.archivo !== etiqueta.titulo && (
          <p className="mt-1 break-all font-body text-[11px] text-gray-500 dark:text-gray-400">
            {etiqueta.archivo}
          </p>
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-2 dark:border-gray-800">
        {puedeVer && (
          <button type="button" onClick={handleVer} className={expressDocBtn}>
            Ver
          </button>
        )}
        {accesible && (
          <button type="button" onClick={handleDescargar} className={expressDocBtn}>
            Descargar
          </button>
        )}
        {esExcelLiquidador && typeof onDescargarPdfLiquidador === 'function' && (
          <button type="button" onClick={onDescargarPdfLiquidador} className={expressDocBtn}>
            Descargar PDF
          </button>
        )}
        {esChecklistWord && typeof onDescargarPdfChecklist === 'function' && (
          <button type="button" onClick={onDescargarPdfChecklist} className={expressDocBtn}>
            Descargar PDF
          </button>
        )}
        {esSalvamentoWord && typeof onDescargarPdfSalvamento === 'function' && (
          <button type="button" onClick={onDescargarPdfSalvamento} className={expressDocBtn}>
            Descargar PDF
          </button>
        )}
        <button type="button" onClick={onQuitar} className={expressDocBtnDanger}>
          Quitar
        </button>
      </div>
    </li>
  );
}

export function ExpressListaAnexos({
  listaExistentes = [],
  listaNuevos = [],
  onRemoveExistente,
  onRemoveNuevo,
  onAviso,
  onDescargarPdfLiquidador,
  onDescargarPdfChecklist,
  onDescargarPdfSalvamento,
}) {
  if (!listaExistentes.length && !listaNuevos.length) return null;

  return (
    <>
      {listaExistentes.length > 0 && (
        <ul className="mt-3 space-y-2">
          {listaExistentes.map((anexo, index) => (
            <FilaAnexoExpress
              key={`existente-${anexo.nombre}-${index}`}
              anexo={anexo}
              onQuitar={() => onRemoveExistente(index)}
              onAviso={onAviso}
              onDescargarPdfLiquidador={onDescargarPdfLiquidador}
              onDescargarPdfChecklist={onDescargarPdfChecklist}
              onDescargarPdfSalvamento={onDescargarPdfSalvamento}
            />
          ))}
        </ul>
      )}
      {listaNuevos.length > 0 && (
        <ul className="mt-3 space-y-2">
          {listaNuevos.map((anexo) => (
            <FilaAnexoExpress
              key={`nuevo-${anexo.nombre}`}
              anexo={anexo}
              onQuitar={() => onRemoveNuevo(anexo.nombre)}
              onAviso={onAviso}
              onDescargarPdfLiquidador={onDescargarPdfLiquidador}
              onDescargarPdfChecklist={onDescargarPdfChecklist}
              onDescargarPdfSalvamento={onDescargarPdfSalvamento}
            />
          ))}
        </ul>
      )}
    </>
  );
}

// Se reexportan por compatibilidad con los consumidores existentes de este módulo.
// eslint-disable-next-line react-refresh/only-export-components
export { expressBtnPrimary, expressBtnSecondary, expressBtnGhost };
