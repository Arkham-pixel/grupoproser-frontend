/**
 * Genera copias físicas (Word/Excel) de los formatos que usa Arnald.
 * Salida: ../formatos-para-usar  y  Escritorio\Formatos_Arnald
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  PageOrientation,
} from 'docx';
import {
  BASE_PRECIOS_PRESUPUESTO,
  CAPITULOS_BASE_PRECIOS,
} from '../src/components/SubcomponenteEvaluacionSismicaNSR10/basePreciosPresupuesto.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TEMPLATES = path.join(ROOT, 'public', 'templates');
const OUT_REPO = path.resolve(ROOT, '..', 'formatos-para-usar');
const OUT_DESKTOP = path.join(process.env.USERPROFILE || '', 'Desktop', 'Formatos_Arnald');

const AZUL = '1F4E79';
const AMARILLO = 'FFF2CC';
const GRIS = 'F2F2F2';
const VERDE = '548235';
const BLANCO = 'FFFFFF';
const FONT = 'Calibri';

const SMMLV = [
  [2018, 781242],
  [2019, 828116],
  [2020, 877803],
  [2021, 908526],
  [2022, 1000000],
  [2023, 1160000],
  [2024, 1300000],
  [2025, 1423500],
  [2026, 1750905],
];

/** Catálogo INFORME CARTERAS DEUDORES BANCOS 2026 (mismo de Arnald). */
const CATALOGO = [
  ['AV VILLAS', '27192', 'COLECTIVA', 'SID', 2, 2, '2% del valor asegurable del inmueble, mínimo 2 SMMLV'],
  ['AV VILLAS', '001', 'INDIVIDUAL', 'SID', 2, 2, '2% del valor asegurable del inmueble, mínimo 2 SMMLV'],
  ['AV VILLAS', '002', 'INDIVIDUAL', 'SID', 2, 2, '2% del valor asegurable del inmueble, mínimo 2 SMMLV'],
  ['AV VILLAS', '003', 'INDIVIDUAL', 'SID', 2, 2, '2% del valor asegurable del inmueble, mínimo 2 SMMLV'],
  ['AV VILLAS', 'HOGAR 27168', 'HOGAR INDIVIDUAL', 'SID', 2, 2, '2% del valor asegurable del inmueble, mínimo 2 SMMLV'],
  ['AV VILLAS', '008', 'INDIVIDUAL', 'SID', 2, 2, '2% del valor asegurable del inmueble, mínimo 2 SMMLV'],
  ['AV VILLAS', '010', 'INDIVIDUAL', 'SID', 2, 2, '2% del valor asegurable del inmueble, mínimo 2 SMMLV'],
  ['BANCO BOGOTÁ', '25334 Y 25336', 'COLECTIVA', 'SID', 2, 2, '2% del valor asegurable del inmueble, mínimo 2 SMMLV'],
  ['BANCO BOGOTÁ', '005', 'INDIVIDUAL', 'SID', 2, 2, '2% del valor asegurable del inmueble, mínimo 2 SMMLV'],
  ['BANCO BOGOTÁ', '007', 'INDIVIDUAL', 'SID', 2, 2, '2% del valor asegurable del inmueble, mínimo 2 SMMLV'],
  ['BANCO BOGOTÁ', '011', 'INDIVIDUAL CAPA 0', 'SID', 2, 2, '2% del valor asegurable del inmueble, mínimo 2 SMMLV'],
  ['BANCO BOGOTÁ', '012', 'INDIVIDUAL STOCK', 'SID', 2, 2, '2% del valor asegurable del inmueble, mínimo 2 SMMLV'],
  ['BANCO BOGOTÁ', '27471', 'LEASING COLECTIVA', 'SID', 2, 2, '2% del valor asegurable del ítem afectado, mínimo 2 SMMLV'],
  ['BANCO OCCIDENTE', '2187-2188 Y 2189', 'HIPOTECARIO Y LEASING HAB. COLECTIVA', 'PERDIDA', 1, 0, '1% del valor de la pérdida'],
  ['BANCO OCCIDENTE', '2210-2203-2211-2212', 'LEASING COLECTIVA', 'PERDIDA', 2, 1, '2% sobre valor de la pérdida, mínimo 1 SMMLV'],
  ['BANCO OCCIDENTE', 'VETUSTEZ >30 AÑOS', 'ESPECIAL · TERREMOTO (antigüedad >30 años)', 'SID', 3, 5, '3% del valor asegurable, mínimo 5 SMMLV'],
  ['BANCO OCCIDENTE', 'VETUSTEZ >30 AÑOS', 'ESPECIAL · DEMÁS EVENTOS (antigüedad >30 años)', 'PERDIDA', 10, 2, '10% del valor de la pérdida, mínimo 2 SMMLV'],
  ['BANCO ITAÚ', 'GENERAL', 'TERREMOTO / TEMBLOR / ERUPCIÓN / MAREMOTO', 'PERDIDA', 1, 2, '1% del valor de la pérdida del ítem afectado, mínimo 2 SMMLV'],
  ['BANCO ITAÚ', 'GENERAL', 'ASONADA / MOTÍN / HUELGA', 'PERDIDA', 5, 0.5, '5% del valor de la pérdida, mínimo 0,5 SMMLV'],
  ['BANCO ITAÚ', 'GENERAL', 'AMIT / TERRORISMO / SABOTAJE', 'PERDIDA', 5, 0.5, '5% del valor de la pérdida, mínimo 0,5 SMMLV'],
  ['BANCO ITAÚ', 'GENERAL', 'DEMÁS EVENTOS', 'PERDIDA', 0, 0, 'Sin deducible'],
  ['BANCO POPULAR', '27405', 'HIPOTECARIO Y LEASING HAB. COLECTIVA', 'SID', 2, 2, '2% del valor asegurable, mínimo 2 SMMLV'],
  ['BANCO POPULAR', '25312', 'HOGAR INDIVIDUAL', 'SID', 2, 3, '2% del valor asegurable, mínimo 3 SMMLV'],
  ['BANCO POPULAR', '27342 - 27189', 'UNIDAD DE LEASING COLECTIVO', 'SID', 2, 3, '2% del valor asegurable, mínimo 3 SMMLV'],
  ['BANCO W', '2184 Y 2194', 'HIPOTECARIO Y LEASING HAB. COLECTIVA', 'SID', 2, 2, '2% del valor asegurable, mínimo 2 SMMLV'],
  ['MI BANCO', '27479', 'HIPOTECARIO Y LEASING HAB. COLECTIVA', 'SID', 2, 1, '2% del valor asegurable, mínimo 1 SMMLV'],
  ['MUNDO MUJER', '27488', 'HIPOTECARIO Y LEASING HAB. COLECTIVA', 'SID', 2, 0, '2% del valor asegurado'],
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyIfExists(srcName, destDir, destName) {
  const src = path.join(TEMPLATES, srcName);
  if (!fs.existsSync(src)) {
    console.warn('No existe plantilla:', srcName);
    return null;
  }
  const dest = path.join(destDir, destName);
  try {
    fs.copyFileSync(src, dest);
    return dest;
  } catch (err) {
    if (err && err.code === 'EBUSY') {
      const alt = dest.replace(/(\.[^.]+)$/, '_nuevo$1');
      fs.copyFileSync(src, alt);
      console.warn('Archivo abierto, copiado como:', path.basename(alt));
      return alt;
    }
    throw err;
  }
}

function fillHeader(row, color = AZUL) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${color}` } };
    cell.font = { name: FONT, bold: true, color: { argb: `FF${BLANCO}` }, size: 11 };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = thinBorder();
  });
}

function thinBorder() {
  const s = { style: 'thin', color: { argb: 'FFB0B0B0' } };
  return { top: s, left: s, bottom: s, right: s };
}

function inputCell(cell, value = '') {
  cell.value = value;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${AMARILLO}` } };
  cell.border = thinBorder();
  cell.font = { name: FONT, size: 11 };
}

