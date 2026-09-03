/** Mapeo entre formulario Motorysa y documento PuertosCaso (Actas) */

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

function sanitizarInformeInspeccionMotorysa(formData) {
  const {
    archivoFirma: _archivoFirma,
    imagen: _imagen,
    preview: _preview,
    file: _file,
    ...informe
  } = formData || {};

  const limpio = { ...informe, plantillaInforme: 'motorysa' };

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

export function sanitizarFormDataMotorysaParaGuardado(formData) {
  return sanitizarInformeInspeccionMotorysa(formData);
}

export function formDataToCasoInspeccionMotorysa(formData) {
  const login = localStorage.getItem('login') || '';
  const informe = sanitizarInformeInspeccionMotorysa(formData);
  return {
    tipoRegistro: 'inspeccion_motorysa',
    _id: formData._id || undefined,
    consecutivo: formData.consecutivo || formData.codigoReferencia || undefined,
    numeroSolicitud: formData.numeroPoliza || formData.codigoReferencia || '',
    fechaInforme: formData.fecha || null,
    ciudadRiesgo: formData.municipio || '',
    lugar: formData.patioOperacion || formData.puertoDescargue || '',
    laborRealizada: 'INSPECCIÓN MOTORYSA',
    asgrBenfcro: formData.asegurado || formData.nombreCliente || '',
    nombreAseguradora: formData.empresaCliente || '',
    descripcionEstado: formData.descripcionEstado || 'En curso',
    codiEstdo: formData.codiEstdo || 'en_curso',
    informeInspeccionMotorysa: informe,
    creadoPor: formData.creadoPor || login || undefined,
    actualizadoPor: login || undefined,
  };
}

function baseDesdeCaso(caso) {
  const informe = caso.informeInspeccionMotorysa || {};
  return {
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
    plantillaInforme: 'motorysa',
    _id: caso._id,
    consecutivo: caso.consecutivo || informe.consecutivo,
    codigoReferencia: caso.consecutivo || informe.codigoReferencia,
    descripcionEstado: caso.descripcionEstado,
    codiEstdo: caso.codiEstdo,
    creadoPor: caso.creadoPor,
  };
}

export function casoToFormDataInspeccionMotorysa(caso) {
  if (!caso) return {};
  return baseDesdeCaso(caso);
}

export function casoToFormDataInspeccionMotorysaConMeta(caso) {
  if (!caso) return { datos: {}, huboRecorte: false };
  return { datos: baseDesdeCaso(caso), huboRecorte: false };
}
