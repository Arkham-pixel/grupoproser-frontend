import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import { calcularAnaliticaMatriz } from './matrizAnaliticaService';
import { ReporteService } from './reporteService';
import { abrirReporteParaImprimirPdf } from './reportePdfDesdeHtmlService';

function nombreArchivo(base, extension) {
  const fecha = new Date().toISOString().split('T')[0];
  return `${base}_${fecha}.${extension}`;
}

export async function exportarReporteHtml(datosMatriz, tipoReporte = 'inicial') {
  return ReporteService.exportarReporteHTML(datosMatriz, 'reporte_matriz_riesgos', tipoReporte);
}

export async function exportarReportePdf(datosMatriz, tipoReporte = 'inicial', opciones = {}) {
  const resultado = await abrirReporteParaImprimirPdf(
    datosMatriz,
    tipoReporte,
    opciones.matrizId || null
  );
  return {
    ...resultado,
    mensaje:
      'Reporte abierto para impresión. Use Ctrl+P o Guardar como PDF. Recomendado: orientación horizontal.',
  };
}

export async function exportarReporteWord(datosMatriz, tipoReporte = 'inicial') {
  const analitica = calcularAnaliticaMatriz(datosMatriz);
  const empresa = datosMatriz.informacion?.nombreEmpresa || 'Empresa';
  const responsable = datosMatriz.informacion?.responsable || '';
  const tipoTexto = tipoReporte === 'anual' ? 'Valoración anual' : 'Valoración inicial';

  const parrafos = [
    new Paragraph({
      text: 'MATRIZ DE RIESGOS — RESUMEN EJECUTIVO',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Empresa: ${empresa}`, break: 1 }),
        new TextRun({ text: `Responsable: ${responsable}`, break: 1 }),
        new TextRun({ text: `Tipo: ${tipoTexto}`, break: 1 }),
        new TextRun({
          text: `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
          break: 1,
        }),
      ],
    }),
    new Paragraph({ text: 'Indicadores principales', heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      children: [
        new TextRun(`Nivel general de riesgo: ${analitica.kpis.nivelGeneral}`),
        new TextRun({ text: `Total de riesgos: ${analitica.kpis.totalRiesgos}`, break: 1 }),
        new TextRun({ text: `Riesgos críticos: ${analitica.kpis.criticos}`, break: 1 }),
        new TextRun({
          text: `Riesgo residual promedio: ${analitica.kpis.riesgoResidualPromedio}`,
          break: 1,
        }),
        new TextRun({
          text: `Reducción del riesgo: ${analitica.kpis.reduccionPromedio}%`,
          break: 1,
        }),
        new TextRun({
          text: `Madurez en gestión de riesgos: Nivel ${analitica.madurez.nivelActual} — ${analitica.madurez.nivelDetalle.nombre}`,
          break: 1,
        }),
      ],
    }),
    new Paragraph({ text: 'Conclusiones gerenciales', heading: HeadingLevel.HEADING_1 }),
    ...analitica.resumenEjecutivo.conclusiones.map(
      (c) =>
        new Paragraph({
          children: [
            new TextRun({ text: `${c.titulo}. `, bold: true }),
            new TextRun(c.texto),
          ],
        })
    ),
    new Paragraph({ text: 'Top 10 riesgos prioritarios', heading: HeadingLevel.HEADING_1 }),
    ...analitica.top10.flatMap((r) => [
      new Paragraph({
        children: [
          new TextRun({ text: `${r.ranking}. ${r.nombre}`, bold: true }),
          new TextRun({ text: ` — Proceso: ${r.proceso}`, break: 1 }),
          new TextRun({
            text: `Inherente: ${r.scoreInherente} | Residual: ${r.scoreResidual} | Reducción: ${r.reduccionPorcentaje}%`,
            break: 1,
          }),
        ],
      }),
    ]),
    new Paragraph({ text: 'Hallazgos clave', heading: HeadingLevel.HEADING_1 }),
    ...analitica.hallazgos.lista.map((h) => new Paragraph({ text: `• ${h.texto}` })),
    new Paragraph({ text: 'Próximos pasos', heading: HeadingLevel.HEADING_1 }),
    ...analitica.resumenEjecutivo.proximosPasos.map((p) => new Paragraph({ text: `• ${p}` })),
    new Paragraph({
      text: 'Documento generado por ARNALD DATA FLOW · Grupo Proser',
      alignment: AlignmentType.CENTER,
    }),
  ];

  const doc = new Document({
    sections: [{ properties: {}, children: parrafos }],
  });

  const blob = await Packer.toBlob(doc);
  const nombre = nombreArchivo('reporte_matriz_riesgos', 'docx');
  saveAs(blob, nombre);

  return {
    success: true,
    nombreArchivo: nombre,
    mensaje: `Descargado ${nombre}`,
  };
}

