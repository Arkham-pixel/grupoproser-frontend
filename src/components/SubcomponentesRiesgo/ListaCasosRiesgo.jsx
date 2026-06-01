import React, { useState } from "react";
import { useCasosRiesgo } from "../../context/CasosRiesgoContext";
import { FaEdit } from "react-icons/fa";
import { useTheme } from '../../context/ThemeContext';

const getCiudadNombre = (codigo, ciudades) => {
  if (!ciudades || !Array.isArray(ciudades)) return codigo;
  const ciudad = ciudades.find(c => c.value === codigo || c.codiMunicipio === codigo);
  return ciudad ? ciudad.label : codigo;
};

const getEstadoNombre = (codigo, estados) => {
  if (!estados || !Array.isArray(estados)) return codigo;
  const estado = estados.find(e => String(e.codiEstdo) === String(codigo));
  return estado ? estado.descEstdo : codigo;
};

const ListaCasosRiesgo = ({ onEditarCaso, ciudades, estados }) => {
  const { theme } = useTheme();
  const { casos } = useCasosRiesgo();
  const [pagina, setPagina] = useState(1);
  const casosPorPagina = 10;
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  
  // Colores según el tema
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const textSecondary = theme === 'dark' ? '#B0B0B0' : '#6B6B6B';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#E6E6E6';
  const inputBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const tableHeaderBg = theme === 'dark' ? '#1F1F1F' : '#F9FAFB';
  const tableRowBg = theme === 'dark' ? '#1A1A1A' : '#FFFFFF';
  const tableRowEven = theme === 'dark' ? '#1F1F1F' : '#F9F9F9';
  const tableRowHover = theme === 'dark' ? '#2A2A2A' : '#F3F4F6';

  // Filtrado por fecha de inspección
  const filtrarPorFecha = (caso) => {
    if (!fechaDesde && !fechaHasta) return true;
    const fecha = caso.fchaInspccion ? new Date(caso.fchaInspccion) : null;
    if (!fecha) return false;
    if (fechaDesde && fecha < new Date(fechaDesde)) return false;
    if (fechaHasta && fecha > new Date(fechaHasta)) return false;
    return true;
  };
  const casosFiltrados = Array.isArray(casos) ? casos.filter(filtrarPorFecha) : [];

  const totalPaginas = Math.ceil(casosFiltrados.length / casosPorPagina) || 1;
  const casosPagina = casosFiltrados.slice((pagina - 1) * casosPorPagina, pagina * casosPorPagina);
  const desde = (pagina - 1) * casosPorPagina + 1;
  const hasta = Math.min(pagina * casosPorPagina, casosFiltrados.length);

  return (
    <div className="mt-4 sm:mt-6 lg:mt-8 flex flex-col items-center w-full">
      {/* Filtros de fecha responsive */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-3 sm:mb-4 w-full justify-center sm:justify-end pr-2 sm:pr-4 lg:pr-8">
        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
          <label 
            className="text-xs sm:text-sm font-semibold whitespace-nowrap"
            style={{ color: textPrimary }}
          >
            Fecha Inspección desde:
          </label>
          <input 
            type="date" 
            value={fechaDesde} 
            onChange={e => { setPagina(1); setFechaDesde(e.target.value); }} 
            className="rounded px-2 py-1 text-xs sm:text-sm w-full sm:w-auto"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
          />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
          <label 
            className="text-xs sm:text-sm font-semibold whitespace-nowrap"
            style={{ color: textPrimary }}
          >
            hasta:
          </label>
          <input 
            type="date" 
            value={fechaHasta} 
            onChange={e => { setPagina(1); setFechaHasta(e.target.value); }} 
            className="rounded px-2 py-1 text-xs sm:text-sm w-full sm:w-auto"
            style={{
              backgroundColor: inputBg,
              color: textPrimary,
              borderColor: borderColor,
              border: `1px solid ${borderColor}`
            }}
          />
        </div>
      </div>

      {/* Tabla responsive */}
      <div className="overflow-x-auto w-full">
        <table 
          className="w-full mb-3 sm:mb-4 text-center shadow-sm text-xs sm:text-sm"
          style={{ borderColor: borderColor }}
        >
          <thead className="sticky top-0 z-10" style={{ backgroundColor: tableHeaderBg }}>
            <tr>
              <th 
                className="border px-1 sm:px-2 py-1 font-bold"
                style={{
                  color: textPrimary,
                  borderColor: borderColor
                }}
              >
                N° Riesgo
              </th>
              <th
                className="border px-1 sm:px-2 py-1 font-bold"
                style={{
                  color: textPrimary,
                  borderColor: borderColor
                }}
              >
                Consecutivo
              </th>
              <th 
                className="border px-1 sm:px-2 py-1 font-bold"
                style={{
                  color: textPrimary,
                  borderColor: borderColor
                }}
              >
                Asegurado
              </th>
              <th 
                className="border px-1 sm:px-2 py-1 font-bold"
                style={{
                  color: textPrimary,
                  borderColor: borderColor
                }}
              >
                Ciudad
              </th>
              <th 
                className="border px-1 sm:px-2 py-1 font-bold"
                style={{
                  color: textPrimary,
                  borderColor: borderColor
                }}
              >
                Estado
              </th>
              <th 
                className="border px-1 sm:px-2 py-1 font-bold"
                style={{
                  color: textPrimary,
                  borderColor: borderColor
                }}
              >
                Fecha Inspección
              </th>
              <th 
                className="border px-1 sm:px-2 py-1 font-bold"
                style={{
                  color: textPrimary,
                  borderColor: borderColor
                }}
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {casosFiltrados.length === 0 ? (
              <tr>
                <td 
                  colSpan={7} 
                  className="border px-2 py-3 sm:py-4 text-xs sm:text-sm"
                  style={{
                    color: textSecondary,
                    borderColor: borderColor
                  }}
                >
                  No hay casos registrados
                </td>
              </tr>
            ) : (
              casosPagina.map((caso, idx) => (
                <tr 
                  key={idx}
                  style={{
                    backgroundColor: idx % 2 === 0 ? tableRowBg : tableRowEven,
                    borderColor: borderColor
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = tableRowHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = idx % 2 === 0 ? tableRowBg : tableRowEven;
                  }}
                >
                  <td 
                    className="border px-1 sm:px-2 py-1 font-mono text-xs sm:text-sm"
                    style={{
                      color: textPrimary,
                      borderColor: borderColor
                    }}
                  >
                    {caso.nmroRiesgo}
                  </td>
                  <td
                    className="border px-1 sm:px-2 py-1 font-mono text-xs sm:text-sm"
                    style={{
                      color: textPrimary,
                      borderColor: borderColor
                    }}
                    title={caso.nmroConsecutivo || ''}
                  >
                    {caso.nmroConsecutivo || ''}
                  </td>
                  <td 
                    className="border px-1 sm:px-2 py-1 truncate max-w-[120px] sm:max-w-[180px]"
                    style={{
                      color: textPrimary,
                      borderColor: borderColor
                    }}
                    title={caso.asgrBenfcro}
                  >
                    {caso.asgrBenfcro}
                  </td>
                  <td 
                    className="border px-1 sm:px-2 py-1 truncate max-w-[80px] sm:max-w-[120px]"
                    style={{
                      color: textPrimary,
                      borderColor: borderColor
                    }}
                    title={getCiudadNombre(caso.codigoPoblado || caso.ciudadSucursal, ciudades)}
                  >
                    {getCiudadNombre(caso.codigoPoblado || caso.ciudadSucursal, ciudades)}
                  </td>
                  <td 
                    className="border px-1 sm:px-2 py-1 text-xs sm:text-sm"
                    style={{
                      color: textPrimary,
                      borderColor: borderColor
                    }}
                    title={getEstadoNombre(caso.codiEstdo, estados)}
                  >
                    {getEstadoNombre(caso.codiEstdo, estados)}
                  </td>
                  <td 
                    className="border px-1 sm:px-2 py-1 text-xs sm:text-sm"
                    style={{
                      color: textPrimary,
                      borderColor: borderColor
                    }}
                  >
                    {caso.fchaInspccion ? new Date(caso.fchaInspccion).toLocaleDateString() : ''}
                  </td>
                  <td className="border px-1 sm:px-2 py-1" style={{ borderColor: borderColor }}>
                    <button
                      className="text-white px-2 py-1 rounded flex items-center mx-auto text-xs sm:text-sm transition-colors"
                      style={{ backgroundColor: '#F59E0B' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#D97706';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#F59E0B';
                      }}
                      onClick={() => onEditarCaso && onEditarCaso(caso, (pagina - 1) * casosPorPagina + idx)}
                      aria-label="Editar caso"
                      title="Editar caso"
                    >
                      <FaEdit className="mr-1" /> Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación responsive */}
      <div className="flex flex-wrap items-center gap-1 sm:gap-2 justify-center mt-2 sm:mt-3">
        <button 
          onClick={() => setPagina(1)} 
          disabled={pagina === 1} 
          className="px-1 sm:px-2 text-xs sm:text-sm transition-colors disabled:opacity-50"
          style={{
            backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB',
            color: textPrimary
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#3A3A3A' : '#D1D5DB';
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#E5E7EB';
            }
          }}
        >
          {'<<'}
        </button>
        <button 
          onClick={() => setPagina(pagina - 1)} 
          disabled={pagina === 1} 
          className="px-1 sm:px-2 text-xs sm:text-sm transition-colors disabled:opacity-50"
          style={{
            backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB',
            color: textPrimary
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#3A3A3A' : '#D1D5DB';
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#E5E7EB';
            }
          }}
        >
          {'<'}
        </button>
        {Array.from({ length: totalPaginas }, (_, i) => i + 1).slice(Math.max(0, pagina - 3), pagina + 2).map(i => (
          <button
            key={i}
            className="px-2 rounded text-xs sm:text-sm transition-colors"
            style={{
              backgroundColor: pagina === i 
                ? (theme === 'dark' ? '#DC2626' : '#FB923C')
                : (theme === 'dark' ? '#2A2A2A' : '#E5E7EB'),
              color: pagina === i ? '#FFFFFF' : textPrimary
            }}
            onMouseEnter={(e) => {
              if (pagina !== i) {
                e.currentTarget.style.backgroundColor = theme === 'dark' ? '#3A3A3A' : '#D1D5DB';
              }
            }}
            onMouseLeave={(e) => {
              if (pagina !== i) {
                e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#E5E7EB';
              }
            }}
            onClick={() => setPagina(i)}
          >
            {i}
          </button>
        ))}
        <button 
          onClick={() => setPagina(pagina + 1)} 
          disabled={pagina === totalPaginas} 
          className="px-1 sm:px-2 text-xs sm:text-sm transition-colors disabled:opacity-50"
          style={{
            backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB',
            color: textPrimary
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#3A3A3A' : '#D1D5DB';
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#E5E7EB';
            }
          }}
        >
          {'>'}
        </button>
        <button 
          onClick={() => setPagina(totalPaginas)} 
          disabled={pagina === totalPaginas} 
          className="px-1 sm:px-2 text-xs sm:text-sm transition-colors disabled:opacity-50"
          style={{
            backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB',
            color: textPrimary
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#3A3A3A' : '#D1D5DB';
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#2A2A2A' : '#E5E7EB';
            }
          }}
        >
          {'>>'}
        </button>
        <span 
          className="ml-2 text-xs sm:text-sm"
          style={{ color: textSecondary }}
        >
          Mostrando {casosFiltrados.length === 0 ? 0 : desde}-{hasta} de {casosFiltrados.length}
        </span>
      </div>
    </div>
  );
};

export default ListaCasosRiesgo;