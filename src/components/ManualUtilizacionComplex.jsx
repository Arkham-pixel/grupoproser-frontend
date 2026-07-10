import React, { useState } from 'react';
import { FaBook, FaChevronDown, FaChevronUp, FaFileWord, FaImage } from 'react-icons/fa';
import {
  MANUAL_COMPLEX_RUTA_IMAGENES,
  MANUAL_COMPLEX_TITULO,
  MANUAL_COMPLEX_VERSION,
  SECCIONES_MANUAL_COMPLEX,
} from '../config/manualComplexContent.js';
import { generarManualComplexDescarga } from '../utils/generarManualComplex.js';
import {
  complexAccordionWrap,
  complexCard,
  complexHint,
  complexSectionTitle,
} from './SubcomponenteCompex/complexFenixUi.js';

function ZonaImagenManual({ bloque }) {
  const ruta = bloque.archivo ? `${MANUAL_COMPLEX_RUTA_IMAGENES}/${bloque.archivo}` : null;
  const [errorCarga, setErrorCarga] = useState(false);
  const mostrarPlaceholder = !ruta || errorCarga;

  return (
    <figure className="my-4">
      {mostrarPlaceholder ? (
        <div
          className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-600 dark:bg-gray-900/40"
          role="img"
          aria-label={bloque.leyenda || 'Zona para imagen del manual'}
        >
          <FaImage className="text-3xl text-gray-400 dark:text-gray-500" aria-hidden />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {bloque.leyenda || 'Imagen del manual'}
          </p>
          <p className="max-w-lg text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {bloque.instruccion ||
              'Coloque la captura de pantalla en public/manual-complex/ y actualice el nombre en manualComplexContent.js'}
          </p>
          {bloque.archivo && (
            <p className="font-mono text-xs text-gray-400 dark:text-gray-500">
              Archivo: {bloque.archivo}
            </p>
          )}
        </div>
      ) : (
        <img
          src={ruta}
          alt={bloque.leyenda || bloque.instruccion || 'Captura del manual COMPLEX'}
          className="w-full rounded-xl border border-gray-200 shadow-sm dark:border-gray-700"
          loading="lazy"
          onError={() => setErrorCarga(true)}
        />
      )}
      {bloque.leyenda && (
        <figcaption className={`${complexHint} mt-2 text-center italic`}>{bloque.leyenda}</figcaption>
      )}
    </figure>
  );
}

function renderTextoConNegrilla(texto) {
  const partes = String(texto).split(/(\*\*[^*]+\*\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**')) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>;
    }
    return parte;
  });
}

function BloqueManual({ bloque }) {
  switch (bloque.tipo) {
    case 'texto':
      return (
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {renderTextoConNegrilla(bloque.contenido)}
        </p>
      );

    case 'subtitulo':
      return (
        <h4 className="mt-4 font-heading text-sm font-bold text-gray-900 dark:text-white">
          {bloque.contenido}
        </h4>
      );

    case 'lista':
      return (
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {bloque.items.map((item) => (
            <li key={item.slice(0, 48)}>{renderTextoConNegrilla(item)}</li>
          ))}
        </ul>
      );

    case 'nota':
      return (
        <div className="rounded-lg border border-fenix-primario/20 bg-fenix-primario/5 px-4 py-3 text-sm leading-relaxed text-gray-700 dark:border-fenix-primario/30 dark:bg-fenix-primario/10 dark:text-gray-300">
          {bloque.contenido}
        </div>
      );

    case 'imagen':
      return <ZonaImagenManual bloque={bloque} />;

    default:
      return null;
  }
}

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
        <div className="space-y-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          {seccion.bloques.map((bloque, index) => (
            <BloqueManual key={`${seccion.id}-${bloque.tipo}-${index}`} bloque={bloque} />
          ))}
        </div>
      )}
    </div>
  );
}

const ManualUtilizacionComplex = ({ embedded = false }) => {
  const [abiertas, setAbiertas] = useState(() => new Set(['intro', 'trazabilidad', 'indicadores-trazabilidad', 'alertas']));
  const [generandoWord, setGenerandoWord] = useState(false);

  const descargarWord = async () => {
    setGenerandoWord(true);
    try {
      const { nombreArchivo } = await generarManualComplexDescarga();
      alert(`Manual descargado: ${nombreArchivo}`);
    } catch (e) {
      alert(e?.message || 'No se pudo generar el manual Word.');
    } finally {
      setGenerandoWord(false);
    }
  };

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
            onClick={descargarWord}
            disabled={generandoWord}
            className="inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            <FaFileWord aria-hidden />
            {generandoWord ? 'Generando…' : 'Descargar manual Word'}
          </button>
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
            Consulte las secciones 3 y 4 para entender la trazabilidad y sus indicadores por fase.
            La sección 8 explica las alertas. Use <strong>Descargar manual Word</strong> para obtener el
            documento físico con zonas para pegar capturas en la presentación.
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
