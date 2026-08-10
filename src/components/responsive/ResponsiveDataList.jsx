import { useIsMobileContent } from '../../hooks/useMediaQuery';

/**
 * Tabla en md+; lista de cards en móvil.
 *
 * @param {object} props
 * @param {React.ReactNode} props.table - Markup de tabla (desktop)
 * @param {Array} props.items - Items para cards
 * @param {(item: any, index: number) => React.ReactNode} props.renderCard
 * @param {string} [props.emptyLabel]
 * @param {string} [props.className]
 * @param {string} [props.cardsClassName]
 */
export default function ResponsiveDataList({
  table,
  items = [],
  renderCard,
  emptyLabel = 'Sin registros',
  className = '',
  cardsClassName = 'space-y-3',
}) {
  const isMobile = useIsMobileContent();

  if (!isMobile) {
    return <div className={className}>{table}</div>;
  }

  if (!items.length) {
    return (
      <div className={`rounded-xl border border-dashed border-gray-300 bg-white/60 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400 ${className}`}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={`${cardsClassName} ${className}`}>
      {items.map((item, index) => (
        <div key={item?.id ?? item?._id ?? index}>{renderCard(item, index)}</div>
      ))}
    </div>
  );
}
