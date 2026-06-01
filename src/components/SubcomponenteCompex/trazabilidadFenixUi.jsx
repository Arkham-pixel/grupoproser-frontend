import React from 'react';
import {
  FaCalendarAlt,
  FaChartBar,
  FaChartLine,
  FaChevronDown,
  FaClock,
  FaExclamationTriangle,
  FaFileAlt,
  FaFileInvoice,
  FaPaperclip,
  FaPhone,
  FaSearch,
} from 'react-icons/fa';
import { complexBadge, complexInput, complexLabel } from './complexFenixUi';

export const ETAPAS_TRAZABILIDAD = [
  { tipo: 'contactoInicial', titulo: 'Contacto Inicial', Icon: FaPhone },
  { tipo: 'coordinacionInspeccion', titulo: 'Coordinación de Inspección', Icon: FaCalendarAlt },
  { tipo: 'inspeccion', titulo: 'Inspección', Icon: FaSearch },
  { tipo: 'solicitudDocs', titulo: 'Solicitud Docs', Icon: FaFileAlt },
  { tipo: 'informePreliminar', titulo: 'Informe Preliminar', Icon: FaChartBar },
  { tipo: 'ultimoDocumento', titulo: 'Último Documento', Icon: FaPaperclip },
  { tipo: 'informeFinal', titulo: 'Informe Final', Icon: FaFileInvoice },
  { tipo: 'presentacionCifras', titulo: 'Presentación de Cifras', Icon: FaChartLine },
  { tipo: 'envioFiniquito', titulo: 'Envío de Finiquito', Icon: FaFileInvoice },
];

export const trazabilidadInputClass = `${complexInput} text-xs sm:text-sm`;

export const trazabilidadLabelClass = `${complexLabel} text-xs sm:text-sm`;

export function TrazabilidadIconoEtapa({ Icon }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
      <Icon className="text-sm" aria-hidden />
    </span>
  );
}

export function TrazabilidadIndicadorIcono({ diasInfo }) {
  if (!diasInfo) return <FaClock className="text-gray-400" aria-hidden />;
  if (diasInfo.diasRetraso > 0) return <FaExclamationTriangle className="text-fenix-primario" aria-hidden />;
  return <FaClock className="text-gray-500 dark:text-gray-400" aria-hidden />;
}

export function trazabilidadColorClase(diasInfo) {
  if (!diasInfo) return 'text-gray-400';
  if (diasInfo.diasRetraso > 0) return 'text-fenix-primario font-semibold';
  return 'text-gray-600 dark:text-gray-400';
}

export function EstadoGeneralTrazabilidad({ tipos, calcularDias }) {
  const urgentes = tipos.filter((tipo) => {
    const d = calcularDias(tipo);
    return d && d.esUrgente;
  }).length;
  const recientes = tipos.filter((tipo) => {
    const d = calcularDias(tipo);
    return d && d.esReciente;
  }).length;

  if (urgentes > 0) {
    return (
      <span className={`${complexBadge} gap-1.5 text-fenix-primario`}>
        <FaExclamationTriangle className="text-xs" aria-hidden />
        {urgentes} etapa{urgentes !== 1 ? 's' : ''} con retraso
      </span>
    );
  }
  if (recientes >= 3) {
    return (
      <span className={complexBadge}>
        <FaClock className="mr-1 text-xs" aria-hidden />
        Caso al día
      </span>
    );
  }
  return (
    <span className={`${complexBadge} text-gray-600 dark:text-gray-300`}>
      <FaClock className="mr-1 text-xs" aria-hidden />
      Necesita atención
    </span>
  );
}

export function TrazabilidadChevron({ abierto }) {
  return (
    <FaChevronDown
      className={`shrink-0 text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
      aria-hidden
    />
  );
}
