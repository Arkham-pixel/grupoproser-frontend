import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';
import {
  enviarEncuestaDocumentacion,
  obtenerEstadoEncuestaDocumentacion,
  descargarPlantillaConfidencialidadEncuesta,
} from '../../services/encuestaDocumentacionExternosService';
import { rutaInicioPorRol } from '../../config/roles';
import LogoutButton from '../LogoutButton';
import FirmaPad from '../Onboarding/FirmaPad';
import { generarPdfConfidencialidadFirmada } from '../../utils/onboardingFirmasPdf';
import {
  rellenarAcuerdoConfidencialidad,
  estructurarHtmlAcuerdoConfidencialidad,
} from '../../utils/rellenarAcuerdoConfidencialidad';

/** Quita sufijos de rol tipo "(Catastróficos)" del nombre legal. */
function nombreLegal(nombre) {
  return String(nombre || '')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const CAMPOS_DEFAULT = [
  { key: 'hojaVida', label: 'Hoja de vida', requerido: true, hint: 'Adjunte su hoja de vida actualizada.' },
  {
    key: 'certificacionBancaria',
    label: 'Certificación bancaria',
    requerido: true,
    hint: 'Adjunte una certificación bancaria donde se evidencie la titularidad de la cuenta.',
  },
  {
    key: 'copiaCedula',
    label: 'Copia de cédula',
    requerido: true,
    hint: 'Adjunte copia legible de su documento de identidad.',
  },
  {
    key: 'acuerdoConfidencialidad',
    label: 'Acuerdo de confidencialidad',
    requerido: true,
    hint: 'Lea y firme el acuerdo oficial de Grupo Proser (el mismo del onboarding).',
    firmarOficial: true,
  },
  {
    key: 'contratoFirmado',
    label: 'Contrato firmado',
    requerido: false,
    hint: 'Adjunte copia del contrato debidamente firmado.',
  },
  {
    key: 'certificadoArl',
    label: 'Certificado ARL',
    requerido: true,
    hint: 'Adjunte certificado de afiliación a ARL vigente.',
  },
];

export default function EncuestaDocumentacionExternos() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [correo, setCorreo] = useState('');
  const [cedula, setCedula] = useState('');
  const [celular, setCelular] = useState('');
  const [archivos, setArchivos] = useState({});

  const [mostrarFirmaNda, setMostrarFirmaNda] = useState(false);
  const [ndaHtml, setNdaHtml] = useState('');
  const [ndaTexto, setNdaTexto] = useState('');
  const [firmaNda, setFirmaNda] = useState('');
  const [cargandoNda, setCargandoNda] = useState(false);
  const [firmandoNda, setFirmandoNda] = useState(false);

  const campos = useMemo(() => {
    if (Array.isArray(estado?.campos) && estado.campos.length) {
      return estado.campos.map((c) => {
        const def = CAMPOS_DEFAULT.find((d) => d.key === c.key);
        return { ...def, ...c, hint: def?.hint || '', firmarOficial: def?.firmarOficial };
      });
    }
    return CAMPOS_DEFAULT;
  }, [estado]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await obtenerEstadoEncuestaDocumentacion();
        if (cancelled) return;
        setEstado(res);
        setNombreCompleto(nombreLegal(res.nombreSugerido) || res.nombreSugerido || '');
        setCorreo(res.correoSugerido || '');
        setCedula(res.cedula || '');
        setCelular(res.celular || '');
        if (!res.aplica || res.completada) {
          navigate(rutaInicioPorRol(), { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'No se pudo cargar la encuesta');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const onFile = (key, file) => {
    setArchivos((prev) => ({ ...prev, [key]: file || null }));
  };

  const abrirFirmaAcuerdo = async () => {
    setMostrarFirmaNda(true);
    setCargandoNda(true);
    setError('');
    setFirmaNda('');
    try {
      const buf = await descargarPlantillaConfidencialidadEncuesta();
      const html = await mammoth.convertToHtml({ arrayBuffer: buf });
      const text = await mammoth.extractRawText({ arrayBuffer: buf });
      const datos = {
        nombre: nombreLegal(nombreCompleto),
        cedula,
        correo,
        celular,
        direccion: '',
        ciudad: '',
      };
      setNdaHtml(
        estructurarHtmlAcuerdoConfidencialidad(rellenarAcuerdoConfidencialidad(html.value, datos))
      );
      setNdaTexto(rellenarAcuerdoConfidencialidad(text.value, datos));
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el acuerdo de confidencialidad');
      setMostrarFirmaNda(false);
    } finally {
      setCargandoNda(false);
    }
  };

  const confirmarFirmaAcuerdo = async () => {
    if (!firmaNda) {
      setError('Dibuje o suba su firma para el acuerdo de confidencialidad');
      return;
    }
    if (!nombreCompleto.trim() || !cedula.trim()) {
      setError('Complete nombre completo y asegúrese de tener cédula en el perfil');
      return;
    }
    setFirmandoNda(true);
    setError('');
    try {
      const blob = await generarPdfConfidencialidadFirmada({
        textoPlano: ndaTexto,
        firmaDataUrl: firmaNda,
        firmante: nombreLegal(nombreCompleto),
        cedula: cedula.trim(),
        correo: correo.trim(),
        celular: celular.trim(),
      });
      const file = new File([blob], 'acuerdo-confidencialidad-firmado.pdf', {
        type: 'application/pdf',
      });
      onFile('acuerdoConfidencialidad', file);
      setMostrarFirmaNda(false);
      setMensaje('Acuerdo de confidencialidad firmado. Continúe con los demás documentos.');
    } catch (err) {
      setError(err.message || 'No se pudo generar el PDF firmado');
    } finally {
      setFirmandoNda(false);
    }
  };

  const enviar = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMensaje('');
    setError('');
    try {
      for (const c of campos) {
        if (c.requerido && !archivos[c.key]) {
          if (c.key === 'acuerdoConfidencialidad') {
            throw new Error('Debe firmar el acuerdo de confidencialidad (botón Firmar acuerdo)');
          }
          throw new Error(`Debe adjuntar: ${c.label}`);
        }
      }
      const res = await enviarEncuestaDocumentacion({
        nombreCompleto: nombreLegal(nombreCompleto) || nombreCompleto,
        correo,
        archivos,
      });
      setMensaje(res.message || 'Documentación enviada');
      setEstado(res);
      window.dispatchEvent(new CustomEvent('encuesta-documentacion-completada'));
      setTimeout(() => navigate(rutaInicioPorRol(), { replace: true }), 800);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al enviar');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f0f7] text-slate-600">
        Cargando encuesta…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f0f7]">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Grupo Proser
            </p>
            <h1 className="text-xl font-semibold text-slate-900 mt-1">
              Actualización de documentación – Colaboradores Externos
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-xl">
              Para mantener la documentación actualizada y consolidada, complete el formulario y
              adjunte los documentos solicitados. Deben estar completos, legibles y firmados cuando
              corresponda.
            </p>
          </div>
          <LogoutButton variant="compact" label="Salir" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 leading-relaxed">
          Esta actualización documental se realiza por <strong>orden de la gerencia de Grupo Proser</strong>.
          Por esa razón es <strong>obligatoria</strong> para colaboradores externos y para quienes
          estuvieron vinculados al módulo catastrófico (incluso si su rol actual es usuario de
          plataforma). Completarla es condición para continuar operando en la plataforma y mantener
          vigente su relación contractual o de prestación de servicios.
        </div>

        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {estado?.obligatoria || estado?.vigente ? (
            <>
              Mientras no envíe esta documentación, <strong>no podrá ingresar</strong> a los módulos de la
              plataforma.
            </>
          ) : (
            <>
              Puede completar la documentación desde ya. A partir del{' '}
              <strong>{estado?.fechaInicio || '2026-10-08'}</strong> será obligatoria al ingresar.
            </>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {mensaje && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {mensaje}
          </div>
        )}

        <form onSubmit={enviar} className="space-y-4">
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                Correo <span className="text-red-500">*</span>
              </span>
              <input
                type="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Tu dirección de correo electrónico"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                Nombre completo <span className="text-red-500">*</span>
              </span>
              <input
                type="text"
                required
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Tu respuesta"
              />
            </label>
          </section>

          {campos.map((campo) => (
            <section
              key={campo.key}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">{campo.label}</h2>
                {campo.requerido && <span className="text-red-500 text-sm">*</span>}
              </div>
              {campo.hint && <p className="mt-1 text-sm text-slate-600">{campo.hint}</p>}

              {campo.firmarOficial ? (
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={abrirFirmaAcuerdo}
                    disabled={busy || firmandoNda}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#7b3fa0] bg-[#7b3fa0] px-3 py-2 text-sm font-medium text-white hover:bg-[#6a3590] disabled:opacity-60"
                  >
                    {archivos.acuerdoConfidencialidad
                      ? 'Volver a firmar el acuerdo'
                      : 'Firmar acuerdo de confidencialidad'}
                  </button>
                  {archivos.acuerdoConfidencialidad && (
                    <p className="text-xs text-emerald-700">
                      Firmado: {archivos.acuerdoConfidencialidad.name}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    Se abre el texto oficial completo para leerlo y firmarlo en pantalla.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-xs text-slate-500">
                    Sube 1 archivo compatible. Tamaño máximo: 100 MB.
                  </p>
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-500 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => onFile(campo.key, e.target.files?.[0] || null)}
                    />
                    Añadir archivo
                  </label>
                  {archivos[campo.key] && (
                    <p className="mt-2 text-xs text-emerald-700 truncate">
                      Seleccionado: {archivos[campo.key].name}
                    </p>
                  )}
                </>
              )}
            </section>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[#7b3fa0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6a3590] disabled:opacity-60"
            >
              {busy ? 'Enviando…' : 'Enviar'}
            </button>
            <p className="text-xs text-slate-500">* Indica que la pregunta es obligatoria</p>
          </div>
        </form>
      </main>

      {mostrarFirmaNda && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="flex max-h-[95vh] w-full max-w-3xl flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Acuerdo de confidencialidad
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Documento oficial Grupo Proser · lea completo y firme al final
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setMostrarFirmaNda(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {cargandoNda ? (
                <p className="text-sm text-slate-600 py-8 text-center">Cargando acuerdo…</p>
              ) : (
                <>
                  <div
                    className="nda-preview max-h-[45vh] overflow-y-auto border border-slate-200 rounded-lg p-4 bg-slate-50 text-[13px] leading-relaxed text-slate-800 space-y-2 [&_.nda-parte]:my-3 [&_.nda-parte]:rounded-md [&_.nda-parte]:border [&_.nda-parte]:border-slate-200 [&_.nda-parte]:bg-white [&_.nda-parte]:p-3 [&_.nda-parte-titulo]:mb-2 [&_.nda-parte-titulo]:block [&_.nda-parte-titulo]:text-xs [&_.nda-parte-titulo]:font-semibold [&_.nda-parte-titulo]:uppercase [&_.nda-parte-titulo]:tracking-wide [&_.nda-parte-titulo]:text-slate-500 [&_p]:mb-2"
                    dangerouslySetInnerHTML={{ __html: ndaHtml }}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800 mb-2">Su firma</p>
                    <FirmaPad onChange={setFirmaNda} />
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3">
              <button
                type="button"
                className="rounded-lg border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setMostrarFirmaNda(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={cargandoNda || firmandoNda || !firmaNda}
                onClick={confirmarFirmaAcuerdo}
                className="rounded-lg bg-[#7b3fa0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6a3590] disabled:opacity-60"
              >
                {firmandoNda ? 'Guardando firma…' : 'Confirmar firma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
