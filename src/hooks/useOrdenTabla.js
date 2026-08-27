import { useCallback, useMemo, useState } from 'react';

function esVacioOrden(valor) {
  return valor === null || valor === undefined || valor === '' || valor === '—';
}

function milisFechaOrden(valor) {
  if (valor instanceof Date) {
    const t = valor.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof valor === 'string') {
    const s = valor.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{4}\/\d{2}\/\d{2}/.test(s)) {
      const t = Date.parse(s);
      return Number.isNaN(t) ? null : t;
    }
  }
  return null;
}

function numeroOrden(valor) {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor === 'boolean') return valor ? 1 : 0;
  if (typeof valor === 'string') {
    const s = valor.trim().replace(/\s/g, '').replace(',', '.');
    if (/^-?\d+(\.\d+)?$/.test(s)) {
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

export function compararValoresOrden(a, b) {
  const fa = milisFechaOrden(a);
  const fb = milisFechaOrden(b);
  if (fa !== null && fb !== null) return fa - fb;

  const na = numeroOrden(a);
  const nb = numeroOrden(b);
  if (na !== null && nb !== null) return na - nb;

  return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' });
}

export function valorOrdenPorDefecto(item, campo) {
  if (campo === 'docs') return Array.isArray(item?.archivos) ? item.archivos.length : 0;
  return item?.[campo];
}

export function ordenarListaPorCampo(lista = [], campo, asc = true, getValor = valorOrdenPorDefecto) {
  if (!campo) return lista;
  const dir = asc ? 1 : -1;
  return [...lista].sort((x, y) => {
    const va = getValor(x, campo);
    const vb = getValor(y, campo);
    const emptyA = esVacioOrden(va);
    const emptyB = esVacioOrden(vb);
    if (emptyA && emptyB) return 0;
    if (emptyA) return 1;
    if (emptyB) return -1;
    return compararValoresOrden(va, vb) * dir;
  });
}

export function aplicarOrdenTabla(lista, orden, getValor = valorOrdenPorDefecto) {
  if (!orden?.campo) return lista;
  return ordenarListaPorCampo(lista, orden.campo, orden.asc, getValor);
}

export function useOrdenTabla(campoInicial = null, ascInicial = true) {
  const [orden, setOrden] = useState({ campo: campoInicial, asc: ascInicial });
  const cambiarOrden = useCallback((campo) => {
    setOrden((prev) => ({
      campo,
      asc: prev.campo === campo ? !prev.asc : true,
    }));
  }, []);
  return { orden, cambiarOrden };
}

export function useListaOrdenada(lista, orden, getValor = valorOrdenPorDefecto) {
  return useMemo(() => aplicarOrdenTabla(lista, orden, getValor), [lista, orden, getValor]);
}
