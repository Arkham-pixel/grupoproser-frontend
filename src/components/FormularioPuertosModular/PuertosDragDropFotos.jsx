import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt, FaTrash, FaTimes, FaSearchPlus } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import {
  crearImagenPendiente,
  getPuertosImagenDisplayUrl,
} from '../PuertosActas/puertosCasoImagenUtils';

export default function PuertosDragDropFotos({
  imagenes = [],
  onChange,
  cargando = false,
  max = 15,
  placeholder = 'Arrastra imágenes aquí o haz clic para seleccionar',
  notaS3 = 'Se guardan en S3 al grabar el informe',
  mostrarContador = true,
  descripcionMultilinea = false,
}) {
  const { theme } = useTheme();
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';

  const aplicarCambio = useCallback(
    (updater) => {
      const actual = imagenes || [];
      const siguiente = typeof updater === 'function' ? updater(actual) : updater;
      onChange(siguiente);
    },
    [imagenes, onChange]
  );

  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles?.length) {
        alert('Algunas imágenes no se añadieron (tamaño o formato no válido). Máx. recomendado: 5 MB por foto.');
      }
      if (!acceptedFiles.length) return;
      const maxBytes = 5 * 1024 * 1024;
      const validas = acceptedFiles.filter((f) => {
        if (f.size > maxBytes) {
          alert(`"${f.name}" supera 5 MB. Comprímala o elija otra imagen.`);
          return false;
        }
        return true;
      });
      const disponibles = max - (imagenes?.length || 0);
      const nuevas = validas.slice(0, disponibles).map(crearImagenPendiente);
      if (validas.length > disponibles) {
        alert(`Solo se permiten ${max} fotos en este bloque.`);
      }
      if (nuevas.length) {
        aplicarCambio((prev) => [...prev, ...nuevas]);
      }
    },
    [aplicarCambio, imagenes?.length, max]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    multiple: true,
    maxSize: 5 * 1024 * 1024,
    disabled: cargando || (imagenes?.length || 0) >= max,
  });

  const eliminarImagen = (id) => {
    aplicarCambio((prev) => prev.filter((img) => img.id !== id));
  };

  const actualizarDescripcion = (id, descripcion) => {
    aplicarCambio((prev) => prev.map((img) => (img.id === id ? { ...img, descripcion } : img)));
  };

  const dropzoneStyle = {
    backgroundColor: isDragActive
      ? theme === 'dark' ? '#1F2937' : '#EFF6FF'
      : theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
    borderColor: isDragActive
      ? theme === 'dark' ? '#2563EB' : '#3B82F6'
      : borderColor,
  };

  return (
    <>
      {imagenAmpliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
          onClick={() => setImagenAmpliada(null)}
        >
          <button
            type="button"
            onClick={() => setImagenAmpliada(null)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors text-white"
          >
            <FaTimes size={24} />
          </button>
          <div className="max-w-7xl max-h-full overflow-auto" onClick={(e) => e.stopPropagation()}>
            <img
              src={getPuertosImagenDisplayUrl(imagenAmpliada)}
              alt={imagenAmpliada.descripcion || 'Vista ampliada'}
              className="max-w-full max-h-[90vh] object-contain rounded"
            />
            {imagenAmpliada.descripcion && (
              <p className="mt-4 text-center text-sm px-4 py-2 rounded text-white bg-black/70">
                {imagenAmpliada.descripcion}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {(imagenes?.length || 0) < max && (
          <div
            {...getRootProps()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-colors"
            style={dropzoneStyle}
          >
            <input {...getInputProps()} />
            <FaCloudUploadAlt
              className="mb-2 text-3xl"
              style={{ color: theme === 'dark' ? '#6B7280' : '#9CA3AF' }}
            />
            <span className="text-sm font-medium text-center" style={{ color: textPrimary }}>
              {isDragActive ? 'Suelta las imágenes aquí…' : placeholder}
            </span>
            <span className="mt-1 text-xs text-center" style={{ color: textSecondary }}>
              {imagenes?.length || 0} / {max} · {notaS3}
            </span>
          </div>
        )}

        {imagenes?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {imagenes.map((imagen) => {
              const displayUrl = getPuertosImagenDisplayUrl(imagen);
              return (
                <div
                  key={imagen.id}
                  className="rounded overflow-hidden"
                  style={{
                    border: `1px solid ${borderColor}`,
                    backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
                  }}
                >
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => displayUrl && setImagenAmpliada(imagen)}
                  >
                    {displayUrl ? (
                      <img
                        src={displayUrl}
                        alt={imagen.descripcion || imagen.nombre || 'Foto'}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-48 flex items-center justify-center text-xs"
                        style={{ color: textSecondary }}
                      >
                        Sin vista previa
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                      <FaSearchPlus
                        className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        size={32}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarImagen(imagen.id);
                      }}
                      className="absolute top-2 right-2 p-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                      disabled={cargando}
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                  <div className="p-3">
                    {imagen.nombre && (
                      <p className="text-xs mb-2 truncate" style={{ color: textSecondary }}>
                        {imagen.nombre}
                      </p>
                    )}
                    {descripcionMultilinea ? (
                      <textarea
                        value={imagen.descripcion || ''}
                        onChange={(e) => actualizarDescripcion(imagen.id, e.target.value)}
                        placeholder="Descripción de la imagen..."
                        rows={3}
                        className="w-full rounded px-2 py-1 text-sm"
                        style={{
                          backgroundColor: inputBg,
                          color: textPrimary,
                          border: `1px solid ${borderColor}`,
                        }}
                        disabled={cargando}
                      />
                    ) : (
                      <input
                        type="text"
                        value={imagen.descripcion || ''}
                        onChange={(e) => actualizarDescripcion(imagen.id, e.target.value)}
                        placeholder="Descripción de la imagen..."
                        className="w-full rounded px-2 py-1 text-sm"
                        style={{
                          backgroundColor: inputBg,
                          color: textPrimary,
                          border: `1px solid ${borderColor}`,
                        }}
                        disabled={cargando}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-center py-2" style={{ color: textSecondary }}>
            Aún no hay fotos en esta sección.
          </p>
        )}

        {mostrarContador && imagenes?.length > 0 && (
          <p className="text-sm text-right" style={{ color: textSecondary }}>
            Total: {imagenes.length} imagen(es)
          </p>
        )}
      </div>
    </>
  );
}
