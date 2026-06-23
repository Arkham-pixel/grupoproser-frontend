/**
 * Restaura integración de seccionesActivas, índice con checkboxes, PML y condicionales del formulario.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/FormularioInspeccion.jsx');
let c = fs.readFileSync(filePath, 'utf8');

function wrapFormSection(content, id, startMarker, endMarker) {
  const open = `{incluirSeccion('${id}') && (`;
  if (content.includes(open) && content.includes(startMarker)) return content;
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker, startIdx + startMarker.length);
  if (startIdx < 0 || endIdx < 0) {
    console.warn(`No se pudo envolver ${id}: marcadores no encontrados`);
    return content;
  }
  const before = content.slice(0, startIdx);
  const section = content.slice(startIdx, endIdx);
  const after = content.slice(endIdx);
  return `${before}${open}\n${section}\n)}\n\n${after}`;
}

if (!c.includes("from './inspeccion/seccionesInformeInspeccion.js'")) {
  c = c.replace(
    "import { generarManualInspeccion } from './generarManualInspeccion.js';",
    `import { generarManualInspeccion } from './generarManualInspeccion.js';
import {
  SECCIONES_INFORME_INSPECCION,
  normalizarSeccionesActivas,
  estaSeccionInformeActiva,
  obtenerFilasIndiceInforme,
  obtenerFilasIndiceWord,
} from './inspeccion/seccionesInformeInspeccion.js';`
  );
  console.log('Import agregado.');
}

if (!c.includes('seccionesActivas')) {
  c = c.replace(
    `  const textoSuscripcion =
    puedeSuscribir === "NO" ? "NO SE PUEDE SUSCRIBIR" : "SE PUEDE SUSCRIBIR";

  const [nombreEmpresa`,
    `  const textoSuscripcion =
    puedeSuscribir === "NO" ? "NO SE PUEDE SUSCRIBIR" : "SE PUEDE SUSCRIBIR";

  const [seccionesActivas, setSeccionesActivas] = useState(() =>
    normalizarSeccionesActivas(datosPrevios.seccionesActivas)
  );

  const incluirSeccion = useCallback(
    (id) => estaSeccionInformeActiva(seccionesActivas, id),
    [seccionesActivas]
  );

  const toggleSeccionInforme = useCallback((id) => {
    const cfg = SECCIONES_INFORME_INSPECCION.find((s) => s.id === id);
    if (!cfg || cfg.obligatoria || cfg.seleccionable === false) return;
    setSeccionesActivas((prev) => {
      const siguiente = { ...prev, [id]: !estaSeccionInformeActiva(prev, id) };
      return normalizarSeccionesActivas(siguiente);
    });
  }, []);

  const filasIndiceInforme = useMemo(
    () => obtenerFilasIndiceInforme(seccionesActivas),
    [seccionesActivas]
  );

  const [nombreEmpresa`
  );
  console.log('Estado seccionesActivas agregado.');
}

if (!c.includes('pmlPorcentaje')) {
  c = c.replace(
    `  const [comentariosLucroCesante, setComentariosLucroCesante] = useState(datosPrevios.comentariosLucroCesante || datosPrevios.lucroCesante?.comentariosLucroCesante || "");`,
    `  const [comentariosLucroCesante, setComentariosLucroCesante] = useState(datosPrevios.comentariosLucroCesante || datosPrevios.lucroCesante?.comentariosLucroCesante || "");

  const [pml, setPml] = useState({
    porcentaje: datosPrevios.pml?.porcentaje || datosPrevios.pmlPorcentaje || datosPrevios.lucroCesante?.pmlPorcentaje || "",
    descripcion: datosPrevios.pml?.descripcion || datosPrevios.pmlDescripcion || datosPrevios.lucroCesante?.pmlDescripcion || "",
  });
  const [pmlPorcentaje, setPmlPorcentaje] = useState(
    datosPrevios.pml?.porcentaje || datosPrevios.pmlPorcentaje || datosPrevios.lucroCesante?.pmlPorcentaje || ""
  );
  const [pmlDescripcion, setPmlDescripcion] = useState(
    datosPrevios.pml?.descripcion || datosPrevios.pmlDescripcion || datosPrevios.lucroCesante?.pmlDescripcion || ""
  );

  useEffect(() => {
    setPml({ porcentaje: pmlPorcentaje, descripcion: pmlDescripcion });
  }, [pmlPorcentaje, pmlDescripcion]);`
  );
  console.log('Estado PML agregado.');
}

if (!c.includes('datosParseados.seccionesActivas')) {
  c = c.replace(
    `            }
            // Procesos Críticos y Riesgos Medioambientales`,
    `            }
            if (datosParseados.seccionesActivas) {
              setSeccionesActivas(normalizarSeccionesActivas(datosParseados.seccionesActivas));
            }
            if (datosParseados.pml) {
              setPmlPorcentaje(datosParseados.pml.porcentaje ?? datosParseados.pmlPorcentaje ?? "");
              setPmlDescripcion(datosParseados.pml.descripcion ?? datosParseados.pmlDescripcion ?? "");
            }
            // Procesos Críticos y Riesgos Medioambientales`
  );
}

if (!c.includes('pml: pml,')) {
  c = c.replace(
    `      lucroCesante: lucroCesante,
      // Procesos Críticos y Riesgos Medioambientales`,
    `      lucroCesante: lucroCesante,
      pml: pml,
      seccionesActivas: seccionesActivas,
      // Procesos Críticos y Riesgos Medioambientales`
  );
  c = c.replace(
    `    lucroCesante,
    // Procesos Críticos y Riesgos Medioambientales`,
    `    lucroCesante,
    pml,
    seccionesActivas,
    // Procesos Críticos y Riesgos Medioambientales`
  );
  c = c.replace(
    `sustraccion, lucroCesante, procesosCriticos`,
    `sustraccion, lucroCesante, pml, seccionesActivas, procesosCriticos`
  );
}

if (!c.includes('filasIndiceInforme.map')) {
  const oldIndex = `              {[
                ["0.", "INFORME DE INSPECCIÓN", "2"],
                ["1.", "INFORMACIÓN GENERAL", "8"],
                ["2.", "DESCRIPCIÓN GENERAL DE LA EMPRESA", "9"],
                ["3.", "INFRAESTRUCTURA", "10"],
                ["4.", "PROCESOS", "11"],
                ["5.", "LINDEROS", "12"],
                ["5.1", "MAPA DE UBICACIÓN", "13"],
                ["6.", "SUSTRACCIÓN - PROTECCIONES FÍSICAS", "14"],
                ["7.", "CARACTERÍSTICAS OPERATIVAS AMBIENTALES", "15"],
                ["8.", "PROTECCIÓN Y PREVENCIÓN CONTRA INCENDIOS", "16"],
                ["9.", "LUCRO CESANTE", "17"],
                ["10.", "PROCESOS CRÍTICOS Y RIESGOS MEDIOAMBIENTALES", "18"],
                ["11.", "POR ROTURA DE MAQUINARIA", "19"],
                ["12.", "MAQUINARIA, EQUIPOS Y MANTENIMIENTO", "20"],
                ["13.", "SERVICIOS INDUSTRIALES", "21"],
                ["14.", "SINIESTRALIDAD", "22"],
                ["15.", "ALMACENAMIENTO", "23"],
                ["16.", "ANÁLISIS Y CLASIFICACIÓN DE RIESGOS", "24"],
                ["16.1", "ANÁLISIS DE RIESGOS", "24"],
                ["16.2", "CLASIFICACIÓN DE RIESGOS", "25"],
                ["16.3", "CALIFICACIÓN DEL RIESGO (R) E ÍNDICE DE VULNERABILIDAD", "26"],
                ["16.4", "MATRIZ DE CALOR DE RIESGOS", "27"],
                ["17.", "RECOMENDACIONES", "28"],
                ["18.", "REGISTRO FOTOGRÁFICO", "29"]
              ].map(([num, title, page], idx) => (
                <tr 
                  key={idx}
                  style={{
                    backgroundColor: idx % 2 === 0 
                      ? (theme === 'dark' ? '#1A1A1A' : '#FFFFFF')
                      : (theme === 'dark' ? '#1F1F1F' : '#F9FAFB')
                  }}
                >
                  <td 
                    className="px-3 py-1"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary
                    }}
                  >
                    {num}
                  </td>
                  <td 
                    className="px-3 py-1"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary
                    }}
                  >
                    {title}
                  </td>
                  <td 
                    className="px-3 py-1 text-right"
                    style={{
                      border: `1px solid ${borderColor}`,
                      color: textPrimary
                    }}
                  >
                    {page}
                  </td>
                </tr>
              ))}`;

  const newIndex = `              {filasIndiceInforme.map((fila, idx) => (
                <tr 
                  key={\`\${fila.ref}-\${fila.titulo}-\${idx}\`}
                  style={{
                    backgroundColor: idx % 2 === 0 
                      ? (theme === 'dark' ? '#1A1A1A' : '#FFFFFF')
                      : (theme === 'dark' ? '#1F1F1F' : '#F9FAFB'),
                    opacity: fila.activa ? 1 : 0.55,
                  }}
                >
                  <td 
                    className="px-3 py-1 text-center"
                    style={{
                      border: \`1px solid \${borderColor}\`,
                    }}
                  >
                    {fila.tipo === 'principal' ? (
                      fila.seleccionable ? (
                        <input
                          type="checkbox"
                          checked={fila.activa}
                          onChange={() => toggleSeccionInforme(fila.id)}
                          disabled={cargando}
                          className="w-4 h-4"
                        />
                      ) : (
                        <span title="Sección obligatoria" style={{ color: textSecondary }}>●</span>
                      )
                    ) : null}
                  </td>
                  <td 
                    className="px-3 py-1"
                    style={{
                      border: \`1px solid \${borderColor}\`,
                      color: textPrimary,
                      paddingLeft: fila.tipo === 'sub' ? '1.5rem' : undefined,
                    }}
                  >
                    {fila.ref}
                  </td>
                  <td 
                    className="px-3 py-1"
                    style={{
                      border: \`1px solid \${borderColor}\`,
                      color: textPrimary,
                      paddingLeft: fila.tipo === 'sub' ? '1.5rem' : undefined,
                      fontStyle: fila.tipo === 'sub' ? 'italic' : 'normal',
                    }}
                  >
                    {fila.titulo}
                  </td>
                  <td 
                    className="px-3 py-1 text-right"
                    style={{
                      border: \`1px solid \${borderColor}\`,
                      color: textPrimary
                    }}
                  >
                    {fila.pagina}
                  </td>
                </tr>
              ))}`;

  if (c.includes(oldIndex)) {
    c = c.replace(oldIndex, newIndex);
    c = c.replace(
      `          Tabla de Contenido
        </h2>
        <div className="overflow-x-auto mb-6">`,
      `          Tabla de Contenido
        </h2>
        <p className="text-sm mb-3" style={{ color: textSecondary }}>
          Marque las secciones que desea incluir en el formulario y en el Word. Las secciones obligatorias no se pueden desactivar.
        </p>
        <div className="overflow-x-auto mb-6">`
    );
    c = c.replace(
      `                <th 
                  className="px-3 py-1 font-bold"
                  style={{
                    border: \`1px solid \${borderColor}\`,
                    color: textPrimary
                  }}
                >
                  REF
                </th>`,
      `                <th 
                  className="px-3 py-1 font-bold text-center"
                  style={{
                    border: \`1px solid \${borderColor}\`,
                    color: textPrimary,
                    width: '48px'
                  }}
                >
                  ✓
                </th>
                <th 
                  className="px-3 py-1 font-bold"
                  style={{
                    border: \`1px solid \${borderColor}\`,
                    color: textPrimary
                  }}
                >
                  REF
                </th>`
    );
    console.log('Índice con checkboxes actualizado.');
  } else {
    console.warn('Tabla de contenido estática no encontrada para reemplazar.');
  }
}

if (!c.includes('{/* SECCIÓN PML */}')) {
  const pmlSection = `{/* SECCIÓN PML */}
{incluirSeccion('pml') && (
<div 
  className="mt-8 p-6 rounded shadow-sm"
  style={{
    backgroundColor: cardBg,
    border: \`1px solid \${borderColor}\`
  }}
>
  <h2 
    className="text-xl font-bold mb-4"
    style={{ color: textPrimary }}
  >
    9.1 PML (PÉRDIDA MÁXIMA PROBABLE)
  </h2>

  <div className="overflow-x-auto">
    <table 
      className="w-full text-sm"
      style={{
        border: \`1px solid \${borderColor}\`,
        borderCollapse: 'collapse'
      }}
    >
      <tbody>
        <tr style={{ backgroundColor: theme === 'dark' ? '#1F1F1F' : '#E5E7EB' }}>
          <td 
            style={{
              border: \`1px solid \${borderColor}\`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary,
              width: '40%'
            }}
          >
            Porcentaje (%)
          </td>
          <td 
            style={{
              border: \`1px solid \${borderColor}\`,
              padding: '8px'
            }}
          >
            <input
              type="text"
              value={pmlPorcentaje}
              onChange={(e) => setPmlPorcentaje(e.target.value)}
              placeholder="Porcentaje (%)"
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: \`1px solid \${borderColor}\`
              }}
              disabled={cargando}
            />
          </td>
        </tr>
        <tr>
          <td 
            style={{
              border: \`1px solid \${borderColor}\`,
              padding: '8px',
              fontWeight: 'bold',
              color: textPrimary
            }}
          >
            Descripción
          </td>
          <td 
            style={{
              border: \`1px solid \${borderColor}\`,
              padding: '8px'
            }}
          >
            <textarea
              value={pmlDescripcion}
              onChange={(e) => setPmlDescripcion(e.target.value)}
              placeholder="Descripción"
              rows={4}
              className="w-full px-2 py-1 rounded"
              style={{
                backgroundColor: inputBg,
                color: textPrimary,
                borderColor: borderColor,
                border: \`1px solid \${borderColor}\`
              }}
              disabled={cargando}
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
)}

`;
  c = c.replace(
    `{/* SECCIÓN PROCESOS CRÍTICOS Y RIESGOS MEDIOAMBIENTALES */}`,
    `${pmlSection}{/* SECCIÓN PROCESOS CRÍTICOS Y RIESGOS MEDIOAMBIENTALES */}`
  );
  console.log('Sección PML agregada.');
}

