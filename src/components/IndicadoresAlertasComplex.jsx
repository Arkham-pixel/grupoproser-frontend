import { useTranslation } from 'react-i18next';
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

function esUsuarioConTabsRestringidos() {
  const login = String(localStorage.getItem('login') || '').trim();
  const cedula = String(localStorage.getItem('cedula') || '').trim();
  return login === LOGIN_SUPERVISOR_BANDEJA || cedula === LOGIN_SUPERVISOR_BANDEJA;
}

export default function IndicadoresAlertasComplex() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const puedeVerTabsRestringidos = esUsuarioConTabsRestringidos();

  const tabs = useMemo(() => {
    const base = [
      { id: 'historicos', label: t('complex.ui.indicadores_alertas_complex.tab_historicos') },
      { id: 'protocolo', label: t('complex.ui.indicadores_alertas_complex.tab_protocolo') },
      { id: 'informe', label: t('complex.ui.indicadores_alertas_complex.tab_informe') },
    ];
    if (!puedeVerTabsRestringidos) return base;
    return [
      ...base,
      { id: 'manual', label: t('complex.ui.indicadores_alertas_complex.tab_manual') },
      { id: 'alertas', label: t('complex.ui.indicadores_alertas_complex.tab_alertas') },
    ];
  }, [puedeVerTabsRestringidos, t]);
  const tabValidos = useMemo(() => new Set(tabs.map((tab) => tab.id)), [tabs]);

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
          title={t("complex.ui.indicadores_alertas_complex.indicadores_y_alertas")}
          subtitle={
            puedeVerTabsRestringidos
              ? t('complex.ui.indicadores_alertas_complex.subtitle_full')
              : t('complex.ui.indicadores_alertas_complex.subtitle_base')
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
