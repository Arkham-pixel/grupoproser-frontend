import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaFileAlt, FaFileSignature, FaFileWord } from 'react-icons/fa';
import { navegarAjusteDesdeCasoSura } from '../../utils/navegarAjusteDesdeCasoComplex.js';

const cardBase =
  'flex h-full flex-col rounded-xl border p-4 text-left transition hover:border-fenix-primario/50';
const cardIdle =
  'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900';
const cardActive =
  'border-fenix-primario bg-fenix-primario/5 dark:border-fenix-primario dark:bg-fenix-primario/10';

/**
 * En Documentos del caso SURA: preliminar/final usan el informe de Complex;
 * el único queda en el Word CAT de SURA.
 */
export default function SelectorTipoInformeSura({
  casoSura,
  modoUnicoActivo,
  onElegirUnico,
}) {
  const navigate = useNavigate();
  const [abriendo, setAbriendo] = useState('');
  const [error, setError] = useState('');
  const sinCaso = !casoSura?._id;

  const abrirComplex = async (estadoInicial, clave) => {
    if (sinCaso) return;
    setError('');
    setAbriendo(clave);
    try {
      await navegarAjusteDesdeCasoSura(navigate, casoSura, { estadoInicial });
    } catch (err) {
      setError(err?.message || 'No se pudo abrir el informe de Complex.');
      setAbriendo('');
    }
  };

  return (
    <div className="mb-6 space-y-3">
      <div>
        <h3 className="font-heading text-base font-semibold text-gray-900 dark:text-white">
          ¿Qué informe va a elaborar?
        </h3>
        <p className="mt-1 font-body text-sm text-gray-600 dark:text-gray-400">
          El preliminar y el final son el mismo formato de Complex (reserva, anticipo y
          versiones). El único es el informe CAT de SURA.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          disabled={sinCaso || Boolean(abriendo)}
          className={`${cardBase} ${cardIdle}`}
          onClick={() => abrirComplex('inicial', 'preliminar')}
        >
          <FaFileAlt className="mb-2 text-fenix-primario" />
          <span className="font-body text-sm font-semibold text-gray-900 dark:text-white">
            Informe preliminar
          </span>
          <span className="mt-1 font-body text-xs text-gray-500">
            {abriendo === 'preliminar'
              ? 'Abriendo formato Complex…'
              : 'Formato Complex: reserva y/o anticipo.'}
          </span>
        </button>
        <button
          type="button"
          disabled={sinCaso || Boolean(abriendo)}
          className={`${cardBase} ${cardIdle}`}
          onClick={() => abrirComplex('informeFinal', 'final')}
        >
          <FaFileSignature className="mb-2 text-fenix-primario" />
          <span className="font-body text-sm font-semibold text-gray-900 dark:text-white">
            Informe final
          </span>
          <span className="mt-1 font-body text-xs text-gray-500">
            {abriendo === 'final'
              ? 'Abriendo formato Complex…'
              : 'Formato Complex, versión final del ajuste.'}
          </span>
        </button>
        <button
          type="button"
          className={`${cardBase} ${modoUnicoActivo ? cardActive : cardIdle}`}
          onClick={onElegirUnico}
        >
          <FaFileWord className="mb-2 text-fenix-primario" />
          <span className="font-body text-sm font-semibold text-gray-900 dark:text-white">
            Informe único
          </span>
          <span className="mt-1 font-body text-xs text-gray-500">
            Informe CAT de SURA (Word del caso).
          </span>
        </button>
      </div>
      {error ? (
        <p className="font-body text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
