/** Tema Fenix compartido — reporte HTML y referencia de colores PDF */

export const REPORTE_COLORES = {
  primario: '#DC2626',
  primarioOscuro: '#B91C1C',
  primarioClaro: '#FEF2F2',
  texto: '#1F2937',
  textoSuave: '#6B7280',
  borde: '#F3F4F6',
  fondo: '#F9FAFB',
  blanco: '#FFFFFF',
  verde: '#16A34A',
  amarillo: '#CA8A04',
  naranja: '#EA580C',
  rojo: '#DC2626',
};

export const REPORTE_FENIX_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700&display=swap');

  :root {
    --fenix-primario: ${REPORTE_COLORES.primario};
    --fenix-primario-oscuro: ${REPORTE_COLORES.primarioOscuro};
    --fenix-primario-claro: ${REPORTE_COLORES.primarioClaro};
    --fenix-texto: ${REPORTE_COLORES.texto};
    --fenix-texto-suave: ${REPORTE_COLORES.textoSuave};
    --fenix-borde: ${REPORTE_COLORES.borde};
    --fenix-fondo: ${REPORTE_COLORES.fondo};
  }

  * { box-sizing: border-box; }

  body {
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif !important;
    line-height: 1.55 !important;
    color: var(--fenix-texto) !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: var(--fenix-fondo) !important;
  }

  .reporte-layout {
    display: flex;
    align-items: flex-start;
    gap: 0;
    min-height: 100vh;
  }

  .reporte-nav {
    position: sticky;
    top: 0;
    width: 240px;
    min-width: 240px;
    height: 100vh;
    overflow-y: auto;
    background: #fff;
    border-right: 1px solid var(--fenix-borde);
    padding: 20px 16px;
    z-index: 10;
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.04);
  }

  .reporte-nav-titulo {
    font-family: 'Montserrat', 'Inter', sans-serif;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--fenix-primario);
    margin: 0 0 4px;
  }

  .reporte-nav-sub {
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--fenix-texto-suave);
    margin: 0 0 14px;
  }

  .reporte-nav-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    margin-bottom: 4px;
    border-radius: 10px;
    color: var(--fenix-texto);
    text-decoration: none;
    font-size: 0.88rem;
    font-weight: 500;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    border: 1px solid transparent;
  }

  .reporte-nav-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--fenix-primario-claro);
    color: var(--fenix-primario);
    font-size: 0.72rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .reporte-nav-texto {
    line-height: 1.3;
  }

  .reporte-nav-link:hover .reporte-nav-num {
    background: var(--fenix-primario);
    color: #fff;
  }

  .reporte-contenido-principal {
    flex: 1;
    min-width: 0;
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 28px 40px;
  }

  .reporte-seccion-ancla {
    scroll-margin-top: 56px;
  }

  .reporte-header {
    background: linear-gradient(135deg, var(--fenix-primario) 0%, var(--fenix-primario-oscuro) 100%);
    color: #fff;
    padding: 28px 32px;
    border-radius: 16px;
    margin-bottom: 24px;
    box-shadow: 0 8px 24px rgba(220, 38, 38, 0.18);
    position: relative;
    overflow: hidden;
  }

  .reporte-header::after {
    content: '';
    position: absolute;
    top: -40%;
    right: -10%;
    width: 280px;
    height: 280px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 50%;
    pointer-events: none;
  }

  .reporte-header-logos {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255,255,255,0.2);
    position: relative;
    z-index: 1;
  }

  .reporte-img-logo-plataforma {
    height: 36px;
    width: auto;
    max-width: 200px;
    object-fit: contain;
    display: block;
  }

  .reporte-logo-plataforma-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 10px;
    padding: 6px 14px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .reporte-logo-empresa {
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: right;
  }

  .reporte-img-icono-empresa,
  .reporte-img-logo-empresa {
    height: 40px;
    width: auto;
    max-width: 120px;
    object-fit: contain;
    border-radius: 8px;
    background: rgba(255,255,255,0.9);
    padding: 4px 8px;
  }

  .reporte-logo-texto {
    font-family: 'Montserrat', 'Inter', sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .reporte-empresa-texto {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .reporte-empresa-nombre {
    font-size: 1rem;
    font-weight: 700;
  }

  .reporte-empresa-sub {
    font-size: 0.78rem;
    opacity: 0.85;
  }

  .reporte-header h1 {
    font-family: 'Montserrat', 'Inter', sans-serif;
    margin: 0 0 8px;
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .reporte-header-contenido { text-align: left; position: relative; z-index: 1; }

  .reporte-header-meta,
  .reporte-header-responsable {
    margin: 4px 0;
    opacity: 0.95;
    font-size: 0.95rem;
  }

  .reporte-footer {
    margin-top: 32px;
    padding: 24px;
    background: #fff;
    border: 1px solid var(--fenix-borde);
    border-radius: 16px;
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .reporte-footer-logos {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    min-width: 140px;
  }

  .reporte-footer-logo-empresa {
    height: 32px;
    width: auto;
    max-width: 120px;
    object-fit: contain;
  }

  .reporte-footer-logo {
    height: 36px;
    width: auto;
    max-width: 180px;
    object-fit: contain;
  }

  .reporte-footer-texto p {
    margin: 4px 0;
    font-size: 0.85rem;
    color: var(--fenix-texto-suave);
  }

  .recomendaciones-container-report {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 16px;
  }

  .recomendacion-card-report {
    border: 1px solid var(--fenix-borde);
    border-radius: 14px;
    overflow: hidden;
    background: #fff;
  }

  .recomendacion-header-report {
    background: var(--fenix-primario-claro);
    border-bottom: 1px solid rgba(220, 38, 38, 0.12);
    padding: 14px 18px;
  }

  .recomendacion-header-report h3 {
    margin: 0 0 4px;
    font-size: 1rem;
    color: var(--fenix-texto);
  }

  .fecha-recomendacion-report {
    margin: 0;
    font-size: 0.85rem;
    color: var(--fenix-texto-suave);
  }

  .recomendacion-content-report {
    padding: 16px 18px;
  }

  .recomendacion-descripcion-report h4 {
    margin: 0 0 8px;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--fenix-texto-suave);
  }

  .recomendacion-descripcion-report p {
    margin: 0;
    white-space: pre-wrap;
    line-height: 1.6;
  }

  .seguimientos-container-report {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed var(--fenix-borde);
  }

  .seguimientos-container-report h4 {
    margin: 0 0 10px;
    font-size: 0.9rem;
    color: var(--fenix-texto);
  }

  .seguimiento-item-report {
    background: var(--fenix-fondo);
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 8px;
    font-size: 0.9rem;
  }

  .fecha-seguimiento-report {
    margin-left: 8px;
    color: var(--fenix-primario);
    font-weight: 600;
  }

  .comentarios-report {
    margin-top: 8px;
    color: var(--fenix-texto);
    white-space: pre-wrap;
  }

  body.modo-exportacion .reporte-acciones {
    display: none !important;
  }

  .reporte-acciones {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    margin-bottom: 20px;
    background: #1F2937;
    border-radius: 12px;
    color: #fff;
  }

  .reporte-acciones button {
    background: var(--fenix-primario);
    color: #fff;
    border: none;
    padding: 10px 18px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .reporte-acciones-hint {
    font-size: 0.82rem;
    opacity: 0.9;
  }

  .header {
    background: linear-gradient(135deg, var(--fenix-primario) 0%, var(--fenix-primario-oscuro) 100%) !important;
    color: #fff !important;
    padding: 32px 28px !important;
    border-radius: 16px !important;
    text-align: center !important;
    margin-bottom: 24px !important;
    box-shadow: 0 8px 24px rgba(220, 38, 38, 0.18) !important;
    border: none !important;
  }

  .header h1 {
    margin: 0 0 8px !important;
    font-size: 2rem !important;
    font-weight: 700 !important;
    letter-spacing: -0.02em !important;
  }

  .header p {
    margin: 4px 0 !important;
    opacity: 0.95 !important;
    font-size: 0.95rem !important;
  }

  .section {
    background: var(--fenix-blanco, #fff) !important;
    margin: 0 0 20px !important;
    padding: 24px !important;
    border-radius: 16px !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
    border: 1px solid var(--fenix-borde) !important;
    border-left: 4px solid var(--fenix-primario) !important;
  }

  .section h2 {
    font-family: 'Montserrat', 'Inter', sans-serif !important;
    color: var(--fenix-texto) !important;
    margin: 0 0 6px !important;
    font-size: 1.35rem !important;
    font-weight: 700 !important;
    border-bottom: none !important;
    padding-bottom: 0 !important;
  }

  .section-subtitulo {
    color: var(--fenix-texto-suave);
    font-size: 0.9rem;
    margin: 0 0 20px;
  }

  .reporte-acciones {
    background: #1F2937 !important;
    border-radius: 12px !important;
  }

  .reporte-acciones button {
    background: var(--fenix-primario) !important;
    border-radius: 10px !important;
  }

  .info-tabs-report,
  .tab-button-report,
  .welcome-card-report,
  .quick-start-grid-report,
  .benefits-grid-report,
  .process-intro-report,
  .categories-intro-report,
  .criteria-intro-report,
  .heatmap-intro-report,
  .tab-content-report .tab-panel-report:not(.reporte-solo-datos) {
    display: none !important;
  }

  .fenix-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 14px;
    margin: 16px 0;
  }

  .fenix-info-card {
    background: var(--fenix-fondo);
    border: 1px solid var(--fenix-borde);
    border-radius: 12px;
    padding: 14px 16px;
  }

  .fenix-info-card label {
    display: block;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--fenix-texto-suave);
    margin-bottom: 4px;
  }

  .fenix-info-card p {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--fenix-texto);
    word-break: break-word;
  }

  .fenix-info-card--wide { grid-column: 1 / -1; }

  .fenix-stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin: 16px 0;
  }

  .fenix-stat {
    background: var(--fenix-primario-claro);
    border: 1px solid rgba(220, 38, 38, 0.12);
    border-radius: 12px;
    padding: 14px;
    text-align: center;
  }

  .fenix-stat strong {
    display: block;
    font-size: 1.5rem;
    color: var(--fenix-primario);
    line-height: 1.2;
  }

  .fenix-stat span {
    font-size: 0.78rem;
    color: var(--fenix-texto-suave);
    font-weight: 500;
  }

  .tabla-identificacion-report th,
  .tabla-valoracion-report th,
  .tabla-riesgos th {
    background: var(--fenix-primario) !important;
    background-image: none !important;
  }

  .seccion-titulo-report,
  .resumen-riesgos-report h4,
  .resumen-valoracion-report h4 {
    color: var(--fenix-texto) !important;
  }

  .categoria-count-report,
  .resumen-numero-report {
    color: var(--fenix-primario) !important;
    background: var(--fenix-primario-claro) !important;
    background-image: none !important;
  }

  .footer {
    background: #fff !important;
    border: 1px solid var(--fenix-borde) !important;
    border-radius: 12px !important;
    color: var(--fenix-texto-suave) !important;
  }

  .nivel-critico { background: #FEE2E2 !important; color: #991B1B !important; }
  .nivel-alto { background: #FFEDD5 !important; color: #9A3412 !important; }
  .nivel-medio { background: #FEF9C3 !important; color: #854D0E !important; }
  .nivel-bajo { background: #DCFCE7 !important; color: #166534 !important; }

  @media print {
    @page { size: A4 landscape; margin: 8mm; }
    body { background: #fff !important; padding: 0 !important; max-width: none !important; }
    .no-print, .reporte-nav { display: none !important; }
    .reporte-layout { display: block !important; }
    .reporte-contenido-principal { max-width: none !important; padding: 0 !important; }
    .section { break-inside: auto; box-shadow: none !important; }
    .tabla-container-report { overflow: visible !important; }
    .tabla-identificacion-report,
    .tabla-valoracion-report { min-width: 0 !important; width: 100% !important; font-size: 7pt; table-layout: fixed; }
    .tabla-valoracion-report { font-size: 5.5pt; }
    .heatmap-grid-export {
      display: grid !important;
      grid-template-columns: repeat(5, 52px);
      grid-template-rows: repeat(5, 52px);
      gap: 2px;
    }
    .heatmap-grid-export .heatmap-row { display: contents !important; }
    .reporte-header-logos { break-inside: avoid; }
    .recomendacion-card-report { break-inside: avoid-page; }
  }
`;
