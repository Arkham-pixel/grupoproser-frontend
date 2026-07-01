import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { FaPlus, FaTrash } from 'react-icons/fa';
import PuertosDragDropFotos from './PuertosDragDropFotos';

export default function DocumentosTransportePuertos({ formData, onInputChange, onMultipleChange, cargando }) {
  const { theme } = useTheme();
  
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  // Datos de la tabla ORIGEN
  const tablaOrigen = formData.tablaOrigen || [];
  const imagenesInspeccionBordo = formData.imagenesInspeccionBordo || [];
  const imagenesInspeccionDescargue = formData.imagenesInspeccionDescargue || [];
  const tablaAverias = formData.tablaAverias || [];

  // Generar puerto de origen automáticamente
  const generarPuertoOrigen = () => {
    const origen = formData.origenImportacion || '';
    const puerto = formData.puertoEmbarque || '';
    return origen && puerto ? `${origen} - ${puerto}` : '';
  };

  // Función para agregar una nueva fila a la tabla ORIGEN
  const handleAgregarFilaOrigen = () => {
    const nuevaFila = {
      id: Date.now(),
      billOfLading: '',
      puertoOrigen: generarPuertoOrigen(), // Auto-generar
      cantidad: '',
      tipoVehiculo: '',
      pesoKgs: ''
    };
    onInputChange('tablaOrigen', [...tablaOrigen, nuevaFila]);
  };

  // Función para eliminar una fila
  const handleEliminarFilaOrigen = (id) => {
    onInputChange('tablaOrigen', tablaOrigen.filter(fila => fila.id !== id));
  };

  // Función para actualizar una celda de la tabla
  const handleActualizarCeldaOrigen = (id, campo, valor) => {
    onInputChange('tablaOrigen', 
      tablaOrigen.map(fila => 
        fila.id === id ? { ...fila, [campo]: valor } : fila
      )
    );
  };

  // Calcular totales de la tabla
  const calcularTotales = () => {
    const totalCantidad = tablaOrigen.reduce((sum, fila) => sum + (parseInt(fila.cantidad) || 0), 0);
    const totalPeso = tablaOrigen.reduce((sum, fila) => sum + (parseFloat(fila.pesoKgs) || 0), 0);
    return { totalCantidad, totalPeso };
  };

  // Funciones para la tabla de AVERÍAS
  const handleAgregarFilaAveria = () => {
    const nuevaFila = {
      id: Date.now(),
      vin: '',
      averias: '',
      codigo: '',
      dano: ''
    };
    onInputChange('tablaAverias', [...tablaAverias, nuevaFila]);
  };

  const handleEliminarFilaAveria = (id) => {
    onInputChange('tablaAverias', tablaAverias.filter(fila => fila.id !== id));
  };

  const handleActualizarCeldaAveria = (id, campo, valor) => {
    onInputChange('tablaAverias', 
      tablaAverias.map(fila => 
        fila.id === id ? { ...fila, [campo]: valor } : fila
      )
    );
  };

  const totales = calcularTotales();

  return (
    <>
      <div 
        className="p-4 rounded mb-6"
        style={{
          backgroundColor: cardBg,
          border: `2px solid ${borderColor}`
        }}
      >
        <h3 
          className="text-xl font-bold mb-4"
          style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
        >
          📄 DOCUMENTOS DEL TRANSPORTE
        </h3>

        {/* Formulario de Documentos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div>
            <label 
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              BILL OF LADING
            </label>
            <input
              type="text"
              value={formData.billOfLading || ''}
              onChange={(e) => onInputChange('billOfLading', e.target.value)}
              className="w-full rounded px-3 py-2 text-sm"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder="Ej: AR2509378-9380-9382..."
              disabled={cargando}
            />
          </div>

          <div>
            <label 
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              CANTIDAD DE VEHÍCULOS
            </label>
            <input
              type="number"
              value={formData.cantidadVehiculos || ''}
              onChange={(e) => onInputChange('cantidadVehiculos', e.target.value)}
              className="w-full rounded px-3 py-2 text-sm"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder="Ej: 350"
              disabled={cargando}
            />
          </div>

          <div>
            <label 
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              TIPO DE MERCANCÍA
            </label>
            <input
              type="text"
              value={formData.tipoMercancia || ''}
              onChange={(e) => onInputChange('tipoMercancia', e.target.value)}
              className="w-full rounded px-3 py-2 text-sm"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder="Ej: VEHÍCULOS TOYOTA"
              disabled={cargando}
            />
          </div>

          <div>
            <label 
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              TIPO DE EMBARQUE
            </label>
            <input
              type="text"
              value={formData.tipoEmbarque || ''}
              onChange={(e) => onInputChange('tipoEmbarque', e.target.value)}
              className="w-full rounded px-3 py-2 text-sm"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder="Ej: FCL, LCL, RO-RO, etc."
              disabled={cargando}
            />
          </div>

          <div>
            <label 
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              ORIGEN DE LA IMPORTACIÓN
            </label>
            <input
              type="text"
              value={formData.origenImportacion || ''}
              onChange={(e) => {
                onInputChange('origenImportacion', e.target.value);
                // Actualizar puertos origen en la tabla
                const nuevoOrigen = generarPuertoOrigen();
                onInputChange('tablaOrigen', 
                  tablaOrigen.map(fila => ({ ...fila, puertoOrigen: nuevoOrigen }))
                );
              }}
              className="w-full rounded px-3 py-2 text-sm"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder="Ej: ARGENTINA"
              disabled={cargando}
            />
          </div>

          <div>
            <label 
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              PUERTO DE EMBARQUE
            </label>
            <input
              type="text"
              value={formData.puertoEmbarque || ''}
              onChange={(e) => {
                onInputChange('puertoEmbarque', e.target.value);
                // Actualizar puertos origen en la tabla
                const nuevoOrigen = generarPuertoOrigen();
                onInputChange('tablaOrigen', 
                  tablaOrigen.map(fila => ({ ...fila, puertoOrigen: nuevoOrigen }))
                );
              }}
              className="w-full rounded px-3 py-2 text-sm"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder="Ej: ZARATE"
              disabled={cargando}
            />
          </div>

          <div>
            <label 
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              PUERTO DE DESCARGUE
            </label>
            <input
              type="text"
              value={formData.puertoDescargue || formData.municipio || ''}
              onChange={(e) => onInputChange('puertoDescargue', e.target.value)}
              className="w-full rounded px-3 py-2 text-sm"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder="Auto-completado desde ciudad"
              disabled={cargando}
            />
            <p 
              className="text-xs mt-1"
              style={{ color: textSecondary }}
            >
              Se completa automáticamente con la ciudad del reporte
            </p>
          </div>

          <div>
            <label 
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              MOTONAVE
            </label>
            <input
              type="text"
              value={formData.motonaveTransporte || formData.nombreMotonave || ''}
              onChange={(e) => onInputChange('motonaveTransporte', e.target.value)}
              className="w-full rounded px-3 py-2 text-sm"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`
              }}
              placeholder="Auto-completado desde portada"
              disabled={cargando}
            />
            <p 
              className="text-xs mt-1"
              style={{ color: textSecondary }}
            >
              Se completa automáticamente desde la portada
            </p>
          </div>

          <div>
            <label 
              className="block text-xs sm:text-sm font-medium mb-1"
              style={{ color: textPrimary }}
            >
              FECHA DE LLEGADA
            </label>
            <input
              type="date"
              value={formData.fechaLlegada || ''}
              onChange={(e) => onInputChange('fechaLlegada', e.target.value)}
              className="w-full rounded px-3 py-2 text-sm"
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

        {/* Tabla ORIGEN estilo Excel */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-3">
            <h4 
              className="text-lg font-bold"
              style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
            >
              📊 ORIGEN
            </h4>
            <button
              onClick={handleAgregarFilaOrigen}
              className="px-3 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: theme === 'dark' ? '#16A34A' : '#22C55E',
                color: '#FFFFFF'
              }}
              disabled={cargando}
            >
              <FaPlus />
              Agregar Fila
            </button>
          </div>

          <div className="overflow-x-auto">
            <table 
              className="w-full text-sm"
              style={{
                border: `1px solid ${borderColor}`,
                borderCollapse: 'collapse'
              }}
            >
              <thead>
                <tr 
                  style={{
                    backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB'
                  }}
                >
                  <th 
                    className="px-3 py-2 text-left font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      minWidth: '150px'
                    }}
                  >
                    B/L No.
                  </th>
                  <th 
                    className="px-3 py-2 text-left font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      minWidth: '200px'
                    }}
                  >
                    PUERTO ORIGEN
                  </th>
                  <th 
                    className="px-3 py-2 text-left font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      minWidth: '120px'
                    }}
                  >
                    CANTIDAD
                  </th>
                  <th 
                    className="px-3 py-2 text-left font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      minWidth: '150px'
                    }}
                  >
                    TIPO VEHÍCULO
                  </th>
                  <th 
                    className="px-3 py-2 text-left font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      minWidth: '120px'
                    }}
                  >
                    PESO KGS
                  </th>
                  <th 
                    className="px-3 py-2 text-center font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      width: '60px'
                    }}
                  >
                    
                  </th>
                </tr>
              </thead>
              <tbody>
                {tablaOrigen.map((fila, index) => (
                  <tr 
                    key={fila.id}
                    style={{
                      backgroundColor: index % 2 === 0 
                        ? (theme === 'dark' ? '#1A1A1A' : '#FFFFFF')
                        : (theme === 'dark' ? '#0F0F0F' : '#F9FAFB')
                    }}
                  >
                    <td style={{ border: `1px solid ${borderColor}`, padding: '4px' }}>
                      <input
                        type="text"
                        value={fila.billOfLading}
                        onChange={(e) => handleActualizarCeldaOrigen(fila.id, 'billOfLading', e.target.value)}
                        className="w-full px-2 py-1 text-sm"
                        style={{
                          backgroundColor: 'transparent',
                          color: textPrimary,
                          border: 'none',
                          outline: 'none'
                        }}
                        placeholder="AR2509391"
                      />
                    </td>
                    <td 
                      style={{ 
                        border: `1px solid ${borderColor}`, 
                        padding: '8px',
                        color: textSecondary,
                        fontStyle: 'italic'
                      }}
                    >
                      {generarPuertoOrigen() || '(AUTO - País + Puerto)'}
                    </td>
                    <td style={{ border: `1px solid ${borderColor}`, padding: '4px' }}>
                      <input
                        type="number"
                        value={fila.cantidad}
                        onChange={(e) => handleActualizarCeldaOrigen(fila.id, 'cantidad', e.target.value)}
                        className="w-full px-2 py-1 text-sm"
                        style={{
                          backgroundColor: 'transparent',
                          color: textPrimary,
                          border: 'none',
                          outline: 'none'
                        }}
                        placeholder="7"
                      />
                    </td>
                    <td style={{ border: `1px solid ${borderColor}`, padding: '4px' }}>
                      <input
                        type="text"
                        value={fila.tipoVehiculo}
                        onChange={(e) => handleActualizarCeldaOrigen(fila.id, 'tipoVehiculo', e.target.value)}
                        className="w-full px-2 py-1 text-sm"
                        style={{
                          backgroundColor: 'transparent',
                          color: textPrimary,
                          border: 'none',
                          outline: 'none'
                        }}
                        placeholder="KATASHIKI"
                      />
                    </td>
                    <td style={{ border: `1px solid ${borderColor}`, padding: '4px' }}>
                      <input
                        type="number"
                        value={fila.pesoKgs}
                        onChange={(e) => handleActualizarCeldaOrigen(fila.id, 'pesoKgs', e.target.value)}
                        className="w-full px-2 py-1 text-sm"
                        style={{
                          backgroundColor: 'transparent',
                          color: textPrimary,
                          border: 'none',
                          outline: 'none'
                        }}
                        placeholder="13575"
                      />
                    </td>
                    <td 
                      style={{ 
                        border: `1px solid ${borderColor}`, 
                        padding: '4px',
                        textAlign: 'center'
                      }}
                    >
                      <button
                        onClick={() => handleEliminarFilaOrigen(fila.id)}
                        className="p-1 rounded hover:bg-red-500 hover:text-white transition-colors"
                        style={{ color: '#EF4444' }}
                      >
                        <FaTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                
                {/* Fila de totales */}
                {tablaOrigen.length > 0 && (
                  <tr 
                    style={{
                      backgroundColor: theme === 'dark' ? '#2563EB' : '#3B82F6',
                      fontWeight: 'bold'
                    }}
                  >
                    <td 
                      colSpan="2"
                      className="px-3 py-2 text-right"
                      style={{
                        border: `1px solid ${borderColor}`,
                        color: '#FFFFFF'
                      }}
                    >
                      TOTALES:
                    </td>
                    <td 
                      className="px-3 py-2"
                      style={{
                        border: `1px solid ${borderColor}`,
                        color: '#FFFFFF'
                      }}
                    >
                      {totales.totalCantidad}
                    </td>
                    <td 
                      style={{
                        border: `1px solid ${borderColor}`,
                        color: '#FFFFFF'
                      }}
                    >
                    </td>
                    <td 
                      className="px-3 py-2"
                      style={{
                        border: `1px solid ${borderColor}`,
                        color: '#FFFFFF'
                      }}
                    >
                      {totales.totalPeso.toFixed(2)}
                    </td>
                    <td style={{ border: `1px solid ${borderColor}` }}></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {tablaOrigen.length === 0 && (
            <div 
              className="p-6 text-center rounded mt-2"
              style={{
                backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
                border: `2px dashed ${borderColor}`,
                color: textSecondary
              }}
            >
              <p className="text-sm">Haz clic en "Agregar Fila" para comenzar a llenar la tabla</p>
            </div>
          )}
        </div>

        {/* Sección INSPECCIÓN A BORDO DEL BUQUE */}
        <div className="mt-8">
          <h4 
            className="text-lg font-bold mb-4"
            style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
          >
            🚢 INSPECCIÓN A BORDO DEL BUQUE
          </h4>

          <PuertosDragDropFotos
            imagenes={imagenesInspeccionBordo}
            onChange={(nuevas) => onInputChange('imagenesInspeccionBordo', nuevas)}
            cargando={cargando}
            placeholder="Arrastra fotos de aspecto modelo (leyenda: ASPECTO MODELO)"
            notaS3="Leyenda por defecto en Word: ASPECTO MODELO"
          />

          {/* Espacio para comentarios */}
          <div className="mt-4">
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              Comentarios sobre la Inspección a Bordo
            </label>
            <textarea
              value={formData.comentariosInspeccionBordo || ''}
              onChange={(e) => onInputChange('comentariosInspeccionBordo', e.target.value)}
              rows="4"
              className="w-full rounded px-3 py-2 text-sm"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`,
                resize: 'vertical'
              }}
              placeholder="Escribe aquí tus observaciones sobre la inspección a bordo del buque..."
              disabled={cargando}
            />
          </div>
        </div>

        {/* SEGUNDA SECCIÓN DE FOTOS - INSPECCIÓN EN DESCARGUE */}
        <div className="mt-8">
          <h4 
            className="text-lg font-bold mb-4"
            style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
          >
            🚗 INSPECCIÓN EN APROCHE - DESCARGUE
          </h4>

          <PuertosDragDropFotos
            imagenes={imagenesInspeccionDescargue}
            onChange={(nuevas) => onInputChange('imagenesInspeccionDescargue', nuevas)}
            cargando={cargando}
            placeholder="Arrastra fotos del almacenamiento en patio (leyenda: ASPECTO DEL ALMACENAMIENTO)"
            notaS3="Leyenda por defecto en Word: ASPECTO DEL ALMACENAMIENTO"
          />

          {/* Espacio para comentarios del descargue */}
          <div className="mt-4">
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              Comentarios sobre la Inspección en Descargue
            </label>
            <textarea
              value={formData.comentariosInspeccionDescargue || ''}
              onChange={(e) => onInputChange('comentariosInspeccionDescargue', e.target.value)}
              rows="4"
              className="w-full rounded px-3 py-2 text-sm"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`,
                resize: 'vertical'
              }}
              placeholder="Ej: Se realizó inspección en el descargue, el tiempo es muy mínimo para detectar posibles averías..."
              disabled={cargando}
            />
          </div>
        </div>

        {/* TERCERA SECCIÓN - INSPECCIÓN EN PATIO DE ALMACENAMIENTO - OCULTA */}
        {false && (
        <div className="mt-8">
          <h4 
            className="text-lg font-bold mb-4"
            style={{ color: theme === 'dark' ? '#FCA5A5' : '#DC2626' }}
          >
            📦 INSPECCIÓN EN PATIO DE ALMACENAMIENTO
          </h4>

          {/* Comentario introductorio */}
          <div className="mb-4">
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: textPrimary }}
            >
              Comentario de la Inspección
            </label>
            <textarea
              value={formData.comentarioPatioAlmacenamiento || ''}
              onChange={(e) => onInputChange('comentarioPatioAlmacenamiento', e.target.value)}
              rows="4"
              className="w-full rounded px-3 py-2 text-sm"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: `1px solid ${borderColor}`,
                resize: 'vertical'
              }}
              placeholder="Ej: Los días 30 y 31 de Octubre de 2025 fuimos citados a las 08:00 horas para realizar inventario a los vehículos descargados en la motonave Manon..."
              disabled={cargando}
            />
          </div>

          {/* Botón para agregar filas */}
          <div className="flex justify-between items-center mb-3">
            <h5 
              className="text-base font-bold"
              style={{ color: textPrimary }}
            >
              Registro de Averías
            </h5>
            <button
              onClick={handleAgregarFilaAveria}
              className="px-3 py-2 rounded flex items-center gap-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: theme === 'dark' ? '#16A34A' : '#22C55E',
                color: '#FFFFFF'
              }}
              disabled={cargando}
            >
              <FaPlus />
              Agregar Vehículo
            </button>
          </div>

          {/* Tabla estilo Excel */}
          <div className="overflow-x-auto">
            <table 
              className="w-full text-sm"
              style={{
                border: `1px solid ${borderColor}`,
                borderCollapse: 'collapse'
              }}
            >
              <thead>
                <tr 
                  style={{
                    backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB'
                  }}
                >
                  <th 
                    className="px-3 py-2 text-left font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      minWidth: '200px'
                    }}
                  >
                    VIN
                  </th>
                  <th 
                    className="px-3 py-2 text-left font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      minWidth: '250px'
                    }}
                  >
                    AVERÍAS
                  </th>
                  <th 
                    className="px-3 py-2 text-left font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      minWidth: '120px'
                    }}
                  >
                    CÓDIGO
                  </th>
                  <th 
                    className="px-3 py-2 text-left font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      minWidth: '120px'
                    }}
                  >
                    DAÑO
                  </th>
                  <th 
                    className="px-3 py-2 text-center font-bold"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary,
                      width: '60px'
                    }}
                  >
                    
                  </th>
                </tr>
              </thead>
              <tbody>
                {tablaAverias.map((fila, index) => (
                  <tr 
                    key={fila.id}
                    style={{
                      backgroundColor: index % 2 === 0 
                        ? (theme === 'dark' ? '#1A1A1A' : '#FFFFFF')
                        : (theme === 'dark' ? '#0F0F0F' : '#F9FAFB')
                    }}
                  >
                    <td style={{ border: `1px solid ${borderColor}`, padding: '4px' }}>
                      <input
                        type="text"
                        value={fila.vin}
                        onChange={(e) => handleActualizarCeldaAveria(fila.id, 'vin', e.target.value)}
                        className="w-full px-2 py-1 text-sm"
                        style={{
                          backgroundColor: 'transparent',
                          color: textPrimary,
                          border: 'none',
                          outline: 'none'
                        }}
                        placeholder="8AJCA3GS1T0985771"
                      />
                    </td>
                    <td style={{ border: `1px solid ${borderColor}`, padding: '4px' }}>
                      <input
                        type="text"
                        value={fila.averias}
                        onChange={(e) => handleActualizarCeldaAveria(fila.id, 'averias', e.target.value)}
                        className="w-full px-2 py-1 text-sm"
                        style={{
                          backgroundColor: 'transparent',
                          color: textPrimary,
                          border: 'none',
                          outline: 'none'
                        }}
                        placeholder="Parachoque D desconche"
                      />
                    </td>
                    <td style={{ border: `1px solid ${borderColor}`, padding: '4px' }}>
                      <input
                        type="text"
                        value={fila.codigo}
                        onChange={(e) => handleActualizarCeldaAveria(fila.id, 'codigo', e.target.value)}
                        className="w-full px-2 py-1 text-sm"
                        style={{
                          backgroundColor: 'transparent',
                          color: textPrimary,
                          border: 'none',
                          outline: 'none'
                        }}
                        placeholder="P02"
                      />
                    </td>
                    <td style={{ border: `1px solid ${borderColor}`, padding: '4px' }}>
                      <input
                        type="text"
                        value={fila.dano}
                        onChange={(e) => handleActualizarCeldaAveria(fila.id, 'dano', e.target.value)}
                        className="w-full px-2 py-1 text-sm"
                        style={{
                          backgroundColor: 'transparent',
                          color: textPrimary,
                          border: 'none',
                          outline: 'none'
                        }}
                        placeholder="D09"
                      />
                    </td>
                    <td 
                      style={{ 
                        border: `1px solid ${borderColor}`, 
                        padding: '4px',
                        textAlign: 'center'
                      }}
                    >
                      <button
                        onClick={() => handleEliminarFilaAveria(fila.id)}
                        className="p-1 rounded hover:bg-red-500 hover:text-white transition-colors"
                        style={{ color: '#EF4444' }}
                      >
                        <FaTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tablaAverias.length === 0 && (
            <div 
              className="p-6 text-center rounded mt-2"
              style={{
                backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
                border: `2px dashed ${borderColor}`,
                color: textSecondary
              }}
            >
              <p className="text-sm">Haz clic en "Agregar Vehículo" para registrar averías</p>
            </div>
          )}
        </div>
        )}
      </div>
    </>
  );
}

