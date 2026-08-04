import React from 'react';
import { FaEraser, FaSearch } from 'react-icons/fa';
import {
  FILTROS_PUERTOS_VACIOS,
  OPCIONES_TIPO,
} from './puertosActasTrazabilidad';
import {
  puertosBtnLink,
  puertosBtnSecondary,
  puertosCard,
  puertosCardBody,
  puertosInput,
  puertosLabel,
} from './puertosFenixUi';

export default function PuertosActasFiltros({
  filtros,
  onChange,
  onBuscar,
  onLimpiar,
  cargando = false,
  total = 0,
  ocultarTipo = false,
  tituloExtra = '',
}) {
  const set = (campo, valor) => onChange({ ...filtros, [campo]: valor });

  return (
    <section className={puertosCard}>
      <div className={puertosCardBody}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-heading text-base font-bold text-gray-900 dark:text-white">
              Filtros de búsqueda{tituloExtra ? ` — ${tituloExtra}` : ''}
            </h3>
            <p className="font-body text-xs text-gray-500 dark:text-gray-400">
              {total} registro(s) coincidente(s)
            </p>
          </div>
          <button type="button" onClick={onLimpiar} className={puertosBtnLink}>
            <FaEraser /> Limpiar filtros
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block sm:col-span-2">
            <span className={puertosLabel}>Buscar</span>
            <input
              className={puertosInput}
              value={filtros.q}
              onChange={(e) => set('q', e.target.value)}
              placeholder="Consecutivo, solicitud, cliente, exportador…"
              onKeyDown={(e) => e.key === 'Enter' && onBuscar()}
            />
          </label>

          {!ocultarTipo && (
            <label className="block">
              <span className={puertosLabel}>Tipo</span>
              <select
                className={puertosInput}
                value={filtros.tipo}
                onChange={(e) => set('tipo', e.target.value)}
              >
                {OPCIONES_TIPO.map((o) => (
                  <option key={o.value || 'todos'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className={puertosLabel}>Regional / Ciudad</span>
            <input
              className={puertosInput}
              value={filtros.regional}
              onChange={(e) => set('regional', e.target.value)}
              placeholder="Ej: BARRANQUILLA"
            />
          </label>

          <label className="block">
            <span className={puertosLabel}>Cliente</span>
            <input
              className={puertosInput}
              value={filtros.cliente}
              onChange={(e) => set('cliente', e.target.value)}
              placeholder="Ej: SEGUROS BOLÍVAR"
            />
          </label>

          <label className="block">
            <span className={puertosLabel}>Fecha desde</span>
            <input
              type="date"
              className={puertosInput}
              value={filtros.fechaDesde}
              onChange={(e) => set('fechaDesde', e.target.value)}
            />
          </label>

          <label className="block">
            <span className={puertosLabel}>Fecha hasta</span>
            <input
              type="date"
              className={puertosInput}
              value={filtros.fechaHasta}
              onChange={(e) => set('fechaHasta', e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onBuscar} disabled={cargando} className={puertosBtnSecondary}>
            <FaSearch /> {cargando ? 'Buscando…' : 'Aplicar filtros'}
          </button>
        </div>
      </div>
    </section>
  );
}

export { FILTROS_PUERTOS_VACIOS };
