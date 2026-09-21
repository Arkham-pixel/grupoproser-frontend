import React from 'react';
import FacturacionAseguradoraPanel from '../shared/FacturacionAseguradoraPanel.jsx';
import { actualizarCasoAllianz } from '../../services/allianzService.js';
import { actualizarCasoAllianzListado } from '../../services/allianzListadoService.js';

export const ALLIANZ_RAZON_SOCIAL_CONTROL_HORAS = 'ALLIANZ';

export default function FacturacionAllianzPanel({
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
      apiModulo={esListado ? 'allianz-listado' : 'allianz'}
      actualizarCaso={esListado ? actualizarCasoAllianzListado : actualizarCasoAllianz}
      razonSocial={ALLIANZ_RAZON_SOCIAL_CONTROL_HORAS}
      tarifaBloqueada
    />
  );
}
