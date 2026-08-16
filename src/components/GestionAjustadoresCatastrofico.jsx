import React from 'react';
import GestionCatalogoCatastrofico from './GestionCatalogoCatastrofico.jsx';

export default function GestionAjustadoresCatastrofico() {
  return (
    <GestionCatalogoCatastrofico
      apiPath="/api/ajustadores-catastrofico"
      i18nNs="admin.ui.ajustadoresCatastrofico"
      permitirImportarResponsables
    />
  );
}
