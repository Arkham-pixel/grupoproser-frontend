import { jsPDF } from 'jspdf';
import { registrarFuentesPdf, familiaPdf } from './puertosCasoPdfFonts';
import {
  PDF_COLORS,
  PDF_CONTENT_W,
  PDF_FONT,
  PDF_MARGINS,
  PDF_PAGE,
  formatearFechaCorta,
  formatearFechaLarga,
} from './puertosCasoExportacionPdfHelpers';
import { actaApiAFormulario } from '../components/PuertosActas/puertosActaMapper';
import { getPuertosActa } from './puertosService';

function texto(valor) {
  return String(valor ?? '').trim() || '—';
}

function averiaLabel(valor) {
  if (valor === 'si') return 'Sí';
  if (valor === 'no') return 'No';
  return texto(valor);
}

function filaDatos(doc, y, etiqueta, valor, anchoEtiqueta = 52) {
  const x = PDF_MARGINS.left;
  doc.setFillColor(...PDF_COLORS.labelBg);
  doc.rect(x, y, anchoEtiqueta, 7, 'F');
  doc.setDrawColor(...PDF_COLORS.border);
  doc.rect(x, y, anchoEtiqueta, 7);
  doc.rect(x + anchoEtiqueta, y, PDF_CONTENT_W - anchoEtiqueta, 7);

  doc.setFont(familiaPdf('bold'), 'normal');
  doc.setFontSize(PDF_FONT.table);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(etiqueta, x + 2, y + 4.8);

  doc.setFont(familiaPdf('normal'), 'normal');
  doc.setTextColor(...PDF_COLORS.text);
  const lines = doc.splitTextToSize(texto(valor), PDF_CONTENT_W - anchoEtiqueta - 4);
  doc.text(lines[0] || '—', x + anchoEtiqueta + 2, y + 4.8);
  return y + 7;
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

function asegurarEspacio(doc, y, alto, pageRef) {
  if (y + alto > PDF_PAGE.h - PDF_MARGINS.bottom) {
    doc.addPage();
    pageRef.page += 1;
    return PDF_MARGINS.top;
  }
  return y;
}

export async function generarPdfActaPuertos(form, fotos = []) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await registrarFuentesPdf(doc);

  const pageRef = { page: 1 };
  let y = PDF_MARGINS.top;

  doc.setFont(familiaPdf('bold'), 'normal');
  doc.setFontSize(PDF_FONT.headerTitle);
  doc.setTextColor(...PDF_COLORS.greenBrand);
  doc.text('ACTA DE INSPECCIÓN — PUERTOS', PDF_MARGINS.left, y);
  y += 10;

  doc.setFont(familiaPdf('normal'), 'normal');
  doc.setFontSize(PDF_FONT.body);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(`Arnald DataFlow · ${texto(form.nroActa)}`, PDF_MARGINS.left, y);
  y += 8;

  y = tituloSeccion(doc, y, 'Información básica');
  y = filaDatos(doc, y, 'Regional', form.regional);
  y = filaDatos(doc, y, 'Nro. de Acta', form.nroActa);
  y = filaDatos(doc, y, 'Fecha de Acta', formatearFechaLarga(form.fechaActa));
  y = filaDatos(doc, y, 'Fecha Llegada', formatearFechaCorta(form.fechaLlegada));
  y = filaDatos(doc, y, 'Ciudad', form.ciudad);
  y = filaDatos(doc, y, 'Tipo Inspección', form.tipoInspeccion);
  y = filaDatos(doc, y, 'Inspector', form.inspector);
  y = filaDatos(doc, y, 'Estado', form.estado);
  y += 4;

  y = asegurarEspacio(doc, y, 50, pageRef);
  y = tituloSeccion(doc, y, 'Datos del asegurado');
  y = filaDatos(doc, y, 'Aseguradora', form.aseguradora);
  y = filaDatos(doc, y, 'Sucursal', form.sucursal);
  y = filaDatos(doc, y, 'Asegurado', form.asegurado);
  y = filaDatos(doc, y, 'Mercancía', form.mercancia);
  y = filaDatos(doc, y, 'Empaque', form.empaque);
  y = filaDatos(doc, y, 'Nro. Piezas', form.nroPiezas);
  y = filaDatos(doc, y, 'Fecha Construcción', formatearFechaCorta(form.fechaConstruccion));
  y = filaDatos(doc, y, 'Pedido', form.pedido);
  y += 4;

  y = asegurarEspacio(doc, y, 60, pageRef);
  y = tituloSeccion(doc, y, 'Transporte exterior');
  y = filaDatos(doc, y, 'País Origen', form.paisOrigen);
  y = filaDatos(doc, y, 'País Destino', form.paisDestino);
  y = filaDatos(doc, y, 'Tipo Transporte', form.tipoTransporte);
  y = filaDatos(doc, y, 'Motonave', form.motonave);
  y = filaDatos(doc, y, 'Puerto Origen', form.puertoOrigen);
  y = filaDatos(doc, y, 'Puerto Arribo', form.puertoArribo);
  y = filaDatos(doc, y, 'Registro', form.registro);
  y = filaDatos(doc, y, 'Doc. Transporte', form.docTransporte);
  y += 4;

  y = asegurarEspacio(doc, y, 70, pageRef);
  y = tituloSeccion(doc, y, 'Transporte interior');
  y = filaDatos(doc, y, 'Transportadora', form.transportadora);
  y = filaDatos(doc, y, 'Remesa', form.remesa);
  y = filaDatos(doc, y, 'Conductor', form.conductor);
  y = filaDatos(doc, y, 'Cédula', form.cedula);
  y = filaDatos(doc, y, 'Placa', form.placa);
  y = filaDatos(doc, y, 'Modelo', form.modelo);
  y = filaDatos(doc, y, 'Marca', form.marca);
  y = filaDatos(doc, y, 'Celular', form.celular);
  y = filaDatos(doc, y, 'Origen Despacho', form.origenDespacho);
  y = filaDatos(doc, y, 'Destino Despacho', form.destinoDespacho);
  y = filaDatos(doc, y, 'Carta de Porte', form.cartaPorte);
  y += 4;

  y = asegurarEspacio(doc, y, 45, pageRef);
  y = tituloSeccion(doc, y, 'Detalle de inspección');
  y = filaDatos(doc, y, 'Lugar reconocimiento', form.lugarReconocimiento);
  y = filaDatos(doc, y, 'Contacto', form.contacto);
  y = filaDatos(doc, y, 'Peso Tara (kg)', form.pesoTara);
  y = filaDatos(doc, y, 'Peso Neto (kg)', form.pesoNeto);
  y = filaDatos(doc, y, 'Peso Bruto (kg)', form.pesoBruto);
  y = filaDatos(doc, y, 'Avería', averiaLabel(form.averiaSiNo));
  y = filaDatos(doc, y, 'Tipo de avería', form.tipoAveria);
  y += 4;

  if (form.observaciones || form.recomendaciones) {
    y = asegurarEspacio(doc, y, 40, pageRef);
    y = tituloSeccion(doc, y, 'Observaciones y recomendaciones');
    if (form.observaciones) {
      doc.setFont(familiaPdf('bold'), 'normal');
      doc.setFontSize(PDF_FONT.table);
      doc.text('Observaciones:', PDF_MARGINS.left, y);
      y += 5;
      doc.setFont(familiaPdf('normal'), 'normal');
      const lines = doc.splitTextToSize(form.observaciones, PDF_CONTENT_W);
      doc.text(lines, PDF_MARGINS.left, y);
      y += lines.length * 4.5 + 4;
    }
    if (form.recomendaciones) {
      y = asegurarEspacio(doc, y, 20, pageRef);
      doc.setFont(familiaPdf('bold'), 'normal');
      doc.text('Recomendaciones:', PDF_MARGINS.left, y);
      y += 5;
      doc.setFont(familiaPdf('normal'), 'normal');
      const lines = doc.splitTextToSize(form.recomendaciones, PDF_CONTENT_W);
      doc.text(lines, PDF_MARGINS.left, y);
      y += lines.length * 4.5;
    }
  }

  const fotosValidas = (fotos || []).filter((f) => f?.src);
  if (fotosValidas.length > 0) {
    y = asegurarEspacio(doc, y, 50, pageRef);
    y = tituloSeccion(doc, y, `Registro fotográfico (${fotosValidas.length})`);
    const anchoFoto = (PDF_CONTENT_W - 6) / 2;
    const altoFoto = 40;
    let col = 0;
    for (const foto of fotosValidas) {
      y = asegurarEspacio(doc, y, altoFoto + 12, pageRef);
      const x = PDF_MARGINS.left + col * (anchoFoto + 6);
      try {
        doc.addImage(foto.src, 'JPEG', x, y, anchoFoto, altoFoto);
      } catch {
        try {
          doc.addImage(foto.src, 'PNG', x, y, anchoFoto, altoFoto);
        } catch {
          doc.rect(x, y, anchoFoto, altoFoto);
        }
      }
      if (foto.descripcion) {
        doc.setFontSize(PDF_FONT.caption);
        doc.text(foto.descripcion, x, y + altoFoto + 4, { maxWidth: anchoFoto });
      }
      col += 1;
      if (col >= 2) {
        col = 0;
        y += altoFoto + 10;
      }
    }
    if (col === 1) y += altoFoto + 10;
  }

  const nombreArchivo = `Acta_${String(form.nroActa || 'Puertos').replace(/[^\w.-]+/g, '_')}.pdf`;
  doc.save(nombreArchivo);
}

export async function generarPdfActaPuertosDesdeId(id) {
  const doc = await getPuertosActa(id);
  const form = actaApiAFormulario(doc);
  const fotos = (doc.fotos || []).map((f, i) => ({
    id: f.id || `foto-${i}`,
    src: f.src || f.ruta || f.url || '',
    descripcion: f.descripcion || f.nombre || '',
  }));
  return generarPdfActaPuertos(form, fotos);
}
