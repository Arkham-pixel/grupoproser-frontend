import React, { useState } from 'react';
import { FaMagic, FaSpellCheck, FaLightbulb, FaChartLine, FaCopy, FaCheck, FaBrain, FaRocket, FaStar } from 'react-icons/fa';
import IAService from '../../services/iaService';
import { useTheme } from '../../context/ThemeContext';

export default function IAInteligente({ 
  textoActual, 
  onTextoCambiado, 
  contextoFormulario, 
  tipoSeccion,
  tituloSeccion 
}) {
  const { theme } = useTheme();
  
  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const sectionPurpleBg = theme === 'dark' ? 'rgba(168, 85, 247, 0.15)' : '#F3E8FF';
  const sectionPurpleText = theme === 'dark' ? '#C084FC' : '#6B21A8';
  const sectionPurpleBorder = theme === 'dark' ? 'rgba(168, 85, 247, 0.3)' : '#C084FC';
  const [mostrandoIA, setMostrandoIA] = useState(false);
  const [resultadoIA, setResultadoIA] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [textoMejorado, setTextoMejorado] = useState('');
  const [ideasGeneradas, setIdeasGeneradas] = useState([]);
  const [analisisCalidad, setAnalisisCalidad] = useState(null);
  const [modoAvanzado, setModoAvanzado] = useState(false);

  // Función principal para mejorar el texto con IA avanzada
  const mejorarTexto = async () => {
    if (!textoActual || textoActual.trim().length < 10) {
      alert('Por favor, escribe al menos 10 palabras para que la IA pueda ayudarte a mejorar el texto.');
      return;
    }

    setProcesando(true);
    setMostrandoIA(true);

    try {
      // Simular procesamiento de IA avanzada
      setTimeout(() => {
        const resultado = IAService.mejorarArgumento(textoActual, contextoFormulario);
        setResultadoIA(resultado);
        setTextoMejorado(resultado.textoMejorado);
        
        // Generar ideas contextuales avanzadas
        const ideas = IAService.generarIdeasContextuales(textoActual, contextoFormulario);
        setIdeasGeneradas(ideas);
        
        // Analizar calidad del texto con métricas avanzadas
        const analisis = IAService.analizarCalidadTexto(textoActual, contextoFormulario);
        setAnalisisCalidad(analisis);
        
        setProcesando(false);
      }, 2500);
    } catch (error) {
      console.error('Error en IA:', error);
      setProcesando(false);
    }
  };

  // Aplicar el texto mejorado
  const aplicarTextoMejorado = () => {
    if (textoMejorado) {
      onTextoCambiado(textoMejorado);
      setTextoMejorado('');
      setMostrandoIA(false);
    }
  };

  // Generar texto profesional desde cero
  const generarTextoProfesional = () => {
    const textoGenerado = IAService.generarTextoProfesional(tipoSeccion, contextoFormulario, textoActual);
    setTextoMejorado(textoGenerado);
    setMostrandoIA(true);
  };

  // Copiar texto al portapapeles
  const copiarTexto = (texto) => {
    navigator.clipboard.writeText(texto);
    // Mostrar feedback visual
    const boton = document.querySelector(`[data-texto="${texto.substring(0, 20)}"]`);
    if (boton) {
      const originalText = boton.innerHTML;
      boton.innerHTML = '<FaCheck className="h-4 w-4" /> Copiado';
      setTimeout(() => {
        boton.innerHTML = originalText;
      }, 2000);
    }
  };

  return (
    <div 
      className="p-6 rounded-lg"
      style={{
        background: theme === 'dark' 
          ? 'linear-gradient(to right, rgba(37, 99, 235, 0.15), rgba(168, 85, 247, 0.15))'
          : 'linear-gradient(to right, #DBEAFE, #F3E8FF)',
        border: `1px solid ${theme === 'dark' ? 'rgba(168, 85, 247, 0.3)' : '#C084FC'}`
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 
          className="text-xl font-bold flex items-center"
          style={{ color: theme === 'dark' ? '#C084FC' : '#6B21A8' }}
        >
          <FaBrain 
            className="mr-3" 
            style={{ color: theme === 'dark' ? '#C084FC' : '#9333EA' }}
          />
          IA Inteligente Avanzada - {tituloSeccion}
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setModoAvanzado(!modoAvanzado)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-200"
            style={{
              backgroundColor: modoAvanzado 
                ? (theme === 'dark' ? 'rgba(168, 85, 247, 0.3)' : '#9333EA')
                : (theme === 'dark' ? '#2A2A2A' : '#E5E7EB'),
              color: modoAvanzado 
                ? (theme === 'dark' ? '#C084FC' : '#FFFFFF')
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
            <FaRocket className="inline mr-1" />
            {modoAvanzado ? 'Modo Avanzado' : 'Modo Básico'}
          </button>
          <button
            onClick={() => setMostrandoIA(!mostrandoIA)}
            className="transition-colors font-medium"
            style={{
              color: theme === 'dark' ? '#93C5FD' : '#2563EB'
            }}
            onMouseEnter={(e) => {
              e.target.style.color = theme === 'dark' ? '#BFDBFE' : '#1D4ED8';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = theme === 'dark' ? '#93C5FD' : '#2563EB';
            }}
          >
            {mostrandoIA ? 'Ocultar' : 'Mostrar'} IA
          </button>
        </div>
      </div>

      {/* Botones de acción mejorados */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={mejorarTexto}
          disabled={procesando || !textoActual}
          className="px-6 py-3 rounded-xl transition-all duration-200 disabled:cursor-not-allowed flex items-center shadow-lg hover:shadow-xl"
          style={{
            background: (procesando || !textoActual)
              ? (theme === 'dark' ? 'linear-gradient(to right, #3A3A3A, #4A4A4A)' : 'linear-gradient(to right, #9CA3AF, #6B7280)')
              : (theme === 'dark' ? 'linear-gradient(to right, rgba(37, 99, 235, 0.2), rgba(168, 85, 247, 0.2))' : 'linear-gradient(to right, #2563EB, #9333EA)'),
            color: (procesando || !textoActual)
              ? (theme === 'dark' ? '#B0B0B0' : '#FFFFFF')
              : (theme === 'dark' ? '#C084FC' : '#FFFFFF')
          }}
          onMouseEnter={(e) => {
            if (!procesando && textoActual) {
              e.target.style.background = theme === 'dark' 
                ? 'linear-gradient(to right, rgba(37, 99, 235, 0.3), rgba(168, 85, 247, 0.3))'
                : 'linear-gradient(to right, #1D4ED8, #7C3AED)';
            }
          }}
          onMouseLeave={(e) => {
            if (!procesando && textoActual) {
              e.target.style.background = theme === 'dark' 
                ? 'linear-gradient(to right, rgba(37, 99, 235, 0.2), rgba(168, 85, 247, 0.2))'
                : 'linear-gradient(to right, #2563EB, #9333EA)';
            }
          }}
        >
          {procesando ? (
            <>
              <FaSpellCheck className="mr-3 animate-spin text-xl" />
              <span className="text-lg font-medium">Procesando IA Avanzada...</span>
            </>
          ) : (
            <>
              <FaSpellCheck className="mr-3 text-xl" />
              <span className="text-lg font-medium">🚀 Mejorar con IA Avanzada</span>
            </>
          )}
        </button>

        <button
          onClick={generarTextoProfesional}
          className="px-6 py-3 rounded-xl transition-all duration-200 flex items-center shadow-lg hover:shadow-xl"
          style={{
            background: theme === 'dark' 
              ? 'linear-gradient(to right, rgba(34, 197, 94, 0.2), rgba(20, 184, 166, 0.2))'
              : 'linear-gradient(to right, #16A34A, #0D9488)',
            color: theme === 'dark' ? '#86EFAC' : '#FFFFFF'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = theme === 'dark' 
              ? 'linear-gradient(to right, rgba(34, 197, 94, 0.3), rgba(20, 184, 166, 0.3))'
              : 'linear-gradient(to right, #15803D, #0F766E)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = theme === 'dark' 
              ? 'linear-gradient(to right, rgba(34, 197, 94, 0.2), rgba(20, 184, 166, 0.2))'
              : 'linear-gradient(to right, #16A34A, #0D9488)';
          }}
        >
          <FaLightbulb className="mr-3 text-xl" />
          <span className="text-lg font-medium">✨ Generar Texto Profesional</span>
        </button>

        <button
          onClick={() => {
            const analisis = IAService.analizarCalidadTexto(textoActual, contextoFormulario);
            setAnalisisCalidad(analisis);
            setMostrandoIA(true);
          }}
          className="px-6 py-3 rounded-xl transition-all duration-200 flex items-center shadow-lg hover:shadow-xl"
          style={{
            background: theme === 'dark' 
              ? 'linear-gradient(to right, rgba(249, 115, 22, 0.2), rgba(220, 38, 38, 0.2))'
              : 'linear-gradient(to right, #EA580C, #DC2626)',
            color: theme === 'dark' ? '#FCA5A5' : '#FFFFFF'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = theme === 'dark' 
              ? 'linear-gradient(to right, rgba(249, 115, 22, 0.3), rgba(220, 38, 38, 0.3))'
              : 'linear-gradient(to right, #C2410C, #B91C1C)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = theme === 'dark' 
              ? 'linear-gradient(to right, rgba(249, 115, 22, 0.2), rgba(220, 38, 38, 0.2))'
              : 'linear-gradient(to right, #EA580C, #DC2626)';
          }}
        >
          <FaChartLine className="mr-3 text-xl" />
          <span className="text-lg font-medium">📊 Análisis Avanzado</span>
        </button>
      </div>

      {/* Resultados de la IA Avanzada */}
      {mostrandoIA && (
        <div className="space-y-6">
          {/* Indicador de procesamiento mejorado */}
          {procesando && (
            <div 
              className="text-center py-12 rounded-xl shadow-lg"
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`
              }}
            >
              <div 
                className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-6"
                style={{
                  borderColor: theme === 'dark' ? '#C084FC' : '#9333EA'
                }}
              ></div>
              <p 
                className="font-bold text-xl mb-2"
                style={{ color: theme === 'dark' ? '#C084FC' : '#9333EA' }}
              >
                IA Avanzada en Acción
              </p>
              <p 
                className="mb-4"
                style={{ color: textSecondary }}
              >
                Analizando, mejorando y optimizando tu texto...
              </p>
              <div className="flex justify-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full animate-bounce"
                  style={{ backgroundColor: theme === 'dark' ? '#C084FC' : '#A855F7' }}
                ></div>
                <div 
                  className="w-3 h-3 rounded-full animate-bounce" 
                  style={{
                    animationDelay: '0.1s',
                    backgroundColor: theme === 'dark' ? '#93C5FD' : '#60A5FA'
                  }}
                ></div>
                <div 
                  className="w-3 h-3 rounded-full animate-bounce" 
                  style={{
                    animationDelay: '0.2s',
                    backgroundColor: theme === 'dark' ? '#86EFAC' : '#34D399'
                  }}
                ></div>
              </div>
            </div>
          )}

          {/* Resultado del análisis avanzado */}
          {resultadoIA && !procesando && (
            <div 
              className="rounded-xl p-6 shadow-lg"
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`
              }}
            >
              <h4 
                className="font-bold mb-4 flex items-center text-lg"
                style={{ color: textPrimary }}
              >
                <FaStar 
                  className="mr-2" 
                  style={{ color: theme === 'dark' ? '#FDE047' : '#EAB308' }}
                />
                Análisis IA Avanzado Completado
              </h4>
              
              {/* Calidad del texto con indicadores visuales */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span 
                    className="text-lg font-semibold"
                    style={{ color: textPrimary }}
                  >
                    Calidad del Texto:
                  </span>
                  <div className="flex items-center gap-2">
                    <span 
                      className="px-4 py-2 rounded-full text-sm font-bold"
                      style={{
                        backgroundColor: resultadoIA.nivelCalidad >= 90 
                          ? (theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#D1FAE5')
                          : resultadoIA.nivelCalidad >= 80
                          ? (theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#DBEAFE')
                          : resultadoIA.nivelCalidad >= 70
                          ? (theme === 'dark' ? 'rgba(234, 179, 8, 0.2)' : '#FEF9C3')
                          : resultadoIA.nivelCalidad >= 60
                          ? (theme === 'dark' ? 'rgba(249, 115, 22, 0.2)' : '#FFEDD5')
                          : (theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2'),
                        color: resultadoIA.nivelCalidad >= 90 
                          ? (theme === 'dark' ? '#86EFAC' : '#065F46')
                          : resultadoIA.nivelCalidad >= 80
                          ? (theme === 'dark' ? '#93C5FD' : '#1E40AF')
                          : resultadoIA.nivelCalidad >= 70
                          ? (theme === 'dark' ? '#FDE047' : '#854D0E')
                          : resultadoIA.nivelCalidad >= 60
                          ? (theme === 'dark' ? '#FB923C' : '#9A3412')
                          : (theme === 'dark' ? '#FCA5A5' : '#991B1B')
                      }}
                    >
                      {resultadoIA.nivelCalidad}/100
                    </span>
                    {resultadoIA.nivelCalidad >= 90 && (
                      <FaStar 
                        className="text-xl" 
                        style={{ color: theme === 'dark' ? '#FDE047' : '#EAB308' }}
                      />
                    )}
                  </div>
                </div>
                <div 
                  className="w-full rounded-full h-3"
                  style={{ backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB' }}
                >
                  <div 
                    className={`h-3 rounded-full transition-all duration-700 ${
                      resultadoIA.nivelCalidad >= 90 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                      resultadoIA.nivelCalidad >= 80 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                      resultadoIA.nivelCalidad >= 70 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                      resultadoIA.nivelCalidad >= 60 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                      'bg-gradient-to-r from-red-500 to-pink-500'
                    }`}
                    style={{ width: `${resultadoIA.nivelCalidad}%` }}
                  ></div>
                </div>
              </div>

              {/* Análisis profundo si está disponible */}
              {resultadoIA.analisisProfundo && modoAvanzado && (
                <div 
                  className="mb-6 p-4 rounded-lg"
                  style={{
                    background: theme === 'dark' 
                      ? 'linear-gradient(to right, rgba(168, 85, 247, 0.15), rgba(37, 99, 235, 0.15))'
                      : 'linear-gradient(to right, #F3E8FF, #DBEAFE)',
                    border: `1px solid ${theme === 'dark' ? 'rgba(168, 85, 247, 0.3)' : '#C084FC'}`
                  }}
                >
                  <h5 
                    className="font-semibold mb-3 flex items-center"
                    style={{ color: sectionPurpleText }}
                  >
                    <FaBrain className="mr-2" />
                    Análisis Profundo del Texto
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div 
                        className="text-2xl font-bold"
                        style={{ color: theme === 'dark' ? '#C084FC' : '#9333EA' }}
                      >
                        {resultadoIA.analisisProfundo.nivelTecnico}%
                      </div>
                      <div 
                        className="text-xs"
                        style={{ color: textSecondary }}
                      >
                        Nivel Técnico
                      </div>
                    </div>
                    <div className="text-center">
                      <div 
                        className="text-2xl font-bold"
                        style={{ color: theme === 'dark' ? '#93C5FD' : '#2563EB' }}
                      >
                        {resultadoIA.analisisProfundo.profesionalismo}%
                      </div>
                      <div 
                        className="text-xs"
                        style={{ color: textSecondary }}
                      >
                        Profesionalismo
                      </div>
                    </div>
                    <div className="text-center">
                      <div 
                        className="text-2xl font-bold"
                        style={{ color: theme === 'dark' ? '#86EFAC' : '#16A34A' }}
                      >
                        {resultadoIA.analisisProfundo.coherencia}%
                      </div>
                      <div 
                        className="text-xs"
                        style={{ color: textSecondary }}
                      >
                        Coherencia
                      </div>
                    </div>
                    <div className="text-center">
                      <div 
                        className="text-2xl font-bold"
                        style={{ color: theme === 'dark' ? '#FB923C' : '#EA580C' }}
                      >
                        {resultadoIA.analisisProfundo.completitud}%
                      </div>
                      <div 
                        className="text-xs"
                        style={{ color: textSecondary }}
                      >
                        Completitud
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Correcciones ortográficas con contexto */}
              {resultadoIA.correcciones.length > 0 && (
                <div className="mb-6">
                  <h5 
                    className="font-semibold mb-3 flex items-center"
                    style={{ color: textPrimary }}
                  >
                    <FaSpellCheck 
                      className="mr-2" 
                      style={{ color: theme === 'dark' ? '#86EFAC' : '#16A34A' }}
                    />
                    Correcciones Ortográficas y de Contexto:
                  </h5>
                  <div className="space-y-3">
                    {resultadoIA.correcciones.map((correccion, index) => (
                      <div 
                        key={index} 
                        className="p-4 rounded-lg"
                        style={{
                          background: theme === 'dark' 
                            ? 'linear-gradient(to right, rgba(234, 179, 8, 0.15), rgba(249, 115, 22, 0.15))'
                            : 'linear-gradient(to right, #FEF9C3, #FFEDD5)',
                          border: `1px solid ${theme === 'dark' ? 'rgba(234, 179, 8, 0.3)' : '#FDE047'}`
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium" style={{ color: textPrimary }}>
                            <span 
                              className="line-through"
                              style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
                            >
                              {correccion.original}
                            </span>
                            <span 
                              className="mx-3"
                              style={{ color: textSecondary }}
                            >
                              →
                            </span>
                            <span 
                              className="font-bold"
                              style={{ color: theme === 'dark' ? '#86EFAC' : '#16A34A' }}
                            >
                              {correccion.corregido}
                            </span>
                          </span>
                          <span 
                            className="px-2 py-1 text-xs rounded-full"
                            style={{
                              backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#DBEAFE',
                              color: theme === 'dark' ? '#93C5FD' : '#1E40AF'
                            }}
                          >
                            {correccion.tipo}
                          </span>
                        </div>
                        {correccion.contexto && (
                          <p 
                            className="text-xs italic"
                            style={{ color: textSecondary }}
                          >
                            {correccion.contexto}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sugerencias de mejora contextuales */}
              {resultadoIA.sugerencias.length > 0 && (
                <div className="mb-6">
                  <h5 
                    className="font-semibold mb-3 flex items-center"
                    style={{ color: textPrimary }}
                  >
                    <FaLightbulb 
                      className="mr-2" 
                      style={{ color: theme === 'dark' ? '#FDE047' : '#EAB308' }}
                    />
                    Sugerencias de Mejora Contextuales:
                  </h5>
                  <ul className="space-y-2">
                    {resultadoIA.sugerencias.map((sugerencia, index) => (
                      <li key={index} className="flex items-start">
                        <span 
                          className="mr-2 mt-1"
                          style={{ color: theme === 'dark' ? '#93C5FD' : '#3B82F6' }}
                        >
                          💡
                        </span>
                        <span 
                          className="text-sm"
                          style={{ color: textPrimary }}
                        >
                          {sugerencia}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Estadísticas mejoradas */}
              <div 
                className="grid grid-cols-2 gap-4 text-sm p-4 rounded-lg"
                style={{
                  backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB'
                }}
              >
                <div className="text-center">
                  <div 
                    className="text-2xl font-bold"
                    style={{ color: textPrimary }}
                  >
                    {resultadoIA.longitudOriginal}
                  </div>
                  <div style={{ color: textSecondary }}>Palabras Originales</div>
                </div>
                <div className="text-center">
                  <div 
                    className="text-2xl font-bold"
                    style={{ color: theme === 'dark' ? '#86EFAC' : '#16A34A' }}
                  >
                    {resultadoIA.longitudMejorada}
                  </div>
                  <div style={{ color: textSecondary }}>Palabras Mejoradas</div>
                </div>
              </div>
            </div>
          )}

          {/* Texto mejorado con opciones avanzadas */}
          {textoMejorado && !procesando && (
            <div 
              className="rounded-xl p-6 shadow-lg"
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`
              }}
            >
              <h4 
                className="font-bold mb-4 flex items-center text-lg"
                style={{ color: textPrimary }}
              >
                <FaMagic 
                  className="mr-2" 
                  style={{ color: theme === 'dark' ? '#C084FC' : '#9333EA' }}
                />
                Texto Mejorado por IA Avanzada:
              </h4>
              <div 
                className="p-4 rounded-lg mb-4"
                style={{
                  background: theme === 'dark' 
                    ? 'linear-gradient(to right, rgba(37, 99, 235, 0.15), rgba(168, 85, 247, 0.15))'
                    : 'linear-gradient(to right, #DBEAFE, #F3E8FF)',
                  border: `1px solid ${theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#93C5FD'}`
                }}
              >
                <p 
                  className="leading-relaxed text-lg"
                  style={{ color: textPrimary }}
                >
                  {textoMejorado}
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={aplicarTextoMejorado}
                  className="px-6 py-3 rounded-lg transition-all duration-200 flex items-center shadow-lg hover:shadow-xl"
                  style={{
                    background: theme === 'dark' 
                      ? 'linear-gradient(to right, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))'
                      : 'linear-gradient(to right, #16A34A, #10B981)',
                    color: theme === 'dark' ? '#86EFAC' : '#FFFFFF'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = theme === 'dark' 
                      ? 'linear-gradient(to right, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.3))'
                      : 'linear-gradient(to right, #15803D, #059669)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = theme === 'dark' 
                      ? 'linear-gradient(to right, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))'
                      : 'linear-gradient(to right, #16A34A, #10B981)';
                  }}
                >
                  <FaCheck className="mr-2" />
                  ✅ Aplicar Texto Mejorado
                </button>
                <button
                  onClick={() => copiarTexto(textoMejorado)}
                  data-texto={textoMejorado.substring(0, 20)}
                  className="px-6 py-3 rounded-lg transition-all duration-200 flex items-center shadow-lg hover:shadow-xl"
                  style={{
                    background: theme === 'dark' 
                      ? 'linear-gradient(to right, rgba(37, 99, 235, 0.2), rgba(6, 182, 212, 0.2))'
                      : 'linear-gradient(to right, #2563EB, #06B6D4)',
                    color: theme === 'dark' ? '#93C5FD' : '#FFFFFF'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = theme === 'dark' 
                      ? 'linear-gradient(to right, rgba(37, 99, 235, 0.3), rgba(6, 182, 212, 0.3))'
                      : 'linear-gradient(to right, #1D4ED8, #0891B2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = theme === 'dark' 
                      ? 'linear-gradient(to right, rgba(37, 99, 235, 0.2), rgba(6, 182, 212, 0.2))'
                      : 'linear-gradient(to right, #2563EB, #06B6D4)';
                  }}
                >
                  <FaCopy className="mr-2" />
                  📋 Copiar al Portapapeles
                </button>
              </div>
            </div>
          )}

          {/* Ideas contextuales avanzadas */}
          {ideasGeneradas.length > 0 && !procesando && (
            <div 
              className="rounded-xl p-6 shadow-lg"
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`
              }}
            >
              <h4 
                className="font-bold mb-4 flex items-center text-lg"
                style={{ color: textPrimary }}
              >
                <FaLightbulb 
                  className="mr-2" 
                  style={{ color: theme === 'dark' ? '#FDE047' : '#EAB308' }}
                />
                Ideas Avanzadas Basadas en tu Texto:
              </h4>
              <div className="space-y-4">
                {ideasGeneradas.map((categoria, index) => (
                  <div 
                    key={index} 
                    className="border-l-4 pl-4"
                    style={{
                      borderColor: theme === 'dark' ? '#C084FC' : '#9333EA'
                    }}
                  >
                    <h5 
                      className="font-semibold mb-3 text-lg"
                      style={{ color: theme === 'dark' ? '#93C5FD' : '#1E40AF' }}
                    >
                      {categoria.categoria}:
                    </h5>
                    <ul className="space-y-2">
                      {categoria.sugerencias.map((sugerencia, idx) => (
                        <li 
                          key={idx} 
                          className="text-sm flex items-start"
                          style={{ color: textPrimary }}
                        >
                          <FaLightbulb 
                            className="mr-2 text-xs mt-1 flex-shrink-0" 
                            style={{ color: theme === 'dark' ? '#FDE047' : '#EAB308' }}
                          />
                          <span>{sugerencia}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Análisis de calidad avanzado */}
          {analisisCalidad && !procesando && (
            <div 
              className="rounded-xl p-6 shadow-lg"
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`
              }}
            >
              <h4 
                className="font-bold mb-4 flex items-center text-lg"
                style={{ color: textPrimary }}
              >
                <FaChartLine 
                  className="mr-2" 
                  style={{ color: theme === 'dark' ? '#FB923C' : '#EA580C' }}
                />
                Análisis Avanzado de Calidad del Texto:
              </h4>
              
              {/* Puntaje con clasificación avanzada */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span 
                    className="text-lg font-semibold"
                    style={{ color: textPrimary }}
                  >
                    Puntaje General:
                  </span>
                  <span 
                    className="px-4 py-2 rounded-full text-lg font-bold"
                    style={{
                      background: analisisCalidad.puntaje >= 90 
                        ? 'linear-gradient(to right, #16A34A, #10B981)'
                        : analisisCalidad.puntaje >= 80
                        ? 'linear-gradient(to right, #2563EB, #06B6D4)'
                        : analisisCalidad.puntaje >= 70
                        ? 'linear-gradient(to right, #EAB308, #EA580C)'
                        : analisisCalidad.puntaje >= 60
                        ? 'linear-gradient(to right, #EA580C, #DC2626)'
                        : 'linear-gradient(to right, #DC2626, #EC4899)',
                      color: '#FFFFFF'
                    }}
                  >
                    {analisisCalidad.puntaje}/100
                  </span>
                </div>
                <div 
                  className="w-full rounded-full h-4"
                  style={{ backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB' }}
                >
                  <div 
                    className="h-4 rounded-full transition-all duration-700"
                    style={{
                      width: `${analisisCalidad.puntaje}%`,
                      background: analisisCalidad.puntaje >= 90 
                        ? 'linear-gradient(to right, #16A34A, #10B981)'
                        : analisisCalidad.puntaje >= 80
                        ? 'linear-gradient(to right, #2563EB, #06B6D4)'
                        : analisisCalidad.puntaje >= 70
                        ? 'linear-gradient(to right, #EAB308, #EA580C)'
                        : analisisCalidad.puntaje >= 60
                        ? 'linear-gradient(to right, #EA580C, #DC2626)'
                        : 'linear-gradient(to right, #DC2626, #EC4899)'
                    }}
                  ></div>
                </div>
                <div className="text-center mt-2">
                  <span 
                    className="text-lg font-semibold"
                    style={{ color: textPrimary }}
                  >
                    {analisisCalidad.clasificacion}
                  </span>
                </div>
              </div>

              {/* Métricas avanzadas */}
              {analisisCalidad.metricas && (
                <div 
                  className="mb-6 p-4 rounded-lg"
                  style={{
                    background: theme === 'dark' 
                      ? 'linear-gradient(to right, rgba(107, 114, 128, 0.15), rgba(37, 99, 235, 0.15))'
                      : 'linear-gradient(to right, #F9FAFB, #DBEAFE)',
                    border: `1px solid ${borderColor}`
                  }}
                >
                  <h5 
                    className="font-semibold mb-3"
                    style={{ color: textPrimary }}
                  >
                    Métricas del Texto:
                  </h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div 
                        className="text-2xl font-bold"
                        style={{ color: textPrimary }}
                      >
                        {analisisCalidad.metricas.longitud}
                      </div>
                      <div 
                        className="text-xs"
                        style={{ color: textSecondary }}
                      >
                        Total de Palabras
                      </div>
                    </div>
                    <div className="text-center">
                      <div 
                        className="text-2xl font-bold"
                        style={{ color: theme === 'dark' ? '#93C5FD' : '#2563EB' }}
                      >
                        {Math.round(analisisCalidad.metricas.longitud / 10)}
                      </div>
                      <div 
                        className="text-xs"
                        style={{ color: textSecondary }}
                      >
                        Palabras por Línea
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fortalezas */}
              {analisisCalidad.fortalezas.length > 0 && (
                <div className="mb-6">
                  <h5 
                    className="font-semibold mb-3 flex items-center"
                    style={{ color: theme === 'dark' ? '#86EFAC' : '#15803D' }}
                  >
                    <FaStar className="mr-2" />
                    ✅ Fortalezas Identificadas:
                  </h5>
                  <ul className="space-y-2">
                    {analisisCalidad.fortalezas.map((fortaleza, index) => (
                      <li 
                        key={index} 
                        className="text-sm flex items-start"
                        style={{ color: theme === 'dark' ? '#86EFAC' : '#16A34A' }}
                      >
                        <span 
                          className="mr-2 mt-1"
                          style={{ color: theme === 'dark' ? '#86EFAC' : '#16A34A' }}
                        >
                          ✓
                        </span>
                        {fortaleza}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Áreas de mejora */}
              {analisisCalidad.areasMejora.length > 0 && (
                <div className="mb-6">
                  <h5 
                    className="font-semibold mb-3 flex items-center"
                    style={{ color: theme === 'dark' ? '#FB923C' : '#C2410C' }}
                  >
                    <FaChartLine className="mr-2" />
                    ⚠️ Áreas de Mejora Identificadas:
                  </h5>
                  <ul className="space-y-2">
                    {analisisCalidad.areasMejora.map((area, index) => (
                      <li 
                        key={index} 
                        className="text-sm flex items-start"
                        style={{ color: theme === 'dark' ? '#FB923C' : '#EA580C' }}
                      >
                        <span 
                          className="mr-2 mt-1"
                          style={{ color: theme === 'dark' ? '#FB923C' : '#EA580C' }}
                        >
                          ⚠
                        </span>
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recomendaciones avanzadas */}
              {analisisCalidad.recomendaciones.length > 0 && (
                <div>
                  <h5 
                    className="font-semibold mb-3 flex items-center"
                    style={{ color: theme === 'dark' ? '#93C5FD' : '#1E40AF' }}
                  >
                    <FaLightbulb className="mr-2" />
                    💡 Recomendaciones de Mejora:
                  </h5>
                  <ul className="space-y-2">
                    {analisisCalidad.recomendaciones.map((recomendacion, index) => (
                      <li 
                        key={index} 
                        className="text-sm flex items-start"
                        style={{ color: theme === 'dark' ? '#93C5FD' : '#2563EB' }}
                      >
                        <span 
                          className="mr-2 mt-1"
                          style={{ color: theme === 'dark' ? '#93C5FD' : '#3B82F6' }}
                        >
                          💡
                        </span>
                        {recomendacion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instrucciones de uso mejoradas */}
      {!mostrandoIA && (
        <div 
          className="text-sm p-4 rounded-lg"
          style={{
            background: theme === 'dark' 
              ? 'linear-gradient(to right, rgba(37, 99, 235, 0.15), rgba(168, 85, 247, 0.15))'
              : 'linear-gradient(to right, #DBEAFE, #F3E8FF)',
            border: `1px solid ${theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#93C5FD'}`,
            color: theme === 'dark' ? '#93C5FD' : '#1E40AF'
          }}
        >
          <p className="mb-3 font-semibold text-lg">
            <FaBrain 
              className="inline mr-2" 
              style={{ color: theme === 'dark' ? '#C084FC' : '#9333EA' }}
            />
            🚀 Cómo usar la IA Inteligente Avanzada:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Escribe tu idea inicial</strong> en el campo de texto de la sección</li>
            <li><strong>Haz clic en "Mejorar con IA Avanzada"</strong> para corrección ortográfica, mejora de argumentos y análisis profundo</li>
            <li><strong>Usa "Generar Texto Profesional"</strong> para crear contenido desde cero con plantillas inteligentes</li>
            <li><strong>Analiza la calidad</strong> con métricas avanzadas y recomendaciones específicas</li>
            <li><strong>Activa el "Modo Avanzado"</strong> para análisis profundo y métricas detalladas</li>
          </ul>
        </div>
      )}
    </div>
  );
}
