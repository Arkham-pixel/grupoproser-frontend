import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaFileSignature, FaPen, FaUpload } from 'react-icons/fa';
import Logo from '../../img/Logo.png';
import FuncionarioService from '../../services/funcionarioService.js';
import { FieldLabel, ThemedInput, useMaquinariaTheme } from './maquinariaUi';

function FirmaClienteModal({ open, onClose, onSave, theme }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = 560;
    const h = 200;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = theme === 'dark' ? '#e2e8f0' : '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [theme]);

  useEffect(() => {
    if (open) initCanvas();
  }, [open, initCanvas]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / r.width;
    const scaleY = canvas.height / r.height;
    return { x: (clientX - r.left) * scaleX, y: (clientY - r.top) * scaleY };
  };

  const startDraw = (e) => {
    if (e.cancelable) e.preventDefault();
    drawing.current = true;
    last.current = getPos(e);
  };

  const moveDraw = (e) => {
    if (!drawing.current) return;
    if (e.cancelable) e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const endDraw = () => {
    drawing.current = false;
  };

  useEffect(() => {
    if (!open) return;
    const up = () => { drawing.current = false; };
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  }, [open]);

  if (!open) return null;

  const overlayBg = theme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(15,23,42,0.45)';
  const panelBg = theme === 'dark' ? '#1e293b' : '#ffffff';
  const border = theme === 'dark' ? '#334155' : '#e2e8f0';
  const text = theme === 'dark' ? '#f1f5f9' : '#0f172a';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: overlayBg }}
      onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl p-5 sm:p-6"
        style={{ backgroundColor: panelBg, border: `2px solid ${border}` }}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="text-lg font-bold mb-2" style={{ color: text }}>Firma del cliente</h3>
        <p className="text-sm mb-4" style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
          Dibuje en el recuadro con el dedo o el ratón.
        </p>
        <div className="rounded-lg overflow-hidden border-2 mb-4 touch-none" style={{ borderColor: border }}>
          <canvas
            ref={canvasRef}
            className="w-full h-[200px] cursor-crosshair block bg-white"
            onMouseDown={startDraw}
            onMouseMove={moveDraw}
            onMouseLeave={endDraw}
            onMouseUp={endDraw}
            onTouchStart={startDraw}
            onTouchMove={moveDraw}
            onTouchEnd={endDraw}
          />
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-fenix-secondary text-sm py-2 px-3">Cancelar</button>
          <button type="button" onClick={initCanvas} className="btn-fenix-secondary text-sm py-2 px-3">Limpiar</button>
          <button
            type="button"
            onClick={() => {
              const dataUrl = canvasRef.current?.toDataURL('image/png');
              if (dataUrl) onSave(dataUrl);
              onClose();
            }}
            className="btn-fenix-primary text-sm py-2 px-3"
          >
            Usar esta firma
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FirmaMaquinaria({
  clienteNombre,
  setClienteNombre,
  clienteCargo,
  setClienteCargo,
  clienteEmail,
  setClienteEmail,
  firmaCliente,
  setFirmaCliente,
  inspectorNombre,
  inspectorCargo,
  inspectorFuncionarioId,
  setInspectorFuncionarioId,
  inspectorFirmaImagen,
  setInspectorFirmaImagen,
  fecha,
  disabled = false,
}) {
  const t = useMaquinariaTheme();
  const [modalAbierto, setModalAbierto] = useState(false);
  const inputFirmaRef = useRef(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [cargandoFuncionarios, setCargandoFuncionarios] = useState(true);
  const [errorFuncionarios, setErrorFuncionarios] = useState(null);

  const idFunc = (f) => (f?._id != null ? String(f._id) : f?.id != null ? String(f.id) : '');

  const cargarFuncionarios = useCallback(async () => {
    setCargandoFuncionarios(true);
    setErrorFuncionarios(null);
    try {
      const lista = await FuncionarioService.obtenerFuncionarios();
      const arr = Array.isArray(lista) ? lista : [];
      setFuncionarios(arr);
      if (arr.length === 0) {
        setErrorFuncionarios('No hay funcionarios con firmas en el sistema.');
      }
    } catch {
      const local = FuncionarioService.normalizarListaFuncionarios(
        FuncionarioService.cargarDesdeLocalStorage()
      );
      setFuncionarios(local);
      setErrorFuncionarios(local.length ? 'Lista cargada desde el navegador.' : 'No se pudo cargar funcionarios.');
    } finally {
      setCargandoFuncionarios(false);
    }
  }, []);

  useEffect(() => {
    cargarFuncionarios();
  }, [cargarFuncionarios]);

  const aplicarFuncionario = async (funcionarioId) => {
    const id = String(funcionarioId || '').trim();
    if (!id) {
      setInspectorFuncionarioId('');
      setInspectorFirmaImagen('');
      return;
    }
    let f = funcionarios.find((x) => idFunc(x) === id);
    if (!f) return;
    if (!f.firma) {
      const det = await FuncionarioService.obtenerFuncionarioPorId(id);
      if (det) f = { ...f, ...det };
    }
    setInspectorFuncionarioId(id);
    setInspectorFirmaImagen(f.firma || '');
  };

  useEffect(() => {
    if (!inspectorNombre?.trim() || inspectorFuncionarioId || !funcionarios.length) return;
    const match = funcionarios.find(
      (f) => String(f.nombre || '').trim().toLowerCase() === inspectorNombre.trim().toLowerCase()
    );
    if (match) void aplicarFuncionario(idFunc(match));
  }, [inspectorNombre, funcionarios, inspectorFuncionarioId]);

  const handleUploadCliente = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type)) {
      alert('Seleccione una imagen válida (PNG, JPG o WEBP).');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setFirmaCliente(ev.target?.result || '');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const panelStyle = {
    borderColor: t.borderColor,
    backgroundColor: t.theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
  };

  return (
    <div className="text-sm">
      <FirmaClienteModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={setFirmaCliente}
        theme={t.theme}
      />

      <div className="flex items-center gap-2 mb-3">
        <FaFileSignature style={{ color: '#DC2626' }} />
        <p className="font-semibold" style={{ color: t.textPrimary }}>Firmas del informe</p>
      </div>
      <p className="mb-4 text-sm leading-relaxed" style={{ color: t.textSecondary }}>
        El cliente firma aquí (dibujar o subir imagen). El inspector o responsable usa la firma guardada en el sistema,
        igual que en el acta de inspección.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border-2 p-4" style={panelStyle}>
          <h3 className="font-bold text-center mb-4" style={{ color: t.textPrimary }}>FIRMA DEL CLIENTE</h3>
          <FieldLabel>Nombre (como en el Word)</FieldLabel>
          <ThemedInput
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
            placeholder="Nombre de quien firma"
            disabled={disabled}
            className="mb-3"
          />
          <FieldLabel>Cargo</FieldLabel>
          <ThemedInput
            value={clienteCargo}
            onChange={(e) => setClienteCargo(e.target.value)}
            placeholder="Ej. Asegurado, representante…"
            disabled={disabled}
            className="mb-3"
          />
          <FieldLabel>Correo (opcional)</FieldLabel>
          <ThemedInput
            type="email"
            value={clienteEmail}
            onChange={(e) => setClienteEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            disabled={disabled}
            className="mb-4"
          />
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              disabled={disabled}
              className="btn-fenix-primary text-xs py-2 px-3 inline-flex items-center gap-2"
            >
              <FaPen /> Dibujar firma
            </button>
            <input
              ref={inputFirmaRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleUploadCliente}
              className="hidden"
              id="mq-upload-firma-cliente"
            />
            <label
              htmlFor="mq-upload-firma-cliente"
              className="btn-fenix-secondary text-xs py-2 px-3 inline-flex items-center gap-2 cursor-pointer"
            >
              <FaUpload /> Subir imagen
            </label>
            {firmaCliente && (
              <button type="button" onClick={() => setFirmaCliente('')} className="btn-fenix-secondary text-xs py-2 px-3" disabled={disabled}>
                Quitar
              </button>
            )}
          </div>
          <div
            className="min-h-[120px] rounded-lg border-2 flex items-center justify-center p-3"
            style={{ borderColor: t.borderColor, backgroundColor: t.tableHeaderBg }}
          >
            {firmaCliente ? (
              <img src={firmaCliente} alt="Firma del cliente" className="max-h-28 object-contain" />
            ) : (
              <span className="text-xs text-center" style={{ color: t.textSecondary }}>
                Aún no hay firma del cliente.
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border-2 p-4" style={panelStyle}>
          <h3 className="font-bold text-center mb-4" style={{ color: t.textPrimary }}>FIRMA DEL INSPECTOR</h3>
          <p className="text-xs mb-3" style={{ color: t.textSecondary }}>
            Inspector en tabla §1: <strong style={{ color: t.textPrimary }}>{inspectorNombre || '—'}</strong>
            {inspectorCargo ? ` · ${inspectorCargo}` : ''}
          </p>
          <FieldLabel>Funcionario con firma guardada</FieldLabel>
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <button type="button" onClick={() => void cargarFuncionarios()} className="btn-fenix-secondary text-xs py-1 px-2">
              Recargar lista
            </button>
            <span className="text-xs" style={{ color: t.textSecondary }}>{funcionarios.length} funcionario(s)</span>
          </div>
          {errorFuncionarios && (
            <p className="text-xs mb-2 p-2 rounded border" style={{ borderColor: t.borderColor, color: t.textSecondary }}>
              {errorFuncionarios}
            </p>
          )}
          <select
            value={inspectorFuncionarioId || ''}
            onChange={(e) => void aplicarFuncionario(e.target.value)}
            disabled={disabled || cargandoFuncionarios}
            className="w-full px-3 py-2 text-sm rounded-md mb-3"
            style={{
              backgroundColor: t.inputBg,
              color: t.textPrimary,
              border: `1px solid ${t.borderColor}`,
            }}
          >
            <option value="">— Seleccione inspector / responsable —</option>
            {funcionarios.map((f) => {
              const fid = idFunc(f);
              if (!fid) return null;
              return (
                <option key={fid} value={fid}>
                  {f.nombre || 'Sin nombre'}
                  {!f.firma ? ' (firma al seleccionar)' : ''}
                </option>
              );
            })}
          </select>
          <div
            className="min-h-[120px] rounded-lg border-2 flex items-center justify-center p-3"
            style={{ borderColor: t.borderColor, backgroundColor: t.tableHeaderBg }}
          >
            {inspectorFirmaImagen ? (
              <img src={inspectorFirmaImagen} alt="Firma del inspector" className="max-h-28 object-contain" />
            ) : (
              <span className="text-xs text-center" style={{ color: t.textSecondary }}>
                Elija un funcionario con firma guardada en Gestión de funcionarios.
              </span>
            )}
          </div>
          <p className="mt-3 text-xs" style={{ color: t.textSecondary }}>
            Fecha del informe: {fecha || '—'}
          </p>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t flex items-center gap-3" style={{ borderColor: t.borderColor }}>
        <img src={Logo} alt="PROSER" className="h-10 object-contain" />
        <span className="text-xs" style={{ color: t.textSecondary }}>Atentamente, GRUPO PROSER</span>
      </div>
    </div>
  );
}
