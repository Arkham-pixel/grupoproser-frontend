import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  calcularLiquidacionFdm,
  montoALetrasFdm,
  parsearNumero,
} from './liquidadorEquidadFdmHelpers.js';

const PLANTILLA_URL = `${import.meta.env.BASE_URL}templates/ModeloLiquidacion_FDM.xlsx`;

const FILA_INI_ITEMS = 18;
const FILA_FIN_ITEMS = 27;
const MAX_ITEMS = FILA_FIN_ITEMS - FILA_INI_ITEMS + 1;

function setCell(sheet, ref, value) {
  const cell = sheet.getCell(ref);
  cell.value = value === undefined || value === null || value === '' ? null : value;
  return cell;
}

function setDateCell(sheet, ref, isoDate) {
  if (!isoDate) {
    setCell(sheet, ref, null);
    return;
  }
  const d = new Date(`${String(isoDate).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    setCell(sheet, ref, String(isoDate));
    return;
  }
  const cell = sheet.getCell(ref);
  cell.value = d;
  if (!cell.numFmt || cell.numFmt === 'General') {
    cell.numFmt = 'dd/mm/yyyy';
  }
}

function setFormulaResult(sheet, ref, formula, result) {
  const cell = sheet.getCell(ref);
  cell.value = { formula, result: result ?? null };
}

function limpiarItems(sheet) {
  for (let row = FILA_INI_ITEMS; row <= FILA_FIN_ITEMS; row += 1) {
    setCell(sheet, `D${row}`, null);
    setCell(sheet, `N${row}`, null);
    setCell(sheet, `U${row}`, null);
    setCell(sheet, `AE${row}`, null);
  }
}

function rellenarItems(sheet, colItem, colValor, items) {
  (items || []).slice(0, MAX_ITEMS).forEach((item, idx) => {
    const row = FILA_INI_ITEMS + idx;
    setCell(sheet, `${colItem}${row}`, item.item || null);
    const monto = parsearNumero(item.valor);
    setCell(sheet, `${colValor}${row}`, monto || null);
  });
}

/** Rellena hoja Liquidador preservando estilos y fórmulas de totales. */
function rellenarLiquidador(sheet, liquidador, totales) {
  const enc = liquidador.encabezado || {};
  const ded = liquidador.deducible || {};

  setCell(sheet, 'G8', enc.tomador || 'FUNDACION DE LA MUJER');
  setCell(sheet, 'G9', enc.asegurado || null);
  setCell(sheet, 'G10', enc.poliza || null);
  setCell(sheet, 'G11', enc.orden || null);
  setCell(sheet, 'G12', enc.siniestro || null);

  setDateCell(sheet, 'X8', enc.fechaSiniestro);
  setCell(sheet, 'X9', enc.direccion || null);
  setCell(sheet, 'X10', enc.evento || 'ANEGACION');
  const cedulaNum = String(enc.cedula || '').replace(/\D/g, '');
  setCell(sheet, 'X11', cedulaNum ? Number(cedulaNum) || cedulaNum : null);
  setCell(sheet, 'X12', enc.ramo || 'microseguros daños basico empresa');

  limpiarItems(sheet);
  rellenarItems(sheet, 'D', 'N', liquidador.contenidos);
  rellenarItems(sheet, 'U', 'AE', liquidador.edificios);

  setCell(sheet, 'H33', totales.subsidio || 0);
  setCell(sheet, 'F34', ded.anioSMMLV || new Date().getFullYear());
  setCell(sheet, 'F35', totales.cantidadSMMLV ?? ded.cantidadSMMLV ?? 0.75);
  setCell(sheet, 'F36', (totales.porcentaje ?? ded.porcentaje ?? 10) / 100);

  // Fórmulas originales + resultado precargado (Excel recalcula al abrir)
  setFormulaResult(sheet, 'H34', '_xlfn.XLOOKUP(F34,Bases!B:B,Bases!C:C)', totales.valorSMMLV);
  setFormulaResult(sheet, 'H35', '(H34*F35)', totales.deducibleSMMLV);
  setFormulaResult(sheet, 'H36', '(AE30*F36)', totales.deduciblePorcentaje);

  setFormulaResult(sheet, 'N28', 'SUM(N18:Q27)', totales.subtotalContenidos);
  setFormulaResult(sheet, 'AE28', 'SUM(AE18:AH27)', totales.subtotalEdificios);
  setFormulaResult(sheet, 'AE30', 'SUM(N28+AE28)', totales.totalPerdida);
  setFormulaResult(sheet, 'AE31', 'MAX(F35*H34,AE30*0.1)', totales.deducibleAplicado);
  setFormulaResult(
    sheet,
    'AE32',
    'IF(AE30+AE31<0,0,AE30-AE31)',
    totales.totalAntesSubsidio
  );
  setFormulaResult(sheet, 'AE33', '+H33', totales.subsidio);
  setFormulaResult(sheet, 'AE34', 'SUM(AE33+AE32)', totales.totalIndemnizar);

  // Letras: en el .xlsm usa macro VBA; aquí dejamos el texto calculado
  const letras = montoALetrasFdm(totales.totalIndemnizar);
  setCell(sheet, 'T35', letras);

  if (enc.fechaImpreso) {
    setDateCell(sheet, 'AA38', enc.fechaImpreso);
  }
}

/** Actualiza resultados de CxW (fórmulas que apuntan a Liquidador). */
function refrescarCxW(sheet, liquidador, totales) {
  const enc = liquidador.encabezado || {};
  const letras = montoALetrasFdm(totales.totalIndemnizar);

  setCell(sheet, 'A2', enc.tomador || 'FUNDACION DE LA MUJER');
  setCell(sheet, 'B2', enc.asegurado || null);
  setCell(sheet, 'C2', enc.poliza || null);
  setCell(sheet, 'D2', enc.siniestro || null);
  setCell(sheet, 'E2', enc.orden || null);
  setCell(sheet, 'F2', enc.evento || null);
  const cedulaNum = String(enc.cedula || '').replace(/\D/g, '');
  setCell(sheet, 'G2', cedulaNum ? Number(cedulaNum) || cedulaNum : null);
  setCell(sheet, 'H2', enc.ramo || null);
  setDateCell(sheet, 'I2', enc.fechaSiniestro);
  setCell(sheet, 'J2', enc.direccion || null);
  setCell(sheet, 'K2', totales.totalPerdida || null);
  setCell(sheet, 'L2', totales.cantidadSMMLV ?? 0.75);
  setCell(sheet, 'M2', -(totales.deducibleAplicado || 0));
  setCell(sheet, 'N2', totales.totalAntesSubsidio || null);
  setCell(sheet, 'O2', totales.subsidio || 0);
  setCell(sheet, 'P2', totales.totalIndemnizar || null);
  setCell(sheet, 'Q2', letras);
  setDateCell(sheet, 'R2', enc.fechaImpreso || new Date().toISOString().slice(0, 10));
}

async function cargarPlantillaWorkbook() {
  const response = await fetch(PLANTILLA_URL);
  if (!response.ok) {
    throw new Error(
      `No se pudo cargar la plantilla ModeloLiquidación (${response.status}). Verifique public/templates/ModeloLiquidacion_FDM.xlsx`
    );
  }
  const buffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

/**
 * Genera el Excel del modelo de liquidación FDM (mismo layout que ModeloLiquidación2024).
 */
export async function generarLiquidadorFdmExcelBlob(liquidador, totalesParam) {
  const totales = totalesParam || calcularLiquidacionFdm(liquidador);
  const workbook = await cargarPlantillaWorkbook();

  const hojaLiq = workbook.getWorksheet('Liquidador') || workbook.worksheets[0];
  const hojaCxW = workbook.getWorksheet('CxW');

  if (hojaLiq) rellenarLiquidador(hojaLiq, liquidador, totales);
  if (hojaCxW) refrescarCxW(hojaCxW, liquidador, totales);

  workbook.creator = 'Arnald DataFlow';
  workbook.modified = new Date();

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const safe = String(liquidador?.encabezado?.asegurado || 'liquidador')
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, '_')
    .slice(0, 60);

  return {
    blob,
    nombre: `ModeloLiquidacion_FDM_${safe}.xlsx`,
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

export async function descargarLiquidadorFdmExcel(liquidador, totales) {
  const { blob, nombre } = await generarLiquidadorFdmExcelBlob(liquidador, totales);
  saveAs(blob, nombre);
}
