/** JavaScript embebido en el .html descargable — tablas con arrastre horizontal */
export const REPORTE_INTERACTIVO_JS = `
(function () {
  function initTablasArrastrables() {
    document.querySelectorAll(
      '.tabla-valoracion-container, .tabla-container, .tabla-formulario-container, .tabla-resumen-mapa-scroll, .reporte-tabla-scroll, .tabla-container-report'
    ).forEach(function (el) {
      if (el.dataset.arrastreListo === '1') return;
      el.dataset.arrastreListo = '1';
      el.classList.add('reporte-tabla-arrastrable');

      var activo = false;
      var inicioX = 0;
      var scrollInicial = 0;

      el.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        if (e.target.closest('button, a')) return;
        activo = true;
        inicioX = e.pageX;
        scrollInicial = el.scrollLeft;
        el.classList.add('is-dragging');
        e.preventDefault();
      });

      window.addEventListener('mouseup', function () {
        activo = false;
        el.classList.remove('is-dragging');
      });

      el.addEventListener('mousemove', function (e) {
        if (!activo) return;
        e.preventDefault();
        el.scrollLeft = scrollInicial - (e.pageX - inicioX);
      });
    });
  }

  document.querySelectorAll('.reporte-nav-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (!id || id.charAt(0) !== '#') return;
      e.preventDefault();
      var destino = document.querySelector(id);
      if (destino) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  initTablasArrastrables();
  window.addEventListener('load', initTablasArrastrables);
  setTimeout(initTablasArrastrables, 500);
  setTimeout(initTablasArrastrables, 1500);
})();
`;

export const REPORTE_INTERACTIVO_CSS_EXTRA = `
  .reporte-banner-interactivo {
    position: sticky;
    top: 0;
    z-index: 100;
    background: #1f2937;
    color: #fff;
    padding: 12px 20px;
    font-family: Inter, system-ui, sans-serif;
    font-size: 0.9rem;
    border-bottom: 3px solid #dc2626;
  }
  .reporte-banner-interactivo strong { color: #fca5a5; }
  .reporte-tabla-arrastrable {
    cursor: grab;
    overflow-x: auto !important;
    max-width: 100%;
    -webkit-overflow-scrolling: touch;
    scrollbar-color: #dc2626 #f3f4f6;
    border-bottom: 3px solid rgba(220, 38, 38, 0.3);
    margin-bottom: 8px;
  }
  .reporte-tabla-arrastrable.is-dragging { cursor: grabbing; user-select: none; }
  .reporte-tabla-arrastrable .tabla-valoracion,
  .reporte-tabla-arrastrable .tabla-identificacion-report,
  .reporte-tabla-arrastrable .tabla-valoracion-report,
  .reporte-tabla-arrastrable .tabla-identificacion {
    width: max-content !important;
    min-width: 2000px;
  }
  .reporte-tabla-scroll-hint {
    font-size: 0.8rem;
    color: #dc2626;
    margin: 8px 0 4px;
    font-weight: 600;
  }
  @media print {
    .reporte-banner-interactivo { display: none !important; }
  }
`;
