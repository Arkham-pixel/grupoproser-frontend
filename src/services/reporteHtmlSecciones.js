/** Secciones y layout HTML del reporte (Fenix + navegación interactiva) */

import { generarNavEjecutivoHtml } from './reporteEjecutivoHtml.js';

function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const SECCIONES_REPORTE = [
  { id: 'seccion-informacion', titulo: 'Información general', num: '01' },
  { id: 'seccion-identificacion', titulo: 'Identificación de riesgos', num: '02' },
  { id: 'seccion-valoracion', titulo: 'Valoración de riesgos', num: '03' },
  { id: 'seccion-mapa-calor', titulo: 'Mapa de calor', num: '04' },
  { id: 'seccion-recomendaciones', titulo: 'Recomendaciones', num: '05' },
];

export function generarNavReporteHtml() {
  const enlacesEjecutivos = generarNavEjecutivoHtml();
  const enlaces = SECCIONES_REPORTE.map(
    (s) => `
      <a class="reporte-nav-link" href="#${s.id}">
        <span class="reporte-nav-num">${s.num}</span>
        <span class="reporte-nav-texto">${escapar(s.titulo)}</span>
      </a>`
  ).join('');

  return `
    <nav class="reporte-nav no-print" aria-label="Índice del reporte">
      <div class="reporte-nav-inner">
        <p class="reporte-nav-titulo">ARNALD Data Flow</p>
        <p class="reporte-nav-sub">Informe general</p>
        <a class="reporte-nav-link" href="#seccion-informacion">
          <span class="reporte-nav-num">00</span>
          <span class="reporte-nav-texto">Información general</span>
        </a>
        ${enlacesEjecutivos}
        <p class="reporte-nav-sub">Detalle técnico</p>
        ${enlaces}
      </div>
    </nav>`;
}

export function generarCabeceraReporteHtml({
  assets = {},
  informacion = {},
  fechaFormateada,
  horaFormateada,
  tipoReporte,
}) {
  const logoPlataforma = assets.logoPlataforma || assets.arnaldLogoUrl || '';
  const logoEmpresa = assets.logoEmpresa || assets.logoEmpresaUrl || assets.iconoPlataforma || assets.arnaldIconUrl || '';
  const empresa = informacion.nombreEmpresa || 'Empresa';

  return `
    <header class="reporte-header">
      <div class="reporte-header-logos">
        <div class="reporte-logo-plataforma">
          ${
            logoPlataforma
              ? `<span class="reporte-logo-plataforma-badge"><img src="${logoPlataforma}" alt="ARNALD Data Flow" class="reporte-img-logo-plataforma" /></span>`
              : '<span class="reporte-logo-texto">ARNALD Data Flow</span>'
          }
        </div>
        <div class="reporte-logo-empresa">
          ${
            logoEmpresa
              ? `<img src="${logoEmpresa}" alt="Grupo Proser" class="reporte-img-logo-empresa" />`
              : ''
          }
          <div class="reporte-empresa-texto">
            <span class="reporte-empresa-nombre">${escapar(empresa)}</span>
            <span class="reporte-empresa-sub">Grupo Proser</span>
          </div>
        </div>
      </div>
      <div class="reporte-header-contenido">
        <h1>Matriz de Riesgos</h1>
        <p class="reporte-header-meta">
          Reporte ${tipoReporte === 'anual' ? 'anual' : 'inicial'} · ${escapar(fechaFormateada)} · ${escapar(horaFormateada)}
        </p>
        ${informacion.responsable ? `<p class="reporte-header-responsable">Responsable: ${escapar(informacion.responsable)}</p>` : ''}
      </div>
    </header>`;
}

export function generarPieReporteHtml(assets = {}) {
  const logoPlataforma = assets.logoPlataforma || assets.arnaldLogoUrl || '';
  const logoEmpresa = assets.logoEmpresa || assets.logoEmpresaUrl || '';
  return `
    <footer class="reporte-footer">
      <div class="reporte-footer-logos">
        ${
          logoEmpresa
            ? `<img src="${logoEmpresa}" alt="Grupo Proser" class="reporte-footer-logo-empresa" />`
            : ''
        }
        ${
          logoPlataforma
            ? `<img src="${logoPlataforma}" alt="ARNALD Data Flow" class="reporte-footer-logo" />`
            : '<span>ARNALD Data Flow</span>'
        }
      </div>
      <div class="reporte-footer-texto">
        <p><strong>ARNALD Data Flow · Grupo Proser</strong></p>
        <p>Reporte interactivo confidencial. Arrastre las tablas anchas para ver todas las columnas.</p>
      </div>
    </footer>`;
}

export function envolverSeccion(id, html) {
  if (!html || !String(html).trim()) return '';
  return `<div id="${id}" class="reporte-seccion-ancla">${html}</div>`;
}

export function generarSeccionInformacionModerna(informacion = {}) {
  const ingeniero = informacion.ingeniero || {};
  const campos = [
    ['Nombre de la empresa', informacion.nombreEmpresa],
    ['Responsable', informacion.responsable],
    ['Versión', informacion.version],
    ['Fecha de creación', informacion.fechaCreacion],
    ['Ingeniero', ingeniero.nombre],
    ['Cargo', ingeniero.cargo],
    ['Teléfono', ingeniero.telefono],
    ['Email', ingeniero.email],
    ['Empresa del ingeniero', ingeniero.empresa],
    ['Dirección', ingeniero.direccion],
  ].filter(([, v]) => v);

  const tarjetas = campos
    .map(
      ([label, value]) => `
      <div class="fenix-info-card">
        <label>${escapar(label)}</label>
        <p>${escapar(value)}</p>
      </div>`
    )
    .join('');

  const descripcion = informacion.descripcion
    ? `
      <div class="fenix-info-card fenix-info-card--wide">
        <label>Descripción de la matriz</label>
        <p>${escapar(informacion.descripcion)}</p>
      </div>`
    : '';

  const inner = `
    <div class="section reporte-card">
      <h2>Información general</h2>
      <p class="section-subtitulo">Datos de la empresa, responsables y alcance del análisis</p>
      <div class="fenix-info-grid">
        ${tarjetas}
        ${descripcion}
      </div>
    </div>`;

  return envolverSeccion('seccion-informacion', inner);
}
