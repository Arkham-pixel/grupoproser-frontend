export const DIAS_ANS_INSPECCION = 15;
export const DIAS_ANS_LIQUIDACION = 45;

export const ESTADOS_EMBUDO_CATASTROFICO = [
  'PENDIENTE',
  'EN INSPECCIÓN',
  'DOCUMENTACIÓN',
  'LIQUIDADO',
  'ENVIADO ASEGURADORA',
  'CERRADO',
];

export const SEVERIDAD_CORTA = [
  { valor: 1, label: 'N1 menores' },
  { valor: 2, label: 'N2 fisuras' },
  { valor: 3, label: 'N3 muros' },
  { valor: 4, label: 'N4 estructural' },
  { valor: 5, label: 'N5 parcial' },
  { valor: 6, label: 'N6 total' },
];

export function parseFecha(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function normEstado(estado) {
  return String(estado ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toUpperCase();
}

export function esLiquidadoEstado(estado) {
  const e = normEstado(estado);
  if (e.startsWith('LIQUIDAR')) return false;
  return (
    e === 'LIQUIDADO' ||
    e === 'FINALIZADO' ||
    e === 'ENVIADO ASEGURADORA' ||
    e === 'CERRADO' ||
    e === 'INFORME UNICO O FINAL' ||
    e === 'ANULADO'
  );
}

export function esActivo(estado) {
  const e = normEstado(estado);
  return e !== 'CERRADO' && e !== 'ANULADO' && e !== 'FINALIZADO';
}

function diasEntre(a, b) {
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function mediana(nums) {
  const arr = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!arr.length) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function etiquetaMes(clave) {
  const [y, m] = String(clave).split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(date.getTime())) return clave;
  const texto = date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
  return texto.replace('.', '');
}

/** Cédula / código de responsable (Sura guarda esto en `ajustador`). */
export function esCodigoPersona(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return false;
  const digits = texto.replace(/[\s.-]/g, '');
  return /^\d{5,}$/.test(digits);
}

function claveMapa(valor) {
  return String(valor ?? '')
    .trim()
    .replace(/[\s.-]/g, '')
    .toUpperCase();
}

/**
 * Índice código → nombre desde responsables y catálogos catastróficos.
 */
export function construirMapaNombresPersona(filas = []) {
  const mapa = new Map();
  for (const fila of filas) {
    if (!fila || typeof fila !== 'object') continue;
    const nombre = String(
      fila.nmbrRespnsble ||
        fila.nombre ||
        fila.nombreResponsable ||
        fila.nombreUsuario ||
        fila.name ||
        fila.label ||
        ''
    ).trim();
    if (!nombre || esCodigoPersona(nombre)) continue;
    const codigos = [
      fila.codiRespnsble,
      fila.codigo,
      fila.login,
      fila.cedula,
      fila.usuarioLogin,
      fila.value,
    ];
    for (const codigo of codigos) {
      const key = claveMapa(codigo);
      if (key && !mapa.has(key)) mapa.set(key, nombre);
    }
  }
  return mapa;
}

export function resolverNombrePersona(valor, mapa = new Map()) {
  const texto = String(valor ?? '').trim();
  if (!texto) return '';
  if (!esCodigoPersona(texto)) return texto;
  return mapa.get(claveMapa(texto)) || texto;
}

export function etiquetaAjustadorCaso(caso = {}, mapa = new Map()) {
  const nombre = String(caso.nombreResponsable || '').trim();
  if (nombre && !esCodigoPersona(nombre)) return nombre;
  const codigo = String(caso.ajustador || caso.codiRespnsble || '').trim();
  return resolverNombrePersona(codigo, mapa);
}

export function etiquetaInspectorCaso(caso = {}, mapa = new Map()) {
  const codigo = String(caso.inspector || '').trim();
  return resolverNombrePersona(codigo, mapa);
}

function agruparConteo(casos, campoOGetter, { vacio = 'Sin dato', limite = 10 } = {}) {
  const getValor =
    typeof campoOGetter === 'function' ? campoOGetter : (caso) => caso?.[campoOGetter];
  const map = new Map();
  for (const caso of casos) {
    const raw = String(getValor(caso) ?? '').trim();
    const key = raw || vacio;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, limite);
}

function cubetaDias(dias) {
  if (dias <= 7) return '0-7 d';
  if (dias <= 15) return '8-15 d';
  if (dias <= 30) return '16-30 d';
  if (dias <= 45) return '31-45 d';
  return '46+ d';
}

function pct(ok, total) {
  return total > 0 ? Math.round((ok / total) * 1000) / 10 : null;
}

/**
 * Agrega KPIs y series de gráficas para Alfa / Sura / Zurich.
 */
export function construirDashboardCatastrofico(
  casos = [],
  { estadosOrden = ESTADOS_EMBUDO_CATASTROFICO, mapaNombres = new Map(), normalizarEstadoFn } = {}
) {
  const lista = Array.isArray(casos) ? casos : [];
  const estadoDe = (c) => {
    const raw = String(c?.estado || '').trim();
    if (typeof normalizarEstadoFn === 'function') return normalizarEstadoFn(raw);
    return raw || 'PENDIENTE';
  };
  const totalCasos = lista.length;
  const casosActivos = lista.filter((c) => esActivo(estadoDe(c))).length;
  const casosLiquidados = lista.filter((c) => esLiquidadoEstado(estadoDe(c))).length;

  let totalReclamado = 0;
  let totalLiquidado = 0;
  let totalReserva = 0;
  let reclamadoActivos = 0;
  let reservaActivos = 0;

  const porEstadoMap = new Map(estadosOrden.map((e) => [e, 0]));
  const mensual = new Map();
  const diasInspeccion = [];
  const diasLiquidacion = [];
  const cubetasInsp = new Map();
  const cubetasLiq = new Map();
  let ansInspOk = 0;
  let ansInspTotal = 0;
  let ansLiqOk = 0;
  let ansLiqTotal = 0;
  let atrasadosInspeccion = 0;
  let atrasadosLiquidacion = 0;

  const severidadMap = new Map(SEVERIDAD_CORTA.map((s) => [s.valor, 0]));
  let checklistOk = 0;
  let checklistNo = 0;

  const horas = { viaje: 0, campo: 0, oficina: 0, secretaria: 0 };
  const horasPersona = new Map();

  const hoy = new Date();

  for (const c of lista) {
    const reclamado = num(c.valorReclamado);
    const liquidado = num(c.valorLiquidado);
    const reserva = num(c.reserva) || num(c.valorReservaPreventivaPromedio);
    totalReclamado += reclamado;
    totalLiquidado += liquidado;
    totalReserva += reserva;
    if (esActivo(estadoDe(c))) {
      reclamadoActivos += reclamado;
      reservaActivos += reserva;
    }

    const estado = estadoDe(c);
    porEstadoMap.set(estado, (porEstadoMap.get(estado) || 0) + 1);

    const fSin = parseFecha(c.fechaSiniestro);
    const fInsp = parseFecha(c.fechaInspeccion);
    const fLiq = parseFecha(c.fechaLiquidado);
    const fRef = fSin || parseFecha(c.createdAt);
    if (fRef) {
      const clave = `${fRef.getFullYear()}-${String(fRef.getMonth() + 1).padStart(2, '0')}`;
      if (!mensual.has(clave)) {
        mensual.set(clave, { mes: clave, etiqueta: etiquetaMes(clave), casos: 0, reclamado: 0, liquidado: 0 });
      }
      const row = mensual.get(clave);
      row.casos += 1;
      row.reclamado += reclamado;
      row.liquidado += liquidado;
    }

    if (fSin && fInsp) {
      const d = diasEntre(fSin, fInsp);
      if (d != null && d >= 0) {
        diasInspeccion.push(d);
        ansInspTotal += 1;
        if (d <= DIAS_ANS_INSPECCION) ansInspOk += 1;
        const cub = cubetaDias(d);
        cubetasInsp.set(cub, (cubetasInsp.get(cub) || 0) + 1);
      }
    } else if (fSin && !fInsp && esActivo(estadoDe(c))) {
      const d = diasEntre(fSin, hoy);
      if (d != null && d > DIAS_ANS_INSPECCION) atrasadosInspeccion += 1;
    }

    if (fSin && fLiq) {
      const d = diasEntre(fSin, fLiq);
      if (d != null && d >= 0) {
        diasLiquidacion.push(d);
        ansLiqTotal += 1;
        if (d <= DIAS_ANS_LIQUIDACION) ansLiqOk += 1;
        const cub = cubetaDias(d);
        cubetasLiq.set(cub, (cubetasLiq.get(cub) || 0) + 1);
      }
    } else if (fSin && !fLiq && esActivo(estadoDe(c))) {
      const d = diasEntre(fSin, hoy);
      if (d != null && d > DIAS_ANS_LIQUIDACION) atrasadosLiquidacion += 1;
    }

    const sev = Number(c.severidadCat);
    if (Number.isFinite(sev) && sev >= 1 && sev <= 6) {
      severidadMap.set(sev, (severidadMap.get(sev) || 0) + 1);
    }
    if (c.checklistCatCompleto === true) checklistOk += 1;
    else if (c.checklistCatCompleto === false) checklistNo += 1;

    const filas = Array.isArray(c.control_horas?.filas) ? c.control_horas.filas : [];
    for (const fila of filas) {
      const viaje = num(fila.horas_viaje);
      const campo = num(fila.horas_campo);
      const oficina = num(fila.horas_oficina);
      const secretaria = num(fila.horas_secretaria);
      horas.viaje += viaje;
      horas.campo += campo;
      horas.oficina += oficina;
      horas.secretaria += secretaria;
      const persona = String(fila.nombre_funcionario || '').trim() || 'Sin nombre';
      if (!horasPersona.has(persona)) {
        horasPersona.set(persona, { nombre: persona, viaje: 0, campo: 0, oficina: 0, secretaria: 0 });
      }
      const row = horasPersona.get(persona);
      row.viaje += viaje;
      row.campo += campo;
      row.oficina += oficina;
      row.secretaria += secretaria;
    }
  }

  const ordenCubetas = ['0-7 d', '8-15 d', '16-30 d', '31-45 d', '46+ d'];
  const tendenciaMensual = [...mensual.values()].sort((a, b) => (a.mes > b.mes ? 1 : -1)).slice(-12);

  const porEstado = [
    ...estadosOrden
      .filter((e) => porEstadoMap.has(e))
      .map((estado) => ({ estado, cantidad: porEstadoMap.get(estado) || 0 })),
    ...[...porEstadoMap.entries()]
      .filter(([estado]) => !estadosOrden.includes(estado))
      .map(([estado, cantidad]) => ({ estado, cantidad })),
  ].filter((row) => row.cantidad > 0);

  return {
    kpis: {
      totalCasos,
      casosActivos,
      casosLiquidados,
      porcentajeLiquidados: totalCasos === 0 ? 0 : Math.round((casosLiquidados / totalCasos) * 100),
      totalReclamado,
      totalLiquidado,
      totalReserva,
      reclamadoActivos,
      reservaActivos,
      atrasadosInspeccion,
      atrasadosLiquidacion,
    },
    ans: {
      inspeccion: {
        ok: ansInspOk,
        total: ansInspTotal,
        pct: pct(ansInspOk, ansInspTotal),
        limiteDias: DIAS_ANS_INSPECCION,
        medianaDias: mediana(diasInspeccion),
      },
      liquidacion: {
        ok: ansLiqOk,
        total: ansLiqTotal,
        pct: pct(ansLiqOk, ansLiqTotal),
        limiteDias: DIAS_ANS_LIQUIDACION,
        medianaDias: mediana(diasLiquidacion),
      },
    },
    porEstado,
    porCiudad: agruparConteo(lista, 'ciudad', { vacio: 'Sin ciudad' }),
    porAjustador: agruparConteo(lista, (c) => etiquetaAjustadorCaso(c, mapaNombres), {
      vacio: 'Sin ajustador',
    }),
    porInspector: agruparConteo(lista, (c) => etiquetaInspectorCaso(c, mapaNombres), {
      vacio: 'Sin inspector',
    }),
    porTomador: agruparConteo(lista, 'tomador', { vacio: 'Sin tomador' }),
    tendenciaMensual,
    cubetasAns: ordenCubetas.map((rango) => ({
      rango,
      inspeccion: cubetasInsp.get(rango) || 0,
      liquidacion: cubetasLiq.get(rango) || 0,
    })),
    severidad: SEVERIDAD_CORTA.map((s) => ({
      nivel: s.label,
      cantidad: severidadMap.get(s.valor) || 0,
    })),
    checklist: [
      { estado: 'Completo', cantidad: checklistOk },
      { estado: 'Pendiente', cantidad: checklistNo },
    ].filter((row) => row.cantidad > 0),
    horasTotales: [
      { tipo: 'Viaje', horas: Math.round(horas.viaje * 10) / 10 },
      { tipo: 'Campo', horas: Math.round(horas.campo * 10) / 10 },
      { tipo: 'Oficina', horas: Math.round(horas.oficina * 10) / 10 },
      { tipo: 'Secretaría', horas: Math.round(horas.secretaria * 10) / 10 },
    ],
    horasPorPersona: [...horasPersona.values()]
      .map((row) => ({
        ...row,
        total: row.viaje + row.campo + row.oficina + row.secretaria,
      }))
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8),
  };
}
