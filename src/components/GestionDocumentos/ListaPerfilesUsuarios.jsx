import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { BASE_URL } from '../../config/apiConfig';
import { FaEdit, FaEye, FaUser, FaSearch, FaPlus, FaTimes, FaTrash, FaUndo } from 'react-icons/fa';
import EditarPerfilUsuarioDocumentos from './EditarPerfilUsuarioDocumentos';
import VerDocumentosUsuario from './VerDocumentosUsuario';
import { esPerfilAseguradoraDocumentos } from './documentosPerfilHelpers';

export default function ListaPerfilesUsuarios() {
  const { theme } = useTheme();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [usuarioViendo, setUsuarioViendo] = useState(null);
  const [mostrarEdicion, setMostrarEdicion] = useState(false);
  const [mostrarVista, setMostrarVista] = useState(false);
  const [mostrarModalAgregar, setMostrarModalAgregar] = useState(false);
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [mostrarEliminados, setMostrarEliminados] = useState(false);
  const [mostrarOcultosPlataforma, setMostrarOcultosPlataforma] = useState(false);
  const [nuevoPerfil, setNuevoPerfil] = useState({
    nombre: '',
    cedula: '',
    email: '',
    celulares: '',
    empresa: 'RIESGOS',
    cargo: ''
  });

  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const buttonPrimary = theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#2563EB';
  const buttonSecondary = theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#22C55E';
  const buttonDanger = theme === 'dark' ? 'rgba(220, 38, 38, 0.2)' : '#EF4444';

  useEffect(() => {
    cargarUsuarios();
  }, [mostrarEliminados, mostrarOcultosPlataforma]);

  const cargarUsuarios = async () => {
    try {
      setCargando(true);
      const token = localStorage.getItem('token');
      /** Listados grandes + red lenta: más tiempo que el default 10s de axios */
      const optsLista = {
        timeout: 120000,
        headers: { Authorization: `Bearer ${token}` }
      };
      const tipoUsuario = localStorage.getItem('tipoUsuario') || 'normal';
      const origenPlataforma = tipoUsuario === 'secur' ? 'secur' : 'normal';

      const urlUsuarios =
        tipoUsuario === 'secur' ? '/api/secur-auth/usuarios' : '/api/auth/usuarios';

      const [ocRes, response, externosResponse] = await Promise.all([
        api
          .get('/api/documentos/usuarios-ocultos-plataforma', {
            params: { origen: origenPlataforma },
            timeout: 60000,
            headers: { Authorization: `Bearer ${token}` }
          })
          .catch((e) => {
            console.warn('No se pudieron cargar ocultos de plataforma:', e);
            return { data: { ocultos: [] } };
          }),
        api.get(urlUsuarios, optsLista),
        api.get('/api/documentos/perfiles-externos', {
          params: { incluirInactivos: mostrarEliminados },
          timeout: 60000,
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const ocultosPlataformaIds = new Set(
        (ocRes.data.ocultos || []).map((o) => String(o.usuarioId))
      );

      const usuariosRecibidos = response.data.usuarios || response.data || [];
      const perfilesExternos = (externosResponse.data?.perfiles || []).map((perfil) => ({
        ...perfil,
        _id: perfil._id,
        id: perfil._id,
        name: perfil.nombre,
        nombre: perfil.nombre,
        cedula: perfil.cedula || '',
        email: perfil.email || '',
        telefonoFijo: perfil.telefonoFijo || '',
        celulares: perfil.celulares || perfil.telefono || '',
        empresa: perfil.empresa || '',
        cargos: perfil.cargo || '',
        esExterno: true,
        activo: perfil.activo !== false
      }));

      if (mostrarOcultosPlataforma) {
        const listaOcultos = usuariosRecibidos
          .filter((u) => ocultosPlataformaIds.has(String(u._id || u.id)))
          .map((u) => ({ ...u, ocultoEnDocumentos: true }));
        setUsuarios(listaOcultos);
      } else if (mostrarEliminados) {
        const soloEliminados = perfilesExternos.filter((perfil) => perfil.activo === false);
        setUsuarios(soloEliminados);
      } else {
        const plataformaFiltrada = usuariosRecibidos.filter((u) => {
          if (esPerfilAseguradoraDocumentos(u)) return false;
          const id = String(u._id || u.id);
          if (ocultosPlataformaIds.has(id)) return false;
          return true;
        });
        const externosActivos = perfilesExternos.filter((p) => p.activo !== false);
        setUsuarios([...plataformaFiltrada, ...externosActivos]);
      }
    } catch (error) {
      console.error('❌ Error cargando usuarios:', error);
      console.error('📋 Detalles del error:', error.response?.data || error.message);
    } finally {
      setCargando(false);
    }
  };

  const handleEditar = (usuario) => {
    setUsuarioEditando(usuario);
    setMostrarEdicion(true);
  };

  const handleVer = (usuario) => {
    setUsuarioViendo(usuario);
    setMostrarVista(true);
  };

  const handleCerrarEdicion = () => {
    setMostrarEdicion(false);
    setUsuarioEditando(null);
    cargarUsuarios(); // Recargar usuarios después de editar
  };

  const handleCerrarVista = () => {
    setMostrarVista(false);
    setUsuarioViendo(null);
  };

  const handleChangeNuevoPerfil = (e) => {
    setNuevoPerfil((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleCrearNuevoPerfil = async (e) => {
    e.preventDefault();
    if (!nuevoPerfil.nombre.trim() || !nuevoPerfil.cedula.trim()) return;

    try {
      setGuardandoNuevo(true);
      const payloadNuevoPerfil = {
        ...nuevoPerfil,
        telefono: nuevoPerfil.celulares || '',
        telefonoFijo: '',
        celulares: nuevoPerfil.celulares || ''
      };
      await api.post('/api/documentos/perfiles-externos', payloadNuevoPerfil);
      setMostrarModalAgregar(false);
      setNuevoPerfil({
        nombre: '',
        cedula: '',
        email: '',
        celulares: '',
        empresa: 'RIESGOS',
        cargo: ''
      });
      await cargarUsuarios();
    } catch (error) {
      console.error('Error creando perfil externo:', error);
      alert(error.response?.data?.message || 'Error al crear la persona');
    } finally {
      setGuardandoNuevo(false);
    }
  };

  const handleEliminar = async (usuario) => {
    const nombre = usuario.name || usuario.nombre || 'esta persona';

    if (usuario.esExterno) {
      const confirmar = window.confirm(`¿Eliminar a ${nombre} del listado de documentos?`);
      if (!confirmar) return;
      try {
        await api.delete(`/api/documentos/perfiles-externos/${usuario._id || usuario.id}`);
        await cargarUsuarios();
      } catch (error) {
        console.error('Error eliminando perfil externo:', error);
        alert(error.response?.data?.message || 'Error al eliminar la persona');
      }
      return;
    }

    const confirmar = window.confirm(
      `¿Ocultar a ${nombre} solo en esta pantalla? El usuario seguirá existiendo en la plataforma.`
    );
    if (!confirmar) return;

    try {
      const tipoUsuario = localStorage.getItem('tipoUsuario') || 'normal';
      const origen = tipoUsuario === 'secur' ? 'secur' : 'normal';
      await api.post('/api/documentos/usuarios-ocultos-plataforma', {
        usuarioId: String(usuario._id || usuario.id),
        origen
      });
      await cargarUsuarios();
    } catch (error) {
      console.error('Error ocultando usuario en documentos:', error);
      alert(error.response?.data?.message || 'No se pudo ocultar el usuario');
    }
  };

  const handleRestaurar = async (usuario) => {
    if (usuario.esExterno && usuario.activo === false) {
      try {
        await api.put(`/api/documentos/perfiles-externos/${usuario._id || usuario.id}/restaurar`);
        await cargarUsuarios();
      } catch (error) {
        console.error('Error restaurando perfil externo:', error);
        alert(error.response?.data?.message || 'Error al restaurar la persona');
      }
      return;
    }

    if (usuario.ocultoEnDocumentos) {
      try {
        const tipoUsuario = localStorage.getItem('tipoUsuario') || 'normal';
        const origen = tipoUsuario === 'secur' ? 'secur' : 'normal';
        await api.delete(`/api/documentos/usuarios-ocultos-plataforma/${usuario._id || usuario.id}`, {
          params: { origen }
        });
        await cargarUsuarios();
      } catch (error) {
        console.error('Error restaurando visibilidad:', error);
        alert(error.response?.data?.message || 'No se pudo restaurar el usuario en esta vista');
      }
    }
  };

  const usuariosFiltrados = usuarios.filter(usuario => {
    if (!busqueda) return true;
    const busquedaLower = busqueda.toLowerCase();
    const nombre = (usuario.name || usuario.nombre || '').toLowerCase();
    const cedula = (usuario.cedula || '').toLowerCase();
    const email = (usuario.email || usuario.correo || '').toLowerCase();
    const login = (usuario.login || '').toLowerCase();
    return nombre.includes(busquedaLower) || 
           cedula.includes(busquedaLower) || 
           email.includes(busquedaLower) ||
           login.includes(busquedaLower);
  });

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
        if (date.toISOString().includes('T00:00:00')) {
          const year = date.getUTCFullYear();
          const month = date.getUTCMonth();
          const day = date.getUTCDate();
          date = new Date(year, month, day);
        }
      }
      return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  if (mostrarEdicion && usuarioEditando) {
    return (
      <EditarPerfilUsuarioDocumentos
        usuario={usuarioEditando}
        onCerrar={handleCerrarEdicion}
      />
    );
  }

  if (mostrarVista && usuarioViendo) {
    return (
      <VerDocumentosUsuario
        usuario={usuarioViendo}
        onCerrar={handleCerrarVista}
      />
    );
  }

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
        Gestión de Documentos por Empleado
      </h2>

      {/* Búsqueda y acciones */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative">
          <FaSearch 
            className="absolute left-3 top-1/2 transform -translate-y-1/2"
            style={{ color: textSecondary }}
          />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, cédula, email o login..."
            className="w-full pl-10 pr-3 py-2 rounded text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              border: `1px solid ${borderColor}`
            }}
          />
        </div>
        <button
          onClick={() => setMostrarModalAgregar(true)}
          className="py-2 px-4 rounded text-sm font-medium flex items-center justify-center gap-2"
          style={{
            backgroundColor: buttonPrimary,
            color: theme === 'dark' ? '#93C5FD' : '#FFFFFF'
          }}
        >
          <FaPlus />
          Agregar persona
        </button>
        <button
          onClick={() => {
            setMostrarEliminados((prev) => !prev);
            setMostrarOcultosPlataforma(false);
          }}
          className="py-2 px-4 rounded text-sm font-medium"
          style={{
            backgroundColor: mostrarEliminados
              ? (theme === 'dark' ? 'rgba(220, 38, 38, 0.2)' : '#FEE2E2')
              : (theme === 'dark' ? '#2D2D2D' : '#F3F4F6'),
            color: mostrarEliminados
              ? (theme === 'dark' ? '#FCA5A5' : '#B91C1C')
              : textPrimary,
            border: `1px solid ${borderColor}`
          }}
        >
          {mostrarEliminados ? 'Volver a todos' : 'Ver solo eliminados (externos)'}
        </button>
        <button
          onClick={() => {
            setMostrarOcultosPlataforma((prev) => !prev);
            setMostrarEliminados(false);
          }}
          className="py-2 px-4 rounded text-sm font-medium"
          style={{
            backgroundColor: mostrarOcultosPlataforma
              ? (theme === 'dark' ? 'rgba(217, 119, 6, 0.25)' : '#FFEDD5')
              : (theme === 'dark' ? '#2D2D2D' : '#F3F4F6'),
            color: mostrarOcultosPlataforma
              ? (theme === 'dark' ? '#FDBA74' : '#C2410C')
              : textPrimary,
            border: `1px solid ${borderColor}`
          }}
        >
          {mostrarOcultosPlataforma ? 'Volver a todos' : 'Ocultos (plataforma)'}
        </button>
      </div>

      {/* Lista de usuarios */}
      {cargando ? (
        <div className="text-center py-8" style={{ color: textSecondary }}>
          Cargando usuarios...
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="text-center py-8" style={{ color: textSecondary }}>
          No se encontraron usuarios
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {usuariosFiltrados.map((usuario) => {
            const bloqueadoTarjeta =
              (usuario.esExterno && usuario.activo === false) ||
              Boolean(usuario.ocultoEnDocumentos);
            return (
            <div
              key={`${usuario.esExterno ? 'externo' : 'usuario'}-${usuario._id || usuario.id}`}
              className="p-5 rounded-lg border-2 transition-all hover:shadow-lg"
              style={{
                backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
                borderColor: borderColor
              }}
            >
              {/* Encabezado del perfil */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b" style={{ borderColor }}>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: buttonPrimary }}
                >
                  <FaUser 
                    className="text-xl"
                    style={{ color: theme === 'dark' ? '#93C5FD' : '#FFFFFF' }}
                  />
                </div>
                <div className="flex-1">
                  <h3 
                    className="font-bold text-lg"
                    style={{ color: textPrimary }}
                  >
                    {usuario.name || usuario.nombre || 'Sin nombre'}
                  </h3>
                  {usuario.esExterno && (
                    <p className="text-xs font-semibold" style={{ color: textSecondary }}>
                      {usuario.activo === false ? 'Perfil externo (eliminado)' : 'Perfil externo'}
                    </p>
                  )}
                  {usuario.esExterno && (
                    <span
                      className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        backgroundColor: usuario.activo === false
                          ? (theme === 'dark' ? 'rgba(220, 38, 38, 0.2)' : '#FEE2E2')
                          : (theme === 'dark' ? 'rgba(22, 163, 74, 0.2)' : '#DCFCE7'),
                        color: usuario.activo === false
                          ? (theme === 'dark' ? '#FCA5A5' : '#B91C1C')
                          : (theme === 'dark' ? '#86EFAC' : '#166534')
                      }}
                    >
                      {usuario.activo === false ? 'ELIMINADO' : 'ACTIVO'}
                    </span>
                  )}
                  {!usuario.esExterno && usuario.ocultoEnDocumentos && (
                    <span
                      className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        backgroundColor: theme === 'dark' ? 'rgba(217, 119, 6, 0.25)' : '#FFEDD5',
                        color: theme === 'dark' ? '#FDBA74' : '#C2410C'
                      }}
                    >
                      OCULTO EN ESTA VISTA
                    </span>
                  )}
                  {usuario.cedula && (
                    <p 
                      className="text-xs"
                      style={{ color: textSecondary }}
                    >
                      CC: {usuario.cedula}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Información del empleado */}
              <div className="space-y-2 mb-4">
                {/* Datos Personales */}
                {usuario.fechaNacimiento && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: textSecondary }}>Fecha Nacimiento:</span>
                    <span style={{ color: textPrimary }} className="font-medium">{formatearFecha(usuario.fechaNacimiento)}</span>
                  </div>
                )}
                {usuario.tipoSangre && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: textSecondary }}>Tipo Sangre:</span>
                    <span style={{ color: textPrimary }} className="font-medium">{usuario.tipoSangre}</span>
                  </div>
                )}
                {usuario.direccion && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: textSecondary }}>Dirección:</span>
                    <span style={{ color: textPrimary }} className="font-medium truncate ml-2" title={usuario.direccion}>{usuario.direccion}</span>
                  </div>
                )}
                {usuario.telefonoFijo && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: textSecondary }}>Teléfono Fijo:</span>
                    <span style={{ color: textPrimary }} className="font-medium">{usuario.telefonoFijo}</span>
                  </div>
                )}
                {usuario.celulares && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: textSecondary }}>Celular(es):</span>
                    <span style={{ color: textPrimary }} className="font-medium">{usuario.celulares}</span>
                  </div>
                )}
                {usuario.email && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: textSecondary }}>Email:</span>
                    <span style={{ color: textPrimary }} className="font-medium truncate ml-2" title={usuario.email}>{usuario.email}</span>
                  </div>
                )}
                {usuario.correosElectronicos && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: textSecondary }}>Correos:</span>
                    <span style={{ color: textPrimary }} className="font-medium truncate ml-2" title={usuario.correosElectronicos}>{usuario.correosElectronicos}</span>
                  </div>
                )}
                
                {/* Separador */}
                <div className="border-t my-2" style={{ borderColor }}></div>
                
                {/* Datos Laborales */}
                {usuario.empresa && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: textSecondary }}>Empresa:</span>
                    <span style={{ color: textPrimary }} className="font-medium">{usuario.empresa}</span>
                  </div>
                )}
                {usuario.sucursal && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: textSecondary }}>Sucursal:</span>
                    <span style={{ color: textPrimary }} className="font-medium">{usuario.sucursal}</span>
                  </div>
                )}
                {usuario.cargos && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: textSecondary }}>Cargo:</span>
                    <span style={{ color: textPrimary }} className="font-medium">{usuario.cargos}</span>
                  </div>
                )}
                {usuario.fechaIngreso && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: textSecondary }}>Ingreso:</span>
                    <span style={{ color: textPrimary }} className="font-medium">{formatearFecha(usuario.fechaIngreso)}</span>
                  </div>
                )}
                {usuario.tipoContrato && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: textSecondary }}>Contrato:</span>
                    <span style={{ color: textPrimary }} className="font-medium">{usuario.tipoContrato}</span>
                  </div>
                )}
                {usuario.salario && (
                  <div className="flex justify-between text-xs">
                    <span style={{ color: textSecondary }}>Salario:</span>
                    <span style={{ color: textPrimary }} className="font-medium">
                      ${typeof usuario.salario === 'number' 
                        ? usuario.salario.toLocaleString('es-CO') 
                        : parseFloat(usuario.salario || 0).toLocaleString('es-CO')}
                    </span>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2 mt-4 pt-4 border-t" style={{ borderColor }}>
                <button
                  onClick={() => handleEditar(usuario)}
                  disabled={bloqueadoTarjeta}
                  className="flex-1 py-2 px-3 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: buttonPrimary,
                    color: theme === 'dark' ? '#93C5FD' : '#FFFFFF',
                    opacity: bloqueadoTarjeta ? 0.55 : 1,
                    cursor: bloqueadoTarjeta ? 'not-allowed' : 'pointer'
                  }}
                  title="Editar perfil y agregar documentos"
                >
                  <FaEdit />
                  Editar
                </button>
                <button
                  onClick={() => handleVer(usuario)}
                  disabled={bloqueadoTarjeta}
                  className="flex-1 py-2 px-3 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: buttonSecondary,
                    color: theme === 'dark' ? '#86EFAC' : '#FFFFFF',
                    opacity: bloqueadoTarjeta ? 0.55 : 1,
                    cursor: bloqueadoTarjeta ? 'not-allowed' : 'pointer'
                  }}
                  title="Ver documentos"
                >
                  <FaEye />
                  Ver
                </button>
                {(usuario.esExterno && usuario.activo === false) || usuario.ocultoEnDocumentos ? (
                  <button
                    onClick={() => handleRestaurar(usuario)}
                    className="py-2 px-3 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: theme === 'dark' ? 'rgba(22, 163, 74, 0.2)' : '#22C55E',
                      color: theme === 'dark' ? '#86EFAC' : '#FFFFFF'
                    }}
                    title={
                      usuario.ocultoEnDocumentos
                        ? 'Mostrar de nuevo en esta pantalla'
                        : 'Restaurar persona externa'
                    }
                  >
                    <FaUndo />
                    Restaurar
                  </button>
                ) : (
                  <button
                    onClick={() => handleEliminar(usuario)}
                    className="py-2 px-3 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: buttonDanger,
                      color: theme === 'dark' ? '#FCA5A5' : '#FFFFFF'
                    }}
                    title={
                      usuario.esExterno
                        ? 'Eliminar del listado de documentos'
                        : 'Ocultar solo en esta pantalla'
                    }
                  >
                    <FaTrash />
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          );})}
        </div>
      )}

      {mostrarModalAgregar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
          onClick={() => setMostrarModalAgregar(false)}
        >
          <div
            className="w-full max-w-xl rounded-lg p-5"
            style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: textPrimary }}>
                Agregar persona (sin usuario de plataforma)
              </h3>
              <button
                onClick={() => setMostrarModalAgregar(false)}
                className="p-2 rounded"
                style={{ backgroundColor: theme === 'dark' ? '#2D2D2D' : '#F3F4F6', color: textPrimary }}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleCrearNuevoPerfil} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Nombre *</label>
                <input
                  name="nombre"
                  value={nuevoPerfil.nombre}
                  onChange={handleChangeNuevoPerfil}
                  required
                  className="w-full px-3 py-2 rounded border text-sm"
                  style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>ID (Cédula) *</label>
                <input
                  name="cedula"
                  value={nuevoPerfil.cedula}
                  onChange={handleChangeNuevoPerfil}
                  required
                  className="w-full px-3 py-2 rounded border text-sm"
                  style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Celular</label>
                <input
                  name="celulares"
                  value={nuevoPerfil.celulares}
                  onChange={handleChangeNuevoPerfil}
                  className="w-full px-3 py-2 rounded border text-sm"
                  style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Email</label>
                <input
                  name="email"
                  value={nuevoPerfil.email}
                  onChange={handleChangeNuevoPerfil}
                  className="w-full px-3 py-2 rounded border text-sm"
                  style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Empresa</label>
                <select
                  name="empresa"
                  value={nuevoPerfil.empresa}
                  onChange={handleChangeNuevoPerfil}
                  className="w-full px-3 py-2 rounded border text-sm"
                  style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
                >
                  <option value="RIESGOS">RIESGOS</option>
                  <option value="AJUSTES">AJUSTES</option>
                  <option value="PUERTOS">PUERTOS</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: textPrimary }}>Cargo</label>
                <input
                  name="cargo"
                  value={nuevoPerfil.cargo}
                  onChange={handleChangeNuevoPerfil}
                  className="w-full px-3 py-2 rounded border text-sm"
                  style={{ backgroundColor: inputBg, color: textPrimary, borderColor }}
                />
              </div>

              <div className="sm:col-span-2 mt-1">
                <button
                  type="submit"
                  disabled={guardandoNuevo}
                  className="w-full py-2 px-4 rounded text-sm font-medium disabled:opacity-60"
                  style={{
                    backgroundColor: buttonPrimary,
                    color: theme === 'dark' ? '#93C5FD' : '#FFFFFF'
                  }}
                >
                  {guardandoNuevo ? 'Guardando...' : 'Guardar persona'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
