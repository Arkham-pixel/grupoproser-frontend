import { jsPDF } from 'jspdf';
import portadaFoto from '../img/Captura de pantalla 2026-06-17 092246.png';
import logoBolivar from '../img/seguros-bolivar.png';
import { calcularNumContenedoresMercancia } from '../components/PuertosActas/puertosCasoExportacionState';
import { registrarFuentesPdf, familiaPdf } from './puertosCasoPdfFonts';
import {
  PDF_COLORS,
  PDF_CONTENT_W,
  PDF_FONT,
  PDF_HEADER,
  PDF_MARGINS,
  PDF_PAGE,
  aplanarSeguimiento,
  assetImportadoABase64,
  detectarFormatoImagen,
  formatearFechaCorta,
  formatearFechaLarga,
  formatearFechaMayus,
  imagenInformeABase64,
  obtenerInspector,
  resumenMercancia,
  construirFilasMercanciaWord,
  captionImagenPdf,
  prepararFotosSeccion3Mercancia,
  textoPunto,
  agruparFotosSupervisionInicial,
} from './puertosCasoExportacionPdfHelpers';

const CONTACTO_BOLIVAR = {
  intro: 'Para mayor información, contactarse con el ingeniero de riesgos encargado de su cuenta corporativa.',
  nombre: 'Carlos Barrios Garrido',
  cargo: 'Ingeniero de control y prevención de riesgos corporativos',
  gerencia: 'Gerencia de Clientes Corporativos',
  empresa: 'Seguros Comerciales Bolívar S.A.',
  email: 'Carlos.barrios@segurosbolivar.com',
};

class PdfLayout {
  constructor(doc, logoDataUrl = null) {
    this.doc = doc;
    this.logoDataUrl = logoDataUrl;
    this.y = PDF_MARGINS.top;
    this.page = 1;
    /** Encabezado en todas las págenes (se activa al terminar la portada). */
    this.usarEncabezado = false;
  }

  get maxY() {
    return PDF_PAGE.h - PDF_MARGINS.bottom;
  }

  get x() {
    return PDF_MARGINS.left;
  }

  nuevaPagina(forzarEncabezado = null) {
    this.doc.addPage();
    this.page += 1;
    this.y = PDF_MARGINS.top;
    const conEncabezado = forzarEncabezado ?? this.usarEncabezado;
    if (conEncabezado) this.encabezadoSupervision();
  }

  asegurarEspacio(alto) {
    if (this.y + alto > this.maxY) {
      this.nuevaPagina();
      return true;
    }
    return false;
  }

  aplicarFuente(estilo = 'normal', tamano = PDF_FONT.body) {
    this.doc.setFont(familiaPdf(estilo), 'normal');
    this.doc.setFontSize(tamano);
    this.doc.setTextColor(...PDF_COLORS.text);
  }

  encabezadoSupervision() {
    const { doc } = this;
    const barH = PDF_HEADER.barH;
    const logoBoxW = 40;
    const greenW = PDF_PAGE.w - logoBoxW;

    doc.setFillColor(...PDF_COLORS.greenBarBg);
    doc.rect(0, 0, greenW, barH, 'F');

    doc.setFillColor(...PDF_COLORS.white);
    doc.rect(greenW, 0, logoBoxW, barH, 'F');

    if (this.logoDataUrl) {
      try {
        const logoW = 34;
        const logoH = 15;
        const logoX = greenW + (logoBoxW - logoW) / 2;
        const logoY = (barH - logoH) / 2;
        doc.addImage(
          this.logoDataUrl,
          detectarFormatoImagen(this.logoDataUrl),
          logoX,
          logoY,
          logoW,
          logoH
        );
      } catch {
        /* logo opcional */
      }
    }

    this.aplicarFuente('bold', PDF_FONT.headerTitle);
    doc.setTextColor(...PDF_COLORS.greenBrand);
    doc.text('REPORTE DE SUPERVISIÓN', greenW / 2, barH / 2 + 2.5, { align: 'center' });
    doc.setTextColor(...PDF_COLORS.text);

    this.y = barH + PDF_HEADER.espacioContenido;
  }

  /** Línea dorada centrada (portada). */
  lineaDoradaPortada(centrada = false) {
    const { doc } = this;
    const lineW = PDF_CONTENT_W * 0.52;
    const lineX = centrada ? (PDF_PAGE.w - lineW) / 2 : this.x;
    doc.setDrawColor(...PDF_COLORS.gold);
    doc.setLineWidth(0.7);
    doc.line(lineX, this.y, lineX + lineW, this.y);
    this.y += 8;
  }

  textoCentrado(texto, y, opciones = {}) {
    const { fontSize = PDF_FONT.body, bold = false } = opciones;
    if (!texto?.trim()) return y;
    this.aplicarFuente(bold ? 'bold' : 'normal', fontSize);
    this.doc.text(texto.trim(), PDF_PAGE.w / 2, y, { align: 'center' });
    return y + fontSize * 0.42 + 3;
  }

