import React, { useState } from 'react';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig.js';

export default function TestEmail() {
  const [emailDestino, setEmailDestino] = useState('danalyst@proserpuertos.com.co');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResultado(null);
    setError(null);

    try {
      const response = await axios.post(`${BASE_URL}/api/riesgos/test-email`, {
        emailDestino
      });

      setResultado(response.data);
      console.log('✅ Email de prueba enviado:', response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      console.error('❌ Error enviando email de prueba:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-blue-700 mb-6">🧪 Prueba de Email</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email de destino:
            </label>
            <input
              type="email"
              value={emailDestino}
              onChange={(e) => setEmailDestino(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="danalyst@proserpuertos.com.co"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md font-medium ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? 'Enviando...' : 'Enviar Email de Prueba'}
          </button>
        </form>

        {resultado && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-lg font-medium text-green-800 mb-2">✅ Email Enviado</h3>
            <div className="text-sm text-green-700">
              <p><strong>Message ID:</strong> {resultado.messageId}</p>
              <p><strong>Mensaje:</strong> {resultado.message}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <h3 className="text-lg font-medium text-red-800 mb-2">❌ Error</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-lg font-medium text-blue-800 mb-2">📋 Información</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• Este componente envía un email de prueba al backend</p>
            <p>• Verifica que la configuración de email esté correcta</p>
            <p>• Útil para probar el sistema de notificaciones</p>
          </div>
        </div>
      </div>
    </div>
  );
} 