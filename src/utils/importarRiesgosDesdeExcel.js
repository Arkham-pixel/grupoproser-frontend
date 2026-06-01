import * as XLSX from 'xlsx';

const CATEGORIAS_KEYS = [
  'estrategico',
  'cumplimiento',
  'reputacional',
  'operativo',
  'financiero',
  'tecnologico',
  'corrupcion',
  'ddhh',
];

const HEADER_ALIASES = {
  numero: ['no', 'no.', 'n', 'numero', 'número', '#'],
  proceso: [
    'nombre del proceso',
    'nombre proceso',
    'proceso',
    'process',
    'nombre del proceso organizacional',
  ],
  tipo: ['tipo de proceso', 'tipo proceso', 'tipo', 'clasificacion proceso'],
  riesgo: [
    'riesgo identificado',
    'riesgo',
    'descripcion',
    'descripción',
    'descripcion del riesgo',
    'risk',
    'nombre del riesgo',
  ],
};

const CATEGORIA_ALIASES = {
  estrategico: ['estrategico', 'estratégico', 'estrategico x'],
  cumplimiento: ['cumplimiento'],
  reputacional: ['reputacional'],
  operativo: ['operativo'],
  financiero: ['financiero'],
  tecnologico: ['tecnologico', 'tecnológico', 'tecnologia', 'tecnología'],
  corrupcion: ['corrupcion', 'corrupción'],
  ddhh: ['ddhh', 'derechos humanos', 'derechos'],
};

function normalizarTexto(texto) {
  return String(texto ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function celdaTexto(valor) {
  if (valor == null) return '';
  if (typeof valor === 'number' && !Number.isNaN(valor)) return String(valor);
  return String(valor).trim();
}

function celdaMarcada(valor) {
  const s = normalizarTexto(celdaTexto(valor));
  if (!s) return false;
  return ['x', 'si', 's', '1', 'true', 'verdadero', 'yes', 'y', 'v'].includes(s);
}

function resolverColumna(headers, aliases) {
  for (let i = 0; i < headers.length; i++) {
    const h = normalizarTexto(headers[i]);
    if (!h) continue;
    if (aliases.some((a) => h === a || h.includes(a) || a.includes(h))) {
      return i;
    }
  }
  return -1;
}

function puntuarFilaEncabezado(celdas) {
  const headers = celdas.map(celdaTexto);
  let score = 0;
  if (resolverColumna(headers, HEADER_ALIASES.riesgo) >= 0) score += 3;
  if (resolverColumna(headers, HEADER_ALIASES.proceso) >= 0) score += 2;
  if (resolverColumna(headers, HEADER_ALIASES.tipo) >= 0) score += 1;
  CATEGORIAS_KEYS.forEach((key) => {
    if (resolverColumna(headers, CATEGORIA_ALIASES[key]) >= 0) score += 0.5;
  });
  return score;
}

function categoriasVacias() {
  return CATEGORIAS_KEYS.reduce((acc, k) => ({ ...acc, [k]: false }), {});
}

function leerCategoriasDesdeFila(fila, headers) {
  const categorias = categoriasVacias();
  CATEGORIAS_KEYS.forEach((key) => {
    const idx = resolverColumna(headers, CATEGORIA_ALIASES[key]);
    if (idx >= 0 && celdaMarcada(fila[idx])) {
      categorias[key] = true;
    }
  });
  return categorias;
}

/**
 * Convierte filas parseadas del Excel al formato filasFormulario de Identificación.
 */
export function mapearFilasExcelAFilasFormulario(filasRaw, buscarTipoProceso) {
  const filas = [];
  const omitidas = [];

  filasRaw.forEach((item, index) => {
    const { fila, headers } = item;
    const idxProceso = resolverColumna(headers, HEADER_ALIASES.proceso);
    const idxTipo = resolverColumna(headers, HEADER_ALIASES.tipo);
    const idxRiesgo = resolverColumna(headers, HEADER_ALIASES.riesgo);

    const nombreProceso =
      idxProceso >= 0 ? celdaTexto(fila[idxProceso]) : '';
    let tipoProceso = idxTipo >= 0 ? celdaTexto(fila[idxTipo]) : '';
    const riesgoIdentificado = idxRiesgo >= 0 ? celdaTexto(fila[idxRiesgo]) : '';

    if (!riesgoIdentificado) {
      omitidas.push({ filaExcel: index + 1, motivo: 'Sin descripción de riesgo' });
      return;
    }

    if (typeof buscarTipoProceso === 'function' && nombreProceso && !tipoProceso) {
      tipoProceso = buscarTipoProceso(nombreProceso) || '';
    }

    const procesos = [];
    if (nombreProceso) {
      procesos.push({
        nombre: nombreProceso,
        tipo: tipoProceso || 'Misionales',
      });
    }

    filas.push({
      id: `excel-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      numero: filas.length + 1,
      procesos,
      nombreProceso: procesos[0]?.nombre || '',
      tipoProceso: procesos[0]?.tipo || '',
      riesgoIdentificado,
      categorias: leerCategoriasDesdeFila(fila, headers),
    });
  });

  return { filas, omitidas };
}

/**
 * Lee un archivo .xlsx/.xls y devuelve filas de datos con encabezados detectados.
 */
export async function parsearArchivoRiesgosExcel(archivo) {
  const buffer = await archivo.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const nombreHoja = workbook.SheetNames[0];
  if (!nombreHoja) {
    throw new Error('El archivo Excel no tiene hojas.');
  }

  const sheet = workbook.Sheets[nombreHoja];
  const matriz = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!matriz.length) {
    throw new Error('La hoja está vacía.');
  }

  let headerRowIndex = 0;
  let mejorPuntaje = -1;
  for (let i = 0; i < Math.min(8, matriz.length); i++) {
    const puntaje = puntuarFilaEncabezado(matriz[i]);
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      headerRowIndex = i;
    }
  }

  if (mejorPuntaje < 2) {
    throw new Error(
      'No se reconocieron columnas. Use la plantilla o encabezados: NOMBRE DEL PROCESO, TIPO DE PROCESO, RIESGO IDENTIFICADO.'
    );
  }

  const headers = matriz[headerRowIndex].map(celdaTexto);
  const filasDatos = [];

  for (let r = headerRowIndex + 1; r < matriz.length; r++) {
    const fila = matriz[r];
    if (!fila || !fila.some((c) => celdaTexto(c))) continue;
    filasDatos.push({ fila, headers, filaExcel: r + 1 });
  }

  if (!filasDatos.length) {
    throw new Error('No hay filas de datos después de los encabezados.');
  }

  return {
    nombreHoja,
    headerRowIndex,
    headers,
    totalFilasLeidas: filasDatos.length,
    filasDatos,
  };
}

/** Genera plantilla Excel para descargar */
export function generarPlantillaRiesgosExcel() {
  const headers = [
    'No.',
    'NOMBRE DEL PROCESO',
    'TIPO DE PROCESO',
    'RIESGO IDENTIFICADO',
    'Estratégico',
    'Cumplimiento',
    'Reputacional',
    'Operativo',
    'Financiero',
    'Tecnológico',
    'Corrupción',
    'DDHH',
  ];
  const ejemplo = [
    1,
    'Gestión comercial',
    'Misionales',
    'Falta de control en inventarios',
    'X',
    '',
    '',
    'X',
    '',
    '',
    '',
    '',
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo]);
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Identificacion');
  XLSX.writeFile(wb, 'plantilla_identificacion_riesgos.xlsx');
}
