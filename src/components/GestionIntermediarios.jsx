import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../config/apiConfig';
import { FaPlus, FaEdit, FaTrash, FaHandshake, FaSave, FaTimes } from 'react-icons/fa';

export default function GestionIntermediarios() {
  const { t } = useTranslation();
  const [intermediarios, setIntermediarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para formulario
  const [mostrarForm, setMostrarForm] = useState(false);
  const [intermediarioEditando, setIntermediarioEditando] = useState(null);
  
  // Estados para formulario de intermediario
  const [formIntermediario, setFormIntermediario] = useState({
    codigo: '',
    nombre: '',
    correo: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    estado: 1
  });

  // Verificar permisos
  const usuarioActual = {
    rol: localStorage.getItem('rol'),
    tipoUsuario: localStorage.getItem('tipoUsuario')
  };
  const esAdminOSoporte = usuarioActual.rol === 'admin' || usuarioActual.rol === 'soporte';

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      // Cargar intermediarios
      const resIntermediarios = await fetch(`${BASE_URL}/api/intermediarios`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!resIntermediarios.ok) throw new Error(t('admin.ui.intermediarios.loadError'));
      const dataIntermediarios = await resIntermediarios.json();
      // Manejar ambos formatos: {success: true, data: [...]} o [...]
      if (dataIntermediarios.success && Array.isArray(dataIntermediarios.data)) {
        setIntermediarios(dataIntermediarios.data);
      } else if (Array.isArray(dataIntermediarios)) {
        setIntermediarios(dataIntermediarios);
      } else {
        setIntermediarios([]);
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Cargar datos
  useEffect(() => {
    if (esAdminOSoporte) {
      cargarDatos();
    }
  }, [esAdminOSoporte, cargarDatos]);

  // Funciones para intermediario
  const abrirForm = (intermediario = null) => {
    if (intermediario) {
      setIntermediarioEditando(intermediario);
      setFormIntermediario({
        codigo: intermediario.codigo || '',
        nombre: intermediario.nombre || '',
        correo: intermediario.correo || '',
        telefono: intermediario.telefono || '',
        direccion: intermediario.direccion || '',
        ciudad: intermediario.ciudad || '',
        estado: intermediario.estado || 1
      });
    } else {
      setIntermediarioEditando(null);
      setFormIntermediario({
        codigo: '',
        nombre: '',
        correo: '',
        telefono: '',
        direccion: '',
        ciudad: '',
        estado: 1
      });
    }
    setMostrarForm(true);
  };

  const guardarIntermediario = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!formIntermediario.nombre || !formIntermediario.codigo) {
      alert(t('admin.ui.intermediarios.requiredFields'));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = intermediarioEditando 
        ? `${BASE_URL}/api/intermediarios/${intermediarioEditando._id}`
        : `${BASE_URL}/api/intermediarios`;
      
      const method = intermediarioEditando ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formIntermediario)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || t('admin.ui.intermediarios.saveError'));
      }

      alert(intermediarioEditando ? t('admin.ui.intermediarios.updated') : t('admin.ui.intermediarios.created'));
      setMostrarForm(false);
      setIntermediarioEditando(null);
      cargarDatos();
    } catch (err) {
      console.error('Error guardando intermediario:', err);
      setError(err.message);
      alert(t('admin.ui.intermediarios.errorPrefix', { message: err.message }));
    }
  };

  const eliminarIntermediario = async (id) => {
    if (!window.confirm(t('admin.ui.intermediarios.confirmDelete'))) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/intermediarios/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || t('admin.ui.intermediarios.deleteError'));
      }

      alert(t('admin.ui.intermediarios.deleted'));
      cargarDatos();
    } catch (err) {
      console.error('Error eliminando intermediario:', err);
      alert(t('admin.ui.intermediarios.errorPrefix', { message: err.message }));
    }
  };

  if (!esAdminOSoporte) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-lg font-medium text-red-800 mb-2">{t('admin.ui.intermediarios.accessDeniedTitle')}</h2>
          <p className="text-red-700">{t('admin.ui.intermediarios.accessDeniedMessage')}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">{t('admin.ui.intermediarios.loading')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FaHandshake className="text-purple-600" />
          {t('admin.ui.intermediarios.title')}
        </h1>
        <button
          onClick={() => abrirForm()}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaPlus /> {t('admin.ui.intermediarios.newIntermediary')}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Lista de Intermediarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {intermediarios.map((intermediario) => (
          <div key={intermediario._id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <FaHandshake className="text-purple-600" />
                  <h2 className="text-lg font-bold text-gray-900">{intermediario.nombre}</h2>
                </div>
                <p className="text-sm text-gray-500 mb-2">{t('admin.ui.intermediarios.code')}: {intermediario.codigo}</p>
                <div className="space-y-1 text-sm text-gray-600">
                  {intermediario.correo && <p><strong>{t('admin.ui.intermediarios.email')}:</strong> {intermediario.correo}</p>}
                  {intermediario.telefono && <p><strong>{t('admin.ui.intermediarios.phone')}:</strong> {intermediario.telefono}</p>}
                  {intermediario.direccion && <p><strong>{t('admin.ui.intermediarios.address')}:</strong> {intermediario.direccion}</p>}
                  {intermediario.ciudad && <p><strong>{t('admin.ui.intermediarios.city')}:</strong> {intermediario.ciudad}</p>}
                  <p>
                    <strong>{t('admin.ui.intermediarios.status')}:</strong>{' '}
                    <span className={intermediario.estado === 1 ? 'text-green-600' : 'text-red-600'}>
                      {intermediario.estado === 1 ? t('admin.ui.intermediarios.active') : t('admin.ui.intermediarios.inactive')}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => abrirForm(intermediario)}
                  className="text-blue-600 hover:text-blue-800 p-2"
                  title={t('admin.ui.intermediarios.editIntermediary')}
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => eliminarIntermediario(intermediario._id)}
                  className="text-red-600 hover:text-red-800 p-2"
                  title={t('admin.ui.intermediarios.deleteIntermediary')}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {intermediarios.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <FaHandshake className="mx-auto text-4xl text-gray-400 mb-4" />
          <p className="text-gray-600">{t('admin.ui.intermediarios.empty')}</p>
          <button
            onClick={() => abrirForm()}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
          >
            <FaPlus /> {t('admin.ui.intermediarios.createFirst')}
          </button>
        </div>
      )}

      {/* Modal Formulario Intermediario */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {intermediarioEditando ? t('admin.ui.intermediarios.editTitle') : t('admin.ui.intermediarios.newTitle')}
              </h2>
              <button
                onClick={() => {
                  setMostrarForm(false);
                  setIntermediarioEditando(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={guardarIntermediario} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.intermediarios.codeRequired')}</label>
                <input
                  type="text"
                  value={formIntermediario.codigo}
                  onChange={(e) => setFormIntermediario({...formIntermediario, codigo: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                  disabled={!!intermediarioEditando}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.intermediarios.nameRequired')}</label>
                <input
                  type="text"
                  value={formIntermediario.nombre}
                  onChange={(e) => setFormIntermediario({...formIntermediario, nombre: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.intermediarios.email')}</label>
                <input
                  type="email"
                  value={formIntermediario.correo}
                  onChange={(e) => setFormIntermediario({...formIntermediario, correo: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.intermediarios.phone')}</label>
                <input
                  type="text"
                  value={formIntermediario.telefono}
                  onChange={(e) => setFormIntermediario({...formIntermediario, telefono: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.intermediarios.address')}</label>
                <input
                  type="text"
                  value={formIntermediario.direccion}
                  onChange={(e) => setFormIntermediario({...formIntermediario, direccion: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.intermediarios.city')}</label>
                <input
                  type="text"
                  value={formIntermediario.ciudad}
                  onChange={(e) => setFormIntermediario({...formIntermediario, ciudad: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.intermediarios.status')}</label>
                <select
                  value={formIntermediario.estado}
                  onChange={(e) => setFormIntermediario({...formIntermediario, estado: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value={1}>{t('admin.ui.intermediarios.active')}</option>
                  <option value={0}>{t('admin.ui.intermediarios.inactive')}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarForm(false);
                    setIntermediarioEditando(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  {t('admin.ui.intermediarios.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
                >
                  <FaSave /> {t('admin.ui.intermediarios.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
