import { BASE_URL, resolveUploadsUrl } from '../config/apiConfig.js';
import {
  diasEnEstadoZurich,
  homologarCiudadZurich,
  migrarFechasEstadoZurich,
  ultimaGestionZurich,
} from '../components/SubcomponenteZurich/zurichHelpers.js';
import {
  fechasInformeParaCasoZurich,
  desgloseReservaPreliminarZurich,
  reservaSugeridaZurich,
  sanitizarInformeUnicoZurich,
  sanitizarLiquidadorZurich,
  camposPolizaParaCasoZurich,
  camposValoresGestionZurich,
  enriquecerCasoZurichDesdeInforme,
} from '../components/SubcomponenteZurich/liquidadorZurichHelpers.js';

const API_URL = `${BASE_URL}/api/zurich-listado`;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const parseMontoListaZurich = (valor) => {
  if (valor == null || valor === '') return 0;
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  const n = Number(
    String(valor)
      .replace(/\./g, '')
      .replace(/[^\d-]/g, '')
  );
  return Number.isFinite(n) ? n : 0;
};

/**
 * Reserva para reporte/listado:
 * - Si hay reservaSugerida del informe distinta y > 0, preferir la mayor
 *   (evita mostrar la fórmula vieja 185.808.000 cuando el preliminar ya tiene la buena).
 * - Campos livianos del aggregate: reservaSugeridaInforme.
 */
const reservaDesdeInformeOCaso = (item = {}) => {
  const delCaso = parseMontoListaZurich(item.reserva);
  const sug = parseMontoListaZurich(
    item.reservaSugeridaInforme ?? item.informeUnico?.reservaSugerida
  );
  if (sug > 0 && delCaso > 0) return Math.max(sug, delCaso);
  if (sug > 0) return sug;
  if (delCaso > 0) return delCaso;
  return item.reserva ?? null;
};

const valorAseguradoDesdeListaZurich = (item = {}) => {
  const delCaso = parseMontoListaZurich(item.valorAseguradoInmueble);
  if (delCaso > 0) return delCaso;
  const delInf = parseMontoListaZurich(
    item.valorAseguradoInforme ?? item.informeUnico?.valorAsegurado
  );
  if (delInf > 0) return delInf;
  const delLiq = parseMontoListaZurich(item.valorAseguradoLiquidador);
  if (delLiq > 0) return delLiq;
  const enc = item.liquidador?.encabezado?.valorAseguradoInmueble;
  const liq = item.liquidador?.liquidacionCatastrofico?.valorAsegurado;
  return parseMontoListaZurich(liq) || parseMontoListaZurich(enc) || item.valorAseguradoInmueble || null;
};

