import React from 'react';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosZurich } from '../../services/zurichService.js';
import {
  ESTADOS_ZURICH,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
  homologarEstadoZurich,
} from './zurichHelpers.js';

export default function DashboardZurich() {
  return (
    <DashboardCatastrofico
      badge="Zurich · CAT"
      fetchCasos={fetchAllCasosZurich}
      formatCurrency={formatCurrency}
      fechaEnRango={fechaEnRango}
      coincideFiltroTexto={coincideFiltroTexto}
      buildOpcionesFiltro={buildOpcionesFiltro}
      estados={ESTADOS_ZURICH}
      normalizarEstadoFn={homologarEstadoZurich}
      i18nNs="zurich"
      extras={{ severidad: true }}
    />
  );
}
