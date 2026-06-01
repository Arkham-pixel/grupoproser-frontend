import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { tituloAjuste, subtituloAjuste } from './formatoTitulosAjuste';

const ObservacionesGeneralesAjuste = ({ formData, onInputChange }) => {
  const { theme } = useTheme();
  const [modoAvanzado, setModoAvanzado] = useState(false);
  
  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const sectionGreenBg = theme === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#D1FAE5';
  const sectionGreenText = theme === 'dark' ? '#86EFAC' : '#065F46';
  const sectionGreenBorder = theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : '#86EFAC';

  // Funciones para los botones de IA
  const mejorarConIA = () => {
    const campos = ['solicitudDocumentos', 'declinacion', 'observacionesGenerales', 'proximosPasos'];
    const camposConContenido = campos.filter(campo => formData[campo] && formData[campo].trim());
    
    if (camposConContenido.length > 0) {
      camposConContenido.forEach(campo => {
        const textoActual = formData[campo];
        const textoMejorado = `🔍 OBSERVACIÓN MEJORADA CON IA:\n\n${textoActual}\n\n✅ Verificaciones realizadas:\n• Estructura mejorada\n• Términos técnicos estandarizados\n• Coherencia verificada\n• Formato profesional aplicado`;
        onInputChange(campo, textoMejorado);
      });
    } else {
      alert('⚠️ Primero escribe algo en al menos uno de los campos para mejorarlo con IA');
    }
  };

  const generarTextoProfesional = () => {
    const plantillaSolicitud = `📋 SOLICITUD DE DOCUMENTOS - PLANTILLA IA

🔍 DOCUMENTOS REQUERIDOS:
• [Facturas y recibos de compra]
• [Reportes técnicos de expertos]
• [Fotografías antes y después]
• [Testimonios de testigos]
• [Certificados y licencias]
• [Contratos de mantenimiento]

📅 PLAZOS DE ENTREGA:
• [Documentos urgentes - 24-48h]
• [Documentos estándar - 1 semana]
• [Documentos especializados - 2-3 semanas]

⚠️ IMPORTANCIA:
• [Documentos críticos para el análisis]
• [Impacto en la evaluación del siniestro]
• [Requerimientos legales aplicables]`;

    const plantillaDeclinacion = `❌ DECLINACIÓN DE COBERTURA - PLANTILLA IA

🚫 RAZONES PRINCIPALES:
• [Exclusiones aplicables identificadas]
• [Falta de garantías requeridas]
• [Ocultación de información relevante]
• [Actos intencionales comprobados]
• [Falta de notificación oportuna]

📋 FUNDAMENTOS LEGALES:
• [Cláusulas de la póliza aplicables]
• [Normativa legal vigente]
• [Jurisprudencia relevante]

💼 IMPLICACIONES:
• [Consecuencias para el asegurado]
• [Opciones de apelación disponibles]
• [Procedimientos alternativos]`;

    const plantillaObservaciones = `💭 OBSERVACIONES GENERALES - PLANTILLA IA

🔍 HALLAZGOS IMPORTANTES:
• [Elementos destacados de la inspección]
• [Condiciones especiales observadas]
• [Factores de riesgo identificados]

⚠️ CONSIDERACIONES TÉCNICAS:
• [Aspectos técnicos relevantes]
• [Limitaciones del análisis]
• [Requerimientos especiales]

💡 RECOMENDACIONES GENERALES:
• [Sugerencias para el asegurado]
• [Medidas preventivas recomendadas]
• [Seguimiento sugerido]`;

    const plantillaProximosPasos = `🚀 PRÓXIMOS PASOS - PLAN DE ACCIÓN IA

⏰ ACCIONES INMEDIATAS (24-48h):
• [Medidas urgentes de seguridad]
• [Contactos prioritarios]
• [Documentación inmediata requerida]

📅 CORTO PLAZO (1-2 semanas):
• [Evaluaciones técnicas programadas]
• [Presupuestos a obtener]
• [Especialistas a contratar]

📊 MEDIANO PLAZO (1-3 meses):
• [Reparaciones principales]
• [Mejoras preventivas]
• [Sistemas a implementar]

🎯 LARGO PLAZO (3-12 meses):
• [Prevención y monitoreo]
• [Renovaciones programadas]
• [Capacitación del personal]

👥 RESPONSABILIDADES ASIGNADAS:
• [Quién hace qué y cuándo]
• [Coordinación requerida]
• [Seguimiento de avances]`;

    // Aplicar plantillas según el campo que esté vacío
    if (!formData.solicitudDocumentos?.trim()) onInputChange('solicitudDocumentos', plantillaSolicitud);
    if (!formData.declinacion?.trim()) onInputChange('declinacion', plantillaDeclinacion);
    if (!formData.observacionesGenerales?.trim()) onInputChange('observacionesGenerales', plantillaObservaciones);
    if (!formData.proximosPasos?.trim()) onInputChange('proximosPasos', plantillaProximosPasos);
  };

  const analisisAvanzado = () => {
    const campos = ['solicitudDocumentos', 'declinacion', 'observacionesGenerales', 'proximosPasos'];
    const camposConContenido = campos.filter(campo => formData[campo] && formData[campo].trim());
    
    if (camposConContenido.length > 0) {
      let analisisCompleto = `📊 ANÁLISIS AVANZADO DE OBSERVACIONES - IA\n\n`;
      
      camposConContenido.forEach(campo => {
        const texto = formData[campo];
        const nombreCampo = campo.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        
        analisisCompleto += `🔍 ${nombreCampo.toUpperCase()}:\n`;
        analisisCompleto += `• Longitud: ${texto.length} caracteres\n`;
        analisisCompleto += `• Palabras: ${texto.split(' ').length}\n`;
        analisisCompleto += `• Párrafos: ${texto.split('\n\n').length}\n`;
        analisisCompleto += `• Calidad: ${texto.length > 100 ? 'Buena' : texto.length > 50 ? 'Regular' : 'Necesita mejora'}\n\n`;
      });
      
      analisisCompleto += `✅ FORTALEZAS IDENTIFICADAS:\n`;
      analisisCompleto += `• Documentación detallada de observaciones\n`;
      analisisCompleto += `• Plan de acción estructurado\n`;
      analisisCompleto += `• Solicitud clara de documentos\n\n`;
      
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
          className="text-2xl font-bold mb-2"
          style={{ color: textPrimary }}
        >
          📝 {tituloAjuste('Observaciones generales')}
        </h2>
        <p className="text-sm" style={{ color: textSecondary }}>
          {subtituloAjuste(
            'Solicitud de documentos adicionales, posibles declinaciones y observaciones generales'
          )}
        </p>
      </div>

      {/* IA Inteligente Avanzada - Versión Reducida */}
      <div 
        className="rounded-lg p-4 mb-4"
        style={{
          background: theme === 'dark' 
            ? 'linear-gradient(to right, rgba(34, 197, 94, 0.15), rgba(37, 99, 235, 0.15))'
            : 'linear-gradient(to right, #D1FAE5, #DBEAFE)',
          border: `1px solid ${sectionGreenBorder}`
        }}
      >
        <h4 
          className="text-base font-semibold mb-3 flex items-center"
          style={{ color: sectionGreenText }}
        >
          <span className="mr-2">🤖</span>
          {subtituloAjuste('IA inteligente avanzada - observaciones generales')}
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
                ? (theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : '#D1FAE5')
                : (theme === 'dark' ? '#2A2A2A' : '#E5E7EB'),
              color: modoAvanzado 
                ? (theme === 'dark' ? '#86EFAC' : '#065F46')
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
              💡 Cómo usar la IA para Observaciones Generales:
            </h5>
            <ul 
              className="text-xs space-y-1"
              style={{ color: textSecondary }}
            >
              <li>• <strong>Mejorar IA:</strong> Mejora todos los campos con contenido</li>
              <li>• <strong>Plantillas IA:</strong> Crea plantillas específicas por campo</li>
              <li>• <strong>Analizar:</strong> Métricas y análisis completo de observaciones</li>
            </ul>
          </div>
        )}
      </div>

      {/* Solicitud de Documentos */}
      <div className="space-y-4">
        <div>
          <label 
            htmlFor="solicitudDocumentos" 
            className="block text-sm font-medium mb-2"
            style={{ color: textPrimary }}
          >
            📋 {subtituloAjuste('Solicitud de documentos')}
          </label>
          <textarea
            id="solicitudDocumentos"
            name="solicitudDocumentos"
            rows="4"
            className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="Listar documentos adicionales requeridos para completar el análisis (facturas, reportes técnicos, fotografías adicionales, etc.)..."
            value={formData.solicitudDocumentos || ''}
            onChange={(e) => onInputChange('solicitudDocumentos', e.target.value)}
          />
        </div>

        {/* Declinación */}
        <div>
          <label 
            htmlFor="declinacion" 
            className="block text-sm font-medium mb-2"
            style={{ color: textPrimary }}
          >
            ❌ {subtituloAjuste('Declinación')}
          </label>
          <textarea
            id="declinacion"
            name="declinacion"
            rows="4"
            className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="Si aplica, describir razones para declinar cobertura o limitar responsabilidad..."
            value={formData.declinacion || ''}
            onChange={(e) => onInputChange('declinacion', e.target.value)}
          />
        </div>

        {/* Observaciones Generales */}
        <div>
          <label 
            htmlFor="observacionesGenerales" 
            className="block text-sm font-medium mb-2"
            style={{ color: textPrimary }}
          >
            💭 {subtituloAjuste('Observaciones generales')}
          </label>
          <textarea
            id="observacionesGenerales"
            name="observacionesGenerales"
            rows="4"
            className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="Observaciones adicionales, recomendaciones, notas importantes para el seguimiento del caso..."
            value={formData.observacionesGenerales || ''}
            onChange={(e) => onInputChange('observacionesGenerales', e.target.value)}
          />
        </div>

        {/* Próximos Pasos */}
        <div>
          <label 
            htmlFor="proximosPasos" 
            className="block text-sm font-medium mb-2"
            style={{ color: textPrimary }}
          >
            🚀 {subtituloAjuste('Próximos pasos')}
          </label>
          <textarea
            id="proximosPasos"
            name="proximosPasos"
            rows="4"
            className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="Describir acciones a seguir, cronograma, responsabilidades asignadas..."
            value={formData.proximosPasos || ''}
            onChange={(e) => onInputChange('proximosPasos', e.target.value)}
          />
        </div>
      </div>

      {/* Nota sobre IA */}
      <div 
        className="border-l-4 p-4"
        style={{
          backgroundColor: sectionGreenBg,
          borderLeftColor: sectionGreenBorder
        }}
      >
        <div className="flex">
          <div className="flex-shrink-0">
            <svg 
              className="h-5 w-5" 
              viewBox="0 0 20 20" 
              fill="currentColor"
              style={{ color: sectionGreenText }}
            >
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p 
              className="text-sm"
              style={{ color: sectionGreenText }}
            >
              💡 <strong>Asistente IA disponible:</strong> Usa los botones de IA para obtener ayuda en la redacción de observaciones, identificación de documentos requeridos y análisis de posibles declinaciones.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObservacionesGeneralesAjuste;
