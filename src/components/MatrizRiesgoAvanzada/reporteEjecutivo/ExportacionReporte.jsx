import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFileExcel, FaFilePdf, FaFileWord, FaGlobe, FaShieldAlt } from 'react-icons/fa';
import {
  exportarReporteExcel,
  exportarReporteHtml,
  exportarReportePdf,
  exportarReporteWord,
} from '../../../services/exportMatrizReporteService';
import './reporteEjecutivo.css';

export default function ExportacionReporte({ datosMatriz, tipoReporte, analitica, matrizId }) {
  const { t, i18n } = useTranslation();
  const [exportando, setExportando] = useState(null);
  const [mensaje, setMensaje] = useState('');

  const formatos = useMemo(
    () => [
      {
        id: 'html',
        titulo: t('riskMatrix.exec.fmtHtmlTitle'),
        descripcion: t('riskMatrix.exec.fmtHtmlDesc'),
        ideal: [
          t('riskMatrix.exec.fmtHtmlIdeal1'),
          t('riskMatrix.exec.fmtHtmlIdeal2'),
          t('riskMatrix.exec.fmtHtmlIdeal3'),
        ],
        icono: FaGlobe,
        accion: exportarReporteHtml,
        boton: t('riskMatrix.exec.fmtHtmlBtn'),
      },
      {
        id: 'pdf',
        titulo: t('riskMatrix.exec.fmtPdfTitle'),
        descripcion: t('riskMatrix.exec.fmtPdfDesc'),
        ideal: [
          t('riskMatrix.exec.fmtPdfIdeal1'),
          t('riskMatrix.exec.fmtPdfIdeal2'),
          t('riskMatrix.exec.fmtPdfIdeal3'),
        ],
        icono: FaFilePdf,
        accion: exportarReportePdf,
        boton: t('riskMatrix.exec.fmtPdfBtn'),
      },
      {
        id: 'word',
        titulo: t('riskMatrix.exec.fmtWordTitle'),
        descripcion: t('riskMatrix.exec.fmtWordDesc'),
        ideal: [
          t('riskMatrix.exec.fmtWordIdeal1'),
          t('riskMatrix.exec.fmtWordIdeal2'),
          t('riskMatrix.exec.fmtWordIdeal3'),
        ],
        icono: FaFileWord,
        accion: exportarReporteWord,
        boton: t('riskMatrix.exec.fmtWordBtn'),
      },
      {
        id: 'excel',
        titulo: t('riskMatrix.exec.fmtExcelTitle'),
        descripcion: t('riskMatrix.exec.fmtExcelDesc'),
        ideal: [
          t('riskMatrix.exec.fmtExcelIdeal1'),
          t('riskMatrix.exec.fmtExcelIdeal2'),
          t('riskMatrix.exec.fmtExcelIdeal3'),
        ],
        icono: FaFileExcel,
        accion: exportarReporteExcel,
        boton: t('riskMatrix.exec.fmtExcelBtn'),
      },
    ],
    [t]
  );

  const ejecutarExport = async (formato) => {
    setExportando(formato.id);
    setMensaje('');
    try {
      const resultado = await formato.accion(datosMatriz, tipoReporte, { matrizId });
      setMensaje(
        resultado.mensaje || t('riskMatrix.exec.exportDone', { format: formato.titulo })
      );
    } catch (error) {
      setMensaje(t('riskMatrix.exec.exportError', { error: error.message }));
    } finally {
      setExportando(null);
    }
  };

  const fechaGen = new Date().toLocaleString(i18n.language === 'en' ? 'en-US' : 'es-ES');

  return (
    <div className="re-exportacion">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">{t('riskMatrix.exec.kicker')}</p>
          <h2 className="re-seccion-titulo">{t('riskMatrix.exec.exportSectionTitle')}</h2>
          <p className="re-seccion-desc">{t('riskMatrix.exec.exportSectionDesc')}</p>
        </div>
      </header>

      <div className="re-export-grid">
        {formatos.map((formato) => {
          const Icono = formato.icono;
          return (
            <article key={formato.id} className="re-export-card">
              <Icono className="re-export-icono" />
              <h3>{formato.titulo}</h3>
              <p>{formato.descripcion}</p>
              <ul>
                {formato.ideal.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <button
                type="button"
                className="re-export-btn"
                onClick={() => ejecutarExport(formato)}
                disabled={Boolean(exportando)}
              >
                {exportando === formato.id ? t('riskMatrix.exec.generating') : formato.boton}
              </button>
            </article>
          );
        })}
      </div>

      <div className="re-export-info">
        <section>
          <h3>{t('riskMatrix.exec.exportInfo')}</h3>
          <ul>
            <li>{t('riskMatrix.exec.totalRisksEval', { count: analitica.kpis.totalRiesgos })}</li>
            <li>{t('riskMatrix.exec.processesEval', { count: analitica.kpis.procesosEvaluados })}</li>
            <li>{t('riskMatrix.exec.generatedDate', { date: fechaGen })}</li>
            <li>
              {t('riskMatrix.exec.reportVersion', {
                version: datosMatriz.informacion?.version || '1.0',
              })}
            </li>
          </ul>
        </section>
        <section className="re-export-seguridad">
          <FaShieldAlt />
          <p>{t('riskMatrix.exec.confidentialNotice')}</p>
        </section>
      </div>

      {mensaje ? <p className="re-export-mensaje">{mensaje}</p> : null}
    </div>
  );
}
