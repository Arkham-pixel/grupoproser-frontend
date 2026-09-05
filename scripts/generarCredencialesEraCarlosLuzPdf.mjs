/**
 * PDF de credenciales — Carlos Eduardo Luz Contreras (rol ERA).
 * Uso: desde frontend/ → node scripts/generarCredencialesEraCarlosLuzPdf.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.join(__dirname, '..');
const OUT = path.join(FRONT, '..', 'CREDENCIALES_USUARIO_ERA_CARLOS_LUZ.pdf');

const LOGOS = {
  proser: path.join(FRONT, 'public', 'templates', 'logo-grupoproser.png'),
  arnald: path.join(FRONT, 'src', 'img', 'ArnaldDataFlow.png'),
};

const PASSWORD = 'Externos2026*';
const ROJO = [180, 30, 40];
const NEGRO = [28, 28, 28];
const GRIS = [90, 90, 90];
const GRIS_CLARO = [245, 245, 245];
const AZUL = [20, 70, 120];

const USUARIO = {
  nombre: 'Carlos Eduardo Luz Contreras',
  login: '5346081408584',
  email: 'charlyluz24@gmail.com',
  celular: '+52 (55) 6764.3113',
  fechaNacimiento: '14/07/1990',
  rol: 'ERA',
};

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
  doc.addImage(proser.dataUrl, proser.format, 14, 10, 48, 15);
  doc.addImage(arnald.dataUrl, arnald.format, pageW - 62, 10, 48, 15);
}

function pie(doc, pageW, pageH) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...ROJO);
    doc.setLineWidth(0.6);
    doc.line(14, pageH - 14, pageW - 14, pageH - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(
      'Uso interno Grupo Proser  ·  No compartir por canales públicos  ·  Entregar de forma individual',
      14,
      pageH - 8
    );
    doc.text(`${i} / ${n}`, pageW - 14, pageH - 8, { align: 'right' });
  }
}

function main() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const fecha = new Date().toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  doc.setProperties({
    title: 'Credenciales de acceso — Usuario ERA',
    author: 'Grupo Proser',
    creator: 'Arnald DataFlow',
    subject: 'Carlos Eduardo Luz Contreras',
  });

  addLogos(doc, pageW);

  doc.setDrawColor(...ROJO);
  doc.setLineWidth(0.9);
  doc.line(14, 30, pageW - 14, 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NEGRO);
  doc.text('Credenciales de acceso — Rol ERA', pageW / 2, 42, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GRIS);
  doc.text(`Arnald DataFlow  ·  Módulo Alfa (ERA)  ·  ${fecha}`, pageW / 2, 49, {
    align: 'center',
  });

  doc.setFillColor(...ROJO);
  doc.roundedRect(14, 56, pageW - 28, 16, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(`Contraseña:  ${PASSWORD}`, pageW / 2, 66, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...NEGRO);
  doc.text('Datos del usuario', 14, 86);

  autoTable(doc, {
    startY: 92,
    body: [
      ['Nombre completo', USUARIO.nombre],
      ['Usuario (login / INE)', USUARIO.login],
      ['Correo', USUARIO.email],
      ['Celular', USUARIO.celular],
      ['Fecha de nacimiento', USUARIO.fechaNacimiento],
      ['Rol', USUARIO.rol],
      ['Contraseña inicial', PASSWORD],
    ],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 3.2,
      textColor: NEGRO,
      lineColor: [210, 210, 210],
      lineWidth: 0.2,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 55, fillColor: GRIS_CLARO, fontStyle: 'bold' },
      1: { cellWidth: pageW - 28 - 55, fontStyle: 'bold', textColor: AZUL },
    },
    margin: { left: 14, right: 14 },
  });

  const yPasos = doc.lastAutoTable.finalY + 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...NEGRO);
  doc.text('Cómo ingresar', 14, yPasos);

  const pasos = [
    '1. Abrir la plataforma e ir a Iniciar sesión.',
    '2. En Usuario, ingresar el número de identificación (INE): 5346081408584',
    `3. En Contraseña, ingresar: ${PASSWORD}`,
    '4. Al entrar, el sistema abre el módulo Alfa (casos que Proser asigne a ERA).',
    '5. Se recomienda cambiar la contraseña en Mi Cuenta después del primer acceso.',
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...NEGRO);
  pasos.forEach((p, i) => {
    const lines = doc.splitTextToSize(p, pageW - 32);
    doc.text(lines, 16, yPasos + 10 + i * 8);
  });

  const yNotas = yPasos + 10 + pasos.length * 8 + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...NEGRO);
  doc.text('Notas', 14, yNotas);

  const notas = [
    'Acceso limitado a Alfa (reporte, mis casos, dashboard, caso) y Mi Cuenta.',
    'No ve Previsora, Zurich, BBVA, Sura, Allianz, Equidad, Express, Complex ni Administración.',
    'Hasta que Proser asigne casos a ERA, el reporte puede salir vacío.',
    'No compartir este documento por canales públicos.',
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...NEGRO);
  notas.forEach((n, i) => {
    const lines = doc.splitTextToSize(`•  ${n}`, pageW - 32);
    doc.text(lines, 16, yNotas + 10 + i * 9);
  });

  pie(doc, pageW, pageH);
  fs.writeFileSync(OUT, Buffer.from(doc.output('arraybuffer')));
  console.log(`PDF generado: ${OUT}`);
}

main();
