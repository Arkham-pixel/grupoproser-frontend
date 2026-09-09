import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import mammoth from 'mammoth';
import FirmaPad from './FirmaPad';
import {
  obtenerOnboardingPublico,
  urlPlantillaOnboarding,
  firmarAcuerdoOnboarding,
  registrarCuentaOnboarding,
  subirDocumentoHrOnboarding,
} from '../../services/onboardingService';
import {
  generarPdfPoliticaFirmada,
  generarPdfConfidencialidadFirmada,
} from '../../utils/onboardingFirmasPdf';

const STEPS = [
  { id: 'politica', label: 'Política de datos' },
  { id: 'confidencialidad', label: 'Confidencialidad' },
  { id: 'cuenta', label: 'Crear cuenta' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'listo', label: 'Listo' },
];

function pasoActual(data) {
  if (!data) return 'politica';
  if (data.pasos?.puedeIngresar) return 'listo';
  if (data.pasos?.crearCuenta) return 'documentos';
  if (data.pasos?.firmarPolitica && data.pasos?.firmarConfidencialidad) return 'cuenta';
  if (data.pasos?.firmarPolitica) return 'confidencialidad';
  return 'politica';
}

export default function PortalOnboarding() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [firmaPolitica, setFirmaPolitica] = useState('');
  const [firmaNda, setFirmaNda] = useState('');
  const [ndaHtml, setNdaHtml] = useState('');
  const [ndaTexto, setNdaTexto] = useState('');
  const [pdfPoliticaBlob, setPdfPoliticaBlob] = useState(null);
  const [pdfNdaBlob, setPdfNdaBlob] = useState(null);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [docsLocal, setDocsLocal] = useState({
    hojaVida: null,
    certificadoBancario: null,
    cedula: null,
  });
  const [letreroCredenciales, setLetreroCredenciales] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await obtenerOnboardingPublico(token);
      setData(res);
      if (res.fechaNacimiento) {
        setFechaNacimiento(String(res.fechaNacimiento).slice(0, 10));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar la invitación');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!token) return;
    try {
      const raw = sessionStorage.getItem(`onboardingCredenciales:${token}`);
      if (raw) setLetreroCredenciales(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    if (!token || !data) return;
    let cancelled = false;
    (async () => {
      try {
        const url = urlPlantillaOnboarding(token, 'confidencialidad');
        const buf = await fetch(url).then((r) => r.arrayBuffer());
        const html = await mammoth.convertToHtml({ arrayBuffer: buf });
        const text = await mammoth.extractRawText({ arrayBuffer: buf });
        if (!cancelled) {
          setNdaHtml(html.value);
          setNdaTexto(text.value);
        }
      } catch (e) {
        if (!cancelled) setNdaHtml('<p>No se pudo cargar el texto del acuerdo. Descargue la plantilla.</p>');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, data]);

  const step = useMemo(() => pasoActual(data), [data]);
  const plantillaPolitica = token ? urlPlantillaOnboarding(token, 'politica') : '';

  const validatePassword = (p) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(p);

  const firmarPolitica = async () => {
    if (!firmaPolitica) {
      setMensaje('Dibuje o suba su firma');
      return;
    }
    setBusy(true);
    setMensaje('');
    try {
      await firmarAcuerdoOnboarding(token, { tipo: 'politica', firmaImagen: firmaPolitica });
      const blob = await generarPdfPoliticaFirmada({
        plantillaUrl: plantillaPolitica,
        firmaDataUrl: firmaPolitica,
        firmante: data.nombre,
        cedula: data.cedula,
      });
      setPdfPoliticaBlob(blob);
      await cargar();
      setMensaje('Política firmada correctamente');
    } catch (err) {
      setMensaje(err.response?.data?.message || 'Error al firmar la política');
    } finally {
      setBusy(false);
    }
  };

  const firmarNda = async () => {
    if (!firmaNda) {
      setMensaje('Dibuje o suba su firma');
      return;
    }
    setBusy(true);
    setMensaje('');
    try {
      await firmarAcuerdoOnboarding(token, { tipo: 'confidencialidad', firmaImagen: firmaNda });
      const blob = await generarPdfConfidencialidadFirmada({
        textoPlano: ndaTexto,
        firmaDataUrl: firmaNda,
        firmante: data.nombre,
        cedula: data.cedula,
      });
      setPdfNdaBlob(blob);
      await cargar();
      setMensaje('Acuerdo de confidencialidad firmado');
    } catch (err) {
      setMensaje(err.response?.data?.message || 'Error al firmar el acuerdo');
    } finally {
      setBusy(false);
    }
  };

  const crearCuenta = async (e) => {
    e.preventDefault();
    const pass1 = String(password || '');
    const pass2 = String(password2 || '');
    if (!validatePassword(pass1)) {
      setMensaje('La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, número y símbolo');
      return;
    }
    if (pass1 !== pass2) {
      setMensaje('Las contraseñas no coinciden: escriba exactamente la misma en ambos campos (revise mayúsculas, espacios o el autocompletado del navegador).');
      return;
    }
    if (!fechaNacimiento) {
      setMensaje('Indique su fecha de nacimiento');
      return;
    }
    setBusy(true);
    setMensaje('');
    try {
      const firmaPol = firmaPolitica || data.firmaPoliticaDatos?.firmaImagen || '';
      const firmaConf = firmaNda || data.firmaConfidencialidad?.firmaImagen || '';

      let politicaPdf = pdfPoliticaBlob;
      let confidencialidadPdf = pdfNdaBlob;
      if (!politicaPdf && firmaPol) {
        politicaPdf = await generarPdfPoliticaFirmada({
          plantillaUrl: plantillaPolitica,
          firmaDataUrl: firmaPol,
          firmante: data.nombre,
          cedula: data.cedula,
        });
        setPdfPoliticaBlob(politicaPdf);
      }
      if (!confidencialidadPdf && firmaConf) {
        confidencialidadPdf = await generarPdfConfidencialidadFirmada({
          textoPlano: ndaTexto,
          firmaDataUrl: firmaConf,
          firmante: data.nombre,
          cedula: data.cedula,
        });
        setPdfNdaBlob(confidencialidadPdf);
      }

      const res = await registrarCuentaOnboarding(token, {
        password,
        fechaNacimiento,
        politicaPdf,
        confidencialidadPdf,
      });
      const creds = {
        login: res.usuario?.login || data.cedula,
        password,
        emailEnviado: Boolean(res.credencialesEmail?.enviado),
      };
      setLetreroCredenciales(creds);
      try {
        sessionStorage.setItem(`onboardingCredenciales:${token}`, JSON.stringify(creds));
      } catch {
        /* ignore */
      }
      await cargar();
      setMensaje(
        creds.emailEnviado
          ? 'Cuenta creada. Le enviamos una copia de usuario y contraseña a su correo. Continúe con los documentos.'
          : 'Cuenta creada. Guarde el letrero de credenciales abajo (el correo no se pudo enviar). Continúe con los documentos.'
      );
    } catch (err) {
      setMensaje(err.response?.data?.message || 'Error al crear la cuenta');
    } finally {
      setBusy(false);
    }
  };

  const subirDoc = async (tipo) => {
    const archivo = docsLocal[tipo];
    if (!archivo) {
      setMensaje('Seleccione un archivo');
      return;
    }
    setBusy(true);
    setMensaje('');
    try {
      const res = await subirDocumentoHrOnboarding(token, { tipo, archivo });
      await cargar();
      setMensaje(res.message || 'Documento subido');
    } catch (err) {
      setMensaje(err.response?.data?.message || 'Error al subir el documento');
    } finally {
      setBusy(false);
    }
  };

  const descargarBlob = (blob, nombre) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Cargando invitación…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md bg-white border rounded-lg p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800 mb-2">Enlace no disponible</h1>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <Link to="/login" className="text-sm text-blue-700 underline">
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Grupo Proser · Onboarding</p>
          <h1 className="text-xl font-semibold text-slate-900">Registro remoto</h1>
          <p className="text-sm text-slate-600 mt-1">
            Hola <strong>{data.nombre}</strong> — complete los pasos para activar su cuenta.
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4">
        <ol className="flex flex-wrap gap-2 mb-6">
          {STEPS.map((s) => {
            const activo = s.id === step;
            const done =
              (s.id === 'politica' && data.pasos.firmarPolitica) ||
              (s.id === 'confidencialidad' && data.pasos.firmarConfidencialidad) ||
              (s.id === 'cuenta' && data.pasos.crearCuenta) ||
              (s.id === 'documentos' && data.pasos.documentosCompletos) ||
              (s.id === 'listo' && data.pasos.puedeIngresar);
            return (
              <li
                key={s.id}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  activo
                    ? 'bg-red-700 text-white border-red-700'
                    : done
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                {s.label}
              </li>
            );
          })}
        </ol>

        {mensaje && (
          <div className="mb-4 text-sm rounded border border-slate-200 bg-white px-3 py-2 text-slate-700">
            {mensaje}
          </div>
        )}

        {letreroCredenciales && (step === 'documentos' || step === 'listo' || step === 'cuenta') && (
          <div className="mb-5 overflow-hidden rounded-xl border-[3px] border-red-700 bg-red-50 shadow-sm">
            <div className="bg-red-700 px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-white">
              Datos de acceso — guarde esta copia
            </div>
            <div className="px-4 py-5 text-center">
              <p className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">Usuario</p>
              <p className="mb-4 font-mono text-2xl font-bold tracking-wide text-slate-900">
                {letreroCredenciales.login}
              </p>
              <div className="mx-auto mb-4 h-px max-w-[180px] bg-red-200" />
              <p className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">Contraseña</p>
              <p className="break-all font-mono text-xl font-bold text-slate-900">
                {letreroCredenciales.password}
              </p>
              <p className="mt-4 text-xs text-slate-500">
                {letreroCredenciales.emailEnviado
                  ? 'También enviamos esta copia a su correo (Gmail / Outlook / bandeja corporativa).'
                  : 'Revise su bandeja si el correo llega después; mientras tanto conserve este letrero.'}
              </p>
            </div>
          </div>
        )}

        {step === 'politica' && (
          <section className="bg-white border rounded-lg p-4 sm:p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold">1. Política de tratamiento de datos</h2>
            <p className="text-sm text-slate-600">
              Lea el documento y firme para continuar.
            </p>
            <iframe
              title="Política de datos"
              src={plantillaPolitica}
              className="w-full h-[420px] border rounded"
            />
            <a
              href={plantillaPolitica}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-700 underline"
            >
              Abrir / descargar PDF
            </a>
            <FirmaPad onChange={setFirmaPolitica} />
            <button
              type="button"
              disabled={busy}
              onClick={firmarPolitica}
              className="w-full sm:w-auto px-4 py-2 rounded bg-red-700 text-white text-sm font-medium disabled:opacity-60"
            >
              {busy ? 'Guardando…' : 'Firmar política de datos'}
            </button>
          </section>
        )}

        {step === 'confidencialidad' && (
          <section className="bg-white border rounded-lg p-4 sm:p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold">2. Acuerdo de confidencialidad</h2>
            <div
              className="prose prose-sm max-w-none max-h-[420px] overflow-y-auto border rounded p-3 bg-slate-50"
              dangerouslySetInnerHTML={{ __html: ndaHtml }}
            />
            <a
              href={urlPlantillaOnboarding(token, 'confidencialidad')}
              className="text-sm text-blue-700 underline"
            >
              Descargar Word original
            </a>
            <FirmaPad onChange={setFirmaNda} />
            <button
              type="button"
              disabled={busy}
              onClick={firmarNda}
              className="w-full sm:w-auto px-4 py-2 rounded bg-red-700 text-white text-sm font-medium disabled:opacity-60"
            >
              {busy ? 'Guardando…' : 'Firmar acuerdo de confidencialidad'}
            </button>
          </section>
        )}

        {step === 'cuenta' && (
          <section className="bg-white border rounded-lg p-4 sm:p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold">3. Crear su cuenta</h2>
            <p className="text-sm text-slate-600">
              Usuario (login): <strong>{data.cedula}</strong> — Correo: <strong>{data.correo}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              {pdfPoliticaBlob && (
                <button
                  type="button"
                  className="text-xs underline text-blue-700"
                  onClick={() => descargarBlob(pdfPoliticaBlob, 'politica-datos-firmada.pdf')}
                >
                  Descargar copia política firmada
                </button>
              )}
              {pdfNdaBlob && (
                <button
                  type="button"
                  className="text-xs underline text-blue-700"
                  onClick={() => descargarBlob(pdfNdaBlob, 'acuerdo-confidencialidad-firmado.pdf')}
                >
                  Descargar copia NDA firmado
                </button>
              )}
            </div>
            <form onSubmit={crearCuenta} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Fecha de nacimiento</label>
                <input
                  type="date"
                  required
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Contraseña</label>
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (mensaje.includes('coinciden')) setMensaje('');
                  }}
                  className="w-full border rounded px-3 py-2 text-sm"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Confirmar contraseña</label>
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  required
                  value={password2}
                  onChange={(e) => {
                    setPassword2(e.target.value);
                    if (mensaje.includes('coinciden')) setMensaje('');
                  }}
                  className="w-full border rounded px-3 py-2 text-sm"
                  autoComplete="new-password"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={mostrarPassword}
                  onChange={(e) => setMostrarPassword(e.target.checked)}
                />
                Mostrar contraseñas
              </label>
              {password2.length > 0 && (
                <p className={`text-xs ${password === password2 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {password === password2
                    ? 'Las contraseñas coinciden.'
                    : 'Las contraseñas aún no coinciden.'}
                </p>
              )}
              <p className="text-xs text-slate-500">
                Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.
              </p>
              <button
                type="submit"
                disabled={busy}
                className="w-full sm:w-auto px-4 py-2 rounded bg-red-700 text-white text-sm font-medium disabled:opacity-60"
              >
                {busy ? 'Creando…' : 'Crear cuenta'}
              </button>
            </form>
          </section>
        )}

        {step === 'documentos' && (
          <section className="bg-white border rounded-lg p-4 sm:p-6 space-y-5 shadow-sm">
            <h2 className="text-lg font-semibold">4. Documentación requerida</h2>
            <p className="text-sm text-slate-600">
              Suba los tres documentos. Al completarlos se activará su acceso a la plataforma.
            </p>
            {[
              { key: 'hojaVida', label: 'Hoja de vida / Currículum' },
              { key: 'certificadoBancario', label: 'Certificado bancario' },
              { key: 'cedula', label: 'Cédula (PDF o imagen)' },
            ].map((item) => {
              const ok = data.documentosHr?.[item.key]?.subido;
              return (
                <div key={item.key} className="border rounded p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{item.label}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {ok ? 'Subido' : 'Pendiente'}
                    </span>
                  </div>
                  {!ok && (
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) =>
                          setDocsLocal((prev) => ({ ...prev, [item.key]: e.target.files?.[0] || null }))
                        }
                        className="text-xs"
                      />
                      <button
                        type="button"
                        disabled={busy || !docsLocal[item.key]}
                        onClick={() => subirDoc(item.key)}
                        className="px-3 py-1.5 text-xs rounded bg-slate-800 text-white disabled:opacity-50"
                      >
                        Subir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {step === 'listo' && (
          <section className="bg-white border rounded-lg p-4 sm:p-6 space-y-4 shadow-sm text-center">
            <h2 className="text-lg font-semibold text-emerald-800">Registro completado</h2>
            <p className="text-sm text-slate-600">
              Su cuenta está activa. Puede ingresar con su cédula <strong>{data.cedula}</strong> y la
              contraseña que definió.
            </p>
            <Link
              to="/login"
              className="inline-block px-4 py-2 rounded bg-red-700 text-white text-sm font-medium"
            >
              Ir a iniciar sesión
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
