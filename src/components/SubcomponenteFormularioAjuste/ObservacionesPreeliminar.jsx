import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const ObservacionesPreeliminar = ({ formData, onInputChange, numeroSeccion = 10 }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [modoAvanzado, setModoAvanzado] = useState(false);
  const campo = 'actaObservaciones';

  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const sectionBlueBg = theme === 'dark' ? 'rgba(37, 99, 235, 0.15)' : '#DBEAFE';
  const sectionBlueText = theme === 'dark' ? '#93C5FD' : '#1E3A8A';
  const sectionBlueBorder = theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#93C5FD';

  const textoActual = () => formData[campo] || '';

  const mejorarConIA = () => {
    const texto = textoActual();
    if (texto.trim()) {
      const textoMejorado = `🔍 ANÁLISIS MEJORADO CON IA:\n\n${texto}\n\n✅ Verificaciones realizadas:\n• Ortografía y gramática corregida\n• Estructura mejorada\n• Términos técnicos estandarizados\n• Coherencia verificada`;
      onInputChange(campo, textoMejorado);
    } else {
      alert(t('adjustment.ui.ia.errorGeneric'));
    }
  };

  const generarTextoProfesional = () => {
    const plantilla = `📋 OBSERVACIONES - PLANTILLA IA

🔍 HALLAZGOS PRINCIPALES:
• [Describir hallazgos más importantes]
• [Mencionar elementos críticos]

💥 DAÑOS IDENTIFICADOS:
• [Extensión y gravedad]
• [Áreas afectadas]
• [Elementos estructurales comprometidos]

💡 RECOMENDACIONES INMEDIATAS:
• [Acciones urgentes 24-48h]
• [Medidas de seguridad]

📊 IMPACTO ESTIMADO:
• [Costo aproximado de reparación]
• [Tiempo estimado de recuperación]

⚠️ OBSERVACIONES TÉCNICAS:
• [Detalles técnicos importantes]
• [Requerimientos especiales]`;

    onInputChange(campo, plantilla);
  };

  const analisisAvanzado = () => {
    const texto = textoActual();
    if (texto.trim()) {
      const analisis = `📊 ANÁLISIS AVANZADO CON IA:

${texto}

🔍 MÉTRICAS DE CALIDAD:
• Longitud: ${texto.length} caracteres
• Palabras: ${texto.split(' ').length}
• Párrafos: ${texto.split('\n\n').length}

✅ FORTALEZAS IDENTIFICADAS:
• [Listar aspectos positivos del texto]

⚠️ ÁREAS DE MEJORA:
• [Sugerencias específicas]

💡 RECOMENDACIONES:
• [Acciones concretas para mejorar]`;

      onInputChange(campo, analisis);
    } else {
      alert(t('adjustment.ui.ia.errorGeneric'));
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="pb-4"
        style={{ borderBottom: `1px solid ${borderColor}` }}
      >
        <h3 className="text-2xl font-bold flex items-center" style={{ color: textPrimary }}>
          <span
            className="rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#2563EB',
              color: theme === 'dark' ? '#93C5FD' : '#FFFFFF'
            }}
          >
            {numeroSeccion}
          </span>
          {t('adjustment.ui.sections.observacionesPrelim.title')}
        </h3>
        <p className="mt-2" style={{ color: textSecondary }}>
          {t('adjustment.ui.sections.observacionesPrelim.subtitle')}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor={campo}
            className="block text-sm font-medium mb-2"
            style={{ color: textPrimary }}
          >
            {t('adjustment.ui.sections.observacionesPrelim.labelActa')}
          </label>
          <textarea
            id={campo}
            name={campo}
            rows={6}
            className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none resize-vertical"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              border: `1px solid ${borderColor}`
            }}
            placeholder={t('adjustment.ui.sections.observacionesPrelim.placeholder')}
            value={formData[campo] || ''}
            onChange={(e) => onInputChange(campo, e.target.value)}
          />
        </div>
      </div>

      <div
        className="rounded-lg p-4"
        style={{
          background: theme === 'dark'
            ? 'linear-gradient(to right, rgba(37, 99, 235, 0.15), rgba(168, 85, 247, 0.15))'
            : 'linear-gradient(to right, #DBEAFE, #F3E8FF)',
          border: `1px solid ${sectionBlueBorder}`
        }}
      >
        <h4 className="text-base font-semibold mb-3 flex items-center" style={{ color: sectionBlueText }}>
          <span className="mr-2">🤖</span>
          {t('adjustment.ui.sections.analisisCobertura.iaAssistant')}
        </h4>

        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={mejorarConIA}
            className="px-3 py-1.5 rounded text-sm flex items-center space-x-1 transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#3B82F6',
              color: theme === 'dark' ? '#93C5FD' : '#FFFFFF'
            }}
          >
            <span>✨</span>
            <span>{t('adjustment.ui.sections.observacionesPrelim.improve')}</span>
          </button>

          <button
            type="button"
            onClick={generarTextoProfesional}
            className="px-3 py-1.5 rounded text-sm flex items-center space-x-1 transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#16A34A',
              color: theme === 'dark' ? '#86EFAC' : '#FFFFFF'
            }}
          >
            <span>📄</span>
            <span>{t('adjustment.ui.sections.observacionesPrelim.template')}</span>
          </button>

          <button
            type="button"
            onClick={analisisAvanzado}
            className="px-3 py-1.5 rounded text-sm flex items-center space-x-1 transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(249, 115, 22, 0.2)' : '#EA580C',
              color: theme === 'dark' ? '#FB923C' : '#FFFFFF'
            }}
          >
            <span>🔍</span>
            <span>{t('adjustment.ui.sections.observacionesPrelim.analyze')}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModoAvanzado(!modoAvanzado)}
            className="px-2 py-1 rounded text-xs transition-colors"
            style={{
              backgroundColor: modoAvanzado
                ? theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#DBEAFE'
                : theme === 'dark' ? '#2A2A2A' : '#E5E7EB',
              color: modoAvanzado ? (theme === 'dark' ? '#93C5FD' : '#1E40AF') : textPrimary
            }}
          >
            {modoAvanzado ? t('adjustment.ui.ia.advancedMode') : t('adjustment.ui.ia.basicMode')}
          </button>
          <span className="text-xs" style={{ color: textSecondary }}>
            {modoAvanzado ? t('adjustment.ui.ia.tip3') : t('adjustment.ui.ia.tip1')}
          </span>
        </div>

        {modoAvanzado && (
          <div
            className="mt-3 p-3 rounded"
            style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
          >
            <h5 className="font-medium mb-2 text-sm" style={{ color: textPrimary }}>
              💡 {t('adjustment.ui.sections.analisisCobertura.iaAssistant')}
            </h5>
            <ul className="text-xs space-y-1" style={{ color: textSecondary }}>
              <li>• <strong>{t('adjustment.ui.sections.observacionesPrelim.improve')}:</strong> {t('adjustment.ui.ia.tip1')}</li>
              <li>• <strong>{t('adjustment.ui.sections.observacionesPrelim.template')}:</strong> {t('adjustment.ui.ia.tip2')}</li>
              <li>• <strong>{t('adjustment.ui.sections.observacionesPrelim.analyze')}:</strong> {t('adjustment.ui.ia.tip3')}</li>
            </ul>
          </div>
        )}
      </div>

      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: sectionBlueBg,
          border: `1px solid ${sectionBlueBorder}`
        }}
      >
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" style={{ color: sectionBlueText }}>
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium" style={{ color: sectionBlueText }}>
              {t('adjustment.ui.sections.observacionesPrelim.title')}
            </h3>
            <div className="mt-2 text-sm" style={{ color: sectionBlueText }}>
              <p>{t('adjustment.ui.sections.observacionesPrelim.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObservacionesPreeliminar;
