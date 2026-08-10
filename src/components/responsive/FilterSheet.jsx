import { useEffect } from 'react';
import { FaFilter, FaTimes } from 'react-icons/fa';
import { useIsMobileContent } from '../../hooks/useMediaQuery';

/**
 * Desktop: panel inline. Móvil: botón + sheet inferior.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {(open: boolean) => void} props.onOpenChange
 * @param {React.ReactNode} props.children - Controles de filtro
 * @param {string} [props.title]
 * @param {string} [props.triggerLabel]
 * @param {number} [props.activeCount] - Badge de filtros activos
 * @param {React.ReactNode} [props.footer] - Acciones del sheet (Aplicar / Limpiar)
 * @param {string} [props.className]
 */
export default function FilterSheet({
  open,
  onOpenChange,
  children,
  title = 'Filtros',
  triggerLabel = 'Filtros',
  activeCount = 0,
  footer = null,
  className = '',
}) {
  const isMobile = useIsMobileContent();

  useEffect(() => {
    if (!isMobile || !open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, open]);

  if (!isMobile) {
    return (
      <div className={className}>
        {children}
        {footer}
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
      >
        <FaFilter className="text-fenix-primario" />
        {triggerLabel}
        {activeCount > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-fenix-primario px-1.5 text-[11px] font-bold text-white">
            {activeCount > 99 ? '99+' : activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/45"
            aria-label="Cerrar filtros"
            onClick={() => onOpenChange(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[85vh] flex-col rounded-t-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Cerrar"
              >
                <FaTimes />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
            {footer && (
              <div className="border-t border-gray-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-gray-800">
                {footer}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