function labelCell(cell, text) {
  cell.value = text;
  cell.font = { name: FONT, bold: true, size: 10, color: { argb: `FF${AZUL}` } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${GRIS}` } };
  cell.border = thinBorder();
  cell.alignment = { vertical: 'middle', wrapText: true };
}

function moneyFmt(cell) {
  cell.numFmt = '"$"#,##0';
}

function slugCapitulo(cap) {
  const s = String(cap)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `cap_${s}`;
}

/**
 * Misma base de precios Valle del Cauca de Arnald (951 ítems).
 * Listas desplegables: capítulo → actividad → unidad y valor unitario.
 */
function agregarBasePreciosValle(wb) {
  const caps = [...CAPITULOS_BASE_PRECIOS];
  const porCap = new Map(caps.map((c) => [c, []]));
  for (const it of BASE_PRECIOS_PRESUPUESTO) {
    if (!porCap.has(it.capitulo)) porCap.set(it.capitulo, []);
    porCap.get(it.capitulo).push(it);
  }

  const bp = wb.addWorksheet('BASE_PRECIOS_VALLE', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  bp.columns = [
    { header: 'ID', width: 36 },
    { header: 'Capítulo', width: 28 },
    { header: 'Actividad', width: 52 },
    { header: 'Unidad', width: 10 },
    { header: 'Valor unitario', width: 16 },
    { header: 'Clave', width: 64 },
    { header: 'Lista (elegir en el liquidador)', width: 72 },
  ];
  fillHeader(bp.getRow(1));
  const lastItemRow = 1 + BASE_PRECIOS_PRESUPUESTO.length;
  BASE_PRECIOS_PRESUPUESTO.forEach((it, i) => {
    const r = i + 2;
    bp.getCell(r, 1).value = it.id;
    bp.getCell(r, 2).value = it.capitulo;
    bp.getCell(r, 3).value = it.actividad;
    bp.getCell(r, 4).value = it.unidad;
    bp.getCell(r, 5).value = it.valorUnitario;
    moneyFmt(bp.getCell(r, 5));
    bp.getCell(r, 6).value = `${it.capitulo}|${it.actividad}`;
    bp.getCell(r, 7).value = `${it.capitulo} — ${it.actividad}`;
    bp.getRow(r).font = { name: FONT, size: 9 };
  });
  bp.getColumn(6).hidden = true;

  const listas = wb.addWorksheet('LISTAS_VALLE');
  listas.getCell('A1').value = 'Capítulo';
  listas.getCell('B1').value = 'NombreRango';
  caps.forEach((cap, i) => {
    listas.getCell(i + 2, 1).value = cap;
    listas.getCell(i + 2, 2).value = slugCapitulo(cap);
  });
  fillHeader(listas.getRow(1));

  caps.forEach((cap, ci) => {
    const col = 4 + ci;
    const slug = slugCapitulo(cap);
    const items = porCap.get(cap) || [];
    listas.getCell(1, col).value = slug;
    listas.getColumn(col).width = 42;
    items.forEach((it, ri) => {
      listas.getCell(ri + 2, col).value = it.actividad;
    });
    const letter = listas.getColumn(col).letter;
    const lastRow = 1 + items.length;
    wb.definedNames.add(`LISTAS_VALLE!$${letter}$2:$${letter}$${lastRow}`, slug);
  });
  wb.definedNames.add(`LISTAS_VALLE!$A$2:$A$${1 + caps.length}`, 'CapitulosValle');
  wb.definedNames.add(`BASE_PRECIOS_VALLE!$G$2:$G$${lastItemRow}`, 'ItemsValle');
  listas.getColumn(1).width = 32;
  listas.getColumn(2).width = 28;

  return { caps, nItems: BASE_PRECIOS_PRESUPUESTO.length };
}

function formulaLookupValle(row, colEtiqueta, colResultado) {
  return `IFERROR(INDEX(BASE_PRECIOS_VALLE!$${colResultado}:$${colResultado},MATCH(${colEtiqueta}${row},BASE_PRECIOS_VALLE!$G:$G,0)),"")`;
}

function aplicarDropdownsValle(sheet, { colAct, firstRow, lastRow }) {
  const last = 1 + BASE_PRECIOS_PRESUPUESTO.length;
  for (let r = firstRow; r <= lastRow; r += 1) {
    sheet.dataValidations.add(`${colAct}${r}`, {
      type: 'list',
      allowBlank: true,
      formulae: [`BASE_PRECIOS_VALLE!$G$2:$G$${last}`],
      showErrorMessage: false,
      showInputMessage: true,
      promptTitle: 'Base Valle del Cauca',
      prompt: '951 ítems de Arnald. Al elegir, salen unidad y valor unitario.',
    });
  }
}

function formulaCell(cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
  cell.border = thinBorder();
  cell.font = { name: FONT, size: 11 };
}

/** Catálogo INFORME CARTERAS 2026: tomador → base SID/PERDIDA, %, SMMLV, regla. */
function agregarCatalogoTomadores(wb) {
  const vieja = wb.getWorksheet('CATALOGO_TOMADORES');
  if (vieja) wb.removeWorksheet(vieja.id);
  const cat = wb.addWorksheet('CATALOGO_TOMADORES', { views: [{ state: 'frozen', ySplit: 1 }] });
  cat.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Tomador (banco)', key: 'tomador', width: 22 },
    { header: 'Póliza', key: 'poliza', width: 22 },
    { header: 'Cartera', key: 'cartera', width: 42 },
    { header: 'Base', key: 'base', width: 12 },
    { header: '%', key: 'pct', width: 8 },
    { header: 'Cant. SMMLV', key: 'smmlv', width: 14 },
    { header: 'Regla', key: 'regla', width: 62 },
    { header: 'Etiqueta (elegir en liquidador)', key: 'etiq', width: 72 },
  ];
  fillHeader(cat.getRow(1));
  CATALOGO.forEach((row, i) => {
    const r = i + 2;
    const etiq = `${row[0]} · Póliza ${row[1]} · ${row[2]} · ${row[6]}`;
    cat.getRow(r).values = [i + 1, ...row, etiq];
    cat.getRow(r).font = { name: FONT, size: 10 };
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach((col) => {
      cat.getCell(`${col}${r}`).border = thinBorder();
    });
  });
  cat.getRow(1).height = 22;
  return 1 + CATALOGO.length;
}

async function writeWorkbookSafe(wb, filePath) {
  try {
    await wb.xlsx.writeFile(filePath);
    return filePath;
  } catch (err) {
    if (err && err.code === 'EBUSY') {
      const alt = filePath.replace(/(\.[^.]+)$/, '_nuevo$1');
      await wb.xlsx.writeFile(alt);
      console.warn('Archivo abierto, escrito como:', path.basename(alt));
      return alt;
    }
    throw err;
  }
}

async function generarExcelAlfaFormulado(outPath) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Arnald / Grupo Proser';
  wb.created = new Date();
  agregarBasePreciosValle(wb);

  const cat = wb.addWorksheet('CATALOGO_TOMADORES', { views: [{ state: 'frozen', ySplit: 1 }] });
  cat.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Tomador (banco)', key: 'tomador', width: 22 },
    { header: 'Póliza', key: 'poliza', width: 22 },
    { header: 'Cartera', key: 'cartera', width: 42 },
    { header: 'Base', key: 'base', width: 12 },
    { header: '%', key: 'pct', width: 8 },
    { header: 'Cant. SMMLV', key: 'smmlv', width: 14 },
    { header: 'Regla', key: 'regla', width: 62 },
    { header: 'Etiqueta (elegir en liquidador)', key: 'etiq', width: 72 },
  ];
  fillHeader(cat.getRow(1));
  CATALOGO.forEach((row, i) => {
    const r = i + 2;
    const etiq = `${row[0]} · Póliza ${row[1]} · ${row[2]} · ${row[6]}`;
    cat.getRow(r).values = [i + 1, ...row, etiq];
    cat.getRow(r).font = { name: FONT, size: 10 };
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach((col) => {
      cat.getCell(`${col}${r}`).border = thinBorder();
    });
  });
  cat.getRow(1).height = 22;

  const sm = wb.addWorksheet('SMMLV');
  sm.columns = [{ width: 12 }, { width: 16 }];
  sm.getRow(1).values = ['Año', 'SMMLV'];
  fillHeader(sm.getRow(1));
  SMMLV.forEach((row, i) => {
    sm.getCell(i + 2, 1).value = row[0];
    sm.getCell(i + 2, 2).value = row[1];
    moneyFmt(sm.getCell(i + 2, 2));
    sm.getCell(i + 2, 1).border = thinBorder();
    sm.getCell(i + 2, 2).border = thinBorder();
  });

  const liq = wb.addWorksheet('LIQUIDADOR', {
    views: [{ state: 'frozen', ySplit: 18 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, paperSize: 9 },
  });
  liq.columns = [
    { width: 8 },
    { width: 24 },
    { width: 52 },
    { width: 10 },
    { width: 12 },
    { width: 16 },
    { width: 18 },
    { width: 14 },
  ];

  liq.mergeCells('A1:H1');
  liq.getCell('A1').value = 'FORMATO LIQUIDACIÓN — SEGUROS ALFA (formulado · carteras 2026)';
  liq.getCell('A1').font = { name: FONT, bold: true, size: 16, color: { argb: `FF${BLANCO}` } };
  liq.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${AZUL}` } };
  liq.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  liq.getRow(1).height = 28;

  liq.mergeCells('A2:H2');
  liq.getCell('A2').value =
    'Celdas amarillas = diligenciar. En el detalle: elija CAPÍTULO y luego el ÍTEM de la base Valle del Cauca (951 actividades de Arnald); unidad y valor unitario salen solos. Cantidad × VU = pérdida. Tomador/cartera arman el deducible.';
  liq.getCell('A2').font = { name: FONT, italic: true, size: 9, color: { argb: 'FF666666' } };
  liq.getRow(2).height = 32;
  liq.getCell('A2').alignment = { wrapText: true, vertical: 'middle' };

  const campos = [
    [3, 'A', 'Póliza N°', 'B'],
    [3, 'C', 'Siniestro N°', 'D'],
    [3, 'E', 'Asegurado', 'F'],
    [4, 'A', 'Tomador (banco)', 'B'],
    [5, 'A', 'Póliza / cartera (lista)', 'B'],
    [6, 'A', 'Vigencia desde', 'B'],
    [6, 'C', 'Vigencia hasta', 'D'],
    [7, 'A', 'Fecha siniestro', 'B'],
    [7, 'C', 'Año siniestro', 'D'],
    [8, 'A', 'Ramo / evento', 'B'],
    [8, 'C', 'Causa', 'D'],
    [9, 'A', 'Valor SID', 'B'],
    [9, 'C', 'AIU %', 'D'],
    [10, 'A', 'Dirección', 'B'],
  ];
  campos.forEach(([row, labCol, lab, valCol]) => {
    labelCell(liq.getCell(`${labCol}${row}`), lab);
    inputCell(liq.getCell(`${valCol}${row}`), '');
  });
  liq.mergeCells('F3:H3');
  inputCell(liq.getCell('F3'), '');
  liq.mergeCells('B5:H5');
  liq.mergeCells('B10:H10');

  liq.getCell('B4').value = 'BANCO BOGOTÁ';
  liq.getCell('D7').value = 2026;
  liq.getCell('D9').value = 20;
  liq.getCell('B9').value = 0;
  moneyFmt(liq.getCell('B9'));

  liq.dataValidations.add('B4', {
    type: 'list',
    allowBlank: false,
    formulae: ['"AV VILLAS,BANCO BOGOTÁ,BANCO OCCIDENTE,BANCO ITAÚ,BANCO POPULAR,BANCO W,MI BANCO,MUNDO MUJER"'],
    showErrorMessage: true,
    error: 'Elija un tomador de la lista',
  });
  liq.dataValidations.add('B5', {
    type: 'list',
    allowBlank: false,
    formulae: ['CATALOGO_TOMADORES!$I$2:$I$28'],
    showErrorMessage: true,
    errorTitle: 'Cartera',
    error: 'Elija la etiqueta de póliza/cartera del catálogo',
  });

  labelCell(liq.getCell('A11'), 'Base deducible');
  liq.getCell('B11').value = { formula: 'IFERROR(INDEX(CATALOGO_TOMADORES!E:E,MATCH(B5,CATALOGO_TOMADORES!I:I,0)),"SID")' };
  labelCell(liq.getCell('C11'), '%');
  liq.getCell('D11').value = { formula: 'IFERROR(INDEX(CATALOGO_TOMADORES!F:F,MATCH(B5,CATALOGO_TOMADORES!I:I,0)),2)' };
  labelCell(liq.getCell('E11'), 'Cant. SMMLV');
  liq.getCell('F11').value = { formula: 'IFERROR(INDEX(CATALOGO_TOMADORES!G:G,MATCH(B5,CATALOGO_TOMADORES!I:I,0)),2)' };
  labelCell(liq.getCell('G11'), 'SMMLV $');
  liq.getCell('H11').value = { formula: 'IFERROR(VLOOKUP(D7,SMMLV!A:B,2,FALSE),1750905)' };
  moneyFmt(liq.getCell('H11'));

  liq.mergeCells('A12:H12');
  liq.getCell('A12').value = { formula: 'IFERROR(INDEX(CATALOGO_TOMADORES!H:H,MATCH(B5,CATALOGO_TOMADORES!I:I,0)),"Seleccione póliza/cartera")' };
  liq.getCell('A12').font = { name: FONT, italic: true, size: 10, color: { argb: `FF${AZUL}` } };

  ['B11', 'D11', 'F11', 'H11', 'A12'].forEach((a) => {
    liq.getCell(a).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
    liq.getCell(a).border = thinBorder();
  });

  liq.mergeCells('A14:H14');
  liq.getCell('A14').value =
    `DETALLE — pulse la columna C y elija un ítem de la base Valle del Cauca (${BASE_PRECIOS_PRESUPUESTO.length}). Capítulo, unidad y valor unitario salen solos. Luego digite la cantidad.`;
  fillHeader(liq.getRow(14));

  const heads = [
    'Ítem',
    'Capítulo (auto)',
    'Ítem base Valle del Cauca (lista)',
    'Und',
    'Cant.',
    'Vlr. unitario',
    'Valor de la pérdida',
    'Demérito',
  ];
  heads.forEach((h, i) => {
    liq.getCell(15, i + 1).value = h;
  });
  fillHeader(liq.getRow(15));

  const firstItem = 16;
  const lastItem = 35;
  for (let r = firstItem; r <= lastItem; r += 1) {
    liq.getCell(r, 1).value = r - firstItem + 1;
    liq.getCell(r, 2).value = { formula: formulaLookupValle(r, 'C', 'B') };
    liq.getCell(r, 2).border = thinBorder();
    inputCell(liq.getCell(r, 3), '');
    liq.getCell(r, 4).value = { formula: formulaLookupValle(r, 'C', 'D') };
    liq.getCell(r, 4).border = thinBorder();
    liq.getCell(r, 4).alignment = { horizontal: 'center' };
    inputCell(liq.getCell(r, 5), '');
    liq.getCell(r, 6).value = { formula: formulaLookupValle(r, 'C', 'E') };
    moneyFmt(liq.getCell(r, 6));
    liq.getCell(r, 6).border = thinBorder();
    liq.getCell(r, 6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
    liq.getCell(r, 7).value = { formula: `IF(OR(E${r}="",F${r}=""),"",E${r}*F${r})` };
    moneyFmt(liq.getCell(r, 7));
    liq.getCell(r, 7).border = thinBorder();
    inputCell(liq.getCell(r, 8), 0);
  }
  aplicarDropdownsValle(liq, { colAct: 'C', firstRow: firstItem, lastRow: lastItem });

  const t0 = lastItem + 1;
  const rowsTot = [
    [t0, 'Subtotal ítems', `SUM(G${firstItem}:G${lastItem})`],
    [t0 + 1, 'AIU', `B${t0}*D9/100`],
    [t0 + 2, 'Pérdida (subtotal + AIU)', `B${t0}+B${t0 + 1}`],
    [t0 + 3, 'Deducible % (SID o pérdida)', `IF(B11="PERDIDA",B${t0 + 2}*D11/100,B9*D11/100)`],
    [t0 + 4, 'Deducible mínimo SMMLV', `F11*H11`],
    [t0 + 5, 'Deducible aplicable (el mayor)', `MAX(B${t0 + 3},B${t0 + 4})`],
    [t0 + 6, 'Indemnización amparo edificio', `MAX(0,B${t0 + 2}-B${t0 + 5})`],
  ];
  rowsTot.forEach(([r, lab, formula], idx) => {
    liq.mergeCells(`C${r}:H${r}`);
    labelCell(liq.getCell(`A${r}`), lab);
    liq.mergeCells(`A${r}:A${r}`);
    liq.getCell(`B${r}`).value = { formula };
    moneyFmt(liq.getCell(`B${r}`));
    liq.getCell(`B${r}`).border = thinBorder();
    liq.getCell(`B${r}`).font = { name: FONT, bold: idx === 6, size: 11 };
    if (idx === 6) {
      liq.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${VERDE}` } };
      liq.getCell(`A${r}`).font = { name: FONT, bold: true, color: { argb: `FF${BLANCO}` }, size: 11 };
      liq.getCell(`B${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
    }
  });

  const oa0 = t0 + 8;
  liq.mergeCells(`A${oa0}:H${oa0}`);
  liq.getCell(`A${oa0}`).value = 'OTROS AMPAROS (sin deducible ni AIU) — arriendo, escombros, demostración del siniestro';
  fillHeader(liq.getRow(oa0));
  ['Aplica (S/N)', 'Amparo', 'Observación', 'Und', 'Cant.', 'Vlr. unitario', 'Valor', ''].forEach((h, i) => {
    liq.getCell(oa0 + 1, i + 1).value = h;
  });
  fillHeader(liq.getRow(oa0 + 1));
  const oaFirst = oa0 + 2;
  const oaLast = oaFirst + 4;
  const defaultsOa = [
    'Arriendo / pérdida de rentas',
    'Retiro de escombros',
    'Gastos para demostración del siniestro',
    'Otro amparo',
    '',
  ];
  for (let r = oaFirst; r <= oaLast; r += 1) {
    inputCell(liq.getCell(r, 1), r === oaFirst ? 'N' : 'N');
    inputCell(liq.getCell(r, 2), defaultsOa[r - oaFirst] || '');
    inputCell(liq.getCell(r, 3), '');
    inputCell(liq.getCell(r, 4), 'glb');
    inputCell(liq.getCell(r, 5), '');
    inputCell(liq.getCell(r, 6), '');
    liq.getCell(r, 7).value = {
      formula: `IF(OR(UPPER(A${r})<>"S",E${r}="",F${r}=""),"",E${r}*F${r})`,
    };
    moneyFmt(liq.getCell(r, 7));
    liq.getCell(r, 7).border = thinBorder();
    moneyFmt(liq.getCell(r, 6));
  }
  const totOa = oaLast + 1;
  const totFinal = totOa + 1;
  labelCell(liq.getCell(`A${totOa}`), 'Subtotal otros amparos');
  liq.getCell(`B${totOa}`).value = { formula: `SUM(G${oaFirst}:G${oaLast})` };
  moneyFmt(liq.getCell(`B${totOa}`));
  liq.mergeCells(`C${totOa}:H${totOa}`);

  labelCell(liq.getCell(`A${totFinal}`), 'TOTAL A INDEMNIZAR');
  liq.getCell(`A${totFinal}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC65911' } };
  liq.getCell(`A${totFinal}`).font = { name: FONT, bold: true, color: { argb: `FF${BLANCO}` }, size: 12 };
  liq.getCell(`B${totFinal}`).value = { formula: `B${t0 + 6}+B${totOa}` };
  moneyFmt(liq.getCell(`B${totFinal}`));
  liq.getCell(`B${totFinal}`).font = { name: FONT, bold: true, size: 13 };
  liq.getCell(`B${totFinal}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
  liq.getCell(`B${totFinal}`).border = thinBorder();
  liq.mergeCells(`C${totFinal}:H${totFinal}`);
  liq.getCell(`C${totFinal}`).value = 'Este monto es el oficial (edificio − deducible + otros amparos). Copiar al finiquito / informe único.';
  liq.getCell(`C${totFinal}`).font = { name: FONT, italic: true, size: 9 };

  const pie = totFinal + 2;
  labelCell(liq.getCell(`A${pie}`), 'Liquidado por');
  inputCell(liq.getCell(`B${pie}`), '');
  labelCell(liq.getCell(`C${pie}`), 'N° cuenta');
  inputCell(liq.getCell(`D${pie}`), '');
  labelCell(liq.getCell(`E${pie}`), 'Banco pago');
  inputCell(liq.getCell(`F${pie}`), '');
  labelCell(liq.getCell(`G${pie}`), 'Tipo cuenta');
  inputCell(liq.getCell(`H${pie}`), '');
  labelCell(liq.getCell(`A${pie + 1}`), 'ACEPTO / NO ACEPTO');
  inputCell(liq.getCell(`B${pie + 1}`), '');
  labelCell(liq.getCell(`C${pie + 1}`), 'Nombre firmante');
  inputCell(liq.getCell(`D${pie + 1}`), '');
  liq.mergeCells(`D${pie + 1}:H${pie + 1}`);

  const ag = wb.addWorksheet('ANALISIS_GENERAL');
  ag.columns = [{ width: 42 }, { width: 28 }, { width: 28 }, { width: 28 }, { width: 28 }];
  ag.mergeCells('A1:E1');
  ag.getCell('A1').value = 'INFORME ÚNICO / ANÁLISIS COBERTURA CRITERIA — SEGUROS ALFA';
  ag.getCell('A1').font = { name: FONT, bold: true, size: 14, color: { argb: `FF${BLANCO}` } };
  ag.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF548235' } };
  ag.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ag.getRow(1).height = 26;

  const camposAg = [
    [3, 'Ubicación del evento'],
    [4, 'Coordenadas (lat, lng)'],
    [5, 'Coaseguro'],
    [6, 'Descripción del evento'],
    [7, 'Causa del evento'],
    [8, 'Fecha de asignación'],
    [9, 'Fecha último documento'],
    [10, 'Aplicación de exclusiones'],
    [11, 'Cumplimiento de garantías'],
    [12, 'Salvamento'],
    [13, 'Posibilidad de recobro'],
    [14, 'Observaciones / conclusiones'],
    [15, 'Recomendación del ajustador'],
    [16, 'Ajustador (nombre)'],
    [17, 'Fecha del informe'],
    [18, 'Indemnización sugerida (del liquidador)'],
  ];
  camposAg.forEach(([r, lab]) => {
    labelCell(ag.getCell(`A${r}`), lab);
    ag.mergeCells(`B${r}:E${r}`);
    inputCell(ag.getCell(`B${r}`), r === 5 ? 'N/A' : r === 10 ? 'No aplica' : r === 11 ? 'Cumple' : r === 12 ? 'No aplica' : r === 13 ? 'No aplica' : '');
    ag.getRow(r).height = r === 6 || r === 14 || r === 15 ? 48 : 22;
  });
  ag.getCell('B18').value = { formula: "LIQUIDADOR!B" + totFinal };
  moneyFmt(ag.getCell('B18'));
  ag.getCell('B18').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };

  ag.mergeCells('A20:E20');
  ag.getCell('A20').value = 'INDICADORES DE FRAUDE (marque X en BAJO / MEDIO / ALTO)';
  fillHeader(ag.getRow(20));
  ['Criterio', 'BAJO', 'MEDIO', 'ALTO', 'Nota'].forEach((h, i) => {
    ag.getCell(21, i + 1).value = h;
  });
  fillHeader(ag.getRow(21));
  const fraudes = [
    'Documentación alterada o sospechosa sobre la ocurrencia',
    'Exageración del 20% de los montos reclamados',
    'Siniestro ocurre 30 días antes del fin de la póliza o posterior al inicio',
    'Daños por falta de mantenimiento / vicio previo sin relación con los hechos',
    'Destrucción de bienes reclamados antes del reporte del siniestro',
    'Documentación alterada o sospechosa del costo de los bienes',
    'Si es hurto: bienes de gran tamaño o inusuales para un robo',
    'Si es RC: el asegurado tiene interés particular en aceptar responsabilidad',
    'Usted intuye o evidencia indicadores de fraude en este siniestro',
  ];
  fraudes.forEach((lab, i) => {
    const r = 22 + i;
    ag.getCell(r, 1).value = lab;
    ag.getCell(r, 1).border = thinBorder();
    ag.getCell(r, 1).alignment = { wrapText: true };
    inputCell(ag.getCell(r, 2), i === 8 ? 'NO' : 'X');
    inputCell(ag.getCell(r, 3), '');
    inputCell(ag.getCell(r, 4), '');
    inputCell(ag.getCell(r, 5), '');
    ag.getRow(r).height = 28;
  });

  const inst = wb.addWorksheet('INSTRUCCIONES');
  inst.columns = [{ width: 100 }];
  inst.getCell('A1').value = 'Cómo usar este Excel';
  inst.getCell('A1').font = { name: FONT, bold: true, size: 16, color: { argb: `FF${AZUL}` } };
  inst.getCell('A3').value = [
    '1. Hoja LIQUIDADOR: diligencie las celdas amarillas.',
    '2. Tomador = banco. Póliza/cartera = etiqueta 2026. Base, % y mínimo SMMLV se cargan solos.',
    '3. DETALLE (igual que Arnald): elija CAPÍTULO y luego ACTIVIDAD de la base Valle del Cauca.',
    `   Hay ${BASE_PRECIOS_PRESUPUESTO.length} ítems. Unidad y valor unitario se llenan solos (hoja BASE_PRECIOS_VALLE).`,
    '4. Escriba la cantidad. Pérdida = cantidad × valor unitario. AIU default 20 %.',
    '5. Si el ítem no está en la base, escríbalo a mano en Actividad y pise el valor unitario (se pierde la fórmula de esa fila).',
    '6. Valor SID es obligatorio si la base del deducible es SID.',
    '7. Deducible = el MAYOR entre (% × SID o % × pérdida) y (N × SMMLV).',
    '8. Otros amparos: ponga S en Aplica. No llevan AIU ni deducible.',
    '9. TOTAL A INDEMNIZAR alimenta ANALISIS_GENERAL (informe único).',
  ].join('\n');
  inst.getCell('A3').alignment = { wrapText: true, vertical: 'top' };
  inst.getRow(3).height = 220;

  await wb.xlsx.writeFile(outPath);
  return outPath;
}

function bordeCuadro() {
  const s = { style: BorderStyle.SINGLE, size: 8, color: '000000' };
  return { top: s, bottom: s, left: s, right: s };
}

function celda(texto, opts = {}) {
  return new TableCell({
    borders: bordeCuadro(),
    width: { size: opts.w || 4680, type: WidthType.DXA },
    columnSpan: opts.span || 1,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: String(texto ?? ''),
            font: 'Arial',
            size: 22,
            bold: !!opts.bold,
          }),
        ],
      }),
    ],
  });
}

