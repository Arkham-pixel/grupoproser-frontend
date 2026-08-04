import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  WidthType,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  Header,
  VerticalAlign,
} from 'docx';
import { saveAs } from 'file-saver';
import Logo from '../../img/Logo.png';
import { getImageUrlCandidates } from '../../utils/imageUtils';

const ROJO = 'C00000';

const MESES_ABR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sept', 'Oct', 'Nov', 'Dic'];

const linea = (texto, { bold = false, italics = false, color = '000000', align = AlignmentType.JUSTIFIED, after = 100 } = {}) =>
  new Paragraph({
    children: [
      new TextRun({
        text: (texto || '').replace(/\s+/g, ' '),
        bold,
        italics,
        font: 'Calibri',
        size: 24,
        color,
      }),
    ],
    alignment: align,
    spacing: { after },
  });

const seccionRoja = (titulo) =>
  new Paragraph({
    children: [new TextRun({ text: titulo, bold: true, font: 'Calibri', size: 26, color: ROJO })],
    spacing: { before: 300, after: 200 },
  });

const encabezadoTablaRojo = (texto) =>
  new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill: ROJO },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: texto, bold: true, size: 22, font: 'Calibri', color: 'FFFFFF' })],
      }),
    ],
  });

const celdaTexto = (texto) =>
  new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ text: String(texto || ''), size: 22, font: 'Calibri' })],
      }),
    ],
  });

const bufferDesdeBase64 = (dataUrl) => {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;
};

const convertirImagenImportadaABuffer = async (imagePath) => {
  const response = await fetch(imagePath);
  return response.arrayBuffer();
};

const convertirImagenABuffer = async (img) => {
  if (!img) return null;
  try {
    if (img.file instanceof File) return img.file.arrayBuffer();
    const candidatos = getImageUrlCandidates(img);
    for (const src of candidatos) {
      try {
        if (src.startsWith('data:image')) return bufferDesdeBase64(src);
        const response = await fetch(src);
        if (response.ok) return response.arrayBuffer();
      } catch {
        /* siguiente candidato */
      }
    }
    return null;
  } catch {
    return null;
  }
};

const formatearFechaLarga = (fechaStr) => {
  if (!fechaStr) {
    return new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  try {
    const fecha = new Date(fechaStr.includes('T') ? fechaStr : `${fechaStr}T00:00:00`);
    return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return fechaStr;
  }
};

const formatearFechaPoliza = (fechaStr) => {
  if (!fechaStr) return '';
  try {
    const fecha = new Date(fechaStr.includes('T') ? fechaStr : `${fechaStr}T00:00:00`);
    return `${fecha.getDate()}/${MESES_ABR[fecha.getMonth()]}/${fecha.getFullYear()}`;
  } catch {
    return fechaStr;
  }
};

const formatearFechaArribo = (fechaStr) => {
  if (!fechaStr) return '';
  try {
    const fecha = new Date(fechaStr.includes('T') ? fechaStr : `${fechaStr}T00:00:00`);
    return `${fecha.getDate()} de ${fecha.toLocaleDateString('es-CO', { month: 'long' })} de ${fecha.getFullYear()}`;
  } catch {
    return fechaStr;
  }
};

/** Agrupa fotos por leyenda (descripción) para repetir el formato del PDF */
const agruparPorLeyenda = (imagenes, leyendaDefault) => {
  const grupos = new Map();
  for (const img of imagenes) {
    const leyenda = (img.descripcion?.trim() || leyendaDefault || 'FOTOGRAFÍA').toUpperCase();
    if (!grupos.has(leyenda)) grupos.set(leyenda, []);
    grupos.get(leyenda).push(img);
  }
  return grupos;
};

const buildLeyendaVin = (registro) => {
  const vin = (registro.vin || '').trim().toUpperCase();
  const danos = (registro.danos || '').trim().toUpperCase();
  if (vin && danos) return `VIN ${vin} ${danos}`;
  if (vin) return `VIN ${vin}`;
  return danos || 'DETALLE VEHÍCULO';
};

const filaLeyendaGrupo = (texto, columnas = 2) =>
  new TableRow({
    children: [
      new TableCell({
        columnSpan: columnas,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: (texto || '').replace(/\s+/g, ' '),
                bold: true,
                size: 20,
                font: 'Calibri',
                color: '000000',
              }),
            ],
          }),
        ],
      }),
    ],
  });

