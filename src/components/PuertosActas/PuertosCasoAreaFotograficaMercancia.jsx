import React from 'react';
import PuertosCasoGridFotografico from './PuertosCasoGridFotografico';

const FOTOS_CONTENEDOR = [
  'Vista posterior contenedor',
  'Precinto / sello de seguridad',
  'Interior del contenedor',
  'N° identificación contenedor',
];

export default function PuertosCasoAreaFotograficaMercancia({
  informe,
  onInformeChange,
  soloLectura = false,
}) {
  return (
    <div className="space-y-6">
      <PuertosCasoGridFotografico
        titulo="Contenido de la mercancía"
        subtitulo="Fotografías de la mercancía (cajas, big bags, paquetes, etc. · máx. 4 fotos)"
        imagenes={informe.imagenesContenidoCajas || []}
        onChange={(updater) => onInformeChange('imagenesContenidoCajas', updater)}
        columnas={2}
        max={4}
        descripcionesSugeridas={['Contenido de la mercancía', 'Producto embalado']}
        datalistId="puertos-fotos-contenido-cajas"
        soloLectura={soloLectura}
      />

      <PuertosCasoGridFotografico
        titulo="Contenedor (es) asignado (s)"
        subtitulo="1 foto del contenedor asignado"
        imagenes={informe.imagenesContenedoresMercancia || []}
        onChange={(updater) => onInformeChange('imagenesContenedoresMercancia', updater)}
        columnas={1}
        max={1}
        descripcionesSugeridas={FOTOS_CONTENEDOR}
        datalistId="puertos-fotos-contenedores-mercancia"
        soloLectura={soloLectura}
      />
    </div>
  );
}
