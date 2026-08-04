import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { FaPlus, FaTrash, FaCheck } from 'react-icons/fa';

const CATEGORIAS = [
  'Almacenamiento',
  'Seguridad',
  'Operaciones',
  'Mantenimiento',
  'Documentación',
  'General',
];

export default function RecomendacionesPuertos({ formData, onInputChange, cargando, tituloSeccion }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  const [nuevaRecomendacion, setNuevaRecomendacion] = useState('');
  const [bancoRecomendaciones, setBancoRecomendaciones] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');

  const categoriaLabel = (cat) =>
    t(`ports.ui.formulario.recomendaciones.categorias.${cat}`, { defaultValue: cat });

  useEffect(() => {
    const bancoGuardado = localStorage.getItem('bancoRecomendacionesPuertos');
    if (bancoGuardado) {
      try {
        setBancoRecomendaciones(JSON.parse(bancoGuardado));
      } catch (error) {
        console.error('Error al cargar banco de recomendaciones:', error);
      }
    }
  }, []);

  const guardarEnBanco = (nuevoBanco) => {
    setBancoRecomendaciones(nuevoBanco);
    localStorage.setItem('bancoRecomendacionesPuertos', JSON.stringify(nuevoBanco));
  };

  const recomendacionesActuales = formData.recomendaciones || [];

  const handleAgregarRecomendacion = () => {
    if (nuevaRecomendacion.trim()) {
      const nuevaRec = {
        id: Date.now(),
        texto: nuevaRecomendacion.trim(),
        categoria: categoriaSeleccionada || 'General',
      };

      onInputChange('recomendaciones', [...recomendacionesActuales, nuevaRec]);
      setNuevaRecomendacion('');
    }
  };

  const handleEliminarRecomendacion = (id) => {
    onInputChange('recomendaciones', recomendacionesActuales.filter(rec => rec.id !== id));
  };

  const handleGuardarEnBanco = () => {
    if (nuevaRecomendacion.trim()) {
      const nuevaRec = {
        id: Date.now(),
        texto: nuevaRecomendacion.trim(),
        categoria: categoriaSeleccionada || 'General',
      };

      guardarEnBanco([...bancoRecomendaciones, nuevaRec]);
      setNuevaRecomendacion('');
    }
  };

  const handleAgregarDesdeBanco = (recomendacion) => {
    const nuevaRec = {
      id: Date.now(),
      texto: recomendacion.texto,
      categoria: recomendacion.categoria,
    };

    onInputChange('recomendaciones', [...recomendacionesActuales, nuevaRec]);
  };

  const handleEliminarDelBanco = (id) => {
    guardarEnBanco(bancoRecomendaciones.filter(rec => rec.id !== id));
  };

  const bancoFiltrado = categoriaSeleccionada
    ? bancoRecomendaciones.filter(rec => rec.categoria === categoriaSeleccionada)
    : bancoRecomendaciones;

  return (
    <div
      className="p-4 rounded mb-6"
      style={{
        backgroundColor: cardBg,
        border: `2px solid ${borderColor}`,
      }}
    >
      <h3
        className="text-xl font-bold mb-4"
        style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
      >
        {tituloSeccion || t('ports.ui.formulario.recomendaciones.tituloDefault')}
      </h3>

      <div className="mb-4">
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: textPrimary }}
        >
          {t('ports.ui.formulario.recomendaciones.categoria')}
        </label>
        <select
          value={categoriaSeleccionada}
          onChange={(e) => setCategoriaSeleccionada(e.target.value)}
          className="w-full rounded px-3 py-2 text-sm"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`,
          }}
        >
          <option value="">{t('ports.ui.formulario.recomendaciones.todasCategorias')}</option>
          {CATEGORIAS.map(cat => (
            <option key={cat} value={cat}>{categoriaLabel(cat)}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: textPrimary }}
        >
          {t('ports.ui.formulario.recomendaciones.nuevaRecomendacion')}
        </label>
        <textarea
          value={nuevaRecomendacion}
          onChange={(e) => setNuevaRecomendacion(e.target.value)}
          rows="3"
          className="w-full rounded px-3 py-2 text-sm"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`,
            resize: 'vertical',
          }}
          placeholder={t('ports.ui.formulario.recomendaciones.nuevaRecomendacionPlaceholder')}
          disabled={cargando}
        />

        <div className="flex gap-2 mt-2">
          <button
            onClick={handleAgregarRecomendacion}
            className="px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? '#2563EB' : '#3B82F6',
              color: '#FFFFFF',
            }}
            disabled={cargando || !nuevaRecomendacion.trim()}
          >
            <FaPlus />
            {t('ports.ui.formulario.recomendaciones.agregarAlInforme')}
          </button>

          <button
            onClick={handleGuardarEnBanco}
            className="px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? '#16A34A' : '#22C55E',
              color: '#FFFFFF',
            }}
            disabled={cargando || !nuevaRecomendacion.trim()}
          >
            <FaPlus />
            {t('ports.ui.formulario.recomendaciones.guardarEnBanco')}
          </button>
        </div>
      </div>

      {bancoFiltrado.length > 0 && (
        <div
          className="mb-6 p-4 rounded"
          style={{
            backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
            border: `1px solid ${borderColor}`,
          }}
        >
          <h4
            className="text-sm font-bold mb-3"
            style={{ color: textPrimary }}
          >
            {t('ports.ui.formulario.recomendaciones.bancoTitulo')}
            {categoriaSeleccionada && ` - ${categoriaLabel(categoriaSeleccionada)}`}
          </h4>

          <div className="space-y-2">
            {bancoFiltrado.map(rec => (
              <div
                key={rec.id}
                className="p-3 rounded flex items-start gap-3"
                style={{
                  backgroundColor: cardBg,
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div className="flex-1">
                  <span
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{
                      backgroundColor: theme === 'dark' ? '#2563EB' : '#DBEAFE',
                      color: theme === 'dark' ? '#93C5FD' : '#1E40AF',
                    }}
                  >
                    {categoriaLabel(rec.categoria)}
                  </span>
                  <p
                    className="text-sm mt-2"
                    style={{ color: textPrimary }}
                  >
                    {rec.texto}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAgregarDesdeBanco(rec)}
                    className="p-2 rounded hover:bg-blue-500 hover:text-white transition-colors"
                    style={{ color: '#3B82F6' }}
                    title={t('ports.ui.formulario.recomendaciones.agregarAlInformeTitle')}
                  >
                    <FaCheck size={14} />
                  </button>

                  <button
                    onClick={() => handleEliminarDelBanco(rec.id)}
                    className="p-2 rounded hover:bg-red-500 hover:text-white transition-colors"
                    style={{ color: '#EF4444' }}
                    title={t('ports.ui.formulario.recomendaciones.eliminarDelBancoTitle')}
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4
          className="text-sm font-bold mb-3"
          style={{ color: textPrimary }}
        >
          {t('ports.ui.formulario.recomendaciones.recomendacionesInforme', {
            count: recomendacionesActuales.length,
          })}
        </h4>

        {recomendacionesActuales.length > 0 ? (
          <div className="space-y-3">
            {recomendacionesActuales.map((rec) => (
              <div
                key={rec.id}
                className="p-3 rounded flex items-start gap-3"
                style={{
                  backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-1"
                  style={{
                    backgroundColor: theme === 'dark' ? '#DC2626' : '#FCA5A5',
                    color: '#FFFFFF',
                  }}
                >
                  <FaCheck size={12} />
                </div>

                <div className="flex-1">
                  <span
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{
                      backgroundColor: theme === 'dark' ? '#16A34A' : '#D1FAE5',
                      color: theme === 'dark' ? '#86EFAC' : '#065F46',
                    }}
                  >
                    {categoriaLabel(rec.categoria)}
                  </span>
                  <p
                    className="text-sm mt-2"
                    style={{ color: textPrimary }}
                  >
                    {rec.texto}
                  </p>
                </div>

                <button
                  onClick={() => handleEliminarRecomendacion(rec.id)}
                  className="flex-shrink-0 p-2 rounded hover:bg-red-500 hover:text-white transition-colors"
                  style={{ color: '#EF4444' }}
                  title={t('ports.ui.formulario.recomendaciones.eliminarTitle')}
                >
                  <FaTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="p-6 text-center rounded"
            style={{
              backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
              border: `2px dashed ${borderColor}`,
              color: textSecondary,
            }}
          >
            <p className="text-sm">{t('ports.ui.formulario.recomendaciones.sinRecomendaciones')}</p>
            <p className="text-xs mt-1">{t('ports.ui.formulario.recomendaciones.sinRecomendacionesAyuda')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
