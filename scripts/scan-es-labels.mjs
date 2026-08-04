import fs from 'fs';

const s = fs.readFileSync('src/components/FormularioInspeccion.jsx', 'utf8');
const start = s.indexOf('{/* INFORME DE INSPECCIÓN - INFORMACIÓN GENERAL */}');
const chunk = s.slice(start, start + 120000);

// Find JSX text nodes that look Spanish (contain accents or common Spanish words)
const re = />\s*([^<{]+?)\s*</g;
const hits = new Map();
let m;
while ((m = re.exec(chunk))) {
  const t = m[1].trim();
  if (!t || t.length < 2) continue;
  if (/^[0-9\s.&;:\-_/]+$/.test(t)) continue;
  if (t.includes('t(') || t.includes('{')) continue;
  if (t.startsWith('&nbsp')) continue;
  // Spanish indicators
  const isEs =
    /[áéíóúñÁÉÍÓÚÑ¿¡]/.test(t) ||
    /\b(de|la|el|los|las|del|para|con|Nombre|Empresa|Municipio|Departamento|Barrio|Cargo|Actividad|Horario|Empleados|Descripci|Comentarios|Edificio|Año|Tipo|Bodega|Sí|No|Agregar|Eliminar|Cantidad|Marca|Observaciones|Persona|Entrevistada)\b/i.test(t);
  if (isEs) {
    hits.set(t, (hits.get(t) || 0) + 1);
  }
}
console.log([...hits.entries()].sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${v}\t${k}`).join('\n'));
