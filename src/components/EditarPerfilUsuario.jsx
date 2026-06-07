import React, { useState } from 'react';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig.js';

export default function EditarPerfilUsuario() {
  const [userLogin, setUserLogin] = useState('');
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    active: 'Y'
  });

  const buscarUsuario = async () => {
    if (!userLogin.trim()) {
      setError('Por favor ingrese el login del usuario');
      return;
    }

    setLoading(true);
    setError('');
    setUsuario(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/api/secur-auth/usuario/${userLogin}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setUsuario(response.data);
      setForm({
        name: response.data.name || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        role: response.data.role || '',
        active: response.data.active || 'Y'
      });
      setMensaje('Usuario encontrado');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al buscar usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMensaje('');

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${BASE_URL}/api/secur-auth/actualizar-usuario/${userLogin}`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMensaje('Usuario actualizado exitosamente');
      // Recargar datos del usuario
      buscarUsuario();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar usuario');
    } finally {
      setLoading(false);
    }
  };

  // Leer datos del usuario desde localStorage (como se guarda en login.tsx)
  const usuarioActual = {
    name: localStorage.getItem('nombre') || '',
    login: localStorage.getItem('login') || '',
    rol: localStorage.getItem('rol') || '',
    email: localStorage.getItem('email') || ''
  };
  
  const esAdminOSoporte = usuarioActual.rol === 'admin' || usuarioActual.rol === 'soporte';

  // Para desarrollo - mostrar información del usuario actual
if (!esAdminOSoporte) {
    return (
      <div className="container mx-auto p-2 sm:p-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-3 sm:p-4">
          <h2 className="text-base sm:text-lg font-medium text-red-800 mb-2">Acceso Denegado</h2>
          <p className="text-red-700 text-sm sm:text-base">No tienes permisos para acceder a esta función.</p>
          <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-xs sm:text-sm font-medium text-blue-800 mb-1 sm:mb-2">Información de Debug:</h3>
            <p className="text-xs sm:text-sm text-blue-700">Usuario: {usuarioActual.name || 'No disponible'}</p>
            <p className="text-xs sm:text-sm text-blue-700">Rol: {usuarioActual.rol || 'No definido'}</p>
            <p className="text-xs sm:text-sm text-blue-700">Login: {usuarioActual.login || 'No disponible'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 max-w-2xl">
      <div className="bg-white shadow-lg rounded-lg p-3 sm:p-4 lg:p-6">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-700 mb-4 sm:mb-6">🔧 Editar Perfil de Usuario</h2>

        {/* Búsqueda por ID */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
          <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-2 sm:mb-3">Buscar Usuario</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={userLogin}
              onChange={(e) => setUserLogin(e.target.value)}
              placeholder="Ingrese login del usuario"
              className="flex-1 px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
            />
            <button
              onClick={buscarUsuario}
              disabled={loading}
              className={`px-3 sm:px-4 py-2 rounded-md font-medium text-xs sm:text-sm ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>

        {/* Información del usuario encontrado */}
        {usuario && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-base sm:text-lg font-medium text-green-800 mb-2">✅ Usuario Encontrado</h3>
            <div className="text-xs sm:text-sm text-green-700">
              <p><strong>ID:</strong> {usuario._id}</p>
              <p><strong>Login:</strong> {usuario.login}</p>
              <p><strong>Nombre:</strong> {usuario.name}</p>
              <p><strong>Email:</strong> {usuario.email}</p>
              <p><strong>Rol:</strong> {usuario.role}</p>
              <p><strong>Activo:</strong> {usuario.active === 'Y' ? 'Sí' : 'No'}</p>
            </div>
          </div>
        )}

        {/* Formulario de edición */}
        {usuario && (
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Nombre:
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Email:
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Teléfono:
              </label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Rol:
              </label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                required
              >
                <option value="">Seleccionar rol</option>
                <option value="usuario">Usuario</option>
                <option value="soporte">Soporte</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Estado:
              </label>
              <select
                name="active"
                value={form.active}
                onChange={handleChange}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                required
              >
                <option value="Y">Activo</option>
                <option value="N">Inactivo</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 px-3 sm:px-4 rounded-md font-medium text-xs sm:text-sm ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        )}

        {/* Mensajes */}
        {mensaje && (
          <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-700 text-xs sm:text-sm">{mensaje}</p>
          </div>
        )}

        {error && (
          <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-xs sm:text-sm">{error}</p>
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-base sm:text-lg font-medium text-blue-800 mb-2">📋 Información</h3>
          <div className="text-xs sm:text-sm text-blue-700 space-y-1">
                         <p>• Solo administradores y soporte pueden editar perfiles de usuarios</p>
             <p>• Busque el usuario por su login</p>
            <p>• Puede cambiar nombre, email, teléfono, rol y estado</p>
            <p>• Los cambios se aplican inmediatamente</p>
          </div>
        </div>
      </div>
    </div>
  );
} 