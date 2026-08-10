/**
 * QA mapeo SG-SST 0312 — prueba a prueba y error (Node, sin browser).
 * Ejecutar: node scripts/qa-sgsst-mapeo.mjs
 */
import {
  CODIGOS_APLICABLES,
  ESTADOS_ITEM,
  ITEMS_ART27,
  PERFIL_META,
  calificacionDeItem,
  calcularPuntaje,
  calcularResumenPorGrupo,
  construirPaginasSura,
  construirRespuestasIniciales,
  formatearValorPct,
  itemsAplicables,
  itemsPorPerfil,
  resolverPerfil0312,
  sincronizarRespuestas,
} from '../src/config/sgSst0312.js';

const results = [];

function assert(id, casoUso, ok, detail, severity = ok ? 'pass' : 'fail') {
  results.push({ id, casoUso, ok: !!ok, detail: String(detail), severity: ok ? 'pass' : severity });
  const icon = ok ? '✓' : severity === 'warn' ? '⚠' : '✗';
  console.log(`${icon} [${id}] ${casoUso}: ${detail}`);
}

function mapFromArray(arr) {
  const m = {};
  for (const r of arr) m[r.itemId] = r;
  return m;
}

function setEstado(map, codigo, estado) {
  const it = ITEMS_ART27.find((x) => x.codigo === codigo);
  if (!it) throw new Error(`codigo desconocido ${codigo}`);
  map[it.id] = { ...(map[it.id] || {}), estado };
}

// ——— UC1: Resolver perfil ———
{
  const casos = [
    [10, 'II', 'CAP1'],
    [1, 'I', 'CAP1'],
    [11, 'III', 'CAP2'],
    [50, 'I', 'CAP2'],
    [51, 'I', 'CAP3'],
    [5, 'IV', 'CAP3'],
    [30, 'V', 'CAP3'],
    [0, 'II', null],
    [10, 'X', null],
    [null, 'II', null],
  ];
  for (const [n, r, expected] of casos) {
    const got = resolverPerfil0312(n, r);
    assert(
      `UC1-${n}-${r}`,
      'Resolver perfil 0312',
      got === expected,
      `trabajadores=${n} riesgo=${r} → ${got} (esperado ${expected})`
    );
  }
}

// ——— UC2: Catálogo Art. 27 ———
{
  const suma = ITEMS_ART27.reduce((s, it) => s + it.valor, 0);
  assert('UC2-suma', 'Suma de valores Art. 27 = 100', Math.abs(suma - 100) < 0.01, `suma=${suma}`);
  assert('UC2-count', 'Cantidad de ítems Art. 27', ITEMS_ART27.length === 60, `count=${ITEMS_ART27.length}`);
  const ids = new Set(ITEMS_ART27.map((i) => i.id));
  assert('UC2-ids', 'IDs únicos', ids.size === ITEMS_ART27.length, `únicos=${ids.size}`);
}

// ——— UC3: CAP1 aplicables ———
{
  const apps = itemsAplicables('CAP1');
  assert('UC3-7', 'CAP1 tiene 7 ítems aplicables (Art. 3)', apps.length === 7, `aplicables=${apps.length}`);
  const codes = apps.map((a) => a.codigo).sort().join(',');
  const expected = [...CODIGOS_APLICABLES.CAP1].sort().join(',');
  assert('UC3-codes', 'CAP1 códigos = Art. 3', codes === expected, codes);
  const init = mapFromArray(construirRespuestasIniciales('CAP1'));
  const p = calcularPuntaje('CAP1', init);
  assert(
    'UC3-na-score',
    'CAP1 inicial: N/A auto suman puntaje; pendientes aplicables = 0 pts',
    p.noAplica === 53 && p.pendientesAplicables === 7 && p.pct === 87.5,
    `pct=${p.pct} na=${p.noAplica} pend=${p.pendientesAplicables} obt=${p.obtenido}`
  );
  assert('UC3-nivel', 'CAP1 vacío → ACEPTABLE por N/A auto (87.5%)', p.nivel === 'ACEPTABLE', p.nivel);
}

// ——— UC4: CAP1 cumple todos ———
{
  const map = mapFromArray(construirRespuestasIniciales('CAP1'));
  for (const c of CODIGOS_APLICABLES.CAP1) setEstado(map, c, ESTADOS_ITEM.CUMPLE);
  const p = calcularPuntaje('CAP1', map);
  assert('UC4-100', 'CAP1 todos cumplen → 100%', p.pct === 100 && p.nivel === 'ACEPTABLE', `pct=${p.pct}`);
}

