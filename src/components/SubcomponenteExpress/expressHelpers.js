import { useCallback, useEffect, useState } from 'react';
import { BASE_URL } from '../../config/apiConfig.js';

export const EXPRESS_LIMIT_FETCH = 1500;
export const EXPRESS_COLUMNAS_STORAGE_KEY = 'express-reporte-columnas-v1';
/** Filas visibles por página en el reporte Express */
export const EXPRESS_REPORTE_PAGE_SIZE = 25;

export const ordenarLista = (lista = [], selector = (item) => item) =>
  [...lista].sort((a, b) => {
    const valorA = selector(a);
    const valorB = selector(b);
    const textoA = valorA == null ? '' : valorA.toString();
    const textoB = valorB == null ? '' : valorB.toString();
    return textoA.localeCompare(textoB, 'es', { sensitivity: 'base' });
  });

export const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '$0';
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

export const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

export const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function useExpressCatalogos() {
  const [catalogoResponsables, setCatalogoResponsables] = useState([]);
  const [catalogoAseguradoras, setCatalogoAseguradoras] = useState([]);
  const [catalogoEstados, setCatalogoEstados] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  useEffect(() => {
    let cancelado = false;

    const cargarCatalogos = async () => {
      setLoadingCatalogos(true);
      try {
        const token = localStorage.getItem('token');
        const [responsablesRes, aseguradorasRes, estadosRes] = await Promise.allSettled([
          fetch(`${BASE_URL}/api/responsables`),
          fetch(`${BASE_URL}/api/clientes`),
          fetch(`${BASE_URL}/api/estados/express`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
        ]);

        if (cancelado) return;

        if (responsablesRes.status === 'fulfilled') {
          const data = await responsablesRes.value.json().catch(() => []);
          const lista =
            data?.success && Array.isArray(data.data)
              ? data.data
              : Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                  ? data.data
                  : [];
          setCatalogoResponsables(lista);
        } else {
          setCatalogoResponsables([]);
        }

        if (aseguradorasRes.status === 'fulfilled') {
          const data = await aseguradorasRes.value.json().catch(() => []);
          const lista = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
          setCatalogoAseguradoras(lista);
        } else {
          setCatalogoAseguradoras([]);
        }

        if (estadosRes.status === 'fulfilled') {
          const data = await estadosRes.value.json().catch(() => []);
          const lista =
            data?.success && Array.isArray(data.data)
              ? data.data
              : Array.isArray(data)
                ? data
                : Array.isArray(data?.data)
                  ? data.data
                  : [];
          setCatalogoEstados(lista);
        } else {
          setCatalogoEstados([]);
        }
      } catch (err) {
        console.error('Error cargando catálogos Express:', err);
        if (!cancelado) {
          setCatalogoResponsables([]);
          setCatalogoAseguradoras([]);
          setCatalogoEstados([]);
        }
      } finally {
        if (!cancelado) setLoadingCatalogos(false);
      }
    };

    cargarCatalogos();
    return () => {
      cancelado = true;
    };
  }, []);

  const obtenerNombreEstado = useCallback(
    (codigo) => {
      const valor = codigo !== undefined && codigo !== null ? String(codigo) : '';
      if (!valor) return '';
      const valorNorm = valor
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ' ');
      const estado = catalogoEstados.find((item) => {
        const desc = (item.descEstdo ?? item.descEstado ?? item.descripcion ?? item.label ?? '')
          .normalize('NFD')
          .replace(/\p{M}/gu, '')
          .trim()
          .toUpperCase()
          .replace(/\s+/g, ' ');
        return (
          String(item.codiEstdo) === valor ||
          String(item.codiEstado) === valor ||
          String(item.codigo) === valor ||
          String(item.value) === valor ||
          (desc && desc === valorNorm)
        );
      });
      return (
        estado?.descEstdo ??
        estado?.descEstado ??
        estado?.descripcion ??
        estado?.label ??
        estado?.nombre ??
        valor
      );
    },
    [catalogoEstados]
  );

  const obtenerNombreAseguradora = useCallback(
    (codigo) => {
      const valor = codigo !== undefined && codigo !== null ? String(codigo) : '';
      if (!valor) return '';
      const aseguradora = catalogoAseguradoras.find(
        (item) =>
          String(item.codiAsgrdra) === valor ||
          String(item.cod1Asgrdra) === valor ||
          String(item.codigo) === valor ||
          String(item._id) === valor ||
          String(item.id) === valor
      );
      return (
        aseguradora?.rzonSocial ??
        aseguradora?.razonSocial ??
        aseguradora?.nombre ??
        aseguradora?.label ??
        aseguradora?.cliente ??
        valor
      );
    },
    [catalogoAseguradoras]
  );

  const obtenerNombreResponsable = useCallback(
    (codigo) => {
      const valor = codigo !== undefined && codigo !== null ? String(codigo) : '';
      if (!valor) return '';
      const responsable = catalogoResponsables.find(
        (item) =>
          String(item.codiRespnsble) === valor ||
          String(item.codigo) === valor ||
          String(item._id) === valor ||
          item.nmbrRespnsble === valor ||
          item.nombre === valor ||
          item.label === valor
      );
      return (
        responsable?.nmbrRespnsble ??
        responsable?.nombre ??
        responsable?.label ??
        responsable?.responsable ??
        valor
      );
    },
    [catalogoResponsables]
  );

  return {
    catalogoResponsables,
    catalogoAseguradoras,
    catalogoEstados,
    loadingCatalogos,
    obtenerNombreEstado,
    obtenerNombreAseguradora,
    obtenerNombreResponsable,
  };
}

/** URL absoluta para anexo guardado en servidor o archivo local pendiente de subir */
export function resolverUrlAnexoExpress(anexo, baseUrl = BASE_URL) {
  if (!anexo) return null;
  if (anexo.file instanceof File || anexo.file instanceof Blob) {
    return URL.createObjectURL(anexo.file);
  }
  const url = anexo.url || anexo.ruta || '';
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const base = (baseUrl || '').replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

export function puedeAccederAnexoExpress(anexo) {
  return Boolean(anexo?.url || anexo?.file);
}

export function verAnexoExpress(anexo, baseUrl = BASE_URL) {
  const enlace = resolverUrlAnexoExpress(anexo, baseUrl);
  if (!enlace) {
    return { ok: false, error: 'No hay URL disponible para ver este documento.' };
  }
  window.open(enlace, '_blank', 'noopener,noreferrer');
  return { ok: true };
}

export function descargarAnexoExpress(anexo, baseUrl = BASE_URL) {
  const enlace = resolverUrlAnexoExpress(anexo, baseUrl);
  if (!enlace) {
    return { ok: false, error: 'No hay URL disponible para descargar este documento.' };
  }
  const link = document.createElement('a');
  link.href = enlace;
  link.download = anexo.nombre || anexo.filename || 'documento';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (enlace.startsWith('blob:')) {
    setTimeout(() => URL.revokeObjectURL(enlace), 2000);
  }
  return { ok: true };
}
