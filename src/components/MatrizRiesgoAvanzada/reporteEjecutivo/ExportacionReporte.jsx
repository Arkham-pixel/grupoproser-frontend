import React, { useState } from 'react';
import { FaFileExcel, FaFilePdf, FaFileWord, FaGlobe, FaShieldAlt } from 'react-icons/fa';
import {
  exportarReporteExcel,
  exportarReporteHtml,
  exportarReportePdf,
  exportarReporteWord,
} from '../../../services/exportMatrizReporteService';
import './reporteEjecutivo.css';

const FORMATOS = [
  {
    id: 'html',
    titulo: 'HTML interactivo',
    descripcion:
      'Mismo informe general: dashboard, semáforo, gráficos ejecutivos, tablas y detalle técnico.',
    ideal: ['Presentaciones gerenciales', 'Análisis interactivo', 'Compartir por enlace/archivo'],
    icono: FaGlobe,
    accion: exportarReporteHtml,
    boton: 'Exportar HTML',
  },
  {
    id: 'pdf',
    titulo: 'PDF ejecutivo',
    descripcion: 'Optimizado para impresión y presentación a junta directiva.',
    ideal: ['Juntas directivas', 'Reportes oficiales', 'Distribución externa'],
    icono: FaFilePdf,
    accion: exportarReportePdf,
    boton: 'Exportar PDF',
  },
  {
    id: 'word',
    titulo: 'Word editable',
    descripcion: 'Documento editable para ajustes y comentarios internos.',
    ideal: ['Edición de contenido', 'Comentarios y ajustes', 'Documentación interna'],
    icono: FaFileWord,
    accion: exportarReporteWord,
    boton: 'Exportar Word',
  },
  {
    id: 'excel',
    titulo: 'Excel (base de datos)',
    descripcion: 'Base completa de riesgos, KPIs y recomendaciones.',
    ideal: ['Análisis avanzado', 'Tablas dinámicas', 'Integración con otros sistemas'],
    icono: FaFileExcel,
    accion: exportarReporteExcel,
    boton: 'Exportar Excel',
  },
];

export default function ExportacionReporte({ datosMatriz, tipoReporte, analitica, matrizId }) {
  const [exportando, setExportando] = useState(null);
  const [mensaje, setMensaje] = useState('');

  const ejecutarExport = async (formato) => {
    setExportando(formato.id);
    setMensaje('');
    try {
      const resultado = await formato.accion(datosMatriz, tipoReporte, { matrizId });
      setMensaje(resultado.mensaje || `Exportación ${formato.titulo} completada.`);
    } catch (error) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setExportando(null);
    }
  };

  const fechaGen = new Date().toLocaleString('es-ES');

  return (
    <div className="re-exportacion">
      <header className="re-seccion-header">
        <div>
          <p className="re-seccion-kicker">Matriz de Riesgos Avanzada</p>
          <h2 className="re-seccion-titulo">Exportación del reporte</h2>
          <p className="re-seccion-desc">
            Elija el formato que mejor se adapte a su análisis o presentación.
          </p>
        </div>
      </header>

      <div className="re-export-grid">
        {FORMATOS.map((formato) => {
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
                {exportando === formato.id ? 'Generando…' : formato.boton}
              </button>
            </article>
          );
        })}
      </div>

      <div className="re-export-info">
        <section>
          <h3>Información del reporte</h3>
          <ul>
            <li>Total de riesgos evaluados: {analitica.kpis.totalRiesgos}</li>
            <li>Procesos evaluados: {analitica.kpis.procesosEvaluados}</li>
            <li>Fecha de generación: {fechaGen}</li>
            <li>Versión del reporte: {datosMatriz.informacion?.version || '1.0'}</li>
          </ul>
        </section>
        <section className="re-export-seguridad">
          <FaShieldAlt />
          <p>
            Este reporte contiene información confidencial de la organización. Compártalo solo con
            personal autorizado.
          </p>
        </section>
      </div>

      {mensaje ? <p className="re-export-mensaje">{mensaje}</p> : null}
    </div>
  );
}
