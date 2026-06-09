import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BASE_URL } from '../../config/apiConfig.js';
import { appendUploadFile } from '../../utils/sanitizeUploadFileName.js';
import {
  complexBtnSecondary,
  complexHint,
  complexPageWrap,
  complexSectionTitle,
} from './complexFenixUi';
import {
  AccionesFilaNueva,
  BotonEliminarFila,
  CeldaFechaLista,
  EnlaceArchivoLista,
  MensajeTablaVacia,
  MiniDropzoneArchivo,
  ResumenItem,
  ResumenListaPanel,
  TablaListaShell,
  filaListaClass,
  filaNuevaClass,
  formatFechaLista,
  inputListaClass,
  textareaListaClass,
  thLista,
} from './seguimientoObservacionesFenixUi';

export default function Seguimiento({ 
  formData, 
  handleChange,
  onSelectFiles,
  historialDocs = [],
  updateHistorialDocs,
  cargandoAdjuntos = {},
  errorAdjuntos = {}
}) {
  const [seguimientos, setSeguimientos] = useState([]);
  const [nuevoSeguimiento, setNuevoSeguimiento] = useState({
    fecha: '',
    observacion: '',
    documento: null,
    documentoNombre: ''
  });

  // Función para calcular días transcurridos desde fecha de asignación hasta último seguimiento
  const calcularDiasTranscurridos = useCallback(() => {
    // Obtener fecha de asignación
    const fechaAsignacionStr = formData.fchaAsgncion;
    if (!fechaAsignacionStr) {
      return 0; // Sin fecha de asignación, no se puede calcular
    }

    // Obtener último seguimiento (el primero en el array porque está ordenado descendente)
    if (seguimientos.length === 0 || !seguimientos[0].fecha) {
      return 0; // Sin seguimientos, retornar 0
    }

    const ultimoSeguimientoFecha = seguimientos[0].fecha;
    
    // Parsear fechas sin problemas de zona horaria
    const parsearFechaLocal = (fechaStr) => {
      if (!fechaStr) return null;
      const fechaStrClean = String(fechaStr);
      // Si está en formato YYYY-MM-DD, parsear directamente
      if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStrClean)) {
        const [year, month, day] = fechaStrClean.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      // Si tiene formato ISO, extraer solo la parte de fecha
      if (fechaStrClean.includes('T')) {
        const [fechaPart] = fechaStrClean.split('T');
        const [year, month, day] = fechaPart.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      // Intentar parsear como Date normal
      const fecha = new Date(fechaStrClean);
      return isNaN(fecha.getTime()) ? null : fecha;
    };

    const fechaAsignacion = parsearFechaLocal(fechaAsignacionStr);
    const fechaUltimoSeguimiento = parsearFechaLocal(ultimoSeguimientoFecha);

    if (!fechaAsignacion || !fechaUltimoSeguimiento) {
      return 0; // Fechas inválidas
    }

    // Calcular diferencia en días
    const diferenciaMs = fechaUltimoSeguimiento.getTime() - fechaAsignacion.getTime();
    const diasTranscurridos = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));

    return diasTranscurridos >= 0 ? diasTranscurridos : 0;
  }, [formData.fchaAsgncion, seguimientos]);

  // Calcular días transcurridos
  const diasTranscurridosCalculados = calcularDiasTranscurridos();

  // Actualizar formData.diasTranscrrdo cuando cambie el cálculo
  useEffect(() => {
    if (diasTranscurridosCalculados !== undefined && diasTranscurridosCalculados !== null) {
      // Solo actualizar si el valor es diferente al actual
      if (formData.diasTranscrrdo !== diasTranscurridosCalculados) {
        // Usar handleChange para actualizar el formData del padre
        const event = {
          target: {
            name: 'diasTranscrrdo',
            value: diasTranscurridosCalculados
          }
        };
        handleChange(event);
      }
    }
  }, [diasTranscurridosCalculados, formData.diasTranscrrdo, handleChange]);

  // Cargar seguimientos desde historialDocs al montar o cuando cambie historialDocs
  useEffect(() => {
    if (historialDocs && Array.isArray(historialDocs)) {
      const seguimientosCargados = historialDocs
        .filter(doc => doc.tipo === 'seguimiento')
        .map((doc, index) => {
          // Obtener fecha desde diferentes campos posibles
          // IMPORTANTE: Preservar la fecha exacta como string YYYY-MM-DD sin conversión a Date
          let fecha = '';
          if (doc.fecha) {
            // Si la fecha ya está en formato YYYY-MM-DD, usarla directamente
            if (typeof doc.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(doc.fecha)) {
              fecha = doc.fecha;
            } else if (doc.fecha.includes('T')) {
              // Si tiene formato ISO, extraer solo la parte de fecha
              fecha = doc.fecha.split('T')[0];
            } else {
              // Si es otro formato, intentar extraer la fecha
              fecha = String(doc.fecha).substring(0, 10);
            }
          } else if (doc.fechaSubida) {
            // Solo usar fechaSubida como fallback, pero extraer solo la parte de fecha
            const fechaSubidaStr = String(doc.fechaSubida);
            if (fechaSubidaStr.includes('T')) {
              fecha = fechaSubidaStr.split('T')[0];
            } else {
              fecha = fechaSubidaStr.substring(0, 10);
            }
          }
          
          // Construir objeto de documento solo si hay datos
          const documento = (doc.nombre || doc.url || doc.ruta) ? {
            nombre: doc.nombre || '',
            url: doc.url || doc.ruta || '',
            ruta: doc.ruta || doc.url || '',
            tamano: doc.tamano,
            tipoMime: doc.tipoMime
          } : null;

          return {
            id: doc._id || doc.id || `seguimiento-${index}-${Date.now()}`,
            fecha: fecha,
            observacion: doc.comentario || doc.observacion || '',
            documento: documento
          };
        })
        .filter(seg => seg.fecha || seg.observacion) // Solo incluir seguimientos con datos
        .sort((a, b) => {
          // Ordenar por fecha descendente (más reciente primero)
          const fechaA = a.fecha ? new Date(a.fecha) : new Date(0);
          const fechaB = b.fecha ? new Date(b.fecha) : new Date(0);
          return fechaB - fechaA;
        });
      setSeguimientos(seguimientosCargados);
    } else {
      setSeguimientos([]);
    }
  }, [historialDocs]);

  const construirUrlDescarga = useCallback((valor) => {
    if (!valor) return '';
    if (typeof valor !== 'string') return '';
    if (valor.startsWith('http') || valor.startsWith('data:')) return valor;
    const base = (BASE_URL || '').replace(/\/$/, '');
    const path = valor.startsWith('/') ? valor : `/${valor}`;
    return `${base}${path}`;
  }, []);

  const descargarDocumento = (documento) => {
    const enlace = construirUrlDescarga(documento?.url || documento?.ruta || '');
    if (!enlace) {
      alert('No se puede descargar el documento. URL no disponible.');
      return;
    }

    const link = document.createElement('a');
    link.href = enlace;
    link.download = documento?.nombre || 'documento';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNuevoSeguimientoChange = (field, value) => {
    setNuevoSeguimiento(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDocumentoSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setNuevoSeguimiento(prev => ({
      ...prev,
      documento: file,
      documentoNombre: file.name
    }));
    event.target.value = '';
  };

  const handleAgregarSeguimiento = async () => {
    if (!nuevoSeguimiento.fecha || !nuevoSeguimiento.observacion.trim()) {
      alert('Por favor complete la fecha y la observación del seguimiento.');
      return;
    }

    // Si hay un documento, subirlo primero usando el mismo método que handleDocumentDrop
    let documentoSubido = null;
    if (nuevoSeguimiento.documento) {
      try {
        const formDataToUpload = new FormData();
        appendUploadFile(formDataToUpload, 'file', nuevoSeguimiento.documento, 'documento');
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${BASE_URL}/api/complex/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formDataToUpload
        });

        if (!response.ok) {
          const errorResp = await response.json().catch(() => ({}));
          throw new Error(errorResp.error || `Error subiendo archivo (${response.status})`);
        }

        const data = await response.json();
        const urlRelativa = data.url || data.ruta || '';
        const urlAbsoluta = construirUrlDescarga(urlRelativa);

        documentoSubido = {
          nombre: data.filename || nuevoSeguimiento.documento.name,
          url: urlAbsoluta,
          ruta: urlRelativa,
          tamano: nuevoSeguimiento.documento.size,
          tipoMime: nuevoSeguimiento.documento.type
        };
      } catch (error) {
        console.error('Error subiendo documento:', error);
        alert(`Error al subir el documento: ${error.message}`);
        return;
      }
    }

    // Crear el nuevo seguimiento
    const seguimientoNuevo = {
      id: `seguimiento-${Date.now()}`,
      fecha: nuevoSeguimiento.fecha,
      observacion: nuevoSeguimiento.observacion,
      documento: documentoSubido
    };

    // Agregar a la lista local
    setSeguimientos(prev => [seguimientoNuevo, ...prev]);

    // Agregar a historialDocs si hay función disponible (siempre, incluso sin documento)
    if (updateHistorialDocs) {
      updateHistorialDocs(prev => {
        const actual = Array.isArray(prev) ? prev : [];
        // Obtener fecha local en formato ISO sin problemas de zona horaria
        const ahora = new Date();
        const fechaLocalISO = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}T${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}:${String(ahora.getSeconds()).padStart(2, '0')}`;
        
        // IMPORTANTE: Guardar la fecha exactamente como el usuario la ingresó (YYYY-MM-DD)
        // Sin conversión a Date para evitar problemas de zona horaria que resten un día
        const fechaIngresada = nuevoSeguimiento.fecha; // Ya está en formato YYYY-MM-DD del input type="date"
        
        const nuevoDoc = {
          tipo: 'seguimiento',
          fecha: fechaIngresada, // Guardar como string en formato YYYY-MM-DD
          fechaSubida: fechaLocalISO,
          comentario: nuevoSeguimiento.observacion,
          observacion: nuevoSeguimiento.observacion,
          usuario: localStorage.getItem('login') || localStorage.getItem('usuario') || 'unknown'
        };
        
        // Solo agregar datos del documento si existe
        if (documentoSubido) {
          nuevoDoc.nombre = documentoSubido.nombre;
          nuevoDoc.url = documentoSubido.url;
          nuevoDoc.ruta = documentoSubido.ruta;
          nuevoDoc.tamano = documentoSubido.tamano;
          nuevoDoc.tipoMime = documentoSubido.tipoMime;
        }
        
        return [nuevoDoc, ...actual];
      });
    }

    // Limpiar el formulario
    setNuevoSeguimiento({
      fecha: '',
      observacion: '',
      documento: null,
      documentoNombre: ''
    });
  };

  const handleEliminarSeguimiento = (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar este seguimiento?')) {
      // Encontrar el seguimiento a eliminar
      const seguimientoAEliminar = seguimientos.find(s => s.id === id);
      
      // Eliminar de la lista local
      setSeguimientos(prev => prev.filter(seg => seg.id !== id));
      
      // También eliminar de historialDocs si hay función disponible
      if (updateHistorialDocs && seguimientoAEliminar) {
        updateHistorialDocs(prev => {
          const actual = Array.isArray(prev) ? prev : [];
          return actual.filter(doc => {
            // Si no es un seguimiento, mantenerlo
            if (doc.tipo !== 'seguimiento') return true;
            
            // Comparar por id si está disponible
            if (doc._id || doc.id) {
              return (doc._id || doc.id) !== id;
            }
            
            // Si no hay id, comparar por fecha y comentario
            const fechaDoc = doc.fecha || (doc.fechaSubida ? new Date(doc.fechaSubida).toISOString().split('T')[0] : '');
            const fechaSeg = seguimientoAEliminar.fecha || '';
            const comentarioDoc = doc.comentario || doc.observacion || '';
            const comentarioSeg = seguimientoAEliminar.observacion || '';
            
            // Mantener si no coincide
            return !(fechaDoc === fechaSeg && comentarioDoc === comentarioSeg);
          });
        });
      }
    }
  };

  const inputFileRef = useRef(null);

  const limpiarNuevoSeguimiento = () =>
    setNuevoSeguimiento({ fecha: '', observacion: '', documento: null, documentoNombre: '' });

  return (
    <div className={complexPageWrap}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className={`${complexSectionTitle} !mb-0`}>Seguimiento del Caso</h2>
        <button type="button" onClick={handleAgregarSeguimiento} className={complexBtnSecondary}>
          + Nuevo
        </button>
      </div>

      <TablaListaShell>
        <thead>
          <tr>
            <th className={thLista}>Fecha *</th>
            <th className={thLista}>Observación *</th>
            <th className={thLista}>Documento adjunto</th>
            <th className={thLista}>Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          <tr className={filaNuevaClass}>
            <td className="px-4 py-3 whitespace-nowrap">
              <input
                type="date"
                value={nuevoSeguimiento.fecha}
                onChange={(e) => handleNuevoSeguimientoChange('fecha', e.target.value)}
                className={inputListaClass}
              />
            </td>
            <td className="px-4 py-3">
              <textarea
                value={nuevoSeguimiento.observacion}
                onChange={(e) => handleNuevoSeguimientoChange('observacion', e.target.value)}
                className={textareaListaClass}
                rows={2}
                placeholder="Escriba la observación..."
              />
            </td>
            <td className="px-4 py-3">
              <input ref={inputFileRef} type="file" onChange={handleDocumentoSelect} className="hidden" />
              <MiniDropzoneArchivo
                nombreArchivo={nuevoSeguimiento.documentoNombre}
                onClick={() => inputFileRef.current?.click()}
              />
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <AccionesFilaNueva onGuardar={handleAgregarSeguimiento} onCancelar={limpiarNuevoSeguimiento} />
            </td>
          </tr>

          {seguimientos.map((seg, index) => (
            <tr key={seg.id || index} className={filaListaClass}>
              <td className="px-4 py-3">
                <CeldaFechaLista fecha={seg.fecha} />
              </td>
              <td className="px-4 py-3 font-body text-sm text-gray-800 dark:text-gray-200">
                <div className="max-w-md">{seg.observacion || '—'}</div>
              </td>
              <td className="px-4 py-3">
                <EnlaceArchivoLista
                  nombre={seg.documento?.nombre}
                  vacio="Sin documento"
                  onClick={() => seg.documento?.nombre && descargarDocumento(seg.documento)}
                />
              </td>
              <td className="px-4 py-3">
                <BotonEliminarFila onClick={() => handleEliminarSeguimiento(seg.id)} />
              </td>
            </tr>
          ))}

          {seguimientos.length === 0 && (
            <MensajeTablaVacia
              colSpan={4}
              mensaje='No hay seguimientos registrados. Agregue uno nuevo usando el botón "+ Nuevo".'
            />
          )}
        </tbody>
      </TablaListaShell>

      <ResumenListaPanel titulo="Resumen de seguimiento">
        <ResumenItem label="Total seguimientos:" value={seguimientos.length} />
        <ResumenItem
          label="Último seguimiento:"
          value={
            seguimientos.length > 0 && seguimientos[0].fecha
              ? formatFechaLista(seguimientos[0].fecha)
              : 'No registrado'
          }
        />
        <ResumenItem label="Días transcurridos:" value={diasTranscurridosCalculados} />
      </ResumenListaPanel>

      <p className={`${complexHint} mt-4`}>* Campos obligatorios</p>
    </div>
  );
}