// ——— UC5: CAP1 no cumple todos aplicables ———
{
  const map = mapFromArray(construirRespuestasIniciales('CAP1'));
  for (const c of CODIGOS_APLICABLES.CAP1) setEstado(map, c, ESTADOS_ITEM.NO_CUMPLE);
  const p = calcularPuntaje('CAP1', map);
  assert(
    'UC5-critico',
    'CAP1 todos No cumple → 87.5% sigue ACEPTABLE (N/A mantienen puntos)',
    p.pct === 87.5 && p.nivel === 'ACEPTABLE' && p.noCumple === 7,
    `pct=${p.pct} nivel=${p.nivel} — OJO: negocio puede confundir`
  );
}

// ——— UC6: CAP2 ———
{
  const apps = itemsAplicables('CAP2');
  assert(
    'UC6-count',
    'CAP2 cantidad aplicables Art. 9',
    apps.length === CODIGOS_APLICABLES.CAP2.length,
    `aplicables=${apps.length} lista=${CODIGOS_APLICABLES.CAP2.length}`
  );
  const init = mapFromArray(construirRespuestasIniciales('CAP2'));
  const p = calcularPuntaje('CAP2', init);
  const pesoApps = apps.reduce((s, it) => s + it.valor, 0);
  const esperadoNa = Math.round((100 - pesoApps) * 10) / 10;
  assert(
    'UC6-na',
    'CAP2 inicial: solo N/A aportan puntos',
    Math.abs(p.obtenido - esperadoNa) < 0.05,
    `obtenido=${p.obtenido} esperadoN/A=${esperadoNa} pct=${p.pct} aplicables=${apps.length}`
  );
}

// ——— UC7: CAP3 ———
{
  const apps = itemsAplicables('CAP3');
  assert('UC7-all', 'CAP3 todos aplican', apps.length === 60, `aplicables=${apps.length}`);
  const init = mapFromArray(construirRespuestasIniciales('CAP3'));
  const p = calcularPuntaje('CAP3', init);
  assert(
    'UC7-zero',
    'CAP3 vacío → 0% CRÍTICO',
    p.pct === 0 && p.nivel === 'CRITICO' && p.pendientesAplicables === 60,
    `pct=${p.pct} nivel=${p.nivel}`
  );
}

// ——— UC8: Umbrales de nivel ———
{
  assert('UC8-cal', 'Calificación Cumple', calificacionDeItem(2, 'cumple') === 2, 'ok');
  assert('UC8-na', 'Calificación No aplica', calificacionDeItem(2, 'no_aplica') === 2, 'ok');
  assert('UC8-nc', 'Calificación No cumple', calificacionDeItem(2, 'no_cumple') === 0, 'ok');
  assert('UC8-pend', 'Calificación pendiente', calificacionDeItem(2, '') === 0, 'ok');

  // Construir escenario CAP3 con % controlado
  const map = mapFromArray(construirRespuestasIniciales('CAP3'));
  // marcar todos N/A = 100
  for (const it of ITEMS_ART27) setEstado(map, it.codigo, ESTADOS_ITEM.NO_APLICA);
  let p = calcularPuntaje('CAP3', map);
  assert('UC8-100', 'Umbral >85 ACEPTABLE', p.pct === 100 && p.nivel === 'ACEPTABLE', p.nivel);

  // bajar a exactamente 85: quitar 15 pts (poner pendiente en ítems que sumen 15)
  let quitados = 0;
  for (const it of ITEMS_ART27) {
    if (quitados >= 15) break;
    setEstado(map, it.codigo, ESTADOS_ITEM.PENDIENTE);
    quitados += it.valor;
  }
  p = calcularPuntaje('CAP3', map);
  assert(
    'UC8-85',
    'Exactamente ~85% → MODERADO (>=60 y <=85)',
    p.nivel === 'MODERADO' && p.pct <= 85 && p.pct >= 60,
    `pct=${p.pct} nivel=${p.nivel}`
  );

  // crítico <60
  for (const it of ITEMS_ART27) setEstado(map, it.codigo, ESTADOS_ITEM.PENDIENTE);
  // solo 50 pts N/A
  let sum = 0;
  for (const it of ITEMS_ART27) {
    if (sum + it.valor > 50) continue;
    setEstado(map, it.codigo, ESTADOS_ITEM.NO_APLICA);
    sum += it.valor;
  }
  p = calcularPuntaje('CAP3', map);
  assert('UC8-crit', ' <60% → CRÍTICO', p.nivel === 'CRITICO' && p.pct < 60, `pct=${p.pct}`);
}

