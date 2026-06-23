import React from 'react';
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

export function inputStyle(t, extra = {}) {
  return {
    backgroundColor: t.inputBg,
    color: t.textPrimary,
    border: `1px solid ${t.borderColor}`,
    borderRadius: '6px',
    ...extra,
  };
}

export function SectionCard({ title, subtitle, children }) {
  const t = useMaquinariaTheme();
  return (
    <section
      className="mb-6 rounded-lg overflow-hidden border"
      style={{ borderColor: t.borderColor, backgroundColor: t.cardBg }}
    >
      <div
        className="px-4 py-3 border-b"
        style={{
          backgroundColor: t.accentSoft,
          borderColor: t.borderColor,
          color: t.textPrimary,
        }}
      >
        <h2 className="text-sm sm:text-base font-semibold font-heading">{title}</h2>
        {subtitle && (
          <p className="text-xs mt-1 font-normal" style={{ color: t.textSecondary }}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function FieldLabel({ children, hint }) {
  const t = useMaquinariaTheme();
  return (
    <div className="mb-1">
      <label className="block text-xs sm:text-sm font-semibold" style={{ color: t.textPrimary }}>
        {children}
      </label>
      {hint && (
        <p className="text-xs mt-0.5" style={{ color: t.textSecondary }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function ThemedInput({ className = '', style = {}, ...props }) {
  const t = useMaquinariaTheme();
  return (
    <input
      className={`w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 ${className}`}
      style={{
        ...inputStyle(t),
        '--tw-ring-color': '#DC2626',
        ...style,
      }}
      {...props}
    />
  );
}

export function ThemedTextarea({ className = '', rows = 3, style = {}, ...props }) {
  const t = useMaquinariaTheme();
  return (
    <textarea
      rows={rows}
      className={`w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-y ${className}`}
      style={{
        ...inputStyle(t),
        '--tw-ring-color': '#DC2626',
        ...style,
      }}
      {...props}
    />
  );
}

export function FormTable({ children }) {
  const t = useMaquinariaTheme();
  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: t.borderColor }}>
      <table className="w-full text-xs sm:text-sm">{children}</table>
    </div>
  );
}

export function FormTableHead({ children }) {
  const t = useMaquinariaTheme();
  return (
    <thead style={{ backgroundColor: t.tableHeaderBg }}>
      <tr>{children}</tr>
    </thead>
  );
}

export function FormTableTh({ children, className = '' }) {
  const t = useMaquinariaTheme();
  return (
    <th
      className={`text-left px-3 py-2 font-semibold border-b w-1/3 sm:w-2/5 ${className}`}
      style={{ color: t.textPrimary, borderColor: t.borderColor }}
    >
      {children}
    </th>
  );
}

export function FormTableTd({ children, className = '' }) {
  const t = useMaquinariaTheme();
  return (
    <td
      className={`px-3 py-2 border-b align-top ${className}`}
      style={{ borderColor: t.borderColor }}
    >
      {children}
    </td>
  );
}

export function FormTableRow({ label, children }) {
  const t = useMaquinariaTheme();
  return (
    <tr>
      <th
        className="text-left px-3 py-2 font-semibold border-b align-top w-1/3 sm:w-2/5"
        style={{ color: t.textPrimary, borderColor: t.borderColor, backgroundColor: t.tableHeaderBg }}
      >
        {label}
      </th>
      <FormTableTd>{children}</FormTableTd>
    </tr>
  );
}

export function getSelectStyles(t) {
  return {
    control: (styles, state) => ({
      ...styles,
      backgroundColor: t.inputBg,
      borderColor: state.isFocused ? '#DC2626' : t.borderColor,
      minHeight: 40,
      boxShadow: 'none',
      '&:hover': { borderColor: '#DC2626' },
    }),
    singleValue: (styles) => ({ ...styles, color: t.textPrimary }),
    input: (styles) => ({ ...styles, color: t.textPrimary }),
    placeholder: (styles) => ({ ...styles, color: t.textSecondary }),
    menu: (styles) => ({
      ...styles,
      backgroundColor: t.cardBg,
      border: `1px solid ${t.borderColor}`,
      zIndex: 20,
    }),
    option: (styles, state) => ({
      ...styles,
      backgroundColor: state.isFocused ? t.accentSoft : t.cardBg,
      color: t.textPrimary,
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
  const t = useMaquinariaTheme();
  return (
    <select
      className={`w-full px-2 py-1.5 text-sm rounded-md ${className}`}
      style={{
        backgroundColor: t.inputBg,
        color: t.textPrimary,
        border: `1px solid ${t.borderColor}`,
      }}
      {...props}
    >
      {children}
    </select>
  );
}

export function SyncedValue({ value, source }) {
  const t = useMaquinariaTheme();
  return (
    <div>
      <div
        className="px-3 py-2 rounded-md text-sm min-h-[38px]"
        style={{
          backgroundColor: t.tableHeaderBg,
          color: value ? t.textPrimary : t.textSecondary,
          border: `1px dashed ${t.borderColor}`,
        }}
      >
        {value || 'Se completa automáticamente'}
      </div>
      {source && (
        <p className="text-[11px] mt-1" style={{ color: t.textSecondary }}>
          Origen: {source}
        </p>
      )}
    </div>
  );
}

export function LlenadoGuia() {
  const t = useMaquinariaTheme();
  const items = [
    { donde: 'Foto principal (arriba)', que: '1 imagen de portada por arrastre o clic' },
    { donde: 'Encabezado + fecha', que: 'Aseguradora, asegurado, equipo, marca y fecha' },
    { donde: 'Descripción §2', que: 'Datos técnicos del bien' },
    { donde: 'Tabla §1', que: 'Referencia, inspector (lista) y cargo' },
    { donde: 'Estado general §2.1', que: 'Se completa con locomoción, función y estado operativo de §2' },
    { donde: 'Registro fotográfico (final)', que: 'Hasta 12 fotos de soporte' },
  ];
  return (
    <div
      className="mb-6 rounded-lg border p-4 text-sm"
      style={{ borderColor: t.borderColor, backgroundColor: t.accentSoft, color: t.textPrimary }}
    >
      <p className="font-semibold mb-2">Guía de llenado — escriba una sola vez</p>
      <ul className="space-y-1 text-xs sm:text-sm" style={{ color: t.textSecondary }}>
        {items.map((item) => (
          <li key={item.donde}>
            <span style={{ color: t.textPrimary }}>{item.donde}:</span> {item.que}
          </li>
        ))}
      </ul>
    </div>
  );
}
