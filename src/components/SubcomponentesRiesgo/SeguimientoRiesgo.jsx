import React, { useRef } from "react";
import Select from "react-select";
import { useTheme } from '../../context/ThemeContext';

function DropZone({ onFile, label, existingFile }) {
  const { theme } = useTheme();
  const inputRef = useRef();
  const [isDragActive, setIsDragActive] = React.useState(false);
  
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  return (
    <div
      onClick={() => inputRef.current.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="border-2 border-dashed rounded px-2 sm:px-4 py-4 sm:py-6 lg:py-8 text-center cursor-pointer transition"
      style={{ 
        minHeight: 80,
        borderColor: isDragActive 
          ? (theme === 'dark' ? '#DC2626' : '#2563EB')
          : borderColor,
        backgroundColor: isDragActive 
          ? (theme === 'dark' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(37, 99, 235, 0.1)')
          : 'transparent'
      }}
      onMouseEnter={(e) => {
        if (!isDragActive) {
          e.currentTarget.style.borderColor = theme === 'dark' ? '#3D3D3D' : '#9CA3AF';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragActive) {
          e.currentTarget.style.borderColor = borderColor;
        }
      }}
    >
      <input
        type="file"
        ref={inputRef}
        style={{ display: "none" }}
        onChange={(e) => onFile(e.target.files[0])}
      />
      <div>
        <span role="img" aria-label="upload" className="text-lg sm:text-xl lg:text-2xl">
          📁
        </span>
        <div 
          className="text-xs sm:text-sm font-medium"
          style={{ color: textPrimary }}
        >
          {label}
        </div>
        <div 
          className="text-xs mt-1"
          style={{ color: textSecondary }}
        >
          Arrastra un archivo o haz clic aquí
        </div>
        {existingFile && (
          <div 
            className="text-xs mt-1 font-semibold"
            style={{ color: '#10B981' }}
          >
            {typeof existingFile === 'string' ? existingFile : existingFile.name}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SeguimientoRiesgo({ formData, setFormData, ciudades = [] }) {
  const { theme } = useTheme();
  
  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  
  // Buscar la ciudad seleccionada por código
  const ciudadSeleccionada = ciudades.find(c => c.value === (formData.ciudadSucursal || formData.ciudad || (formData.ciudad && formData.ciudad.value)));

  return (
    <div 
      className="p-3 sm:p-4 lg:p-6 rounded shadow max-w-3xl mx-auto"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`
      }}
    >
      <h2 
        className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-6"
        style={{ color: theme === 'dark' ? '#FFFFFF' : '#1E40AF' }}
      >
        Seguimiento de Riesgo
      </h2>

      {/* Select ciudad y consecutivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <div>
          <label 
            className="font-semibold block mb-1 text-xs sm:text-sm"
            style={{ color: textPrimary }}
          >
            Ciudad Sucursal Aseguradora
          </label>
          <Select
            options={ciudades}
            value={ciudadSeleccionada || null}
            onChange={selected => setFormData(prev => ({ ...prev, ciudadSucursal: selected ? selected.value : '' }))}
            placeholder="Seleccione..."
            isClearable
            className="text-xs sm:text-sm"
            styles={{
              control: (provided, state) => ({
                ...provided,
                fontSize: '0.875rem',
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: state.isFocused ? (theme === 'dark' ? '#DC2626' : '#2563EB') : borderColor,
                boxShadow: state.isFocused ? `0 0 0 1px ${theme === 'dark' ? '#DC2626' : '#2563EB'}` : 'none',
                '&:hover': {
                  borderColor: theme === 'dark' ? '#DC2626' : '#2563EB',
                },
                '@media (min-width: 640px)': {
                  fontSize: '1rem'
                }
              }),
              option: (provided, state) => ({
                ...provided,
                backgroundColor: state.isSelected 
                  ? (theme === 'dark' ? '#DC2626' : '#2563EB')
                  : state.isFocused
                  ? (theme === 'dark' ? '#2A2A2A' : '#F3F4F6')
                  : inputBg,
                color: state.isSelected 
                  ? '#FFFFFF'
                  : textPrimary
              }),
              singleValue: (provided) => ({
                ...provided,
                color: textPrimary
              }),
              placeholder: (provided) => ({
                ...provided,
                color: textSecondary
              })
            }}
          />
        </div>
        <div>
          <label 
            className="font-semibold block mb-1 text-xs sm:text-sm"
            style={{ color: textPrimary }}
          >
            Consecutivo Aseguradora
          </label>
          <input
            type="text"
            value={formData.nmroConsecutivo || ''}
            onChange={e => setFormData(prev => ({ ...prev, nmroConsecutivo: e.target.value }))}
            className="w-full rounded px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
          />
        </div>
      </div>

      {/* Adjuntos y observaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <div>
          <label 
            className="font-semibold block mb-1 text-xs sm:text-sm"
            style={{ color: textPrimary }}
          >
            Adjunto Inspección
          </label>
          <DropZone onFile={file => setFormData(prev => ({ ...prev, adjuntoInspeccion: file }))} label="Adjunta inspección" existingFile={formData.adjuntoInspeccion} />
        </div>
        <div>
          <label 
            className="font-semibold block mb-1 text-xs sm:text-sm"
            style={{ color: textPrimary }}
          >
            Observaciones Asignación
          </label>
          <textarea
            value={formData.observAsignacion || ''}
            onChange={e => setFormData(prev => ({ ...prev, observAsignacion: e.target.value }))}
            className="w-full rounded px-2 sm:px-3 py-1 sm:py-2 min-h-[80px] text-xs sm:text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <div>
          <label 
            className="font-semibold block mb-1 text-xs sm:text-sm"
            style={{ color: textPrimary }}
          >
            Adjunto Asignación
          </label>
          <DropZone onFile={file => setFormData(prev => ({ ...prev, adjuntoAsignacion: file }))} label="Adjunta asignación" existingFile={formData.adjuntoAsignacion} />
        </div>
        <div>
          <label 
            className="font-semibold block mb-1 text-xs sm:text-sm"
            style={{ color: textPrimary }}
          >
            Fecha de Informe
          </label>
          <input
            type="date"
            value={formData.fchaInforme ? String(formData.fchaInforme).slice(0,10) : ''}
            onChange={e => setFormData(prev => ({ ...prev, fchaInforme: e.target.value }))}
            className="w-full rounded px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        <div>
          <label 
            className="font-semibold block mb-1 text-xs sm:text-sm"
            style={{ color: textPrimary }}
          >
            Adjunto Informe Final
          </label>
          <DropZone onFile={file => setFormData(prev => ({ ...prev, anxoInfoFnal: file }))} label="Adjunta informe final" existingFile={formData.anxoInfoFnal} />
        </div>
        <div>
          <label 
            className="font-semibold block mb-1 text-xs sm:text-sm"
            style={{ color: textPrimary }}
          >
            Observaciones Informe Final
          </label>
          <textarea
            value={formData.observInforme || ''}
            onChange={e => setFormData(prev => ({ ...prev, observInforme: e.target.value }))}
            className="w-full rounded px-2 sm:px-3 py-1 sm:py-2 min-h-[80px] text-xs sm:text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
          />
        </div>
      </div>
    </div>
  );
}