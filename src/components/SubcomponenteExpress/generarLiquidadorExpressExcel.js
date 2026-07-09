import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  DOCUMENTOS_SOPORTE,
  NOTAS_SALVAMENTO,
  parsearNumero,
  pctDocumentosMarcados,
  totalesItemsAnalisis,
} from './liquidadorExpressHelpers.js';
import {
  aplicarRango,
  AZUL_ZURICH,
  bordeFinoNegro,
  bordeMedioNegro,
  estiloBannerSeccion,
  estiloCeldaTabla,
  estiloDol,
  estiloEncabezadoAzul,
  estiloLabelCampo,
  estiloLabelChecklist,
  estiloMonto,
  estiloTituloZurich,
  estiloTotalAzul,
  estiloTotalMonto,
  estiloValorCampo,
  estiloValorChecklist,
  fechaExcel,
  fechaExcelTexto,
  insertarBannerZurich,
  insertarLogoZurich,
  marcarSiNoExcel,
  mergeConEstilo,
} from './liquidadorExpressExcelShared.js';

const FILAS_CONCEPTO = 12;
const FILA_INICIO_CONCEPTOS = 14;

function configurarColumnasLiquidacion(sheet) {
  sheet.getColumn(1).width = 20;
  sheet.getColumn(2).width = 30;
  sheet.getColumn(3).width = 29;
  sheet.getColumn(4).width = 25;
  sheet.getColumn(6).width = 17;
  sheet.getColumn(7).width = 18;
  sheet.getColumn(8).width = 27;
}

function textoDeducible(liquidador, totales) {
  const texto = liquidador.encabezado?.deducibleTexto?.trim();
  if (texto) return texto;
  return `${totales.porcentaje}% del Valor de la Pérdida Mínimo ${totales.cantidadSMMLV} SMMLV`;
}

