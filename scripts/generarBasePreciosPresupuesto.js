/**
 * Genera basePreciosPresupuesto.js desde el Excel de base de precios.
 * Uso: node scripts/generarBasePreciosPresupuesto.js [rutaExcel]
 */
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.join(__dirname, '..');

const defaultExcel = path.join(
  process.env.USERPROFILE || '',
  'Downloads',
  'BASE DE PRECIOS GENERAL .xlsx'
);
const excelPath = process.argv[2] || defaultExcel;
const outJs = path.join(
  FRONT,
  'src/components/SubcomponenteEvaluacionSismicaNSR10/basePreciosPresupuesto.js'
);
const publicDir = path.join(FRONT, 'public/templates');
const publicExcel = path.join(publicDir, 'base-precios-presupuesto-general.xlsx');

const CAP_MAP = {
  DEMOLICIONES: 'Demoliciones',
  ESTRUCTURA: 'Estructura',
  'MAMPOSTERIA/BAHAREQUE': 'Mampostería / Bahareque',
  CUBIERTA: 'Cubierta',
  ACABADOS: 'Acabados',
  REDES: 'Redes',
  GEOTECNIA: 'Geotecnia',
  'EQUIPOS/ANCLAJES': 'Equipos / Anclajes',
  'LIMPIEZA/RETIRO': 'Limpieza / Retiro',
};

const UNIDAD_MAP = {
  M2: 'm²',
  M3: 'm³',
  M: 'ml',
  UND: 'und',
  KG: 'kg',
  MES: 'mes',
  JUEGO: 'juego',
  KIT: 'kit',
  PUNTO: 'punto',
};

function normalizarUnidad(raw) {
  const key = String(raw || '').trim().toUpperCase();
  return UNIDAD_MAP[key] || String(raw || '').trim().toLowerCase() || 'und';
}

if (!fs.existsSync(excelPath)) {
  console.error('No se encontró el Excel:', excelPath);
  process.exit(1);
}

fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(excelPath, publicExcel);

const wb = XLSX.readFile(excelPath, { cellDates: true });
const sheetName = wb.SheetNames.find((n) => String(n).includes('25')) || '(25%)';
const ws = wb.Sheets[sheetName];
if (!ws) {
  console.error('No está la hoja (25%) en el Excel. Hojas:', wb.SheetNames);
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
const items = [];
let capituloRaw = 'GENERAL';
let seq = 0;

for (const r of rows) {
  if (!Array.isArray(r)) continue;
  const desc = r[1] != null ? String(r[1]).replace(/\t/g, '').trim() : '';
  const unidad = r[2] != null ? String(r[2]).trim() : '';
  const valor = typeof r[3] === 'number' ? r[3] : null;
  if (!desc || desc.toUpperCase() === 'DESCRIPCION') continue;
  if ((!unidad || unidad === '') && (valor == null || valor === 0)) {
    capituloRaw = desc.toUpperCase();
    continue;
  }
  if (unidad && valor != null && valor > 0) {
    seq += 1;
    const slug = desc
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 48);
    items.push({
      id: `bp_${String(seq).padStart(4, '0')}_${slug}`,
      capitulo: CAP_MAP[capituloRaw] || capituloRaw,
      capituloOrigen: capituloRaw,
      actividad: desc,
      unidad: normalizarUnidad(unidad),
      valorUnitario: Math.round(valor * 100) / 100,
    });
  }
}

const header = `/**
 * Base de precios general para Presupuesto NSR-10.
 * Fuente: public/templates/base-precios-presupuesto-general.xlsx (hoja "(25%)").
 * Generado con scripts/generarBasePreciosPresupuesto.js — no editar a mano.
 * Items: ${items.length}
 */

export const BASE_PRECIOS_PRESUPUESTO = Object.freeze(${JSON.stringify(items, null, 2)});

export const CAPITULOS_BASE_PRECIOS = Object.freeze(
  [...new Set(BASE_PRECIOS_PRESUPUESTO.map((i) => i.capitulo))]
);

export function catalogoPresupuestoPorCapitulo(capitulo = '') {
  const cap = String(capitulo || '').trim();
  if (!cap) return BASE_PRECIOS_PRESUPUESTO;
  return BASE_PRECIOS_PRESUPUESTO.filter((i) => i.capitulo === cap);
}

export function buscarItemBasePrecios(id) {
  return BASE_PRECIOS_PRESUPUESTO.find((i) => i.id === id) || null;
}
`;

fs.writeFileSync(outJs, header, 'utf8');
console.log('OK items=', items.length);
console.log('JS =', outJs);
console.log('Excel =', publicExcel);
console.log('Hoja =', sheetName);
