import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import PuertosDragDropFotos from './PuertosDragDropFotos';
import { MAX_FOTOS_SECCION_INSPECCION_ASEGURADO } from '../PuertosActas/puertosFotosLimites.js';

/** Sección 3 — INFORME FOTOGRAFICO (Motorysa: almacenamiento + modelo) */
export default function InformeFotograficoMotorysa({ formData, onInputChange, cargando }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';

  const imagenesAlmacenamiento = formData.imagenesAspectoAlmacenamiento || [];
  const imagenesModelo = formData.imagenesAspectoModelo || [];
  const max = MAX_FOTOS_SECCION_INSPECCION_ASEGURADO;

  return (
    <div
      className="p-4 rounded mb-6"
      style={{
        backgroundColor: cardBg,
        border: `2px solid ${theme === 'dark' ? '#DC2626' : '#DC2626'}`,
      }}
    >
      <h3 className="text-lg font-bold mb-1" style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}>
        {t('ports.ui.formulario.motorysa.informeFotografico.titulo')}
      </h3>
      <p className="text-xs mb-6" style={{ color: textSecondary }}>
        {t('ports.ui.formulario.motorysa.informeFotografico.intro', { max })}
      </p>

      <div className="mb-8">
        <h4 className="text-sm font-bold mb-2" style={{ color: textPrimary }}>
          {t('ports.ui.formulario.motorysa.informeFotografico.aspectoAlmacenamiento')}
        </h4>
        <PuertosDragDropFotos
          imagenes={imagenesAlmacenamiento}
          onChange={(nuevas) => onInputChange('imagenesAspectoAlmacenamiento', nuevas)}
          cargando={cargando}
          max={max}
          placeholder={t('ports.ui.formulario.motorysa.informeFotografico.placeholderAlmacenamiento')}
          notaS3={t('ports.ui.formulario.motorysa.informeFotografico.notaS3Almacenamiento', { max })}
        />
      </div>

      <div className="mb-2">
        <h4 className="text-sm font-bold mb-2" style={{ color: textPrimary }}>
          {t('ports.ui.formulario.motorysa.informeFotografico.aspectoModelo')}
        </h4>
        <PuertosDragDropFotos
          imagenes={imagenesModelo}
          onChange={(nuevas) => onInputChange('imagenesAspectoModelo', nuevas)}
          cargando={cargando}
          max={max}
          placeholder={t('ports.ui.formulario.motorysa.informeFotografico.placeholderModelo')}
          notaS3={t('ports.ui.formulario.motorysa.informeFotografico.notaS3Modelo', { max })}
        />
      </div>
    </div>
  );
}
