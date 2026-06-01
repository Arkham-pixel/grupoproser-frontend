/**
 * Tarifas por hora — Control de Horas Complex (cuadro oficial).
 *
 * | Compañía              | Valor hora | Nota                                      |
 * |-----------------------|------------|-------------------------------------------|
 * | AXA COLPATRIA         | 204.272    | automático                                |
 * | SURA (*)               | 187.400    | En BD: SEGUROS GENERALES SURAMERICANA S.A.|
 * | SEGUROS BOLIVAR        | 135.851    | automático                                |
 * | ALLIANZ                | 123.619    | automático                                |
 * | ZURICH COLOMBIA        | 100.000    | Zúrich Colombia Seguros S.A.              |
 * | BBVA COLOMBIA          | 90.000     | BBVA SEGUROS COLOMBIA S.A.                |
 * | BBVA-ZURICH            | 80.000     | automático                                |
 * | EQUIDAD                | 85.000     | automático                                |
 * | PREVISORA              | manual     | Por rangos de valor reclamado             |
 */

export const TARIFAS_HORA_ASEGURADORAS = [
  {
    id: 'AXA_COLPATRIA',
    etiqueta: 'AXA COLPATRIA',
    valorHora: 204272,
    modo: 'auto',
    aliases: [
      'AXA',
      'COLPATRIA',
      'AXA COLPATRIA',
      'AXA COLPATRIA SEGUROS',
      'AXA COLPATRIA SEGUROS S.A.',
    ],
  },
  {
    id: 'SURA',
    etiqueta: 'SURA',
    /** Nombre en clientes / Datos Generales del caso */
    razonSocial: 'SEGUROS GENERALES SURAMERICANA S.A.',
    valorHora: 187400,
    modo: 'auto',
    aliases: [
      'SEGUROS GENERALES SURAMERICANA S.A.',
      'SEGUROS GENERALES SURAMERICANA',
      'SURAMERICANA',
      'SURA',
      'SEGUROS SURA',
    ],
  },
  {
    id: 'BOLIVAR',
    etiqueta: 'SEGUROS BOLIVAR',
    valorHora: 135851,
    modo: 'auto',
    aliases: ['SEGUROS BOLIVAR', 'SEGUROS BOLIVAR S.A.', 'BOLIVAR'],
  },
  {
    id: 'ALLIANZ',
    etiqueta: 'ALLIANZ',
    valorHora: 123619,
    modo: 'auto',
    aliases: ['ALLIANZ', 'ALIANZ', 'ALIANZ SEGUROS', 'ALIANZ SEGURO S.A.'],
  },
  {
    id: 'BBVA_ZURICH',
    etiqueta: 'BBVA-ZURICH',
    valorHora: 80000,
    modo: 'auto',
    requiereTokensMarca: ['BBVA', 'ZURICH'],
    aliases: ['BBVA-ZURICH', 'BBVA ZURICH', 'BBVA- ZURICH'],
  },
  {
    id: 'ZURICH_COLOMBIA',
    etiqueta: 'ZURICH',
    razonSocial: 'ZURICH COLOMBIA SEGUROS S.A.',
    valorHora: 100000,
    modo: 'auto',
    requiereTokensMarca: ['ZURICH', 'COLOMBIA'],
    aliases: [
      'ZURICH COLOMBIA SEGUROS S.A.',
      'ZURICH COLOMBIA SEGUROS',
      'ZURICH COLOMBIA',
    ],
  },
  {
    id: 'BBVA',
    etiqueta: 'BBVA',
    razonSocial: 'BBVA SEGUROS COLOMBIA S.A.',
    valorHora: 90000,
    modo: 'auto',
    requiereTokensMarca: ['BBVA', 'COLOMBIA'],
    excluirSiContiene: ['ZURICH'],
    aliases: [
      'BBVA SEGUROS COLOMBIA S.A.',
      'BBVA SEGUROS COLOMBIA',
      'BBVA SEGUROS',
    ],
  },
  {
    id: 'EQUIDAD',
    etiqueta: 'EQUIDAD',
    valorHora: 85000,
    modo: 'auto',
    aliases: ['EQUIDAD', 'SEGUROS EQUIDAD', 'LA EQUIDAD', 'LA EQUIDAD SEGUROS'],
  },
  {
    id: 'PREVISORA',
    etiqueta: 'PREVISORA',
    valorHora: null,
    modo: 'manual',
    nota: 'Es por rangos de valores reclamados',
    aliases: ['PREVISORA', 'LA PREVISORA', 'LA PREVISORA S.A.'],
  },
];

