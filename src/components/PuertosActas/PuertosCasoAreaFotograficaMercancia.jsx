import React from 'react';
import PuertosCasoGridFotografico from './PuertosCasoGridFotografico';

const FOTOS_CONTENEDOR = [
  'Vista posterior contenedor',
  'Precinto / sello de seguridad',
  'Interior del contenedor',
  'N° identificación contenedor',
];

const FOTOS_VEHICULO = [
  'Precinto / sello de seguridad',
  'Placa del vehículo',
  'Vista del vehículo',
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
        subtitulo="Fotografías de la mercancía (cajas, big bags, paquetes, etc. · 2 columnas)"
        imagenes={informe.imagenesContenidoCajas || []}
        onChange={(updater) => onInformeChange('imagenesContenidoCajas', updater)}
        columnas={2}
        max={12}
        descripcionesSugeridas={['Contenido de la mercancía', 'Producto embalado']}
        datalistId="puertos-fotos-contenido-cajas"
        soloLectura={soloLectura}
      />

      <PuertosCasoGridFotografico
        titulo="Contenedor (es) asignado (s)"
        subtitulo="Por contenedor: exterior, sello, interior y número (4 columnas, como en el Word)"
        imagenes={informe.imagenesContenedoresMercancia || []}
        onChange={(updater) => onInformeChange('imagenesContenedoresMercancia', updater)}
        columnas={4}
        max={48}
        descripcionesSugeridas={FOTOS_CONTENEDOR}
        datalistId="puertos-fotos-contenedores-mercancia"
        soloLectura={soloLectura}
      />

      <PuertosCasoGridFotografico
        titulo="Vehículo (s) asignado (s)"
        subtitulo="Precinto, placa y vista del vehículo (3 columnas)"
        imagenes={informe.imagenesVehiculosMercancia || []}
        onChange={(updater) => onInformeChange('imagenesVehiculosMercancia', updater)}
        columnas={3}
        max={24}
        descripcionesSugeridas={FOTOS_VEHICULO}
        datalistId="puertos-fotos-vehiculos-mercancia"
        soloLectura={soloLectura}
      />
    </div>
  );
}
