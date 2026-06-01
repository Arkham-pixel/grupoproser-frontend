/**
 * Numeración coherente de secciones del informe de ajuste según la versión activa.
 * Orden base: 1–5 fijos; luego análisis → reserva (si aplica) → salvamentos → recobro → …
 */
export function obtenerNumeracionSecciones(estadoActual) {
  const nums = {
    antecedentes: 1,
    descripcionRiesgo: 2,
    circunstancias: 3,
    inspeccion: 4,
    causa: 5,
    analisisCobertura: 6,
    reserva: null,
    salvamentos: null,
    recobro: null,
    observacionesActa: null,
    actualizacion: null,
    observacionesActualizacion: null,
    conclusionesFinales: null,
    recomendacionesFinales: null,
    observacionesInformeFinal: null,
    liquidacion: null,
    liquidador: null,
    indemnizacion: null,
    panorama: null
  };

  if (estadoActual === 'actaInspeccion') {
    return nums;
  }

  let n = 6;
  nums.analisisCobertura = n++;

  if (estadoActual !== 'informeFinal') {
    nums.reserva = n++;
  }

  nums.salvamentos = n++;
  nums.recobro = n++;

  if (estadoActual === 'inicial' || estadoActual === 'preeliminar') {
    nums.observacionesActa = n++;
  }

  if (estadoActual === 'actualizacion' || estadoActual === 'informeFinal') {
    nums.actualizacion = n++;
  }

  if (estadoActual === 'informeFinal') {
    nums.conclusionesFinales = n++;
    nums.recomendacionesFinales = n++;
    nums.observacionesInformeFinal = n++;
    nums.liquidacion = n++;
    nums.liquidador = n++;
    nums.indemnizacion = n++;
    nums.panorama = n++;
  } else if (estadoActual === 'actualizacion') {
    nums.observacionesActualizacion = n++;
  }

  return nums;
}
