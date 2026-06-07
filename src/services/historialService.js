// Servicio para manejar el historial de formularios
import { BASE_URL, PROD_URL, getUploadsUrlCandidates, isDevelopmentEnv } from '../config/apiConfig.js';
import { isStoredFileReference } from '../utils/storedFilePath.js';

// Tipos de formularios disponibles
export const TIPOS_FORMULARIOS = {
  COMPLEX: 'complex',
  RIESGOS: 'riesgos',
  POL: 'pol',
  INSPECCION: 'inspeccion',
  INSPECCION_PROPIEDADES: 'inspeccion-propiedades',
  INSPECCION_PUERTOS: 'inspeccion-puertos',
  ACTA_INSPECCION: 'acta_inspeccion',
  MAQUINARIA: 'maquinaria',
  SINIESTROS: 'siniestros',
  AJUSTE: 'ajuste',
  MATRIZ_RIESGO_INICIAL: 'matriz_riesgo_inicial',
  MATRIZ_RIESGO_FINAL: 'matriz_riesgo_final'
};

// Estados de formularios
export const ESTADOS_FORMULARIO = {
  COMPLETADO: 'completado',
  EN_PROCESO: 'en_proceso',
  PENDIENTE: 'pendiente',
  BORRADOR: 'borrador'
};

class HistorialService {
  constructor() {
    this.baseURL = BASE_URL;
    // Fallback en dev si el backend local no responde (ambos deben usar STORAGE_DRIVER=s3)
    this.uploadsURL = PROD_URL;
  }

  // Comprimir imágenes antes de subirlas (estándar global para TODOS los formularios)
  async comprimirImagenSiEsNecesario(file) {
    if (!file || !(file instanceof File)) return file;

    // ✅ Sin limitantes por peso:
    // Subimos el archivo tal cual (sin compresión obligatoria) para que no importe cuánto pese.
    // Si en algún momento quieres reactivar compresión para velocidad/costos, se puede reintroducir aquí.
    return file;
  }

  // Función para convertir archivos a base64
  async convertirArchivoABase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Función para limpiar cualquier base64 residual antes de enviar al servidor
  limpiarBase64Residual(datos) {
    if (!datos || typeof datos !== 'object') return datos;
    
    // Si es un array, limpiar cada elemento
    if (Array.isArray(datos)) {
      return datos.map(item => this.limpiarBase64Residual(item));
    }
    
    const datosLimpios = { ...datos }; // Shallow clone primero
    
    // Limpiar base64 de imágenes de registro
    if (datosLimpios.imagenesRegistro && Array.isArray(datosLimpios.imagenesRegistro)) {
datosLimpios.imagenesRegistro = this.limpiarArrayImagenes(datosLimpios.imagenesRegistro);
    }
    
    // Limpiar base64 de imágenes de inspección (formulario de ajustes)
    if (datosLimpios.imagenesInspeccion && Array.isArray(datosLimpios.imagenesInspeccion)) {
datosLimpios.imagenesInspeccion = this.limpiarArrayImagenes(datosLimpios.imagenesInspeccion);
    }
    
    // Limpiar campos de preview de maquinaria (no necesarios en MongoDB)
    if (datosLimpios.fotoPrincipalPreview) {
      delete datosLimpios.fotoPrincipalPreview;
    }
    
    // Limpiar otros campos problemáticos recursivamente
    Object.keys(datosLimpios).forEach(key => {
      const value = datosLimpios[key];
      
      // Eliminar campos que no deben guardarse en MongoDB
      if (key === 'base64' || key === 'preview' || key === 'file' || key === 'archivo' || 
          key === 'url' || key === 'esLocal' || key === 'errorSubida') {
        // Solo eliminar si no es un objeto complejo (ej: si es string base64)
        if (typeof value === 'string' && value.startsWith('data:')) {
          delete datosLimpios[key];
        } else if (typeof value !== 'object' || value === null) {
          delete datosLimpios[key];
        }
      }
      
      // Limpiar recursivamente objetos y arrays
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof File)) {
        datosLimpios[key] = this.limpiarBase64Residual(value);
      } else if (Array.isArray(value) && !(value[0] instanceof File)) {
        datosLimpios[key] = value.map(item => this.limpiarBase64Residual(item));
      }
    });
    
    return datosLimpios;
  }

  // Función específica para limpiar array de imágenes
  limpiarArrayImagenes(imagenes) {
    if (!Array.isArray(imagenes)) return imagenes;
    
return imagenes
      .map((img, index) => {
        if (!img || typeof img !== 'object') return null;
        
        // Verificar ruta válida
        const tieneRutaValida = isStoredFileReference(img.ruta);
        
        if (!tieneRutaValida) {
          console.warn(`⚠️ Imagen ${index + 1} sin ruta válida, será excluida`);
          return null;
        }
        
        // Crear objeto limpio SOLO con campos necesarios
        return {
          ruta: img.ruta,
          nombre: img.nombre || img.descripcion || 'imagen',
          descripcion: img.descripcion || '',
          tamaño: img.tamaño,
          tipoMime: img.tipoMime
        };
      })
      .filter(img => img !== null && img.ruta);
  }

  // Función para subir imágenes como archivos físicos al servidor
  async subirImagenesAlServidor(imagenes, casoId = null) {
    if (!imagenes || imagenes.length === 0) return [];

const formData = new FormData();
    const imagenesNuevas = [];
    
    // Filtrar solo imágenes nuevas (File objects) que necesitan subirse
    for (const imagen of imagenes) {
      if (imagen && imagen.file && imagen.file instanceof File) {
        const fileOriginal = imagen.file;
        const fileParaSubir = await this.comprimirImagenSiEsNecesario(fileOriginal);
        imagenesNuevas.push({
          ...imagen,
          file: fileParaSubir,
          // Guardar info útil para debug (no se persiste, se limpia después)
          _nombreOriginal: fileOriginal?.name
        });
        formData.append('imagenes', fileParaSubir, fileParaSubir?.name || fileOriginal?.name || 'imagen.jpg');
      }
    }

    if (imagenesNuevas.length === 0) {
// Retornar solo las imágenes existentes que tienen rutas válidas (NO base64)
      return imagenes
        .filter(img => {
          // Solo incluir si tiene ruta válida (no base64)
          const tieneRutaValida = isStoredFileReference(img.ruta);
          return tieneRutaValida;
        })
        .map(img => ({
          ruta: img.ruta,
          nombre: img.nombre || img.descripcion || 'imagen',
          descripcion: img.descripcion || '',
          tamaño: img.tamaño,
          tipoMime: img.tipoMime,
          esLocal: false
        }));
    }

    try {
      // Backend activo primero (local o prod); ambos deben tener STORAGE_DRIVER=s3 → rutas s3: en MongoDB
      const servidoresCandidatos = [this.baseURL];
      if (isDevelopmentEnv && this.uploadsURL && this.uploadsURL !== this.baseURL) {
        servidoresCandidatos.push(this.uploadsURL);
      }

      let ultimoError = null;

      for (const uploadsBase of servidoresCandidatos) {
        try {
          const token = localStorage.getItem('token');
          const url = casoId
            ? `${uploadsBase}/api/historial-formularios/upload-images?casoId=${casoId}`
            : `${uploadsBase}/api/historial-formularios/upload-images`;

const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
              // No establecer Content-Type, fetch lo hará automáticamente con FormData
            },
            body: formData
          });

          if (!response.ok) {
            // Intentar leer JSON; si no, fallback a texto
            const contentType = response.headers.get('content-type');
            let errorData = null;
            if (contentType && contentType.includes('application/json')) {
              errorData = await response.json().catch(() => null);
            } else {
              const errorText = await response.text().catch(() => '');
              errorData = { error: errorText || 'Error desconocido' };
            }

            const detalle = errorData?.error || errorData?.message || `Error HTTP: ${response.status}`;
            throw new Error(detalle);
          }

          const data = await response.json();
// Combinar imágenes nuevas subidas con las existentes
          const imagenesSubidas = data.imagenes.map((imgSubida, index) => ({
            ...imagenesNuevas[index],
            ruta: imgSubida.ruta,
            nombre: imgSubida.nombre,
            tamaño: imgSubida.tamaño,
            tipoMime: imgSubida.tipoMime,
            esLocal: false
          }));

          // Combinar con imágenes que ya existían (tienen ruta pero no son File)
          // IMPORTANTE: Solo incluir imágenes con rutas válidas (NO base64)
          const imagenesExistentes = imagenes
            .filter(img => {
              // Excluir si es un File object (ya fue procesado arriba)
              if (img && img.file && img.file instanceof File) return false;
              // Solo incluir si tiene ruta válida (no base64)
              const tieneRutaValida = isStoredFileReference(img.ruta);
              return tieneRutaValida;
            })
            .map(img => ({
              ruta: img.ruta,
              nombre: img.nombre || img.descripcion || 'imagen',
              descripcion: img.descripcion || '',
              tamaño: img.tamaño,
              tipoMime: img.tipoMime,
              esLocal: false
            }));

          return [...imagenesSubidas, ...imagenesExistentes];
        } catch (error) {
          ultimoError = error;
          console.warn('⚠️ Falló el intento de subida en:', uploadsBase, {
            message: error?.message || 'Error desconocido'
          });

          // En PROD no tenemos fallback; en DEV intentamos con el siguiente candidato.
          if (!isDevelopmentEnv) break;
        }
      }

      throw ultimoError || new Error('Error desconocido al subir imágenes');
    } catch (error) {
      console.error('❌ Error subiendo imágenes:', error);

      // ✅ SOLUCIÓN DEFINITIVA:
      // Si hay imágenes nuevas y no se pudieron subir, NO se debe "guardar" el formulario,
      // porque eso termina persistiendo el registro SIN fotos (y luego en "Editar" desaparecen).
      if (imagenesNuevas.length > 0) {
        const mensaje = `No se pudieron subir ${imagenesNuevas.length} foto(s). ` +
          `No se guardó el formulario para evitar pérdida de imágenes. ` +
          `Detalle: ${error.message || 'Error desconocido'}`;
        throw new Error(mensaje);
      }

      // Si no había nuevas, devolver solo las existentes con rutas válidas
      return imagenes
        .filter(img => {
          const tieneRutaValida = isStoredFileReference(img.ruta);
          return tieneRutaValida;
        })
        .map(img => ({
          ruta: img.ruta,
          nombre: img.nombre || img.descripcion || 'imagen',
          descripcion: img.descripcion || '',
          tamaño: img.tamaño,
          tipoMime: img.tipoMime,
          esLocal: false
        }));
    }
  }

  // Función para procesar imágenes en los datos del formulario
  // AHORA: Sube imágenes como archivos y guarda solo las rutas
  async procesarImagenesEnDatos(datos, casoId = null) {
    if (!datos || typeof datos !== 'object') return datos;

    const datosProcesados = { ...datos };

    // Procesar imagen principal si existe (mantener como base64 para compatibilidad con Word)
    if (datosProcesados.imagen && datosProcesados.imagen instanceof File) {
datosProcesados.imagen = await this.convertirArchivoABase64(datosProcesados.imagen);
    }

    // Procesar foto principal de maquinaria (similar a imagen principal)
    if (datosProcesados.fotoPrincipal && datosProcesados.fotoPrincipal instanceof File) {
datosProcesados.fotoPrincipal = await this.convertirArchivoABase64(datosProcesados.fotoPrincipal);
      // También mantener el preview si existe
      if (datosProcesados.fotoPrincipalPreview) {
        datosProcesados.fotoPrincipalPreview = datosProcesados.fotoPrincipalPreview;
      }
    }

    // Procesar imágenes de registro: SUBIR COMO ARCHIVOS
    if (datosProcesados.imagenesRegistro && Array.isArray(datosProcesados.imagenesRegistro)) {
// Subir imágenes al servidor y obtener rutas
      const imagenesProcesadas = await this.subirImagenesAlServidor(
        datosProcesados.imagenesRegistro,
        casoId || datosProcesados.casoId
      );

      // Guardar solo las rutas y metadata, LIMPIANDO cualquier base64
      datosProcesados.imagenesRegistro = imagenesProcesadas.map(img => {
        // Solo guardar si tiene ruta válida (no base64 como ruta)
        const rutaValida = isStoredFileReference(img.ruta);
        
        if (!rutaValida && img.base64 && img.base64.startsWith('data:')) {
          // Si solo tiene base64 pero no ruta, saltar esta imagen o generar error
          console.warn('⚠️ Imagen sin ruta válida, solo tiene base64:', img.nombre);
          return null; // Esto será filtrado después
        }
        
        return {
          ruta: rutaValida ? img.ruta : null,
          nombre: img.nombre || img.descripcion || 'imagen',
          descripcion: img.descripcion || '',
          tamaño: img.tamaño,
          tipoMime: img.tipoMime
          // IMPORTANTE: NO incluir base64, preview, file, ni ningún campo que contenga datos binarios
        };
      }).filter(img => img !== null && img.ruta !== null); // Filtrar imágenes inválidas
      
}

    // Procesar imágenes de inspección fotográfica (formulario de ajuste): SUBIR COMO ARCHIVOS
    if (datosProcesados.imagenesInspeccion && Array.isArray(datosProcesados.imagenesInspeccion)) {
// Normalizar las imágenes para que tengan la misma estructura que imagenesRegistro
      const imagenesNormalizadas = datosProcesados.imagenesInspeccion.map(img => {
        // Si tiene 'archivo' (File), convertir a formato estándar
        if (img && img.archivo && img.archivo instanceof File) {
          return {
            file: img.archivo,
            preview: img.url || null,
            base64: null,
            descripcion: img.descripcion || '',
            nombre: img.nombre || img.archivo.name,
            ruta: img.ruta || null
          };
        }
        // Si ya tiene 'file', mantenerlo
        if (img && img.file && img.file instanceof File) {
          return {
            file: img.file,
            preview: img.preview || img.url || null,
            base64: img.base64 || null,
            descripcion: img.descripcion || '',
            nombre: img.nombre || img.file.name,
            ruta: img.ruta || null
          };
        }
        // Si solo tiene ruta (ya subida), mantenerla
        return img;
      });

      // Subir imágenes al servidor y obtener rutas
      const imagenesProcesadas = await this.subirImagenesAlServidor(
        imagenesNormalizadas,
        casoId || datosProcesados.casoId
      );

      // Guardar solo las rutas y metadata, LIMPIANDO cualquier base64
      datosProcesados.imagenesInspeccion = imagenesProcesadas.map(img => {
        const rutaValida = isStoredFileReference(img.ruta);
        
        if (!rutaValida && img.base64 && img.base64.startsWith('data:')) {
          console.warn('⚠️ Imagen de inspección sin ruta válida, solo tiene base64:', img.nombre);
          return null;
        }
        
        return {
          ruta: rutaValida ? img.ruta : null,
          nombre: img.nombre || img.descripcion || 'imagen',
          descripcion: img.descripcion || '',
          tamaño: img.tamaño,
          tipoMime: img.tipoMime
          // IMPORTANTE: NO incluir base64, preview, file, archivo, url ni ningún campo que contenga datos binarios
        };
      }).filter(img => img !== null && img.ruta !== null);
      
}

    // Captura del mapa de ubicación (formulario de ajuste): subir PNG/JPEG para no persistir base64 en MongoDB
    if (datosProcesados.imagenMapa) {
      const im = datosProcesados.imagenMapa;
      if (typeof im === 'string' && im.startsWith('data:image')) {
try {
          const base64Payload = im.includes(',') ? im.split(',')[1] : im.replace(/^data:[^;]+;base64,/, '');
          const byteCharacters = atob(base64Payload);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const mimeMatch = im.match(/^data:(image\/[^;]+);base64/);
          const mime = mimeMatch?.[1] || 'image/png';
          const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'png';
          const file = new File([byteArray], `mapa_ubicacion_${Date.now()}.${ext}`, { type: mime });
          const subidas = await this.subirImagenesAlServidor(
            [{ file, nombre: file.name, descripcion: 'Captura mapa ubicación siniestro' }],
            casoId || datosProcesados.casoId
          );
          if (subidas[0]?.ruta) {
            datosProcesados.imagenMapa = {
              ruta: subidas[0].ruta,
              nombre: subidas[0].nombre || file.name,
              tipoMime: subidas[0].tipoMime || mime
            };
}
        } catch (e) {
          console.warn('⚠️ No se pudo subir la captura del mapa:', e?.message || e);
        }
      } else if (typeof im === 'object' && im !== null && isStoredFileReference(im.ruta)) {
        datosProcesados.imagenMapa = {
          ruta: im.ruta,
          nombre: im.nombre || 'mapa_ubicacion.png',
          tipoMime: im.tipoMime || 'image/png'
        };
      }
    }

    // Procesar fotosAreas (formulario de inspección de propiedades): SUBIR COMO ARCHIVOS
    if (datosProcesados.fotosAreas && typeof datosProcesados.fotosAreas === 'object') {
const fotosAreasProcesadas = {};
      
      for (const [area, fotos] of Object.entries(datosProcesados.fotosAreas)) {
        if (!fotos) continue;
        
        // Si es alcobas, tiene estructura anidada
        if (area === 'alcobas' && typeof fotos === 'object' && !Array.isArray(fotos)) {
          fotosAreasProcesadas.alcobas = {};
          
          for (const [alcobaNum, fotosAlcoba] of Object.entries(fotos)) {
            if (!Array.isArray(fotosAlcoba) || fotosAlcoba.length === 0) {
              fotosAreasProcesadas.alcobas[alcobaNum] = [];
              continue;
            }
            
            // Normalizar fotos para subir al servidor
            const fotosNormalizadas = fotosAlcoba.map(foto => {
              // Si tiene base64 pero no ruta, necesitamos convertir base64 a File para subirlo
              if (foto.base64 && !foto.ruta) {
                // Convertir base64 a Blob y luego a File
                const base64Data = foto.base64.startsWith('data:') 
                  ? foto.base64.split(',')[1] 
                  : foto.base64;
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'image/jpeg' });
                const file = new File([blob], foto.nombre || 'imagen.jpg', { type: 'image/jpeg' });
                
                return {
                  file: file,
                  nombre: foto.nombre || 'imagen',
                  descripcion: foto.descripcion || '',
                  ruta: null
                };
              }
              
              // Si tiene archivo File, usarlo directamente
              if (foto.archivo && foto.archivo instanceof File) {
                return {
                  file: foto.archivo,
                  nombre: foto.nombre || foto.archivo.name,
                  descripcion: foto.descripcion || '',
                  ruta: foto.ruta || null
                };
              }
              
              // Si ya tiene ruta, mantenerla
              if (isStoredFileReference(foto.ruta)) {
                return {
                  nombre: foto.nombre || 'imagen',
                  descripcion: foto.descripcion || '',
                  ruta: foto.ruta
                };
              }
              
              return foto;
            });
            
            // Subir fotos al servidor
            const fotosProcesadas = await this.subirImagenesAlServidor(
              fotosNormalizadas,
              casoId || datosProcesados.casoId
            );
            
            // Guardar solo rutas y metadata
            fotosAreasProcesadas.alcobas[alcobaNum] = fotosProcesadas
              .filter(img => isStoredFileReference(img.ruta))
              .map(img => ({
                id: Date.now() + Math.random(),
                nombre: img.nombre || 'imagen',
                descripcion: img.descripcion || '',
                ruta: img.ruta
                // NO incluir base64, url, archivo, etc.
              }));
          }
        } else if (Array.isArray(fotos) && fotos.length > 0) {
          // Área normal (cocina, sala, etc.)
          // Normalizar fotos para subir al servidor
          const fotosNormalizadas = fotos.map(foto => {
            // Si tiene base64 pero no ruta, convertir a File
            if (foto.base64 && !foto.ruta) {
              const base64Data = foto.base64.startsWith('data:') 
                ? foto.base64.split(',')[1] 
                : foto.base64;
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'image/jpeg' });
              const file = new File([blob], foto.nombre || 'imagen.jpg', { type: 'image/jpeg' });
              
              return {
                file: file,
                nombre: foto.nombre || 'imagen',
                descripcion: foto.descripcion || '',
                ruta: null
              };
            }
            
            // Si tiene archivo File, usarlo directamente
            if (foto.archivo && foto.archivo instanceof File) {
              return {
                file: foto.archivo,
                nombre: foto.nombre || foto.archivo.name,
                descripcion: foto.descripcion || '',
                ruta: foto.ruta || null
              };
            }
            
            // Si ya tiene ruta, mantenerla
            if (isStoredFileReference(foto.ruta)) {
              return {
                nombre: foto.nombre || 'imagen',
                descripcion: foto.descripcion || '',
                ruta: foto.ruta
              };
            }
            
            return foto;
          });
          
          // Subir fotos al servidor
          const fotosProcesadas = await this.subirImagenesAlServidor(
            fotosNormalizadas,
            casoId || datosProcesados.casoId
          );
          
          // Guardar solo rutas y metadata
          fotosAreasProcesadas[area] = fotosProcesadas
            .filter(img => isStoredFileReference(img.ruta))
            .map(img => ({
              id: Date.now() + Math.random(),
              nombre: img.nombre || 'imagen',
              descripcion: img.descripcion || '',
              ruta: img.ruta
              // NO incluir base64, url, archivo, etc.
            }));
        } else {
          // Área vacía o estructura desconocida, mantener tal cual
          fotosAreasProcesadas[area] = fotos;
        }
      }
      
      datosProcesados.fotosAreas = fotosAreasProcesadas;
}

    // Procesar anexos si existen
    if (datosProcesados.anexos && Array.isArray(datosProcesados.anexos)) {
const anexosProcesados = [];
      
      for (const anexo of datosProcesados.anexos) {
        if (anexo && anexo.file && anexo.file instanceof File) {
          const anexoBase64 = await this.convertirArchivoABase64(anexo.file);
          anexosProcesados.push({
            ...anexo,
            file: anexoBase64,
            nombre: anexo.file.name,
            tipo: anexo.file.type,
            tamaño: anexo.file.size
          });
        } else if (anexo && typeof anexo === 'object') {
          anexosProcesados.push(anexo);
        }
      }
      
      datosProcesados.anexos = anexosProcesados;
    }

    return datosProcesados;
  }

  // Obtener todos los formularios del historial con filtros
  async obtenerHistorial(filtros = {}) {
    try {
const queryParams = new URLSearchParams();
      
      if (filtros.tipo && filtros.tipo !== 'todos') {
        queryParams.append('tipo', filtros.tipo);
      }
      
      if (filtros.usuario) {
        queryParams.append('usuario', filtros.usuario);
      }
      
      if (filtros.fechaDesde) {
        queryParams.append('fechaDesde', filtros.fechaDesde);
      }
      
      if (filtros.fechaHasta) {
        queryParams.append('fechaHasta', filtros.fechaHasta);
      }
      
      if (filtros.estado) {
        queryParams.append('estado', filtros.estado);
      }

      // Agregar límite alto para obtener todos los casos (o usar el límite del filtro si existe)
      const limite = filtros.limite || 1000; // Límite alto por defecto para obtener todos los casos
      queryParams.append('limite', limite.toString());
      
      // Si se especifica una página, agregarla también
      if (filtros.pagina) {
        queryParams.append('pagina', filtros.pagina.toString());
      }

      const url = `${this.baseURL}/api/historial-formularios?${queryParams.toString()}`;
const token = localStorage.getItem('token');
const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Error HTTP: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
return data.formularios || [];
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      throw error;
    }
  }

  // Guardar un nuevo formulario en el historial
  async guardarFormulario(formulario) {
    try {
// Obtener casoId si existe para organizar las imágenes
      const casoId = formulario.datos?.casoId || null;
      
      // Procesar imágenes antes de enviar (ahora sube como archivos)
      if (formulario.datos) {
formulario.datos = await this.procesarImagenesEnDatos(formulario.datos, casoId);
        
        // LIMPIEZA FINAL: Eliminar cualquier base64 residual antes de enviar
formulario.datos = this.limpiarBase64Residual(formulario.datos);
      }
      
      const token = localStorage.getItem('token');
const url = `${this.baseURL}/api/historial-formularios`;
const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formulario)
      });

