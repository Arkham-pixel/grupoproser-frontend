import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { FaPlus, FaTrash, FaCheck, FaUpload } from 'react-icons/fa';

export default function FirmaPuertos({ formData, onInputChange, onMultipleChange, cargando }) {
  const { theme } = useTheme();
  
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  const fileInputRef = useRef(null);
  const [bancoFirmas, setBancoFirmas] = useState([]);

  // Cargar banco de firmas del localStorage
  useEffect(() => {
    const bancoGuardado = localStorage.getItem('bancoFirmasPuertos');
    if (bancoGuardado) {
      try {
        const firmas = JSON.parse(bancoGuardado);
        setBancoFirmas(firmas);
        console.log('✅ Banco de firmas cargado:', firmas.length, 'firmas encontradas');
      } catch (error) {
        console.error('❌ Error al cargar banco de firmas:', error);
      }
    } else {
      console.log('ℹ️ No hay firmas guardadas en el banco');
    }
  }, []);

  // Guardar en localStorage
  const guardarEnBanco = (nuevoBanco) => {
    setBancoFirmas(nuevoBanco);
    localStorage.setItem('bancoFirmasPuertos', JSON.stringify(nuevoBanco));
  };

  // Manejar carga de imagen de firma
  const handleCargarFirma = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onMultipleChange({
          imagenFirma: reader.result,
          archivoFirma: file
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Guardar firma actual en el banco
  const handleGuardarEnBanco = () => {
    const { nombreFirmante, cargoFirmante, emailFirmante, celularFirmante, imagenFirma } = formData;
    
    if (!nombreFirmante || !imagenFirma) {
      alert('Por favor completa al menos el nombre y sube la firma antes de guardar');
      return;
    }

    // Verificar si ya existe una firma con el mismo nombre
    const firmaExistente = bancoFirmas.find(f => f.nombre === nombreFirmante);
    if (firmaExistente) {
      if (confirm(`Ya existe una firma guardada para "${nombreFirmante}". ¿Deseas reemplazarla?`)) {
        // Reemplazar la firma existente
        const bancoActualizado = bancoFirmas.map(f => 
          f.id === firmaExistente.id 
            ? {
                ...f,
                nombre: nombreFirmante,
                cargo: cargoFirmante || '',
                email: emailFirmante || '',
                celular: celularFirmante || '',
                firma: imagenFirma
              }
            : f
        );
        guardarEnBanco(bancoActualizado);
        alert('✅ Firma actualizada en el banco exitosamente');
        return;
      } else {
        return;
      }
    }

    const nuevaFirma = {
      id: Date.now(),
      nombre: nombreFirmante,
      cargo: cargoFirmante || '',
      email: emailFirmante || '',
      celular: celularFirmante || '',
      firma: imagenFirma
    };

    guardarEnBanco([...bancoFirmas, nuevaFirma]);
    console.log('✅ Firma guardada:', nuevaFirma);
    alert(`✅ Firma de "${nombreFirmante}" guardada en el banco exitosamente. Ahora puedes seleccionarla desde "Firmas Guardadas" arriba.`);
  };

  // Cargar firma del banco al formulario
  const handleCargarDesdeBanco = (firma) => {
    onMultipleChange({
      nombreFirmante: firma.nombre,
      cargoFirmante: firma.cargo,
      emailFirmante: firma.email,
      celularFirmante: firma.celular,
      imagenFirma: firma.firma
    });
  };

  // Eliminar firma del banco
  const handleEliminarDelBanco = (id) => {
    if (confirm('¿Estás seguro de eliminar esta firma del banco?')) {
      guardarEnBanco(bancoFirmas.filter(f => f.id !== id));
    }
  };

  return (
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
        ✍️ FIRMA Y DATOS DEL INSPECTOR
      </h3>

      {/* Banco de Firmas */}
      <div 
        className="mb-6 p-4 rounded"
        style={{
          backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
          border: `2px solid ${theme === 'dark' ? '#2563EB' : '#3B82F6'}`,
          borderStyle: 'dashed'
        }}
      >
        <h4 
          className="text-sm font-bold mb-3 flex items-center gap-2"
          style={{ color: textPrimary }}
        >
          💾 Firmas Guardadas {bancoFirmas.length > 0 && `(${bancoFirmas.length})`}
        </h4>
        
        {bancoFirmas.length > 0 ? (
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bancoFirmas.map(firma => (
              <div 
                key={firma.id}
                className="p-3 rounded"
                style={{
                  backgroundColor: cardBg,
                  border: `1px solid ${borderColor}`
                }}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={firma.firma}
                    alt="Firma"
                    className="w-20 h-12 object-contain"
                    style={{
                      border: `1px solid ${borderColor}`,
                      backgroundColor: '#FFFFFF',
                      padding: '4px'
                    }}
                  />
                  
                  <div className="flex-1">
                    <p 
                      className="text-sm font-bold"
                      style={{ color: textPrimary }}
                    >
                      {firma.nombre}
                    </p>
                    {firma.cargo && (
                      <p 
                        className="text-xs"
                        style={{ color: textSecondary }}
                      >
                        {firma.cargo}
                      </p>
                    )}
                    {firma.email && (
                      <p 
                        className="text-xs mt-1"
                        style={{ color: textSecondary }}
                      >
                        📧 {firma.email}
                      </p>
                    )}
                    {firma.celular && (
                      <p 
                        className="text-xs"
                        style={{ color: textSecondary }}
                      >
                        📱 {firma.celular}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleCargarDesdeBanco(firma)}
                      className="p-2 rounded hover:bg-blue-500 hover:text-white transition-colors"
                      style={{ color: '#3B82F6' }}
                      title="Usar esta firma"
                    >
                      <FaCheck size={14} />
                    </button>
                    
                    <button
                      onClick={() => handleEliminarDelBanco(firma.id)}
                      className="p-2 rounded hover:bg-red-500 hover:text-white transition-colors"
                      style={{ color: '#EF4444' }}
                      title="Eliminar"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div 
            className="p-4 rounded text-center"
            style={{
              backgroundColor: cardBg,
              border: `1px dashed ${borderColor}`
            }}
          >
            <p 
              className="text-sm"
              style={{ color: textSecondary }}
            >
              No hay firmas guardadas. Completa el formulario y haz clic en "Guardar en Banco de Firmas" para guardar tu firma.
            </p>
          </div>
        )}
      </div>

      {/* Formulario de Firma */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div>
          <label 
            className="block text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            Nombre Completo *
          </label>
          <input
            type="text"
            value={formData.nombreFirmante || ''}
            onChange={(e) => onInputChange('nombreFirmante', e.target.value)}
            className="w-full rounded px-3 py-2 text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="Ej: Yaneth Vitola Suárez"
            disabled={cargando}
          />
        </div>

        <div>
          <label 
            className="block text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            Cargo
          </label>
          <input
            type="text"
            value={formData.cargoFirmante || ''}
            onChange={(e) => onInputChange('cargoFirmante', e.target.value)}
            className="w-full rounded px-3 py-2 text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="Ej: Directora Control Portuario"
            disabled={cargando}
          />
        </div>

        <div>
          <label 
            className="block text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            E-Mail
          </label>
          <input
            type="email"
            value={formData.emailFirmante || ''}
            onChange={(e) => onInputChange('emailFirmante', e.target.value)}
            className="w-full rounded px-3 py-2 text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="ejemplo@proserpuertos.com.co"
            disabled={cargando}
          />
        </div>

        <div>
          <label 
            className="block text-sm font-medium mb-1"
            style={{ color: textPrimary }}
          >
            Celular
          </label>
          <input
            type="text"
            value={formData.celularFirmante || ''}
            onChange={(e) => onInputChange('celularFirmante', e.target.value)}
            className="w-full rounded px-3 py-2 text-sm"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
            placeholder="316-5231821"
            disabled={cargando}
          />
        </div>
      </div>

      {/* Cargar Firma */}
      <div className="mb-4">
        <label 
          className="block text-sm font-medium mb-2"
          style={{ color: textPrimary }}
        >
          Imagen de la Firma *
        </label>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleCargarFirma}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded flex items-center gap-2 font-medium transition-colors"
          style={{
            backgroundColor: theme === 'dark' ? '#2563EB' : '#3B82F6',
            color: '#FFFFFF'
          }}
          disabled={cargando}
        >
          <FaUpload />
          Subir Firma
        </button>
        
        {formData.imagenFirma && (
          <div 
            className="mt-3 p-3 rounded"
            style={{
              backgroundColor: '#FFFFFF',
              border: `1px solid ${borderColor}`
            }}
          >
            <p 
              className="text-xs mb-2"
              style={{ color: textSecondary }}
            >
              Vista previa:
            </p>
            <img
              src={formData.imagenFirma}
              alt="Firma"
              className="max-w-full h-24 object-contain"
            />
          </div>
        )}
      </div>

      {/* Botón para guardar en banco */}
      <div className="flex gap-2">
        <button
          onClick={handleGuardarEnBanco}
          className="px-4 py-2 rounded flex items-center gap-2 font-medium transition-colors"
          style={{
            backgroundColor: theme === 'dark' ? '#16A34A' : '#22C55E',
            color: '#FFFFFF'
          }}
          disabled={cargando || !formData.nombreFirmante || !formData.imagenFirma}
        >
          <FaPlus />
          Guardar en Banco de Firmas
        </button>
      </div>

      {/* Vista Previa del Bloque de Firma */}
      {(formData.nombreFirmante || formData.imagenFirma) && (
        <div 
          className="mt-6 p-4 rounded"
          style={{
            backgroundColor: theme === 'dark' ? '#0F0F0F' : '#F9FAFB',
            border: `2px solid ${borderColor}`
          }}
        >
          <h4 
            className="text-sm font-bold mb-3"
            style={{ color: textPrimary }}
          >
            👁️ Vista Previa en el Documento
          </h4>
          
          <div 
            className="p-4 rounded"
            style={{
              backgroundColor: '#FFFFFF',
              border: `1px solid ${borderColor}`
            }}
          >
            <p className="text-sm mb-2" style={{ color: '#1E1E1E' }}>
              Agradeciendo de antemano su valiosa atención me suscribo de usted,
            </p>
            <p className="text-sm mb-3" style={{ color: '#1E1E1E' }}>
              Cordialmente,
            </p>
            
            {formData.imagenFirma && (
              <div className="mb-3">
                <img
                  src={formData.imagenFirma}
                  alt="Firma"
                  className="h-16 object-contain"
                />
              </div>
            )}
            
            {formData.nombreFirmante && (
              <p className="text-sm font-bold" style={{ color: '#1E1E1E' }}>
                {formData.nombreFirmante}
              </p>
            )}
            
            {formData.cargoFirmante && (
              <p className="text-xs" style={{ color: '#6B6B6B' }}>
                {formData.cargoFirmante}
              </p>
            )}
            
            <div className="mt-3">
              {formData.emailFirmante && (
                <p className="text-xs" style={{ color: '#DC2626' }}>
                  <span style={{ fontWeight: 'bold' }}>E-Mail: </span>
                  <span style={{ color: '#2563EB' }}>{formData.emailFirmante}</span>
                </p>
              )}
              
              {formData.celularFirmante && (
                <p className="text-xs" style={{ color: '#DC2626' }}>
                  <span style={{ fontWeight: 'bold' }}>Celular: </span>
                  <span style={{ color: '#2563EB' }}>{formData.celularFirmante}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

