import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../config/apiConfig';
import { FaPlus, FaEdit, FaTrash, FaBuilding, FaUser, FaSave, FaTimes } from 'react-icons/fa';

export default function GestionClientesFuncionarios() {
  const { t } = useTranslation();
  const [clientes, setClientes] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para formularios
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [mostrarFormFuncionario, setMostrarFormFuncionario] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [funcionarioEditando, setFuncionarioEditando] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  
  // Estados para formulario de cliente
  const [formCliente, setFormCliente] = useState({
    codiAsgrdra: '',
    rzonSocial: '',
    correo: '',
    teleFijo: '',
    teleCellar: '',
    direCliente: '',
    codiPais: '',
    codiDepto: '',
    codiMpio: '',
    codiPoblado: '',
    codiEstdo: 1,
    descIva: 0,
    reteIva: 0,
    reteFuente: 0,
    reteIca: 0
  });
  
  // Estados para formulario de funcionario
  const [formFuncionario, setFormFuncionario] = useState({
    id: '',
    codiAsgrdra: '',
    nmbrContcto: '',
    cargo: '',
    email: '',
    teleCellar: '',
    direccion: '',
    ciudadDestino: '',
    paisDestino: ''
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
      
      // Cargar clientes
      const resClientes = await fetch(`${BASE_URL}/api/clientes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!resClientes.ok) throw new Error(t('admin.ui.clientes.loadClientsError'));
      const dataClientes = await resClientes.json();
      setClientes(Array.isArray(dataClientes) ? dataClientes : []);

      // Cargar funcionarios
      const resFuncionarios = await fetch(`${BASE_URL}/api/funcionarios-aseguradora`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!resFuncionarios.ok) throw new Error(t('admin.ui.clientes.loadOfficersError'));
      const dataFuncionarios = await resFuncionarios.json();
      // Manejar ambos formatos: {success: true, data: [...]} o [...]
      if (dataFuncionarios.success && Array.isArray(dataFuncionarios.data)) {
        setFuncionarios(dataFuncionarios.data);
      } else if (Array.isArray(dataFuncionarios)) {
        setFuncionarios(dataFuncionarios);
      } else {
        setFuncionarios([]);
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

  const obtenerFuncionariosPorCliente = (codiAsgrdra) => {
    return funcionarios.filter(f => f.codiAsgrdra === codiAsgrdra);
  };

  // Funciones para cliente
  const abrirFormCliente = (cliente = null) => {
    if (cliente) {
      setClienteEditando(cliente);
      setFormCliente({
        codiAsgrdra: cliente.codiAsgrdra || '',
        rzonSocial: cliente.rzonSocial || '',
        correo: cliente.correo || '',
        teleFijo: cliente.teleFijo || '',
        teleCellar: cliente.teleCellar || '',
        direCliente: cliente.direCliente || '',
        codiPais: cliente.codiPais || '',
        codiDepto: cliente.codiDepto || '',
        codiMpio: cliente.codiMpio || '',
        codiPoblado: cliente.codiPoblado || '',
        codiEstdo: cliente.codiEstdo || 1,
        descIva: cliente.descIva || 0,
        reteIva: cliente.reteIva || 0,
        reteFuente: cliente.reteFuente || 0,
        reteIca: cliente.reteIca || 0
      });
    } else {
      setClienteEditando(null);
      setFormCliente({
        codiAsgrdra: '',
        rzonSocial: '',
        correo: '',
        teleFijo: '',
        teleCellar: '',
        direCliente: '',
        codiPais: '',
        codiDepto: '',
        codiMpio: '',
        codiPoblado: '',
        codiEstdo: 1,
        descIva: 0,
        reteIva: 0,
        reteFuente: 0,
        reteIca: 0
      });
    }
    setMostrarFormCliente(true);
  };

  const guardarCliente = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const url = clienteEditando 
        ? `${BASE_URL}/api/clientes/${clienteEditando._id}`
        : `${BASE_URL}/api/clientes`;
      
      const method = clienteEditando ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formCliente)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || t('admin.ui.clientes.saveClientError'));
      }

      alert(clienteEditando ? t('admin.ui.clientes.clientUpdated') : t('admin.ui.clientes.clientCreated'));
      setMostrarFormCliente(false);
      cargarDatos();
    } catch (err) {
      console.error('Error guardando cliente:', err);
      setError(err.message);
      alert(t('admin.ui.clientes.errorPrefix', { message: err.message }));
    }
  };

  const eliminarCliente = async (id) => {
    if (!window.confirm(t('admin.ui.clientes.confirmDeleteClient'))) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/clientes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || t('admin.ui.clientes.deleteClientError'));
      }

      alert(t('admin.ui.clientes.clientDeleted'));
      cargarDatos();
    } catch (err) {
      console.error('Error eliminando cliente:', err);
      alert(t('admin.ui.clientes.errorPrefix', { message: err.message }));
    }
  };

  // Funciones para funcionario
  const abrirFormFuncionario = (funcionario = null, clienteCodigo = null) => {
    if (funcionario) {
      setFuncionarioEditando(funcionario);
      setFormFuncionario({
        id: funcionario.id || '',
        codiAsgrdra: funcionario.codiAsgrdra || '',
        nmbrContcto: funcionario.nmbrContcto || '',
        cargo: funcionario.cargo || '',
        email: funcionario.email || '',
        teleCellar: funcionario.teleCellar || '',
        direccion: funcionario.direccion || '',
        ciudadDestino: funcionario.ciudadDestino || '',
        paisDestino: funcionario.paisDestino || ''
      });
    } else {
      setFuncionarioEditando(null);
      setFormFuncionario({
        id: '',
        codiAsgrdra: clienteCodigo || clienteSeleccionado || '',
        nmbrContcto: '',
        cargo: '',
        email: '',
        teleCellar: '',
        direccion: '',
        ciudadDestino: '',
        paisDestino: ''
      });
    }
    setMostrarFormFuncionario(true);
  };

  const guardarFuncionario = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!formFuncionario.codiAsgrdra || !formFuncionario.nmbrContcto) {
      alert(t('admin.ui.clientes.requiredCodeName'));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = funcionarioEditando 
        ? `${BASE_URL}/api/funcionarios-aseguradora/${funcionarioEditando._id}`
        : `${BASE_URL}/api/funcionarios-aseguradora`;
      
      const method = funcionarioEditando ? 'PUT' : 'POST';
      
      // Preparar datos para enviar (incluir id solo si está presente)
      const datosParaEnviar = { ...formFuncionario };
      // Si el id está vacío o es 0, no enviarlo para que el backend lo genere automáticamente
      if (!datosParaEnviar.id || datosParaEnviar.id === 0) {
        delete datosParaEnviar.id;
      } else {
        // Asegurar que el id sea un número
        datosParaEnviar.id = parseInt(datosParaEnviar.id);
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(datosParaEnviar)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || t('admin.ui.clientes.saveOfficerError'));
      }

      alert(funcionarioEditando ? t('admin.ui.clientes.officerUpdated') : t('admin.ui.clientes.officerCreated'));
      setMostrarFormFuncionario(false);
      setFuncionarioEditando(null);
      cargarDatos();
    } catch (err) {
      console.error('Error guardando funcionario:', err);
      setError(err.message);
      alert(t('admin.ui.clientes.errorPrefix', { message: err.message }));
    }
  };

  const eliminarFuncionario = async (id) => {
    if (!window.confirm(t('admin.ui.clientes.confirmDeleteOfficer'))) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/api/funcionarios-aseguradora/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || t('admin.ui.clientes.deleteOfficerError'));
      }

      alert(t('admin.ui.clientes.officerDeleted'));
      cargarDatos();
    } catch (err) {
      console.error('Error eliminando funcionario:', err);
      alert(t('admin.ui.clientes.errorPrefix', { message: err.message }));
    }
  };

  if (!esAdminOSoporte) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h2 className="text-lg font-medium text-red-800 mb-2">{t('admin.ui.clientes.accessDeniedTitle')}</h2>
          <p className="text-red-700">{t('admin.ui.clientes.accessDeniedMessage')}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">{t('admin.ui.clientes.loading')}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.ui.clientes.title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => abrirFormCliente()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FaPlus /> {t('admin.ui.clientes.newClient')}
          </button>
          <button
            onClick={() => abrirFormFuncionario()}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <FaPlus /> {t('admin.ui.clientes.newOfficer')}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Lista de Clientes */}
      <div className="space-y-4">
        {clientes.map((cliente) => {
          const funcionariosCliente = obtenerFuncionariosPorCliente(cliente.codiAsgrdra);
          return (
            <div key={cliente._id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FaBuilding className="text-blue-600 text-xl" />
                    <h2 className="text-xl font-bold text-gray-900">{cliente.rzonSocial}</h2>
                    <span className="text-sm text-gray-500">({cliente.codiAsgrdra})</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600">
                    {cliente.correo && <p><strong>{t('admin.ui.clientes.email')}:</strong> {cliente.correo}</p>}
                    {cliente.teleCellar && <p><strong>{t('admin.ui.clientes.phone')}:</strong> {cliente.teleCellar}</p>}
                    {cliente.direCliente && <p><strong>{t('admin.ui.clientes.address')}:</strong> {cliente.direCliente}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirFormCliente(cliente)}
                    className="text-blue-600 hover:text-blue-800 p-2"
                    title={t('admin.ui.clientes.editClient')}
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => eliminarCliente(cliente._id)}
                    className="text-red-600 hover:text-red-800 p-2"
                    title={t('admin.ui.clientes.deleteClient')}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>

              {/* Funcionarios del cliente */}
              <div className="mt-4 border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                    <FaUser className="text-green-600" />
                    {t('admin.ui.clientes.officers', { count: funcionariosCliente.length })}
                  </h3>
                  <button
                    onClick={() => {
                      setClienteSeleccionado(cliente.codiAsgrdra);
                      abrirFormFuncionario(null, cliente.codiAsgrdra);
                    }}
                    className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded flex items-center gap-1"
                  >
                    <FaPlus /> {t('admin.ui.clientes.addOfficer')}
                  </button>
                </div>
                
                {funcionariosCliente.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {funcionariosCliente.map((funcionario) => (
                      <div key={funcionario._id} className="bg-gray-50 border border-gray-200 rounded p-3 flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-900">{funcionario.nmbrContcto}</p>
                            {funcionario.id && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                ID: {funcionario.id}
                              </span>
                            )}
                          </div>
                          {funcionario.email && <p className="text-sm text-gray-600">{funcionario.email}</p>}
                          {funcionario.teleCellar && <p className="text-sm text-gray-600">{funcionario.teleCellar}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => abrirFormFuncionario(funcionario)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title={t('admin.ui.clientes.editOfficer')}
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => eliminarFuncionario(funcionario._id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title={t('admin.ui.clientes.deleteOfficer')}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">{t('admin.ui.clientes.noOfficers')}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Formulario Cliente */}
      {mostrarFormCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {clienteEditando ? t('admin.ui.clientes.editClientTitle') : t('admin.ui.clientes.newClientTitle')}
              </h2>
              <button
                onClick={() => setMostrarFormCliente(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={guardarCliente} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.clientes.codeInsurer')}</label>
                  <input
                    type="text"
                    value={formCliente.codiAsgrdra}
                    onChange={(e) => setFormCliente({...formCliente, codiAsgrdra: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                    disabled={!!clienteEditando}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.clientes.businessName')}</label>
                  <input
                    type="text"
                    value={formCliente.rzonSocial}
                    onChange={(e) => setFormCliente({...formCliente, rzonSocial: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.clientes.email')}</label>
                  <input
                    type="email"
                    value={formCliente.correo}
                    onChange={(e) => setFormCliente({...formCliente, correo: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.clientes.landline')}</label>
                  <input
                    type="text"
                    value={formCliente.teleFijo}
                    onChange={(e) => setFormCliente({...formCliente, teleFijo: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.clientes.mobile')}</label>
                  <input
                    type="text"
                    value={formCliente.teleCellar}
                    onChange={(e) => setFormCliente({...formCliente, teleCellar: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.clientes.address')}</label>
                  <input
                    type="text"
                    value={formCliente.direCliente}
                    onChange={(e) => setFormCliente({...formCliente, direCliente: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setMostrarFormCliente(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  {t('admin.ui.clientes.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <FaSave /> {t('admin.ui.clientes.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Formulario Funcionario */}
      {mostrarFormFuncionario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {funcionarioEditando ? t('admin.ui.clientes.editOfficerTitle') : t('admin.ui.clientes.newOfficerTitle')}
              </h2>
              <button
                onClick={() => {
                  setMostrarFormFuncionario(false);
                  setFuncionarioEditando(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={guardarFuncionario} className="p-4 space-y-4 max-h-[min(85vh,720px)] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.ui.clientes.officerId')} {!funcionarioEditando && <span className="text-gray-500 text-xs">{t('admin.ui.clientes.officerIdOptional')}</span>}
                </label>
                <input
                  type="number"
                  value={formFuncionario.id || ''}
                  onChange={(e) => setFormFuncionario({...formFuncionario, id: e.target.value ? parseInt(e.target.value) : ''})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder={funcionarioEditando ? t('admin.ui.clientes.officerIdPlaceholderEdit') : t('admin.ui.clientes.officerIdPlaceholderNew')}
                  disabled={!!funcionarioEditando}
                  min="1"
                />
                {!funcionarioEditando && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('admin.ui.clientes.officerIdHintNew')}
                  </p>
                )}
                {funcionarioEditando && formFuncionario.id && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('admin.ui.clientes.officerIdHintEdit')}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.clientes.clientInsurer')}</label>
                <select
                  value={formFuncionario.codiAsgrdra}
                  onChange={(e) => setFormFuncionario({...formFuncionario, codiAsgrdra: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                  disabled={!!funcionarioEditando}
                >
                  <option value="">{t('admin.ui.clientes.selectClient')}</option>
                  {clientes
                    .sort((a, b) => {
                      const nameA = (a.rzonSocial || '').toString().toUpperCase();
                      const nameB = (b.rzonSocial || '').toString().toUpperCase();
                      return nameA.localeCompare(nameB);
                    })
                    .map(cliente => (
                      <option key={cliente._id} value={cliente.codiAsgrdra}>
                        {cliente.rzonSocial} ({cliente.codiAsgrdra})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.clientes.officerName')}</label>
                <input
                  type="text"
                  value={formFuncionario.nmbrContcto}
                  onChange={(e) => setFormFuncionario({...formFuncionario, nmbrContcto: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.clientes.position')}</label>
                <input
                  type="text"
                  value={formFuncionario.cargo}
                  onChange={(e) => setFormFuncionario({ ...formFuncionario, cargo: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder={t('admin.ui.clientes.positionPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.clientes.email')}</label>
                <input
                  type="email"
                  value={formFuncionario.email}
                  onChange={(e) => setFormFuncionario({...formFuncionario, email: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.clientes.mobile')}</label>
                <input
                  type="text"
                  value={formFuncionario.teleCellar}
                  onChange={(e) => setFormFuncionario({...formFuncionario, teleCellar: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.clientes.address')}</label>
                <input
                  type="text"
                  value={formFuncionario.direccion}
                  onChange={(e) => setFormFuncionario({ ...formFuncionario, direccion: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder={t('admin.ui.clientes.addressPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.clientes.cityDestination')}</label>
                <input
                  type="text"
                  value={formFuncionario.ciudadDestino}
                  onChange={(e) => setFormFuncionario({ ...formFuncionario, ciudadDestino: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder={t('admin.ui.clientes.cityDestinationPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.ui.clientes.countryDestination')}</label>
                <input
                  type="text"
                  value={formFuncionario.paisDestino}
                  onChange={(e) => setFormFuncionario({ ...formFuncionario, paisDestino: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder={t('admin.ui.clientes.countryDestinationPlaceholder')}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarFormFuncionario(false);
                    setFuncionarioEditando(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  {t('admin.ui.clientes.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                >
                  <FaSave /> {t('admin.ui.clientes.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