if (!response.ok) {
        let errorData;
        const contentType = response.headers.get('content-type');
        
        try {
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
        const errorText = await response.text();
            errorData = { error: errorText };
          }
        } catch (e) {
          errorData = { error: 'Error desconocido al leer la respuesta' };
        }
        
        console.error('❌ Error response:', errorData);
        
        // Mostrar mensaje más específico según el tipo de error
        if (response.status === 413) {
          const mensaje = errorData.error || 'El formulario es demasiado grande';
          const tamanoMB = errorData.tamanoMB ? ` (${errorData.tamanoMB} MB)` : '';
          throw new Error(`${mensaje}${tamanoMB}. Por favor, reduce el número de imágenes o comprímelas antes de guardar.`);
        } else if (response.status === 400) {
          const mensaje = errorData.error || 'Error en los datos enviados';
          throw new Error(`${mensaje}. ${errorData.detalles ? JSON.stringify(errorData.detalles) : ''}`);
        } else {
          const mensaje = errorData.error || `Error HTTP: ${response.status}`;
          throw new Error(mensaje);
        }
      }

      const data = await response.json();
return data.formulario;
    } catch (error) {
      console.error('❌ Error guardando formulario:', error);
      throw error;
    }
  }

  // Actualizar un formulario existente
  async actualizarFormulario(id, datos) {
    try {
// Obtener casoId si existe para organizar las imágenes
      const casoId = datos.datos?.casoId || datos.casoId || null;
// IMPORTANTE: Procesar imágenes ANTES de enviar
      // Primero procesar datos.datos (estructura principal)
      if (datos.datos) {
datos.datos = await this.procesarImagenesEnDatos(datos.datos, casoId);
        datos.datos = this.limpiarBase64Residual(datos.datos);
      }
      
      // También procesar si imagenesRegistro está en el nivel raíz (compatibilidad)
      if (datos.imagenesRegistro && Array.isArray(datos.imagenesRegistro)) {
const imagenesProcesadas = await this.subirImagenesAlServidor(
          datos.imagenesRegistro,
          casoId
        );
        datos.imagenesRegistro = imagenesProcesadas.map(img => ({
          ruta: img.ruta,
          nombre: img.nombre || img.descripcion || 'imagen',
          descripcion: img.descripcion || '',
          tamaño: img.tamaño,
          tipoMime: img.tipoMime
        })).filter(img => isStoredFileReference(img.ruta));
}
      
      // LIMPIEZA FINAL: Eliminar cualquier base64 residual de TODO el objeto
datos = this.limpiarBase64Residual(datos);
      if (datos.datos) {
        datos.datos = this.limpiarBase64Residual(datos.datos);
      }
      
      // Verificar tamaño final antes de enviar
      const tamanoFinal = JSON.stringify(datos).length;
      const tamanoMBFinal = (tamanoFinal / (1024 * 1024)).toFixed(2);
if (tamanoFinal > 15 * 1024 * 1024) {
        console.error(`❌ ERROR: Payload aún demasiado grande (${tamanoMBFinal} MB) después de limpiar`);
        // Log detallado de qué contiene el objeto
        console.error('🔍 Estructura del objeto:', Object.keys(datos));
        if (datos.datos && datos.datos.imagenesRegistro) {
          console.error(`📸 imagenesRegistro tiene ${datos.datos.imagenesRegistro.length} elementos`);
        }
        throw new Error(`El formulario aún es demasiado grande (${tamanoMBFinal} MB) después de limpiar base64. Por favor, verifica la consola para más detalles.`);
      }
      
      const url = `${this.baseURL}/api/historial-formularios/${id}`;
const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(datos)
      });

