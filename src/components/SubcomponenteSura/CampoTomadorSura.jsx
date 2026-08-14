import React, { useMemo, useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { Campo, InputFenix, SelectFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { expressBtnSecondary } from '../SubcomponenteExpress/expressFenixUi.js';
import {
  agregarTomadorExtraSura,
  eliminarTomadorExtraSura,
  esTomadorDefaultSura,
  leerTomadoresExtraSura,
  listarTomadoresSura,
  normalizarTomadorSura,
} from './tomadoresSuraCatalogo.js';

/**
 * Select de tomador con defaults Sura + área para agregar/quitar extras (localStorage).
 */
const CampoTomadorSura = ({ value = '', onChange, className = '', mostrarGestion = true }) => {
  const { t } = useTranslation();
  const [extras, setExtras] = useState(() => leerTomadoresExtraSura());
  const [nuevo, setNuevo] = useState('');
  const [aviso, setAviso] = useState('');

  const opciones = useMemo(() => listarTomadoresSura(extras), [extras]);
  const valorActual = String(value || '').trim();
  const valorHuerfano =
    valorActual &&
    !opciones.some((op) => normalizarTomadorSura(op) === normalizarTomadorSura(valorActual));

  const handleSelect = (e) => {
    onChange?.(e.target.value);
  };

  const handleAgregar = () => {
    const nombre = normalizarTomadorSura(nuevo);
    setAviso('');
    if (!nombre) {
      setAviso(t('segurosSura.tomadores.empty'));
      return;
    }
    if (opciones.some((op) => normalizarTomadorSura(op) === nombre)) {
      setAviso(t('segurosSura.tomadores.alreadyExists'));
      onChange?.(nombre);
      setNuevo('');
      return;
    }
    const next = agregarTomadorExtraSura(nombre);
    setExtras(next);
    onChange?.(nombre);
    setNuevo('');
  };

  const handleEliminar = (nombre) => {
    if (esTomadorDefaultSura(nombre)) return;
    const next = eliminarTomadorExtraSura(nombre);
    setExtras(next);
    if (normalizarTomadorSura(valorActual) === normalizarTomadorSura(nombre)) {
      onChange?.('');
    }
  };

  return (
    <div className={className || 'space-y-3 md:col-span-2 lg:col-span-3'}>
      <Campo label={t('segurosSura.fields.tomador')}>
        <SelectFenix value={valorActual} onChange={handleSelect}>
          <option value="">{t('common.select')}</option>
          {valorHuerfano && <option value={valorActual}>{valorActual}</option>}
          {opciones.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </SelectFenix>
      </Campo>

      {mostrarGestion && (
        <div className="rounded-lg border border-gray-200 bg-white/60 p-3 dark:border-gray-700 dark:bg-gray-900/40">
          <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('segurosSura.tomadores.manageTitle')}
          </p>
          <p className="mb-3 font-body text-xs text-gray-500 dark:text-gray-400">
            {t('segurosSura.tomadores.manageHint')}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <InputFenix
                value={nuevo}
                onChange={(e) => setNuevo(e.target.value)}
                placeholder={t('segurosSura.tomadores.newPlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAgregar();
                  }
                }}
              />
            </div>
            <button type="button" className={expressBtnSecondary} onClick={handleAgregar}>
              <FaPlus className="mr-1 inline" />
              {t('segurosSura.tomadores.add')}
            </button>
          </div>
          {aviso && (
            <p className="mt-2 font-body text-xs text-amber-700 dark:text-amber-400">{aviso}</p>
          )}
          {extras.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {extras.map((nombre) => (
                <li
                  key={nombre}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-fenix-fondo px-3 py-1 font-body text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  <span>{nombre}</span>
                  <button
                    type="button"
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                    title={t('segurosSura.tomadores.remove')}
                    aria-label={t('segurosSura.tomadores.remove')}
                    onClick={() => handleEliminar(nombre)}
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default CampoTomadorSura;
