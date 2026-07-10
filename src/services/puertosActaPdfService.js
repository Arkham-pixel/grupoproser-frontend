import { jsPDF } from 'jspdf';
import { arnaldLogo } from '../config/brandAssets.js';
import { registrarFuentesPdf, familiaPdf } from './puertosCasoPdfFonts';
import {
  PDF_COLORS,
  PDF_CONTENT_W,
  PDF_FONT,
  PDF_MARGINS,
  PDF_PAGE,
  assetImportadoABase64,
  detectarFormatoImagen,
  formatearFechaCorta,
  formatearFechaLarga,
  imagenInformeABase64,
} from './puertosCasoExportacionPdfHelpers';
import { actaApiAFormulario } from '../components/PuertosActas/puertosActaMapper';
import { getPuertosActa } from './puertosService';

const LINE_H = 4.6;

function normalizarTextoPdf(valor) {
  return String(valor ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function texto(valor) {
  const limpio = normalizarTextoPdf(valor).replace(/\n+/g, ' ');
  return limpio || '—';
}

function averiaLabel(valor) {
  if (valor === 'si') return 'Sí';
  if (valor === 'no') return 'No';
  return texto(valor);
}

function asegurarEspacio(doc, y, alto, pageRef) {
  if (y + alto > PDF_PAGE.h - PDF_MARGINS.bottom) {
    doc.addPage();
    pageRef.page += 1;
    pintarPiePagina(doc, pageRef.page);
    return PDF_MARGINS.top;
  }
  return y;
}

function pintarPiePagina(doc, pagina) {
  doc.setFont(familiaPdf('normal'), 'normal');
  doc.setFontSize(PDF_FONT.caption);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(
    `Generado en Arnald DataFlow — ${new Date().toLocaleString('es-CO')}`,
    PDF_MARGINS.left,
    PDF_PAGE.h - 8
  );
  doc.text(`Página ${pagina}`, PDF_PAGE.w - PDF_MARGINS.right, PDF_PAGE.h - 8, { align: 'right' });
}

function tituloSeccion(doc, y, titulo) {
  doc.setFillColor(...PDF_COLORS.greenBrand);
  doc.rect(PDF_MARGINS.left, y, PDF_CONTENT_W, 8, 'F');
  doc.setFont(familiaPdf('bold'), 'normal');
  doc.setFontSize(PDF_FONT.body);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text(titulo.toUpperCase(), PDF_MARGINS.left + 3, y + 5.5);
  return y + 10;
}

function filaDatos(doc, y, pageRef, etiqueta, valor, anchoEtiqueta = 52) {
  const x = PDF_MARGINS.left;
  const anchoValor = PDF_CONTENT_W - anchoEtiqueta;
  const lineas = doc.splitTextToSize(texto(valor), anchoValor - 4);
  const altoFila = Math.max(7, lineas.length * LINE_H + 2);

  y = asegurarEspacio(doc, y, altoFila + 1, pageRef);

  doc.setFillColor(...PDF_COLORS.labelBg);
  doc.rect(x, y, anchoEtiqueta, altoFila, 'F');
  doc.setDrawColor(...PDF_COLORS.border);
  doc.rect(x, y, anchoEtiqueta, altoFila);
  doc.rect(x + anchoEtiqueta, y, anchoValor, altoFila);

  doc.setFont(familiaPdf('bold'), 'normal');
  doc.setFontSize(PDF_FONT.table);
  doc.setTextColor(...PDF_COLORS.muted);
  const etiquetaLineas = doc.splitTextToSize(etiqueta, anchoEtiqueta - 4);
  doc.text(etiquetaLineas, x + 2, y + 4.8);

  doc.setFont(familiaPdf('normal'), 'normal');
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(lineas, x + anchoEtiqueta + 2, y + 4.8);

  return y + altoFila;
}

function escribirBloqueTexto(doc, y, pageRef, titulo, subtitulo, cuerpo) {
  y = asegurarEspacio(doc, y, 18, pageRef);
  y = tituloSeccion(doc, y, titulo);

  if (subtitulo) {
    y = asegurarEspacio(doc, y, 8, pageRef);
    doc.setFont(familiaPdf('normal'), 'normal');
    doc.setFontSize(PDF_FONT.caption);
    doc.setTextColor(...PDF_COLORS.muted);
    const subLineas = doc.splitTextToSize(subtitulo, PDF_CONTENT_W);
    doc.text(subLineas, PDF_MARGINS.left, y);
    y += subLineas.length * LINE_H + 2;
  }

  const contenido = normalizarTextoPdf(cuerpo) || '—';
  const parrafos = contenido.split('\n');
  doc.setFont(familiaPdf('normal'), 'normal');
  doc.setFontSize(PDF_FONT.body);
  doc.setTextColor(...PDF_COLORS.text);

  for (const parrafo of parrafos) {
    const lineas = doc.splitTextToSize(parrafo || ' ', PDF_CONTENT_W);
    for (const linea of lineas) {
      y = asegurarEspacio(doc, y, LINE_H + 1, pageRef);
      doc.text(linea, PDF_MARGINS.left, y);
      y += LINE_H;
    }
    y += 2;
  }

  return y + 2;
}

async function pintarEncabezado(doc, form, logoDataUrl) {
  let y = PDF_MARGINS.top;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', PDF_MARGINS.left, y, 42, 14);
    } catch {
      /* sin logo */
    }
  }

  const xDer = PDF_MARGINS.left + PDF_CONTENT_W;
  doc.setFont(familiaPdf('bold'), 'normal');
  doc.setFontSize(PDF_FONT.title);
  doc.setTextColor(...PDF_COLORS.greenBrand);
  doc.text('PUERTOS — ACTA DE INSPECCIÓN', xDer, y + 5, { align: 'right' });
  doc.setFontSize(PDF_FONT.caption);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text('Arnald DataFlow', xDer, y + 10, { align: 'right' });

  y += 18;
  doc.setFont(familiaPdf('bold'), 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.text);
  doc.text('CONTROL PORTUARIO, RISK MANAGEMENT Y AJUSTES DE SINIESTROS', PDF_MARGINS.left, y);
  y += 4.5;
  doc.text('PROSER PUERTOS AJUSTADORES DE SEGUROS', PDF_MARGINS.left, y);

  const boxW = 52;
  const boxH = 12;
  const boxX = PDF_MARGINS.left + PDF_CONTENT_W - boxW;
  const boxY = y - 8;
  doc.setDrawColor(...PDF_COLORS.greenBrand);
  doc.setLineWidth(0.4);
  doc.rect(boxX, boxY, boxW, boxH);
  doc.setFont(familiaPdf('bold'), 'normal');
  doc.setFontSize(PDF_FONT.table);
  doc.text('ACTA No.', boxX + boxW / 2, boxY + 4.5, { align: 'center' });
  doc.setFontSize(PDF_FONT.body);
  doc.text(texto(form.nroActa), boxX + boxW / 2, boxY + 9.5, { align: 'center' });

  y += 8;
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(PDF_MARGINS.left, y, PDF_MARGINS.left + PDF_CONTENT_W, y);
  return y + 6;
}

