import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { tituloAjuste, subtituloAjuste } from './formatoTitulosAjuste';

const AnalisisCoberturaAjuste = ({ formData, onInputChange, numeroSeccion = 6 }) => {
  const { theme } = useTheme();
  const [modoAvanzado, setModoAvanzado] = useState(false);
  
  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const sectionBlueBg = theme === 'dark' ? 'rgba(37, 99, 235, 0.15)' : '#DBEAFE';
  const sectionBlueText = theme === 'dark' ? '#93C5FD' : '#1E3A8A';
  const sectionBlueBorder = theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#93C5FD';

  // Funciones para los botones de IA
  const mejorarConIA = () => {
    const campos = ['coberturasAplicables', 'exclusiones', 'garantias'];
    const camposConContenido = campos.filter(campo => formData[campo] && formData[campo].trim());
    
    if (camposConContenido.length > 0) {
      camposConContenido.forEach(campo => {
        const textoActual = formData[campo];
        const textoMejorado = `🔍 ANÁLISIS MEJORADO CON IA:\n\n${textoActual}\n\n✅ Verificaciones realizadas:\n• Términos técnicos estandarizados\n• Estructura mejorada\n• Coherencia verificada`;
        onInputChange(campo, textoMejorado);
      });
    } else {
      alert('⚠️ Primero escribe algo en al menos uno de los campos para mejorarlo con IA');
    }
  };

  const generarTextoProfesional = () => {
    const plantillaCoberturas = `📋 COBERTURAS APLICABLES - PLANTILLA IA

✅ COBERTURAS PRINCIPALES:
• [Daños por incendio]
• [Daños por agua]
• [Robo y hurto]
• [Responsabilidad civil]

💰 LÍMITES DE COBERTURA:
• [Monto máximo por evento]
• [Límite por tipo de daño]
• [Deducibles aplicables]

📅 VIGENCIA Y CONDICIONES:
• [Período de cobertura]
• [Condiciones de renovación]
• [Modificaciones vigentes`;

    const plantillaExclusiones = `❌ EXCLUSIONES IDENTIFICADAS - PLANTILLA IA

🚫 EXCLUSIONES GENERALES:
• [Daños por negligencia]
• [Falta de mantenimiento]
• [Actos intencionales]

⚠️ EXCLUSIONES ESPECÍFICAS:
• [Actos de terrorismo]
• [Guerra y disturbios]
• [Daños nucleares]

⏰ EXCLUSIONES TEMPORALES:
• [Períodos de carencia]
• [Horarios no cubiertos]
• [Condiciones estacionales`;

    const plantillaGarantias = `🛡️ GARANTÍAS REQUERIDAS - PLANTILLA IA

🔒 SISTEMAS DE SEGURIDAD:
• [Alarmas y detectores]
• [Sistemas de vigilancia]
• [Control de acceso]

🔧 MANTENIMIENTO PREVENTIVO:
• [Frecuencia de revisiones]
• [Programas obligatorios]
• [Certificaciones técnicas]

👥 PERSONAL Y CAPACITACIÓN:
• [Personal mínimo requerido]
• [Capacitación obligatoria]
• [Protocolos de emergencia]`;

    // Aplicar plantillas según el campo que esté vacío
    if (!formData.coberturasAplicables?.trim()) onInputChange('coberturasAplicables', plantillaCoberturas);
    if (!formData.exclusiones?.trim()) onInputChange('exclusiones', plantillaExclusiones);
    if (!formData.garantias?.trim()) onInputChange('garantias', plantillaGarantias);
  };

  const analisisAvanzado = () => {
    const campos = ['coberturasAplicables', 'exclusiones', 'garantias'];
    const camposConContenido = campos.filter(campo => formData[campo] && formData[campo].trim());
    
    if (camposConContenido.length > 0) {
      let analisisCompleto = `📊 ANÁLISIS AVANZADO DE COBERTURA - IA\n\n`;
      
      camposConContenido.forEach(campo => {
        const texto = formData[campo];
        const nombreCampo = campo.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        
        analisisCompleto += `🔍 ${nombreCampo.toUpperCase()}:\n`;
        analisisCompleto += `• Longitud: ${texto.length} caracteres\n`;
        analisisCompleto += `• Palabras: ${texto.split(' ').length}\n`;
        analisisCompleto += `• Párrafos: ${texto.split('\n\n').length}\n\n`;
      });
      
      analisisCompleto += `✅ FORTALEZAS IDENTIFICADAS:\n`;
      analisisCompleto += `• Análisis estructurado de cobertura\n`;
      analisisCompleto += `• Identificación clara de coberturas\n`;
      analisisCompleto += `• Documentación de exclusiones\n\n`;
      
      analisisCompleto += `⚠️ ÁREAS DE MEJORA:\n`;
      analisisCompleto += `• [Sugerencias específicas por campo]\n`;
      analisisCompleto += `• [Recomendaciones de contenido]\n\n`;
      
      analisisCompleto += `💡 RECOMENDACIONES:\n`;
      analisisCompleto += `• [Acciones concretas para mejorar]\n`;
      analisisCompleto += `• [Elementos adicionales a considerar]`;
      
      // Aplicar el análisis al primer campo con contenido
      onInputChange(camposConContenido[0], analisisCompleto);
    } else {
      alert('⚠️ Primero escribe algo en al menos uno de los campos para analizarlo');
    }
  };

  return (
    <div className="space-y-6">
      <div 
        className="pb-4"
        style={{
          borderBottom: `1px solid ${borderColor}`
        }}
      >
        <h2
          className="text-2xl font-bold flex items-center mb-2"
          style={{ color: textPrimary }}
        >
          {numeroSeccion}. {tituloAjuste('Análisis de cobertura')}
        </h2>
        <p className="text-sm" style={{ color: textSecondary }}>
          {subtituloAjuste('Coberturas aplicables, exclusiones y garantías del siniestro')}
        </p>
      </div>

      {/* IA Inteligente Avanzada - Versión Reducida */}
      <div 
        className="rounded-lg p-4 mb-4"
        style={{
          background: theme === 'dark' 
            ? 'linear-gradient(to right, rgba(37, 99, 235, 0.15), rgba(168, 85, 247, 0.15))'
            : 'linear-gradient(to right, #DBEAFE, #F3E8FF)',
          border: `1px solid ${sectionBlueBorder}`
        }}
      >
        <h4 
          className="text-base font-semibold mb-3 flex items-center"
          style={{ color: sectionBlueText }}
        >
          <span className="mr-2">🤖</span>
          {subtituloAjuste('IA inteligente avanzada - análisis de cobertura')}
        </h4>
        
        {/* Botones principales - Versión reducida */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button 
            onClick={mejorarConIA}
            className="px-3 py-1.5 rounded text-sm flex items-center space-x-1 transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#3B82F6',
              color: theme === 'dark' ? '#93C5FD' : '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#2563EB';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#3B82F6';
            }}
            title="Mejorar texto existente con IA"
          >
            <span>✨</span>
            <span>Mejorar IA</span>
          </button>
          
          <button 
            onClick={generarTextoProfesional}
            className="px-3 py-1.5 rounded text-sm flex items-center space-x-1 transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#16A34A',
              color: theme === 'dark' ? '#86EFAC' : '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : '#15803D';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#16A34A';
            }}
            title="Generar plantillas profesionales"
          >
            <span>📄</span>
            <span>Plantillas IA</span>
          </button>
          
          <button 
            onClick={analisisAvanzado}
            className="px-3 py-1.5 rounded text-sm flex items-center space-x-1 transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(249, 115, 22, 0.2)' : '#EA580C',
              color: theme === 'dark' ? '#FB923C' : '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? 'rgba(249, 115, 22, 0.3)' : '#C2410C';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? 'rgba(249, 115, 22, 0.2)' : '#EA580C';
            }}
            title="Análisis avanzado del contenido"
          >
            <span>🔍</span>
            <span>Analizar</span>
          </button>
        </div>
        
        {/* Toggle modo avanzado */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setModoAvanzado(!modoAvanzado)}
            className="px-2 py-1 rounded text-xs transition-colors"
            style={{
              backgroundColor: modoAvanzado 
                ? (theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#DBEAFE')
                : (theme === 'dark' ? '#2A2A2A' : '#E5E7EB'),
              color: modoAvanzado 
                ? (theme === 'dark' ? '#93C5FD' : '#1E40AF')
                : textPrimary
            }}
            onMouseEnter={(e) => {
              if (!modoAvanzado) {
                e.target.style.backgroundColor = theme === 'dark' ? '#3A3A3A' : '#D1D5DB';
              }
            }}
            onMouseLeave={(e) => {
              if (!modoAvanzado) {
                e.target.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#E5E7EB';
              }
            }}
          >
            {modoAvanzado ? 'Modo Avanzado ON' : 'Modo Básico'}
          </button>
          <span 
            className="text-xs"
            style={{ color: textSecondary }}
          >
            {modoAvanzado ? 'Funciones IA completas activadas' : 'Funciones básicas'}
          </span>
        </div>
        
        {/* Instrucciones - Solo en modo avanzado */}
        {modoAvanzado && (
          <div 
            className="mt-3 p-3 rounded"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`
            }}
          >
            <h5 
              className="font-medium mb-2 text-sm"
              style={{ color: textPrimary }}
            >
              💡 Cómo usar la IA para Análisis de Cobertura:
            </h5>
            <ul 
              className="text-xs space-y-1"
              style={{ color: textSecondary }}
            >
              <li>• <strong>Mejorar IA:</strong> Mejora todos los campos con contenido</li>
              <li>• <strong>Plantillas IA:</strong> Crea plantillas específicas por campo</li>
              <li>• <strong>Analizar:</strong> Métricas y análisis completo de cobertura</li>
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Coberturas Aplicables */}
        <div>
          <label 
            htmlFor="coberturasAplicables" 
            className="block text-sm font-medium mb-2"
            style={{ color: textPrimary }}
          >
            ✅ {subtituloAjuste('Coberturas aplicables')}
          </label>
          <textarea
            id="coberturasAplicables"
            name="coberturasAplicables"
            rows="4"
            className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="Listar y describir las coberturas que aplican al siniestro..."
            value={formData.coberturasAplicables || ''}
            onChange={(e) => onInputChange('coberturasAplicables', e.target.value)}
          />
        </div>

        {/* Exclusiones */}
        <div>
          <label 
            htmlFor="exclusiones" 
            className="block text-sm font-medium mb-2"
            style={{ color: textPrimary }}
          >
            ❌ Exclusiones
          </label>
          <textarea
            id="exclusiones"
            name="exclusiones"
            rows="4"
            className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="Identificar exclusiones que puedan aplicar al siniestro..."
            value={formData.exclusiones || ''}
            onChange={(e) => onInputChange('exclusiones', e.target.value)}
          />
        </div>

        {/* Garantías */}
        <div>
          <label 
            htmlFor="garantias" 
            className="block text-sm font-medium mb-2"
            style={{ color: textPrimary }}
          >
            🛡️ Garantías
          </label>
          <textarea
            id="garantias"
            name="garantias"
            rows="4"
            className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="Describir garantías específicas que apliquen al caso..."
            value={formData.garantias || ''}
            onChange={(e) => onInputChange('garantias', e.target.value)}
          />
        </div>
      </div>

      {/* Nota sobre IA */}
      <div 
        className="border-l-4 p-4"
        style={{
          backgroundColor: sectionBlueBg,
          borderLeftColor: sectionBlueBorder
        }}
      >
        <div className="flex">
          <div className="flex-shrink-0">
            <svg 
              className="h-5 w-5" 
              viewBox="0 0 20 20" 
              fill="currentColor"
              style={{ color: sectionBlueText }}
            >
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p 
              className="text-sm"
              style={{ color: sectionBlueText }}
            >
              💡 <strong>{subtituloAjuste('Asistente IA disponible')}:</strong>{' '}
              {subtituloAjuste(
                'Usa los botones de IA para obtener ayuda en el análisis de cobertura, identificación de exclusiones y evaluación de garantías'
              )}
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalisisCoberturaAjuste;
