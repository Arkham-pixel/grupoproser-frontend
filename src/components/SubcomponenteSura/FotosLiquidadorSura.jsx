import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCamera } from 'react-icons/fa';
import { getImageUrl, createImageErrorHandler } from '../../utils/imageUtils';
import { expressBtnSecondary } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { expressFormSection, expressSectionTitle } from '../SubcomponenteExpress/expressFenixUi.js';
import { descripcionFotoNsr } from './syncFotosNsrAlInformeSura.js';
import { fotosNsrDesdeLiquidador } from './informeAgilSuraHelpers.js';

export default function FotosLiquidadorSura({ liquidador = null, onIrPresupuesto }) {
  const { t } = useTranslation();
  const fotos = useMemo(() => fotosNsrDesdeLiquidador(liquidador || {}), [liquidador]);
  const [ampliada, setAmpliada] = useState(null);

  return (
    <div className="space-y-5">
      <section className={expressFormSection}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`${expressSectionTitle} mb-0`}>
            {t('segurosSura.fotosAgil.title')}
          </h3>
          {typeof onIrPresupuesto === 'function' && (
            <button type="button" className={expressBtnSecondary} onClick={onIrPresupuesto}>
              {t('segurosSura.fotosAgil.goBudget')}
            </button>
          )}
        </div>
        <p className="mb-4 font-body text-sm text-gray-600 dark:text-gray-400">
          {t('segurosSura.fotosAgil.hint')}
        </p>

        {!fotos.length ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 px-6 py-16 text-center dark:border-gray-700">
            <FaCamera className="mb-3 text-3xl text-gray-400" />
            <p className="font-body text-sm text-gray-600 dark:text-gray-400">
              {t('segurosSura.fotosAgil.empty')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {fotos.map((item, index) => {
              const imagen = {
                ruta: item.fotoRuta,
                preview: item.fotoPreview,
                _id: item.fotoArchivoId,
              };
              const src = getImageUrl(imagen);
              const titulo = descripcionFotoNsr(item);
              return (
                <figure
                  key={item.fotoArchivoId || item.fotoRuta || index}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]"
                >
                  <button
                    type="button"
                    className="block w-full bg-black/5"
                    onClick={() => setAmpliada({ src, titulo })}
                  >
                    <img
                      src={src}
                      alt={titulo}
                      className="mx-auto max-h-[420px] w-full object-contain"
                      onError={createImageErrorHandler(imagen)}
                    />
                  </button>
                  <figcaption className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                    <p className="font-body text-sm font-semibold text-gray-900 dark:text-white">
                      {titulo}
                    </p>
                    {item.fotoRef ? (
                      <p className="mt-1 font-body text-xs text-gray-500">{item.fotoRef}</p>
                    ) : null}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </section>

      {ampliada && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          role="presentation"
          onClick={() => setAmpliada(null)}
        >
          <img
            src={ampliada.src}
            alt={ampliada.titulo}
            className="max-h-[92vh] max-w-[96vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
