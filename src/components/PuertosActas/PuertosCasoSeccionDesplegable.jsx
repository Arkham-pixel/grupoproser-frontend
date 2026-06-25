import React, { useEffect, useRef } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import {
  puertosAccordionBtn,
  puertosAccordionNum,
  puertosCard,
  puertosCardBody,
  puertosSectionSubtitle,
  puertosSectionTitle,
} from './puertosFenixUi';

export default function PuertosCasoSeccionDesplegable({
  id,
  titulo,
  subtitulo,
  abierta,
  onToggle,
  children,
  numero,
  soloLectura = false,
}) {
  const cuerpoRef = useRef(null);

  useEffect(() => {
    const el = cuerpoRef.current;
    if (!el) return;
    if (soloLectura) {
      el.setAttribute('inert', '');
    } else {
      el.removeAttribute('inert');
    }
  }, [soloLectura, abierta]);

  return (
    <section className={puertosCard}>
      <button
        type="button"
        id={`seccion-${id}`}
        onClick={() => onToggle(id)}
        className={puertosAccordionBtn}
        aria-expanded={abierta}
      >
        {numero != null && <span className={puertosAccordionNum}>{numero}</span>}
        <div className="min-w-0 flex-1">
          <h3 className={puertosSectionTitle}>{titulo}</h3>
          {subtitulo && <p className={`${puertosSectionSubtitle} truncate`}>{subtitulo}</p>}
        </div>
        {abierta ? (
          <FaChevronUp className="shrink-0 text-gray-400" />
        ) : (
          <FaChevronDown className="shrink-0 text-gray-400" />
        )}
      </button>
      {abierta && (
        <div ref={cuerpoRef} className={`${puertosCardBody} relative`}>
          {children}
          {soloLectura && (
            <div
              className="absolute inset-0 z-20 cursor-default bg-transparent"
              aria-hidden="true"
              tabIndex={-1}
            />
          )}
        </div>
      )}
    </section>
  );
}
