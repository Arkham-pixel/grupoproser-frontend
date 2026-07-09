import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReporteService } from './reporteService.js';
import { REPORTE_COLORES } from './reporteMatrizEstilos.js';

const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = { left: 12, right: 12, top: 18, bottom: 22 };
const INDEX_PAGE = 2;
const HEADER_H = 14;
const FOOTER_Y = PAGE_H - 9;
const CONTENT_TOP = HEADER_H + 20;

const C = {
  primary: [220, 38, 38],
  primaryDark: [185, 28, 28],
  text: [31, 41, 55],
  muted: [107, 114, 128],
  white: [255, 255, 255],
  link: [220, 38, 38],
  green: [22, 163, 74],
  yellow: [202, 138, 4],
  orange: [234, 88, 12],
  red: [220, 38, 38],
  light: [249, 250, 251],
  border: [243, 244, 246],
};

const CATEGORIAS = [
  { key: 'estrategico', label: 'Estr.' },
  { key: 'cumplimiento', label: 'Cump.' },
  { key: 'reputacional', label: 'Rep.' },
  { key: 'operativo', label: 'Oper.' },
  { key: 'financiero', label: 'Fin.' },
  { key: 'tecnologico', label: 'Tec.' },
  { key: 'corrupcion', label: 'Corr.' },
  { key: 'ddhh', label: 'DDHH' },
];

const ORDEN_SECCIONES = [
  'informacion',
  'resumen',
  'identificacion',
  'valoracion',
  'valoracionDetalle',
  'mapa',
  'recomendaciones',
];

function extraerRiesgos(identificacion) {
  if (!identificacion) return [];
  if (Array.isArray(identificacion.riesgos)) return identificacion.riesgos;
  if (Array.isArray(identificacion.procesos)) return identificacion.procesos;
  if (Array.isArray(identificacion)) return identificacion;
  return [];
}

function extraerValoraciones(valoracion) {
  if (!valoracion) return [];
  if (Array.isArray(valoracion.valoraciones)) return valoracion.valoraciones;
  if (Array.isArray(valoracion.riesgos)) return valoracion.riesgos;
  if (Array.isArray(valoracion)) return valoracion;
  return [];
}

