import React from 'react';
import { FaChartBar } from 'react-icons/fa';
import { matrizCard, matrizCardTitle } from './matrizFenixUi';
import { BENEFICIOS_HERRAMIENTA, CATEGORIAS_RIESGO, PASOS_INICIO_RAPIDO } from './matrizContenidoShared';

/** Título de pestaña didáctica */
export function MatrizTabEncabezado({ icon: Icon, title, description }) {
  return (
    <div className={`${matrizCard} mb-4`}>
      <h2 className={matrizCardTitle}>
        {Icon && <Icon className="text-fenix-primario" />}
        {title}
      </h2>
      {description && (
        <p className="font-body text-sm text-gray-600 dark:text-gray-300">{description}</p>
      )}
    </div>
  );
}

/** 3 pasos — Inicio rápido */
export function MatrizPasosGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {PASOS_INICIO_RAPIDO.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.paso}
            className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-fenix-primario/30 hover:shadow-md dark:border-gray-800 dark:bg-[#1A1A1A]"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-fenix-primario dark:bg-red-950/30">
              <Icon className="text-xl" />
            </div>
            <h3 className="font-heading text-base font-bold text-gray-800 dark:text-white">
              {item.paso}. {item.titulo}
            </h3>
            <p className="mt-2 font-body text-sm text-gray-500 dark:text-gray-400">{item.descripcion}</p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-fenix-primario/40 to-transparent opacity-0 transition group-hover:opacity-100" />
          </div>
        );
      })}
    </div>
  );
}

/** Beneficios — ¿Por qué usar esta herramienta? */
export function MatrizBeneficios({ titulo = '¿Por qué usar esta herramienta?' }) {
  return (
    <div className={`${matrizCard} mt-4`}>
      <h3 className="mb-4 text-center font-heading text-lg font-bold text-gray-800 dark:text-white">
        {titulo}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {BENEFICIOS_HERRAMIENTA.map((b) => {
          const Icon = b.icon;
          return (
            <div
              key={b.titulo}
              className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-fenix-primario dark:bg-red-950/30">
                <Icon className="text-lg" />
              </span>
              <div>
                <h4 className="font-heading text-sm font-bold text-gray-800 dark:text-white">{b.titulo}</h4>
                <p className="mt-0.5 font-body text-xs text-gray-500 dark:text-gray-400">{b.descripcion}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Tarjeta de categoría (pestaña Categorías) */
export function MatrizCategoriaCard({ categoria }) {
  const Icon = categoria.icon;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-fenix-primario/25 dark:border-gray-800 dark:bg-[#1A1A1A]">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-fenix-primario dark:bg-red-950/30">
          <Icon />
        </span>
        <h3 className="font-heading text-sm font-bold text-gray-800 dark:text-white">{categoria.etiqueta}</h3>
      </div>
      {categoria.descripcion && (
        <p className="mb-3 font-body text-xs text-gray-600 dark:text-gray-400">{categoria.descripcion}</p>
      )}
      {categoria.ejemplos?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {categoria.ejemplos.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2 py-0.5 font-body text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Grid de 8 categorías */
export function MatrizCategoriasGrid({ descripciones = {} }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {CATEGORIAS_RIESGO.map((cat) => (
        <MatrizCategoriaCard
          key={cat.valor}
          categoria={{
            ...cat,
            descripcion: descripciones[cat.valor] || cat.descripcion,
          }}
        />
      ))}
    </div>
  );
}

/** Resumen identificación — sustituye bloque morado */
export function MatrizResumenIdentificacion({ riesgos = [], categorias = CATEGORIAS_RIESGO }) {
  const procesosUnicos = new Set(riesgos.map((r) => r.nombreProceso).filter(Boolean)).size;
  const tiposUnicos = new Set(riesgos.map((r) => r.tipoProceso).filter(Boolean)).size;

  const metricas = [
    { label: 'Total de riesgos', valor: riesgos.length },
    { label: 'Procesos únicos', valor: procesosUnicos },
    { label: 'Tipos de proceso', valor: tiposUnicos },
  ];

  return (
    <div className={`${matrizCard} resumen-identificacion-fenix`}>
      <h4 className={matrizCardTitle}>
        <FaChartBar className="text-fenix-primario" />
        Resumen de identificación
      </h4>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {metricas.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-center dark:border-gray-800 dark:bg-gray-900/40"
          >
            <p className="font-body text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {m.label}
            </p>
            <p className="mt-1 font-accent text-2xl font-bold text-fenix-primario">{m.valor}</p>
          </div>
        ))}
      </div>

      <p className="mb-3 font-heading text-sm font-semibold text-gray-700 dark:text-gray-300">
        Riesgos por categoría
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {categorias.map((cat) => {
          const Icon = cat.icon;
          const count = riesgos.filter((r) => r.categorias?.[cat.valor]).length;
          return (
            <div
              key={cat.valor}
              className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm dark:border-gray-800 dark:bg-[#141414]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-fenix-primario dark:bg-red-950/30">
                <Icon className="text-sm" />
              </span>
              <span className="min-w-0 flex-1 truncate font-body text-sm text-gray-700 dark:text-gray-300">
                {cat.etiqueta}
              </span>
              <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-fenix-primario px-1.5 text-xs font-bold text-white">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Timeline / paso del proceso */
export function MatrizTimelineItem({ numero, icon: Icon, title, description, tips = [] }) {
  return (
    <div className="flex gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#1A1A1A]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fenix-primario font-heading text-sm font-bold text-white">
        {numero}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          {Icon && <Icon className="text-fenix-primario" />}
          <h3 className="font-heading text-base font-bold text-gray-800 dark:text-white">{title}</h3>
        </div>
        <p className="font-body text-sm text-gray-600 dark:text-gray-300">{description}</p>
        {tips.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {tips.map((tip) => (
              <li
                key={tip}
                className="flex items-start gap-2 font-body text-xs text-gray-500 dark:text-gray-400"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fenix-primario" />
                {tip}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Tarjeta criterio (probabilidad / impacto) */
export function MatrizCriterioCard({ nivel, titulo, descripcion, metricas = [], accent = 'gray' }) {
  const accentMap = {
    green: 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20',
    yellow: 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20',
    orange: 'border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20',
    red: 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20',
    gray: 'border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30',
  };
  return (
    <div className={`rounded-xl border p-4 ${accentMap[accent] || accentMap.gray}`}>
      <div className="mb-2 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-fenix-primario font-heading text-sm font-bold text-white">
          {nivel}
        </span>
        <h4 className="font-heading text-sm font-bold text-gray-800 dark:text-white">{titulo}</h4>
      </div>
      {metricas.length > 0 && (
        <ul className="mb-2 space-y-1 font-body text-xs text-gray-600 dark:text-gray-400">
          {metricas.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      {descripcion && (
        <p className="font-body text-xs italic text-gray-500 dark:text-gray-500">{descripcion}</p>
      )}
    </div>
  );
}

/** Contenedor de sección con título */
export function MatrizSeccionBloque({ title, children, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <h3 className="font-heading text-base font-bold text-gray-800 dark:text-white">{title}</h3>
      )}
      {children}
    </div>
  );
}

/** Mapa de calor — contenedor de un mapa */
export function MatrizMapaBloque({ titulo, children }) {
  return (
    <div className={`${matrizCard} mapa-contenedor-fenix space-y-4`}>
      <h3 className={matrizCardTitle}>{titulo}</h3>
      {children}
    </div>
  );
}
