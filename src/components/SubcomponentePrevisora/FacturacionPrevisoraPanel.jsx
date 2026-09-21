import React from 'react';
import FacturacionAseguradoraPanel from '../shared/FacturacionAseguradoraPanel.jsx';
import { actualizarCasoPrevisora } from '../../services/previsoraService.js';
import { actualizarCasoPrevisoraListado } from '../../services/previsoraListadoService.js';

export const PREVISORA_RAZON_SOCIAL_CONTROL_HORAS = 'PREVISORA';

export default function FacturacionPrevisoraPanel({
  form,
  setForm,
  initialData = null,
  origen = 'cat',
}) {
  const esListado = origen === 'listado';
  return (
    <FacturacionAseguradoraPanel
      form={form}
      setForm={setForm}
      initialData={initialData}
      origen={origen}
      apiModulo={esListado ? 'previsora-listado' : 'previsora'}
      actualizarCaso={esListado ? actualizarCasoPrevisoraListado : actualizarCasoPrevisora}
      razonSocial={PREVISORA_RAZON_SOCIAL_CONTROL_HORAS}
      tarifaBloqueada
    />
  );
}