const formWraps = [
  ['descripcionEmpresa', '{/* Secciones extensas como texto libre */}', '{/* SECCIÓN INFRAESTRUCTURA */}'],
  ['infraestructura', '{/* SECCIÓN INFRAESTRUCTURA */}', '{/* SECCIÓN PROCESOS */}'],
  ['procesos', '{/* SECCIÓN PROCESOS */}', '{/* SECCIÓN LINDEROS */}'],
  ['linderos', '{/* SECCIÓN LINDEROS */}', '{/* SECCIÓN SUSTRACCIÓN - PROTECCIONES FÍSICAS */}'],
  ['sustraccion', '{/* SECCIÓN SUSTRACCIÓN - PROTECCIONES FÍSICAS */}', '{/* SECCIÓN CARACTERÍSTICAS OPERATIVAS AMBIENTALES */}'],
  ['caracteristicasAmbientales', '{/* SECCIÓN CARACTERÍSTICAS OPERATIVAS AMBIENTALES */}', '{/* SECCIÓN PROTECCIÓN Y PREVENCIÓN CONTRA INCENDIOS */}'],
  ['proteccionIncendios', '{/* SECCIÓN PROTECCIÓN Y PREVENCIÓN CONTRA INCENDIOS */}', '{/* SECCIÓN LUCRO CESANTE */}'],
  ['lucroCesante', '{/* SECCIÓN LUCRO CESANTE */}', '{/* SECCIÓN PML */}'],
  ['procesosCriticos', '{/* SECCIÓN PROCESOS CRÍTICOS Y RIESGOS MEDIOAMBIENTALES */}', '{/* SECCIÓN POR ROTURA DE MAQUINARIA */}'],
  ['roturaMaquinaria', '{/* SECCIÓN POR ROTURA DE MAQUINARIA */}', '{/* SECCIÓN MAQUINARIA */}'],
  ['maquinaria', '{/* SECCIÓN MAQUINARIA */}', '    13. SERVICIOS INDUSTRIALES'],
  ['serviciosIndustriales', '    13. SERVICIOS INDUSTRIALES', '    14. SINIESTRALIDAD'],
  ['siniestralidad', '    14. SINIESTRALIDAD', '{/* 15. ALMACENAMIENTO */}'],
  ['almacenamiento', '{/* 15. ALMACENAMIENTO */}', '{/* SECCIÓN DE ANÁLISIS DE RIESGOS'],
  ['analisisRiesgos', '{/* SECCIÓN DE ANÁLISIS DE RIESGOS', '    17. RECOMENDACIONES'],
];

