/**
 * Tabla Word de contenidos NSR-10 (compartida Alfa / Sura / Zurich).
 */
import {
  AlignmentType,
  Table,
  TableRow,
  WidthType,
} from 'docx';
import {
  calcularTotalesContenidos,
  filaContenidoListaParaDeducible,
  totalFilaContenido,
} from './catalogoEvaluacionSismicaNSR10.js';

function money(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(n));
}

/**
 * @param {object} opts
 * @param {Function} opts.cell — factory de celdas del informe (misma que usa el Word)
 * @param {number} [opts.size=16]
 */
export function construirTablaContenidosWord({
  contenidos = {},
  cell,
  size = 16,
  incluirDeduciblePorArticulo = true,
} = {}) {
  if (typeof cell !== 'function') {
    throw new Error('construirTablaContenidosWord requiere cell()');
  }
  const items = Array.isArray(contenidos.items) ? contenidos.items : [];
  const filasConDatos = items.filter(
    (it) =>
      String(it?.articulo || '').trim() ||
      String(it?.categoria || '').trim() ||
      Number(it?.cantidad) > 0
  );
  const totales = calcularTotalesContenidos(contenidos);
  const CONT_W = [2200, 3200, 1400, 1000, 1100, 1400, 1400, 2300];
  const CONT_TABLE_W = CONT_W.reduce((a, b) => a + b, 0);
  const cellCont = (value, colIdx, opts = {}) =>
    cell(String(value ?? '—'), {
      width: CONT_W[colIdx],
      size,
      compact: true,
      cuadro: true,
      alignment: opts.alignment || AlignmentType.LEFT,
      bold: !!opts.bold,
    });

  const filas = [
    new TableRow({
      children: [
        cellCont('Categoría', 0, { bold: true, alignment: AlignmentType.CENTER }),
        cellCont('Artículo', 1, { bold: true, alignment: AlignmentType.CENTER }),
        cellCont('Marca', 2, { bold: true, alignment: AlignmentType.CENTER }),
        cellCont('Und', 3, { bold: true, alignment: AlignmentType.CENTER }),
        cellCont('Cant.', 4, { bold: true, alignment: AlignmentType.CENTER }),
        cellCont('Vlr. unit.', 5, { bold: true, alignment: AlignmentType.CENTER }),
        cellCont('Vlr. total', 6, { bold: true, alignment: AlignmentType.CENTER }),
        cellCont('Estado / obs.', 7, { bold: true, alignment: AlignmentType.CENTER }),
      ],
    }),
  ];

  if (filasConDatos.length) {
    filasConDatos.forEach((it) => {
      const tot = totalFilaContenido(it);
      filas.push(
        new TableRow({
          children: [
            cellCont(it.categoria || '—', 0),
            cellCont(it.articulo || '—', 1),
            cellCont(it.marca || '—', 2),
            cellCont(it.unidad || '—', 3, { alignment: AlignmentType.CENTER }),
            cellCont(
              it.cantidad === '' || it.cantidad == null ? '—' : String(it.cantidad),
              4,
              { alignment: AlignmentType.RIGHT }
            ),
            cellCont(
              it.valorUnitario === '' || it.valorUnitario == null
                ? '—'
                : money(it.valorUnitario),
              5,
              { alignment: AlignmentType.RIGHT }
            ),
            cellCont(tot == null ? '—' : money(tot), 6, {
              alignment: AlignmentType.RIGHT,
            }),
            cellCont(
              [
                it.estado,
                it.observacion,
                ...(incluirDeduciblePorArticulo && filaContenidoListaParaDeducible(it)
                  ? [
                      it.tipoCobertura || it.coberturaAfectar
                        ? `Cobertura: ${it.tipoCobertura || it.coberturaAfectar}`
                        : '',
                      it.porcentajeDeducible !== '' && it.porcentajeDeducible != null
                        ? `${it.porcentajeDeducible}%`
                        : '',
                      it.deducibleCalculado && !it.deducibleGrupoIncluido
                        ? `Deducible${
                            it.deducibleGrupoFilas > 1
                              ? ` grupo (${it.deducibleGrupoFilas} ítems)`
                              : ''
                          }: ${money(it.deducibleCalculado)}`
                        : it.deducibleGrupoIncluido
                          ? 'Deducible incluido en el grupo'
                          : '',
                    ]
                  : []),
              ]
                .filter(Boolean)
                .join(' · ') || '—',
              7
            ),
          ],
        })
      );
    });
    filas.push(
      new TableRow({
        children: [
          cell('TOTAL CONTENIDOS', {
            width: CONT_W.slice(0, 6).reduce((a, b) => a + b, 0),
            columnSpan: 6,
            size,
            compact: true,
            cuadro: true,
            bold: true,
            alignment: AlignmentType.RIGHT,
          }),
          cell(money(totales.total), {
            width: CONT_W[6],
            size,
            compact: true,
            cuadro: true,
            bold: true,
            alignment: AlignmentType.RIGHT,
          }),
          cell(
            contenidos.tipoInmueble ? `Tipo: ${contenidos.tipoInmueble}` : '',
            {
              width: CONT_W[7],
              size,
              compact: true,
              cuadro: true,
            }
          ),
        ],
      })
    );
  } else {
    filas.push(
      new TableRow({
        children: [
          cell('Sin ítems de contenidos diligenciados', {
            width: CONT_TABLE_W,
            columnSpan: 8,
            size,
            compact: true,
            cuadro: true,
            alignment: AlignmentType.CENTER,
          }),
        ],
      })
    );
  }

  return {
    tabla: new Table({
      width: { size: CONT_TABLE_W, type: WidthType.DXA },
      columnWidths: CONT_W,
      rows: filas,
    }),
    totales,
    tipoInmueble: contenidos.tipoInmueble || '',
    tieneDatos: filasConDatos.length > 0,
  };
}
