/**
 * Genera el archivo Word físico del manual COMPLEX en la raíz del proyecto.
 * Uso: node scripts/generarManualComplexDocx.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { generarManualComplexBuffer } from '../src/utils/generarManualComplex.js';
import { MANUAL_COMPLEX_VERSION } from '../src/config/manualComplexContent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const raizProyecto = join(__dirname, '..', '..');
const carpetaSalida = join(raizProyecto, 'documentos');
const nombreArchivo = `Manual_Utilizacion_COMPLEX_Arnald_${MANUAL_COMPLEX_VERSION}.docx`;
const rutaSalida = join(carpetaSalida, nombreArchivo);

mkdirSync(carpetaSalida, { recursive: true });

const buffer = await generarManualComplexBuffer();
writeFileSync(rutaSalida, buffer);

console.log(`✅ Manual generado: ${rutaSalida}`);