export const normalizeZurichListadoItem = (item = {}) => {
  const caso = migrarFechasEstadoZurich(item);
  const estado = caso.estado;
  const reserva = reservaDesdeInformeOCaso(item);
  const valorAseguradoInmueble = valorAseguradoDesdeListaZurich(item);
  return {
    ...caso,
    zc: item.zc ?? '',
    siniestro: item.siniestro ?? '',
    identificacion: item.identificacion ?? '',
    tipoIdentificacion: item.tipoIdentificacion ?? '',
    numeroPoliza: item.numeroPoliza ?? '',
    tipoPoliza: item.tipoPoliza ?? '',
    tipoPolizaOtro: item.tipoPolizaOtro ?? '',
    causa: item.causa ?? '',
    asegurado: item.asegurado ?? '',
    intermediario: item.intermediario ?? '',
    correoIntermediario: item.correoIntermediario ?? '',
    telefonoIntermediario: item.telefonoIntermediario ?? '',
    contactoIntermediario: item.contactoIntermediario ?? '',
    telefonoAsegurado: item.telefonoAsegurado ?? '',
    correoAsegurado: item.correoAsegurado ?? '',
    contactoAsegurado: item.contactoAsegurado ?? '',
    observaciones: item.observaciones ?? '',
    reserva,
    ciudad: homologarCiudadZurich(item.ciudad) || item.ciudad || '',
    departamento: item.departamento ?? caso.departamento ?? '',
    tomador: item.tomador ?? caso.tomador ?? '',
    direccionPredio: item.direccionPredio ?? caso.direccionPredio ?? '',
    fechaInicioPoliza: item.fechaInicioPoliza ?? caso.fechaInicioPoliza ?? null,
    fechaFinPoliza: item.fechaFinPoliza ?? caso.fechaFinPoliza ?? null,
    cobertura: item.cobertura ?? caso.cobertura ?? '',
    valorAseguradoInmueble:
      valorAseguradoInmueble > 0 ? valorAseguradoInmueble : item.valorAseguradoInmueble ?? null,
    valorReclamado: item.valorReclamado ?? caso.valorReclamado ?? null,
    valorLiquidado: item.valorLiquidado ?? caso.valorLiquidado ?? null,
    estadoFacturacion: item.estadoFacturacion ?? null,
    fechaMarcaFacturar: item.fechaMarcaFacturar ?? null,
    fechaMarcaFacturado: item.fechaMarcaFacturado ?? null,
    loteFacturacionId: item.loteFacturacionId ?? null,
    tarifa_honorarios: item.tarifa_honorarios ?? item.paquete_facturacion?.honorarios ?? null,
    tarifa_rango_id: item.tarifa_rango_id ?? item.paquete_facturacion?.rangoId ?? '',
    paquete_facturacion:
      item.paquete_facturacion && typeof item.paquete_facturacion === 'object'
        ? item.paquete_facturacion
        : null,
    ajustadorLider: item.ajustadorLider ?? '',
    ajustador: item.ajustador ?? '',
    inspector: item.inspector ?? '',
    estado,
    diasEnEstado: diasEnEstadoZurich(caso),
    ultimaGestion: ultimaGestionZurich(caso),
    liquidador: item.liquidador && typeof item.liquidador === 'object' ? item.liquidador : null,
    informeUnico: item.informeUnico && typeof item.informeUnico === 'object' ? item.informeUnico : null,
    archivos: Array.isArray(item.archivos) ? item.archivos : [],
    tieneInforme: Boolean(
      item.tieneInforme ?? (item.informeUnico && typeof item.informeUnico === 'object')
    ),
    tieneLiquidador: Boolean(
      item.tieneLiquidador ?? (item.liquidador && typeof item.liquidador === 'object')
    ),
    nArchivos: Number.isFinite(Number(item.nArchivos))
      ? Number(item.nArchivos)
      : Array.isArray(item.archivos)
        ? item.archivos.length
        : 0,
    tipoInforme: item.tipoInforme || item.informeUnico?.tipoInforme || '',
  };
};

const normalizeArray = (raw) =>
  Array.isArray(raw) ? raw.map((item) => normalizeZurichListadoItem(item ?? {})) : [];

export const getCasosZurichListadoPaginado = async ({ page = 1, limit = 100 } = {}) => {
  const qs = new URLSearchParams({ page, limit, _t: Date.now() });
  let ultimoError = null;
  for (let intento = 1; intento <= 3; intento += 1) {
    try {
      const response = await fetch(`${API_URL}?${qs}`, { headers: authHeaders() });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || payload?.mensaje || `Error al obtener los casos del listado Zurich (${response.status})`);
      }
      if (payload?.data && Array.isArray(payload.data)) {
        return { ...payload, data: normalizeArray(payload.data) };
      }
      if (Array.isArray(payload)) {
        return { data: normalizeArray(payload), total: payload.length };
      }
      return payload;
    } catch (error) {
      ultimoError = error;
      const red =
        error?.name === 'TypeError' ||
        /failed to fetch|networkerror|load failed/i.test(String(error?.message || ''));
      if (!red || intento === 3) break;
      await new Promise((r) => setTimeout(r, 400 * intento));
    }
  }
  if (ultimoError && /failed to fetch|networkerror|load failed/i.test(String(ultimoError.message || ''))) {
    throw new Error('No se pudo conectar con el servidor. Confirme que el backend está en el puerto 3000 y recargue.');
  }
  throw ultimoError;
};

