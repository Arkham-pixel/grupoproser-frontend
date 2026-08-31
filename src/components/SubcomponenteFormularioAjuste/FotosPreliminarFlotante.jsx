import React, { useEffect, useRef, useState } from 'react';
import { FaCamera, FaCheckCircle, FaCompress, FaImages } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { ImageCompression } from '../../utils/imageCompression';
import { ACCEPT_ARCHIVOS_IMAGEN_CON_CAMARA } from '../../utils/heicToJpeg.js';
import { queueOfflinePhoto } from '../../services/photoService.js';
import { OFFLINE_FIRST_ENABLED } from '../../config/autoSaveConfig.js';
import { checkConnectivity } from '../../services/connectivityService.js';

/**
 * Carga fotos desde el acta sin alterar su maquetación. Las guarda en el
 * campo compartido del registro fotográfico que usa el informe preliminar /
 * informe único catastrófico. En móvil permite cámara o galería.
 */
export default function FotosPreliminarFlotante({ formData, onInputChange }) {
  const { t } = useTranslation();
  const inputGaleriaRef = useRef(null);
  const inputCamaraRef = useRef(null);
  const avisoTimeoutRef = useRef(null);
  const [procesando, setProcesando] = useState(false);
  const [fotosListas, setFotosListas] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(
    () => () => {
      if (avisoTimeoutRef.current) clearTimeout(avisoTimeoutRef.current);
    },
    []
  );

  const cargarFotos = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    setMenuAbierto(false);
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

      if (OFFLINE_FIRST_ENABLED) {
        const online = await checkConnectivity().catch(() => navigator.onLine);
        if (!online) {
          Promise.all(
            comprimidas.map((file) =>
              queueOfflinePhoto({
                file,
                caseId: formData?.casoId || formData?.numeroCaso || formData?.metadata?.complexId,
                formId: formData?._id || formData?.id || '',
              })
            )
          ).catch(() => {});
        }
      }

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

        {menuAbierto && !procesando && (
          <div className="flex flex-col gap-2 rounded-2xl border border-violet-200 bg-white p-2 shadow-xl dark:border-violet-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => inputCamaraRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-50 dark:text-violet-200 dark:hover:bg-violet-950/40"
            >
              <FaCamera /> Tomar foto
            </button>
            <button
              type="button"
              onClick={() => inputGaleriaRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-50 dark:text-violet-200 dark:hover:bg-violet-950/40"
            >
              <FaImages /> Galería / archivos
            </button>
          </div>
        )}

        {/* Cámara trasera del teléfono (una foto por toma; se puede repetir) */}
        <input
          ref={inputCamaraRef}
          type="file"
          accept={ACCEPT_ARCHIVOS_IMAGEN_CON_CAMARA}
          capture="environment"
          className="hidden"
          onChange={cargarFotos}
          disabled={procesando}
        />
        {/* Galería / múltiples archivos */}
        <input
          ref={inputGaleriaRef}
          type="file"
          accept={ACCEPT_ARCHIVOS_IMAGEN_CON_CAMARA}
          multiple
          className="hidden"
          onChange={cargarFotos}
          disabled={procesando}
        />

        <button
          type="button"
          onClick={() => (procesando ? null : setMenuAbierto((v) => !v))}
          disabled={procesando}
          title={t('adjustment.ui.fotosPrelim.uploadTitle')}
          aria-label={t('adjustment.ui.fotosPrelim.uploadTitle')}
          aria-expanded={menuAbierto}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-700 text-white shadow-xl transition hover:scale-105 hover:bg-violet-800 disabled:cursor-wait disabled:opacity-70"
        >
          {procesando ? <FaCompress className="animate-spin text-xl" /> : <FaCamera className="text-xl" />}
        </button>
      </div>
    </>
  );
}
