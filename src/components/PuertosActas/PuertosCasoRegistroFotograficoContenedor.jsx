import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaTrash } from 'react-icons/fa';
import PuertosCasoGridFotografico from './PuertosCasoGridFotografico';
import { Campo, inputCls, attrsInput } from './PuertosCasoDatosGenerales';
import { tituloRegistroContenedor } from './puertosCasoExportacionState';
import {
  puertosBlockHeader,
  puertosBtnSm,
  puertosInnerPanel,
  puertosSectionSubtitle,
} from './puertosFenixUi';

const DESCRIPCIONES_FOTO_CONTENEDOR = [
  'Interior del contenedor',
  'Puertas cerradas',
  'Sello de seguridad 1',
  'Sello de seguridad 2',
  'Vista general',
];

export default function PuertosCasoRegistroFotograficoContenedor({
  registro,
  indice,
  onChange,
  onEliminar,
  soloLectura = false,
}) {
  const { t } = useTranslation();

  const actualizar = (campo, valor) => {
    onChange({ ...registro, [campo]: valor });
  };

  const actualizarNumero = (numeroContenedor) => {
    onChange({
      ...registro,
      numeroContenedor,
      titulo: tituloRegistroContenedor(numeroContenedor),
    });
  };

  const tituloVista =
    registro.titulo || tituloRegistroContenedor(registro.numeroContenedor) || t('ports.ui.casoExportacion.photos.contenedorDefault', { n: indice + 1 });

  return (
    <div className={puertosInnerPanel}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className={puertosBlockHeader}>{tituloVista}</h4>
          <p className={puertosSectionSubtitle}>{t('ports.ui.casoExportacion.photos.registroSubtitle', { n: indice + 1 })}</p>
        </div>
        {!soloLectura && (
        <button type="button" onClick={onEliminar} className={puertosBtnSm}>
          <FaTrash /> {t('ports.ui.casoExportacion.photos.removeBlock')}
        </button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label={t('ports.ui.casoExportacion.supervision.numContenedor')}>
          <input
            {...attrsInput(soloLectura, {
              className: inputCls,
              value: registro.numeroContenedor || '',
              onChange: (e) => actualizarNumero(e.target.value),
              placeholder: 'TIIU 529571-6',
            })}
          />
        </Campo>
        <Campo label={t('ports.ui.casoExportacion.photos.tituloInforme')}>
          <input
            {...attrsInput(soloLectura, {
              className: inputCls,
              value: registro.titulo || '',
              onChange: (e) => actualizar('titulo', e.target.value),
              placeholder: t('ports.ui.casoExportacion.photos.tituloInformePlaceholder'),
            })}
          />
        </Campo>
      </div>

      <PuertosCasoGridFotografico
        titulo=""
        subtitulo={t('ports.ui.casoExportacion.photos.contenedorGridSubtitle')}
        imagenes={registro.imagenes || []}
        onChange={(updater) => {
          const next = typeof updater === 'function' ? updater(registro.imagenes || []) : updater;
          actualizar('imagenes', next);
        }}
        columnas={3}
        max={12}
        descripcionesSugeridas={DESCRIPCIONES_FOTO_CONTENEDOR}
        datalistId={`puertos-fotos-contenedor-${registro.id}`}
        soloLectura={soloLectura}
      />
    </div>
  );
}
