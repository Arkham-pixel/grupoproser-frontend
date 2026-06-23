import React from 'react';
import {
  useMaquinariaTheme,
  SectionCard,
  FieldLabel,
  ThemedInput,
  ThemedTextarea,
  FormTable,
  FormTableHead,
  FormTableTh,
  FormTableTd,
  TableFieldInput,
  TableFieldSelect,
  TableFieldTextarea,
} from './SubcomponenteMaquinaria/maquinariaUi.jsx';
import { complexBtnPrimary, complexBtnSecondary, complexBtnDanger, complexBtnGhost } from './SubcomponenteCompex/complexFenixUi.js';

export {
  useMaquinariaTheme,
  useMaquinariaTheme as usePropiedadesTheme,
  SectionCard,
  FieldLabel,
  ThemedInput,
  ThemedTextarea,
  FormTable,
  FormTableHead,
  FormTableTh,
  FormTableTd,
  TableFieldInput,
  TableFieldSelect,
  TableFieldTextarea,
  complexBtnPrimary,
  complexBtnSecondary,
  complexBtnDanger,
  complexBtnGhost,
};

export function ThemedSelect({ className = '', style = {}, ...props }) {
  const t = useMaquinariaTheme();
  return (
    <select
      className={`w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
      style={{
        backgroundColor: t.inputBg,
        color: t.textPrimary,
        border: `1px solid ${t.borderColor}`,
        borderRadius: '6px',
        '--tw-ring-color': '#DC2626',
        ...style,
      }}
      {...props}
    />
  );
}

export function SubsectionTitle({ children }) {
  const t = useMaquinariaTheme();
  return (
    <h3
      className="mb-4 pl-3 font-heading text-base font-bold sm:text-lg"
      style={{ color: t.textPrimary, borderLeft: '4px solid #DC2626' }}
    >
      {children}
    </h3>
  );
}

export function AreaDivider() {
  const t = useMaquinariaTheme();
  return <div className="mb-8 pb-6" style={{ borderBottom: `1px solid ${t.borderColor}` }} />;
}

export function InfoBanner({ children, variant = 'success' }) {
  const t = useMaquinariaTheme();
  const styles =
    variant === 'error'
      ? {
          backgroundColor: t.theme === 'dark' ? 'rgba(220,38,38,0.15)' : '#FEF2F2',
          borderColor: t.theme === 'dark' ? 'rgba(220,38,38,0.4)' : '#FECACA',
          color: t.theme === 'dark' ? '#FCA5A5' : '#991B1B',
        }
      : {
          backgroundColor: t.theme === 'dark' ? 'rgba(34,197,94,0.12)' : '#F0FDF4',
          borderColor: t.theme === 'dark' ? 'rgba(34,197,94,0.35)' : '#BBF7D0',
          color: t.theme === 'dark' ? '#86EFAC' : '#166534',
        };

  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm" style={styles}>
      {children}
    </div>
  );
}

export function LlenadoGuiaPropiedades() {
  const t = useMaquinariaTheme();
  const items = [
    { donde: 'Sección 1', que: 'Clase, tipo, dirección y datos de quien recibe la visita' },
    { donde: 'Sección 2', que: 'Observaciones de inspección métrica' },
    { donde: 'Sección 3', que: 'Tablas por área (Cumple: SI / NO / Parcialmente / NA) y fotos por zona' },
    { donde: 'Sección 4', que: 'Conclusiones, observaciones principales y firmas' },
  ];

  return (
    <div
      className="mb-6 rounded-lg border p-4 text-sm"
      style={{ borderColor: t.borderColor, backgroundColor: t.accentSoft, color: t.textPrimary }}
    >
      <p className="mb-2 font-semibold font-heading">Guía de llenado — inspección de propiedad</p>
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