  /** Texto alineado a la izquierda (bloque portada). */
  textoIzquierda(texto, opciones = {}) {
    const { fontSize = PDF_FONT.body, bold = false } = opciones;
    if (!texto?.trim()) return;
    const { doc } = this;
    this.aplicarFuente(bold ? 'bold' : 'normal', fontSize);
    doc.text(texto.trim(), this.x, this.y);
    this.y += fontSize * 0.42 + 2;
  }

  /** Tabla DATOS GENERALES — cabecera centrada + 2 columnas (etiqueta | valor). */
  tablaDatosGeneralesWord(filas, tituloCabecera = 'DATOS GENERALES') {
    const { doc } = this;
    const labelW = 58;
    const valW = PDF_CONTENT_W - labelW;
    const fontSize = PDF_FONT.body;
    const headerH = 8;

    this.asegurarEspacio(headerH + 2);
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.2);
    doc.rect(this.x, this.y - 4.5, PDF_CONTENT_W, headerH);
    this.aplicarFuente('bold', PDF_FONT.title);
    doc.text(String(tituloCabecera).toUpperCase(), PDF_PAGE.w / 2, this.y, { align: 'center' });
    this.y += headerH - 1;

    filas.forEach(([label, value]) => {
      const val = String(value || '').trim() || '—';
      const valLines = doc.splitTextToSize(val, valW - 4);
      const alto = Math.max(7, valLines.length * 4.2 + 3);
      this.asegurarEspacio(alto + 1);

      doc.setDrawColor(...PDF_COLORS.border);
      doc.setLineWidth(0.2);
      doc.rect(this.x, this.y - 4.5, labelW, alto);
      doc.rect(this.x + labelW, this.y - 4.5, valW, alto);

      this.aplicarFuente('bold', fontSize);
      doc.text(String(label), this.x + 2, this.y);
      this.aplicarFuente('normal', fontSize);
      doc.text(valLines, this.x + labelW + 2, this.y);

      this.y += alto;
    });
    this.y += 4;
  }

  filaCabeceraVerde(titulo) {
    const { doc } = this;
    const headerH = 8;
    this.asegurarEspacio(headerH + 2);
    doc.setFillColor(...PDF_COLORS.greenBarBg);
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.2);
    doc.rect(this.x, this.y - 4.5, PDF_CONTENT_W, headerH, 'FD');
    this.aplicarFuente('bold', PDF_FONT.title);
    doc.setTextColor(...PDF_COLORS.greenBrand);
    doc.text(String(titulo).toUpperCase(), PDF_PAGE.w / 2, this.y, { align: 'center' });
    doc.setTextColor(...PDF_COLORS.text);
    this.y += headerH - 1;
  }

  tablaFilasEtiquetaValor(filas) {
    const { doc } = this;
    const labelW = 58;
    const valW = PDF_CONTENT_W - labelW;
    const fontSize = PDF_FONT.body;

    filas.forEach(([label, value]) => {
      const val = String(value || '').trim() || '—';
      const valLines = doc.splitTextToSize(val, valW - 4);
      const alto = Math.max(7, valLines.length * 4.2 + 3);
      this.asegurarEspacio(alto + 1);

      doc.setDrawColor(...PDF_COLORS.border);
      doc.setLineWidth(0.2);
      doc.rect(this.x, this.y - 4.5, labelW, alto);
      doc.rect(this.x + labelW, this.y - 4.5, valW, alto);

      this.aplicarFuente('bold', fontSize);
      doc.text(String(label).toUpperCase(), this.x + 2, this.y);
      this.aplicarFuente('normal', fontSize);
      doc.text(valLines, this.x + labelW + 2, this.y);

      this.y += alto;
    });
    this.y += 2;
  }

  tablaCaracteristicasBarco(filas) {
    this.filaCabeceraVerde('CARACTERISTICAS DEL BARCO');
    this.tablaFilasEtiquetaValor(filas);
  }

  filaCabeceraColumnas(headers, anchos) {
    const { doc } = this;
    const headerH = 8;
    const fontSize = PDF_FONT.table;
    const total = anchos.reduce((a, b) => a + b, 0);
    const escala = PDF_CONTENT_W / total;
    const cols = anchos.map((w) => w * escala);

    this.asegurarEspacio(headerH + 1);
    let cx = this.x;
    headers.forEach((h, i) => {
      doc.setFillColor(...PDF_COLORS.greenBarBg);
      doc.setDrawColor(...PDF_COLORS.border);
      doc.setLineWidth(0.2);
      doc.rect(cx, this.y - 4.5, cols[i], headerH, 'FD');
      this.aplicarFuente('bold', fontSize);
      const lines = doc.splitTextToSize(h, cols[i] - 2);
      doc.text(lines, cx + cols[i] / 2, this.y, { align: 'center' });
      cx += cols[i];
    });
    this.y += headerH - 1;
  }

  tablaFilasConColumnas(rows, anchos, dibujarSubHeader = null) {
    if (!rows.length) return;
    const { doc } = this;
    const total = anchos.reduce((a, b) => a + b, 0);
    const escala = PDF_CONTENT_W / total;
    const cols = anchos.map((w) => w * escala);
    const fontSize = PDF_FONT.table;

    rows.forEach((row) => {
      let maxLines = 1;
      const celdas = row.map((cell, i) => {
        const lines = doc.splitTextToSize(String(cell ?? ''), cols[i] - 2);
        maxLines = Math.max(maxLines, lines.length);
        return lines;
      });
      const rowH = maxLines * 3.8 + 4;
      if (this.y + rowH > this.maxY) {
        this.nuevaPagina();
        if (dibujarSubHeader) dibujarSubHeader();
      }
      let cx = this.x;
      doc.setDrawColor(...PDF_COLORS.border);
      doc.setLineWidth(0.2);
      this.aplicarFuente('normal', fontSize);
      celdas.forEach((lines, i) => {
        doc.rect(cx, this.y - 4.5, cols[i], rowH);
        if (i === 2) {
          doc.text(lines, cx + 2, this.y);
        } else {
          doc.text(lines, cx + cols[i] / 2, this.y, { align: 'center' });
        }
        cx += cols[i];
      });
      this.y += rowH;
    });
    this.y += 3;
  }

  tablaMercanciaWord(lineas, total) {
    const anchos = [18, 22, 56, 20, 32, 32];
    const headers = [
      'N° CONTENEDORES',
      'B/L N°',
      'PRODUCTO',
      'CANTIDAD',
      'TIPO DE CARGA',
      'DESTINO',
    ];
    const dataRows = construirFilasMercanciaWord(lineas);
    dataRows.push(['', '', 'Total', total > 0 ? `${total} UDS` : '—', '', '']);

    this.filaCabeceraVerde('DESCRIPCIÓN DE LA MERCANCÍA');
    const dibujarSubHeader = () => {
      this.filaCabeceraColumnas(headers, anchos);
    };
    dibujarSubHeader();
    this.tablaFilasConColumnas(dataRows, anchos, dibujarSubHeader);
  }

  /** Título numerado en negrita (ej. «1. INTRODUCCIÓN»). */
  tituloNumerado(numero, texto) {
    this.asegurarEspacio(6);
    this.aplicarFuente('bold', PDF_FONT.title);
    this.doc.text(`${numero}. ${String(texto).toUpperCase()}`, this.x, this.y);
    this.y += 5;
  }

  tituloSeccion(texto, sinLinea = false) {
    this.asegurarEspacio(12);
    const { doc } = this;
    this.aplicarFuente('bold', PDF_FONT.title);
    doc.text(String(texto).toUpperCase(), this.x, this.y);
    this.y += sinLinea ? 6 : 3;
    if (!sinLinea) {
      doc.setDrawColor(...PDF_COLORS.green);
      doc.setLineWidth(0.35);
      doc.line(this.x, this.y, this.x + PDF_CONTENT_W, this.y);
      this.y += 5;
    }
  }

  subtitulo(texto) {
    this.asegurarEspacio(10);
    const { doc } = this;
    this.aplicarFuente('bold', PDF_FONT.title);
    doc.text(texto, this.x, this.y);
    this.y += 6;
  }

  parrafo(texto, opciones = {}) {
    const { fontSize = PDF_FONT.body, bold = false, align = 'justify' } = opciones;
    if (!texto?.trim()) return;
    const { doc } = this;
    this.aplicarFuente(bold ? 'bold' : 'normal', fontSize);
    const lineas = doc.splitTextToSize(texto.trim(), PDF_CONTENT_W);
    const alto = lineas.length * (fontSize * 0.42) + 2;
    this.asegurarEspacio(alto);
    const xPos = align === 'center' ? PDF_PAGE.w / 2 : this.x;
    doc.text(lineas, xPos, this.y, { align, maxWidth: PDF_CONTENT_W });
    this.y += alto;
  }

  /** Párrafo centrado compacto (departamento, subtítulos cortos). */
  parrafoCentrado(texto, fontSize = PDF_FONT.body) {
    if (!texto?.trim()) return;
    const { doc } = this;
    const lineas = doc.splitTextToSize(texto.trim(), PDF_CONTENT_W);
    const alto = lineas.length * (fontSize * 0.4) + 1;
    this.asegurarEspacio(alto);
    this.aplicarFuente('normal', fontSize);
    doc.text(lineas, PDF_PAGE.w / 2, this.y, { align: 'center', maxWidth: PDF_CONTENT_W });
    this.y += alto;
  }

  lineaHorizontal() {
    this.asegurarEspacio(4);
    this.doc.setDrawColor(...PDF_COLORS.border);
    this.doc.line(this.x, this.y, this.x + PDF_CONTENT_W, this.y);
    this.y += 4;
  }

  espacio(mm = 4) {
    this.y += mm;
  }

  tablaClaveValor(filas) {
    const { doc } = this;
    const labelW = 52;
    const rowH = 6.5;
    filas.forEach(([label, value]) => {
      const val = String(value || '—');
      const lineas = doc.splitTextToSize(val, PDF_CONTENT_W - labelW - 4);
      const alto = Math.max(rowH, lineas.length * 4.2 + 2);
      this.asegurarEspacio(alto + 1);
      doc.setFillColor(...PDF_COLORS.headerBg);
      doc.rect(this.x, this.y - 4, labelW, alto, 'F');
      doc.setDrawColor(...PDF_COLORS.border);
      doc.rect(this.x, this.y - 4, PDF_CONTENT_W, alto);
      this.aplicarFuente('bold', PDF_FONT.table);
      doc.text(label, this.x + 2, this.y);
      this.aplicarFuente('normal', PDF_FONT.table);
      doc.text(lineas, this.x + labelW + 2, this.y);
      this.y += alto;
    });
    this.y += 2;
  }

  tablaDatosPares(filas) {
    if (!filas.length) return;
    const { doc } = this;
    const cols = [38, 52, 38, 52];
    const total = cols.reduce((a, b) => a + b, 0);
    const escala = PDF_CONTENT_W / total;
    const widths = cols.map((w) => w * escala);
    const fontSize = PDF_FONT.table;

    filas.forEach((row) => {
      let maxLines = 1;
      const celdas = row.map((cell, i) => {
        const lines = doc.splitTextToSize(String(cell ?? ''), widths[i] - 3);
        maxLines = Math.max(maxLines, lines.length);
        return lines;
      });
      const rowH = maxLines * 3.8 + 4;
      if (this.y + rowH > this.maxY) {
        this.nuevaPagina();
      }
      let cx = this.x;
      celdas.forEach((lines, i) => {
        const isLabel = i % 2 === 0;
        doc.setDrawColor(...PDF_COLORS.border);
        if (isLabel) {
          doc.setFillColor(...PDF_COLORS.labelBg);
          doc.rect(cx, this.y - 4, widths[i], rowH, 'FD');
          this.aplicarFuente('bold', fontSize);
        } else {
          doc.rect(cx, this.y - 4, widths[i], rowH);
          this.aplicarFuente('normal', fontSize);
        }
        doc.text(lines, cx + 2, this.y);
        cx += widths[i];
      });
      this.y += rowH;
    });
    this.y += 3;
  }

  tablaDatos(headers, rows, anchos) {
    if (!rows.length) return;
    const { doc } = this;
    const total = anchos.reduce((a, b) => a + b, 0);
    const escala = PDF_CONTENT_W / total;
    const cols = anchos.map((w) => w * escala);
    const headerH = 8;
    const fontSize = PDF_FONT.table;

    const dibujarHeader = () => {
      let cx = this.x;
      doc.setFillColor(...PDF_COLORS.green);
      doc.rect(this.x, this.y - 5, PDF_CONTENT_W, headerH, 'F');
      this.aplicarFuente('bold', fontSize);
      doc.setTextColor(...PDF_COLORS.white);
      headers.forEach((h, i) => {
        const lines = doc.splitTextToSize(h, cols[i] - 2);
        doc.text(lines, cx + 1, this.y);
        cx += cols[i];
      });
      doc.setTextColor(...PDF_COLORS.text);
      this.y += headerH;
    };

    dibujarHeader();

    rows.forEach((row) => {
      let maxLines = 1;
      const celdas = row.map((cell, i) => {
        const lines = doc.splitTextToSize(String(cell ?? ''), cols[i] - 2);
        maxLines = Math.max(maxLines, lines.length);
        return lines;
      });
      const rowH = maxLines * 3.6 + 3;
      if (this.y + rowH > this.maxY) {
        this.nuevaPagina();
        dibujarHeader();
      }
      let cx = this.x;
      doc.setDrawColor(...PDF_COLORS.border);
      this.aplicarFuente('normal', fontSize);
      celdas.forEach((lines, i) => {
        doc.rect(cx, this.y - 4, cols[i], rowH);
        doc.text(lines, cx + 1, this.y);
        cx += cols[i];
      });
      this.y += rowH;
    });
    this.y += 3;
  }

  listaViñetas(puntos) {
    const items = (puntos || []).map(textoPunto).filter(Boolean);
    if (!items.length) return;
    const { doc } = this;
    items.forEach((texto) => {
      const lineas = doc.splitTextToSize(texto, PDF_CONTENT_W - 8);
      const alto = lineas.length * 4 + 2;
      this.asegurarEspacio(alto);
      this.aplicarFuente('normal', PDF_FONT.body);
      doc.text('✓', this.x, this.y);
      doc.text(lineas, this.x + 5, this.y);
      this.y += alto;
    });
  }

  tituloCentrado(texto) {
    this.asegurarEspacio(10);
    const { doc } = this;
    this.aplicarFuente('bold', PDF_FONT.title);
    doc.text(texto, PDF_PAGE.w / 2, this.y, { align: 'center' });
    this.y += 8;
  }

  barraTituloContenedor(titulo) {
    this.asegurarEspacio(10);
    const { doc } = this;
    const h = 8;
    doc.setFillColor(...PDF_COLORS.labelBg);
    doc.setDrawColor(...PDF_COLORS.border);
    doc.rect(this.x, this.y - 5, PDF_CONTENT_W, h, 'FD');
    this.aplicarFuente('bold', PDF_FONT.title);
    doc.text(titulo, PDF_PAGE.w / 2, this.y, { align: 'center' });
    this.y += h + 2;
  }

  /** Barra oscura con leyenda (estilo Word bajo las fotos). */
  leyendaBloqueFotos(texto, x = this.x, ancho = PDF_CONTENT_W) {
    if (!texto?.trim()) return;
    const h = 5.5;
    const { doc } = this;
    doc.setFillColor(35, 35, 35);
    doc.rect(x, this.y, ancho, h, 'F');
    doc.setTextColor(255, 255, 255);
    this.aplicarFuente('normal', PDF_FONT.caption);
    doc.text(texto.trim(), x + ancho / 2, this.y + 3.8, { align: 'center' });
    doc.setTextColor(...PDF_COLORS.text);
    this.y += h + 2;
  }

  async grillaFotos(imagenes, columnas = 3, anchoCelda = null, altoCelda = 42, opciones = {}) {
    const lista = (imagenes || []).filter(Boolean);
    if (!lista.length) return;

    const {
      sinCaption = false,
      leyendasPorCelda = null,
      leyendaFila = null,
    } = opciones;

    const gap = 3;
    const cols = Math.max(1, columnas);
    const cellW = anchoCelda || (PDF_CONTENT_W - gap * (cols - 1)) / cols;
    const leyendaH = leyendaFila ? 7.5 : leyendasPorCelda ? 7.5 : 0;

    for (let i = 0; i < lista.length; i += cols) {
      const slice = lista.slice(i, i + cols);
      let maxCaptionH = 0;
      const captions = slice.map((img, idx) => {
        if (leyendaFila || leyendasPorCelda) return [];
        if (sinCaption) return [];
        const cap = captionImagenPdf(img);
        const lines = cap ? this.doc.splitTextToSize(cap, cellW - 2) : [];
        maxCaptionH = Math.max(maxCaptionH, lines.length * 3.2);
        return lines;
      });
      const bloqueH = altoCelda + maxCaptionH + leyendaH + 4;
      this.asegurarEspacio(bloqueH);

      const filaY = this.y;
      for (let c = 0; c < slice.length; c++) {
        const img = slice[c];
        const cx = this.x + c * (cellW + gap);
        const data = await imagenInformeABase64(img);
        this.doc.setDrawColor(...PDF_COLORS.border);
        this.doc.rect(cx, filaY, cellW, altoCelda);
        if (data) {
          try {
            const fmt = detectarFormatoImagen(data);
            this.doc.addImage(data, fmt, cx + 0.5, filaY + 0.5, cellW - 1, altoCelda - 1);
          } catch {
            this.doc.setFontSize(7);
            this.doc.text('Imagen no disponible', cx + 2, filaY + altoCelda / 2);
          }
        } else {
          this.doc.setFontSize(7);
          this.doc.setTextColor(...PDF_COLORS.muted);
          this.doc.text('Sin imagen', cx + cellW / 2, filaY + altoCelda / 2, { align: 'center' });
          this.doc.setTextColor(...PDF_COLORS.text);
        }
        const capLines = captions[c];
        if (capLines.length) {
          this.aplicarFuente('normal', PDF_FONT.caption);
          this.doc.text(capLines, cx + cellW / 2, filaY + altoCelda + 3, { align: 'center' });
        }
      }

      this.y = filaY + altoCelda + 1;
      if (leyendaFila) {
        this.leyendaBloqueFotos(leyendaFila);
      } else if (leyendasPorCelda) {
        for (let c = 0; c < slice.length; c++) {
          const cx = this.x + c * (cellW + gap);
          this.leyendaBloqueFotos(leyendasPorCelda[c] || '', cx, cellW);
        }
      } else {
        this.y += maxCaptionH + 3;
      }
    }
  }

  async imagenCentrada(dataUrl, altoMax = 44) {
    if (!dataUrl) return;
    const imgW = PDF_CONTENT_W * 0.88;
    const imgX = (PDF_PAGE.w - imgW) / 2;
    this.asegurarEspacio(altoMax + 6);
    try {
      const fmt = detectarFormatoImagen(dataUrl);
      this.doc.addImage(dataUrl, fmt, imgX, this.y, imgW, altoMax);
      this.y += altoMax + 6;
    } catch {
      this.parrafo('(Imagen no disponible)', { fontSize: PDF_FONT.caption });
    }
  }

  async imagenAnchoCompleto(dataUrl, altoMax = 55) {
    if (!dataUrl) return;
    this.asegurarEspacio(altoMax + 4);
    try {
      const fmt = detectarFormatoImagen(dataUrl);
      this.doc.addImage(dataUrl, fmt, this.x, this.y, PDF_CONTENT_W, altoMax);
      this.y += altoMax + 4;
    } catch {
      this.parrafo('(Imagen no disponible)', { fontSize: 8 });
    }
  }

  piePagina() {
    const { doc } = this;
    this.aplicarFuente('normal', PDF_FONT.caption);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(String(this.page), PDF_PAGE.w - PDF_MARGINS.right, PDF_PAGE.h - 8, { align: 'right' });
    doc.setTextColor(...PDF_COLORS.text);
  }

  finalizarPaginas() {
    const total = this.doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p);
      this.page = p;
      if (p >= 1) this.piePagina();
    }
  }
}

