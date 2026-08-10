import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BASE_URL, resolveUploadsUrl } from '../config/apiConfig';
import { FaPlus, FaEdit, FaTrash, FaUserTie, FaSave, FaTimes, FaUserCircle } from 'react-icons/fa';

export default function GestionResponsables() {
  const { t } = useTranslation();
  const [responsables, setResponsables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para formulario
  const [mostrarFormResponsable, setMostrarFormResponsable] = useState(false);
  const [responsableEditando, setResponsableEditando] = useState(null);

  // Estados para formulario de responsable
  const [formResponsable, setFormResponsable] = useState({
    codiRespnsble: '',
    nmbrRespnsble: '',
    email: '',
    telefono: ''
  });

  // Verificar permisos
  const usuarioActual = {
    rol: localStorage.getItem('rol'),
    tipoUsuario: localStorage.getItem('tipoUsuario')
  };
  const esAdminOSoporte = usuarioActual.rol === 'admin' || usuarioActual.rol === 'soporte';

  // Función para obtener URL de foto
  const obtenerUrlFoto = (fotoUrlRelativa) => {
    if (!fotoUrlRelativa) return null;
    // Maneja rutas /uploads y referencias s3: vía proxy de storage
    return resolveUploadsUrl(fotoUrlRelativa);
  };

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');

      // Cargar responsables
      const resResponsables = await fetch(`${BASE_URL}/api/responsables`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!resResponsables.ok) throw new Error(t('admin.ui.responsables.loadError'));
      const dataResponsables = await resResponsables.json();
      // Manejar ambos formatos: {success: true, data: [...]} o [...]
      if (dataResponsables.success && Array.isArray(dataResponsables.data)) {
        setResponsables(dataResponsables.data);
      } else if (Array.isArray(dataResponsables)) {
        setResponsables(dataResponsables);
      } else {
        setResponsables([]);
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

  // Funciones para responsable
  const abrirFormResponsable = (responsable = null) => {
    if (responsable) {
      setResponsableEditando(responsable);
      setFormResponsable({
        codiRespnsble: responsable.codiRespnsble || '',
        nmbrRespnsble: responsable.nmbrRespnsble || '',
        email: responsable.email || '',
        telefono: responsable.telefono || ''
      });
    } else {
      setResponsableEditando(null);
      setFormResponsable({
        codiRespnsble: '',
        nmbrRespnsble: '',
        email: '',
        telefono: ''
      });
    }
    setMostrarFormResponsable(true);
  };

  const guardarResponsable = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formResponsable.nmbrRespnsble || !formResponsable.codiRespnsble) {
      alert(t('admin.ui.responsables.requiredFields'));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = responsableEditando
        ? `${BASE_URL}/api/responsables/${responsableEditando._id}`
        : `${BASE_URL}/api/responsables`;

      const method = responsableEditando ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formResponsable)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || t('admin.ui.responsables.saveError'));
      }

      alert(responsableEditando ? t('admin.ui.responsables.updated') : t('admin.ui.responsables.created'));
      setMostrarFormResponsable(false);
      setResponsableEditando(null);
      cargarDatos();
    } catch (err) {
      console.error('Error guardando responsable:', err);
      setError(err.message);
      alert(t('admin.ui.responsables.errorPrefix', { message: err.message }));
    }
  };

  const eliminarResponsable = async (id) => {
    if (!window.confirm(t('admin.ui.responsables.confirmDelete'))) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/responsables/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || t('admin.ui.responsables.deleteError'));
      }

      alert(t('admin.ui.responsables.deleted'));
      cargarDatos();
    } catch (err) {
      console.error('Error eliminando responsable:', err);
      alert(t('admin.ui.responsables.errorPrefix', { message: err.message }));
    }
  };

  if (!esAdminOSoporte) {
    return (
      <div className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#F5F5F7' }}>
        <div className="max-w-4xl mx-auto">
          <div className="rounded-fenix shadow-lg border p-6" style={{ backgroundColor: '#FFFFFF', borderColor: '#DDDDDD' }}>
            <h2 className="text-xl font-bold mb-2 font-heading" style={{ color: '#DC2626' }}>{t('admin.ui.responsables.accessDeniedTitle')}</h2>
            <p className="font-body" style={{ color: '#1C1C1C' }}>{t('admin.ui.responsables.accessDeniedMessage')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 flex items-center justify-center" style={{ backgroundColor: '#fbf3e6' }}>
        <div className="text-center">
          <div className="text-2xl font-heading" style={{ color: '#1C1C1C' }}>{t('admin.ui.responsables.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#fbf3e6' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold font-heading" style={{ color: '#1C1C1C' }}>{t('admin.ui.responsables.title')}</h1>
        <button
          onClick={() => abrirFormResponsable()}
            className="text-white px-4 py-2.5 rounded-fenix hover:shadow-md transition-all duration-200 flex items-center gap-2 font-body font-medium"
            style={{
              background: 'rgba(220, 38, 38, 0.1)',
              color: '#1E1E1E',
              border: '1px solid rgba(220, 38, 38, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(220, 38, 38, 0.15)';
              e.currentTarget.style.borderColor = '#DC2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.3)';
            }}
        >
          <FaPlus /> {t('admin.ui.responsables.newResponsible')}
        </button>
      </div>

      {error && (
          <div className="bg-red-50 border border-red-200 rounded-fenix p-4 mb-4">
            <p className="text-red-700 font-body">{error}</p>
        </div>
      )}

      {/* Lista de Responsables */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {responsables.length === 0 ? (
            <div className="col-span-full">
              <div className="rounded-fenix shadow-lg border p-8 text-center" style={{ backgroundColor: '#FFFFFF', borderColor: '#DDDDDD' }}>
                <div className="text-4xl mb-4">👤</div>
                <p className="font-body" style={{ color: '#1C1C1C' }}>{t('admin.ui.responsables.empty')}</p>
              </div>
            </div>
          ) : responsables.map((responsable) => {
            const fotoUrl = responsable.fotoUsuario ? obtenerUrlFoto(responsable.fotoUsuario) : null;
            
            // Componente interno para manejar el estado de la imagen
            const ResponsableCard = () => {
              const [fotoError, setFotoError] = useState(false);
              
              return (
                <div 
                  className="border rounded-fenix shadow-lg p-4 sm:p-6 hover:shadow-xl transition-all duration-300"
                style={{ backgroundColor: '#FFFFFF', borderColor: '#DDDDDD' }}
                >
                  <div className="flex flex-col items-center mb-4">
                    {/* Foto del usuario */}
                    <div className="relative mb-4">
                      {fotoUrl && !fotoError ? (
                        <img
                          src={fotoUrl}
                          alt={responsable.nmbrRespnsble}
                          className="w-20 h-20 rounded-full object-cover border-3 border-fenix-fuego shadow-md"
                          style={{ borderWidth: '3px', borderColor: '#DC2626' }}
                          onError={() => setFotoError(true)}
                        />
                      ) : (
                        <div 
                          className="w-20 h-20 rounded-full border-3 flex items-center justify-center shadow-md"
                          style={{ borderWidth: '3px', borderColor: '#DC2626', background: 'rgba(220, 38, 38, 0.1)' }}
                        >
                          <FaUserTie className="text-3xl" style={{ color: '#FFFFFF' }} />
                        </div>
                      )}
                    </div>
                  
                    {/* Información */}
                    <div className="text-center w-full mb-4">
                      <h2 className="text-xl font-bold mb-1 font-heading" style={{ color: '#1C1C1C' }}>{responsable.nmbrRespnsble}</h2>
                      <span className="text-sm font-body" style={{ color: '#6B7280' }}>({responsable.codiRespnsble})</span>
                      {responsable.nombreUsuario && (
                        <p className="text-xs mt-1 font-body" style={{ color: '#DC2626' }}>{t('admin.ui.responsables.userLabel', { name: responsable.nombreUsuario })}</p>
                      )}
                    </div>
                    
                    {/* Detalles */}
                    <div className="w-full space-y-2 mb-4">
                      {responsable.email && (
                        <div className="flex items-center gap-2 text-sm font-body" style={{ color: '#1C1C1C' }}>
                          <span style={{ color: '#DC2626' }}>📧</span>
                          <span className="truncate">{responsable.email}</span>
                        </div>
                      )}
                      {responsable.telefono && (
                        <div className="flex items-center gap-2 text-sm font-body" style={{ color: '#1C1C1C' }}>
                          <span style={{ color: '#DC2626' }}>📞</span>
                          <span>{responsable.telefono}</span>
                </div>
                      )}
                </div>
              </div>
                  
                  {/* Botones de acción */}
                  <div className="flex gap-2 pt-4 border-t" style={{ borderColor: '#DDDDDD' }}>
                <button
                  onClick={() => abrirFormResponsable(responsable)}
                      className="flex-1 text-white px-3 py-2 rounded-fenix hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 font-body"
                      style={{
                        background: 'rgba(220, 38, 38, 0.1)',
                        color: '#1E1E1E',
                        border: '1px solid rgba(220, 38, 38, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(220, 38, 38, 0.15)';
                        e.currentTarget.style.borderColor = '#DC2626';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.3)';
                      }}
                  title={t('admin.ui.responsables.editResponsible')}
                >
                      <FaEdit /> {t('admin.ui.responsables.edit')}
                </button>
                <button
                  onClick={() => eliminarResponsable(responsable._id)}
                      className="text-white px-3 py-2 rounded-fenix transition-colors flex items-center justify-center font-body"
                      style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#1E1E1E', border: '1px solid rgba(220, 38, 38, 0.3)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.15)'; e.currentTarget.style.borderColor = '#DC2626'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)'; e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.3)'; }}
                  title={t('admin.ui.responsables.deleteResponsible')}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
              );
            };
            
            return <ResponsableCard key={responsable._id} />;
          })}
      </div>

      {/* Modal de Formulario de Responsable */}
      {mostrarFormResponsable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="rounded-fenix shadow-2xl p-6 w-full max-w-md relative border" style={{ backgroundColor: '#FFFFFF', borderColor: '#DDDDDD' }}>
              <h2 className="text-2xl font-bold mb-6 font-heading" style={{ color: '#1C1C1C' }}>
              {responsableEditando ? t('admin.ui.responsables.editTitle') : t('admin.ui.responsables.newTitle')}
            </h2>
            <form onSubmit={guardarResponsable} className="space-y-4">
              <div>
                  <label className="block text-sm font-semibold mb-2 font-heading" style={{ color: '#1C1C1C' }}>{t('admin.ui.responsables.codeRequired')}</label>
                <input
                  type="text"
                  name="codiRespnsble"
                  value={formResponsable.codiRespnsble}
                  onChange={(e) => setFormResponsable({ ...formResponsable, codiRespnsble: e.target.value })}
                    className="w-full border rounded-fenix shadow-sm p-2.5 focus:outline-none focus:ring-2 font-body"
                    style={{
                      borderColor: '#DDDDDD',
                      '--tw-ring-color': '#DC2626'
                    }}
                  required
                />
              </div>
              <div>
                  <label className="block text-sm font-semibold text-fenix-titanio mb-2 font-heading">{t('admin.ui.responsables.nameRequired')}</label>
                <input
                  type="text"
                  name="nmbrRespnsble"
                  value={formResponsable.nmbrRespnsble}
                  onChange={(e) => setFormResponsable({ ...formResponsable, nmbrRespnsble: e.target.value })}
                    className="w-full border border-fenix-neblina rounded-fenix shadow-sm p-2.5 focus:outline-none focus:ring-2 font-body"
                    style={{
                      '--tw-ring-color': '#FF6A00'
                    }}
                  required
                />
              </div>
              <div>
                  <label className="block text-sm font-semibold text-fenix-titanio mb-2 font-heading">{t('admin.ui.responsables.email')}</label>
                <input
                  type="email"
                  name="email"
                  value={formResponsable.email}
                  onChange={(e) => setFormResponsable({ ...formResponsable, email: e.target.value })}
                    className="w-full border border-fenix-neblina rounded-fenix shadow-sm p-2.5 focus:outline-none focus:ring-2 font-body"
                    style={{
                      '--tw-ring-color': '#FF6A00'
                    }}
                    placeholder={t('admin.ui.responsables.emailPlaceholder')}
                />
                  <p className="text-xs text-gray-500 mt-1 font-body">{t('admin.ui.responsables.emailHint')}</p>
              </div>
              <div>
                  <label className="block text-sm font-semibold text-fenix-titanio mb-2 font-heading">{t('admin.ui.responsables.phone')}</label>
                <input
                  type="text"
                  name="telefono"
                  value={formResponsable.telefono}
                  onChange={(e) => setFormResponsable({ ...formResponsable, telefono: e.target.value })}
                    className="w-full border border-fenix-neblina rounded-fenix shadow-sm p-2.5 focus:outline-none focus:ring-2 font-body"
                    style={{
                      '--tw-ring-color': '#FF6A00'
                    }}
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarFormResponsable(false);
                    setResponsableEditando(null);
                  }}
                    className="flex items-center gap-2 px-4 py-2 border rounded-fenix shadow-sm text-sm font-medium transition-colors font-body"
                    style={{ borderColor: '#DDDDDD', color: '#1C1C1C' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F4F3F2'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <FaTimes /> {t('admin.ui.responsables.cancel')}
                </button>
                <button
                  type="submit"
                    className="flex items-center gap-2 px-4 py-2 border border-transparent rounded-fenix shadow-sm text-sm font-medium text-white hover:shadow-md transition-all duration-200 font-body"
                    style={{
                      background: 'rgba(220, 38, 38, 0.1)',
                      color: '#1E1E1E',
                      border: '1px solid rgba(220, 38, 38, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(220, 38, 38, 0.15)';
                      e.currentTarget.style.borderColor = '#DC2626';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.3)';
                    }}
                >
                  <FaSave /> {responsableEditando ? t('admin.ui.responsables.update') : t('admin.ui.responsables.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