async function normalizarImagenFoto(foto) {
  const candidatos = [foto?.src, foto?.preview, foto?.ruta, foto?.url, foto?.nombre].filter(Boolean);
  for (const src of candidatos) {
    if (String(src).startsWith('data:') || String(src).startsWith('blob:')) {
      const convertida = await convertirDataUrlAJpeg(src);
      if (convertida) return convertida;
    }
  }

  const remota = await imagenInformeABase64(foto);
  if (remota) {
    const convertida = await convertirDataUrlAJpeg(remota);
    if (convertida) return convertida;
  }

  for (const src of candidatos) {
    const convertida = await convertirDataUrlAJpeg(src);
    if (convertida) return convertida;
  }

  return null;
}

function convertirDataUrlAJpeg(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== 'string') {
      resolve(null);
      return;
    }

    const formato = detectarFormatoImagen(dataUrl);
    if (formato === 'JPEG' && dataUrl.includes('image/jpeg')) {
      resolve({ data: dataUrl, format: 'JPEG' });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve({ data: canvas.toDataURL('image/jpeg', 0.9), format: 'JPEG' });
      } catch {
        resolve({ data: dataUrl, format: formato });
      }
    };
    img.onerror = () => resolve({ data: dataUrl, format: formato });
    img.src = dataUrl;
  });
}