export const fetchAllCasosZurichListado = async (batchSize = 250) => {
  const acumulado = [];
  let page = 1;
  let total = null;
  while (true) {
    const respuesta = await getCasosZurichListadoPaginado({ page, limit: batchSize });
    const lote = Array.isArray(respuesta?.data) ? respuesta.data : [];
    if (total == null && typeof respuesta?.total === 'number') total = respuesta.total;
    if (!lote.length) break;
    acumulado.push(...lote);
    if (total != null && acumulado.length >= total) break;
    const tamanoPagina = Number(respuesta?.limit) || batchSize;
    if (lote.length < tamanoPagina) break;
    page += 1;
  }
  return acumulado;
};

export const fetchTorreConfigZurich = async () => {
  const response = await fetch(`${API_URL}/torre-config`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.mensaje || `Error al obtener la config de la torre (${response.status})`);
  }
  return payload?.data ?? payload;
};

export const crearCasoZurichListado = async (datos) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.detalle || `Error al guardar (${response.status})`);
  }
  return normalizeZurichListadoItem(payload?.data ?? payload);
};

export const actualizarCasoZurichListado = async (id, datos) => {
  if (!id) throw new Error('Identificador de caso no válido');
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(datos),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.detalle || `Error al actualizar (${response.status})`);
  }
  return normalizeZurichListadoItem(payload?.data ?? payload);
};

