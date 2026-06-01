import React, { useState } from 'react';
import { FaChevronDown, FaChevronRight, FaFileAlt, FaDownload, FaTrash } from 'react-icons/fa';
import {
  complexAccordionWrap,
  complexBtnDanger,
  complexBtnPrimary,
  complexBtnSecondary,
  complexDropzoneActive,
  complexDropzoneBase,
  complexHint,
  complexInput,
  complexLabel,
  complexSelect,
  complexSubsectionTitle,
  complexTextarea,
  complexDocRow,
  complexFormTabActive,
  complexFormTabIdle,
  complexFormTabsWrap,
  complexInputDisabled,
  complexBtnFormAction,
  complexBtnFormActionCancelHover,
  complexBtnFormActionSaveHover,
  complexFormHintPopover,
} from './complexFenixUi';
import { ComplexAvisoModal } from './ComplexUiBlocks';

function FormActionWithHint({ hint, hoverClassName = '', className = '', children, onClick, type = 'button' }) {
  const [mostrarHint, setMostrarHint] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setMostrarHint(true)}
      onMouseLeave={() => setMostrarHint(false)}
    >
      <button
        type={type}
        className={`${complexBtnFormAction} ${hoverClassName} ${className}`.trim()}
        onClick={onClick}
      >
        {children}
      </button>
      {mostrarHint && hint && (
        <div className={complexFormHintPopover} role="status">
          {hint}
        </div>
      )}
    </div>
  );
}

