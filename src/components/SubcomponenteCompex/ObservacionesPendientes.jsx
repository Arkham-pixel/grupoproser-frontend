import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BASE_URL, getUploadsUrlCandidates } from '../../config/apiConfig.js';
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

export default function ObservacionesPendientes({ 
  formData, 
  handleChange,
  onSelectFiles,
  historialDocs = [],
  updateHistorialDocs,
  cargandoAdjuntos = {},
  errorAdjuntos = {}
}) {
  const [observaciones, setObservaciones] = useState([]);
  const [nuevaObservacion, setNuevaObservacion] = useState({
    fecha: '',
    observacion: '',
    evidencia: null,
    evidenciaNombre: ''
  });

  // Cargar observaciones desde historialDocs al montar o cuando cambie historialDocs
  useEffect(() => {
    if (historialDocs && Array.isArray(historialDocs)) {
      const observacionesCargadas = historialDocs
        .filter(doc => doc.tipo === 'observacionesPendientes')
        .map((doc, index) => {
          // Obtener fecha desde diferentes campos posibles
          let fecha = '';
          if (doc.fecha) {
            fecha = doc.fecha.includes('T') ? doc.fecha.split('T')[0] : doc.fecha;
          } else if (doc.fechaSubida) {
            fecha = new Date(doc.fechaSubida).toISOString().split('T')[0];
          }
          
          // Construir objeto de evidencia solo si hay datos
          const evidencia = (doc.nombre || doc.url || doc.ruta) ? {
            nombre: doc.nombre || '',
            url: doc.url || doc.ruta || '',
            ruta: doc.ruta || doc.url || '',
            tamano: doc.tamano,
            tipoMime: doc.tipoMime
          } : null;

          return {
            id: doc._id || doc.id || `observacion-${index}-${Date.now()}`,
            fecha: fecha,
            observacion: doc.comentario || doc.observacion || '',
            evidencia: evidencia
          };
        })
        .filter(obs => obs.fecha || obs.observacion) // Solo incluir observaciones con datos
        .sort((a, b) => {
          // Ordenar por fecha descendente (más reciente primero)
          const fechaA = a.fecha ? new Date(a.fecha) : new Date(0);
          const fechaB = b.fecha ? new Date(b.fecha) : new Date(0);
          return fechaB - fechaA;
        });
      setObservaciones(observacionesCargadas);
    } else {
      setObservaciones([]);
    }
  }, [historialDocs]);

  const construirUrlDescarga = useCallback((valor) => {
    if (!valor) return '';
    if (typeof valor !== 'string') return '';
    if (valor.startsWith('data:')) return valor;
    return getUploadsUrlCandidates(valor)[0] || '';
  }, []);

  const descargarEvidencia = (evidencia) => {
    const enlace = construirUrlDescarga(evidencia?.url || evidencia?.ruta || '');
    if (!enlace) {
      alert('No se puede descargar la evidencia. URL no disponible.');
      return;
    }

    const link = document.createElement('a');
    link.href = enlace;
    link.download = evidencia?.nombre || 'evidencia';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNuevaObservacionChange = (field, value) => {
    setNuevaObservacion(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEvidenciaSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setNuevaObservacion(prev => ({
      ...prev,
      evidencia: file,
      evidenciaNombre: file.name
    }));
    event.target.value = '';
  };

  const handleAgregarObservacion = async () => {
    if (!nuevaObservacion.fecha || !nuevaObservacion.observacion.trim()) {
      alert('Por favor complete la fecha y la observación.');
      return;
    }

    // Si hay una evidencia, subirla primero
    let evidenciaSubida = null;
    if (nuevaObservacion.evidencia) {
      try {
        const formDataToUpload = new FormData();
        appendUploadFile(formDataToUpload, 'file', nuevaObservacion.evidencia, 'evidencia');
        
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

        evidenciaSubida = {
          nombre: data.filename || nuevaObservacion.evidencia.name,
          url: urlAbsoluta,
          ruta: urlRelativa,
          tamano: nuevaObservacion.evidencia.size,
          tipoMime: nuevaObservacion.evidencia.type
        };
      } catch (error) {
        console.error('Error subiendo evidencia:', error);
        alert(`Error al subir la evidencia: ${error.message}`);
        return;
      }
    }

    // Crear la nueva observación
    const observacionNueva = {
      id: `observacion-${Date.now()}`,
      fecha: nuevaObservacion.fecha,
      observacion: nuevaObservacion.observacion,
      evidencia: evidenciaSubida
    };

    // Agregar a la lista local
    setObservaciones(prev => [observacionNueva, ...prev]);

    // Agregar a historialDocs si hay función disponible (siempre, incluso sin evidencia)
    if (updateHistorialDocs) {
      updateHistorialDocs(prev => {
        const actual = Array.isArray(prev) ? prev : [];
        // Obtener fecha local en formato ISO sin problemas de zona horaria
        const ahora = new Date();
        const fechaLocalISO = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}T${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}:${String(ahora.getSeconds()).padStart(2, '0')}`;
        
        const nuevoDoc = {
          tipo: 'observacionesPendientes',
          fecha: nuevaObservacion.fecha,
          fechaSubida: fechaLocalISO,
          comentario: nuevaObservacion.observacion,
          observacion: nuevaObservacion.observacion,
          usuario: localStorage.getItem('login') || localStorage.getItem('usuario') || 'unknown'
        };
        
        // Solo agregar datos de la evidencia si existe
        if (evidenciaSubida) {
          nuevoDoc.nombre = evidenciaSubida.nombre;
          nuevoDoc.url = evidenciaSubida.url;
          nuevoDoc.ruta = evidenciaSubida.ruta;
          nuevoDoc.tamano = evidenciaSubida.tamano;
          nuevoDoc.tipoMime = evidenciaSubida.tipoMime;
        }
        
        return [nuevoDoc, ...actual];
      });
    }

    // Limpiar el formulario
    setNuevaObservacion({
      fecha: '',
      observacion: '',
      evidencia: null,
      evidenciaNombre: ''
    });
  };

  const handleEliminarObservacion = (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta observación?')) {
      // Encontrar la observación a eliminar
      const observacionAEliminar = observaciones.find(o => o.id === id);
      
      // Eliminar de la lista local
      setObservaciones(prev => prev.filter(obs => obs.id !== id));
      
      // También eliminar de historialDocs si hay función disponible
      if (updateHistorialDocs && observacionAEliminar) {
        updateHistorialDocs(prev => {
          const actual = Array.isArray(prev) ? prev : [];
          return actual.filter(doc => {
            // Si no es una observación pendiente, mantenerlo
            if (doc.tipo !== 'observacionesPendientes') return true;
            
            // Comparar por id si está disponible
            if (doc._id || doc.id) {
              return (doc._id || doc.id) !== id;
            }
            
            // Si no hay id, comparar por fecha y comentario
            const fechaDoc = doc.fecha || (doc.fechaSubida ? new Date(doc.fechaSubida).toISOString().split('T')[0] : '');
            const fechaObs = observacionAEliminar.fecha || '';
            const comentarioDoc = doc.comentario || doc.observacion || '';
            const comentarioObs = observacionAEliminar.observacion || '';
            
            // Mantener si no coincide
            return !(fechaDoc === fechaObs && comentarioDoc === comentarioObs);
          });
        });
      }
    }
  };

  const inputFileRef = useRef(null);

  const limpiarNuevaObservacion = () =>
    setNuevaObservacion({ fecha: '', observacion: '', evidencia: null, evidenciaNombre: '' });

  return (
    <div className={complexPageWrap}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className={`${complexSectionTitle} !mb-0`}>Observaciones, Seguimientos y Pendientes</h2>
        <button type="button" onClick={handleAgregarObservacion} className={complexBtnSecondary}>
          + Nuevo
        </button>
      </div>

      <TablaListaShell>
        <thead>
          <tr>
            <th className={thLista}>Fecha *</th>
            <th className={thLista}>Observación *</th>
            <th className={thLista}>Evidencia</th>
            <th className={thLista}>Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          <tr className={filaNuevaClass}>
            <td className="px-4 py-3 whitespace-nowrap">
              <input
                type="date"
                value={nuevaObservacion.fecha}
                onChange={(e) => handleNuevaObservacionChange('fecha', e.target.value)}
                className={inputListaClass}
              />
            </td>
            <td className="px-4 py-3">
              <textarea
                value={nuevaObservacion.observacion}
                onChange={(e) => handleNuevaObservacionChange('observacion', e.target.value)}
                className={textareaListaClass}
                rows={2}
                placeholder="Escriba la observación..."
              />
            </td>
            <td className="px-4 py-3">
              <input ref={inputFileRef} type="file" onChange={handleEvidenciaSelect} className="hidden" />
              <MiniDropzoneArchivo
                nombreArchivo={nuevaObservacion.evidenciaNombre}
                onClick={() => inputFileRef.current?.click()}
              />
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <AccionesFilaNueva onGuardar={handleAgregarObservacion} onCancelar={limpiarNuevaObservacion} />
            </td>
          </tr>

          {observaciones.map((obs, index) => (
            <tr key={obs.id || index} className={filaListaClass}>
              <td className="px-4 py-3">
                <CeldaFechaLista fecha={obs.fecha} />
              </td>
              <td className="px-4 py-3 font-body text-sm text-gray-800 dark:text-gray-200">
                <div className="max-w-md">{obs.observacion || '—'}</div>
              </td>
              <td className="px-4 py-3">
                <EnlaceArchivoLista
                  nombre={obs.evidencia?.nombre}
                  vacio="Sin evidencia"
                  onClick={() => obs.evidencia?.nombre && descargarEvidencia(obs.evidencia)}
                />
              </td>
              <td className="px-4 py-3">
                <BotonEliminarFila onClick={() => handleEliminarObservacion(obs.id)} />
              </td>
            </tr>
          ))}

          {observaciones.length === 0 && (
            <MensajeTablaVacia
              colSpan={4}
              mensaje='No hay observaciones registradas. Agregue una nueva usando el botón "+ Nuevo".'
            />
          )}
        </tbody>
      </TablaListaShell>

      <ResumenListaPanel titulo="Resumen de observaciones" cols={2}>
        <ResumenItem label="Total observaciones:" value={observaciones.length} />
        <ResumenItem
          label="Última observación:"
          value={
            observaciones.length > 0 && observaciones[0].fecha
              ? formatFechaLista(observaciones[0].fecha)
              : 'No registrada'
          }
        />
      </ResumenListaPanel>

      <p className={`${complexHint} mt-4`}>* Campos obligatorios</p>
    </div>
  );
}

