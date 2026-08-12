import React, { useMemo, useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { Campo, InputFenix, SelectFenix } from '../SubcomponenteExpress/ExpressUiBlocks.jsx';
import { expressBtnSecondary } from '../SubcomponenteExpress/expressFenixUi.js';
import {
  agregarTomadorExtraZurich,
  eliminarTomadorExtraZurich,
  esTomadorDefaultZurich,
  leerTomadoresExtraZurich,
  listarTomadoresZurich,
  normalizarTomadorZurich,
} from './tomadoresZurichCatalogo.js';

/**
 * Select de tomador con defaults Zurich + área para agregar/quitar extras (localStorage).
 */
const CampoTomadorZurich = ({ value = '', onChange, className = '', mostrarGestion = true }) => {
  const { t } = useTranslation();
  const [extras, setExtras] = useState(() => leerTomadoresExtraZurich());
  const [nuevo, setNuevo] = useState('');
  const [aviso, setAviso] = useState('');

  const opciones = useMemo(() => listarTomadoresZurich(extras), [extras]);
  const valorActual = String(value || '').trim();
  const valorHuerfano =
    valorActual &&
    !opciones.some((op) => normalizarTomadorZurich(op) === normalizarTomadorZurich(valorActual));

  const handleSelect = (e) => {
    onChange?.(e.target.value);
  };

  const handleAgregar = () => {
    const nombre = normalizarTomadorZurich(nuevo);
    setAviso('');
    if (!nombre) {
      setAviso(t('zurich.tomadores.empty'));
      return;
    }
    if (opciones.some((op) => normalizarTomadorZurich(op) === nombre)) {
      setAviso(t('zurich.tomadores.alreadyExists'));
      onChange?.(nombre);
      setNuevo('');
      return;
    }
    const next = agregarTomadorExtraZurich(nombre);
    setExtras(next);
    onChange?.(nombre);
    setNuevo('');
  };

  const handleEliminar = (nombre) => {
    if (esTomadorDefaultZurich(nombre)) return;
    const next = eliminarTomadorExtraZurich(nombre);
    setExtras(next);
    if (normalizarTomadorZurich(valorActual) === normalizarTomadorZurich(nombre)) {
      onChange?.('');
    }
  };

  return (
    <div className={className || 'space-y-3 md:col-span-2 lg:col-span-3'}>
      <Campo label={t('zurich.fields.tomador')}>
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
            {t('zurich.tomadores.manageTitle')}
          </p>
          <p className="mb-3 font-body text-xs text-gray-500 dark:text-gray-400">
            {t('zurich.tomadores.manageHint')}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <InputFenix
                value={nuevo}
                onChange={(e) => setNuevo(e.target.value)}
                placeholder={t('zurich.tomadores.newPlaceholder')}
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
              {t('zurich.tomadores.add')}
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
                    title={t('zurich.tomadores.remove')}
                    aria-label={t('zurich.tomadores.remove')}
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

export default CampoTomadorZurich;
