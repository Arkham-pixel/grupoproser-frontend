import { jsPDF } from 'jspdf';
import portadaFoto from '../img/Captura de pantalla 2026-06-17 092246.png';
import logoBolivar from '../img/seguros-bolivar.png';
import { registrarFuentesPdf, familiaPdf } from './puertosCasoPdfFonts';
import {
  PDF_COLORS,
  PDF_CONTENT_W,
  PDF_FONT,
  PDF_HEADER,
  PDF_MARGINS,
  PDF_PAGE,
  construirSeguimientoConsolidado,
  puntosComentariosSupervision,
  SEGUIMIENTO_COLS_MM,
  assetImportadoABase64,
  detectarFormatoImagen,
  formatearFechaCorta,
  formatearFechaLarga,
  formatearFechaMayus,
  imagenInformeABase64,
  obtenerInspector,
  resumenMercancia,
  construirMercanciaConsolidada,
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

  /**
   * Tabla DESCRIPCIÓN DE LA MERCANCÍA consolidada (como el Word de referencia):
   * una subfila por producto con su cantidad, y N° contenedores, B/L, tipo de
   * carga y destino combinados verticalmente cuando el caso los comparte.
   */
  tablaMercanciaWord(lineas, total) {
    const { doc } = this;
    const { productos, grupos } = construirMercanciaConsolidada(lineas);

    const anchosMm = [18, 22, 56, 20, 32, 32];
    const escala = PDF_CONTENT_W / anchosMm.reduce((a, b) => a + b, 0);
    const cols = anchosMm.map((w) => w * escala);
    const colX = [];
    cols.reduce((acc, w, i) => {
      colX[i] = acc;
      return acc + w;
    }, this.x);

    const fontSize = PDF_FONT.table;
    const lineH = 3.8;
    const padV = 4;
    const tituloH = 8;
    const totalRowH = 7;

    const headers = ['N° CONTENEDORES', 'B/L N°', 'PRODUCTO', 'CANTIDAD', 'TIPO DE CARGA', 'DESTINO'];
    this.aplicarFuente('bold', fontSize);
    const headerLines = headers.map((h, i) => doc.splitTextToSize(h, cols[i] - 2));
    const headerH = Math.max(
      8,
      Math.max(...headerLines.map((l) => l.length)) * lineH + padV
    );

    this.aplicarFuente('normal', fontSize);
    const prodLines = productos.map((p) =>
      p.producto ? doc.splitTextToSize(p.producto, cols[2] - 3) : []
    );
    const cantLines = productos.map((p) =>
      p.cantidad ? doc.splitTextToSize(p.cantidad, cols[3] - 2) : []
    );
    const alturas = productos.map((_, i) =>
      Math.max(lineH + padV, Math.max(prodLines[i].length, cantLines[i].length) * lineH + padV)
    );

    const gruposCol = [
      { col: 0, lista: grupos.numCont },
      { col: 1, lista: grupos.bl },
      { col: 4, lista: grupos.tipoCarga },
      { col: 5, lista: grupos.destino },
    ].map(({ col, lista }) => ({
      col,
      lista: lista.map((g) => ({
        ...g,
        lines: g.valor ? doc.splitTextToSize(g.valor, cols[col] - 3) : [],
      })),
    }));
    gruposCol.forEach(({ lista }) =>
      lista.forEach((g) => {
        const necesario = Math.max(lineH + padV, g.lines.length * lineH + padV);
        let actual = 0;
        for (let i = g.inicio; i <= g.fin; i++) actual += alturas[i];
        if (actual < necesario) alturas[g.fin] += necesario - actual;
      })
    );

    const altoTabla =
      tituloH + headerH + alturas.reduce((a, b) => a + b, 0) + totalRowH;
    this.asegurarEspacio(altoTabla + 2);

    const y0 = this.y - 4.5;

    // Título y encabezados: verde oscuro con texto blanco (como el Word).
    doc.setFillColor(...PDF_COLORS.green);
    doc.setDrawColor(...PDF_COLORS.white);
    doc.setLineWidth(0.2);
    doc.rect(this.x, y0, PDF_CONTENT_W, tituloH, 'FD');
    this.aplicarFuente('bold', fontSize + 1);
    doc.setTextColor(...PDF_COLORS.white);
    doc.text('DESCRIPCIÓN DE LA MERCANCÍA', PDF_PAGE.w / 2, y0 + tituloH / 2 + 1.3, {
      align: 'center',
    });

    const yHeader = y0 + tituloH;
    this.aplicarFuente('bold', fontSize);
    doc.setTextColor(...PDF_COLORS.white);
    headers.forEach((_, i) => {
      doc.setFillColor(...PDF_COLORS.green);
      doc.rect(colX[i], yHeader, cols[i], headerH, 'FD');
      const lines = headerLines[i];
      const sy = yHeader + headerH / 2 - ((lines.length - 1) * lineH) / 2 + 1.3;
      doc.text(lines, colX[i] + cols[i] / 2, sy, { align: 'center' });
    });
    doc.setTextColor(...PDF_COLORS.text);

    const rowY = [];
    let acc = yHeader + headerH;
    alturas.forEach((h, i) => {
      rowY[i] = acc;
      acc += h;
    });

    const celda = (x, y, w, h, lines) => {
      doc.setDrawColor(...PDF_COLORS.border);
      doc.setLineWidth(0.2);
      doc.rect(x, y, w, h);
      if (!lines.length) return;
      this.aplicarFuente('normal', fontSize);
      const sy = y + h / 2 - ((lines.length - 1) * lineH) / 2 + 1.3;
      doc.text(lines, x + w / 2, sy, { align: 'center' });
    };

    productos.forEach((_, i) => {
      celda(colX[2], rowY[i], cols[2], alturas[i], prodLines[i]);
      celda(colX[3], rowY[i], cols[3], alturas[i], cantLines[i]);
    });
    gruposCol.forEach(({ col, lista }) => {
      lista.forEach((g) => {
        let h = 0;
        for (let i = g.inicio; i <= g.fin; i++) h += alturas[i];
        celda(colX[col], rowY[g.inicio], cols[col], h, g.lines);
      });
    });

    // Fila Total: etiqueta combinada hasta PRODUCTO, valor en CANTIDAD.
    const yTotal = acc;
    const wIzq = cols[0] + cols[1] + cols[2];
    doc.setFillColor(...PDF_COLORS.labelBg);
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.2);
    doc.rect(this.x, yTotal, wIzq, totalRowH, 'FD');
    this.aplicarFuente('bold', fontSize);
    doc.text('Total', this.x + wIzq - 2, yTotal + totalRowH / 2 + 1.3, { align: 'right' });
    doc.rect(colX[3], yTotal, cols[3], totalRowH);
    doc.text(total > 0 ? `${total} UDS` : '—', colX[3] + cols[3] / 2, yTotal + totalRowH / 2 + 1.3, {
      align: 'center',
    });
    doc.rect(colX[4], yTotal, cols[4] + cols[5], totalRowH);

    this.y = yTotal + totalRowH + 4.5 + 3;
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
  layout.barraTituloContenedor('Contenido de la mercancía');

  if (bloque.fila1.length) {
    await layout.grillaFotos(bloque.fila1, 2, null, 38, {
      sinCaption: true,
      leyendaFila: 'Contenido de la mercancía',
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

/**
 * Tabla de seguimiento consolidada (como el Word de referencia):
 * - Encabezado verde de dos niveles (Descargue y Llenado con Inicio/Final).
 * - Celdas del vehículo combinadas verticalmente sobre sus porciones de carga.
 * - Contenedor compartido entre dos vehículos: celdas combinadas y bultos por vehículo.
 * - Fila final COMENTARIOS con viñetas dentro de la misma tabla.
 */
function dibujarTablaSeguimientoConsolidada(layout, informe) {
  const { doc } = layout;
  const { filas, vehiculos, contenedores } = construirSeguimientoConsolidado(
    informe.seguimiento || []
  );

  const escala = PDF_CONTENT_W / SEGUIMIENTO_COLS_MM.reduce((a, b) => a + b, 0);
  const cols = SEGUIMIENTO_COLS_MM.map((w) => w * escala);
  const colX = [];
  cols.reduce((acc, w, i) => {
    colX[i] = acc;
    return acc + w;
  }, layout.x);

  const fontSize = PDF_FONT.table;
  const lineH = 3.8;
  const padV = 4;
  const headerRowH = 7;

  const anchoCols = (desde, hasta) => {
    let total = 0;
    for (let i = desde; i <= hasta; i++) total += cols[i];
    return total;
  };

  const celdaHeader = (x, y, w, h, texto) => {
    doc.setFillColor(...PDF_COLORS.green);
    doc.setDrawColor(...PDF_COLORS.white);
    doc.setLineWidth(0.2);
    doc.rect(x, y, w, h, 'FD');
    layout.aplicarFuente('bold', fontSize);
    doc.setTextColor(...PDF_COLORS.white);
    const lines = doc.splitTextToSize(texto, w - 2);
    const startY = y + h / 2 - ((lines.length - 1) * lineH) / 2 + 1.3;
    doc.text(lines, x + w / 2, startY, { align: 'center' });
    doc.setTextColor(...PDF_COLORS.text);
  };

  const dibujarHeader = () => {
    const y0 = layout.y - 4.5;
    const hTotal = headerRowH * 2;
    celdaHeader(colX[0], y0, cols[0], hTotal, 'Fecha - Hora Ingreso Vehículo');
    celdaHeader(colX[1], y0, cols[1], hTotal, 'Placa vehículos');
    celdaHeader(colX[2], y0, anchoCols(2, 3), headerRowH, 'Descargue');
    celdaHeader(colX[2], y0 + headerRowH, cols[2], headerRowH, 'Inicio');
    celdaHeader(colX[3], y0 + headerRowH, cols[3], headerRowH, 'Final');
    celdaHeader(colX[4], y0, cols[4], hTotal, 'Bultos');
    celdaHeader(colX[5], y0, cols[5], hTotal, 'Cantidad');
    celdaHeader(colX[6], y0, cols[6], hTotal, 'N° Contenedor');
    celdaHeader(colX[7], y0, anchoCols(7, 8), headerRowH, 'Llenado de contenedores');
    celdaHeader(colX[7], y0 + headerRowH, cols[7], headerRowH, 'Inicio');
    celdaHeader(colX[8], y0 + headerRowH, cols[8], headerRowH, 'Final');
    celdaHeader(colX[9], y0, cols[9], hTotal, 'Sellos de Seguridad');
    layout.y += hTotal;
  };

  const lineasDe = (texto, colIdx) =>
    String(texto ?? '').trim()
      ? doc.splitTextToSize(String(texto).trim(), cols[colIdx] - 2)
      : [];

  // Contenido por celda combinada (líneas ya partidas al ancho de su columna).
  const contenidoVeh = vehiculos.map((v) => ({
    ingreso: v.lineasIngreso.flatMap((l) => doc.splitTextToSize(l, cols[0] - 2)),
    placa: lineasDe(v.placa, 1),
    descIni: lineasDe(v.descargueInicio, 2),
    descFin: lineasDe(v.descargueFin, 3),
  }));
  const contenidoCont = contenedores.map((c) => ({
    cantidad: lineasDe(c.cantidad, 5),
    numero: lineasDe(c.numero, 6),
    llenIni: lineasDe(c.llenadoInicio, 7),
    llenFin: lineasDe(c.llenadoFin, 8),
    sellos: c.sellos.flatMap((s) => doc.splitTextToSize(s, cols[9] - 2)),
  }));
  const contenidoBultos = filas.map((f) => lineasDe(f.bultos, 4));

  // Altura por fila: mínimo por bultos; luego se expande la última fila de cada
  // grupo (vehículo/contenedor) para que el contenido combinado quepa.
  const alturas = filas.map((_, i) =>
    Math.max(lineH + padV, contenidoBultos[i].length * lineH + padV)
  );
  const expandirGrupo = (inicio, fin, lineasMax) => {
    const necesario = Math.max(lineH + padV, lineasMax * lineH + padV);
    let actual = 0;
    for (let i = inicio; i <= fin; i++) actual += alturas[i];
    if (actual < necesario) alturas[fin] += necesario - actual;
  };
  vehiculos.forEach((v, vi) => {
    const c = contenidoVeh[vi];
    expandirGrupo(
      v.inicio,
      v.fin,
      Math.max(c.ingreso.length, c.placa.length, c.descIni.length, c.descFin.length)
    );
  });
  contenedores.forEach((c, ci) => {
    const t = contenidoCont[ci];
    expandirGrupo(
      c.inicio,
      c.fin,
      Math.max(t.cantidad.length, t.numero.length, t.llenIni.length, t.llenFin.length, t.sellos.length)
    );
  });

  // Bloques seguros para salto de página: donde inicia vehículo y contenedor a la vez.
  const bloques = [];
  filas.forEach((f, i) => {
    const esInicioSeguro =
      i === 0 ||
      (vehiculos[f.vehIdx].inicio === i && contenedores[f.contIdx].inicio === i);
    if (esInicioSeguro) bloques.push({ inicio: i, fin: i });
    else bloques[bloques.length - 1].fin = i;
  });

  const celdaDatos = (x, y, w, h, lines, alignCentro = true) => {
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.2);
    doc.rect(x, y, w, h);
    if (!lines.length) return;
    layout.aplicarFuente('normal', fontSize);
    const startY = y + h / 2 - ((lines.length - 1) * lineH) / 2 + 1.3;
    if (alignCentro) doc.text(lines, x + w / 2, startY, { align: 'center' });
    else doc.text(lines, x + 1.5, startY);
  };

  layout.asegurarEspacio(headerRowH * 2 + (alturas[0] || 0) + 2);
  dibujarHeader();

  bloques.forEach((bloque) => {
    let altoBloque = 0;
    for (let i = bloque.inicio; i <= bloque.fin; i++) altoBloque += alturas[i];
    if (layout.y - 4.5 + altoBloque > layout.maxY) {
      layout.nuevaPagina();
      dibujarHeader();
    }

    const yBase = layout.y - 4.5;
    const rowY = [];
    let acum = yBase;
    for (let i = bloque.inicio; i <= bloque.fin; i++) {
      rowY[i] = acum;
      acum += alturas[i];
    }
    const altoRango = (inicio, fin) => {
      let total = 0;
      for (let i = inicio; i <= fin; i++) total += alturas[i];
      return total;
    };

    for (let i = bloque.inicio; i <= bloque.fin; i++) {
      const f = filas[i];
      celdaDatos(colX[4], rowY[i], cols[4], alturas[i], contenidoBultos[i]);

      const veh = vehiculos[f.vehIdx];
      if (veh.inicio === i) {
        const h = altoRango(veh.inicio, veh.fin);
        const cv = contenidoVeh[f.vehIdx];
        celdaDatos(colX[0], rowY[i], cols[0], h, cv.ingreso);
        celdaDatos(colX[1], rowY[i], cols[1], h, cv.placa);
        celdaDatos(colX[2], rowY[i], cols[2], h, cv.descIni);
        celdaDatos(colX[3], rowY[i], cols[3], h, cv.descFin);
      }

      const cont = contenedores[f.contIdx];
      if (cont.inicio === i) {
        const h = altoRango(cont.inicio, cont.fin);
        const cc = contenidoCont[f.contIdx];
        celdaDatos(colX[5], rowY[i], cols[5], h, cc.cantidad);
        celdaDatos(colX[6], rowY[i], cols[6], h, cc.numero);
        celdaDatos(colX[7], rowY[i], cols[7], h, cc.llenIni);
        celdaDatos(colX[8], rowY[i], cols[8], h, cc.llenFin);
        celdaDatos(colX[9], rowY[i], cols[9], h, cc.sellos);
      }
    }

    layout.y += altoBloque;
  });

  // Fila COMENTARIOS integrada a la tabla (viñetas, una por línea del campo).
  const puntos = puntosComentariosSupervision(informe.comentariosSupervision);
  if (puntos.length) {
    const wIzq = anchoCols(0, 3);
    const wDer = anchoCols(4, 9);
    const lineasPuntos = puntos.map((p) => doc.splitTextToSize(`•  ${p}`, wDer - 5));
    const totalLineas = lineasPuntos.reduce((a, l) => a + l.length, 0);
    const hFila = Math.max(12, totalLineas * lineH + puntos.length * 1.2 + padV);

    if (layout.y - 4.5 + hFila > layout.maxY) layout.nuevaPagina();
    const y0 = layout.y - 4.5;

    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.2);
    doc.rect(colX[0], y0, wIzq, hFila);
    doc.rect(colX[4], y0, wDer, hFila);

    layout.aplicarFuente('bold', fontSize);
    doc.text('COMENTARIOS', colX[0] + wIzq / 2, y0 + hFila / 2 + 1.3, { align: 'center' });

    layout.aplicarFuente('normal', fontSize);
    let yTexto = y0 + padV / 2 + 2.6;
    lineasPuntos.forEach((lines) => {
      doc.text(lines, colX[4] + 2.5, yTexto);
      yTexto += lines.length * lineH + 1.2;
    });

    layout.y += hFila;
  }

  layout.y += 3;
}

function seccionSupervisionTabla(layout, informe) {
  layout.espacio(6);
  layout.tituloNumerado(4, 'Reporte de supervisión');
  layout.espacio(2);
  layout.subtitulo('Seguimiento contenedor');

  dibujarTablaSeguimientoConsolidada(layout, informe);
}

async function seccionSupervisionBloques(layout, informe, extrasMercancia = null) {
  const fotosInicial = agruparFotosSupervisionInicial(informe.imagenesRegistroInicialSupervision);
  const contenedoresExtra = [
    ...(extrasMercancia?.contenedores || []),
    ...fotosInicial.contenedores,
  ];
  const vehiculosExtra = [
    ...(extrasMercancia?.vehiculos || []),
    ...fotosInicial.vehiculos,
  ];

  if (contenedoresExtra.length) {
    layout.barraTituloContenedor('Contenedor (es) asignado (s)');
    await layout.grillaFotos(contenedoresExtra, 4, null, 36);
    layout.espacio(3);
  }
  if (vehiculosExtra.length) {
    layout.barraTituloContenedor('Vehículo (s) asignado (s)');
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

/** Carga el caso por id y genera el PDF (desde el listado). */
export async function generarPdfInformeExportacionDesdeId(
  id,
  { aseguradoraOptions = [], responsables = [] } = {}
) {
  const { getPuertosCaso } = await import('./puertosService.js');
  const { normalizarCasoApiParaFormulario } = await import(
    '../components/PuertosActas/puertosCasoExportacionNormalize.js'
  );
  const caso = await getPuertosCaso(id);
  const formData = normalizarCasoApiParaFormulario(caso);
  return generarPdfInformeExportacion(formData, { aseguradoraOptions, responsables });
}
