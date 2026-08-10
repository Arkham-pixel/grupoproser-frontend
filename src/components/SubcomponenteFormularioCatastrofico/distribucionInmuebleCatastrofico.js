/**
 * Distribución del inmueble según clase/tipo (mismo criterio que Propiedades).
 */
import { resolverPlantillaAreas } from '../inspeccion/propiedadesAreasConfig.js';

export const CLASES_TIPOS_INMUEBLE_CATASTROFICO = {
  Residencial: [
    'Casa',
    'Apartamento',
    'Apartaestudio',
    'Casa en conjunto cerrado',
    'Casa campestre',
    'Local mixto (vivienda)',
  ],
  Comercial: [
    'Local comercial',
    'Oficina',
    'Consultorio',
    'Bodega comercial',
    'Local en centro comercial',
  ],
  Industrial: [
    'Bodega industrial',
    'Nave industrial',
    'Planta industrial',
    'Taller',
  ],
  Mixto: [
    'Edificio mixto',
    'Casa con local comercial',
    'Apartamento con oficina',
  ],
  Institucional: [
    'Edificio educativo',
    'Edificio de salud',
    'Edificio religioso',
    'Edificio gubernamental',
    'Otro institucional',
  ],
};

export const CLASES_INMUEBLE_CATASTROFICO = Object.keys(CLASES_TIPOS_INMUEBLE_CATASTROFICO);

/** Zonas sugeridas para «Distribución del inmueble» a partir de la plantilla de Propiedades. */
export function zonasDistribucionDesdePlantilla(claseInmueble, tipoInmueble) {
  if (!String(claseInmueble || '').trim()) return [];
  const plantilla = resolverPlantillaAreas(claseInmueble, tipoInmueble) || [];
  return plantilla.map((area) => ({
    zona: area?.titulo || area?.name || area?.id || 'Zona',
    cantidad: '',
    areaId: area?.id || '',
  }));
}

/**
 * Al cambiar clase/tipo: conserva cantidades de zonas con el mismo nombre;
 * agrega las nuevas vacías y quita las que ya no aplican (salvo personalizadas sin areaId).
 */
export function fusionarDistribucionConPlantilla(distribucionActual = [], claseInmueble, tipoInmueble) {
  const sugeridas = zonasDistribucionDesdePlantilla(claseInmueble, tipoInmueble);
  const prev = Array.isArray(distribucionActual) ? distribucionActual : [];
  const porNombre = new Map();
  prev.forEach((row) => {
    const key = String(row?.zona || '')
      .trim()
      .toLowerCase();
    if (key) porNombre.set(key, row);
  });

  const base = sugeridas.map((zona) => {
    const key = String(zona.zona || '')
      .trim()
      .toLowerCase();
    const anterior = porNombre.get(key);
    if (!anterior) return zona;
    return {
      ...zona,
      cantidad: anterior.cantidad ?? '',
    };
  });

  // Conservar zonas manuales (sin areaId de plantilla) que el usuario haya agregado
  const idsPlantilla = new Set(sugeridas.map((z) => z.areaId).filter(Boolean));
  const nombresPlantilla = new Set(
    sugeridas.map((z) =>
      String(z.zona || '')
        .trim()
        .toLowerCase()
    )
  );
  const extras = prev.filter((row) => {
    const key = String(row?.zona || '')
      .trim()
      .toLowerCase();
    if (!key) return false;
    if (nombresPlantilla.has(key)) return false;
    if (row.areaId && idsPlantilla.has(row.areaId)) return false;
    return !row.areaId; // solo personalizadas
  });

  return [...base, ...extras];
}