export const getCasoZurichListadoById = async (id) => {
  if (!id) throw new Error('Identificador de caso no válido');
  const qs = new URLSearchParams({ _t: Date.now() });
  const response = await fetch(`${API_URL}/${id}?${qs}`, { headers: authHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al obtener el caso (${response.status})`);
  }
  const crudo = payload?.data ?? payload;
  const enriquecido = enriquecerCasoZurichDesdeInforme(crudo);
  const normalizado = normalizeZurichListadoItem(enriquecido);

  // Si la reserva/VA del informe no estaban en Gestionar, corregir en BD al abrir.
  const reservaAntes = Number(crudo?.reserva) || 0;
  const reservaNueva = Number(enriquecido?.reserva) || 0;
  const vaAntes = Number(crudo?.valorAseguradoInmueble) || 0;
  const vaNuevo = Number(enriquecido?.valorAseguradoInmueble) || 0;
  const hayCorreccion =
    (reservaNueva > 0 && reservaNueva !== reservaAntes) ||
    (vaNuevo > 0 && vaNuevo !== vaAntes) ||
    (Number(enriquecido?.valorReclamado) > 0 &&
      Number(enriquecido?.valorReclamado) !== Number(crudo?.valorReclamado || 0));
  if (hayCorreccion) {
    const patch = {};
    if (reservaNueva > 0) patch.reserva = reservaNueva;
    if (vaNuevo > 0) patch.valorAseguradoInmueble = vaNuevo;
    if (Number(enriquecido?.valorReclamado) > 0) {
      patch.valorReclamado = Number(enriquecido.valorReclamado);
    }
    if (Number(enriquecido?.valorLiquidado) > 0) {
      patch.valorLiquidado = Number(enriquecido.valorLiquidado);
    }
    // Actualiza también reservaSugerida para que el reporte (proyección liviana) la lea.
    if (reservaNueva > 0 && crudo.informeUnico && typeof crudo.informeUnico === 'object') {
      patch.informeUnico = {
        ...crudo.informeUnico,
        reservaSugerida: String(reservaNueva),
        ...(vaNuevo > 0 ? { valorAsegurado: vaNuevo } : {}),
      };
    }
    try {
      const guardado = await actualizarCasoZurichListado(id, patch);
      return normalizeZurichListadoItem({
        ...guardado,
        ...patch,
        reservaSugeridaInforme: reservaNueva || guardado.reservaSugeridaInforme,
        valorAseguradoInforme: vaNuevo || guardado.valorAseguradoInforme,
        informeUnico: enriquecido.informeUnico || guardado.informeUnico,
      });
    } catch (err) {
      console.warn('No se pudo persistir sync reserva→Gestionar:', err);
    }
  }
  return normalizado;
};

const omitirMeta = (casoBase = {}) => {
  const payload = { ...casoBase };
  delete payload._id;
  delete payload.__v;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.archivos;
  delete payload.control_horas;
  delete payload.historialDocs;
  delete payload.envios_facturacion;
  delete payload.ultimo_envio_facturacion;
  return payload;
};

/** Al guardar informe/presupuesto no reenviar huecos de ficha (vacío pisa Gestionar). */
const fichaSinHuecos = (casoBase = {}) => {
  const payload = omitirMeta(casoBase);
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'liquidador' || k === 'informeUnico') continue;
    if (v === '' || v == null) delete payload[k];
  }
  return payload;
};

export const guardarLiquidadorEnCasoZurichListado = async ({
  casoId,
  liquidador,
  totales = {},
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso del listado debe estar guardado antes de adjuntar el liquidador.');
  const liqSan = sanitizarLiquidadorZurich(liquidador || {});
  const payload = {
    ...fichaSinHuecos(casoBase),
    ...camposPolizaParaCasoZurich(liqSan, casoBase),
    ...camposValoresGestionZurich({
      liquidador: liqSan,
      casoBase,
      totales,
    }),
    liquidador: liqSan,
  };
  // No reenviar informeUnico ni reserva: el liquidador no debe pisar la del preliminar.
  delete payload.informeUnico;
  delete payload.reserva;
  return actualizarCasoZurichListado(casoId, payload);
};

export const guardarInformeUnicoEnCasoZurichListado = async ({
  casoId,
  informeUnico,
  casoBase = {},
}) => {
  if (!casoId) throw new Error('El caso del listado debe estar guardado antes de adjuntar el informe.');
  const liq = casoBase.liquidador || null;
  const extrasReserva = {
    caso: casoBase,
    liquidador: liq,
  };
  const sanitizado = sanitizarInformeUnicoZurich(informeUnico || {}, extrasReserva);
  const desglose = desgloseReservaPreliminarZurich(sanitizado, extrasReserva);
  const reservaPerito =
    desglose.perdida > 0 ? desglose.reserva : reservaSugeridaZurich(sanitizado, extrasReserva);
  if (desglose.perdida > 0 || reservaPerito > 0) {
    sanitizado.reservaSugerida = String(reservaPerito);
  }
  const payload = {
    ...fichaSinHuecos(casoBase),
    ...camposPolizaParaCasoZurich(liq || {}, casoBase),
    ...camposValoresGestionZurich({
      liquidador: liq,
      casoBase,
      desglose,
      reserva: reservaPerito,
    }),
    informeUnico: sanitizado,
    ...fechasInformeParaCasoZurich(sanitizado, casoBase),
  };
  // Forzar al final: la reserva del desglose del informe manda sobre casoBase.
  if (reservaPerito > 0) {
    payload.reserva = Math.round(Number(reservaPerito));
    sanitizado.reservaSugerida = String(payload.reserva);
    payload.informeUnico = sanitizado;
  }
  if (liq && typeof liq === 'object') {
    payload.liquidador = sanitizarLiquidadorZurich(liq);
  }
  return actualizarCasoZurichListado(casoId, payload);
};

export const deleteCasoZurichListado = async (id) => {
  if (!id) throw new Error('Identificador de caso no válido');
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al eliminar (${response.status})`);
  }
  return payload;
};

export const importarCasosZurichListado = async (casos = []) => {
  const response = await fetch(`${API_URL}/importar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ casos }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.detalle || `Error al importar (${response.status})`);
  }
  return payload?.data ?? payload;
};

export const subirArchivoZurichListado = async (casoId, file, etiqueta = 'GENERAL', extras = {}) => {
  if (!casoId) throw new Error('Caso requerido para subir archivo');
  if (!file) throw new Error('Archivo requerido');
  const formData = new FormData();
  formData.append('archivo', file, file.name || 'documento');
  formData.append('etiqueta', etiqueta);
  if (extras?.descripcion != null) {
    formData.append('descripcion', String(extras.descripcion));
  }
  const response = await fetch(`${API_URL}/${casoId}/archivos`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al subir archivo (${response.status})`);
  }
  return payload?.data ?? payload;
};

export const eliminarArchivoZurichListado = async (casoId, archivoId) => {
  if (!casoId || !archivoId) throw new Error('Caso y archivo requeridos');
  const response = await fetch(`${API_URL}/${casoId}/archivos/${archivoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Error al eliminar archivo (${response.status})`);
  }
  return payload;
};

export const urlDescargaArchivoZurichListado = (ruta) => resolveUploadsUrl(ruta);

