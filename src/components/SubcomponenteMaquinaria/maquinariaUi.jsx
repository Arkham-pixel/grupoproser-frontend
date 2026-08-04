import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

export function useMaquinariaTheme() {
  const { theme } = useTheme();
  return {
    theme,
    bgMain: theme === 'dark' ? '#1A1A1A' : '#F5F5F7',
    cardBg: theme === 'dark' ? '#1A1A1A' : '#FFFFFF',
    textPrimary: theme === 'dark' ? '#F5F5F5' : '#1E1E1E',
    textSecondary: theme === 'dark' ? '#B0B0B0' : '#6B6B6B',
    borderColor: theme === 'dark' ? '#2D2D2D' : '#E6E6E6',
    inputBg: theme === 'dark' ? '#1A1A1A' : '#FFFFFF',
    tableHeaderBg: theme === 'dark' ? '#252525' : '#F8F9FA',
    accentSoft: theme === 'dark' ? 'rgba(220, 38, 38, 0.12)' : 'rgba(220, 38, 38, 0.08)',
  };
}

export function inputStyle(mq, extra = {}) {
  return {
    backgroundColor: mq.inputBg,
    color: mq.textPrimary,
    border: `1px solid ${mq.borderColor}`,
    borderRadius: '6px',
    ...extra,
  };
}

