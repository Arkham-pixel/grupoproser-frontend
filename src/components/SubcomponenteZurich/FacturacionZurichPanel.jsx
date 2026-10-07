import React, { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { BASE_URL, resolveUploadsUrl } from '../../config/apiConfig.js';
import { appendUploadFile } from '../../utils/sanitizeUploadFileName.js';
import {
  actualizarCasoZurich,
  marcarFacturarZurich,
  desmarcarFacturarZurich,
} from '../../services/zurichService.js';
import { actualizarCasoZurichListado } from '../../services/zurichListadoService.js';
import Facturacion from '../SubcomponenteCompex/Facturacion.jsx';
import { ZURICH_RAZON_SOCIAL_CONTROL_HORAS } from './zurichHelpers.js';
import TarifaZurichFacturacion from './TarifaZurichFacturacion.jsx';
import { puedeVerFacturacionZurich } from '../../config/gerentesFacturacion.js';
import {
  complexBtnPrimary,
  complexBtnSecondary,
  complexInfoPanel,
} from '../SubcomponenteCompex/complexFenixUi.js';
import { FaFileInvoiceDollar } from 'react-icons/fa';

const mapearFormAFacturacion = (form = {}, initialData = {}) => ({
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
  fchaInspccion: form.fechaInspeccion || form.fechaInspeccionado || '',
  nombreResponsable: form.ajustador || '',
  responsable: form.ajustador || '',
  nombreAseguradora: ZURICH_RAZON_SOCIAL_CONTROL_HORAS,
  nombreCliente: ZURICH_RAZON_SOCIAL_CONTROL_HORAS,
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

export default function FacturacionZurichPanel({
  form,
  setForm,
  initialData = null,
  origen = 'cat',
}) {
  const { t } = useTranslation();
  const esListado = origen === 'listado';
  const apiModulo = esListado ? 'zurich-listado' : 'zurich';
  const actualizarCaso = esListado ? actualizarCasoZurichListado : actualizarCasoZurich;
  const casoId = initialData?._id || form._id;
  const [guardandoPaquete, setGuardandoPaquete] = useState(false);
  const [marcandoFacturar, setMarcandoFacturar] = useState(false);
  const loginSesion =
    typeof localStorage !== 'undefined' ? localStorage.getItem('login') || '' : '';
  const puedeFacturar = puedeVerFacturacionZurich(loginSesion);
  const estadoFact = String(form.estadoFacturacion || '').toLowerCase();

  const formData = useMemo(() => mapearFormAFacturacion(form, initialData), [form, initialData]);

  const etiquetaEstadoFact = useMemo(() => {
    if (estadoFact === 'por_facturar') return 'Por facturar (en zona)';
    if (estadoFact === 'en_lote') return 'En lote / carpeta';
    if (estadoFact === 'facturado') return 'Facturado';
    return 'Sin marcar';
  }, [estadoFact]);

  const handleMarcarFacturar = useCallback(async () => {
    if (!casoId || !puedeFacturar) return;
    setMarcandoFacturar(true);
    try {
      const data = await marcarFacturarZurich({
        casoId,
        origen: esListado ? 'listado' : 'cat',
      });
      const next = data?.caso || {};
      setForm((prev) => ({
        ...prev,
        estadoFacturacion: next.estadoFacturacion || 'por_facturar',
        fechaMarcaFacturar: next.fechaMarcaFacturar || new Date().toISOString().slice(0, 10),
        tarifa_honorarios: next.honorarios ?? prev.tarifa_honorarios,
      }));
      alert('Caso marcado Facturar. Aparece suelto en la bandeja de facturación Zurich.');
    } catch (error) {
      alert(error.message || 'No se pudo marcar Facturar');
    } finally {
      setMarcandoFacturar(false);
    }
  }, [casoId, puedeFacturar, esListado, setForm]);

  const handleDesmarcarFacturar = useCallback(async () => {
    if (!casoId || !puedeFacturar) return;
    setMarcandoFacturar(true);
    try {
      await desmarcarFacturarZurich({
        casoId,
        origen: esListado ? 'listado' : 'cat',
      });
      setForm((prev) => ({
        ...prev,
        estadoFacturacion: null,
        fechaMarcaFacturar: '',
        loteFacturacionId: null,
      }));
    } catch (error) {
      alert(error.message || 'No se pudo desmarcar');
    } finally {
      setMarcandoFacturar(false);
    }
  }, [casoId, puedeFacturar, esListado, setForm]);

  const construirUrlArchivo = useCallback((valor) => {
    if (!valor) return '';
    if (typeof valor !== 'string') return '';
    if (valor.startsWith('data:')) return valor;
    return resolveUploadsUrl(valor) || '';
  }, []);

  const setFormData = useCallback(
    (updater) => {
      setForm((prev) => {
        const mapped = mapearFormAFacturacion(prev, initialData);
        const next = typeof updater === 'function' ? updater(mapped) : { ...mapped, ...updater };
        return { ...prev, ...next };
      });
    },
    [setForm, initialData]
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

  const persistirPaqueteTarifa = useCallback(
    async (paquete) => {
      if (!paquete?.honorarios && paquete?.honorarios !== 0) return false;
      const hoy = new Date().toISOString().slice(0, 10);
      const honorarios = Math.round(Number(paquete.honorarios));
      const payload = {
        paquete_facturacion: paquete,
        tarifa_rango_id: paquete.rangoId,
        tarifa_honorarios: honorarios,
        valor_servicio: honorarios,
        fecha_control_horas: form.fecha_control_horas || hoy,
      };
      setForm((prev) => ({
        ...prev,
        ...payload,
        fecha_control_horas: prev.fecha_control_horas || hoy,
      }));
      if (!casoId) return true;
      setGuardandoPaquete(true);
      try {
        await actualizarCaso(casoId, payload);
        return true;
      } catch (error) {
        console.error('❌ Error persistiendo tarifa Zurich:', error);
        alert(error.message || t('zurich.messages.saveError'));
        return false;
      } finally {
        setGuardandoPaquete(false);
      }
    },
    [actualizarCaso, casoId, form.fecha_control_horas, setForm, t]
  );

  const handleDocumentDrop = useCallback(
    async (tipoDocumento, campoFormData, acceptedFiles) => {
      if (!acceptedFiles?.length) return;
      const archivos = Array.from(acceptedFiles);
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
          alert(error.message || t('zurich.messages.saveError'));
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
    [apiModulo, construirUrlArchivo, setForm, t, updateHistorialDocs]
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
      let archivos = archivosDesdeHistorial(form.historialDocs, ['controlHoras'], construirUrlArchivo);
      if (archivos.length === 0 && form.adjunto_control_horas) {
        const adjuntos = String(form.adjunto_control_horas)
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean);
        archivos =
          adjuntos.length > 0
            ? adjuntos.map((nombre) => ({ nombre, ruta: '', url: '' }))
            : [];
      }

      const paquete = form.paquete_facturacion;
      const honorarios =
        paquete?.honorarios != null
          ? Math.round(Number(paquete.honorarios))
          : form.tarifa_honorarios != null
            ? Math.round(Number(form.tarifa_honorarios))
            : form.valor_servicio != null && form.valor_servicio !== ''
              ? Math.round(Number(form.valor_servicio))
              : null;

      if (honorarios == null) {
        alert('Aplique el paquete de tarifa Zurich antes de enviar.');
        return;
      }

      if (casoId) {
        await persistirPaqueteTarifa(
          paquete || {
            valorLiquidado: form.valorLiquidado,
            honorarios,
            rangoId: form.tarifa_rango_id || null,
            rangoLabel: '',
            fecha: form.fecha_control_horas || new Date().toISOString().slice(0, 10),
          }
        );
      }

      const resumenControlHoras = {
        total_horas: 0,
        valor_hora: 0,
        subtotal_honorarios: honorarios,
        gastos: Math.round(Number(form.valor_gastos) || 0),
        total: honorarios + Math.round(Number(form.valor_gastos) || 0),
        modo: 'tarifa_zurich',
        rangoId: paquete?.rangoId || form.tarifa_rango_id || null,
        rangoLabel: paquete?.rangoLabel || '',
        valorLiquidado: paquete?.valorLiquidado ?? form.valorLiquidado,
      };

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
          archivos: archivos.map((a) => a.nombre),
          archivosConRuta: archivos,
          controlHoras: null,
          resumenControlHoras,
          paqueteFacturacion: paquete || null,
          usuario,
          gerente: gerenteSeleccionado,
          casoId,
          origen: esListado ? 'listado' : 'cat',
        }),
      });
      const resultado = await response.json().catch(() => ({}));
      if (!response.ok || !resultado.success) {
        throw new Error(
          resultado.error || t('complex.ui.formulario_caso_complex.error_enviar_notificacion')
        );
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
      }
      if (resultado.copiaLider?.nombre) {
        mensaje += t('zurich.bandejaFacturacion.copiaLider', {
          nombre: resultado.copiaLider.nombre,
        });
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
      persistirPaqueteTarifa,
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
        throw new Error(
          resultado.error || t('complex.ui.formulario_caso_complex.error_enviar_notificacion')
        );
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
      if (resultado.copiaLider?.nombre) {
        mensaje += t('zurich.bandejaFacturacion.copiaLider', {
          nombre: resultado.copiaLider.nombre,
        });
      }
      alert(mensaje);
    },
    [apiModulo, casoId, construirUrlArchivo, esListado, form, initialData?.consecutivo, t]
  );

  return (
    <div className="space-y-4">
      <div className={`${complexInfoPanel} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <p className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
            <FaFileInvoiceDollar className="text-fenix-primario" />
            Facturar / Facturado
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Estado de facturación (aparte del estado del caso):{' '}
            <strong>{etiquetaEstadoFact}</strong>
            {estadoFact === 'facturado' && form.fechaMarcaFacturado
              ? ` · ${form.fechaMarcaFacturado}`
              : ''}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Facturar envía el caso solo a la zona; luego se agrupa en un lote/carpeta. Al cerrar el
            lote pasa a Facturado.
          </p>
        </div>
        {puedeFacturar && casoId && (
          <div className="flex flex-wrap gap-2">
            {!estadoFact || estadoFact === 'ninguno' ? (
              <button
                type="button"
                className={complexBtnPrimary}
                disabled={marcandoFacturar}
                onClick={handleMarcarFacturar}
              >
                {marcandoFacturar ? 'Marcando…' : 'Facturar'}
              </button>
            ) : null}
            {estadoFact === 'por_facturar' ? (
              <>
                <span className="inline-flex items-center rounded-md bg-sky-100 px-3 py-1.5 text-sm font-semibold text-sky-900">
                  Por facturar
                </span>
                <button
                  type="button"
                  className={complexBtnSecondary}
                  disabled={marcandoFacturar}
                  onClick={handleDesmarcarFacturar}
                >
                  Desmarcar
                </button>
              </>
            ) : null}
            {estadoFact === 'en_lote' ? (
              <span className="inline-flex items-center rounded-md bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-900">
                En lote
              </span>
            ) : null}
            {estadoFact === 'facturado' ? (
              <span className="inline-flex items-center rounded-md bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-800">
                Facturado
              </span>
            ) : null}
          </div>
        )}
      </div>

      <Facturacion
        formData={formData}
        setFormData={setFormData}
        nombreAseguradora={ZURICH_RAZON_SOCIAL_CONTROL_HORAS}
        handleChange={handleChange}
        getRootPropsFactura={dropzonePropsFactura.getRootProps}
        getInputPropsFactura={dropzonePropsFactura.getInputProps}
        isDragActiveFactura={dropzonePropsFactura.isDragActive}
        getRootPropsControlHoras={dropzonePropsControlHoras.getRootProps}
        getInputPropsControlHoras={dropzonePropsControlHoras.getInputProps}
        isDragActiveControlHoras={dropzonePropsControlHoras.isDragActive}
        onEnviarControlHoras={handleEnviarControlHoras}
        getRootPropsEvidencia={dropzonePropsEvidencia.getRootProps}
        getInputPropsEvidencia={dropzonePropsEvidencia.getInputProps}
        isDragActiveEvidencia={dropzonePropsEvidencia.isDragActive}
        getRootPropsSeguimientoEvidencia={dropzonePropsSeguimientoEvidencia.getRootProps}
        getInputPropsSeguimientoEvidencia={dropzonePropsSeguimientoEvidencia.getInputProps}
        isDragActiveSeguimientoEvidencia={dropzonePropsSeguimientoEvidencia.isDragActive}
        onEnviarGerencia={handleEnviarGerencia}
        historialDocs={form.historialDocs}
        updateHistorialDocs={updateHistorialDocs}
        modoCobroTarifa
        contenidoTarifa={
          <TarifaZurichFacturacion
            form={form}
            initialData={initialData}
            onAplicarPaquete={persistirPaqueteTarifa}
            guardando={guardandoPaquete}
          />
        }
      />
    </div>
  );
}