/**
 * Dos fotos por fila y leyenda debajo de cada par (almacenamiento, modelo).
 */
const gridFotosConLeyenda = async (imagenes, leyenda, columnas = 2) => {
  const filas = [];

  for (let i = 0; i < imagenes.length; i += columnas) {
    const celdasImg = [];
    const leyendas = [];

    for (let j = i; j < i + columnas && j < imagenes.length; j++) {
      const img = imagenes[j];
      const buf = await convertirImagenABuffer(img);
      if (buf) {
        celdasImg.push(
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new ImageRun({ data: buf, transformation: { width: 250, height: 188 } })],
              }),
            ],
          })
        );
        leyendas.push((img.descripcion?.trim() || leyenda).toUpperCase());
      }
    }

    if (!celdasImg.length) continue;

    filas.push(new TableRow({ children: celdasImg }));
    filas.push(filaLeyendaGrupo(leyendas[0] || leyenda, celdasImg.length));
  }

  return filas;
};

/**
 * Todas las fotos del VIN juntas (2 columnas) y una sola leyenda al final del grupo.
 */
const gridFotosGrupoVin = async (imagenes, leyenda, columnas = 2) => {
  const filas = [];
  const textoLeyenda = (leyenda || 'FOTOGRAFÍA').toUpperCase();
  let hayFotos = false;

  for (let i = 0; i < imagenes.length; i += columnas) {
    const celdasImg = [];
    for (let j = i; j < i + columnas && j < imagenes.length; j++) {
      const buf = await convertirImagenABuffer(imagenes[j]);
      if (buf) {
        celdasImg.push(
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new ImageRun({ data: buf, transformation: { width: 250, height: 188 } })],
              }),
            ],
          })
        );
      }
    }
    if (!celdasImg.length) continue;

    while (celdasImg.length < columnas) {
      celdasImg.push(new TableCell({ children: [new Paragraph({})] }));
    }

    filas.push(new TableRow({ children: celdasImg }));
    hayFotos = true;
  }

  if (hayFotos) {
    filas.push(filaLeyendaGrupo(textoLeyenda, columnas));
  }

  return filas;
};

const crearEncabezadoDocumento = (logoBuffer, { asegurado, patio, ciudad, numeroPoliza, codigo, version, fechaPoliza }) => {
  const tituloCentral = [
    linea('INFORME DE INSPECCIÓN', { bold: true, align: AlignmentType.CENTER, after: 60 }),
    linea(`ASEGURADO ${asegurado} PATIO ${patio} ${ciudad}`.replace(/\s+/g, ' ').trim(), {
      bold: true,
      align: AlignmentType.CENTER,
      after: 60,
    }),
  ];
  if (numeroPoliza) {
    tituloCentral.push(linea(`No. ${numeroPoliza}`, { align: AlignmentType.CENTER, after: 0 }));
  }

  const metaDerecha = [
    linea(codigo ? `CODIGO: ${codigo}` : 'CODIGO:', { align: AlignmentType.LEFT, after: 40 }),
    linea(`Versión: ${version}`, { align: AlignmentType.LEFT, after: 40 }),
    linea(fechaPoliza ? `Fecha: ${fechaPoliza}` : 'Fecha:', { align: AlignmentType.LEFT, after: 0 }),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: logoBuffer
              ? [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({ data: logoBuffer, transformation: { width: 180, height: 68 } }),
                    ],
                  }),
                ]
              : [linea('GRUPO PROSER', { bold: true, align: AlignmentType.CENTER })],
          }),
          new TableCell({
            width: { size: 44, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: tituloCentral,
          }),
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: metaDerecha,
          }),
        ],
      }),
    ],
  });
};

