import React, { useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt, FaTrash, FaImage, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import {
  crearImagenPendiente,
  getPuertosImagenDisplayUrl,
} from './puertosCasoImagenUtils';
import {
  puertosCard,
  puertosCardBody,
  puertosCardHeader,
  puertosDropzone,
  puertosDropzoneActive,
  puertosPhotoCaption,
  puertosPhotoCaptionInput,
  puertosPhotoCell,
  puertosPhotoGridFrame,
  puertosSectionSubtitle,
  puertosSectionTitle,
} from './puertosFenixUi';

export default function PuertosCasoGridFotografico({
  titulo,
  subtitulo,
  imagenes = [],
  onChange,
  columnas = 3,
  max = 30,
  descripcionesSugeridas = [],
  datalistId = 'puertos-descripciones-foto',
  soloLectura = false,
}) {
  const setImagenes = (updater) => {
    onChange(updater);
  };

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (!acceptedFiles.length) return;
      const disponibles = max - imagenes.length;
      const nuevas = acceptedFiles.slice(0, disponibles).map(crearImagenPendiente);
      if (nuevas.length) {
        setImagenes((prev) => [...(prev || []), ...nuevas]);
      }
    },
    [imagenes.length, max, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    multiple: true,
    disabled: soloLectura || imagenes.length >= max,
  });

  const filas = useMemo(() => {
    const rows = [];
    for (let i = 0; i < imagenes.length; i += columnas) {
      rows.push(imagenes.slice(i, i + columnas));
    }
    return rows;
  }, [imagenes, columnas]);

  const gridClass =
    columnas === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columnas === 4
        ? 'grid-cols-2 sm:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const actualizarDescripcion = (id, descripcion) => {
    setImagenes((prev) => prev.map((img) => (img.id === id ? { ...img, descripcion } : img)));
  };

  const eliminarImagen = (id) => {
    setImagenes((prev) => prev.filter((img) => img.id !== id));
  };

  const moverImagen = (id, delta) => {
    setImagenes((prev) => {
      const idx = prev.findIndex((img) => img.id === id);
      if (idx < 0) return prev;
      const next = idx + delta;
      if (next < 0 || next >= prev.length) return prev;
      const copia = [...prev];
      [copia[idx], copia[next]] = [copia[next], copia[idx]];
      return copia;
    });
  };

  return (
    <section className={puertosCard}>
      {(titulo || subtitulo) && (
        <header className={puertosCardHeader}>
          {titulo && <h3 className={puertosSectionTitle}>{titulo}</h3>}
          {subtitulo && <p className={puertosSectionSubtitle}>{subtitulo}</p>}
        </header>
      )}

      <div className={`${puertosCardBody} space-y-4`}>
        {!soloLectura && imagenes.length < max && (
          <div
            {...getRootProps()}
            className={`${puertosDropzone} ${isDragActive ? puertosDropzoneActive : ''}`}
          >
            <input {...getInputProps()} />
            <FaCloudUploadAlt className="mb-2 text-3xl text-gray-400" />
            <span className="font-body text-sm font-medium text-gray-700 dark:text-gray-300">
              Arrastra imágenes aquí o haz clic para seleccionar
            </span>
            <span className="mt-1 font-body text-xs text-gray-500">
              {imagenes.length} / {max} · cuadrícula de {columnas} columnas · S3 al grabar
            </span>
          </div>
        )}

        {filas.length > 0 && (
          <div className="space-y-4">
            {filas.map((fila, filaIdx) => (
              <div key={`fila-${filaIdx}`}>
                <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Fila {filaIdx + 1} · fotos {filaIdx * columnas + 1}–{filaIdx * columnas + fila.length}
                </p>
                <div className={`${puertosPhotoGridFrame} grid ${gridClass}`}>
                  {fila.map((img, colIdx) => {
                    const orden = filaIdx * columnas + colIdx + 1;
                    const displayUrl = getPuertosImagenDisplayUrl(img);
                    return (
                      <div key={img.id} className={puertosPhotoCell}>
                        <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
                          <span className="absolute left-2 top-2 z-10 rounded bg-fenix-primario px-2 py-0.5 font-body text-xs font-bold text-white">
                            {orden}
                          </span>
                          {displayUrl ? (
                            <img
                              src={displayUrl}
                              alt={img.descripcion || img.nombre || `Foto ${orden}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <FaImage className="text-3xl text-gray-400" />
                            </div>
                          )}
                          {!soloLectura && (
                          <div className="absolute right-2 top-2 flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => moverImagen(img.id, -1)}
                              className="rounded bg-gray-900/85 p-1 text-xs text-white hover:bg-gray-800"
                              title="Subir orden"
                            >
                              <FaArrowUp />
                            </button>
                            <button
                              type="button"
                              onClick={() => moverImagen(img.id, 1)}
                              className="rounded bg-gray-900/85 p-1 text-xs text-white hover:bg-gray-800"
                              title="Bajar orden"
                            >
                              <FaArrowDown />
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarImagen(img.id)}
                              className="rounded bg-fenix-primario p-1 text-xs text-white hover:bg-red-700"
                              title="Eliminar"
                            >
                              <FaTrash />
                            </button>
                          </div>
                          )}
                        </div>
                        <div className={puertosPhotoCaption}>
                          {soloLectura ? (
                            <p className="px-2 py-1 text-center font-body text-xs text-gray-600 dark:text-gray-300">
                              {img.descripcion || img.nombre || `Foto ${orden}`}
                            </p>
                          ) : (
                          <input
                            type="text"
                            list={datalistId}
                            className={puertosPhotoCaptionInput}
                            placeholder={`Descripción foto ${orden}`}
                            value={img.descripcion || ''}
                            onChange={(e) => actualizarDescripcion(img.id, e.target.value)}
                          />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {descripcionesSugeridas.length > 0 && (
          <datalist id={datalistId}>
            {descripcionesSugeridas.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        )}
      </div>
    </section>
  );
}
