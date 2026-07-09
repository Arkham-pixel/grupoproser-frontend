import React, { useEffect, useRef, useState } from 'react';
import { FaCalendarAlt, FaCloudUploadAlt, FaEnvelope, FaFileAlt, FaTrash } from 'react-icons/fa';
import { BASE_URL } from '../../config/apiConfig.js';
import { appendUploadFile } from '../../utils/sanitizeUploadFileName.js';
import {
  complexBtnDanger,
  complexBtnPrimary,
  complexBtnSecondary,
  complexCard,
  complexDropzoneBase,
  complexHint,
  complexSubsectionTitle,
} from './complexFenixUi';
import { trazabilidadInputClass, trazabilidadLabelClass } from './trazabilidadFenixUi';
import {
  formatFechaLista,
  ResumenItem,
  ResumenListaPanel,
} from './seguimientoObservacionesFenixUi';
import { obtenerSeguimientoTrazabilidad } from '../../config/seguimientosTrazabilidadProtocolo.js';
import {
  evaluarSeguimientoProtocolo,
  validarAltaSeguimiento,
} from '../../utils/seguimientoProtocoloUtils.js';
import { useProtocoloSiniestros } from '../../hooks/useProtocoloSiniestros.js';
import ProtocoloSeguimientoPanel from './ProtocoloSeguimientoPanel.jsx';

export const TIPO_SEGUIMIENTO_DOCS_PENDIENTES = 'seguimientoDocsPendientes';

const CFG = obtenerSeguimientoTrazabilidad(TIPO_SEGUIMIENTO_DOCS_PENDIENTES);
const DESTINATARIOS = CFG?.destinatarios || [];

function etiquetaDestinatario(value) {
  return DESTINATARIOS.find((d) => d.value === value)?.label || value || '—';
}

function parsearFechaDoc(doc) {
  if (doc.fecha && /^\d{4}-\d{2}-\d{2}$/.test(String(doc.fecha))) return doc.fecha;
  if (doc.fecha?.includes?.('T')) return doc.fecha.split('T')[0];
  if (doc.fechaSubida) return String(doc.fechaSubida).substring(0, 10);
  return '';
}

function limpiarObservacion(texto) {
  if (!texto) return '';
  return String(texto)
    .replace(/^Destinatario:\s*[^—]+—\s*/i, '')
    .trim();
}