if (!response.ok) {
        let errorData;
        const contentType = response.headers.get('content-type');
        
        try {
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
        const errorText = await response.text();
            errorData = { error: errorText };
          }
        } catch (e) {
          errorData = { error: 'Error desconocido al leer la respuesta' };
        }
        
        console.error('❌ Error response:', errorData);
        
        // Mostrar mensaje más específico según el tipo de error
        if (response.status === 413) {
          const mensaje = errorData.error || 'El formulario es demasiado grande';
          const tamanoMB = errorData.tamanoMB ? ` (${errorData.tamanoMB} MB)` : '';
          throw new Error(`${mensaje}${tamanoMB}. Por favor, reduce el número de imágenes o comprímelas antes de guardar.`);
        } else if (response.status === 400) {
          const mensaje = errorData.error || 'Error en los datos enviados';
          throw new Error(`${mensaje}. ${errorData.detalles ? JSON.stringify(errorData.detalles) : ''}`);
        } else {
          const mensaje = errorData.error || `Error HTTP: ${response.status}`;
          throw new Error(mensaje);
        }
      }

      const data = await response.json();
return data.formulario;
    } catch (error) {
      console.error('❌ Error actualizando formulario:', error);
      throw error;
    }
  }

  // Eliminar un formulario del historial
  async eliminarFormulario(id) {
    try {
      const response = await fetch(`${this.baseURL}/api/historial-formularios/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error eliminando formulario:', error);
      throw error;
    }
  }

  // Obtener un formulario específico por ID
  async obtenerFormulario(id) {
    try {
      const response = await fetch(`${this.baseURL}/api/historial-formularios/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.formulario;
    } catch (error) {
      console.error('Error obteniendo formulario:', error);
      throw error;
    }
  }

  // Descargar un formulario
  async descargarFormulario(id) {
    try {
const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const url = `${this.baseURL}/api/historial-formularios/${id}/descargar`;
const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': '*/*'
        }
      });

if (!response.ok) {
        let errorMessage = `Error HTTP: ${response.status}`;
        let errorData = null;
        let necesitaRegeneracion = false;
        
        // Intentar obtener más detalles del error
        try {
          const errorText = await response.text();
          console.error('❌ Error response body:', errorText);
          
          if (errorText) {
            try {
              const errorJson = JSON.parse(errorText);
              errorData = errorJson;
              errorMessage = errorJson.message || errorJson.error || errorText;
              necesitaRegeneracion = errorJson.necesitaRegeneracion || false;
            } catch {
              errorMessage = `${errorMessage}: ${errorText}`;
            }
          }
        } catch (e) {
          console.error('❌ No se pudo leer el body del error:', e);
        }
        
        // Fallback multi-entorno: si el endpoint falla por archivo faltante,
        // intentar descargar desde la ruta estática reportada por el backend.
        if (response.status === 404 && errorData?.detalles?.rutaOriginal) {
          const candidatos = getUploadsUrlCandidates(errorData.detalles.rutaOriginal);
          const mismoOrigen = (absUrl) => {
            try {
              const u = new URL(absUrl, window.location.origin);
              return u.origin === window.location.origin;
            } catch {
              return false;
            }
          };

          const abrirDescargaNavegador = (url) => {
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          };

          for (const candidato of candidatos) {
            try {
              if (!mismoOrigen(candidato)) {
                abrirDescargaNavegador(candidato);
return true;
              }

              const fallbackResp = await fetch(candidato, {
                method: 'GET',
                headers: { 'Accept': '*/*' }
              });
              if (!fallbackResp.ok) continue;

              const blob = await fallbackResp.blob();
              if (!blob || blob.size === 0) continue;

              const filename = errorData?.detalles?.nombreArchivo || 'formulario.docx';
              const downloadUrl = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = downloadUrl;
              a.download = filename;
              a.style.display = 'none';
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(downloadUrl);
              document.body.removeChild(a);
return true;
            } catch (fallbackError) {
              // Continuar con el siguiente candidato
            }
          }
        }

        // Crear error con información adicional
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = errorData;
        error.necesitaRegeneracion = necesitaRegeneracion;
        throw error;
      }

      // Verificar que la respuesta sea un archivo
      const contentType = response.headers.get('content-type');
      if (!contentType || contentType.includes('application/json')) {
        console.warn('⚠️ La respuesta no parece ser un archivo, content-type:', contentType);
      }

      const blob = await response.blob();