async function paginaPortada(layout, formData) {
  const { doc } = layout;
  const barH = PDF_HEADER.barH;

  layout.encabezadoSupervision();

  const solicitudY = barH + PDF_HEADER.espacioContenido;
  layout.aplicarFuente('bold', PDF_FONT.body);
  const solicitudLinea = `Número de solicitud: ${formData.numeroSolicitud || '—'}`;
  doc.text(solicitudLinea, PDF_PAGE.w / 2, solicitudY, { align: 'center' });

  // Zona central: foto del barco (cuadro rojo del mockup)
  const portadaData = await assetImportadoABase64(portadaFoto);
  const imgW = PDF_CONTENT_W * 0.88;
  const imgH = 100;
  const fotoY = solicitudY + 12;
  const imgX = (PDF_PAGE.w - imgW) / 2;
  if (portadaData) {
    try {
      const fmt = detectarFormatoImagen(portadaData);
      doc.addImage(portadaData, fmt, imgX, fotoY, imgW, imgH);
    } catch {
      /* imagen opcional */
    }
  }

  // Zona inferior: creador + datos (cuadro rojo inferior)
  const bloquePieH = 36;
  layout.y = PDF_PAGE.h - PDF_MARGINS.bottom - bloquePieH;
  layout.lineaDoradaPortada(true);
  let yPie = layout.y;
  yPie = layout.textoCentrado('SEGUROS BOLÍVAR S.A.', yPie, {
    fontSize: PDF_FONT.title,
    bold: true,
  });
  yPie = layout.textoCentrado(`Creado por: ${formData.creadoPor || '—'}`, yPie);
  yPie = layout.textoCentrado(`Email: ${formData.emailCreador || '—'}`, yPie);
  layout.textoCentrado(`Fecha: ${formatearFechaLarga(formData.fechaInforme)}`, yPie);

  layout.usarEncabezado = true;
}