export async function exportarReporteExcel(datosMatriz, tipoReporte = 'inicial') {
  const analitica = calcularAnaliticaMatriz(datosMatriz);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ARNALD Data Flow';
  workbook.created = new Date();

  const hojaKpis = workbook.addWorksheet('KPIs');
  hojaKpis.columns = [
    { header: 'Indicador', key: 'indicador', width: 36 },
    { header: 'Valor', key: 'valor', width: 20 },
  ];
  const filasKpi = [
    ['Empresa', datosMatriz.informacion?.nombreEmpresa || ''],
    ['Responsable', datosMatriz.informacion?.responsable || ''],
    ['Tipo reporte', tipoReporte],
    ['Nivel general', analitica.kpis.nivelGeneral],
    ['Total riesgos', analitica.kpis.totalRiesgos],
    ['Críticos', analitica.kpis.criticos],
    ['Altos', analitica.kpis.altos],
    ['Medios', analitica.kpis.medios],
    ['Bajos', analitica.kpis.bajos],
    ['Inherente promedio', analitica.kpis.riesgoInherentePromedio],
    ['Residual promedio', analitica.kpis.riesgoResidualPromedio],
    ['Reducción %', analitica.kpis.reduccionPromedio],
    ['Procesos evaluados', analitica.kpis.procesosEvaluados],
    ['Controles documentados', analitica.kpis.controlesDocumentados],
    ['Recomendaciones abiertas', analitica.kpis.recomendacionesAbiertas],
    ['Avance plan %', analitica.kpis.avancePlanAccion],
    ['Madurez nivel', analitica.madurez.nivelActual],
    ['Madurez promedio', analitica.madurez.promedioMadurez],
  ];
  filasKpi.forEach(([indicador, valor]) => hojaKpis.addRow({ indicador, valor }));
  hojaKpis.getRow(1).font = { bold: true };

  const hojaRiesgos = workbook.addWorksheet('Riesgos');
  hojaRiesgos.columns = [
    { header: '#', key: 'numero', width: 6 },
    { header: 'Riesgo', key: 'nombre', width: 40 },
    { header: 'Proceso', key: 'proceso', width: 22 },
    { header: 'Categoría', key: 'categoria', width: 18 },
    { header: 'Prob.', key: 'probabilidad', width: 8 },
    { header: 'Impacto', key: 'impacto', width: 10 },
    { header: 'Inherente', key: 'scoreInherente', width: 12 },
    { header: 'Nivel inh.', key: 'nivelInherente', width: 12 },
    { header: 'Residual', key: 'scoreResidual', width: 12 },
    { header: 'Nivel res.', key: 'nivelResidual', width: 12 },
    { header: 'Reducción %', key: 'reduccion', width: 12 },
    { header: 'Responsable', key: 'responsable', width: 22 },
    { header: 'Controles', key: 'controles', width: 12 },
  ];
  analitica.riesgos.forEach((r) => {
    hojaRiesgos.addRow({
      numero: r.numero,
      nombre: r.nombre,
      proceso: r.proceso,
      categoria: r.categoriaPrincipal,
      probabilidad: r.probabilidad,
      impacto: r.impacto,
      scoreInherente: r.scoreInherente,
      nivelInherente: r.nivelInherente,
      scoreResidual: r.scoreResidual,
      nivelResidual: r.nivelResidual,
      reduccion: r.reduccionPorcentaje,
      responsable: r.responsable,
      controles: r.tieneControles ? 'Sí' : 'No',
    });
  });
  hojaRiesgos.getRow(1).font = { bold: true };

  const hojaRec = workbook.addWorksheet('Recomendaciones');
  hojaRec.columns = [
    { header: 'Prioridad', key: 'prioridad', width: 12 },
    { header: 'Recomendación', key: 'recomendacion', width: 42 },
    { header: 'Riesgo', key: 'riesgo', width: 30 },
    { header: 'Proceso', key: 'proceso', width: 20 },
    { header: 'Estado', key: 'estado', width: 14 },
    { header: 'Avance %', key: 'avance', width: 10 },
    { header: 'Fecha objetivo', key: 'fecha', width: 16 },
  ];
  analitica.recomendaciones.lista.forEach((rec) => {
    hojaRec.addRow({
      prioridad: rec.prioridad,
      recomendacion: rec.recomendacion,
      riesgo: rec.riesgoAsociado,
      proceso: rec.proceso,
      estado: rec.estado,
      avance: rec.avance,
      fecha: rec.fechaObjetivo,
    });
  });
  hojaRec.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const nombre = nombreArchivo('base_datos_matriz_riesgos', 'xlsx');
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    nombre
  );

  return {
    success: true,
    nombreArchivo: nombre,
    mensaje: `Descargado ${nombre}`,
  };
}

export async function cargarHistoricoMatricesEmpresa(nombreEmpresa, matrizIdActual = null) {
  if (!nombreEmpresa) return [];
  try {
    const { MatrizRiesgoService } = await import('./matrizRiesgoService.js');
    const res = await MatrizRiesgoService.obtenerMatricesRiesgo({
      empresa: nombreEmpresa,
      limit: 6,
    });
    const matrices = res.data || [];
    const historico = [];

    for (const matriz of matrices) {
      const id = matriz._id || matriz.id;
      if (!id || id === matrizIdActual) continue;
      try {
        const full = await MatrizRiesgoService.obtenerMatrizRiesgo(id);
        const datos = full?.data?.datosMatriz;
        if (datos) {
          historico.push({
            fecha: matriz.fechaCreacion || matriz.fechaModificacion,
            datosMatriz: datos,
          });
        }
      } catch {
        // omitir matrices inaccesibles
      }
      if (historico.length >= 3) break;
    }

    return historico;
  } catch {
    return [];
  }
}
