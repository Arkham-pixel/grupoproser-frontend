import React from 'react';
import { useTranslation } from 'react-i18next';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosZurichListado } from '../../services/zurichListadoService.js';
import {
  ESTADOS_ZURICH,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
} from './zurichHelpers.js';

export default function DashboardZurichListado() {
  const { t } = useTranslation();
  return (
    <DashboardCatastrofico
      variant="listado"
      badge="Zurich · Listado"
      title={t('zurich.listadoDashboard.title')}
      subtitle={t('zurich.listadoDashboard.subtitle')}
      fetchCasos={fetchAllCasosZurichListado}
      formatCurrency={formatCurrency}
      fechaEnRango={fechaEnRango}
      coincideFiltroTexto={coincideFiltroTexto}
      buildOpcionesFiltro={buildOpcionesFiltro}
      estados={ESTADOS_ZURICH}
      i18nNs="zurich"
    />
  );
}
