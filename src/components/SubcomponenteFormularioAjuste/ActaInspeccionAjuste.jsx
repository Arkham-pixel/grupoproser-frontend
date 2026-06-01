import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  FaUser,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaIdCard,
  FaExclamationTriangle,
  FaFileAlt,
  FaFileSignature,
  FaPen,
  FaUpload
} from 'react-icons/fa';
import Logo from '../../img/Logo.png';
import FuncionarioService from '../../services/funcionarioService.js';

/** Modal para que el cliente dibuje la firma (ratón o dedo) y guardarla como PNG base64 */
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
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
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
    const up = () => {
      drawing.current = false;
    };
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  }, [open]);

  const limpiar = () => initCanvas();

  const guardar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
      onClose();
    } catch {
      onClose();
    }
  };

  if (!open) return null;

  const overlayBg = theme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(15,23,42,0.45)';
  const panelBg = theme === 'dark' ? '#1e293b' : '#ffffff';
  const border = theme === 'dark' ? '#334155' : '#e2e8f0';
  const text = theme === 'dark' ? '#f1f5f9' : '#0f172a';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: overlayBg }}
      role="presentation"
      onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl p-5 sm:p-6"
        style={{ backgroundColor: panelBg, border: `2px solid ${border}` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="firma-cliente-titulo"
      >
        <h3 id="firma-cliente-titulo" className="text-lg font-bold mb-2" style={{ color: text }}>
          Firma del cliente
        </h3>
        <p className="text-sm mb-4" style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
          Dibuje en el recuadro con el dedo o el ratón. Puede borrar y volver a intentar.
        </p>
        <div
          className="rounded-lg overflow-hidden border-2 mb-4 touch-none"
          style={{ borderColor: border, backgroundColor: '#fff' }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-[200px] cursor-crosshair block"
            style={{ maxHeight: 200 }}
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
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border-2"
            style={{ borderColor: border, color: text }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={limpiar}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: theme === 'dark' ? '#334155' : '#f1f5f9', color: text }}
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={guardar}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: theme === 'dark' ? '#2563eb' : '#1d4ed8' }}
          >
            Usar esta firma
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActaInspeccionAjuste({ formData, onInputChange }) {
  const { theme } = useTheme();
  const [modalFirmaAbierto, setModalFirmaAbierto] = useState(false);
  const inputFirmaClienteRef = useRef(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [cargandoFuncionarios, setCargandoFuncionarios] = useState(true);
  const [errorListaFuncionarios, setErrorListaFuncionarios] = useState(null);

  const idFunc = (f) =>
    f?._id != null ? String(f._id) : f?.id != null ? String(f.id) : '';

  const cargarListaFuncionarios = useCallback(async () => {
    setCargandoFuncionarios(true);
    setErrorListaFuncionarios(null);
    try {
      const lista = await FuncionarioService.obtenerFuncionarios();
      const arr = Array.isArray(lista) ? lista : [];
      setFuncionarios(arr);
      if (arr.length === 0) {
        setErrorListaFuncionarios(
          'No hay funcionarios en la lista. Compruebe sesión, conexión, o cree funcionarios en el paso Firmas / gestión.'
        );
      }
    } catch (e) {
      const raw = FuncionarioService.cargarDesdeLocalStorage();
      const norm = FuncionarioService.normalizarListaFuncionarios(raw);
      setFuncionarios(Array.isArray(norm) ? norm : []);
      setErrorListaFuncionarios(
        norm.length === 0
          ? 'No se pudo cargar funcionarios desde el servidor ni desde el navegador.'
          : 'Lista cargada solo desde el navegador (sin conexión al servidor).'
      );
    } finally {
      setCargandoFuncionarios(false);
    }
  }, []);

  useEffect(() => {
    cargarListaFuncionarios();
  }, [cargarListaFuncionarios]);

  const aplicarFuncionarioActa = async (funcionarioId) => {
    const id = String(funcionarioId || '').trim();
    if (!id) {
      onInputChange('actaAjustadorFuncionarioId', '');
      onInputChange('actaAjustadorNombre', '');
      onInputChange('actaAjustadorCargo', '');
      onInputChange('actaAjustadorEmail', '');
      onInputChange('actaAjustadorFirmaImagen', '');
      return;
    }
    let f = funcionarios.find((x) => idFunc(x) === id);
    if (!f) return;
    if (!f.firma) {
      const det = await FuncionarioService.obtenerFuncionarioPorId(id);
      if (det) f = { ...f, ...det };
    }
    onInputChange('actaAjustadorFuncionarioId', id);
    onInputChange('actaAjustadorNombre', f.nombre || '');
    onInputChange('actaAjustadorCargo', f.cargo || '');
    onInputChange('actaAjustadorEmail', f.email || '');
    onInputChange('actaAjustadorFirmaImagen', f.firma || '');
  };

  const copiarFirmaDesdePasoFirmasInforme = () => {
    const img = formData.firmaFuncionario || '';
    const nom = formData.funcionarioFirma || '';
    let match = img ? funcionarios.find((f) => f.firma && f.firma === img) : null;
    if (!match && nom) {
      const candidatos = funcionarios.filter(
        (f) => String(f.nombre || '').trim() === String(nom).trim()
      );
      if (candidatos.length === 1) match = candidatos[0];
    }
    const mid = match ? idFunc(match) : '';
    if (mid) {
      void aplicarFuncionarioActa(mid);
      return;
    }
    onInputChange('actaAjustadorFuncionarioId', '');
    onInputChange('actaAjustadorNombre', nom);
    onInputChange('actaAjustadorCargo', formData.cargoFuncionario || '');
    onInputChange('actaAjustadorEmail', formData.emailFuncionario || '');
    onInputChange('actaAjustadorFirmaImagen', img);
  };

  const handleClienteFirmaUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type)) {
      alert('Seleccione una imagen válida (PNG, JPG o WEBP).');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        onInputChange('actaClienteFirma', ev.target.result);
      }
    };
    reader.onerror = () => {
      alert('No se pudo leer la imagen. Intente de nuevo.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  return (
    <div className="w-full max-w-[min(100%,1600px)] mx-auto pb-8">
      <FirmaClienteModal
        open={modalFirmaAbierto}
        onClose={() => setModalFirmaAbierto(false)}
        onSave={(dataUrl) => onInputChange('actaClienteFirma', dataUrl)}
        theme={theme}
      />

      <div
        className="mb-6 sm:mb-8 p-5 sm:p-7 rounded-xl shadow-lg"
        style={{
          background: theme === 'dark'
            ? 'linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%)'
            : 'linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)',
          border: `2px solid ${theme === 'dark' ? '#DC2626' : '#DC2626'}`,
          borderLeftWidth: '6px'
        }}
      >
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex-shrink-0">
            <img src={Logo} alt="GRUPO PROSER" className="h-16 sm:h-20 object-contain" />
          </div>
          <div className="flex-1 text-center lg:text-right">
            <h1
              className="text-2xl sm:text-4xl font-bold mb-1"
              style={{
                color: theme === 'dark' ? '#FFFFFF' : '#DC2626',
                textShadow: theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
              }}
            >
              ACTA DE INSPECCIÓN
            </h1>
            <p className="text-sm sm:text-base" style={{ color: textSecondary }}>
              Paso 1 del informe de ajuste · Los datos se guardan con el formulario de ajuste
            </p>
          </div>
        </div>
      </div>

      <div
        className="mb-6 p-5 sm:p-7 rounded-xl shadow-lg"
        style={{
          backgroundColor: cardBg,
          border: `2px solid ${borderColor}`,
          borderLeftWidth: '5px',
          borderLeftColor: theme === 'dark' ? '#3B82F6' : '#2563EB'
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.1)' }}
          >
            <FaUser className="text-xl" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: textPrimary }}>
            DATOS PERSONALES
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: textPrimary }}>
              <FaCalendarAlt className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
              FECHA INSPECCIÓN *
            </label>
            <input
              type="date"
              value={formData.fechaInspeccion || ''}
              onChange={(e) => onInputChange('fechaInspeccion', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none"
              style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: textPrimary }}>
              <FaCalendarAlt className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
              HORA INSPECCIÓN
            </label>
            <input
              type="time"
              value={formData.horaInspeccion || ''}
              onChange={(e) => onInputChange('horaInspeccion', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none"
              style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: textPrimary }}>
              <FaMapMarkerAlt className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
              CIUDAD *
            </label>
            <input
              type="text"
              value={formData.ciudad || ''}
              onChange={(e) => onInputChange('ciudad', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none"
              style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: textPrimary }}>
              <FaMapMarkerAlt className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
              DIRECCIÓN DEL RIESGO *
            </label>
            <input
              type="text"
              value={formData.direccionRiesgo || ''}
              onChange={(e) => onInputChange('direccionRiesgo', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none"
              style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: textPrimary }}>
              <FaExclamationTriangle className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
              TIPO DE RIESGO (ACTA)
            </label>
            <input
              type="text"
              value={formData.tipoRiesgoActa || ''}
              onChange={(e) => onInputChange('tipoRiesgoActa', e.target.value)}
              placeholder="Ej. Incendio, Daños por agua…"
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none"
              style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: textPrimary }}>
              <FaUser className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
              ASEGURADO *
            </label>
            <input
              type="text"
              value={formData.asegurado || ''}
              onChange={(e) => onInputChange('asegurado', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none"
              style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: textPrimary }}>
              <FaIdCard className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
              IDENTIFICACIÓN (ACTA)
            </label>
            <input
              type="text"
              value={formData.identificacionActa || ''}
              onChange={(e) => onInputChange('identificacionActa', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none"
              style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: textPrimary }}>
              <FaFileAlt className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
              No. SINIESTRO
            </label>
            <input
              type="text"
              value={formData.numeroSiniestro || ''}
              onChange={(e) => onInputChange('numeroSiniestro', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none"
              style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold" style={{ color: textPrimary }}>
              <FaCalendarAlt className="text-xs" style={{ color: theme === 'dark' ? '#60A5FA' : '#2563EB' }} />
              FECHA SINIESTRO
            </label>
            <input
              type="date"
              value={formData.fechaSiniestro || ''}
              onChange={(e) => onInputChange('fechaSiniestro', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none"
              style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
            />
          </div>
        </div>
      </div>

      <div
        className="mb-6 p-5 sm:p-7 rounded-xl shadow-lg"
        style={{
          backgroundColor: cardBg,
          border: `2px solid ${borderColor}`,
          borderLeftWidth: '5px',
          borderLeftColor: theme === 'dark' ? '#10B981' : '#059669'
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <FaExclamationTriangle className="text-xl" style={{ color: theme === 'dark' ? '#34D399' : '#059669' }} />
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: textPrimary }}>
            DESCRIPCIÓN DE RIESGO
          </h2>
        </div>
        <p className="text-sm mb-3" style={{ color: textSecondary }}>
          En el informe preliminar va en la sección «Descripción de riesgo» (mismo orden que en el acta).
        </p>
        <textarea
          value={formData.descripcionRiesgo || ''}
          onChange={(e) => onInputChange('descripcionRiesgo', e.target.value)}
          placeholder="Características del riesgo, construcción, materiales, etc."
          rows={7}
          className="w-full px-4 py-3 rounded-lg border-2 resize-y focus:outline-none"
          style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
        />
      </div>

      <div
        className="mb-6 p-5 sm:p-7 rounded-xl shadow-lg"
        style={{
          backgroundColor: cardBg,
          border: `2px solid ${borderColor}`,
          borderLeftWidth: '5px',
          borderLeftColor: theme === 'dark' ? '#F59E0B' : '#D97706'
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <FaExclamationTriangle className="text-xl" style={{ color: theme === 'dark' ? '#FBBF24' : '#D97706' }} />
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: textPrimary }}>
            DESCRIPCIÓN DEL SINIESTRO
          </h2>
        </div>
        <p className="text-sm mb-4" style={{ color: textSecondary }}>
          En el informe preliminar este texto va en la sección «Circunstancias del siniestro» (mismo orden: después de descripción de riesgo y antes de observaciones).
        </p>
        <textarea
          value={formData.descripcionSiniestro || ''}
          onChange={(e) => onInputChange('descripcionSiniestro', e.target.value)}
          placeholder="Hechos, daños observados, circunstancias relevantes"
          rows={7}
          className="w-full px-4 py-3 rounded-lg border-2 resize-y focus:outline-none"
          style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
        />
      </div>

      <div
        className="mb-6 p-5 sm:p-7 rounded-xl shadow-lg"
        style={{
          backgroundColor: cardBg,
          border: `2px solid ${borderColor}`,
          borderLeftWidth: '5px',
          borderLeftColor: theme === 'dark' ? '#8B5CF6' : '#7C3AED'
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <FaFileAlt className="text-xl" style={{ color: theme === 'dark' ? '#A78BFA' : '#7C3AED' }} />
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: textPrimary }}>
            OBSERVACIONES (ACTA)
          </h2>
        </div>
        <p className="text-sm mb-3" style={{ color: textSecondary }}>
          En el informe preliminar va en la sección «Observaciones» (después de circunstancias).
        </p>
        <textarea
          value={formData.actaObservaciones || ''}
          onChange={(e) => onInputChange('actaObservaciones', e.target.value)}
          placeholder="Observaciones del acta de inspección"
          rows={6}
          className="w-full px-4 py-3 rounded-lg border-2 resize-y focus:outline-none"
          style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
        />
      </div>

      <div
        className="mb-6 p-5 sm:p-7 rounded-xl shadow-lg"
        style={{
          backgroundColor: cardBg,
          border: `2px solid ${borderColor}`,
          borderLeftWidth: '5px',
          borderLeftColor: theme === 'dark' ? '#EC4899' : '#DB2777'
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <FaFileSignature className="text-xl" style={{ color: theme === 'dark' ? '#F472B6' : '#DB2777' }} />
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: textPrimary }}>
            FIRMAS
          </h2>
        </div>
        <p className="text-sm mb-6" style={{ color: textSecondary }}>
          Cliente a la izquierda: nombre, cargo y correo (se imprimen en el Word) y firma dibujada o imagen subida
          (PNG/JPG). Ajustador a la derecha: elija el funcionario desde la misma base de firmas del sistema; es
          independiente del paso <strong>Firmas</strong> del informe. Opcionalmente puede copiar lo configurado allí con
          el botón inferior.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div
            className="p-5 rounded-xl border-2"
            style={{ borderColor, backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
          >
            <h3 className="font-bold text-center mb-4" style={{ color: textPrimary }}>
              FIRMA DE CLIENTE
            </h3>
            <label className="block text-sm font-semibold mb-1" style={{ color: textPrimary }}>
              Nombre (como se imprimirá en el Word)
            </label>
            <input
              type="text"
              value={formData.actaClienteNombre || ''}
              onChange={(e) => onInputChange('actaClienteNombre', e.target.value)}
              placeholder="Nombre y apellido del titular o quien firma"
              className="w-full px-3 py-2.5 rounded-lg border-2 mb-3 focus:outline-none"
              style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
            />
            <label className="block text-sm font-semibold mb-1" style={{ color: textPrimary }}>
              Cargo del cliente (Word)
            </label>
            <input
              type="text"
              value={formData.actaClienteCargo || ''}
              onChange={(e) => onInputChange('actaClienteCargo', e.target.value)}
              placeholder="Ej. Titular, Apoderado, Administrador…"
              className="w-full px-3 py-2.5 rounded-lg border-2 mb-3 focus:outline-none"
              style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
            />
            <label className="block text-sm font-semibold mb-1" style={{ color: textPrimary }}>
              Correo del cliente (Word)
            </label>
            <input
              type="email"
              value={formData.actaClienteEmail || ''}
              onChange={(e) => onInputChange('actaClienteEmail', e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full px-3 py-2.5 rounded-lg border-2 mb-4 focus:outline-none"
              style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
            />
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => setModalFirmaAbierto(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: theme === 'dark' ? '#2563EB' : '#3B82F6' }}
              >
                <FaPen /> Dibujar firma
              </button>
              <input
                ref={inputFirmaClienteRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleClienteFirmaUpload}
                className="hidden"
                id="upload-firma-cliente-acta"
              />
              <label
                htmlFor="upload-firma-cliente-acta"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer border-2"
                style={{
                  borderColor: theme === 'dark' ? '#7C3AED' : '#8B5CF6',
                  backgroundColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.2)' : '#EDE9FE',
                  color: theme === 'dark' ? '#C4B5FD' : '#5B21B6'
                }}
              >
                <FaUpload /> Subir imagen
              </label>
              {formData.actaClienteFirma && (
                <button
                  type="button"
                  onClick={() => onInputChange('actaClienteFirma', '')}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium border-2"
                  style={{ borderColor, color: textPrimary }}
                >
                  Quitar firma
                </button>
              )}
            </div>
            <p className="text-xs mb-3" style={{ color: textSecondary }}>
              Puede dibujar la firma o subir una imagen (recomendado: PNG con fondo blanco o transparente).
            </p>
            <div
              className="min-h-[120px] rounded-lg border-2 flex items-center justify-center p-3"
              style={{ borderColor, backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc' }}
            >
              {formData.actaClienteFirma ? (
                <img
                  src={formData.actaClienteFirma}
                  alt="Firma del cliente"
                  className="max-h-28 object-contain"
                />
              ) : (
                <span className="text-sm text-center" style={{ color: textSecondary }}>
                  Aún no hay firma. Use «Dibujar firma» o «Subir imagen».
                </span>
              )}
            </div>
          </div>

          <div
            className="p-5 rounded-xl border-2"
            style={{ borderColor, backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
          >
            <h3 className="font-bold text-center mb-4" style={{ color: textPrimary }}>
              FIRMA DEL AJUSTADOR
            </h3>
            <label className="block text-sm font-semibold mb-1" style={{ color: textPrimary }}>
              Ajustador (misma base de funcionarios y firmas)
            </label>
            <div className="flex flex-wrap gap-2 items-center mb-2">
              <button
                type="button"
                onClick={() => void cargarListaFuncionarios()}
                className="text-xs px-3 py-1.5 rounded-lg border-2 font-medium"
                style={{ borderColor, color: textPrimary }}
              >
                Volver a cargar lista
              </button>
              <span className="text-xs" style={{ color: textSecondary }}>
                {funcionarios.length} funcionario(s)
              </span>
            </div>
            {errorListaFuncionarios && (
              <p
                className="text-xs mb-2 p-2 rounded-lg border"
                style={{
                  borderColor: theme === 'dark' ? '#854d0e' : '#fcd34d',
                  backgroundColor: theme === 'dark' ? 'rgba(113,63,18,0.35)' : '#fffbeb',
                  color: theme === 'dark' ? '#fde68a' : '#92400e'
                }}
              >
                {errorListaFuncionarios}
              </p>
            )}
            <select
              value={formData.actaAjustadorFuncionarioId || ''}
              onChange={(e) => void aplicarFuncionarioActa(e.target.value)}
              disabled={cargandoFuncionarios}
              className="w-full px-3 py-2.5 rounded-lg border-2 mb-2 focus:outline-none"
              style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
            >
              <option value="">— Seleccione ajustador —</option>
              {funcionarios.map((f) => {
                const fid = idFunc(f);
                if (!fid) return null;
                return (
                  <option key={fid} value={fid}>
                    {f.nombre || 'Sin nombre'}
                    {!f.firma ? ' (sin imagen en caché; se pedirá al servidor al elegir)' : ''}
                  </option>
                );
              })}
            </select>
            {cargandoFuncionarios && (
              <p className="text-xs mb-2" style={{ color: textSecondary }}>
                Cargando funcionarios…
              </p>
            )}
            {(() => {
              const sel = funcionarios.find((x) => idFunc(x) === String(formData.actaAjustadorFuncionarioId || ''));
              return sel && !formData.actaAjustadorFirmaImagen ? (
                <p className="text-xs mb-3 text-amber-600 dark:text-amber-400">
                  Este funcionario no tiene imagen de firma guardada. Créela o súbala en Gestión de funcionarios o en el
                  paso Firmas del informe.
                </p>
              ) : null;
            })()}
            <button
              type="button"
              onClick={copiarFirmaDesdePasoFirmasInforme}
              className="w-full mb-4 px-3 py-2 rounded-lg text-sm font-medium border-2"
              style={{ borderColor, color: textPrimary }}
            >
              Copiar desde el paso Firmas del informe (opcional)
            </button>
            <div className="space-y-2 text-sm mb-4" style={{ color: textPrimary }}>
              <p>
                <span className="font-semibold">Nombre:</span>{' '}
                {formData.actaAjustadorNombre ? (
                  formData.actaAjustadorNombre
                ) : (
                  <span style={{ color: textSecondary }}>— Elija ajustador o use el botón de copiar —</span>
                )}
              </p>
              <p>
                <span className="font-semibold">Cargo:</span>{' '}
                {formData.actaAjustadorCargo || <span style={{ color: textSecondary }}>—</span>}
              </p>
              <p>
                <span className="font-semibold">E-mail:</span>{' '}
                {formData.actaAjustadorEmail || <span style={{ color: textSecondary }}>—</span>}
              </p>
            </div>
            <div
              className="min-h-[120px] rounded-lg border-2 flex items-center justify-center p-3"
              style={{ borderColor, backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc' }}
            >
              {formData.actaAjustadorFirmaImagen ? (
                <img
                  src={formData.actaAjustadorFirmaImagen}
                  alt="Firma del ajustador"
                  className="max-h-28 object-contain"
                />
              ) : (
                <span className="text-sm text-center" style={{ color: textSecondary }}>
                  Elija un funcionario con firma guardada, o use «Copiar desde el paso Firmas del informe».
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
