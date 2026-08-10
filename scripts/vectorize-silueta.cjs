const potrace = require('potrace');
const fs = require('fs');
const path = require('path');

const src = path.join('src/assets/sg-sst/silueta-bw.png');
const outJson = path.join('src/assets/sg-sst/silueta-path.json');
const outSvg = path.join('src/assets/sg-sst/silueta-humana.svg');

potrace.trace(
  src,
  {
    threshold: 128,
    turdSize: 50,
    optTolerance: 0.28,
    color: '#111',
    background: 'transparent',
  },
  (err, svg) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    fs.writeFileSync(outSvg, svg);
    const match = svg.match(/d="([^"]+)"/);
    const viewBox = (svg.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 200 400';
    if (!match) {
      console.error('No path found');
      process.exit(1);
    }
    fs.writeFileSync(outJson, JSON.stringify({ viewBox, d: match[1] }, null, 2));
    console.log('vector ok', viewBox, 'len', match[1].length);
  }
);
