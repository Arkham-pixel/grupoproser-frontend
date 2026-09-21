import React, { useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { BASE_URL, resolveUploadsUrl } from '../../config/apiConfig.js';
import { appendUploadFile } from '../../utils/sanitizeUploadFileName.js';
import Facturacion from '../SubcomponenteCompex/Facturacion.jsx';
import {
  calcularTotalesControlHoras,
  controlHorasTieneDatos,
} from '../SubcomponenteCompex/controlHoras/controlHorasUtils.js';

const mapearFormAFacturacion = (form = {}, initialData = {}, razonSocial = '') => ({
  ...form,
  _id: initialData?._id || form._id,
  nmroAjste: initialData?.consecutivo || form.consecutivo || '',
  nmroSinstro: form.siniestro || '',
  asgrBenfcro: form.asegurado || '',
  numDocumento: form.identificacion || '',
  nmroPolza: form.numeroPoliza || '',
  tipoPoliza: form.tipoPoliza || '',
  amprAfctdo: form.cobertura || form.causa || '',
  ciudadSiniestro: form.ciudad || '',
  fchaSinstro: form.fechaSiniestro || '',
  fchaAsgncion: form.fechaAsignacion || '',
  fchaInspccion: form.fechaInspeccion || form.fechaInspeccionado || form.fechaInspeccionRealizada || '',
  nombreResponsable: form.ajustador || '',
  responsable: form.ajustador || '',
  nombreAseguradora: razonSocial,
  nombreCliente: razonSocial,
});

const archivosDesdeHistorial = (historialDocs, tipos, construirUrlArchivo) =>
  (historialDocs || [])
    .filter((doc) => tipos.includes(doc.tipo) || tipos.includes(doc.categoria))
    .map((doc) => {
      let rutaRelativa = doc.ruta || '';
      if (!rutaRelativa && doc.url) {
        if (String(doc.url).startsWith('http')) {
          try {
            rutaRelativa = new URL(doc.url).pathname;
          } catch {
            rutaRelativa = doc.url;
          }
        } else {
          rutaRelativa = doc.url;
        }
      }
      if (
        rutaRelativa &&
        !rutaRelativa.startsWith('/uploads') &&
        !rutaRelativa.startsWith('uploads') &&
        !rutaRelativa.startsWith('/') &&
        !rutaRelativa.startsWith('s3:')
      ) {
        rutaRelativa = `/uploads/${rutaRelativa}`;
      }
      return {
        nombre: doc.nombre || doc.filename || 'Archivo sin nombre',
        ruta: rutaRelativa,
        url: doc.url || construirUrlArchivo(rutaRelativa),
      };
    });

export default function FacturacionAseguradoraPanel({
  form,
  setForm,
  initialData = null,
  origen = 'cat',
  apiModulo,
  actualizarCaso,
  razonSocial,
  tarifaBloqueada = false,
}) {
  const { t } = useTranslation();
  const esListado = origen === 'listado';
  const casoId = initialData?._id || form._id;

  const formData = useMemo(
    () => mapearFormAFacturacion(form, initialData, razonSocial),
    [form, initialData, razonSocial]
  );

  const construirUrlArchivo = useCallback((valor) => {
    if (!valor) return '';
    if (typeof valor !== 'string') return '';
    if (valor.startsWith('data:')) return valor;
    return resolveUploadsUrl(valor) || '';
  }, []);

  const setFormData = useCallback(
    (updater) => {
      setForm((prev) => {
        const mapped = mapearFormAFacturacion(prev, initialData, razonSocial);
        const next = typeof updater === 'function' ? updater(mapped) : { ...mapped, ...updater };
        return { ...prev, ...next };
      });
    },
    [setForm, initialData, razonSocial]
  );

  const handleChange = useCallback(
    (e) => {
      const name = e?.target?.name;
      if (!name) return;
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm((prev) => ({ ...prev, [name]: value }));
    },
    [setForm]
  );

  const updateHistorialDocs = useCallback(
    (updater) => {
      setForm((prev) => ({
        ...prev,
        historialDocs: typeof updater === 'function' ? updater(prev.historialDocs || []) : updater,
      }));
    },
    [setForm]
  );

  const persistirControlHorasEnServidor = useCallback(
    async (controlHoras, totales) => {
      if (!casoId || !controlHorasTieneDatos(controlHoras) || !actualizarCaso) return false;
      try {
        await actualizarCaso(casoId, {
          control_horas: controlHoras,
          fecha_control_horas:
            form.fecha_control_horas || new Date().toISOString().slice(0, 10),
          ...(totales?.subtotal_honorarios != null
            ? { valor_servicio: Math.round(totales.subtotal_honorarios) }
            : {}),
          ...(totales?.gastos != null ? { valor_gastos: Math.round(totales.gastos) } : {}),
        });
        return true;
      } catch (error) {
        console.error('❌ Error persistiendo control de horas:', error);
        return false;
      }
    },
    [casoId, actualizarCaso, form.fecha_control_horas]
  );

  const handleDocumentDrop = useCallback(
    async (tipoDocumento, campoFormData, acceptedFiles) => {
      if (!acceptedFiles?.length) return;
      const archivos = Array.from(acceptedFiles);

      if (tipoDocumento === 'controlHoras') {
        const docsActuales = Array.isArray(form.historialDocs) ? form.historialDocs : [];
        const docsControlHoras = docsActuales.filter(
          (doc) => doc?.tipo === 'controlHoras' || doc?.categoria === 'controlHoras'
        );
        const adjuntoTexto = String(form.adjunto_control_horas || '').trim();
        const yaTiene =
          docsControlHoras.length > 0 ||
          (adjuntoTexto && adjuntoTexto.toLowerCase() !== 'ninguno') ||
          controlHorasTieneDatos(form.control_horas);
        if (yaTiene) {
          const detalleDocs =
            docsControlHoras.length > 0
              ? `\n\nArchivos actuales (${docsControlHoras.length}):\n• ${docsControlHoras
                  .map((d) => d.nombre || 'sin nombre')
                  .join('\n• ')}`
              : controlHorasTieneDatos(form.control_horas)
                ? '\n\nYa existe un control de horas registrado en el sistema para este caso.'
                : '';
          const confirmar = window.confirm(
            'Este caso ya tiene un control de horas montado.' +
              detalleDocs +
              t('complex.ui.formulario_caso_complex.confirmar_otro_archivo')
          );
          if (!confirmar) return;
        }
      }

      const token = localStorage.getItem('token');
      const resultados = [];
      for (const file of archivos) {
        try {
          const formDataUpload = new FormData();
          appendUploadFile(formDataUpload, 'file', file, 'documento');
          const response = await fetch(`${BASE_URL}/api/${apiModulo}/upload`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: formDataUpload,
          });
          if (!response.ok) {
            const errorResp = await response.json().catch(() => ({}));
            throw new Error(errorResp.error || `Error subiendo archivo (${response.status})`);
          }
          const data = await response.json();
          const urlRelativa = data.url || data.ruta || '';
          const ahora = new Date();
          const fechaLocalISO = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(
            ahora.getDate()
          ).padStart(2, '0')}T${String(ahora.getHours()).padStart(2, '0')}:${String(
            ahora.getMinutes()
          ).padStart(2, '0')}:${String(ahora.getSeconds()).padStart(2, '0')}`;
          resultados.push({
            tipo: tipoDocumento,
            nombre: data.filename || file.name,
            url: construirUrlArchivo(urlRelativa) || data.data || '',
            ruta: urlRelativa || '',
            fechaSubida: fechaLocalISO,
            fecha: fechaLocalISO,
            tamano: file.size,
            tipoMime: file.type,
            usuario: localStorage.getItem('login') || localStorage.getItem('usuario') || 'unknown',
          });
        } catch (error) {
          console.error(`❌ Error subiendo archivo ${file.name}:`, error);
          alert(error.message || t('complex.ui.formulario_caso_complex.error_enviar_notificacion'));
        }
      }

      if (campoFormData && resultados.length) {
        setForm((prev) => {
          const nombres = resultados.map((r) => r.nombre).join(', ');
          const anterior = prev[campoFormData] || '';
          return {
            ...prev,
            [campoFormData]: anterior ? `${anterior}, ${nombres}` : nombres,
          };
        });
      }
      if (resultados.length) {
        updateHistorialDocs((prev) => [...(Array.isArray(prev) ? prev : []), ...resultados]);
      }
    },
    [apiModulo, construirUrlArchivo, form, setForm, t, updateHistorialDocs]
  );

  const dropzonePropsFactura = useDropzone({
    multiple: true,
    onDrop: (files) => handleDocumentDrop('factura', 'adjunto_factura', files),
  });
  const dropzonePropsControlHoras = useDropzone({
    multiple: true,
    onDrop: (files) => handleDocumentDrop('controlHoras', 'adjunto_control_horas', files),
  });
  const dropzonePropsEvidencia = useDropzone({
    multiple: true,
    onDrop: (files) => handleDocumentDrop('evidencia', 'adjunto_evidencia', files),
  });
  const dropzonePropsSeguimientoEvidencia = useDropzone({
    multiple: true,
    onDrop: (files) =>
      handleDocumentDrop('seguimientoEvidencia', 'adjunto_seguimiento_envio_control_horas', files),
  });

  const handleEnviarControlHoras = useCallback(
    async (gerenteSeleccionado) => {
      const token = localStorage.getItem('token');
      let archivosControlHoras = archivosDesdeHistorial(
        form.historialDocs,
        ['controlHoras'],
        construirUrlArchivo
      );
      if (archivosControlHoras.length === 0 && form.adjunto_control_horas) {
        const adjuntos = String(form.adjunto_control_horas)
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean);
        archivosControlHoras =
          adjuntos.length > 0
            ? adjuntos.map((nombre) => ({ nombre, ruta: '', url: '' }))
            : [{ nombre: 'Archivo de control de horas', ruta: '', url: '' }];
      }

      const tieneControlHorasEnSistema = Boolean(form.control_horas?.filas?.length);
      if (archivosControlHoras.length === 0 && !tieneControlHorasEnSistema) {
        alert(t('complex.ui.formulario_caso_complex.registre_control_horas'));
        return;
      }

      const resumenControlHoras = tieneControlHorasEnSistema
        ? calcularTotalesControlHoras(form.control_horas)
        : null;
      const sinNumero = t('complex.ui.formulario_caso_complex.sin_numero');
      const numeroCaso = initialData?.consecutivo || form.consecutivo || sinNumero;
      const usuario = localStorage.getItem('login') || localStorage.getItem('usuario') || 'unknown';

      const response = await fetch(`${BASE_URL}/api/${apiModulo}/notificaciones/control-horas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          numeroCaso,
          numeroSiniestro: form.siniestro,
          responsable: form.ajustador,
          archivos: archivosControlHoras.map((a) => a.nombre),
          archivosConRuta: archivosControlHoras,
          controlHoras: tieneControlHorasEnSistema ? form.control_horas : null,
          resumenControlHoras,
          usuario,
          gerente: gerenteSeleccionado,
          casoId,
          origen: esListado ? 'listado' : 'cat',
        }),
      });
      const resultado = await response.json().catch(() => ({}));
      if (!response.ok || !resultado.success) {
        throw new Error(resultado.error || t('complex.ui.formulario_caso_complex.error_enviar_notificacion'));
      }

      const nombreGerente =
        gerenteSeleccionado === 'elkin'
          ? 'Elkin Tapia Gutiérrez'
          : gerenteSeleccionado === 'iskharly'
            ? 'Iskharly José Tapia Gutierrez'
            : 'danalyst@proserpuertos.com.co (Prueba)';
      const emailEnviado = resultado.resultado?.destinatarioPrincipal || '';
      let mensaje = emailEnviado
        ? t('complex.ui.formulario_caso_complex.notificacion_enviada_email', {
            nombre: nombreGerente,
            email: emailEnviado,
          })
        : t('complex.ui.formulario_caso_complex.notificacion_enviada_ok', {
            nombre: nombreGerente,
          });
      if (resultado.envioRegistrado) {
        mensaje += t('complex.ui.formulario_caso_complex.registrado_bandeja');
      } else if (resultado.motivoNoRegistro === 'caso_no_encontrado') {
        mensaje += t('complex.ui.formulario_caso_complex.guarde_caso_bandeja');
      } else if (tieneControlHorasEnSistema && casoId) {
        const persistido = await persistirControlHorasEnServidor(form.control_horas, resumenControlHoras);
        if (!persistido) mensaje += t('complex.ui.formulario_caso_complex.correo_ok_no_guardo_horas');
      }
      alert(mensaje);
    },
    [
      apiModulo,
      casoId,
      construirUrlArchivo,
      esListado,
      form,
      initialData?.consecutivo,
      persistirControlHorasEnServidor,
      t,
    ]
  );

  const handleEnviarGerencia = useCallback(
    async (gerenteSeleccionado) => {
      const token = localStorage.getItem('token');
      let archivosEvidencia = archivosDesdeHistorial(
        form.historialDocs,
        ['evidencia'],
        construirUrlArchivo
      );
      if (archivosEvidencia.length === 0 && form.adjunto_evidencia) {
        const adjuntos = String(form.adjunto_evidencia)
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean);
        archivosEvidencia =
          adjuntos.length > 0
            ? adjuntos.map((nombre) => ({ nombre, ruta: '', url: '' }))
            : [{ nombre: 'Archivo de evidencia', ruta: '', url: '' }];
      }
      if (archivosEvidencia.length === 0) {
        alert(t('complex.ui.formulario_caso_complex.no_archivos_evidencia'));
        return;
      }
      const sinNumero = t('complex.ui.formulario_caso_complex.sin_numero');
      const numeroCaso = initialData?.consecutivo || form.consecutivo || sinNumero;
      const usuario = localStorage.getItem('login') || localStorage.getItem('usuario') || 'unknown';
      const response = await fetch(`${BASE_URL}/api/${apiModulo}/notificaciones/gerencia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          numeroCaso,
          numeroSiniestro: form.siniestro,
          responsable: form.ajustador,
          archivos: archivosEvidencia.map((a) => a.nombre),
          archivosConRuta: archivosEvidencia,
          usuario,
          gerente: gerenteSeleccionado,
          casoId,
          origen: esListado ? 'listado' : 'cat',
        }),
      });
      const resultado = await response.json().catch(() => ({}));
      if (!response.ok || !resultado.success) {
        throw new Error(resultado.error || t('complex.ui.formulario_caso_complex.error_enviar_notificacion'));
      }
      const nombreGerente =
        gerenteSeleccionado === 'adriana'
          ? 'Adriana Angulo Funes'
          : 'danalyst@proserpuertos.com.co (Prueba)';
      const emailEnviado = resultado.emailEnviado || resultado.resultado?.destinatarioPrincipal || '';
      let mensaje = emailEnviado
        ? t('complex.ui.formulario_caso_complex.notificacion_enviada_email', {
            nombre: nombreGerente,
            email: emailEnviado,
          })
        : t('complex.ui.formulario_caso_complex.notificacion_enviada_ok', {
            nombre: nombreGerente,
          });
      if (resultado.envioRegistrado) {
        mensaje += t('complex.ui.formulario_caso_complex.registrado_bandeja');
      } else if (resultado.motivoNoRegistro === 'caso_no_encontrado') {
        mensaje += t('complex.ui.formulario_caso_complex.guarde_caso_bandeja');
      }
      alert(mensaje);
    },
    [apiModulo, casoId, construirUrlArchivo, esListado, form, initialData?.consecutivo, t]
  );

  return (
    <Facturacion
      formData={formData}
      setFormData={setFormData}
      nombreAseguradora={razonSocial}
      handleChange={handleChange}
      getRootPropsFactura={dropzonePropsFactura.getRootProps}
      getInputPropsFactura={dropzonePropsFactura.getInputProps}
      isDragActiveFactura={dropzonePropsFactura.isDragActive}
      getRootPropsControlHoras={dropzonePropsControlHoras.getRootProps}
      getInputPropsControlHoras={dropzonePropsControlHoras.getInputProps}
      isDragActiveControlHoras={dropzonePropsControlHoras.isDragActive}
      onEnviarControlHoras={handleEnviarControlHoras}
      onPersistirControlHoras={persistirControlHorasEnServidor}
      getRootPropsEvidencia={dropzonePropsEvidencia.getRootProps}
      getInputPropsEvidencia={dropzonePropsEvidencia.getInputProps}
      isDragActiveEvidencia={dropzonePropsEvidencia.isDragActive}
      getRootPropsSeguimientoEvidencia={dropzonePropsSeguimientoEvidencia.getRootProps}
      getInputPropsSeguimientoEvidencia={dropzonePropsSeguimientoEvidencia.getInputProps}
      isDragActiveSeguimientoEvidencia={dropzonePropsSeguimientoEvidencia.isDragActive}
      onEnviarGerencia={handleEnviarGerencia}
      historialDocs={form.historialDocs}
      updateHistorialDocs={updateHistorialDocs}
      tarifaBloqueada={tarifaBloqueada}
    />
  );
}
