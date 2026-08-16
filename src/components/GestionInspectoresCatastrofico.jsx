import React from 'react';
import GestionCatalogoCatastrofico from './GestionCatalogoCatastrofico.jsx';

export default function GestionInspectoresCatastrofico() {
  return (
    <GestionCatalogoCatastrofico
      apiPath="/api/inspectores-catastrofico"
      i18nNs="admin.ui.inspectoresCatastrofico"
    />
  );
}
