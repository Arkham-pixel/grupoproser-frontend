import React from "react";
import { useTranslation } from "react-i18next";
import { FieldLabel, ThemedTextarea } from "./maquinariaUi";

export default function TipoProteccionMaquinaria({ tipoProteccion, setTipoProteccion, cargando = false }) {
  const { t } = useTranslation();
  return (
    <div>
      <FieldLabel>{t('machinery.ui.proteccion.label')}</FieldLabel>
      <ThemedTextarea
        value={tipoProteccion}
        onChange={(e) => setTipoProteccion(e.target.value)}
        rows={5}
        placeholder={t('machinery.ui.proteccion.placeholder')}
        disabled={cargando}
      />
    </div>
  );
}
