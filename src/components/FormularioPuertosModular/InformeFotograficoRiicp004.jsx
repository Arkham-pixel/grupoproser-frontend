import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { FaPlus, FaTrash } from 'react-icons/fa';
import PuertosDragDropFotos from './PuertosDragDropFotos';

/** Sección 3 — INFORME FOTOGRÁFICO (formato RII-CP-004) */
export default function InformeFotograficoRiicp004({ formData, onInputChange, cargando }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  const imagenesAlmacenamiento = formData.imagenesAspectoAlmacenamiento || [];
  const imagenesModelo = formData.imagenesAspectoModelo || [];
  const registrosPorVin = formData.registrosPorVin || [];

  const agregarRegistroVin = () => {
    onInputChange('registrosPorVin', [
      ...registrosPorVin,
      { id: Date.now(), vin: '', danos: '', fotos: [] },
    ]);
  };

  const eliminarRegistroVin = (registroId) => {
    onInputChange('registrosPorVin', registrosPorVin.filter((r) => r.id !== registroId));
  };

  const actualizarRegistro = (registroId, campo, valor) => {
    onInputChange(
      'registrosPorVin',
      registrosPorVin.map((r) => (r.id === registroId ? { ...r, [campo]: valor } : r))
    );
  };

  const actualizarFotosRegistro = (registroId, fotos) => {
    onInputChange(
      'registrosPorVin',
      registrosPorVin.map((r) => (r.id === registroId ? { ...r, fotos } : r))
    );
  };

  return (
    <div
      className="p-4 rounded mb-6"
      style={{
        backgroundColor: cardBg,
        border: `2px solid ${theme === 'dark' ? '#DC2626' : '#DC2626'}`,
      }}
    >
      <h3 className="text-lg font-bold mb-1" style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}>
        {t('ports.ui.formulario.riicp004.informeFotografico.titulo')}
      </h3>
      <p className="text-xs mb-6" style={{ color: textSecondary }}>
        {t('ports.ui.formulario.riicp004.informeFotografico.intro')}
      </p>

      <div className="mb-8">
        <h4 className="text-sm font-bold mb-2" style={{ color: textPrimary }}>
          {t('ports.ui.formulario.riicp004.informeFotografico.aspectoAlmacenamiento')}
        </h4>
        <PuertosDragDropFotos
          imagenes={imagenesAlmacenamiento}
          onChange={(nuevas) => onInputChange('imagenesAspectoAlmacenamiento', nuevas)}
          cargando={cargando}
          placeholder={t('ports.ui.formulario.riicp004.informeFotografico.placeholderAlmacenamiento')}
          notaS3={t('ports.ui.formulario.riicp004.informeFotografico.notaS3Almacenamiento')}
        />
      </div>

      <div className="mb-8">
        <h4 className="text-sm font-bold mb-2" style={{ color: textPrimary }}>
          {t('ports.ui.formulario.riicp004.informeFotografico.aspectoModelo')}
        </h4>
        <PuertosDragDropFotos
          imagenes={imagenesModelo}
          onChange={(nuevas) => onInputChange('imagenesAspectoModelo', nuevas)}
          cargando={cargando}
          placeholder={t('ports.ui.formulario.riicp004.informeFotografico.placeholderModelo')}
          notaS3={t('ports.ui.formulario.riicp004.informeFotografico.notaS3Modelo')}
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-bold" style={{ color: textPrimary }}>
            {t('ports.ui.formulario.riicp004.informeFotografico.fotosPorVin')}
          </h4>
          <button
            type="button"
            onClick={agregarRegistroVin}
            className="px-3 py-2 rounded flex items-center gap-2 text-sm font-medium text-white"
            style={{ backgroundColor: theme === 'dark' ? '#2563EB' : '#3B82F6' }}
            disabled={cargando}
          >
            <FaPlus /> {t('ports.ui.formulario.riicp004.informeFotografico.agregarVin')}
          </button>
        </div>

        {registrosPorVin.map((registro) => (
          <div
            key={registro.id}
            className="mb-4 p-3 rounded"
            style={{ backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB', border: `1px solid ${borderColor}` }}
          >
            <div className="flex gap-3 mb-3 items-start">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>VIN</label>
                  <input
                    type="text"
                    value={registro.vin}
                    onChange={(e) => actualizarRegistro(registro.id, 'vin', e.target.value)}
                    className="w-full rounded px-2 py-1.5 text-sm"
                    style={{ backgroundColor: inputBg, color: textPrimary, border: `1px solid ${borderColor}` }}
                    disabled={cargando}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
                    {t('ports.ui.formulario.riicp004.informeFotografico.descripcionDano')}
                  </label>
                  <input
                    type="text"
                    value={registro.danos}
                    onChange={(e) => actualizarRegistro(registro.id, 'danos', e.target.value)}
                    className="w-full rounded px-2 py-1.5 text-sm"
                    style={{ backgroundColor: inputBg, color: textPrimary, border: `1px solid ${borderColor}` }}
                    placeholder={t('ports.ui.formulario.riicp004.informeFotografico.danoPlaceholder')}
                    disabled={cargando}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => eliminarRegistroVin(registro.id)}
                className="p-2 text-red-500 mt-5"
                disabled={cargando}
              >
                <FaTrash />
              </button>
            </div>
            <PuertosDragDropFotos
              imagenes={registro.fotos || []}
              onChange={(fotos) => actualizarFotosRegistro(registro.id, fotos)}
              cargando={cargando}
              placeholder={t('ports.ui.formulario.riicp004.informeFotografico.placeholderVin')}
              notaS3={t('ports.ui.formulario.riicp004.informeFotografico.notaS3Vin')}
              mostrarContador={false}
            />
          </div>
        ))}

        {registrosPorVin.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: textSecondary }}>
            {t('ports.ui.formulario.riicp004.informeFotografico.empty')}
          </p>
        )}
      </div>
    </div>
  );
}
