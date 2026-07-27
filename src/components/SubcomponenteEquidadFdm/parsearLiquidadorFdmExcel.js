import * as XLSX from 'xlsx';
import {
  construirLiquidadorDesdeCxW,
  crearItem,
  excelDateToInput,
  hoyInput,
  limpiarTexto,
  parsearNumero,
  SMMLV_POR_ANIO,
  SMMLV_DEFAULT,
  DEFAULT_LIQUIDADOR_FDM,
} from './liquidadorEquidadFdmHelpers.js';

function cellValue(ws, r, c) {
  const addr = XLSX.utils.encode_cell({ r, c });
  const cell = ws[addr];
  return cell?.v ?? null;
}

function leerItemsColumna(ws, rowStart, rowEnd, colItem, colValor) {
  const items = [];
  for (let r = rowStart; r <= rowEnd; r += 1) {
    const item = limpiarTexto(cellValue(ws, r, colItem));
    const valor = parsearNumero(cellValue(ws, r, colValor));
    if (!item && !valor) continue;
    if (!item && valor === 0) continue;
    items.push(crearItem(item || `Ítem ${items.length + 1}`, valor || ''));
  }
  return items;
}

function parsearHojaLiquidador(ws) {
  const contenidos = leerItemsColumna(ws, 17, 26, 3, 13); // D / N
  const edificios = leerItemsColumna(ws, 17, 26, 20, 30); // U / AE

  const anio = parsearNumero(cellValue(ws, 33, 5)) || new Date().getFullYear();
  const valorSMMLV =
    parsearNumero(cellValue(ws, 33, 7)) || SMMLV_POR_ANIO[anio] || SMMLV_DEFAULT;
  const cantidadSMMLV = parsearNumero(cellValue(ws, 34, 5)) || 0.75;
  const porcentaje = (parsearNumero(cellValue(ws, 35, 5)) || 0.1) * 100;

  return {
    ...DEFAULT_LIQUIDADOR_FDM,
    encabezado: {
      ...DEFAULT_LIQUIDADOR_FDM.encabezado,
      tomador: limpiarTexto(cellValue(ws, 7, 6)) || 'FUNDACION DE LA MUJER',
      asegurado: limpiarTexto(cellValue(ws, 8, 6)),
      poliza: limpiarTexto(cellValue(ws, 9, 6)),
      orden: limpiarTexto(cellValue(ws, 10, 6)),
      siniestro: limpiarTexto(cellValue(ws, 11, 6)),
      fechaSiniestro: excelDateToInput(cellValue(ws, 7, 23)),
      direccion: limpiarTexto(cellValue(ws, 8, 23)),
      evento: limpiarTexto(cellValue(ws, 9, 23)) || 'ANEGACION',
      cedula: limpiarTexto(cellValue(ws, 10, 23)).replace(/,/g, ''),
      ramo: limpiarTexto(cellValue(ws, 11, 23)) || DEFAULT_LIQUIDADOR_FDM.encabezado.ramo,
      agencia: 'Bucaramanga',
      fechaImpreso: excelDateToInput(cellValue(ws, 37, 26)) || hoyInput(),
      ciudadFirma: '',
    },
    contenidos,
    edificios,
    deducible: {
      anioSMMLV: anio,
      valorSMMLV,
      cantidadSMMLV,
      porcentaje: porcentaje || 10,
    },
    subsidio: Math.abs(parsearNumero(cellValue(ws, 32, 7))),
  };
}

/**
 * Lee un File (.xlsx / .xlsm) del ModeloLiquidación FDM y retorna el estado del liquidador.
 */
export async function parsearLiquidadorFdmExcel(file) {
  if (!file) throw new Error('Seleccione un archivo Excel.');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  const hojas = wb.SheetNames || [];
  if (!hojas.length) throw new Error('El Excel no tiene hojas.');

  const nombreCxW = hojas.find((n) => String(n).toUpperCase() === 'CXW');
  const nombreLiq = hojas.find((n) => String(n).toUpperCase().includes('LIQUID'));

  let items = { contenidos: [], edificios: [] };
  if (nombreLiq) {
    const desdeLiq = parsearHojaLiquidador(wb.Sheets[nombreLiq]);
    if (!nombreCxW) return desdeLiq;
    items = { contenidos: desdeLiq.contenidos, edificios: desdeLiq.edificios };
  }

  if (nombreCxW) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[nombreCxW], { defval: null, raw: true });
    if (!rows.length) {
      if (nombreLiq) return parsearHojaLiquidador(wb.Sheets[nombreLiq]);
      throw new Error('La hoja CxW está vacía.');
    }
    return construirLiquidadorDesdeCxW(rows[0], items);
  }

  if (nombreLiq) return parsearHojaLiquidador(wb.Sheets[nombreLiq]);

  // Intentar primera hoja como CxW
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[hojas[0]], { defval: null, raw: true });
  if (rows.length && (rows[0].ASEGURADO || rows[0].POLIZA || rows[0].TOMADOR)) {
    return construirLiquidadorDesdeCxW(rows[0], items);
  }

  throw new Error(
    'No se reconoció el formato. Use el ModeloLiquidación (hojas Liquidador / CxW).'
  );
}
