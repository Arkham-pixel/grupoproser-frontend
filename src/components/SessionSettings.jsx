import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SESSION_CONFIG, SESSION_MESSAGES } from '../config/session.js';

const SessionSettings = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    sessionDuration: SESSION_CONFIG.SESSION_DURATION / (60 * 1000), // Convertir a minutos
    warningDuration: SESSION_CONFIG.WARNING_DURATION / (60 * 1000), // Convertir a minutos
  });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Verificar si el usuario es admin
    const rol = localStorage.getItem('rol');
    setIsAdmin(rol === 'admin');
  }, []);

  const handleSave = () => {
    // Aquí podrías guardar la configuración en localStorage o enviar al backend
    const newConfig = {
      SESSION_DURATION: settings.sessionDuration * 60 * 1000,
      WARNING_DURATION: settings.warningDuration * 60 * 1000,
    };
    
    localStorage.setItem('sessionSettings', JSON.stringify(newConfig));
    alert(t('admin.ui.sessionSettings.updated'));
  };

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
        <p className="text-red-700 text-xs sm:text-sm">{t('admin.ui.sessionSettings.adminOnly')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-3 sm:p-4 lg:p-6">
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">⚙️ {t('admin.ui.sessionSettings.title')}</h3>
      
      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            {t('admin.ui.sessionSettings.sessionDuration')}
          </label>
          <input
            type="number"
            min="5"
            max="120"
            value={settings.sessionDuration}
            onChange={(e) => setSettings({
              ...settings,
              sessionDuration: parseInt(e.target.value) || 30
            })}
            className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm"
          />
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {t('admin.ui.sessionSettings.sessionDurationHelp')}
          </p>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            {t('admin.ui.sessionSettings.warningDuration')}
          </label>
          <input
            type="number"
            min="1"
            max={settings.sessionDuration - 1}
            value={settings.warningDuration}
            onChange={(e) => setSettings({
              ...settings,
              warningDuration: parseInt(e.target.value) || 5
            })}
            className="w-full border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm"
          />
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {t('admin.ui.sessionSettings.warningDurationHelp')}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <h4 className="font-medium text-blue-800 mb-1 sm:mb-2 text-xs sm:text-sm">📋 {t('admin.ui.sessionSettings.summaryTitle')}</h4>
          <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
            <li>• {t('admin.ui.sessionSettings.summaryExpires', { minutes: settings.sessionDuration })}</li>
            <li>• {t('admin.ui.sessionSettings.summaryWarning', { minutes: settings.warningDuration })}</li>
            <li>• {t('admin.ui.sessionSettings.summaryExtend')}</li>
          </ul>
        </div>

        <button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm"
        >
          💾 {t('admin.ui.sessionSettings.save')}
        </button>
      </div>
    </div>
  );
};

export default SessionSettings; 