for (const [id, start, end] of formWraps) {
  c = wrapFormSection(c, id, start, end);
}

if (!c.includes("incluirSeccion('registroFotografico')")) {
  c = c.replace(
    `    <Suspense fallback={<div style={{ color: textPrimary }}>Cargando registro fotográfico...</div>}>
      <RegistroFotografico `,
    `    {incluirSeccion('registroFotografico') && (
    <Suspense fallback={<div style={{ color: textPrimary }}>Cargando registro fotográfico...</div>}>
      <RegistroFotografico `
  );
  c = c.replace(
    `        tituloSeccion="18. REGISTRO FOTOGRÁFICO"
      />
    </Suspense>

    {/* Botón de acción */}`,
    `        tituloSeccion="18. REGISTRO FOTOGRÁFICO"
      />
    </Suspense>
    )}

    {/* Botón de acción */}`
  );
}

if (!c.includes('const incluirSeccionWord')) {
  c = c.replace(
    `  const generarWord = async () => {
    // Función para convertir imagen importada a base64`,
    `  const generarWord = async () => {
    const incluirSeccionWord = (id) => estaSeccionInformeActiva(seccionesActivas, id);
    const filasIndiceWord = obtenerFilasIndiceWord(seccionesActivas);

    // Función para convertir imagen importada a base64`
  );
}

