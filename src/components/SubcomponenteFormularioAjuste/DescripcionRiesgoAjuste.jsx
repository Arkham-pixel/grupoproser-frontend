import React from 'react';
import { FaShieldAlt } from 'react-icons/fa';
import IAInteligente from './IAInteligente';
import { useTheme } from '../../context/ThemeContext';

export default function DescripcionRiesgoAjuste({ formData, onInputChange, numeroSeccion = 2 }) {
  const { theme } = useTheme();
  
  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const sectionYellowBg = theme === 'dark' ? 'rgba(234, 179, 8, 0.15)' : '#FEF9C3';
  const sectionYellowText = theme === 'dark' ? '#FDE047' : '#854D0E';
  const sectionYellowBorder = theme === 'dark' ? 'rgba(234, 179, 8, 0.3)' : '#FDE047';
  
  return (
    <div className="space-y-6">
      <div 
        className="pb-4"
        style={{
          borderBottom: `1px solid ${borderColor}`
        }}
      >
        <h2 
          className="text-2xl font-bold flex items-center"
          style={{ color: textPrimary }}
        >
          <FaShieldAlt 
            className="mr-3" 
            style={{ color: theme === 'dark' ? '#86EFAC' : '#16A34A' }}
          />
          {numeroSeccion}. DESCRIPCIÓN DE RIESGO
        </h2>
        <p 
          className="mt-2"
          style={{ color: textSecondary }}
        >
          Describa las características del riesgo asegurado
        </p>
      </div>

      {/* Campo de texto principal */}
      <div 
        className="p-4 rounded-lg"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <label 
          className="block text-sm font-medium mb-2"
          style={{ color: textPrimary }}
        >
          Descripción del Riesgo Asegurado
        </label>
        <textarea
          value={formData.descripcionRiesgo || ''}
          onChange={(e) => onInputChange('descripcionRiesgo', e.target.value)}
          rows={6}
          className="w-full px-3 py-2 rounded-md focus:outline-none resize-vertical"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
          placeholder="Escribe tu descripción del riesgo aquí. Por ejemplo: 'El edificio es de construcción antigua, tiene 3 pisos, está ubicado en zona comercial, no tiene sistema de alarmas moderno'"
        />
        <div 
          className="mt-2 text-sm"
          style={{ color: textSecondary }}
        >
          Mínimo recomendado: 100 palabras para una descripción profesional del riesgo
        </div>
      </div>

      {/* IA Inteligente */}
      <IAInteligente
        textoActual={formData.descripcionRiesgo || ''}
        onTextoCambiado={(texto) => onInputChange('descripcionRiesgo', texto)}
        contextoFormulario={formData}
        tipoSeccion="descripcionRiesgo"
        tituloSeccion="Descripción del Riesgo"
      />

      {/* Validación de calidad */}
      <div 
        className="p-4 rounded-lg"
        style={{
          backgroundColor: sectionYellowBg,
          border: `1px solid ${sectionYellowBorder}`
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4 flex items-center"
          style={{ color: sectionYellowText }}
        >
          📊 Validación de Calidad
        </h3>
        <div 
          className="text-sm"
          style={{ color: sectionYellowText }}
        >
          <p className="mb-2">
            <strong>Recomendaciones para descripción de riesgo de calidad:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Incluya la ubicación exacta y características del terreno</li>
            <li>Describa el tipo de construcción y materiales utilizados</li>
            <li>Mencione los sistemas de seguridad implementados</li>
            <li>Identifique factores que influyen en el nivel de riesgo</li>
            <li>Detalle los puntos críticos y medidas de protección</li>
            <li>Sea específico sobre vulnerabilidades identificadas</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
