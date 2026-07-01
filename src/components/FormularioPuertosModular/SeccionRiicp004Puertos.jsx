import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function SeccionRiicp004Puertos({ formData, onInputChange, cargando }) {
  const { theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';

  const inputClass = 'w-full rounded px-2 py-1.5 text-sm';
  const inputStyle = {
    backgroundColor: inputBg,
    color: textPrimary,
    borderColor,
    border: `1px solid ${borderColor}`,
  };

  const codigo = formData.codigoInforme?.trim();
  const tituloSeccion = codigo
    ? `📄 Informe ${codigo} — Inspección de Asegurado`
    : '📄 Inspección de Asegurado';

  return (
    <div
      className="p-4 rounded mb-6"
      style={{
        backgroundColor: cardBg,
        border: `2px solid ${theme === 'dark' ? '#2563EB' : '#1D4ED8'}`,
      }}
    >
      <div className="mb-4">
        <h3 className="text-lg font-bold" style={{ color: theme === 'dark' ? '#93C5FD' : '#1D4ED8' }}>
          {tituloSeccion}
        </h3>
        <p className="text-xs mt-1" style={{ color: textSecondary }}>
          Formato oficial de informe de inspección vehicular en patios (Seguros Bolívar / asegurado).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            Código del informe
          </label>
          <input
            type="text"
            value={formData.codigoInforme || ''}
            onChange={(e) => onInputChange('codigoInforme', e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Ej: RII-CP-004"
            disabled={cargando}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            Asegurado
          </label>
          <input
            type="text"
            value={formData.asegurado || ''}
            onChange={(e) => onInputChange('asegurado', e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Ej: METROKIA"
            disabled={cargando}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            Patio / Operación
          </label>
          <input
            type="text"
            value={formData.patioOperacion || ''}
            onChange={(e) => onInputChange('patioOperacion', e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Ej: ASPORTRANS OP"
            disabled={cargando}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            N° Póliza / Referencia
          </label>
          <input
            type="text"
            value={formData.numeroPoliza || ''}
            onChange={(e) => onInputChange('numeroPoliza', e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Ej: BV635262/2026"
            disabled={cargando}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            Fecha póliza
          </label>
          <input
            type="date"
            value={formData.fechaPoliza || ''}
            onChange={(e) => onInputChange('fechaPoliza', e.target.value)}
            className={inputClass}
            style={inputStyle}
            disabled={cargando}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            Versión
          </label>
          <input
            type="text"
            value={formData.versionInforme || '1'}
            onChange={(e) => onInputChange('versionInforme', e.target.value)}
            className={inputClass}
            style={inputStyle}
            disabled={cargando}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            Fechas de descargue (texto)
          </label>
          <input
            type="text"
            value={formData.fechasDescargue || ''}
            onChange={(e) => onInputChange('fechasDescargue', e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Ej: 3, 4, 5, 9 y 10 de junio 2026"
            disabled={cargando}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            Inspectores
          </label>
          <input
            type="text"
            value={formData.inspectores || ''}
            onChange={(e) => onInputChange('inspectores', e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Ej: Brayan Aguirre y Jimmy Grueso"
            disabled={cargando}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
          Bill of Lading (BLs)
        </label>
        <textarea
          value={formData.listaBLs || formData.billOfLading || ''}
          onChange={(e) => {
            onInputChange('listaBLs', e.target.value);
            onInputChange('billOfLading', e.target.value);
          }}
          rows={3}
          className="w-full rounded px-2 py-1.5 text-sm"
          style={inputStyle}
          disabled={cargando}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            Origen / procedencia (texto en el saludo)
          </label>
          <input
            type="text"
            value={formData.origenImportacion || ''}
            onChange={(e) => onInputChange('origenImportacion', e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Ej: Inchón – Corea"
            disabled={cargando}
          />
          <p className="text-xs mt-1" style={{ color: textSecondary }}>
            Aparece en el Word después de los BLs: «…amparados con los BLs. …, de Inchón – Corea, descargue…»
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
            Fechas de inspección (texto)
          </label>
          <input
            type="text"
            value={formData.fechasInspeccion || ''}
            onChange={(e) => onInputChange('fechasInspeccion', e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder="Ej: 30 de mayo de 2026"
            disabled={cargando}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
          Modelos de vehículos
        </label>
        <input
          type="text"
          value={formData.modelosVehiculos || ''}
          onChange={(e) => onInputChange('modelosVehiculos', e.target.value)}
          className={inputClass}
          style={inputStyle}
          disabled={cargando}
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium mb-1" style={{ color: textPrimary }}>
          Texto introductorio — sección 2 OBSERVACIONES
        </label>
        <textarea
          value={formData.textoObservacionesGeneral || ''}
          onChange={(e) => onInputChange('textoObservacionesGeneral', e.target.value)}
          rows={4}
          className="w-full rounded px-2 py-1.5 text-sm"
          style={inputStyle}
          placeholder="Ej: En el momento de la inspección los vehículos están separados por filas..."
          disabled={cargando}
        />
        <p className="text-xs mt-1" style={{ color: textSecondary }}>
          Debajo de este texto va la tabla VIN / observaciones del vehículo.
        </p>
      </div>
    </div>
  );
}
