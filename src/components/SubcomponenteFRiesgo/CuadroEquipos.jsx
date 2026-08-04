import React from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "../../utils/locale.js";

export default function CuadroEquipos({ datos, onChange }) {
  const { t } = useTranslation();

  const handleInputChange = (zonaIndex, equipoIndex, field, value) => {
    const newDatos = [...datos];
    newDatos[zonaIndex].equipos[equipoIndex][field] = value;
    onChange(newDatos);
  };

  return (
    <div>
      {datos.map((zona, zonaIndex) => (
        <div key={zonaIndex} style={{ marginBottom: "2rem" }}>
          <h3>
            {zona.zona} ({t("equipment.ui.subtotal", { value: formatCurrency(zona.subtotal) })})
          </h3>
          <table border="1" cellPadding="5" width="100%">
            <thead>
              <tr>
                <th>{t("equipment.ui.headers.qty")}</th>
                <th>{t("equipment.ui.headers.equipment")}</th>
                <th>{t("equipment.ui.headers.brand")}</th>
                <th>{t("equipment.ui.headers.price")}</th>
                <th>{t("equipment.ui.headers.capacity")}</th>
                <th>{t("equipment.ui.headers.appearance")}</th>
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
