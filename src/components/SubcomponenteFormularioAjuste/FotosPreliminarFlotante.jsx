import React, { useEffect, useRef, useState } from 'react';
import { FaCamera, FaCheckCircle, FaCompress } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { ImageCompression } from '../../utils/imageCompression';

/**
 * Carga fotos desde el acta sin alterar su maquetación. Las guarda en el
 * campo compartido del registro fotográfico que usa el informe preliminar.
 */
export default function FotosPreliminarFlotante({ formData, onInputChange }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const avisoTimeoutRef = useRef(null);
  const [procesando, setProcesando] = useState(false);
  const [fotosListas, setFotosListas] = useState(false);

  useEffect(
    () => () => {
      if (avisoTimeoutRef.current) clearTimeout(avisoTimeoutRef.current);
    },
    []
  );

  const cargarFotos = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    setProcesando(true);
    try {
      const comprimidas = await ImageCompression.compressImages(files, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
        maxSizeKB: 500,
      });
      const nuevas = comprimidas.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
        nombre: file.name,
        descripcion: '',
        tamaño: file.size,
        tipoMime: file.type,
      }));
      onInputChange('imagenesInspeccion', [
        ...(formData.imagenesInspeccion || []),
        ...nuevas,
      ]);
      setFotosListas(true);
      if (avisoTimeoutRef.current) clearTimeout(avisoTimeoutRef.current);
      avisoTimeoutRef.current = setTimeout(() => setFotosListas(false), 4500);
    } catch (error) {
      console.error('Error procesando fotos para el informe preliminar:', error);
      window.alert(t('adjustment.ui.fotosPrelim.processError'));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {fotosListas && (
          <div
            role="status"
            className="animate-bounce rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-xl"
          >
            <FaCheckCircle className="mr-2 inline" />
            {t('adjustment.ui.fotosPrelim.ready')}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={cargarFotos}
          disabled={procesando}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={procesando}
          title={t('adjustment.ui.fotosPrelim.uploadTitle')}
          aria-label={t('adjustment.ui.fotosPrelim.uploadTitle')}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-700 text-white shadow-xl transition hover:scale-105 hover:bg-violet-800 disabled:cursor-wait disabled:opacity-70"
        >
          {procesando ? <FaCompress className="animate-spin text-xl" /> : <FaCamera className="text-xl" />}
        </button>
      </div>
    </>
  );
}