export default function SeguimientoDocumentosPendientes({
  historialDocs = [],
  updateHistorialDocs,
  handleChange,
  formData,
  construirUrlArchivo,
}) {
  const [registros, setRegistros] = useState([]);
  const [nuevo, setNuevo] = useState({
    fecha: '',
    destinatario: 'intermediario',
    observacion: '',
    documento: null,
    documentoNombre: '',
  });
  const [subiendo, setSubiendo] = useState(false);
  const [registroLocal, setRegistroLocal] = useState(false);
  const inputFileRef = useRef(null);
  const { protocolo } = useProtocoloSiniestros();

  const estadoProtocolo = evaluarSeguimientoProtocolo({
    formData,
    historialDocs,
    tipoHistorial: TIPO_SEGUIMIENTO_DOCS_PENDIENTES,
    protocolo,
  });

  const resolverUrl = (valor) => {
    if (!valor) return '';
    if (typeof construirUrlArchivo === 'function') return construirUrlArchivo(valor);
    return valor;
  };

  useEffect(() => {
    if (!Array.isArray(historialDocs)) {
      setRegistros([]);
      return;
    }
    const cargados = historialDocs
      .filter(
        (doc) =>
          doc.tipo === TIPO_SEGUIMIENTO_DOCS_PENDIENTES ||
          doc.categoria === TIPO_SEGUIMIENTO_DOCS_PENDIENTES
      )
      .map((doc, index) => ({
        id: doc._id || doc.id || `seg-docs-${index}`,
        fecha: parsearFechaDoc(doc),
        destinatario: doc.destinatario || 'intermediario',
        observacion: limpiarObservacion(doc.observacion || doc.comentario || ''),
        documento:
          doc.nombre || doc.url || doc.ruta
            ? {
                nombre: doc.nombre || '',
                url: doc.url || '',
                ruta: doc.ruta || doc.url || '',
              }
            : null,
      }))
      .filter((r) => r.fecha || r.observacion || r.documento)
      .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    setRegistros(cargados);
  }, [historialDocs]);

  const descargarDocumento = (documento) => {
    const enlace = resolverUrl(documento?.ruta || documento?.url || '');
    if (!enlace) {
      alert('No se puede descargar el archivo. URL no disponible.');
      return;
    }
    const link = document.createElement('a');
    link.href = enlace;
    link.download = documento?.nombre || 'evidencia-correo';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sincronizarUltimoSeguimiento = (fecha) => {
    if (!handleChange || !fecha || !CFG?.campoSyncFecha) return;
    handleChange({ target: { name: CFG.campoSyncFecha, value: fecha } });
  };

  const resetFormulario = () => {
    setNuevo({
      fecha: '',
      destinatario: 'intermediario',
      observacion: '',
      documento: null,
      documentoNombre: '',
    });
  };

  const handleAgregar = async () => {
    const validacion = validarAltaSeguimiento(estadoProtocolo);
    if (!validacion.ok) {
      alert(validacion.mensaje);
      return;
    }
    if (!nuevo.fecha) {
      alert('Indique la fecha del correo de seguimiento.');
      return;
    }
    if (!nuevo.documento) {
      alert('Adjunte la evidencia del correo enviado (captura, PDF o .eml).');
      return;
    }

    setSubiendo(true);
    let documentoSubido = null;
    try {
      const formDataUpload = new FormData();
      appendUploadFile(formDataUpload, 'file', nuevo.documento, 'documento');
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/complex/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formDataUpload,
      });
      if (!response.ok) {
        const errorResp = await response.json().catch(() => ({}));
        throw new Error(errorResp.error || errorResp.message || `Error subiendo archivo (${response.status})`);
      }
      const data = await response.json();
      const rutaAlmacenamiento = data.url || data.ruta || '';
      if (!rutaAlmacenamiento) {
        throw new Error('El servidor no devolvió la ruta del archivo (S3/local).');
      }
      documentoSubido = {
        nombre: data.filename || nuevo.documento.name,
        ruta: rutaAlmacenamiento,
        url: resolverUrl(rutaAlmacenamiento),
        tamano: nuevo.documento.size,
        tipoMime: nuevo.documento.type,
      };
    } catch (error) {
      alert(`Error al subir la evidencia: ${error.message}`);
      setSubiendo(false);
      return;
    }

    const fechaIngresada = nuevo.fecha;
    const observacionTexto =
      nuevo.observacion?.trim() || 'Seguimiento a documentación pendiente';
    const ahora = new Date();
    const fechaSubidaISO = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}T${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}:${String(ahora.getSeconds()).padStart(2, '0')}`;

    if (updateHistorialDocs) {
      updateHistorialDocs((prev) => {
        const actual = Array.isArray(prev) ? prev : [];
        return [
          {
            tipo: TIPO_SEGUIMIENTO_DOCS_PENDIENTES,
            categoria: TIPO_SEGUIMIENTO_DOCS_PENDIENTES,
            fecha: fechaIngresada,
            fechaSubida: fechaSubidaISO,
            destinatario: nuevo.destinatario,
            observacion: observacionTexto,
            comentario: observacionTexto,
            nombre: documentoSubido.nombre,
            ruta: documentoSubido.ruta,
            url: documentoSubido.url,
            tamano: documentoSubido.tamano,
            tipoMime: documentoSubido.tipoMime,
            usuario: localStorage.getItem('login') || 'unknown',
          },
          ...actual,
        ];
      });
    }

    sincronizarUltimoSeguimiento(fechaIngresada);
    setRegistroLocal(true);
    resetFormulario();
    setSubiendo(false);
  };

  const handleEliminar = (id) => {
    if (!window.confirm('¿Eliminar este registro de seguimiento documental?')) return;
    if (!updateHistorialDocs) return;
    const eliminado = registros.find((r) => r.id === id);
    updateHistorialDocs((prev) =>
      (Array.isArray(prev) ? prev : []).filter((doc) => {
        if (
          doc.tipo !== TIPO_SEGUIMIENTO_DOCS_PENDIENTES &&
          doc.categoria !== TIPO_SEGUIMIENTO_DOCS_PENDIENTES
        ) {
          return true;
        }
        if (doc._id || doc.id) return (doc._id || doc.id) !== id;
        return !(
          parsearFechaDoc(doc) === eliminado?.fecha &&
          limpiarObservacion(doc.comentario || doc.observacion || '') ===
            (eliminado?.observacion || '')
        );
      })
    );
    setRegistroLocal(true);
  };

  const ultimaFecha = registros[0]?.fecha || '';

  return (
    <div className="mt-4 space-y-5">
      <ProtocoloSeguimientoPanel cfg={CFG} estado={estadoProtocolo} />

      <p className={complexHint}>
        Adjunte la evidencia de cada correo enviado al asegurado, intermediario o reclamante. El archivo
        se almacena en S3; pulse <strong>Guardar caso</strong> para persistir en MongoDB.
      </p>

      {registroLocal && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-body text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          Registro agregado en memoria. Pulse <strong>Guardar caso</strong> para persistir en MongoDB.
        </div>
      )}

      {/* Formulario nuevo registro */}
      <div className={`${complexCard} space-y-4 p-4 sm:p-5`}>
        <h4 className={complexSubsectionTitle}>Nuevo correo de seguimiento</h4>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>
              Fecha del correo <span className="text-fenix-primario">*</span>
            </label>
            <input
              type="date"
              value={nuevo.fecha}
              onChange={(e) => setNuevo((p) => ({ ...p, fecha: e.target.value }))}
              className={trazabilidadInputClass}
              disabled={subiendo}
            />
          </div>
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>
              Destinatario <span className="text-fenix-primario">*</span>
            </label>
            <select
              value={nuevo.destinatario}
              onChange={(e) => setNuevo((p) => ({ ...p, destinatario: e.target.value }))}
              className={trazabilidadInputClass}
              disabled={subiendo}
            >
              {DESTINATARIOS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={`${trazabilidadLabelClass} mb-2`}>Notas del seguimiento</label>
          <textarea
            value={nuevo.observacion}
            onChange={(e) => setNuevo((p) => ({ ...p, observacion: e.target.value }))}
            className={`${trazabilidadInputClass} min-h-[6rem] resize-y`}
            rows={4}
            placeholder="Documentos solicitados, respuesta del asegurado, compromisos de entrega..."
            disabled={subiendo}
          />
        </div>

        <div>
          <label className={`${trazabilidadLabelClass} mb-2`}>
            Evidencia del correo <span className="text-fenix-primario">*</span>
          </label>
          <input
            ref={inputFileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.eml,.msg,image/*"
            className="hidden"
            disabled={subiendo}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setNuevo((p) => ({ ...p, documento: file, documentoNombre: file.name }));
              }
              e.target.value = '';
            }}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => !subiendo && inputFileRef.current?.click()}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !subiendo) {
                e.preventDefault();
                inputFileRef.current?.click();
              }
            }}
            className={`${complexDropzoneBase} cursor-pointer p-6 text-center transition-colors hover:border-gray-400 dark:hover:border-gray-500 ${
              subiendo ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            {nuevo.documentoNombre ? (
              <span className="inline-flex items-center justify-center gap-2 font-body text-sm font-medium text-gray-800 dark:text-gray-200">
                <FaFileAlt className="shrink-0 text-gray-500" aria-hidden />
                {nuevo.documentoNombre}
              </span>
            ) : (
              <span className="flex flex-col items-center gap-2 font-body text-sm text-gray-500 dark:text-gray-400">
                <FaCloudUploadAlt className="text-2xl" aria-hidden />
                Arrastra aquí o haz clic para adjuntar captura, PDF o correo (.eml)
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
          <button
            type="button"
            className={complexBtnPrimary}
            onClick={handleAgregar}
            disabled={subiendo}
          >
            {subiendo ? 'Subiendo a S3…' : 'Agregar seguimiento'}
          </button>
          <button
            type="button"
            className={complexBtnSecondary}
            onClick={resetFormulario}
            disabled={subiendo}
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Historial */}
      <div className="space-y-3">
        <h4 className={complexSubsectionTitle}>
          Historial de correos ({registros.length})
        </h4>

        {registros.length === 0 ? (
          <div className={`${complexCard} p-6 text-center`}>
            <FaEnvelope className="mx-auto mb-2 text-2xl text-gray-300 dark:text-gray-600" aria-hidden />
            <p className="font-body text-sm text-gray-500 dark:text-gray-400">
              Sin seguimientos documentales registrados.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {registros.map((reg) => (
              <div
                key={reg.id}
                className={`${complexCard} flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between`}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="inline-flex items-center gap-1.5 font-body text-sm font-semibold text-gray-900 dark:text-white">
                      <FaCalendarAlt className="text-gray-400" aria-hidden />
                      {formatFechaLista(reg.fecha)}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-body text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {etiquetaDestinatario(reg.destinatario)}
                    </span>
                  </div>
                  {reg.observacion && (
                    <p className="font-body text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                      {reg.observacion}
                    </p>
                  )}
                  {reg.documento?.nombre && (
                    <button
                      type="button"
                      onClick={() => descargarDocumento(reg.documento)}
                      className="inline-flex max-w-full items-center gap-1.5 font-body text-sm font-semibold text-gray-800 underline decoration-gray-300 underline-offset-2 hover:text-gray-900 dark:text-gray-200"
                    >
                      <FaFileAlt className="shrink-0 text-gray-500" aria-hidden />
                      <span className="truncate">{reg.documento.nombre}</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className={`${complexBtnDanger} shrink-0`}
                  onClick={() => handleEliminar(reg.id)}
                  title="Eliminar registro"
                >
                  <FaTrash aria-hidden />
                  <span className="sr-only">Eliminar</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ResumenListaPanel titulo="Resumen — seguimiento documental">
        <ResumenItem label="Total correos registrados:" value={registros.length} />
        <ResumenItem
          label="Intervalo protocolo:"
          value={`${estadoProtocolo?.intervaloDias ?? 15} días calendario`}
        />
        <ResumenItem
          label="Último seguimiento:"
          value={ultimaFecha ? formatFechaLista(ultimaFecha) : 'No registrado'}
        />
        <ResumenItem
          label="Acreditación (fchaRepoActi):"
          value={
            formData?.fchaRepoActi
              ? formatFechaLista(String(formData.fchaRepoActi).slice(0, 10))
              : 'Pendiente'
          }
        />
      </ResumenListaPanel>
    </div>
  );
}
