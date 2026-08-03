import { Document, Packer, Table, TableRow, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import {
  DOCUMENTOS_SOPORTE,
  etiquetaEstadoDocumento,
  formatearMonto,
  nombreAjustadorParaDocumento,
  pctDocumentosMarcados,
} from './liquidadorExpressHelpers.js';
import {
  buildZurichSection,
  celda,
  celdaEncabezado,
  filaLabelValor,
  formatearFechaCorta,
  nombreArchivoSeguro,
  NOTAS_SALVAMENTO,
  parrafo,
  parrafoTexto,
  run,
  tituloBanner,
  tituloSeccion,
  totalesAnalisisPerdida,
} from './liquidadorExpressWordShared.js';

export async function generarChecklistExpressBlob(liquidador, totales) {
  const enc = liquidador.encabezado || {};
  const chk = liquidador.checklist || {};
  const pct = pctDocumentosMarcados(chk.documentos);
  const items = chk.itemsAnalisis || [];
  const { totalReclamado, totalAjustado } = totalesAnalisisPerdida(items);
  const nombreAjustador = nombreAjustadorParaDocumento(chk.ajustador) || '—';

  const infoGeneral = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      filaLabelValor('Fecha', formatearFechaCorta(chk.fecha) || formatearFechaCorta(new Date().toISOString().slice(0, 10))),
      filaLabelValor('ZC', enc.zc),
      filaLabelValor('STRO', enc.reclamo),
      filaLabelValor('Tipo de producto', chk.tipoProducto),
      filaLabelValor('Número de póliza', enc.poliza),
      filaLabelValor('Asegurado', enc.asegurado),
      filaLabelValor(
        'Vigencia de la póliza',
        chk.vigenciaDesde || chk.vigenciaHasta
          ? `${formatearFechaCorta(chk.vigenciaDesde)} al ${formatearFechaCorta(chk.vigenciaHasta)}`
          : ''
      ),
      filaLabelValor('D.O.L', formatearFechaCorta(enc.fechaSiniestro), { valorShading: 'BDD7EE' }),
      filaLabelValor('Riesgo asegurado', chk.riesgoAsegurado || enc.asegurado),
      filaLabelValor('Cobertura afectada', chk.coberturaAfectada || enc.cobertura || chk.tipoPerdida),
      filaLabelValor('Garantías', chk.garantias),
      filaLabelValor('Exclusiones', chk.exclusiones),
      filaLabelValor('Objeción', chk.objecion),
      filaLabelValor('Tipo de pérdida', chk.tipoPerdida),
      filaLabelValor('Aplica demérito', chk.aplicaDemerito),
      filaLabelValor('Límite o valor asegurado', chk.limiteAsegurado),
      filaLabelValor('Pérdida ajustada', formatearMonto(totales.totalPerdida), { valorBold: true }),
      filaLabelValor('Deducible', formatearMonto(totales.deducibleAplicado), { valorBold: true }),
      filaLabelValor('Valor a indemnizar', formatearMonto(totales.totalIndemnizar), { valorBold: true }),
      filaLabelValor(
        'Salvamento',
        chk.salvamento === 'Aplica' && chk.salvamentoDetalle
          ? `${chk.salvamento} | ${chk.salvamentoDetalle}`
          : chk.salvamento
      ),
      filaLabelValor('Recobro', chk.recobro),
      filaLabelValor('Indicadores de fraude', chk.indicadoresFraude),
    ],
  });

  const filasDocs = DOCUMENTOS_SOPORTE.map((texto, idx) =>
    new TableRow({
      children: [
        celda(String(idx + 1), { width: 8 }),
        celda(texto, { width: 77 }),
        celda(etiquetaEstadoDocumento(chk.documentos?.[idx]), { width: 15, align: AlignmentType.CENTER }),
      ],
    })
  );

  const tablaDocs = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          celdaEncabezado('N°'),
          celdaEncabezado('Documento de soporte'),
          celdaEncabezado('Aplica'),
        ],
      }),
      ...filasDocs,
      new TableRow({
        children: [
          celda('Porcentaje de tareas finalizadas', { bold: true }),
          celda(`${pct}%`, { bold: true }),
          celda(''),
        ],
      }),
      new TableRow({
        children: [
          celda('¿El reclamo está formalizado?', { bold: true }),
          celda(chk.reclamoFormalizado || 'No', { bold: true }),
          celda(formatearFechaCorta(chk.fechaFormalizacion)),
        ],
      }),
    ],
  });

  const filasAnalisis = items.length
    ? items.map((item, idx) =>
        new TableRow({
          children: [
            celda(String(idx + 1)),
            celda(item.descripcion),
            celda(item.reclamado ? formatearMonto(item.reclamado) : ''),
            celda(item.ajustado ? formatearMonto(item.ajustado) : ''),
            celda(item.observacion),
          ],
        })
      )
    : [
        new TableRow({
          children: [celda('—', {}), celda('Sin ítems'), celda(''), celda(''), celda('')],
        }),
      ];

  const tablaAnalisis = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          celdaEncabezado('ITEM'),
          celdaEncabezado('DESCRIPCIÓN'),
          celdaEncabezado('V/R TOTAL (RECLAMADO)'),
          celdaEncabezado('V/R TOTAL (AJUSTADO)'),
          celdaEncabezado('OBSERVACIÓN'),
        ],
      }),
      ...filasAnalisis,
      new TableRow({
        children: [
          celda('Totales', { bold: true }),
          celda(''),
          celda(formatearMonto(totalReclamado), { bold: true }),
          celda(formatearMonto(totalAjustado), { bold: true }),
          celda(''),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      await buildZurichSection([
        parrafo(
          [run('FORMATO ÚNICO ATENCIÓN DE RECLAMOS EXPRESS', { bold: true, size: 24 })],
          { spacingAfter: 80 }
        ),
        parrafo([run('PROPERTY', { bold: true, size: 22 })], { spacingAfter: 200 }),
        tituloSeccion('INFORMACIÓN GENERAL DEL RECLAMO'),
        infoGeneral,
        parrafoTexto('Breve descripción del evento:', { bold: true, spacingAfter: 60 }),
        parrafoTexto(chk.descripcionEvento || '', { spacingAfter: 200 }),
        parrafoTexto(`Ajustador — ${nombreAjustador}`, { spacingAfter: 200 }),
        tituloSeccion('DOCUMENTOS DE SOPORTE'),
        tablaDocs,
        tituloSeccion('ANÁLISIS DE LA PÉRDIDA'),
        tablaAnalisis,
        tituloSeccion('COMENTARIOS ADICIONALES'),
        parrafoTexto(chk.comentariosAdicionales || 'Para este caso no aplica'),
        parrafoTexto(`Ajustador — ${nombreAjustador}`, { spacingBefore: 200 }),
      ]),
    ],
  });

  const blob = await Packer.toBlob(doc);
  return {
    blob,
    nombre: `Checklist_Express_${nombreArchivoSeguro(enc.reclamo || enc.zc)}.docx`,
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

export async function descargarChecklistExpressWord(liquidador, totales) {
  const { blob, nombre } = await generarChecklistExpressBlob(liquidador, totales);
  saveAs(blob, nombre);
}

export async function generarSalvamentoExpressBlob(liquidador) {
  const enc = liquidador.encabezado || {};
  const sal = liquidador.salvamento || {};

  const marcarSiNo = (valor) => (valor === 'SI' ? 'SI' : 'NO');

  const infoSalvamento = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      filaLabelValor('COMENTARIOS / Descripción salvamento', sal.descripcion),
      filaLabelValor('Cantidad (unidades)', sal.cantidad),
      filaLabelValor('Marca salvamento', sal.marca || 'N/D'),
      filaLabelValor('Serial salvamento', sal.serial || 'N/D'),
      filaLabelValor('Especificación del daño y estado actual del salvamento', sal.especificacionDano),
      filaLabelValor('Ubicación (Dirección y ciudad)', sal.ubicacion),
      filaLabelValor('Contacto persona quien entrega', sal.contactoEntrega),
      filaLabelValor('Salvamento nacionalizado', marcarSiNo(sal.nacionalizado)),
      filaLabelValor(
        'Genera costos por custodia',
        `${marcarSiNo(sal.generaCustodia)}   Valor: ${sal.valorCustodia ? `$ ${formatearMonto(sal.valorCustodia)}` : '$ —'}`
      ),
      filaLabelValor('Registro fotográfico', marcarSiNo(sal.registroFotografico)),
      filaLabelValor(
        'Indemnizado',
        `${marcarSiNo(sal.indemnizado)}   Valor: ${sal.valorIndemnizado ? `$ ${formatearMonto(sal.valorIndemnizado)}` : '$ —'}`
      ),
      filaLabelValor(
        'Se solicitó oferta Non Cash',
        `${marcarSiNo(sal.ofertaNonCash)}   Valor: ${sal.valorNonCash ? `$ ${formatearMonto(sal.valorNonCash)}` : ''}`
      ),
      filaLabelValor('Comentarios salvamento', sal.comentarios),
    ],
  });

  const encabezado = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      filaLabelValor('Póliza', enc.poliza),
      filaLabelValor('Reclamo', enc.reclamo),
      filaLabelValor('Sub-tarea', sal.subTarea || 'SALVAMENTO'),
      filaLabelValor('Asegurado', enc.asegurado),
    ],
  });

  const doc = new Document({
    sections: [
      await buildZurichSection([
        tituloBanner('Formato Salvamentos'),
        parrafoTexto('', { spacingAfter: 120 }),
        encabezado,
        tituloSeccion('Información de Salvamento'),
        infoSalvamento,
        tituloSeccion('NOTAS'),
        ...NOTAS_SALVAMENTO.map((nota, i) => parrafoTexto(`${i + 1}. ${nota}`, { spacingAfter: 80 })),
      ]),
    ],
  });

  const blob = await Packer.toBlob(doc);
  return {
    blob,
    nombre: `Salvamento_Express_${nombreArchivoSeguro(enc.reclamo)}.docx`,
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

export async function descargarSalvamentoExpressWord(liquidador) {
  const { blob, nombre } = await generarSalvamentoExpressBlob(liquidador);
  saveAs(blob, nombre);
}
