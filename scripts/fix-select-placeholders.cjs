const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/FormularioInspeccion.jsx');
let content = fs.readFileSync(filePath, 'utf8');

function cleanLabel(raw) {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/:$/, '')
    .trim();
}

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// Quitar placeholder inválido en cualquier <select>
content = content.replace(
  /(<select[\s\S]*?)\n\s*placeholder="[^"]*"\n/g,
  '$1\n'
);

content = content.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi, (row) => {
  const boldLabels = [];
  const boldRe = /<td\b[^>]*fontWeight:\s*['"]bold['"][^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = boldRe.exec(row)) !== null) {
    const label = cleanLabel(m[1]);
    if (label) boldLabels.push(label);
  }
  if (!boldLabels.length) return row;

  let selectIndex = 0;
  return row.replace(/<option\s+value=""\s*>[^<]*<\/option>/gi, (opt) => {
    const label = boldLabels[selectIndex] || boldLabels[boldLabels.length - 1];
    selectIndex += 1;
    return `<option value="">${escapeAttr(label)}</option>`;
  });
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Selects corregidos por fila.');