// Word: índice manual según secciones activas
if (!c.includes('filasIndiceWord.map')) {
  const oldToc = `  new TableOfContents(" ", {
    hyperlink: false,
    headingStyleRange: "2-2",
  }),
  new Paragraph({
    children: [
      new TextRun({
        text: "Nota: Si la tabla de contenido no refleja páginas actualizadas, en Word use 'Actualizar tabla' (Actualizar toda la tabla).",
        italics: true,
        size: 18,
        color: "666666",
      }),
    ],
    spacing: { before: 120, after: 80 },
  })
    );`;

  const newToc = `  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "REF", bold: true, font: "Arial", size: 22 })] })],
            width: { size: 12, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: ": INFORME DE INSPECCIÓN", bold: true, font: "Arial", size: 22 })] })],
            width: { size: 73, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "", font: "Arial", size: 22 })], alignment: AlignmentType.RIGHT })],
            width: { size: 15, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
      ...filasIndiceWord.map((fila) =>
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: fila.ref, font: "Arial", size: 22 })],
                  indent: fila.tipo === 'sub' ? { left: 360 } : undefined,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: fila.titulo, font: "Arial", size: 22, italics: fila.tipo === 'sub' })],
                  indent: fila.tipo === 'sub' ? { left: 360 } : undefined,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: fila.pagina, font: "Arial", size: 22 })],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        })
      ),
    ],
  }),
  new Paragraph({ text: "", spacing: { after: 200 } })
    );`;

  if (c.includes(oldToc)) {
    c = c.replace(oldToc, newToc);
    console.log('Índice Word actualizado.');
  }
}

