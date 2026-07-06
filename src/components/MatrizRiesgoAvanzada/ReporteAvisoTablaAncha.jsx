import React from 'react';
import { FaArrowsAltH } from 'react-icons/fa';

export default function ReporteAvisoTablaAncha({ titulo = 'Tabla amplia' }) {
  return (
    <div className="reporte-aviso-tabla no-print" role="note">
      <FaArrowsAltH className="shrink-0 text-fenix-primario" aria-hidden />
      <div>
        <p className="font-heading text-sm font-semibold text-gray-800">{titulo}</p>
        <p className="mt-0.5 font-body text-xs text-gray-600">
          Arrastre con el mouse o use la barra inferior para ver todas las columnas. El PDF puede
          recortar tablas anchas; use esta vista interactiva para revisar el contenido completo.
        </p>
      </div>
    </div>
  );
}
