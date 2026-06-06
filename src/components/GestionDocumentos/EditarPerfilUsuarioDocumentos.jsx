import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { obtenerPerfil, actualizarPerfil } from '../../services/userService';
import { getUploadsUrlCandidates, isDevelopmentEnv } from '../../config/apiConfig';
import { FaTimes, FaUpload, FaFile, FaTrash, FaDownload, FaEye, FaCalendar, FaUser, FaSpinner, FaCheckCircle } from 'react-icons/fa';

export default function EditarPerfilUsuarioDocumentos({ usuario, onCerrar }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [form, setForm] = useState({});
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [nombreDoc, setNombreDoc] = useState('');
  const [descripcionDoc, setDescripcionDoc] = useState('');
  const [etiquetasDoc, setEtiquetasDoc] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [error, setError] = useState('');

  const usuarioId = usuario._id || usuario.id;
  const esExterno = Boolean(usuario.esExterno);
  const tipoUsuarioSesion = localStorage.getItem('tipoUsuario') || 'normal';
  // En esta pantalla se pueden editar perfiles de distintos orígenes.
  // Priorizar señales del usuario objetivo evita enviar datos al endpoint equivocado.
  const esPerfilSecur = !esExterno && (
    usuario?.login !== undefined ||
    usuario?.privAdmin !== undefined ||
    usuario?.pswdLastUpdated !== undefined
  );
  const tipoUsuario = esPerfilSecur ? 'secur' : tipoUsuarioSesion;

  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const buttonPrimary = theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#2563EB';
  const buttonDanger = theme === 'dark' ? 'rgba(220, 38, 38, 0.2)' : '#EF4444';

  const mapPerfilExternoToForm = (perfil = {}) => {
    const celular = (perfil.celulares || perfil.telefono || '').toString().trim();
    const telefonoFijo = (perfil.telefonoFijo || '').toString().trim();
    const correo = (perfil.email || perfil.correosElectronicos || perfil.correo || '').toString().trim();
    const cargo = (perfil.cargo || perfil.cargos || '').toString().trim();

    return {
      nombre: (perfil.nombre || perfil.name || '').toString().trim(),
      cedula: (perfil.cedula || '').toString().trim(),
      correosElectronicos: correo,
      telefonoFijo,
      celulares: celular,
      empresa: (perfil.empresa || '').toString().trim(),
      sucursal: (perfil.sucursal || '').toString().trim(),
      cargos: cargo,
      fechaNacimiento: formatearFecha(perfil.fechaNacimiento),
      tipoSangre: (perfil.tipoSangre || '').toString().trim(),
      direccion: (perfil.direccion || '').toString().trim(),
      fechaIngreso: formatearFecha(perfil.fechaIngreso),
      salario: perfil.salario ?? '',
      fechaModificacionSueldo: formatearFecha(perfil.fechaModificacionSueldo),
      tipoContrato: (perfil.tipoContrato || '').toString().trim(),
      fechaModificacionContrato: formatearFecha(perfil.fechaModificacionContrato),
      vencimiento: formatearFecha(perfil.vencimiento),
      aportesSalud: (perfil.aportesSalud || '').toString().trim(),
      aportesPension: (perfil.aportesPension || '').toString().trim(),
      aportesCesantias: (perfil.aportesCesantias || '').toString().trim(),
      aportesARL: (perfil.aportesARL || '').toString().trim(),
      aportesCCF: (perfil.aportesCCF || '').toString().trim(),
      evaluacionPeriodoPrueba: (perfil.evaluacionPeriodoPrueba || '').toString().trim()
    };
  };

  const mapFormToPerfilExternoPayload = (formData = {}) => {
    const telefonoFijo = (formData.telefonoFijo || '').toString().trim();
    const celulares = (formData.celulares || '').toString().trim();
    const email = (formData.correosElectronicos || formData.email || formData.correo || '').toString().trim();
    const cargo = (formData.cargos || formData.cargo || '').toString().trim();

    return {
      nombre: (formData.nombre || formData.name || '').toString().trim(),
      cedula: (formData.cedula || '').toString().trim(),
      email,
      telefono: celulares, // compatibilidad con campo legado
      telefonoFijo,
      celulares,
      empresa: (formData.empresa || '').toString().trim(),
      sucursal: (formData.sucursal || '').toString().trim(),
      cargo,
      fechaNacimiento: formData.fechaNacimiento || '',
      tipoSangre: (formData.tipoSangre || '').toString().trim(),
      direccion: (formData.direccion || '').toString().trim(),
      fechaIngreso: formData.fechaIngreso || '',
      salario: formData.salario ?? '',
      fechaModificacionSueldo: formData.fechaModificacionSueldo || '',
      tipoContrato: (formData.tipoContrato || '').toString().trim(),
      fechaModificacionContrato: formData.fechaModificacionContrato || '',
      vencimiento: formData.vencimiento || '',
      aportesSalud: (formData.aportesSalud || '').toString().trim(),
      aportesPension: (formData.aportesPension || '').toString().trim(),
      aportesCesantias: (formData.aportesCesantias || '').toString().trim(),
      aportesARL: (formData.aportesARL || '').toString().trim(),
      aportesCCF: (formData.aportesCCF || '').toString().trim(),
      evaluacionPeriodoPrueba: (formData.evaluacionPeriodoPrueba || '').toString().trim()
    };
  };

  useEffect(() => {
    cargarDatosUsuario();
    cargarDocumentos();
  }, [usuarioId]);

  const formatearFecha = (fecha) => {
    if (!fecha) return '';
    try {
      if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return fecha;
      }
      if (typeof fecha === 'string') {
        const match = fecha.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          return `${match[1]}-${match[2]}-${match[3]}`;
        }
      }
      // Parsear como fecha local para evitar problemas de zona horaria
      let date;
      if (fecha instanceof Date) {
        date = fecha;
      } else {
        date = new Date(fecha);
      }
      if (isNaN(date.getTime())) return '';
      
      // Si es un string en formato YYYY-MM-DD, parsearlo como fecha local
      if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
        const [year, month, day] = fecha.split('T')[0].split('-').map(Number);
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      
      // Usar métodos locales en lugar de UTC
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return '';
    }
  };

  const cargarDatosUsuario = async (forzarBackend = false) => {
    try {
      if (esExterno) {
        if (forzarBackend) {
          try {
            const { data } = await api.get('/api/documentos/perfiles-externos', {
              params: { incluirInactivos: true }
            });
            const perfiles = Array.isArray(data?.perfiles) ? data.perfiles : [];
            const perfilActualizado = perfiles.find((p) => String(p._id) === String(usuarioId));
            if (perfilActualizado) {
              setForm(mapPerfilExternoToForm(perfilActualizado));
              setCargando(false);
              return;
            }
          } catch (error) {
            console.warn('No se pudo recargar perfil externo desde backend, usando datos locales:', error);
          }
        }

        setForm(mapPerfilExternoToForm(usuario));
        setCargando(false);
        return;
      }

      // Primero intentar usar los datos del usuario que ya tenemos para una carga inicial rápida.
      // Después de guardar, forzamos recarga desde backend para evitar mostrar datos desactualizados.
      if (!forzarBackend && usuario && (usuario._id === usuarioId || usuario.id === usuarioId)) {
        console.log('✅ Usando datos del usuario que ya tenemos');
        setForm({
          name: usuario.name || '',
          email: usuario.email || '',
          phone: usuario.phone || '',
          role: usuario.role || '',
          nombre: usuario.nombre || '',
          apellido: usuario.apellido || '',
          cedula: usuario.cedula || '',
          fechaNacimiento: formatearFecha(usuario.fechaNacimiento),
          tipoSangre: usuario.tipoSangre || '',
          direccion: usuario.direccion || '',
          telefonoFijo: usuario.telefonoFijo || '',
          celulares: usuario.celulares || '',
          correosElectronicos: usuario.correosElectronicos || '',
          empresa: usuario.empresa || '',
          fechaIngreso: formatearFecha(usuario.fechaIngreso),
          cargos: usuario.cargos || '',
          salario: usuario.salario || '',
          fechaModificacionSueldo: formatearFecha(usuario.fechaModificacionSueldo),
          tipoContrato: usuario.tipoContrato || '',
          fechaModificacionContrato: formatearFecha(usuario.fechaModificacionContrato),
          vencimiento: formatearFecha(usuario.vencimiento),
          aportesSalud: usuario.aportesSalud || '',
          aportesPension: usuario.aportesPension || '',
          aportesCesantias: usuario.aportesCesantias || '',
          aportesARL: usuario.aportesARL || '',
          aportesCCF: usuario.aportesCCF || '',
          evaluacionPeriodoPrueba: usuario.evaluacionPeriodoPrueba || '',
          sucursal: usuario.sucursal || '',
          passwordConfirm: ''
        });
        setCargando(false);
        return;
      }
      
      // Cargar datos completos y actualizados desde backend
      console.log('🔄 Cargando datos del usuario desde el backend...');
      const token = localStorage.getItem('token');
      const { data } = await obtenerPerfil(token, tipoUsuario, usuarioId);
      
      setForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        role: data.role || '',
        nombre: data.nombre || '',
        apellido: data.apellido || '',
        cedula: data.cedula || '',
        fechaNacimiento: formatearFecha(data.fechaNacimiento),
        tipoSangre: data.tipoSangre || '',
        direccion: data.direccion || '',
        telefonoFijo: data.telefonoFijo || '',
        celulares: data.celulares || '',
        correosElectronicos: data.correosElectronicos || '',
        empresa: data.empresa || '',
        fechaIngreso: formatearFecha(data.fechaIngreso),
        cargos: data.cargos || '',
        salario: data.salario || '',
        fechaModificacionSueldo: formatearFecha(data.fechaModificacionSueldo),
        tipoContrato: data.tipoContrato || '',
        fechaModificacionContrato: formatearFecha(data.fechaModificacionContrato),
        vencimiento: formatearFecha(data.vencimiento),
        aportesSalud: data.aportesSalud || '',
        aportesPension: data.aportesPension || '',
        aportesCesantias: data.aportesCesantias || '',
        aportesARL: data.aportesARL || '',
        aportesCCF: data.aportesCCF || '',
        evaluacionPeriodoPrueba: data.evaluacionPeriodoPrueba || '',
        sucursal: data.sucursal || '',
        passwordConfirm: ''
      });
    } catch (err) {
      console.error('Error cargando datos del usuario:', err);
      setError('Error al cargar los datos del usuario');
    } finally {
      setCargando(false);
    }
  };

  const cargarDocumentos = async () => {
    try {
      console.log(`📄 Intentando cargar documentos para usuario: ${usuarioId}`);
      const response = await api.get(`/api/documentos/usuario/${usuarioId}`);
      console.log('✅ Documentos cargados:', response.data);
      setDocumentos(response.data.documentos || []);
    } catch (error) {
      console.error('Error cargando documentos:', error);
      // Si el endpoint no existe aún, simplemente mostrar lista vacía
      if (error.response?.status === 404) {
        console.warn('⚠️ Endpoint de documentos por usuario no disponible aún. Mostrando lista vacía.');
        setDocumentos([]);
      }
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmitPerfil = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });
    setError('');
    setGuardando(true);
    
    const token = localStorage.getItem('token');
    try {
      if (esExterno) {
        const payloadExterno = mapFormToPerfilExternoPayload(form);
        await api.put(`/api/documentos/perfiles-externos/${usuarioId}`, payloadExterno);
        setMensaje({ tipo: 'exito', texto: '✅ Perfil externo actualizado exitosamente' });
        setTimeout(() => {
          cargarDatosUsuario(true);
          setMensaje({ tipo: '', texto: '' });
        }, 1500);
        return;
      }

      let dataToSend = {};
      if (tipoUsuario === 'secur') {
        dataToSend = {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          cedula: form.cedula,
          fechaNacimiento: form.fechaNacimiento,
          tipoSangre: form.tipoSangre,
          direccion: form.direccion,
          telefonoFijo: form.telefonoFijo,
          celulares: form.celulares,
          correosElectronicos: form.correosElectronicos,
          empresa: form.empresa,
          fechaIngreso: form.fechaIngreso,
          cargos: form.cargos,
          salario: form.salario,
          fechaModificacionSueldo: form.fechaModificacionSueldo,
          tipoContrato: form.tipoContrato,
          fechaModificacionContrato: form.fechaModificacionContrato,
          vencimiento: form.vencimiento,
          aportesSalud: form.aportesSalud,
          aportesPension: form.aportesPension,
          aportesCesantias: form.aportesCesantias,
          aportesARL: form.aportesARL,
          aportesCCF: form.aportesCCF,
          evaluacionPeriodoPrueba: form.evaluacionPeriodoPrueba,
          sucursal: form.sucursal,
          passwordConfirm: form.passwordConfirm
        };
      } else {
        dataToSend = {
          nombre: form.nombre,
          apellido: form.apellido,
          fechaNacimiento: form.fechaNacimiento,
          cedula: form.cedula,
          celular: form.celular,
          correo: form.correo,
          empresa: form.empresa,
          tipoSangre: form.tipoSangre,
          direccion: form.direccion,
          telefonoFijo: form.telefonoFijo,
          celulares: form.celulares,
          fechaIngreso: form.fechaIngreso,
          cargos: form.cargos,
          salario: form.salario,
          fechaModificacionSueldo: form.fechaModificacionSueldo,
          tipoContrato: form.tipoContrato,
          fechaModificacionContrato: form.fechaModificacionContrato,
          vencimiento: form.vencimiento,
          correosElectronicos: form.correosElectronicos,
          aportesSalud: form.aportesSalud,
          aportesPension: form.aportesPension,
          aportesCesantias: form.aportesCesantias,
          aportesARL: form.aportesARL,
          aportesCCF: form.aportesCCF,
          evaluacionPeriodoPrueba: form.evaluacionPeriodoPrueba,
          sucursal: form.sucursal,
          passwordConfirm: form.passwordConfirm
        };
      }
      
      await actualizarPerfil(dataToSend, token, tipoUsuario, usuarioId);
      setMensaje({ tipo: 'exito', texto: '✅ Perfil actualizado exitosamente' });
      // Recargar datos después de guardar
      setTimeout(() => {
        cargarDatosUsuario(true);
        setMensaje({ tipo: '', texto: '' });
      }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.mensaje || err.response?.data?.message || 'Error al actualizar el perfil';
      setError(errorMsg);
      setMensaje({ tipo: 'error', texto: `❌ ${errorMsg}` });
      setTimeout(() => {
        setMensaje({ tipo: '', texto: '' });
        setError('');
      }, 5000);
    } finally {
      setGuardando(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivo(file);
      if (!nombreDoc) {
        setNombreDoc(file.name);
      }
    }
  };

  const handleSubmitDocumento = async (e) => {
    e.preventDefault();
    if (!archivo) {
      setMensaje({ tipo: 'error', texto: 'Por favor selecciona un archivo' });
      return;
    }

    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('nombre', nombreDoc || archivo.name);
      formData.append('descripcion', descripcionDoc);
      formData.append('etiquetas', etiquetasDoc);

      await api.post(`/api/documentos/usuario/${usuarioId}/subir`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMensaje({ tipo: 'exito', texto: 'Documento subido exitosamente' });
      setArchivo(null);
      setNombreDoc('');
      setDescripcionDoc('');
      setEtiquetasDoc('');
      document.getElementById('file-input-doc').value = '';
      cargarDocumentos();
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.response?.data?.message || 'Error al subir el documento' });
    } finally {
      setSubiendo(false);
    }
  };

  const handleEliminarDocumento = async (documentoId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este documento?')) {
      return;
    }
    try {
      await api.delete(`/api/documentos/${documentoId}`);
      setMensaje({ tipo: 'exito', texto: 'Documento eliminado exitosamente' });
      cargarDocumentos();
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error al eliminar el documento' });
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
      // En DEV, si el documento fue subido en PROD, evitar fetch (CORS) y descargar por enlace directo.
      try {
        const ruta = documento?.archivo?.ruta || '';
        const candidatos = getUploadsUrlCandidates(ruta);
        const ordenados = isDevelopmentEnv && candidatos.length > 1
          ? [candidatos[candidatos.length - 1], ...candidatos.slice(0, -1)]
          : candidatos;

        if (ordenados.length > 0) {
          const link = document.createElement('a');
          link.href = ordenados[0];
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.setAttribute('download', documento?.archivo?.nombreOriginal || documento?.nombre || 'documento');
          document.body.appendChild(link);
          link.click();
          link.remove();
          return;
        }
      } catch {
        // Si también falla el fallback, mostramos mensaje estándar.
      }
      setMensaje({ tipo: 'error', texto: 'Error al descargar el documento (no disponible en este entorno)' });
    }
  };

  const handleVistaPrevia = async (documento) => {
    try {
      const ruta = documento.archivo.ruta.startsWith('/') 
        ? documento.archivo.ruta 
        : `/${documento.archivo.ruta}`;
      const candidatos = getUploadsUrlCandidates(ruta);
      const url = isDevelopmentEnv && candidatos.length > 1
        ? candidatos[candidatos.length - 1]
        : (candidatos[0] || null);
      if (!url) {
        setMensaje({ tipo: 'error', texto: 'No se pudo resolver la ruta del documento' });
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error al abrir la vista previa' });
    }
  };

  const formatearFechaMostrar = (fecha) => {
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

  if (cargando) {
    return (
      <div className="p-6 text-center" style={{ color: textSecondary }}>
        Cargando datos del usuario...
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold" style={{ color: textPrimary }}>
          Editar Perfil y Documentos - {usuario.name || usuario.nombre || 'Usuario'}
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

      {/* Mensajes */}
      {mensaje.texto && (
        <div
          className={`p-4 rounded-lg text-base font-semibold mb-4 shadow-lg border-2 flex items-center gap-3 ${
            mensaje.tipo === 'error' 
              ? 'border-red-500' 
              : 'border-green-500'
          }`}
          style={{
            color: mensaje.tipo === 'error' 
              ? (theme === 'dark' ? '#FCA5A5' : '#DC2626')
              : (theme === 'dark' ? '#86EFAC' : '#16A34A'),
            backgroundColor: mensaje.tipo === 'error' 
              ? (theme === 'dark' ? 'rgba(220, 38, 38, 0.2)' : '#FEF2F2')
              : (theme === 'dark' ? 'rgba(22, 163, 74, 0.2)' : '#F0FDF4')
          }}
        >
          {mensaje.tipo === 'exito' ? (
            <FaCheckCircle className="text-xl flex-shrink-0" />
          ) : (
            <FaTimes className="text-xl flex-shrink-0" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {error && !mensaje.texto && (
        <div 
          className="p-4 rounded-lg text-base font-semibold mb-4 shadow-lg border-2 border-red-500 flex items-center gap-3"
          style={{ 
            color: theme === 'dark' ? '#FCA5A5' : '#DC2626',
            backgroundColor: theme === 'dark' ? 'rgba(220, 38, 38, 0.2)' : '#FEF2F2'
          }}
        >
          <FaTimes className="text-xl flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda: Formulario de datos del usuario */}
        <div className="space-y-6">
          <div 
            className="rounded-lg shadow-sm p-6"
            style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
          >
            <h4 className="text-lg font-bold mb-4" style={{ color: textPrimary }}>
              Datos del Empleado
            </h4>
            <form onSubmit={handleSubmitPerfil} className="space-y-4">
              {/* Información Personal */}
              <div className="space-y-3">
                <h5 className={`text-sm font-bold border-b pb-2 ${isDark ? 'text-blue-300 border-blue-600' : 'text-blue-700 border-blue-300'}`}>
                  📋 Información Personal
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Empresa</label>
                    <select name="empresa" value={form.empresa || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}>
                      <option value="">Seleccione</option>
                      <option value="Proser Riesgos">Proser Riesgos</option>
                      <option value="Proser Ajustes">Proser Ajustes</option>
                      <option value="Proser Puertos">Proser Puertos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Sucursal</label>
                    <select name="sucursal" value={form.sucursal || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}>
                      <option value="">Seleccione</option>
                      <option value="Barranquilla">Barranquilla</option>
                      <option value="Bogotá">Bogotá</option>
                      <option value="Medellín">Medellín</option>
                      <option value="Cali">Cali</option>
                      <option value="Cartagena">Cartagena</option>
                      <option value="Santa Marta">Santa Marta</option>
                      <option value="Buenaventura">Buenaventura</option>
                      <option value="Tumaco">Tumaco</option>
                      <option value="Turbo">Turbo</option>
                      <option value="Bucaramanga">Bucaramanga</option>
                      <option value="Pereira">Pereira</option>
                      <option value="Manizales">Manizales</option>
                      <option value="Cúcuta">Cúcuta</option>
                      <option value="Ibagué">Ibagué</option>
                      <option value="Villavicencio">Villavicencio</option>
                      <option value="Pasto">Pasto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Nombre</label>
                    <input type="text" name={esExterno ? 'nombre' : (tipoUsuario === 'secur' ? 'name' : 'nombre')} value={form.name || form.nombre || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Cédula</label>
                    <input type="text" name="cedula" value={form.cedula || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Fecha Nacimiento</label>
                    <input type="date" name="fechaNacimiento" value={form.fechaNacimiento || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Tipo Sangre</label>
                    <select name="tipoSangre" value={form.tipoSangre || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}>
                      <option value="">Seleccione</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Dirección</label>
                    <input type="text" name="direccion" value={form.direccion || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                </div>
              </div>

              {/* Información de Contacto */}
              <div className="space-y-3">
                <h5 className={`text-sm font-bold border-b pb-2 ${isDark ? 'text-yellow-300 border-yellow-600' : 'text-yellow-700 border-yellow-300'}`}>
                  📞 Información de Contacto
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Teléfono Fijo</label>
                    <input type="text" name="telefonoFijo" value={form.telefonoFijo || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Celular(es)</label>
                    <input type="text" name="celulares" value={form.celulares || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Correo(s)</label>
                    <input type="text" name="correosElectronicos" value={form.correosElectronicos || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                </div>
              </div>

              {/* Información Laboral */}
              <div className="space-y-3">
                <h5 className={`text-sm font-bold border-b pb-2 ${isDark ? 'text-green-300 border-green-600' : 'text-green-700 border-green-300'}`}>
                  💼 Información Laboral
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Fecha Ingreso</label>
                    <input type="date" name="fechaIngreso" value={form.fechaIngreso || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Cargo(s)</label>
                    <input type="text" name="cargos" value={form.cargos || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Salario</label>
                    <input type="number" name="salario" value={form.salario || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Fecha Mod. Sueldo</label>
                    <input type="date" name="fechaModificacionSueldo" value={form.fechaModificacionSueldo || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                </div>
              </div>

              {/* Información Contractual */}
              <div className="space-y-3">
                <h5 className={`text-sm font-bold border-b pb-2 ${isDark ? 'text-purple-300 border-purple-600' : 'text-purple-700 border-purple-300'}`}>
                  📄 Información Contractual
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Tipo Contrato</label>
                    <select name="tipoContrato" value={form.tipoContrato || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}>
                      <option value="">Seleccione</option>
                      <option value="Término Indefinido">Término Indefinido</option>
                      <option value="Término Fijo">Término Fijo</option>
                      <option value="Obra o Labor">Obra o Labor</option>
                      <option value="Prestación de Servicios">Prestación de Servicios</option>
                      <option value="Aprendizaje">Aprendizaje</option>
                      <option value="Temporal / Ocasional">Temporal / Ocasional</option>
                      <option value="Teletrabajo">Teletrabajo</option>
                      <option value="Trabajo Remoto">Trabajo Remoto</option>
                      <option value="Medio Tiempo">Medio Tiempo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Fecha Mod. Contrato</label>
                    <input type="date" name="fechaModificacionContrato" value={form.fechaModificacionContrato || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Vencimiento</label>
                    <input type="date" name="vencimiento" value={form.vencimiento || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                </div>
              </div>

              {/* Aportes */}
              <div className="space-y-3">
                <h5 className={`text-sm font-bold border-b pb-2 ${isDark ? 'text-orange-300 border-orange-600' : 'text-orange-700 border-orange-300'}`}>
                  💳 Aportes
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Salud</label>
                    <input type="text" name="aportesSalud" value={form.aportesSalud || ''} onChange={handleChange} className="w-full px-2 py-1 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Pensión</label>
                    <input type="text" name="aportesPension" value={form.aportesPension || ''} onChange={handleChange} className="w-full px-2 py-1 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Cesantías</label>
                    <input type="text" name="aportesCesantias" value={form.aportesCesantias || ''} onChange={handleChange} className="w-full px-2 py-1 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>ARL</label>
                    <input type="text" name="aportesARL" value={form.aportesARL || ''} onChange={handleChange} className="w-full px-2 py-1 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>C.C.F.</label>
                    <input type="text" name="aportesCCF" value={form.aportesCCF || ''} onChange={handleChange} className="w-full px-2 py-1 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
                  </div>
                </div>
              </div>

              {/* Información Adicional */}
              <div className="space-y-3">
                <h5 className={`text-sm font-bold border-b pb-2 ${isDark ? 'text-red-300 border-red-600' : 'text-red-700 border-red-300'}`}>
                  ➕ Información Adicional
                </h5>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Evaluación</label>
                  <select name="evaluacionPeriodoPrueba" value={form.evaluacionPeriodoPrueba || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}>
                    <option value="">Seleccione</option>
                    <option value="Aprobado">Aprobado</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="No Aprobado">No Aprobado</option>
                  </select>
                </div>
                {!esExterno && (
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Confirma tu contraseña para guardar cambios</label>
                    <input type="password" name="passwordConfirm" value={form.passwordConfirm || ''} onChange={handleChange} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} required />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="w-full py-2 px-4 rounded font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{
                  backgroundColor: guardando 
                    ? (theme === 'dark' ? '#2D2D2D' : '#E5E7EB')
                    : buttonPrimary,
                  color: guardando 
                    ? textSecondary
                    : (theme === 'dark' ? '#93C5FD' : '#FFFFFF')
                }}
              >
                {guardando ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    Guardar cambios
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Columna derecha: Subir documentos y historial */}
        <div className="space-y-6">
          {/* Subir documento */}
          <div 
            className="rounded-lg shadow-sm p-6"
            style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
          >
            <h4 className="text-lg font-bold mb-4" style={{ color: textPrimary }}>
              Subir Nuevo Documento
            </h4>
            <form onSubmit={handleSubmitDocumento} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Archivo</label>
                <input
                  id="file-input-doc"
                  type="file"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 rounded border text-xs"
                  style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
                />
                {archivo && (
                  <p className="text-xs mt-1" style={{ color: textSecondary }}>
                    {archivo.name} ({(archivo.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Nombre</label>
                <input type="text" value={nombreDoc} onChange={(e) => setNombreDoc(e.target.value)} className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Descripción</label>
                <textarea value={descripcionDoc} onChange={(e) => setDescripcionDoc(e.target.value)} rows="2" className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Etiquetas</label>
                <input type="text" value={etiquetasDoc} onChange={(e) => setEtiquetasDoc(e.target.value)} placeholder="Separadas por comas" className="w-full px-3 py-2 rounded border text-xs" style={{ backgroundColor: inputBg, color: textPrimary, borderColor }} />
              </div>
              <button
                type="submit"
                disabled={subiendo || !archivo}
                className="w-full py-2 px-4 rounded font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                style={{
                  backgroundColor: subiendo || !archivo ? (theme === 'dark' ? '#2D2D2D' : '#E5E7EB') : buttonPrimary,
                  color: subiendo || !archivo ? textSecondary : (theme === 'dark' ? '#93C5FD' : '#FFFFFF')
                }}
              >
                <FaUpload />
                {subiendo ? 'Subiendo...' : 'Subir Documento'}
              </button>
            </form>
          </div>

          {/* Historial de documentos */}
          <div 
            className="rounded-lg shadow-sm p-6"
            style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
          >
            <h4 className="text-lg font-bold mb-4" style={{ color: textPrimary }}>
              Historial de Documentos ({documentos.length})
            </h4>
            {documentos.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: textSecondary }}>
                No hay documentos subidos
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {documentos.map((doc) => (
                  <div
                    key={doc._id}
                    className="p-3 rounded border"
                    style={{
                      backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
                      borderColor
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h5 className="font-semibold text-sm" style={{ color: textPrimary }}>
                          {doc.nombre}
                        </h5>
                        {doc.descripcion && (
                          <p className="text-xs mt-1" style={{ color: textSecondary }}>
                            {doc.descripcion}
                          </p>
                        )}
                        <div className="flex gap-3 text-xs mt-2" style={{ color: textSecondary }}>
                          <span className="flex items-center gap-1">
                            <FaCalendar />
                            {formatearFechaMostrar(doc.fechaSubida)}
                          </span>
                          <span>{formatearTamaño(doc.archivo.tamaño)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleVistaPrevia(doc)}
                          className="p-1.5 rounded"
                          style={{ backgroundColor: buttonPrimary, color: theme === 'dark' ? '#93C5FD' : '#FFFFFF' }}
                          title="Vista previa"
                        >
                          <FaEye className="text-xs" />
                        </button>
                        <button
                          onClick={() => handleDescargar(doc)}
                          className="p-1.5 rounded"
                          style={{ backgroundColor: buttonPrimary, color: theme === 'dark' ? '#93C5FD' : '#FFFFFF' }}
                          title="Descargar"
                        >
                          <FaDownload className="text-xs" />
                        </button>
                        <button
                          onClick={() => handleEliminarDocumento(doc._id)}
                          className="p-1.5 rounded"
                          style={{ backgroundColor: buttonDanger, color: theme === 'dark' ? '#FCA5A5' : '#FFFFFF' }}
                          title="Eliminar"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
