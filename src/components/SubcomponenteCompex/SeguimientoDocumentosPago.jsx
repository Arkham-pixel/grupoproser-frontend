import i18n from '../../i18n';
const t = i18n.t.bind(i18n);
import React, { useEffect, useRef, useState } from 'react';
import { FaCalendarAlt, FaCloudUploadAlt, FaFileAlt, FaMoneyCheckAlt, FaTrash } from 'react-icons/fa';
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

export const TIPO_SEGUIMIENTO_DOCUMENTOS_PAGO = 'seguimientoDocumentosPago';

const CFG = obtenerSeguimientoTrazabilidad(TIPO_SEGUIMIENTO_DOCUMENTOS_PAGO);
const DESTINATARIOS = CFG?.destinatarios || [];
const TIPOS_CORREO = CFG?.tiposCorreo || [];

function etiquetaDestinatario(value) {
  return DESTINATARIOS.find((d) => d.value === value)?.label || value || '—';
}

function etiquetaTipoCorreo(value) {
  return TIPOS_CORREO.find((d) => d.value === value)?.label || value || '—';
}

function parsearFechaDoc(doc) {
  if (doc.fecha && /^\d{4}-\d{2}-\d{2}$/.test(String(doc.fecha))) return doc.fecha;
  if (doc.fecha?.includes?.('T')) return doc.fecha.split('T')[0];
  if (doc.fechaSubida) return String(doc.fechaSubida).substring(0, 10);
  return '';
}

