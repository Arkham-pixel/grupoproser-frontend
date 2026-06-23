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

async function subirArchivosAlServidor(archivos, casoId) {
  if (!archivos.length) return [];

  const formData = new FormData();
  archivos.forEach(({ file, nombreFallback }) => {
    appendUploadFile(formData, 'imagenes', file, file?.name || nombreFallback || 'imagen.jpg');
  });

  const token = localStorage.getItem('token');
  const qs = casoId ? `?casoId=${encodeURIComponent(casoId)}` : '';
  const response = await fetch(`${BASE_URL}/api/puertos/casos/upload-images${qs}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `Error ${response.status} al subir imágenes`);
  }

  return data.imagenes || [];
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

  let subidas = [];
  if (pendientes.length > 0) {
    subidas = await subirArchivosAlServidor(
      pendientes.map(({ imagen, file }) => ({ file, nombreFallback: imagen.nombre })),
      casoId
    );
    if (subidas.length !== pendientes.length) {
      throw new Error('No se recibieron todas las rutas de las imágenes subidas');
    }
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

  if (Array.isArray(informe.registrosFotograficosContenedores)) {
    informeProcesado.registrosFotograficosContenedores = await Promise.all(
      informe.registrosFotograficosContenedores.map(async (registro) => ({
        id: registro.id,
        numeroContenedor: registro.numeroContenedor || '',
        titulo: registro.titulo || '',
        imagenes: await subirImagenesPuertosCaso(registro.imagenes || [], casoId),
      }))
    );
  }

  return informeProcesado;
}