export function SectionCard({ title, subtitle, children }) {
  const mq = useMaquinariaTheme();
  return (
    <section
      className="mb-6 rounded-lg overflow-hidden border"
      style={{ borderColor: mq.borderColor, backgroundColor: mq.cardBg }}
    >
      <div
        className="px-4 py-3 border-b"
        style={{
          backgroundColor: mq.accentSoft,
          borderColor: mq.borderColor,
          color: mq.textPrimary,
        }}
      >
        <h2 className="text-sm sm:text-base font-semibold font-heading">{title}</h2>
        {subtitle && (
          <p className="text-xs mt-1 font-normal" style={{ color: mq.textSecondary }}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function FieldLabel({ children, hint }) {
  const mq = useMaquinariaTheme();
  return (
    <div className="mb-1">
      <label className="block text-xs sm:text-sm font-semibold" style={{ color: mq.textPrimary }}>
        {children}
      </label>
      {hint && (
        <p className="text-xs mt-0.5" style={{ color: mq.textSecondary }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function ThemedInput({ className = '', style = {}, ...props }) {
  const mq = useMaquinariaTheme();
  return (
    <input
      className={`w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 ${className}`}
      style={{
        ...inputStyle(mq),
        '--tw-ring-color': '#DC2626',
        ...style,
      }}
      {...props}
    />
  );
}

export function ThemedTextarea({ className = '', rows = 3, style = {}, ...props }) {
  const mq = useMaquinariaTheme();
  return (
    <textarea
      rows={rows}
      className={`w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-y ${className}`}
      style={{
        ...inputStyle(mq),
        '--tw-ring-color': '#DC2626',
        ...style,
      }}
      {...props}
    />
  );
}

export function FormTable({ children }) {
  const mq = useMaquinariaTheme();
  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: mq.borderColor }}>
      <table className="w-full text-xs sm:text-sm">{children}</table>
    </div>
  );
}

export function FormTableHead({ children }) {
  const mq = useMaquinariaTheme();
  return (
    <thead style={{ backgroundColor: mq.tableHeaderBg }}>
      <tr>{children}</tr>
    </thead>
  );
}

export function FormTableTh({ children, className = '' }) {
  const mq = useMaquinariaTheme();
  return (
    <th
      className={`text-left px-3 py-2 font-semibold border-b w-1/3 sm:w-2/5 ${className}`}
      style={{ color: mq.textPrimary, borderColor: mq.borderColor }}
    >
      {children}
    </th>
  );
}

export function FormTableTd({ children, className = '' }) {
  const mq = useMaquinariaTheme();
  return (
    <td
      className={`px-3 py-2 border-b align-top ${className}`}
      style={{ borderColor: mq.borderColor }}
    >
      {children}
    </td>
  );
}

export function FormTableRow({ label, children }) {
  const mq = useMaquinariaTheme();
  return (
    <tr>
      <th
        className="text-left px-3 py-2 font-semibold border-b align-top w-1/3 sm:w-2/5"
        style={{ color: mq.textPrimary, borderColor: mq.borderColor, backgroundColor: mq.tableHeaderBg }}
      >
        {label}
      </th>
      <FormTableTd>{children}</FormTableTd>
    </tr>
  );
}

export function getSelectStyles(mq) {
  return {
    control: (styles, state) => ({
      ...styles,
      backgroundColor: mq.inputBg,
      borderColor: state.isFocused ? '#DC2626' : mq.borderColor,
      minHeight: 40,
      boxShadow: 'none',
      '&:hover': { borderColor: '#DC2626' },
    }),
    singleValue: (styles) => ({ ...styles, color: mq.textPrimary }),
    input: (styles) => ({ ...styles, color: mq.textPrimary }),
    placeholder: (styles) => ({ ...styles, color: mq.textSecondary }),
    menu: (styles) => ({
      ...styles,
      backgroundColor: mq.cardBg,
      border: `1px solid ${mq.borderColor}`,
      zIndex: 20,
    }),
    option: (styles, state) => ({
      ...styles,
      backgroundColor: state.isFocused ? mq.accentSoft : mq.cardBg,
      color: mq.textPrimary,
    }),
  };
}

export function TableFieldInput(props) {
  return <ThemedInput className="!border-0 !ring-0 !px-2 !py-1.5" {...props} />;
}

export function TableFieldTextarea({ rows = 2, ...props }) {
  return <ThemedTextarea className="!border-0 !ring-0 !px-2 !py-1.5" rows={rows} {...props} />;
}

export function TableFieldSelect({ className = '', children, ...props }) {
  const mq = useMaquinariaTheme();
  return (
    <select
      className={`w-full px-2 py-1.5 text-sm rounded-md ${className}`}
      style={{
        backgroundColor: mq.inputBg,
        color: mq.textPrimary,
        border: `1px solid ${mq.borderColor}`,
      }}
      {...props}
    >
      {children}
    </select>
  );
}

export function SyncedValue({ value, source }) {
  const mq = useMaquinariaTheme();
  const { t } = useTranslation();
  return (
    <div>
      <div
        className="px-3 py-2 rounded-md text-sm min-h-[38px]"
        style={{
          backgroundColor: mq.tableHeaderBg,
          color: value ? mq.textPrimary : mq.textSecondary,
          border: `1px dashed ${mq.borderColor}`,
        }}
      >
        {value || t('machinery.ui.common.autoFilled')}
      </div>
      {source && (
        <p className="text-[11px] mt-1" style={{ color: mq.textSecondary }}>
          {t('machinery.ui.common.origin', { source })}
        </p>
      )}
    </div>
  );
}

export function LlenadoGuia() {
  const mq = useMaquinariaTheme();
  const { t } = useTranslation();
  const items = [
    { donde: t('machinery.ui.guide.items.foto.where'), que: t('machinery.ui.guide.items.foto.what') },
    { donde: t('machinery.ui.guide.items.encabezado.where'), que: t('machinery.ui.guide.items.encabezado.what') },
    { donde: t('machinery.ui.guide.items.descripcion.where'), que: t('machinery.ui.guide.items.descripcion.what') },
    { donde: t('machinery.ui.guide.items.tabla.where'), que: t('machinery.ui.guide.items.tabla.what') },
    { donde: t('machinery.ui.guide.items.estado.where'), que: t('machinery.ui.guide.items.estado.what') },
    { donde: t('machinery.ui.guide.items.registro.where'), que: t('machinery.ui.guide.items.registro.what') },
  ];
  return (
    <div
      className="mb-6 rounded-lg border p-4 text-sm"
      style={{ borderColor: mq.borderColor, backgroundColor: mq.accentSoft, color: mq.textPrimary }}
    >
      <p className="font-semibold mb-2">{t('machinery.ui.guide.title')}</p>
      <ul className="space-y-1 text-xs sm:text-sm" style={{ color: mq.textSecondary }}>
        {items.map((item) => (
          <li key={item.donde}>
            <span style={{ color: mq.textPrimary }}>{item.donde}:</span> {item.que}
          </li>
        ))}
      </ul>
    </div>
  );
}
