/**
 * Imprime / PDF del boletín diario Alfa:
 * 1. Gestión terremoto · 2. Estado de gestión · 3. Estado del siniestro
 * · 4. Cierres del día · 5. Clasificación de pérdidas.
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
    h2 { font-size: 16px; margin: 0 0 6px; font-family: Montserrat, Inter, sans-serif; color: #1E1E1E; }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #DC2626; margin: 0 0 4px; }
    .sub { color: #6B6B6B; font-size: 12px; margin: 0 0 14px; }
    .section {
      border: 1px solid #E6E6E6;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 14px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .section.page-break { page-break-before: always; break-before: page; }
    .row-between { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
    .pill {
      display: inline-flex; align-items: center; gap: 6px;
      border: 2px solid #DC2626; color: #DC2626; border-radius: 999px;
      padding: 4px 12px; font-size: 12px; font-weight: 700;
    }
    .chip {
      display: inline-flex; align-items: center; gap: 6px;
      background: #FEF2F2; color: #DC2626; border-radius: 8px;
      padding: 4px 10px; font-size: 11px; font-weight: 600;
    }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 12px; }
    .card {
      border: 1px solid #E6E6E6; border-radius: 10px; padding: 10px; background: #fff;
    }
    .card .n { font-size: 26px; font-weight: 800; color: #1E1E1E; line-height: 1.1; }
    .card .n.accent { color: #DC2626; }
    .card .t { font-size: 12px; font-weight: 700; margin-top: 4px; }
    .card .d { font-size: 10px; color: #6B6B6B; margin-top: 6px; border-top: 1px dashed #E6E6E6; padding-top: 6px; line-height: 1.35; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #E6E6E6; padding: 6px 8px; }
    th { background: #F5F5F7; text-align: center; }
    th.left, td.left { text-align: left; }
    th.hoy { background: #DC2626; color: #fff; }
    th.var { background: #FEF2F2; color: #DC2626; }
    td.num { text-align: center; font-variant-numeric: tabular-nums; }
    td.hoy { background: #FEF2F2; text-align: center; font-weight: 700; }
    td.var { text-align: center; font-weight: 700; color: #DC2626; }
    tr.total td { background: #F5F5F7; font-weight: 800; }
    tr.total td.hoy { background: #DC2626; color: #fff; }
    .kpi .n { font-size: 20px; font-weight: 800; color: #DC2626; }
    .kpi .l { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #6B6B6B; margin-top: 2px; }
    .kpi .h { font-size: 10px; color: #6B6B6B; margin-top: 4px; }
    .banner {
      margin-top: 12px; background: #DC2626; color: #fff; border-radius: 10px;
      padding: 10px 12px; font-size: 12px; font-weight: 700; line-height: 1.4;
    }
    .note { margin-top: 8px; font-size: 11px; color: #6B6B6B; line-height: 1.45; }
    .center { text-align: center; }
    .disc-title {
      display: inline-block; background: #DC2626; color: #fff; border-radius: 10px;
      padding: 10px 18px; font-size: 15px; font-weight: 800; margin: 6px 0;
    }
    .footer { margin-top: 10px; text-align: center; font-size: 10px; color: #9CA3AF; }
    @media print {
      .section.page-break { page-break-before: always; }
      .no-print { display: none !important; }
    }
  `;
}

/**
 * @param {object} boletin - resultado de calcularBoletinDiarioAlfa
 * @param {object} labels - textos ya resueltos (i18n)
 */
function filasTablaComparativoHtml(filas = []) {
  const totalAyer = (filas || []).reduce((a, f) => a + (Number(f.ayer) || 0), 0);
  const totalHoy = (filas || []).reduce((a, f) => a + (Number(f.hoy) || 0), 0);
  const body = (filas || [])
    .map((f) => {
      const pctAyer = totalAyer ? Math.round(((Number(f.ayer) || 0) / totalAyer) * 1000) / 10 : 0;
      const pctHoy = totalHoy ? Math.round(((Number(f.hoy) || 0) / totalHoy) * 1000) / 10 : 0;
      return `
      <tr>
        <td class="left">${esc(f.label)}</td>
        <td class="num">${esc(f.ayer)} <span style="color:#9CA3AF">(${esc(pctAyer)}%)</span></td>
        <td class="var">${esc(fmtVar(f.avance))}</td>
        <td class="hoy">${esc(f.hoy)} <span style="color:#DC2626;font-weight:500">(${esc(pctHoy)}%)</span></td>
      </tr>`;
    })
    .join('');
  return {
    body,
    totalAyer,
    totalHoy,
    variacionTotal: totalHoy - totalAyer,
  };
}

