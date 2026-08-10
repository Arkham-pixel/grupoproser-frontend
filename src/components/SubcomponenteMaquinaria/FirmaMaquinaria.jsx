import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileSignature, FaPen, FaUpload } from 'react-icons/fa';
import Logo from '../../img/Logo.png';
import FuncionarioService from '../../services/funcionarioService.js';
import { FieldLabel, ThemedInput, useMaquinariaTheme } from './maquinariaUi';

function FirmaClienteModal({ open, onClose, onSave, theme }) {
  const { t } = useTranslation();
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
        <h3 className="text-lg font-bold mb-2" style={{ color: text }}>{t('machinery.ui.firma.modalTitle')}</h3>
        <p className="text-sm mb-4" style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
          {t('machinery.ui.firma.modalHint')}
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
          <button type="button" onClick={onClose} className="btn-fenix-secondary text-sm py-2 px-3">{t('machinery.ui.common.cancel')}</button>
          <button type="button" onClick={initCanvas} className="btn-fenix-secondary text-sm py-2 px-3">{t('machinery.ui.common.clear')}</button>
          <button
            type="button"
            onClick={() => {
              const dataUrl = canvasRef.current?.toDataURL('image/png');
              if (dataUrl) onSave(dataUrl);
              onClose();
            }}
            className="btn-fenix-primary text-sm py-2 px-3"
          >
            {t('machinery.ui.firma.useSignature')}
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
  const { t } = useTranslation();
  const mq = useMaquinariaTheme();
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
        setErrorFuncionarios(t('machinery.ui.firma.noFuncionarios'));
      }
    } catch {
      const local = FuncionarioService.normalizarListaFuncionarios(
        FuncionarioService.cargarDesdeLocalStorage()
      );
      setFuncionarios(local);
      setErrorFuncionarios(local.length ? t('machinery.ui.firma.loadedLocal') : t('machinery.ui.firma.loadError'));
    } finally {
      setCargandoFuncionarios(false);
    }
  }, [t]);

  useEffect(() => {
    cargarFuncionarios();
  }, [cargarFuncionarios]);

  const aplicarFuncionario = useCallback(async (funcionarioId) => {
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
  }, [funcionarios, setInspectorFirmaImagen, setInspectorFuncionarioId]);

  useEffect(() => {
    if (!inspectorNombre?.trim() || inspectorFuncionarioId || !funcionarios.length) return;
    const match = funcionarios.find(
      (f) => String(f.nombre || '').trim().toLowerCase() === inspectorNombre.trim().toLowerCase()
    );
    if (match) void aplicarFuncionario(idFunc(match));
  }, [inspectorNombre, funcionarios, inspectorFuncionarioId, aplicarFuncionario]);

  const handleUploadCliente = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type)) {
      alert(t('machinery.ui.firma.invalidImage'));
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setFirmaCliente(ev.target?.result || '');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const panelStyle = {
    borderColor: mq.borderColor,
    backgroundColor: mq.theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
  };

  return (
    <div className="text-sm">
      <FirmaClienteModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={setFirmaCliente}
        theme={mq.theme}
      />

      <div className="flex items-center gap-2 mb-3">
        <FaFileSignature style={{ color: '#DC2626' }} />
        <p className="font-semibold" style={{ color: mq.textPrimary }}>{t('machinery.ui.firma.sectionTitle')}</p>
      </div>
      <p className="mb-4 text-sm leading-relaxed" style={{ color: mq.textSecondary }}>
        {t('machinery.ui.firma.sectionHint')}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border-2 p-4" style={panelStyle}>
          <h3 className="font-bold text-center mb-4" style={{ color: mq.textPrimary }}>{t('machinery.ui.firma.clientTitle')}</h3>
          <FieldLabel>{t('machinery.ui.firma.clientName')}</FieldLabel>
          <ThemedInput
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
            placeholder={t('machinery.ui.firma.clientNamePlaceholder')}
            disabled={disabled}
            className="mb-3"
          />
          <FieldLabel>{t('machinery.ui.firma.clientRole')}</FieldLabel>
          <ThemedInput
            value={clienteCargo}
            onChange={(e) => setClienteCargo(e.target.value)}
            placeholder={t('machinery.ui.firma.clientRolePlaceholder')}
            disabled={disabled}
            className="mb-3"
          />
          <FieldLabel>{t('machinery.ui.firma.clientEmail')}</FieldLabel>
          <ThemedInput
            type="email"
            value={clienteEmail}
            onChange={(e) => setClienteEmail(e.target.value)}
            placeholder={t('machinery.ui.firma.clientEmailPlaceholder')}
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
              <FaPen /> {t('machinery.ui.firma.draw')}
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
              <FaUpload /> {t('machinery.ui.firma.upload')}
            </label>
            {firmaCliente && (
              <button type="button" onClick={() => setFirmaCliente('')} className="btn-fenix-secondary text-xs py-2 px-3" disabled={disabled}>
                {t('machinery.ui.common.remove')}
              </button>
            )}
          </div>
          <div
            className="min-h-[120px] rounded-lg border-2 flex items-center justify-center p-3"
            style={{ borderColor: mq.borderColor, backgroundColor: mq.tableHeaderBg }}
          >
            {firmaCliente ? (
              <img src={firmaCliente} alt={t('machinery.ui.firma.clientAlt')} className="max-h-28 object-contain" />
            ) : (
              <span className="text-xs text-center" style={{ color: mq.textSecondary }}>
                {t('machinery.ui.firma.noClientSignature')}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border-2 p-4" style={panelStyle}>
          <h3 className="font-bold text-center mb-4" style={{ color: mq.textPrimary }}>{t('machinery.ui.firma.inspectorTitle')}</h3>
          <p className="text-xs mb-3" style={{ color: mq.textSecondary }}>
            {t('machinery.ui.firma.inspectorInTable')}{' '}
            <strong style={{ color: mq.textPrimary }}>{inspectorNombre || t('machinery.ui.common.dash')}</strong>
            {inspectorCargo ? ` · ${inspectorCargo}` : ''}
          </p>
          <FieldLabel>{t('machinery.ui.firma.funcionarioLabel')}</FieldLabel>
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <button type="button" onClick={() => void cargarFuncionarios()} className="btn-fenix-secondary text-xs py-1 px-2">
              {t('machinery.ui.firma.reloadList')}
            </button>
            <span className="text-xs" style={{ color: mq.textSecondary }}>
              {t('machinery.ui.firma.funcionariosCount', { count: funcionarios.length })}
            </span>
          </div>
          {errorFuncionarios && (
            <p className="text-xs mb-2 p-2 rounded border" style={{ borderColor: mq.borderColor, color: mq.textSecondary }}>
              {errorFuncionarios}
            </p>
          )}
          <select
            value={inspectorFuncionarioId || ''}
            onChange={(e) => void aplicarFuncionario(e.target.value)}
            disabled={disabled || cargandoFuncionarios}
            className="w-full px-3 py-2 text-sm rounded-md mb-3"
            style={{
              backgroundColor: mq.inputBg,
              color: mq.textPrimary,
              border: `1px solid ${mq.borderColor}`,
            }}
          >
            <option value="">{t('machinery.ui.firma.selectInspector')}</option>
            {funcionarios.map((f) => {
              const fid = idFunc(f);
              if (!fid) return null;
              return (
                <option key={fid} value={fid}>
                  {f.nombre || t('machinery.ui.firma.noName')}
                  {!f.firma ? t('machinery.ui.firma.firmaOnSelect') : ''}
                </option>
              );
            })}
          </select>
          <div
            className="min-h-[120px] rounded-lg border-2 flex items-center justify-center p-3"
            style={{ borderColor: mq.borderColor, backgroundColor: mq.tableHeaderBg }}
          >
            {inspectorFirmaImagen ? (
              <img src={inspectorFirmaImagen} alt={t('machinery.ui.firma.inspectorAlt')} className="max-h-28 object-contain" />
            ) : (
              <span className="text-xs text-center" style={{ color: mq.textSecondary }}>
                {t('machinery.ui.firma.pickFuncionario')}
              </span>
            )}
          </div>
          <p className="mt-3 text-xs" style={{ color: mq.textSecondary }}>
            {t('machinery.ui.firma.reportDate', { fecha: fecha || t('machinery.ui.common.dash') })}
          </p>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t flex items-center gap-3" style={{ borderColor: mq.borderColor }}>
        <img src={Logo} alt="PROSER" className="h-10 object-contain" />
        <span className="text-xs" style={{ color: mq.textSecondary }}>{t('machinery.ui.firma.closing')}</span>
      </div>
    </div>
  );
}
