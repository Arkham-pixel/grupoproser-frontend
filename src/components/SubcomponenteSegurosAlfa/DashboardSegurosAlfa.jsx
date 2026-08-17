import React from 'react';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosAlfa } from '../../services/segurosAlfaService.js';
import {
  ESTADOS_ALFA,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
} from './segurosAlfaHelpers.js';

export default function DashboardSegurosAlfa() {
  return (
    <DashboardCatastrofico
      badge="Seguros Alfa"
      fetchCasos={fetchAllCasosAlfa}
      formatCurrency={formatCurrency}
      fechaEnRango={fechaEnRango}
      coincideFiltroTexto={coincideFiltroTexto}
      buildOpcionesFiltro={buildOpcionesFiltro}
      estados={ESTADOS_ALFA}
      i18nNs="segurosAlfa"
      boletinPath="/seguros-alfa/boletin"
    />
  );
}
