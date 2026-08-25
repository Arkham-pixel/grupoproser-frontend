import React, { useCallback, useEffect, useRef, useState } from 'react';

/** Pad de firma: dibuja en local y solo guarda al confirmar (evita colgar la UI). */
export default function PadFirmaCliente({ value = '', onChange, label = 'Firma del cliente' }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const ctxRef = useRef(null);
  const dirtyRef = useRef(false);
  const [tieneTrazo, setTieneTrazo] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState(value || '');

  const prepararCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const w = 480;
    const h = 140;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctxRef.current = ctx;
    return ctx;
  }, []);

  useEffect(() => {
    prepararCanvas();
    if (!value) {
      setVistaPrevia('');
      setTieneTrazo(false);
      dirtyRef.current = false;
      return;
    }
    setVistaPrevia(value);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const ctx = prepararCanvas();
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      dirtyRef.current = false;
      setTieneTrazo(true);
    };
    img.src = value;
    // Solo al montar / si el padre trae firma ya guardada (no en cada trazo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    return {
      x: ((clientX - r.left) * canvas.width) / r.width,
      y: ((clientY - r.top) * canvas.height) / r.height,
    };
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    dirtyRef.current = true;
    last.current = getPos(e);
    if (!tieneTrazo) setTieneTrazo(true);
  };

  const onPointerMove = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = ctxRef.current || canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const onPointerUp = (e) => {
    if (!drawing.current) return;
    drawing.current = false;
    try {
      canvasRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ok */
    }
  };

  const confirmar = () => {
    const canvas = canvasRef.current;
    if (!canvas || !tieneTrazo) return;
    const data = canvas.toDataURL('image/jpeg', 0.72);
    dirtyRef.current = false;
    setVistaPrevia(data);
    onChange?.(data);
  };

  const limpiar = () => {
    prepararCanvas();
    dirtyRef.current = false;
    setTieneTrazo(false);
    setVistaPrevia('');
    onChange?.('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-body text-xs font-semibold uppercase text-gray-700 dark:text-gray-200">
          {label}
        </span>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="font-body text-xs font-semibold text-[#1F4E79] hover:underline dark:text-sky-300"
            onClick={limpiar}
          >
            Limpiar
          </button>
          <button
            type="button"
            className="rounded bg-[#1F4E79] px-3 py-1 font-body text-xs font-semibold text-white hover:bg-[#163a5c] disabled:opacity-40"
            onClick={confirmar}
            disabled={!tieneTrazo}
          >
            Guardar firma
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded border-2 border-dashed border-gray-300 bg-white touch-none dark:border-gray-600">
        <canvas
          ref={canvasRef}
          className="block h-[140px] w-full max-w-full cursor-crosshair touch-none"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <p className="font-body text-[11px] text-gray-500">
        Dibuje la firma y pulse «Guardar firma». Así no se congela la pantalla.
        {vistaPrevia ? ' · Firma guardada.' : ''}
      </p>
    </div>
  );
}
