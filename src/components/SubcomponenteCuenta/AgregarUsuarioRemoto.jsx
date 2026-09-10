import React, { useCallback, useEffect, useState } from 'react';
import {
  crearInvitacionRemota,
  cancelarInvitacionOnboarding,
  listarInvitacionesOnboarding,
  reenviarInvitacionOnboarding,
} from '../../services/onboardingService';

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

const ESTADO_LABEL = {
  pendiente: 'Pendiente',
  firmas_parciales: 'Firmas parciales',
  firmado: 'Firmado',
  cuenta_creada: 'Cuenta creada',
  docs_parciales: 'Docs parciales',
  completado: 'Completado',
  cancelado: 'Cancelado',
  expirado: 'Expirado',
};

const ESTADO_COLOR = {
  pendiente: 'bg-amber-50 text-amber-800 border-amber-200',
  firmas_parciales: 'bg-sky-50 text-sky-800 border-sky-200',
  firmado: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  cuenta_creada: 'bg-violet-50 text-violet-800 border-violet-200',
  docs_parciales: 'bg-orange-50 text-orange-800 border-orange-200',
  completado: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  cancelado: 'bg-slate-100 text-slate-600 border-slate-200',
  expirado: 'bg-rose-50 text-rose-800 border-rose-200',
};

function fmtFecha(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('es-CO');
  } catch {
    return '—';
  }
}

