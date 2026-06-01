import React, { useMemo } from 'react';
import Portada from './Portada';
import TablaContenido from './TablaContenido';
import './informeMadre.css';

/**
 * Componente Madre para el nuevo informe (portada + tabla de contenido + secciones).
 * De momento solo renderiza la portada y la tabla de contenido según el orden indicado.
 */
const InformeMadre = ({ datos = {}, tocItems = [] }) => {
  const items = useMemo(() => tocItems || [], [tocItems]);

  return (
    <div className="informe-madre">
      <Portada datos={datos} />
      <TablaContenido items={items} />
    </div>
  );
};

export default InformeMadre;


