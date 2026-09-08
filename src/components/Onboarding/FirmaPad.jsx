import React, { useEffect, useRef, useState } from 'react';

/**
 * Firma dibujada o subida (PNG/JPG), igual patrón que actas de inspección.
 */
export default function FirmaPad({ onChange, altura = 160 }) {
  const canvasRef = useRef(null);
  const dibujando = useRef(false);
  const [tieneTrazo, setTieneTrazo] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(altura * dpr);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, altura);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [altura]);

  const pos = (e) => {
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    const src = e.touches?.[0] || e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  const start = (e) => {
    e.preventDefault();
    dibujando.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e) => {
    if (!dibujando.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setTieneTrazo(true);
  };

  const end = () => {
    if (!dibujando.current) return;
    dibujando.current = false;
    emitir();
  };

  const emitir = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onChange?.(dataUrl);
  };

  const limpiar = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const r = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, r.width, altura);
    setTieneTrazo(false);
    onChange?.('');
  };

  const subirImagen = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const r = canvas.getBoundingClientRect();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, r.width, altura);
        const scale = Math.min(r.width / img.width, altura / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (r.width - w) / 2, (altura - h) / 2, w, h);
        setTieneTrazo(true);
        emitir();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="w-full border border-gray-300 rounded bg-white touch-none cursor-crosshair"
        style={{ height: altura }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={limpiar}
          className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-50"
        >
          Limpiar
        </button>
        <label className="px-3 py-1.5 text-xs rounded border border-gray-300 hover:bg-gray-50 cursor-pointer">
          Subir firma
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={subirImagen} />
        </label>
        {!tieneTrazo && (
          <span className="text-xs text-gray-500">Dibuje o suba una imagen de su firma</span>
        )}
      </div>
    </div>
  );
}
