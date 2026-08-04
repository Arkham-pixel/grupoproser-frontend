import fs from 'fs';

const s = fs.readFileSync('src/components/FormularioInspeccion.jsx', 'utf8');
// From photo section to end of component return-ish
const start = s.indexOf('{/* Fotografía del Riesgo */}');
const chunk = s.slice(start);

const re = />\s*([^<{]+?)\s*</g;
const hits = new Map();
let m;
while ((m = re.exec(chunk))) {
  const t = m[1].trim();
  if (!t || t.length < 2) continue;
  if (/^[0-9\s.&;:\-_/]+$/.test(t)) continue;
  if (t.includes('t(') || t.includes('{')) continue;
  if (t.startsWith('&nbsp')) continue;
  const isEs =
    /[áéíóúñÁÉÍÓÚÑ¿¡]/.test(t) ||
    /\b(de|la|el|los|las|del|para|con|Nombre|Empresa|Municipio|Departamento|Barrio|Cargo|Actividad|Horario|Empleados|Descripci|Comentarios|Edificio|Año|Tipo|Bodega|Sí|No|Agregar|Eliminar|Cantidad|Marca|Observaciones|Persona|Entrevistada|Protecci|Incendio|Almacen|Riesgo|Secci)\b/i.test(t);
  if (isEs) {
    hits.set(t, (hits.get(t) || 0) + 1);
  }
}
const list = [...hits.entries()].sort((a,b)=>b[1]-a[1]);
console.log('total unique:', list.length);
console.log(list.slice(0, 60).map(([k,v])=>`${v}\t${k}`).join('\n'));
