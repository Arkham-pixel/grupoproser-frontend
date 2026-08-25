import React from 'react';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosBbvaCat } from '../../services/bbvaCatService.js';
import {
  ESTADOS_BBVA_CAT,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
} from './bbvaCatHelpers.js';

export default function DashboardBbvaCat() {
  return (
    <DashboardCatastrofico
      badge="BBVA CAT · CAT"
      fetchCasos={fetchAllCasosBbvaCat}
      formatCurrency={formatCurrency}
      fechaEnRango={fechaEnRango}
      coincideFiltroTexto={coincideFiltroTexto}
      buildOpcionesFiltro={buildOpcionesFiltro}
      estados={ESTADOS_BBVA_CAT}
      i18nNs="bbvaCat"
      extras={{ severidad: true }}
      modulo="bbvaCat"
    />
  );
}
