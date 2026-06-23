/**
 * Placeholders y opciones vacías con el texto de la etiqueta visible (label o celda de tabla).
 * Solo modifica líneas completas; no toca atributos multilínea como onChange.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/FormularioInspeccion.jsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

function cleanLabel(raw) {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/:$/, '')
    .trim();
}

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function extractBoldTdLabel(rowLines) {
  for (let i = 0; i < rowLines.length; i++) {
    if (!/<td\b/i.test(rowLines[i])) continue;
  if (!/fontWeight:\s*['"]bold['"]/.test(rowLines[i])) continue;
    const chunk = rowLines.slice(i).join('\n');
    const m = chunk.match(/<td\b[^>]*>([\s\S]*?)<\/td>/i);
    if (m) return cleanLabel(m[1]);
  }
  return '';
}

function processRow(rowLines, label) {
  if (!label) return rowLines;
  const esc = escapeAttr(label);
  return rowLines.map((line) => {
    let l = line;
    if (/<option\s+value=""\s*>/i.test(l)) {
      l = l.replace(/<option\s+value=""\s*>[^<]*<\/option>/i, `<option value="">${esc}</option>`);
    }
    if (/placeholder="/i.test(l)) {
      if (/placeholder="Ej:/i.test(l) || /placeholder="Selecciona/i.test(l) || /placeholder="Especifique/i.test(l)) {
        l = l.replace(/placeholder="[^"]*"/i, `placeholder="${esc}"`);
      }
    } else if (/^\s*disabled=\{cargando\}\s*$/i.test(l)) {
      // línea típica antes del cierre de <input multilínea
      return `            placeholder="${esc}"\n${l}`;
    }
    return l;
  });
}

const out = [];
let i = 0;
let lastBlockLabel = null;

while (i < lines.length) {
  const line = lines[i];

  // label block -> capturar etiqueta
  if (/<label\b/i.test(line)) {
    const labelLines = [line];
    let j = i + 1;
    while (j < lines.length && !/<\/label>/i.test(labelLines[labelLines.length - 1])) {
      labelLines.push(lines[j]);
      j++;
    }
    lastBlockLabel = cleanLabel(labelLines.join('\n'));
    out.push(...labelLines);
    i = j;
    continue;
  }

  // fila de tabla
  if (/<tr\b/i.test(line)) {
    const rowLines = [line];
    let j = i + 1;
    while (j < lines.length && !/<\/tr>/i.test(rowLines[rowLines.length - 1])) {
      rowLines.push(lines[j]);
      j++;
    }
    const tdLabel = extractBoldTdLabel(rowLines);
    const label = tdLabel || lastBlockLabel;
    out.push(...processRow(rowLines, label));
    i = j;
    continue;
  }

  // Select municipio/ciudad
  if (/<Select\b/i.test(line) && !/placeholder=/i.test(line)) {
    const label = lastBlockLabel || 'Municipio';
    out.push(line.replace('<Select', `<Select\n            placeholder="${escapeAttr(label)}"`));
    i++;
    continue;
  }

  // inputs sueltos bajo label (no en tabla)
  if (/^\s*<input\b/i.test(line)) {
    const block = [line];
    let j = i + 1;
    while (j < lines.length && !/\/?>/.test(block[block.length - 1])) {
      block.push(lines[j]);
      j++;
    }
    if (lastBlockLabel) {
      const hasPh = block.some((l) => /placeholder="/i.test(l));
      if (!hasPh) {
        const idx = block.findIndex((l) => /disabled=\{cargando\}/.test(l));
        if (idx >= 0) {
          block.splice(idx, 0, `${block[0].match(/^(\s*)/)[1]}placeholder="${escapeAttr(lastBlockLabel)}"`);
        }
      } else {
        for (let k = 0; k < block.length; k++) {
          if (/placeholder="Ej:/i.test(block[k]) || /placeholder="Selecciona/i.test(block[k])) {
            block[k] = block[k].replace(/placeholder="[^"]*"/i, `placeholder="${escapeAttr(lastBlockLabel)}"`);
          }
        }
      }
    }
    out.push(...block);
    i = j;
    continue;
  }

  // textarea bajo label
  if (/^\s*<textarea\b/i.test(line) && lastBlockLabel) {
    if (!/placeholder="/i.test(line)) {
      out.push(line.replace('<textarea', `<textarea placeholder="${escapeAttr(lastBlockLabel)}"`));
    } else if (/placeholder="Ej:/i.test(line)) {
      out.push(line.replace(/placeholder="[^"]*"/i, `placeholder="${escapeAttr(lastBlockLabel)}"`));
    } else {
      out.push(line);
    }
    i++;
    continue;
  }

  // select bajo label (encabezado aseguradora, etc.)
  if (/^\s*<select\b/i.test(line)) {
    const block = [line];
    let j = i + 1;
    while (j < lines.length && !/<\/select>/i.test(block[block.length - 1])) {
      block.push(lines[j]);
      j++;
    }
    if (lastBlockLabel) {
      for (let k = 0; k < block.length; k++) {
        block[k] = block[k].replace(
          /<option\s+value=""\s*>[^<]*<\/option>/i,
          `<option value="">${escapeAttr(lastBlockLabel)}</option>`
        );
      }
    }
    out.push(...block);
    i = j;
    continue;
  }

  out.push(line);
  i++;
}

let content = out.join('\n');
content = content.replace(/descripcionPlaceholder=""/g, 'descripcionPlaceholder="Descripción"');

fs.writeFileSync(filePath, content, 'utf8');
const ph = (content.match(/placeholder="/g) || []).length;
console.log(`Placeholders actualizados (${ph} en total).`);
