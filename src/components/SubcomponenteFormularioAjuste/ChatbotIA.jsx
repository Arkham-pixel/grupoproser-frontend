import React, { useState, useRef, useEffect } from 'react';
import { FaRobot, FaPaperPlane, FaTimes, FaLightbulb, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import api from '../../services/api.js';
import { BASE_URL } from '../../config/apiConfig.js';

export default function ChatbotIA({ formData, onInputChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [chatgptConfigurado, setChatgptConfigurado] = useState(null);
  const messagesEndRef = useRef(null);

  // Verificar si ChatGPT está configurado al montar el componente
  useEffect(() => {
    const verificarConfiguracion = async () => {
      try {
        const response = await api.get('/api/chatgpt/status');
        setChatgptConfigurado(response.data.configurado);
      } catch (error) {
        console.error('Error al verificar configuración de ChatGPT:', error);
        setChatgptConfigurado(false);
      }
    };
    verificarConfiguracion();
  }, []);

  // Función para enviar mensaje a ChatGPT
  const enviarMensajeChatGPT = async (mensaje) => {
    try {
      setError(null);
      
      // Preparar historial de conversación (últimos 10 mensajes para contexto)
      const historialConversacion = messages
        .slice(-10)
        .map(msg => ({
          tipo: msg.tipo,
          contenido: msg.contenido
        }));

      const response = await api.post('/api/chatgpt/chat', {
        message: mensaje,
        formData: formData,
        conversationHistory: historialConversacion
      });

      // Si ChatGPT quiere llenar campos, ejecutar las acciones
      if (response.data.acciones && Array.isArray(response.data.acciones) && response.data.acciones.length > 0) {
        console.log('✅ ChatGPT quiere llenar campos:', response.data.acciones);
        
        const camposLlenados = [];
        const camposConError = [];
        
        // Ejecutar cada acción para llenar campos con validación
        response.data.acciones.forEach(accion => {
          if (accion.campo && accion.valor !== undefined) {
            // Validar que el campo existe en formData
            if (formData && formData.hasOwnProperty(accion.campo)) {
              // Validar formato según tipo
              let esValido = true;
              
              if (accion.tipo === 'fecha') {
                // Validar formato de fecha YYYY-MM-DD
                const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!fechaRegex.test(accion.valor)) {
                  console.warn(`⚠️ Formato de fecha inválido: ${accion.valor}`);
                  esValido = false;
                }
              }
              
              if (accion.tipo === 'numero') {
                // Validar que sea un número
                if (isNaN(accion.valor) && accion.valor !== '') {
                  console.warn(`⚠️ Valor no es un número: ${accion.valor}`);
                  esValido = false;
                }
              }
              
              if (esValido) {
                console.log(`📝 Llenando campo "${accion.campo}" con valor:`, accion.valor);
                onInputChange(accion.campo, accion.valor);
                camposLlenados.push(accion.campo);
              } else {
                camposConError.push(`${accion.campo} (formato inválido)`);
              }
            } else {
              console.warn(`⚠️ Campo "${accion.campo}" no existe en el formulario`);
              camposConError.push(`${accion.campo} (no existe)`);
            }
          }
        });
        
        // Agregar información de campos llenados a la respuesta
        if (camposLlenados.length > 0) {
          const mensajeCampos = `\n\n✅ **Campos llenados:** ${camposLlenados.join(', ')}`;
          if (camposConError.length > 0) {
            return {
              tipo: 'ia',
              contenido: response.data.respuesta + mensajeCampos + `\n\n⚠️ **Campos con error:** ${camposConError.join(', ')}`,
              accion: 'camposLlenados',
              acciones: response.data.acciones,
              icono: '🤖',
              timestamp: new Date()
            };
          }
          return {
            tipo: 'ia',
            contenido: response.data.respuesta + mensajeCampos,
            accion: 'camposLlenados',
            acciones: response.data.acciones,
            icono: '🤖',
            timestamp: new Date()
          };
        }
      }

      return {
        tipo: 'ia',
        contenido: response.data.respuesta,
        accion: response.data.acciones && response.data.acciones.length > 0 ? 'camposLlenados' : 'general',
        acciones: response.data.acciones || [],
        icono: '🤖',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error al comunicarse con ChatGPT:', error);
      console.error('Detalles del error:', error.response?.data);
      
      let mensajeError = 'Error al comunicarse con ChatGPT. Por favor, intenta de nuevo.';
      let detallesError = '';
      
      if (error.response?.data) {
        // Si hay respuesta del servidor, mostrar el error específico
        mensajeError = error.response.data.error || error.response.data.mensaje || mensajeError;
        detallesError = error.response.data.detalles 
          ? `\n\nDetalles: ${typeof error.response.data.detalles === 'string' ? error.response.data.detalles : JSON.stringify(error.response.data.detalles)}`
          : '';
        
        // Si hay código de error de OpenAI, mostrarlo
        if (error.response.data.codigo) {
          detallesError += `\nCódigo: ${error.response.data.codigo}`;
        }

        // Si es error de autenticación (401 o 403), sugerir re-login
        if (error.response.status === 401 || error.response.status === 403) {
          mensajeError = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
          detallesError = '\n\n🔑 Necesitas iniciar sesión de nuevo para usar el chatbot.';
          
          // Opcional: redirigir al login después de un delay
          setTimeout(() => {
            window.location.href = '/login';
          }, 3000);
        }
        
        // Si es error 429 (quota exceeded), mostrar mensaje específico
        if (error.response.status === 429) {
          mensajeError = 'Cuota de OpenAI excedida';
          detallesError = '\n\n💰 Has excedido tu cuota actual de OpenAI.\n\nPara continuar usando ChatGPT:\n• Ve a https://platform.openai.com/account/billing\n• Agrega créditos a tu cuenta\n• O actualiza tu plan de OpenAI\n\nEl modelo gpt-3.5-turbo es muy económico (~$0.002 por 1K tokens).';
        }
      } else if (error.message) {
        mensajeError = `Error: ${error.message}`;
      }

      setError(mensajeError);
      
      return {
        tipo: 'ia',
        contenido: `❌ ${mensajeError}${detallesError}\n\nSi el problema persiste:\n• Verifica que la API key de OpenAI esté configurada en el servidor\n• Asegúrate de tener créditos en tu cuenta de OpenAI\n• Revisa los logs del servidor backend para más detalles`,
        accion: 'general',
        icono: '❌',
        timestamp: new Date()
      };
    }
  };

  // ChatGPT reemplaza completamente el chatbot predefinido
  // Todas las respuestas vienen directamente de la API de OpenAI

  const enviarMensaje = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      tipo: 'usuario',
      contenido: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const mensajeActual = inputMessage;
    setInputMessage('');
    setIsTyping(true);
    setError(null);

    try {
      // Solo usar ChatGPT - sin respuestas predefinidas
      if (chatgptConfigurado === true) {
        // Usar ChatGPT
        const aiMessage = await enviarMensajeChatGPT(mensajeActual);
        aiMessage.id = Date.now() + 1;
        setMessages(prev => [...prev, aiMessage]);
      } else if (chatgptConfigurado === false) {
        // ChatGPT no está configurado
        const errorMessage = {
          id: Date.now() + 1,
          tipo: 'ia',
          contenido: `❌ **ChatGPT no está configurado**\n\nPara usar el asistente inteligente:\n\n1. Configura la API key de OpenAI en el servidor backend\n2. Agrega \`OPENAI_API_KEY=tu-api-key\` al archivo \`.env\` del backend\n3. Reinicia el servidor backend\n\n📖 Consulta la guía en \`GUIA_CHATGPT.md\` para más detalles.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      } else {
        // Aún verificando configuración
        const errorMessage = {
          id: Date.now() + 1,
          tipo: 'ia',
          contenido: '⏳ Verificando configuración de ChatGPT... Por favor espera.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error al procesar mensaje:', error);
      const errorMessage = {
        id: Date.now() + 1,
        tipo: 'ia',
        contenido: '❌ Error al procesar tu mensaje. Por favor, intenta de nuevo.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mensaje de bienvenida cuando se abre el chatbot por primera vez
  useEffect(() => {
    if (isOpen && messages.length === 0 && chatgptConfigurado === true) {
      const mensajeBienvenida = {
        id: Date.now(),
        tipo: 'ia',
        contenido: `¡Hola! 👋 Soy tu asistente IA para llenar el formulario de ajustes.\n\n**Puedo ayudarte a:**\n• Llenar campos automáticamente con lenguaje natural\n• Responder preguntas sobre el formulario\n• Sugerir información basada en el contexto\n\n**Ejemplos de uso:**\n• "El siniestro fue un incendio el 15 de enero en Bogotá"\n• "Llena el campo de antecedentes con: [tu texto]"\n• "Es un robo, ocurrió ayer a las 10pm, la aseguradora es Seguros Bolívar"\n• "¿Qué información falta en el formulario?"\n\n¡Escribe tu mensaje y te ayudo! 😊`,
        icono: '🤖',
        timestamp: new Date()
      };
      setMessages([mensajeBienvenida]);
    }
  }, [isOpen, chatgptConfigurado]);

  const limpiarChat = () => {
    setMessages([]);
  };

  // No renderizar nada si ChatGPT no está configurado
  if (chatgptConfigurado === false) {
    return null;
  }

  return (
    <>
      {/* Botón flotante del chatbot - Solo mostrar si está configurado o aún verificando */}
      {(chatgptConfigurado === true || chatgptConfigurado === null) && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 z-[9999] group animate-pulse border-2 border-white"
          title="Asistente IA - Haz clic para abrir"
          style={{ zIndex: 9999 }}
        >
          <FaRobot className="h-6 w-6" />
          <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
            🤖 Asistente IA
          </div>
        </button>
      )}

      {/* Ventana del chatbot */}
      {isOpen && (
        <div className={`fixed bottom-24 right-6 w-96 ${isMinimized ? 'h-16' : 'h-96'} bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col transition-all duration-300`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaRobot className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Asistente IA</h3>
                {chatgptConfigurado === true && (
                  <span className="text-xs text-green-200">Powered by ChatGPT</span>
                )}
                {chatgptConfigurado === false && (
                  <span className="text-xs text-yellow-200">Modo básico</span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:text-gray-200 transition-colors"
                title={isMinimized ? "Expandir" : "Minimizar"}
              >
                {isMinimized ? <FaChevronUp className="h-4 w-4" /> : <FaChevronDown className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
                title="Cerrar"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Contenido (solo visible si no está minimizado) */}
          {!isMinimized && (
            <>
              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-sm">
                    ⚠️ {error}
                  </div>
                )}
                
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <FaLightbulb className="h-12 w-12 mx-auto mb-3 text-blue-400" />
                    <p className="text-sm font-medium mb-2">
                      ¡Hola! Soy tu asistente IA 🤖
                    </p>
                    {chatgptConfigurado === true && (
                      <p className="text-xs text-green-600 mb-2 font-semibold">
                        ✨ Powered by ChatGPT
                      </p>
                    )}
                    {chatgptConfigurado === false && (
                      <p className="text-xs text-red-600 mb-2 font-semibold">
                        ⚠️ ChatGPT no configurado
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mb-4">
                      {chatgptConfigurado === true 
                        ? "Pregúntame cualquier cosa sobre el formulario. Usaré ChatGPT para ayudarte."
                        : "Para usar el asistente, configura ChatGPT en el servidor backend."
                      }
                    </p>
                    {chatgptConfigurado === true && (
                      <div className="space-y-2 text-xs">
                        <div className="bg-white p-2 rounded border">
                          <p className="font-medium text-blue-600">📋 "¿Cómo lleno el campo reporte?"</p>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <p className="font-medium text-green-600">📖 "Explica la sección de antecedentes"</p>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <p className="font-medium text-purple-600">💰 "¿Qué significa reserva sugerida?"</p>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <p className="font-medium text-orange-600">🏙️ "El siniestro fue un incendio el 15 de enero en Bogotá"</p>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <p className="font-medium text-blue-600">✍️ "Llena el campo de antecedentes con: [tu texto]"</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.tipo === 'usuario' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs p-3 rounded-lg ${
                        message.tipo === 'usuario'
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                          : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                      }`}
                    >
                      {message.tipo === 'ia' && message.icono && (
                        <div className="text-lg mb-1">{message.icono}</div>
                      )}
                      <p className="text-sm whitespace-pre-line leading-relaxed">{message.contenido}</p>
                      {message.acciones && message.acciones.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-green-200 bg-green-50 rounded p-2">
                          <p className="text-xs text-green-700 font-semibold mb-1">
                            ✅ Campos llenados automáticamente:
                          </p>
                          <ul className="text-xs text-green-600 space-y-1">
                            {message.acciones.map((accion, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="mr-1">•</span>
                                <span>
                                  <span className="font-medium">{accion.campo}</span>: 
                                  <span className="ml-1">
                                    {typeof accion.valor === 'string' && accion.valor.length > 60 
                                      ? accion.valor.substring(0, 60) + '...' 
                                      : accion.valor}
                                  </span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-2">
                        {message.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-800 p-3 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <FaRobot className="h-4 w-4 text-blue-500" />
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">IA escribiendo...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input y controles */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe tu pregunta..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={enviarMensaje}
                    disabled={!inputMessage.trim()}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white p-2 rounded-md transition-all duration-200 disabled:cursor-not-allowed"
                    title="Enviar mensaje"
                  >
                    <FaPaperPlane className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Controles adicionales */}
                <div className="flex justify-between items-center mt-2">
                  <button
                    onClick={limpiarChat}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    title="Limpiar chat"
                  >
                    🗑️ Limpiar chat
                  </button>
                  <span className="text-xs text-gray-400">
                    {messages.length} mensaje{messages.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
