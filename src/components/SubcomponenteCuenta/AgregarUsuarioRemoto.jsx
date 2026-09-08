import React, { useState } from 'react';
import { crearInvitacionRemota } from '../../services/onboardingService';

const ROLES = [
  { value: 'usuario', label: 'Usuario' },
  { value: 'ajustador_lider', label: 'Ajustador líder' },
  { value: 'ajustador', label: 'Ajustador' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'visualizador', label: 'Visualizador' },
  { value: 'puertos', label: 'Puertos' },
  { value: 'contractor_zurich', label: 'Contractor Zurich' },
  { value: 'contractor_solo_zurich', label: 'Solo Zurich' },
  { value: 'contractor_solo_bbva', label: 'Solo BBVA' },
  { value: 'contractor_solo_equidad', label: 'Equidad FDM' },
  { value: 'contractor_solo_equidad_cat', label: 'Equidad CAT' },
  { value: 'contractor_solo_express', label: 'Express' },
  { value: 'contractor_solo_previsora', label: 'Previsora' },
  { value: 'contractor_catastroficos', label: 'Catastróficos' },
  { value: 'contractor_era', label: 'ERA' },
  { value: 'soporte', label: 'Soporte' },
  { value: 'admin', label: 'Admin' },
];

export default function AgregarUsuarioRemoto() {
  const [form, setForm] = useState({
    nombre: '',
    correo: '',
    celular: '',
    cedula: '',
    fechaNacimiento: '',
    rol: 'usuario',
    enviarEmail: true,
  });
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [enlace, setEnlace] = useState('');
  const [busy, setBusy] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const copiar = async () => {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
      setMensaje('Enlace copiado al portapapeles');
    } catch {
      setMensaje('No se pudo copiar automáticamente; seleccione el enlace manualmente');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMensaje('');
    setError('');
    setEnlace('');
    try {
      const data = await crearInvitacionRemota(form);
      setEnlace(data.enlace || '');
      const emailOk = data.email?.success;
      setMensaje(
        emailOk
          ? 'Invitación creada y correo enviado. También puede copiar el enlace.'
          : 'Invitación creada. Copie y envíe el enlace al usuario (el correo no se pudo enviar).'
      );
      setForm({
        nombre: '',
        correo: '',
        celular: '',
        cedula: '',
        fechaNacimiento: '',
        rol: 'usuario',
        enviarEmail: true,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Error al crear la invitación');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <h3 className="text-lg sm:text-xl font-semibold mb-2">Agregar usuario remoto</h3>
      <p className="text-xs sm:text-sm text-slate-600 mb-4">
        Genera un enlace para que la persona firme la política de datos y el acuerdo de confidencialidad,
        cree su contraseña y suba hoja de vida, certificado bancario y cédula. Solo entonces podrá
        ingresar a la plataforma; los documentos firmados quedan en su perfil del gestor documental.
      </p>

      {mensaje && <p className="text-green-700 text-xs sm:text-sm mb-2">{mensaje}</p>}
      {error && <p className="text-red-600 text-xs sm:text-sm mb-2">{error}</p>}

      {enlace && (
        <div className="mb-4 p-3 rounded border border-emerald-200 bg-emerald-50 space-y-2">
          <p className="text-xs font-medium text-emerald-900">Enlace de onboarding</p>
          <input
            readOnly
            value={enlace}
            className="w-full text-xs px-2 py-1.5 border rounded bg-white"
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={copiar}
            className="px-3 py-1.5 text-xs rounded bg-emerald-700 text-white"
          >
            Copiar enlace
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1">Nombre completo</label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={onChange}
            required
            className="w-full px-3 py-2 rounded border text-xs sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1">Correo</label>
          <input
            type="email"
            name="correo"
            value={form.correo}
            onChange={onChange}
            required
            className="w-full px-3 py-2 rounded border text-xs sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1">Celular</label>
          <input
            name="celular"
            value={form.celular}
            onChange={onChange}
            className="w-full px-3 py-2 rounded border text-xs sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1">
            Cédula <span className="text-red-500">*</span> (será el login)
          </label>
          <input
            name="cedula"
            value={form.cedula}
            onChange={onChange}
            required
            className="w-full px-3 py-2 rounded border text-xs sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1">Fecha de nacimiento (opcional)</label>
          <input
            type="date"
            name="fechaNacimiento"
            value={form.fechaNacimiento}
            onChange={onChange}
            className="w-full px-3 py-2 rounded border text-xs sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-1">Rol</label>
          <select
            name="rol"
            value={form.rol}
            onChange={onChange}
            className="w-full px-3 py-2 rounded border text-xs sm:text-sm"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs sm:text-sm">
          <input type="checkbox" name="enviarEmail" checked={form.enviarEmail} onChange={onChange} />
          Enviar enlace por correo al usuario
        </label>
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded bg-blue-600 text-white text-xs sm:text-sm font-medium disabled:opacity-60"
        >
          {busy ? 'Generando…' : 'Generar enlace de onboarding'}
        </button>
      </form>
    </div>
  );
}
