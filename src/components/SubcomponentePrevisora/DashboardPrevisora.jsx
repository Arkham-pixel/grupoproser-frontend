import React from 'react';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosPrevisora } from '../../services/previsoraService.js';
import {
  ESTADOS_PREVISORA,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
} from './previsoraHelpers.js';

export default function DashboardPrevisora() {
  return (
    <DashboardCatastrofico
      badge="Previsora · CAT"
      fetchCasos={fetchAllCasosPrevisora}
      formatCurrency={formatCurrency}
      fechaEnRango={fechaEnRango}
      coincideFiltroTexto={coincideFiltroTexto}
      buildOpcionesFiltro={buildOpcionesFiltro}
      estados={ESTADOS_PREVISORA}
      i18nNs="previsora"
      extras={{ severidad: true }}
    />
  );
}
