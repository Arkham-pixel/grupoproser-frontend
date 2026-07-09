import React from 'react';
import { useSearchParams } from 'react-router-dom';
import IndicadoresHistoricosComplex from './IndicadoresHistoricosComplex.jsx';
import IndicadoresProtocoloComplex from './IndicadoresProtocoloComplex.jsx';
import InformeIndicadores2025Complex from './InformeIndicadores2025Complex.jsx';
import ManualUtilizacionComplex from './ManualUtilizacionComplex.jsx';
import MisAlertasComplex from './MisAlertasComplex.jsx';
import { ComplexFormTabs } from './SubcomponenteCompex/FacturacionHelpers.jsx';
import { ComplexPageHeader } from './SubcomponenteCompex/ComplexUiBlocks.jsx';
import {
  complexDashboardRoot,
  complexDashboardWrap,
  complexScope,
} from './SubcomponenteCompex/complexFenixUi.js';

const TABS = [
  { id: 'historicos', label: 'Indicadores históricos' },
  { id: 'protocolo', label: 'Indicadores protocolo' },
  { id: 'informe', label: 'Informe 2025' },
  { id: 'manual', label: 'Manual de uso' },
  { id: 'alertas', label: 'Mis alertas' },
];

const TAB_VALIDOS = new Set(TABS.map((t) => t.id));

export default function IndicadoresAlertasComplex() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'protocolo';
  const tabActiva = TAB_VALIDOS.has(tabParam) ? tabParam : 'protocolo';

  const cambiarTab = (id) => {
    setSearchParams({ tab: id }, { replace: true });
  };

  return (
    <div className={complexDashboardRoot}>
      <div className={`${complexScope} ${complexDashboardWrap}`}>
        <ComplexPageHeader
          badge="Complex"
          title="Indicadores y alertas"
          subtitle="Históricos de gestión, cumplimiento del protocolo, informe anual, manual de uso y alertas."
          activePath="/complex/indicadores-alertas"
        />

        <ComplexFormTabs tabs={TABS} activeId={tabActiva} onChange={cambiarTab} />

        <div className="mt-6">
          {tabActiva === 'historicos' && <IndicadoresHistoricosComplex embedded />}
          {tabActiva === 'protocolo' && <IndicadoresProtocoloComplex embedded />}
          {tabActiva === 'informe' && <InformeIndicadores2025Complex embedded />}
          {tabActiva === 'manual' && <ManualUtilizacionComplex embedded />}
          {tabActiva === 'alertas' && <MisAlertasComplex embedded />}
        </div>
      </div>
    </div>
  );
}
