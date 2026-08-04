import React from 'react';
import { useTranslation } from 'react-i18next';

const TablaContenido = ({ items = [] }) => {
  const { t } = useTranslation();

  return (
    <section className="tabla-contenido">
      <h2>{t('informeMadre.ui.tablaContenido.title')}</h2>
      {items.length === 0 ? (
        <p className="tabla-vacia">{t('informeMadre.ui.tablaContenido.empty')}</p>
      ) : (
        <ol className="tabla-lista">
          {items.map((item, index) => (
            <li key={`${item.titulo || 'item'}-${index}`} className="tabla-item">
              <span className="tabla-texto">
                {item.titulo || t('informeMadre.ui.tablaContenido.sectionFallback', { n: index + 1 })}
              </span>
              <span className="tabla-puntos" />
              <span className="tabla-pagina">{item.pagina}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default TablaContenido;
