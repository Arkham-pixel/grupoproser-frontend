/** Mapeo entre formulario RII-CP-004 y documento PuertosCaso (Actas y Descargues) */

import { normalizarImagenCargada, serializarImagenPersistida } from './puertosCasoImagenUtils.js';
import { isStoredFileReference } from '../../utils/storedFilePath.js';

function normalizarListaImagenes(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map(normalizarImagenCargada).filter(Boolean);
}

function limpiarListaImagenesParaGuardado(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map((img) => serializarImagenPersistida(img)).filter(Boolean);
}

function sanitizarInformeInspeccionAsegurado(formData) {
  const {
    archivoFirma: _archivoFirma,
    imagen: _imagen,
    preview: _preview,
    file: _file,
    ...informe
  } = formData || {};

  const limpio = { ...informe, plantillaInforme: 'riicp004' };

  if (typeof limpio.imagenFirma === 'string' && !isStoredFileReference(limpio.imagenFirma)) {
    delete limpio.imagenFirma;
  }

  const camposImagen = [
    'imagenesAspectoAlmacenamiento',
    'imagenesAspectoModelo',
    'imagenesInspeccionBordo',
    'imagenesInspeccionDescargue',
    'imagenesRegistro',
  ];
  camposImagen.forEach((campo) => {
    limpio[campo] = limpiarListaImagenesParaGuardado(limpio[campo]);
  });

  if (Array.isArray(limpio.registrosPorVin)) {
    limpio.registrosPorVin = limpio.registrosPorVin.map((registro) => ({
      ...registro,
      fotos: limpiarListaImagenesParaGuardado(registro.fotos),
    }));
  }

  return limpio;
}

/** Quita binarios locales si falló la subida a S3, para poder guardar el texto del informe. */
export function sanitizarFormDataParaGuardado(formData) {
  return sanitizarInformeInspeccionAsegurado(formData);
}

export function formDataToCasoInspeccionAsegurado(formData) {
  const login = localStorage.getItem('login') || '';
  const informe = sanitizarInformeInspeccionAsegurado(formData);
  return {
    tipoRegistro: 'inspeccion_asegurado',
    _id: formData._id || undefined,
    consecutivo: formData.consecutivo || formData.codigoReferencia || undefined,
    numeroSolicitud: formData.numeroPoliza || '',
    fechaInforme: formData.fecha || null,
    ciudadRiesgo: formData.municipio || '',
    lugar: formData.patioOperacion || formData.puertoDescargue || '',
    laborRealizada: formData.codigoInforme?.trim()
      ? `INSPECCIÓN ASEGURADO ${formData.codigoInforme.trim()}`
      : 'INSPECCIÓN ASEGURADO',
    asgrBenfcro: formData.asegurado || formData.nombreCliente || '',
    nombreAseguradora: formData.empresaCliente || '',
    descripcionEstado: formData.descripcionEstado || 'En curso',
    codiEstdo: formData.codiEstdo || 'en_curso',
    informeInspeccionAsegurado: informe,
    creadoPor: formData.creadoPor || login || undefined,
    actualizadoPor: login || undefined,
  };
}

export function casoToFormDataInspeccionAsegurado(caso) {
  if (!caso) return {};
  const informe = caso.informeInspeccionAsegurado || {};
  const base = {
    ...informe,
    imagenesInspeccionBordo: normalizarListaImagenes(informe.imagenesInspeccionBordo),
    imagenesInspeccionDescargue: normalizarListaImagenes(informe.imagenesInspeccionDescargue),
    imagenesAspectoAlmacenamiento: normalizarListaImagenes(informe.imagenesAspectoAlmacenamiento),
    imagenesAspectoModelo: normalizarListaImagenes(informe.imagenesAspectoModelo),
    imagenesRegistro: normalizarListaImagenes(informe.imagenesRegistro),
    registrosPorVin: (informe.registrosPorVin || []).map((registro) => ({
      ...registro,
      fotos: normalizarListaImagenes(registro.fotos),
    })),
    plantillaInforme: 'riicp004',
    _id: caso._id,
    consecutivo: caso.consecutivo || informe.consecutivo,
    codigoReferencia: caso.consecutivo || informe.codigoReferencia,
    descripcionEstado: caso.descripcionEstado,
    codiEstdo: caso.codiEstdo,
    creadoPor: caso.creadoPor,
  };
  return base;
}

/** Igual que casoToFormDataInspeccionAsegurado; se conserva por compatibilidad. */
export function casoToFormDataInspeccionAseguradoConMeta(caso) {
  if (!caso) return { datos: {}, huboRecorte: false };
  return { datos: casoToFormDataInspeccionAsegurado(caso), huboRecorte: false };
}
