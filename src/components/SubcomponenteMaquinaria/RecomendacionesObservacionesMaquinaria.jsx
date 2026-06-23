import React, { useEffect } from "react";
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
  useEffect(() => {
    if (!recomendaciones || !/<[a-z][\s\S]*>/i.test(recomendaciones)) return;
    const plain = htmlATextoPlano(recomendaciones);
    if (plain !== recomendaciones) setRecomendaciones(plain);
  }, [recomendaciones, setRecomendaciones]);

  return (
    <div>
      <FieldLabel>Recomendaciones y observaciones</FieldLabel>
      <ThemedTextarea
        value={recomendaciones}
        onChange={(e) => setRecomendaciones(e.target.value)}
        rows={6}
        placeholder="Escriba aquí las recomendaciones y observaciones"
        disabled={cargando}
      />
    </div>
  );
}
