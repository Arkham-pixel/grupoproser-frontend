import fs from 'fs';

const path = 'src/components/FormularioInspeccion.jsx';
const s = fs.readFileSync(path, 'utf8');
const lines = s.split(/\n/);

const issues = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // leftover Spanish/text after placeholder={t(...)}
  const m = line.match(/placeholder=\{t\([^)]*\)\}(.*)$/);
  if (m) {
    const rest = m[1];
    // suspicious if non-whitespace junk before next attr or end, that's not just spaces
    if (/[a-záéíóúñA-ZÁÉÍÓÚÑ"']/.test(rest) && !/^\s*$/.test(rest) && !/^\s+[a-zA-Z_]+=/.test(rest) && !/^\s*\/>/.test(rest) && !/^\s*>/.test(rest)) {
      issues.push({ n: i + 1, line: line.trim().slice(0, 180), rest: rest.slice(0, 80) });
    }
  }
  // two placeholders
  if ((line.match(/placeholder=/g) || []).length > 1) {
    issues.push({ n: i + 1, line: line.trim().slice(0, 180), rest: 'DUPLICATE' });
  }
}

console.log('issues', issues.length);
issues.slice(0, 40).forEach((x) => console.log(x.n, '|', x.rest, '|', x.line));
