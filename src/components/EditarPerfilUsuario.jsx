import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig.js';

export default function EditarPerfilUsuario() {
  const { t } = useTranslation();
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
      setError(t('admin.ui.editarPerfilUsuario.errors.loginRequired'));
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
      setMensaje(t('admin.ui.editarPerfilUsuario.userFound'));
    } catch (err) {
      setError(err.response?.data?.message || t('admin.ui.editarPerfilUsuario.errors.searchFailed'));
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

      setMensaje(t('admin.ui.editarPerfilUsuario.updateSuccess'));
      // Recargar datos del usuario
      buscarUsuario();
    } catch (err) {
      setError(err.response?.data?.message || t('admin.ui.editarPerfilUsuario.errors.updateFailed'));
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
          <h2 className="text-base sm:text-lg font-medium text-red-800 mb-2">{t('admin.ui.editarPerfilUsuario.accessDenied.title')}</h2>
          <p className="text-red-700 text-sm sm:text-base">{t('admin.ui.editarPerfilUsuario.accessDenied.message')}</p>
          <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-xs sm:text-sm font-medium text-blue-800 mb-1 sm:mb-2">{t('admin.ui.editarPerfilUsuario.accessDenied.debugInfo')}</h3>
            <p className="text-xs sm:text-sm text-blue-700">{t('admin.ui.editarPerfilUsuario.accessDenied.user')}: {usuarioActual.name || t('admin.ui.editarPerfilUsuario.accessDenied.notAvailable')}</p>
            <p className="text-xs sm:text-sm text-blue-700">{t('admin.ui.usuarios.table.role')}: {usuarioActual.rol || t('admin.ui.editarPerfilUsuario.accessDenied.notDefined')}</p>
            <p className="text-xs sm:text-sm text-blue-700">{t('admin.ui.usuarios.table.login')}: {usuarioActual.login || t('admin.ui.editarPerfilUsuario.accessDenied.notAvailable')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 max-w-2xl">
      <div className="bg-white shadow-lg rounded-lg p-3 sm:p-4 lg:p-6">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-700 mb-4 sm:mb-6">🔧 {t('admin.ui.editarPerfilUsuario.title')}</h2>

        {/* Búsqueda por ID */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
          <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-2 sm:mb-3">{t('admin.ui.editarPerfilUsuario.searchTitle')}</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={userLogin}
              onChange={(e) => setUserLogin(e.target.value)}
              placeholder={t('admin.ui.editarPerfilUsuario.searchPlaceholder')}
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
              {loading ? t('admin.ui.editarPerfilUsuario.searching') : t('common.search')}
            </button>
          </div>
        </div>

        {/* Información del usuario encontrado */}
        {usuario && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-base sm:text-lg font-medium text-green-800 mb-2">✅ {t('admin.ui.editarPerfilUsuario.userFoundTitle')}</h3>
            <div className="text-xs sm:text-sm text-green-700">
              <p><strong>ID:</strong> {usuario._id}</p>
              <p><strong>{t('admin.ui.usuarios.table.login')}:</strong> {usuario.login}</p>
              <p><strong>{t('admin.ui.editarPerfilUsuario.fields.name')}:</strong> {usuario.name}</p>
              <p><strong>{t('admin.ui.usuarios.table.email')}:</strong> {usuario.email}</p>
              <p><strong>{t('admin.ui.usuarios.table.role')}:</strong> {usuario.role}</p>
              <p><strong>{t('admin.ui.editarPerfilUsuario.fields.activeQuestion')}:</strong> {usuario.active === 'Y' ? t('admin.ui.editarPerfilUsuario.yes') : t('admin.ui.editarPerfilUsuario.no')}</p>
            </div>
          </div>
        )}

        {/* Formulario de edición */}
        {usuario && (
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                {t('admin.ui.editarPerfilUsuario.fields.name')}:
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
                {t('admin.ui.usuarios.table.email')}:
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
                {t('admin.ui.editarPerfilUsuario.fields.phone')}:
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
                {t('admin.ui.usuarios.table.role')}:
              </label>
              <select
                name="role"
                value={
                  form.role === 'contractor_alfa' || form.role === 'contractor_sura'
                    ? 'contractor_zurich'
                    : form.role
                }
                onChange={handleChange}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                required
              >
                <option value="">{t('admin.ui.editarPerfilUsuario.fields.selectRole')}</option>
                <option value="usuario">{t('roles.usuario')}</option>
                <option value="ajustador_lider">{t('roles.ajustador_lider')}</option>
                <option value="ajustador">{t('roles.ajustador')}</option>
                <option value="inspector">{t('roles.inspector')}</option>
                <option value="visualizador">{t('roles.visualizador')}</option>
                <option value="puertos">{t('roles.puertos')}</option>
                <option value="contractor_zurich">{t('roles.contractor_zurich')}</option>
                <option value="contractor_solo_zurich">{t('roles.contractor_solo_zurich')}</option>
                <option value="contractor_solo_bbva">{t('roles.contractor_solo_bbva')}</option>
                <option value="contractor_solo_equidad">{t('roles.contractor_solo_equidad', 'Equidad FDM')}</option>
                <option value="soporte">{t('roles.soporte')}</option>
                <option value="admin">{t('roles.admin')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                {t('admin.ui.usuarios.table.status')}:
              </label>
              <select
                name="active"
                value={form.active}
                onChange={handleChange}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                required
              >
                <option value="Y">{t('admin.ui.usuarios.table.active')}</option>
                <option value="N">{t('admin.ui.usuarios.table.inactive')}</option>
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
              {loading ? t('admin.ui.editarPerfilUsuario.saving') : t('admin.ui.editarPerfilUsuario.saveChanges')}
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
          <h3 className="text-base sm:text-lg font-medium text-blue-800 mb-2">📋 {t('admin.ui.editarPerfilUsuario.infoTitle')}</h3>
          <div className="text-xs sm:text-sm text-blue-700 space-y-1">
                         <p>• {t('admin.ui.editarPerfilUsuario.info.onlyAdminSoporte')}</p>
             <p>• {t('admin.ui.editarPerfilUsuario.info.searchByLogin')}</p>
            <p>• {t('admin.ui.editarPerfilUsuario.info.changeFields')}</p>
            <p>• {t('admin.ui.editarPerfilUsuario.info.appliedImmediately')}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 
