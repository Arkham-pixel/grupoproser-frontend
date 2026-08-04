import i18n from '../../i18n';
const t = i18n.t.bind(i18n);
import { useTranslation } from 'react-i18next';
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  FaClock,
  FaPaperPlane,
  FaCheckCircle,
  FaFileInvoiceDollar,
  FaFileInvoice,
  FaEdit,
  FaFileExcel,
  FaFileUpload,
} from 'react-icons/fa';
import ControlHorasEditor from './ControlHorasEditor';
import {
  calcularTotalesControlHoras,
  controlHorasTieneDatos,
  formatearMoneda,
} from './controlHoras/controlHorasUtils';
import { generarControlHorasExcel, descargarBlob } from './controlHoras/generarControlHorasExcel';
import { importarControlHorasDesdeArchivo } from './controlHoras/importarControlHorasExcel';
import { BASE_URL, getUploadsUrlCandidates } from '../../config/apiConfig.js';
import {
  complexScope,
  complexPageWrap,
  complexCard,
  complexSectionTitle,
  complexInfoPanel,
  complexBtnPrimary,
  complexBtnSecondary,
} from './complexFenixUi';
import {
  SeccionAcordeon,
  Campo,
  InputFenix,
  SelectFenix,
  TextareaFenix,
  DropzoneFenix,
  ListaDocumentos,
  BotonEnviar,
  complexAccordionWrap,
} from './FacturacionHelpers';
import { ComplexAvisoModal } from './ComplexUiBlocks';

