import { resolverTarifaHora } from './tarifasHoraAseguradoras';
import { escalarHorasPlantillaHaciaObjetivo } from './tarifaHonorariosSura.js';
import {
  TIPO_ITEM_EXTRA,
  TIPO_ITEM_FIJO,
  TIPO_LIQUIDADOR_DEFAULT,
  buscarItemCatalogoControlHoras,
  esFilaFijaControlHoras,
  inferirTipoLiquidadorDesdeFilas,
  limitarHorasCampoLiquidador,
  normalizarTipoLiquidadorControlHoras,
  plantillaItemsControlHoras,
} from './catalogoControlHoras';

export const FIRMA_AJUSTADORA = 'PROSER AJUSTES S.A.S.';

export const crearFilaVacia = (defaults = {}) => ({
  id: `fila-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  fecha: '',
  descripcion: '',
  nombre_funcionario: defaults.nombre_funcionario || '',
  cargo: defaults.cargo || 'Ajustador',
  horas_viaje: defaults.horas_viaje ?? '',
  horas_campo: defaults.horas_campo ?? '',
  horas_oficina: defaults.horas_oficina ?? '',
  horas_secretaria: defaults.horas_secretaria ?? '',
  catalogo_id: defaults.catalogo_id || '',
  tipo_item: defaults.tipo_item || TIPO_ITEM_EXTRA,
  fijo: defaults.fijo === true,
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

/** Nombre del analista de la compañía (no el ajustador Proser). */
export const resolverNombreAnalistaAseguradora = (formData = {}) => {
  const candidatos = [
    formData.funcAsgrdraNombre,
    formData.funcionarioAseguradora,
    formData.nombreFuncionarioAseguradora,
    formData.funcAsgrdra,
  ];
  for (const valor of candidatos) {
    const texto = String(valor || '').trim();
    if (texto && texto.toLowerCase() !== 'sin asignar') return texto;
  }
  return '';
};

/** Correo del analista de la compañía. */
export const resolverEmailAnalistaAseguradora = (formData = {}) => {
  const candidatos = [
    formData.emailFuncionarioAseguradora,
    formData.emailAnalista,
    formData.email_funcionario_aseguradora,
  ];
  for (const valor of candidatos) {
    const email = String(valor || '').trim();
    if (email && email.includes('@')) return email;
  }
  return '';
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
  analista: resolverNombreAnalistaAseguradora(formData),
  emailAnalista: resolverEmailAnalistaAseguradora(formData),
  ajustador: formData.nombreResponsable || formData.responsable || '',
  fechaSiniestro: formData.fchaSinstro || '',
  fechaAsignacion: formData.fchaAsgncion || '',
  fechaInspeccion: formData.fchaInspccion || '',
  referencia: formData.nmroAjste || '',
});

const fechaSugeridaItem = (item, formData = {}) => {
  if (item?.fechaDesde === 'asignacion') return fechaParaInput(formData.fchaAsgncion);
  if (item?.fechaDesde === 'inspeccion') {
    return fechaParaInput(formData.fchaInspccion || formData.fechaInspeccion);
  }
  return '';
};

const horasCatalogoOVacio = (valor) => (valor === 0 || valor ? valor : '');

export const filaDesdeItemCatalogo = (item, formData = {}, previa = null) => {
  const responsable = formData.nombreResponsable || formData.responsable || '';
  const funcionario =
    previa?.nombre_funcionario ||
    (item.usaAjustador && responsable ? responsable : '') ||
    item.funcionarioDefault ||
    responsable;
  const esFijo = item.tipo_item === TIPO_ITEM_FIJO;
  return {
    ...crearFilaVacia(),
    ...(previa || {}),
    id: previa?.id || crearFilaVacia().id,
    catalogo_id: item.id,
    tipo_item: item.tipo_item,
    fijo: esFijo,
    descripcion: esFijo ? item.descripcion : previa?.descripcion || item.descripcion,
    cargo: previa?.cargo || item.cargo || 'Ajustador',
    nombre_funcionario: funcionario,
    fecha: fechaParaInput(previa?.fecha) || fechaSugeridaItem(item, formData),
    horas_viaje: esFijo ? item.horas_viaje : horasCatalogoOVacio(previa?.horas_viaje ?? item.horas_viaje),
    horas_campo: esFijo ? item.horas_campo : horasCatalogoOVacio(previa?.horas_campo ?? item.horas_campo),
    horas_oficina: esFijo ? item.horas_oficina : horasCatalogoOVacio(previa?.horas_oficina ?? item.horas_oficina),
    horas_secretaria: esFijo
      ? item.horas_secretaria
      : horasCatalogoOVacio(previa?.horas_secretaria ?? item.horas_secretaria),
  };
};

export const crearFilasPlantillaControlHoras = (tipo, formData = {}, extras = []) => {
  const plantilla = plantillaItemsControlHoras(tipo).map((item) => filaDesdeItemCatalogo(item, formData));
  const extrasLimpios = (extras || []).map((f) => ({
    ...crearFilaVacia(),
    ...f,
    id: f.id || crearFilaVacia().id,
    fecha: fechaParaInput(f.fecha),
    catalogo_id: '',
    tipo_item: TIPO_ITEM_EXTRA,
    fijo: false,
  }));
  return [...plantilla, ...extrasLimpios];
};

const anotarFilaCatalogo = (fila, forzarPlantilla) => {
  const base = {
    ...crearFilaVacia(),
    ...fila,
    id: fila.id || crearFilaVacia().id,
    fecha: fechaParaInput(fila.fecha),
    horas_viaje: fila.horas_viaje ?? '',
    horas_campo: fila.horas_campo ?? '',
    horas_oficina: fila.horas_oficina ?? '',
    horas_secretaria: fila.horas_secretaria ?? '',
  };
  if (!forzarPlantilla && !fila.catalogo_id && !fila.tipo_item && fila.fijo !== true) {
    return { ...base, catalogo_id: '', tipo_item: TIPO_ITEM_EXTRA, fijo: false };
  }
  const cat = buscarItemCatalogoControlHoras(base);
  if (!cat) {
    return { ...base, catalogo_id: '', tipo_item: TIPO_ITEM_EXTRA, fijo: false };
  }
  const esFijo = cat.tipo_item === TIPO_ITEM_FIJO;
  return {
    ...base,
    catalogo_id: cat.id,
    tipo_item: cat.tipo_item,
    fijo: esFijo,
    descripcion: esFijo ? cat.descripcion : base.descripcion,
    horas_viaje: esFijo ? cat.horas_viaje : base.horas_viaje,
    horas_campo: esFijo ? cat.horas_campo : base.horas_campo,
    horas_oficina: esFijo ? cat.horas_oficina : base.horas_oficina,
    horas_secretaria: esFijo ? cat.horas_secretaria : base.horas_secretaria,
  };
};

export const aplicarPlantillaTipoLiquidador = (filasActuales = [], tipo, formData = {}) => {
  const extras = (filasActuales || []).filter((f) => {
    if (esFilaFijaControlHoras(f)) return false;
    const cat = buscarItemCatalogoControlHoras(f);
    return !cat;
  });
  const previasPorId = new Map(
    (filasActuales || [])
      .filter((f) => f.catalogo_id)
      .map((f) => [f.catalogo_id, f])
  );
  const plantilla = plantillaItemsControlHoras(tipo).map((item) =>
    filaDesdeItemCatalogo(item, formData, previasPorId.get(item.id) || null)
  );
  return [
    ...plantilla,
    ...extras.map((f) => ({
      ...crearFilaVacia(),
      ...f,
      id: f.id || crearFilaVacia().id,
      fecha: fechaParaInput(f.fecha),
      catalogo_id: '',
      tipo_item: TIPO_ITEM_EXTRA,
      fijo: false,
    })),
  ];
};

export const crearControlHorasInicial = (formData, nombreAseguradora, existente) => {
  const tarifa = resolverTarifaHora({
    codiAsgrdra: formData.codiAsgrdra,
    nombreAseguradora,
    nombreCliente: formData.nombreCliente,
    fchaAsgncion: formData.fchaAsgncion,
    reserva: formData.reserva,
    formData,
    caso: formData,
  });

  if (existente && typeof existente === 'object' && Array.isArray(existente.filas)) {
    const esPlantillaNueva = Boolean(existente.tipo_liquidador || existente.filas.some((f) => f.catalogo_id || f.fijo));
    const tipo = normalizarTipoLiquidadorControlHoras(
      existente.tipo_liquidador || inferirTipoLiquidadorDesdeFilas(existente.filas)
    );
    const base = {
      gastos: existente.gastos ?? '',
      tipo_liquidador: tipo,
      horas_extra_autorizadas: existente.horas_extra_autorizadas === true,
      filas: existente.filas.map((f) => anotarFilaCatalogo(f, esPlantillaNueva)),
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
      valor_hora: existente.valor_hora ?? '',
      valor_hora_origen: 'manual',
      _mensajeTarifa: tarifa.mensaje,
    };
  }

  const tipo =
    tarifa.tarifaId === 'SURA' && tarifa.tipoLiquidadorSura
      ? normalizarTipoLiquidadorControlHoras(tarifa.tipoLiquidadorSura)
      : TIPO_LIQUIDADOR_DEFAULT;

  let filas = crearFilasPlantillaControlHoras(tipo, formData);
  if (tarifa.tarifaId === 'SURA' && Number(tarifa.horasSugeridas) > 0) {
    filas = escalarHorasPlantillaHaciaObjetivo(filas, tarifa.horasSugeridas);
  }

  return {
    valor_hora: tarifa.valorHora ?? '',
    valor_hora_origen: tarifa.origen,
    gastos: formData.valor_gastos ?? '',
    tipo_liquidador: tipo,
    horas_extra_autorizadas: false,
    filas,
    _mensajeTarifa: tarifa.mensaje,
  };
};

/** True si hay al menos una fila con horas o descripción (evita borrados accidentales). */
export const controlHorasTieneDatos = (controlHoras) => {
  if (!controlHoras || !Array.isArray(controlHoras.filas) || controlHoras.filas.length === 0) {
    return false;
  }

  return controlHoras.filas.some((fila) => {
    const horas = totalFila(fila);
    const descripcion = String(fila.descripcion || '').trim();
    return horas > 0 || descripcion !== '';
  });
};

/** Usa control_horas del caso o el último snapshot en envios_facturacion. */
export const resolverControlHorasDesdeEnvios = (caso) => {
  if (controlHorasTieneDatos(caso?.control_horas)) {
    return caso.control_horas;
  }

  const envios = Array.isArray(caso?.envios_facturacion) ? caso.envios_facturacion : [];
  for (let i = envios.length - 1; i >= 0; i -= 1) {
    const envio = envios[i];
    if (envio?.tipo === 'control_horas' && controlHorasTieneDatos(envio.controlHoras)) {
      return envio.controlHoras;
    }
  }

  return caso?.control_horas ?? null;
};

export const normalizarControlHorasParaGuardar = (controlHoras, usuario = '') => ({
  valor_hora: parseNumero(controlHoras.valor_hora),
  valor_hora_origen: controlHoras.valor_hora_origen || 'manual',
  tipo_liquidador: normalizarTipoLiquidadorControlHoras(controlHoras.tipo_liquidador),
  horas_extra_autorizadas: controlHoras.horas_extra_autorizadas === true,
  gastos: parseNumero(controlHoras.gastos),
  filas: (controlHoras.filas || []).map((f) => {
    const anotada = anotarFilaCatalogo(f, true);
    return {
      id: anotada.id,
      fecha: anotada.fecha || null,
      descripcion: anotada.descripcion || '',
      nombre_funcionario: anotada.nombre_funcionario || '',
      cargo: anotada.cargo || '',
      horas_viaje: parseNumero(limitarHorasCampoLiquidador(anotada, 'horas_viaje', anotada.horas_viaje)),
      horas_campo: parseNumero(limitarHorasCampoLiquidador(anotada, 'horas_campo', anotada.horas_campo)),
      horas_oficina: parseNumero(limitarHorasCampoLiquidador(anotada, 'horas_oficina', anotada.horas_oficina)),
      horas_secretaria: parseNumero(limitarHorasCampoLiquidador(anotada, 'horas_secretaria', anotada.horas_secretaria)),
      catalogo_id: anotada.catalogo_id || '',
      tipo_item: anotada.tipo_item || TIPO_ITEM_EXTRA,
      fijo: anotada.fijo === true,
    };
  }),
  actualizado_en: new Date().toISOString(),
  actualizado_por: usuario || localStorage.getItem('login') || '',
});
