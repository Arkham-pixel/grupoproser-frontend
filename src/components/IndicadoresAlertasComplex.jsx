import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import IndicadoresHistoricosComplex from './IndicadoresHistoricosComplex.jsx';
import IndicadoresProtocoloComplex from './IndicadoresProtocoloComplex.jsx';
import InformeIndicadores2025Complex from './InformeIndicadores2025Complex.jsx';
import ManualUtilizacionComplex from './ManualUtilizacionComplex.jsx';
import MisAlertasComplex from './MisAlertasComplex.jsx';
import { LOGIN_SUPERVISOR_BANDEJA } from '../config/gerentesFacturacion.js';
import { ComplexFormTabs } from './SubcomponenteCompex/FacturacionHelpers.jsx';
import { ComplexPageHeader } from './SubcomponenteCompex/ComplexUiBlocks.jsx';
import {
  complexDashboardRoot,
  complexDashboardWrap,
  complexScope,
} from './SubcomponenteCompex/complexFenixUi.js';

const TABS_BASE = [
  { id: 'historicos', label: 'Indicadores históricos' },
  { id: 'protocolo', label: 'Indicadores protocolo' },
  { id: 'informe', label: 'Informe general' },
];

const TABS_SOLO_OSCAR = [
  { id: 'manual', label: 'Manual de uso' },
  { id: 'alertas', label: 'Mis alertas' },
];

function esUsuarioConTabsRestringidos() {
  const login = String(localStorage.getItem('login') || '').trim();
  const cedula = String(localStorage.getItem('cedula') || '').trim();
  return login === LOGIN_SUPERVISOR_BANDEJA || cedula === LOGIN_SUPERVISOR_BANDEJA;
}

export default function IndicadoresAlertasComplex() {
  const [searchParams, setSearchParams] = useSearchParams();
  const puedeVerTabsRestringidos = esUsuarioConTabsRestringidos();

  const tabs = useMemo(
    () => (puedeVerTabsRestringidos ? [...TABS_BASE, ...TABS_SOLO_OSCAR] : TABS_BASE),
    [puedeVerTabsRestringidos]
  );
  const tabValidos = useMemo(() => new Set(tabs.map((t) => t.id)), [tabs]);

  const tabParam = searchParams.get('tab') || 'protocolo';
  const tabActiva = tabValidos.has(tabParam) ? tabParam : 'protocolo';

  const cambiarTab = (id) => {
    setSearchParams({ tab: id }, { replace: true });
  };

  return (
    <div className={complexDashboardRoot}>
      <div className={`${complexScope} ${complexDashboardWrap}`}>
        <ComplexPageHeader
          badge="Complex"
          title="Indicadores y alertas"
          subtitle={
            puedeVerTabsRestringidos
              ? 'Históricos de gestión, cumplimiento del protocolo, informe general, manual de uso y alertas.'
              : 'Históricos de gestión, cumplimiento del protocolo e informe general.'
          }
          activePath="/complex/indicadores-alertas"
        />

        <ComplexFormTabs tabs={tabs} activeId={tabActiva} onChange={cambiarTab} />

        <div className="mt-6">
          {tabActiva === 'historicos' && <IndicadoresHistoricosComplex embedded />}
          {tabActiva === 'protocolo' && <IndicadoresProtocoloComplex embedded />}
          {tabActiva === 'informe' && <InformeIndicadores2025Complex embedded />}
          {tabActiva === 'manual' && puedeVerTabsRestringidos && (
            <ManualUtilizacionComplex embedded />
          )}
          {tabActiva === 'alertas' && puedeVerTabsRestringidos && <MisAlertasComplex embedded />}
        </div>
      </div>
    </div>
  );
}
