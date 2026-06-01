import React from 'react';

/**
 * Título de bloque dentro de una sección de la matriz (sin duplicar cabecera global).
 */
export default function MatrizSeccionTitulo({ icon: Icon, title, description, actions }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h3 className="flex items-center gap-2 border-l-4 border-fenix-primario pl-3 font-heading text-lg font-bold text-gray-800 dark:text-white">
          {Icon && <Icon className="shrink-0 text-fenix-primario" aria-hidden />}
          {title}
        </h3>
        {description && (
          <p className="mt-1 pl-3 font-body text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