function paginaDatosEIntroduccion(layout, formData, responsables, informe) {
  layout.nuevaPagina();

  layout.parrafoCentrado(
    formData.departamentoInforme || 'Departamento de Ingeniería y Control de Riesgos - Seguros Bolívar S.A.'
  );
  layout.espacio(6);

  layout.tablaDatosGeneralesWord([
    ['Nombre o Razón Social:', formData.asgrBenfcro],
    ['Actividad:', formData.actividad],
    ['Solicitado:', formData.funcAsgrdraNombre],
    ['Fecha Asignación', formatearFechaMayus(formData.fchaAsgncion)],
    ['Ciudad del Riesgo:', formData.ciudadRiesgo],
    ['Labor Realizada:', formData.laborRealizada],
    ['Lugar:', formData.lugar],
    ['Fecha Inspección:', formatearFechaMayus(formData.fchaInspccion)],
    ['Inspector:', obtenerInspector(formData, responsables)],
    ['Consecutivo:', formData.consecutivo],
  ]);

  layout.espacio(8);
  layout.tituloNumerado(1, 'Introducción');
  if (informe.introduccion) layout.parrafo(informe.introduccion);
  if (informe.proposito) {
    layout.espacio(4);
    layout.parrafo(informe.proposito);
  }
}

async function seccionBuque(layout, informe) {
  layout.nuevaPagina();
  const buque = informe.buque || {};

  layout.tituloNumerado(2, 'Particularidades del buque');
  layout.espacio(3);

  if (buque.imagenBuque) {
    const data = await imagenInformeABase64(buque.imagenBuque);
    await layout.imagenCentrada(data, 50);
    layout.espacio(4);
  }

  layout.tablaCaracteristicasBarco([
    ['ORIGEN', buque.origen],
    ['PUERTO DE EMBARQUE', buque.puertoEmbarque],
    ['PUERTO DE DESCARGUE', buque.puertoDescargue],
    ['NOMBRE', buque.nombre],
    ['BANDERA', buque.bandera],
    ['TIPO DE BUQUE', buque.tipoBuque],
    ['IMO NRO.', buque.imo],
    ['TONELAJE BRUTO', buque.tonelajeBruto],
    ['PESO MUERTO', buque.pesoMuerto],
    ['ESLORA X MANGA', buque.esloraManga],
    ['AÑO DE CONSTRUCCIÓN', buque.anioConstruccion],
    ['FECHA DE ARRIBO', formatearFechaCorta(buque.fechaArribo)],
  ]);
}