function fila(label, value = '________________________________') {
  return new TableRow({
    children: [celda(label, { bold: true, w: 4200 }), celda(value, { w: 5160 })],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { after: opts.after ?? 160, before: opts.before ?? 0 },
    children: [
      new TextRun({
        text: String(text),
        font: 'Arial',
        size: opts.size || 22,
        bold: !!opts.bold,
        color: opts.color || '000000',
      }),
    ],
  });
}

function h(text) {
  return p(text, { bold: true, before: 280, after: 140 });
}

async function generarWordInformeUnico(outPath, { alfa = false } = {}) {
  let logoProser = null;
  let logoAlfa = null;
  try {
    const buf = fs.readFileSync(path.join(TEMPLATES, 'logo-grupoproser.png'));
    logoProser = new ImageRun({ data: buf, transformation: { width: 130, height: 42 }, type: 'png' });
  } catch {
    /* sin logo */
  }
  if (alfa) {
    try {
      const buf = fs.readFileSync(path.join(TEMPLATES, 'logo-seguros-alfa.png'));
      logoAlfa = new ImageRun({ data: buf, transformation: { width: 118, height: 52 }, type: 'png' });
    } catch {
      /* sin logo */
    }
  }

  const header = new Header({
    children: [
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2200, 4960, 2200],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: bordeCuadro(),
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: logoProser
                      ? [logoProser]
                      : [new TextRun({ text: 'GRUPO PROSER', bold: true, font: 'Arial', size: 18 })],
                  }),
                ],
              }),
              new TableCell({
                borders: bordeCuadro(),
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: 'INFORME ', bold: true, font: 'Arial', size: 24, color: '0070C0' }),
                      new TextRun({
                        text: 'ÚNICO',
                        bold: true,
                        font: 'Arial',
                        size: 24,
                        color: '0070C0',
                        underline: {},
                      }),
                      new TextRun({
                        text: ' DE SINIESTRO',
                        bold: true,
                        font: 'Arial',
                        size: 24,
                        color: '0070C0',
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: alfa ? 'SEGUROS ALFA S.A.  ·  Código / Versión' : 'Ajuste de seguros  ·  Código / Versión',
                        font: 'Arial',
                        size: 16,
                        color: '333333',
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                borders: bordeCuadro(),
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: logoAlfa
                      ? [logoAlfa]
                      : [new TextRun({ text: alfa ? 'ALFA' : 'CIA.', bold: true, font: 'Arial', size: 18 })],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 1400, bottom: 900, left: 900, right: 900 } },
        },
        headers: { default: header },
        children: [
          p(alfa ? 'SEGUROS ALFA S.A.' : 'COMPAÑÍA ASEGURADORA', {
            align: AlignmentType.CENTER,
            bold: true,
            after: 200,
          }),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: [4200, 5160],
            rows: [
              fila('REPORTE No', alfa ? 'Único — Seguros Alfa' : 'Único'),
              fila('CONSECUTIVO'),
              fila('SINIESTRO No'),
              fila('TOMADOR'),
              fila('ASEGURADO / CONTACTO'),
              fila('CORREO ELECTRÓNICO'),
              fila('CELULAR'),
              fila('IDENTIFICACIÓN'),
              fila('N° PÓLIZA'),
              fila('N° CRÉDITO'),
              fila('VIGENCIA'),
              fila('COBERTURA / EVENTO', alfa ? 'TERREMOTO' : '________________'),
              fila('DIRECCIÓN RIESGO ASEGURADO'),
              fila('CIUDAD / DEPARTAMENTO'),
              fila('FECHA DE OCURRENCIA'),
              fila('FECHA DE INSPECCIÓN'),
              fila('FECHA DEL INFORME'),
              fila('AJUSTADOR'),
              fila('INDEMNIZACIÓN SUGERIDA', '$ ________________'),
            ],
          }),
        ],
      },
      {
        properties: { page: { margin: { top: 1400, bottom: 900, left: 900, right: 900 } } },
        headers: { default: header },
        children: [
          h('1. Información general del evento'),
          p(
            alfa
              ? 'El 10 de agosto de 2026 se registró en Colombia un sismo de magnitud 7,4, con epicentro en San José del Palmar, Chocó, percibido especialmente en el suroccidente y el Eje Cafetero. Este evento constituye el antecedente general del presente informe.'
              : 'Describa el contexto general del evento (fecha, magnitud o fenómeno, zona afectada, réplicas o condiciones posteriores).'
          ),
          p('[Pegar aquí mapa / captura de ubicación del evento]', { align: AlignmentType.CENTER }),
          h('2. Descripción de los daños y/o perjuicios'),
          p(
            'Describa los daños observados en la inspección (estructura, mampostería, cubierta, acabados, contenidos). Incluya dirección del riesgo y coordenadas.'
          ),
          p('Ubicación del riesgo: ________________________________  Lat/Lng: ________________'),
          h('3. Información de póliza y cobertura'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: [4200, 5160],
            rows: [
              fila('Tomador'),
              fila('Identificación'),
              fila('N° póliza'),
              fila('N° crédito'),
              fila('Cobertura / evento'),
              fila('Estado pago primas'),
              fila('Fecha inicio póliza'),
              fila('Fecha fin póliza'),
              fila('Valor asegurado inmueble'),
              fila('Valor asegurado contenidos'),
              fila('Valor SID (Alfa)', alfa ? '________________  (base del deducible)' : 'N/A'),
              fila('Dirección predio'),
              fila('Ciudad / Departamento'),
              fila('Fecha siniestro'),
              fila('Fecha inspección'),
            ],
          }),
        ],
      },
      {
        properties: {
          page: {
            margin: { top: 900, bottom: 700, left: 700, right: 700 },
            size: { orientation: PageOrientation.LANDSCAPE },
          },
        },
        headers: { default: header },
        children: [
          h('4. Liquidación de pérdidas (liquidador)'),
          p(
            alfa
              ? 'Presupuesto NSR-10 o cotizaciones PDF. AIU 20 %. Deducible según tomador (banco): MAX(% × Valor SID ó % × pérdida, N × SMMLV). Otros amparos sin AIU ni deducible.'
              : 'Presupuesto de intervención NSR-10: capítulo, componente, actividad, und, cant., vlr. unitario, vlr. total (= cant. × VU), prioridad, cubierto, observación, fuente. Subtotal + AIU − deducible.'
          ),
          new Table({
            width: { size: 14000, type: WidthType.DXA },
            columnWidths: [1800, 2800, 800, 900, 1400, 1400, 1400, 1600, 1900],
            rows: [
              new TableRow({
                children: [
                  'Capítulo',
                  'Actividad / reparación',
                  'Und',
                  'Cant.',
                  'Vlr. unitario',
                  'Vlr. total',
                  '¿Cubierto?',
                  'Observación',
                  'Fuente',
                ].map((t) => celda(t, { bold: true, w: 1400 })),
              }),
              ...Array.from({ length: 8 }, () =>
                new TableRow({
                  children: Array.from({ length: 9 }, () => celda('')),
                })
              ),
            ],
          }),
          p(''),
          new Table({
            width: { size: 9000, type: WidthType.DXA },
            columnWidths: [5000, 4000],
            rows: [
              fila('Subtotal (costo directo)', '$'),
              fila(alfa ? 'AIU (20 %)' : 'AIU (%)', '$'),
              fila('Imprevistos (Alfa = 0)', '$ 0'),
              fila('Pérdida (subtotal + AIU)', '$'),
              fila('Deducible aplicable', '$'),
              fila('Otros amparos (sin deducible)', '$'),
              fila('TOTAL A INDEMNIZAR', '$'),
            ],
          }),
        ],
      },
      {
        properties: { page: { margin: { top: 1400, bottom: 900, left: 900, right: 900 } } },
        headers: { default: header },
        children: [
          h('5. Relación de valores reclamados vs. valores indemnizables'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: [800, 4000, 2280, 2280],
            rows: [
              new TableRow({
                children: ['N°', 'Ítem', 'Reclamado', 'Indemnizable'].map((t) =>
                  celda(t, { bold: true, w: 2200 })
                ),
              }),
              ...[1, 2, 3, 4, 5].map((n) =>
                new TableRow({
                  children: [celda(String(n)), celda(''), celda('$'), celda('$')],
                })
              ),
            ],
          }),
          p('Diferencia reclamado − indemnizable: $ ________________'),
          h('6. Inspección fotográfica'),
          p('Registro fotográfico del predio. Pegar imágenes y numerar (Foto 1, Foto 2…).'),
          h('7. Conclusiones y recomendación del ajustador'),
          p('Conclusiones:', { bold: true, after: 40 }),
          p('________________________________________________________________'),
          p('________________________________________________________________'),
          p('Recomendación:', { bold: true, after: 40, before: 200 }),
          p('________________________________________________________________'),
          p('________________________________________________________________'),
          p(
            'Para constancia se firma el presente informe único en ________________, a los ____ días del mes de ______________ de 2026.',
            { before: 280 }
          ),
          p(''),
          p('________________________________          ________________________________'),
          p('Ajustador / Grupo Proser                    Asegurado / Tomador'),
          p('Nombre: ________________________          Nombre: ________________________'),
          p('C.C. ____________________________          C.C. ____________________________'),
        ],
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  try {
    fs.writeFileSync(outPath, buf);
    return outPath;
  } catch (err) {
    if (err && err.code === 'EBUSY') {
      const alt = outPath.replace(/(\.[^.]+)$/, '_nuevo$1');
      fs.writeFileSync(alt, buf);
      console.warn('Archivo abierto, escrito como:', path.basename(alt));
      return alt;
    }
    throw err;
  }
}

