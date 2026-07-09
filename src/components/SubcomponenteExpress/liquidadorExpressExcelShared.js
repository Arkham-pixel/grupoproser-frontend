import zurichLogoExcelUrl from '../../assets/zurich-logo-excel.png';
import zurichBannerExcelUrl from '../../assets/zurich-banner-excel.png';

export const AZUL_ZURICH = 'FF002060';
export const AZUL_BORDE = 'FF0070C0';
export const CELESTE_DOL = 'FF00B0F0';
export const BLANCO = 'FFFFFFFF';
export const NEGRO = 'FF000000';

export const bordeFinoNegro = {
  top: { style: 'thin', color: { argb: NEGRO } },
  left: { style: 'thin', color: { argb: NEGRO } },
  bottom: { style: 'thin', color: { argb: NEGRO } },
  right: { style: 'thin', color: { argb: NEGRO } },
};

export const bordeAzul = {
  top: { style: 'thin', color: { argb: AZUL_BORDE } },
  left: { style: 'thin', color: { argb: AZUL_BORDE } },
  bottom: { style: 'thin', color: { argb: AZUL_BORDE } },
  right: { style: 'thin', color: { argb: AZUL_BORDE } },
};

export const bordeMedioNegro = {
  top: { style: 'medium', color: { argb: NEGRO } },
  left: { style: 'medium', color: { argb: NEGRO } },
  bottom: { style: 'medium', color: { argb: NEGRO } },
  right: { style: 'medium', color: { argb: NEGRO } },
};

export const estiloTituloZurich = {
  font: { name: 'Calibri', size: 18, bold: true, color: { argb: AZUL_ZURICH } },
  alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
};

export const estiloEncabezadoAzul = {
  font: { name: 'Arial', size: 11, bold: true, color: { argb: BLANCO } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_ZURICH } },
  alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  border: bordeMedioNegro,
};

export const estiloLabelCampo = {
  font: { name: 'Arial', size: 11, bold: true, color: { argb: NEGRO } },
  alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
  border: bordeFinoNegro,
};

export const estiloValorCampo = {
  font: { name: 'Arial', size: 11, color: { argb: NEGRO } },
  alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  border: bordeFinoNegro,
};

export const estiloCeldaTabla = {
  font: { name: 'Arial', size: 10, color: { argb: NEGRO } },
  alignment: { vertical: 'top', wrapText: true },
  border: bordeAzul,
};

export const estiloMonto = {
  ...estiloCeldaTabla,
  alignment: { horizontal: 'right', vertical: 'center' },
  numFmt: '#,##0',
};

export const estiloTotalAzul = {
  font: { name: 'Arial', size: 11, bold: true, color: { argb: BLANCO } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_ZURICH } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: bordeMedioNegro,
};

export const estiloTotalMonto = {
  ...estiloTotalAzul,
  alignment: { horizontal: 'right', vertical: 'center' },
  numFmt: '#,##0',
};

export const estiloBannerSeccion = {
  font: { name: 'Calibri', size: 14, bold: true, color: { argb: BLANCO } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_ZURICH } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: bordeFinoNegro,
};

export const estiloLabelChecklist = {
  font: { name: 'Arial', size: 10, bold: true, color: { argb: NEGRO } },
  alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  border: bordeFinoNegro,
};

export const estiloValorChecklist = {
  font: { name: 'Arial', size: 10, color: { argb: NEGRO } },
  alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  border: bordeFinoNegro,
};

export const estiloDol = {
  ...estiloValorChecklist,
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: CELESTE_DOL } },
};

let logoCache = null;
let bannerCache = null;

async function cargarImagen(url, cacheKey) {
  if (cacheKey === 'logo' && logoCache) return logoCache;
  if (cacheKey === 'banner' && bannerCache) return bannerCache;
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  if (cacheKey === 'logo') logoCache = buffer;
  if (cacheKey === 'banner') bannerCache = buffer;
  return buffer;
}

export async function insertarLogoZurich(workbook, sheet, { col = 6, row = 0, width = 130, height = 84 } = {}) {
  try {
    const buffer = await cargarImagen(zurichLogoExcelUrl, 'logo');
    const imageId = workbook.addImage({ buffer, extension: 'png' });
    sheet.addImage(imageId, {
      tl: { col, row },
      ext: { width, height },
    });
  } catch (error) {
    console.warn('[Liquidador Excel] No se pudo cargar logo Zurich:', error);
  }
}

export async function insertarBannerZurich(workbook, sheet, { col = 5, row = 0, width = 226, height = 63 } = {}) {
  try {
    const buffer = await cargarImagen(zurichBannerExcelUrl, 'banner');
    const imageId = workbook.addImage({ buffer, extension: 'png' });
    sheet.addImage(imageId, {
      tl: { col, row },
      ext: { width, height },
    });
  } catch (error) {
    console.warn('[Liquidador Excel] No se pudo cargar banner Zurich:', error);
  }
}

export function aplicarRango(sheet, ref, value, style) {
  const cell = sheet.getCell(ref);
  cell.value = value ?? '';
  if (style) cell.style = style;
  return cell;
}

export function mergeConEstilo(sheet, ref, value, style) {
  sheet.mergeCells(ref);
  const cell = sheet.getCell(ref.split(':')[0]);
  cell.value = value ?? '';
  if (style) cell.style = style;
}

export function fechaExcel(valor) {
  if (!valor) return '';
  const d = new Date(`${valor}T12:00:00`);
  if (Number.isNaN(d.getTime())) return valor;
  return d;
}

export function fechaExcelTexto(valor) {
  if (!valor) return '';
  const d = new Date(`${valor}T12:00:00`);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleDateString('es-CO');
}

export function marcarSiNoExcel(valor) {
  return valor === 'SI' ? 'SI' : 'NO';
}
