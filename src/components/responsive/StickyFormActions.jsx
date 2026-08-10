/**
 * Barra de acciones fija al fondo en formularios largos (móvil y desktop).
 * Reserva espacio inferior para que el contenido no quede tapado.
 */
export default function StickyFormActions({
  children,
  className = '',
  reserveClassName = 'pb-24',
}) {
  return (
    <>
      <div className={reserveClassName} aria-hidden="true" />
      <div
        className={`sticky bottom-0 z-30 -mx-4 mt-4 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-gray-800 dark:bg-gray-900/95 sm:mx-0 sm:rounded-xl sm:border sm:shadow-lg ${className}`}
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
      </div>
    </>
  );
}
