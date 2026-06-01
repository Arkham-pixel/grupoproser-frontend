import React from 'react';

const TablaContenido = ({ items = [] }) => {
  return (
    <section className="tabla-contenido">
      <h2>Tabla de Contenido</h2>
      <ol className="tabla-lista">
        {items.map((item, index) => (
          <li key={`${item.titulo || 'item'}-${index}`} className="tabla-item">
            <span className="tabla-texto">{item.titulo}</span>
            <span className="tabla-puntos" />
            <span className="tabla-pagina">{item.pagina}</span>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default TablaContenido;


