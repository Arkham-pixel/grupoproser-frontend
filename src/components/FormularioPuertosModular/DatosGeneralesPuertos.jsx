import React from 'react';
import Select from 'react-select';
import { useTheme } from '../../context/ThemeContext';
import ciudadesData from '../../data/colombia.json';

export default function DatosGeneralesPuertos({ formData, onInputChange, onMultipleChange, cargando }) {
  const { theme } = useTheme();
  
  // Colores según el tema
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  const municipios = ciudadesData.flatMap(dep =>
    dep.ciudades.map(ciudad => ({
      label: `${ciudad} - ${dep.departamento}`,
      value: ciudad
    }))
  );

  const handleCiudadChange = (selectedOption) => {
    if (!selectedOption) {
      onMultipleChange({
        ciudad_siniestro: '',
        departamento_siniestro: ''
      });
      return;
    }
    onMultipleChange({
      ciudad_siniestro: selectedOption,
      departamento_siniestro: selectedOption.label.split(' - ')[1] || ''
    });
  };

  return (
    <div 
      className="mt-10 p-6 rounded shadow-sm"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`
      }}
    >
      <h2 
        className="text-xl font-bold mb-4"
        style={{ color: textPrimary }}
      >
        1. INFORMACIÓN GENERAL
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label 
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Nombre del Buque
          </label>
          <input
            type="text"
            placeholder="Ej: M/N ATLANTIC STAR"
            value={formData.nombreMotonave || ''}
            onChange={(e) => onInputChange('nombreMotonave', e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label 
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Nombre del Puerto / Empresa
          </label>
          <input
            type="text"
            placeholder="Ej: Puerto de Cartagena"
            value={formData.nombreEmpresa || ''}
            onChange={(e) => onInputChange('nombreEmpresa', e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label 
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Dirección
          </label>
          <input
            type="text"
            placeholder="Ej: Zona Portuaria Norte"
            value={formData.direccion || ''}
            onChange={(e) => onInputChange('direccion', e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div className="md:col-span-2">
          <label 
            className="block text-sm font-medium"
            style={{ color: textPrimary }}
          >
            Ciudad
          </label>
          <Select
            options={municipios}
            value={(() => {
              if (!formData.ciudad_siniestro) return null;
              if (typeof formData.ciudad_siniestro === 'object' && formData.ciudad_siniestro !== null) {
                return formData.ciudad_siniestro;
              }
              const ciudadStr = String(formData.ciudad_siniestro);
              let encontrada = municipios.find(opt => opt.value === ciudadStr);
              if (!encontrada) {
                encontrada = municipios.find(opt => 
                  opt.label === ciudadStr || 
                  opt.label.includes(ciudadStr) ||
                  opt.value === ciudadStr
                );
              }
              if (!encontrada) {
                encontrada = municipios.find(opt => 
                  opt.label.toLowerCase().includes(ciudadStr.toLowerCase()) ||
                  opt.value.toLowerCase() === ciudadStr.toLowerCase()
                );
              }
              return encontrada || null;
            })()}
            onChange={handleCiudadChange}
            placeholder="Selecciona una ciudad..."
            isSearchable
            className="w-full"
            styles={{
              control: (provided, state) => ({
                ...provided,
                fontSize: '14px',
                minHeight: '40px',
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: state.isFocused ? (theme === 'dark' ? '#DC2626' : '#2563EB') : borderColor,
                boxShadow: state.isFocused ? `0 0 0 1px ${theme === 'dark' ? '#DC2626' : '#2563EB'}` : 'none',
                '&:hover': {
                  borderColor: theme === 'dark' ? '#DC2626' : '#2563EB',
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
              }),
              menu: (provided) => ({
                ...provided,
                backgroundColor: inputBg,
                border: `1px solid ${borderColor}`
              })
            }}
          />
        </div>

        <div>
          <label 
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Persona Entrevistada
          </label>
          <input
            type="text"
            placeholder="Ej: Nelson Gómez"
            value={formData.personaEntrevistada || ''}
            onChange={(e) => onInputChange('personaEntrevistada', e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label 
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Cargo
          </label>
          <input
            type="text"
            placeholder="Ej: Jefe de Operaciones Portuarias"
            value={formData.cargo || ''}
            onChange={(e) => onInputChange('cargo', e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label 
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Horario Laboral
          </label>
          <input
            type="text"
            placeholder="24/7 o 6AM - 6PM"
            value={formData.horarioLaboral || ''}
            onChange={(e) => onInputChange('horarioLaboral', e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label 
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Número de Colaboradores
          </label>
          <input
            type="text"
            placeholder="Ej: 150"
            value={formData.colaboladores || ''}
            onChange={(e) => onInputChange('colaboladores', e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>

        <div>
          <label 
            className="block text-sm font-semibold mb-1"
            style={{ color: textPrimary }}
          >
            Aseguradora
          </label>
          <input
            type="text"
            placeholder="Nombre de la aseguradora"
            value={formData.aseguradora || ''}
            onChange={(e) => onInputChange('aseguradora', e.target.value)}
            className="w-full rounded px-3 py-2"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            disabled={cargando}
          />
        </div>
      </div>

      {/* Descripción General */}
      <div className="mt-6">
        <label 
          className="block text-sm font-semibold mb-2"
          style={{ color: textPrimary }}
        >
          Descripción General del Puerto
        </label>
        <textarea
          rows={6}
          placeholder="Agrega aquí la descripción general del puerto y sus operaciones..."
          value={formData.descripcionEmpresa || ''}
          onChange={(e) => onInputChange('descripcionEmpresa', e.target.value)}
          className="w-full rounded px-3 py-2"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            borderColor: borderColor,
            border: `1px solid ${borderColor}`
          }}
          disabled={cargando}
        />
      </div>
    </div>
  );
}

