const JSZip = require('jszip');
const fs = require('fs');

/** EMU: 914400 = 1 inch. Carta US: 8.5 x 11 in */
const PAGE_W = 7772400; // 8.5"
const PAGE_H = 10058400; // 11"
/** Franja compacta (~0.72") para que el cuerpo quepa en 1 página */
const HEADER_H = 658368;
/**
 * Pie tal cual membrete oficial (~0.94") para logo + slogan + contacto Equidad.
 */
const FOOTER_H = 857153;

function headerXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" mc:Ignorable="w14 wp14" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">
  <w:p>
    <w:pPr>
      <w:pStyle w:val="Header"/>
      <w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:noProof/></w:rPr>
      <w:drawing>
        <wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1">
          <wp:simplePos x="0" y="0"/>
          <wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH>
          <wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV>
          <wp:extent cx="${PAGE_W}" cy="${HEADER_H}"/>
          <wp:effectExtent l="0" t="0" r="0" b="0"/>
          <wp:wrapNone/>
          <wp:docPr id="1" name="Membrete encabezado Equidad"/>
          <wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="0"/></wp:cNvGraphicFramePr>
          <a:graphic>
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic>
                <pic:nvPicPr>
                  <pic:cNvPr id="1" name="Membrete encabezado Equidad"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="rId1"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm>
                    <a:off x="0" y="0"/>
                    <a:ext cx="${PAGE_W}" cy="${HEADER_H}"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:anchor>
      </w:drawing>
    </w:r>
  </w:p>
</w:hdr>`;
}

function footerXml() {
  const top = PAGE_H - FOOTER_H;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" mc:Ignorable="w14 wp14" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">
  <w:p>
    <w:pPr>
      <w:pStyle w:val="Footer"/>
      <w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:noProof/></w:rPr>
      <w:drawing>
        <wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251660288" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1">
          <wp:simplePos x="0" y="0"/>
          <wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH>
          <wp:positionV relativeFrom="page"><wp:posOffset>${top}</wp:posOffset></wp:positionV>
          <wp:extent cx="${PAGE_W}" cy="${FOOTER_H}"/>
          <wp:effectExtent l="0" t="0" r="0" b="0"/>
          <wp:wrapNone/>
          <wp:docPr id="2" name="Membrete pie Equidad"/>
          <wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="0"/></wp:cNvGraphicFramePr>
          <a:graphic>
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic>
                <pic:nvPicPr>
                  <pic:cNvPr id="2" name="Membrete pie Equidad"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="rId1"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm>
                    <a:off x="0" y="0"/>
                    <a:ext cx="${PAGE_W}" cy="${FOOTER_H}"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:anchor>
      </w:drawing>
    </w:r>
  </w:p>
</w:ftr>`;
}

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`;

const RELS_FOOTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image2.png"/>
</Relationships>`;

(async () => {
  const membretePath = 'C:/Users/GP-TI/Downloads/MEMBRETE 2025- LA EQUIDAD SEGUROS.docx';
  const cartaPath = 'public/templates/carta-cobertura-primera-perdida-fdm.docx';

  // Partir de la carta original (sin membrete) del último commit limpio si hace falta:
  // usamos la plantilla actual y reescribimos header/footer.
  const [membrete, carta] = await Promise.all([
    JSZip.loadAsync(fs.readFileSync(membretePath)),
    JSZip.loadAsync(fs.readFileSync(cartaPath)),
  ]);

  carta.file('word/media/image1.png', await membrete.file('word/media/image1.png').async('nodebuffer'));
  carta.file('word/media/image2.png', await membrete.file('word/media/image2.png').async('nodebuffer'));
  carta.file('word/header2.xml', headerXml());
  carta.file('word/footer2.xml', footerXml());
  carta.file('word/_rels/header2.xml.rels', RELS);
  carta.file('word/_rels/footer2.xml.rels', RELS_FOOTER);

  for (const f of ['word/header1.xml', 'word/header3.xml', 'word/footer1.xml', 'word/footer3.xml']) {
    carta.remove(f);
  }

  let rels = await carta.file('word/_rels/document.xml.rels').async('string');
  rels = rels.replace(/<Relationship[^>]*Target="header\d+\.xml"\s*\/>/g, '');
  rels = rels.replace(/<Relationship[^>]*Target="footer\d+\.xml"\s*\/>/g, '');
  const existingIds = [...rels.matchAll(/Id="(rId\d+)"/g)].map((m) => m[1]);
  let max = Math.max(0, ...existingIds.map((id) => parseInt(id.replace('rId', ''), 10)));
  const headerId = `rId${++max}`;
  const footerId = `rId${++max}`;
  const extra =
    `<Relationship Id="${headerId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header2.xml"/>` +
    `<Relationship Id="${footerId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer2.xml"/>`;
  rels = rels.replace('</Relationships>', `${extra}</Relationships>`);
  carta.file('word/_rels/document.xml.rels', rels);

  let doc = await carta.file('word/document.xml').async('string');
  // Quitar sombreado / fondo de página oscuro si existiera
  doc = doc.replace(/<w:background\b[^>]*\/>/g, '');
  doc = doc.replace(/<w:background\b[\s\S]*?<\/w:background>/g, '');

  const oldSect = doc.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  if (!oldSect) throw new Error('sin sectPr');

  // top ~0.85" (bajo la franja chica); bottom ~1.2" (deja aire al pie Equidad)
  const newSect =
    `<w:sectPr>` +
    `<w:headerReference w:type="default" r:id="${headerId}"/>` +
    `<w:footerReference w:type="default" r:id="${footerId}"/>` +
    `<w:pgSz w:w="12240" w:h="15840"/>` +
    `<w:pgMar w:top="1224" w:right="1134" w:bottom="1728" w:left="1134" w:header="0" w:footer="0" w:gutter="0"/>` +
    `<w:cols w:space="708"/>` +
    `<w:docGrid w:linePitch="360"/>` +
    `</w:sectPr>`;
  doc = doc.replace(oldSect[0], newSect);

  if (!/xmlns:r=/.test(doc)) {
    doc = doc.replace(
      '<w:document ',
      '<w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
    );
  }
  carta.file('word/document.xml', doc);

  // Forzar página blanca en settings
  let settings = await carta.file('word/settings.xml').async('string');
  if (!settings.includes('displayBackgroundShape')) {
    settings = settings.replace(
      /<w:settings([^>]*)>/,
      '<w:settings$1><w:displayBackgroundShape w:val="0"/>'
    );
  }
  carta.file('word/settings.xml', settings);

  let ct = await carta.file('[Content_Types].xml').async('string');
  ct = ct.replace(/<Override PartName="\/word\/(header|footer)\d+\.xml"[^/]*\/>/g, '');
  if (!ct.includes('PartName="/word/header2.xml"')) {
    ct = ct.replace(
      '</Types>',
      '<Override PartName="/word/header2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>'
    );
  }
  if (!ct.includes('PartName="/word/footer2.xml"')) {
    ct = ct.replace(
      '</Types>',
      '<Override PartName="/word/footer2.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>'
    );
  }
  if (!ct.includes('Extension="png"')) {
    ct = ct.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>');
  }
  carta.file('[Content_Types].xml', ct);

  const out = await carta.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(cartaPath, out);
  console.log('OK plantilla ajustada', out.length, 'bytes');
  console.log('header page-top full width, footer page-bottom full width, sin srcRect');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
