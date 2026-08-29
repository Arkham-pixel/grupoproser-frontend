import { mapCasoFdmALiquidador } from '../SubcomponenteEquidadFdm/liquidadorEquidadFdmHelpers.js';

/** Convierte un caso Equidad CAT al shape que espera el liquidador FDM. */
export function casoEquidadCatComoFdm(caso = {}) {
  return {
    ...caso,
    nombre: caso.asegurado || caso.nombre || '',
    polizaAfectar: caso.numeroPoliza || caso.polizaAfectar || '',
    siniestro: caso.siniestro || '',
    caso: caso.numeroCasoCliente || caso.consecutivo || caso.caso || '',
    cedula: caso.identificacion || caso.cedula || '',
    celular: caso.celular || caso.telefonoAsegurado || '',
    direccionAfectada:
      caso.direccionAfectada || [caso.ciudad, caso.departamento].filter(Boolean).join(', '),
    municipio: caso.ciudad || caso.municipio || '',
    cobertura: caso.producto || caso.causa || caso.cobertura || '',
    evento: caso.producto || caso.causa || caso.evento || '',
    tomadorLiquidador: caso.tomador || 'SEGUROS LA EQUIDAD',
    liquidador: caso.liquidador,
  };
}

export function mapCasoEquidadCatALiquidadorFdm(caso = {}) {
  return mapCasoFdmALiquidador(casoEquidadCatComoFdm(caso));
}