function seccionMercancia(layout, informe) {
  const { lineas, total } = resumenMercancia(informe);

  layout.espacio(8);
  layout.tituloNumerado(3, 'Información general');
  layout.espacio(3);
  layout.tablaMercanciaWord(lineas, total);

  if (informe.contenidoCajasNota) {
    layout.espacio(2);
    layout.parrafo(informe.contenidoCajasNota, { fontSize: PDF_FONT.body });
  }
}

async function seccionFotosMercancia(layout, informe) {
  const bloque = prepararFotosSeccion3Mercancia(informe);
  if (!bloque.tieneFotos) return;

  layout.espacio(6);
  layout.barraTituloContenedor('Contenido de las cajas');

  if (bloque.fila1.length) {
    await layout.grillaFotos(bloque.fila1, 2, null, 38, {
      sinCaption: true,
      leyendaFila: 'Contenido de las cajas',
    });
  }

  if (bloque.fila2.length) {
    await layout.grillaFotos(bloque.fila2, 2, null, 38, {
      leyendasPorCelda: bloque.leyendasFila2,
    });
  }

  layout.espacio(4);
  return bloque.extras;
}

function seccionSupervisionTabla(layout, informe) {
  layout.espacio(6);
  layout.tituloNumerado(4, 'Reporte de supervisión');
  layout.espacio(2);
  layout.subtitulo('Seguimiento contenedor');

  const filas = aplanarSeguimiento(informe.seguimiento);
  const headers = [
    'Fecha',
    'Ingreso veh.',
    'Placa',
    'Descargue',
    'Bultos',
    'Cant.',
    'Tipo',
    'N° Cont.',
    'Llenado',
    'Sellos',
  ];
  const rows = filas.length
    ? filas.map((f) => [
        f.fecha,
        f.ingreso,
        f.placa,
        f.descargue,
        f.bultos,
        f.cantidad,
        f.tipo,
        f.numero,
        f.llenado,
        f.sellos,
      ])
    : [['', '', '', '', '', '', '', '', '', '']];

  layout.tablaDatos(headers, rows, [14, 22, 14, 20, 12, 10, 14, 20, 20, 16]);
}

