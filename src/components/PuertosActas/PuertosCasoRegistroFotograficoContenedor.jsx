import React from 'react';
import { FaTrash } from 'react-icons/fa';
import PuertosCasoGridFotografico from './PuertosCasoGridFotografico';
import { Campo, inputCls } from './PuertosCasoDatosGenerales';
import { tituloRegistroContenedor } from './puertosCasoExportacionState';
import {
  puertosBlockHeader,
  puertosBtnSm,
  puertosCard,
  puertosCardBody,
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
}) {
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
    registro.titulo || tituloRegistroContenedor(registro.numeroContenedor) || `Contenedor ${indice + 1}`;

  return (
    <div className={puertosInnerPanel}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className={puertosBlockHeader}>{tituloVista}</h4>
          <p className={puertosSectionSubtitle}>Registro fotográfico · contenedor {indice + 1}</p>
        </div>
        <button type="button" onClick={onEliminar} className={puertosBtnSm}>
          <FaTrash /> Quitar bloque
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="N° contenedor">
          <input
            className={inputCls}
            value={registro.numeroContenedor || ''}
            onChange={(e) => actualizarNumero(e.target.value)}
            placeholder="TIIU 529571-6"
          />
        </Campo>
        <Campo label="Título en el informe (editable)">
          <input
            className={inputCls}
            value={registro.titulo || ''}
            onChange={(e) => actualizar('titulo', e.target.value)}
            placeholder="N° Contenedor … con sellos de seguridad"
          />
        </Campo>
      </div>

      <PuertosCasoGridFotografico
        titulo=""
        subtitulo="Fotos del contenedor y sellos (cuadrícula 3 columnas)"
        imagenes={registro.imagenes || []}
        onChange={(updater) => {
          const next = typeof updater === 'function' ? updater(registro.imagenes || []) : updater;
          actualizar('imagenes', next);
        }}
        columnas={3}
        max={12}
        descripcionesSugeridas={DESCRIPCIONES_FOTO_CONTENEDOR}
        datalistId={`puertos-fotos-contenedor-${registro.id}`}
      />
    </div>
  );
}