export default function SeguimientoDocumentosPago({
  historialDocs = [],
  updateHistorialDocs,
  formData,
  construirUrlArchivo,
}) {
  const [registros, setRegistros] = useState([]);
  const [nuevo, setNuevo] = useState({
    fecha: '',
    destinatario: 'intermediario',
    tipoCorreo: 'solicitud',
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
    tipoHistorial: TIPO_SEGUIMIENTO_DOCUMENTOS_PAGO,
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
          doc.tipo === TIPO_SEGUIMIENTO_DOCUMENTOS_PAGO ||
          doc.categoria === TIPO_SEGUIMIENTO_DOCUMENTOS_PAGO
      )
      .map((doc, index) => ({
        id: doc._id || doc.id || `seg-pago-${index}`,
        fecha: parsearFechaDoc(doc),
        destinatario: doc.destinatario || 'intermediario',
        tipoCorreo: doc.tipoCorreo || 'solicitud',
        observacion: doc.observacion || doc.comentario || '',
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
      alert(t('complex.ui.seguimiento_documentos_pago.no_descargar_url'));
      return;
    }
    const link = document.createElement('a');
    link.href = enlace;
    link.download = documento?.nombre || 'evidencia-correo-pago';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAgregar = async () => {
    const validacion = validarAltaSeguimiento(estadoProtocolo);
    if (!validacion.ok) {
      alert(validacion.mensaje);
      return;
    }
    if (!nuevo.fecha) {
      alert(t('complex.ui.seguimiento_documentos_pago.indique_fecha_correo'));
      return;
    }
    if (!nuevo.documento) {
      alert(t('complex.ui.seguimiento_documentos_pago.adjunte_evidencia'));
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
        throw new Error(errorResp.error || errorResp.message || t('complex.ui.seguimiento_documentos_pago.error_subiendo_archivo', { status: response.status }));
      }
      const data = await response.json();
      const rutaAlmacenamiento = data.url || data.ruta || '';
      if (!rutaAlmacenamiento) {
        throw new Error(t('complex.ui.seguimiento_documentos_pago.servidor_sin_ruta'));
      }
      documentoSubido = {
        nombre: data.filename || nuevo.documento.name,
        ruta: rutaAlmacenamiento,
        url: resolverUrl(rutaAlmacenamiento),
        tamano: nuevo.documento.size,
        tipoMime: nuevo.documento.type,
      };
    } catch (error) {
      alert(t('complex.ui.seguimiento_documentos_pago.error_subir_evidencia', { mensaje: error.message }));
      setSubiendo(false);
      return;
    }

    const fechaIngresada = nuevo.fecha;
    const observacionTexto =
      nuevo.observacion?.trim() ||
      `${t('complex.ui.seguimiento_documentos_pago.tipo_destinatario', { tipo: etiquetaTipoCorreo(nuevo.tipoCorreo), destinatario: etiquetaDestinatario(nuevo.destinatario) })}`;
    const ahora = new Date();
    const fechaSubidaISO = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}T${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}:${String(ahora.getSeconds()).padStart(2, '0')}`;

    if (updateHistorialDocs) {
      updateHistorialDocs((prev) => {
        const actual = Array.isArray(prev) ? prev : [];
        return [
          {
            tipo: TIPO_SEGUIMIENTO_DOCUMENTOS_PAGO,
            categoria: TIPO_SEGUIMIENTO_DOCUMENTOS_PAGO,
            fecha: fechaIngresada,
            fechaSubida: fechaSubidaISO,
            destinatario: nuevo.destinatario,
            tipoCorreo: nuevo.tipoCorreo,
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

    setRegistroLocal(true);
    resetFormulario();
    setSubiendo(false);
  };

  const resetFormulario = () => {
    setNuevo({
      fecha: '',
      destinatario: 'intermediario',
      tipoCorreo: 'solicitud',
      observacion: '',
      documento: null,
      documentoNombre: '',
    });
  };

  const handleEliminar = (id) => {
    if (!window.confirm(t('complex.ui.seguimiento_documentos_pago.confirmar_eliminar'))) return;
    if (!updateHistorialDocs) return;
    const eliminado = registros.find((r) => r.id === id);
    updateHistorialDocs((prev) =>
      (Array.isArray(prev) ? prev : []).filter((doc) => {
        if (
          doc.tipo !== TIPO_SEGUIMIENTO_DOCUMENTOS_PAGO &&
          doc.categoria !== TIPO_SEGUIMIENTO_DOCUMENTOS_PAGO
        ) {
          return true;
        }
        if (doc._id || doc.id) return (doc._id || doc.id) !== id;
        return !(
          parsearFechaDoc(doc) === eliminado?.fecha &&
          (doc.comentario || doc.observacion || '') === (eliminado?.observacion || '')
        );
      })
    );
    setRegistroLocal(true);
  };

  const ultimaFecha = registros[0]?.fecha || '';

  return (
    <div className="mt-4 space-y-5">
      <ProtocoloSeguimientoPanel cfg={CFG} estado={estadoProtocolo} />

      <p className={complexHint}>{t("complex.ui.seguimiento_documentos_pago.registre_la_evidencia_de_cada_correo_al_asegurado_interm")}{' '}
        <strong>{t("complex.ui.seguimiento_documentos_pago.guardar_caso")}</strong>{t("complex.ui.seguimiento_documentos_pago.para_persistir_en_mongodb")}</p>

      {registroLocal && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-body text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">{t("complex.ui.seguimiento_documentos_pago.registro_agregado_en_memoria_pulse")}<strong>{t("complex.ui.seguimiento_documentos_pago.guardar_caso")}</strong>{t("complex.ui.seguimiento_documentos_pago.para_persistir_en_mongodb")}</div>
      )}

      <div className={`${complexCard} space-y-4 p-4 sm:p-5`}>
        <h4 className={complexSubsectionTitle}>{t("complex.ui.seguimiento_documentos_pago.nuevo_correo_documentos_de_pago")}</h4>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.seguimiento_documentos_pago.fecha_del_correo")}<span className="text-fenix-primario">{t("complex.ui.seguimiento_documentos_pago.texto")}</span>
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
            <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.seguimiento_documentos_pago.destinatario")}<span className="text-fenix-primario">{t("complex.ui.seguimiento_documentos_pago.texto")}</span>
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
          <div>
            <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.seguimiento_documentos_pago.tipo_de_correo")}<span className="text-fenix-primario">{t("complex.ui.seguimiento_documentos_pago.texto")}</span>
            </label>
            <select
              value={nuevo.tipoCorreo}
              onChange={(e) => setNuevo((p) => ({ ...p, tipoCorreo: e.target.value }))}
              className={trazabilidadInputClass}
              disabled={subiendo}
            >
              {TIPOS_CORREO.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.seguimiento_documentos_pago.notas_del_seguimiento")}</label>
          <textarea
            value={nuevo.observacion}
            onChange={(e) => setNuevo((p) => ({ ...p, observacion: e.target.value }))}
            className={`${trazabilidadInputClass} min-h-[6rem] resize-y`}
            rows={4}
            placeholder={t("complex.ui.seguimiento_documentos_pago.documentos_solicitados_para_pago_estado_de_entrega_compr")}
            disabled={subiendo}
          />
        </div>

        <div>
          <label className={`${trazabilidadLabelClass} mb-2`}>{t("complex.ui.seguimiento_documentos_pago.evidencia_del_correo")}<span className="text-fenix-primario">{t("complex.ui.seguimiento_documentos_pago.texto")}</span>
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
                <FaCloudUploadAlt className="text-2xl" aria-hidden />{t("complex.ui.seguimiento_documentos_pago.arrastra_aqui_o_haz_clic_para_adjuntar_captura_pdf_o_cor")}</span>
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
            {subiendo ? t('complex.ui.seguimiento.subiendo_s3') : t('complex.ui.seguimiento_documentos_pago.agregar_seguimiento')}
          </button>
          <button
            type="button"
            className={complexBtnSecondary}
            onClick={resetFormulario}
            disabled={subiendo}
          >{t("complex.ui.seguimiento_documentos_pago.limpiar")}</button>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className={complexSubsectionTitle}>{t("complex.ui.seguimiento_documentos_pago.historial_de_correos_documentos_de_pago")}{registros.length}{t("complex.ui.seguimiento_documentos_pago.texto_2")}</h4>

        {registros.length === 0 ? (
          <div className={`${complexCard} p-6 text-center`}>
            <FaMoneyCheckAlt className="mx-auto mb-2 text-2xl text-gray-300 dark:text-gray-600" aria-hidden />
            <p className="font-body text-sm text-gray-500 dark:text-gray-400">{t("complex.ui.seguimiento_documentos_pago.sin_seguimientos_de_documentos_de_pago_registrados")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {registros.map((reg) => (
              <div
                key={reg.id}
                className={`${complexCard} flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between`}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1.5 font-body text-sm font-semibold text-gray-900 dark:text-white">
                      <FaCalendarAlt className="text-gray-400" aria-hidden />
                      {formatFechaLista(reg.fecha)}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-body text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {etiquetaDestinatario(reg.destinatario)}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-body text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {etiquetaTipoCorreo(reg.tipoCorreo)}
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
                  title={t("complex.ui.seguimiento_documentos_pago.eliminar_registro")}
                >
                  <FaTrash aria-hidden />
                  <span className="sr-only">{t("complex.ui.seguimiento_documentos_pago.eliminar")}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ResumenListaPanel titulo="Resumen — documentos de pago">
        <ResumenItem label={t("complex.ui.seguimiento_documentos_pago.total_correos_registrados")} value={registros.length} />
        <ResumenItem
          label={t("complex.ui.seguimiento_documentos_pago.intervalo_protocolo")}
          value={`${t('complex.ui.seguimiento_documentos_pago.dias_calendario', { n: estadoProtocolo?.intervaloDias ?? 15 })}`}
        />
        <ResumenItem
          label={t("complex.ui.seguimiento_documentos_pago.ultimo_seguimiento")}
          value={ultimaFecha ? formatFechaLista(ultimaFecha) : 'No registrado'}
        />
        <ResumenItem
          label={t("complex.ui.seguimiento_documentos_pago.envio_de_finiquito")}
          value={
            formData?.fchaEnvioFiniquito
              ? formatFechaLista(String(formData.fchaEnvioFiniquito).slice(0, 10))
              : t('complex.ui.seguimiento_documentos_pago.pendiente')
          }
        />
      </ResumenListaPanel>
    </div>
  );
}
