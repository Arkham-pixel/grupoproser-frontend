import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../config/apiConfig';
import { FaPlus, FaEdit, FaTrash, FaHandshake, FaSave, FaTimes } from 'react-icons/fa';

export default function GestionIntermediarios() {
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

  // Cargar datos
  useEffect(() => {
    if (esAdminOSoporte) {
      cargarDatos();
    }
  }, [esAdminOSoporte]);

  const cargarDatos = async () => {
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
      if (!resIntermediarios.ok) throw new Error('Error al cargar intermediarios');
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
  };

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
      alert('El código y el nombre son requeridos');
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
        throw new Error(data.error || data.message || 'Error al guardar intermediario');
      }

      alert(intermediarioEditando ? 'Intermediario actualizado exitosamente' : 'Intermediario creado exitosamente');
      setMostrarForm(false);
      setIntermediarioEditando(null);
      cargarDatos();
    } catch (err) {
      console.error('Error guardando intermediario:', err);
      setError(err.message);
      alert(`Error: ${err.message}`);
    }
  };

  const eliminarIntermediario = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este intermediario? Esta acción no se puede deshacer.')) {
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
        throw new Error(data.error || data.message || 'Error al eliminar intermediario');
      }

      alert('Intermediario eliminado exitosamente');
      cargarDatos();
    } catch (err) {
      console.error('Error eliminando intermediario:', err);
      alert(`Error: ${err.message}`);
    }
  };

  if (!esAdminOSoporte) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-lg font-medium text-red-800 mb-2">Acceso Denegado</h2>
          <p className="text-red-700">No tienes permisos para acceder a esta función. Se requieren permisos de administrador o soporte.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FaHandshake className="text-purple-600" />
          Gestión de Intermediarios
        </h1>
        <button
          onClick={() => abrirForm()}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FaPlus /> Nuevo Intermediario
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
                <p className="text-sm text-gray-500 mb-2">Código: {intermediario.codigo}</p>
                <div className="space-y-1 text-sm text-gray-600">
                  {intermediario.correo && <p><strong>Email:</strong> {intermediario.correo}</p>}
                  {intermediario.telefono && <p><strong>Teléfono:</strong> {intermediario.telefono}</p>}
                  {intermediario.direccion && <p><strong>Dirección:</strong> {intermediario.direccion}</p>}
                  {intermediario.ciudad && <p><strong>Ciudad:</strong> {intermediario.ciudad}</p>}
                  <p>
                    <strong>Estado:</strong>{' '}
                    <span className={intermediario.estado === 1 ? 'text-green-600' : 'text-red-600'}>
                      {intermediario.estado === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => abrirForm(intermediario)}
                  className="text-blue-600 hover:text-blue-800 p-2"
                  title="Editar intermediario"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => eliminarIntermediario(intermediario._id)}
                  className="text-red-600 hover:text-red-800 p-2"
                  title="Eliminar intermediario"
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
          <p className="text-gray-600">No hay intermediarios registrados</p>
          <button
            onClick={() => abrirForm()}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
          >
            <FaPlus /> Crear Primer Intermediario
          </button>
        </div>
      )}

      {/* Modal Formulario Intermediario */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {intermediarioEditando ? 'Editar Intermediario' : 'Nuevo Intermediario'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formIntermediario.nombre}
                  onChange={(e) => setFormIntermediario({...formIntermediario, nombre: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formIntermediario.correo}
                  onChange={(e) => setFormIntermediario({...formIntermediario, correo: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={formIntermediario.telefono}
                  onChange={(e) => setFormIntermediario({...formIntermediario, telefono: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={formIntermediario.direccion}
                  onChange={(e) => setFormIntermediario({...formIntermediario, direccion: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={formIntermediario.ciudad}
                  onChange={(e) => setFormIntermediario({...formIntermediario, ciudad: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={formIntermediario.estado}
                  onChange={(e) => setFormIntermediario({...formIntermediario, estado: Number(e.target.value)})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value={1}>Activo</option>
                  <option value={0}>Inactivo</option>
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
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
                >
                  <FaSave /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