function truncar(texto, max = 120) {
  const t = String(texto ?? '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function colorCeldaMapa(probabilidad, impacto) {
  if (impacto === 5) {
    if (probabilidad === 1) return C.yellow;
    if (probabilidad === 2) return C.orange;
    return C.red;
  }
  if (impacto === 4) {
    if (probabilidad <= 2) return C.yellow;
    if (probabilidad === 3) return C.orange;
    return C.red;
  }
  if (impacto === 3) {
    if (probabilidad === 1) return C.green;
    if (probabilidad <= 4) return C.orange;
    return C.red;
  }
  if (impacto === 2) {
    if (probabilidad <= 3) return C.yellow;
    return C.orange;
  }
  if (impacto === 1) return C.green;
  return C.yellow;
}

function nivelColor(nivel) {
  if (nivel === 'Crítico' || nivel === 'CRÍTICO') return C.red;
  if (nivel === 'Alto' || nivel === 'ALTO') return C.orange;
  if (nivel === 'Medio' || nivel === 'TOLERABLE') return C.yellow;
  return C.green;
}

class GeneradorPdfMatriz {
  constructor(datosMatriz, tipoReporte) {
    this.datos = datosMatriz;
    this.tipoReporte = tipoReporte;
    this.doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    this.sectionPages = {};
    this.indiceItems = [];
    this.paginaContenidoLista = false;
    this.tituloSeccionActual = '';
  }

  registrarSeccion(id, titulo) {
    if (this.sectionPages[id]) return;
    const page = this.doc.internal.getNumberOfPages();
    this.sectionPages[id] = page;
    this.indiceItems.push({ id, titulo, page });
  }

  iniciarPaginaContenido() {
    if (!this.paginaContenidoLista) {
      this.doc.addPage();
      this.paginaContenidoLista = true;
    }
  }

  nuevaPaginaSeccion(titulo, subtitulo, sectionId) {
    this.iniciarPaginaContenido();
    if (this.tituloSeccionActual) {
      this.doc.addPage();
    }
    this.tituloSeccionActual = titulo;
    if (sectionId) this.registrarSeccion(sectionId, titulo);
    this.dibujarEncabezado(titulo, subtitulo);
    return CONTENT_TOP;
  }

  dibujarEncabezado(titulo, subtitulo = '') {
    const { doc } = this;
    doc.setFillColor(...C.primary);
    doc.rect(0, 0, PAGE_W, HEADER_H, 'F');
    doc.setFillColor(...C.primaryDark);
    doc.rect(PAGE_W - 48, 0, 48, HEADER_H, 'F');

    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('GRUPO PROSER', PAGE_W - 24, HEADER_H / 2 + 1, { align: 'center' });

    doc.setTextColor(...C.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(titulo, MARGIN.left, HEADER_H + 10);

    if (subtitulo) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.muted);
      doc.text(subtitulo, MARGIN.left, HEADER_H + 16);
    }
  }

  dibujarPie() {
    const { doc } = this;
    const pagina = doc.internal.getNumberOfPages();

    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(MARGIN.left, FOOTER_Y - 5, PAGE_W - MARGIN.right, FOOTER_Y - 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    doc.text(`Matriz de Riesgos · Grupo Proser · Pag. ${pagina}`, MARGIN.left, FOOTER_Y);

    const idxActual = ORDEN_SECCIONES.findIndex((id) => {
      const inicio = this.sectionPages[id];
      if (!inicio) return false;
      const siguiente = ORDEN_SECCIONES.slice(ORDEN_SECCIONES.indexOf(id) + 1)
        .map((s) => this.sectionPages[s])
        .find(Boolean);
      return pagina >= inicio && (!siguiente || pagina < siguiente);
    });

    const linkY = FOOTER_Y;
    const linkH = 5;

    doc.setTextColor(...C.link);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    const indiceTxt = 'Indice';
    const indiceW = doc.getTextWidth(indiceTxt);
    doc.textWithLink(indiceTxt, PAGE_W / 2 - indiceW / 2, linkY, { pageNumber: INDEX_PAGE });
    this.doc.link(PAGE_W / 2 - indiceW / 2 - 1, linkY - 4, indiceW + 2, linkH, {
      pageNumber: INDEX_PAGE,
    });

    if (idxActual > 0) {
      const prevId = ORDEN_SECCIONES[idxActual - 1];
      const prevTitulo = truncar(this.indiceItems.find((i) => i.id === prevId)?.titulo || 'Anterior', 28);
      doc.textWithLink(`< ${prevTitulo}`, MARGIN.left + 2, linkY, {
        pageNumber: this.sectionPages[prevId],
      });
    }

    if (idxActual >= 0 && idxActual < ORDEN_SECCIONES.length - 1) {
      const nextId = ORDEN_SECCIONES[idxActual + 1];
      if (this.sectionPages[nextId]) {
        const nextTitulo = truncar(this.indiceItems.find((i) => i.id === nextId)?.titulo || 'Siguiente', 28);
        const tw = doc.getTextWidth(`${nextTitulo} >`);
        doc.textWithLink(`${nextTitulo} >`, PAGE_W - MARGIN.right - tw, linkY, {
          pageNumber: this.sectionPages[nextId],
        });
      }
    }

    doc.setTextColor(...C.text);
    doc.setFont('helvetica', 'normal');
  }

  autoTabla(opciones) {
    const startY = opciones.startY || CONTENT_TOP;
    autoTable(this.doc, {
      ...opciones,
      startY,
      margin: { left: MARGIN.left, right: MARGIN.right, top: startY, bottom: MARGIN.bottom },
      styles: {
        fontSize: 6.5,
        cellPadding: 1.5,
        overflow: 'linebreak',
        lineColor: C.border,
        lineWidth: 0.1,
        ...opciones.styles,
      },
      headStyles: {
        fillColor: C.primary,
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 6.5,
        ...opciones.headStyles,
      },
      alternateRowStyles: { fillColor: [252, 252, 253] },
      showHead: 'everyPage',
      didDrawPage: (data) => {
        if (data.pageNumber > 0) {
          this.dibujarEncabezado(this.tituloSeccionActual, opciones.subtituloSeccion || '');
        }
        this.dibujarPie();
      },
    });
    return this.doc.lastAutoTable.finalY + 4;
  }

  portada() {
    const { doc } = this;
    const info = this.datos.informacion || {};
    const fecha = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    doc.setFillColor(...C.primary);
    doc.rect(0, 0, PAGE_W, PAGE_H * 0.55, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(0, PAGE_H * 0.55, PAGE_W, PAGE_H * 0.45, 'F');

    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.text('Matriz de Riesgos', PAGE_W / 2, 48, { align: 'center' });

    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte interactivo · Grupo Proser', PAGE_W / 2, 60, { align: 'center' });

    doc.setFontSize(11);
    doc.text(info.nombreEmpresa || 'Empresa', PAGE_W / 2, 78, { align: 'center' });
    if (info.responsable) doc.text(`Responsable: ${info.responsable}`, PAGE_W / 2, 88, { align: 'center' });
    doc.text(`Generado: ${fecha}`, PAGE_W / 2, 98, { align: 'center' });
    doc.text(`Reporte ${this.tipoReporte === 'anual' ? 'anual' : 'inicial'}`, PAGE_W / 2, 108, {
      align: 'center',
    });

    doc.setTextColor(...C.text);
    doc.setFontSize(10);
    doc.text('Documento con indice clicable, texto seleccionable y navegacion entre secciones.', PAGE_W / 2, 130, {
      align: 'center',
    });

    const btnW = 76;
    const btnH = 12;
    const btnX = PAGE_W / 2 - btnW / 2;
    const btnY = 142;
    doc.setFillColor(...C.light);
    doc.setDrawColor(...C.primary);
    doc.setLineWidth(0.4);
    doc.roundedRect(btnX, btnY, btnW, btnH, 3, 3, 'FD');
    doc.setTextColor(...C.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.textWithLink('Abrir indice interactivo', PAGE_W / 2, btnY + 8, { pageNumber: INDEX_PAGE });
    doc.link(btnX, btnY, btnW, btnH, { pageNumber: INDEX_PAGE });
  }

  reservarIndice() {
    this.doc.addPage();
    this.dibujarEncabezado('Indice interactivo', 'Navegacion del reporte');
    this.dibujarPie();
  }

  completarIndice() {
    this.doc.setPage(INDEX_PAGE);
    this.doc.setFillColor(255, 255, 255);
    this.doc.rect(0, HEADER_H, PAGE_W, PAGE_H - HEADER_H, 'F');

    this.dibujarEncabezado('Indice interactivo', 'Haga clic en una seccion para navegar');
    this.dibujarPie();

    const colW = (PAGE_W - MARGIN.left - MARGIN.right - 10) / 2;
    let y = CONTENT_TOP;

    this.indiceItems.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = MARGIN.left + col * (colW + 10);
      const cardY = y + row * 20;

      this.doc.setFillColor(...C.light);
      this.doc.setDrawColor(...C.border);
      this.doc.roundedRect(x, cardY, colW, 15, 2, 2, 'FD');

      const etiqueta = `${index + 1}. ${item.titulo}`;
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(9);
      this.doc.setTextColor(...C.primary);
      this.doc.textWithLink(etiqueta, x + 4, cardY + 6, { pageNumber: item.page });
      this.doc.link(x, cardY, colW, 15, { pageNumber: item.page });

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(...C.muted);
      this.doc.text(`Pag. ${item.page}`, x + colW - 16, cardY + 6);
    });
  }

  seccionInformacion() {
    const info = this.datos.informacion || {};
    const ingeniero = info.ingeniero || {};
    const y0 = this.nuevaPaginaSeccion('Informacion general', 'Datos de la matriz y responsables', 'informacion');

    const campos = [
      ['Empresa', info.nombreEmpresa],
      ['Responsable', info.responsable],
      ['Version', info.version],
      ['Fecha creacion', info.fechaCreacion],
      ['Ingeniero', ingeniero.nombre],
      ['Cargo', ingeniero.cargo],
      ['Telefono', ingeniero.telefono],
      ['Email', ingeniero.email],
      ['Empresa ingeniero', ingeniero.empresa],
    ].filter(([, v]) => v);

    const colW = (PAGE_W - MARGIN.left - MARGIN.right - 8) / 2;
    campos.forEach(([label, value], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = MARGIN.left + col * (colW + 8);
      const cy = y0 + row * 18;

      this.doc.setFillColor(...C.light);
      this.doc.roundedRect(x, cy, colW, 14, 2, 2, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(...C.muted);
      this.doc.text(label.toUpperCase(), x + 3, cy + 5);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      this.doc.setTextColor(...C.text);
      if (label === 'Email' && String(value).includes('@')) {
        this.doc.setTextColor(...C.link);
        this.doc.textWithLink(String(value), x + 3, cy + 11, { url: `mailto:${value}` });
      } else {
        this.doc.text(truncar(value, 52), x + 3, cy + 11);
      }
    });

    if (info.descripcion) {
      const dy = y0 + Math.ceil(campos.length / 2) * 18 + 6;
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8);
      this.doc.setTextColor(...C.text);
      this.doc.text('Descripcion', MARGIN.left, dy);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(...C.muted);
      const lineas = this.doc.splitTextToSize(info.descripcion, PAGE_W - MARGIN.left - MARGIN.right);
      this.doc.text(lineas, MARGIN.left, dy + 5);
    }

    this.dibujarPie();
  }

  seccionResumen() {
    const riesgos = extraerRiesgos(this.datos.identificacion);
    const valoraciones = extraerValoraciones(this.datos.valoracion);
    if (!riesgos.length && !valoraciones.length) return;

    const riesgosInherentes = ReporteService.calcularRiesgosInherentes(
      valoraciones,
      this.datos.valoracion
    );
    const stats = ReporteService.calcularEstadisticasValoracion(riesgosInherentes);
    const recs = this.datos.gestionRiesgos?.recomendaciones?.length || 0;

    const y0 = this.nuevaPaginaSeccion('Resumen ejecutivo', 'Indicadores clave del analisis', 'resumen');

    const tarjetas = [
      ['Riesgos identificados', riesgos.length],
      ['Valoraciones', valoraciones.length],
      ['Criticos', stats.criticos],
      ['Altos', stats.altos],
      ['Medios', stats.medios],
      ['Bajos', stats.bajos],
      ['Recomendaciones', recs],
    ];

    const tw = (PAGE_W - MARGIN.left - MARGIN.right - 36) / 7;
    tarjetas.forEach(([label, num], i) => {
      const x = MARGIN.left + i * (tw + 6);
      this.doc.setFillColor(254, 242, 242);
      this.doc.setDrawColor(...C.primary);
      this.doc.setLineWidth(0.15);
      this.doc.roundedRect(x, y0, tw, 22, 2, 2, 'FD');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(14);
      this.doc.setTextColor(...C.primary);
      this.doc.text(String(num), x + tw / 2, y0 + 11, { align: 'center' });
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...C.muted);
      this.doc.text(label, x + tw / 2, y0 + 18, { align: 'center' });
    });

    const tipos = [...new Set(riesgos.map((r) => r.tipoProceso).filter(Boolean))];
    if (tipos.length) {
      let y = y0 + 30;
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(9);
      this.doc.setTextColor(...C.text);
      this.doc.text('Tipos de proceso', MARGIN.left, y);
      y += 6;
      tipos.forEach((tipo) => {
        const count = riesgos.filter((r) => r.tipoProceso === tipo).length;
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(8);
        this.doc.text(`• ${tipo}: ${count}`, MARGIN.left + 2, y);
        y += 5;
      });
    }

    this.dibujarPie();
  }

  seccionIdentificacion() {
    const riesgos = extraerRiesgos(this.datos.identificacion);
    if (!riesgos.length) return;

    const y = this.nuevaPaginaSeccion(
      'Identificacion de riesgos',
      `${riesgos.length} riesgos · categorias marcadas con X`,
      'identificacion'
    );

    this.autoTabla({
      startY: y,
      subtituloSeccion: `${riesgos.length} riesgos identificados`,
      head: [['No.', 'Proceso', 'Tipo', 'Riesgo identificado', ...CATEGORIAS.map((c) => c.label)]],
      body: riesgos.map((r) => [
        String(r.numero ?? ''),
        truncar(r.nombreProceso, 32),
        truncar(r.tipoProceso, 16),
        truncar(r.riesgoIdentificado, 70),
        ...CATEGORIAS.map((c) => (r.categorias?.[c.key] ? 'X' : '')),
      ]),
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        1: { cellWidth: 30 },
        2: { cellWidth: 20 },
        3: { cellWidth: 78 },
      },
      styles: { fontSize: 6 },
    });
  }

  seccionValoracion() {
    const valoraciones = extraerValoraciones(this.datos.valoracion);
    if (!valoraciones.length) return;

    const y = this.nuevaPaginaSeccion(
      'Valoracion de riesgos',
      'Resumen: probabilidad, impacto y nivel',
      'valoracion'
    );

    this.autoTabla({
      startY: y,
      subtituloSeccion: `${valoraciones.length} valoraciones`,
      head: [['No.', 'Cod.', 'Riesgo', 'Proceso', 'Prob.', 'Sum.Imp.', 'Calif.', 'Nivel']],
      body: valoraciones.map((v) => {
        const prob = Number(v.probabilidad) || 0;
        const sumImp = Number(v.sumImpacto) || 1;
        const calif = prob * sumImp;
        const nivel = ReporteService.obtenerNivelRiesgo(calif).texto;
        return [
          String(v.numero ?? ''),
          `R${v.numero ?? ''}`,
          truncar(v.riesgoIdentificado, 48),
          truncar(v.nombreProceso, 30),
          String(prob),
          String(sumImp),
          String(calif),
          nivel,
        ];
      }),
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        1: { cellWidth: 11, halign: 'center' },
        7: { cellWidth: 16, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 7) {
          data.cell.styles.textColor = nivelColor(data.cell.raw);
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
  }

  seccionValoracionDetalle() {
    const valoraciones = extraerValoraciones(this.datos.valoracion);
    if (!valoraciones.length) return;

    const y = this.nuevaPaginaSeccion(
      'Valoracion detallada',
      'Causas, impacto por categoria y controles',
      'valoracionDetalle'
    );

    this.autoTabla({
      startY: y,
      subtituloSeccion: 'Detalle completo de valoracion',
      head: [
        [
          'No.',
          'Riesgo',
          'Causas probables',
          'Prob.',
          'Eco.',
          'Oper.',
          'Rep.',
          'Legal',
          'Calif.',
          'Controles?',
          'Descripcion controles',
        ],
      ],
      body: valoraciones.map((v) => {
        const prob = Number(v.probabilidad) || 0;
        const sumImp = Number(v.sumImpacto) || 1;
        return [
          String(v.numero ?? ''),
          truncar(v.riesgoIdentificado, 36),
          truncar(v.causasProbables, 40),
          String(prob),
          String(v.impactosCategoria?.economico ?? ''),
          String(v.impactosCategoria?.operativo ?? ''),
          String(v.impactosCategoria?.reputacional ?? ''),
          String(v.impactosCategoria?.legal ?? ''),
          String(prob * sumImp),
          v.controles?.existen || 'No',
          truncar(v.controles?.descripcion, 50),
        ];
      }),
      styles: { fontSize: 5.8 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        3: { cellWidth: 10, halign: 'center' },
        4: { cellWidth: 9, halign: 'center' },
        5: { cellWidth: 9, halign: 'center' },
        6: { cellWidth: 9, halign: 'center' },
        7: { cellWidth: 9, halign: 'center' },
        8: { cellWidth: 10, halign: 'center' },
        9: { cellWidth: 14, halign: 'center' },
      },
    });
  }

  seccionMapaCalor() {
    const valoraciones = extraerValoraciones(this.datos.valoracion);
    if (!valoraciones.length) return;

    const riesgosInherentes = ReporteService.calcularRiesgosInherentes(
      valoraciones,
      this.datos.valoracion
    );
    const stats = ReporteService.calcularEstadisticasValoracion(riesgosInherentes);

    const y = this.nuevaPaginaSeccion(
      'Mapa de calor',
      'Riesgo inherente · probabilidad x impacto',
      'mapa'
    );

    const cellSize = 13;
    const gridW = cellSize * 5;
    const startX = MARGIN.left + 20;
    const startY = y + 4;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7.5);
    this.doc.setTextColor(...C.text);
    this.doc.text('IMPACTO', startX + gridW / 2 - 8, startY - 3);
    this.doc.text('PROB.', startX - 12, startY + gridW / 2, { angle: 90 });

    for (let imp = 1; imp <= 5; imp += 1) {
      this.doc.setFontSize(6.5);
      this.doc.text(String(imp), startX + (imp - 1) * cellSize + 4, startY - 0.5);
    }

    for (let prob = 5; prob >= 1; prob -= 1) {
      const row = 5 - prob;
      this.doc.text(String(prob), startX - 5, startY + row * cellSize + 7);
      for (let imp = 1; imp <= 5; imp += 1) {
        const enCelda = riesgosInherentes.filter(
          (r) => r.probabilidad === prob && r.impacto === imp
        );
        const x = startX + (imp - 1) * cellSize;
        const cy = startY + row * cellSize;
        this.doc.setFillColor(...colorCeldaMapa(prob, imp));
        this.doc.rect(x, cy, cellSize, cellSize, 'F');
        this.doc.setDrawColor(255, 255, 255);
        this.doc.setLineWidth(0.15);
        this.doc.rect(x, cy, cellSize, cellSize, 'S');

        if (enCelda.length === 1) {
          this.doc.setFont('helvetica', 'bold');
          this.doc.setFontSize(5.5);
          this.doc.setTextColor(30, 30, 30);
          this.doc.text(enCelda[0].id, x + cellSize / 2, cy + cellSize / 2 + 1, { align: 'center' });
        } else if (enCelda.length > 1) {
          this.doc.setFont('helvetica', 'bold');
          this.doc.setFontSize(6.5);
          this.doc.text(String(enCelda.length), x + cellSize / 2, cy + cellSize / 2, { align: 'center' });
          this.doc.setFontSize(4);
          this.doc.text('riesgos', x + cellSize / 2, cy + cellSize / 2 + 4, { align: 'center' });
        }
      }
    }

    let ly = startY;
    const lx = startX + gridW + 14;
    [
      ['Bajo', C.green],
      ['Medio', C.yellow],
      ['Alto', C.orange],
      ['Critico', C.red],
    ].forEach(([txt, color]) => {
      this.doc.setFillColor(...color);
      this.doc.rect(lx, ly, 4, 4, 'F');
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(...C.text);
      this.doc.text(txt, lx + 7, ly + 3.5);
      ly += 7;
    });

    ly += 4;
    [`Total: ${stats.total}`, `Criticos: ${stats.criticos}`, `Altos: ${stats.altos}`].forEach((t) => {
      this.doc.text(t, lx, ly);
      ly += 5;
    });

    const grupos = {};
    riesgosInherentes.forEach((r) => {
      const key = `${r.probabilidad}-${r.impacto}`;
      if (!grupos[key]) grupos[key] = { prob: r.probabilidad, imp: r.impacto, lista: [] };
      const origen = valoraciones.find((v) => r.id === `R${v.numero}` || r.numero === v.numero);
      grupos[key].lista.push({
        id: r.id,
        nombre: truncar(origen?.riesgoIdentificado || r.descripcion, 55),
        calif: r.probabilidad * r.impacto,
      });
    });

    const bloques = Object.values(grupos)
      .filter((g) => g.lista.length > 0)
      .sort((a, b) => b.lista.length - a.lista.length);

    if (bloques.length) {
      this.doc.addPage();
      this.tituloSeccionActual = 'Mapa de calor - detalle por celda';
      this.dibujarEncabezado(this.tituloSeccionActual, 'Riesgos agrupados por probabilidad e impacto');

      const filas = [];
      bloques.forEach((g) => {
        g.lista.forEach((item) => {
          filas.push([
            `P${g.prob} x I${g.imp}`,
            item.id,
            item.nombre,
            String(item.calif),
          ]);
        });
      });

      this.autoTabla({
        startY: CONTENT_TOP,
        subtituloSeccion: 'Detalle por celda del mapa',
        head: [['Celda', 'Cod.', 'Riesgo', 'Calif.']],
        body: filas,
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 12, halign: 'center' },
          3: { cellWidth: 14, halign: 'center' },
        },
        styles: { fontSize: 6 },
      });
    }
  }

  seccionRecomendaciones() {
    const recs = this.datos.gestionRiesgos?.recomendaciones || [];
    if (!recs.length) return;

    const y = this.nuevaPaginaSeccion(
      'Recomendaciones de gestion',
      `${recs.length} acciones propuestas`,
      'recomendaciones'
    );

    this.autoTabla({
      startY: y,
      subtituloSeccion: `${recs.length} recomendaciones`,
      head: [['No.', 'Fecha', 'Descripcion de la recomendacion']],
      body: recs.map((rec, i) => [
        String(i + 1),
        rec.fechaRecomendacion || rec.fecha || '',
        truncar(rec.descripcion || rec.texto || '', 200),
      ]),
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 24 },
      },
      styles: { fontSize: 6.5 },
    });
  }

  paginaCierre() {
    this.doc.addPage();
    this.dibujarEncabezado('Fin del reporte', 'Documento confidencial');
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.setTextColor(...C.muted);
    this.doc.text('Gracias por utilizar el sistema de gestion de riesgos de Grupo Proser.', PAGE_W / 2, PAGE_H / 2 - 4, {
      align: 'center',
    });
    this.doc.setTextColor(...C.primary);
    this.doc.setFont('helvetica', 'bold');
    this.doc.textWithLink('Volver al indice', PAGE_W / 2 - 14, PAGE_H / 2 + 8, { pageNumber: INDEX_PAGE });
    this.dibujarPie();
  }

  generar() {
    this.doc.setProperties({
      title: `Matriz de Riesgos - ${this.datos.informacion?.nombreEmpresa || 'Grupo Proser'}`,
      subject: 'Reporte interactivo de gestion de riesgos',
      author: 'Grupo Proser',
      keywords: 'riesgos, matriz, mapa de calor, gestion',
    });

    try {
      this.doc.viewerPreferences({ DisplayDocTitle: true, PageMode: 'UseOutlines' });
    } catch {
      /* opcional */
    }

    this.portada();
    this.reservarIndice();
    this.seccionInformacion();
    this.seccionResumen();
    this.seccionIdentificacion();
    this.seccionValoracion();
    this.seccionValoracionDetalle();
    this.seccionMapaCalor();
    this.seccionRecomendaciones();
    this.completarIndice();
    this.paginaCierre();

    return this.doc;
  }
}

export async function exportarReportePdfInteractivo(
  datosMatriz,
  nombreArchivo = 'reporte_matriz_riesgos',
  tipoReporte = 'inicial'
) {
  try {
    const generador = new GeneradorPdfMatriz(datosMatriz, tipoReporte);
    const doc = generador.generar();
    const fecha = new Date().toISOString().split('T')[0];
    const nombreCompleto = `${nombreArchivo}_${fecha}.pdf`;
    doc.save(nombreCompleto);
    return { success: true, nombreArchivo: nombreCompleto };
  } catch (error) {
    console.error('Error al exportar PDF interactivo:', error);
    return { success: false, error: error.message };
  }
}

export { REPORTE_COLORES };
