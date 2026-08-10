import { useTranslation } from 'react-i18next';
import React from 'react';
import { FaCalendarAlt, FaCheck, FaCloudUploadAlt, FaFileAlt, FaTimes, FaTrash } from 'react-icons/fa';
import {
  complexBtnDanger,
  complexBtnSecondary,
  complexCard,
  complexDropzoneBase,
  complexSubsectionTitle,
  complexTableHead,
  complexTableWrap,
} from './complexFenixUi';
import { trazabilidadInputClass } from './trazabilidadFenixUi';

export const inputListaClass = `${trazabilidadInputClass} !py-1.5`;

export const textareaListaClass = `${trazabilidadInputClass} min-h-[4rem] resize-none !py-1.5`;

export const thLista = `${complexTableHead} px-4 py-3 text-left`;

// eslint-disable-next-line react-refresh/only-export-components
export function formatFechaLista(fechaStr) {
  if (!fechaStr) return '—';
  const s = String(fechaStr);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }
  if (s.includes('T')) {
    const [fechaPart] = s.split('T');
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaPart)) {
      const [y, m, d] = fechaPart.split('-');
      return `${d}/${m}/${y}`;
    }
  }
  const part = s.substring(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(part)) {
    const [y, m, d] = part.split('-');
    return `${d}/${m}/${y}`;
  }
  return s;
}

export function TablaListaShell({ children }) {
  return (
    <div className={complexTableWrap}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">{children}</table>
      </div>
    </div>
  );
}

export function MiniDropzoneArchivo({ nombreArchivo, onClick, vacio }) {
  const { t } = useTranslation();
  const textoVacio = vacio ?? t('complex.ui.seguimiento_observaciones_fenix_ui.arrastra_archivo');
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`${complexDropzoneBase} w-full cursor-pointer p-3 text-center transition-colors hover:border-gray-400 dark:hover:border-gray-500`}
    >
      {nombreArchivo ? (
        <span className="flex items-center justify-center gap-2 font-body text-sm font-medium text-gray-800 dark:text-gray-200">
          <FaFileAlt className="shrink-0 text-gray-500" aria-hidden />
          {nombreArchivo}
        </span>
      ) : (
        <span className="flex flex-col items-center gap-1 font-body text-xs text-gray-500 dark:text-gray-400">
          <FaCloudUploadAlt className="text-base" aria-hidden />
          {textoVacio}
        </span>
      )}
    </div>
  );
}

export function AccionesFilaNueva({ onGuardar, onCancelar }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-1">
      <button type="button" className={complexBtnSecondary} onClick={onGuardar} title={t("complex.ui.seguimiento_observaciones_fenix_ui.guardar")}>
        <FaCheck aria-hidden />
        <span className="sr-only">{t("complex.ui.seguimiento_observaciones_fenix_ui.guardar")}</span>
      </button>
      <button type="button" className={complexBtnDanger} onClick={onCancelar} title={t("complex.ui.seguimiento_observaciones_fenix_ui.cancelar_fila")}>
        <FaTimes aria-hidden />
        <span className="sr-only">{t("complex.ui.seguimiento_observaciones_fenix_ui.cancelar")}</span>
      </button>
    </div>
  );
}

export function CeldaFechaLista({ fecha }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap font-body text-sm text-gray-800 dark:text-gray-200">
      <FaCalendarAlt className="shrink-0 text-gray-400" aria-hidden />
      {formatFechaLista(fecha)}
    </div>
  );
}

export function EnlaceArchivoLista({ nombre, onClick, vacio }) {
  const { t } = useTranslation();
  const textoVacio = vacio ?? t('complex.ui.seguimiento_observaciones_fenix_ui.sin_archivo');
  if (!nombre) {
    return <span className="font-body text-sm text-gray-500 dark:text-gray-400">{textoVacio}</span>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex max-w-full items-center gap-1 font-body text-sm font-semibold text-gray-800 underline decoration-gray-300 underline-offset-2 hover:text-gray-900 dark:text-gray-200"
    >
      <FaFileAlt className="shrink-0 text-gray-500" aria-hidden />
      <span className="truncate">{nombre}</span>
    </button>
  );
}

export function BotonEliminarFila({ onClick, title }) {
  const { t } = useTranslation();
  const titulo = title ?? t('complex.ui.seguimiento_observaciones_fenix_ui.eliminar');
  return (
    <button type="button" className={complexBtnDanger} onClick={onClick} title={titulo}>
      <FaTrash className="text-xs" aria-hidden />
      <span className="sr-only">{titulo}</span>
    </button>
  );
}

export function ResumenListaPanel({ titulo, children, cols = 3 }) {
  const gridCols =
    cols === 2 ? 'md:grid-cols-2' : cols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-1';
  return (
    <div className={`${complexCard} mt-6`}>
      <h3 className={complexSubsectionTitle}>{titulo}</h3>
      <div className={`grid grid-cols-1 gap-4 font-body text-sm ${gridCols}`}>{children}</div>
    </div>
  );
}

export function ResumenItem({ label, value }) {
  return (
    <div>
      <span className="font-semibold text-gray-700 dark:text-gray-300">{label}</span>
      <span className="ml-2 text-gray-600 dark:text-gray-400">{value}</span>
    </div>
  );
}

export function MensajeTablaVacia({ colSpan, mensaje }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center font-body text-sm text-gray-500 dark:text-gray-400">
        {mensaje}
      </td>
    </tr>
  );
}

export const filaNuevaClass = 'bg-gray-50/80 dark:bg-gray-900/30';

export const filaListaClass = 'transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-900/20';
