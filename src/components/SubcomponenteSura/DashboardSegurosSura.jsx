import React, { useEffect, useMemo, useState } from 'react';
import DashboardCatastrofico from '../SubcomponenteDashboardCatastrofico/DashboardCatastrofico.jsx';
import { fetchAllCasosSura } from '../../services/segurosSuraService.js';
import { listarFacilitadoresSura } from '../../services/suraFacilitadoresService.js';
import { esSesionFacilitadoresSura } from '../../utils/permisosCasoPorRol.js';
import {
  ESTADOS_SURA,
  BLOQUES_SUMA_SURA,
  buildOpcionesFiltro,
  coincideFiltroTexto,
  fechaEnRango,
  formatCurrency,
  normalizarEstadoSura,
} from './segurosSuraHelpers.js';
import {
  contarPorEstadoFacilitador,
  deduplicarFilasFacilitadores,
} from './suraFacilitadoresHelpers.js';

/** Cierre del portal facilitadores (fuera de la cartera). */
const ESTADOS_FAC_CIERRE = [
  'Tramitado',
  'Anulado',
  'Desistido',
  'Objetado',
  'Cancelado Sura',
];

export default function DashboardSegurosSura() {
  const puedeFacilitadores = esSesionFacilitadoresSura();
  const [filasFac, setFilasFac] = useState([]);

  useEffect(() => {
    if (!puedeFacilitadores) return undefined;
    let cancel = false;
    (async () => {
      try {
        const data = await listarFacilitadoresSura();
        if (!cancel) setFilasFac(deduplicarFilasFacilitadores(data));
      } catch {
        if (!cancel) setFilasFac([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [puedeFacilitadores]);

  const porEstadoFacilitador = useMemo(
    () => contarPorEstadoFacilitador(filasFac),
    [filasFac]
  );

  const franjasExtra =
    puedeFacilitadores && filasFac.length > 0
      ? {
          titulo: 'Estados facilitador',
          subtitulo: `Plantilla facilitadores · ${filasFac.length} filas · suman 100%`,
          items: porEstadoFacilitador.map((r) => ({
            clave: r.estado,
            label: r.nombre,
            cantidad: r.cantidad,
          })),
          total: filasFac.length,
        }
      : null;

  const chartBesideStatus =
    puedeFacilitadores && filasFac.length > 0
      ? {
          title: 'Casos por estado facilitador',
          data: porEstadoFacilitador.map((r) => ({
            nombre: r.nombre,
            cantidad: r.cantidad,
          })),
          seriesName: 'Casos',
          labelWidth: 130,
          labelMax: 22,
        }
      : null;

  const bloquesSuma = useMemo(() => [...BLOQUES_SUMA_SURA], []);

  const tarjetasSumaExtra = useMemo(() => {
    if (!puedeFacilitadores || filasFac.length === 0) return null;
    const mapa = new Map(porEstadoFacilitador.map((r) => [r.estado, r.cantidad]));
    return [
      {
        id: 'cierre-facilitador',
        titulo: 'Cierre facilitador',
        subtitulo: 'Tramitado · Anulado · Desistido · Objetado · Cancelado Sura',
        totalBase: filasFac.length,
        desglose: ESTADOS_FAC_CIERRE.map((estado) => ({
          clave: estado,
          label: estado,
          cantidad: mapa.get(estado) || 0,
        })),
      },
    ];
  }, [puedeFacilitadores, filasFac.length, porEstadoFacilitador]);

  return (
    <DashboardCatastrofico
      badge="Seguros Sura"
      modulo="sura"
      fetchCasos={fetchAllCasosSura}
      formatCurrency={formatCurrency}
      fechaEnRango={fechaEnRango}
      coincideFiltroTexto={coincideFiltroTexto}
      buildOpcionesFiltro={buildOpcionesFiltro}
      estados={[...ESTADOS_SURA, 'OTROS']}
      i18nNs="segurosSura"
      boletinPath="/sura/boletin"
      extras={{ horas: true }}
      normalizarEstadoFn={normalizarEstadoSura}
      mostrarVistaGerencial
      mostrarFranjasEstado
      franjasExtra={franjasExtra}
      chartBesideStatus={chartBesideStatus}
      bloquesSuma={bloquesSuma}
      tarjetasSumaExtra={tarjetasSumaExtra}
    />
  );
}