async function inyectarBaseEnNsr10(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const viejaBp = wb.getWorksheet('BASE_PRECIOS_VALLE');
  if (viejaBp) wb.removeWorksheet(viejaBp.id);
  const viejaListas = wb.getWorksheet('LISTAS_VALLE');
  if (viejaListas) wb.removeWorksheet(viejaListas.id);
  agregarBasePreciosValle(wb);
  const pres = wb.getWorksheet('Presupuesto');
  if (pres) {
    aplicarDropdownsValle(pres, { colAct: 'D', firstRow: 4, lastRow: 38 });
    for (let r = 4; r <= 38; r += 1) {
      pres.getCell(`A${r}`).value = { formula: formulaLookupValle(r, 'D', 'B') };
      pres.getCell(`E${r}`).value = { formula: formulaLookupValle(r, 'D', 'D') };
      pres.getCell(`G${r}`).value = { formula: formulaLookupValle(r, 'D', 'E') };
      moneyFmt(pres.getCell(`G${r}`));
      pres.getCell(`A${r}`).border = thinBorder();
      pres.getCell(`E${r}`).border = thinBorder();
      pres.getCell(`G${r}`).border = thinBorder();
    }
    pres.getCell('A2').value =
      'Elija el ÍTEM en la columna D (lista Valle del Cauca, 951 actividades). Capítulo, unidad y valor unitario se llenan solos. Luego digite la cantidad.';
  }
  await writeWorkbookSafe(wb, filePath);
}