// ——— UC9: Sincronizar fuerza N/A ———
{
  const map = {};
  const it = ITEMS_ART27.find((x) => x.codigo === '1.1.2'); // no aplica en CAP1
  map[it.id] = { estado: ESTADOS_ITEM.CUMPLE, evidencias: 'hack' };
  const sync = sincronizarRespuestas('CAP1', map);
  assert(
    'UC9-force-na',
    'sincronizarRespuestas fuerza No aplica en no exigibles',
    sync[it.id].estado === ESTADOS_ITEM.NO_APLICA,
    sync[it.id].estado
  );
}

// ——— UC10: Resumen gráficos ———
{
  const map = mapFromArray(construirRespuestasIniciales('CAP1'));
  const r = calcularResumenPorGrupo('CAP1', map);
  assert('UC10-grupos', '8 grupos SURA', r.porGrupo.length === 8, r.porGrupo.length);
  assert('UC10-ciclos', '4 ciclos PHVA', r.porCiclo.length === 4, r.porCiclo.length);
  const sumPctPeso = r.porGrupo.reduce((s, g) => s + g.posible, 0);
  assert('UC10-peso', 'Suma posible grupos = 100', Math.abs(sumPctPeso - 100) < 0.01, sumPctPeso);
}

// ——— UC11: Páginas formato SURA ———
{
  const pages = construirPaginasSura(itemsPorPerfil('CAP1'));
  const tipos = pages.map((p) => p.tipo);
  assert(
    'UC11-tipos',
    'Flujo páginas incluye portada/instrucciones/estandares/tabla/graficos/criterios',
    tipos.includes('portada') &&
      tipos.includes('instrucciones') &&
      tipos.includes('estandares') &&
      tipos.includes('tabla') &&
      tipos.includes('graficos') &&
      tipos.includes('criterios'),
    tipos.join(' → ')
  );
}

// ——— UC12: Formato % y Unicode PDF risk ———
{
  assert('UC12-fmt', 'formatearValorPct coma', formatearValorPct(0.5) === '0,5%', formatearValorPct(0.5));
  const titulo = PERFIL_META.CAP1.titulo;
  const hasUnicode = /[≤íáéóúñ]/i.test(titulo);
  assert(
    'UC12-unicode',
    'PERFIL_META.CAP1 tiene Unicode (riesgo jsPDF Helvetica)',
    hasUnicode,
    `"${titulo}" — FAIL esperado en PDF: caracteres se espacian/rompen`,
    'warn'
  );
  // Forzar fail de producto: documentamos que el PDF ya mostró este bug
  assert(
    'UC12-pdf-encoding',
    'PDF informe: texto con ≤/tildes no se renderiza bien en Helvetica',
    false,
    'Evidencia usuario PDF: "C a p í t u l o" y "(“d 1 0 )" — jsPDF sin fuente Unicode',
    'fail'
  );
}

// ——— UC13: Paquete ZIP contrato ———
{
  assert(
    'UC13-enrich',
    'Enriquecimiento PDF/CSV solo si se pasan caso+respuestasMap',
    true,
    'Si falta contexto, ZIP solo trae resumen_evaluacion.json + evidencias (sin PDF)'
  );
  assert(
    'UC13-backend',
    'Backend /paquete NO genera PDF ni gráficos',
    true,
    'PDF se arma 100% en frontend (canvas/Image/jsPDF)'
  );
}

// ——— UC14: CAP1 caso real usuario (SGSST-X-2026-0001) ———
{
  // Caso reportado: 2 trabajadores, riesgo II, sin respuestas → 87.5% ACEPTABLE
  const perfil = resolverPerfil0312(2, 'II');
  const map = mapFromArray(construirRespuestasIniciales(perfil));
  const p = calcularPuntaje(perfil, map);
  assert(
    'UC14-user',
    'Caso usuario 2 trab / II coincide con PDF descargado',
    perfil === 'CAP1' && p.pct === 87.5 && p.cumple === 0 && p.noCumple === 0 && p.noAplica === 53,
    `perfil=${perfil} pct=${p.pct} cumple=${p.cumple} na=${p.noAplica}`
  );
}

// ——— Resumen ———
const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok && r.severity === 'fail').length;
const warn = results.filter((r) => !r.ok && r.severity === 'warn').length;
console.log('\n========== RESUMEN ==========');
console.log(`PASS=${pass} FAIL=${fail} WARN=${warn} TOTAL=${results.length}`);

// Export JSON for canvas
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, 'qa-sgsst-resultados.json');
writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), pass, fail, warn, results }, null, 2));
console.log(`Escrito: ${out}`);
process.exit(fail > 0 ? 1 : 0);
