import React, { useCallback, useEffect, useRef, useState } from 'react';
import { calcularEscalaBase, generarBlobFotoPerfil } from '../../utils/fotoPerfilUtils.js';

const VIEWPORT = 280;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export default function RecortarFotoPerfilModal({
  open,
  imageSrc,
  isDark,
  onClose,
  onConfirm,
  subiendo = false,
}) {
  const imgRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgReady, setImgReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setImgReady(false);
    setError('');
  }, [open, imageSrc]);

  const handleImageLoad = () => {
    setImgReady(true);
    setError('');
  };

  const handleImageError = () => {
    setImgReady(false);
    setError('No se pudo cargar la imagen. Intenta seleccionar otra.');
  };

  const iniciarArrastre = (clientX, clientY) => {
    dragRef.current = {
      active: true,
      startX: clientX,
      startY: clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  const moverArrastre = useCallback((clientX, clientY) => {
    if (!dragRef.current.active) return;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    setOffset({
      x: dragRef.current.originX + dx,
      y: dragRef.current.originY + dy,
    });
  }, []);

  const finalizarArrastre = () => {
    dragRef.current.active = false;
  };

  useEffect(() => {
    if (!open) return undefined;

    const onMouseMove = (e) => moverArrastre(e.clientX, e.clientY);
    const onMouseUp = () => finalizarArrastre();
    const onTouchMove = (e) => {
      if (e.touches[0]) moverArrastre(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [open, moverArrastre]);

  const imagenTransform = () => {
    const img = imgRef.current;
    if (!img?.naturalWidth) return {};
    const baseScale = calcularEscalaBase(img.naturalWidth, img.naturalHeight, VIEWPORT);
    const displayScale = baseScale * zoom;
    const dw = img.naturalWidth * displayScale;
    const dh = img.naturalHeight * displayScale;
    const left = VIEWPORT / 2 - dw / 2 + offset.x;
    const top = VIEWPORT / 2 - dh / 2 + offset.y;
    return {
      width: `${dw}px`,
      height: `${dh}px`,
      left: `${left}px`,
      top: `${top}px`,
    };
  };

  const handleGuardar = async () => {
    const img = imgRef.current;
    if (!img?.naturalWidth) return;
    try {
      const blob = await generarBlobFotoPerfil(img, {
        viewportSize: VIEWPORT,
        zoom,
        offsetX: offset.x,
        offsetY: offset.y,
      });
      await onConfirm(blob);
    } catch (err) {
      setError(err.message || 'No se pudo procesar la foto');
    }
  };

  if (!open || !imageSrc) return null;

  const styleImg = imagenTransform();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl ${
          isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
        }`}
      >
        <div className={`border-b px-5 py-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            Acomodar foto de perfil
          </h3>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Arrastra para centrar tu rostro y usa el zoom para ajustar el encuadre.
          </p>
        </div>

        <div className="px-5 py-5">
          <div
            className={`relative mx-auto overflow-hidden rounded-full border-4 shadow-inner ${
              isDark ? 'border-blue-700 bg-gray-800' : 'border-blue-200 bg-gray-100'
            }`}
            style={{ width: VIEWPORT, height: VIEWPORT, cursor: imgReady ? 'grab' : 'default' }}
            onMouseDown={(e) => imgReady && iniciarArrastre(e.clientX, e.clientY)}
            onTouchStart={(e) => {
              if (!imgReady || !e.touches[0]) return;
              iniciarArrastre(e.touches[0].clientX, e.touches[0].clientY);
            }}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Ajustar foto"
              crossOrigin="anonymous"
              draggable={false}
              onLoad={handleImageLoad}
              onError={handleImageError}
              className="absolute select-none"
              style={styleImg}
            />
          </div>

          <div className="mt-5">
            <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Zoom
            </label>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          {error && (
            <p className={`mt-3 text-sm ${isDark ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
          )}
        </div>

        <div
          className={`flex flex-wrap justify-end gap-2 border-t px-5 py-4 ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={subiendo}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              isDark
                ? 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={!imgReady || subiendo}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {subiendo ? 'Guardando…' : 'Guardar foto'}
          </button>
        </div>
      </div>
    </div>
  );
}
