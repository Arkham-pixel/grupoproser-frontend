import React from "react";
import { FieldLabel, ThemedTextarea } from "./maquinariaUi";

export default function TipoProteccionMaquinaria({ tipoProteccion, setTipoProteccion, cargando = false }) {
  return (
    <div>
      <FieldLabel>Describa el tipo de protección y el contexto del riesgo</FieldLabel>
      <ThemedTextarea
        value={tipoProteccion}
        onChange={(e) => setTipoProteccion(e.target.value)}
        rows={5}
        placeholder="Escriba aquí el tipo de protección"
        disabled={cargando}
      />
    </div>
  );
}