export default function Facturacion({
  formData,
  setFormData,
  nombreAseguradora = '',
  handleChange,
  getRootPropsFactura,
  getInputPropsFactura,
  isDragActiveFactura,
  getRootPropsControlHoras,
  getInputPropsControlHoras,
  isDragActiveControlHoras,
  onEnviarControlHoras,
  onPersistirControlHoras,
  getRootPropsEvidencia,
  getInputPropsEvidencia,
  isDragActiveEvidencia,
  onEnviarGerencia,
  getRootPropsSeguimientoEvidencia,
  getInputPropsSeguimientoEvidencia,
  isDragActiveSeguimientoEvidencia,
  historialDocs,
  updateHistorialDocs,
}) {
  const { t } = useTranslation();
  const [enviando, setEnviando] = useState(false);
  const [enviandoGerencia, setEnviandoGerencia] = useState(false);
  const [controlHorasAbierto, setControlHorasAbierto] = useState(true);
  const [editorControlHorasAbierto, setEditorControlHorasAbierto] = useState(false);
  const [avisoGuardarCaso, setAvisoGuardarCaso] = useState(false);
  const [avisoCatalogoEmail, setAvisoCatalogoEmail] = useState({ open: false, mensaje: '' });
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [importandoExcel, setImportandoExcel] = useState(false);
  const inputExcelControlHorasRef = useRef(null);
  const [envioControlHorasAbierto, setEnvioControlHorasAbierto] = useState(false);
  const [seguimientoAbierto, setSeguimientoAbierto] = useState(false);
  const [facturacionAbierto, setFacturacionAbierto] = useState(false);

  const construirUrlDescarga = useCallback((valor) => {
    if (!valor) return '';
    if (typeof valor !== 'string') return '';
    if (valor.startsWith('data:')) return valor;
    return getUploadsUrlCandidates(valor)[0] || '';
  }, []);

  const descargarDocumento = useCallback(
    (documento, event) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      const enlace = construirUrlDescarga(
        documento?.url || documento?.ruta || documento?.path || documento?.data || ''
      );
      if (!enlace) {
        alert(t('complex.ui.facturacion.no_descargar_url'));
        return false;
      }
      const link = document.createElement('a');
      link.href = enlace;
      link.download = documento?.nombre || documento?.filename || 'documento';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return false;
    },
    [construirUrlDescarga]
  );

  const eliminarDocumento = useCallback(
    (documento, tipo) => {
      if (
        !window.confirm(
          t('complex.ui.facturacion.confirmar_eliminar_documento', { nombre: documento.nombre || documento.filename || t('complex.ui.facturacion.este_documento') })
        )
      ) {
        return;
      }
      if (updateHistorialDocs) {
        updateHistorialDocs((prev) => {
          const actual = Array.isArray(prev) ? prev : [];
          return actual.filter((doc) => {
            if (doc.tipo !== tipo && doc.categoria !== tipo) return true;
            if ((doc._id || doc.id) && (documento._id || documento.id)) {
              return (doc._id || doc.id) !== (documento._id || documento.id);
            }
            const nombreDoc = doc.nombre || doc.filename || '';
            const nombreEliminar = documento.nombre || documento.filename || '';
            const rutaDoc = doc.ruta || doc.url || '';
            const rutaEliminar = documento.ruta || documento.url || '';
            return !(nombreDoc === nombreEliminar && rutaDoc === rutaEliminar);
          });
        });
      }
    },
    [updateHistorialDocs]
  );

  const obtenerDocumentosPorTipo = useCallback(
    (tipo) => {
      if (!historialDocs || !Array.isArray(historialDocs)) return [];
      return historialDocs.filter((doc) => doc.tipo === tipo || doc.categoria === tipo);
    },
    [historialDocs]
  );

  const documentosControlHoras = obtenerDocumentosPorTipo('controlHoras');

  const tieneControlHorasGuardado = controlHorasTieneDatos(formData.control_horas);

  const tieneDocumentosControlHoras =
    documentosControlHoras.length > 0 ||
    (formData.adjunto_control_horas && formData.adjunto_control_horas !== 'Ninguno');

  const puedeEnviarNotificacionControlHoras =
    tieneControlHorasGuardado || tieneDocumentosControlHoras;

  const resumenControlHoras = useMemo(() => {
    if (!tieneControlHorasGuardado) return null;
    return calcularTotalesControlHoras(formData.control_horas);
  }, [formData.control_horas, tieneControlHorasGuardado]);

  const handleGuardarControlHoras = useCallback(
    async (normalizado, totales, meta = {}) => {
      if (!setFormData) return;
      const hoy = new Date().toISOString().slice(0, 10);
      const emailAnalista = String(meta.emailAnalista || '').trim();

      setFormData((prev) => ({
        ...prev,
        control_horas: normalizado,
        valor_servicio: Math.round(totales.subtotal_honorarios || 0),
        valor_gastos: Math.round(totales.gastos || 0),
        fecha_control_horas: prev.fecha_control_horas || hoy,
        ...(emailAnalista
          ? {
              emailFuncionarioAseguradora: emailAnalista,
              emailAnalista,
            }
          : {}),
      }));

      if (emailAnalista) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${BASE_URL}/api/funcionarios-aseguradora/actualizar-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              email: emailAnalista,
              codiAsgrdra: formData.codiAsgrdra,
              funcAsgrdra: formData.funcAsgrdra,
              funcAsgrdraNombre: formData.funcAsgrdraNombre || formData.funcionarioAseguradora,
              nmbrContcto: formData.funcAsgrdraNombre || formData.funcionarioAseguradora,
            }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            setAvisoCatalogoEmail({
              open: true,
              mensaje:
                data.error ||
                t('complex.ui.facturacion.control_guardado_correo_fallo'),
            });
          }
        } catch (error) {
          console.warn('⚠️ Error guardando correo del analista en catálogo:', error);
          setAvisoCatalogoEmail({
            open: true,
            mensaje:
              t('complex.ui.facturacion.control_guardado_correo_fallo'),
          });
        }
      }

      setAvisoGuardarCaso(true);

      if (onPersistirControlHoras) {
        await onPersistirControlHoras(normalizado, totales);
      }
    },
    [
      setFormData,
      onPersistirControlHoras,
      formData.codiAsgrdra,
      formData.funcAsgrdra,
      formData.funcAsgrdraNombre,
      formData.funcionarioAseguradora,
    ]
  );

  const handleImportarExcelControlHoras = useCallback(
    async (evento) => {
      const archivo = evento.target.files?.[0];
      evento.target.value = '';
      if (!archivo || !setFormData) return;

      if (
        tieneControlHorasGuardado &&
        !window.confirm(
          t('complex.ui.facturacion.reemplazar_control_excel')
        )
      ) {
        return;
      }

      setImportandoExcel(true);
      try {
        const { normalizado, totales, mensaje, advertencias } =
          await importarControlHorasDesdeArchivo(archivo, {
            formData,
            nombreAseguradora,
          });
        handleGuardarControlHoras(normalizado, totales);
        const partes = [mensaje, ...(advertencias || [])].filter(Boolean);
        alert(partes.join('\n\n'));
      } catch (error) {
        console.error('Importar control de horas:', error);
        alert(
          error?.message ||
            t('complex.ui.facturacion.no_leer_excel')
        );
      } finally {
        setImportandoExcel(false);
      }
    },
    [
      formData,
      nombreAseguradora,
      setFormData,
      tieneControlHorasGuardado,
      handleGuardarControlHoras,
      t,
    ]
  );

  const handleExportarExcelControlHoras = useCallback(async () => {
    if (!tieneControlHorasGuardado) {
      alert(t('complex.ui.facturacion.guarde_control_antes_exportar'));
      return;
    }
    setExportandoExcel(true);
    try {
      const { blob, nombre } = await generarControlHorasExcel({
        formData,
        controlHoras: formData.control_horas,
        nombreAseguradora,
      });
      descargarBlob(blob, nombre);
    } catch (e) {
      console.error(e);
      alert(t('complex.ui.facturacion.no_generar_excel'));
    } finally {
      setExportandoExcel(false);
    }
  }, [formData, nombreAseguradora, tieneControlHorasGuardado, t]);
  const documentosFactura = obtenerDocumentosPorTipo('factura');
  const documentosEvidencia = obtenerDocumentosPorTipo('evidencia');
  const documentosSeguimientoEvidencia = obtenerDocumentosPorTipo('seguimientoEvidencia');

  const hintArchivos = (valor) =>
    t('complex.ui.facturacion.archivos_seleccionados', {
      valor: valor || t('complex.ui.facturacion.ninguno'),
    });

  return (
    <div className={`${complexScope} ${complexPageWrap}`}>
      <h2 className={complexSectionTitle}>
        <FaFileInvoice className="text-fenix-primario" />{t("complex.ui.facturacion.facturacion")}</h2>

      {/* Valores principales */}
      <div className={complexCard}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label={t("complex.ui.facturacion.numero_de_factura")}>
            <InputFenix
              type="number"
              name="numero_factura"
              value={formData.numero_factura ?? ''}
              onChange={handleChange}
            />
          </Campo>
          <Campo label={t("complex.ui.facturacion.valor_servicios")}>
            <InputFenix
              type="number"
              name="valor_servicio"
              value={formData.valor_servicio ?? ''}
              onChange={handleChange}
            />
          </Campo>
          <Campo label={t("complex.ui.facturacion.valor_gastos")}>
            <InputFenix
              type="number"
              name="valor_gastos"
              value={formData.valor_gastos ?? ''}
              onChange={handleChange}
            />
          </Campo>
          <Campo label={t("complex.ui.facturacion.fecha_ultima_revision")}>
            <InputFenix
              type="date"
              name="fecha_ultima_revision"
              value={formData.fecha_ultima_revision || ''}
              onChange={handleChange}
            />
          </Campo>
        </div>
      </div>

      <div className={complexAccordionWrap}>
        {/* Control de Horas */}
        <SeccionAcordeon
          abierto={controlHorasAbierto}
          onToggle={() => setControlHorasAbierto(!controlHorasAbierto)}
          icon={FaClock}
          titulo={t('complex.ui.facturacion.control_de_horas')}
          subtitulo={t('complex.ui.facturacion.fase1_liquidacion')}
        >
          <div className={complexInfoPanel}>
            <p className="mb-3 font-body text-base text-gray-600 dark:text-gray-400">{t("complex.ui.facturacion.un_control_de_horas_por_caso_puede_crearlo_en_el_sistema")}</p>
            {resumenControlHoras ? (
              <div className="mb-4 grid grid-cols-2 gap-2 text-base sm:grid-cols-4">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">{t("complex.ui.facturacion.total_horas")}</span>
                  <p className="text-lg font-semibold text-fenix-primario">
                    {resumenControlHoras.total_horas.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">{t("complex.ui.facturacion.valor_hora")}</span>
                  <p className="text-lg font-semibold">{formatearMoneda(resumenControlHoras.valor_hora)}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">{t("complex.ui.facturacion.honorarios")}</span>
                  <p className="text-lg font-semibold">
                    {formatearMoneda(resumenControlHoras.subtotal_honorarios)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">{t("complex.ui.facturacion.total_liquidacion")}</span>
                  <p className="text-lg font-semibold">{formatearMoneda(resumenControlHoras.total)}</p>
                </div>
              </div>
            ) : (
              <p className="mb-4 text-base italic text-gray-500 dark:text-gray-400">{t("complex.ui.facturacion.aun_no_hay_control_de_horas_registrado_para_este_caso")}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditorControlHorasAbierto(true)}
                className={complexBtnPrimary}
                style={{ width: 'auto' }}
              >
                <FaEdit />
                {tieneControlHorasGuardado
                  ? t('complex.ui.facturacion.editar_control_horas')
                  : t('complex.ui.facturacion.realizar_control_horas')}
              </button>
              <button
                type="button"
                disabled={importandoExcel}
                onClick={() => inputExcelControlHorasRef.current?.click()}
                className={complexBtnSecondary}
              >
                <FaFileUpload className="text-fenix-primario" />
                {importandoExcel
                  ? t('complex.ui.facturacion.leyendo_excel')
                  : t('complex.ui.facturacion.importar_desde_excel')}
              </button>
              <button
                type="button"
                disabled={!tieneControlHorasGuardado || exportandoExcel}
                onClick={handleExportarExcelControlHoras}
                className={complexBtnSecondary}
              >
                <FaFileExcel className="text-green-700" />
                {exportandoExcel ? t('complex.ui.facturacion.generando') : t('complex.ui.facturacion.descargar_excel')}
              </button>
              <input
                ref={inputExcelControlHorasRef}
                type="file"
                accept=".xlsx,.xlsm"
                className="hidden"
                onChange={handleImportarExcelControlHoras}
              />
            </div>
          </div>

          <Campo label={t("complex.ui.facturacion.fecha_de_control_de_horas")}>
            <InputFenix
              type="date"
              name="fecha_control_horas"
              value={formData.fecha_control_horas || ''}
              onChange={handleChange}
            />
          </Campo>

          <Campo label={t("complex.ui.facturacion.documentos_de_control_de_horas")}>
            <DropzoneFenix
              getRootProps={getRootPropsControlHoras}
              getInputProps={getInputPropsControlHoras}
              isDragActive={isDragActiveControlHoras}
              hint={hintArchivos(formData.adjunto_control_horas)}
            />
          </Campo>

          <ListaDocumentos
            titulo={t('complex.ui.facturacion.documentos_subidos')}
            documentos={documentosControlHoras}
            onDescargar={descargarDocumento}
            onEliminar={eliminarDocumento}
            tipoEliminar="controlHoras"
          />

          <Campo label={t("complex.ui.facturacion.enviar_notificacion_a")}>
            <SelectFenix
              name="gerente_control_horas"
              value={formData.gerente_control_horas || ''}
              onChange={handleChange}
            >
              <option value="">{t("complex.ui.facturacion.seleccione_un_gerente")}</option>
              <option value="elkin">{t("complex.ui.facturacion.elkin_tapia_gutierrez")}</option>
              <option value="iskharly">{t("complex.ui.facturacion.iskharly_jose_tapia_gutierrez")}</option>
              <option value="test">{t("complex.ui.facturacion.prueba_danalyst_proserpuertos_com_co")}</option>
            </SelectFenix>
          </Campo>

          {formData.gerente_control_horas && (
            <BotonEnviar
              disabled={enviando || !formData.gerente_control_horas}
              enviando={enviando}
              onClick={async () => {
                if (!puedeEnviarNotificacionControlHoras) {
                  alert(
                    t('complex.ui.facturacion.registre_control_antes_notificar')
                  );
                  return;
                }
                if (!formData.fecha_control_horas) {
                  alert(t('complex.ui.facturacion.indique_fecha_control'));
                  return;
                }
                const filasSinFecha = (formData.control_horas?.filas || []).filter((fila) => {
                  const horas =
                    Number(fila.horas_viaje || 0) +
                    Number(fila.horas_campo || 0) +
                    Number(fila.horas_oficina || 0) +
                    Number(fila.horas_secretaria || 0);
                  const tieneDesc = String(fila.descripcion || '').trim() !== '';
                  if (horas <= 0 && !tieneDesc) return false;
                  return !String(fila.fecha || '').trim();
                });
                if (filasSinFecha.length > 0) {
                  alert(
                    t('complex.ui.facturacion.actividades_sin_fecha')
                  );
                  return;
                }
                setEnviando(true);
                try {
                  if (onEnviarControlHoras) {
                    await onEnviarControlHoras(formData.gerente_control_horas);
                  }
                } catch (error) {
                  console.error('Error enviando notificación:', error);
                  alert(t('complex.ui.facturacion.error_enviar_notificacion'));
                } finally {
                  setEnviando(false);
                }
              }}
            >
              {enviando
                ? t('complex.ui.facturacion.enviando')
                : t('complex.ui.facturacion.enviar_control_horas_gerente')}
            </BotonEnviar>
          )}
        </SeccionAcordeon>

        {/* Envío de Control de Horas */}
        <SeccionAcordeon
          abierto={envioControlHorasAbierto}
          onToggle={() => setEnvioControlHorasAbierto(!envioControlHorasAbierto)}
          icon={FaPaperPlane}
          titulo={t('complex.ui.facturacion.envio_control_horas')}
          subtitulo={t('complex.ui.facturacion.fase2_evidencia')}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Campo label={t("complex.ui.facturacion.fecha_de_envio")}>
              <InputFenix
                type="date"
                name="fecha_envio_control_horas"
                value={formData.fecha_envio_control_horas || ''}
                onChange={handleChange}
              />
            </Campo>
            <Campo label={t("complex.ui.facturacion.fecha_de_recibido")}>
              <InputFenix
                type="date"
                name="fecha_recibido_control_horas"
                value={formData.fecha_recibido_control_horas || ''}
                onChange={handleChange}
              />
            </Campo>
          </div>

          <Campo label={t("complex.ui.facturacion.adjunto_de_evidencia")}>
            <DropzoneFenix
              getRootProps={getRootPropsEvidencia}
              getInputProps={getInputPropsEvidencia}
              isDragActive={isDragActiveEvidencia}
              hint={hintArchivos(formData.adjunto_evidencia)}
            />
          </Campo>

          <ListaDocumentos
            titulo={t('complex.ui.facturacion.documentos_subidos')}
            documentos={documentosEvidencia}
            onDescargar={descargarDocumento}
            onEliminar={eliminarDocumento}
            tipoEliminar="evidencia"
          />

          <Campo label={t("complex.ui.facturacion.enviar_notificacion_a")}>
            <SelectFenix
              name="gerente_gerencia"
              value={formData.gerente_gerencia || ''}
              onChange={handleChange}
            >
              <option value="">{t("complex.ui.facturacion.seleccione_un_gerente")}</option>
              <option value="adriana">{t("complex.ui.facturacion.adriana_angulo_funes_facturacion_ajustes_proserpuertos_c")}</option>
              <option value="test">{t("complex.ui.facturacion.prueba_danalyst_proserpuertos_com_co")}</option>
            </SelectFenix>
          </Campo>

          {formData.gerente_gerencia && (
            <BotonEnviar
              disabled={enviandoGerencia || !formData.gerente_gerencia}
              enviando={enviandoGerencia}
              onClick={async () => {
                if (
                  !formData.adjunto_evidencia ||
                  formData.adjunto_evidencia === 'Ninguno' ||
                  formData.adjunto_evidencia === t('complex.ui.facturacion.ninguno')
                ) {
                  alert(t('complex.ui.facturacion.subir_evidencia_primero'));
                  return;
                }
                setEnviandoGerencia(true);
                try {
                  if (onEnviarGerencia) {
                    await onEnviarGerencia(formData.gerente_gerencia);
                  }
                } catch (error) {
                  console.error('Error enviando notificación:', error);
                  alert(t('complex.ui.facturacion.error_enviar_notificacion'));
                } finally {
                  setEnviandoGerencia(false);
                }
              }}
            >
              {enviandoGerencia
                ? t('complex.ui.facturacion.enviando')
                : t('complex.ui.facturacion.enviar_a_gerencia')}
            </BotonEnviar>
          )}
        </SeccionAcordeon>

        {/* Autorización */}
        <SeccionAcordeon
          abierto={seguimientoAbierto}
          onToggle={() => setSeguimientoAbierto(!seguimientoAbierto)}
          icon={FaCheckCircle}
          titulo={t('complex.ui.facturacion.autorizacion')}
          subtitulo={t('complex.ui.facturacion.fechas_comentarios_docs_autorizacion')}
        >
          <Campo label={t("complex.ui.facturacion.fecha_de_autorizacion")}>
            <InputFenix
              type="date"
              name="fecha_seguimiento_envio_control_horas"
              value={formData.fecha_seguimiento_envio_control_horas || ''}
              onChange={handleChange}
            />
          </Campo>

          <Campo label={t("complex.ui.facturacion.comentarios_de_autorizacion")}>
            <TextareaFenix
              name="observacion_seguimiento_envio_control_horas"
              value={formData.observacion_seguimiento_envio_control_horas || ''}
              onChange={handleChange}
              rows={4}
              placeholder={t("complex.ui.facturacion.ingrese_los_comentarios_de_autorizacion")}
            />
          </Campo>

          <Campo label={t("complex.ui.facturacion.adjunto_de_documentos_de_autorizacion")}>
            <DropzoneFenix
              getRootProps={getRootPropsSeguimientoEvidencia}
              getInputProps={getInputPropsSeguimientoEvidencia}
              isDragActive={isDragActiveSeguimientoEvidencia}
              hint={hintArchivos(formData.adjunto_seguimiento_envio_control_horas)}
            />
          </Campo>

          <ListaDocumentos
            titulo={t('complex.ui.facturacion.documentos_subidos')}
            documentos={documentosSeguimientoEvidencia}
            onDescargar={descargarDocumento}
            onEliminar={eliminarDocumento}
            tipoEliminar="seguimientoEvidencia"
          />
        </SeccionAcordeon>

        {/* Facturación (documentos) */}
        <SeccionAcordeon
          abierto={facturacionAbierto}
          onToggle={() => setFacturacionAbierto(!facturacionAbierto)}
          icon={FaFileInvoiceDollar}
          titulo={t('complex.ui.facturacion.facturacion')}
          subtitulo={t('complex.ui.facturacion.documentos_y_fechas_facturacion')}
        >
          <Campo label={t("complex.ui.facturacion.fecha_de_factura")}>
            <InputFenix
              type="date"
              name="fecha_factura"
              value={formData.fecha_factura || ''}
              onChange={handleChange}
            />
          </Campo>

          <Campo label={t("complex.ui.facturacion.adjunto_factura")}>
            <DropzoneFenix
              getRootProps={getRootPropsFactura}
              getInputProps={getInputPropsFactura}
              isDragActive={isDragActiveFactura}
              hint={hintArchivos(formData.adjunto_factura)}
            />
          </Campo>

          <ListaDocumentos
            titulo={t('complex.ui.facturacion.documentos_subidos')}
            documentos={documentosFactura}
            onDescargar={descargarDocumento}
            onEliminar={eliminarDocumento}
            tipoEliminar="factura"
          />
        </SeccionAcordeon>
      </div>

      <div className={complexCard}>
        <Campo label={t("complex.ui.facturacion.observaciones_y_compromisos")}>
          <TextareaFenix
            name="observacion_compromisos"
            value={formData.observacion_compromisos || ''}
            onChange={handleChange}
            rows={4}
            placeholder={t("complex.ui.facturacion.escribe_tus_observaciones_y_compromisos")}
          />
        </Campo>
        <div className={`${complexInfoPanel} mt-4`}>
          <p className="font-body text-sm text-gray-600 dark:text-gray-300">{t("complex.ui.facturacion.registra_aqui_acuerdos_compromisos_o_notas_relevantes_pa")}</p>
        </div>
      </div>

      {setFormData && (
        <ControlHorasEditor
          abierto={editorControlHorasAbierto}
          onCerrar={() => setEditorControlHorasAbierto(false)}
          formData={formData}
          nombreAseguradora={nombreAseguradora}
          controlHorasGuardado={formData.control_horas}
          onGuardar={handleGuardarControlHoras}
        />
      )}

      <ComplexAvisoModal
        open={avisoGuardarCaso}
        onClose={() => setAvisoGuardarCaso(false)}
        titulo={t('complex.ui.facturacion.guarde_el_caso')}
        mensaje={
          t('complex.ui.facturacion.control_horas_listo') +
          t('complex.ui.facturacion.importante_guardar_caso')
        }
        tipo="warning"
        botonTexto={t('complex.ui.facturacion.entendido')}
        zIndexClass="z-[120]"
      />

      <ComplexAvisoModal
        open={avisoCatalogoEmail.open}
        onClose={() => setAvisoCatalogoEmail({ open: false, mensaje: '' })}
        titulo={t('complex.ui.facturacion.correo_del_analista')}
        mensaje={avisoCatalogoEmail.mensaje}
        tipo="warning"
        botonTexto={t('complex.ui.facturacion.entendido')}
        zIndexClass="z-[130]"
      />
    </div>
  );
}
