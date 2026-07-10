/**
 * Genera imágenes PNG de gráficas (Chart.js) para embeber en el Excel del informe COMPLEX.
 */

import {
  Chart,
  BarController,
  BarElement,
  ArcElement,
  DoughnutController,
  CategoryScale,
  LinearScale,
  Legend,
  Title,
  Tooltip,
} from 'chart.js';

Chart.register(
  BarController,
  BarElement,
  ArcElement,
  DoughnutController,
  CategoryScale,
  LinearScale,
  Legend,
  Title,
  Tooltip
);

const COLOR_EXITO = '#16A34A';
const COLOR_OTROS = '#C8102E';
const COLOR_GESTION = '#2563EB';
const COLOR_PROTOCOLO = '#F59E0B';

function dataUrlABuffer(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes.buffer;
}

async function renderChartPng(config, width = 720, height = 360) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const chart = new Chart(canvas.getContext('2d'), {
    ...config,
    options: {
      ...config.options,
      animation: false,
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        ...config.options?.plugins,
        legend: {
          display: config.options?.plugins?.legend?.display ?? true,
          labels: { font: { size: 12, family: 'Calibri' } },
        },
        title: {
          display: Boolean(config.options?.plugins?.title?.text),
          text: config.options?.plugins?.title?.text || '',
          font: { size: 14, weight: 'bold', family: 'Calibri' },
          color: '#1E1E1E',
        },
      },
    },
  });

  // Esperar un frame para que Chart.js pinte
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  const dataUrl = canvas.toDataURL('image/png');
  chart.destroy();
  return dataUrlABuffer(dataUrl);
}

/**
 * @param {object} datosInforme
 * @returns {Promise<Array<{ titulo: string, buffer: ArrayBuffer, width: number, height: number }>>}
 */
export async function generarGraficasInformePng(datosInforme) {
  const graficos = [];
  const cons = datosInforme?.consolidadoHistorico || {};
  const graf = datosInforme?.graficos || {};

  // 0) Porcentaje de cierre (dona)
  if ((cons.total || 0) > 0) {
    const buffer = await renderChartPng(
      {
        type: 'doughnut',
        data: {
          labels: [
            `% cierre exitoso (${cons.porcentajeCierreExitoso ?? 0}%)`,
            `% otros cerrados (${cons.porcentajeOtrosCerrados ?? 0}%)`,
            `% en gestión (${cons.porcentajeEnGestion ?? 0}%)`,
          ],
          datasets: [
            {
              data: [
                cons.porcentajeCierreExitoso ?? 0,
                cons.porcentajeOtrosCerrados ?? 0,
                cons.porcentajeEnGestion ?? 0,
              ],
              backgroundColor: [COLOR_EXITO, COLOR_OTROS, COLOR_GESTION],
              borderWidth: 2,
              borderColor: '#FFFFFF',
            },
          ],
        },
        options: {
          plugins: {
            title: {
              text: `Porcentaje de cierre — total ${cons.porcentajeCierreTotal ?? 0}% (facturado + desistido/anulado)`,
            },
            legend: { display: true, position: 'bottom' },
          },
        },
      },
      720,
      380
    );
    graficos.push({
      titulo: `Porcentaje de cierre (total ${cons.porcentajeCierreTotal ?? 0}%)`,
      buffer,
      width: 720,
      height: 380,
    });
  }

  // 1) Categorías: Facturado / Otros cerrados / En gestión
  if ((cons.cierreExitoso || 0) + (cons.otrosCerrados || 0) + (cons.enGestion || 0) > 0 || cons.total > 0) {
    const buffer = await renderChartPng(
      {
        type: 'bar',
        data: {
          labels: ['Facturado (éxito)', 'Desistido / Anulado', 'En gestión'],
          datasets: [
            {
              label: 'Casos',
              data: [
                cons.cierreExitoso || 0,
                cons.otrosCerrados || 0,
                cons.enGestion || 0,
              ],
              backgroundColor: [COLOR_EXITO, COLOR_OTROS, COLOR_GESTION],
              borderWidth: 0,
            },
          ],
        },
        options: {
          plugins: {
            title: { text: 'Consolidado por categoría' },
            legend: { display: false },
          },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
          },
        },
      },
      720,
      340
    );
    graficos.push({ titulo: 'Consolidado por categoría', buffer, width: 720, height: 340 });
  }

  // 2) Por estado (barras horizontales)
  const porEstado = (graf.consolidadoEstadosBarras || cons.porEstado || [])
    .filter((f) => !f.esTotal && (f.cantidad || f.Casos) > 0)
    .slice(0, 12);

  if (porEstado.length > 0) {
    const labels = porEstado.map((f) => f.nombreCompleto || f.nombre || f.estado || f.Estado);
    const valores = porEstado.map((f) => f.cantidad ?? f.Casos ?? 0);
    const colores = porEstado.map((f) => {
      const cat = f.categoria;
      if (cat === 'cierreExitoso') return COLOR_EXITO;
      if (cat === 'otrosCerrados') return COLOR_OTROS;
      return COLOR_GESTION;
    });

    const alto = Math.max(360, porEstado.length * 32 + 80);
    const buffer = await renderChartPng(
      {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Casos',
              data: valores,
              backgroundColor: colores,
              borderWidth: 0,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          plugins: {
            title: { text: 'Casos por estado' },
            legend: { display: false },
          },
          scales: {
            x: { beginAtZero: true, ticks: { precision: 0 } },
          },
        },
      },
      780,
      alto
    );
    graficos.push({ titulo: 'Casos por estado', buffer, width: 780, height: alto });
  }

  // 3) Cumplimiento protocolo por etapa
  const cumplimiento = graf.protocoloCumplimiento || [];
  if (cumplimiento.length > 0) {
    const buffer = await renderChartPng(
      {
        type: 'bar',
        data: {
          labels: cumplimiento.map((f) => f.nombreCorto || f.nombre),
          datasets: [
            {
              label: '% cumplimiento',
              data: cumplimiento.map((f) => f.porcentaje ?? 0),
              backgroundColor: COLOR_PROTOCOLO,
              borderWidth: 0,
            },
          ],
        },
        options: {
          plugins: {
            title: {
              text: `Cumplimiento por etapa (protocolo)${
                graf.cumplimientoGeneral != null
                  ? ` — general ${Number(graf.cumplimientoGeneral).toFixed(1)}%`
                  : ''
              }`,
            },
            legend: { display: false },
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: { callback: (v) => `${v}%` },
            },
          },
        },
      },
      720,
      360
    );
    graficos.push({
      titulo: 'Cumplimiento por etapa (protocolo)',
      buffer,
      width: 720,
      height: 360,
    });
  }

  // 4) Volumen comparativo (si existe)
  const volumen = graf.volumenCasos || [];
  if (volumen.length > 0) {
    const buffer = await renderChartPng(
      {
        type: 'bar',
        data: {
          labels: volumen.map((f) => f.etiqueta),
          datasets: [
            {
              label: 'Casos',
              data: volumen.map((f) => f.valor),
              backgroundColor: [
                COLOR_OTROS,
                COLOR_EXITO,
                COLOR_OTROS,
                COLOR_GESTION,
                COLOR_PROTOCOLO,
                '#7C3AED',
              ],
              borderWidth: 0,
            },
          ],
        },
        options: {
          plugins: {
            title: { text: 'Volumen de casos (histórico vs protocolo)' },
            legend: { display: false },
          },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
          },
        },
      },
      720,
      340
    );
    graficos.push({
      titulo: 'Volumen de casos',
      buffer,
      width: 720,
      height: 340,
    });
  }

  return graficos;
}