async function buildHojaLiquidacion(workbook, liquidador, totales) {
  const sheet = workbook.addWorksheet('FORMATO_LIQUIDACION', {
    views: [{ showGridLines: true }],
  });
  configurarColumnasLiquidacion(sheet);

  sheet.getRow(1).height = 22;
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 22;
  mergeConEstilo(sheet, 'A1:G3', 'LIQUIDACION FINAL', estiloTituloZurich);
  await insertarLogoZurich(workbook, sheet, { col: 6.2, row: 0.2, width: 124, height: 80 });

  const enc = liquidador.encabezado || {};
  const campos = [
    ['Reclamo', enc.reclamo],
    ['ZC', enc.zc],
    ['Asegurado', enc.asegurado],
    ['NIT / CC', enc.nit],
    ['Poliza No', enc.poliza],
    ['Fecha de Siniestro', fechaExcel(enc.fechaSiniestro)],
    ['Cobertura', enc.cobertura],
    ['Deducible', textoDeducible(liquidador, totales)],
  ];

  campos.forEach(([label, valor], idx) => {
    const row = 4 + idx;
    aplicarRango(sheet, `A${row}`, label, estiloLabelCampo);
    const cellValor = sheet.getCell(`B${row}`);
    cellValor.value = valor ?? '';
    cellValor.style = estiloValorCampo;
    if (label === 'Fecha de Siniestro' && valor instanceof Date) {
      cellValor.numFmt = 'd" de "mmmm" de "yyyy';
    }
    sheet.mergeCells(`B${row}:G${row}`);
  });

  sheet.getRow(12).height = 16;
  ['A12', 'B12', 'C12', 'D12', 'E12', 'F12', 'G12', 'H12'].forEach((ref) => {
    sheet.getCell(ref).style = { border: { bottom: { style: 'medium', color: { argb: 'FF000000' } } } };
  });

  mergeConEstilo(sheet, 'A13:A13', 'CONCEPTO', estiloEncabezadoAzul);
  mergeConEstilo(sheet, 'B13:G13', 'DETALLE', estiloEncabezadoAzul);
  mergeConEstilo(sheet, 'H13:H13', 'VALOR', estiloEncabezadoAzul);

  const conceptos = [...(liquidador.conceptos || [])];
  while (conceptos.length < 3) {
    conceptos.push({ concepto: '', detalle: '', valor: '' });
  }
  const conceptosHoja = conceptos.slice(0, FILAS_CONCEPTO);
  while (conceptosHoja.length < FILAS_CONCEPTO) {
    conceptosHoja.push({ concepto: '', detalle: '', valor: '' });
  }

  conceptosHoja.forEach((item, idx) => {
    const row = FILA_INICIO_CONCEPTOS + idx;
    aplicarRango(sheet, `A${row}`, item.concepto || '', estiloCeldaTabla);
    mergeConEstilo(sheet, `B${row}:G${row}`, item.detalle || '', estiloCeldaTabla);
    const cellMonto = sheet.getCell(`H${row}`);
    const monto = parsearNumero(item.valor);
    cellMonto.value = monto || null;
    cellMonto.style = estiloMonto;
  });

  sheet.getRow(25).height = 16;
  ['A25', 'B25', 'C25', 'D25', 'E25', 'F25', 'G25', 'H25'].forEach((ref) => {
    sheet.getCell(ref).style = { border: { bottom: { style: 'medium', color: { argb: 'FF000000' } } } };
  });

  mergeConEstilo(sheet, 'A26:G26', 'TOTAL PERDIDA', estiloTotalAzul);
  const cellTotalPerdida = sheet.getCell('H26');
  cellTotalPerdida.value = totales.totalPerdida;
  cellTotalPerdida.style = estiloTotalMonto;

  mergeConEstilo(sheet, 'A27:A27', 'DEDUCIBLE', estiloTotalAzul);
  const cellTextoDed = sheet.getCell('B27');
  cellTextoDed.value = textoDeducible(liquidador, totales);
  cellTextoDed.style = { ...estiloValorCampo, font: { name: 'Arial', size: 10, underline: true } };
  sheet.getCell('C27').value = totales.porcentaje / 100;
  sheet.getCell('C27').style = { ...estiloMonto, numFmt: '0.0%' };
  sheet.getCell('D27').value = totales.deduciblePorcentaje;
  sheet.getCell('D27').style = estiloMonto;
  sheet.getCell('E27').value = 'VALOR';
  sheet.getCell('E27').style = estiloEncabezadoAzul;
  sheet.getCell('F27').value = totales.cantidadSMMLV;
  sheet.getCell('F27').style = estiloMonto;
  sheet.getCell('G27').value = totales.deducibleSMMLV;
  sheet.getCell('G27').style = estiloMonto;
  const cellDedAplicado = sheet.getCell('H27');
  cellDedAplicado.value = totales.deducibleAplicado;
  cellDedAplicado.style = estiloTotalMonto;

  mergeConEstilo(sheet, 'A28:G28', 'TOTAL INDEMNIZACION', estiloTotalAzul);
  const cellIndemnizar = sheet.getCell('H28');
  cellIndemnizar.value = totales.totalIndemnizar;
  cellIndemnizar.style = estiloTotalMonto;

  aplicarRango(sheet, 'B30', 'MONEDA', estiloLabelCampo);
  aplicarRango(sheet, 'D30', 'COP', estiloValorCampo);
  aplicarRango(sheet, 'E30', 'TRM', estiloLabelCampo);

  aplicarRango(sheet, 'A37', 'ELABORADO POR:', {
    font: { name: 'Arial', size: 10, color: { argb: 'FF000000' } },
  });
}

function configurarColumnasChecklist(sheet) {
  sheet.getColumn(1).width = 4;
  sheet.getColumn(2).width = 7;
  sheet.getColumn(3).width = 30;
  sheet.getColumn(4).width = 21;
  sheet.getColumn(5).width = 22;
  sheet.getColumn(6).width = 39;
  sheet.getColumn(7).width = 19;
}

