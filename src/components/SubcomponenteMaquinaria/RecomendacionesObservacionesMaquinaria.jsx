import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FieldLabel, ThemedTextarea } from "./maquinariaUi";

function htmlATextoPlano(html) {
  if (!html || typeof html !== "string") return "";
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.innerText || doc.body.textContent || "").replace(/\u00a0/g, " ").trim();
}

export default function RecomendacionesObservacionesMaquinaria({
  recomendaciones,
  setRecomendaciones,
  cargando = false,
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!recomendaciones || !/<[a-z][\s\S]*>/i.test(recomendaciones)) return;
    const plain = htmlATextoPlano(recomendaciones);
    if (plain !== recomendaciones) setRecomendaciones(plain);
  }, [recomendaciones, setRecomendaciones]);

  return (
    <div>
      <FieldLabel>{t('machinery.ui.recomendaciones.label')}</FieldLabel>
      <ThemedTextarea
        value={recomendaciones}
        onChange={(e) => setRecomendaciones(e.target.value)}
        rows={6}
        placeholder={t('machinery.ui.recomendaciones.placeholder')}
        disabled={cargando}
      />
    </div>
  );
}
