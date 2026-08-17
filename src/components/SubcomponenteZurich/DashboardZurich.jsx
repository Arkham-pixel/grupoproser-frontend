import React from 'react';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosZurich } from '../../services/zurichService.js';
import {
  ESTADOS_ZURICH,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
} from './zurichHelpers.js';

export default function DashboardZurich() {
  return (
    <DashboardCatastrofico
      badge="Zurich"
      fetchCasos={fetchAllCasosZurich}
      formatCurrency={formatCurrency}
      fechaEnRango={fechaEnRango}
      coincideFiltroTexto={coincideFiltroTexto}
      buildOpcionesFiltro={buildOpcionesFiltro}
      estados={ESTADOS_ZURICH}
      i18nNs="zurich"
      boletinPath="/zurich/boletin"
      extras={{ severidad: true }}
    />
  );
}
