import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig.js';
import { FaPause, FaPlay } from 'react-icons/fa';

const AdminUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({
    adminLogin: '',
    adminPassword: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  
  // Lista de usuarios permitidos para gestionar vacaciones
  const USUARIOS_PERMITIDOS_VACACIONES = [
    '1065012991',
    'admin',
    'soporte'
  ];
  
  // Obtener el login del usuario actual
  const loginActual = localStorage.getItem('login');
  const puedeGestionarVacaciones = USUARIOS_PERMITIDOS_VACACIONES.includes(loginActual);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/secur-auth/usuarios`);
      setUsuarios(response.data.usuarios);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!selectedUser || !newPassword || !adminCredentials.adminLogin || !adminCredentials.adminPassword) {
      setMessage('Por favor completa todos los campos');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${BASE_URL}/api/secur-auth/cambiar-password`, {
        login: selectedUser.login,
        nuevaPassword: newPassword,
        adminLogin: adminCredentials.adminLogin,
        adminPassword: adminCredentials.adminPassword
      }, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });

      if (response.data.success) {
        setMessage(`✅ ${response.data.message}`);
        setShowChangePassword(false);
        setSelectedUser(null);
        setNewPassword('');
        setAdminCredentials({ adminLogin: '', adminPassword: '' });
      }
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      setMessage(`❌ ${error.response?.data?.message || 'Error al cambiar contraseña'}`);
    }
  };

  const openChangePasswordModal = (usuario) => {
    setSelectedUser(usuario);
    setShowChangePassword(true);
    setMessage('');
  };

  const handleToggleVacaciones = async (usuario) => {
    const nuevoEstado = !usuario.enVacaciones;
    const accion = nuevoEstado ? 'pausar' : 'reactivar';
    
    if (!window.confirm(
      nuevoEstado 
        ? `¿Estás seguro de que deseas pausar a ${usuario.name} por vacaciones?`
        : `¿Estás seguro de que deseas reactivar a ${usuario.name} (fin de vacaciones)?`
    )) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${BASE_URL}/api/secur-auth/usuarios/${usuario._id}/vacaciones`,
        { enVacaciones: nuevoEstado },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          }
        }
      );

      if (response.data.success) {
        setMessage(`✅ ${response.data.message}`);
        cargarUsuarios(); // Recargar la lista de usuarios
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error cambiando estado de vacaciones:', error);
      setMessage(`❌ ${error.response?.data?.message || 'Error al cambiar el estado de vacaciones'}`);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 lg:mb-8">Administración de Usuarios</h1>
      
      {/* Mensaje de estado */}
      {message && (
        <div className={`mb-3 sm:mb-4 p-3 sm:p-4 rounded text-sm sm:text-base ${
          message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* Tabla de usuarios responsive */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usuarios.map((usuario) => (
                <tr key={usuario._id} className="hover:bg-gray-50">
                  <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="text-xs sm:text-sm font-medium text-gray-900">{usuario.name}</div>
                    <div className="text-xs sm:text-sm text-gray-500">Login: {usuario.login}</div>
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                    {usuario.email}
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      usuario.role === 'admin' ? 'bg-red-100 text-red-800' :
                      usuario.role === 'soporte' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {usuario.role}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        usuario.active === 'Y' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {usuario.active === 'Y' ? 'Activo' : 'Inactivo'}
                      </span>
                      {usuario.enVacaciones && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                          🏖️ En Vacaciones
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                    <div className="flex flex-col sm:flex-row gap-2">
                      {puedeGestionarVacaciones && (
                        <button
                          onClick={() => handleToggleVacaciones(usuario)}
                          className={`${
                            usuario.enVacaciones
                              ? 'text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200'
                              : 'text-orange-600 hover:text-orange-900 bg-orange-100 hover:bg-orange-200'
                          } px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors w-full sm:w-auto flex items-center justify-center gap-1`}
                          title={usuario.enVacaciones ? 'Reactivar usuario (fin de vacaciones)' : 'Pausar usuario (vacaciones)'}
                        >
                          {usuario.enVacaciones ? (
                            <>
                              <FaPlay className="text-xs" />
                              <span className="hidden sm:inline">Reactivar</span>
                              <span className="sm:hidden">Reactivar</span>
                            </>
                          ) : (
                            <>
                              <FaPause className="text-xs" />
                              <span className="hidden sm:inline">Pausar</span>
                              <span className="sm:hidden">Pausar</span>
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => openChangePasswordModal(usuario)}
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors w-full sm:w-auto"
                      >
                        Cambiar Contraseña
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para cambiar contraseña responsive */}
      {showChangePassword && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 sm:top-20 mx-auto p-3 sm:p-5 border w-11/12 sm:w-96 shadow-lg rounded-md bg-white">
            {/* Botón X para cerrar */}
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl sm:text-2xl font-bold z-10"
              onClick={() => {
                setShowChangePassword(false);
                setSelectedUser(null);
                setNewPassword('');
                setAdminCredentials({ adminLogin: '', adminPassword: '' });
                setMessage('');
              }}
              title="Cerrar"
            >
              ×
            </button>
            <div className="mt-3">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">
                Cambiar Contraseña - {selectedUser.name}
              </h3>
              
              <form onSubmit={handleChangePassword} className="space-y-3 sm:space-y-4">
                {/* Credenciales del administrador */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Tu Login (Administrador)
                  </label>
                  <input
                    type="text"
                    value={adminCredentials.adminLogin}
                    onChange={(e) => setAdminCredentials({...adminCredentials, adminLogin: e.target.value})}
                    className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tu login de administrador"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Tu Contraseña (Administrador)
                  </label>
                  <input
                    type="password"
                    value={adminCredentials.adminPassword}
                    onChange={(e) => setAdminCredentials({...adminCredentials, adminPassword: e.target.value})}
                    className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tu contraseña de administrador"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Nueva Contraseña para {selectedUser.name}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nueva contraseña"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setSelectedUser(null);
                      setNewPassword('');
                      setAdminCredentials({ adminLogin: '', adminPassword: '' });
                      setMessage('');
                    }}
                    className="px-3 sm:px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-xs sm:text-sm w-full sm:w-auto"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs sm:text-sm w-full sm:w-auto"
                  >
                    Cambiar Contraseña
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsuarios; 