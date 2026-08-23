import React, { useCallback, useMemo, useState } from 'react';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosAlfa } from '../../services/segurosAlfaService.js';
import {
  ESTADOS_ALFA,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  contarKpisGestionAlfa,
  fechaEnRango,
  formatCurrency,
} from './segurosAlfaHelpers.js';

function AlfaKpisGestionStrip({ casos = [] }) {
  const kpis = useMemo(() => contarKpisGestionAlfa(casos), [casos]);
  return (
    <div className="mb-4 space-y-2">
      <h2 className="font-heading text-sm font-semibold text-gray-700 dark:text-gray-200">
        Tablero gestión (lineamiento Alfa)
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Sin contactar', kpis.sinContactar],
          ['Contactado y programado', kpis.contactadoProgramado],
          ['Inspeccionado', kpis.inspeccionado],
          ['Solicitud docs', kpis.solicitudDocumentos],
          ['Sin respuesta', kpis.sinRespuesta],
          ['Definidos', kpis.definidos],
        ].map(([label, n]) => (
          <div
            key={label}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{n}</div>
          </div>
        ))}
      </div>
      {(kpis.slaVencido > 0 || kpis.fueraDeZona > 0) && (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          SLA vencidos: {kpis.slaVencido} · Fuera de zona: {kpis.fueraDeZona}
        </p>
      )}
    </div>
  );
}

export default function DashboardSegurosAlfa() {
  const [casos, setCasos] = useState([]);
  const fetchCasos = useCallback(async () => {
    const lista = await fetchAllCasosAlfa();
    setCasos(lista);
    return lista;
  }, []);

  return (
    <div className="min-h-full w-full">
      <div className="px-4 pt-4 sm:px-6">
        <AlfaKpisGestionStrip casos={casos} />
      </div>
      <DashboardCatastrofico
        badge="Seguros Alfa"
        fetchCasos={fetchCasos}
        formatCurrency={formatCurrency}
        fechaEnRango={fechaEnRango}
        coincideFiltroTexto={coincideFiltroTexto}
        buildOpcionesFiltro={buildOpcionesFiltro}
        estados={ESTADOS_ALFA}
        i18nNs="segurosAlfa"
        boletinPath="/seguros-alfa/boletin"
      />
    </div>
  );
}
