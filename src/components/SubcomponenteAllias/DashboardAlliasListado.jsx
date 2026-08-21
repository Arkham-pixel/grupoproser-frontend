import React from 'react';
import { useTranslation } from 'react-i18next';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosAlliasListado } from '../../services/alliasListadoService.js';
import {
  ESTADOS_ALLIAS,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
} from './alliasHelpers.js';

export default function DashboardAlliasListado() {
  const { t } = useTranslation();
  return (
    <DashboardCatastrofico
      variant="listado"
      badge="Allias · Listado"
      title={t('allias.listadoDashboard.title')}
      subtitle={t('allias.listadoDashboard.subtitle')}
      fetchCasos={fetchAllCasosAlliasListado}
      formatCurrency={formatCurrency}
      fechaEnRango={fechaEnRango}
      coincideFiltroTexto={coincideFiltroTexto}
      buildOpcionesFiltro={buildOpcionesFiltro}
      estados={ESTADOS_ALLIAS}
      i18nNs="allias"
    />
  );
}
