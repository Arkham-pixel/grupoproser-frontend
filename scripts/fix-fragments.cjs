const fs = require('fs');
const p = 'src/components/FormularioInspeccion.jsx';
let c = fs.readFileSync(p, 'utf8');

// Add <> after incluirSeccion when followed by comment
c = c.replace(/\{incluirSeccion\('([^']+)'\) && \(\n(\{\/\*)/g, "{incluirSeccion('$1') && (\n<>\n$2");

// Add </> before )} when followed by incluirSeccion (section boundary)
c = c.replace(/\n\)\}\n\n\{incluirSeccion/g, '\n</>\n)}\n\n{incluirSeccion');

// serviciosIndustriales opens with <div not comment - add fragment
c = c.replace(
  /\{incluirSeccion\('serviciosIndustriales'\) && \(\n<div /g,
  "{incluirSeccion('serviciosIndustriales') && (\n<>\n<div "
);

// Close servicios before siniestralidad
c = c.replace(
  /\n\)\}\n\n\{incluirSeccion\('siniestralidad'\)/g,
  '\n</>\n)}\n\n{incluirSeccion(\'siniestralidad\')'
);

// siniestralidad opens with div
c = c.replace(
  /\{incluirSeccion\('siniestralidad'\) && \(\n<div /g,
  "{incluirSeccion('siniestralidad') && (\n<>\n<div "
);

// Close maquinaria before servicios
c = c.replace(
  /\n\)\}\n\n\{incluirSeccion\('serviciosIndustriales'\)/g,
  '\n</>\n)}\n\n{incluirSeccion(\'serviciosIndustriales\')'
);

// maquinaria opens with comment - already handled

// Close analisis before recomendaciones (no incluirSeccion after)
c = c.replace(
  /\n\)\}\n\n<div \n  className="mt-8 p-6 rounded shadow-sm"\n  style=\{\{\n    backgroundColor: cardBg,\n    border: `1px solid \$\{borderColor\}`\n  \}\}\n>\n  <h2 \n    className="text-xl font-bold mb-4"\n    style=\{\{ color: textPrimary \}\}\n  >\n    17\. RECOMENDACIONES/g,
  '\n</>\n)}\n\n<div \n  className="mt-8 p-6 rounded shadow-sm"\n  style={{\n    backgroundColor: cardBg,\n    border: `1px solid ${borderColor}`\n  }}\n>\n  <h2 \n    className="text-xl font-bold mb-4"\n    style={{ color: textPrimary }}\n  >\n    17. RECOMENDACIONES'
);

fs.writeFileSync(p, c);
console.log('fragments fixed v2');
