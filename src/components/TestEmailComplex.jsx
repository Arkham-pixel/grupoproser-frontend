import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
const t = i18n.t.bind(i18n);
import React, { useState } from 'react';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig.js';

export default function TestEmailComplex() {
  useTranslation();
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
      const response = await axios.post(`${BASE_URL}/api/complex/test-email`, {
        emailDestino
      });

      setResultado(response.data);
} catch (err) {
      setError(err.response?.data?.message || err.message);
      console.error('❌ Error enviando email de prueba complex:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-blue-700 mb-6">{t("complex.ui.test_email_complex.prueba_de_email_casos_complex")}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t("complex.ui.test_email_complex.email_de_destino")}</label>
            <input
              type="email"
              value={emailDestino}
              onChange={(e) => setEmailDestino(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("complex.ui.test_email_complex.danalyst_proserpuertos_com_co")}
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
            {loading ? 'Enviando...' : 'Enviar Email de Prueba Complex'}
          </button>
        </form>

        {resultado && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-lg font-medium text-green-800 mb-2">{t("complex.ui.test_email_complex.email_enviado")}</h3>
            <div className="text-sm text-green-700">
              <p><strong>{t("complex.ui.test_email_complex.message_id")}</strong> {resultado.messageId}</p>
              <p><strong>{t("complex.ui.test_email_complex.mensaje")}</strong> {resultado.message}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <h3 className="text-lg font-medium text-red-800 mb-2">{t("complex.ui.test_email_complex.error")}</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-lg font-medium text-blue-800 mb-2">{t("complex.ui.test_email_complex.informacion")}</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>{t("complex.ui.test_email_complex.este_componente_envia_un_email_de_prueba_para_casos_comp")}</p>
            <p>{t("complex.ui.test_email_complex.verifica_que_la_configuracion_de_email_este_correcta")}</p>
            <p>{t("complex.ui.test_email_complex.util_para_probar_el_sistema_de_notificaciones_de_casos_c")}</p>
            <p>{t("complex.ui.test_email_complex.los_emails_se_envian_automaticamente_al_crear_actualizar")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
