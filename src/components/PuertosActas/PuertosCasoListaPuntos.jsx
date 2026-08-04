import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaTrash, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { inputCls, attrsInput } from './PuertosCasoDatosGenerales';
import { nuevoPuntoInforme } from './puertosCasoExportacionState';
import { puertosBtnSm, puertosInnerPanel } from './puertosFenixUi';

export default function PuertosCasoListaPuntos({
  titulo,
  puntos = [],
  onChange,
  placeholder,
  soloLectura = false,
}) {
  const { t } = useTranslation();
  const placeholderText = placeholder ?? t('ports.ui.casoExportacion.listaPuntos.placeholder');

  const setPuntos = (updater) => onChange(updater);

  const actualizar = (id, texto) => {
    setPuntos((prev) => prev.map((p) => (p.id === id ? { ...p, texto } : p)));
  };

  const eliminar = (id) => {
    setPuntos((prev) => prev.filter((p) => p.id !== id));
  };

  const mover = (id, delta) => {
    setPuntos((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0) return prev;
      const next = idx + delta;
      if (next < 0 || next >= prev.length) return prev;
      const copia = [...prev];
      [copia[idx], copia[next]] = [copia[next], copia[idx]];
      return copia;
    });
  };

  return (
    <div className={`${puertosInnerPanel} space-y-3`}>
      {(titulo || !soloLectura) && (
        <div className="flex items-center justify-between gap-2">
          <span className="font-body text-sm font-semibold text-gray-800 dark:text-gray-200">{titulo}</span>
          {!soloLectura && (
          <button type="button" onClick={() => setPuntos((prev) => [...(prev || []), nuevoPuntoInforme()])} className={puertosBtnSm}>
            <FaPlus /> {t('ports.ui.casoExportacion.listaPuntos.punto')}
          </button>
          )}
        </div>
      )}
      {puntos.length === 0 && (
        <p className="font-body text-xs italic text-gray-500">{t('ports.ui.casoExportacion.listaPuntos.empty')}</p>
      )}
      <ol className="list-none space-y-2">
        {puntos.map((punto, idx) => (
          <li key={punto.id} className="flex items-start gap-2">
            <span className="mt-2 w-5 shrink-0 font-body text-xs font-bold text-fenix-primario">{idx + 1}.</span>
            <input
              type="text"
              {...attrsInput(soloLectura, {
                className: `${inputCls} flex-1`,
                value: punto.texto || '',
                onChange: (e) => actualizar(punto.id, e.target.value),
                placeholder: placeholderText,
              })}
            />
            {!soloLectura && (
            <div className="flex shrink-0 flex-col gap-0.5">
              <button type="button" onClick={() => mover(punto.id, -1)} className="p-1 text-gray-500 hover:text-fenix-primario" title={t('ports.ui.casoExportacion.listaPuntos.moveUp')}>
                <FaArrowUp className="text-xs" />
              </button>
              <button type="button" onClick={() => mover(punto.id, 1)} className="p-1 text-gray-500 hover:text-fenix-primario" title={t('ports.ui.casoExportacion.listaPuntos.moveDown')}>
                <FaArrowDown className="text-xs" />
              </button>
              <button type="button" onClick={() => eliminar(punto.id)} className="p-1 text-fenix-primario" title={t('ports.ui.common.delete')}>
                <FaTrash className="text-xs" />
              </button>
            </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