async function seccionSupervisionBloques(layout, informe, extrasMercancia = null) {
  if (informe.comentariosSupervision) {
    layout.tituloSeccion('Comentarios', true);
    layout.parrafo(informe.comentariosSupervision);
    layout.espacio(4);
  }

  const fotosInicial = agruparFotosSupervisionInicial(informe.imagenesRegistroInicialSupervision);
  const numCont = calcularNumContenedoresMercancia(informe.lineasMercancia);
  const contenedoresExtra = [
    ...(extrasMercancia?.contenedores || []),
    ...fotosInicial.contenedores,
  ];
  const vehiculosExtra = [
    ...(extrasMercancia?.vehiculos || []),
    ...fotosInicial.vehiculos,
  ];

  if (contenedoresExtra.length) {
    layout.barraTituloContenedor(
      numCont > 0 ? `Contenedores asignados apto (${numCont})` : 'Contenedores asignados apto'
    );
    await layout.grillaFotos(contenedoresExtra, 4, null, 36);
    layout.espacio(3);
  }
  if (vehiculosExtra.length) {
    layout.barraTituloContenedor('Vehículos asignados con sus sellos de seguridad');
    await layout.grillaFotos(vehiculosExtra, 3, null, 40);
    layout.espacio(3);
  }
  if (fotosInicial.bodega.length) {
    layout.barraTituloContenedor('Carga almacenada en Bodega 9');
    await layout.grillaFotos(fotosInicial.bodega, 3, null, 40);
    layout.espacio(3);
  }

  const bloques = [
    {
      titulo: 'Condición de la carga',
      texto: informe.condicionCargaTexto,
      imgs: informe.imagenesCondicionCarga,
      cols: 3,
      alto: 38,
    },
    {
      titulo: 'Durante la inspección de arribo se observó',
      texto: informe.inspeccionArriboIntro,
      puntos: informe.inspeccionArriboPuntos,
      imgs: informe.imagenesInspeccionArribo,
      cols: 3,
    },
    {
      titulo: 'Equipos usados en la operación de cargue/descargue',
      texto: informe.equiposOperacionIntro,
      puntos: informe.equiposOperacionPuntos,
      imgs: informe.imagenesEquiposOperacion,
      cols: 3,
    },
    {
      titulo: 'Condiciones meteorológicas durante el descargue',
      texto: informe.condicionesMeteoTexto,
      imgs: informe.imagenesCondicionesMeteo,
      cols: 3,
    },
  ];

  for (const bloque of bloques) {
    const tieneContenido =
      bloque.texto ||
      bloque.puntos?.length ||
      bloque.imgs?.length;
    if (!tieneContenido) continue;

    layout.tituloSeccion(bloque.titulo, true);
    if (bloque.texto) layout.parrafo(bloque.texto);
    if (bloque.puntos?.length) layout.listaViñetas(bloque.puntos);
    if (bloque.imgs?.length) {
      await layout.grillaFotos(bloque.imgs, bloque.cols, null, bloque.alto || 42);
    }
    layout.espacio(4);
  }
}

