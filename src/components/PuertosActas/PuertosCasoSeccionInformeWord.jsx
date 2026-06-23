import React from 'react';
import PuertosCasoGridFotografico from './PuertosCasoGridFotografico';
import PuertosCasoListaPuntos from './PuertosCasoListaPuntos';
import { Campo, inputCls } from './PuertosCasoDatosGenerales';
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
}) {
  return (
    <section className={puertosCard}>
      <div className={puertosCardBody}>
        <h3 className={puertosBlockHeader}>{tituloSeccion}</h3>

        <div className="space-y-5">
          <Campo label={labelTexto}>
            <textarea
              className={inputCls}
              style={{ minHeight: `${minRowsTexto * 24}px` }}
              value={valorTexto || ''}
              onChange={(e) => onTextoChange(e.target.value)}
              placeholder={placeholderTexto}
            />
          </Campo>

          {usarListaPuntos && onPuntosChange && (
            <PuertosCasoListaPuntos
              titulo={tituloLista || 'Puntos (orden del informe)'}
              puntos={puntos}
              onChange={onPuntosChange}
              placeholder={placeholderPunto}
            />
          )}

          <PuertosCasoGridFotografico
            titulo=""
            subtitulo={subtituloFotos || `Registro fotográfico · máx. ${maxFotos} fotos · ${columnas} por fila`}
            imagenes={imagenes}
            onChange={onImagenesChange}
            columnas={columnas}
            max={maxFotos}
            descripcionesSugeridas={descripcionesFoto}
            datalistId={datalistId}
          />
        </div>
      </div>
    </section>
  );
}
