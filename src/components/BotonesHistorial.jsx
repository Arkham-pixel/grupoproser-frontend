import React from 'react';
import { useTranslation } from 'react-i18next';

const BotonesHistorial = ({ 
  onGuardarEnHistorial, 
  onExportar, 
  tipoFormulario, 
  tituloFormulario,
  deshabilitado = false,
  guardando = false,
  exportando = false
}) => {
  const { t } = useTranslation();

  return (
    <div className="mb-8 mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:space-x-4">
      <button
        onClick={onGuardarEnHistorial}
        disabled={deshabilitado || guardando}
        className={`btn-fenix-primary flex items-center justify-center gap-2 py-3 px-6 font-bold shadow-lg transition duration-300 ${
          deshabilitado || guardando ? 'cursor-not-allowed opacity-50' : ''
        }`}
        title={deshabilitado ? t('common.historyButtons.completeRequiredToSave') : t('common.historyButtons.saveProgressTitle')}
      >
        {guardando ? t('common.historyButtons.saving') : t('common.historyButtons.saveToHistory')}
      </button>
      
      <button
        onClick={onExportar}
        disabled={deshabilitado || exportando}
        className={`btn-fenix-secondary flex items-center justify-center gap-2 py-3 px-6 font-bold shadow-lg transition duration-300 ${
          deshabilitado || exportando ? 'cursor-not-allowed opacity-50' : ''
        }`}
        title={deshabilitado ? t('common.historyButtons.completeRequiredToExport') : t('common.historyButtons.exportTitle', { title: tituloFormulario })}
      >
        {exportando ? t('common.historyButtons.exporting') : t('common.historyButtons.exportForm', { title: tituloFormulario })}
      </button>
    </div>
  );
};

export default BotonesHistorial;
