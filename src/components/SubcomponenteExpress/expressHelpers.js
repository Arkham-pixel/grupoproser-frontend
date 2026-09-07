import { useCallback, useEffect, useState } from 'react';
import { BASE_URL } from '../../config/apiConfig.js';
import { resolverUrlArchivo } from '../../services/storageSignedUrl.js';
import { normCatalogoLabel, resolverNombreCatalogo } from '../../services/expressCatalogoService.js';
import { crearFechaLocal } from '../../utils/fechaUtils.js';
import i18n from '../../i18n';

export const EXPRESS_LIMIT_FETCH = 2000;
/** Lote por petición al cargar todos los casos Express */
export const EXPRESS_FETCH_BATCH = EXPRESS_LIMIT_FETCH;
export const EXPRESS_COLUMNAS_STORAGE_KEY = 'express-reporte-columnas-v1';
export const EXPRESS_REPORTE_FILTROS_STORAGE_KEY = 'express-reporte-filtros-v1';
/** Filas visibles por página en el reporte Express */
export const EXPRESS_REPORTE_PAGE_SIZE = 25;

const FILTROS_REPORTE_EXPRESS_DEFAULT = {
  busqueda: '',
  filtroResponsable: '',
  filtroEstado: '',
  filtroAseguradora: '',
  filtroAmparo: '',
  fechaInicio: '',
  fechaFin: '',
  paginaActual: 1,
};

export function cargarFiltrosReporteExpress() {
  try {
    const raw = sessionStorage.getItem(EXPRESS_REPORTE_FILTROS_STORAGE_KEY);
    if (!raw) return { ...FILTROS_REPORTE_EXPRESS_DEFAULT };
    const parsed = JSON.parse(raw);
    return {
      ...FILTROS_REPORTE_EXPRESS_DEFAULT,
      ...parsed,
      paginaActual: Math.max(1, Number(parsed?.paginaActual) || 1),
    };
  } catch {
    return { ...FILTROS_REPORTE_EXPRESS_DEFAULT };
  }
}

