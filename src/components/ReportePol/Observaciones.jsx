import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import TranslatedTextArea from "../TranslatedTextArea.jsx";

export default function Observaciones({
  observaciones, setObservaciones
}) {
  const { t } = useTranslation();
  const [observacionesEn, setObservacionesEn] = useState('');

  return (
    <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-yellow-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="bg-yellow-500 text-white p-2 rounded-lg mr-3">📝</span>
        {t('pol.ui.observaciones.title')}
      </h2>
      
      {/* Instrucción del documento original */}
      <div className="mb-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
        <p className="text-sm text-yellow-800 italic">
          <strong>{t('pol.ui.common.instructionLabel')}</strong> {t('pol.ui.observaciones.instruction')}
        </p>
      </div>
      
      <div className="space-y-2">
        <TranslatedTextArea
          label={t('pol.ui.observaciones.label')}
          value={observaciones}
          onChange={setObservaciones}
          translation={observacionesEn}
          onTranslationChange={setObservacionesEn}
          placeholder={t('pol.ui.observaciones.placeholder')}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-vertical"
        />
      </div>
      
      {/* Información adicional */}
      <div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>💡 {t('pol.ui.common.noteLabel')}</strong> {t('pol.ui.observaciones.note')}
        </p>
      </div>
    </div>
  );
}
