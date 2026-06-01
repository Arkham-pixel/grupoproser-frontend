import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import IAInteligente from './IAInteligente';
import { useTheme } from '../../context/ThemeContext';

export default function CircunstanciaSiniestroAjuste({ formData, onInputChange, numeroSeccion = 3 }) {
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
          <FaExclamationTriangle 
            className="mr-3" 
            style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
          />
          {numeroSeccion}. CIRCUNSTANCIAS DEL SINIESTRO
        </h2>
        <p 
          className="mt-2"
          style={{ color: textSecondary }}
        >
          En el informe preliminar este texto va en la sección «Circunstancias del siniestro» (lo escrito en el acta como descripción del siniestro).
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
          Circunstancias del Siniestro
        </label>
        <textarea
          value={formData.circunstanciasSiniestro || formData.descripcionSiniestro || ''}
          onChange={(e) => onInputChange('circunstanciasSiniestro', e.target.value)}
          rows={6}
          className="w-full px-3 py-2 rounded-md focus:outline-none resize-vertical"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
          placeholder="Escribe las circunstancias del siniestro aquí. Por ejemplo: 'El incendio empezo en el sotano, se propago rapido por los cables electricos, los bomberos llegaron tarde'"
        />
        <div 
          className="mt-2 text-sm"
          style={{ color: textSecondary }}
        >
          Mínimo recomendado: 80 palabras para describir las circunstancias del siniestro
        </div>
      </div>

      {/* IA Inteligente */}
      <IAInteligente
        textoActual={formData.circunstanciasSiniestro || ''}
        onTextoCambiado={(texto) => onInputChange('circunstanciasSiniestro', texto)}
        contextoFormulario={formData}
        tipoSeccion="circunstanciasSiniestro"
        tituloSeccion="Circunstancias del Siniestro"
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
            <strong>Recomendaciones para circunstancias del siniestro de calidad:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Describa cómo se inició el incidente</li>
            <li>Mencione la secuencia de eventos que ocurrieron</li>
            <li>Incluya el tiempo de respuesta de las autoridades</li>
            <li>Detalle las acciones tomadas durante el incidente</li>
            <li>Mencione factores que agravaron la situación</li>
            <li>Sea específico sobre el impacto y consecuencias</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
