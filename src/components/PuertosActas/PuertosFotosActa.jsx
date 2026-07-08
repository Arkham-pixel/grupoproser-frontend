import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt, FaTrash, FaImage } from 'react-icons/fa';

const MAX_FOTOS = 20;

export default function PuertosFotosActa({ fotos = [], onChange, soloLectura = false }) {
  const puedeEditar = typeof onChange === 'function' && !soloLectura;
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (!puedeEditar || !acceptedFiles.length) return;

      const disponibles = MAX_FOTOS - fotos.length;
      if (disponibles <= 0) return;

      const archivos = acceptedFiles.slice(0, disponibles);

      archivos.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          onChange((prev) => {
            if (prev.length >= MAX_FOTOS) return prev;
            return [
              ...prev,
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                src: e.target.result,
                nombre: file.name,
                descripcion: '',
              },
            ];
          });
        };
        reader.readAsDataURL(file);
      });
    },
    [fotos.length, onChange, puedeEditar]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    multiple: true,
    disabled: !puedeEditar || fotos.length >= MAX_FOTOS,
  });

  const eliminarFoto = (id) => {
    onChange((prev) => prev.filter((f) => f.id !== id));
  };

  const actualizarDescripcion = (id, descripcion) => {
    onChange((prev) => prev.map((f) => (f.id === id ? { ...f, descripcion } : f)));
  };

  const lleno = fotos.length >= MAX_FOTOS;

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <header className="flex items-center gap-3 px-5 py-4 bg-slate-100 dark:bg-slate-700/80 border-b border-slate-200 dark:border-slate-600">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white">
          <FaImage />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Fotos del acta</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Arrastra imágenes o haz clic — máximo {MAX_FOTOS} fotos
          </p>
        </div>
        <span className="ml-auto rounded-full bg-sky-100 dark:bg-sky-900/50 px-3 py-1 text-sm font-medium text-sky-800 dark:text-sky-200">
          {fotos.length} / {MAX_FOTOS}
        </span>
      </header>

      <div className="p-5 space-y-5">
        {!lleno && (
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
                Suelta las imágenes aquí…
              </p>
            ) : (
              <>
                <p className="text-center font-medium text-slate-700 dark:text-slate-200">
                  Arrastra y suelta tus fotos
                </p>
                <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
                  o haz clic para seleccionar — JPG, PNG, GIF, WebP
                </p>
              </>
            )}
            <p className="mt-3 text-xs text-slate-400">
              Puedes agregar {MAX_FOTOS - fotos.length} foto(s) más
            </p>
          </div>
        )}

        {lleno && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Has alcanzado el límite de {MAX_FOTOS} fotos. Elimina una para agregar otra.
          </div>
        )}

        {fotos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {fotos.map((foto, index) => (
              <div
                key={foto.id}
                className="group relative flex flex-col rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 overflow-hidden"
              >
                <div className="absolute top-2 left-2 z-10 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
                  Foto {index + 1}
                </div>
                <button
                  type="button"
                  onClick={() => eliminarFoto(foto.id)}
                  className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white opacity-90 hover:opacity-100 shadow"
                  title="Eliminar foto"
                >
                  <FaTrash className="text-sm" />
                </button>
                <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-700">
                  <img
                    src={foto.src}
                    alt={`Foto ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="mb-2 truncate text-xs text-slate-500 dark:text-slate-400" title={foto.nombre}>
                    {foto.nombre}
                  </p>
                  <input
                    type="text"
                    value={foto.descripcion}
                    onChange={(e) => actualizarDescripcion(foto.id, e.target.value)}
                    placeholder="Descripción (opcional)"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-slate-400 py-4">
            Aún no hay fotos. Usa la zona de arrastre para agregar imágenes.
          </p>
        )}
      </div>
    </section>
  );
}
