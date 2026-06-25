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
  numContenedores = 0,
  soloLectura = false,
}) {
  const tituloContenedores =
    numContenedores > 0
      ? `Contenedores asignados apto (${numContenedores})`
      : 'Contenedores asignados apto';

  return (
    <div className="space-y-6">
      <PuertosCasoGridFotografico
        titulo="Contenido de las cajas"
        subtitulo="Fotografías del producto dentro de las cajas (2 columnas, como en el Word)"
        imagenes={informe.imagenesContenidoCajas || []}
        onChange={(updater) => onInformeChange('imagenesContenidoCajas', updater)}
        columnas={2}
        max={12}
        descripcionesSugeridas={['Contenido de las cajas', 'Producto en caja']}
        datalistId="puertos-fotos-contenido-cajas"
        soloLectura={soloLectura}
      />

      <PuertosCasoGridFotografico
        titulo={tituloContenedores}
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
        titulo="Vehículos asignados con sus sellos de seguridad"
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
