import { jsPDF } from 'jspdf';
import logoBolivar from '../img/seguros-bolivar.png';
import { registrarFuentesPdf } from './puertosCasoPdfFonts';
import {
  assetImportadoABase64,
  formatearFechaMayus,
  normalizarTextoPdf,
  textoPunto,
} from './puertosCasoExportacionPdfHelpers';
import {
  PdfLayout,
  paginaPortada,
  paginaDatosEIntroduccion,
  seccionBuque,
  seccionContacto,
} from './puertosCasoExportacionPdfService.js';
import {
  formatearFechasInspeccionMayus,
  normalizarFechasInspeccion,
  primeraFechaInspeccion,
  textoFechaSeguimientoGranel,
  calcularTotalMercanciaGranel,
  formatearCantidadEuropea,
} from '../components/PuertosActas/puertosCasoGranelState.js';

function seccionMercanciaGranel(layout, informe) {
  const lineas = Array.isArray(informe.lineasMercancia) ? informe.lineasMercancia : [];
  const total = calcularTotalMercanciaGranel(lineas);

  layout.espacio(8);
  layout.tituloNumerado(3, 'Información general');
  layout.espacio(3);

  const headers = ['B/L N°', 'PRODUCTO', 'TIPO DE CARGA', 'CANTIDAD', 'DESTINO'];
  const anchos = [28, 55, 35, 25, 37];
  const rows = lineas.map((l) => [
    l.bl || '',
    l.producto || '',
    l.tipoCarga || '',
    l.cantidad || '',
    l.destino || '',
  ]);
  if (rows.length) {
    layout.tablaDatos(headers, rows, anchos);
    layout.parrafo(`Total: ${formatearCantidadEuropea(total, 2)} ton`, { bold: true });
  } else {
    layout.parrafo('Sin líneas de mercancía registradas.');
  }
}

async function seccionFotosMercanciaGranel(layout, informe) {
  const imgs = (informe.imagenesMercancia || []).filter(
    (img) => img?.ruta || img?.preview || img?.file || img?.src || img?.base64
  );
  if (!imgs.length) return;
  // Título + primera fila juntos; no forzar página extra después.
  layout.asegurarBloque(14 + 46);
  layout.espacio(3);
  layout.tituloCentrado('REGISTRO FOTOGRÁFICO — MERCANCÍA');
  await layout.grillaFotos(imgs, 2, null, 42);
  layout.espacio(2);
}

function seccionSeguimientoGranel(layout, informe) {
  // Continuar en la misma hoja si hay espacio (antes se forzaba página en blanco).
  layout.asegurarBloque(42);
  layout.espacio(4);
  layout.tituloNumerado(4, 'Reporte de supervisión');
  layout.espacio(3);
  layout.tituloSeccion('Seguimiento de mercancía a granel', true);

  const filas = Array.isArray(informe.seguimientoGranel) ? informe.seguimientoGranel : [];
  const headers = [
    'FECHA',
    'B/L',
    'PRODUCTO',
    'ANUNCIADA',
    'BUEN ESTADO',
    'SOBRANTE',
    'FALTANTE',
  ];
  const anchos = [22, 24, 40, 22, 24, 22, 22];
  const rows = filas.map((f) => [
    textoFechaSeguimientoGranel(f),
    f.bl || '',
    f.producto || '',
    f.anunciada || '',
    f.buenEstado || '',
    f.sobrante || '',
    f.faltante || '',
  ]);
  if (rows.length) {
    layout.tablaDatos(headers, rows, anchos);
  } else {
    layout.parrafo('Sin filas de seguimiento.');
  }

  if (informe.comentariosSupervision) {
    layout.espacio(2);
    layout.comenzarCuadro();
    layout.espacio(2);
    layout.parrafo(informe.comentariosSupervision);
    layout.cerrarCuadro(2);
  }
}

function seccionMovimientoGranel(layout, informe) {
  layout.espacio(5);
  layout.asegurarBloque(28);
  layout.tituloSeccion('Movimiento de mercancía', true);

  const filas = Array.isArray(informe.movimientoMercancia) ? informe.movimientoMercancia : [];
  const headers = ['PRODUCTO', 'TIPO CARGA', 'CANTIDAD', 'PESO', 'UNIDAD', 'DESTINO'];
  const anchos = [40, 30, 22, 22, 20, 36];
  const rows = filas.map((f) => [
    f.producto || '',
    f.tipoCarga || '',
    f.cantidad || '',
    f.cantPeso || '',
    f.unidadPeso || '',
    f.destino || '',
  ]);
  if (rows.length) {
    layout.tablaDatos(headers, rows, anchos);
  } else {
    layout.parrafo('Sin movimiento registrado.');
  }

  if (informe.comentariosMovimiento) {
    layout.espacio(2);
    layout.comenzarCuadro();
    layout.espacio(2);
    layout.parrafo(informe.comentariosMovimiento);
    layout.cerrarCuadro(2);
  }
}

