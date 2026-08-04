import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <PuertosCasoGridFotografico
        titulo={t('ports.ui.casoExportacion.mercancia.contenidoTitle')}
        subtitulo={t('ports.ui.casoExportacion.mercancia.contenidoSubtitle')}
        imagenes={informe.imagenesContenidoCajas || []}
        onChange={(updater) => onInformeChange('imagenesContenidoCajas', updater)}
        columnas={2}
        max={4}
        descripcionesSugeridas={['Contenido de la mercancía', 'Producto embalado']}
        datalistId="puertos-fotos-contenido-cajas"
        soloLectura={soloLectura}
      />

      <PuertosCasoGridFotografico
        titulo={t('ports.ui.casoExportacion.mercancia.contenedoresTitle')}
        subtitulo={t('ports.ui.casoExportacion.mercancia.contenedoresSubtitle')}
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