async function seccionConclusiones(layout, informe) {
  const tieneAlgo =
    informe.conclusionesTexto ||
    informe.conclusionesPuntos?.length ||
    informe.registrosFotograficosContenedores?.length;
  if (!tieneAlgo) return;

  layout.tituloSeccion('Conclusiones y comentarios', true);
  if (informe.conclusionesTexto) layout.parrafo(informe.conclusionesTexto);
  layout.listaViñetas(informe.conclusionesPuntos);

  const registros = informe.registrosFotograficosContenedores || [];
  if (registros.length) {
    layout.espacio(4);
    layout.tituloCentrado('REGISTRO FOTOGRÁFICO');
    for (const reg of registros) {
      const titulo =
        reg.titulo ||
        (reg.numeroContenedor
          ? `N° Contenedor ${reg.numeroContenedor} con sellos de seguridad`
          : 'Contenedor');
      layout.barraTituloContenedor(titulo);
      await layout.grillaFotos(reg.imagenes, 3, null, 48);
      layout.espacio(4);
    }
  }
}

function seccionContacto(layout) {
  layout.asegurarEspacio(40);
  layout.parrafo(CONTACTO_BOLIVAR.intro, { fontSize: PDF_FONT.body });
  layout.espacio(4);
  layout.parrafo(CONTACTO_BOLIVAR.nombre, { fontSize: PDF_FONT.title, bold: true });
  layout.parrafo(CONTACTO_BOLIVAR.cargo, { fontSize: PDF_FONT.body });
  layout.parrafo(CONTACTO_BOLIVAR.gerencia, { fontSize: PDF_FONT.body });
  layout.parrafo(CONTACTO_BOLIVAR.empresa, { fontSize: PDF_FONT.body });
  layout.parrafo(CONTACTO_BOLIVAR.email, { fontSize: PDF_FONT.body });
}

/**
 * Genera y descarga el PDF del informe de exportación (formato Word Seguros Bolívar).
 */
export async function generarPdfInformeExportacion(
  formData,
  { aseguradoraOptions = [], responsables = [] } = {}
) {
  const informe = formData.informeExportacion || {};
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await registrarFuentesPdf(doc);
  const logoDataUrl = await assetImportadoABase64(logoBolivar);
  const layout = new PdfLayout(doc, logoDataUrl);

  await paginaPortada(layout, formData);
  paginaDatosEIntroduccion(layout, formData, responsables, informe);
  await seccionBuque(layout, informe);
  seccionMercancia(layout, informe);
  const extrasFotosMercancia = await seccionFotosMercancia(layout, informe);
  seccionSupervisionTabla(layout, informe);
  await seccionSupervisionBloques(layout, informe, extrasFotosMercancia);
  await seccionConclusiones(layout, informe);
  seccionContacto(layout);

  layout.finalizarPaginas();

  const nombreBase =
    formData.consecutivo ||
    formData.numeroSolicitud ||
    `informe-exportacion-${Date.now()}`;
  const nombreArchivo = `Reporte Supervisión Exportación - ${nombreBase}.pdf`;
  doc.save(nombreArchivo);
  return nombreArchivo;
}
