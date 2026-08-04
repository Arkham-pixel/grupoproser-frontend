import fs from 'fs';

const s = fs.readFileSync('src/components/FormularioInspeccion.jsx', 'utf8');
const start = s.indexOf('{/* Fotografía del Riesgo */}');
const chunk = s.slice(start > 0 ? start : 0);

const re = />\s*([^<{]+?)\s*</g;
const hits = new Map();
let m;
while ((m = re.exec(chunk))) {
  const t = m[1].trim();
  if (!t || t.length < 2) continue;
  if (/^[0-9\s.&;:\-_/✔✓📍🛠️📋🗺️]+$/.test(t)) continue;
  if (t.includes('t(') || t.includes('{')) continue;
  if (t.startsWith('&nbsp')) continue;
  const isEs =
    /[áéíóúñÁÉÍÓÚÑ¿¡]/.test(t) ||
    /\b(de|la|el|los|las|del|para|con|Nombre|Empresa|Tipo|Sí|No|Agregar|Eliminar|Cantidad|Observaciones|Descripci|Comentarios|Protecci|Incendio|Almacen|Riesgo|Secci|Tabla|Valor|Fecha|Número|Sistema|Cuenta|Requiere|Genera|Instalaci|Mantenimiento|Energía|Agua|Bombeo|Transformador|Planta|Extintor|Brigada|Bombero|Alarma|Señalizaci|Análisis|Recomendaci|Captura|Ubicaci|Horario|Personal|Empresa|Monitoreo|Grabaci|Vigilancia|Jornada|Armas|Radio|Norte|Sur|Oriente|Occidente|Latitud|Longitud|Seleccione|Buscar|Guardar|Exportar|Cargando|Ningún|ninguna)\b/i.test(t);
  if (isEs) hits.set(t, (hits.get(t) || 0) + 1);
}
const list = [...hits.entries()].sort((a,b)=>b[1]-a[1]);
console.log('unique', list.length);
console.log(list.slice(0, 80).map(([k,v]) => `${v}\t${k}`).join('\n'));
