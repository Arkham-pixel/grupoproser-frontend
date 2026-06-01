import React, { useState, useEffect } from 'react';
import { FaSignature, FaUser, FaBuilding, FaPhone, FaEnvelope, FaPlus, FaTrash, FaEdit, FaSave, FaUpload } from 'react-icons/fa';
import FuncionarioService from '../../services/funcionarioService.js';
import { useTheme } from '../../context/ThemeContext';
import { tituloAjuste, subtituloAjuste } from './formatoTitulosAjuste';
import firmaIskharlyImg from '../../img/FIRMAISKHARLY.png';

export default function FirmaAjuste({ formData, onInputChange }) {
  const { theme } = useTheme();
  
  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const sectionBlueBg = theme === 'dark' ? 'rgba(37, 99, 235, 0.15)' : '#DBEAFE';
  const sectionBlueText = theme === 'dark' ? '#93C5FD' : '#1E3A8A';
  const sectionBlueBorder = theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#93C5FD';
  const sectionGreenBg = theme === 'dark' ? 'rgba(34, 197, 94, 0.15)' : '#D1FAE5';
  const sectionGreenText = theme === 'dark' ? '#86EFAC' : '#065F46';
  const sectionGreenBorder = theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : '#86EFAC';
  
  // Estado para funcionarios personalizables
  const [funcionarios, setFuncionarios] = useState([]);
  const [cargandoFuncionarios, setCargandoFuncionarios] = useState(true);

  // Estado para funcionario seleccionado
  const [funcionarioSeleccionado, setFuncionarioSeleccionado] = useState('');
  const [cargoSeleccionado, setCargoSeleccionado] = useState('');

  // Estado para la firma (solo imagen base64)
  const [firmaImagen, setFirmaImagen] = useState(null);

  // Estado para modal de agregar/editar funcionario
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [funcionarioEditando, setFuncionarioEditando] = useState({
    id: null,
    nombre: '',
    cargo: '',
    telefono: '',
    email: '',
    firma: null
  });

  // Estado para cargos personalizables
  const [cargos, setCargos] = useState(() => {
    const guardados = localStorage.getItem('proser_cargos');
    return guardados ? JSON.parse(guardados) : [
      'Ing. de Siniestros',
      'Ajustador Senior',
      'Ajustador Especialista',
      'Perito en Seguros',
      'Analista de Riesgos',
      'Coordinador de Ajustes',
      'Supervisor de Campo',
      'Técnico de Ajustes',
      'Gerente Técnico'
    ];
  });

  // Cargar funcionarios desde la API al montar el componente
  useEffect(() => {
    const cargarFuncionarios = async () => {
      try {
        setCargandoFuncionarios(true);
        const funcionariosAPI = await FuncionarioService.obtenerFuncionarios();
        
        // Si no hay funcionarios en la API, crear el funcionario por defecto
        if (funcionariosAPI.length === 0) {
          const funcionarioDefecto = {
            nombre: 'Iskharly José Tapia Gutiérrez',
            cargo: 'Gerente Técnico',
            telefono: '(+57 5) 3857793 - +57 3166337503',
            email: 'itapia@proserpuertos.com.co',
            firma: null
          };
          
          try {
            const nuevoFuncionario = await FuncionarioService.crearFuncionario(funcionarioDefecto);
            setFuncionarios([nuevoFuncionario]);
          } catch (error) {
            console.error('Error al crear funcionario por defecto:', error);
            const funcionariosLocal = FuncionarioService.cargarDesdeLocalStorage();
            setFuncionarios(funcionariosLocal.length > 0 ? funcionariosLocal : [funcionarioDefecto]);
          }
        } else {
          setFuncionarios(funcionariosAPI);
        }
      } catch (error) {
        console.error('Error al cargar funcionarios:', error);
        const funcionariosLocal = FuncionarioService.cargarDesdeLocalStorage();
        setFuncionarios(funcionariosLocal);
      } finally {
        setCargandoFuncionarios(false);
      }
    };

    cargarFuncionarios();
  }, []);

  // Sincronizar con localStorage cuando cambien los funcionarios
  useEffect(() => {
    if (funcionarios.length > 0) {
      FuncionarioService.guardarEnLocalStorage(funcionarios);
    }
  }, [funcionarios]);

  // Guardar cargos en localStorage
  useEffect(() => {
    localStorage.setItem('proser_cargos', JSON.stringify(cargos));
  }, [cargos]);

  // Cargar firma de Iskharly (localStorage o imagen por defecto)
  useEffect(() => {
    const cargarFirmaIskharly = async () => {
      const firmaIskharlyGuardada = localStorage.getItem('proser_firma_isharly');
      if (firmaIskharlyGuardada) {
        onInputChange('firmaIskharly', firmaIskharlyGuardada);
        return;
      }
      try {
        const response = await fetch(firmaIskharlyImg);
        const blob = await response.blob();
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (base64) onInputChange('firmaIskharly', base64);
      } catch (error) {
        console.error('No se pudo cargar la firma por defecto de Iskharly:', error);
      }
    };
    cargarFirmaIskharly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar firma del funcionario seleccionado cuando cambie
  useEffect(() => {
    if (funcionarioSeleccionado) {
      const funcionario = funcionarios.find(f => f._id === funcionarioSeleccionado);
      if (funcionario && funcionario.firma) {
        setFirmaImagen(funcionario.firma);
        onInputChange('firmaFuncionario', funcionario.firma);
        } else {
        setFirmaImagen(null);
        onInputChange('firmaFuncionario', '');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionarioSeleccionado, funcionarios]);

  // Función para subir imagen de firma
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!funcionarioSeleccionado) {
      alert('⚠️ Por favor selecciona un funcionario primero');
      e.target.value = '';
      return;
    }
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imagenBase64 = event.target.result;
        
        // Actualizar estado local
        setFirmaImagen(imagenBase64);
        
        // Guardar en formData
        onInputChange('firmaFuncionario', imagenBase64);
        
        // Guardar en BD
        await guardarFirmaFuncionario(imagenBase64);
        
        alert('✅ Firma cargada y guardada correctamente!');
      };
      reader.onerror = () => {
        alert('❌ Error al leer el archivo. Por favor intenta de nuevo.');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('❌ Error al procesar la imagen:', error);
      alert('❌ Error al procesar la imagen. Por favor intenta de nuevo.');
    }
    
    e.target.value = '';
  };

  // Agregar nuevo funcionario
  const agregarFuncionario = () => {
    setModoEdicion(false);
    setFuncionarioEditando({
      id: null,
      nombre: '',
      cargo: '',
      telefono: '',
      email: '',
      firma: null
    });
    setMostrarModal(true);
  };

  // Editar funcionario existente
  const editarFuncionario = (funcionario) => {
    setModoEdicion(true);
    setFuncionarioEditando({ ...funcionario });
    setMostrarModal(true);
  };

  // Eliminar funcionario
  const eliminarFuncionario = async (id) => {
    if (window.confirm('¿Está seguro de que desea eliminar este funcionario?')) {
      try {
        await FuncionarioService.eliminarFuncionario(id);
        setFuncionarios(funcionarios.filter(f => f._id !== id));
        
        if (funcionarioSeleccionado === id.toString()) {
          setFuncionarioSeleccionado('');
          setCargoSeleccionado('');
          setFirmaImagen(null);
          onInputChange('firmaFuncionario', '');
        }
      } catch (error) {
        console.error('❌ Error al eliminar funcionario:', error);
        alert('Error al eliminar el funcionario. Intente nuevamente.');
      }
    }
  };

  // Guardar funcionario (crear o actualizar)
  const guardarFuncionario = async () => {
    if (!funcionarioEditando.nombre || !funcionarioEditando.cargo) {
      alert('El nombre y cargo son obligatorios');
      return;
    }

    try {
      if (modoEdicion) {
        const funcionarioActualizado = await FuncionarioService.actualizarFuncionario(
          funcionarioEditando._id, 
          funcionarioEditando
        );
        setFuncionarios(funcionarios.map(f => 
          f._id === funcionarioEditando._id ? funcionarioActualizado : f
        ));
      } else {
        const nuevoFuncionario = await FuncionarioService.crearFuncionario(funcionarioEditando);
        setFuncionarios([...funcionarios, nuevoFuncionario]);
      }

      setMostrarModal(false);
      setFuncionarioEditando({
        id: null,
        nombre: '',
        cargo: '',
        telefono: '',
        email: '',
        firma: null
      });
    } catch (error) {
      console.error('❌ Error al guardar funcionario:', error);
      alert('Error al guardar el funcionario. Intente nuevamente.');
    }
  };

  // Agregar nuevo cargo
  const agregarCargo = () => {
    const nuevoCargo = prompt('Ingrese el nuevo cargo:');
    if (nuevoCargo && !cargos.includes(nuevoCargo)) {
      setCargos([...cargos, nuevoCargo]);
    }
  };

  // Eliminar cargo
  const eliminarCargo = (cargo) => {
    if (window.confirm(`¿Está seguro de que desea eliminar el cargo "${cargo}"?`)) {
      setCargos(cargos.filter(c => c !== cargo));
    }
  };

  // Manejar cambio de funcionario seleccionado
  const handleFuncionarioChange = (funcionarioId) => {
    const funcionario = funcionarios.find(f => f._id === funcionarioId);
    
    if (funcionario) {
      setFuncionarioSeleccionado(funcionarioId);
      setCargoSeleccionado(funcionario.cargo);
      onInputChange('funcionarioFirma', funcionario.nombre);
      onInputChange('cargoFuncionario', funcionario.cargo);
      onInputChange('telefonoFuncionario', funcionario.telefono);
      onInputChange('emailFuncionario', funcionario.email);
      
      if (funcionario.firma) {
        setFirmaImagen(funcionario.firma);
        onInputChange('firmaFuncionario', funcionario.firma);
      } else {
        setFirmaImagen(null);
        onInputChange('firmaFuncionario', '');
      }
    }
  };

  // Guardar firma del funcionario en la API
  const guardarFirmaFuncionario = async (firmaBase64) => {
    if (funcionarioSeleccionado) {
      try {
        await FuncionarioService.actualizarFirmaFuncionario(funcionarioSeleccionado, firmaBase64);
        
        const funcionarioActualizado = funcionarios.map(f => 
          f._id === funcionarioSeleccionado 
            ? { ...f, firma: firmaBase64 }
            : f
        );
        setFuncionarios(funcionarioActualizado);
        onInputChange('firmaFuncionario', firmaBase64);
      } catch (error) {
        console.error('❌ Error al guardar firma en BD:', error);
        const funcionarioActualizado = funcionarios.map(f => 
          f._id === funcionarioSeleccionado 
            ? { ...f, firma: firmaBase64 }
            : f
        );
        setFuncionarios(funcionarioActualizado);
        onInputChange('firmaFuncionario', firmaBase64);
      }
    }
  };

  // Limpiar firma
  const limpiarFirma = async () => {
    if (window.confirm('¿Estás seguro de eliminar la firma?')) {
      setFirmaImagen(null);
      onInputChange('firmaFuncionario', '');
      
      if (funcionarioSeleccionado) {
        await guardarFirmaFuncionario('');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div 
        className="pb-4"
        style={{
          borderBottom: `1px solid ${borderColor}`
        }}
      >
        <h2 
          className="text-2xl font-bold flex items-center"
          style={{ color: textPrimary }}
        >
          <FaSignature 
            className="mr-3" 
            style={{ color: theme === 'dark' ? '#A78BFA' : '#6366F1' }}
          />
          {tituloAjuste('Sistema de firmas')}
        </h2>
        <p 
          className="mt-2"
          style={{ color: textSecondary }}
        >
          {subtituloAjuste('Gestión de funcionarios y firmas personalizables')}
        </p>
        
        <div 
          className="mt-4 p-4 rounded-lg"
          style={{
            backgroundColor: sectionBlueBg,
            border: `1px solid ${sectionBlueBorder}`
          }}
        >
          <h3 
            className="font-semibold mb-2"
            style={{ color: sectionBlueText }}
          >
            📋 ¿Cómo funciona el sistema de firmas?
          </h3>
          <ul 
            className="text-sm space-y-1"
            style={{ color: sectionBlueText }}
          >
            <li>• <strong>Selecciona un funcionario</strong> del dropdown</li>
            <li>• <strong>Sube una imagen</strong> de la firma (PNG, JPG)</li>
            <li>• <strong>La firma se guarda automáticamente</strong> y se recordará cada vez</li>
            <li>• <strong>Para cambiar la firma:</strong> sube una nueva imagen</li>
          </ul>
        </div>
      </div>

      {/* Gestión de Funcionarios */}
      <div 
        className="p-6 rounded-lg"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 
            className="text-lg font-semibold flex items-center"
            style={{ color: textPrimary }}
          >
            <FaUser 
              className="mr-2" 
              style={{ color: theme === 'dark' ? '#93C5FD' : '#2563EB' }}
            />
            Gestión de Funcionarios
          </h3>
          <button
            onClick={agregarFuncionario}
            className="px-4 py-2 rounded-lg flex items-center transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#2563EB',
              color: theme === 'dark' ? '#93C5FD' : '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#1D4ED8';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#2563EB';
            }}
          >
            <FaPlus className="mr-2" />
            Agregar Funcionario
          </button>
        </div>

        {/* Lista de funcionarios */}
        <div className="space-y-3">
          {cargandoFuncionarios ? (
            <div className="text-center py-4">
              <div 
                className="inline-block animate-spin rounded-full h-6 w-6 border-b-2"
                style={{
                  borderColor: theme === 'dark' ? '#93C5FD' : '#2563EB'
                }}
              ></div>
              <p 
                className="mt-2 text-sm"
                style={{ color: textSecondary }}
              >
                Cargando funcionarios...
              </p>
            </div>
          ) : funcionarios.length === 0 ? (
            <div 
              className="text-center py-4"
              style={{ color: textSecondary }}
            >
              <p>No hay funcionarios registrados</p>
            </div>
          ) : (
            funcionarios.map((funcionario) => (
            <div 
              key={funcionario._id} 
              className="flex items-center justify-between p-3 rounded-lg"
              style={{
                backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
                border: `1px solid ${borderColor}`
              }}
            >
              <div className="flex-1">
                <div 
                  className="font-medium"
                  style={{ color: textPrimary }}
                >
                  {funcionario.nombre}
                </div>
                <div 
                  className="text-sm"
                  style={{ color: textSecondary }}
                >
                  {funcionario.cargo}
                </div>
                <div 
                  className="text-xs"
                  style={{ color: textSecondary }}
                >
                  {funcionario.telefono} • {funcionario.email}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => editarFuncionario(funcionario)}
                  className="p-1 transition-colors"
                  style={{
                    color: theme === 'dark' ? '#93C5FD' : '#2563EB'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = theme === 'dark' ? '#BFDBFE' : '#1D4ED8';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = theme === 'dark' ? '#93C5FD' : '#2563EB';
                  }}
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => eliminarFuncionario(funcionario._id)}
                  className="p-1 transition-colors"
                  style={{
                    color: theme === 'dark' ? '#FCA5A5' : '#DC2626'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = theme === 'dark' ? '#FEE2E2' : '#B91C1C';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = theme === 'dark' ? '#FCA5A5' : '#DC2626';
                  }}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
            ))
          )}
        </div>
      </div>

      {/* Firma de Iskharly */}
      <div 
        className="p-6 rounded-lg"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4 flex items-center"
          style={{ color: textPrimary }}
        >
          <FaSignature 
            className="mr-2" 
            style={{ color: theme === 'dark' ? '#86EFAC' : '#16A34A' }}
          />
          Firma del Gerente Técnico (Iskharly)
        </h3>
        
        <div 
          className="p-4 rounded-lg"
          style={{
            backgroundColor: sectionGreenBg,
            border: `1px solid ${sectionGreenBorder}`
          }}
        >
          <div className="text-center">
            <h4 
              className="font-semibold text-lg mb-2"
              style={{ color: sectionGreenText }}
            >
              Iskharly José Tapia Gutiérrez
            </h4>
            <p 
              className="mb-1"
              style={{ color: sectionGreenText }}
            >
              Gerente Técnico
            </p>
            <p 
              className="font-medium mb-2"
              style={{ color: sectionGreenText }}
            >
              PROSER AJUSTES SAS
            </p>
            
            <div 
              className="space-y-1 text-sm"
              style={{ color: sectionGreenText }}
            >
              <div className="flex items-center justify-center space-x-2">
                <FaPhone 
                  style={{ color: theme === 'dark' ? '#86EFAC' : '#16A34A' }}
                />
                <span>PBX: (+57 5) 3857793 - +57 3166337503</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <FaEnvelope 
                  style={{ color: theme === 'dark' ? '#86EFAC' : '#16A34A' }}
                />
                <span>itapia@proserpuertos.com.co</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gestión de Cargos */}
      <div 
        className="p-4 rounded-lg"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 
            className="text-lg font-semibold flex items-center"
            style={{ color: textPrimary }}
          >
            <FaBuilding 
              className="mr-2" 
              style={{ color: theme === 'dark' ? '#86EFAC' : '#16A34A' }}
            />
            Gestión de Cargos
          </h3>
          <button
            onClick={agregarCargo}
            className="px-3 py-1 rounded text-sm flex items-center transition-colors"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#16A34A',
              color: theme === 'dark' ? '#86EFAC' : '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : '#15803D';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : '#16A34A';
            }}
          >
            <FaPlus className="mr-1" />
            Agregar Cargo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {cargos.map((cargo, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-2 rounded transition-colors"
              style={{
                backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
                border: `1px solid ${borderColor}`
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = theme === 'dark' ? '#1F1F1F' : '#F9FAFB';
              }}
            >
              <span 
                className="text-sm"
                style={{ color: textPrimary }}
              >
                {cargo}
              </span>
              <button
                onClick={() => eliminarCargo(cargo)}
                className="p-1 transition-colors"
                style={{
                  color: theme === 'dark' ? '#FCA5A5' : '#DC2626'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = theme === 'dark' ? '#FEE2E2' : '#B91C1C';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = theme === 'dark' ? '#FCA5A5' : '#DC2626';
                }}
                title="Eliminar cargo"
              >
                <FaTrash className="text-xs" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Selección de Funcionario para Firma */}
      <div 
        className="p-6 rounded-lg"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`
        }}
      >
        <h3 
          className="text-lg font-semibold mb-4"
          style={{ color: textPrimary }}
        >
          Selección para Firma
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              Funcionario
            </label>
            <select
              value={funcionarioSeleccionado}
              onChange={(e) => handleFuncionarioChange(e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
            >
              <option value="">Seleccione un funcionario</option>
              {funcionarios.map((funcionario) => (
                <option key={funcionario._id} value={funcionario._id}>
                  {funcionario.nombre} - {funcionario.cargo}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              Cargo
            </label>
            <input
              type="text"
              value={cargoSeleccionado}
              readOnly
              className="w-full px-3 py-2 rounded-md"
              style={{
                backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
            />
          </div>
        </div>

        {/* Subir firma */}
        {funcionarioSeleccionado && (
          <div 
            className="mt-4 p-4 rounded-lg"
            style={{
              backgroundColor: sectionBlueBg,
              border: `1px solid ${sectionBlueBorder}`
            }}
          >
            <h4 
              className="font-medium mb-3"
              style={{ color: sectionBlueText }}
            >
              Firma del Funcionario
            </h4>
            
            {/* Botón para subir imagen */}
            <div className="mb-4">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileUpload}
                className="hidden"
                id="upload-firma"
              />
              <label
                htmlFor="upload-firma"
                className="px-4 py-3 rounded-lg flex items-center justify-center cursor-pointer transition-colors text-sm font-medium"
                  style={{
                  backgroundColor: theme === 'dark' ? 'rgba(139, 92, 246, 0.2)' : '#8B5CF6',
                  color: theme === 'dark' ? '#C4B5FD' : '#FFFFFF',
                  border: `2px dashed ${theme === 'dark' ? 'rgba(139, 92, 246, 0.5)' : '#A78BFA'}`
                  }}
                  onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(139, 92, 246, 0.3)' : '#7C3AED';
                  }}
                  onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(139, 92, 246, 0.2)' : '#8B5CF6';
                  }}
                >
                <FaUpload className="mr-2" />
                📤 Subir Imagen de Firma (PNG, JPG)
              </label>
              <p 
                className="text-xs mt-2 text-center"
                style={{ color: textSecondary }}
              >
                Recomendado: Imagen con fondo transparente o blanco
              </p>
            </div>
            
            {/* Mostrar firma */}
            {firmaImagen ? (
              <div 
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: sectionGreenBg,
                  border: `1px solid ${sectionGreenBorder}`
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span 
                    className="text-sm font-medium"
                    style={{ color: sectionGreenText }}
                  >
                    ✅ Firma guardada
                  </span>
                    <button
                    onClick={limpiarFirma}
                    className="text-sm transition-colors px-3 py-1 rounded"
                      style={{
                      backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#DC2626',
                      color: theme === 'dark' ? '#FCA5A5' : '#FFFFFF'
                      }}
                      onMouseEnter={(e) => {
                      e.target.style.backgroundColor = theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#B91C1C';
                      }}
                      onMouseLeave={(e) => {
                      e.target.style.backgroundColor = theme === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#DC2626';
                      }}
                    >
                    🗑️ Eliminar
                    </button>
                  </div>
                <div className="flex justify-center bg-white p-4 rounded">
                <img 
                    src={firmaImagen} 
                  alt="Firma del funcionario" 
                    className="max-w-xs max-h-32 object-contain"
                  />
                </div>
              </div>
            ) : (
              <div 
                className="text-center py-6 rounded-lg"
                  style={{
                  backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
                  border: `1px dashed ${borderColor}`
                  }}
              >
                <p style={{ color: textSecondary }}>
                  No hay firma. Sube una imagen para comenzar.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Información del funcionario seleccionado */}
        {funcionarioSeleccionado && (
          <div 
            className="mt-4 p-4 rounded-lg"
            style={{
              backgroundColor: sectionBlueBg,
              border: `1px solid ${sectionBlueBorder}`
            }}
          >
            <h4 
              className="font-medium mb-2"
              style={{ color: sectionBlueText }}
            >
              Información del Funcionario Seleccionado:
            </h4>
            <div 
              className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
              style={{ color: sectionBlueText }}
            >
              <div>
                <span className="font-medium">Teléfono:</span> {formData.telefonoFuncionario}
              </div>
              <div>
                <span className="font-medium">Email:</span> {formData.emailFuncionario}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para agregar/editar funcionario */}
      {mostrarModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <div 
            className="rounded-lg p-6 max-w-md w-full mx-4"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`
            }}
          >
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: textPrimary }}
            >
              {modoEdicion ? 'Editar Funcionario' : 'Agregar Funcionario'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label 
                  className="block text-sm font-medium mb-1"
                  style={{ color: textPrimary }}
                >
                  Nombre *
                </label>
                <input
                  type="text"
                  value={funcionarioEditando.nombre}
                  onChange={(e) => setFuncionarioEditando({
                    ...funcionarioEditando,
                    nombre: e.target.value
                  })}
                  className="w-full px-3 py-2 rounded-md focus:outline-none"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                />
              </div>
              
              <div>
                <label 
                  className="block text-sm font-medium mb-1"
                  style={{ color: textPrimary }}
                >
                  Cargo *
                </label>
                <select
                  value={funcionarioEditando.cargo}
                  onChange={(e) => setFuncionarioEditando({
                    ...funcionarioEditando,
                    cargo: e.target.value
                  })}
                  className="w-full px-3 py-2 rounded-md focus:outline-none"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  <option value="">Seleccione un cargo</option>
                  {cargos.map((cargo, index) => (
                    <option key={index} value={cargo}>
                      {cargo}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label 
                  className="block text-sm font-medium mb-1"
                  style={{ color: textPrimary }}
                >
                  Teléfono
                </label>
                <input
                  type="text"
                  value={funcionarioEditando.telefono}
                  onChange={(e) => setFuncionarioEditando({
                    ...funcionarioEditando,
                    telefono: e.target.value
                  })}
                  className="w-full px-3 py-2 rounded-md focus:outline-none"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                />
              </div>
              
              <div>
                <label 
                  className="block text-sm font-medium mb-1"
                  style={{ color: textPrimary }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={funcionarioEditando.email}
                  onChange={(e) => setFuncionarioEditando({
                    ...funcionarioEditando,
                    email: e.target.value
                  })}
                  className="w-full px-3 py-2 rounded-md focus:outline-none"
                  style={{
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setMostrarModal(false)}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(107, 114, 128, 0.2)' : '#6B7280',
                  color: theme === 'dark' ? '#D1D5DB' : '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? 'rgba(107, 114, 128, 0.3)' : '#4B5563';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? 'rgba(107, 114, 128, 0.2)' : '#6B7280';
                }}
              >
                Cancelar
              </button>
              <button
                onClick={guardarFuncionario}
                className="px-4 py-2 rounded-lg flex items-center transition-colors"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#2563EB',
                  color: theme === 'dark' ? '#93C5FD' : '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? 'rgba(37, 99, 235, 0.3)' : '#1D4ED8';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : '#2563EB';
                }}
              >
                <FaSave className="mr-2" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