export const generarWordRiicp004 = async (formData, options = {}) => {
  const locale = options?.locale === 'en' ? 'en' : 'es';
  // Contenido regulatorio permanece en ES hasta aprobación legal (pending legal approval)
  const L = (es, en) => (locale === 'en' ? en : es);
  const docContent = [];
  let logoBuffer = null;
  try {
    logoBuffer = await convertirImagenImportadaABuffer(Logo);
  } catch {
    /* sin logo */
  }

  const ciudad = (formData.municipio || 'Buenaventura').toUpperCase();
  const ciudadTexto = formData.municipio || 'Buenaventura';
  const fechaReporte = formatearFechaLarga(formData.fecha);
  const asegurado = (formData.asegurado || formData.nombreCliente || 'ASEGURADO').toUpperCase();
  const patio = (formData.patioOperacion || formData.puertoDescargue || '').toUpperCase();
  const codigo = formData.codigoInforme?.trim() || '';
  const version = formData.versionInforme || '1';
  const numeroPoliza = formData.numeroPoliza || '';
  const fechaPoliza = formatearFechaPoliza(formData.fechaPoliza);

  const headerTable = crearEncabezadoDocumento(logoBuffer, {
    asegurado,
    patio,
    ciudad,
    numeroPoliza,
    codigo,
    version,
    fechaPoliza,
  });

  // ——— Carta ———
  docContent.push(new Paragraph({ spacing: { before: 720, after: 0 }, children: [] }));
  docContent.push(linea(`${ciudadTexto}, ${fechaReporte}`));

  if (formData.nombreContacto) docContent.push(linea(formData.nombreContacto.toUpperCase(), { bold: true }));
  if (formData.cargoContacto) docContent.push(linea(formData.cargoContacto, { bold: true }));
  if (formData.gerenciaContacto) docContent.push(linea(formData.gerenciaContacto));
  if (formData.empresaCliente) docContent.push(linea(formData.empresaCliente.toUpperCase()));
  if (formData.ciudadContacto) docContent.push(linea(formData.ciudadContacto));

  docContent.push(new Paragraph({ spacing: { after: 150 } }), linea(L('Cordial Saludo.', 'Greetings.')));

  const motonave = formData.nombreMotonave || 'LA MOTONAVE';
  const totalVeh = formData.numeroVehiculos || formData.cantidadVehiculos || 'N';
  const bls = formData.listaBLs || formData.billOfLading || '';
  const origen = formData.origenImportacion || '';
  const fechasDesc = formData.fechasDescargue || '';
  const arribo = formatearFechaArribo(formData.fechaArriboMotonave);

  docContent.push(
    linea(
      `De acuerdo a su gentil asignación nos permitimos informarles que fueron descargados ${totalVeh} vehículos, ` +
        `para el asegurado ${asegurado}, llegados en la motonave ${motonave}` +
        (arribo ? ` el ${arribo}` : '') +
        (bls ? `, amparados con los BLs. ${bls}` : '') +
        (origen ? `, de ${origen}` : '') +
        (fechasDesc ? `, descargue realizado los días ${fechasDesc}.` : '.')
    )
  );

  if (formData.inspectores || formData.comentarioPatioAlmacenamiento || formData.fechasInspeccion) {
    docContent.push(
      new Paragraph({ spacing: { before: 150 } }),
      linea(
        formData.comentarioPatioAlmacenamiento ||
          `Inspección realizada por ${formData.inspectores} en Patios de ${formData.puertoDescargue || patio}, los días ${formData.fechasInspeccion || ''}.`
      )
    );
  }

  if (formData.modelosVehiculos) {
    docContent.push(linea(`Vehículos Modelo: ${formData.modelosVehiculos}`, { bold: true }));
  }

  // ——— 2. Observaciones ———
  docContent.push(seccionRoja(L('2- OBSERVACIONES:', '2- OBSERVATIONS:')));

  if (formData.textoObservacionesGeneral) {
    formData.textoObservacionesGeneral.split('\n').forEach((p) => {
      if (p.trim()) docContent.push(linea(p.trim()));
    });
  }

  const tablaAverias = formData.tablaAverias || [];
  if (tablaAverias.length > 0) {
    docContent.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [encabezadoTablaRojo('VIN'), encabezadoTablaRojo(L('OBSERVACIONES', 'OBSERVATIONS'))] }),
          ...tablaAverias.map(
            (fila) =>
              new TableRow({
                children: [celdaTexto(fila.vin), celdaTexto(fila.averias || fila.dano)],
              })
          ),
        ],
      })
    );
  }

  // ——— 3. Informe fotográfico ———
  const fotosAlmacenamiento = (formData.imagenesAspectoAlmacenamiento || []).map((f) => ({
    ...f,
    descripcion: f.descripcion || 'ASPECTO DEL ALMACENAMIENTO',
  }));
  const fotosModelo = (formData.imagenesAspectoModelo || []).map((f) => ({
    ...f,
    descripcion: f.descripcion || 'ASPECTO MODELO',
  }));
  const registrosVin = formData.registrosPorVin || [];
  const hayFotos =
    fotosAlmacenamiento.length > 0 ||
    fotosModelo.length > 0 ||
    registrosVin.some((r) => (r.fotos || []).length > 0);

  if (hayFotos) {
    docContent.push(new Paragraph({ children: [], pageBreakBefore: true }), seccionRoja(L('3- INFORME FOTOGRAFICO', '3- PHOTOGRAPHIC REPORT')));

    const renderGrupo = async (imagenes, leyendaDefault) => {
      const grupos = agruparPorLeyenda(imagenes, leyendaDefault);
      for (const [leyenda, fotos] of grupos) {
        const filas = await gridFotosConLeyenda(fotos, leyenda, 2);
        if (filas.length) {
          docContent.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: filas }));
          docContent.push(new Paragraph({ spacing: { after: 200 } }));
        }
      }
    };

    if (fotosAlmacenamiento.length) await renderGrupo(fotosAlmacenamiento, 'ASPECTO DEL ALMACENAMIENTO');
    if (fotosModelo.length) await renderGrupo(fotosModelo, 'ASPECTO MODELO');

    for (const registro of registrosVin) {
      const fotos = registro.fotos || [];
      if (!fotos.length) continue;
      const leyendaVin = buildLeyendaVin(registro);
      const filas = await gridFotosGrupoVin(fotos, leyendaVin, 2);
      if (filas.length) {
        docContent.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: filas }));
        docContent.push(new Paragraph({ spacing: { after: 200 } }));
      }
    }
  }

  // ——— 4. Recomendaciones ———
  const recomendaciones = formData.recomendaciones || [];
  if (recomendaciones.length > 0) {
    docContent.push(seccionRoja(L('4.- RECOMENDACIONES', '4.- RECOMMENDATIONS')));
    recomendaciones.forEach((rec) => docContent.push(linea(rec.texto || rec)));
  }

  // ——— 5. Conclusiones ———
  if (formData.conclusiones) {
    docContent.push(seccionRoja(L('5.- CONCLUSIONES', '5.- CONCLUSIONS')), linea(formData.conclusiones));
  }

  // ——— Firma ———
  docContent.push(new Paragraph({ spacing: { before: 400 } }), linea('Atentamente,'));

  if (formData.imagenFirma) {
    try {
      const firmaBuffer = formData.imagenFirma.startsWith('data:')
        ? bufferDesdeBase64(formData.imagenFirma)
        : await convertirImagenABuffer({ ruta: formData.imagenFirma });
      if (firmaBuffer) {
        docContent.push(
          new Paragraph({
            children: [new ImageRun({ data: firmaBuffer, transformation: { width: 180, height: 70 } })],
            spacing: { after: 100 },
          })
        );
      }
    } catch {
      /* sin firma */
    }
  }

  if (formData.nombreFirmante) docContent.push(linea(formData.nombreFirmante.toUpperCase(), { bold: true }));
  if (formData.cargoFirmante) docContent.push(linea(formData.cargoFirmante, { italics: true }));

  if (formData.emailFirmante) {
    formData.emailFirmante.split('/').forEach((email) => {
      const limpio = email.trim();
      if (limpio) docContent.push(linea(limpio, { color: '0563C1' }));
    });
  }
  if (formData.celularFirmante) docContent.push(linea(`Cel: ${formData.celularFirmante}`));
  docContent.push(linea(`${ciudadTexto}-Colombia`));

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        },
        headers: { default: new Header({ children: [headerTable] }) },
        children: docContent,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const nombreArchivo = `INFORME_INSPECCION_${asegurado}_${motonave}_${formData.fecha || 'informe'}.docx`;
  saveAs(blob, nombreArchivo.replace(/[^a-zA-Z0-9._-]/g, '_'));
};
