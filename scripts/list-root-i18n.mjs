import fs from 'fs';
import path from 'path';

const root = 'src/components';
const files = fs.readdirSync(root).filter((f) => /\.(jsx|tsx)$/.test(f));
const no = [];
const yes = [];
for (const f of files) {
  const s = fs.readFileSync(path.join(root, f), 'utf8');
  const has = /useTranslation/.test(s);
  (has ? yes : no).push(f);
}
console.log('ROOT con i18n (' + yes.length + '):');
yes.sort().forEach((f) => console.log('  +', f));
console.log('\nROOT sin i18n (' + no.length + '):');
no.sort().forEach((f) => console.log('  -', f));
