import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaFileSignature, FaPen, FaPlus, FaSave, FaUpload } from 'react-icons/fa';
import FuncionarioService from '../services/funcionarioService.js';
import {
  usePropiedadesTheme,
  FieldLabel,
  ThemedInput,
  ThemedSelect,
  complexBtnPrimary,
  complexBtnSecondary,
  complexBtnGhost,
} from './propiedadesUi';

const CARGOS_DEFAULT = [
  'Ing. de Siniestros',
  'Ajustador Senior',
  'Ajustador Especialista',
  'Perito en Seguros',
  'Analista de Riesgos',
  'Coordinador de Ajustes',
  'Supervisor de Campo',
  'Técnico de Ajustes',
  'Gerente Técnico',
];

function FirmaClienteModal({ open, onClose, onSave }) {
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
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
      role="presentation"
      onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-xl shadow-2xl p-5 sm:p-6 bg-white border-2 border-gray-200" role="dialog" aria-modal="true">
        <h3 className="text-lg font-bold mb-2 text-gray-900">Firma</h3>
        <p className="text-sm mb-4 text-gray-600">Dibuje en el recuadro con el dedo o el ratón.</p>
        <div className="rounded-lg overflow-hidden border-2 border-gray-200 mb-4 touch-none bg-white">
          <canvas
            ref={canvasRef}
            className="w-full h-[200px] cursor-crosshair block"
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
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border-2 border-gray-300 text-gray-700">
            Cancelar
          </button>
          <button type="button" onClick={initCanvas} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-800">
            Limpiar
          </button>
          <button
            type="button"
            onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              try {
                onSave(canvas.toDataURL('image/png'));
                onClose();
              } catch {
                onClose();
              }
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Usar esta firma
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalNuevoAjustador({ open, onClose, onGuardado, cargos }) {
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    cargo: '',
    telefono: '',
    email: '',
    firma: null,
  });

  useEffect(() => {
    if (open) {
      setForm({ nombre: '', cargo: '', telefono: '', email: '', firma: null });
    }
  }, [open]);

  if (!open) return null;

  const handleFirmaUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
      alert('Seleccione una imagen válida (PNG, JPG o WEBP).');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setForm((prev) => ({ ...prev, firma: ev.target.result }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const guardar = async () => {
    if (!form.nombre.trim() || !form.cargo.trim()) {
      alert('Nombre y cargo son obligatorios.');
      return;
    }
    setGuardando(true);
    try {
      const creado = await FuncionarioService.crearFuncionario({
        nombre: form.nombre.trim(),
        cargo: form.cargo.trim(),
        telefono: form.telefono.trim(),
        email: form.email.trim(),
        firma: form.firma || null,
      });
      if (creado?._id && form.firma) {
        try {
          await FuncionarioService.actualizarFirmaFuncionario(creado._id, form.firma);
        } catch {
          // La firma puede quedar en el documento creado
        }
      }
      onGuardado(creado);
      onClose();
    } catch {
      alert('No se pudo guardar el ajustador. Verifique la conexión e intente de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
      role="presentation"
      onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl shadow-2xl p-5 sm:p-6 bg-white border-2 border-gray-200" role="dialog" aria-modal="true">
        <h3 className="text-lg font-bold mb-1 text-gray-900">Agregar ajustador a la lista</h3>
        <p className="text-sm text-gray-600 mb-4">
          Registre un nuevo empleado ajustador. Quedará disponible en el selector para este y otros informes.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cargo *</label>
            <select
              value={form.cargo}
              onChange={(e) => setForm({ ...form, cargo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Seleccione cargo —</option>
              {cargos.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="text"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Imagen de firma (opcional)</label>
            <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleFirmaUpload} className="hidden" id="upload-firma-nuevo-ajustador" />
            <label
              htmlFor="upload-firma-nuevo-ajustador"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer border-2 border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100"
            >
              <FaUpload /> Subir imagen de firma
            </label>
            {form.firma && (
              <div className="mt-2 p-2 bg-white border border-gray-200 rounded-lg flex justify-center">
                <img src={form.firma} alt="Vista previa firma" className="max-h-20 object-contain" />
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} disabled={guardando} className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
          >
            <FaSave /> {guardando ? 'Guardando…' : 'Guardar en la lista'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SeccionFirmasActa({
  formData,
  onInputChange,
  tituloCliente = 'FIRMA DE QUIEN RECIBE LA VISITA',
  descripcion,
  permitirRegistrarAjustadores = false,
  sinContenedor = false,
}) {
  const t = usePropiedadesTheme();
  const [modalFirmaAbierto, setModalFirmaAbierto] = useState(false);
  const [modalNuevoAjustador, setModalNuevoAjustador] = useState(false);
  const [funcionarios, setFuncionarios] = useState([]);
  const [cargandoFuncionarios, setCargandoFuncionarios] = useState(true);
  const [errorListaFuncionarios, setErrorListaFuncionarios] = useState(null);
  const [cargos] = useState(() => {
    try {
      const guardados = localStorage.getItem('proser_cargos');
      return guardados ? JSON.parse(guardados) : CARGOS_DEFAULT;
    } catch {
      return CARGOS_DEFAULT;
    }
  });

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
        setErrorListaFuncionarios('No hay ajustadores en la lista. Use «Agregar ajustador» para registrar uno nuevo.');
      }
    } catch {
      const raw = FuncionarioService.cargarDesdeLocalStorage();
      const norm = FuncionarioService.normalizarListaFuncionarios(raw);
      setFuncionarios(Array.isArray(norm) ? norm : []);
      setErrorListaFuncionarios(
        norm.length === 0
          ? 'No se pudo cargar la lista. Use «Agregar ajustador» para registrar uno nuevo.'
          : 'Lista cargada solo desde el navegador (sin conexión al servidor).'
      );
    } finally {
      setCargandoFuncionarios(false);
    }
  }, []);

  useEffect(() => {
    cargarListaFuncionarios();
  }, [cargarListaFuncionarios]);

  const aplicarFuncionario = async (funcionarioId) => {
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

  const handleNuevoAjustadorGuardado = async (creado) => {
    await cargarListaFuncionarios();
    const fid = idFunc(creado);
    if (fid) void aplicarFuncionario(fid);
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
      if (ev.target?.result) onInputChange('actaClienteFirma', ev.target.result);
    };
    reader.onerror = () => alert('No se pudo leer la imagen. Intente de nuevo.');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const textoDescripcion =
    descripcion ||
    'Quien recibe la visita a la izquierda. A la derecha elija el ajustador de la lista del sistema. Si llega un empleado nuevo, use «Agregar ajustador» para registrarlo en la lista (independiente del formulario de ajustes).';

  const contenido = (
    <>
      <FirmaClienteModal
        open={modalFirmaAbierto}
        onClose={() => setModalFirmaAbierto(false)}
        onSave={(dataUrl) => onInputChange('actaClienteFirma', dataUrl)}
      />
      <ModalNuevoAjustador
        open={modalNuevoAjustador}
        onClose={() => setModalNuevoAjustador(false)}
        onGuardado={handleNuevoAjustadorGuardado}
        cargos={cargos}
      />

      {!sinContenedor && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <FaFileSignature className="text-xl" style={{ color: '#DC2626' }} />
            <h2 className="font-heading text-2xl font-bold" style={{ color: t.textPrimary }}>Firmas</h2>
          </div>
          <p className="mb-6 text-sm" style={{ color: t.textSecondary }}>{textoDescripcion}</p>
        </>
      )}

      {sinContenedor && (
        <p className="mb-6 text-sm" style={{ color: t.textSecondary }}>{textoDescripcion}</p>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: t.borderColor, backgroundColor: t.theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFAFA' }}
        >
          <h3 className="mb-4 text-center font-heading font-bold" style={{ color: t.textPrimary }}>{tituloCliente}</h3>
          <FieldLabel>Nombre</FieldLabel>
          <ThemedInput
            type="text"
            value={formData.actaClienteNombre || ''}
            onChange={(e) => onInputChange('actaClienteNombre', e.target.value)}
            placeholder="Nombre de quien recibe la visita"
            className="mb-3"
          />
          <FieldLabel>Cargo</FieldLabel>
          <ThemedInput
            type="text"
            value={formData.actaClienteCargo || ''}
            onChange={(e) => onInputChange('actaClienteCargo', e.target.value)}
            placeholder="Ej. Propietario, Arrendatario, Administrador…"
            className="mb-3"
          />
          <FieldLabel>Correo</FieldLabel>
          <ThemedInput
            type="email"
            value={formData.actaClienteEmail || ''}
            onChange={(e) => onInputChange('actaClienteEmail', e.target.value)}
            placeholder="correo@ejemplo.com"
            className="mb-4"
          />
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setModalFirmaAbierto(true)}
              className={complexBtnPrimary}
            >
              <FaPen /> Dibujar firma
            </button>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleClienteFirmaUpload}
              className="hidden"
              id="upload-firma-cliente-propiedades"
            />
            <label
              htmlFor="upload-firma-cliente-propiedades"
              className={`cursor-pointer ${complexBtnSecondary}`}
            >
              <FaUpload /> Subir imagen
            </label>
            {formData.actaClienteFirma && (
              <button
                type="button"
                onClick={() => onInputChange('actaClienteFirma', '')}
                className={complexBtnGhost}
              >
                Quitar firma
              </button>
            )}
          </div>
          <div
            className="flex min-h-[120px] items-center justify-center rounded-lg border-2 p-3"
            style={{ borderColor: t.borderColor, backgroundColor: t.cardBg }}
          >
            {formData.actaClienteFirma ? (
              <img src={formData.actaClienteFirma} alt="Firma quien recibe la visita" className="max-h-28 object-contain" />
            ) : (
              <span className="text-center text-sm" style={{ color: t.textSecondary }}>
                Aún no hay firma. Use «Dibujar firma» o «Subir imagen».
              </span>
            )}
          </div>
        </div>

        <div
          className="rounded-xl border p-5"
          style={{ borderColor: t.borderColor, backgroundColor: t.theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFAFA' }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading font-bold" style={{ color: t.textPrimary }}>FIRMA DEL AJUSTADOR</h3>
            {permitirRegistrarAjustadores && (
              <button
                type="button"
                onClick={() => setModalNuevoAjustador(true)}
                className={complexBtnSecondary}
              >
                <FaPlus /> Agregar ajustador
              </button>
            )}
          </div>
          <FieldLabel>Ajustador (lista del sistema)</FieldLabel>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void cargarListaFuncionarios()}
              className={complexBtnGhost}
            >
              Actualizar lista
            </button>
            <span className="text-xs" style={{ color: t.textSecondary }}>{funcionarios.length} ajustador(es)</span>
          </div>
          {errorListaFuncionarios && (
            <p
              className="mb-2 rounded-lg border p-2 text-xs"
              style={{
                borderColor: t.theme === 'dark' ? 'rgba(245,158,11,0.4)' : '#FCD34D',
                backgroundColor: t.theme === 'dark' ? 'rgba(245,158,11,0.1)' : '#FFFBEB',
                color: t.theme === 'dark' ? '#FCD34D' : '#92400E',
              }}
            >
              {errorListaFuncionarios}
            </p>
          )}
          <ThemedSelect
            value={formData.actaAjustadorFuncionarioId || ''}
            onChange={(e) => void aplicarFuncionario(e.target.value)}
            disabled={cargandoFuncionarios}
            className="mb-2"
          >
            <option value="">— Seleccione ajustador —</option>
            {funcionarios.map((f) => {
              const fid = idFunc(f);
              if (!fid) return null;
              return (
                <option key={fid} value={fid}>
                  {f.nombre || 'Sin nombre'}
                  {!f.firma ? ' (sin imagen en caché)' : ''}
                </option>
              );
            })}
          </ThemedSelect>
          {cargandoFuncionarios && (
            <p className="mb-2 text-xs" style={{ color: t.textSecondary }}>Cargando lista de ajustadores…</p>
          )}
          {(() => {
            const sel = funcionarios.find(
              (x) => idFunc(x) === String(formData.actaAjustadorFuncionarioId || '')
            );
            return sel && !formData.actaAjustadorFirmaImagen ? (
              <p className="mb-3 text-xs" style={{ color: t.theme === 'dark' ? '#FCD34D' : '#B45309' }}>
                Este ajustador no tiene imagen de firma guardada. Edítelo en Gestión de funcionarios o súbala al registrarlo.
              </p>
            ) : null;
          })()}
          <div className="mb-4 space-y-2 text-sm" style={{ color: t.textPrimary }}>
            <p>
              <span className="font-semibold">Nombre:</span>{' '}
              {formData.actaAjustadorNombre || <span style={{ color: t.textSecondary }}>— Elija ajustador —</span>}
            </p>
            <p>
              <span className="font-semibold">Cargo:</span>{' '}
              {formData.actaAjustadorCargo || <span style={{ color: t.textSecondary }}>—</span>}
            </p>
            <p>
              <span className="font-semibold">E-mail:</span>{' '}
              {formData.actaAjustadorEmail || <span style={{ color: t.textSecondary }}>—</span>}
            </p>
          </div>
          <div
            className="flex min-h-[120px] items-center justify-center rounded-lg border-2 p-3"
            style={{ borderColor: t.borderColor, backgroundColor: t.cardBg }}
          >
            {formData.actaAjustadorFirmaImagen ? (
              <img src={formData.actaAjustadorFirmaImagen} alt="Firma del ajustador" className="max-h-28 object-contain" />
            ) : (
              <span className="text-center text-sm" style={{ color: t.textSecondary }}>
                Elija un ajustador de la lista o registre uno nuevo con «Agregar ajustador».
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );

  if (sinContenedor) {
    return contenido;
  }

  return (
    <div
      className="rounded-lg p-6 shadow-md"
      style={{ backgroundColor: t.cardBg, border: `1px solid ${t.borderColor}` }}
    >
      {contenido}
    </div>
  );
}
