import React from 'react';
import { useTranslation } from 'react-i18next';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosEquidadCat } from '../../services/equidadCatService.js';
import {
  ESTADOS_EQUIDAD_CAT,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
} from './equidadCatHelpers.js';

export default function DashboardEquidadCat() {
  const { t } = useTranslation();
  return (
    <DashboardCatastrofico
      variant="listado"
      badge="Equidad CAT"
      title={t('equidadCat.listadoDashboard.title')}
      subtitle={t('equidadCat.listadoDashboard.subtitle')}
      fetchCasos={fetchAllCasosEquidadCat}
      formatCurrency={formatCurrency}
      fechaEnRango={fechaEnRango}
      coincideFiltroTexto={coincideFiltroTexto}
      buildOpcionesFiltro={buildOpcionesFiltro}
      estados={ESTADOS_EQUIDAD_CAT}
      i18nNs="equidadCat"
    />
  );
}
