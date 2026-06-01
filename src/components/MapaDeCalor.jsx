// src/components/MapaDeCalor.jsx
import React from "react";
import { useTheme } from '../context/ThemeContext';
import "../MapaCalor.css";

const MapaDeCalor = ({ tablaRiesgos }) => {
  const { theme } = useTheme();
  // Ejes
  const probabilidades = [5, 4, 3, 2, 1];
  const severidades = [1, 2, 3, 4, 5];

  // Helper para color según % vulnerabilidad
  const getColor = (percent) => {
    if (percent <= 16) return "verde";
    if (percent <= 32) return "amarillo";
    if (percent <= 48) return "naranja";
    return "rojo";
  };

  // Mapeamos los riesgos a su celda
  const getRiesgosPorCelda = (p, s) => {
    if (!tablaRiesgos || !Array.isArray(tablaRiesgos)) {
      return "";
    }
    
    return tablaRiesgos
      .map((r, i) => {
        const prob = parseInt(r.probabilidad) || 0;
        const sev = parseInt(r.severidad) || 0;
        const R = prob * sev;
        const percent = Math.round((R / 25) * 100);

        if (prob === p && sev === s) {
          // Usar el nombre del riesgo del objeto directamente
          const nombreRiesgo = r.riesgo || `Riesgo ${i + 1}`;
          return `${nombreRiesgo} (${percent}%)`;
        } else {
          return null;
        }
      })
      .filter(Boolean)
      .join("\n"); // Si hay más de un riesgo en la misma celda
  };

  // Colores según el tema
  const textPrimary = theme === 'dark' ? '#F5F5F5' : '#1E1E1E';
  const borderColor = theme === 'dark' ? '#2D2D2D' : '#444';

  return (
    <div className="mapa-de-calor p-2 sm:p-3 lg:p-4">
      <h2 
        className="titulo text-base sm:text-lg lg:text-xl mb-3 sm:mb-4"
        style={{ color: textPrimary }}
      >
        Mapa de Calor - Clasificación de Riesgos
      </h2>
      <div className="overflow-x-auto">
        <table 
          className="w-full text-xs sm:text-sm"
          style={{
            border: `1px solid ${borderColor}`
          }}
        >
          <thead>
            <tr>
              <th 
                className="p-1 sm:p-2 text-left"
                style={{
                  border: `1px solid ${borderColor}`,
                  color: textPrimary,
                  backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F3F4F6'
                }}
              ></th>
              {severidades.map((sev) => (
                <th 
                  key={sev} 
                  className="p-1 sm:p-2 text-center"
                  style={{
                    border: `1px solid ${borderColor}`,
                    color: textPrimary,
                    backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F3F4F6'
                  }}
                >
                  <span className="hidden sm:inline">
                    {[
                      "Insignificante (1)",
                      "Menor (2)",
                      "Moderado (3)",
                      "Mayor (4)",
                      "Catastrófico (5)",
                    ][sev - 1]}
                  </span>
                  <span className="sm:hidden">{sev}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {probabilidades.map((p) => (
              <tr key={p}>
                <th 
                  className="p-1 sm:p-2 text-left"
                  style={{
                    border: `1px solid ${borderColor}`,
                    color: textPrimary,
                    backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F3F4F6'
                  }}
                >
                  <span className="hidden sm:inline">
                    {[
                      "Frecuente (5)",
                      "Posible (4)",
                      "Probable (3)",
                      "Baja (2)",
                      "Improbable (1)",
                    ][5 - p]}
                  </span>
                  <span className="sm:hidden">{p}</span>
                </th>
                {severidades.map((s) => {
                  const riesgosTexto = getRiesgosPorCelda(p, s);
                  const R = p * s;
                  const percent = Math.round((R / 25) * 100);
                  const color = getColor(percent);

                  return (
                    <td 
                      key={`${p}-${s}`} 
                      className={`${color} p-1 sm:p-2`}
                      data-theme={theme}
                    >
                      <div className="celda">
                        <div 
                          className="valor-r text-xs sm:text-sm font-medium"
                          style={{ color: textPrimary }}
                        >
                          {R} ({percent}%)
                        </div>
                        <div 
                          className="riesgos text-xs hidden sm:block"
                          style={{ color: textPrimary }}
                        >
                          {riesgosTexto}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MapaDeCalor;