/** Parte texto pegado con viñetas/saltos en ítems de lista. */
function dividirTextoEnPuntos(texto) {
  const limpio = normalizarTextoPdf(texto);
  if (!limpio) return [];
  const porLinea = limpio
    .split(/\n+/)
    .map((l) => l.replace(/^[•●▪\-\*]+\s*/, '').trim())
    .filter(Boolean);
  if (porLinea.length > 1) return porLinea;
  // A veces pegan varios párrafos separados solo por "• "
  const porBala = limpio
    .split(/(?:^|\s)[•●▪]\s+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (porBala.length > 1) return porBala;
  return [limpio];
}

async function seccionBloquesSupervisionGranel(layout, informe) {
  const bloques = [
    {
      titulo: 'Condición de la carga',
      texto: informe.condicionCargaTexto,
      imgs: informe.imagenesCondicionCarga,
      cols: 2,
      enCuadro: true,
    },
    {
      titulo: 'Novedades / Averías',
      texto: informe.novedadesAveriasTexto,
      puntos: informe.novedadesAveriasPuntos,
      imgs: informe.imagenesNovedadesAverias,
      cols: 2,
      enCuadro: true,
    },
    {
      titulo: 'Equipos de operación',
      texto: informe.equiposOperacionIntro,
      puntos: informe.equiposOperacionPuntos,
      imgs: informe.imagenesEquiposOperacion,
      cols: 3,
      enCuadro: true,
    },
    {
      titulo: 'Condiciones meteorológicas',
      texto: informe.condicionesMeteoTexto,
      imgs: informe.imagenesCondicionesMeteo,
      cols: 3,
      enCuadro: true,
    },
  ];

  for (const bloque of bloques) {
    const puntosTexto = dividirTextoEnPuntos(bloque.texto);
    const puntosExtra = (bloque.puntos || []).map(textoPunto).filter(Boolean);
    const imgs = (bloque.imgs || []).filter(
      (img) => img?.ruta || img?.preview || img?.file || img?.src || img?.base64
    );
    const tiene = puntosTexto.length || puntosExtra.length || imgs.length;
    if (!tiene) continue;

    layout.asegurarBloque(32);
    layout.espacio(4);
    layout.tituloSeccion(bloque.titulo, true);

    const tieneTexto = puntosTexto.length || puntosExtra.length;
    if (tieneTexto && bloque.enCuadro) {
      layout.comenzarCuadro();
      layout.espacio(3);
      if (puntosTexto.length > 1) layout.listaViñetas(puntosTexto);
      else if (puntosTexto.length === 1) layout.parrafo(puntosTexto[0]);
      if (puntosExtra.length) layout.listaViñetas(puntosExtra);
      layout.cerrarCuadro(3);
    } else {
      if (puntosTexto.length > 1) layout.listaViñetas(puntosTexto);
      else if (puntosTexto.length === 1) layout.parrafo(puntosTexto[0]);
      if (puntosExtra.length) layout.listaViñetas(puntosExtra);
    }

    if (imgs.length) {
      await layout.grillaFotos(imgs, bloque.cols || 2, null, 42);
    }
  }
}

async function seccionResumenEmails(layout, informe) {
  const emails = Array.isArray(informe.resumenEmails) ? informe.resumenEmails : [];
  if (!emails.length) return;

  layout.espacio(6);
  layout.asegurarBloque(24);
  layout.tituloSeccion('Resumen de e-mails', true);

  for (let idx = 0; idx < emails.length; idx += 1) {
    const e = emails[idx];
    const fecha = formatearFechaMayus(e.fecha) || e.fecha || '—';
    const textoEvento = normalizarTextoPdf(e.evento);
    const imgs = (e.imagenes || []).filter(
      (img) => img?.ruta || img?.preview || img?.file || img?.src || img?.base64
    );
    const tieneImgs = imgs.length > 0;
    if (!textoEvento && !tieneImgs) continue;

    // Reservar fecha + primera captura / párrafo (evita hoja saltada y cuadro partido).
    layout.asegurarBloque(tieneImgs ? 72 : 28);
    layout.espacio(2);
    layout.comenzarCuadro();
    layout.espacio(3);
    layout.parrafo(`${idx + 1}. ${fecha}`, { bold: true });

    // Como en el Word: el correo va en un cuadro. Si hay capturas, son el contenido
    // (no repetir el cuerpo en texto — eso generaba letras enormes encima).
    if (tieneImgs) {
      layout.espacio(1);
      await layout.grillaFotos(imgs, 1, null, 52, { sinCaption: true });
    } else {
      layout.parrafo(textoEvento);
    }
    layout.cerrarCuadro(3);
  }
}

async function seccionConclusionesGranel(layout, informe) {
  const registros = Array.isArray(informe.registrosFotograficosBodegas)
    ? informe.registrosFotograficosBodegas
    : [];
  const tieneAlgo =
    informe.conclusionesTexto ||
    informe.conclusionesPuntos?.length ||
    registros.length;
  if (!tieneAlgo) return;

  layout.tituloSeccion('Conclusiones y comentarios', true);
  if (informe.conclusionesTexto) layout.parrafo(informe.conclusionesTexto);
  layout.listaViñetas(informe.conclusionesPuntos);

  if (registros.length) {
    layout.espacio(4);
    for (const reg of registros) {
      const imgs = (reg.imagenes || []).filter(
        (img) => img?.ruta || img?.preview || img?.file || img?.src || img?.base64
      );
      if (!imgs.length && !reg.titulo) continue;
      layout.asegurarBloque(14 + 50);
      const titulo = reg.titulo || 'Bodega / operación';
      layout.barraTituloContenedor(titulo);
      if (imgs.length) {
        await layout.grillaFotos(imgs, 2, null, 46);
      }
      layout.espacio(3);
    }
  }
}

/**
 * Genera y descarga el PDF del informe de inspección granel (estilo Bolívar).
 */
export async function generarPdfInformeGranel(
  formData,
  { aseguradoraOptions = [], responsables = [] } = {}
) {
  void aseguradoraOptions;
  const informe = formData.informeGranel || {};
  const fechasInspeccion = normalizarFechasInspeccion(
    formData.fechasInspeccion,
    formData.fchaInspccion
  );
  const formDataPdf = {
    ...formData,
    fchaInspccion: primeraFechaInspeccion(fechasInspeccion) || formData.fchaInspccion,
    fechaInspeccionDisplay: formatearFechasInspeccionMayus(fechasInspeccion),
  };
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await registrarFuentesPdf(doc);
  const logoDataUrl = await assetImportadoABase64(logoBolivar);
  const layout = new PdfLayout(doc, logoDataUrl);

  await paginaPortada(layout, formDataPdf);
  paginaDatosEIntroduccion(layout, formDataPdf, responsables, informe);
  await seccionBuque(layout, informe);
  seccionMercanciaGranel(layout, informe);
  await seccionFotosMercanciaGranel(layout, informe);
  seccionSeguimientoGranel(layout, informe);
  seccionMovimientoGranel(layout, informe);
  await seccionBloquesSupervisionGranel(layout, informe);
  await seccionResumenEmails(layout, informe);
  await seccionConclusionesGranel(layout, informe);
  seccionContacto(layout);

  layout.finalizarPaginas();

  const nombreBase =
    formData.consecutivo ||
    formData.numeroSolicitud ||
    `informe-granel-${Date.now()}`;
  const nombreArchivo = `Reporte Inspección Granel - ${nombreBase}.pdf`;
  doc.save(nombreArchivo);
  return nombreArchivo;
}

/** Carga el caso por id y genera el PDF (desde el listado). */
export async function generarPdfInformeGranelDesdeId(
  id,
  { aseguradoraOptions = [], responsables = [] } = {}
) {
  const { getPuertosCaso } = await import('./puertosService.js');
  const { normalizarCasoGranelApiParaFormulario } = await import(
    '../components/PuertosActas/puertosCasoGranelNormalize.js'
  );
  const caso = await getPuertosCaso(id);
  const formData = normalizarCasoGranelApiParaFormulario(caso);
  return generarPdfInformeGranel(formData, { aseguradoraOptions, responsables });
}
