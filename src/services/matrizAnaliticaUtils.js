/** Utilidades puras para lectura ejecutiva de la matriz de riesgos */
import i18n from '../i18n';

export const NIVELES_EJECUTIVOS = ['Bajo', 'Medio', 'Alto', 'Crítico'];

const COLORES_NIVEL = {
  Bajo: '#28a745',
  Medio: '#ffc107',
  Alto: '#fd7e14',
  Crítico: '#dc3545',
};

const ORDEN_NIVEL = { Bajo: 1, Medio: 2, Alto: 3, Crítico: 4 };

export function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

export function roundPct(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

export function calcularMaxImpacto(cat = {}) {
  const { economico = 1, operativo = 1, reputacional = 1, legal = 1 } = cat;
  return Math.max(Number(economico), Number(operativo), Number(reputacional), Number(legal));
}

export function calcularNivelInherente(prob, imp) {
  const multiplicacion = (Number(prob) || 0) * (Number(imp) || 0);
  if (multiplicacion <= 4) return { nivel: 'Bajo', color: COLORES_NIVEL.Bajo, valor: multiplicacion };
  if (multiplicacion <= 9) return { nivel: 'Medio', color: COLORES_NIVEL.Medio, valor: multiplicacion };
  if (multiplicacion <= 16) return { nivel: 'Alto', color: COLORES_NIVEL.Alto, valor: multiplicacion };
  return { nivel: 'Crítico', color: COLORES_NIVEL.Crítico, valor: multiplicacion };
}

export function calcularNivelResidualTecnico(valoracionCuantitativa) {
  const valor = Number(valoracionCuantitativa) || 0;
  if (valor <= 4) return { nivel: 'ACEPTABLE', color: COLORES_NIVEL.Bajo, valor };
  if (valor <= 8) return { nivel: 'TOLERABLE', color: COLORES_NIVEL.Medio, valor };
  if (valor <= 12) return { nivel: 'ALTO', color: COLORES_NIVEL.Alto, valor };
  return { nivel: 'CRÍTICO', color: COLORES_NIVEL.Crítico, valor };
}

/** Escala gerencial unificada (mockups ejecutivos: 1–25) */
export function calcularNivelEjecutivo(score) {
  const valor = Number(score) || 0;
  if (valor >= 17) return { nivel: 'Crítico', color: COLORES_NIVEL.Crítico, valor };
  if (valor >= 10) return { nivel: 'Alto', color: COLORES_NIVEL.Alto, valor };
  if (valor >= 5) return { nivel: 'Medio', color: COLORES_NIVEL.Medio, valor };
  return { nivel: 'Bajo', color: COLORES_NIVEL.Bajo, valor };
}

export function nivelEjecutivoDesdeResidualTecnico(nivelTecnico = '') {
  const mapa = {
    ACEPTABLE: 'Bajo',
    TOLERABLE: 'Medio',
    ALTO: 'Alto',
    CRÍTICO: 'Crítico',
    CRITICO: 'Crítico',
  };
  return mapa[String(nivelTecnico).toUpperCase()] || 'Medio';
}

export function calcularReduccion(inherente, residual) {
  const inh = Number(inherente) || 0;
  const res = Number(residual) || 0;
  if (inh <= 0) return 0;
  return roundPct(((inh - res) / inh) * 100);
}

export function promedio(lista, selector = (x) => x) {
  const valores = lista.map(selector).filter((v) => Number.isFinite(v));
  if (!valores.length) return 0;
  return round1(valores.reduce((a, b) => a + b, 0) / valores.length);
}

export function nivelGeneralDesdePromedio(promedioResidual) {
  return calcularNivelEjecutivo(promedioResidual).nivel.toUpperCase();
}

export function maxNivelEjecutivo(niveles = []) {
  return niveles.reduce((max, n) => {
    if (!n) return max;
    return (ORDEN_NIVEL[n] || 0) > (ORDEN_NIVEL[max] || 0) ? n : max;
  }, 'Bajo');
}

export function etiquetasCategorias(categorias = {}, catalogo = []) {
  return catalogo
    .filter((cat) => categorias?.[cat.valor])
    .map((cat) => (cat.etiquetaKey ? i18n.t(cat.etiquetaKey) : cat.etiqueta));
}

export function categoriaPrincipal(categorias = {}, catalogo = []) {
  const etiquetas = etiquetasCategorias(categorias, catalogo);
  return etiquetas[0] || i18n.t('riskMatrix.analytics.noCategory');
}

export function extraerValoraciones(valoracion) {
  if (!valoracion) return [];
  if (Array.isArray(valoracion.valoraciones)) return valoracion.valoraciones;
  if (Array.isArray(valoracion.riesgos)) return valoracion.riesgos;
  if (Array.isArray(valoracion)) return valoracion;
  return [];
}

export function normalizaSiNo(valor) {
  const s = String(valor || '').toLowerCase();
  if (s === 'sí' || s === 'si') return 'Sí';
  if (s === 'no') return 'No';
  return valor || '';
}

export function tieneControlDocumentado(controles = {}) {
  return normalizaSiNo(controles.existen) === 'Sí' && Boolean(String(controles.descripcion || '').trim());
}
