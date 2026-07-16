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
  const [enviando, setEnviando] = useState(false);
  const [enviandoGerencia, setEnviandoGerencia] = useState(false);
  const [controlHorasAbierto, setControlHorasAbierto] = useState(true);
  const [editorControlHorasAbierto, setEditorControlHorasAbierto] = useState(false);
  const [avisoGuardarCaso, setAvisoGuardarCaso] = useState(false);
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
        alert('No se puede descargar el documento. URL no disponible.');
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
          `¿Está seguro de que desea eliminar "${documento.nombre || documento.filename || 'este documento'}"?`
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
    async (normalizado, totales) => {
      if (!setFormData) return;
      const hoy = new Date().toISOString().slice(0, 10);
      setFormData((prev) => ({
        ...prev,
        control_horas: normalizado,
        valor_servicio: Math.round(totales.subtotal_honorarios || 0),
        valor_gastos: Math.round(totales.gastos || 0),
        fecha_control_horas: prev.fecha_control_horas || hoy,
      }));

      setAvisoGuardarCaso(true);

      if (onPersistirControlHoras) {
        await onPersistirControlHoras(normalizado, totales);
      }
    },
    [setFormData, onPersistirControlHoras]
  );

  const handleImportarExcelControlHoras = useCallback(
    async (evento) => {
      const archivo = evento.target.files?.[0];
      evento.target.value = '';
      if (!archivo || !setFormData) return;

      if (
        tieneControlHorasGuardado &&
        !window.confirm(
          '¿Desea reemplazar el control de horas actual con los datos del archivo Excel?'
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
            'No se pudo leer el Excel. Use la plantilla exportada desde el sistema o un formato con las mismas columnas.'
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
    ]
  );

  const handleExportarExcelControlHoras = useCallback(async () => {
    if (!tieneControlHorasGuardado) {
      alert('Primero guarde el control de horas desde el editor.');
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
      alert('No se pudo generar el Excel.');
    } finally {
      setExportandoExcel(false);
    }
  }, [formData, nombreAseguradora, tieneControlHorasGuardado]);
  const documentosFactura = obtenerDocumentosPorTipo('factura');
  const documentosEvidencia = obtenerDocumentosPorTipo('evidencia');
  const documentosSeguimientoEvidencia = obtenerDocumentosPorTipo('seguimientoEvidencia');

  const hintArchivos = (valor) => `Archivos seleccionados: ${valor || 'Ninguno'}`;

  return (
    <div className={`${complexScope} ${complexPageWrap}`}>
      <h2 className={complexSectionTitle}>
        <FaFileInvoice className="text-fenix-primario" />
        Facturación
      </h2>

      {/* Valores principales */}
      <div className={complexCard}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label="Número de Factura">
            <InputFenix
              type="number"
              name="numero_factura"
              value={formData.numero_factura ?? ''}
              onChange={handleChange}
            />
          </Campo>
          <Campo label="Valor Servicios">
            <InputFenix
              type="number"
              name="valor_servicio"
              value={formData.valor_servicio ?? ''}
              onChange={handleChange}
            />
          </Campo>
          <Campo label="Valor Gastos">
            <InputFenix
              type="number"
              name="valor_gastos"
              value={formData.valor_gastos ?? ''}
              onChange={handleChange}
            />
          </Campo>
          <Campo label="Fecha Última Revisión">
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
          titulo="Control de Horas"
          subtitulo="Fase 1: liquidación y envío a Elkin o Iskharly"
        >
          <div className={complexInfoPanel}>
            <p className="mb-3 font-body text-base text-gray-600 dark:text-gray-400">
              Un control de horas por caso. Puede crearlo en el sistema, importarlo desde su Excel
              tradicional o descargar la plantilla. Al guardar el caso se actualizan servicios y gastos.
            </p>
            {resumenControlHoras ? (
              <div className="mb-4 grid grid-cols-2 gap-2 text-base sm:grid-cols-4">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Total horas</span>
                  <p className="text-lg font-semibold text-fenix-primario">
                    {resumenControlHoras.total_horas.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Valor hora</span>
                  <p className="text-lg font-semibold">{formatearMoneda(resumenControlHoras.valor_hora)}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Honorarios</span>
                  <p className="text-lg font-semibold">
                    {formatearMoneda(resumenControlHoras.subtotal_honorarios)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Total liquidación</span>
                  <p className="text-lg font-semibold">{formatearMoneda(resumenControlHoras.total)}</p>
                </div>
              </div>
            ) : (
              <p className="mb-4 text-base italic text-gray-500 dark:text-gray-400">
                Aún no hay control de horas registrado para este caso.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditorControlHorasAbierto(true)}
                className={complexBtnPrimary}
                style={{ width: 'auto' }}
              >
                <FaEdit />
                {tieneControlHorasGuardado ? 'Editar control de horas' : 'Realizar control de horas'}
              </button>
              <button
                type="button"
                disabled={importandoExcel}
                onClick={() => inputExcelControlHorasRef.current?.click()}
                className={complexBtnSecondary}
              >
                <FaFileUpload className="text-fenix-primario" />
                {importandoExcel ? 'Leyendo Excel...' : 'Importar desde Excel'}
              </button>
              <button
                type="button"
                disabled={!tieneControlHorasGuardado || exportandoExcel}
                onClick={handleExportarExcelControlHoras}
                className={complexBtnSecondary}
              >
                <FaFileExcel className="text-green-700" />
                {exportandoExcel ? 'Generando...' : 'Descargar Excel'}
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

          <Campo label="Fecha de Control de Horas">
            <InputFenix
              type="date"
              name="fecha_control_horas"
              value={formData.fecha_control_horas || ''}
              onChange={handleChange}
            />
          </Campo>

          <Campo label="Documentos de Control de Horas">
            <DropzoneFenix
              getRootProps={getRootPropsControlHoras}
              getInputProps={getInputPropsControlHoras}
              isDragActive={isDragActiveControlHoras}
              hint={hintArchivos(formData.adjunto_control_horas)}
            />
          </Campo>

          <ListaDocumentos
            titulo="Documentos subidos"
            documentos={documentosControlHoras}
            onDescargar={descargarDocumento}
            onEliminar={eliminarDocumento}
            tipoEliminar="controlHoras"
          />

          <Campo label="Enviar notificación a">
            <SelectFenix
              name="gerente_control_horas"
              value={formData.gerente_control_horas || ''}
              onChange={handleChange}
            >
              <option value="">Seleccione un gerente...</option>
              <option value="elkin">Elkin Tapia Gutiérrez</option>
              <option value="iskharly">Iskharly José Tapia Gutierrez</option>
              <option value="test">🧪 Prueba (danalyst@proserpuertos.com.co)</option>
            </SelectFenix>
          </Campo>

          {formData.gerente_control_horas && (
            <BotonEnviar
              disabled={enviando || !formData.gerente_control_horas}
              enviando={enviando}
              onClick={async () => {
                if (!puedeEnviarNotificacionControlHoras) {
                  alert(
                    'Registre el control de horas en el sistema o suba los documentos antes de enviar la notificación.'
                  );
                  return;
                }
                if (!formData.fecha_control_horas) {
                  alert('Indique la fecha de control de horas antes de enviar la notificación.');
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
                    'El control de horas tiene actividades sin fecha. Edítelo y complete las fechas antes de enviar.'
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
                  alert('Error al enviar la notificación. Por favor, intente nuevamente.');
                } finally {
                  setEnviando(false);
                }
              }}
            >
              {enviando ? 'Enviando...' : 'Enviar Control de Horas a Gerente'}
            </BotonEnviar>
          )}
        </SeccionAcordeon>

        {/* Envío de Control de Horas */}
        <SeccionAcordeon
          abierto={envioControlHorasAbierto}
          onToggle={() => setEnvioControlHorasAbierto(!envioControlHorasAbierto)}
          icon={FaPaperPlane}
          titulo="Envío de Control de Horas"
          subtitulo="Fase 2: evidencia y notificación a facturación (Adriana)"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Campo label="Fecha de envío">
              <InputFenix
                type="date"
                name="fecha_envio_control_horas"
                value={formData.fecha_envio_control_horas || ''}
                onChange={handleChange}
              />
            </Campo>
            <Campo label="Fecha de recibido">
              <InputFenix
                type="date"
                name="fecha_recibido_control_horas"
                value={formData.fecha_recibido_control_horas || ''}
                onChange={handleChange}
              />
            </Campo>
          </div>

          <Campo label="Adjunto de Evidencia">
            <DropzoneFenix
              getRootProps={getRootPropsEvidencia}
              getInputProps={getInputPropsEvidencia}
              isDragActive={isDragActiveEvidencia}
              hint={hintArchivos(formData.adjunto_evidencia)}
            />
          </Campo>

          <ListaDocumentos
            titulo="Documentos subidos"
            documentos={documentosEvidencia}
            onDescargar={descargarDocumento}
            onEliminar={eliminarDocumento}
            tipoEliminar="evidencia"
          />

          <Campo label="Enviar notificación a">
            <SelectFenix
              name="gerente_gerencia"
              value={formData.gerente_gerencia || ''}
              onChange={handleChange}
            >
              <option value="">Seleccione un gerente...</option>
              <option value="adriana">Adriana Angulo Funes (facturación.ajustes@proserpuertos.com.co)</option>
              <option value="test">🧪 Prueba (danalyst@proserpuertos.com.co)</option>
            </SelectFenix>
          </Campo>

          {formData.gerente_gerencia && (
            <BotonEnviar
              disabled={enviandoGerencia || !formData.gerente_gerencia}
              enviando={enviandoGerencia}
              onClick={async () => {
                if (!formData.adjunto_evidencia || formData.adjunto_evidencia === 'Ninguno') {
                  alert('Por favor, suba primero los documentos de evidencia');
                  return;
                }
                setEnviandoGerencia(true);
                try {
                  if (onEnviarGerencia) {
                    await onEnviarGerencia(formData.gerente_gerencia);
                  }
                } catch (error) {
                  console.error('Error enviando notificación:', error);
                  alert('Error al enviar la notificación. Por favor, intente nuevamente.');
                } finally {
                  setEnviandoGerencia(false);
                }
              }}
            >
              {enviandoGerencia ? 'Enviando...' : 'Enviar a Gerencia'}
            </BotonEnviar>
          )}
        </SeccionAcordeon>

        {/* Autorización */}
        <SeccionAcordeon
          abierto={seguimientoAbierto}
          onToggle={() => setSeguimientoAbierto(!seguimientoAbierto)}
          icon={FaCheckCircle}
          titulo="Autorización"
          subtitulo="Fechas, comentarios y documentos de autorización"
        >
          <Campo label="Fecha de Autorización">
            <InputFenix
              type="date"
              name="fecha_seguimiento_envio_control_horas"
              value={formData.fecha_seguimiento_envio_control_horas || ''}
              onChange={handleChange}
            />
          </Campo>

          <Campo label="Comentarios de Autorización">
            <TextareaFenix
              name="observacion_seguimiento_envio_control_horas"
              value={formData.observacion_seguimiento_envio_control_horas || ''}
              onChange={handleChange}
              rows={4}
              placeholder="Ingrese los comentarios de autorización..."
            />
          </Campo>

          <Campo label="Adjunto de Documentos de Autorización">
            <DropzoneFenix
              getRootProps={getRootPropsSeguimientoEvidencia}
              getInputProps={getInputPropsSeguimientoEvidencia}
              isDragActive={isDragActiveSeguimientoEvidencia}
              hint={hintArchivos(formData.adjunto_seguimiento_envio_control_horas)}
            />
          </Campo>

          <ListaDocumentos
            titulo="Documentos subidos"
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
          titulo="Facturación"
          subtitulo="Documentos y fechas de facturación"
        >
          <Campo label="Fecha de Factura">
            <InputFenix
              type="date"
              name="fecha_factura"
              value={formData.fecha_factura || ''}
              onChange={handleChange}
            />
          </Campo>

          <Campo label="Adjunto Factura">
            <DropzoneFenix
              getRootProps={getRootPropsFactura}
              getInputProps={getInputPropsFactura}
              isDragActive={isDragActiveFactura}
              hint={hintArchivos(formData.adjunto_factura)}
            />
          </Campo>

          <ListaDocumentos
            titulo="Documentos subidos"
            documentos={documentosFactura}
            onDescargar={descargarDocumento}
            onEliminar={eliminarDocumento}
            tipoEliminar="factura"
          />
        </SeccionAcordeon>
      </div>

      <div className={complexCard}>
        <Campo label="Observaciones y Compromisos">
          <TextareaFenix
            name="observacion_compromisos"
            value={formData.observacion_compromisos || ''}
            onChange={handleChange}
            rows={4}
            placeholder="Escribe tus observaciones y compromisos..."
          />
        </Campo>
        <div className={`${complexInfoPanel} mt-4`}>
          <p className="font-body text-sm text-gray-600 dark:text-gray-300">
            Registra aquí acuerdos, compromisos o notas relevantes para el proceso de facturación del caso
            Complex.
          </p>
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
        titulo="Guarde el caso"
        mensaje={
          'Control de horas listo en el formulario.\n\n' +
          'IMPORTANTE: Debe hacer clic en el botón «Guardar» que está arriba del caso para guardar los cambios.\n\n' +
          'Si no lo hace, el control de horas no quedará guardado.'
        }
        tipo="warning"
        botonTexto="Entendido"
        zIndexClass="z-[120]"
      />
    </div>
  );
}
