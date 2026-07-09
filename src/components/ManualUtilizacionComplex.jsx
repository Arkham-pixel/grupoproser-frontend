import React, { useState } from 'react';
import { FaBook, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import {
  MANUAL_COMPLEX_TITULO,
  MANUAL_COMPLEX_VERSION,
  SECCIONES_MANUAL_COMPLEX,
} from '../config/manualComplexContent.js';
import {
  complexAccordionWrap,
  complexCard,
  complexHint,
  complexSectionTitle,
} from './SubcomponenteCompex/complexFenixUi.js';

function SeccionManual({ seccion, abierta, onToggle }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-[#1A1A1A]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-gray-900/50"
        aria-expanded={abierta}
      >
        <span className="font-heading text-sm font-bold text-gray-900 dark:text-white sm:text-base">
          {seccion.titulo}
        </span>
        {abierta ? (
          <FaChevronUp className="shrink-0 text-gray-400" aria-hidden />
        ) : (
          <FaChevronDown className="shrink-0 text-gray-400" aria-hidden />
        )}
      </button>
      {abierta && (
        <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {seccion.contenido.map((parrafo) => (
              <li key={parrafo.slice(0, 40)}>{parrafo}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const ManualUtilizacionComplex = ({ embedded = false }) => {
  const [abiertas, setAbiertas] = useState(() => new Set(['intro']));

  const toggle = (id) => {
    setAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandirTodas = () => {
    setAbiertas(new Set(SECCIONES_MANUAL_COMPLEX.map((s) => s.id)));
  };

  const colapsarTodas = () => {
    setAbiertas(new Set());
  };

  return (
    <div className={embedded ? '' : 'p-4'}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className={complexSectionTitle}>{MANUAL_COMPLEX_TITULO}</h2>
          <p className={`${complexHint} mt-1`}>
            Guía para ajustadores y supervisores · versión {MANUAL_COMPLEX_VERSION}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={expandirTodas}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            Expandir todo
          </button>
          <button
            type="button"
            onClick={colapsarTodas}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            Colapsar todo
          </button>
        </div>
      </div>

      <div className={`${complexCard} mb-6 flex items-start gap-3`}>
        <FaBook className="mt-1 shrink-0 text-xl text-fenix-primario" aria-hidden />
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">Cómo usar este manual</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Abra cada sección para consultar el flujo de trabajo en Arnald COMPLEX. Para indicadores
            y exportación del informe anual, vea las secciones 5, 6 y 8.
          </p>
        </div>
      </div>

      <div className={complexAccordionWrap}>
        {SECCIONES_MANUAL_COMPLEX.map((seccion) => (
          <SeccionManual
            key={seccion.id}
            seccion={seccion}
            abierta={abiertas.has(seccion.id)}
            onToggle={() => toggle(seccion.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ManualUtilizacionComplex;
