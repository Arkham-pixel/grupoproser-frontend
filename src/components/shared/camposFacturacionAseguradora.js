import { controlHorasTieneDatos, resolverControlHorasDesdeEnvios } from '../SubcomponenteCompex/controlHoras/controlHorasUtils.js';

const fechaInput = (valor) => {
  if (!valor) return '';
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) return valor.slice(0, 10);
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toISOString().slice(0, 10);
};

export const FORM_CAMPOS_FACTURACION = {
  control_horas: null,
  historialDocs: [],
  fecha_control_horas: '',
  fecha_envio_control_horas: '',
  fecha_recibido_control_horas: '',
  fecha_seguimiento_envio_control_horas: '',
  observacion_seguimiento_envio_control_horas: '',
  adjunto_control_horas: '',
  adjunto_evidencia: '',
  adjunto_seguimiento_envio_control_horas: '',
  adjunto_factura: '',
  numero_factura: '',
  valor_servicio: '',
  valor_gastos: '',
  fecha_factura: '',
  fecha_ultima_revision: '',
  observacion_compromisos: '',
};

export const CLAVES_OBJETO_FACTURACION = ['control_horas', 'historialDocs'];

export const hidratarCamposFacturacion = (base = {}, caso = {}) => {
  const next = { ...base };
  next.fecha_control_horas = fechaInput(caso.fecha_control_horas || caso.fcha_control_horas || '');
  next.fecha_envio_control_horas = fechaInput(
    caso.fecha_envio_control_horas || caso.fcha_envio_control_horas || ''
  );
  next.fecha_recibido_control_horas = fechaInput(
    caso.fecha_recibido_control_horas || caso.fcha_recibido_control_horas || ''
  );
  next.fecha_seguimiento_envio_control_horas = fechaInput(
    caso.fecha_seguimiento_envio_control_horas || caso.fcha_seguimiento_envio_control_horas || ''
  );
  next.observacion_seguimiento_envio_control_horas =
    caso.observacion_seguimiento_envio_control_horas ||
    caso.obse_seguimiento_envio_control_horas ||
    '';
  next.adjunto_control_horas = caso.adjunto_control_horas || '';
  next.adjunto_evidencia = caso.adjunto_evidencia || '';
  next.adjunto_seguimiento_envio_control_horas =
    caso.adjunto_seguimiento_envio_control_horas || caso.anxo_seguimiento_envio_control_horas || '';
  next.adjunto_factura = caso.adjunto_factura || '';
  next.numero_factura = caso.numero_factura || '';
  next.valor_servicio = caso.valor_servicio ?? caso.vlorServcios ?? '';
  next.valor_gastos = caso.valor_gastos ?? caso.vlorGastos ?? '';
  next.fecha_factura = fechaInput(caso.fecha_factura || '');
  next.fecha_ultima_revision = fechaInput(caso.fecha_ultima_revision || caso.fchaUltRevi || '');
  next.observacion_compromisos = caso.observacion_compromisos || '';
  next.control_horas = resolverControlHorasDesdeEnvios(caso);
  next.historialDocs = Array.isArray(caso.historialDocs) ? caso.historialDocs : [];
  return next;
};

export const camposFacturacionDesdeForm = (form = {}) => ({
  control_horas: form.control_horas || null,
  fecha_control_horas: form.fecha_control_horas || null,
  fecha_envio_control_horas: form.fecha_envio_control_horas || null,
  fecha_recibido_control_horas: form.fecha_recibido_control_horas || null,
  fecha_seguimiento_envio_control_horas: form.fecha_seguimiento_envio_control_horas || null,
  observacion_seguimiento_envio_control_horas:
    form.observacion_seguimiento_envio_control_horas || '',
  adjunto_control_horas: form.adjunto_control_horas || '',
  adjunto_evidencia: form.adjunto_evidencia || '',
  adjunto_seguimiento_envio_control_horas: form.adjunto_seguimiento_envio_control_horas || '',
  adjunto_factura: form.adjunto_factura || '',
  historialDocs: Array.isArray(form.historialDocs) ? form.historialDocs : [],
  numero_factura: form.numero_factura || '',
  valor_servicio: form.valor_servicio === '' ? null : form.valor_servicio,
  valor_gastos: form.valor_gastos === '' ? null : form.valor_gastos,
  fecha_factura: form.fecha_factura || null,
  fecha_ultima_revision: form.fecha_ultima_revision || null,
  observacion_compromisos: form.observacion_compromisos || '',
});

export const sanitizarPayloadFacturacion = (payload = {}) => {
  const next = { ...payload, ...camposFacturacionDesdeForm(payload) };
  if (!controlHorasTieneDatos(next.control_horas)) {
    delete next.control_horas;
  }
  return next;
};
