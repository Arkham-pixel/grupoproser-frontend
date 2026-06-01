import React, { useRef, useState } from "react";
import { FaCalculator } from "react-icons/fa";
import { useTheme } from '../../context/ThemeContext';

function DropZone({ onFile, label, existingFile }) {
  const { theme } = useTheme();
  const inputRef = useRef();
  const [isDragActive, setIsDragActive] = useState(false);
  
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
          : (theme === 'dark' ? '#2A2A2A' : '#F9FAFB')
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
        <span role="img" aria-label="upload" className="text-lg sm:text-xl lg:text-2xl">📁</span>
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
          Arrastra un archivo y suéltalo aquí
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

function moneyInputValue(value) {
  if (!value || value === "$" || value === "$ ") return "$";
  return "$ " + Number(String(value).replace(/\D/g, "")).toLocaleString("es-CO");
}

function Calculadora({ open, onClose, onResult }) {
  const { theme } = useTheme();
  const [exp, setExp] = useState("");
  
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const buttonBg = theme === 'dark' ? '#2A2A2A' : '#F3F4F6';
  const buttonHover = theme === 'dark' ? '#3A3A3A' : '#E5E7EB';
  
  if (!open) return null;
  const handleButton = (val) => setExp(exp + val);
  const handleClear = () => setExp("");
  const handleBack = () => setExp(exp.slice(0, -1));
  const handleEval = () => {
    try {
      // Validar que solo contenga números y operadores matemáticos válidos
      if (!/^[\d+\-*/().\s]+$/.test(exp)) {
        setExp("Error");
        return;
      }
      // Usar Function en lugar de eval es más seguro con validación previa
      const sanitizedExp = exp.replace(/[^0-9+\-*/().\s]/g, '');
      const res = new Function(`return (${sanitizedExp})`)();
      if (!isNaN(res) && isFinite(res)) {
        onResult(String(Math.round(res)));
        onClose();
      } else {
        setExp("Error");
      }
    } catch {
      setExp("Error");
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div 
        className="rounded shadow-lg p-3 sm:p-4 w-64 sm:w-72 lg:w-80"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <div className="mb-2 flex">
          <input
            className="rounded px-2 sm:px-3 py-1 sm:py-2 w-full text-right text-xs sm:text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            value={exp}
            readOnly
          />
        </div>
        <div className="grid grid-cols-4 gap-1 sm:gap-2 mb-2">
          {[7,8,9,"/"].map(v => (
            <button 
              key={v} 
              className="rounded py-1 sm:py-2 text-xs sm:text-sm transition-colors"
              style={{
                backgroundColor: buttonBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = buttonHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = buttonBg;
              }}
              onClick={()=>handleButton(v)}
            >
              {v}
            </button>
          ))}
          {[4,5,6,"*"].map(v => (
            <button 
              key={v} 
              className="rounded py-1 sm:py-2 text-xs sm:text-sm transition-colors"
              style={{
                backgroundColor: buttonBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = buttonHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = buttonBg;
              }}
              onClick={()=>handleButton(v)}
            >
              {v}
            </button>
          ))}
          {[1,2,3,"-"].map(v => (
            <button 
              key={v} 
              className="rounded py-1 sm:py-2 text-xs sm:text-sm transition-colors"
              style={{
                backgroundColor: buttonBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = buttonHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = buttonBg;
              }}
              onClick={()=>handleButton(v)}
            >
              {v}
            </button>
          ))}
          {[0,".","C","+"].map(v =>
            v === "C"
              ? (
                <button 
                  key={v} 
                  className="rounded py-1 sm:py-2 text-xs sm:text-sm transition-colors"
                  style={{
                    backgroundColor: buttonBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = buttonHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = buttonBg;
                  }}
                  onClick={handleClear}
                >
                  C
                </button>
              )
              : (
                <button 
                  key={v} 
                  className="rounded py-1 sm:py-2 text-xs sm:text-sm transition-colors"
                  style={{
                    backgroundColor: buttonBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = buttonHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = buttonBg;
                  }}
                  onClick={()=>handleButton(v)}
                >
                  {v}
                </button>
              )
          )}
        </div>
        <div className="flex justify-between">
          <button 
            className="rounded px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm transition-colors"
            style={{
              backgroundColor: buttonBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = buttonHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = buttonBg;
            }}
            onClick={handleBack}
          >
            ←
          </button>
          <button 
            className="rounded px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? '#DC2626' : '#2563EB',
              color: '#FFFFFF',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#B91C1C' : '#1D4ED8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#DC2626' : '#2563EB';
            }}
            onClick={handleEval}
          >
            =
          </button>
          <button 
            className="rounded px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm transition-colors"
            style={{
              backgroundColor: buttonBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = buttonHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = buttonBg;
            }}
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FacturacionRiesgo({ formData, setFormData }) {
  const { theme } = useTheme();
  
  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  
  // Para mostrar la calculadora
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcTarget, setCalcTarget] = useState(null);

  const handleMoneyChange = (field) => (e) => {
    const value = e.target.value.replace(/\D/g, "");
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Abre la calculadora para el campo correspondiente
  const openCalc = (target) => {
    setCalcTarget(target);
    setCalcOpen(true);
  };

  // Cuando la calculadora retorna un resultado
  const handleCalcResult = (result) => {
    if (calcTarget) setFormData(prev => ({ ...prev, [calcTarget]: result }));
  };

  return (
    <div 
      className="p-3 sm:p-4 lg:p-6 rounded shadow max-w-4xl mx-auto"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`
      }}
    >
      <Calculadora
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        onResult={handleCalcResult}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-4 sm:mb-6">
        <div>
          <label 
            className="block text-xs sm:text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Valor Tarifa Aseguradora
          </label>
          <input
            type="text"
            value={moneyInputValue(formData.vlorTarifaAseguradora)}
            onChange={handleMoneyChange('vlorTarifaAseguradora')}
            className="w-full rounded px-2 sm:px-3 py-1 sm:py-2 mb-3 sm:mb-4 text-xs sm:text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="$"
          />
          <label 
            className="block text-xs sm:text-sm font-semibold mb-1 flex items-center"
            style={{ color: textPrimary }}
          >
            Gastos
            <button
              type="button"
              className="ml-2 text-xs sm:text-sm transition-colors"
              style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme === 'dark' ? '#93C5FD' : '#1D4ED8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme === 'dark' ? '#60A5FA' : '#2563EB';
              }}
              onClick={() => openCalc("vlorGastos")}
              tabIndex={-1}
              title="Abrir calculadora"
            >
              <FaCalculator />
            </button>
          </label>
          <input
            type="text"
            value={moneyInputValue(formData.vlorGastos)}
            onChange={handleMoneyChange('vlorGastos')}
            className="w-full rounded px-2 sm:px-3 py-1 sm:py-2 mb-3 sm:mb-4 text-xs sm:text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="$"
          />
          <label 
            className="block text-xs sm:text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Fecha Factura
          </label>
          <input
            type="date"
            value={formData.fchaFactra ? String(formData.fchaFactra).slice(0,10) : ''}
            onChange={e => setFormData(prev => ({ ...prev, fchaFactra: e.target.value }))}
            className="w-full rounded px-2 sm:px-3 py-1 sm:py-2 mb-3 sm:mb-4 text-xs sm:text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
          />
        </div>
        <div>
          <label 
            className="block text-xs sm:text-sm font-semibold mb-1 flex items-center"
            style={{ color: textPrimary }}
          >
            Honorarios
            <button
              type="button"
              className="ml-2 text-xs sm:text-sm transition-colors"
              style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme === 'dark' ? '#93C5FD' : '#1D4ED8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme === 'dark' ? '#60A5FA' : '#2563EB';
              }}
              onClick={() => openCalc("vlorHonorarios")}
              tabIndex={-1}
              title="Abrir calculadora"
            >
              <FaCalculator />
            </button>
          </label>
          <input
            type="text"
            value={moneyInputValue(formData.vlorHonorarios)}
            onChange={handleMoneyChange('vlorHonorarios')}
            className="w-full rounded px-2 sm:px-3 py-1 sm:py-2 mb-3 sm:mb-4 text-xs sm:text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="$"
          />
          <label 
            className="block text-xs sm:text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Numero Factura
          </label>
          <input
            type="text"
            value={formData.nmroFactra ? String(formData.nmroFactra).replace(/\D/g, "") : ''}
            onChange={e => setFormData(prev => ({ ...prev, nmroFactra: e.target.value.replace(/\D/g, "") }))}
            className="w-full rounded px-2 sm:px-3 py-1 sm:py-2 mb-3 sm:mb-4 text-xs sm:text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="0"
          />
          <label 
            className="block text-xs sm:text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Total Pagado
          </label>
          <input
            type="text"
            value={moneyInputValue(formData.totalPagado)}
            onChange={handleMoneyChange('totalPagado')}
            className="w-full rounded px-2 sm:px-3 py-1 sm:py-2 mb-3 sm:mb-4 text-xs sm:text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="$"
          />
        </div>
      </div>
      <div className="mb-4 sm:mb-6">
        <label 
          className="block text-xs sm:text-sm font-semibold mb-1"
          style={{ color: textPrimary }}
        >
          Adjunto Factura
        </label>
        <DropZone onFile={file => setFormData(prev => ({ ...prev, anxoFactra: file }))} label="Adjunta la factura" existingFile={formData.anxoFactra} />
      </div>
    </div>
  );
}