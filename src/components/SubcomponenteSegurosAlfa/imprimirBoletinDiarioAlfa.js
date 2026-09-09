/**
 * Imprime / PDF del boletín diario Alfa unificado (5 secciones).
 */

function esc(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtVar(n) {
  const v = Number(n) || 0;
  if (v > 0) return `+${v}`;
  return String(v);
}

function estilosImpresion() {
  return `
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif;
      color: #1E1E1E;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 { font-size: 20px; margin: 0 0 4px; font-family: Montserrat, Inter, sans-serif; }
    h2 { font-size: 14px; margin: 0 0 8px; font-family: Montserrat, Inter, sans-serif; }
    .sub { color: #6B6B6B; font-size: 12px; margin: 0 0 14px; }
    .section {
      border: 1px solid #E6E6E6;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #E6E6E6; padding: 6px 8px; }
    th { background: #F5F5F7; text-align: left; }
    th.num, td.num { text-align: center; font-variant-numeric: tabular-nums; }
    th.hoy { background: #DC2626; color: #fff; text-align: center; }
    td.hoy { background: #FEF2F2; text-align: center; font-weight: 700; }
    .footer { margin-top: 10px; text-align: center; font-size: 10px; color: #9CA3AF; }
  `;
}

function tablaHtml({ titulo, headers, rows }) {
  const th = headers
    .map((h) => `<th class="${h.num ? 'num' : ''} ${h.hoy ? 'hoy' : ''}">${esc(h.label)}</th>`)
    .join('');
  const tr = rows
    .map((r) => {
      const cells = r
        .map((c, i) => {
          const h = headers[i] || {};
          const cls = h.hoy ? 'hoy' : h.num ? 'num' : '';
          return `<td class="${cls}">${esc(c)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');
  return `
    <section class="section">
      <h2>${esc(titulo)}</h2>
      <table>
        <thead><tr>${th}</tr></thead>
        <tbody>${tr}</tbody>
      </table>
    </section>`;
}

export function construirHtmlBoletinDiarioAlfa(boletin, labels = {}) {
  const L = labels;
  const { resumen, gestion, siniestro, cierresDia, perdidas } = boletin;

  const s1 = tablaHtml({
    titulo: L.s1 || '1. Resumen general de cartera',
    headers: [
      { label: L.indicador || 'Indicador' },
      { label: L.totalCasos || 'Total casos', num: true },
    ],
    rows: (resumen?.filas || []).map((f) => [f.label, f.cantidad]),
  });

  const s2 = tablaHtml({
    titulo: L.s2 || '2. Estado de gestión actual',
    headers: [
      { label: L.estadoGestion || 'Estado de gestión' },
      { label: L.ayer || 'Día anterior', num: true },
      { label: L.hoy || 'Hoy', num: true, hoy: true },
      { label: L.avance || 'Avance', num: true },
    ],
    rows: (gestion?.filas || []).map((f) => [f.label, f.ayer, f.hoy, fmtVar(f.avance)]),
  });

  const s3 = tablaHtml({
    titulo: L.s3 || '3. Estado del siniestro',
    headers: [
      { label: L.estadoSiniestro || 'Estado del siniestro' },
      { label: L.ayer || 'Día anterior', num: true },
      { label: L.hoy || 'Hoy', num: true, hoy: true },
      { label: L.movimiento || 'Movimiento', num: true },
    ],
    rows: (siniestro?.filas || []).map((f) => [f.label, f.ayer, f.hoy, fmtVar(f.avance)]),
  });

  const s4 = tablaHtml({
    titulo: L.s4 || '4. Cierres del día',
    headers: [
      { label: L.resultado || 'Resultado' },
      { label: L.cantidad || 'Cantidad', num: true },
    ],
    rows: (cierresDia?.filas || []).map((f) => [f.label, f.cantidad]),
  });

  const s5 = tablaHtml({
    titulo: L.s5 || '5. Clasificación de pérdidas',
    headers: [
      { label: L.tipoPerdida || 'Tipo de pérdida' },
      { label: L.cantidad || 'Cantidad', num: true },
    ],
    rows: (perdidas?.filas || []).map((f) => [f.label, f.cantidad]),
  });

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${esc(L.docTitle || L.title || 'Boletín diario Alfa')}</title>
  <style>${estilosImpresion()}</style>
</head>
<body>
  <h1>${esc(L.title || 'Boletín diario')}</h1>
  <p class="sub">${esc(L.subtitle || '')}</p>
  <p class="sub">${esc(L.cutLabel || L.cutOff || '')}</p>
  ${s1}${s2}${s3}${s4}${s5}
  <div class="footer">Grupo Proser · Seguros Alfa · ${esc(boletin.etiquetaHoyCorta || '')}</div>
</body>
</html>`;
}

export function imprimirBoletinDiarioAlfa(boletin, labels = {}) {
  const html = construirHtmlBoletinDiarioAlfa(boletin, labels);
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!w) {
    throw new Error('No se pudo abrir la ventana de impresión (popup bloqueado).');
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  const trigger = () => {
    try {
      w.focus();
      w.print();
    } catch {
      /* ok */
    }
  };
  if (w.document.readyState === 'complete') {
    setTimeout(trigger, 250);
  } else {
    w.onload = () => setTimeout(trigger, 250);
  }
}
