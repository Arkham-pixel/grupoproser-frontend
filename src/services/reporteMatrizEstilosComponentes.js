/** Estilos de tablas, mapas y componentes del reporte HTML — tema Fenix */

export const REPORTE_COMPONENTES_CSS = `
  /* —— Contenedores de tablas —— */
  .tabla-container-report {
    overflow-x: auto;
    margin: 16px 0;
    border-radius: 12px;
    border: 1px solid var(--fenix-borde, #f3f4f6);
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  .tabla-container-report--valoracion {
    border-color: rgba(220, 38, 38, 0.12);
  }

  .tabla-identificacion-report,
  .tabla-valoracion-report {
    width: max-content;
    min-width: 1200px;
    border-collapse: collapse;
    background: #fff;
    font-size: 0.82rem;
  }

  .tabla-identificacion-report th,
  .tabla-valoracion-report th {
    background: #f9fafb !important;
    background-image: none !important;
    color: #374151 !important;
    padding: 10px 8px;
    text-align: left;
    font-weight: 600;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border: 1px solid #e5e7eb;
    white-space: nowrap;
  }

  .tabla-identificacion-report thead tr:first-child th,
  .tabla-valoracion-report .thead-grupos th.grupo {
    background: var(--fenix-primario-claro, #fef2f2) !important;
    color: var(--fenix-primario-oscuro, #b91c1c) !important;
    text-align: center;
    font-size: 0.72rem;
  }

  .tabla-valoracion-report .thead-subgrupos th {
    background: #f3f4f6 !important;
    color: #4b5563 !important;
    text-align: center;
    font-size: 0.65rem;
  }

  .tabla-identificacion-report td,
  .tabla-valoracion-report td {
    padding: 8px;
    border: 1px solid #f3f4f6;
    color: #1f2937;
    vertical-align: top;
    line-height: 1.4;
  }

  .tabla-identificacion-report tbody tr:nth-child(even),
  .tabla-valoracion-report tbody tr:nth-child(even) {
    background: #fafafa;
  }

  .tabla-identificacion-report tbody tr:hover,
  .tabla-valoracion-report tbody tr:hover {
    background: #fef2f2;
  }

  .col-numero-report { text-align: center; font-weight: 600; min-width: 48px; }
  .col-categorias-report { text-align: center; min-width: 56px; }
  .col-categorias-report.marcada { background: #fef2f2; color: var(--fenix-primario); font-weight: 700; }

  .reporte-resumen-bloque + .reporte-resumen-bloque {
    margin-top: 12px;
  }

  .seccion-titulo-report {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 24px 0 16px;
    padding-left: 12px;
    border-left: 4px solid var(--fenix-primario, #dc2626);
    color: #1f2937;
    font-size: 1.15rem;
    font-weight: 700;
  }

  .icono-report { display: none; }

  .section-description-report,
  .identificacion-content-report > p,
  .valoracion-content-report > p {
    color: #6b7280;
    font-size: 0.9rem;
    margin: 0 0 16px;
  }

  /* —— Resúmenes (antes de tablas Excel) —— */
  .reporte-resumen-bloque {
    margin: 0 0 20px;
    padding: 16px 18px;
    background: var(--fenix-fondo, #f9fafb);
    border: 1px solid var(--fenix-borde, #f3f4f6);
    border-radius: 14px;
  }

  .reporte-resumen-titulo {
    margin: 0 0 14px;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--fenix-texto, #1f2937);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .reporte-resumen-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 10px;
  }

  .resumen-riesgos-report,
  .resumen-valoracion-report {
    margin: 0;
  }

  .categorias-resumen-report,
  .resumen-grid-report {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 10px;
  }

  .categoria-resumen-report,
  .resumen-item-report {
    background: #fff;
    border: 1px solid #f3f4f6;
    border-radius: 12px;
    padding: 14px;
    text-align: center;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  }

  .resumen-item-report {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 88px;
  }

  .resumen-content-report {
    text-align: center;
  }

  .resumen-content-report h5 {
    margin: 0;
  }

  .resumen-content-report .resumen-numero-report {
    margin: 4px 0 0;
  }

  .categoria-count-report,
  .resumen-numero-report {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--fenix-primario, #dc2626) !important;
    background: transparent !important;
  }

  .categoria-nombre-report,
  .resumen-content-report h5 {
    font-size: 0.78rem;
    color: #6b7280;
    margin: 4px 0 0;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .sin-riesgos,
  .sin-valoraciones-report {
    text-align: center;
    padding: 32px 20px;
    background: #f9fafb;
    border-radius: 12px;
    border: 1px dashed #e5e7eb;
    color: #6b7280;
  }

  .sin-riesgos-icono-report,
  .sin-valoraciones-icono-report { display: none; }

  /* —— Mapa de calor —— */
  .mapas-container-export {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 20px;
    margin: 20px 0;
  }

  .mapa-calor-export {
    background: #fff;
    border: 1px solid #f3f4f6;
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  .mapa-calor-export h4 {
    margin: 0 0 12px;
    font-size: 1rem;
    color: #1f2937;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--fenix-primario-claro, #fef2f2);
  }

  .heatmap-grid-export {
    display: grid;
    grid-template-columns: repeat(5, 56px);
    grid-template-rows: repeat(5, 56px);
    gap: 3px;
    margin: 12px auto;
    width: fit-content;
  }

  .heatmap-grid-export .heatmap-row { display: contents; }

  .heatmap-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 600;
    color: #1f2937;
    border: 1px solid rgba(0, 0, 0, 0.06);
    min-width: 56px;
    min-height: 56px;
  }

  .tabla-resumen-mapa-scroll {
    overflow-x: auto;
    margin-top: 12px;
    border-radius: 8px;
    border: 1px solid #f3f4f6;
  }

  .tabla-resumen-mapa {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }

  .tabla-resumen-mapa th {
    background: #f9fafb;
    padding: 8px;
    font-size: 0.7rem;
    text-transform: uppercase;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
  }

  .tabla-resumen-mapa td {
    padding: 8px;
    border-bottom: 1px solid #f3f4f6;
  }

  /* —— Niveles de riesgo —— */
  .nivel-critico, .celda-critico, .heatmap-critico { background: #fee2e2 !important; color: #991b1b !important; }
  .nivel-alto, .celda-alto, .heatmap-alto { background: #ffedd5 !important; color: #9a3412 !important; }
  .nivel-medio, .celda-medio, .heatmap-medio { background: #fef9c3 !important; color: #854d0e !important; }
  .nivel-bajo, .celda-bajo, .heatmap-bajo { background: #dcfce7 !important; color: #166534 !important; }

  /* —— Banner interactivo —— */
  .reporte-banner-interactivo {
    position: sticky;
    top: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: linear-gradient(90deg, #1f2937 0%, #111827 100%);
    color: #f9fafb;
    padding: 14px 24px;
    font-size: 0.88rem;
    border-bottom: 3px solid var(--fenix-primario, #dc2626);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .reporte-banner-interactivo strong { color: #fca5a5; }

  .reporte-tabla-scroll-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
    color: var(--fenix-primario, #dc2626);
    margin: 12px 0 8px;
    font-weight: 600;
    padding: 8px 12px;
    background: var(--fenix-primario-claro, #fef2f2);
    border-radius: 8px;
    border: 1px solid rgba(220, 38, 38, 0.15);
  }

  .reporte-tabla-scroll-hint::before { content: '↔'; font-size: 1.1rem; }

  .reporte-tabla-arrastrable {
    cursor: grab;
    overflow-x: auto !important;
    max-width: 100%;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: var(--fenix-primario, #dc2626) #f3f4f6;
  }

  .reporte-tabla-arrastrable.is-dragging { cursor: grabbing; user-select: none; }

  .reporte-tabla-arrastrable::-webkit-scrollbar { height: 10px; }
  .reporte-tabla-arrastrable::-webkit-scrollbar-thumb {
    background: var(--fenix-primario, #dc2626);
    border-radius: 8px;
  }
  .reporte-tabla-arrastrable::-webkit-scrollbar-track { background: #f3f4f6; border-radius: 8px; }

  /* —— Nav mejorada —— */
  .reporte-nav-link:hover {
    background: var(--fenix-primario-claro, #fef2f2);
    color: var(--fenix-primario, #dc2626);
    border-color: rgba(220, 38, 38, 0.15);
    transform: translateX(2px);
  }

  /* —— Nav mejorada —— */
  .valoracion-info {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 20px;
    margin: 0 0 20px;
    padding: 14px 18px;
    background: var(--fenix-fondo, #f9fafb);
    border: 1px solid var(--fenix-borde, #f3f4f6);
    border-radius: 12px;
  }

  .valoracion-badge {
    display: inline-flex;
    align-items: center;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .valoracion-badge.inicial {
    background: var(--fenix-primario-claro, #fef2f2);
    color: var(--fenix-primario, #dc2626);
    border: 1px solid rgba(220, 38, 38, 0.2);
  }

  .valoracion-badge.anual {
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid rgba(29, 78, 216, 0.2);
  }

  .fecha-valoracion {
    font-size: 0.9rem;
    color: var(--fenix-texto-suave, #6b7280);
  }

  .mapas-container-export--uno {
    grid-template-columns: 1fr !important;
  }

  .mapa-contenedor-export {
    background: #fff;
    border: 1px solid var(--fenix-borde, #f3f4f6);
    border-radius: 14px;
    padding: 18px;
    margin-bottom: 16px;
  }

  .mapa-export-titulo {
    margin: 16px 0 8px;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--fenix-texto, #1f2937);
    text-align: center;
  }

  .nota-mapa-impresion {
    font-size: 0.78rem;
    color: var(--fenix-texto-suave, #6b7280);
    text-align: center;
    margin: 0 0 12px;
    font-style: italic;
  }

  .mapa-stats-compact {
    margin: 12px 0 0;
    padding: 10px 14px;
    background: var(--fenix-primario-claro, #fef2f2);
    border-radius: 8px;
    font-size: 0.82rem;
    color: var(--fenix-texto, #1f2937);
    text-align: center;
    font-weight: 500;
  }

  .tabla-resumen-mapa-block { margin-bottom: 16px; }

  .tabla-resumen-mapa-titulo {
    margin: 0 0 8px;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--fenix-texto, #1f2937);
  }

  .tabla-resumen-mapa-vacio {
    margin: 0;
    font-size: 0.85rem;
    color: var(--fenix-texto-suave, #6b7280);
    font-style: italic;
  }

  .tabla-resumen-mapa-codigo {
    font-weight: 700;
    color: var(--fenix-primario, #dc2626);
    white-space: nowrap;
  }

  .tabla-leyenda-mapa-nombre {
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tabla-leyenda-mapa-nivel {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .mapa-detalle-celdas-export {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed var(--fenix-borde, #f3f4f6);
  }

  .mapa-detalle-celdas-titulo {
    margin: 0 0 4px;
    font-size: 0.95rem;
    font-weight: 700;
  }

  .mapa-detalle-celdas-ayuda {
    margin: 0 0 12px;
    font-size: 0.8rem;
    color: var(--fenix-texto-suave, #6b7280);
  }

  .mapa-detalle-celda-grupo {
    background: var(--fenix-fondo, #f9fafb);
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 10px;
  }

  .mapa-detalle-celda-titulo {
    margin: 0 0 8px;
    font-size: 0.85rem;
    color: var(--fenix-texto, #1f2937);
  }

  .mapa-detalle-celda-lista {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .mapa-detalle-celda-lista li {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: baseline;
    font-size: 0.82rem;
    padding: 6px 8px;
    background: #fff;
    border-radius: 6px;
    border: 1px solid var(--fenix-borde, #f3f4f6);
  }

  .mapa-detalle-codigo {
    font-weight: 700;
    color: var(--fenix-primario, #dc2626);
  }

  .mapa-detalle-calif {
    margin-left: auto;
    font-weight: 600;
    color: var(--fenix-texto-suave, #6b7280);
  }

  .riesgo-marcador {
    background: rgba(255, 255, 255, 0.95);
    color: #1f2937;
    padding: 3px 7px;
    border-radius: 8px;
    font-size: 0.72rem;
    font-weight: 700;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.8);
  }

  .mapa-calor-info {
    margin-top: 20px;
    padding: 18px 20px;
    background: #fff;
    border: 1px solid var(--fenix-borde, #f3f4f6);
    border-radius: 14px;
  }

  .mapa-calor-info h3 {
    margin: 0 0 14px;
    font-size: 1rem;
    font-weight: 700;
    color: var(--fenix-texto, #1f2937);
    text-align: center;
  }

  .leyenda {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
  }

  .leyenda-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: var(--fenix-fondo, #f9fafb);
    border: 1px solid var(--fenix-borde, #f3f4f6);
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--fenix-texto, #1f2937);
  }

  .color-box {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .leyenda-bajo { background: #16a34a; }
  .leyenda-medio { background: #ca8a04; }
  .leyenda-alto { background: #ea580c; }
  .leyenda-critico { background: #dc2626; }

  /* —— Identificación: resúmenes —— */
  .categoria-item-report,
  .tipo-item-report {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: #fff;
    border: 1px solid var(--fenix-borde, #f3f4f6);
    border-radius: 12px;
    padding: 12px 10px;
    text-align: center;
    min-height: 72px;
  }

  .categoria-icono-report { display: none; }

  .tipos-proceso-report {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
  }

  .tipos-proceso-report h4,
  .resumen-riesgos-report h4,
  .resumen-valoracion-report h4 {
    margin: 0;
  }

  .tipo-nombre-report {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--fenix-texto, #1f2937);
  }

  .tipo-count-report {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--fenix-primario, #dc2626);
  }

  .resumen-icono-report { display: none; }

  .text-center-report { text-align: center; }

  @media (max-width: 768px) {
    .reporte-header { padding: 20px; }
    .reporte-header-logos { flex-direction: column; align-items: flex-start; }
    .reporte-layout { flex-direction: column; }
    .reporte-nav { position: static; width: 100%; height: auto; }
  }
`;

export const REPORTE_INTERACTIVO_INLINE_CSS = REPORTE_COMPONENTES_CSS;
