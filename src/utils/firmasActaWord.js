import {
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  VerticalAlign,
  TextRun,
  ImageRun,
  BorderStyle,
} from 'docx';

const bordesTablaSinLineas = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
  insideHorizontal: { style: BorderStyle.NONE, size: 0 },
  insideVertical: { style: BorderStyle.NONE, size: 0 },
};

const bufferDesdeDataUrl = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const idx = dataUrl.indexOf('base64,');
  const raw = idx !== -1 ? dataUrl.slice(idx + 7) : dataUrl;
  if (!raw) return null;
  try {
    return Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)).buffer;
  } catch {
    return null;
  }
};

export const resolverFirmaAjustadorDesdeGuardadas = (ajustador, fd = {}) => {
  const img = ajustador?.firmaImagen || ajustador?.firma || fd.actaAjustadorFirmaImagen;
  if (img) return img;
  try {
    const raw =
      typeof localStorage !== 'undefined' ? localStorage.getItem('proser_funcionarios') : null;
    if (!raw) return '';
    const funcionarios = JSON.parse(raw);
    if (!Array.isArray(funcionarios)) return '';
    const funcionarioId = ajustador?.funcionarioId || fd.actaAjustadorFuncionarioId;
    if (funcionarioId) {
      const porId = funcionarios.find(
        (f) => String(f._id || f.id) === String(funcionarioId)
      );
      if (porId?.firma) return porId.firma;
    }
    const nombre = String(ajustador?.nombre || fd.actaAjustadorNombre || '').trim();
    if (nombre) {
      const porNombre = funcionarios.find((f) => String(f.nombre || '').trim() === nombre);
      if (porNombre?.firma) return porNombre.firma;
    }
    return '';
  } catch {
    return '';
  }
};


export const obtenerBloquesFirmasActa = (fd) => {
  const cliente = {
    nombre: fd.actaClienteNombre || '',
    cargo: fd.actaClienteCargo || '',
    email: fd.actaClienteEmail || '',
    firma: fd.actaClienteFirma || '',
  };

  let ajustadores = [];
  if (Array.isArray(fd.actaAjustadores) && fd.actaAjustadores.length > 0) {
    ajustadores = fd.actaAjustadores.filter(
      (a) => a && (a.nombre || a.firmaImagen || a.funcionarioId)
    );
  }

  if (ajustadores.length === 0 && (fd.actaAjustadorNombre || fd.actaAjustadorFirmaImagen || fd.actaAjustadorFuncionarioId)) {
    ajustadores = [
      {
        funcionarioId: fd.actaAjustadorFuncionarioId || '',
        nombre: fd.actaAjustadorNombre || '',
        cargo: fd.actaAjustadorCargo || '',
        email: fd.actaAjustadorEmail || '',
        firmaImagen: fd.actaAjustadorFirmaImagen || '',
      },
    ];
  }

  if (Array.isArray(fd.firmasActa) && fd.firmasActa.length > 0 && ajustadores.length === 0) {
    return fd.firmasActa.map((bloque, index) => ({
      cliente: index === 0 ? (bloque.cliente || cliente) : { nombre: '', cargo: '', email: '', firma: '' },
      ajustador: bloque.ajustador || null,
    }));
  }

  if (ajustadores.length === 0) {
    if (cliente.nombre || cliente.firma || cliente.cargo || cliente.email) {
      return [{ cliente, ajustador: null }];
    }
    return [];
  }

  return ajustadores.map((ajustador, index) => ({
    cliente: index === 0 ? cliente : { nombre: '', cargo: '', email: '', firma: '' },
    ajustador,
  }));
};