async function pintarFotos(doc, y, pageRef, fotos = []) {
  const preparadas = [];
  for (const foto of fotos) {
    const normalizada = await normalizarImagenFoto(foto);
    if (normalizada?.data) {
      preparadas.push({
        ...foto,
        data: normalizada.data,
        format: normalizada.format || 'JPEG',
      });
    }
  }

  if (!preparadas.length) return y;

  y = asegurarEspacio(doc, y, 50, pageRef);
  y = tituloSeccion(doc, y, `Registro fotográfico (${preparadas.length})`);

  const anchoFoto = (PDF_CONTENT_W - 6) / 2;
  const altoFoto = 45;
  let col = 0;
  let altoFilaActual = 0;
  let yFila = y;

  for (const foto of preparadas) {
    const pie = texto(foto.descripcion);
    const tienePie = pie !== '—';
    const altoBloque = altoFoto + (tienePie ? 12 : 0);

    if (col === 0) {
      yFila = asegurarEspacio(doc, y, altoBloque + 6, pageRef);
      y = yFila;
      altoFilaActual = altoBloque;
    } else {
      altoFilaActual = Math.max(altoFilaActual, altoBloque);
    }

    const x = PDF_MARGINS.left + col * (anchoFoto + 6);

    try {
      doc.addImage(foto.data, foto.format, x, yFila, anchoFoto, altoFoto);
    } catch {
      doc.setDrawColor(...PDF_COLORS.border);
      doc.rect(x, yFila, anchoFoto, altoFoto);
      doc.setFontSize(PDF_FONT.caption);
      doc.text('Imagen no disponible', x + 2, yFila + altoFoto / 2);
    }

    if (tienePie) {
      doc.setFont(familiaPdf('normal'), 'normal');
      doc.setFontSize(PDF_FONT.caption);
      doc.setTextColor(...PDF_COLORS.muted);
      const pieLineas = doc.splitTextToSize(pie, anchoFoto);
      doc.text(pieLineas.slice(0, 2), x, yFila + altoFoto + 4);
    }

    col += 1;
    if (col >= 2) {
      col = 0;
      y = yFila + altoFilaActual + 6;
    }
  }

  if (col === 1) y = yFila + altoFilaActual + 6;
  return y;
}

function pintarFirmas(doc, y, pageRef, form) {
  y = asegurarEspacio(doc, y, 28, pageRef);
  y = tituloSeccion(doc, y, 'Firmas');

  const cols = [
    { label: 'Asegurado / Insured', valor: form.asegurado },
    { label: 'Inspector', valor: form.inspector },
    { label: 'Fecha', valor: formatearFechaLarga(form.fechaActa) },
  ];

  const ancho = PDF_CONTENT_W / cols.length;
  const alto = 22;
  const x0 = PDF_MARGINS.left;

  cols.forEach((col, i) => {
    const x = x0 + i * ancho;
    doc.setDrawColor(...PDF_COLORS.border);
    doc.rect(x, y, ancho - 2, alto);
    doc.setFont(familiaPdf('bold'), 'normal');
    doc.setFontSize(PDF_FONT.caption);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(col.label, x + 2, y + 5);
    doc.setFont(familiaPdf('normal'), 'normal');
    doc.setFontSize(PDF_FONT.table);
    doc.setTextColor(...PDF_COLORS.text);
    const lineas = doc.splitTextToSize(texto(col.valor), ancho - 6);
    doc.text(lineas.slice(0, 2), x + 2, y + 11);
  });

  return y + alto + 6;
}

