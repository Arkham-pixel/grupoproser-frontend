import React from 'react';
import { FaCalendarAlt, FaCheck, FaCloudUploadAlt, FaFileAlt, FaTimes, FaTrash } from 'react-icons/fa';
import {
  complexBtnDanger,
  complexBtnSecondary,
  complexCard,
  complexDropzoneBase,
  complexHint,
  complexSubsectionTitle,
  complexTableHead,
  complexTableWrap,
} from './complexFenixUi';
import { trazabilidadInputClass } from './trazabilidadFenixUi';

export const inputListaClass = `${trazabilidadInputClass} !py-1.5`;

export const textareaListaClass = `${trazabilidadInputClass} min-h-[4rem] resize-none !py-1.5`;

export const thLista = `${complexTableHead} px-4 py-3 text-left`;

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

export function MiniDropzoneArchivo({ nombreArchivo, onClick, vacio = 'Arrastra un archivo o haz clic para seleccionar' }) {
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
          {vacio}
        </span>
      )}
    </div>
  );
}

export function AccionesFilaNueva({ onGuardar, onCancelar }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <button type="button" className={complexBtnSecondary} onClick={onGuardar} title="Guardar">
        <FaCheck aria-hidden />
        <span className="sr-only">Guardar</span>
      </button>
      <button type="button" className={complexBtnDanger} onClick={onCancelar} title="Cancelar fila">
        <FaTimes aria-hidden />
        <span className="sr-only">Cancelar</span>
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

export function EnlaceArchivoLista({ nombre, onClick, vacio = 'Sin archivo' }) {
  if (!nombre) {
    return <span className="font-body text-sm text-gray-500 dark:text-gray-400">{vacio}</span>;
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

export function BotonEliminarFila({ onClick, title = 'Eliminar' }) {
  return (
    <button type="button" className={complexBtnDanger} onClick={onClick} title={title}>
      <FaTrash className="text-xs" aria-hidden />
      <span className="sr-only">{title}</span>
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
