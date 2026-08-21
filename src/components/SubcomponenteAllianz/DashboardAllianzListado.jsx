import React from 'react';
import { useTranslation } from 'react-i18next';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosAllianzListado } from '../../services/allianzListadoService.js';
import {
  ESTADOS_ALLIANZ,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
} from './allianzHelpers.js';

export default function DashboardAllianzListado() {
  const { t } = useTranslation();
  return (
    <DashboardCatastrofico
      variant="listado"
      badge="Allianz · Listado"
      title={t('allianz.listadoDashboard.title')}
      subtitle={t('allianz.listadoDashboard.subtitle')}
      fetchCasos={fetchAllCasosAllianzListado}
      formatCurrency={formatCurrency}
      fechaEnRango={fechaEnRango}
      coincideFiltroTexto={coincideFiltroTexto}
      buildOpcionesFiltro={buildOpcionesFiltro}
      estados={ESTADOS_ALLIANZ}
      i18nNs="allianz"
    />
  );
}