function pintarDocumentosAdjuntos(doc, y, pageRef, documentos = {}) {
  const factura = documentos.facturaComercial ? 'Sí' : 'No';
  const empaque = documentos.listaEmpaque ? 'Sí' : 'No';
  const transporte = documentos.docTransporte ? 'Sí' : 'No';

  y = asegurarEspacio(doc, y, 24, pageRef);
  y = tituloSeccion(doc, y, 'Documentos adjuntos / Attached documents');
  y = filaDatos(doc, y, pageRef, 'Factura comercial', factura, 70);
  y = filaDatos(doc, y, pageRef, 'Lista de empaque', empaque, 70);
  y = filaDatos(doc, y, pageRef, 'Doc. de transporte', transporte, 70);
  return y + 2;
}

export async function generarPdfActaPuertos(form, fotos = [], extras = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await registrarFuentesPdf(doc);
  const logoDataUrl = await assetImportadoABase64(arnaldLogo);

  const pageRef = { page: 1 };
  let y = await pintarEncabezado(doc, form, logoDataUrl);
  pintarPiePagina(doc, pageRef.page);

  y = tituloSeccion(doc, y, 'Información básica');
  y = filaDatos(doc, y, pageRef, 'Regional', form.regional);
  y = filaDatos(doc, y, pageRef, 'Nro. de Acta', form.nroActa);
  y = filaDatos(doc, y, pageRef, 'Fecha de Acta', formatearFechaLarga(form.fechaActa));
  y = filaDatos(doc, y, pageRef, 'Fecha Llegada', formatearFechaCorta(form.fechaLlegada));
  y = filaDatos(doc, y, pageRef, 'Ciudad', form.ciudad);
  y = filaDatos(doc, y, pageRef, 'Tipo Inspección', form.tipoInspeccion);
  y = filaDatos(doc, y, pageRef, 'Inspector', form.inspector);
  y = filaDatos(doc, y, pageRef, 'Estado', form.estado);
  y += 4;

  y = asegurarEspacio(doc, y, 50, pageRef);
  y = tituloSeccion(doc, y, 'Datos del asegurado');
  y = filaDatos(doc, y, pageRef, 'Aseguradora', form.aseguradora);
  y = filaDatos(doc, y, pageRef, 'Sucursal', form.sucursal);
  y = filaDatos(doc, y, pageRef, 'Asegurado', form.asegurado);
  y = filaDatos(doc, y, pageRef, 'Tipo de mercancía', form.mercancia);
  y = filaDatos(doc, y, pageRef, 'Empaque', form.empaque);
  y = filaDatos(doc, y, pageRef, 'Nro. Piezas', form.nroPiezas);
  y = filaDatos(doc, y, pageRef, 'Fecha Construcción', formatearFechaCorta(form.fechaConstruccion));
  y = filaDatos(doc, y, pageRef, 'Pedido', form.pedido);
  y += 4;

  y = asegurarEspacio(doc, y, 60, pageRef);
  y = tituloSeccion(doc, y, 'Transporte exterior');
  y = filaDatos(doc, y, pageRef, 'País Origen', form.paisOrigen);
  y = filaDatos(doc, y, pageRef, 'País Destino', form.paisDestino);
  y = filaDatos(doc, y, pageRef, 'Tipo Transporte', form.tipoTransporte);
  y = filaDatos(doc, y, pageRef, 'Motonave', form.motonave);
  y = filaDatos(doc, y, pageRef, 'Puerto Origen', form.puertoOrigen);
  y = filaDatos(doc, y, pageRef, 'Puerto Arribo', form.puertoArribo);
  y = filaDatos(doc, y, pageRef, 'Registro', form.registro);
  y = filaDatos(doc, y, pageRef, 'Doc. Transporte', form.docTransporte);
  y += 4;

  y = asegurarEspacio(doc, y, 70, pageRef);
  y = tituloSeccion(doc, y, 'Transporte interior');
  y = filaDatos(doc, y, pageRef, 'Transportadora', form.transportadora);
  y = filaDatos(doc, y, pageRef, 'Remesa', form.remesa);
  y = filaDatos(doc, y, pageRef, 'Conductor', form.conductor);
  y = filaDatos(doc, y, pageRef, 'Cédula', form.cedula);
  y = filaDatos(doc, y, pageRef, 'Placa', form.placa);
  y = filaDatos(doc, y, pageRef, 'Modelo', form.modelo);
  y = filaDatos(doc, y, pageRef, 'Marca', form.marca);
  y = filaDatos(doc, y, pageRef, 'Celular', form.celular);
  y = filaDatos(doc, y, pageRef, 'Origen Despacho', form.origenDespacho);
  y = filaDatos(doc, y, pageRef, 'Destino Despacho', form.destinoDespacho);
  y = filaDatos(doc, y, pageRef, 'Carta de Porte', form.cartaPorte);
  y += 4;

  y = asegurarEspacio(doc, y, 45, pageRef);
  y = tituloSeccion(doc, y, 'Detalle de inspección');
  y = filaDatos(doc, y, pageRef, 'Lugar reconocimiento', form.lugarReconocimiento);
  y = filaDatos(doc, y, pageRef, 'Contacto', form.contacto);
  y = filaDatos(doc, y, pageRef, 'Peso Tara (kg)', form.pesoTara);
  y = filaDatos(doc, y, pageRef, 'Peso Neto (kg)', form.pesoNeto);
  y = filaDatos(doc, y, pageRef, 'Peso Bruto (kg)', form.pesoBruto);
  y = filaDatos(doc, y, pageRef, 'Avería', averiaLabel(form.averiaSiNo));
  y = filaDatos(doc, y, pageRef, 'Tipo de avería', form.tipoAveria);
  y += 4;

  y = escribirBloqueTexto(
    doc,
    y,
    pageRef,
    'Observaciones / Remarks',
    '(En caso de novedad relacionar valor de la factura y valor de la pérdida)',
    form.observaciones
  );

  y = escribirBloqueTexto(
    doc,
    y,
    pageRef,
    'Recomendaciones / Recommendations',
    '',
    form.recomendaciones
  );

  if (extras.documentosAdjuntos || form.documentosAdjuntos) {
    y = pintarDocumentosAdjuntos(
      doc,
      y,
      pageRef,
      extras.documentosAdjuntos || form.documentosAdjuntos || {}
    );
  }

  y = await pintarFotos(doc, y, pageRef, fotos);
  y = pintarFirmas(doc, y, pageRef, form);

  const nombreArchivo = `Acta_${String(form.nroActa || 'Puertos').replace(/[^\w.-]+/g, '_')}.pdf`;
  doc.save(nombreArchivo);
}

export async function generarPdfActaPuertosDesdeId(id) {
  const doc = await getPuertosActa(id);
  const form = actaApiAFormulario(doc);
  const fotos = (doc.fotos || []).map((f, i) => ({
    id: f.id || `foto-${i}`,
    src: f.src || f.ruta || f.url || '',
    nombre: f.nombre || '',
    descripcion: f.descripcion || '',
    ruta: f.ruta,
  }));

  const documentosAdjuntos =
    doc.documentosAdjuntos ||
    (typeof doc.documentos === 'object' && !Array.isArray(doc.documentos) ? doc.documentos : null);

  return generarPdfActaPuertos(form, fotos, { documentosAdjuntos });
}
