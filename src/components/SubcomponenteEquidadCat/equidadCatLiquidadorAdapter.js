import { mapCasoFdmALiquidador } from '../SubcomponenteEquidadFdm/liquidadorEquidadFdmHelpers.js';

/** Convierte un caso Equidad CAT al shape que espera el liquidador FDM. */
export function casoEquidadCatComoFdm(caso = {}) {
  const guardado = caso.liquidador && typeof caso.liquidador === 'object' ? caso.liquidador : null;
  const pctCaso = Number(caso.deducibleMaxPct);
  const smmlvCaso = Number(caso.deducibleSmmlv);
  const tienePct = caso.deducibleMaxPct !== '' && caso.deducibleMaxPct != null && Number.isFinite(pctCaso);
  const tieneSmmlv =
    caso.deducibleSmmlv !== '' && caso.deducibleSmmlv != null && Number.isFinite(smmlvCaso);

  let liquidador = guardado;
  if (!guardado?.deducible && (tienePct || tieneSmmlv)) {
    liquidador = {
      ...(guardado || {}),
      deducible: {
        ...(tienePct ? { porcentaje: pctCaso } : {}),
        ...(tieneSmmlv ? { cantidadSMMLV: smmlvCaso } : {}),
      },
    };
  }

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
    liquidador,
  };
}

export function mapCasoEquidadCatALiquidadorFdm(caso = {}) {
  return mapCasoFdmALiquidador(casoEquidadCatComoFdm(caso));
}
