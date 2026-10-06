/**
 * Smoke test: multi-riesgo cotización PDF + auto-fill póliza Previsora.
 * Corre sin Vite/DOM (lógica mínima espejo de helpers).
 */
import assert from 'node:assert/strict';

function parsearMonto(valor) {
  if (valor === '' || valor == null) return 0;
  if (typeof valor === 'number') return Number.isNaN(valor) ? 0 : valor;
  let numero = String(valor).replace(/[^\d.,-]/g, '');
  if (numero.includes(',') && numero.includes('.')) {
    numero = numero.replace(/\./g, '').replace(',', '.');
  } else if (numero.includes('.') && !numero.includes(',')) {
    const partes = numero.split('.');
    if (partes.length > 2 || (partes[1] && partes[1].length === 3)) {
      numero = numero.replace(/\./g, '');
    }
  } else if (numero.includes(',')) {
    numero = numero.replace(',', '.');
  }
  const n = parseFloat(numero);
  return Number.isNaN(n) ? 0 : n;
}

function montoCotizacionPdf(c) {
  return parsearMonto(c?.montoFinal);
}

function usaComoBase(c) {
  if (!c || typeof c !== 'object') return false;
  if (c.usarComoBasePresupuesto === false) return false;
  return montoCotizacionPdf(c) > 0;
}

function sincronizar(riesgos = []) {
  const conDatos = riesgos.filter((r) => {
    const c = r?.cotizacion;
    if (!c) return false;
    return montoCotizacionPdf(c) > 0 || (Array.isArray(c.paginas) && c.paginas.length);
  });
  if (!conDatos.length) return null;
  const usadas = conDatos.filter((r) => usaComoBase(r.cotizacion));
  const total = usadas.reduce((a, r) => a + montoCotizacionPdf(r.cotizacion), 0);
  const paginas = [];
  conDatos.forEach((r) => {
    (r.cotizacion?.paginas || []).forEach((p, i) => {
      paginas.push({
        ...p,
        descripcion: p.descripcion || `${r.etiqueta} · página ${i + 1}`,
      });
    });
  });
  return {
    montoFinal: String(Math.round(total * 100) / 100),
    usarComoBasePresupuesto: usadas.length > 0 && total > 0,
    paginas,
    nRiesgos: conDatos.length,
    nRiesgosUsados: usadas.length,
  };
}

// --- multi riesgo ---
const riesgos = [
  {
    id: 'r1',
    etiqueta: 'Riesgo 1',
    cotizacion: {
      montoFinal: '1.500.000',
      usarComoBasePresupuesto: true,
      paginas: [{ pagina: 1, ruta: '/a.png' }],
    },
  },
  {
    id: 'r2',
    etiqueta: 'Riesgo 2',
    cotizacion: {
      montoFinal: '2500000',
      usarComoBasePresupuesto: true,
      paginas: [{ pagina: 1, ruta: '/b.png' }, { pagina: 2, ruta: '/c.png' }],
    },
  },
];
const sync = sincronizar(riesgos);
assert.equal(sync.nRiesgos, 2);
assert.equal(sync.nRiesgosUsados, 2);
assert.equal(Number(sync.montoFinal), 4000000);
assert.equal(sync.paginas.length, 3);
assert.match(sync.paginas[0].descripcion, /Riesgo 1/);
assert.match(sync.paginas[2].descripcion, /Riesgo 2/);

const soloUno = sincronizar([
  riesgos[0],
  { id: 'r2', etiqueta: 'Riesgo 2', cotizacion: { montoFinal: '100', usarComoBasePresupuesto: false } },
]);
assert.equal(Number(soloUno.montoFinal), 1500000);

// --- póliza auto-fill vigencia ---
function textoVigencia({ ini, fin, ocurrencia }) {
  if (!ini && !fin) {
    return { analisis: 'Pendiente confirmar las fechas de vigencia de la póliza.', conclusion: 'Por verificar.' };
  }
  return {
    analisis: `El evento reclamado (${ocurrencia}) se analiza frente a la vigencia de la póliza del ${ini} al ${fin}.`,
    conclusion: 'Evento con cobertura.',
  };
}
function esAuto(t) {
  const s = String(t || '').trim();
  if (!s) return true;
  return /^pendiente confirmar/i.test(s) || /^por verificar\.?$/i.test(s);
}
const vacio = textoVigencia({});
assert.ok(esAuto(vacio.analisis));
const conFicha = textoVigencia({
  ini: '2024-01-01',
  fin: '2025-01-01',
  ocurrencia: '2024-08-10',
});
assert.ok(!esAuto(conFicha.analisis));
assert.match(conFicha.analisis, /2024-01-01/);
// reemplazo de auto por ficha
const analisisFinal = esAuto(vacio.analisis) ? conFicha.analisis : vacio.analisis;
assert.equal(analisisFinal, conFicha.analisis);

console.log('OK smoke Previsora: multi-riesgo suma/páginas + póliza auto-fill');
