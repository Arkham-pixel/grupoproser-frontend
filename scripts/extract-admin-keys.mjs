import fs from 'fs';
import path from 'path';

const roots = [
  'src/components/AdminUsuarios.jsx',
  'src/components/SessionSettings.jsx',
  'src/components/EditarPerfilUsuario.jsx',
  'src/components/SubcomponenteCuenta',
  'src/components/GestionDocumentos',
];

function walk(p, acc = []) {
  if (!fs.existsSync(p)) return acc;
  const st = fs.statSync(p);
  if (st.isFile()) {
    if (/\.(jsx|js|tsx)$/.test(p)) acc.push(p);
    return acc;
  }
  for (const e of fs.readdirSync(p)) walk(path.join(p, e), acc);
  return acc;
}

const files = roots.flatMap((r) => walk(r));
const keys = new Set();
const re = /t\(\s*['"]((?:admin|account)\.[^'"]+)['"]/g;

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(text))) keys.add(m[1]);
}

const sorted = [...keys].sort();
console.log(JSON.stringify({ files: files.length, keys: sorted.length, list: sorted }, null, 2));
