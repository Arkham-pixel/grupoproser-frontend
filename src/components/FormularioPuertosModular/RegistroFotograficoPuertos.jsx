import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import PuertosDragDropFotos from './PuertosDragDropFotos';

export default function RegistroFotograficoPuertos({ formData, onInputChange, cargando }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const imagenesRegistro = formData.imagenesRegistro || [];

  return (
    <div
      className="mt-8 p-6 rounded shadow-sm"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`,
      }}
    >
      <h2 className="text-xl font-bold mb-4" style={{ color: textPrimary }}>
        {t('ports.ui.formulario.registroFotografico.titulo')}
      </h2>

      <PuertosDragDropFotos
        imagenes={imagenesRegistro}
        onChange={(nuevas) => onInputChange('imagenesRegistro', nuevas)}
        cargando={cargando}
        descripcionMultilinea
        placeholder={t('ports.ui.formulario.registroFotografico.placeholder')}
      />
    </div>
  );
}
