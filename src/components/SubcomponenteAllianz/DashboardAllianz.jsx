import React from 'react';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosAllianz } from '../../services/allianzService.js';
import {
  BLOQUES_SUMA_ALLIANZ,
  ESTADOS_ALLIANZ,
  buildOpcionesFiltro,
  coincideFiltroCiudadAllianz,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
  homologarEstadoAllianz,
} from './allianzHelpers.js';

export default function DashboardAllianz() {
  return (
    <DashboardCatastrofico
      badge="Allianz · CAT"
      fetchCasos={fetchAllCasosAllianz}
      formatCurrency={formatCurrency}
      fechaEnRango={fechaEnRango}
      coincideFiltroTexto={coincideFiltroTexto}
      coincideFiltroCiudad={coincideFiltroCiudadAllianz}
      buildOpcionesFiltro={buildOpcionesFiltro}
      estados={ESTADOS_ALLIANZ}
      normalizarEstadoFn={homologarEstadoAllianz}
      i18nNs="allianz"
      modulo="allianz"
      extras={{ severidad: true }}
      mostrarVistaGerencial
      mostrarFranjasEstado
      bloquesSuma={[...BLOQUES_SUMA_ALLIANZ]}
    />
  );
}
