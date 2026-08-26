/**
 * PDF interno de credenciales BBVA CAT con logos de Grupo Proser, Arnald y BBVA.
 * Uso: desde frontend/ → node scripts/generarCredencialesBbvaCatPdf.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.join(__dirname, '..');
const OUT = path.join(FRONT, '..', 'CREDENCIALES_USUARIOS_BBVA_CAT.pdf');

const LOGOS = {
  proser: path.join(FRONT, 'public', 'templates', 'logo-grupoproser.png'),
  arnald: path.join(FRONT, 'src', 'img', 'ArnaldDataFlow.png'),
  bbva: path.join(FRONT, 'public', 'templates', 'logo-bbva.png'),
};

const PASSWORD = 'Externos2026*';
const ROJO = [180, 30, 40];
const NEGRO = [28, 28, 28];
const GRIS = [90, 90, 90];
const GRIS_CLARO = [245, 245, 245];
const AZUL_BBVA = [0, 68, 129];

const USUARIOS = [
  ['1', 'SEBASTIAN ALEJANDRO CASTRO GIL', '1001826133', 'scastroingeniero@gmail.com', '3214616740', 'Barranquilla', 'Ingeniero civil'],
  ['2', 'TATIANA ERAZO', '1144098774', 'tatianaerazovasquez@gmail.com', '3116496303', 'Cali', 'Ingeniero civil'],
  ['3', 'OMAR RODOLFO PICO QUINTERO', '91180692', 'omarpicoingenieria@hotmail.com', '3162344057', 'Bucaramanga', 'Ingeniero civil'],
  ['4', 'Jairo Sadoc Puentes Morales', '79754443', 'sadoc85@gmail.com', '3134404339', 'Bogotá', 'Ingeniero civil'],
  ['5', 'Jorge Enrique Salazar Gonzalez', '19304748', 'jorgekike1211@gmail.com', '3144742125', 'Bogotá', 'Arquitecto'],
  ['6', 'Nubia Angelica Velasquez Leon', '51698891', '51698891@externo.bbva.grupoproser', '3134523736', 'Bogotá', 'Arquitecto'],
  ['7', 'Nicolas Andres Contreras Doncel', '1007414691', 'contreras.doncel.nicolas@gmail.com', '3017326197', 'Bogotá', 'Ingeniero civil'],
  ['8', 'Douglas Santiago Puentes Cantor', '1032488802', 'douglassantiago0710@gmail.com', '3172483325', 'Bogotá', 'Ingeniero civil'],
  ['9', 'Jaime Gaona Peña', '19419745', 'jaime.gaona@acacyan.com', '3214257152', 'Bogotá', 'Arquitecto'],
  ['10', 'Ayfa Briced Herrera Merchan', '52478912', 'ayfabh@gmail.com', '3208200213', 'Bogotá', 'Arquitecto'],
];

const CATALOGO = USUARIOS.map((u) => [
  u[0],
  u[1],
  `INS-${u[2]}`,
  `AJU-${u[2]}`,
  u[5],
]);

function dataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : 'png';
  return {
    dataUrl: `data:image/${mime};base64,${buf.toString('base64')}`,
    format: mime === 'jpeg' ? 'JPEG' : 'PNG',
  };
}

function addLogos(doc, pageW) {
  const proser = dataUrl(LOGOS.proser);
  const arnald = dataUrl(LOGOS.arnald);
  const bbva = dataUrl(LOGOS.bbva);
  doc.addImage(proser.dataUrl, proser.format, 12, 8, 52, 16);
  doc.addImage(arnald.dataUrl, arnald.format, pageW / 2 - 24, 8, 48, 16);
  doc.addImage(bbva.dataUrl, bbva.format, pageW - 50, 8.5, 36, 14);
}

function pie(doc, pageW, pageH) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...ROJO);
    doc.setLineWidth(0.6);
    doc.line(12, pageH - 12, pageW - 12, pageH - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text(
      'Uso interno Grupo Proser  ·  No compartir por canales públicos  ·  Entregar credenciales de forma individual',
      12,
      pageH - 7
    );
    doc.text(`${i} / ${n}`, pageW - 12, pageH - 7, { align: 'right' });
  }
}

function main() {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setProperties({
    title: 'Credenciales de acceso — Rol BBVA CAT',
    author: 'Grupo Proser',
    creator: 'Arnald DataFlow',
    subject: 'Usuarios externos inspectores y ajustadores CAT',
  });

  addLogos(doc, pageW);

  doc.setDrawColor(...ROJO);
  doc.setLineWidth(0.8);
  doc.line(12, 28, pageW - 12, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NEGRO);
  doc.text('Credenciales de acceso — Rol BBVA (CAT)', pageW / 2, 36, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text(
    'Arnald DataFlow  ·  Módulo BBVA CAT (inspectores y ajustadores)  ·  24 de agosto de 2026',
    pageW / 2,
    42,
    { align: 'center' }
  );

  doc.setFillColor(...ROJO);
  doc.roundedRect(12, 47, pageW - 24, 14, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`Contraseña para todos los usuarios:  ${PASSWORD}`, pageW / 2, 55.5, {
    align: 'center',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NEGRO);
  doc.text('Cómo ingresar', 12, 70);

  const pasos = [
    '1. Abrir la plataforma e ir a Iniciar sesión.',
    '2. En Usuario, ingresar el número de cédula (login).',
    `3. En Contraseña, ingresar: ${PASSWORD}`,
    '4. Al entrar, el sistema abre el Reporte analista BBVA CAT.',
    '5. Se recomienda cambiar la contraseña en Mi Cuenta después del primer acceso.',
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...NEGRO);
  pasos.forEach((p, i) => doc.text(p, 14, 76 + i * 4.4));

  autoTable(doc, {
    startY: 100,
    head: [['#', 'Nombre completo', 'Usuario (cédula)', 'Correo', 'Celular', 'Ciudad', 'Profesión', 'Rol']],
    body: USUARIOS.map((u) => [...u, 'BBVA']),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      cellPadding: 1.6,
      textColor: NEGRO,
      lineColor: [210, 210, 210],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: ROJO,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.4,
    },
    alternateRowStyles: { fillColor: GRIS_CLARO },
    tableWidth: pageW - 24,
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 30, fontStyle: 'bold', halign: 'center' },
      3: { cellWidth: 58 },
      4: { cellWidth: 26, halign: 'center' },
      5: { cellWidth: 28 },
      6: { cellWidth: 36 },
      7: { cellWidth: 30, halign: 'center', textColor: AZUL_BBVA, fontStyle: 'bold' },
    },
    margin: { left: 12, right: 12 },
  });

  doc.addPage();
  addLogos(doc, pageW);
  doc.setDrawColor(...ROJO);
  doc.setLineWidth(0.8);
  doc.line(12, 28, pageW - 12, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NEGRO);
  doc.text('Inspectores y ajustadores CAT', 12, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text(
    'Registrados en ambos catálogos (inspección y ajuste) con la ciudad de cobertura.',
    12,
    44
  );

  autoTable(doc, {
    startY: 50,
    head: [['#', 'Nombre', 'Código inspector', 'Código ajustador', 'Ciudad']],
    body: CATALOGO,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      textColor: NEGRO,
      lineColor: [210, 210, 210],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: AZUL_BBVA,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [240, 246, 252] },
    tableWidth: pageW - 24,
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 95 },
      2: { cellWidth: 55, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 55, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 56 },
    },
    margin: { left: 12, right: 12 },
  });

  const yNotas = doc.lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NEGRO);
  doc.text('Notas', 12, yNotas);

  const notas = [
    'Login: número de cédula (CC) de cada persona.',
    'Acceso limitado: solo módulo BBVA CAT y Mi Cuenta. No ven Complex, Riesgos, Express, Zurich, Alfa, Sura ni Administración.',
    'Nubia Angelica Velasquez Leon: no venía correo en el listado; se usó 51698891@externo.bbva.grupoproser. Actualizar el correo real cuando se tenga.',
    'Omar Rodolfo Pico Quintero: la cuenta ya existía y se actualizó a rol BBVA con esta contraseña.',
    'Seguridad: no compartir este documento por canales públicos.',
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...NEGRO);
  notas.forEach((n, i) => {
    const lines = doc.splitTextToSize(`•  ${n}`, pageW - 28);
    doc.text(lines, 14, yNotas + 8 + i * 8);
  });

  pie(doc, pageW, pageH);
  const bytes = doc.output('arraybuffer');
  fs.writeFileSync(OUT, Buffer.from(bytes));
  console.log(`PDF generado: ${OUT}`);
}

main();
