import fs from 'fs';

const s = fs.readFileSync('src/components/FormularioInspeccion.jsx', 'utf8');
const re = /<option\s+[^>]*>([^<{][^<]*)<\/option>/g;
const hits = new Map();
let m;
while ((m = re.exec(s))) {
  const t = m[1].trim();
  if (!t || /^\d+$/.test(t) || /^[0-9%.\-\s]+$/.test(t)) continue;
  if (/SEGUROS|S\.A|LTDA|COLOMBIA|AXA|MAPFRE|DVR|NVR|Cloud|Internet|Cable|ABC|CCTV/.test(t)) continue;
  const isEs =
    /[áéíóúñÁÉÍÓÚÑ]/.test(t) ||
    /\b(Sin|Por|Solo|Con|Almacenamiento|Empaque|Servidor|Oficina|Movimiento|Continuo|Ocasional|Remoto|Oculto|Visible|Combustibles|Inflamables|Explosivos|Corrosivos|Bajo|Medio|Alto|Extremo|Adecuado|Regular|Deficiente|Sacos|Bidones|Diurna|Nocturna|horas|trabes|losas|cerramiento|Acceso|eventos|Infrarrojos|Magnético|Térmico|Teléfono|Sí|No|aplica|Otro|Magnetico|Telefono|Vibración|Vibracion|Térmicos|termicos)\b/i.test(
      t
    );
  if (isEs) hits.set(t, (hits.get(t) || 0) + 1);
}
const list = [...hits.entries()].sort((a, b) => b[1] - a[1]);
console.log('unique', list.length);
console.log(list.map(([k, v]) => `${v}\t${k}`).join('\n') || '(none)');
