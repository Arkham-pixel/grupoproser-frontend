import { jsPDF } from 'jspdf';
import Logo from '../../img/Logo.png';
import { getImageUrlCandidates } from '../../utils/imageUtils';
import {
  PDF_CONTENT_W,
  PDF_MARGINS,
  PDF_PAGE,
  assetImportadoABase64,
  imagenInformeABase64,
} from '../../services/puertosCasoExportacionPdfHelpers';
import { META_FORMATO_RIICP004 } from './generarWordRiicp004';

const ROJO = [192, 0, 0];
const NEGRO = [20, 20, 20];
const GRIS = [80, 80, 80];
const FUENTE = 'times';
const MARGIN = PDF_MARGINS.left;
const CONTENT_W = PDF_CONTENT_W;
const LINE_H = 5;

async function logoDataUrl() {
  try {
    return await assetImportadoABase64(Logo);
  } catch {
    return null;
  }
}

async function imagenADataUrl(img) {
  if (!img) return null;
  try {
    if (typeof img === 'string' && img.startsWith('data:')) return img;
    if (img.file instanceof File) {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(img.file);
      });
    }
    const remota = await imagenInformeABase64(img);
    if (remota) return remota;
    const candidatos = getImageUrlCandidates(img);
    for (const src of candidatos) {
      if (String(src).startsWith('data:')) return src;
      try {
        const res = await fetch(src);
        if (!res.ok) continue;
        const blob = await res.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (dataUrl) return dataUrl;
      } catch {
        /* siguiente */
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function formatearFechaLarga(fechaStr) {
  if (!fechaStr) {
    return new Date().toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  try {
    const fecha = new Date(fechaStr.includes('T') ? fechaStr : `${fechaStr}T00:00:00`);
    return fecha.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return fechaStr;
  }
}

function formatearFechaArribo(fechaStr) {
  if (!fechaStr) return '';
  try {
    const fecha = new Date(fechaStr.includes('T') ? fechaStr : `${fechaStr}T00:00:00`);
    return `${fecha.getDate()} de ${fecha.toLocaleDateString('es-CO', { month: 'long' })} de ${fecha.getFullYear()}`;
  } catch {
    return fechaStr;
  }
}

function crearLayout(doc) {
  let y = PDF_MARGINS.top;
  const pageRef = { page: 1 };

  const asegurar = (alto = LINE_H) => {
    if (y + alto > PDF_PAGE.h - PDF_MARGINS.bottom) {
      doc.addPage();
      pageRef.page += 1;
      y = PDF_MARGINS.top;
      return true;
    }
    return false;
  };

  const texto = (str, opts = {}) => {
    const {
      bold = false,
      italic = false,
      size = 11,
      color = NEGRO,
      align = 'left',
      after = 3,
      maxW = CONTENT_W,
      x = MARGIN,
    } = opts;
    const style = bold ? 'bold' : italic ? 'italic' : 'normal';
    doc.setFont(FUENTE, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const limpio = String(str || '').replace(/\s+/g, ' ').trim();
    if (!limpio) {
      y += after;
      return;
    }
    const lineas = doc.splitTextToSize(limpio, maxW);
    lineas.forEach((ln) => {
      asegurar(LINE_H);
      if (align === 'center') {
        doc.text(ln, PDF_PAGE.w / 2, y, { align: 'center' });
      } else if (align === 'justify' && lineas.length) {
        doc.text(ln, x, y, { align: 'left', maxWidth: maxW });
      } else {
        doc.text(ln, x, y);
      }
      y += LINE_H;
    });
    y += Math.max(0, after - 1);
  };

  const seccionRoja = (titulo) => {
    asegurar(10);
    y += 4;
    doc.setFont(FUENTE, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...ROJO);
    doc.text(String(titulo || ''), MARGIN, y);
    y += 7;
  };

  const espacio = (mm = 4) => {
    y += mm;
  };

  return { getY: () => y, setY: (v) => { y = v; }, asegurar, texto, seccionRoja, espacio, pageRef };
}

async function pintarEncabezado(doc, layout, formData, logoUrl) {
  const asegurado = (formData.asegurado || formData.nombreCliente || 'ASEGURADO').toUpperCase();
  const patio = (formData.patioOperacion || formData.puertoDescargue || '').toUpperCase();
  const ciudad = (formData.municipio || 'Buenaventura').toUpperCase();
  const numeroPoliza = formData.numeroPoliza || '';

  const y0 = PDF_MARGINS.top;
  const colLogo = CONTENT_W * 0.28;
  const colTitulo = CONTENT_W * 0.44;
  const colMeta = CONTENT_W * 0.28;
  const alto = 22;

  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, y0, CONTENT_W, alto);

  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', MARGIN + 2, y0 + 2, 42, 16);
    } catch {
      /* sin logo */
    }
  }

  const xTitulo = MARGIN + colLogo;
  doc.setFont(FUENTE, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NEGRO);
  doc.text('Informe de inspección vehicular', xTitulo + colTitulo / 2, y0 + 7, {
    align: 'center',
    maxWidth: colTitulo - 4,
  });
  doc.setFontSize(9);
  const sub = `ASEGURADO ${asegurado} PATIO ${patio} ${ciudad}`.replace(/\s+/g, ' ').trim();
  doc.text(sub, xTitulo + colTitulo / 2, y0 + 12.5, {
    align: 'center',
    maxWidth: colTitulo - 4,
  });
  if (numeroPoliza) {
    doc.setFont(FUENTE, 'normal');
    doc.text(`No. ${numeroPoliza}`, xTitulo + colTitulo / 2, y0 + 17.5, { align: 'center' });
  }

  const xMeta = MARGIN + colLogo + colTitulo;
  doc.setFont(FUENTE, 'normal');
  doc.setFontSize(9);
  doc.text(`CODIGO: ${META_FORMATO_RIICP004.codigo}`, xMeta + 2, y0 + 7);
  doc.text(`Versión: ${META_FORMATO_RIICP004.version}`, xMeta + 2, y0 + 12);
  doc.text(`Fecha: ${META_FORMATO_RIICP004.fecha}`, xMeta + 2, y0 + 17);

  layout.setY(y0 + alto + 10);
}

function pintarTablaAverias(doc, layout, filas, locale) {
  if (!filas?.length) return;
  const colVin = CONTENT_W * 0.35;
  const colObs = CONTENT_W * 0.65;
  const rowHMin = 7;
  const header = locale === 'en' ? 'OBSERVATIONS' : 'OBSERVACIONES';

  layout.asegurar(rowHMin + 2);
  let y = layout.getY();

  const dibujarFila = (vin, obs, esHeader) => {
    const pad = 1.5;
    doc.setFont(FUENTE, esHeader ? 'bold' : 'normal');
    doc.setFontSize(10);
    const linesVin = doc.splitTextToSize(String(vin || ' '), colVin - pad * 2);
    const linesObs = doc.splitTextToSize(String(obs || ' '), colObs - pad * 2);
    const h = Math.max(rowHMin, Math.max(linesVin.length, linesObs.length) * 4.2 + pad * 2);

    if (y + h > PDF_PAGE.h - PDF_MARGINS.bottom) {
      doc.addPage();
      y = PDF_MARGINS.top;
      // repetir encabezado
      dibujarFila('VIN', header, true);
    }

    if (esHeader) {
      doc.setFillColor(...ROJO);
      doc.rect(MARGIN, y, colVin, h, 'F');
      doc.rect(MARGIN + colVin, y, colObs, h, 'F');
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setDrawColor(120);
      doc.setLineWidth(0.25);
      doc.setFillColor(255, 255, 255);
      doc.rect(MARGIN, y, colVin, h, 'FD');
      doc.rect(MARGIN + colVin, y, colObs, h, 'FD');
      doc.setTextColor(...NEGRO);
    }

    let ty = y + pad + 3.5;
    linesVin.forEach((ln) => {
      doc.text(ln, MARGIN + pad, ty);
      ty += 4.2;
    });
    ty = y + pad + 3.5;
    linesObs.forEach((ln) => {
      doc.text(ln, MARGIN + colVin + pad, ty);
      ty += 4.2;
    });
    y += h;
  };

  dibujarFila('VIN', header, true);
  filas.forEach((fila) => {
    dibujarFila(fila.vin, fila.averias || fila.dano, false);
  });
  layout.setY(y + 4);
}

async function pintarFotosGrid(doc, layout, imagenes, leyenda) {
  if (!imagenes?.length) return;
  const gap = 4;
  const colW = (CONTENT_W - gap) / 2;
  const imgW = colW - 2;
  const imgH = imgW * 0.75;

  layout.asegurar(8);
  layout.texto(leyenda, { bold: true, size: 10, after: 3, align: 'center' });

  for (let i = 0; i < imagenes.length; i += 2) {
    layout.asegurar(imgH + 10);
    let y = layout.getY();
    const par = [imagenes[i], imagenes[i + 1]].filter(Boolean);

    for (let j = 0; j < par.length; j += 1) {
      const dataUrl = await imagenADataUrl(par[j]);
      const x = MARGIN + j * (colW + gap);
      if (dataUrl) {
        try {
          const fmt = String(dataUrl).includes('image/png') ? 'PNG' : 'JPEG';
          doc.addImage(dataUrl, fmt, x + 1, y, imgW, imgH);
        } catch {
          doc.setDrawColor(180);
          doc.rect(x + 1, y, imgW, imgH);
        }
      } else {
        doc.setDrawColor(180);
        doc.rect(x + 1, y, imgW, imgH);
        doc.setFont(FUENTE, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...GRIS);
        doc.text('(Sin imagen)', x + colW / 2, y + imgH / 2, { align: 'center' });
      }
    }
    layout.setY(y + imgH + 6);
  }
}

/**
 * Genera y descarga el PDF del informe de inspección de asegurado (mismo contenido que el Word).
 */
export async function generarPdfRiicp004(formData, options = {}) {
  const locale = options?.locale === 'en' ? 'en' : 'es';
  const L = (es, en) => (locale === 'en' ? en : es);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const layout = crearLayout(doc);
  const logoUrl = await logoDataUrl();

  await pintarEncabezado(doc, layout, formData, logoUrl);

  const ciudadTexto = formData.municipio || 'Buenaventura';
  const fechaReporte = formatearFechaLarga(formData.fecha);
  const asegurado = (formData.asegurado || formData.nombreCliente || 'ASEGURADO').toUpperCase();
  const patio = (formData.patioOperacion || formData.puertoDescargue || '').toUpperCase();
  const motonave = formData.nombreMotonave || 'LA MOTONAVE';
  const totalVeh = formData.numeroVehiculos || formData.cantidadVehiculos || 'N';
  const bls = formData.listaBLs || formData.billOfLading || '';
  const origen = formData.origenImportacion || '';
  const fechasDesc = formData.fechasDescargue || '';
  const arribo = formatearFechaArribo(formData.fechaArriboMotonave);

  layout.espacio(6);
  layout.texto(`${ciudadTexto}, ${fechaReporte}`, { size: 11, after: 8 });

  if (formData.nombreContacto) {
    layout.texto(formData.nombreContacto.toUpperCase(), { bold: true, size: 11, after: 1 });
  }
  if (formData.cargoContacto) {
    layout.texto(formData.cargoContacto, { bold: true, size: 11, after: 1 });
  }
  if (formData.gerenciaContacto) layout.texto(formData.gerenciaContacto, { size: 11, after: 1 });
  if (formData.empresaCliente) {
    layout.texto(formData.empresaCliente.toUpperCase(), { size: 11, after: 1 });
  }
  if (formData.ciudadContacto) layout.texto(formData.ciudadContacto, { size: 11, after: 6 });

  layout.texto(L('Cordial Saludo.', 'Greetings.'), { size: 11, after: 8 });

  layout.texto(
    `De acuerdo a su gentil asignación nos permitimos informarles que fueron descargados ${totalVeh} vehículos, ` +
      `para el asegurado ${asegurado}, llegados en la motonave ${motonave}` +
      (arribo ? ` el ${arribo}` : '') +
      (bls ? `, amparados con los BLs. ${bls}` : '') +
      (origen ? `, de ${origen}` : '') +
      (fechasDesc ? `, descargue realizado los días ${fechasDesc}.` : '.'),
    { size: 11, after: 4, align: 'justify' }
  );

  if (formData.inspectores || formData.comentarioPatioAlmacenamiento || formData.fechasInspeccion) {
    layout.texto(
      formData.comentarioPatioAlmacenamiento ||
        `Inspección realizada por ${formData.inspectores} en Patios de ${formData.puertoDescargue || patio}, los días ${formData.fechasInspeccion || ''}.`,
      { size: 11, after: 3, align: 'justify' }
    );
  }

  if (formData.modelosVehiculos) {
    layout.texto(`Vehículos Modelo: ${formData.modelosVehiculos}`, { bold: true, size: 11, after: 3 });
  }

  layout.seccionRoja(L('2- OBSERVACIONES:', '2- OBSERVATIONS:'));

  if (formData.textoObservacionesGeneral) {
    String(formData.textoObservacionesGeneral)
      .split('\n')
      .forEach((p) => {
        if (p.trim()) layout.texto(p.trim(), { size: 11, after: 3, align: 'justify' });
      });
  }

  pintarTablaAverias(doc, layout, formData.tablaAverias || [], locale);

  const fotosAlmacenamiento = formData.imagenesAspectoAlmacenamiento || [];
  const fotosModelo = formData.imagenesAspectoModelo || [];
  const registrosVin = formData.registrosPorVin || [];
  const hayFotos =
    fotosAlmacenamiento.length > 0 ||
    fotosModelo.length > 0 ||
    registrosVin.some((r) => (r.fotos || []).length > 0);

  if (hayFotos) {
    doc.addPage();
    layout.setY(PDF_MARGINS.top);
    layout.seccionRoja(L('3- INFORME FOTOGRAFICO', '3- PHOTOGRAPHIC REPORT'));

    if (fotosAlmacenamiento.length) {
      await pintarFotosGrid(doc, layout, fotosAlmacenamiento, 'ASPECTO DEL ALMACENAMIENTO');
    }
    if (fotosModelo.length) {
      await pintarFotosGrid(doc, layout, fotosModelo, 'ASPECTO MODELO');
    }
    for (const registro of registrosVin) {
      const fotos = registro.fotos || [];
      if (!fotos.length) continue;
      const vin = (registro.vin || '').trim().toUpperCase();
      const danos = (registro.danos || '').trim().toUpperCase();
      const leyenda =
        vin && danos ? `VIN ${vin} ${danos}` : vin ? `VIN ${vin}` : danos || 'DETALLE VEHÍCULO';
      await pintarFotosGrid(doc, layout, fotos, leyenda);
    }
  }

  const recomendaciones = formData.recomendaciones || [];
  if (recomendaciones.length > 0) {
    layout.seccionRoja(L('4.- RECOMENDACIONES', '4.- RECOMMENDATIONS'));
    recomendaciones.forEach((rec) => {
      layout.texto(rec.texto || rec, { size: 11, after: 2, align: 'justify' });
    });
  }

  if (formData.conclusiones) {
    layout.seccionRoja(L('5.- CONCLUSIONES', '5.- CONCLUSIONS'));
    layout.texto(formData.conclusiones, { size: 11, after: 3, align: 'justify' });
  }

  layout.espacio(6);
  layout.texto('Atentamente,', { size: 11, after: 4 });

  if (formData.imagenFirma) {
    const firmaUrl = formData.imagenFirma.startsWith?.('data:')
      ? formData.imagenFirma
      : await imagenADataUrl({ ruta: formData.imagenFirma, src: formData.imagenFirma });
    if (firmaUrl) {
      try {
        layout.asegurar(28);
        const y = layout.getY();
        doc.addImage(firmaUrl, 'PNG', MARGIN, y, 45, 18);
        layout.setY(y + 20);
      } catch {
        /* sin firma */
      }
    }
  }

  if (formData.nombreFirmante) {
    layout.texto(formData.nombreFirmante.toUpperCase(), { bold: true, size: 11, after: 1 });
  }
  if (formData.cargoFirmante) {
    layout.texto(formData.cargoFirmante, { italic: true, size: 10, after: 1 });
  }
  if (formData.emailFirmante) {
    String(formData.emailFirmante)
      .split('/')
      .forEach((email) => {
        const limpio = email.trim();
        if (limpio) layout.texto(limpio, { size: 10, color: [5, 99, 193], after: 1 });
      });
  }
  if (formData.celularFirmante) {
    layout.texto(`Cel: ${formData.celularFirmante}`, { size: 10, after: 1 });
  }
  layout.texto(`${ciudadTexto}-Colombia`, { size: 10, after: 1 });

  const nombre = `INFORME_INSPECCION_${asegurado}_${motonave}_${formData.fecha || 'informe'}.pdf`;
  doc.save(nombre.replace(/[^a-zA-Z0-9._-]/g, '_'));
}
