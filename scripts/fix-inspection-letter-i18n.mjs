import fs from 'fs';

const path = 'src/components/FormularioInspeccion.jsx';
const s = fs.readFileSync(path, 'utf8');

const startMarker = '      {/* Fotografía del Riesgo */}';
const endNeedle = 'className="mt-10 pt-6"';

const start = s.indexOf(startMarker);
const endNeedleIdx = s.indexOf(endNeedle, start);
if (start < 0 || endNeedleIdx < 0) {
  console.error('markers not found', { start, endNeedleIdx });
  process.exit(1);
}

// Walk back to the start of the TOC <div
let end = endNeedleIdx;
while (end > start && !s.startsWith('      <div', end)) {
  end -= 1;
}
// Verify we landed on the TOC wrapper
const before = s.slice(Math.max(0, end - 80), end);
console.log('end context before TOC div:', JSON.stringify(before));
console.log({ start, end });

const ciudadBlock = `{
            (() => {
              const ciudad = formData.ciudad_siniestro;
              if (!ciudad) return "_________";
              if (typeof ciudad === "object") {
                if (typeof ciudad.label === "string" && ciudad.label.trim()) {
                  return ciudad.label.split(" - ")[0].trim();
                }
                if (typeof ciudad.value === "string" && ciudad.value.trim()) {
                  return ciudad.value.trim();
                }
                return "_________";
              }
              if (typeof ciudad === "string" && ciudad.trim()) {
                return ciudad.split(" - ")[0].trim();
              }
              return "_________";
            })()
          }`;

const replacement = `      {/* Fotografía del Riesgo */}
      <div className="mb-6">
        <label 
          className="block text-xs sm:text-sm font-medium mb-2"
          style={{ color: textPrimary }}
        >
          {t('inspection.fields.riskPhoto')}
        </label>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <input
            id="inspeccion-foto-riesgo"
            type="file"
            accept="image/*"
            onChange={handleImagenChange}
            className="sr-only"
            disabled={cargando}
          />
          <label
            htmlFor="inspeccion-foto-riesgo"
            className="inline-flex cursor-pointer items-center rounded px-3 py-2 text-xs sm:text-sm font-medium"
            style={{
              backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E5E7EB',
              color: textPrimary,
              border: \`1px solid \${borderColor}\`,
              opacity: cargando ? 0.6 : 1,
              pointerEvents: cargando ? 'none' : 'auto',
            }}
          >
            {t('inspection.ui.formulario_inspeccion.chooseFile')}
          </label>
          <span className="text-xs sm:text-sm" style={{ color: textSecondary }}>
            {imagen?.name || t('inspection.ui.formulario_inspeccion.noFileSelected')}
          </span>
        </div>
        {preview && (
          <div className="mt and-2">
          <img
            src={preview}
            alt={t('inspection.alt.preview')}
            className="max-w-[400px] max-h-[250px] mx-auto rounded object-contain"
            style={{
              border: \`1px solid \${borderColor}\`
            }}
          />
            <p 
              className="text-sm text-center mt-1"
              style={{ color: textSecondary }}
            >
              {t('inspection.riskFacade')}
            </p>
          </div>
        )}
      </div>

      {/* Carta de presentación */}
      <div 
        className="p-4 rounded mb-6 text-sm leading-relaxed"
        style={{
          backgroundColor: theme === 'dark' ? '#1F1F1F' : '#F9FAFB',
          border: \`1px solid \${borderColor}\`,
          color: textPrimary
        }}
      >
        <p>
          {t('inspection.ui.formulario_inspeccion.city')} ${ciudadBlock}
        </p>
        <br />
        <p>{t('inspection.ui.formulario_inspeccion.dearGentlemen')}</p>
        <p><strong>{aseguradora}</strong></p>
        <p>
          {t('inspection.ui.formulario_inspeccion.city')} ${ciudadBlock}
        </p>
        <br />
        <p><strong>{t('inspection.ui.formulario_inspeccion.referenceInspectionReport')}</strong></p>
        <p>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{t('inspection.ui.formulario_inspeccion.insuredLabel')} {nombreCliente}<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{t('inspection.ui.formulario_inspeccion.inspectedPropertyLabel')} {direccion}<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{t('inspection.ui.formulario_inspeccion.inspectionDateLabel')}{" "}
          {formatearFechaInspeccion(fecha)}
        </p>
        
        <p className="mt-3">{t('inspection.ui.formulario_inspeccion.underwritingQuestion')}</p>
        <select
          value={puedeSuscribir}
          onChange={(e) => setPuedeSuscribir(e.target.value)}
          className="mt-1 w-full p-2 rounded"
          style={{
            backgroundColor: inputBg,
            color: textPrimary,
            border: \`1px solid \${borderColor}\`,
          }}
          disabled={cargando}
        >
          <option value="SI">{t('inspection.ui.formulario_inspeccion.canUnderwrite')}</option>
          <option value="NO">{t('inspection.ui.formulario_inspeccion.cannotUnderwrite')}</option>
        </select>

        <br />
        <p>{t('inspection.ui.formulario_inspeccion.dearSirs')}</p>
        <p>
          {t('inspection.ui.formulario_inspeccion.letterIntroduction')}
        </p>
        <p>
          {t('inspection.ui.formulario_inspeccion.letterAssessmentPrefix')}{' '}
          <strong>{textoSuscripcion}</strong>.{' '}
          {t('inspection.ui.formulario_inspeccion.letterAssessmentSuffix')}
        </p>
        <p>
          {t('inspection.ui.formulario_inspeccion.letterClosing')}
        </p>
        <br />
        <p>{t('inspection.ui.formulario_inspeccion.closing')}</p>
        <br />
        <p><strong>ARNALDO TAPIA GUTIERREZ</strong><br />{t('inspection.ui.formulario_inspeccion.manager')}</p>
      </div>



`;

// Fix typo mt and-2 -> mt-2
const fixed = replacement.replace('mt and-2', 'mt-2');

const out = s.slice(0, start) + fixed + s.slice(end);
fs.writeFileSync(path, out);
console.log('ok', { start, end, oldLen: end - start, newLen: fixed.length });