export default function AgregarUsuarioRemoto() {
  const [vista, setVista] = useState('generar'); // generar | listado
  const [form, setForm] = useState({
    rol: 'usuario',
    notaAdmin: '',
    correoNotificar: '',
    enviarEmail: false,
  });
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [enlace, setEnlace] = useState('');
  const [busy, setBusy] = useState(false);
  const [invitaciones, setInvitaciones] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [cargandoLista, setCargandoLista] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const cargarLista = useCallback(async () => {
    setCargandoLista(true);
    try {
      const data = await listarInvitacionesOnboarding();
      setInvitaciones(data.invitaciones || []);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el listado');
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useEffect(() => {
    if (vista === 'listado') cargarLista();
  }, [vista, cargarLista]);

  const copiar = async (texto) => {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
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
      const data = await crearInvitacionRemota({
        rol: form.rol,
        notaAdmin: form.notaAdmin,
        correoNotificar: form.correoNotificar,
        enviarEmail: form.enviarEmail && Boolean(form.correoNotificar?.trim()),
      });
      setEnlace(data.enlace || '');
      setMensaje(
        data.email?.success
          ? 'Enlace generado y enviado por correo. Copie el enlace también por si acaso.'
          : 'Enlace generado. Envíeselo al usuario (WhatsApp, correo, etc.). Él completa sus datos en el portal.'
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Error al generar el enlace');
    } finally {
      setBusy(false);
    }
  };

  const regenerar = async (inv) => {
    setBusy(true);
    setError('');
    setMensaje('');
    try {
      const data = await reenviarInvitacionOnboarding(inv._id);
      setEnlace(data.enlace || '');
      setVista('generar');
      setMensaje(
        data.message ||
          (inv.correo
            ? `Enlace regenerado y correo enviado a ${inv.correo}`
            : 'Enlace regenerado. Cópielo y envíelo al usuario.')
      );
      await cargarLista();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo regenerar el enlace');
    } finally {
      setBusy(false);
    }
  };

  const cancelar = async (inv) => {
    const etiqueta = inv.cedula || inv.correo || inv.notaAdmin || inv._id;
    if (!window.confirm(`¿Cancelar la invitación de ${etiqueta}?`)) return;
    setBusy(true);
    setError('');
    try {
      await cancelarInvitacionOnboarding({ id: inv._id });
      setMensaje('Invitación cancelada');
      await cargarLista();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cancelar');
    } finally {
      setBusy(false);
    }
  };

  const listaFiltrada = invitaciones.filter((inv) =>
    filtroEstado === 'todas' ? true : inv.estado === filtroEstado
  );

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold">Usuarios remotos / Onboarding</h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Usted solo genera el enlace. La persona completa nombre, cédula, correo, firma los
            acuerdos, crea su contraseña y sube la documentación.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setVista('generar')}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium ${
              vista === 'generar' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Generar enlace
          </button>
          <button
            type="button"
            onClick={() => setVista('listado')}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium ${
              vista === 'listado' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Ver invitaciones
          </button>
        </div>
      </div>

      {mensaje && <p className="text-green-700 text-xs sm:text-sm mb-2">{mensaje}</p>}
      {error && <p className="text-red-600 text-xs sm:text-sm mb-2">{error}</p>}

      {enlace && (
        <div className="mb-4 p-3 rounded border border-emerald-200 bg-emerald-50 space-y-2">
          <p className="text-xs font-medium text-emerald-900">Enlace de registro</p>
          <input
            readOnly
            value={enlace}
            className="w-full text-xs px-2 py-1.5 border rounded bg-white"
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={() => copiar(enlace)}
            className="px-3 py-1.5 text-xs rounded bg-emerald-700 text-white"
          >
            Copiar enlace
          </button>
        </div>
      )}

      {vista === 'generar' && (
        <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4 max-w-xl">
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Rol que tendrá en la plataforma</label>
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
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">
              Nota interna (opcional)
            </label>
            <input
              name="notaAdmin"
              value={form.notaAdmin}
              onChange={onChange}
              placeholder="Ej. Juan Camilo — catastróficos"
              className="w-full px-3 py-2 rounded border text-xs sm:text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1">Solo para identificar el enlace en el listado.</p>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">
              Correo para notificar (opcional)
            </label>
            <input
              type="email"
              name="correoNotificar"
              value={form.correoNotificar}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  correoNotificar: value,
                  enviarEmail: Boolean(value.trim()) ? true : prev.enviarEmail,
                }));
              }}
              placeholder="si quiere enviar el enlace por correo"
              className="w-full px-3 py-2 rounded border text-xs sm:text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-xs sm:text-sm">
            <input
              type="checkbox"
              name="enviarEmail"
              checked={form.enviarEmail}
              onChange={onChange}
              disabled={!form.correoNotificar?.trim()}
            />
            Enviar el enlace por correo (si la invitación ya tiene correo, se envía normal)
          </label>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded bg-blue-600 text-white text-xs sm:text-sm font-medium disabled:opacity-60"
          >
            {busy ? 'Generando…' : 'Generar enlace de registro'}
          </button>
        </form>
      )}

      {vista === 'listado' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-slate-600">Filtrar:</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
            >
              <option value="todas">Todas</option>
              {Object.entries(ESTADO_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={cargarLista}
              disabled={cargandoLista || busy}
              className="px-2 py-1 text-xs rounded border hover:bg-slate-50"
            >
              {cargandoLista ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>

          <div className="overflow-x-auto border rounded-lg bg-white">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Persona / nota</th>
                  <th className="px-3 py-2 font-medium">Cédula</th>
                  <th className="px-3 py-2 font-medium">Correo</th>
                  <th className="px-3 py-2 font-medium">Rol</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Creada</th>
                  <th className="px-3 py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                      {cargandoLista ? 'Cargando…' : 'No hay invitaciones con ese filtro.'}
                    </td>
                  </tr>
                )}
                {listaFiltrada.map((inv) => {
                  const puedeReenviar = inv.estado !== 'completado';
                  const tieneCorreo = Boolean(inv.correo);
                  return (
                    <tr key={inv._id} className="border-t align-top">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-800">
                          {inv.nombre || inv.notaAdmin || 'Sin datos aún'}
                        </div>
                        {inv.notaAdmin && inv.nombre ? (
                          <div className="text-[11px] text-slate-500">{inv.notaAdmin}</div>
                        ) : null}
                        {!inv.nombre && !inv.cedula ? (
                          <div className="text-[11px] text-amber-700">Esperando que el usuario complete datos</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 font-mono">{inv.cedula || '—'}</td>
                      <td className="px-3 py-2 break-all">{inv.correo || '—'}</td>
                      <td className="px-3 py-2">{inv.rol}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-[11px] ${
                            ESTADO_COLOR[inv.estado] || 'bg-slate-50'
                          }`}
                        >
                          {ESTADO_LABEL[inv.estado] || inv.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtFecha(inv.createdAt)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          {puedeReenviar && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => regenerar(inv)}
                                className="text-left text-blue-700 hover:underline disabled:opacity-50"
                              >
                                {tieneCorreo ? 'Regenerar y enviar correo' : 'Regenerar enlace'}
                              </button>
                              {inv.estado !== 'cancelado' && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => cancelar(inv)}
                                  className="text-left text-red-700 hover:underline disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                              )}
                            </>
                          )}
                          {!puedeReenviar && <span className="text-slate-400">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