export function guardarFiltrosReporteExpress(filtros = {}) {
  try {
    sessionStorage.setItem(
      EXPRESS_REPORTE_FILTROS_STORAGE_KEY,
      JSON.stringify({ ...FILTROS_REPORTE_EXPRESS_DEFAULT, ...filtros })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function limpiarFiltrosReporteExpressStorage() {
  try {
    sessionStorage.removeItem(EXPRESS_REPORTE_FILTROS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export const ordenarLista = (lista = [], selector = (item) => item) =>
  [...lista].sort((a, b) => {
    const valorA = selector(a);
    const valorB = selector(b);
    const textoA = valorA == null ? '' : valorA.toString();
    const textoB = valorB == null ? '' : valorB.toString();
    return textoA.localeCompare(textoB, 'es', { sensitivity: 'base' });
  });

export const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') {
    return '$0';
  }
  const raw =
    typeof value === 'number'
      ? value
      : Number(
          String(value)
            .replace(/[$\s]/g, '')
            .replace(/\./g, '')
            .replace(/,/g, '.')
        );
  if (Number.isNaN(raw)) {
    return '$0';
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(raw);
};

export const parseDate = (value) => crearFechaLocal(value);

export const formatDate = (value) => {
  const date = crearFechaLocal(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** YYYY-MM-DD para comparar filtros de calendario sin desfase UTC */
export const fechaCalendarioISO = (value) => formatDate(value);

export const avisoEnRango = (aviso, desde, hasta) => {
  const iso = fechaCalendarioISO(aviso);
  if (!iso) return false;
  if (desde && iso < desde) return false;
  if (hasta && iso > hasta) return false;
  return true;
};

export const normCatalogoTexto = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');

/** @deprecated usar normCatalogoTexto */
export const normNombreResponsable = normCatalogoTexto;

const tokensNombreResponsable = (nombreNorm) => nombreNorm.split(' ').filter(Boolean);

const variantesNombreResponsable = (nombreNorm) => {
  const variants = new Set([nombreNorm]);
  const parts = tokensNombreResponsable(nombreNorm);
  if (!parts.length) return [...variants];

  const last = parts[parts.length - 1];
  if (last.endsWith('S') && last.length > 2) {
    const copy = [...parts];
    copy[copy.length - 1] = last.slice(0, -1);
    variants.add(copy.join(' '));
  } else if (last.length > 2) {
    const copy = [...parts];
    copy[copy.length - 1] = `${last}S`;
    variants.add(copy.join(' '));
  }

  return [...variants];
};

export const buildResponsableResolverIndex = (responsables = []) => {
  const porCodi = new Map();
  const porNorm = new Map();
  const catalogEntries = [];

  for (const responsable of responsables) {
    const codi = String(responsable.codiRespnsble ?? responsable._id ?? '').trim();
    const nombre =
      responsable.nmbrRespnsble ?? responsable.nombre ?? responsable.label ?? '';
    const norm = normNombreResponsable(nombre);
    if (!codi && !norm) continue;

    const entry = { codi, nombre, norm, tokens: tokensNombreResponsable(norm) };
    catalogEntries.push(entry);

    if (codi) porCodi.set(codi, entry);
    if (norm) {
      for (const variant of variantesNombreResponsable(norm)) {
        if (!porNorm.has(variant)) porNorm.set(variant, codi || norm);
      }
    }
  }

  return { porCodi, porNorm, catalogEntries };
};

export const resolverCodigoResponsable = (valor, catalogoResponsables = []) => {
  const raw = String(valor ?? '').trim();
  if (!raw) return '';

  const index = buildResponsableResolverIndex(catalogoResponsables);
  if (index.porCodi.has(raw)) return index.porCodi.get(raw).codi;

  const norm = normNombreResponsable(raw);
  if (index.porNorm.has(norm)) return index.porNorm.get(norm);

  for (const variant of variantesNombreResponsable(norm)) {
    if (index.porNorm.has(variant)) return index.porNorm.get(variant);
  }

  const inputTokens = tokensNombreResponsable(norm);
  if (inputTokens.length >= 2) {
    const matches = index.catalogEntries.filter((entry) =>
      inputTokens.every((token) => entry.tokens.includes(token))
    );
    if (matches.length === 1) return matches[0].codi;
  }

  return raw;
};

export const buildOpcionesFiltroResponsable = (
  siniestros = [],
  catalogoResponsables = [],
  obtenerNombreResponsable = (v) => v
) => {
  const index = buildResponsableResolverIndex(catalogoResponsables);
  const porCodi = new Map();

  for (const item of siniestros) {
    const raw = item?.responsable;
    if (!raw) continue;
    const codi = resolverCodigoResponsable(raw, catalogoResponsables);
    const key = index.porCodi.has(codi) ? codi : codi;
    const label = obtenerNombreResponsable(codi) || obtenerNombreResponsable(raw) || raw;
    if (!porCodi.has(key)) {
      porCodi.set(key, { value: key, label, rawValues: new Set([String(raw)]) });
    } else {
      porCodi.get(key).rawValues.add(String(raw));
    }
  }

  return [...porCodi.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'));
};

export const coincideFiltroResponsable = (valorCaso, filtro, catalogoResponsables = []) => {
  if (!filtro) return true;
  const raw = String(valorCaso ?? '').trim();
  if (!raw) return false;
  if (raw === filtro) return true;

  const codiCaso = resolverCodigoResponsable(raw, catalogoResponsables);
  const codiFiltro = resolverCodigoResponsable(filtro, catalogoResponsables);
  return codiCaso === codiFiltro;
};

export const buildClienteResolverIndex = (clientes = []) => {
  const porCodi = new Map();
  const porNorm = new Map();

  for (const cliente of clientes) {
    const codi = String(cliente.codiAsgrdra ?? cliente.codigo ?? cliente._id ?? '').trim();
    const nombre =
      cliente.rzonSocial ?? cliente.razonSocial ?? cliente.nombre ?? cliente.label ?? '';
    const norm = normCatalogoTexto(nombre);
    if (!codi && !norm) continue;

    const entry = { codi, nombre, norm };
    if (codi) porCodi.set(codi, entry);
    if (norm && codi && !porNorm.has(norm)) porNorm.set(norm, codi);
  }

  return { porCodi, porNorm };
};

export const resolverCodigoAseguradora = (valor, catalogoAseguradoras = []) => {
  const raw = String(valor ?? '').trim();
  if (!raw) return '';

  const index = buildClienteResolverIndex(catalogoAseguradoras);
  if (index.porCodi.has(raw)) return index.porCodi.get(raw).codi;

  const norm = normCatalogoTexto(raw);
  if (index.porNorm.has(norm)) return index.porNorm.get(norm);

  return raw;
};

export const buildOpcionesFiltroAseguradora = (
  siniestros = [],
  catalogoAseguradoras = [],
  obtenerNombreAseguradora = (v) => v
) => {
  const porCodi = new Map();

  for (const item of siniestros) {
    const raw = item?.aseguradora;
    if (!raw) continue;
    const codi = resolverCodigoAseguradora(raw, catalogoAseguradoras);
    const label = obtenerNombreAseguradora(codi) || obtenerNombreAseguradora(raw) || raw;
    if (!porCodi.has(codi)) {
      porCodi.set(codi, { value: codi, label });
    }
  }

  return [...porCodi.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'));
};

export const coincideFiltroAseguradora = (valorCaso, filtro, catalogoAseguradoras = []) => {
  if (!filtro) return true;
  const raw = String(valorCaso ?? '').trim();
  if (!raw) return false;
  if (raw === filtro) return true;

  const codiCaso = resolverCodigoAseguradora(raw, catalogoAseguradoras);
  const codiFiltro = resolverCodigoAseguradora(filtro, catalogoAseguradoras);
  return codiCaso === codiFiltro;
};

/** Variantes legacy del Excel → código de catálogo o texto canónico */
export const ALIAS_ESTADO_EXPRESS = {
  'ANALISIS SINIESTRO': '1',
  DESISTIDO: '2',
  'EN ESPERA DE DOCUMENTOS': '3',
  'PENDIENTE DOCUMENTOS': '3',
  'LIQUIDAR SINIESTRO': '4',
  'OBJETADO POR INDEMNIZACIONES': '5',
  'LIQUIDAR SINIESTRO - OBJETADO POR INDEMNIZACIONES': '5',
  'PENDIENTE ACEPTACION CLIENTE': '6',
  'PENDIENTE ACEPACTION CLIENTE': '6',
  'PENDIENTE AUTORIZACION DELEGADA RESERVA': '7',
  'PENDIENTE AUTORIDAD DELEGADA RESERVA': '7',
  'PENDIENTE AUTORIDAD DELEGADA': '7',
  'TRAMITADO A COMPLEX': '8',
  COMPLEX: '8',
  'SINIESTRO COMPLEX': '8',
  'NO RESPONSABILIDAD ASEGURADO': 'NO RESPONSABILIDAD DEL ASEGURADO',
  'NO RESPONSABILIDAD DEL ASEGURADO': 'NO RESPONSABILIDAD DEL ASEGURADO',
  ANULAR: 'ANULADO',
  ANULADO: 'ANULADO',
  CERRADO: 'CASO CERRADO',
  'CASO CERRADO': 'CASO CERRADO',
  'EN ESPERA DE DESISTIMIENTO': 'EN ESPERA DE DESISTIMIENTO',
  PRESCRITO: 'PRESCRITO',
  SIN_ESTADO: 'SIN_ESTADO',
};

export const buildEstadoExpressResolverIndex = (estados = []) => {
  const porCodi = new Map();
  const porNorm = new Map();

  for (const estado of estados) {
    const codi = String(estado.codiEstdo ?? estado.codiEstado ?? '').trim();
    const nombre =
      estado.descEstdo ?? estado.descEstado ?? estado.descripcion ?? estado.label ?? '';
    const norm = normCatalogoTexto(nombre);
    if (!codi && !norm) continue;

    if (codi) porCodi.set(codi, { codi, nombre, norm });
    if (norm && codi) porNorm.set(norm, codi);
  }

  for (const [alias, destino] of Object.entries(ALIAS_ESTADO_EXPRESS)) {
    const norm = normCatalogoTexto(alias);
    if (!porNorm.has(norm)) porNorm.set(norm, destino);
  }

  return { porCodi, porNorm };
};

export const resolverCodigoEstado = (valor, catalogoEstados = []) => {
  const raw = String(valor ?? '').trim();
  if (!raw) return '';

  const index = buildEstadoExpressResolverIndex(catalogoEstados);
  if (index.porCodi.has(raw)) return index.porCodi.get(raw).codi;

  const norm = normCatalogoTexto(raw);
  if (index.porNorm.has(norm)) return index.porNorm.get(norm);

  return raw;
};

export const buildOpcionesFiltroEstado = (
  siniestros = [],
  catalogoEstados = [],
  obtenerNombreEstado = (v) => v
) => {
  const porClave = new Map();

  for (const item of siniestros) {
    const raw = item?.estadoProceso;
    if (!raw) continue;
    const codi = resolverCodigoEstado(raw, catalogoEstados);
    const label = obtenerNombreEstado(codi) || obtenerNombreEstado(raw) || raw;
    if (!porClave.has(codi)) {
      porClave.set(codi, { value: codi, label });
    }
  }

  return [...porClave.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'));
};

export const coincideFiltroEstado = (valorCaso, filtro, catalogoEstados = []) => {
  if (!filtro) return true;
  const raw = String(valorCaso ?? '').trim();
  if (!raw) return false;
  if (raw === filtro) return true;

  const codiCaso = resolverCodigoEstado(raw, catalogoEstados);
  const codiFiltro = resolverCodigoEstado(filtro, catalogoEstados);
  return codiCaso === codiFiltro;
};

export const buildOpcionesFiltroAmparo = (siniestros = [], catalogoAmparos = []) => {
  const porNorm = new Map();

  for (const item of siniestros) {
    const raw = String(item?.amparo ?? '').trim();
    if (!raw) continue;
    const label = resolverNombreCatalogo(catalogoAmparos, raw) || raw;
    const key = normCatalogoLabel(label);
    if (!porNorm.has(key)) {
      porNorm.set(key, { value: key, label });
    }
  }

  return [...porNorm.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'));
};

export const coincideFiltroAmparo = (valorCaso, filtro) => {
  if (!filtro) return true;
  const raw = String(valorCaso ?? '').trim();
  if (!raw) return false;
  return normCatalogoLabel(raw) === normCatalogoLabel(filtro);
};

const indiceCiudadesVacio = () => ({ porCodi: new Map(), porNorm: new Map() });

export const buildCiudadResolverIndex = (ciudades = []) => {
  const porCodi = new Map();
  const porNorm = new Map();

  for (const ciudad of ciudades) {
    const nombre = ciudad.descMunicipio ?? ciudad.label ?? ciudad.nombre ?? '';
    const nombreTexto = nombre == null ? '' : String(nombre).trim();
    if (!nombreTexto) continue;

    const entry = { nombre: nombreTexto };
    const codigos = [
      ciudad.codiMunicipio,
      ciudad.codiCpoblado,
      ciudad.value,
      ciudad._id,
    ];

    for (const codigo of codigos) {
      const codi = codigo == null ? '' : String(codigo).trim();
      if (codi && !porCodi.has(codi)) {
        porCodi.set(codi, entry);
      }
    }

    const norm = normCatalogoTexto(nombreTexto);
    if (norm && !porNorm.has(norm)) {
      porNorm.set(norm, entry);
    }
  }

  return { porCodi, porNorm };
};

export const resolverNombreCiudad = (valor, index = indiceCiudadesVacio()) => {
  const raw = String(valor ?? '').trim();
  if (!raw) return '';

  if (index.porCodi.has(raw)) {
    return index.porCodi.get(raw).nombre;
  }

  const norm = normCatalogoTexto(raw);
  if (index.porNorm.has(norm)) {
    return index.porNorm.get(norm).nombre;
  }

  return raw;
};

export function useExpressCatalogos() {
  const [catalogoResponsables, setCatalogoResponsables] = useState([]);
  const [catalogoAseguradoras, setCatalogoAseguradoras] = useState([]);
  const [catalogoEstados, setCatalogoEstados] = useState([]);
  const [indiceCiudades, setIndiceCiudades] = useState(() => indiceCiudadesVacio());
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  useEffect(() => {
    let cancelado = false;

    const cargarCatalogos = async () => {
      setLoadingCatalogos(true);
      try {
        const token = localStorage.getItem('token');
        const [responsablesRes, aseguradorasRes, estadosRes, ciudadesRes] = await Promise.allSettled([
          fetch(`${BASE_URL}/api/responsables`),
          fetch(`${BASE_URL}/api/clientes`),
          fetch(`${BASE_URL}/api/estados/express`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
          fetch(`${BASE_URL}/api/ciudades`),
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

        if (ciudadesRes.status === 'fulfilled') {
          const data = await ciudadesRes.value.json().catch(() => []);
          const lista = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
          setIndiceCiudades(buildCiudadResolverIndex(lista));
        } else {
          setIndiceCiudades(indiceCiudadesVacio());
        }
      } catch (err) {
        console.error('Error cargando catálogos Express:', err);
        if (!cancelado) {
          setCatalogoResponsables([]);
          setCatalogoAseguradoras([]);
          setCatalogoEstados([]);
          setIndiceCiudades(indiceCiudadesVacio());
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

      const resolved = resolverCodigoEstado(valor, catalogoEstados);
      if (/^\d+$/.test(resolved)) {
        const estado = catalogoEstados.find(
          (item) =>
            String(item.codiEstdo) === resolved ||
            String(item.codiEstado) === resolved ||
            String(item.codigo) === resolved ||
            String(item.value) === resolved
        );
        return (
          estado?.descEstdo ??
          estado?.descEstado ??
          estado?.descripcion ??
          estado?.label ??
          estado?.nombre ??
          resolved
        );
      }

      return resolved;
    },
    [catalogoEstados]
  );

  const obtenerNombreAseguradora = useCallback(
    (codigo) => {
      const valor = codigo !== undefined && codigo !== null ? String(codigo) : '';
      if (!valor) return '';
      const normValor = normCatalogoTexto(valor);
      const aseguradora = catalogoAseguradoras.find(
        (item) =>
          String(item.codiAsgrdra) === valor ||
          String(item.cod1Asgrdra) === valor ||
          String(item.codigo) === valor ||
          String(item._id) === valor ||
          String(item.id) === valor ||
          normCatalogoTexto(item.rzonSocial) === normValor ||
          normCatalogoTexto(item.razonSocial) === normValor ||
          normCatalogoTexto(item.nombre) === normValor ||
          normCatalogoTexto(item.label) === normValor
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
      const normValor = normNombreResponsable(valor);
      const responsable = catalogoResponsables.find(
        (item) =>
          String(item.codiRespnsble) === valor ||
          String(item.codigo) === valor ||
          String(item._id) === valor ||
          normNombreResponsable(item.nmbrRespnsble) === normValor ||
          normNombreResponsable(item.nombre) === normValor ||
          normNombreResponsable(item.label) === normValor ||
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

  const obtenerNombreCiudad = useCallback(
    (codigo) => resolverNombreCiudad(codigo, indiceCiudades),
    [indiceCiudades]
  );

  return {
    catalogoResponsables,
    catalogoAseguradoras,
    catalogoEstados,
    loadingCatalogos,
    obtenerNombreEstado,
    obtenerNombreAseguradora,
    obtenerNombreResponsable,
    obtenerNombreCiudad,
    resolverCodigoResponsable: (v) => resolverCodigoResponsable(v, catalogoResponsables),
    resolverCodigoAseguradora: (v) => resolverCodigoAseguradora(v, catalogoAseguradoras),
    resolverCodigoEstado: (v) => resolverCodigoEstado(v, catalogoEstados),
  };
}

/** URL absoluta para anexo guardado en servidor o archivo local pendiente de subir */
export async function resolverUrlAnexoExpress(anexo) {
  if (!anexo) return null;
  if (anexo.file instanceof File || anexo.file instanceof Blob) {
    return URL.createObjectURL(anexo.file);
  }
  const url = anexo.url || anexo.ruta || '';
  if (!url) return null;
  return (await resolverUrlArchivo(url)) || null;
}

export function puedeAccederAnexoExpress(anexo) {
  return Boolean(anexo?.url || anexo?.ruta || anexo?.file);
}

/** Extensiones que el navegador suele abrir sin forzar descarga (vista previa). */
export function anexoExpressSePuedePrevisualizar(anexo) {
  const nombre = String(anexo?.nombre || anexo?.filename || anexo?.file?.name || '').toLowerCase();
  const tipo = String(anexo?.tipo || anexo?.mime || anexo?.mimetype || anexo?.file?.type || '').toLowerCase();
  if (tipo.startsWith('image/') || tipo === 'application/pdf' || tipo.startsWith('text/')) {
    return true;
  }
  return /\.(pdf|png|jpe?g|gif|webp|bmp|svg|txt|csv)$/i.test(nombre);
}

export async function verAnexoExpress(anexo, t = i18n.t.bind(i18n)) {
  const enlace = await resolverUrlAnexoExpress(anexo);
  if (!enlace) {
    return { ok: false, error: t('express.ui.attachments.viewUnavailable') };
  }
  window.open(enlace, '_blank', 'noopener,noreferrer');
  return { ok: true };
}

export async function descargarAnexoExpress(anexo, t = i18n.t.bind(i18n)) {
  const enlace = await resolverUrlAnexoExpress(anexo);
  if (!enlace) {
    return { ok: false, error: t('express.ui.attachments.downloadUnavailable') };
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