// Word: PML después de lucro cesante
if (!c.includes('incluirSeccionWord(\'pml\')')) {
  c = c.replace(
    `    linea(comentariosLucroCesante || "No se ingresaron comentarios."),
    new Paragraph({ text: "", spacing: { after: 200 } }),
    seccion("10. PROCESOS CRÍTICOS Y RIESGOS MEDIOAMBIENTALES"),`,
    `    linea(comentariosLucroCesante || "No se ingresaron comentarios."),
    new Paragraph({ text: "", spacing: { after: 200 } }),
  );
}

if (!c.includes('incluirSeccionWord(\'lucroCesante\')')) {
  c = c.replace(
    `    new Paragraph({ text: "", spacing: { after: 200 } }),
    seccion("9. LUCRO CESANTE"),`,
    `    new Paragraph({ text: "", spacing: { after: 200 } }),
  );
}

if (!c.includes("seccion(\"9.1 PML")) {
  const pmlWord = `
if (incluirSeccionWord('lucroCesante')) {
  docContent.push(
    seccion("9. LUCRO CESANTE"),
    new Paragraph({ text: "Por incendio", bold: true, spacing: { after: 100 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            encabezadoTabla("Área requerida para el desarrollo de las actividades"),
            celdaTexto(areaRequeridaLucroCesante === "Otro" && areaRequeridaLucroCesanteOtro ? \`\${areaRequeridaLucroCesante}: \${areaRequeridaLucroCesanteOtro}\` : (areaRequeridaLucroCesante || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Complejidad de la actividad o proceso"),
            celdaTexto(complejidadActividadLucroCesante === "Otro" && complejidadActividadLucroCesanteOtro ? \`\${complejidadActividadLucroCesante}: \${complejidadActividadLucroCesanteOtro}\` : (complejidadActividadLucroCesante || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Plan de continuidad del negocio documentado"),
            celdaTexto(planContinuidadNegocio || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Valor nómina mensual"),
            celdaTexto(valorNominaMensual || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Valor facturación del año anterior"),
            celdaTexto(valorFacturacionAnoAnterior || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Valor proyectado facturación para el presente año"),
            celdaTexto(valorProyectadoFacturacion || ""),
          ],
        }),
      ],
    }),
    new Paragraph({ text: "", spacing: { after: 200 } }),
    new Paragraph({ text: "Análisis y comentarios", bold: true, spacing: { after: 100 } }),
    linea(comentariosLucroCesante || "No se ingresaron comentarios."),
    new Paragraph({ text: "", spacing: { after: 200 } }),
  );
}

if (incluirSeccionWord('pml')) {
  docContent.push(
    seccion("9.1 PML (PÉRDIDA MÁXIMA PROBABLE)"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            encabezadoTabla("Porcentaje (%)"),
            celdaTexto(pmlPorcentaje ? \`\${pmlPorcentaje}%\` : ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Descripción"),
            celdaTexto(pmlDescripcion || ""),
          ],
        }),
      ],
    }),
    new Paragraph({ text: "", spacing: { after: 200 } }),
  );
}

if (incluirSeccionWord('procesosCriticos')) {
  docContent.push(
    seccion("10. PROCESOS CRÍTICOS Y RIESGOS MEDIOAMBIENTALES"),`;

  // Remove duplicate lucro block inside docContent.push
  c = c.replace(
    `    seccion("9. LUCRO CESANTE"),
    new Paragraph({ text: "Por incendio", bold: true, spacing: { after: 100 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            encabezadoTabla("Área requerida para el desarrollo de las actividades"),
            celdaTexto(areaRequeridaLucroCesante === "Otro" && areaRequeridaLucroCesanteOtro ? \`\${areaRequeridaLucroCesante}: \${areaRequeridaLucroCesanteOtro}\` : (areaRequeridaLucroCesante || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Complejidad de la actividad o proceso"),
            celdaTexto(complejidadActividadLucroCesante === "Otro" && complejidadActividadLucroCesanteOtro ? \`\${complejidadActividadLucroCesante}: \${complejidadActividadLucroCesanteOtro}\` : (complejidadActividadLucroCesante || "")),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Plan de continuidad del negocio documentado"),
            celdaTexto(planContinuidadNegocio || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Valor nómina mensual"),
            celdaTexto(valorNominaMensual || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Valor facturación del año anterior"),
            celdaTexto(valorFacturacionAnoAnterior || ""),
          ],
        }),
        new TableRow({
          children: [
            encabezadoTabla("Valor proyectado facturación para el presente año"),
            celdaTexto(valorProyectadoFacturacion || ""),
          ],
        }),
      ],
    }),
    new Paragraph({ text: "", spacing: { after: 200 } }),
    new Paragraph({ text: "Análisis y comentarios", bold: true, spacing: { after: 100 } }),
    linea(comentariosLucroCesante || "No se ingresaron comentarios."),
    new Paragraph({ text: "", spacing: { after: 200 } }),
  );
}

if (incluirSeccionWord('procesosCriticos')) {
  docContent.push(
    seccion("10. PROCESOS CRÍTICOS Y RIESGOS MEDIOAMBIENTALES"),`,
    pmlWord
  );
}