async function inyectarBaseEnCatAlfa(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const viejaBp = wb.getWorksheet('BASE_PRECIOS_VALLE');
  if (viejaBp) wb.removeWorksheet(viejaBp.id);
  const viejaListas = wb.getWorksheet('LISTAS_VALLE');
  if (viejaListas) wb.removeWorksheet(viejaListas.id);
  agregarBasePreciosValle(wb);
  const lastCat = agregarCatalogoTomadores(wb);
  const sheet = wb.getWorksheet('LIQUIDADOR');
  if (sheet) {
    // --- Tomador / cartera (K6) → % y N SMMLV del informe 2026 ---
    sheet.getCell('K6').value = '';
    sheet.getCell('K6').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${AMARILLO}` },
    };
    sheet.getCell('K6').font = { name: FONT, size: 10 };
    sheet.getCell('K6').alignment = { vertical: 'middle', wrapText: true };
    sheet.dataValidations.add('K6:O6', {
      type: 'list',
      allowBlank: true,
      formulae: [`CATALOGO_TOMADORES!$I$2:$I$${lastCat}`],
      showErrorMessage: false,
      showInputMessage: true,
      promptTitle: 'Tomador / póliza / cartera',
      prompt:
        'Elija el banco y la cartera 2026. El deducible (% y mínimo SMMLV) se calcula solo. F12 = Valor SID.',
    });

    const matchTom = 'MATCH($K$6,CATALOGO_TOMADORES!I:I,0)';
    sheet.getCell('L8').value = {
      formula: `IF($K$6="",2,IFERROR(INDEX(CATALOGO_TOMADORES!G:G,${matchTom}),2))`,
    };
    formulaCell(sheet.getCell('L8'));
    sheet.getCell('M8').value = {
      formula: `IF($K$6="",0.02,IFERROR(INDEX(CATALOGO_TOMADORES!F:F,${matchTom})/100,0.02))`,
    };
    formulaCell(sheet.getCell('M8'));
    sheet.getCell('M8').numFmt = '0.0%';

    // SMMLV 2025/2026 (la tabla original llega a 2024; G41 ya tiene 2026)
    sheet.getCell('A47').value = 2025;
    sheet.getCell('B47').value = 1423500;
    sheet.getCell('A48').value = 2026;
    sheet.getCell('B48').value = 1750905;
    moneyFmt(sheet.getCell('B47'));
    moneyFmt(sheet.getCell('B48'));

    sheet.getCell('L9').value = {
      formula:
        'IFERROR($L$8*IFERROR(VLOOKUP($F$9,$A$24:$B$48,2,FALSE),$G$41),0)',
    };
    formulaCell(sheet.getCell('L9'));
    moneyFmt(sheet.getCell('L9'));

    // Base SID vs PERDIDA + AIU 20 %
    sheet.getCell('P11').value = 'Base deducible';
    sheet.getCell('Q11').value = {
      formula: `IF($K$6="",\"SID\",IFERROR(INDEX(CATALOGO_TOMADORES!E:E,${matchTom}),\"SID\"))`,
    };
    formulaCell(sheet.getCell('Q11'));
    sheet.getCell('P12').value = 'AIU %';
    inputCell(sheet.getCell('Q12'), 20);
    sheet.getCell('Q12').alignment = { horizontal: 'center' };
    sheet.getCell('P13').value = 'Regla tomador';
    sheet.mergeCells('Q13:R13');
    sheet.getCell('Q13').value = {
      formula: `IFERROR(INDEX(CATALOGO_TOMADORES!H:H,${matchTom}),\"Elija tomador en K6\")`,
    };
    formulaCell(sheet.getCell('Q13'));
    sheet.getCell('Q13').alignment = { wrapText: true, vertical: 'middle' };
    sheet.getRow(13).height = 28;
    ['P11', 'P12', 'P13'].forEach((a) => {
      sheet.getCell(a).font = { name: FONT, bold: true, size: 9, color: { argb: `FF${AZUL}` } };
      sheet.getCell(a).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${GRIS}` } };
      sheet.getCell(a).border = thinBorder();
    });

    // % × SID (Bogotá / AV Villas / …) o % × (subtotal+AIU) si la cartera es PERDIDA
    sheet.getCell('M9').value = {
      formula:
        'IFERROR(IF($Q$11="PERDIDA",$O$25*$M$8,IF($F$12="",0,$F$12*$M$8)),0)',
    };
    formulaCell(sheet.getCell('M9'));
    moneyFmt(sheet.getCell('M9'));

    sheet.getCell('M10').value = {
      formula: "IFERROR(VLOOKUP(F8,'TRM Historica'!B8:C13002,2,0),0)",
    };

    sheet.getCell('F12').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${AMARILLO}` },
    };
    sheet.getCell('F12').border = thinBorder();

    // --- Valle del Cauca: ítem → und + VU; pérdida K = cant × VU ---
    sheet.getCell('P14').value = 'Base Valle del Cauca';
    sheet.getCell('P15').value = 'Und';
    sheet.getCell('Q15').value = 'Cant.';
    sheet.getCell('R15').value = 'Vlr. unitario';
    ['P14', 'P15', 'Q15', 'R15'].forEach((a) => {
      sheet.getCell(a).font = { name: FONT, bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      sheet.getCell(a).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
    });
    try {
      sheet.mergeCells('P14:R14');
    } catch {
      /* ya estaba combinada */
    }
    aplicarDropdownsValle(sheet, { colAct: 'E', firstRow: 16, lastRow: 24 });
    for (let r = 16; r <= 24; r += 1) {
      sheet.getCell(`P${r}`).value = { formula: formulaLookupValle(r, 'E', 'D') };
      inputCell(sheet.getCell(`Q${r}`), '');
      sheet.getCell(`R${r}`).value = { formula: formulaLookupValle(r, 'E', 'E') };
      moneyFmt(sheet.getCell(`R${r}`));
      sheet.getCell(`K${r}`).value = { formula: `IF(Q${r}="","",Q${r}*R${r})` };
      moneyFmt(sheet.getCell(`K${r}`));
      sheet.getCell(`H${r}`).value = { formula: `IF($F$12="","",$F$12)` };
      sheet.getCell(`I${r}`).value = { formula: `IF($F$12="","",$F$12)` };
      sheet.getCell(`M${r}`).value = { formula: `IF(K${r}="","",K${r})` };
      moneyFmt(sheet.getCell(`H${r}`));
      moneyFmt(sheet.getCell(`I${r}`));
      moneyFmt(sheet.getCell(`M${r}`));
      sheet.getCell(`P${r}`).border = thinBorder();
      sheet.getCell(`R${r}`).border = thinBorder();
    }
    sheet.getColumn('P').width = 28;
    sheet.getColumn('Q').width = 12;
    sheet.getColumn('R').width = 16;
    sheet.getColumn('S').width = 16;

    sheet.getCell('D13').value =
      'F12 = Valor SID (obligatorio si el deducible es % del asegurable). K6 = tomador/cartera.';
    sheet.getCell('D13').font = { name: FONT, italic: true, size: 8, color: { argb: 'FFC65911' } };

    sheet.getCell('E13').value =
      'Descripción: elija un ítem Valle del Cauca. Cantidad en Q → K = cant × VU. AIU 20 % y deducible salen del tomador.';
    sheet.getCell('E13').font = { name: FONT, italic: true, size: 9, color: { argb: 'FF1F4E79' } };

    // Totales como Arnald: subtotal ítems + AIU, luego MAX(% , N×SMMLV), luego indemnizar
    sheet.getCell('L25').value = { formula: '"Sub Total + AIU ("&TEXT($Q$12,"0")&"%)"' };
    sheet.getCell('O25').value = {
      formula: 'IF(SUM(K16:K24)=0,"",SUM(K16:K24)*(1+$Q$12/100))',
    };
    moneyFmt(sheet.getCell('O25'));
    sheet.getCell('P25').value = 'AIU $';
    sheet.getCell('P25').font = { name: FONT, bold: true, size: 9, color: { argb: `FF${AZUL}` } };
    sheet.getCell('Q25').value = { formula: 'SUM(K16:K24)*$Q$12/100' };
    formulaCell(sheet.getCell('Q25'));
    moneyFmt(sheet.getCell('Q25'));

    sheet.getCell('O26').value = {
      formula:
        'IF(O25="","",MAX(IFERROR(N($L$9),0),IFERROR(N($M$9),0),IFERROR(N($N$9),0),IFERROR(N($O$9),0)))',
    };
    moneyFmt(sheet.getCell('O26'));

    // Otros amparos (sin AIU ni deducible)
    sheet.getCell('P28').value = 'OTROS AMPAROS (sin deducible ni AIU)';
    try {
      sheet.mergeCells('P28:S28');
    } catch {
      /* ok */
    }
    ['P28', 'P29', 'Q29', 'R29', 'S29'].forEach((a) => {
      sheet.getCell(a).font = { name: FONT, bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
      sheet.getCell(a).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF548235' } };
    });
    sheet.getCell('P29').value = 'Amparo';
    sheet.getCell('Q29').value = 'Cant.';
    sheet.getCell('R29').value = 'Vlr. unit.';
    sheet.getCell('S29').value = 'Valor';
    const oaDefaults = [
      'Arriendo / pérdida de rentas',
      'Retiro de escombros',
      'Gastos para demostración del siniestro',
      '',
    ];
    for (let i = 0; i < 4; i += 1) {
      const r = 30 + i;
      inputCell(sheet.getCell(`P${r}`), oaDefaults[i]);
      inputCell(sheet.getCell(`Q${r}`), '');
      inputCell(sheet.getCell(`R${r}`), '');
      moneyFmt(sheet.getCell(`R${r}`));
      sheet.getCell(`S${r}`).value = {
        formula: `IF(OR(Q${r}="",R${r}=""),"",Q${r}*R${r})`,
      };
      formulaCell(sheet.getCell(`S${r}`));
      moneyFmt(sheet.getCell(`S${r}`));
    }

    sheet.getCell('O27').value = {
      formula: 'IF(AND(N(O25)=0,SUM(S30:S33)=0),"",MAX(0,N(O25)-N(O26))+SUM(S30:S33))',
    };
    moneyFmt(sheet.getCell('O27'));
    sheet.getCell('L27').value = 'Valor a Indemnizar';
  }
  await writeWorkbookSafe(wb, filePath);
}

function escribirLeeme(dir) {
  const txt = `FORMATOS FÍSICOS ARNALD — ${new Date().toISOString().slice(0, 10)}

Estos archivos son para diligenciar en Word/Excel (no hace falta entrar a Arnald).

1) 01_Informe_Unico.docx
   Plantilla Word del informe único de siniestro (7 secciones).
   Use 01b_Informe_Unico_Alfa.docx si el caso es Seguros Alfa (logos y texto del sismo 10-ago-2026).

2) 02_Liquidador_NSR10.xlsx
   Plantilla NSR-10 (Portada, Evaluación, Dictamen, Presupuesto) CON la base Valle del Cauca.
   En Presupuesto: en la columna D abra la lista y elija el ítem (951 de Valle del Cauca).
   Capítulo, unidad y valor unitario se llenan solos. Luego digite la cantidad.

00) 00_Base_Precios_Valle_del_Cauca.xlsx
    Catálogo completo (951 ítems) igual al de Arnald, por si quiere consultarlo aparte.

3) 03_Informe_CAT_Seguros_Alfa.xlsx
   Plantilla CAT Alfa (formato oficial) con las mismas reglas de Arnald:
   - K6: elija TOMADOR / póliza / cartera 2026. Eso arma el % y los N SMMLV.
   - F12: Valor SID (obligatorio si el deducible es % del asegurable).
   - Q12: AIU % (20 por defecto). O25 = ítems + AIU.
   - O26 deducible = el mayor entre el % (SID o pérdida, según el banco) y N×SMMLV.
   - O27 a indemnizar = MAX(0, subtotal+AIU − deducible) + otros amparos (P30).
   - Columna E: ítem Valle del Cauca; cantidad en Q; K = cant × VU.

3b) 03b_Formato_Alfa_formulado.xlsx
    Formato Alfa para diligenciar:
    - Tomador / póliza-cartera 2026 (deducible automático)
    - Base presupuestal Valle del Cauca: capítulo → ítem → und + VU
    - SMMLV, AIU 20 %, MAX(% , N×SMMLV), otros amparos
    - ANALISIS_GENERAL ligado al total a indemnizar

Celdas amarillas = las que usted llena. El resto son fórmulas: no las borre.
`;
  fs.writeFileSync(path.join(dir, 'LEEME.txt'), txt, 'utf8');
}

async function main() {
  const destinos = [OUT_REPO];
  if (OUT_DESKTOP && process.env.USERPROFILE) destinos.push(OUT_DESKTOP);

  for (const dir of destinos) {
    ensureDir(dir);
    copyIfExists(
      'base-precios-presupuesto-general.xlsx',
      dir,
      '00_Base_Precios_Valle_del_Cauca.xlsx'
    );
    const nsrPath = copyIfExists(
      'Plantilla_Evaluacion_Sismica_NSR10.xlsx',
      dir,
      '02_Liquidador_NSR10.xlsx'
    );
    const catPath = copyIfExists(
      'Informe_CAT_Seguros_Alfa.xlsx',
      dir,
      '03_Informe_CAT_Seguros_Alfa.xlsx'
    );
    copyIfExists('Liquidador_plantilla.xlsx', dir, '02b_Liquidador_plantilla.xlsx');
    copyIfExists('Finiquito_Indemnizacion_Sismo_Alfa.docx', dir, '04_Finiquito_Alfa.docx');
    if (nsrPath) await inyectarBaseEnNsr10(nsrPath);
    if (catPath) await inyectarBaseEnCatAlfa(catPath);

    const alfaPath = path.join(dir, '03b_Formato_Alfa_formulado.xlsx');
    try {
      await generarExcelAlfaFormulado(alfaPath);
    } catch (err) {
      if (err && err.code === 'EBUSY') {
        const alt = path.join(dir, '03b_Formato_Alfa_formulado_nuevo.xlsx');
        await generarExcelAlfaFormulado(alt);
        console.warn('03b estaba abierto, generado:', alt);
      } else {
        throw err;
      }
    }
    await generarWordInformeUnico(path.join(dir, '01_Informe_Unico.docx'), { alfa: false });
    await generarWordInformeUnico(path.join(dir, '01b_Informe_Unico_Alfa.docx'), { alfa: true });
    escribirLeeme(dir);
    console.log('Listo:', dir);
  }
}

await main();
