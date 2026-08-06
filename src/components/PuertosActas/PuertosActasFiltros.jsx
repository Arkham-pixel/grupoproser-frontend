import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaEraser, FaSearch } from 'react-icons/fa';
import {
  FILTROS_PUERTOS_VACIOS,
  OPCIONES_TIPO,
} from './puertosActasTrazabilidad';
import { puertosBtnLink, puertosBtnSecondary, puertosCard, puertosCardBody, puertosInput, puertosLabel } from './puertosFenixUi';

const TIPO_LABEL_KEYS = {
  '': 'ports.ui.tipos.todos',
  caso_exportacion: 'ports.ui.tipos.caso_exportacion',
  caso_granel: 'ports.ui.tipos.caso_granel',
  inspeccion_asegurado: 'ports.ui.tipos.inspeccion_asegurado',
  inspeccion_motorysa: 'ports.ui.tipos.inspeccion_motorysa',
  acta: 'ports.ui.tipos.acta',
};

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
  const { t } = useTranslation();
  const set = (campo, valor) => onChange({ ...filtros, [campo]: valor });

  return (
    <section className={puertosCard}>
      <div className={puertosCardBody}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-heading text-base font-bold text-gray-900 dark:text-white">
              {t('ports.ui.filtros.title')}
              {tituloExtra ? ` — ${tituloExtra}` : ''}
            </h3>
            <p className="font-body text-xs text-gray-500 dark:text-gray-400">
              {t('ports.ui.filtros.matching', { count: total })}
            </p>
          </div>
          <button type="button" onClick={onLimpiar} className={puertosBtnLink}>
            <FaEraser /> {t('ports.ui.filtros.clear')}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className={`block ${ocultarTipo ? 'sm:col-span-2' : 'sm:col-span-2'}`}>
            <span className={puertosLabel}>{t('ports.ui.filtros.search')}</span>
            <input
              className={puertosInput}
              value={filtros.q}
              onChange={(e) => set('q', e.target.value)}
              placeholder={t('ports.ui.filtros.searchPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && onBuscar()}
            />
          </label>

          {!ocultarTipo && (
            <label className="block">
              <span className={puertosLabel}>{t('ports.ui.filtros.type')}</span>
              <select
                className={puertosInput}
                value={filtros.tipo}
                onChange={(e) => set('tipo', e.target.value)}
              >
                {OPCIONES_TIPO.map((o) => (
                  <option key={o.value || 'todos'} value={o.value}>
                    {t(TIPO_LABEL_KEYS[o.value] || 'ports.ui.tipos.todos')}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className={puertosLabel}>{t('ports.ui.filtros.regional')}</span>
            <input
              className={puertosInput}
              value={filtros.regional}
              onChange={(e) => set('regional', e.target.value)}
              placeholder={t('ports.ui.filtros.regionalPlaceholder')}
            />
          </label>

          <label className="block">
            <span className={puertosLabel}>{t('ports.ui.filtros.client')}</span>
            <input
              className={puertosInput}
              value={filtros.cliente}
              onChange={(e) => set('cliente', e.target.value)}
              placeholder={t('ports.ui.filtros.clientPlaceholder')}
            />
          </label>

          <label className="block">
            <span className={puertosLabel}>{t('ports.ui.filtros.dateFrom')}</span>
            <input
              type="date"
              className={puertosInput}
              value={filtros.fechaDesde}
              onChange={(e) => set('fechaDesde', e.target.value)}
            />
          </label>

          <label className="block">
            <span className={puertosLabel}>{t('ports.ui.filtros.dateTo')}</span>
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
            <FaSearch /> {cargando ? t('ports.ui.filtros.searching') : t('ports.ui.filtros.apply')}
          </button>
        </div>
      </div>
    </section>
  );
}

export { FILTROS_PUERTOS_VACIOS };
