import React from 'react';
import { useTranslation } from 'react-i18next';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosPrevisoraListado } from '../../services/previsoraListadoService.js';
import {
  ESTADOS_PREVISORA,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
} from './previsoraHelpers.js';

export default function DashboardPrevisoraListado() {
  const { t } = useTranslation();
  return (
    <DashboardCatastrofico
      variant="listado"
      badge="Previsora · Listado"
      title={t('previsora.listadoDashboard.title')}
      subtitle={t('previsora.listadoDashboard.subtitle')}
      fetchCasos={fetchAllCasosPrevisoraListado}
      formatCurrency={formatCurrency}
      fechaEnRango={fechaEnRango}
      coincideFiltroTexto={coincideFiltroTexto}
      buildOpcionesFiltro={buildOpcionesFiltro}
      estados={ESTADOS_PREVISORA}
      i18nNs="previsora"
    />
  );
}