if (!c.includes('formulario.datos?.seccionesActivas')) {
  c = c.replace(
    `      setPeriodicidadMantenimientos(formulario.datos?.periodicidadMantenimientos || '');
      
      // Tabla de riesgos - sincronizar con analisisRiesgos`,
    `      setPeriodicidadMantenimientos(formulario.datos?.periodicidadMantenimientos || '');
      if (formulario.datos?.seccionesActivas) {
        setSeccionesActivas(normalizarSeccionesActivas(formulario.datos.seccionesActivas));
      }
      const pmlDatos = formulario.datos?.pml || {};
      setPmlPorcentaje(
        pmlDatos.porcentaje ?? pmlDatos.pmlPorcentaje ?? formulario.datos?.pmlPorcentaje ?? ''
      );
      setPmlDescripcion(
        pmlDatos.descripcion ?? pmlDatos.pmlDescripcion ?? formulario.datos?.pmlDescripcion ?? ''
      );
      
      // Tabla de riesgos - sincronizar con analisisRiesgos`
  );
}

// Municipio en Word
c = c.replace(
  `linea(\`Ciudad: \${ciudadSiniestroTexto}\`),`,
  `linea(\`Municipio: \${ciudadSiniestroTexto}\`),`
);
c = c.replace(
  `celdaEncabezadoInfo("Ciudad", 20),`,
  `celdaEncabezadoInfo("Municipio", 20),`
);

fs.writeFileSync(filePath, c, 'utf8');
console.log('Restauración completada.');
