/**
 * Smoke test PDF SG-SST con DOM/canvas mock (Node 22+).
 * Ejecutar: node --experimental-strip-types scripts/qa-sgsst-pdf-smoke.mjs
 * o: node scripts/qa-sgsst-pdf-smoke.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { register } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Hook: permitir import de .json sin attribute (como hace Vite)
register(
  `data:text/javascript,${encodeURIComponent(`
    export async function load(url, context, nextLoad) {
      if (url.endsWith('.json')) {
        const result = await nextLoad(url, { ...context, importAttributes: { type: 'json' } });
        return result;
      }
      return nextLoad(url, context);
    }
  `)}`,
  pathToFileURL('./')
);

function stubCanvas() {
  return {
    width: 0,
    height: 0,
    getContext() {
      return {
        clearRect() {},
        drawImage() {},
        beginPath() {},
        arc() {},
        closePath() {},
        fill() {},
        fillText() {},
        fillStyle: '',
        font: '',
        textAlign: '',
        textBaseline: '',
      };
    },
    toDataURL() {
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    },
  };
}

globalThis.document = {
  createElement(tag) {
    if (tag === 'canvas') return stubCanvas();
    return { style: {} };
  },
};

globalThis.Image = class Image {
  set src(_v) {
    queueMicrotask(() => {
      if (typeof this.onload === 'function') this.onload();
    });
  }
};

globalThis.URL.createObjectURL = () => 'blob:mock';
globalThis.URL.revokeObjectURL = () => {};
if (!globalThis.Blob) {
  globalThis.Blob = class Blob {
    constructor(parts, opts) {
      this.parts = parts;
      this.type = opts?.type || '';
    }
  };
}

const {
  construirRespuestasIniciales,
  sincronizarRespuestas,
  PERFIL_META,
} = await import('../src/config/sgSst0312.js');

const { generarReporteSgSstPdf, generarTablaValoresCsv } = await import(
  '../src/components/SubcomponenteSGSST/generarReporteSgSstPdf.js'
);

const { jsPDF } = await import('jspdf');

function mapFrom(arr) {
  const m = {};
  for (const r of arr) m[r.itemId] = r;
  return m;
}

const results = [];
const caso = {
  numeroCaso: 'SGSST-QA-0001',
  perfilId: 'CAP1',
  estadoCaso: 'en_progreso',
  empresa: {
    nombre: 'Empresa QA',
    nit: '900123456',
    numTrabajadores: 2,
    numTrabajadoresIndirectos: 0,
    claseRiesgo: 'II',
    ciudad: 'Bogota',
    departamento: 'Cundinamarca',
    sectorEconomico: 'Servicios',
    realizadoPor: 'Tester',
    cargoRealizadoPor: 'SST',
  },
  archivos: [],
};

const respuestasMap = sincronizarRespuestas('CAP1', mapFrom(construirRespuestasIniciales('CAP1')));

try {
  const pdf = await generarReporteSgSstPdf({ caso, respuestasMap });
  const ok = pdf?.bytes?.length > 5000;
  results.push({
    id: 'PDF-gen',
    ok,
    detail: `bytes=${pdf?.bytes?.length || 0} nombre=${pdf?.nombre} pct=${pdf?.progreso?.pct}`,
  });
  console.log((ok ? '✓' : '✗') + ' PDF-gen:', results.at(-1).detail);
  if (ok) {
    writeFileSync(join(__dirname, 'qa-sgsst-sample.pdf'), Buffer.from(pdf.bytes));
    console.log('Escrito scripts/qa-sgsst-sample.pdf');
  }
} catch (e) {
  results.push({ id: 'PDF-gen', ok: false, detail: e.stack || e.message });
  console.log('✗ PDF-gen:', e.message);
}

try {
  const csv = generarTablaValoresCsv({ caso, respuestasMap });
  const lines = csv.split('\n').length;
  const ok = lines >= 60 && csv.includes('1.1.1');
  results.push({ id: 'CSV-gen', ok, detail: `lines=${lines}` });
  console.log((ok ? '✓' : '✗') + ' CSV-gen:', results.at(-1).detail);
} catch (e) {
  results.push({ id: 'CSV-gen', ok: false, detail: e.message });
  console.log('✗ CSV-gen:', e.message);
}

// Reproducir bug Unicode Helvetica
{
  const doc = new jsPDF();
  const raw = PERFIL_META.CAP1.titulo;
  doc.text(raw, 10, 20);
  const out = doc.output('arraybuffer');
  // Heurística: si el texto se “espació”, el PDF suele crecer o contener bytes raros;
  // validamos extrayendo con lectura simple del string escrito vs ASCII-safe.
  const asciiSafe = raw.replace(/[^\x20-\x7E]/g, '?');
  const hasBad = /[≤íáéóúñÍÁÉÓÚÑ]/.test(raw);
  results.push({
    id: 'PDF-unicode',
    ok: false,
    detail: `Input="${raw}" → Helvetica no cubre Unicode (${hasBad}). ASCII fallback sugerido: "${asciiSafe}". Bytes PDF prueba=${out.byteLength}`,
  });
  console.log('✗ PDF-unicode:', results.at(-1).detail);
}

writeFileSync(join(__dirname, 'qa-sgsst-pdf-result.json'), JSON.stringify(results, null, 2));
const hardFail = results.some((r) => ['PDF-gen', 'CSV-gen'].includes(r.id) && !r.ok);
process.exit(hardFail ? 1 : 0);
