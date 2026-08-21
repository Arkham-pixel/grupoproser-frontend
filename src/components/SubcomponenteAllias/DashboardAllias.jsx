import React from 'react';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosAllias } from '../../services/alliasService.js';
import {
  ESTADOS_ALLIAS,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
} from './alliasHelpers.js';

export default function DashboardAllias() {
  return (
    <DashboardCatastrofico
      badge="Allias · CAT"
      fetchCasos={fetchAllCasosAllias}
      formatCurrency={formatCurrency}
      fechaEnRango={fechaEnRango}
      coincideFiltroTexto={coincideFiltroTexto}
      buildOpcionesFiltro={buildOpcionesFiltro}
      estados={ESTADOS_ALLIAS}
      i18nNs="allias"
      extras={{ severidad: true }}
    />
  );
}
