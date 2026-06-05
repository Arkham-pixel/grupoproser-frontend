import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { BASE_URL, resolveUploadsUrl } from '../../config/apiConfig';
import { FaTimes, FaDownload, FaEye, FaCalendar, FaFile, FaTag } from 'react-icons/fa';

export default function VerDocumentosUsuario({ usuario, onCerrar }) {
  const { theme } = useTheme();
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [documentoVistaPrevia, setDocumentoVistaPrevia] = useState(null);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [urlVistaPrevia, setUrlVistaPrevia] = useState(null);

  const usuarioId = usuario._id || usuario.id;

  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const buttonPrimary = theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#2563EB';
  const buttonSecondary = theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#22C55E';

  useEffect(() => {
    cargarDocumentos();
  }, [usuarioId]);

  const cargarDocumentos = async () => {
    try {
      setCargando(true);
      const response = await api.get(`/api/documentos/usuario/${usuarioId}`);
      setDocumentos(response.data.documentos || []);
    } catch (error) {
      console.error('Error cargando documentos:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleDescargar = async (documento) => {
    try {
      const response = await api.get(`/api/documentos/${documento._id}/descargar`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', documento.archivo.nombreOriginal);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando documento:', error);
    }
  };

  const handleVistaPrevia = async (documento) => {
    try {
      setDocumentoVistaPrevia(documento);
      setMostrarVistaPrevia(true);
      const url = resolveUploadsUrl(documento.archivo.ruta);
      setUrlVistaPrevia(url);
    } catch (error) {
      console.error('Error abriendo vista previa:', error);
    }
  };

  const esImagen = (tipoMime) => {
    return tipoMime && tipoMime.startsWith('image/');
  };

  const esPDF = (tipoMime) => {
    return tipoMime === 'application/pdf';
  };

  const esVideo = (tipoMime) => {
    return tipoMime && tipoMime.startsWith('video/');
  };

  const puedePrevisualizar = (tipoMime) => {
    return esImagen(tipoMime) || esPDF(tipoMime) || esVideo(tipoMime);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    try {
      // Si es un string en formato YYYY-MM-DD, parsearlo como fecha local
      let date;
      if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
        const [year, month, day] = fecha.split('T')[0].split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(fecha);
        // Si la fecha tiene solo día/mes/año, ajustar a hora local
        if (date.toISOString().includes('T00:00:00') && !fecha.toString().includes('T')) {
          const year = date.getUTCFullYear();
          const month = date.getUTCMonth();
          const day = date.getUTCDate();
          date = new Date(year, month, day);
        }
      }
      return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatearTamaño = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const documentosFiltrados = documentos.filter(doc => {
    if (!busqueda) return true;
    const busquedaLower = busqueda.toLowerCase();
    return doc.nombre.toLowerCase().includes(busquedaLower) ||
           (doc.descripcion || '').toLowerCase().includes(busquedaLower) ||
           (doc.etiquetas || []).some(tag => tag.toLowerCase().includes(busquedaLower));
  });

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold" style={{ color: textPrimary }}>
          Documentos de {usuario.name || usuario.nombre || 'Usuario'}
        </h3>
        <button
          onClick={onCerrar}
          className="p-2 rounded transition-colors"
          style={{
            backgroundColor: theme === 'dark' ? '#2D2D2D' : '#F3F4F6',
            color: textPrimary
          }}
        >
          <FaTimes />
        </button>
      </div>

      <div 
        className="rounded-lg shadow-sm p-6"
        style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
      >
        {/* Búsqueda */}
        <div className="mb-4">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar documentos..."
            className="w-full px-3 py-2 rounded text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              border: `1px solid ${borderColor}`
            }}
          />
        </div>

        {/* Lista de documentos */}
        {cargando ? (
          <div className="text-center py-8" style={{ color: textSecondary }}>
            Cargando documentos...
          </div>
        ) : documentosFiltrados.length === 0 ? (
          <div className="text-center py-8" style={{ color: textSecondary }}>
            {documentos.length === 0 
              ? 'No hay documentos subidos para este usuario'
              : 'No se encontraron documentos con la búsqueda'
            }
          </div>
        ) : (
          <div className="space-y-3">
            {documentosFiltrados.map((documento) => (
              <div
                key={documento._id}
                className="p-4 rounded border"
                style={{
                  backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
                  borderColor: borderColor
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FaFile style={{ color: textSecondary }} />
                      <h4 className="font-semibold" style={{ color: textPrimary }}>
                        {documento.nombre}
                      </h4>
                    </div>
                    {documento.descripcion && (
                      <p className="text-sm mb-2" style={{ color: textSecondary }}>
                        {documento.descripcion}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs" style={{ color: textSecondary }}>
                      <span className="flex items-center gap-1">
                        <FaCalendar />
                        {formatearFecha(documento.fechaSubida)}
                      </span>
                      <span>{formatearTamaño(documento.archivo.tamaño)}</span>
                    </div>
                    {documento.etiquetas && documento.etiquetas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {documento.etiquetas.map((etiqueta, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 rounded text-xs flex items-center gap-1"
                            style={{
                              backgroundColor: theme === 'dark' ? '#2D2D2D' : '#E5E7EB',
                              color: textSecondary
                            }}
                          >
                            <FaTag />
                            {etiqueta}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {puedePrevisualizar(documento.archivo.tipoMime) && (
                      <button
                        onClick={() => handleVistaPrevia(documento)}
                        className="p-2 rounded transition-colors"
                        style={{
                          backgroundColor: buttonSecondary,
                          color: theme === 'dark' ? '#86EFAC' : '#FFFFFF'
                        }}
                        title="Vista previa"
                      >
                        <FaEye />
                      </button>
                    )}
                    <button
                      onClick={() => handleDescargar(documento)}
                      className="p-2 rounded transition-colors"
                      style={{
                        backgroundColor: buttonPrimary,
                        color: theme === 'dark' ? '#93C5FD' : '#FFFFFF'
                      }}
                      title="Descargar"
                    >
                      <FaDownload />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Vista Previa */}
      {mostrarVistaPrevia && documentoVistaPrevia && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ 
            backgroundColor: theme === 'dark' 
              ? 'rgba(0, 0, 0, 0.9)' 
              : 'rgba(0, 0, 0, 0.7)' 
          }}
          onClick={() => {
            setMostrarVistaPrevia(false);
            setDocumentoVistaPrevia(null);
            setUrlVistaPrevia(null);
          }}
        >
          <button
            onClick={() => {
              setMostrarVistaPrevia(false);
              setDocumentoVistaPrevia(null);
              setUrlVistaPrevia(null);
            }}
            className="absolute top-4 right-4 p-2 rounded-full transition-colors z-10"
            style={{ 
              color: theme === 'dark' ? '#FFFFFF' : '#1E1E1E',
              backgroundColor: theme === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.1)'
            }}
          >
            <FaTimes size={24} />
          </button>
          
          <div 
            className="max-w-7xl max-h-full overflow-auto rounded-lg p-4"
            style={{
              backgroundColor: theme === 'dark' ? '#1A1A1A' : '#FFFFFF',
              border: `1px solid ${borderColor}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 
                className="text-xl font-bold mb-2"
                style={{ color: textPrimary }}
              >
                {documentoVistaPrevia.nombre}
              </h3>
              {documentoVistaPrevia.descripcion && (
                <p 
                  className="text-sm mb-2"
                  style={{ color: textSecondary }}
                >
                  {documentoVistaPrevia.descripcion}
                </p>
              )}
            </div>

            <div className="flex justify-center items-center min-h-[400px]">
              {esImagen(documentoVistaPrevia.archivo.tipoMime) && urlVistaPrevia && (
                <img
                  src={urlVistaPrevia}
                  alt={documentoVistaPrevia.nombre}
                  className="max-w-full max-h-[80vh] object-contain rounded"
                />
              )}

              {esPDF(documentoVistaPrevia.archivo.tipoMime) && urlVistaPrevia && (
                <div className="text-center p-8 rounded flex flex-col items-center justify-center" style={{ 
                  backgroundColor: theme === 'dark' 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : 'rgba(0, 0, 0, 0.05)',
                  color: textPrimary,
                  minHeight: '400px',
                  border: `1px solid ${borderColor}`
                }}>
                  <h4 className="text-xl font-semibold mb-4" style={{ color: textPrimary }}>
                    Documento PDF
                  </h4>
                  <p className="mb-6 text-sm" style={{ color: textSecondary, maxWidth: '400px' }}>
                    Para ver este documento, ábrelo en una nueva pestaña o descárgalo.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        window.open(urlVistaPrevia, '_blank', 'noopener,noreferrer');
                      }}
                      className="px-6 py-3 rounded font-medium transition-colors"
                      style={{
                        backgroundColor: buttonPrimary,
                        color: theme === 'dark' ? '#93C5FD' : '#FFFFFF'
                      }}
                    >
                      <FaEye className="inline mr-2" />
                      Abrir en nueva pestaña
                    </button>
                    <button
                      onClick={() => handleDescargar(documentoVistaPrevia)}
                      className="px-6 py-3 rounded font-medium transition-colors"
                      style={{
                        backgroundColor: theme === 'dark' ? '#2D2D2D' : '#F3F4F6',
                        color: textPrimary,
                        border: `1px solid ${borderColor}`
                      }}
                    >
                      <FaDownload className="inline mr-2" />
                      Descargar
                    </button>
                  </div>
                </div>
              )}

              {esVideo(documentoVistaPrevia.archivo.tipoMime) && urlVistaPrevia && (
                <video
                  src={urlVistaPrevia}
                  controls
                  className="max-w-full max-h-[80vh] rounded"
                >
                  Tu navegador no soporta la reproducción de video.
                </video>
              )}

              {!puedePrevisualizar(documentoVistaPrevia.archivo.tipoMime) && (
                <div className="text-center p-8 rounded" style={{ 
                  backgroundColor: theme === 'dark' 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : 'rgba(0, 0, 0, 0.05)',
                  color: textPrimary,
                  border: `1px solid ${borderColor}`
                }}>
                  <p className="mb-4" style={{ color: textPrimary }}>
                    Este tipo de archivo no se puede previsualizar en el navegador.
                  </p>
                  <button
                    onClick={() => handleDescargar(documentoVistaPrevia)}
                    className="px-4 py-2 rounded font-medium"
                    style={{
                      backgroundColor: buttonPrimary,
                      color: theme === 'dark' ? '#93C5FD' : '#FFFFFF'
                    }}
                  >
                    <FaDownload className="inline mr-2" />
                    Descargar para ver
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setMostrarVistaPrevia(false);
                  setDocumentoVistaPrevia(null);
                  setUrlVistaPrevia(null);
                }}
                className="px-4 py-2 rounded font-medium transition-colors"
                style={{
                  backgroundColor: theme === 'dark' ? '#2D2D2D' : '#F3F4F6',
                  color: textPrimary,
                  border: `1px solid ${borderColor}`
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
