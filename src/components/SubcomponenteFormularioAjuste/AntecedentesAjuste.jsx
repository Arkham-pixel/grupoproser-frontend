import React, { useState } from 'react';
import { FaBook, FaLightbulb, FaCheck, FaCopy } from 'react-icons/fa';
import IAInteligente from './IAInteligente';
import { useTheme } from '../../context/ThemeContext';

export default function AntecedentesAjuste({ formData, onInputChange, numeroSeccion = 1 }) {
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
          <FaBook 
            className="mr-3" 
            style={{ color: theme === 'dark' ? '#93C5FD' : '#2563EB' }}
          />
          {numeroSeccion}. ANTECEDENTES
        </h2>
        <p 
          className="mt-2"
          style={{ color: textSecondary }}
        >
          Describa los antecedentes del siniestro
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
          Descripción de Antecedentes
        </label>
        <textarea
          value={formData.antecedentes || ''}
          onChange={(e) => onInputChange('antecedentes', e.target.value)}
          rows={6}
          className="w-full px-3 py-2 rounded-md focus:outline-none resize-vertical"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
          placeholder="Escribe tu idea inicial aquí. Por ejemplo: 'El edificio X tubo un incendio ocasionado por una falla electrica a la hora 11 am segun testigo daños tal tal tal'"
        />
        <div 
          className="mt-2 text-sm"
          style={{ color: textSecondary }}
        >
          Mínimo recomendado: 50 palabras para un reporte profesional
        </div>
      </div>

      {/* IA Inteligente */}
      <IAInteligente
        textoActual={formData.antecedentes || ''}
        onTextoCambiado={(texto) => onInputChange('antecedentes', texto)}
        contextoFormulario={formData}
        tipoSeccion="antecedentes"
        tituloSeccion="Antecedentes"
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
            <strong>Recomendaciones para antecedentes de calidad:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Incluya fecha y hora exacta del incidente</li>
            <li>Mencione la ubicación específica donde ocurrió</li>
            <li>Describa las circunstancias que rodearon el evento</li>
            <li>Identifique a las personas involucradas o testigos</li>
            <li>Mencione los sistemas o protocolos activados</li>
            <li>Sea objetivo y preciso en la descripción</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