const normalizarTexto = (texto) =>
  String(texto || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Palabras que aparecen en casi todas las aseguradoras — no usar solas para coincidir. */
const TOKENS_GENERICOS = new Set([
  'SEGUROS',
  'SEGURO',
  'GENERALES',
  'COLOMBIA',
  'COMPANIA',
  'SOCIEDAD',
  'ANONIMA',
  'LIMITADA',
  'LTDA',
  'COOPERATIVA',
  'AGRUPADORA',
]);

/** Marcas cortas que sí identifican una sola compañía. */
const TOKENS_MARCA = new Set([
  'AXA',
  'SURA',
  'BBVA',
  'ZURICH',
  'BOLIVAR',
  'ALLIANZ',
  'ALIANZ',
  'EQUIDAD',
  'COLPATRIA',
  'SURAMERICANA',
  'PREVISORA',
]);

const tokensDiscriminadores = (aliasNormalizado) =>
  aliasNormalizado
    .split(' ')
    .filter((t) => {
      if (TOKENS_MARCA.has(t)) return true;
      if (TOKENS_GENERICOS.has(t)) return false;
      return t.length >= 6;
    });

/** Coincide razón social / código con alias del catálogo (sin falsos positivos por "SEGUROS"). */
const coincideConAlias = (candidato, alias) => {
  const c = normalizarTexto(candidato);
  const a = normalizarTexto(alias);
  if (!c || !a) return false;
  if (c === a) return true;

  // Subcadena solo si el alias es suficientemente específico (evita "SEGUROS" → AXA)
  const aliasEspecifico = a.length >= 10 || TOKENS_MARCA.has(a);
  if (aliasEspecifico && (c.includes(a) || a.includes(c))) return true;

  const tokens = tokensDiscriminadores(a);
  if (!tokens.length) return false;

  // Una marca clara (AXA, ZURICH, COLPATRIA…) basta
  if (tokens.some((t) => TOKENS_MARCA.has(t) && c.includes(t))) return true;

  // Nombres largos: al menos 2 tokens discriminadores deben coincidir
  const coincidencias = tokens.filter((t) => c.includes(t));
  return coincidencias.length >= 2;
};

const candidatoCoincideTarifa = (candidatos, tarifa) => {
  if (tarifa.excluirSiContiene?.length) {
    const bloqueado = candidatos.some((c) =>
      tarifa.excluirSiContiene.every((palabra) => c.includes(normalizarTexto(palabra)))
    );
    if (bloqueado) return false;
  }

  if (tarifa.requiereTokensMarca?.length) {
    const tokensOk = candidatos.some((c) =>
      tarifa.requiereTokensMarca.every((t) => c.includes(normalizarTexto(t)))
    );
    if (!tokensOk) return false;
  }

  const aliasNorm = [
    tarifa.etiqueta,
    tarifa.razonSocial,
    ...(tarifa.aliases || []),
  ]
    .filter(Boolean)
    .map(normalizarTexto);

  return candidatos.some((c) => aliasNorm.some((a) => coincideConAlias(c, a)));
};

const formatearValorHora = (valor) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);

export const resolverTarifaHora = ({
  codiAsgrdra = '',
  nombreAseguradora = '',
  nombreCliente = '',
  fchaAsgncion = '',
} = {}) => {
  const candidatos = [nombreAseguradora, nombreCliente, codiAsgrdra]
    .map(normalizarTexto)
    .filter(Boolean);

  if (!candidatos.length) {
    return {
      valorHora: null,
      origen: 'manual',
      tarifaId: null,
      mensaje: 'Seleccione la aseguradora en Datos Generales o ingrese el valor hora manualmente.',
    };
  }

  for (const tarifa of TARIFAS_HORA_ASEGURADORAS) {
    if (!candidatoCoincideTarifa(candidatos, tarifa)) continue;

    if (tarifa.modo === 'manual') {
      return {
        valorHora: null,
        origen: 'manual',
        tarifaId: tarifa.id,
        mensaje: tarifa.nota || 'Ingrese el valor hora según el rango de valor reclamado.',
      };
    }

    if (tarifa.modo === 'condicional' && tarifa.fechaAsignacionMinima) {
      const asignacion = fchaAsgncion ? new Date(fchaAsgncion) : null;
      const minima = new Date(tarifa.fechaAsignacionMinima);
      if (!asignacion || asignacion < minima) {
        return {
          valorHora: null,
          origen: 'manual',
          tarifaId: tarifa.id,
          mensaje: tarifa.nota || 'Valor hora debe ingresarse manualmente para esta fecha de asignación.',
        };
      }
    }

    const etiquetaMostrar = tarifa.razonSocial
      ? `${tarifa.etiqueta} (${tarifa.razonSocial})`
      : tarifa.etiqueta;

    return {
      valorHora: tarifa.valorHora,
      origen: 'tarifa',
      tarifaId: tarifa.id,
      mensaje: `Tarifa aplicada: ${etiquetaMostrar} — ${formatearValorHora(tarifa.valorHora)}`,
    };
  }

  return {
    valorHora: null,
    origen: 'manual',
    tarifaId: null,
    mensaje: 'Aseguradora sin tarifa configurada. Ingrese el valor hora manualmente.',
  };
};
