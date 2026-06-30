import { CAMPOS_AREA } from './propiedadesAreasConfig.js';

export const HISTORIAL_AREAS_STORAGE_KEY = 'proser_propiedades_historial_areas';

export function crearIdAreaPersonalizada(titulo) {
  const slug = String(titulo)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 36) || 'area';
  return `custom_${slug}_${Date.now().toString(36)}`;
}

export function nombresAParametrosSugeridos(nombres = []) {
  return [...new Set(nombres.filter(Boolean).map((n) => String(n).trim()))].map((name, i) => ({
    name,
    key: `sug_${i}_${name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12)}`,
  }));
}

export function normalizarAreasPersonalizadas(lista) {
  if (!Array.isArray(lista)) return [];
  return lista
    .filter((a) => a && a.id && a.titulo)
    .map((a) => ({
      id: a.id,
      titulo: String(a.titulo).trim(),
      creadaEn: a.creadaEn || new Date().toISOString(),
      parametrosSugeridos: Array.isArray(a.parametrosSugeridos)
        ? a.parametrosSugeridos.map((p) =>
            typeof p === 'string' ? { name: p, key: `s_${p.slice(0, 8)}` } : p
          )
        : [],
      personalizada: true,
    }));
}

/** Combina plantilla por clase/tipo con áreas creadas por el usuario en este informe. */
export function combinarAreasInspeccion(plantillaBase, areasPersonalizadas = []) {
  const base = plantillaBase || [];
  const ids = new Set(base.map((a) => (a.tipo === 'alcobas' ? 'alcobas' : a.id)));
  const extras = normalizarAreasPersonalizadas(areasPersonalizadas)
    .filter((a) => !ids.has(a.id))
    .map((a) => ({
      id: a.id,
      titulo: a.titulo,
      tipo: 'simple',
      campos:
        a.parametrosSugeridos.length > 0
          ? a.parametrosSugeridos
          : [...CAMPOS_AREA.estandar],
      personalizada: true,
      creadaEn: a.creadaEn,
      parametrosSugeridos: a.parametrosSugeridos,
    }));
  return [...base, ...extras];
}

export function cargarHistorialAreasGlobal() {
  try {
    const raw = localStorage.getItem(HISTORIAL_AREAS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((h) => h && h.titulo)
      .sort((a, b) => (b.ultimaVez || '').localeCompare(a.ultimaVez || ''));
  } catch {
    return [];
  }
}

export function guardarHistorialAreasGlobal(historial) {
  try {
    localStorage.setItem(HISTORIAL_AREAS_STORAGE_KEY, JSON.stringify(historial));
  } catch (e) {
    console.warn('No se pudo guardar historial de áreas:', e);
  }
}

export function extraerParametrosDeItems(items) {
  if (!Array.isArray(items)) return [];
  return [...new Set(items.map((i) => String(i.parametro || '').trim()).filter(Boolean))];
}

/** Fusiona parámetros aprendidos sin incrementar el contador de uso. */
export function fusionarParametrosEnHistorial(titulo, parametrosNombres = []) {
  const tituloNorm = String(titulo).trim();
  if (!tituloNorm || !parametrosNombres.length) return cargarHistorialAreasGlobal();

  const historial = cargarHistorialAreasGlobal();
  const key = tituloNorm.toLowerCase();
  const idx = historial.findIndex((h) => h.titulo.toLowerCase() === key);
  if (idx < 0) return historial;

  const mergeParams = (prev = [], nuevos = []) => {
    const map = new Map();
    for (const p of [...prev, ...nuevos]) {
      const n = String(p).trim();
      if (n) map.set(n.toLowerCase(), n);
    }
    return [...map.values()];
  };

  historial[idx] = {
    ...historial[idx],
    parametrosFrecuentes: mergeParams(historial[idx].parametrosFrecuentes, parametrosNombres),
    ultimaVez: new Date().toISOString(),
  };
  guardarHistorialAreasGlobal(historial);
  return historial;
}

/** Registra o actualiza un área en el historial global (aprendizaje entre informes). */
export function registrarAreaEnHistorialGlobal(titulo, parametrosNombres = []) {
  const tituloNorm = String(titulo).trim();
  if (!tituloNorm) return cargarHistorialAreasGlobal();

  const historial = cargarHistorialAreasGlobal();
  const key = tituloNorm.toLowerCase();
  const idx = historial.findIndex((h) => h.titulo.toLowerCase() === key);
  const ahora = new Date().toISOString();

  const mergeParams = (prev = [], nuevos = []) => {
    const map = new Map();
    for (const p of [...prev, ...nuevos]) {
      const n = String(p).trim();
      if (n) map.set(n.toLowerCase(), n);
    }
    return [...map.values()];
  };

  if (idx >= 0) {
    historial[idx] = {
      ...historial[idx],
      titulo: tituloNorm,
      vecesUsada: (historial[idx].vecesUsada || 0) + 1,
      ultimaVez: ahora,
      parametrosFrecuentes: mergeParams(historial[idx].parametrosFrecuentes, parametrosNombres),
    };
  } else {
    historial.unshift({
      titulo: tituloNorm,
      vecesUsada: 1,
      ultimaVez: ahora,
      parametrosFrecuentes: mergeParams([], parametrosNombres),
    });
  }

  const limitado = historial.slice(0, 40);
  guardarHistorialAreasGlobal(limitado);
  return limitado;
}

/** Sincroniza parámetros aprendidos desde items del informe hacia áreas personalizadas + historial. */
export function aprenderParametrosAreasPersonalizadas(areasPersonalizadas, areasData) {
  const normalizadas = normalizarAreasPersonalizadas(areasPersonalizadas);
  if (!normalizadas.length) return normalizadas;

  let historial = cargarHistorialAreasGlobal();

  const actualizadas = normalizadas.map((area) => {
    const items = areasData?.[area.id];
    const nombres = extraerParametrosDeItems(items);
    if (nombres.length === 0) return area;

    const parametrosSugeridos = nombresAParametrosSugeridos([
      ...area.parametrosSugeridos.map((p) => p.name),
      ...nombres,
    ]);

    historial = fusionarParametrosEnHistorial(area.titulo, nombres);

    return { ...area, parametrosSugeridos };
  });

  return actualizadas;
}

export function areaPersonalizadaYaExiste(areasEfectivas, titulo) {
  const key = String(titulo).trim().toLowerCase();
  return areasEfectivas.some((a) => a.titulo.toLowerCase() === key);
}

export function crearEntradaAreaPersonalizada(titulo, parametrosFrecuentes = []) {
  const tituloNorm = String(titulo).trim();
  return {
    id: crearIdAreaPersonalizada(tituloNorm),
    titulo: tituloNorm,
    creadaEn: new Date().toISOString(),
    parametrosSugeridos: nombresAParametrosSugeridos(parametrosFrecuentes),
    personalizada: true,
  };
}
