/**
 * Elimina console.log / console.debug / console.info del código fuente.
 * Conserva console.error y console.warn.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');

const SKIP_FILES = new Set([
  'devLog.js',
  'test-config.js',
  'generarManualPuertosDesdeConsola.js',
]);

const SKIP_DIRS = new Set(['node_modules']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function removeConsoleCalls(code, methods) {
  let result = code;
  for (const method of methods) {
    const needle = `console.${method}(`;
    let idx = 0;
    while ((idx = result.indexOf(needle, idx)) !== -1) {
      const start = idx;
      let i = idx + needle.length;
      let depth = 1;
      let inString = false;
      let stringChar = '';

      while (i < result.length && depth > 0) {
        const c = result[i];
        if (inString) {
          if (c === '\\') {
            i += 2;
            continue;
          }
          if (c === stringChar) inString = false;
        } else if (c === '"' || c === "'" || c === '`') {
          inString = true;
          stringChar = c;
        } else if (c === '(') {
          depth++;
        } else if (c === ')') {
          depth--;
        }
        i++;
      }

      while (i < result.length && /[;\s]/.test(result[i])) i++;
      if (result[i] === '\r') i++;
      if (result[i] === '\n') i++;

      let lineStart = start;
      while (lineStart > 0 && result[lineStart - 1] !== '\n') lineStart--;

      const prefix = result.slice(lineStart, start);
      if (/^\s*$/.test(prefix)) {
        result = result.slice(0, lineStart) + result.slice(i);
        idx = lineStart;
      } else {
        result = result.slice(0, start) + result.slice(i);
        idx = start;
      }
    }
  }
  return result;
}

function cleanupEmptyBlocks(code) {
  return code
    .replace(/\n\s*if\s*\([^)]+\)\s*\{\s*\}\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

const files = walk(SRC);
let totalRemoved = 0;

for (const file of files) {
  if (SKIP_FILES.has(path.basename(file))) continue;

  const original = fs.readFileSync(file, 'utf8');
  let updated = removeConsoleCalls(original, ['log', 'debug', 'info']);
  updated = cleanupEmptyBlocks(updated);

  if (updated !== original) {
    fs.writeFileSync(file, updated, 'utf8');
    const before = (original.match(/console\.(log|debug|info)\(/g) || []).length;
    const after = (updated.match(/console\.(log|debug|info)\(/g) || []).length;
    totalRemoved += before - after;
    console.log(`${path.relative(SRC, file)}: -${before - after}`);
  }
}

console.log(`\nTotal eliminados: ${totalRemoved}`);
