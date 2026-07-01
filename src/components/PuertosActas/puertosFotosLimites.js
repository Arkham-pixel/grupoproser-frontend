/** Límites de fotos — inspección asegurado (RII-CP-004) */
export const MAX_FOTOS_SECCION_INSPECCION_ASEGURADO = 15;

const CAMPOS_IMAGEN_INSPECCION = [
  'imagenesAspectoAlmacenamiento',
  'imagenesAspectoModelo',
  'imagenesInspeccionBordo',
  'imagenesInspeccionDescargue',
  'imagenesRegistro',
];

const ETIQUETAS_SECCION = {
  imagenesAspectoAlmacenamiento: 'Aspecto del almacenamiento',
  imagenesAspectoModelo: 'Aspecto modelo',
  imagenesInspeccionBordo: 'Inspección a bordo',
  imagenesInspeccionDescargue: 'Inspección en descargue',
  imagenesRegistro: 'Registro fotográfico',
};

export function validarLimiteFotosInspeccion(
  formData = {},
  max = MAX_FOTOS_SECCION_INSPECCION_ASEGURADO
) {
  const errores = [];

  for (const [campo, etiqueta] of Object.entries(ETIQUETAS_SECCION)) {
    const cantidad = (formData[campo] || []).length;
    if (cantidad > max) {
      errores.push(`${etiqueta}: ${cantidad} fotos (máximo ${max})`);
    }
  }

  (formData.registrosPorVin || []).forEach((registro, index) => {
    const cantidad = (registro.fotos || []).length;
    if (cantidad > max) {
      const vin = registro.vin?.trim() || `VIN #${index + 1}`;
      errores.push(`${vin}: ${cantidad} fotos (máximo ${max} por VIN)`);
    }
  });

  if (errores.length) {
    throw new Error(
      `Demasiadas fotos. Elimine las que sobren antes de guardar:\n• ${errores.join('\n• ')}`
    );
  }
}

/** Recorta listas que excedan el máximo (registros antiguos con hasta 50 fotos). */
export function recortarFotosInspeccionAlLimite(
  formData = {},
  max = MAX_FOTOS_SECCION_INSPECCION_ASEGURADO
) {
  const recortado = { ...formData };
  let huboRecorte = false;

  for (const campo of CAMPOS_IMAGEN_INSPECCION) {
    const lista = formData[campo];
    if (Array.isArray(lista) && lista.length > max) {
      recortado[campo] = lista.slice(0, max);
      huboRecorte = true;
    }
  }

  if (Array.isArray(formData.registrosPorVin)) {
    recortado.registrosPorVin = formData.registrosPorVin.map((registro) => {
      const fotos = registro.fotos || [];
      if (fotos.length > max) {
        huboRecorte = true;
        return { ...registro, fotos: fotos.slice(0, max) };
      }
      return registro;
    });
  }

  return { datos: recortado, huboRecorte };
}
