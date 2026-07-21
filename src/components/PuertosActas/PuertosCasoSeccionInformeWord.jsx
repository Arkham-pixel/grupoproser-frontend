import React from 'react';
import PuertosCasoGridFotografico from './PuertosCasoGridFotografico';
import PuertosCasoListaPuntos from './PuertosCasoListaPuntos';
import { Campo, inputCls, attrsTextarea } from './PuertosCasoDatosGenerales';
import { puertosBlockHeader, puertosCard, puertosCardBody } from './puertosFenixUi';

export default function PuertosCasoSeccionInformeWord({
  tituloSeccion,
  labelTexto,
  valorTexto,
  onTextoChange,
  placeholderTexto,
  minRowsTexto = 4,
  usarListaPuntos = false,
  puntos = [],
  onPuntosChange,
  placeholderPunto,
  tituloLista,
  imagenes = [],
  onImagenesChange,
  maxFotos = 3,
  columnas = 3,
  subtituloFotos,
  descripcionesFoto = [],
  datalistId,
  soloLectura = false,
}) {
  return (
    <section className={puertosCard}>
      <div className={puertosCardBody}>
        <h3 className={puertosBlockHeader}>{tituloSeccion}</h3>

        <div className="space-y-5">
          {(() => {
            const textarea = (
              <textarea
                {...attrsTextarea(soloLectura, {
                  className: inputCls,
                  style: { minHeight: `${minRowsTexto * 24}px` },
                  value: valorTexto || '',
                  onChange: (e) => onTextoChange(e.target.value),
                  placeholder: placeholderTexto,
                })}
              />
            );
            return labelTexto ? <Campo label={labelTexto}>{textarea}</Campo> : textarea;
          })()}

          {usarListaPuntos && onPuntosChange && (
            <PuertosCasoListaPuntos
              titulo={tituloLista || ''}
              puntos={puntos}
              onChange={onPuntosChange}
              placeholder={placeholderPunto}
              soloLectura={soloLectura}
            />
          )}

          <PuertosCasoGridFotografico
            titulo=""
            subtitulo={subtituloFotos || ''}
            imagenes={imagenes}
            onChange={onImagenesChange}
            columnas={columnas}
            max={maxFotos}
            descripcionesSugeridas={descripcionesFoto}
            datalistId={datalistId}
            soloLectura={soloLectura}
          />
        </div>
      </div>
    </section>
  );
}
