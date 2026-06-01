import { resolverTarifaHora } from './tarifasHoraAseguradoras';

export const FIRMA_AJUSTADORA = 'PROSER AJUSTES S.A.S.';

export const crearFilaVacia = (defaults = {}) => ({
  id: `fila-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  fecha: '',
  descripcion: '',
  nombre_funcionario: defaults.nombre_funcionario || '',
  cargo: defaults.cargo || 'Ajustador',
  horas_viaje: '',
  horas_campo: '',
  horas_oficina: '',
  horas_secretaria: '',
});

const parseNumero = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return 0;
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

export const totalFila = (fila) =>
  parseNumero(fila.horas_viaje) +
  parseNumero(fila.horas_campo) +
  parseNumero(fila.horas_oficina) +
  parseNumero(fila.horas_secretaria);

export const calcularTotalesControlHoras = (controlHoras) => {
  const filas = Array.isArray(controlHoras?.filas) ? controlHoras.filas : [];
  const totales = {
    viaje: 0,
    campo: 0,
    oficina: 0,
    secretaria: 0,
    total_horas: 0,
  };

  filas.forEach((fila) => {
    totales.viaje += parseNumero(fila.horas_viaje);
    totales.campo += parseNumero(fila.horas_campo);
    totales.oficina += parseNumero(fila.horas_oficina);
    totales.secretaria += parseNumero(fila.horas_secretaria);
  });

  totales.total_horas =
    totales.viaje + totales.campo + totales.oficina + totales.secretaria;

  const valorHora = parseNumero(controlHoras?.valor_hora);
  const gastos = parseNumero(controlHoras?.gastos);
  const subtotal = totales.total_horas * valorHora;

  return {
    ...totales,
    valor_hora: valorHora,
    gastos,
    subtotal_honorarios: subtotal,
    total: subtotal + gastos,
  };
};

export const formatearMoneda = (valor) => {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);
};

export const fechaParaInput = (valor) => {
  if (!valor) return '';
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
    return valor.slice(0, 10);
  }
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toISOString().slice(0, 10);
};

export const formatearFechaDisplay = (valor) => {
  if (!valor) return '';
  const str = String(valor);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return str;
  return fecha.toLocaleDateString('es-CO');
};

export const buildCabeceraControlHoras = (formData = {}, nombreAseguradora = '') => ({
  firma: FIRMA_AJUSTADORA,
  compania: nombreAseguradora || formData.nombreAseguradora || formData.codiAsgrdra || '',
  ramoPoliza: [formData.tipoPoliza, formData.nmroPolza].filter(Boolean).join(' - '),
  asegurado: formData.asgrBenfcro || '',
  documento: formData.numDocumento || '',
  siniestro: formData.nmroSinstro || '',
  riesgo: formData.amprAfctdo || formData.descSinstro || '',
  lugar: formData.ciudadSiniestro || formData.descripcionCiudad || '',
  analista: formData.nombreResponsable || formData.responsable || '',
  emailAnalista: '',
  fechaSiniestro: formData.fchaSinstro || '',
  fechaAsignacion: formData.fchaAsgncion || '',
  fechaInspeccion: formData.fchaInspccion || '',
  referencia: formData.nmroAjste || '',
});

export const crearControlHorasInicial = (formData, nombreAseguradora, existente) => {
  const tarifa = resolverTarifaHora({
    codiAsgrdra: formData.codiAsgrdra,
    nombreAseguradora,
    nombreCliente: formData.nombreCliente,
    fchaAsgncion: formData.fchaAsgncion,
  });

  const mapFilas = (filas) =>
    filas.map((f) => ({
      ...crearFilaVacia(),
      ...f,
      id: f.id || crearFilaVacia().id,
      fecha: fechaParaInput(f.fecha),
      horas_viaje: f.horas_viaje ?? '',
      horas_campo: f.horas_campo ?? '',
      horas_oficina: f.horas_oficina ?? '',
      horas_secretaria: f.horas_secretaria ?? '',
    }));

  if (existente && typeof existente === 'object' && Array.isArray(existente.filas)) {
    const base = {
      gastos: existente.gastos ?? '',
      filas: mapFilas(existente.filas),
    };

    if (existente.valor_hora_origen === 'manual') {
      return {
        ...base,
        valor_hora: existente.valor_hora ?? '',
        valor_hora_origen: 'manual',
        _mensajeTarifa: tarifa.mensaje,
      };
    }

    if (tarifa.origen === 'tarifa') {
      return {
        ...base,
        valor_hora: tarifa.valorHora,
        valor_hora_origen: 'tarifa',
        _mensajeTarifa: tarifa.mensaje,
      };
    }

    return {
      ...base,
      valor_hora: '',
      valor_hora_origen: 'manual',
      _mensajeTarifa: tarifa.mensaje,
    };
  }

  const responsable = formData.nombreResponsable || formData.responsable || '';
  return {
    valor_hora: tarifa.valorHora ?? '',
    valor_hora_origen: tarifa.origen,
    gastos: formData.valor_gastos ?? '',
    filas: [crearFilaVacia({ nombre_funcionario: responsable, cargo: 'Ajustador' })],
    _mensajeTarifa: tarifa.mensaje,
  };
};

export const normalizarControlHorasParaGuardar = (controlHoras, usuario = '') => ({
  valor_hora: parseNumero(controlHoras.valor_hora),
  valor_hora_origen: controlHoras.valor_hora_origen || 'manual',
  gastos: parseNumero(controlHoras.gastos),
  filas: (controlHoras.filas || []).map((f) => ({
    id: f.id,
    fecha: f.fecha || null,
    descripcion: f.descripcion || '',
    nombre_funcionario: f.nombre_funcionario || '',
    cargo: f.cargo || '',
    horas_viaje: parseNumero(f.horas_viaje),
    horas_campo: parseNumero(f.horas_campo),
    horas_oficina: parseNumero(f.horas_oficina),
    horas_secretaria: parseNumero(f.horas_secretaria),
  })),
  actualizado_en: new Date().toISOString(),
  actualizado_por: usuario || localStorage.getItem('login') || '',
});
