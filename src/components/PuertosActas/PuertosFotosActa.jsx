import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { FaArrowDown, FaArrowUp, FaCloudUploadAlt, FaGripVertical, FaTrash, FaImage } from 'react-icons/fa';
import { getPuertosImagenDisplayUrl } from './puertosCasoImagenUtils';

export default function PuertosFotosActa({ fotos = [], onChange, soloLectura = false }) {
  const { t } = useTranslation();
  const puedeEditar = typeof onChange === 'function' && !soloLectura;
  const [arrastrandoId, setArrastrandoId] = useState(null);
  const [destinoArrastreId, setDestinoArrastreId] = useState(null);

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (!puedeEditar || !acceptedFiles.length) return;

      acceptedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          onChange((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              src: e.target.result,
              nombre: file.name,
              descripcion: '',
            },
          ]);
        };
        reader.readAsDataURL(file);
      });
    },
    [onChange, puedeEditar]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.jfif', '.png', '.gif', '.webp'] },
    multiple: true,
    disabled: !puedeEditar,
    noClick: arrastrandoId != null,
    noKeyboard: arrastrandoId != null,
  });

  const eliminarFoto = (id) => {
    onChange((prev) => prev.filter((f) => f.id !== id));
  };

  const actualizarDescripcion = (id, descripcion) => {
    onChange((prev) => prev.map((f) => (f.id === id ? { ...f, descripcion } : f)));
  };

  const moverFoto = (id, delta) => {
    onChange((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const next = idx + delta;
      if (next < 0 || next >= prev.length) return prev;
      const copia = [...prev];
      [copia[idx], copia[next]] = [copia[next], copia[idx]];
      return copia;
    });
  };

  const reordenarFotos = (origenId, destinoId) => {
    if (!origenId || !destinoId || origenId === destinoId) return;
    onChange((prev) => {
      const origenIdx = prev.findIndex((f) => f.id === origenId);
      const destinoIdx = prev.findIndex((f) => f.id === destinoId);
      if (origenIdx < 0 || destinoIdx < 0) return prev;
      const copia = [...prev];
      const [item] = copia.splice(origenIdx, 1);
      copia.splice(destinoIdx, 0, item);
      return copia;
    });
  };

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <header className="flex items-center gap-3 px-5 py-4 bg-slate-100 dark:bg-slate-700/80 border-b border-slate-200 dark:border-slate-600">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white">
          <FaImage />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {t('ports.ui.actas.photos.title')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('ports.ui.actas.photos.subtitleUnlimited', {
              defaultValue: 'Arrastra imágenes para subir · arrastra cada foto para cambiar el orden · sin límite de cantidad',
            })}
          </p>
        </div>
        <span className="ml-auto rounded-full bg-sky-100 dark:bg-sky-900/50 px-3 py-1 text-sm font-medium text-sky-800 dark:text-sky-200">
          {t('ports.ui.actas.photos.countUnlimited', {
            count: fotos.length,
            defaultValue: '{{count}} foto(s)',
          })}
        </span>
      </header>

      <div className="p-5 space-y-5">
        {puedeEditar && (
          <div
            {...getRootProps()}
            className={`
              relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10
              transition-colors cursor-pointer
              ${isDragActive && !isDragReject ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30' : ''}
              ${isDragReject ? 'border-red-400 bg-red-50 dark:bg-red-950/20' : ''}
              ${!isDragActive && !isDragReject ? 'border-slate-300 dark:border-slate-500 hover:border-sky-400 hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''}
            `}
          >
            <input {...getInputProps()} />
            <FaCloudUploadAlt
              className={`mb-3 text-4xl ${isDragActive ? 'text-sky-600' : 'text-slate-400'}`}
            />
            {isDragActive ? (
              <p className="text-center font-medium text-sky-700 dark:text-sky-300">
                {t('ports.ui.actas.photos.dropHere')}
              </p>
            ) : (
              <>
                <p className="text-center font-medium text-slate-700 dark:text-slate-200">
                  {t('ports.ui.actas.photos.dragDrop')}
                </p>
                <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t('ports.ui.actas.photos.orClick')}
                </p>
              </>
            )}
          </div>
        )}

        {fotos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {fotos.map((foto, index) => {
              const displaySrc = getPuertosImagenDisplayUrl(foto) || foto.src;
              const esArrastrada = arrastrandoId === foto.id;
              const esDestino = destinoArrastreId === foto.id && arrastrandoId && arrastrandoId !== foto.id;

              return (
                <div
                  key={foto.id}
                  draggable={puedeEditar}
                  onDragStart={(e) => {
                    if (!puedeEditar) return;
                    setArrastrandoId(foto.id);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', foto.id);
                  }}
                  onDragEnd={() => {
                    setArrastrandoId(null);
                    setDestinoArrastreId(null);
                  }}
                  onDragOver={(e) => {
                    if (!puedeEditar || !arrastrandoId || arrastrandoId === foto.id) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDestinoArrastreId(foto.id);
                  }}
                  onDragLeave={() => {
                    if (destinoArrastreId === foto.id) setDestinoArrastreId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!puedeEditar) return;
                    const origenId = e.dataTransfer.getData('text/plain') || arrastrandoId;
                    reordenarFotos(origenId, foto.id);
                    setArrastrandoId(null);
                    setDestinoArrastreId(null);
                  }}
                  className={`group relative flex flex-col rounded-xl border bg-slate-50 dark:bg-slate-900/50 overflow-hidden transition-all ${
                    esArrastrada ? 'opacity-40 scale-[0.98] border-dashed border-sky-400' : 'border-slate-200 dark:border-slate-600'
                  } ${esDestino ? 'ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-900' : ''} ${
                    puedeEditar ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                >
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                    <span className="rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    {puedeEditar && (
                      <span
                        className="rounded-md bg-black/40 p-1 text-white"
                        title={t('ports.ui.actas.photos.dragToReorder')}
                      >
                        <FaGripVertical className="text-xs" />
                      </span>
                    )}
                  </div>

                  {puedeEditar && (
                    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => moverFoto(foto.id, -1)}
                        disabled={index === 0}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/85 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                        title={t('ports.ui.actas.photos.moveUp')}
                      >
                        <FaArrowUp className="text-xs" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moverFoto(foto.id, 1)}
                        disabled={index === fotos.length - 1}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/85 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                        title={t('ports.ui.actas.photos.moveDown')}
                      >
                        <FaArrowDown className="text-xs" />
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminarFoto(foto.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                        title={t('ports.ui.actas.photos.deletePhoto')}
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  )}

                  <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-700 pointer-events-none">
                    <img
                      src={displaySrc}
                      alt={t('ports.ui.actas.photos.photoAlt', { n: index + 1 })}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </div>
                  <div className="p-3">
                    <input
                      type="text"
                      value={foto.descripcion}
                      onChange={(e) => actualizarDescripcion(foto.id, e.target.value)}
                      placeholder={t('ports.ui.actas.photos.descriptionPlaceholder')}
                      readOnly={soloLectura}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-sm text-slate-400 py-4">
            {t('ports.ui.actas.photos.empty')}
          </p>
        )}

        {puedeEditar && fotos.length > 1 && (
          <p className="text-center text-xs text-slate-400">
            {t('ports.ui.actas.photos.orderHint')}
          </p>
        )}
      </div>
    </section>
  );
}
