import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { FaSearch, FaDownload, FaTrash, FaEdit, FaTimes, FaTag, FaUser, FaCalendar, FaEye } from 'react-icons/fa';

export default function ListaDocumentos() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [etiquetaFiltro, setEtiquetaFiltro] = useState('');
  const [etiquetasDisponibles, setEtiquetasDisponibles] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [documentoEditando, setDocumentoEditando] = useState(null);
  const [mostrarFormularioEdicion, setMostrarFormularioEdicion] = useState(false);
  const [documentoVistaPrevia, setDocumentoVistaPrevia] = useState(null);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [urlVistaPrevia, setUrlVistaPrevia] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const buttonPrimary = theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#2563EB';
  const buttonDanger = theme === 'dark' ? 'rgba(220, 38, 38, 0.2)' : '#EF4444';

  useEffect(() => {
    cargarDocumentos();
    cargarEtiquetas();
    // Los filtros determinan cuándo se actualiza el listado.
  }, [pagina, busqueda, etiquetaFiltro]); // eslint-disable-line react-hooks/exhaustive-deps

  const cargarDocumentos = async () => {
    try {
      setCargando(true);
      const params = {
        limit: 10,
        skip: (pagina - 1) * 10
      };

      if (busqueda) {
        params.busqueda = busqueda;
      }

      if (etiquetaFiltro) {
        params.etiqueta = etiquetaFiltro;
      }

      const response = await api.get('/api/documentos/listar', { params });
      setDocumentos(response.data.documentos || []);
      setTotalPaginas(response.data.totalPaginas || 1);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error cargando documentos:', error);
      let mensajeError = t('admin.ui.documentos.lista.loadFailed');
      
      if (error.response?.status === 404) {
        mensajeError = t('admin.ui.documentos.lista.routeNotFound');
      } else if (error.response?.status === 403) {
        const login = localStorage.getItem('login');
        mensajeError = t('admin.ui.documentos.lista.forbidden', { login });
      } else if (error.response?.status === 401) {
        mensajeError = t('admin.ui.documentos.lista.unauthenticated');
      } else if (error.response?.data?.message) {
        mensajeError = error.response.data.message;
      }
      
      setMensaje({
        tipo: 'error',
        texto: mensajeError
      });
    } finally {
      setCargando(false);
    }
  };

  const cargarEtiquetas = async () => {
    try {
      const response = await api.get('/api/documentos/etiquetas');
      setEtiquetasDisponibles(response.data.etiquetas || []);
    } catch (error) {
      console.error('Error cargando etiquetas:', error);
      // No mostrar error de etiquetas si es 404, solo loguear
      if (error.response?.status !== 404) {
        console.warn('No se pudieron cargar las etiquetas:', error.message);
      }
    }
  };

  const handleDescargar = async (documento) => {
    try {
      const response = await api.get(`/api/documentos/${documento._id}/descargar`, {
        responseType: 'blob'
      });

      // Crear URL del blob y descargar
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
      setMensaje({
        tipo: 'error',
        texto: t('admin.ui.documentos.lista.downloadFailed')
      });
    }
  };

  const handleEliminar = async (documento) => {
    if (!window.confirm(t('admin.ui.documentos.lista.confirmDelete', { name: documento.nombre }))) {
      return;
    }

    try {
      await api.delete(`/api/documentos/${documento._id}`);
      setMensaje({
        tipo: 'exito',
        texto: t('admin.ui.documentos.lista.deleteSuccess')
      });
      cargarDocumentos();
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    } catch (error) {
      console.error('Error eliminando documento:', error);
      setMensaje({
        tipo: 'error',
        texto: t('admin.ui.documentos.lista.deleteFailed')
      });
    }
  };

  const handleEditar = (documento) => {
    setDocumentoEditando(documento);
    setMostrarFormularioEdicion(true);
  };

  const handleVistaPrevia = async (documento) => {
    try {
      setDocumentoVistaPrevia(documento);
      setMostrarVistaPrevia(true);
      
      // Obtener la URL del archivo (maneja rutas /uploads y referencias s3: vía proxy)
      const { getUploadsUrlCandidates } = await import('../../config/apiConfig');
      const url = getUploadsUrlCandidates(documento.archivo.ruta)[0] || '';
      setUrlVistaPrevia(url);
    } catch (error) {
      console.error('Error abriendo vista previa:', error);
      setMensaje({
        tipo: 'error',
        texto: t('admin.ui.documentos.lista.previewFailed')
      });
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

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const nombre = formData.get('nombre');
    const descripcion = formData.get('descripcion');
    const etiquetas = formData.get('etiquetas');

    try {
      await api.put(`/api/documentos/${documentoEditando._id}`, {
        nombre,
        descripcion,
        etiquetas
      });

      setMensaje({
        tipo: 'exito',
        texto: t('admin.ui.documentos.lista.updateSuccess')
      });

      setMostrarFormularioEdicion(false);
      setDocumentoEditando(null);
      cargarDocumentos();
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    } catch (error) {
      console.error('Error actualizando documento:', error);
      setMensaje({
        tipo: 'error',
        texto: t('admin.ui.documentos.lista.updateFailed')
      });
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearTamaño = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div 
      className="rounded-lg shadow-sm p-6"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`
      }}
    >
      <h2 
        className="text-xl font-bold mb-4"
        style={{ color: textPrimary }}
      >
        {t('admin.ui.documentos.lista.title', { count: total })}
      </h2>

      {/* Filtros */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <FaSearch 
              className="absolute left-3 top-1/2 transform -translate-y-1/2"
              style={{ color: textSecondary }}
            />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
              placeholder={t('admin.ui.documentos.lista.searchPlaceholder')}
              className="w-full pl-10 pr-3 py-2 rounded text-sm"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                border: `1px solid ${borderColor}`
              }}
            />
          </div>
        </div>

        {/* Filtro por etiqueta */}
        {etiquetasDisponibles.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setEtiquetaFiltro('');
                setPagina(1);
              }}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                !etiquetaFiltro ? 'font-semibold' : ''
              }`}
              style={{
                backgroundColor: !etiquetaFiltro 
                  ? buttonPrimary 
                  : (theme === 'dark' ? '#2D2D2D' : '#F3F4F6'),
                color: !etiquetaFiltro 
                  ? (theme === 'dark' ? '#93C5FD' : '#FFFFFF')
                  : textSecondary,
                border: `1px solid ${borderColor}`
              }}
            >
              {t('common.all')}
            </button>
            {etiquetasDisponibles.map((etiqueta) => (
              <button
                key={etiqueta}
                onClick={() => {
                  setEtiquetaFiltro(etiqueta);
                  setPagina(1);
                }}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  etiquetaFiltro === etiqueta ? 'font-semibold' : ''
                }`}
                style={{
                  backgroundColor: etiquetaFiltro === etiqueta
                    ? buttonPrimary
                    : (theme === 'dark' ? '#2D2D2D' : '#F3F4F6'),
                  color: etiquetaFiltro === etiqueta
                    ? (theme === 'dark' ? '#93C5FD' : '#FFFFFF')
                    : textSecondary,
                  border: `1px solid ${borderColor}`
                }}
              >
                <FaTag className="inline mr-1" />
                {etiqueta}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mensaje */}
      {mensaje.texto && (
        <div
          className={`p-3 rounded text-sm mb-4 ${
            mensaje.tipo === 'error' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
          }`}
          style={{
            color: mensaje.tipo === 'error' ? '#DC2626' : '#16A34A',
            backgroundColor: mensaje.tipo === 'error' 
              ? (theme === 'dark' ? 'rgba(220, 38, 38, 0.1)' : '#FEF2F2')
              : (theme === 'dark' ? 'rgba(22, 163, 74, 0.1)' : '#F0FDF4')
          }}
        >
          {mensaje.texto}
        </div>
      )}

      {/* Lista de documentos */}
      {cargando ? (
        <div className="text-center py-8" style={{ color: textSecondary }}>
          {t('admin.ui.documentos.lista.loading')}
        </div>
      ) : documentos.length === 0 ? (
        <div className="text-center py-8" style={{ color: textSecondary }}>
          {t('admin.ui.documentos.lista.noDocuments')}
        </div>
      ) : (
        <div className="space-y-3">
          {documentos.map((documento) => (
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
                  <h3 
                    className="font-semibold mb-1"
                    style={{ color: textPrimary }}
                  >
                    {documento.nombre}
                  </h3>
                  {documento.descripcion && (
                    <p 
                      className="text-sm mb-2"
                      style={{ color: textSecondary }}
                    >
                      {documento.descripcion}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-xs" style={{ color: textSecondary }}>
                    <span className="flex items-center gap-1">
                      <FaUser />
                      {documento.usuarioSubio.nombre}
                    </span>
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
                          className="px-2 py-1 rounded text-xs"
                          style={{
                            backgroundColor: theme === 'dark' ? '#2D2D2D' : '#E5E7EB',
                            color: textSecondary
                          }}
                        >
                          <FaTag className="inline mr-1" />
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
                        backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#22C55E',
                        color: theme === 'dark' ? '#86EFAC' : '#FFFFFF'
                      }}
                      title={t('admin.ui.documentos.lista.preview')}
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
                    title={t('common.download')}
                  >
                    <FaDownload />
                  </button>
                  <button
                    onClick={() => handleEditar(documento)}
                    className="p-2 rounded transition-colors"
                    style={{
                      backgroundColor: theme === 'dark' ? '#2D2D2D' : '#F3F4F6',
                      color: textPrimary
                    }}
                    title={t('common.edit')}
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleEliminar(documento)}
                    className="p-2 rounded transition-colors"
                    style={{
                      backgroundColor: buttonDanger,
                      color: theme === 'dark' ? '#FCA5A5' : '#FFFFFF'
                    }}
                    title={t('admin.ui.documentos.lista.delete')}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: pagina === 1 ? (theme === 'dark' ? '#2D2D2D' : '#F3F4F6') : buttonPrimary,
              color: pagina === 1 ? textSecondary : (theme === 'dark' ? '#93C5FD' : '#FFFFFF'),
              border: `1px solid ${borderColor}`
            }}
          >
            {t('common.previous')}
          </button>
          <span style={{ color: textSecondary }}>
            {t('admin.ui.documentos.lista.pageOf', { page: pagina, total: totalPaginas })}
          </span>
          <button
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: pagina === totalPaginas ? (theme === 'dark' ? '#2D2D2D' : '#F3F4F6') : buttonPrimary,
              color: pagina === totalPaginas ? textSecondary : (theme === 'dark' ? '#93C5FD' : '#FFFFFF'),
              border: `1px solid ${borderColor}`
            }}
          >
            {t('common.next')}
          </button>
        </div>
      )}

      {/* Modal de edición */}
      {mostrarFormularioEdicion && documentoEditando && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={() => {
            setMostrarFormularioEdicion(false);
            setDocumentoEditando(null);
          }}
        >
          <div
            className="rounded-lg p-6 max-w-md w-full"
            style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ color: textPrimary }} className="text-lg font-bold">
                {t('admin.ui.documentos.lista.editTitle')}
              </h3>
              <button
                onClick={() => {
                  setMostrarFormularioEdicion(false);
                  setDocumentoEditando(null);
                }}
                style={{ color: textSecondary }}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: textPrimary }}>
                  {t('admin.ui.editarPerfilUsuario.fields.name')}
                </label>
                <input
                  type="text"
                  name="nombre"
                  defaultValue={documentoEditando.nombre}
                  required
                  className="w-full rounded px-3 py-2 text-sm"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    border: `1px solid ${borderColor}`
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: textPrimary }}>
                  {t('admin.ui.documentos.subir.description')}
                </label>
                <textarea
                  name="descripcion"
                  defaultValue={documentoEditando.descripcion}
                  rows="3"
                  className="w-full rounded px-3 py-2 text-sm resize-none"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    border: `1px solid ${borderColor}`
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: textPrimary }}>
                  {t('admin.ui.documentos.subir.tags')}
                </label>
                <input
                  type="text"
                  name="etiquetas"
                  defaultValue={documentoEditando.etiquetas?.join(', ') || ''}
                  placeholder={t('admin.ui.documentos.lista.tagsCommaSeparated')}
                  className="w-full rounded px-3 py-2 text-sm"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    border: `1px solid ${borderColor}`
                  }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 rounded font-medium"
                  style={{
                    backgroundColor: buttonPrimary,
                    color: theme === 'dark' ? '#93C5FD' : '#FFFFFF'
                  }}
                >
                  {t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarFormularioEdicion(false);
                    setDocumentoEditando(null);
                  }}
                  className="flex-1 py-2 px-4 rounded font-medium"
                  style={{
                    backgroundColor: theme === 'dark' ? '#2D2D2D' : '#F3F4F6',
                    color: textPrimary,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme === 'dark' 
                ? 'rgba(255, 255, 255, 0.2)' 
                : 'rgba(0, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.1)';
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
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const container = e.target.parentElement;
                    if (container && !container.querySelector('.preview-error')) {
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'preview-error';
                      errorDiv.style.color = textPrimary;
                      errorDiv.style.textAlign = 'center';
                      errorDiv.style.padding = '2rem';
                      errorDiv.innerHTML = t('admin.ui.documentos.lista.imageLoadFailed');
                      container.appendChild(errorDiv);
                    }
                  }}
                />
              )}

              {esPDF(documentoVistaPrevia.archivo.tipoMime) && urlVistaPrevia && (
                <div 
                  className="text-center p-8 rounded flex flex-col items-center justify-center"
                  style={{ 
                    backgroundColor: theme === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(0, 0, 0, 0.05)',
                    color: textPrimary,
                    minHeight: '400px',
                    border: `1px solid ${borderColor}`
                  }}
                >
                  <div className="mb-6">
                    <svg 
                      className="mx-auto" 
                      width="120" 
                      height="120" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                      style={{ color: textSecondary, opacity: 0.7 }}
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <h4 
                    className="text-xl font-semibold mb-4"
                    style={{ color: textPrimary }}
                  >
                    {t('admin.ui.documentos.lista.pdfDocument')}
                  </h4>
                  <p 
                    className="mb-6 text-sm" 
                    style={{ color: textSecondary, maxWidth: '400px' }}
                  >
                    {t('admin.ui.documentos.lista.pdfOpenOrDownload')}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        window.open(urlVistaPrevia, '_blank', 'noopener,noreferrer');
                      }}
                      className="px-6 py-3 rounded font-medium transition-colors hover:opacity-90"
                      style={{
                        backgroundColor: buttonPrimary,
                        color: theme === 'dark' ? '#93C5FD' : '#FFFFFF'
                      }}
                    >
                      <FaEye className="inline mr-2" />
                      {t('admin.ui.documentos.lista.openInNewTab')}
                    </button>
                    <button
                      onClick={() => handleDescargar(documentoVistaPrevia)}
                      className="px-6 py-3 rounded font-medium transition-colors hover:opacity-90"
                      style={{
                        backgroundColor: theme === 'dark' ? '#2D2D2D' : '#F3F4F6',
                        color: textPrimary,
                        border: `1px solid ${borderColor}`
                      }}
                    >
                      <FaDownload className="inline mr-2" />
                      {t('common.download')}
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
                  {t('admin.ui.documentos.lista.videoNotSupported')}
                </video>
              )}

              {!puedePrevisualizar(documentoVistaPrevia.archivo.tipoMime) && (
                <div 
                  className="text-center p-8 rounded"
                  style={{ 
                    backgroundColor: theme === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(0, 0, 0, 0.05)',
                    color: textPrimary,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  <p className="mb-4" style={{ color: textPrimary }}>
                    {t('admin.ui.documentos.lista.cannotPreview')}
                  </p>
                  <p className="text-sm mb-4" style={{ color: textSecondary }}>
                    {t('admin.ui.documentos.lista.fileType')}: {documentoVistaPrevia.archivo.tipoMime}
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
                    {t('admin.ui.documentos.lista.downloadToView')}
                  </button>
                </div>
              )}
            </div>

            {/* Botones del modal - solo mostrar si NO es PDF (los PDFs tienen sus propios botones) */}
            {!esPDF(documentoVistaPrevia.archivo.tipoMime) && (
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => handleDescargar(documentoVistaPrevia)}
                  className="px-4 py-2 rounded font-medium transition-colors"
                  style={{
                    backgroundColor: buttonPrimary,
                    color: theme === 'dark' ? '#93C5FD' : '#FFFFFF'
                  }}
                >
                  <FaDownload className="inline mr-2" />
                  {t('common.download')}
                </button>
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
                  {t('common.close')}
                </button>
              </div>
            )}

            {/* Botón de cerrar para PDFs (solo cerrar, sin descargar duplicado) */}
            {esPDF(documentoVistaPrevia.archivo.tipoMime) && (
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
                  {t('common.close')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

