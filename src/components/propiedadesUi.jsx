import React from 'react';
import { useTranslation } from 'react-i18next';
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

/* eslint-disable react-refresh/only-export-components -- Este módulo es la API pública de bloques UI compartidos. */
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
/* eslint-enable react-refresh/only-export-components */

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
  const ui = useMaquinariaTheme();
  const { t } = useTranslation();
  const tp = (key) => t(`inspection.ui.formulario_propiedades.${key}`);
  const items = [
    { donde: tp('guideSection1'), que: tp('guideSection1Text') },
    { donde: tp('guideSection2'), que: tp('guideSection2Text') },
    { donde: tp('guideSection3'), que: tp('guideSection3Text') },
    { donde: tp('guideSection4'), que: tp('guideSection4Text') },
  ];

  return (
    <div
      className="mb-6 rounded-lg border p-4 text-sm"
      style={{ borderColor: ui.borderColor, backgroundColor: ui.accentSoft, color: ui.textPrimary }}
    >
      <p className="mb-2 font-semibold font-heading">{tp('guideTitle')}</p>
      <ul className="space-y-1 text-xs sm:text-sm" style={{ color: ui.textSecondary }}>
        {items.map((item) => (
          <li key={item.donde}>
            <span style={{ color: ui.textPrimary }}>{item.donde}:</span> {item.que}
          </li>
        ))}
      </ul>
    </div>
  );
}
