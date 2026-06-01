import React from 'react';

const Portada = ({ datos = {} }) => {
  const empresa = datos.empresa || datos?.informacion?.empresa || '';
  const titulo = datos.titulo || 'Informe de Inspección y Evaluación de Riesgos';
  const fecha = datos.fecha || new Date().toLocaleDateString();

  return (
    <section className="portada">
      <h1 className="portada-titulo">{titulo}</h1>
      {empresa && <h2 className="portada-empresa">{empresa}</h2>}
      <div className="portada-footer">
        <span className="portada-fecha">{fecha}</span>
      </div>
    </section>
  );
};

export default Portada;


