import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaChartBar } from 'react-icons/fa';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosZurichListado } from '../../services/zurichListadoService.js';
import {
  ESTADOS_ZURICH,
  BLOQUES_SUMA_ZURICH,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
  homologarEstadoZurich,
} from './zurichHelpers.js';
import { expressBtnSecondary } from '../SubcomponenteExpress/expressFenixUi.js';

/**
 * Dashboard operativo Zurich (vista gerencial + franjas).
 * Independiente de la Torre de control (`/zurich/listado/dashboard`).
 * Misma cartera del listado cliente.
 */
export default function DashboardZurichOperativo() {
  const { t } = useTranslation();

  return (
    <div className="min-h-full w-full">
      <div className="flex flex-wrap items-center justify-end gap-2 px-4 pt-4 sm:px-6">
        <Link to="/zurich/listado/dashboard" className={expressBtnSecondary}>
          <FaChartBar /> {t('nav.zurichListadoDashboard')}
        </Link>
      </div>
      <DashboardCatastrofico
        badge={t('zurich.listadoOperativo.badge')}
        title={t('zurich.listadoOperativo.title')}
        subtitle={t('zurich.listadoOperativo.subtitle')}
        fetchCasos={fetchAllCasosZurichListado}
        formatCurrency={formatCurrency}
        fechaEnRango={fechaEnRango}
        coincideFiltroTexto={coincideFiltroTexto}
        buildOpcionesFiltro={buildOpcionesFiltro}
        estados={ESTADOS_ZURICH}
        normalizarEstadoFn={homologarEstadoZurich}
        i18nNs="zurich"
        modulo="zurich"
        mostrarVistaGerencial
        mostrarFranjasEstado
        bloquesSuma={[...BLOQUES_SUMA_ZURICH]}
      />
    </div>
  );
}