export function construirHtmlBoletinDiarioAlfa(boletin, labels = {}) {
  const {
    gestionTerremoto,
    estadoGestionActual,
    estadoSiniestroActual,
    cierresDelDia,
    clasificacionPerdidas,
  } = boletin;
  const L = labels;

  const cardsTerremoto = (gestionTerremoto?.filas || [])
    .map((f) => {
      const desglose =
        Array.isArray(f.desglose) && f.desglose.length > 1
          ? `<ul style="margin:6px 0 0;padding:6px 0 0;border-top:1px dashed #E6E6E6;list-style:none;font-size:10px;color:#6B6B6B">${f.desglose
              .map(
                (d) =>
                  `<li style="display:flex;justify-content:space-between;gap:8px"><span>${esc(d.label)}</span><strong style="color:#DC2626">${esc(d.cantidad)}</strong></li>`
              )
              .join('')}</ul>`
          : '';
      return `
      <div class="card">
        <div class="n">${esc(f.cantidad)}</div>
        <div class="d">${esc(f.descripcion)}</div>
        ${desglose}
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${esc(L.docTitle || 'Boletín diario Seguros Alfa')}</title>
  <style>${estilosImpresion()}</style>
</head>
<body>
  <p class="eyebrow">SEGUROS ALFA</p>
  <h1>${esc(L.title || 'Boletín diario de gestión')}</h1>
  <p class="sub">${esc(L.subtitle || '')}</p>

  <!-- 1. Gestión terremoto -->
  <section class="section">
    <div class="row-between">
      <div>
        <h2>${esc(L.terremotoTitle || 'Gestión terremoto')}</h2>
        <p class="sub" style="margin:0">${esc(L.terremotoSubtitle || '')}</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span class="pill">${esc(L.totalGeneral || 'Total general')}: ${esc(gestionTerremoto?.total ?? 0)}</span>
        <span class="chip">${esc(L.cutOff || 'Fecha de corte')}: ${esc(boletin.etiquetaHoy)}</span>
      </div>
    </div>
    <div class="grid-4">${cardsTerremoto}</div>
  </section>

  <!-- 2/3. Mismo formato del comparativo · ejes gestión / siniestro -->
  <section class="section">
    <h2>${esc(L.gestionActualTitle || '2. Estado de gestión actual')}</h2>
    <table>
      <thead>
        <tr>
          <th class="left">${esc(L.gestionActualEstado || 'Estado de gestión')}</th>
          <th>${esc(L.diaAnterior || 'Última actualización')}<div style="font-weight:400;font-size:10px;color:#6B6B6B">${esc(boletin.etiquetaAyer)}</div></th>
          <th class="var">${esc(L.gestionActualAvance || 'Avance')}</th>
          <th class="hoy">${esc(L.hoyLista || 'Hoy')}<div style="font-weight:400;font-size:10px;color:#FEE2E2">${esc(boletin.etiquetaHoy)}</div></th>
        </tr>
      </thead>
      <tbody>
        ${(() => {
          const t = filasTablaComparativoHtml(estadoGestionActual?.filas);
          return `${t.body}
        <tr class="total">
          <td class="left">TOTAL</td>
          <td class="num">${esc(t.totalAyer)}</td>
          <td class="var">${esc(fmtVar(t.variacionTotal))}</td>
          <td class="hoy">${esc(t.totalHoy)}</td>
        </tr>`;
        })()}
      </tbody>
    </table>
  </section>

  <section class="section">
    <h2>${esc(L.siniestroActualTitle || '3. Estado del siniestro')}</h2>
    <table>
      <thead>
        <tr>
          <th class="left">${esc(L.siniestroActualEstado || 'Estado del siniestro')}</th>
          <th>${esc(L.diaAnterior || 'Última actualización')}<div style="font-weight:400;font-size:10px;color:#6B6B6B">${esc(boletin.etiquetaAyer)}</div></th>
          <th class="var">${esc(L.siniestroActualMovimiento || 'Movimiento')}</th>
          <th class="hoy">${esc(L.hoyLista || 'Hoy')}<div style="font-weight:400;font-size:10px;color:#FEE2E2">${esc(boletin.etiquetaHoy)}</div></th>
        </tr>
      </thead>
      <tbody>
        ${(() => {
          const t = filasTablaComparativoHtml(estadoSiniestroActual?.filas);
          return `${t.body}
        <tr class="total">
          <td class="left">TOTAL</td>
          <td class="num">${esc(t.totalAyer)}</td>
          <td class="var">${esc(fmtVar(t.variacionTotal))}</td>
          <td class="hoy">${esc(t.totalHoy)}</td>
        </tr>`;
        })()}
      </tbody>
    </table>
  </section>

  <section class="section">
    <h2>${esc(L.cierresTitle || '4. Cierres del día')}</h2>
    <p class="sub">${esc(L.cierresSub || '')} · ${esc(boletin.etiquetaHoy || '')}</p>
    <table>
      <thead>
        <tr>
          <th class="left">${esc(L.cierresResultado || 'Resultado')}</th>
          <th class="hoy">${esc(L.cierresCantidad || 'Cantidad')}</th>
        </tr>
      </thead>
      <tbody>
        ${(cierresDelDia?.filas || [])
          .map(
            (f) => `
        <tr>
          <td class="left">${esc(f.label)}</td>
          <td class="hoy">${esc(f.cantidad)}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </section>

  <section class="section">
    <h2>${esc(L.perdidasTitle || '5. Clasificación de pérdidas')}</h2>
    <table>
      <thead>
        <tr>
          <th class="left">${esc(L.perdidasTipo || 'Tipo de pérdida')}</th>
          <th class="hoy">${esc(L.perdidasCantidad || 'Cantidad')}</th>
        </tr>
      </thead>
      <tbody>
        ${(clasificacionPerdidas?.filas || [])
          .map(
            (f) => `
        <tr>
          <td class="left">${esc(f.label)}</td>
          <td class="hoy">${esc(f.cantidad)}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </section>

</body>
</html>`;
}

/**
 * Abre ventana de impresión con las 3 gráficas del boletín diario.
 */
export function imprimirBoletinDiarioAlfa(boletin, labels = {}) {
  const html = construirHtmlBoletinDiarioAlfa(boletin, labels);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=768');
  if (!win) {
    // Fallback si el navegador bloquea popups
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  const trigger = () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* ignore */
    }
  };
  // Esperar a que el documento cargue estilos antes de imprimir
  if (win.document.readyState === 'complete') {
    setTimeout(trigger, 250);
  } else {
    win.onload = () => setTimeout(trigger, 250);
  }
  return true;
}
