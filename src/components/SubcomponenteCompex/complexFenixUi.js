/** Clases Tailwind — formularios Complex (ARNALD Fenix) */

export const complexScope = 'complex-fenix-scope space-y-6 font-body';

export const complexPageWrap = 'mx-auto w-full max-w-5xl space-y-6';

/** Formulario agregar/editar caso */
export const complexFormRoot =
  'complex-fenix-scope min-h-full w-full bg-fenix-fondo p-2 dark:bg-[#0F0F0F] sm:p-4';

export const complexFormShell =
  'mx-auto w-full max-w-5xl space-y-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A] sm:space-y-6 sm:p-6';

export const complexFormTabsWrap =
  'flex flex-wrap gap-1 overflow-x-auto border-b border-gray-200 pb-px dark:border-gray-800';

export const complexFormTabActive =
  'whitespace-nowrap border-b-2 border-fenix-primario px-3 py-2.5 font-body text-sm font-semibold text-fenix-primario dark:border-fenix-primario dark:text-red-400';

export const complexFormTabIdle =
  'whitespace-nowrap px-3 py-2.5 font-body text-sm font-medium text-gray-500 transition hover:text-fenix-primario dark:text-gray-400 dark:hover:text-red-400';

/** Pestañas de navegación superior (Dashboard, Reporte, etc.) */
export const complexNavTabActive =
  'inline-flex items-center gap-2 rounded-lg bg-fenix-primario px-3 py-2 font-body text-sm font-semibold text-white shadow-sm';

export const complexNavTabIdle =
  'inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm font-semibold text-gray-700 transition hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:text-red-400';

export const complexInputDisabled =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-body text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300';

export const complexLink =
  'font-semibold text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white';

export const complexAlertError = 'mt-1.5 font-body text-xs font-medium text-fenix-primario';

export const complexAlertWarn =
  'mt-1.5 font-body text-xs font-medium text-amber-700 dark:text-amber-400';

export const complexBtnFormAction =
  'inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-body text-xs font-semibold text-gray-700 transition-colors dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200';

export const complexBtnFormActionSaveHover =
  'hover:border-gray-600 hover:bg-gray-600 hover:text-white dark:hover:border-gray-500 dark:hover:bg-gray-500';

export const complexBtnFormActionCancelHover =
  'hover:border-fenix-primario hover:bg-fenix-primario hover:text-white dark:hover:border-red-600 dark:hover:bg-red-700';

/** Popover de ayuda sobre botones del formulario (visible en hover, dentro de la app) */
export const complexFormHintPopover =
  'absolute bottom-full right-0 z-30 mb-2 w-max max-w-[260px] rounded-xl border border-gray-200 bg-white px-4 py-3 text-center font-body text-xs font-medium leading-snug text-gray-700 shadow-lg dark:border-gray-700 dark:bg-[#252525] dark:text-gray-200';

/** Contenedor de reportes/tablas: ancho completo del área de trabajo (sin max-width fijo) */
export const complexReportRoot =
  'min-h-full w-full min-w-0 bg-fenix-fondo p-2 dark:bg-[#0F0F0F] sm:p-4';

export const complexPageWrapWide = 'w-full min-w-0 space-y-4 sm:space-y-6';

export const complexCard =
  'rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A] sm:p-6';

export const complexSectionTitle =
  'mb-5 flex items-center gap-2 border-l-4 border-fenix-primario pl-3 font-heading text-lg font-bold text-gray-900 dark:text-white sm:text-xl';

export const complexSubsectionTitle =
  'mb-4 font-heading text-base font-bold text-gray-800 dark:text-white';

export const complexLabel =
  'mb-1.5 block font-body text-sm font-semibold text-gray-700 dark:text-gray-300';

export const complexInput =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-body text-sm text-gray-800 placeholder:text-gray-400 focus:border-fenix-primario focus:outline-none focus:ring-2 focus:ring-fenix-primario/20 dark:border-gray-700 dark:bg-[#1A1A1A] dark:text-gray-200';

export const complexTextarea = `${complexInput} min-h-[100px] resize-y`;

export const complexSelect = complexInput;

export const complexHint =
  'mt-1.5 font-body text-xs text-gray-500 dark:text-gray-400';

export const complexBtnPrimary =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fenix-primario px-4 py-2.5 font-body text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60';

export const complexBtnSecondary =
  'inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-body text-xs font-semibold text-gray-700 transition hover:border-fenix-primario/40 hover:text-fenix-primario dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200';

/** Eliminar — único acento rojo (borde/texto; plataforma fría) */
export const complexBtnDanger =
  'inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 font-body text-xs font-semibold text-fenix-primario transition hover:bg-red-50 dark:border-red-900/40 dark:bg-gray-900 dark:hover:bg-red-950/30';

const complexTableBtnBase =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-body text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

/** Acciones de fila — neutro frío (grises; misma línea que expressDocBtn) */
export const complexTableBtnNeutral =
  `${complexTableBtnBase} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800`;

export const complexTableBtnAjuste = complexTableBtnNeutral;
export const complexTableBtnGestionar = complexTableBtnNeutral;
export const complexTableBtnEliminar = complexBtnDanger;

export const complexBtnGhost =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-transparent px-3 py-1.5 font-body text-xs font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900';

export const complexAccordionWrap = 'space-y-3';

export const complexDropzoneBase =
  'cursor-pointer rounded-xl border-2 border-dashed border-gray-200 p-6 text-center transition-colors dark:border-gray-700';

export const complexDropzoneActive =
  'border-fenix-primario bg-red-50/60 dark:border-fenix-primario dark:bg-red-950/30';

export const complexDocRow =
  'flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-900/40';

export const complexInfoPanel =
  'rounded-xl border border-red-100 bg-red-50/50 p-4 dark:border-red-900/40 dark:bg-red-950/20';

export const complexTableWrap =
  'w-full min-w-0 overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]';

export const complexTableHead =
  'bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-900/50 dark:text-gray-400';

/** Tabla con rejilla: líneas verticales muy suaves entre columnas */
export const complexTableGrid = 'min-w-full border-collapse';

export const complexTableThDivider =
  'border-r border-gray-100/80 px-4 py-3 text-left last:border-r-0 dark:border-gray-800/35';

export const complexTableTdDivider =
  'border-r border-gray-100/80 px-4 py-3 last:border-r-0 dark:border-gray-800/35';

export const complexModalOverlay =
  'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4';

export const complexModalShell =
  'w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#1A1A1A]';

/** Dashboard Complex — alineado con Express / README-fenix-dashboard-colores */
export const complexDashboardRoot = complexReportRoot;
export const complexDashboardWrap = complexPageWrapWide;

export const complexBadge =
  'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 font-body text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300';

export const complexPageTitle =
  'font-heading text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl';

export const complexPageSubtitle = 'mt-1 font-body text-sm text-gray-600 dark:text-gray-400';

export const complexCardHeader =
  'border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6';

export const complexCardBody = 'px-5 py-5 sm:px-6 sm:py-6';

export const complexMetricCard =
  'rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]';

export const complexChartCard =
  'rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A] sm:p-6';

export const complexFilterPanel =
  'mt-4 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900/30';

export const complexTableSimple =
  'w-full font-body text-xs text-gray-800 dark:text-gray-200 sm:text-sm';

export {
  buildPieLegendPayload,
  dominioPorcentajeAcotado,
  getFenixChartColor,
  getFenixLineChartColors,
  getFenixNeutralBarColor,
} from '../../theme/fenixChartPalette.js';
