import React from "react";

export default function CuadroEquipos({ datos, onChange }) {
  const handleInputChange = (zonaIndex, equipoIndex, field, value) => {
    const newDatos = [...datos];
    newDatos[zonaIndex].equipos[equipoIndex][field] = value;
    onChange(newDatos);
  };

  return (
    <div>
      {datos.map((zona, zonaIndex) => (
        <div key={zonaIndex} style={{ marginBottom: "2rem" }}>
          <h3>{zona.zona} (Subtotal: ${zona.subtotal.toLocaleString("es-CO")})</h3>
          <table border="1" cellPadding="5" width="100%">
            <thead>
              <tr>
                <th>CANT</th>
                <th>EQUIPO</th>
                <th>MARCA</th>
                <th>PRECIO</th>
                <th>CAPACIDAD</th>
                <th>APARIENCIA</th>
              </tr>
            </thead>
            <tbody>
              {zona.equipos.map((equipo, equipoIndex) => (
                <tr key={equipoIndex}>
                  <td>
                    <input
                      type="number"
                      value={equipo.cantidad}
                      onChange={(e) =>
                        handleInputChange(zonaIndex, equipoIndex, "cantidad", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={equipo.equipo}
                      onChange={(e) =>
                        handleInputChange(zonaIndex, equipoIndex, "equipo", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={equipo.marca}
                      onChange={(e) =>
                        handleInputChange(zonaIndex, equipoIndex, "marca", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={equipo.precio}
                      onChange={(e) =>
                        handleInputChange(zonaIndex, equipoIndex, "precio", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={equipo.capacidad}
                      onChange={(e) =>
                        handleInputChange(zonaIndex, equipoIndex, "capacidad", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={equipo.apariencia}
                      onChange={(e) =>
                        handleInputChange(zonaIndex, equipoIndex, "apariencia", e.target.value)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
