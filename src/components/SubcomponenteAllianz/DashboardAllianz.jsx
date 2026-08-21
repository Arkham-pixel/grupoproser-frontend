import React from 'react';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosAllianz } from '../../services/allianzService.js';
import {
  ESTADOS_ALLIANZ,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
} from './allianzHelpers.js';

export default function DashboardAllianz() {
  return (
    <DashboardCatastrofico
      badge="Allianz · CAT"
      fetchCasos={fetchAllCasosAllianz}
      formatCurrency={formatCurrency}
      fechaEnRango={fechaEnRango}
      coincideFiltroTexto={coincideFiltroTexto}
      buildOpcionesFiltro={buildOpcionesFiltro}
      estados={ESTADOS_ALLIANZ}
      i18nNs="allianz"
      extras={{ severidad: true }}
    />
  );
}