const construirTablaFirmaActa = (bloque, opciones = {}) => {
  const nombreEmpresa = opciones.nombreEmpresa || 'Proser Riesgos SAS';
  const tituloCliente = opciones.tituloCliente || 'FIRMA DE QUIEN RECIBE LA VISITA';
  const tituloAjustador = opciones.tituloAjustador || 'FIRMA DEL AJUSTADOR';

  const cliente = bloque?.cliente || {};
  const ajustador = bloque?.ajustador || null;
  const incluirAjustador = Boolean(ajustador);

  const nombreClienteDoc = String(cliente.nombre || '').trim();
  const cargoClienteDoc = String(cliente.cargo || '').trim();
  const emailClienteDoc = String(cliente.email || '').trim();
  const imgClienteSrc = cliente.firma || '';

  const nombreAjustadorDoc = String(ajustador?.nombre || '').trim();
  const cargoAjustDoc = String(ajustador?.cargo || '').trim();
  const emailAjustDoc = String(ajustador?.email || '').trim();
  const imgAjustadorSrc = ajustador ? resolverFirmaAjustadorDesdeGuardadas(ajustador) : '';

  const bufCliente = bufferDesdeDataUrl(imgClienteSrc);
  const bufAjustador = bufferDesdeDataUrl(imgAjustadorSrc);

  const parrafoFirmaOGuion = (buf) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 100 },
      children: buf
        ? [
            new ImageRun({
              data: buf,
              transformation: { width: 160, height: 80 },
            }),
          ]
        : [
            new TextRun({
              text: '________________________',
              font: 'Arial',
              size: 24,
              color: '000000',
            }),
          ],
    });

  const margFirma = { top: 100, bottom: 100, left: 140, right: 140 };
  const celdaFirmaActa = (children, ancho = 50) =>
    new TableCell({
      width: { size: ancho, type: WidthType.PERCENTAGE },
      margins: margFirma,
      verticalAlign: VerticalAlign.CENTER,
      children,
    });

  const celdaCliente = (children) =>
    incluirAjustador ? celdaFirmaActa(children, 50) : celdaFirmaActa(children, 100);

  const celdaAjustador = (children) => celdaFirmaActa(children, 50);

  const filaTitulos = new TableRow({
    children: incluirAjustador
      ? [
          celdaCliente([
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [
                new TextRun({ text: tituloCliente, font: 'Arial', size: 22, bold: true }),
              ],
            }),
          ]),
          celdaAjustador([
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [
                new TextRun({ text: tituloAjustador, font: 'Arial', size: 22, bold: true }),
              ],
            }),
          ]),
        ]
      : [
          celdaCliente([
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120 },
              children: [
                new TextRun({ text: tituloCliente, font: 'Arial', size: 22, bold: true }),
              ],
            }),
          ]),
        ],
  });

  const filaImagenes = new TableRow({
    children: incluirAjustador
      ? [
          celdaCliente([parrafoFirmaOGuion(bufCliente)]),
          celdaAjustador([parrafoFirmaOGuion(bufAjustador)]),
        ]
      : [celdaCliente([parrafoFirmaOGuion(bufCliente)])],
  });

  const filaNombres = new TableRow({
    children: incluirAjustador
      ? [
          celdaCliente([
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 80 },
              children: [
                new TextRun({
                  text: nombreClienteDoc || 'NOMBRE DE QUIEN RECIBE LA VISITA',
                  font: 'Arial',
                  size: 24,
                  bold: true,
                  underline: {},
                }),
              ],
            }),
          ]),
          celdaAjustador([
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 80 },
              children: [
                new TextRun({
                  text: nombreAjustadorDoc || 'NOMBRE DEL AJUSTADOR',
                  font: 'Arial',
                  size: 24,
                  bold: true,
                  underline: {},
                }),
              ],
            }),
          ]),
        ]
      : [
          celdaCliente([
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 80 },
              children: [
                new TextRun({
                  text: nombreClienteDoc || 'NOMBRE DE QUIEN RECIBE LA VISITA',
                  font: 'Arial',
                  size: 24,
                  bold: true,
                  underline: {},
                }),
              ],
            }),
          ]),
        ],
  });

  const filaDatos = new TableRow({
    children: incluirAjustador
      ? [
          celdaCliente([
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [
                new TextRun({ text: 'Cargo: ', font: 'Arial', size: 20, bold: true }),
                new TextRun({
                  text: cargoClienteDoc || '—',
                  font: 'Arial',
                  size: 20,
                  color: '000000',
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [
                new TextRun({ text: 'Correo: ', font: 'Arial', size: 20, bold: true }),
                new TextRun({
                  text: emailClienteDoc || '—',
                  font: 'Arial',
                  size: 20,
                  color: '0066CC',
                }),
              ],
            }),
          ]),
          celdaAjustador([
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [
                new TextRun({ text: 'Cargo: ', font: 'Arial', size: 20, bold: true }),
                new TextRun({
                  text: cargoAjustDoc || '—',
                  font: 'Arial',
                  size: 20,
                  color: '000000',
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [
                new TextRun({ text: 'E-Mail: ', font: 'Arial', size: 20, bold: true }),
                new TextRun({
                  text: emailAjustDoc || '—',
                  font: 'Arial',
                  size: 20,
                  color: '0066CC',
                }),
              ],
            }),
          ]),
        ]
      : [
          celdaCliente([
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [
                new TextRun({ text: 'Cargo: ', font: 'Arial', size: 20, bold: true }),
                new TextRun({
                  text: cargoClienteDoc || '—',
                  font: 'Arial',
                  size: 20,
                  color: '000000',
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 40 },
              children: [
                new TextRun({ text: 'Correo: ', font: 'Arial', size: 20, bold: true }),
                new TextRun({
                  text: emailClienteDoc || '—',
                  font: 'Arial',
                  size: 20,
                  color: '0066CC',
                }),
              ],
            }),
          ]),
        ],
  });

  const filas = [
    filaTitulos,
    filaImagenes,
    filaNombres,
    filaDatos,
    new TableRow({
      children: [
        new TableCell({
          columnSpan: incluirAjustador ? 2 : 1,
          margins: margFirma,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 80 },
              children: [
                new TextRun({
                  text: nombreEmpresa,
                  font: 'Arial',
                  size: 24,
                  bold: true,
                  color: 'FF0000',
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: bordesTablaSinLineas,
      rows: filas,
    }),
    new Paragraph({ text: '', spacing: { after: 200 } }),
  ];
};

/**
 * Bloque(s) de firmas estilo acta: quien recibe la visita (izq) + ajustador (der).
 */
export const construirElementosFirmasActaWord = (fd, opciones = {}) => {
  const bloques = obtenerBloquesFirmasActa(fd);

  if (bloques.length === 0) {
    return construirTablaFirmaActa({ cliente: {}, ajustador: null }, opciones);
  }

  return bloques.flatMap((bloque) => construirTablaFirmaActa(bloque, opciones));
};

// Compatibilidad con código que importaba obtenerListaAjustadoresActa
export const obtenerListaAjustadoresActa = (fd) =>
  obtenerBloquesFirmasActa(fd).map((b) => b.ajustador).filter(Boolean);