if (blob.size === 0) {
        throw new Error('El archivo descargado está vacío');
      }

      // Obtener nombre del archivo del header o usar uno por defecto
      let filename = 'formulario.docx';
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
// Crear y descargar el archivo
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Limpiar
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

return true;
      
    } catch (error) {
      console.error('❌ Error descargando formulario:', error);
      console.error('❌ Stack trace:', error.stack);
      throw error;
    }
  }

  // Subir/reemplazar archivo Word asociado a un formulario
  async subirArchivoFormulario(id, archivoFile) {
    try {
      if (!id) throw new Error('ID de formulario requerido');
      if (!(archivoFile instanceof File)) throw new Error('Archivo Word inválido');

      // Mismo host que las APIs y el GET .../descargar. Si en dev se prioriza PROD,
      // el .docx queda en otro servidor y localhost devuelve 404 al descargar.
      const servidoresCandidatos = [this.baseURL];
      if (this.uploadsURL && this.uploadsURL !== this.baseURL) {
        servidoresCandidatos.push(this.uploadsURL);
      }

      let ultimoError = null;
      for (const servidor of servidoresCandidatos) {
        try {
          const formData = new FormData();
          formData.append('archivo', archivoFile);

          const response = await fetch(`${servidor}/api/historial-formularios/${id}/archivo`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(errorText || `Error HTTP: ${response.status}`);
          }

          const data = await response.json();
return data;
        } catch (errorIntento) {
          ultimoError = errorIntento;
          console.warn('⚠️ Falló subida de Word en servidor:', servidor, errorIntento?.message || errorIntento);
        }
      }

      throw ultimoError || new Error('No se pudo subir el archivo Word');
    } catch (error) {
      console.error('Error subiendo archivo Word del formulario:', error);
      throw error;
    }
  }

  // Buscar formularios por texto
  async buscarFormularios(texto) {
    try {
      const response = await fetch(`${this.baseURL}/api/historial-formularios/buscar?q=${encodeURIComponent(texto)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.formularios || [];
    } catch (error) {
      console.error('Error buscando formularios:', error);
      throw error;
    }
  }

  // Obtener estadísticas del historial
  async obtenerEstadisticas() {
    try {
      const response = await fetch(`${this.baseURL}/api/historial-formularios/estadisticas`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.estadisticas || {};
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  // Obtener casos organizados por carpeta
  async obtenerCasosOrganizados() {
    try {
      const response = await fetch(`${this.baseURL}/api/historial-formularios/casos-organizados`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error obteniendo casos organizados:', error);
      throw error;
    }
  }

  // Obtener formularios de un caso específico
  async obtenerFormulariosPorCaso(casoId) {
    try {
      const response = await fetch(`${this.baseURL}/api/historial-formularios/caso/${casoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error obteniendo formularios del caso:', error);
      throw error;
    }
  }

  // Obtener secuencia por número de ajuste (modo nuevo, compatible con histórico)
  async obtenerSecuenciaPorNumeroAjuste(numeroAjuste) {
    try {
      const response = await fetch(`${this.baseURL}/api/historial-formularios/secuencia/${encodeURIComponent(numeroAjuste)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error obteniendo secuencia por número de ajuste:', error);
      throw error;
    }
  }

  // Upsert de secuencia por número de ajuste (aditivo, no modifica histórico previo)
  async actualizarSecuenciaPorNumeroAjuste(numeroAjuste, payload) {
    try {
      const response = await fetch(`${this.baseURL}/api/historial-formularios/secuencia/${encodeURIComponent(numeroAjuste)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload || {})
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error actualizando secuencia por número de ajuste:', error);
      throw error;
    }
  }

  // Función helper para crear un objeto de formulario
  crearFormulario(tipo, titulo, datos, archivo, estado = ESTADOS_FORMULARIO.COMPLETADO) {
    return {
      tipo,
      titulo,
      usuario: localStorage.getItem('nombre') || 'Usuario',
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: new Date().toISOString(),
      estado,
      archivo,
      datos,
      metadata: {
        version: '1.0',
        creadoPor: localStorage.getItem('userId') || 'unknown',
        modificadoPor: localStorage.getItem('userId') || 'unknown'
      }
    };
  }

  // Función helper para validar un formulario
  validarFormulario(formulario) {
    const errores = [];

    if (!formulario.tipo) {
      errores.push('El tipo de formulario es requerido');
    }

    if (!formulario.titulo) {
      errores.push('El título es requerido');
    }

    if (!formulario.archivo) {
      errores.push('El archivo es requerido');
    }

    if (!formulario.datos) {
      errores.push('Los datos del formulario son requeridos');
    }

    return {
      esValido: errores.length === 0,
      errores
    };
  }
}

// Crear instancia del servicio
const historialService = new HistorialService();

export default historialService;
