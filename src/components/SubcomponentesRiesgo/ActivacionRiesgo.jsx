import React from "react";
import Select from "react-select";
import { useTheme } from '../../context/ThemeContext';
// import ciudadesData from "../../data/colombia.json";

// Construir opciones para react-select
// Elimina ciudadesColombia y usa la prop ciudades

const ActivacionRiesgo = ({ formData, setFormData, estados = [], aseguradoras = [], responsables = [], clasificaciones = [], ciudades = [], funcionarios = [], cargandoFuncionarios = false }) => {
  const { theme } = useTheme();
  
  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const disabledBg = theme === 'dark' ? '#2A2A2A' : '#F3F4F6';
  const disabledText = theme === 'dark' ? '#6B6B6B' : '#6B7280';
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClasificacionChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      clasificacion: selectedOption
    }));
  };

  const handleSolicitaChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      quienSolicita: selectedOption
    }));
  };

  const handleCiudadChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      ciudad: selectedOption
    }));
  };

  
  const selectedResp = responsables.find(r => String(r.codiRespnsble) === String(formData.responsable));

  return (
    <div 
      className="p-3 sm:p-4 lg:p-6 xl:p-8 rounded shadow max-w-5xl mx-auto"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`
      }}
    >
      <h2 
        className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-6"
        style={{ color: textPrimary }}
      >
        Iniciar Inspección
      </h2>
      <form>
        {/* Grid responsive: 1 columna en móvil, 2 en tablet/desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Columna 1 */}
          <div>
            <div className="mb-3 sm:mb-4">
              <label 
                className="block text-xs sm:text-sm font-medium mb-1"
                style={{ color: textPrimary }}
              >
                Cliente
              </label>
              <select
                name="aseguradora"
                value={formData.aseguradora || ''}
                onChange={e => setFormData(prev => ({ 
                  ...prev, 
                  aseguradora: e.target.value,
                  quienSolicita: null // Limpiar quien solicita al cambiar aseguradora
                }))}
                className="w-full rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
              >
                <option value="">Selecciona una aseguradora</option>
                {Array.isArray(aseguradoras) && aseguradoras
                  .sort((a, b) => {
                    const nameA = (a.rzonSocial || '').toString().toUpperCase();
                    const nameB = (b.rzonSocial || '').toString().toUpperCase();
                    return nameA.localeCompare(nameB);
                  })
                  .map((aseg, idx) => (
                    <option key={aseg.codiAsgrdra} value={aseg.codiAsgrdra}>{aseg.rzonSocial}</option>
                  ))}
              </select>
            </div>
            <div className="mb-3 sm:mb-4">
              <label 
                className="block text-xs sm:text-sm font-medium mb-1"
                style={{ color: textPrimary }}
              >
                Clasificación *
              </label>
              <select
                name="codiClasificacion"
                value={formData.codiClasificacion || ''}
                onChange={e => setFormData(prev => ({ ...prev, codiClasificacion: e.target.value }))}
                className="w-full rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                required
              >
                <option value="">Selecciona clasificación</option>
                {Array.isArray(clasificaciones) && clasificaciones
                  .filter(cl => cl.codiIdentificador !== undefined && cl.codiIdentificador !== null)
                  .map((cl) => (
                    <option key={String(cl.codiIdentificador)} value={String(cl.codiIdentificador)}>
                      {cl.rzonDescripcion}
                    </option>
                  ))}
              </select>
            </div>
            <div className="mb-3 sm:mb-4">
              <label 
                className="block text-xs sm:text-sm font-medium mb-1"
                style={{ color: textPrimary }}
              >
                Ciudad de Inspección *
              </label>
              <Select
                options={ciudades}
                value={formData.ciudad}
                onChange={handleCiudadChange}
                placeholder="Selecciona o busca ciudad y departamento"
                isClearable
                className="text-xs sm:text-sm"
                styles={{
                  control: (provided, state) => ({
                    ...provided,
                    fontSize: '0.875rem',
                    backgroundColor: inputBg,
                    color: textPrimary,
                    borderColor: state.isFocused ? (theme === 'dark' ? '#DC2626' : '#2563EB') : borderColor,
                    boxShadow: state.isFocused ? `0 0 0 1px ${theme === 'dark' ? '#DC2626' : '#2563EB'}` : 'none',
                    '&:hover': {
                      borderColor: theme === 'dark' ? '#DC2626' : '#2563EB',
                    },
                    '@media (min-width: 640px)': {
                      fontSize: '1rem'
                    }
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isSelected 
                      ? (theme === 'dark' ? '#DC2626' : '#2563EB')
                      : state.isFocused
                      ? (theme === 'dark' ? '#2A2A2A' : '#F3F4F6')
                      : inputBg,
                    color: state.isSelected 
                      ? '#FFFFFF'
                      : textPrimary
                  }),
                  singleValue: (provided) => ({
                    ...provided,
                    color: textPrimary
                  }),
                  placeholder: (provided) => ({
                    ...provided,
                    color: textSecondary
                  })
                }}
              />
            </div>
            <div className="mb-3 sm:mb-4">
              <label 
                className="block text-xs sm:text-sm font-medium mb-1"
                style={{ color: textPrimary }}
              >
                Asegurado *
              </label>
              <input
                type="text"
                name="asegurado"
                value={formData.asegurado}
                onChange={handleChange}
                className="w-full rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                required
              />
            </div>
            <div className="mb-3 sm:mb-4">
              <label 
                className="block text-xs sm:text-sm font-medium mb-1"
                style={{ color: textPrimary }}
              >
                Fecha de Inspección
              </label>
              <input
                type="date"
                name="fechaInspeccion"
                value={formData.fechaInspeccion}
                onChange={handleChange}
                className="w-full rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
              />
            </div>
          </div>
          {/* Columna 2 */}
          <div>
            <div className="mb-3 sm:mb-4">
              <label 
                className="block text-xs sm:text-sm font-medium mb-1"
                style={{ color: textPrimary }}
              >
                Inspector *
              </label>
              <select
                name="responsable"
                value={formData.responsable || ''}
                onChange={e => setFormData(prev => ({ ...prev, responsable: e.target.value }))}
                className="px-2 sm:px-3 py-2 w-full rounded text-xs sm:text-sm"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                required
              >
                <option value="">Seleccionar...</option>
                {Array.isArray(responsables) && responsables.map((resp) => (
                  <option key={resp.codiRespnsble} value={resp.codiRespnsble}>{resp.nmbrRespnsble}</option>
                ))}
              </select>
              {/* Si el código no está en la lista, mostrar el nombre en un input de solo lectura */}
              {!selectedResp && formData.responsable && (
                <input
                  type="text"
                  value={formData.responsable}
                  readOnly
                  className="w-full rounded px-2 sm:px-3 py-2 mt-2 text-xs sm:text-sm"
                  style={{
                    backgroundColor: disabledBg,
                    color: '#EF4444',
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                  title="Inspector no encontrado en la lista actual"
                />
              )}
            </div>
            <div className="mb-3 sm:mb-4">
              <label 
                className="block text-xs sm:text-sm font-medium mb-1"
                style={{ color: textPrimary }}
              >
                Quien Solicita *
              </label>
              {!formData.aseguradora ? (
                <div 
                  className="w-full rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
                  style={{
                    backgroundColor: disabledBg,
                    color: disabledText,
                    borderColor: borderColor,
                    border: `1px solid ${borderColor}`
                  }}
                >
                  Primero selecciona una aseguradora
                </div>
              ) : (
                <Select
                  options={funcionarios}
                  value={formData.quienSolicita}
                  onChange={handleSolicitaChange}
                  placeholder={cargandoFuncionarios ? "Cargando funcionarios..." : "Selecciona o busca quien solicita"}
                  isClearable
                  isLoading={cargandoFuncionarios}
                  isDisabled={cargandoFuncionarios}
                  className="text-xs sm:text-sm"
                  styles={{
                    control: (provided, state) => ({
                      ...provided,
                      fontSize: '0.875rem',
                      backgroundColor: cargandoFuncionarios ? disabledBg : inputBg,
                      color: textPrimary,
                      borderColor: state.isFocused ? (theme === 'dark' ? '#DC2626' : '#2563EB') : borderColor,
                      boxShadow: state.isFocused ? `0 0 0 1px ${theme === 'dark' ? '#DC2626' : '#2563EB'}` : 'none',
                      '&:hover': {
                        borderColor: theme === 'dark' ? '#DC2626' : '#2563EB',
                      },
                      '@media (min-width: 640px)': {
                        fontSize: '1rem'
                      }
                    }),
                    option: (provided, state) => ({
                      ...provided,
                      backgroundColor: state.isSelected 
                        ? (theme === 'dark' ? '#DC2626' : '#2563EB')
                        : state.isFocused
                        ? (theme === 'dark' ? '#2A2A2A' : '#F3F4F6')
                        : inputBg,
                      color: state.isSelected 
                        ? '#FFFFFF'
                        : textPrimary
                    }),
                    singleValue: (provided) => ({
                      ...provided,
                      color: textPrimary
                    }),
                    placeholder: (provided) => ({
                      ...provided,
                      color: textSecondary
                    })
                  }}
                />
              )}
            </div>
            <div className="mb-3 sm:mb-4">
              <label 
                className="block text-xs sm:text-sm font-medium mb-1"
                style={{ color: textPrimary }}
              >
                Dirección *
              </label>
              <input
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                className="w-full rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                placeholder="Dirección de inspección"
                required
              />
            </div>
            <div className="mb-3 sm:mb-4">
              <label 
                className="block text-sm font-medium mb-1"
                style={{ color: textPrimary }}
              >
                Fecha de Asignación *
              </label>
              <input
                type="date"
                name="fechaAsignacion"
                value={formData.fechaAsignacion}
                onChange={handleChange}
                className="w-full rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                required
              />
            </div>
            <div className="mb-3 sm:mb-4">
              <label 
                className="block text-xs sm:text-sm font-medium mb-1"
                style={{ color: textPrimary }}
              >
                Observaciones Inspección
              </label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                className="w-full rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
                style={{
                  backgroundColor: inputBg,
                  color: textPrimary,
                  borderColor: borderColor,
                  border: `1px solid ${borderColor}`
                }}
                placeholder="Observaciones de la inspección"
                rows="3"
              />
            </div>
          </div>
        </div>
        <div className="mt-3 sm:mt-4">
          <label 
            className="block text-xs sm:text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            Estado *
          </label>
          <select
            name="codiEstdo"
            value={formData.codiEstdo ? String(formData.codiEstdo) : ''}
            onChange={e => setFormData(prev => ({ ...prev, codiEstdo: e.target.value }))}
            className="w-full rounded px-2 sm:px-3 py-2 text-xs sm:text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            required
          >
            <option value="">Selecciona estado</option>
            {Array.isArray(estados) && estados.map(est => (
              <option key={est.codiEstdo} value={String(est.codiEstdo)}>
                {est.descEstdo}
              </option>
            ))}
          </select>
        </div>
      </form>
    </div>
  );
};

export default ActivacionRiesgo;