export function SeccionAcordeon({ abierto, onToggle, icon: Icon, titulo, subtitulo, children }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition hover:border-fenix-primario/25 dark:border-gray-800 dark:bg-[#1A1A1A]">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center gap-4 px-4 py-4 text-left transition sm:px-5 ${
          abierto ? 'bg-gray-50/80 dark:bg-gray-900/30' : 'hover:bg-gray-50/50 dark:hover:bg-gray-900/20'
        }`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-fenix-primario dark:bg-red-950/30">
          <Icon className="text-lg" />
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

/** Estilos react-select alineados a paleta fría Fénix */
export function getComplexSelectStyles(isDark = false) {
  const bg = isDark ? '#1A1A1A' : '#FFFFFF';
  const bgHover = isDark ? '#252525' : '#F9FAFB';
  const bgSelected = isDark ? '#374151' : '#4B5563';
  const text = isDark ? '#E5E7EB' : '#1F2937';
  const border = isDark ? '#374151' : '#E5E7EB';
  const borderFocus = isDark ? '#6B7280' : '#9CA3AF';

  return {
    control: (provided, state) => ({
      ...provided,
      minHeight: 40,
      fontSize: '0.875rem',
      backgroundColor: bg,
      borderColor: state.isFocused ? borderFocus : border,
      boxShadow: state.isFocused ? '0 0 0 2px rgba(107, 114, 128, 0.25)' : 'none',
      '&:hover': { borderColor: borderFocus },
    }),
    menu: (provided) => ({ ...provided, backgroundColor: bg, zIndex: 20 }),
    option: (provided, state) => ({
      ...provided,
      fontSize: '0.875rem',
      backgroundColor: state.isSelected ? bgSelected : state.isFocused ? bgHover : bg,
      color: state.isSelected ? '#FFFFFF' : text,
    }),
    singleValue: (provided) => ({ ...provided, color: text }),
    input: (provided) => ({ ...provided, color: text }),
    placeholder: (provided) => ({ ...provided, color: isDark ? '#9CA3AF' : '#9CA3AF' }),
  };
}

export function ValorFijo({ children }) {
  return <div className={complexInputDisabled}>{children}</div>;
}

export function ComplexFormTabs({ tabs, activeId, onChange }) {
  return (
    <nav className={complexFormTabsWrap} aria-label="Secciones del caso">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={activeId === id ? complexFormTabActive : complexFormTabIdle}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

export function ComplexFormActions({ onCancel, onEnviarRiesgos, cancelLabel = 'Cancelar' }) {
  const [modalCancelarAbierto, setModalCancelarAbierto] = useState(false);

  const confirmarCancelar = () => {
    setModalCancelarAbierto(false);
    onCancel?.();
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <FormActionWithHint
          hint="¿Desea cancelar el proceso? Elija Sí para salir o No para continuar."
          hoverClassName={complexBtnFormActionCancelHover}
          onClick={() => setModalCancelarAbierto(true)}
        >
          {cancelLabel}
        </FormActionWithHint>
        {onEnviarRiesgos && (
          <button
            type="button"
            className={`${complexBtnFormAction} hover:bg-gray-50 dark:hover:bg-gray-800`}
            onClick={onEnviarRiesgos}
          >
            Enviar a Riesgos
          </button>
        )}
        <FormActionWithHint
          type="submit"
          hint="Caso guardado"
          hoverClassName={complexBtnFormActionSaveHover}
        >
          Guardar
        </FormActionWithHint>
      </div>

      <ComplexAvisoModal
        open={modalCancelarAbierto}
        onClose={() => setModalCancelarAbierto(false)}
        titulo="Cancelar proceso"
        mensaje="¿Desea cancelar el proceso? Si sale ahora, puede perder los cambios que no haya guardado."
        tipo="warning"
        onConfirm={confirmarCancelar}
        confirmTexto="Sí, cancelar"
        cancelTexto="No, continuar"
        confirmVariant="danger"
      />
    </>
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

export function TextareaFenix({ className = '', ...props }) {
  return <textarea className={`${complexTextarea} ${className}`} {...props} />;
}

export function DropzoneFenix({ getRootProps, getInputProps, isDragActive, hint, children }) {
  const rootProps = getRootProps ? getRootProps() : {};
  return (
    <div>
      <div
        {...rootProps}
        className={`${complexDropzoneBase} ${isDragActive ? complexDropzoneActive : ''}`}
      >
        {getInputProps && <input {...getInputProps()} />}
        {children ?? (
          <p className={`font-body text-sm ${isDragActive ? 'font-medium text-fenix-primario' : 'text-gray-600 dark:text-gray-300'}`}>
            {isDragActive
              ? 'Suelta los archivos aquí...'
              : 'Arrastra y suelta archivos aquí, o haz clic para seleccionar.'}
          </p>
        )}
      </div>
      {hint && <p className={complexHint}>{hint}</p>}
    </div>
  );
}

export function ListaDocumentos({ titulo, documentos, onDescargar, onEliminar, tipoEliminar }) {
  if (!documentos?.length) return null;
  return (
    <div>
      <h4 className={`${complexSubsectionTitle} flex items-center gap-2 text-sm`}>
        <FaFileAlt className="text-fenix-primario" />
        {titulo} ({documentos.length})
      </h4>
      <div className="mt-2 space-y-2">
        {documentos.map((doc, index) => {
          const tieneUrl = doc.url || doc.ruta || doc.data;
          const nombreArchivo = doc.nombre || doc.filename || `Documento ${index + 1}`;
          return (
            <div key={doc._id || doc.id || index} className={complexDocRow}>
              <div className="min-w-0 flex-1">
                {tieneUrl ? (
                  <button
                    type="button"
                    onClick={(e) => onDescargar(doc, e)}
                    className="text-left font-body text-sm font-semibold text-fenix-primario underline hover:text-red-700"
                    title="Descargar"
                  >
                    {nombreArchivo}
                  </button>
                ) : (
                  <p className="font-body text-sm font-medium text-gray-800 dark:text-gray-200">{nombreArchivo}</p>
                )}
                {doc.fechaSubida && (
                  <p className="mt-0.5 font-body text-xs text-gray-500 dark:text-gray-400">
                    Subido: {new Date(doc.fechaSubida).toLocaleDateString('es-CO')}
                    {doc.usuario && ` · ${doc.usuario}`}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {tieneUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDescargar(doc, e);
                    }}
                    className={complexBtnSecondary}
                    title="Descargar"
                  >
                    <FaDownload />
                    Descargar
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEliminar(doc, tipoEliminar);
                  }}
                  className={complexBtnDanger}
                  title="Eliminar"
                >
                  <FaTrash />
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BotonEnviar({ disabled, enviando, children, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={complexBtnPrimary}>
      {children}
    </button>
  );
}

export { complexAccordionWrap };
