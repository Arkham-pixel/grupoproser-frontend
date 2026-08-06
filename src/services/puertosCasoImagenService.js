import {
  imagenNecesitaSubida,
  prepararFileDesdeImagen,
  serializarImagenPersistida,
} from '../components/PuertosActas/puertosCasoImagenUtils.js';
import { BASE_URL } from '../config/apiConfig.js';
import { appendUploadFile } from '../utils/sanitizeUploadFileName.js';
import { isStoredFileReference } from '../utils/storedFilePath.js';

const CAMPOS_IMAGENES_INFORME = [
  'imagenesContenidoCajas',
  'imagenesContenedoresMercancia',
  'imagenesVehiculosMercancia',
  'imagenesRegistroInicialSupervision',
  'imagenesCondicionCarga',
  'imagenesInspeccionArribo',
  'imagenesEquiposOperacion',
  'imagenesCondicionesMeteo',
];

const LOTE_SUBIDA = 1;
const TIMEOUT_SUBIDA_MS = 120000;

async function subirArchivosAlServidor(archivos, casoId) {
  if (!archivos.length) return [];

  const formData = new FormData();
  archivos.forEach(({ file, nombreFallback }) => {
    appendUploadFile(formData, 'imagenes', file, file?.name || nombreFallback || 'imagen.jpg');
  });

  const token = localStorage.getItem('token');
  const qs = casoId ? `?casoId=${encodeURIComponent(casoId)}` : '';
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), TIMEOUT_SUBIDA_MS);

  try {
    const response = await fetch(`${BASE_URL}/api/puertos/casos/upload-images${qs}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || `Error ${response.status} al subir imágenes`);
    }

    return data.imagenes || [];
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La subida de fotos tardó demasiado. Intente con menos imágenes por lote o revise su conexión.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Sube imágenes nuevas a S3 y devuelve solo referencias persistibles (ruta s3:).
 */
export async function subirImagenesPuertosCaso(imagenes = [], casoId = null) {
  if (!Array.isArray(imagenes) || imagenes.length === 0) return [];

  const pendientes = [];
  for (const imagen of imagenes) {
    if (imagenNecesitaSubida(imagen)) {
      const file = await prepararFileDesdeImagen(imagen);
      if (file) {
        pendientes.push({ imagen, file });
      }
    }
  }

  // El endpoint acepta 1 archivo por petición (limits.files = 1): subir por lotes.
  const subidas = [];
  for (let i = 0; i < pendientes.length; i += LOTE_SUBIDA) {
    const lote = pendientes.slice(i, i + LOTE_SUBIDA);
    const resultadoLote = await subirArchivosAlServidor(
      lote.map(({ imagen, file }) => ({ file, nombreFallback: imagen.nombre })),
      casoId
    );
    subidas.push(...resultadoLote);
  }
  if (subidas.length !== pendientes.length) {
    throw new Error('No se recibieron todas las rutas de las imágenes subidas');
  }

  let indiceSubida = 0;
  const resultado = [];

  for (const imagen of imagenes) {
    if (imagenNecesitaSubida(imagen)) {
      const meta = subidas[indiceSubida];
      indiceSubida += 1;
      if (!meta?.ruta) {
        throw new Error(`No se pudo subir la imagen "${imagen.nombre || 'sin nombre'}"`);
      }
      resultado.push(
        serializarImagenPersistida({
          id: imagen.id,
          ruta: meta.ruta,
          nombre: meta.nombre || imagen.nombre,
          descripcion: imagen.descripcion || '',
          tamaño: meta.tamaño,
          tipoMime: meta.tipoMime,
        })
      );
      continue;
    }

    const existente = serializarImagenPersistida(imagen);
    if (existente) {
      resultado.push(existente);
      continue;
    }

    if (imagen?.ruta && !isStoredFileReference(imagen.ruta)) {
      console.warn('Imagen omitida: ruta no válida para S3', imagen.nombre);
    }
  }

  return resultado.filter(Boolean);
}

export async function procesarInformeExportacionImagenes(informe = {}, casoId = null) {
  const buque = { ...(informe.buque || {}) };
  let imagenBuque = buque.imagenBuque || null;

  if (imagenBuque) {
    const [procesada] = await subirImagenesPuertosCaso([imagenBuque], casoId);
    imagenBuque = procesada || null;
  }

  const informeProcesado = {
    ...informe,
    buque: { ...buque, imagenBuque },
  };

  for (const campo of CAMPOS_IMAGENES_INFORME) {
    informeProcesado[campo] = await subirImagenesPuertosCaso(informe[campo] || [], casoId);
  }

  for (const campoRegistros of ['registrosFotograficosContenedores', 'registrosFotograficosSupervision']) {
    if (Array.isArray(informe[campoRegistros])) {
      informeProcesado[campoRegistros] = await Promise.all(
        informe[campoRegistros].map(async (registro) => ({
          id: registro.id,
          numeroContenedor: registro.numeroContenedor || '',
          titulo: registro.titulo || '',
          imagenes: await subirImagenesPuertosCaso(registro.imagenes || [], casoId),
        }))
      );
    }
  }

  return informeProcesado;
}

const CAMPOS_IMAGENES_GRANEL = [
  'imagenesMercancia',
  'imagenesCondicionCarga',
  'imagenesNovedadesAverias',
  'imagenesEquiposOperacion',
  'imagenesCondicionesMeteo',
];

/** Sube imágenes pendientes del informe granel y serializa referencias persistidas. */
export async function procesarInformeGranelImagenes(informe = {}, casoId = null) {
  const buque = { ...(informe.buque || {}) };
  let imagenBuque = buque.imagenBuque || null;

  if (imagenBuque) {
    const [procesada] = await subirImagenesPuertosCaso([imagenBuque], casoId);
    imagenBuque = procesada || null;
  }

  const informeProcesado = {
    ...informe,
    buque: { ...buque, imagenBuque },
  };

  for (const campo of CAMPOS_IMAGENES_GRANEL) {
    informeProcesado[campo] = await subirImagenesPuertosCaso(informe[campo] || [], casoId);
  }

  if (Array.isArray(informe.registrosFotograficosBodegas)) {
    informeProcesado.registrosFotograficosBodegas = await Promise.all(
      informe.registrosFotograficosBodegas.map(async (registro) => ({
        id: registro.id,
        titulo: registro.titulo || '',
        imagenes: await subirImagenesPuertosCaso(registro.imagenes || [], casoId),
      }))
    );
  }

  if (Array.isArray(informe.resumenEmails)) {
    informeProcesado.resumenEmails = await Promise.all(
      informe.resumenEmails.map(async (email) => ({
        id: email.id,
        fecha: email.fecha || '',
        evento: email.evento || '',
        imagenes: await subirImagenesPuertosCaso(email.imagenes || [], casoId),
      }))
    );
  }

  return informeProcesado;
}

const CAMPOS_IMAGENES_INSPECCION_PUERTOS = [
  'imagenesAspectoAlmacenamiento',
  'imagenesAspectoModelo',
  'imagenesInspeccionBordo',
  'imagenesInspeccionDescargue',
  'imagenesRegistro',
];

/** ¿Hay fotos nuevas locales que aún no están en S3? */
export function hayImagenesPendientesInspeccion(formData = {}) {
  for (const campo of CAMPOS_IMAGENES_INSPECCION_PUERTOS) {
    if ((formData[campo] || []).some(imagenNecesitaSubida)) return true;
  }
  for (const registro of formData.registrosPorVin || []) {
    if ((registro.fotos || []).some(imagenNecesitaSubida)) return true;
  }
  if (typeof formData.imagenFirma === 'string' && formData.imagenFirma.startsWith('data:')) return true;
  if (formData.imagenFirma?.file instanceof File) return true;
  return false;
}

function aplicarListaImagenesProcesadas(imagenes = [], mapaSubidas) {
  return (imagenes || [])
    .map((imagen) => {
      if (imagenNecesitaSubida(imagen)) {
        const meta = mapaSubidas.get(imagen.id);
        if (!meta?.ruta) return null;
        return serializarImagenPersistida({
          id: imagen.id,
          ruta: meta.ruta,
          nombre: meta.nombre || imagen.nombre,
          descripcion: imagen.descripcion || '',
          tamaño: meta.tamaño,
          tipoMime: meta.tipoMime,
        });
      }
      return serializarImagenPersistida(imagen);
    })
    .filter(Boolean);
}

async function subirPendientesEnLotes(pendientes, casoId, onProgreso) {
  const mapaSubidas = new Map();
  const unicos = [...new Map(pendientes.map((p) => [p.id, p])).values()];
  const totalLotes = Math.max(1, Math.ceil(unicos.length / LOTE_SUBIDA));
  onProgreso?.({ lote: 0, totalLotes, subidas: 0, total: unicos.length });

  for (let i = 0; i < unicos.length; i += LOTE_SUBIDA) {
    const numeroLote = Math.floor(i / LOTE_SUBIDA) + 1;
    onProgreso?.({ lote: mapaSubidas.size + 1, totalLotes: unicos.length, subidas: mapaSubidas.size, total: unicos.length });

    const lote = unicos.slice(i, i + LOTE_SUBIDA);
    const preparados = await Promise.all(
      lote.map(async (imagen) => {
        const file = await prepararFileDesdeImagen(imagen);
        return file ? { imagen, file } : null;
      })
    );
    const archivos = preparados.filter(Boolean);
    if (!archivos.length) continue;

    const subidas = await subirArchivosAlServidor(
      archivos.map(({ imagen, file }) => ({ file, nombreFallback: imagen.nombre })),
      casoId
    );

    if (subidas.length !== archivos.length) {
      throw new Error(
        `Solo se subieron ${subidas.length} de ${archivos.length} fotos del lote ${numeroLote}.`
      );
    }

    archivos.forEach(({ imagen }, idx) => {
      if (subidas[idx]?.ruta) {
        mapaSubidas.set(imagen.id, subidas[idx]);
      }
    });
  }

  const faltantes = unicos.filter((img) => !mapaSubidas.has(img.id));
  if (faltantes.length > 0) {
    throw new Error(`No se pudieron subir ${faltantes.length} foto(s) al servidor.`);
  }

  return mapaSubidas;
}

function recolectarImagenesPendientes(formData = {}) {
  const pendientes = [];
  const agregar = (lista) => {
    for (const imagen of lista || []) {
      if (imagenNecesitaSubida(imagen)) pendientes.push(imagen);
    }
  };
  for (const campo of CAMPOS_IMAGENES_INSPECCION_PUERTOS) {
    agregar(formData[campo]);
  }
  for (const registro of formData.registrosPorVin || []) {
    agregar(registro.fotos);
  }
  if (typeof formData.imagenFirma === 'string' && formData.imagenFirma.startsWith('data:')) {
    pendientes.push({
      id: 'firma-informe',
      src: formData.imagenFirma,
      file: formData.archivoFirma,
      nombre: 'firma.png',
    });
  }
  return pendientes;
}

/**
 * Sube fotos del formulario modular de inspección Puertos / inspección asegurado a S3.
 * Las ya guardadas en S3 no se vuelven a subir. Un solo lote de subida por guardado.
 */
export async function procesarInspeccionPuertosImagenes(formData = {}, casoId = null, onProgreso) {
  const idCaso = casoId || formData._id || 'borrador';
  const procesado = { ...formData };

  const pendientes = recolectarImagenesPendientes(formData);
  let mapaSubidas = new Map();

  if (pendientes.length > 0) {
    mapaSubidas = await subirPendientesEnLotes(pendientes, idCaso, onProgreso);
  }

  await Promise.all(
    CAMPOS_IMAGENES_INSPECCION_PUERTOS.map(async (campo) => {
      procesado[campo] = aplicarListaImagenesProcesadas(formData[campo], mapaSubidas);
    })
  );

  procesado.registrosPorVin = await Promise.all(
    (formData.registrosPorVin || []).map(async (registro) => ({
      ...registro,
      fotos: aplicarListaImagenesProcesadas(registro.fotos, mapaSubidas),
    }))
  );

  if (formData.imagenFirma) {
    if (typeof formData.imagenFirma === 'string' && isStoredFileReference(formData.imagenFirma)) {
      procesado.imagenFirma = formData.imagenFirma;
    } else if (mapaSubidas.has('firma-informe')) {
      const rutaFirma = mapaSubidas.get('firma-informe')?.ruta;
      if (!rutaFirma) {
        throw new Error('No se pudo guardar la imagen de la firma en el servidor.');
      }
      procesado.imagenFirma = rutaFirma;
    } else if (
      typeof formData.imagenFirma === 'string' &&
      formData.imagenFirma.startsWith('data:')
    ) {
      throw new Error(
        'La firma no se subió al servidor. Vuelva a cargar la imagen e intente guardar de nuevo.'
      );
    }
  }

  delete procesado.archivoFirma;
  return procesado;
}
