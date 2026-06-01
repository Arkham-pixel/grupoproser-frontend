// Servicio independiente para el nuevo informe: Portada + Tabla de Contenido
// No modifica el reporte existente

export class ReporteInformeMadreService {
  // Genera el HTML completo del nuevo informe (solo portada y TOC por ahora)
  static async generarReporteHTML(datos = {}, itemsTOC = []) {
    const fecha = new Date();
    const fechaFormateada = fecha.toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const empresa = datos.empresa || datos?.informacion?.empresa || '';
    const titulo = datos.titulo || 'Informe de Inspección y Evaluación de Riesgos';

    const estilos = `
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
      .page { page-break-after: always; padding: 40px 32px; }
      .page:last-child { page-break-after: auto; }

      /* Portada */
      .portada { min-height: 85vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
      .portada-titulo { font-size: 36px; font-weight: 800; margin: 0 0 8px 0; }
      .portada-empresa { font-size: 22px; font-weight: 600; color: #444; margin: 0 0 18px 0; }
      .portada-fecha { color: #666; margin-top: 8px; }

      /* Tabla de Contenido */
      .toc h2 { font-size: 26px; margin: 0 0 12px 0; }
      .toc-ol { list-style: decimal inside; padding: 0; margin: 0; }
      .toc-li { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
      .toc-texto { flex: 1 1 auto; }
      .toc-dots { flex: 1 1 auto; height: 1px; background: repeating-linear-gradient(to right, #999, #999 4px, transparent 4px, transparent 8px); }
      .toc-pagina { width: 40px; text-align: right; }
    `;

    const portadaHtml = `
      <section class="page portada">
        <h1 class="portada-titulo">${this.escapeHtml(titulo)}</h1>
        ${empresa ? `<h2 class="portada-empresa">${this.escapeHtml(empresa)}</h2>` : ''}
        <div class="portada-fecha">${this.escapeHtml(fechaFormateada)}</div>
      </section>
    `;

    const tocHtml = `
      <section class="page toc">
        <h2>TABLA DE CONTENIDO</h2>
        <ol class="toc-ol">
          ${itemsTOC.map((item, idx) => `
            <li class="toc-li">
              <span class="toc-texto">${this.escapeHtml(item.titulo || `Sección ${idx + 1}`)}</span>
              <span class="toc-dots"></span>
              <span class="toc-pagina">${this.escapeHtml(String(item.pagina ?? ''))}</span>
            </li>
          `).join('')}
        </ol>
      </section>
    `;

    return `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${this.escapeHtml(titulo)}</title>
          <style>${estilos}</style>
        </head>
        <body>
          ${portadaHtml}
          ${tocHtml}
        </body>
      </html>
    `;
  }

  // Exporta el informe como archivo compatible con Word (.doc)
  // Nota: Word abre HTML empaquetado como .doc correctamente, respetando estilos y saltos de página
  static async exportarReporteWord(datos = {}, itemsTOC = [], nombreArchivo = 'informe_portada_toc') {
    const html = await this.generarReporteHTML(datos, itemsTOC);

    // Encabezado para mejor compatibilidad con Microsoft Word
    const htmlWord = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <!--[if gte mso 9]><xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml><![endif]-->
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    const fecha = new Date().toISOString().split('T')[0];
    const nombreCompleto = `${nombreArchivo}_${fecha}.doc`;
    const blob = new Blob([htmlWord], { type: 'application/msword;charset=utf-8' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombreCompleto;
    enlace.click();
    URL.revokeObjectURL(enlace.href);

    return { success: true, nombreArchivo: nombreCompleto };
  }

  static async exportarReporteHTML(datos = {}, itemsTOC = [], nombreArchivo = 'informe_portada_toc') {
    const html = await this.generarReporteHTML(datos, itemsTOC);
    const fecha = new Date().toISOString().split('T')[0];
    const nombreCompleto = `${nombreArchivo}_${fecha}.html`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombreCompleto;
    enlace.click();
    URL.revokeObjectURL(enlace.href);

    return { success: true, nombreArchivo: nombreCompleto };
  }

  static async mostrarReporte(datos = {}, itemsTOC = []) {
    const html = await this.generarReporteHTML(datos, itemsTOC);
    const ventana = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    if (ventana) {
      ventana.document.open();
      ventana.document.write(html);
      ventana.document.close();
      return { success: true };
    }
    return { success: false, error: 'No se pudo abrir la ventana del informe' };
  }

  static escapeHtml(valor) {
    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export default ReporteInformeMadreService;


