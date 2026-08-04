import { useTranslation } from 'react-i18next';
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
  FaEnvelopeOpenText,
  FaBuilding,
  FaMoneyCheckAlt,
  FaInbox,
  FaUserCheck,
} from 'react-icons/fa';
import { complexBadge, complexInput, complexLabel } from './complexFenixUi';

/** Claves i18n en complex.ui.trazabilidad_fenix_ui (sin título hardcodeado). */
export const ETAPAS_TRAZABILIDAD = [
  { tipo: 'recepcionAsignacion', tituloKey: 'recepcion_asignacion', Icon: FaInbox },
  { tipo: 'carguePlataforma', tituloKey: 'cargue_asignacion_interna', Icon: FaUserCheck },
  { tipo: 'contactoInicial', tituloKey: 'contacto_inicial', Icon: FaPhone },
  { tipo: 'coordinacionInspeccion', tituloKey: 'coordinacion_inspeccion', Icon: FaCalendarAlt },
  { tipo: 'inspeccion', tituloKey: 'inspeccion', Icon: FaSearch },
  { tipo: 'solicitudDocs', tituloKey: 'solicitud_docs', Icon: FaFileAlt },
  { tipo: 'informePreliminar', tituloKey: 'informe_preliminar', Icon: FaChartBar },
  { tipo: 'seguimientoDocsPendientes', tituloKey: 'seguimiento_docs_pendientes', Icon: FaEnvelopeOpenText },
  { tipo: 'ultimoDocumento', tituloKey: 'ultimo_documento', Icon: FaPaperclip },
  { tipo: 'informeFinal', tituloKey: 'informe_final', Icon: FaFileInvoice },
  { tipo: 'seguimientoAutorizacionCompania', tituloKey: 'seguimiento_autorizacion_compania', Icon: FaBuilding },
  { tipo: 'presentacionCifras', tituloKey: 'presentacion_de_cifras', Icon: FaChartLine },
  { tipo: 'seguimientoDocumentosPago', tituloKey: 'seguimiento_docs_de_pago', Icon: FaMoneyCheckAlt },
  { tipo: 'envioFiniquito', tituloKey: 'envio_de_finiquito', Icon: FaFileInvoice },
];

/** Títulos largos usados en acordeones de Trazabilidad.jsx */
export const TITULO_ETAPA_LARGO_KEY = {
  solicitudDocs: 'solicitud_docs',
  seguimientoDocsPendientes: 'seguimiento_documentos_pendientes',
  seguimientoAutorizacionCompania: 'seguimiento_autorizacion_compania_largo',
  seguimientoDocumentosPago: 'seguimiento_documentos_pago_largo',
};

export function tituloEtapaTrazabilidad(t, tipo, { largo = false } = {}) {
  const etapa = ETAPAS_TRAZABILIDAD.find((e) => e.tipo === tipo);
  const key =
    (largo && TITULO_ETAPA_LARGO_KEY[tipo]) ||
    etapa?.tituloKey ||
    tipo;
  // Prefer etapas_trazabilidad (ES/EN dedicadas); fallback a trazabilidad_fenix_ui
  const primary = `complex.ui.etapas_trazabilidad.${key}`;
  const translated = t(primary);
  if (translated && translated !== primary) return translated;
  return t(`complex.ui.trazabilidad_fenix_ui.${key}`);
}

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
  const { t } = useTranslation();
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
        {t('complex.ui.trazabilidad_fenix_ui.etapas_con_retraso', { count: urgentes })}
      </span>
    );
  }
  if (recientes >= 3) {
    return (
      <span className={complexBadge}>
        <FaClock className="mr-1 text-xs" aria-hidden />
        {t('complex.ui.trazabilidad_fenix_ui.caso_al_dia')}
      </span>
    );
  }
  return (
    <span className={`${complexBadge} text-gray-600 dark:text-gray-300`}>
      <FaClock className="mr-1 text-xs" aria-hidden />
      {t('complex.ui.trazabilidad_fenix_ui.necesita_atencion')}
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
