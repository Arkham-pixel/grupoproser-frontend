import React from 'react';
import { useTranslation } from 'react-i18next';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosBbvaCatListado } from '../../services/bbvaCatListadoService.js';
import {
  ESTADOS_BBVA_CAT,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
} from './bbvaCatHelpers.js';

export default function DashboardBbvaCatListado() {
  const { t } = useTranslation();
  return (
    <DashboardCatastrofico
      variant="listado"
      badge="BBVA CAT · Listado"
      title={t('bbvaCat.listadoDashboard.title')}
      subtitle={t('bbvaCat.listadoDashboard.subtitle')}
      fetchCasos={fetchAllCasosBbvaCatListado}
      formatCurrency={formatCurrency}
      fechaEnRango={fechaEnRango}
      coincideFiltroTexto={coincideFiltroTexto}
      buildOpcionesFiltro={buildOpcionesFiltro}
      estados={ESTADOS_BBVA_CAT}
      i18nNs="bbvaCat"
      modulo="bbvaCat"
    />
  );
}
