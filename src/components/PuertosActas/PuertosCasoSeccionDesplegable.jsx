import React from 'react';
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
}) {
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
      {abierta && <div className={puertosCardBody}>{children}</div>}
    </section>
  );
}
