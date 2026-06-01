import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { FaUpload, FaFile, FaTimes } from 'react-icons/fa';

export default function SubirDocumento({ onDocumentoSubido }) {
  const { theme } = useTheme();
  const [archivo, setArchivo] = useState(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [etiquetas, setEtiquetas] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const buttonPrimary = theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#2563EB';
  const buttonPrimaryHover = theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#1D4ED8';
  const buttonText = theme === 'dark' ? '#93C5FD' : '#FFFFFF';

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivo(file);
      if (!nombre) {
        setNombre(file.name);
      }
      setMensaje({ tipo: '', texto: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!archivo) {
      setMensaje({
        tipo: 'error',
        texto: 'Por favor selecciona un archivo'
      });
      return;
    }

    setSubiendo(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('nombre', nombre || archivo.name);
      formData.append('descripcion', descripcion);
      formData.append('etiquetas', etiquetas);

      const response = await api.post('/api/documentos/subir', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setMensaje({
        tipo: 'exito',
        texto: 'Documento subido exitosamente'
      });

      // Limpiar formulario
      setArchivo(null);
      setNombre('');
      setDescripcion('');
      setEtiquetas('');
      document.getElementById('file-input').value = '';

      // Notificar al componente padre
      if (onDocumentoSubido) {
        onDocumentoSubido();
      }

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setMensaje({ tipo: '', texto: '' });
      }, 3000);
    } catch (error) {
      console.error('Error subiendo documento:', error);
      setMensaje({
        tipo: 'error',
        texto: error.response?.data?.message || 'Error al subir el documento'
      });
    } finally {
      setSubiendo(false);
    }
  };

  const eliminarArchivo = () => {
    setArchivo(null);
    document.getElementById('file-input').value = '';
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
        Subir Documento
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input de archivo */}
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: textPrimary }}
          >
            Archivo
          </label>
          <div className="relative">
            <input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="file-input"
              className="flex items-center justify-center w-full p-4 border-2 border-dashed rounded cursor-pointer transition-colors"
              style={{
                borderColor: borderColor,
                backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB'
              }}
            >
              <FaFile className="mr-2" style={{ color: textSecondary }} />
              <span style={{ color: textSecondary }}>
                {archivo ? archivo.name : 'Seleccionar archivo'}
              </span>
            </label>
          </div>
          {archivo && (
            <div className="mt-2 flex items-center justify-between p-2 rounded" style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB' }}>
              <span className="text-sm" style={{ color: textSecondary }}>
                {(archivo.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <button
                type="button"
                onClick={eliminarArchivo}
                className="p-1 rounded hover:bg-opacity-20"
                style={{ color: textSecondary }}
              >
                <FaTimes />
              </button>
            </div>
          )}
        </div>

        {/* Nombre */}
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: textPrimary }}
          >
            Nombre del documento
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del documento"
            className="w-full rounded px-3 py-2 text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              border: `1px solid ${borderColor}`
            }}
          />
        </div>

        {/* Descripción */}
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: textPrimary }}
          >
            Descripción
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción del documento (opcional)"
            rows="3"
            className="w-full rounded px-3 py-2 text-sm resize-none"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              border: `1px solid ${borderColor}`
            }}
          />
        </div>

        {/* Etiquetas */}
        <div>
          <label 
            className="block text-sm font-medium mb-2"
            style={{ color: textPrimary }}
          >
            Etiquetas
          </label>
          <input
            type="text"
            value={etiquetas}
            onChange={(e) => setEtiquetas(e.target.value)}
            placeholder="Etiquetas separadas por comas (opcional)"
            className="w-full rounded px-3 py-2 text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              border: `1px solid ${borderColor}`
            }}
          />
          <p className="text-xs mt-1" style={{ color: textSecondary }}>
            Ejemplo: importante, contrato, factura
          </p>
        </div>

        {/* Mensaje */}
        {mensaje.texto && (
          <div
            className={`p-3 rounded text-sm ${
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

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={subiendo || !archivo}
          className="w-full py-2 px-4 rounded font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: subiendo || !archivo ? (theme === 'dark' ? '#2D2D2D' : '#E5E7EB') : buttonPrimary,
            color: subiendo || !archivo ? textSecondary : buttonText
          }}
          onMouseEnter={(e) => {
            if (!subiendo && archivo) {
              e.target.style.backgroundColor = buttonPrimaryHover;
            }
          }}
          onMouseLeave={(e) => {
            if (!subiendo && archivo) {
              e.target.style.backgroundColor = buttonPrimary;
            }
          }}
        >
          <FaUpload />
          {subiendo ? 'Subiendo...' : 'Subir Documento'}
        </button>
      </form>
    </div>
  );
}

