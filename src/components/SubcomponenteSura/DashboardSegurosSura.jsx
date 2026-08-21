import React from 'react';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosSura } from '../../services/segurosSuraService.js';
import {
  ESTADOS_SURA,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
} from './segurosSuraHelpers.js';

export default function DashboardSegurosSura() {
  return (
    <DashboardCatastrofico
      badge="Seguros Sura"
      modulo="sura"
      fetchCasos={fetchAllCasosSura}
      formatCurrency={formatCurrency}
      fechaEnRango={fechaEnRango}
      coincideFiltroTexto={coincideFiltroTexto}
      buildOpcionesFiltro={buildOpcionesFiltro}
      estados={ESTADOS_SURA}
      i18nNs="segurosSura"
      boletinPath="/sura/boletin"
      extras={{ horas: true }}
    />
  );
}
