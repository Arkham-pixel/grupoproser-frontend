const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/FormularioInspeccion.jsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

function clean(raw) {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/:$/, '')
    .trim();
}

function esc(s) {
  return s.replace(/"/g, '&quot;');
}

// 1) Quitar líneas placeholder="Comentarios adicionales..." excepto en textarea
let keptTextarea = false;
const cleaned = lines.filter((line) => {
  if (!line.includes('placeholder="Comentarios adicionales sobre las características de la construcción"')) {
    return true;
  }
  if (!keptTextarea && line.includes('<textarea')) {
    keptTextarea = true;
    return true;
  }
  if (/^\s*placeholder="Comentarios/.test(line)) return false;
  return true;
});

// 2) En cada fila de tabla, poner placeholder correcto en inputs
const out = [];
let i = 0;
while (i < cleaned.length) {
  if (!/<tr\b/i.test(cleaned[i])) {
    out.push(cleaned[i]);
    i++;
    continue;
  }
  const row = [cleaned[i]];
  let j = i + 1;
  while (j < cleaned.length && !/<\/tr>/.test(row[row.length - 1])) {
    row.push(cleaned[j]);
    j++;
  }

  const rowText = row.join('\n');
  const labels = [];
  const re = /<td\b[^>]*fontWeight:\s*['"]bold['"][^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = re.exec(rowText)) !== null) {
    const l = clean(m[1]);
    if (l) labels.push(l);
  }

  let inputIdx = 0;
  const fixedRow = [];
  for (let k = 0; k < row.length; k++) {
    let line = row[k];
    if (/^\s*<input\b/.test(line)) {
      const label = labels[inputIdx++] || labels[labels.length - 1] || '';
      if (label && /placeholder=/.test(line)) {
        line = line.replace(/placeholder="[^"]*"/, `placeholder="${esc(label)}"`);
      }
      fixedRow.push(line);
      if (label && k + 1 < row.length && /disabled=\{cargando\}/.test(row[k + 1]) && !fixedRow.some((x) => x.includes('placeholder='))) {
        // multilínea: buscar si ya hay placeholder entre input y disabled
        let hasPh = false;
        for (let t = k; t < row.length && !/disabled=\{cargando\}/.test(row[t]); t++) {
          if (/placeholder=/.test(row[t])) hasPh = true;
        }
        if (!hasPh) {
          fixedRow.push(`${line.match(/^(\s*)/)[1]}placeholder="${esc(label)}"`);
        }
      }
      continue;
    }
    if (/^\s*placeholder=/.test(line) && inputIdx > 0) {
      const label = labels[inputIdx - 1] || '';
      if (label) line = `            placeholder="${esc(label)}"`;
    }
    fixedRow.push(line);
  }

  out.push(...fixedRow);
  i = j;
}

fs.writeFileSync(filePath, out.join('\n'), 'utf8');
console.log('Placeholders de tabla corregidos.');