async function buildHojaChecklist(workbook, liquidador, totales) {
  const sheet = workbook.addWorksheet('FORMATO-CHECK-LIST');
  configurarColumnasChecklist(sheet);

  const enc = liquidador.encabezado || {};
  const chk = liquidador.checklist || {};
  const pct = pctDocumentosMarcados(chk.documentos);
  const items = chk.itemsAnalisis || [];
  const { totalReclamado, totalAjustado } = totalesItemsAnalisis(items);

  mergeConEstilo(sheet, 'B2:E5', 'FORMATO ÚNICO ATENCIÓN DE RECLAMOS EXPRESS\nPROPERTY', {
    font: { name: 'Calibri', size: 12, bold: true, color: { argb: AZUL_ZURICH } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: bordeFinoNegro,
  });
  await insertarBannerZurich(workbook, sheet, { col: 5.1, row: 0.3 });

  mergeConEstilo(sheet, 'B7:F7', 'INFORMACIÓN GENERAL DEL RECLAMO', estiloBannerSeccion);

  const filasInfo = [
    ['Fecha:', fechaExcelTexto(chk.fecha || new Date().toISOString().slice(0, 10))],
    ['ZC:', enc.zc],
    ['STRO:', enc.reclamo],
    ['Tipo de producto:', chk.tipoProducto || 'TRDM'],
    ['Número de póliza:', enc.poliza],
    ['Asegurado:', enc.asegurado],
    [
      'Vigencia de la poliza:',
      chk.vigenciaDesde || chk.vigenciaHasta
        ? `${fechaExcelTexto(chk.vigenciaDesde)} al ${fechaExcelTexto(chk.vigenciaHasta)}`
        : '',
    ],
    ['D.O.L:', fechaExcelTexto(enc.fechaSiniestro)],
    ['Riesgo asegurado:', chk.riesgoAsegurado || enc.asegurado],
    ['Cobertura afectada:', chk.coberturaAfectada || enc.cobertura || chk.tipoPerdida],
    ['Garantias:', chk.garantias],
    ['Exclusiones:', chk.exclusiones],
    ['Objeción:', chk.objecion],
    ['Tipo de pérdida:', chk.tipoPerdida],
    ['Aplica demérito:', chk.aplicaDemerito],
    ['Limite o valor asegurado:', chk.limiteAsegurado],
    ['Pérdida ajustada:', totales.totalPerdida],
    ['Deducible:', totales.deducibleAplicado],
    ['Valor a indemnizar:', totales.totalIndemnizar],
    [
      'Salvamento:',
      chk.salvamento === 'Aplica' && chk.salvamentoDetalle
        ? `${chk.salvamento} | ${chk.salvamentoDetalle}`
        : chk.salvamento,
    ],
    ['Recobro:', chk.recobro],
    ['Indicadores de fraude:', chk.indicadoresFraude],
  ];

  filasInfo.forEach(([label, valor], idx) => {
    const row = 9 + idx;
    aplicarRango(sheet, `C${row}`, label, estiloLabelChecklist);
    const estiloValor = label === 'D.O.L:' ? estiloDol : estiloValorChecklist;
    if (['Pérdida ajustada:', 'Deducible:', 'Valor a indemnizar:'].includes(label)) {
      mergeConEstilo(sheet, `E${row}:F${row}`, typeof valor === 'number' ? valor : parsearNumero(valor), {
        ...estiloValor,
        numFmt: '#,##0',
        alignment: { horizontal: 'right', vertical: 'center' },
      });
    } else {
      mergeConEstilo(sheet, `D${row}:F${row}`, valor ?? '', estiloValor);
    }
  });

  mergeConEstilo(sheet, 'C32:F32', 'Breve descripción del evento:', estiloLabelChecklist);
  mergeConEstilo(sheet, 'C33:F33', chk.descripcionEvento || '', estiloValorChecklist);
  mergeConEstilo(sheet, 'C34:F34', `Ajustador - ${chk.ajustador || '—'}`, estiloValorChecklist);

  mergeConEstilo(sheet, 'B36:F36', 'DOCUMENTOS DE SOPORTE', estiloBannerSeccion);

  DOCUMENTOS_SOPORTE.forEach((doc, idx) => {
    const row = 38 + idx;
    mergeConEstilo(sheet, `C${row}:D${row}`, doc, estiloValorChecklist);
    aplicarRango(sheet, `E${row}`, chk.documentos?.[idx] ? 'Aplica' : '', estiloValorChecklist);
    aplicarRango(sheet, `F${row}`, chk.documentos?.[idx] ? 1 : 0, {
      ...estiloValorChecklist,
      alignment: { horizontal: 'center', vertical: 'center' },
    });
  });

  const rowPct = 38 + DOCUMENTOS_SOPORTE.length + 1;
  mergeConEstilo(sheet, `C${rowPct}:D${rowPct}`, 'Porcentaje de tareas finalizadas', estiloLabelChecklist);
  mergeConEstilo(sheet, `E${rowPct}:F${rowPct}`, `${pct}%`, estiloValorChecklist);
  mergeConEstilo(sheet, `C${rowPct + 2}:D${rowPct + 2}`, '¿el reclamo está formalizado?', estiloLabelChecklist);
  mergeConEstilo(sheet, `E${rowPct + 2}:F${rowPct + 2}`, chk.reclamoFormalizado || 'No', estiloValorChecklist);
  mergeConEstilo(sheet, `C${rowPct + 3}:D${rowPct + 3}`, 'Fecha formalización:', estiloLabelChecklist);
  mergeConEstilo(sheet, `E${rowPct + 3}:F${rowPct + 3}`, fechaExcelTexto(chk.fechaFormalizacion), estiloValorChecklist);

  const rowAnalisis = rowPct + 5;
  mergeConEstilo(sheet, `B${rowAnalisis}:F${rowAnalisis}`, 'ANÁLISIS DE LA PÉRDIDA', estiloBannerSeccion);

  const headerRow = rowAnalisis + 3;
  aplicarRango(sheet, `B${headerRow}`, 'ITEM', estiloEncabezadoAzul);
  aplicarRango(sheet, `C${headerRow}`, 'DESCRIPCIÓN', estiloEncabezadoAzul);
  aplicarRango(sheet, `D${headerRow}`, 'V/R TOTAL (RECLAMADO)', estiloEncabezadoAzul);
  aplicarRango(sheet, `E${headerRow}`, 'V/R TOTAL (AJUSTADO)', estiloEncabezadoAzul);
  aplicarRango(sheet, `F${headerRow}`, 'OBSERVACIÓN', estiloEncabezadoAzul);

  const filasItems = items.length ? items : [{ descripcion: '', reclamado: '', ajustado: '', observacion: '' }];
  filasItems.forEach((item, idx) => {
    const row = headerRow + 1 + idx;
    aplicarRango(sheet, `B${row}`, idx + 1, estiloCeldaTabla);
    aplicarRango(sheet, `C${row}`, item.descripcion || '', estiloCeldaTabla);
    const cellRec = sheet.getCell(`D${row}`);
    cellRec.value = parsearNumero(item.reclamado) || null;
    cellRec.style = estiloMonto;
    const cellAj = sheet.getCell(`E${row}`);
    cellAj.value = parsearNumero(item.ajustado) || null;
    cellAj.style = estiloMonto;
    aplicarRango(sheet, `F${row}`, item.observacion || '', estiloCeldaTabla);
  });

  const rowTotales = headerRow + 1 + filasItems.length;
  aplicarRango(sheet, `B${rowTotales}`, 'Totales', { ...estiloCeldaTabla, font: { bold: true } });
  const cellTotRec = sheet.getCell(`D${rowTotales}`);
  cellTotRec.value = totalReclamado;
  cellTotRec.style = { ...estiloMonto, font: { bold: true } };
  const cellTotAj = sheet.getCell(`E${rowTotales}`);
  cellTotAj.value = totalAjustado;
  cellTotAj.style = { ...estiloMonto, font: { bold: true } };

  const rowComentarios = rowTotales + 2;
  mergeConEstilo(sheet, `B${rowComentarios}:F${rowComentarios}`, 'COMENTARIOS ADICIONALES', estiloBannerSeccion);
  mergeConEstilo(sheet, `B${rowComentarios + 2}:F${rowComentarios + 4}`, chk.comentariosAdicionales || 'Para este caso no aplica', estiloValorChecklist);
  mergeConEstilo(sheet, `C${rowComentarios + 8}:F${rowComentarios + 8}`, `Ajustador - ${chk.ajustador || '—'}`, estiloValorChecklist);
}

function configurarColumnasSalvamento(sheet) {
  for (let i = 1; i <= 28; i += 1) {
    sheet.getColumn(i).width = i <= 6 ? 6 : 8;
  }
  sheet.getColumn(20).width = 15;
}

async function buildHojaSalvamento(workbook, liquidador) {
  const sheet = workbook.addWorksheet('SALVAMENTO');
  configurarColumnasSalvamento(sheet);

  const enc = liquidador.encabezado || {};
  const sal = liquidador.salvamento || {};

  mergeConEstilo(sheet, 'F1:AA4', 'Formato Salvamentos', {
    font: { name: 'Calibri', size: 16, bold: true, color: { argb: AZUL_ZURICH } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: bordeMedioNegro,
  });
  await insertarLogoZurich(workbook, sheet, { col: 1.1, row: 0.2, width: 118, height: 36 });

  const filasEnc = [
    ['Poliza', enc.poliza],
    ['Reclamo', enc.reclamo],
    ['Sub-tarea', sal.subTarea || 'SALVAMENTO'],
    ['Asegurado', enc.asegurado],
  ];
  filasEnc.forEach(([label, valor], idx) => {
    const row = 6 + idx * 2;
    mergeConEstilo(sheet, `B${row}:E${row}`, label, estiloLabelCampo);
    mergeConEstilo(sheet, `H${row}:V${row}`, valor ?? '', estiloValorCampo);
  });

  mergeConEstilo(sheet, 'C14:X15', 'Informacion de Salvamento', estiloBannerSeccion);

  const filasSal = [
    ['Descripcion Salvamento', sal.descripcion],
    ['Cantidad (unidades)', sal.cantidad],
    ['Marca salvamento', sal.marca || 'N/D'],
    ['Serial salvamento', sal.serial || 'N/D'],
    ['Especificacion del daño y estado actual del salvamento', sal.especificacionDano],
    ['Ubicación                     (Direccion y ciudad)', sal.ubicacion],
    ['Contacto persona quien entrega', sal.contactoEntrega],
  ];

  let row = 17;
  filasSal.forEach(([label, valor]) => {
    mergeConEstilo(sheet, `C${row}:F${row}`, label, estiloLabelChecklist);
    mergeConEstilo(sheet, `J${row}:T${row + (label.includes('Especificacion') ? 1 : 0)}`, valor ?? '', estiloValorChecklist);
    row += label.includes('Especificacion') ? 3 : 2;
  });

  const filaSiNo = (rowNum, label, valor, montoValor, monto) => {
    mergeConEstilo(sheet, `C${rowNum}:F${rowNum + 1}`, label, estiloLabelChecklist);
    aplicarRango(sheet, `J${rowNum}`, marcarSiNoExcel(valor), estiloValorChecklist);
    aplicarRango(sheet, `N${rowNum}`, marcarSiNoExcel(valor === 'SI' ? 'NO' : 'SI'), estiloValorChecklist);
    if (montoValor) {
      aplicarRango(sheet, `R${rowNum}`, 'Valor', estiloLabelChecklist);
      aplicarRango(sheet, `T${rowNum}`, parsearNumero(monto) || 0, estiloMonto);
    }
  };

  filaSiNo(35, 'Salvamento nacionalizado', sal.nacionalizado);
  filaSiNo(38, 'Genera costos por custodia', sal.generaCustodia, true, sal.valorCustodia);
  filaSiNo(41, 'Registro fotografico', sal.registroFotografico);
  filaSiNo(44, 'Indemnizado', sal.indemnizado, true, sal.valorIndemnizado);
  filaSiNo(46, 'Se solicito oferta Non Cash', sal.ofertaNonCash, true, sal.valorNonCash);

  mergeConEstilo(sheet, 'C48:F49', 'Comentarios salvamento', estiloLabelChecklist);
  mergeConEstilo(sheet, 'J48:T49', sal.comentarios || '', estiloValorChecklist);

  mergeConEstilo(sheet, 'B52:U52', 'NOTAS:', estiloBannerSeccion);
  NOTAS_SALVAMENTO.forEach((nota, idx) => {
    const startRow = 53 + idx * 2;
    mergeConEstilo(sheet, `B${startRow}:V${startRow + 1}`, `${idx + 1}. ${nota}`, estiloValorChecklist);
  });
}

/**
 * Genera y descarga el libro Excel del Liquidador (3 hojas como Liquidador.xlsm).
 */
export async function descargarLiquidadorExpressExcel(liquidador, totales) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Arnald DataFlow';
  workbook.created = new Date();

  await buildHojaLiquidacion(workbook, liquidador, totales);
  await buildHojaChecklist(workbook, liquidador, totales);
  await buildHojaSalvamento(workbook, liquidador);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const reclamo = String(liquidador?.encabezado?.reclamo || 'liquidador').replace(/[^a-zA-Z0-9_-]/g, '_');
  saveAs(blob, `Liquidador_Express_${reclamo}.xlsx`);
}
