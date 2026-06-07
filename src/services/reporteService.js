// Servicio para generar reportes completos de la matriz de riesgos
export class ReporteService {
  
  // Generar reporte HTML completo
  static async generarReporteHTML(datosMatriz, tipoReporte = 'inicial') {
    try {
const fecha = new Date();
      const fechaFormateada = fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const horaFormateada = fecha.toLocaleTimeString('es-ES');
      
      // Crear el HTML del reporte
      const htmlReporte = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reporte de Matriz de Riesgos</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 1200px;
              margin: 0 auto;
              padding: 20px;
              background: #f8f9fa;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px;
              text-align: center;
              margin-bottom: 30px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            .header h1 {
              margin: 0;
              font-size: 2.5rem;
              font-weight: 700;
            }
            .header p {
              margin: 10px 0 0 0;
              font-size: 1.2rem;
              opacity: 0.9;
            }
            .section {
              background: white;
              margin: 20px 0;
              padding: 25px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              border-left: 5px solid #667eea;
            }
            .section h2 {
              color: #2c3e50;
              margin-top: 0;
              font-size: 1.8rem;
              border-bottom: 2px solid #e9ecef;
              padding-bottom: 10px;
            }
            .section h3 {
              color: #495057;
              margin-top: 25px;
              font-size: 1.4rem;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            .info-item {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #28a745;
            }
            .info-item strong {
              color: #2c3e50;
              display: block;
              margin-bottom: 5px;
            }
            .tabla-riesgos {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .tabla-riesgos th {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px;
              text-align: left;
              font-weight: 600;
            }
            .tabla-riesgos td {
              padding: 12px 15px;
              border-bottom: 1px solid #e9ecef;
            }
            .tabla-riesgos tr:nth-child(even) {
              background: #f8f9fa;
            }
            .tabla-riesgos tr:hover {
              background: #e3f2fd;
            }
            .nivel-riesgo {
              padding: 4px 8px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 0.9rem;
            }
            .nivel-bajo { background: #d4edda; color: #155724; }
            .nivel-medio { background: #fff3cd; color: #856404; }
            .nivel-alto { background: #f8d7da; color: #721c24; }
            .nivel-critico { background: #f5c6cb; color: #721c24; }
            .mapa-calor-info {
              background: #e3f2fd;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .leyenda {
              display: flex;
              flex-wrap: wrap;
              gap: 15px;
              margin: 15px 0;
            }
            .leyenda-item {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .color-box {
              width: 20px;
              height: 20px;
              border-radius: 4px;
            }
            
            /* Estilos para la matriz visual del mapa de calor */
            .heatmap-container {
              margin: 30px 0;
              text-align: center;
            }
            
            .heatmap-grid {
              display: inline-block;
              border: 2px solid #333;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            
            .heatmap-row {
              display: flex;
            }
            
            .heatmap-cell {
              width: 80px;
              height: 80px;
              border: 1px solid #fff;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              position: relative;
              color: white;
              font-weight: bold;
              transition: transform 0.2s ease;
            }
            
            .heatmap-cell:hover {
              transform: scale(1.05);
              z-index: 10;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            
            .cell-coordinates {
              font-size: 0.7rem;
              opacity: 0.8;
              position: absolute;
              top: 2px;
              left: 2px;
            }
            
            .cell-risks {
              display: flex;
              flex-wrap: wrap;
              gap: 2px;
              justify-content: center;
              align-items: center;
              flex: 1;
            }
            
            .risk-marker {
              background: rgba(255,255,255,0.9);
              color: #333;
              padding: 2px 4px;
              border-radius: 3px;
              font-size: 0.6rem;
              font-weight: bold;
              min-width: 12px;
              text-align: center;
              cursor: pointer;
            }
            
            .cell-classification {
              font-size: 0.8rem;
              font-weight: bold;
              position: absolute;
              bottom: 2px;
              right: 2px;
              background: rgba(0,0,0,0.3);
              padding: 1px 3px;
              border-radius: 2px;
            }
            
            .heatmap-stats {
              margin: 30px 0;
            }
            
            .heatmap-stats h3 {
              text-align: center;
              margin-bottom: 20px;
              color: #2c3e50;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
              color: #6c757d;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            .stat-card {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 20px;
              border-radius: 10px;
              text-align: center;
            }
            .stat-number {
              font-size: 2rem;
              font-weight: 700;
              display: block;
            }
            .stat-label {
              font-size: 0.9rem;
              opacity: 0.9;
            }
          </style>
          
          <!-- Estilos adicionales para el reporte de información -->
          <style>
            /* Estilos para la sección de información completa */
            .hero-section-report {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px;
              text-align: center;
              margin: 20px 0;
            }
            
            .hero-title-report {
              font-size: 2.5rem;
              font-weight: 700;
              margin: 0 0 10px 0;
            }
            
            .hero-subtitle-report {
              font-size: 1.2rem;
              margin: 0 0 20px 0;
              opacity: 0.9;
            }
            
            .hero-stats-report {
              display: flex;
              justify-content: center;
              gap: 30px;
              margin-top: 20px;
            }
            
            .stat-item-report {
              text-align: center;
            }
            
            .stat-number-report {
              display: block;
              font-size: 2rem;
              font-weight: 700;
            }
            
            .stat-label-report {
              font-size: 0.9rem;
              opacity: 0.9;
            }
            
            .info-form-section {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            
            .info-form-grid-report {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            
            .form-group-report {
              background: white;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #28a745;
            }
            
            .form-group-report.full-width {
              grid-column: 1 / -1;
            }
            
            .process-steps-section {
              margin: 30px 0;
            }
            
            .steps-grid-report {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            
            .step-card-report {
              background: white;
              padding: 25px;
              border-radius: 10px;
              text-align: center;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              border-left: 5px solid #667eea;
            }
            
            .step-icon-report {
              font-size: 3rem;
              margin-bottom: 15px;
            }
            
            .step-tip-report {
              background: #e3f2fd;
              padding: 10px;
              border-radius: 5px;
              margin-top: 15px;
              font-style: italic;
              color: #1976d2;
            }
            
            .benefits-section-report {
              margin: 30px 0;
            }
            
            .benefits-grid-report {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            
            .benefit-item-report {
              display: flex;
              align-items: flex-start;
              gap: 15px;
              background: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .benefit-icon-report {
              font-size: 2rem;
              flex-shrink: 0;
            }
            
            .benefit-content-report h4 {
              margin: 0 0 8px 0;
              color: #2c3e50;
            }
            
            .benefit-content-report p {
              margin: 0;
              color: #6c757d;
            }
            
            .process-detail-section {
              margin: 30px 0;
            }
            
            .process-timeline-report {
              margin: 20px 0;
            }
            
            .timeline-item-report {
              display: flex;
              gap: 20px;
              margin: 30px 0;
              padding: 20px;
              background: white;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .timeline-number-report {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 1.2rem;
              flex-shrink: 0;
            }
            
            .timeline-content-report {
              flex: 1;
            }
            
            .timeline-icon-report {
              font-size: 2rem;
              margin-bottom: 10px;
            }
            
            .timeline-tips-report {
              margin-top: 15px;
            }
            
            .tip-item-report {
              background: #f8f9fa;
              padding: 8px 12px;
              border-radius: 5px;
              margin: 5px 0;
              font-size: 0.9rem;
            }
            
            .categories-section-report {
              margin: 30px 0;
            }
            
            .categories-grid-report {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            
            .category-card-report {
              background: white;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              border-left: 5px solid #667eea;
            }
            
            .category-header-report {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 15px;
            }
            
            .category-icon-report {
              font-size: 2rem;
            }
            
            .category-header-report h4 {
              margin: 0;
              color: #2c3e50;
            }
            
            .category-examples-report {
              margin-top: 15px;
            }
            
            .example-tag-report {
              display: inline-block;
              background: #e3f2fd;
              color: #1976d2;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 0.8rem;
              margin: 2px;
            }
            
            /* Estilos para el menú de navegación */
            .info-tabs-report {
              display: flex;
              background: #f8f9fa;
              border-radius: 10px;
              padding: 5px;
              margin: 20px 0;
              overflow-x: auto;
            }
            
            .tab-button-report {
              flex: 1;
              padding: 12px 20px;
              border: none;
              background: transparent;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
              transition: all 0.3s ease;
              white-space: nowrap;
              min-width: 120px;
            }
            
            .tab-button-report:hover {
              background: #e9ecef;
            }
            
            .tab-button-report.active {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            }
            
            .tab-content-report {
              margin: 20px 0;
            }
            
            .tab-panel-report {
              display: none;
            }
            
            .tab-panel-report.active {
              display: block;
            }
            
            .welcome-card-report {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 15px;
              text-align: center;
              margin: 20px 0;
            }
            
            .welcome-card-report h2 {
              font-size: 2rem;
              margin: 0 0 15px 0;
            }
            
            .info-form-card-report {
              background: #f8f9fa;
              padding: 25px;
              border-radius: 10px;
              margin: 20px 0;
            }
            
            .info-form-grid-report {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            
            .form-group-report {
              background: white;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #28a745;
            }
            
            .form-group-report.full-width {
              grid-column: 1 / -1;
            }
            
            .form-group-report label {
              font-weight: 600;
              color: #2c3e50;
              display: block;
              margin-bottom: 8px;
            }
            
            .quick-start-grid-report {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
              margin: 30px 0;
            }
            
            .quick-card-report {
              background: white;
              padding: 25px;
              border-radius: 15px;
              text-align: center;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
              border-left: 5px solid #667eea;
              transition: transform 0.3s ease;
            }
            
            .quick-card-report:hover {
              transform: translateY(-5px);
            }
            
            .quick-icon-report {
              font-size: 3rem;
              margin-bottom: 15px;
            }
            
            .quick-tip-report {
              background: #e3f2fd;
              padding: 10px;
              border-radius: 8px;
              margin-top: 15px;
              font-style: italic;
              color: #1976d2;
            }
            
            .benefits-grid-report {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 20px;
              margin: 30px 0;
            }
            
            .benefit-card-report {
              display: flex;
              align-items: flex-start;
              gap: 15px;
              background: white;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .benefit-icon-report {
              font-size: 2rem;
              flex-shrink: 0;
            }
            
            .benefit-content-report h4 {
              margin: 0 0 8px 0;
              color: #2c3e50;
            }
            
            .benefit-content-report p {
              margin: 0;
              color: #6c757d;
            }
            
            .process-intro-report {
              text-align: center;
              margin: 30px 0;
            }
            
            .process-intro-report h2 {
              font-size: 2.5rem;
              margin: 0 0 10px 0;
              color: #2c3e50;
            }
            
            .process-intro-report p {
              font-size: 1.2rem;
              color: #6c757d;
            }
            
            .categories-intro-report {
              text-align: center;
              margin: 30px 0;
            }
            
            .categories-intro-report h2 {
              font-size: 2.5rem;
              margin: 0 0 10px 0;
              color: #2c3e50;
            }
            
            .categories-intro-report p {
              font-size: 1.2rem;
              color: #6c757d;
            }
            
            .criteria-intro-report {
              text-align: center;
              margin: 30px 0;
            }
            
            .criteria-intro-report h2 {
              font-size: 2.5rem;
              margin: 0 0 10px 0;
              color: #2c3e50;
            }
            
            .criteria-intro-report p {
              font-size: 1.2rem;
              color: #6c757d;
            }
            
            .criteria-section-report {
              margin: 30px 0;
            }
            
            .criteria-section-report h3 {
              font-size: 1.8rem;
              margin: 0 0 20px 0;
              color: #2c3e50;
            }
            
            .criteria-grid-report {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 15px;
              margin: 20px 0;
            }
            
            .criteria-item-report {
              background: white;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              border-left: 4px solid #667eea;
            }
            
            .criteria-level-report {
              font-weight: 600;
              color: #667eea;
              display: block;
              margin-bottom: 8px;
            }
            
            .heatmap-intro-report {
              text-align: center;
              margin: 30px 0;
            }
            
            .heatmap-intro-report h2 {
              font-size: 2.5rem;
              margin: 0 0 10px 0;
              color: #2c3e50;
            }
            
            .heatmap-intro-report p {
              font-size: 1.2rem;
              color: #6c757d;
            }
            
            .heatmap-legend-report {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
              margin: 30px 0;
            }
            
            .legend-item-report {
              display: flex;
              align-items: center;
              gap: 15px;
              background: white;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .legend-color-report {
              width: 30px;
              height: 30px;
              border-radius: 50%;
              flex-shrink: 0;
            }
            
            .legend-item-report.red .legend-color-report {
              background: #dc3545;
            }
            
            .legend-item-report.yellow .legend-color-report {
              background: #ffc107;
            }
            
            .legend-item-report.green .legend-color-report {
              background: #28a745;
            }
            
            .legend-content-report h4 {
              margin: 0 0 5px 0;
              color: #2c3e50;
            }
            
            .legend-content-report p {
              margin: 0;
              color: #6c757d;
            }
            
            /* Estilos para criterios detallados */
            .prob-cards-report {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            
            .prob-card-report {
              background: white;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              border-left: 5px solid #667eea;
            }
            
            .prob-header-report {
              display: flex;
              align-items: center;
              gap: 15px;
              margin-bottom: 15px;
            }
            
            .prob-number-report {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 1.1rem;
            }
            
            .prob-header-report h4 {
              margin: 0;
              color: #2c3e50;
            }
            
            .prob-details-report {
              display: flex;
              flex-direction: column;
              gap: 10px;
              margin-bottom: 15px;
            }
            
            .prob-metric-report {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 0.9rem;
              color: #6c757d;
            }
            
            .metric-icon-report {
              font-size: 1.2rem;
            }
            
            .prob-description-report {
              font-style: italic;
              color: #667eea;
              margin: 0;
            }
            
            .impact-cards-report {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            
            .impact-card-report {
              background: white;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              border-left: 5px solid #667eea;
            }
            
            .impact-header-report {
              display: flex;
              align-items: center;
              gap: 15px;
              margin-bottom: 15px;
            }
            
            .impact-number-report {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 1.1rem;
            }
            
            .impact-header-report h4 {
              margin: 0;
              color: #2c3e50;
            }
            
            .impact-areas-report {
              margin-bottom: 15px;
            }
            
            .area-item-report {
              background: #f8f9fa;
              padding: 8px 12px;
              border-radius: 5px;
              margin: 5px 0;
              font-size: 0.9rem;
              border-left: 3px solid #28a745;
            }
            
            .impact-description-report {
              font-style: italic;
              color: #667eea;
              margin: 0;
            }
            
            .tips-section-report {
              margin: 30px 0;
            }
            
            .tips-section-report h3 {
              font-size: 1.8rem;
              margin: 0 0 20px 0;
              color: #2c3e50;
            }
            
            .tips-grid-report {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            
            .tip-card-report {
              background: white;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              text-align: center;
              border-left: 5px solid #667eea;
            }
            
            .tip-icon-report {
              font-size: 2.5rem;
              margin-bottom: 15px;
              display: block;
            }
            
            .tip-card-report h4 {
              margin: 0 0 10px 0;
              color: #2c3e50;
            }
            
            .tip-card-report p {
              margin: 0;
              color: #6c757d;
              font-size: 0.9rem;
            }
            
            /* Estilos para mapa de calor */
            .heatmap-explanation-report {
              background: #e3f2fd;
              padding: 20px;
              border-radius: 10px;
              margin: 20px 0;
            }
            
            .heatmap-explanation-report h3 {
              margin: 0 0 15px 0;
              color: #2c3e50;
            }
            
            .explanation-text-report {
              margin: 0;
              font-size: 1.1rem;
              line-height: 1.6;
            }
            
            .heatmap-title-report {
              text-align: center;
              margin: 20px 0;
            }
            
            .heatmap-title-report p {
              font-size: 1.2rem;
              color: #6c757d;
              margin: 0;
            }
            
            .heatmap-container-report {
              display: flex;
              justify-content: center;
              margin: 30px 0;
            }
            
            .heatmap-matrix-report {
              position: relative;
              display: inline-block;
            }
            
            .matrix-label-probability-report {
              position: absolute;
              left: -80px;
              top: 50%;
              transform: translateY(-50%) rotate(-90deg);
              font-weight: 700;
              color: #2c3e50;
              font-size: 1.1rem;
            }
            
            .matrix-header-impact-report {
              position: absolute;
              top: -40px;
              left: 50%;
              transform: translateX(-50%);
              font-weight: 700;
              color: #2c3e50;
              font-size: 1.1rem;
            }
            
            .matrix-grid-report {
              display: grid;
              grid-template-columns: repeat(6, 60px);
              gap: 2px;
              margin: 20px 0;
            }
            
            .matrix-row-report {
              display: contents;
            }
            
            .matrix-label-report {
              display: flex;
              align-items: center;
              justify-content: center;
              background: #f8f9fa;
              border: 2px solid #dee2e6;
              font-weight: 700;
              color: #2c3e50;
            }
            
            .matrix-cell-report {
              width: 60px;
              height: 60px;
              border: 2px solid #dee2e6;
            }
            
            .green-risk-report {
              background: #28a745;
            }
            
            .yellow-risk-report {
              background: #ffc107;
            }
            
            .orange-risk-report {
              background: #fd7e14;
            }
            
            .red-risk-report {
              background: #dc3545;
            }
            
            .impact-labels-report {
              display: grid;
              grid-template-columns: repeat(5, 60px);
              gap: 2px;
              margin-left: 60px;
            }
            
            .impact-label-report {
              display: flex;
              align-items: center;
              justify-content: center;
              background: #f8f9fa;
              border: 2px solid #dee2e6;
              font-weight: 700;
              color: #2c3e50;
              height: 30px;
            }
            
            .legend-grid-report {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 20px;
              margin: 20px 0;
            }
            
            .legend-item-report.orange .legend-color-report {
              background: #fd7e14;
            }
            
            .heatmap-benefits-report {
              margin: 30px 0;
            }
            
            .heatmap-benefits-report h3 {
              font-size: 1.8rem;
              margin: 0 0 20px 0;
              color: #2c3e50;
            }
            
            /* Estilos para identificación completa */
            .section-description-report {
              font-size: 1.1rem;
              color: #6c757d;
              margin-bottom: 20px;
            }
            
            .sin-riesgos-report {
              text-align: center;
              padding: 40px;
              background: #f8f9fa;
              border-radius: 10px;
              margin: 20px 0;
            }
            
            .sin-riesgos-icono-report {
              font-size: 4rem;
              margin-bottom: 20px;
            }
            
            .sin-riesgos-report h5 {
              margin: 0 0 10px 0;
              color: #2c3e50;
            }
            
            .sin-riesgos-report p {
              margin: 0;
              color: #6c757d;
            }
            
            .identificacion-content-report {
              margin: 20px 0;
            }
            
            .seccion-titulo-report {
              display: flex;
              align-items: center;
              gap: 10px;
              margin: 0 0 20px 0;
              color: #2c3e50;
              font-size: 1.5rem;
            }
            
            .icono-report {
              font-size: 1.5rem;
            }
            
            .tabla-container-report {
              overflow-x: auto;
              margin: 20px 0;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .tabla-identificacion-report {
              width: 100%;
              border-collapse: collapse;
              background: white;
              min-width: 800px;
            }
            
            .tabla-identificacion-report th {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 12px 8px;
              text-align: left;
              font-weight: 600;
              font-size: 0.9rem;
              border: 1px solid #dee2e6;
            }
            
            .tabla-identificacion-report td {
              padding: 10px 8px;
              border: 1px solid #dee2e6;
              font-size: 0.9rem;
            }
            
            .tabla-identificacion-report tr:nth-child(even) {
              background: #f8f9fa;
            }
            
            .tabla-identificacion-report tr:hover {
              background: #e3f2fd;
            }
            
            .col-numero-report {
              width: 60px;
              text-align: center;
              font-weight: 600;
            }
            
            .col-proceso-report {
              width: 200px;
              min-width: 200px;
            }
            
            .col-tipo-report {
              width: 150px;
              min-width: 150px;
            }
            
            .col-riesgo-report {
              width: 300px;
              min-width: 300px;
            }
            
            .col-categorias-report {
              width: 80px;
              text-align: center;
            }
            
            .col-adicional-report {
              width: 120px;
              min-width: 120px;
            }
            
            .text-center-report {
              text-align: center;
            }
            
            .fila-riesgo-report {
              transition: background-color 0.2s ease;
            }
            
            .resumen-riesgos-report {
              margin: 30px 0;
              background: #f8f9fa;
              padding: 20px;
              border-radius: 10px;
            }
            
            .resumen-riesgos-report h4 {
              margin: 0 0 20px 0;
              color: #2c3e50;
            }
            
            .categorias-resumen-report {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 15px;
            }
            
            .categoria-item-report {
              display: flex;
              align-items: center;
              gap: 10px;
              background: white;
              padding: 15px;
              border-radius: 8px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            
            .categoria-icono-report {
              font-size: 1.5rem;
            }
            
            .categoria-nombre-report {
              flex: 1;
              font-weight: 500;
              color: #2c3e50;
            }
            
            .categoria-count-report {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 5px 10px;
              border-radius: 15px;
              font-weight: 600;
              font-size: 0.9rem;
            }
            
            .tipos-proceso-report {
              margin: 30px 0;
              background: #e3f2fd;
              padding: 20px;
              border-radius: 10px;
            }
            
            .tipos-proceso-report h4 {
              margin: 0 0 20px 0;
              color: #2c3e50;
            }
            
            .tipos-grid-report {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 15px;
            }
            
            .tipo-item-report {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: white;
              padding: 15px;
              border-radius: 8px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            
            .tipo-nombre-report {
              font-weight: 500;
              color: #2c3e50;
            }
            
            .tipo-count-report {
              background: #28a745;
              color: white;
              padding: 5px 10px;
              border-radius: 15px;
              font-weight: 600;
              font-size: 0.9rem;
            }
            
            /* Estilos para valoración completa */
            .sin-valoraciones-report {
              text-align: center;
              padding: 40px;
              background: #f8f9fa;
              border-radius: 10px;
              margin: 20px 0;
            }
            
            .sin-valoraciones-icono-report {
              font-size: 4rem;
              margin-bottom: 20px;
            }
            
            .sin-valoraciones-report h5 {
              margin: 0 0 10px 0;
              color: #2c3e50;
            }
            
            .sin-valoraciones-report p {
              margin: 0;
              color: #6c757d;
            }
            
            .valoracion-content-report {
              margin: 20px 0;
            }
            
            .tabla-valoracion-report {
              width: 100%;
              border-collapse: collapse;
              background: white;
              min-width: 2000px;
              font-size: 0.8rem;
            }
            
            .tabla-valoracion-report th {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 8px 4px;
              text-align: center;
              font-weight: 600;
              font-size: 0.7rem;
              border: 1px solid #dee2e6;
              white-space: nowrap;
            }
            
            .tabla-valoracion-report td {
              padding: 6px 4px;
              border: 1px solid #dee2e6;
              font-size: 0.75rem;
              text-align: center;
              vertical-align: top;
            }
            
            .tabla-valoracion-report tr:nth-child(even) {
              background: #f8f9fa;
            }
            
            .tabla-valoracion-report tr:hover {
              background: #e3f2fd;
            }
            
            .col-numero-report {
              width: 40px;
              font-weight: 600;
            }
            
            .col-riesgo-report {
              width: 200px;
              min-width: 200px;
              text-align: left;
            }
            
            .col-proceso-report {
              width: 150px;
              min-width: 150px;
              text-align: left;
            }
            
            .col-causas-report {
              width: 150px;
              min-width: 150px;
              text-align: left;
            }
            
            .col-probabilidad-report {
              width: 100px;
              font-weight: 600;
            }
            
            .col-impacto-header-report {
              background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            }
            
            .col-imp-cat-report {
              width: 60px;
              font-weight: 600;
            }
            
            .col-sum-impacto-report {
              width: 80px;
              font-weight: 600;
            }
            
            .col-calificacion-report {
              width: 80px;
              font-weight: 600;
            }
            
            .col-controles-report {
              width: 100px;
            }
            
            .col-controles-desc-report {
              width: 150px;
              text-align: left;
            }
            
            .col-efectividad-header-report {
              background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
            }
            
            .col-efectividad-sub-report {
              width: 80px;
              font-size: 0.7rem;
            }
            
            .col-efectividad-val-report {
              width: 50px;
              font-weight: 600;
            }
            
            .col-prob-residual-report {
              width: 80px;
              font-weight: 600;
            }
            
            .col-impacto-residual-header-report {
              background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
            }
            
            .col-sum-residual-report {
              width: 80px;
              font-weight: 600;
            }
            
            .col-valoracion-cuantitativa-report {
              width: 100px;
              font-weight: 600;
            }
            
            .col-nivel-residual-report {
              width: 100px;
              font-weight: 600;
            }
            
            .col-tratamiento-report {
              width: 150px;
              text-align: left;
            }
            
            .fila-valoracion-report {
              transition: background-color 0.2s ease;
            }
            
            .resumen-valoracion-report {
              margin: 30px 0;
              background: #f8f9fa;
              padding: 20px;
              border-radius: 10px;
            }
            
            .resumen-valoracion-report h4 {
              margin: 0 0 20px 0;
              color: #2c3e50;
            }
            
            .resumen-grid-report {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 15px;
            }
            
            .resumen-item-report {
              display: flex;
              align-items: center;
              gap: 15px;
              background: white;
              padding: 20px;
              border-radius: 10px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .resumen-icono-report {
              font-size: 2rem;
            }
            
            .resumen-content-report h5 {
              margin: 0 0 5px 0;
              color: #2c3e50;
              font-size: 0.9rem;
            }
            
            .resumen-numero-report {
              font-size: 1.8rem;
              font-weight: 700;
              margin: 0;
              color: #667eea;
            }
            
            /* Estilos para auto-selección en reporte */
            .auto-seleccion-info-report {
              background: #f8f9fa;
              border: 2px solid #e3f2fd;
              border-radius: 10px;
              padding: 20px;
              margin: 20px 0;
            }
            
            .auto-seleccion-info-report h4 {
              color: #2c3e50;
              margin: 0 0 15px 0;
              font-size: 1.3rem;
            }
            
            .auto-seleccion-ejemplos-report {
              margin: 20px 0;
            }
            
            .ejemplo-item-report {
              display: flex;
              align-items: center;
              gap: 10px;
              margin: 10px 0;
              padding: 10px;
              background: white;
              border-radius: 8px;
              border-left: 4px solid #667eea;
            }
            
            .ejemplo-input-report {
              font-weight: 600;
              color: #495057;
            }
            
            .ejemplo-codigo-report {
              background: #e9ecef;
              padding: 4px 8px;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
              font-size: 0.9rem;
              color: #dc3545;
            }
            
            .ejemplo-flecha-report {
              font-size: 1.2rem;
              color: #667eea;
              font-weight: bold;
            }
            
            .ejemplo-resultado-report {
              color: #28a745;
              font-weight: 600;
            }
            
            .auto-seleccion-caracteristicas-report {
              margin: 20px 0;
            }
            
            .auto-seleccion-caracteristicas-report h5 {
              color: #2c3e50;
              margin: 0 0 10px 0;
            }
            
            .auto-seleccion-caracteristicas-report ul {
              margin: 0;
              padding-left: 20px;
            }
            
            .auto-seleccion-caracteristicas-report li {
              margin: 8px 0;
              color: #495057;
            }
          </style>
          
          <!-- JavaScript para funcionalidad de pestañas -->
          <script>
            function showTab(tabName) {
              // Ocultar todas las pestañas
              const tabs = document.querySelectorAll('.tab-panel-report');
              tabs.forEach(tab => tab.classList.remove('active'));
              
              // Remover clase active de todos los botones
              const buttons = document.querySelectorAll('.tab-button-report');
              buttons.forEach(button => button.classList.remove('active'));
              
              // Mostrar la pestaña seleccionada
              const selectedTab = document.getElementById(tabName + '-tab');
              if (selectedTab) {
                selectedTab.classList.add('active');
              }
              
              // Activar el botón correspondiente
              const selectedButton = document.querySelector('[onclick*="' + tabName + '"]');
              if (selectedButton) {
                selectedButton.classList.add('active');
              }
            }
          </script>
        </head>
        <body>
          <div class="header">
            <h1>🎯 Reporte de Matriz de Riesgos</h1>
            <p>El corazón digital de Grupo Proser</p>
            <p><strong>Generado el:</strong> ${fechaFormateada} a las ${horaFormateada}</p>
          </div>

          ${this.generarSeccionInformacion(datosMatriz.informacion)}
          ${this.generarSeccionIdentificacion(datosMatriz.identificacion)}
          ${this.generarSeccionValoracion(datosMatriz.valoracion, tipoReporte)}
          ${this.generarSeccionMapaCalor(datosMatriz.mapaCalor, datosMatriz.valoracion, datosMatriz, tipoReporte)}
          ${this.generarSeccionGestionRiesgos(datosMatriz.gestionRiesgos)}

          <div class="footer">
            <p><strong>Reporte generado automáticamente por El corazón digital de Grupo Proser</strong></p>
            <p>Este documento contiene información confidencial y debe ser tratado con la debida confidencialidad.</p>
          </div>
        </body>
        </html>
      `;
      
      return htmlReporte;
    } catch (error) {
      console.error('Error generando reporte HTML:', error);
      throw error;
    }
  }

    // Generar sección de información completa con menú de navegación
  static generarSeccionInformacion(informacion) {
return `
      <div class="section">
        <h2>📋 Información General y Tutorial</h2>
        
        <!-- Navigation Tabs -->
        <div class="info-tabs-report">
          <button class="tab-button-report active" onclick="showTab('intro')">
            🚀 Inicio Rápido
          </button>
          <button class="tab-button-report" onclick="showTab('process')">
            🔄 Proceso
          </button>
          <button class="tab-button-report" onclick="showTab('categories')">
            📋 Categorías
          </button>
          <button class="tab-button-report" onclick="showTab('criteria')">
            📊 Criterios
          </button>
          <button class="tab-button-report" onclick="showTab('heatmap')">
            🔥 Mapa de Calor
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content-report">
          <!-- Inicio Rápido Tab -->
          <div id="intro-tab" class="tab-panel-report active">
            <div class="welcome-card-report">
              <h2>🎉 ¡Bienvenido a El corazón digital de Grupo Proser!</h2>
              <p>¿Sabías que el <strong>90%</strong> de las empresas que gestionan riesgos correctamente sobreviven a las crisis?</p>
            </div>

            <!-- Formulario de Información General -->
            <div class="info-form-card-report">
              <h3>📋 Información General de la Matriz</h3>
              <div class="info-form-grid-report">
                ${informacion.nombreEmpresa ? `
                  <div class="form-group-report">
                    <label>Nombre de la Empresa</label>
                    <p>${informacion.nombreEmpresa}</p>
                  </div>
                ` : ''}
                ${informacion.responsable ? `
                  <div class="form-group-report">
                    <label>Responsable</label>
                    <p>${informacion.responsable}</p>
                  </div>
                ` : ''}
                ${informacion.version ? `
                  <div class="form-group-report">
                    <label>Versión</label>
                    <p>${informacion.version}</p>
                  </div>
                ` : ''}
                ${informacion.fechaCreacion ? `
                  <div class="form-group-report">
                    <label>Fecha de Creación</label>
                    <p>${informacion.fechaCreacion}</p>
                  </div>
                ` : ''}
              </div>
              ${informacion.descripcion ? `
                <div class="form-group-report full-width">
                  <label>Descripción</label>
                  <p>${informacion.descripcion}</p>
                </div>
              ` : ''}
            </div>

            <!-- Información del Ingeniero -->
            ${informacion.ingeniero && (informacion.ingeniero.nombre || informacion.ingeniero.cargo || informacion.ingeniero.telefono || informacion.ingeniero.email || informacion.ingeniero.empresa || informacion.ingeniero.direccion) ? `
            <div class="info-form-card-report">
              <h3>👨‍💼 Información del Ingeniero que Recibe la Visita</h3>
              <div class="info-form-grid-report">
                ${informacion.ingeniero.nombre ? `
                  <div class="form-group-report">
                    <label>Nombre Completo</label>
                    <p>${informacion.ingeniero.nombre}</p>
                  </div>
                ` : ''}
                ${informacion.ingeniero.cargo ? `
                  <div class="form-group-report">
                    <label>Cargo</label>
                    <p>${informacion.ingeniero.cargo}</p>
                  </div>
                ` : ''}
                ${informacion.ingeniero.telefono ? `
                  <div class="form-group-report">
                    <label>Teléfono</label>
                    <p>${informacion.ingeniero.telefono}</p>
                  </div>
                ` : ''}
                ${informacion.ingeniero.email ? `
                  <div class="form-group-report">
                    <label>Email</label>
                    <p>${informacion.ingeniero.email}</p>
                  </div>
                ` : ''}
                ${informacion.ingeniero.empresa ? `
                  <div class="form-group-report">
                    <label>Empresa</label>
                    <p>${informacion.ingeniero.empresa}</p>
                  </div>
                ` : ''}
                ${informacion.ingeniero.direccion ? `
                  <div class="form-group-report full-width">
                    <label>Dirección</label>
                    <p>${informacion.ingeniero.direccion}</p>
                  </div>
                ` : ''}
              </div>
            </div>
            ` : ''}

            <div class="quick-start-grid-report">
              <div class="quick-card-report">
                <div class="quick-icon-report">🔍</div>
                <h3>1. Identifica</h3>
                <p>Encuentra todos los riesgos ocultos en tu organización</p>
                <div class="quick-tip-report">¡Es como buscar tesoros!</div>
              </div>
              <div class="quick-card-report">
                <div class="quick-icon-report">📊</div>
                <h3>2. Evalúa</h3>
                <p>Mide qué tan peligrosos son realmente</p>
                <div class="quick-tip-report">¡Como medir el peligro!</div>
              </div>
              <div class="quick-card-report">
                <div class="quick-icon-report">🔥</div>
                <h3>3. Visualiza</h3>
                <p>Ve todo en un mapa de calor súper claro</p>
                <div class="quick-tip-report">¡Como un mapa del tesoro!</div>
              </div>
            </div>

            <div class="benefits-grid-report">
              <div class="benefit-card-report">
                <span class="benefit-icon-report">⚡</span>
                <div class="benefit-content-report">
                  <h4>Súper Rápido</h4>
                  <p>En 30 minutos tienes tu análisis completo</p>
                </div>
              </div>
              <div class="benefit-card-report">
                <span class="benefit-icon-report">🎯</span>
                <div class="benefit-content-report">
                  <h4>Precisión Total</h4>
                  <p>Criterios profesionales validados</p>
                </div>
              </div>
              <div class="benefit-card-report">
                <span class="benefit-icon-report">📈</span>
                <div class="benefit-content-report">
                  <h4>Resultados Claros</h4>
                  <p>Visualizaciones que cualquiera entiende</p>
                </div>
              </div>
              <div class="benefit-card-report">
                <span class="benefit-icon-report">🛡️</span>
                <div class="benefit-content-report">
                  <h4>Protección Real</h4>
                  <p>Previene problemas antes de que ocurran</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Proceso Tab -->
          <div id="process-tab" class="tab-panel-report">
            <div class="process-intro-report">
              <h2>🔄 El Proceso Paso a Paso</h2>
              <p>Te guiamos como si fueras nuestro mejor amigo</p>
            </div>

            <div class="process-timeline-report">
              <div class="timeline-item-report">
                <div class="timeline-number-report">1</div>
                <div class="timeline-content-report">
                  <div class="timeline-icon-report">🔍</div>
                  <h3>Identificación de Riesgos</h3>
                  <p>Es como hacer una lista de compras, pero de problemas potenciales. ¡No te preocupes, te ayudamos con todo!</p>
                  
                  <div class="auto-seleccion-info-report">
                    <h4>🤖 Auto-selección Inteligente</h4>
                    <p>Nuestro sistema incluye una funcionalidad de <strong>auto-selección</strong> que funciona como la fórmula BUSCARV de Excel:</p>
                    
                    <div class="auto-seleccion-ejemplos-report">
                      <div class="ejemplo-item-report">
                        <span class="ejemplo-input-report">Escribes:</span>
                        <code class="ejemplo-codigo-report">"Gerencia"</code>
                        <span class="ejemplo-flecha-report">→</span>
                        <span class="ejemplo-resultado-report">Se selecciona automáticamente "Estratégico"</span>
                      </div>
                      
                      <div class="ejemplo-item-report">
                        <span class="ejemplo-input-report">Escribes:</span>
                        <code class="ejemplo-codigo-report">"SST"</code>
                        <span class="ejemplo-flecha-report">→</span>
                        <span class="ejemplo-resultado-report">Se selecciona automáticamente "Apoyo"</span>
                      </div>
                      
                      <div class="ejemplo-item-report">
                        <span class="ejemplo-input-report">Escribes:</span>
                        <code class="ejemplo-codigo-report">"Producción"</code>
                        <span class="ejemplo-flecha-report">→</span>
                        <span class="ejemplo-resultado-report">Se selecciona automáticamente "Misionales"</span>
                      </div>
                    </div>
                    
                    <div class="auto-seleccion-caracteristicas-report">
                      <h5>✨ Características de la Auto-selección:</h5>
                      <ul>
                        <li><strong>Búsqueda flexible:</strong> Funciona con o sin tildes (almacén/almacen)</li>
                        <li><strong>Mayúsculas/minúsculas:</strong> No importa cómo escribas (GERENCIA/gerencia)</li>
                        <li><strong>Indicadores visuales:</strong> Fondo verde cuando se encuentra automáticamente</li>
                        <li><strong>Edición manual:</strong> Puedes cambiar el tipo si es necesario</li>
                        <li><strong>23 procesos predefinidos:</strong> Incluye todos los procesos organizacionales</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="timeline-tips-report">
                    <div class="tip-item-report">💡 <span>Piensa en todo lo que puede salir mal</span></div>
                    <div class="tip-item-report">📝 <span>Anota todo, no importa si parece pequeño</span></div>
                    <div class="tip-item-report">👥 <span>Pregunta a tu equipo, ellos saben cosas</span></div>
                    <div class="tip-item-report">🤖 <span>Usa la auto-selección para ahorrar tiempo</span></div>
                  </div>
                </div>
              </div>

              <div class="timeline-item-report">
                <div class="timeline-number-report">2</div>
                <div class="timeline-content-report">
                  <div class="timeline-icon-report">📊</div>
                  <h3>Valoración y Análisis</h3>
                  <p>Aquí es donde medimos qué tan peligroso es cada riesgo. ¡Es como calificar películas, pero de riesgos!</p>
                  <div class="timeline-tips-report">
                    <div class="tip-item-report">📈 <span>Probabilidad: ¿Qué tan probable es que pase?</span></div>
                    <div class="tip-item-report">💥 <span>Impacto: ¿Qué tan grave sería si pasa?</span></div>
                    <div class="tip-item-report">🎯 <span>Usa los criterios que te damos</span></div>
                  </div>
                </div>
              </div>

              <div class="timeline-item-report">
                <div class="timeline-number-report">3</div>
                <div class="timeline-content-report">
                  <div class="timeline-icon-report">🔥</div>
                  <h3>Mapa de Calor</h3>
                  <p>¡El momento mágico! Aquí ves todo en colores súper claros. Los rojos son peligrosos, los verdes están bien.</p>
                  <div class="timeline-tips-report">
                    <div class="tip-item-report">🔴 <span>Rojos = ¡Cuidado! Haz algo ya</span></div>
                    <div class="tip-item-report">🟡 <span>Amarillos = Vigílalos de cerca</span></div>
                    <div class="tip-item-report">🟢 <span>Verdes = Todo bien por ahora</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Categorías Tab -->
          <div id="categories-tab" class="tab-panel-report">
            <div class="categories-intro-report">
              <h2>📋 Las 8 Categorías de Riesgo</h2>
              <p>Cada riesgo tiene su familia. ¡Conócelas todas!</p>
            </div>

            <div class="categories-grid-report">
              <div class="category-card-report estrategico">
                <div class="category-header-report">
                  <span class="category-icon-report">🎯</span>
                  <h3>Estratégico</h3>
                </div>
                <p>Los riesgos de las decisiones importantes. Como cuando cambias de trabajo o lanzas un producto nuevo.</p>
                <div class="category-examples-report">
                  <span class="example-tag-report">Decisiones malas</span>
                  <span class="example-tag-report">Cambios de mercado</span>
                  <span class="example-tag-report">Competencia</span>
                </div>
              </div>

              <div class="category-card-report cumplimiento">
                <div class="category-header-report">
                  <span class="category-icon-report">⚖️</span>
                  <h3>Cumplimiento</h3>
                </div>
                <p>Los riesgos de no seguir las reglas. Como cuando no pagas impuestos o no cumples contratos.</p>
                <div class="category-examples-report">
                  <span class="example-tag-report">Multas</span>
                  <span class="example-tag-report">Regulaciones</span>
                  <span class="example-tag-report">Contratos</span>
                </div>
              </div>

              <div class="category-card-report operativo">
                <div class="category-header-report">
                  <span class="category-icon-report">🏢</span>
                  <h3>Operativo</h3>
                </div>
                <p>Los riesgos del día a día. Como cuando se rompe una máquina o falta personal.</p>
                <div class="category-examples-report">
                  <span class="example-tag-report">Equipos rotos</span>
                  <span class="example-tag-report">Falta personal</span>
                  <span class="example-tag-report">Procesos</span>
                </div>
              </div>

              <div class="category-card-report reputacional">
                <div class="category-header-report">
                  <span class="category-icon-report">📢</span>
                  <h3>Reputacional</h3>
                </div>
                <p>Los riesgos de la imagen. Como cuando sale algo malo en las redes sociales.</p>
                <div class="category-examples-report">
                  <span class="example-tag-report">Redes sociales</span>
                  <span class="example-tag-report">Medios</span>
                  <span class="example-tag-report">Imagen</span>
                </div>
              </div>

              <div class="category-card-report tecnologico">
                <div class="category-header-report">
                  <span class="category-icon-report">💻</span>
                  <h3>Tecnológico</h3>
                </div>
                <p>Los riesgos de la tecnología. Como cuando se cae el internet o hay un virus.</p>
                <div class="category-examples-report">
                  <span class="example-tag-report">Hackers</span>
                  <span class="example-tag-report">Sistemas caídos</span>
                  <span class="example-tag-report">Virus</span>
                </div>
              </div>

              <div class="category-card-report financiero">
                <div class="category-header-report">
                  <span class="category-icon-report">💰</span>
                  <h3>Financiero</h3>
                </div>
                <p>Los riesgos del dinero. Como cuando no tienes suficiente presupuesto.</p>
                <div class="category-examples-report">
                  <span class="example-tag-report">Presupuesto</span>
                  <span class="example-tag-report">Costos</span>
                  <span class="example-tag-report">Inversiones</span>
                </div>
              </div>

              <div class="category-card-report corrupcion">
                <div class="category-header-report">
                  <span class="category-icon-report">🚫</span>
                  <h3>Corrupción</h3>
                </div>
                <p>Los riesgos de hacer cosas malas. Como cuando alguien usa su poder para beneficio propio.</p>
                <div class="category-examples-report">
                  <span class="example-tag-report">Sobornos</span>
                  <span class="example-tag-report">Fraude</span>
                  <span class="example-tag-report">Abuso</span>
                </div>
              </div>

              <div class="category-card-report ddhh">
                <div class="category-header-report">
                  <span class="category-icon-report">👥</span>
                  <h3>DDHH</h3>
                </div>
                <p>Los riesgos de los derechos humanos. Como cuando se trata mal a las personas.</p>
                <div class="category-examples-report">
                  <span class="example-tag-report">Discriminación</span>
                  <span class="example-tag-report">Maltrato</span>
                  <span class="example-tag-report">Derechos</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Criterios Tab -->
          <div id="criteria-tab" class="tab-panel-report">
            <div class="criteria-intro-report">
              <h2>📊 Criterios de Evaluación</h2>
              <p>Así es como medimos qué tan peligroso es cada riesgo</p>
            </div>

            <div class="criteria-section-report">
              <h3>🎯 Probabilidad: ¿Qué tan probable es que pase?</h3>
              <p>Es como adivinar el clima, pero con datos</p>
              
              <div class="prob-cards-report">
                <div class="prob-card-report muy-baja">
                  <div class="prob-header-report">
                    <span class="prob-number-report">1</span>
                    <h4>Muy Baja (Improbable)</h4>
                  </div>
                  <div class="prob-details-report">
                    <div class="prob-metric-report">
                      <span class="metric-icon-report">📅</span>
                      <span>1 vez cada 5 años</span>
                    </div>
                    <div class="prob-metric-report">
                      <span class="metric-icon-report">📊</span>
                      <span>0% - 20% de probabilidad</span>
                    </div>
                  </div>
                  <p class="prob-description-report">Como que te caiga un meteorito</p>
                </div>

                <div class="prob-card-report baja">
                  <div class="prob-header-report">
                    <span class="prob-number-report">2</span>
                    <h4>Baja (Poco probable)</h4>
                  </div>
                  <div class="prob-details-report">
                    <div class="prob-metric-report">
                      <span class="metric-icon-report">📅</span>
                      <span>1 vez al año</span>
                    </div>
                    <div class="prob-metric-report">
                      <span class="metric-icon-report">📊</span>
                      <span>21% - 40% de probabilidad</span>
                    </div>
                  </div>
                  <p class="prob-description-report">Como que llueva en el desierto</p>
                </div>

                <div class="prob-card-report media">
                  <div class="prob-header-report">
                    <span class="prob-number-report">3</span>
                    <h4>Media (Posible)</h4>
                  </div>
                  <div class="prob-details-report">
                    <div class="prob-metric-report">
                      <span class="metric-icon-report">📅</span>
                      <span>1 vez cada 6 meses</span>
                    </div>
                    <div class="prob-metric-report">
                      <span class="metric-icon-report">📊</span>
                      <span>41% - 60% de probabilidad</span>
                    </div>
                  </div>
                  <p class="prob-description-report">Como que llueva en primavera</p>
                </div>

                <div class="prob-card-report alta">
                  <div class="prob-header-report">
                    <span class="prob-number-report">4</span>
                    <h4>Alta (Probable)</h4>
                  </div>
                  <div class="prob-details-report">
                    <div class="prob-metric-report">
                      <span class="metric-icon-report">📅</span>
                      <span>1 vez cada 3 meses</span>
                    </div>
                    <div class="prob-metric-report">
                      <span class="metric-icon-report">📊</span>
                      <span>61% - 80% de probabilidad</span>
                    </div>
                  </div>
                  <p class="prob-description-report">Como que llueva en invierno</p>
                </div>

                <div class="prob-card-report muy-alta">
                  <div class="prob-header-report">
                    <span class="prob-number-report">5</span>
                    <h4>Muy Alta (Casi seguro)</h4>
                  </div>
                  <div class="prob-details-report">
                    <div class="prob-metric-report">
                      <span class="metric-icon-report">📅</span>
                      <span>1 vez al mes</span>
                    </div>
                    <div class="prob-metric-report">
                      <span class="metric-icon-report">📊</span>
                      <span>81% - 100% de probabilidad</span>
                    </div>
                  </div>
                  <p class="prob-description-report">Como que salga el sol cada día</p>
                </div>
              </div>
            </div>

            <div class="criteria-section-report">
              <h3>💥 Impacto: ¿Qué tan grave sería?</h3>
              <p>Es como medir qué tan grande es el problema</p>
              
              <div class="impact-cards-report">
                <div class="impact-card-report insignificante">
                  <div class="impact-header-report">
                    <span class="impact-number-report">1</span>
                    <h4>Insignificante</h4>
                  </div>
                  <div class="impact-areas-report">
                    <div class="area-item-report">💰 <strong>Económico:</strong> Hasta $50 millones</div>
                    <div class="area-item-report">⏰ <strong>Operativo:</strong> El evento causa retrasos y/o dificultad en la ejecución de procesos administrativos, sin detenerlos</div>
                    <div class="area-item-report">📢 <strong>Reputacional:</strong> El evento afecta la confianza y credibilidad del personal administrativo de la empresa</div>
                    <div class="area-item-report">⚖️ <strong>Legal:</strong> Quejas, reclamos u observaciones de miembros de la comunidad empresarial</div>
                  </div>
                  <p class="impact-description-report">Como un rasguño pequeño</p>
                </div>

                <div class="impact-card-report menor">
                  <div class="impact-header-report">
                    <span class="impact-number-report">2</span>
                    <h4>Menor</h4>
                  </div>
                  <div class="impact-areas-report">
                    <div class="area-item-report">💰 <strong>Económico:</strong> Hasta $100 millones</div>
                    <div class="area-item-report">⏰ <strong>Operativo:</strong> El evento causa retrasos y/o dificultad en la ejecución de procesos administrativos, llevando a su detención</div>
                    <div class="area-item-report">📢 <strong>Reputacional:</strong> El evento afecta la confianza y credibilidad de los empleados de la empresa</div>
                    <div class="area-item-report">⚖️ <strong>Legal:</strong> Incumplimiento de políticas internas, lineamientos, regulaciones y procedimientos</div>
                  </div>
                  <p class="impact-description-report">Como un golpe en el brazo</p>
                </div>

                <div class="impact-card-report moderado">
                  <div class="impact-header-report">
                    <span class="impact-number-report">3</span>
                    <h4>Moderado</h4>
                  </div>
                  <div class="impact-areas-report">
                    <div class="area-item-report">💰 <strong>Económico:</strong> Hasta $250 millones</div>
                    <div class="area-item-report">⏰ <strong>Operativo:</strong> El evento causa retrasos y/o dificultad en la ejecución de procesos misionales críticos, sin detenerlos</div>
                    <div class="area-item-report">📢 <strong>Reputacional:</strong> El evento afecta la confianza y credibilidad de los empleados de la empresa y se despliega en redes sociales</div>
                    <div class="area-item-report">⚖️ <strong>Legal:</strong> Quejas, reclamos u observaciones de entidades de control o judiciales con plazo para cumplimiento de acciones</div>
                  </div>
                  <p class="impact-description-report">Como una herida que duele</p>
                </div>

                <div class="impact-card-report mayor">
                  <div class="impact-header-report">
                    <span class="impact-number-report">4</span>
                    <h4>Mayor</h4>
                  </div>
                  <div class="impact-areas-report">
                    <div class="area-item-report">💰 <strong>Económico:</strong> Hasta $500 millones</div>
                    <div class="area-item-report">⏰ <strong>Operativo:</strong> El evento causa retrasos y/o dificultad en la ejecución de procesos misionales críticos, hasta su detención</div>
                    <div class="area-item-report">📢 <strong>Reputacional:</strong> El evento afecta la confianza y credibilidad del público externo de la empresa (comunidad, proveedores, usuarios, empresas, asociaciones, entre otros) y se despliega en medios de comunicación regionales</div>
                    <div class="area-item-report">⚖️ <strong>Legal:</strong> Quejas, reclamos u observaciones de entidades de control o judiciales que impliquen multas o sanciones</div>
                  </div>
                  <p class="impact-description-report">Como una fractura</p>
                </div>

                <div class="impact-card-report catastrofico">
                  <div class="impact-header-report">
                    <span class="impact-number-report">5</span>
                    <h4>Catastrófico</h4>
                  </div>
                  <div class="impact-areas-report">
                    <div class="area-item-report">💰 <strong>Económico:</strong> Más de $501 millones</div>
                    <div class="area-item-report">⏰ <strong>Operativo:</strong> El evento causa retrasos y/o dificultad en la ejecución de procesos misionales críticos y administrativos, llevando a su detención total</div>
                    <div class="area-item-report">📢 <strong>Reputacional:</strong> El evento afecta la confianza y credibilidad del público externo de la empresa y se despliega en medios de comunicación nacionales o internacionales</div>
                    <div class="area-item-report">⚖️ <strong>Legal:</strong> Intervenciones de entidades de control o judiciales</div>
                  </div>
                  <p class="impact-description-report">Como un accidente grave</p>
                </div>
              </div>
            </div>

            <div class="tips-section-report">
              <h3>💡 Consejos de Experto</h3>
              <div class="tips-grid-report">
                <div class="tip-card-report">
                  <span class="tip-icon-report">📊</span>
                  <h4>Usa Datos Históricos</h4>
                  <p>Mira el pasado para predecir el futuro. ¡Es como leer el horóscopo pero con datos reales!</p>
                </div>
                <div class="tip-card-report">
                  <span class="tip-icon-report">👥</span>
                  <h4>Consulta a Expertos</h4>
                  <p>Pregunta a quienes saben. ¡No seas tímido, todos tienen algo que aportar!</p>
                </div>
                <div class="tip-card-report">
                  <span class="tip-icon-report">🎯</span>
                  <h4>Sé Consistente</h4>
                  <p>Usa los mismos criterios para todo. ¡Como seguir una receta de cocina!</p>
                </div>
                <div class="tip-card-report">
                  <span class="tip-icon-report">🔄</span>
                  <h4>Revisa Regularmente</h4>
                  <p>Las cosas cambian. ¡Como actualizar tu teléfono, pero de riesgos!</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Mapa de Calor Tab -->
          <div id="heatmap-tab" class="tab-panel-report">
            <div class="heatmap-intro-report">
              <h2>🔥 Mapa de Calor de Riesgos</h2>
              <p>Tu brújula visual para la gestión inteligente de riesgos</p>
            </div>

            <div class="heatmap-explanation-report">
              <h3>🎯 ¿Qué es un Mapa de Calor?</h3>
              <p class="explanation-text-report">
                Un Mapa de Calor es una <strong>visualización gráfica</strong> que combina la probabilidad 
                y el impacto de cada riesgo en una matriz de colores. Es como un <strong>semáforo inteligente</strong> 
                que te dice exactamente qué hacer con cada riesgo.
              </p>
            </div>

            <div class="heatmap-title-report">
              <p>Visualización de riesgos residuales basada en probabilidad e impacto</p>
            </div>

            <div class="heatmap-container-report">
              <div class="heatmap-matrix-report">
                <!-- Labels outside the matrix -->
                <div class="matrix-label-probability-report">PROBABILIDAD</div>
                <div class="matrix-header-impact-report">IMPACTO</div>

                <!-- Matrix Grid -->
                <div class="matrix-grid-report">
                  <!-- Row 5 - Probabilidad 5 -->
                  <div class="matrix-row-report">
                    <div class="matrix-label-report">5</div>
                    <div class="matrix-cell-report yellow-risk-report"></div>
                    <div class="matrix-cell-report orange-risk-report"></div>
                    <div class="matrix-cell-report red-risk-report"></div>
                    <div class="matrix-cell-report red-risk-report"></div>
                    <div class="matrix-cell-report red-risk-report"></div>
                  </div>

                  <!-- Row 4 - Probabilidad 4 -->
                  <div class="matrix-row-report">
                    <div class="matrix-label-report">4</div>
                    <div class="matrix-cell-report yellow-risk-report"></div>
                    <div class="matrix-cell-report yellow-risk-report"></div>
                    <div class="matrix-cell-report orange-risk-report"></div>
                    <div class="matrix-cell-report red-risk-report"></div>
                    <div class="matrix-cell-report red-risk-report"></div>
                  </div>

                  <!-- Row 3 - Probabilidad 3 -->
                  <div class="matrix-row-report">
                    <div class="matrix-label-report">3</div>
                    <div class="matrix-cell-report green-risk-report"></div>
                    <div class="matrix-cell-report yellow-risk-report"></div>
                    <div class="matrix-cell-report orange-risk-report"></div>
                    <div class="matrix-cell-report orange-risk-report"></div>
                    <div class="matrix-cell-report red-risk-report"></div>
                  </div>

                  <!-- Row 2 - Probabilidad 2 -->
                  <div class="matrix-row-report">
                    <div class="matrix-label-report">2</div>
                    <div class="matrix-cell-report green-risk-report"></div>
                    <div class="matrix-cell-report green-risk-report"></div>
                    <div class="matrix-cell-report yellow-risk-report"></div>
                    <div class="matrix-cell-report orange-risk-report"></div>
                    <div class="matrix-cell-report orange-risk-report"></div>
                  </div>

                  <!-- Row 1 - Probabilidad 1 -->
                  <div class="matrix-row-report">
                    <div class="matrix-label-report">1</div>
                    <div class="matrix-cell-report green-risk-report"></div>
                    <div class="matrix-cell-report green-risk-report"></div>
                    <div class="matrix-cell-report green-risk-report"></div>
                    <div class="matrix-cell-report yellow-risk-report"></div>
                    <div class="matrix-cell-report orange-risk-report"></div>
                  </div>
                </div>

                <!-- Impact Labels -->
                <div class="impact-labels-report">
                  <div class="impact-label-report">1</div>
                  <div class="impact-label-report">2</div>
                  <div class="impact-label-report">3</div>
                  <div class="impact-label-report">4</div>
                  <div class="impact-label-report">5</div>
                </div>
              </div>
            </div>

            <div class="heatmap-legend-report">
              <h3>🎨 Leyenda de Colores</h3>
              <div class="legend-grid-report">
                <div class="legend-item-report green">
                  <div class="legend-color-report"></div>
                  <div class="legend-content-report">
                    <h4>🟢 Riesgo Bajo</h4>
                    <p>Probabilidad e Impacto bajos. Mantener vigilancia.</p>
                  </div>
                </div>
                <div class="legend-item-report yellow">
                  <div class="legend-color-report"></div>
                  <div class="legend-content-report">
                    <h4>🟡 Riesgo Medio</h4>
                    <p>Requiere monitoreo constante y plan de acción.</p>
                  </div>
                </div>
                <div class="legend-item-report orange">
                  <div class="legend-color-report"></div>
                  <div class="legend-content-report">
                    <h4>🟠 Riesgo Alto</h4>
                    <p>Acción inmediata requerida. Prioridad alta.</p>
                  </div>
                </div>
                <div class="legend-item-report red">
                  <div class="legend-color-report"></div>
                  <div class="legend-content-report">
                    <h4>🔴 Riesgo Crítico</h4>
                    <p>Acción inmediata. Amenaza existencial.</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="heatmap-benefits-report">
              <h3>✨ ¿Por qué usar un Mapa de Calor?</h3>
              <div class="benefits-grid-report">
                <div class="benefit-card-report">
                  <span class="benefit-icon-report">👁️</span>
                  <div class="benefit-content-report">
                    <h4>Visualización Clara</h4>
                    <p>Ves todos los riesgos de un vistazo</p>
                  </div>
                </div>
                <div class="benefit-card-report">
                  <span class="benefit-icon-report">🎯</span>
                  <div class="benefit-content-report">
                    <h4>Priorización Inteligente</h4>
                    <p>Sabes exactamente qué atender primero</p>
                  </div>
                </div>
                <div class="benefit-card-report">
                  <span class="benefit-icon-report">📊</span>
                  <div class="benefit-content-report">
                    <h4>Comunicación Efectiva</h4>
                    <p>Explicas riesgos de forma visual</p>
                  </div>
                </div>
                <div class="benefit-card-report">
                  <span class="benefit-icon-report">🔄</span>
                  <div class="benefit-content-report">
                    <h4>Seguimiento Continuo</h4>
                    <p>Monitoreas cambios en tiempo real</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    `;
  }

  static escaparHtml(texto) {
    if (texto == null) return '';
    return String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  static generarTablaResumenMapaHTML(titulo, riesgos, vacio = 'Sin datos') {
    if (!riesgos?.length) {
      return `
        <div class="tabla-resumen-mapa-block">
          <h4 class="tabla-resumen-mapa-titulo">${this.escaparHtml(titulo)}</h4>
          <p class="tabla-resumen-mapa-vacio">${this.escaparHtml(vacio)}</p>
        </div>`;
    }
    const filas = riesgos
      .map(
        (r) => `
        <tr>
          <td class="tabla-resumen-mapa-codigo">${this.escaparHtml(r.id)}</td>
          <td>${r.probabilidad}</td>
          <td>${r.impacto}</td>
          <td class="tabla-resumen-mapa-calif" style="background-color:${r.color};color:#fff;font-weight:bold">${r.clasificacion}</td>
        </tr>`
      )
      .join('');
    return `
      <div class="tabla-resumen-mapa-block">
        <h4 class="tabla-resumen-mapa-titulo">${this.escaparHtml(titulo)}</h4>
        <div class="tabla-resumen-mapa-scroll">
          <table class="tabla-resumen-mapa">
            <thead>
              <tr><th>Riesgo</th><th>Prob.</th><th>Imp.</th><th>Calif.</th></tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </div>`;
  }

  static generarTablaLeyendaMapaHTML(titulo, valoraciones, riesgosMapa) {
    if (!valoraciones?.length) return '';
    const filas = valoraciones
      .map((valoracion, index) => {
        const codigo = `R${valoracion.numero || index + 1}`;
        const nombre = this.escaparHtml(
          valoracion.riesgoIdentificado ||
            valoracion.riesgo ||
            valoracion.descripcion ||
            '—'
        );
        const riesgoCalc = riesgosMapa.find(
          (r) => r.numero === valoracion.numero || r.id === codigo
        );
        const clasificacion = riesgoCalc?.clasificacion ?? 0;
        const nivel = this.obtenerNivelRiesgo(clasificacion);
        return `
        <tr>
          <td class="tabla-resumen-mapa-codigo">${codigo}</td>
          <td class="tabla-leyenda-mapa-nombre" title="${nombre}">${nombre}</td>
          <td class="tabla-leyenda-mapa-calif">${clasificacion}</td>
          <td><span class="tabla-leyenda-mapa-nivel ${nivel.clase}">${nivel.texto}</span></td>
        </tr>`;
      })
      .join('');
    return `
      <div class="tabla-resumen-mapa-block tabla-leyenda-mapa-block">
        <h4 class="tabla-resumen-mapa-titulo">${this.escaparHtml(titulo)}</h4>
        <div class="tabla-resumen-mapa-scroll">
          <table class="tabla-resumen-mapa tabla-leyenda-mapa">
            <thead>
              <tr><th>Cód.</th><th>Riesgo</th><th>Calif.</th><th>Nivel</th></tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </div>`;
  }

  static agruparRiesgosPorCelda(riesgos, minEnCelda = 3) {
    if (!Array.isArray(riesgos) || riesgos.length === 0) return [];
    const porCelda = new Map();
    for (const r of riesgos) {
      const key = `${r.probabilidad}-${r.impacto}`;
      if (!porCelda.has(key)) {
        porCelda.set(key, { probabilidad: r.probabilidad, impacto: r.impacto, lista: [] });
      }
      porCelda.get(key).lista.push(r);
    }
    return [...porCelda.values()]
      .filter((g) => g.lista.length >= minEnCelda)
      .sort((a, b) => b.lista.length - a.lista.length);
  }

  static nombreRiesgoDesdeValoracion(riesgo, valoraciones) {
    const codigo = String(riesgo?.id || '');
    const num = riesgo?.numero ?? parseInt(codigo.replace(/\D/g, ''), 10);
    const v = (valoraciones || []).find(
      (row) =>
        row?.numero === num ||
        row?.id === riesgo?.id ||
        `R${row?.numero}` === codigo
    );
    return (
      v?.riesgoIdentificado ||
      v?.riesgo ||
      v?.descripcion ||
      riesgo?.descripcion ||
      '—'
    );
  }

  /** Listado por celda agrupada (igual que el modal al pulsar el número en el mapa). */
  static generarDetalleCeldasAgrupadasHTML(riesgos, valoraciones, tituloMapa) {
    const grupos = this.agruparRiesgosPorCelda(riesgos, 3);
    if (!grupos.length) return '';

    const bloques = grupos
      .map((grupo) => {
        const items = grupo.lista
          .map((r) => {
            const nombre = this.escaparHtml(this.nombreRiesgoDesdeValoracion(r, valoraciones));
            return `<li>
              <span class="mapa-detalle-codigo">${this.escaparHtml(r.id)}</span>
              <span class="mapa-detalle-nombre" title="${nombre}">${nombre}</span>
              <span class="mapa-detalle-calif">Calificación ${r.clasificacion}</span>
            </li>`;
          })
          .join('');

        return `
        <div class="mapa-detalle-celda-grupo">
          <p class="mapa-detalle-celda-titulo">
            Celda: probabilidad <strong>${grupo.probabilidad}</strong>, impacto <strong>${grupo.impacto}</strong>
            · <strong>${grupo.lista.length}</strong> riesgos
          </p>
          <ul class="mapa-detalle-celda-lista">${items}</ul>
        </div>`;
      })
      .join('');

    return `
      <div class="mapa-detalle-celdas-export">
        <h4 class="mapa-detalle-celdas-titulo">${this.escaparHtml(tituloMapa)} — riesgos por celda</h4>
        <p class="mapa-detalle-celdas-ayuda">Código, nombre del riesgo y calificación (como al pulsar la cantidad en el mapa).</p>
        ${bloques}
      </div>`;
  }

  static generarBloqueMapaExport({
    tituloResumen,
    tituloMapa,
    tituloLeyenda,
    riesgos,
    valoraciones,
    matrizHTML,
    estadisticas,
    vacio = 'Sin datos',
  }) {
    const statsHtml = estadisticas
      ? `<p class="mapa-stats-compact">Total: ${estadisticas.total} · Críticos: ${estadisticas.criticos} · Altos: ${estadisticas.altos} · Medios: ${estadisticas.medios} · Bajos: ${estadisticas.bajos}</p>`
      : '';
    const detalleCeldasHtml = this.generarDetalleCeldasAgrupadasHTML(
      riesgos,
      valoraciones,
      tituloMapa
    );
    return `
      <div class="mapa-contenedor-export">
        ${this.generarTablaResumenMapaHTML(tituloResumen, riesgos, vacio)}
        <h3 class="mapa-export-titulo">${this.escaparHtml(tituloMapa)}</h3>
        <p class="nota-mapa-impresion">Varios riesgos en la misma celda se muestran como cantidad; el detalle de cada grupo está debajo del mapa.</p>
        <div class="heatmap-grid heatmap-grid-export">${matrizHTML}</div>
        ${detalleCeldasHtml}
        ${this.generarTablaLeyendaMapaHTML(tituloLeyenda, valoraciones, riesgos)}
        ${statsHtml}
      </div>`;
  }

  // Generar leyenda de riesgos para el mapa de calor (obsoleta: leyenda por mapa)
  static generarLeyendaRiesgos(valoraciones, riesgosInherentes = [], riesgosResiduales = [], tipoReporte = 'inicial') {
    return '';

return `
            <div class="leyenda-riesgos">
              <h3>📋 Leyenda de Riesgos</h3>
              <p>Identificación de los riesgos mostrados en los mapas de calor:</p>
              
              <div class="leyenda-contenido">
                <!-- Leyenda Mapa de Calor Inherente -->
                <div class="leyenda-mapa">
                  <h4>🔥 Mapa de Calor Inherente</h4>
                  <p>Riesgos sin considerar controles existentes</p>
                  <div class="leyenda-tabla">
                    <table class="tabla-leyenda">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Nombre del Riesgo</th>
                          <th>Clasificación</th>
                          <th>Nivel</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${valoraciones.map((valoracion, index) => {
                          const codigo = `R${valoracion.numero || index + 1}`;
                          const nombre = valoracion.riesgoIdentificado || valoracion.riesgo || valoracion.descripcion || 'Riesgo no especificado';
                          // Buscar la clasificación en los riesgos inherentes calculados
                          const riesgoInherente = riesgosInherentes.find(r => r.numero === valoracion.numero);
const clasificacion = riesgoInherente?.clasificacion || valoracion.clasificacionInherente || valoracion.clasificacion || 0;
const nivelRiesgo = this.obtenerNivelRiesgo(clasificacion);
                          
                          return `
                            <tr>
                              <td class="codigo-riesgo">${codigo}</td>
                              <td class="nombre-riesgo">${nombre}</td>
                              <td class="clasificacion-riesgo">${clasificacion}</td>
                              <td class="nivel-riesgo ${nivelRiesgo.clase}">${nivelRiesgo.texto}</td>
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>

                ${tipoReporte === 'anual' ? `
                <!-- Leyenda Mapa de Calor Residual - Solo para reporte anual -->
                <div class="leyenda-mapa">
                  <h4>🛡️ Mapa de Calor Residual</h4>
                  <p>Riesgos después de aplicar controles existentes</p>
                  <div class="leyenda-tabla">
                    <table class="tabla-leyenda">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Nombre del Riesgo</th>
                          <th>Clasificación</th>
                          <th>Nivel</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${valoraciones.map((valoracion, index) => {
                          const codigo = `R${valoracion.numero || index + 1}`;
                          const nombre = valoracion.riesgoIdentificado || valoracion.riesgo || valoracion.descripcion || 'Riesgo no especificado';
                          // Buscar la clasificación en los riesgos residuales calculados
                          const riesgoResidual = riesgosResiduales.find(r => r.numero === valoracion.numero);
const clasificacion = riesgoResidual?.clasificacion || valoracion.clasificacionResidual || valoracion.clasificacion || 0;
const nivelRiesgo = this.obtenerNivelRiesgo(clasificacion);
                          
                          return `
                            <tr>
                              <td class="codigo-riesgo">${codigo}</td>
                              <td class="nombre-riesgo">${nombre}</td>
                              <td class="clasificacion-riesgo">${clasificacion}</td>
                              <td class="nivel-riesgo ${nivelRiesgo.clase}">${nivelRiesgo.texto}</td>
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
                ` : ''}
              </div>
            </div>
          `;
  }

  // Generar sección de gestión de riesgos
  static generarSeccionGestionRiesgos(gestionRiesgos) {
if (!gestionRiesgos || !gestionRiesgos.recomendaciones || gestionRiesgos.recomendaciones.length === 0) {
      return '';
    }

    return `
      <div class="section">
        <h2>🛡️ Recomendaciones de El corazón digital de Grupo Proser</h2>
        <p class="section-description-report">Recomendaciones identificadas y su seguimiento de implementación</p>
        
        <div class="recomendaciones-container-report">
          ${gestionRiesgos.recomendaciones.map((recomendacion, index) => `
            <div class="recomendacion-card-report">
              <div class="recomendacion-header-report">
                <h3>📋 Recomendación #${index + 1}</h3>
              </div>
              
              <div class="recomendacion-content-report">
                ${recomendacion.recomendacion ? `
                  <div class="recomendacion-descripcion-report">
                    <h4>📝 Descripción de la Recomendación</h4>
                    <p>${recomendacion.recomendacion}</p>
                  </div>
                ` : ''}
                
                <div class="recomendacion-fechas-report">
                  ${recomendacion.fechaInicial ? `
                    <div class="fecha-item-report">
                      <strong>📅 Fecha Inicial:</strong> ${recomendacion.fechaInicial}
                    </div>
                  ` : ''}
                  
                  ${recomendacion.fechaImplementacion1 ? `
                    <div class="fecha-item-report">
                      <strong>🎯 Fecha Implementación 1:</strong> ${recomendacion.fechaImplementacion1}
                      ${recomendacion.comentariosImplementacion1 ? `
                        <div class="comentarios-report">
                          <strong>💬 Comentarios:</strong> ${recomendacion.comentariosImplementacion1}
                        </div>
                      ` : ''}
                    </div>
                  ` : ''}
                  
                  ${recomendacion.fechaImplementacion2 ? `
                    <div class="fecha-item-report">
                      <strong>🎯 Fecha Implementación 2:</strong> ${recomendacion.fechaImplementacion2}
                      ${recomendacion.comentariosImplementacion2 ? `
                        <div class="comentarios-report">
                          <strong>💬 Comentarios:</strong> ${recomendacion.comentariosImplementacion2}
                        </div>
                      ` : ''}
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Generar sección de identificación completa
  static generarSeccionIdentificacion(identificacion) {
// Buscar riesgos en diferentes estructuras posibles
    let riesgos = [];
    let columnasAdicionales = [];
    
    if (identificacion) {
      if (identificacion.riesgos && Array.isArray(identificacion.riesgos)) {
        riesgos = identificacion.riesgos;
      } else if (identificacion.procesos && Array.isArray(identificacion.procesos)) {
        riesgos = identificacion.procesos;
      } else if (Array.isArray(identificacion)) {
        riesgos = identificacion;
      }
      
      if (identificacion.columnasAdicionales && Array.isArray(identificacion.columnasAdicionales)) {
        columnasAdicionales = identificacion.columnasAdicionales;
      }
    }

const categoriasRiesgo = [
      { valor: 'estrategico', etiqueta: 'Estratégico', icono: '🎯' },
      { valor: 'cumplimiento', etiqueta: 'Cumplimiento', icono: '⚖️' },
      { valor: 'reputacional', etiqueta: 'Reputacional', icono: '📢' },
      { valor: 'operativo', etiqueta: 'Operativo', icono: '🏢' },
      { valor: 'financiero', etiqueta: 'Financiero', icono: '💰' },
      { valor: 'tecnologico', etiqueta: 'Tecnológico', icono: '💻' },
      { valor: 'corrupcion', etiqueta: 'Corrupción', icono: '🚫' },
      { valor: 'ddhh', etiqueta: 'DDHH', icono: '👥' }
    ];

    const tiposProceso = [
      'Proceso Principal',
      'Proceso de Apoyo',
      'Proceso de Gestión',
      'Proceso Operativo',
      'Proceso Administrativo',
      'Proceso de Control',
      'Proceso de Monitoreo',
      'Otro'
    ];

    return `
      <div class="section">
        <h2>🔍 Identificación de Riesgos</h2>
        <p class="section-description-report">Identifica y categoriza todos los riesgos potenciales por proceso organizacional</p>
        
        ${riesgos.length === 0 ? `
          <div class="sin-riesgos-report">
            <div class="sin-riesgos-icono-report">📝</div>
            <h5>No hay riesgos identificados</h5>
            <p>Comienza agregando el primer riesgo usando el formulario de arriba.</p>
          </div>
        ` : `
          <div class="identificacion-content-report">
            <h3 class="seccion-titulo-report">
              <span class="icono-report">📋</span>
              Riesgos Identificados (${riesgos.length})
            </h3>
            
            <div class="tabla-container-report">
              <table class="tabla-identificacion-report">
                <thead>
                  <tr>
                    <th class="col-numero-report">No.</th>
                    <th class="col-proceso-report">NOMBRE DEL PROCESO</th>
                    <th class="col-tipo-report">TIPO DE PROCESO</th>
                    <th class="col-riesgo-report">RIESGO IDENTIFICADO</th>
                    <th class="col-categorias-header-report" colspan="8">CATEGORÍA DEL RIESGO</th>
                    ${columnasAdicionales.map(columna => `
                      <th class="col-adicional-report">${columna.nombre.toUpperCase()}</th>
                    `).join('')}
                  </tr>
                  <tr>
                    <th class="col-numero-report"></th>
                    <th class="col-proceso-report"></th>
                    <th class="col-tipo-report"></th>
                    <th class="col-riesgo-report"></th>
                    ${categoriasRiesgo.map(cat => `
                      <th class="col-categorias-report">${cat.etiqueta}</th>
                    `).join('')}
                    ${columnasAdicionales.map(columna => `
                      <th class="col-adicional-report"></th>
                    `).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${riesgos.map(riesgo => `
                    <tr class="fila-riesgo-report">
                      <td class="col-numero-report">${riesgo.numero || ''}</td>
                      <td class="col-proceso-report">${riesgo.nombreProceso || ''}</td>
                      <td class="col-tipo-report">${riesgo.tipoProceso || ''}</td>
                      <td class="col-riesgo-report">${riesgo.riesgoIdentificado || ''}</td>
                      ${categoriasRiesgo.map(cat => `
                        <td class="col-categorias-report text-center-report">
                          ${riesgo.categorias && riesgo.categorias[cat.valor] ? 'X' : ''}
                        </td>
                      `).join('')}
                      ${columnasAdicionales.map(columna => `
                        <td class="col-adicional-report">${riesgo[columna.clave] || ''}</td>
                      `).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="resumen-riesgos-report">
              <h4>📊 Resumen de Categorías</h4>
              <div class="categorias-resumen-report">
                ${categoriasRiesgo.map(cat => {
                  const count = riesgos.filter(riesgo => 
                    riesgo.categorias && riesgo.categorias[cat.valor]
                  ).length;
                  return `
                    <div class="categoria-item-report">
                      <span class="categoria-icono-report">${cat.icono}</span>
                      <span class="categoria-nombre-report">${cat.etiqueta}</span>
                      <span class="categoria-count-report">${count}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
            
            <div class="tipos-proceso-report">
              <h4>🔄 Tipos de Proceso Identificados</h4>
              <div class="tipos-grid-report">
                ${tiposProceso.map(tipo => {
                  const count = riesgos.filter(riesgo => riesgo.tipoProceso === tipo).length;
                  if (count > 0) {
                    return `
                      <div class="tipo-item-report">
                        <span class="tipo-nombre-report">${tipo}</span>
                        <span class="tipo-count-report">${count}</span>
                      </div>
                    `;
                  }
                  return '';
                }).filter(Boolean).join('')}
              </div>
            </div>
          </div>
        `}
      </div>
    `;
  }

  // Generar sección de valoración completa
  static generarSeccionValoracion(valoracion, tipoReporte = 'inicial') {
// Buscar valoraciones en diferentes estructuras posibles
    let valoraciones = [];
    if (valoracion) {
      if (valoracion.valoraciones && Array.isArray(valoracion.valoraciones)) {
        valoraciones = valoracion.valoraciones;
      } else if (valoracion.riesgos && Array.isArray(valoracion.riesgos)) {
        valoraciones = valoracion.riesgos;
      } else if (Array.isArray(valoracion)) {
        valoraciones = valoracion;
      }
    }

const escalaProbabilidad = [
      { valor: 1, etiqueta: 'Muy Baja', color: '#28a745' },
      { valor: 2, etiqueta: 'Baja', color: '#6c757d' },
      { valor: 3, etiqueta: 'Media', color: '#ffc107' },
      { valor: 4, etiqueta: 'Alta', color: '#fd7e14' },
      { valor: 5, etiqueta: 'Muy Alta', color: '#dc3545' }
    ];

    const escalaImpacto = [
      { valor: 1, etiqueta: 'Muy Bajo', color: '#28a745' },
      { valor: 2, etiqueta: 'Bajo', color: '#6c757d' },
      { valor: 3, etiqueta: 'Medio', color: '#ffc107' },
      { valor: 4, etiqueta: 'Alto', color: '#fd7e14' },
      { valor: 5, etiqueta: 'Muy Alto', color: '#dc3545' }
    ];

    const calcularNivelRiesgo = (prob, imp) => {
      const multiplicacion = prob * imp;
      if (multiplicacion <= 4) return { nivel: 'Bajo', color: '#28a745' };
      if (multiplicacion <= 9) return { nivel: 'Medio', color: '#ffc107' };
      if (multiplicacion <= 16) return { nivel: 'Alto', color: '#fd7e14' };
      return { nivel: 'Crítico', color: '#dc3545' };
    };

    const calcularNivelRiesgoResidual = (valoracionCuantitativa) => {
      const valor = Number(valoracionCuantitativa) || 0;
      if (valor <= 4) return { nivel: 'ACEPTABLE', color: '#28a745' };
      if (valor <= 8) return { nivel: 'TOLERABLE', color: '#ffc107' };
      if (valor <= 12) return { nivel: 'ALTO', color: '#fd7e14' };
      if (valor <= 25) return { nivel: 'CRÍTICO', color: '#dc3545' };
      return { nivel: 'CRÍTICO', color: '#dc3545' };
    };

    if (valoraciones.length === 0) {
      return `
        <div class="section">
          <h2>📊 Valoración de Riesgos</h2>
          <p class="section-description-report">Evaluación cuantitativa y cualitativa de los riesgos identificados</p>
          <div class="sin-valoraciones-report">
            <div class="sin-valoraciones-icono-report">📊</div>
            <h5>No hay valoraciones realizadas</h5>
            <p>Comienza valorando los riesgos identificados en la sección anterior.</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="section">
        <h2>📊 Valoración de Riesgos</h2>
        <p class="section-description-report">Evaluación cuantitativa y cualitativa de los riesgos identificados</p>
        
        <div class="valoracion-content-report">
          <h3 class="seccion-titulo-report">
            <span class="icono-report">📊</span>
            Valoraciones Realizadas (${valoraciones.length})
          </h3>
          
          <div class="tabla-container-report">
            <table class="tabla-valoracion-report">
              <thead>
                <tr>
                  <th class="col-numero-report">No.</th>
                  <th class="col-riesgo-report">RIESGO</th>
                  <th class="col-proceso-report">PROCESO</th>
                  <th class="col-causas-report">CAUSAS PROBABLES</th>
                  <th class="col-probabilidad-report">PROBABILIDAD</th>
                  <th class="col-impacto-header-report" colspan="4">IMPACTO</th>
                  <th class="col-sum-impacto-report">SUMATORIA IMPACTO</th>
                  <th class="col-calificacion-report">CALIFICACIÓN</th>
                  <th class="col-controles-report">¿EXISTEN CONTROLES?</th>
                  <th class="col-controles-desc-report">CONTROLES EXISTENTES</th>
                  <th class="col-efectividad-header-report" colspan="13">EVALUACIÓN DE LA EFECTIVIDAD</th>
                  ${tipoReporte === 'anual' ? `
                  <th class="col-prob-residual-report">PROB. RESIDUAL</th>
                  <th class="col-impacto-residual-header-report" colspan="4">IMPACTO RESIDUAL</th>
                  <th class="col-sum-residual-report">SUMATORIA RESIDUAL</th>
                  <th class="col-valoracion-cuantitativa-report">VALORACIÓN CUANTITATIVA</th>
                  <th class="col-nivel-residual-report">NIVEL RESIDUAL</th>
                  <th class="col-tratamiento-report">TRATAMIENTO</th>
                  ` : ''}
                </tr>
                <tr>
                  <th class="col-numero-report"></th>
                  <th class="col-riesgo-report"></th>
                  <th class="col-proceso-report"></th>
                  <th class="col-causas-report"></th>
                  <th class="col-probabilidad-report"></th>
                  <th class="col-imp-cat-report">Económico</th>
                  <th class="col-imp-cat-report">Operativo</th>
                  <th class="col-imp-cat-report">Reputacional</th>
                  <th class="col-imp-cat-report">Legal</th>
                  <th class="col-sum-impacto-report"></th>
                  <th class="col-calificacion-report"></th>
                  <th class="col-controles-report"></th>
                  <th class="col-controles-desc-report"></th>
                  <th class="col-efectividad-sub-report">Manuales</th>
                  <th class="col-efectividad-val-report">%</th>
                  <th class="col-efectividad-sub-report">Tipo</th>
                  <th class="col-efectividad-val-report">%</th>
                  <th class="col-efectividad-sub-report">Automatización</th>
                  <th class="col-efectividad-val-report">%</th>
                  <th class="col-efectividad-sub-report">Responsable</th>
                  <th class="col-efectividad-sub-report">Cargo</th>
                  <th class="col-efectividad-val-report">%</th>
                  <th class="col-efectividad-sub-report">Periodicidad</th>
                  <th class="col-efectividad-val-report">%</th>
                  <th class="col-efectividad-val-report">SUMA</th>
                  ${tipoReporte === 'anual' ? `
                  <th class="col-prob-residual-report"></th>
                  <th class="col-imp-cat-report">Económico</th>
                  <th class="col-imp-cat-report">Operativo</th>
                  <th class="col-imp-cat-report">Reputacional</th>
                  <th class="col-imp-cat-report">Legal</th>
                  <th class="col-sum-residual-report"></th>
                  <th class="col-valoracion-cuantitativa-report"></th>
                  <th class="col-nivel-residual-report"></th>
                  <th class="col-tratamiento-report"></th>
                  ` : ''}
                </tr>
              </thead>
              <tbody>
                ${valoraciones.map(valoracion => {
                  const nivelInherente = calcularNivelRiesgo(valoracion.probabilidad, valoracion.sumImpacto || 1);
                  const nivelResidual = calcularNivelRiesgoResidual(valoracion.probResidual * (valoracion.sumImpactoResidual || 1));
                  const valoracionCuantitativa = (valoracion.probResidual || valoracion.probabilidad) * (valoracion.sumImpactoResidual || valoracion.sumImpacto || 1);
                  
                  return `
                    <tr class="fila-valoracion-report">
                      <td class="col-numero-report">${valoracion.numero || ''}</td>
                      <td class="col-riesgo-report">${valoracion.riesgoIdentificado || ''}</td>
                      <td class="col-proceso-report">${valoracion.nombreProceso || ''}</td>
                      <td class="col-causas-report">${valoracion.causasProbables || ''}</td>
                      <td class="col-probabilidad-report" style="background-color: ${escalaProbabilidad.find(p => p.valor === valoracion.probabilidad)?.color || '#f8f9fa'}20">
                        ${valoracion.probabilidad} - ${escalaProbabilidad.find(p => p.valor === valoracion.probabilidad)?.etiqueta || ''}
                      </td>
                      <td class="col-imp-cat-report">${valoracion.impactosCategoria?.economico || 1}</td>
                      <td class="col-imp-cat-report">${valoracion.impactosCategoria?.operativo || 1}</td>
                      <td class="col-imp-cat-report">${valoracion.impactosCategoria?.reputacional || 1}</td>
                      <td class="col-imp-cat-report">${valoracion.impactosCategoria?.legal || 1}</td>
                      <td class="col-sum-impacto-report" style="background-color: ${nivelInherente.color}20">
                        ${valoracion.sumImpacto || ''}
                      </td>
                      <td class="col-calificacion-report" style="background-color: ${nivelInherente.color}20">
                        ${valoracion.probabilidad * (valoracion.sumImpacto || 1)}
                      </td>
                      <td class="col-controles-report">${valoracion.controles?.existen || 'No'}</td>
                      <td class="col-controles-desc-report">${valoracion.controles?.descripcion || ''}</td>
                      <td class="col-efectividad-sub-report">${valoracion.controles?.tieneManuales || 'No'}</td>
                      <td class="col-efectividad-val-report">${valoracion.controles?.valorManualesPct || 0}%</td>
                      <td class="col-efectividad-sub-report">${valoracion.controles?.tipo || ''}</td>
                      <td class="col-efectividad-val-report">${valoracion.controles?.valorTipoPct || 0}%</td>
                      <td class="col-efectividad-sub-report">${valoracion.controles?.gradoAutomatizacion || ''}</td>
                      <td class="col-efectividad-val-report">${valoracion.controles?.valorAutomatizacionPct || 0}%</td>
                      <td class="col-efectividad-sub-report">${valoracion.controles?.existeResponsable || 'No'}</td>
                      <td class="col-efectividad-sub-report">${valoracion.controles?.cargoResponsable || ''}</td>
                      <td class="col-efectividad-val-report">${valoracion.controles?.valorResponsablePct || 0}%</td>
                      <td class="col-efectividad-sub-report">${valoracion.controles?.periodicidad || ''}</td>
                      <td class="col-efectividad-val-report">${valoracion.controles?.valorPeriodicidadPct || 0}%</td>
                      <td class="col-efectividad-val-report">${valoracion.controles?.sumControles || 0}%</td>
                      ${tipoReporte === 'anual' ? `
                      <td class="col-prob-residual-report">${valoracion.probResidual || valoracion.probabilidad}</td>
                      <td class="col-imp-cat-report">${valoracion.impactosCategoriaResidual?.economico || 1}</td>
                      <td class="col-imp-cat-report">${valoracion.impactosCategoriaResidual?.operativo || 1}</td>
                      <td class="col-imp-cat-report">${valoracion.impactosCategoriaResidual?.reputacional || 1}</td>
                      <td class="col-imp-cat-report">${valoracion.impactosCategoriaResidual?.legal || 1}</td>
                      <td class="col-sum-residual-report">${valoracion.sumImpactoResidual || ''}</td>
                      <td class="col-valoracion-cuantitativa-report" style="background-color: ${nivelResidual.color}20">
                        ${valoracionCuantitativa.toFixed(2)}
                      </td>
                      <td class="col-nivel-residual-report" style="background-color: ${nivelResidual.color}20">
                        ${nivelResidual.nivel}
                      </td>
                      <td class="col-tratamiento-report">${valoracion.tratamiento || 'Asumir el riesgo'}</td>
                      ` : ''}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="resumen-valoracion-report">
            <h4>📈 Resumen de Valoración</h4>
            <div class="resumen-grid-report">
              <div class="resumen-item-report">
                <span class="resumen-icono-report">📊</span>
                <div class="resumen-content-report">
                  <h5>Riesgos Valorados</h5>
                  <p class="resumen-numero-report">${valoraciones.length}</p>
                </div>
              </div>
              <div class="resumen-item-report">
                <span class="resumen-icono-report">🔴</span>
                <div class="resumen-content-report">
                  <h5>Críticos</h5>
                  <p class="resumen-numero-report">${valoraciones.filter(v => calcularNivelRiesgoResidual((v.probResidual || v.probabilidad) * (v.sumImpactoResidual || v.sumImpacto || 1)).nivel === 'CRÍTICO').length}</p>
                </div>
              </div>
              <div class="resumen-item-report">
                <span class="resumen-icono-report">🟠</span>
                <div class="resumen-content-report">
                  <h5>Altos</h5>
                  <p class="resumen-numero-report">${valoraciones.filter(v => calcularNivelRiesgoResidual((v.probResidual || v.probabilidad) * (v.sumImpactoResidual || v.sumImpacto || 1)).nivel === 'ALTO').length}</p>
                </div>
              </div>
              <div class="resumen-item-report">
                <span class="resumen-icono-report">🟡</span>
                <div class="resumen-content-report">
                  <h5>Tolerables</h5>
                  <p class="resumen-numero-report">${valoraciones.filter(v => calcularNivelRiesgoResidual((v.probResidual || v.probabilidad) * (v.sumImpactoResidual || v.sumImpacto || 1)).nivel === 'TOLERABLE').length}</p>
                </div>
              </div>
              <div class="resumen-item-report">
                <span class="resumen-icono-report">🟢</span>
                <div class="resumen-content-report">
                  <h5>Aceptables</h5>
                  <p class="resumen-numero-report">${valoraciones.filter(v => calcularNivelRiesgoResidual((v.probResidual || v.probabilidad) * (v.sumImpactoResidual || v.sumImpacto || 1)).nivel === 'ACEPTABLE').length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Generar sección de mapa de calor
  static generarSeccionMapaCalor(mapaCalor, valoracion, datosMatriz = {}, tipoReporte = 'inicial') {
// Obtener datos de valoración (igual que la plataforma)
    const valoraciones = valoracion?.valoraciones || [];
    const probabilidades = valoracion?.probabilidad || {};
    const impactosCategoria = valoracion?.impactosCategoria || {};
    const probResidual = valoracion?.probResidual || {};
    const impactosCategoriaResidual = valoracion?.impactosCategoriaResidual || {};
    const impactoPlano = valoracion?.impacto || {};
    const impactoResidualPlano = valoracion?.impactoResidual || {};

    const resolverProb1a5 = (v) => {
      const desdeFila = Number(v?.probabilidad);
      if (Number.isFinite(desdeFila) && desdeFila >= 1 && desdeFila <= 5) return Math.round(desdeFila);
      const desdeMapa = Number(probabilidades[v?.id]);
      if (Number.isFinite(desdeMapa) && desdeMapa >= 1 && desdeMapa <= 5) return Math.round(desdeMapa);
      return 1;
    };

    const resolverImpactoInh = (v) => {
      const cats =
        v.impactosCategoria ||
        impactosCategoria[v.id] || { economico: 1, operativo: 1, reputacional: 1, legal: 1 };
      const maxC = this.calcularMaxImpacto(cats);
      const sm = Number(v.sumImpacto);
      if (Number.isFinite(sm) && sm > 0) {
        if (sm <= 5) return Math.min(5, Math.max(1, Math.round(sm)));
        return this.bucket1a5(sm);
      }
      const sc = Number(
        v.impacto !== undefined && v.impacto !== null && v.impacto !== '' ? v.impacto : impactoPlano[v.id]
      );
      if (Number.isFinite(sc) && sc >= 1 && sc <= 5) return Math.round(sc);
      return Math.min(5, Math.max(1, Math.round(maxC)));
    };

    const resolverImpactoRes = (v) => {
      const cats =
        v.impactosCategoriaResidual ||
        impactosCategoriaResidual[v.id] ||
        impactosCategoria[v.id] || { economico: 1, operativo: 1, reputacional: 1, legal: 1 };
      const maxC = this.calcularMaxImpacto(cats);
      const sm = Number(v.sumImpactoResidual);
      if (Number.isFinite(sm) && sm > 0) {
        if (sm <= 5) return Math.min(5, Math.max(1, Math.round(sm)));
        return this.bucket1a5(sm);
      }
      const sc = Number(
        v.impactoResidual !== undefined && v.impactoResidual !== null && v.impactoResidual !== ''
          ? v.impactoResidual
          : impactoResidualPlano[v.id]
      );
      if (Number.isFinite(sc) && sc >= 1 && sc <= 5) return Math.round(sc);
      return Math.min(5, Math.max(1, Math.round(maxC)));
    };

    const resolverProbRes1a5 = (v) => {
      const desdeFila = Number(v?.probResidual);
      if (Number.isFinite(desdeFila) && desdeFila >= 1 && desdeFila <= 5) return Math.round(desdeFila);
      const desdeMapa = Number(probResidual[v?.id]);
      if (Number.isFinite(desdeMapa) && desdeMapa >= 1 && desdeMapa <= 5) return Math.round(desdeMapa);
      return resolverProb1a5(v);
    };
    
if (valoraciones.length === 0) {
return '';
    }
    
    // Usar el tipo de reporte seleccionado por el usuario
    const esValoracionInicial = tipoReporte === 'inicial';
    const tipoValoracion = esValoracionInicial ? 'Inicial' : 'Anual';
    const fechaValoracion = this.obtenerFechaValoracion(valoracion);
    
// Calcular riesgos inherentes (igual que la plataforma)
    const riesgosInherentes = valoraciones.map((v) => {
      const probabilidadInherente = resolverProb1a5(v);
      const impactoInherente = resolverImpactoInh(v);

      const clasificacionInherente = probabilidadInherente * impactoInherente;
      const nivelInherente = this.calcularNivelRiesgo(probabilidadInherente, impactoInherente);
      
      return {
        id: `R${v.numero || v.id}`,
        numero: v.numero,
        probabilidad: probabilidadInherente,
        impacto: impactoInherente,
        clasificacion: clasificacionInherente,
        nivel: nivelInherente.nivel,
        color: nivelInherente.color,
        descripcion: v.descripcion || ''
      };
    });
    
    // Calcular riesgos residuales (solo para reportes anuales)
    let riesgosResiduales = [];
    if (tipoReporte === 'anual') {
      riesgosResiduales = valoraciones.map((v) => {
        const probabilidadResidual = resolverProbRes1a5(v);
        const impactoResidual = resolverImpactoRes(v);
        
        const clasificacionResidual = probabilidadResidual * impactoResidual;
        const nivelResidual = this.calcularNivelRiesgo(probabilidadResidual, impactoResidual);
        
        return {
          id: `R${v.numero || v.id}`,
          numero: v.numero,
          probabilidad: probabilidadResidual,
          impacto: impactoResidual,
          clasificacion: clasificacionResidual,
          nivel: nivelResidual.nivel,
          color: nivelResidual.color,
          descripcion: v.descripcion || ''
        };
      });
    }
    
// Generar matrices visuales
    const matrizInherente = this.generarMatrizVisual(riesgosInherentes, 'Inherente');
    const matrizResidual = this.generarMatrizVisual(riesgosResiduales, 'Residual');
    
    // Calcular estadísticas
    const estadisticasInherentes = this.calcularEstadisticasValoracion(riesgosInherentes);
    const estadisticasResiduales = this.calcularEstadisticasValoracion(riesgosResiduales);
    
    return `
      <style>
        .heatmap-container {
          margin: 30px 0;
          padding: 25px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 15px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          border: 1px solid #dee2e6;
        }
        
        .heatmap-container h3 {
          color: #2c3e50;
          font-size: 1.4em;
          margin-bottom: 10px;
          font-weight: 600;
          text-align: center;
        }
        
        .heatmap-container p {
          color: #6c757d;
          text-align: center;
          margin-bottom: 20px;
          font-style: italic;
        }
        
        .heatmap-grid {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: #fff;
          padding: 15px;
          border-radius: 10px;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.1);
          align-items: center;
          justify-content: center;
        }
        
        .heatmap-row {
          display: flex;
          gap: 2px;
          margin-bottom: 2px;
          justify-content: center;
          align-items: center;
        }
        
        .heatmap-row:last-child {
          margin-bottom: 0;
        }
        
        .heatmap-cell {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 2px solid rgba(255,255,255,0.3);
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          transition: all 0.3s ease;
          position: relative;
          font-weight: bold;
          color: white;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }
        
        .heatmap-cell:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          z-index: 10;
        }
        
        .riesgo-marcador {
          background: rgba(255,255,255,0.9);
          color: #2c3e50;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8em;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          border: 2px solid #fff;
          min-width: 20px;
          text-align: center;
        }
        
        .heatmap-stats {
          margin-top: 25px;
          padding: 20px;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }
        
        .heatmap-stats h4 {
          color: #2c3e50;
          font-size: 1.2em;
          margin-bottom: 15px;
          text-align: center;
          font-weight: 600;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }
        
        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px 15px;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 6px 20px rgba(0,0,0,0.15);
          transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }
        
        .stat-number {
          display: block;
          font-size: 2em;
          font-weight: bold;
          margin-bottom: 5px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }
        
        .stat-label {
          font-size: 0.9em;
          opacity: 0.9;
          font-weight: 500;
        }
        
        .mapa-calor-info {
          margin-top: 30px;
          padding: 25px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }
        
        .mapa-calor-info h3 {
          color: #2c3e50;
          font-size: 1.3em;
          margin-bottom: 20px;
          text-align: center;
          font-weight: 600;
        }
        
        .leyenda {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: center;
          margin-bottom: 25px;
        }
        
        .leyenda-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          padding: 12px 18px;
          border-radius: 25px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.1);
          border: 1px solid #dee2e6;
        }
        
        .color-box {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .mapa-calor-info ul {
          list-style: none;
          padding: 0;
        }
        
        .mapa-calor-info li {
          background: white;
          margin: 10px 0;
          padding: 15px 20px;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border-left: 4px solid #667eea;
        }
        
        .mapa-calor-info li strong {
          color: #2c3e50;
          font-weight: 600;
        }
        
        /* Estilos para las tablas de riesgos */
        .tabla-riesgos-container {
          margin: 25px 0;
          padding: 20px;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }
        
        .tabla-riesgos-container h4 {
          color: #2c3e50;
          font-size: 1.2em;
          margin-bottom: 15px;
          text-align: center;
          font-weight: 600;
        }
        
        .tabla-riesgos {
          background: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .tabla-header {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-weight: bold;
          text-align: center;
        }
        
        .tabla-header > div {
          padding: 15px 10px;
          border-right: 1px solid rgba(255,255,255,0.2);
          font-size: 0.9em;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .tabla-header > div:last-child {
          border-right: none;
        }
        
        .tabla-body {
          display: flex;
          flex-direction: column;
        }
        
        .tabla-fila {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          border-bottom: 1px solid #dee2e6;
          transition: background-color 0.3s ease;
        }
        
        .tabla-fila:hover {
          background-color: #f8f9fa;
        }
        
        .tabla-fila:last-child {
          border-bottom: none;
        }
        
        .tabla-fila > div {
          padding: 15px 10px;
          text-align: center;
          font-weight: 500;
          border-right: 1px solid #dee2e6;
        }
        
        .tabla-fila > div:last-child {
          border-right: none;
        }
        
        .col-riesgo {
          font-weight: bold;
          color: #2c3e50;
          background-color: #f8f9fa;
        }
        
        .col-probabilidad, .col-impacto {
          color: #495057;
          font-size: 1.1em;
        }
        
        .col-calificacion {
          font-weight: bold;
          font-size: 1.1em;
          border-radius: 6px;
          margin: 2px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        /* Estilos para información de valoración */
        .valoracion-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 20px 0;
          padding: 20px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          border: 1px solid #dee2e6;
        }
        
        .valoracion-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          border-radius: 25px;
          font-weight: bold;
          font-size: 1.1em;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: transform 0.3s ease;
        }
        
        .valoracion-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.2);
        }
        
        .valoracion-badge.inicial {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
        }
        
        .valoracion-badge.anual {
          background: linear-gradient(135deg, #007bff 0%, #6610f2 100%);
          color: white;
        }
        
        .badge-icon {
          font-size: 1.2em;
        }
        
        .fecha-valoracion {
          color: #495057;
          font-size: 1.1em;
          font-weight: 500;
        }
        
        .fecha-valoracion strong {
          color: #2c3e50;
        }
        
        /* Estilos para Leyenda de Riesgos */
        .leyenda-riesgos {
          margin: 40px 0;
        }
        
        .leyenda-riesgos h3 {
          text-align: center;
          color: #2c3e50;
          font-size: 1.8rem;
          font-weight: 700;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        .leyenda-riesgos p {
          text-align: center;
          color: #6c757d;
          font-size: 1rem;
          margin-bottom: 30px;
          font-style: italic;
        }
        
        .leyenda-contenido {
          display: flex;
          gap: 40px;
          align-items: flex-start;
          justify-content: center;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 30px;
        }
        
        .leyenda-mapa {
          flex: 1;
          background: white;
          padding: 35px;
          border-radius: 12px;
          border: 1px solid #e9ecef;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          min-width: 0;
          max-width: 600px;
        }
        
        .leyenda-mapa h4 {
          color: #2c3e50;
          margin-bottom: 12px;
          font-size: 1.4rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .leyenda-mapa p {
          color: #6c757d;
          margin-bottom: 20px;
          font-size: 1rem;
          font-style: italic;
        }
        
        .leyenda-riesgos h3 {
          color: #2c3e50;
          margin-bottom: 10px;
          font-size: 1.4rem;
        }
        
        .leyenda-riesgos p {
          color: #6c757d;
          margin-bottom: 20px;
          font-size: 1rem;
        }
        
        .leyenda-tabla {
          overflow-x: auto;
        }
        
        .tabla-leyenda {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .tabla-leyenda thead {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }
        
        .tabla-leyenda th {
          padding: 16px 20px;
          text-align: left;
          font-weight: 600;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .tabla-leyenda td {
          padding: 18px 20px;
          border-bottom: 1px solid #f1f3f4;
          font-size: 1rem;
          vertical-align: middle;
        }
        
        .tabla-leyenda tbody tr:hover {
          background: #f8f9fa;
        }
        
        .tabla-leyenda tbody tr:last-child td {
          border-bottom: none;
        }
        
        .codigo-riesgo {
          font-weight: 700;
          color: #2c3e50;
          background: #f8f9fa;
          text-align: center;
          width: 60px;
          border-radius: 4px;
          font-size: 0.85rem;
        }
        
        .nombre-riesgo {
          font-weight: 500;
          color: #495057;
          padding-left: 15px;
        }
        
        .clasificacion-riesgo {
          text-align: center;
          font-weight: 700;
          color: #2c3e50;
          background: #e9ecef;
          border-radius: 4px;
          font-size: 0.9rem;
          width: 80px;
        }
        
        .nivel-riesgo {
          text-align: center;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .nivel-bajo {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .nivel-medio {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }
        
        .nivel-alto {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .nivel-critico {
          background: #721c24;
          color: #ffffff;
          border: 1px solid #721c24;
        }
        
        .probabilidad-riesgo,
        .impacto-riesgo {
          text-align: center;
          font-weight: 600;
          color: #6c757d;
          width: 80px;
        }
        
        .nivel-riesgo {
          text-align: center;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
        }
        
        .nivel-riesgo.nivel-bajo {
          background: #d4edda;
          color: #155724;
        }
        
        .nivel-riesgo.nivel-medio {
          background: #fff3cd;
          color: #856404;
        }
        
        .nivel-riesgo.nivel-alto {
          background: #f8d7da;
          color: #721c24;
        }
        
        .nivel-riesgo.nivel-critico {
          background: #f5c6cb;
          color: #721c24;
        }

        /* Estilos para Recomendaciones de Gestión */
        .recomendaciones-container-report {
          display: flex;
          flex-direction: column;
          gap: 25px;
          margin: 20px 0;
        }
        
        .recomendacion-card-report {
          background: white;
          border-radius: 12px;
          padding: 25px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.1);
          border: 2px solid #e9ecef;
          border-left: 5px solid #667eea;
        }
        
        .recomendacion-header-report {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #f8f9fa;
        }
        
        .recomendacion-header-report h3 {
          color: #2c3e50;
          font-size: 1.4rem;
          font-weight: 600;
          margin: 0;
        }
        
        .recomendacion-content-report {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .recomendacion-descripcion-report {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #28a745;
        }
        
        .recomendacion-descripcion-report h4 {
          color: #2c3e50;
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0 0 10px 0;
        }
        
        .recomendacion-descripcion-report p {
          color: #495057;
          line-height: 1.6;
          margin: 0;
        }
        
        .recomendacion-fechas-report {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }
        
        .fecha-item-report {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }
        
        .fecha-item-report strong {
          color: #2c3e50;
          font-weight: 600;
        }
        
        .comentarios-report {
          margin-top: 10px;
          padding: 10px;
          background: white;
          border-radius: 6px;
          border-left: 3px solid #667eea;
          font-style: italic;
          color: #6c757d;
        }
        
        .comentarios-report strong {
          color: #495057;
          font-weight: 600;
        }

        /* Mapas export — diseño alineado con la plataforma */
        .mapas-container-export {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
          margin-top: 16px;
          align-items: start;
        }
        .mapas-container-export.mapas-container-export--uno {
          grid-template-columns: 1fr;
          max-width: 520px;
          margin-left: auto;
          margin-right: auto;
        }
        .mapa-contenedor-export {
          display: flex;
          flex-direction: column;
          align-items: center;
          max-width: 520px;
          margin: 0 auto;
          width: 100%;
        }
        .mapa-export-titulo {
          font-size: 1rem;
          color: #2c3e50;
          margin: 8px 0 6px;
          text-align: center;
          font-weight: 600;
        }
        .nota-mapa-impresion {
          font-size: 0.82rem;
          color: #555;
          margin: 0 0 10px;
          line-height: 1.4;
          text-align: center;
        }
        .heatmap-grid-export {
          margin: 0 auto 12px;
        }
        .mapa-stats-compact {
          font-size: 0.78rem;
          color: #6c757d;
          text-align: center;
          margin: 8px 0 0;
          line-height: 1.4;
        }
        .tabla-resumen-mapa-block {
          width: 100%;
          max-width: 500px;
          margin: 0 auto 12px;
        }
        .tabla-resumen-mapa-titulo {
          margin: 0;
          padding: 8px 10px;
          font-size: 0.8rem;
          font-weight: 700;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #fff;
          background: #34495e;
          border-radius: 6px 6px 0 0;
        }
        .tabla-resumen-mapa-scroll {
          max-height: 280px;
          overflow: auto;
          border: 1px solid #dee2e6;
          border-radius: 0 0 6px 6px;
          background: #fff;
        }
        .tabla-resumen-mapa {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.78rem;
          table-layout: fixed;
        }
        .tabla-resumen-mapa thead {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: #fff;
        }
        .tabla-resumen-mapa th,
        .tabla-resumen-mapa td {
          padding: 6px 8px;
          text-align: center;
          border-bottom: 1px solid #e9ecef;
        }
        .tabla-resumen-mapa th:first-child,
        .tabla-resumen-mapa td:first-child {
          text-align: left;
        }
        .tabla-resumen-mapa-codigo {
          font-weight: 700;
          color: #2c3e50;
        }
        .tabla-resumen-mapa-vacio {
          margin: 0;
          padding: 12px;
          font-size: 0.85rem;
          color: #6c757d;
          text-align: center;
          border: 1px dashed #ced4da;
          border-radius: 6px;
          background: #f8f9fa;
        }
        .tabla-leyenda-mapa-block {
          margin-top: 14px;
        }
        .tabla-leyenda-mapa th:nth-child(1),
        .tabla-leyenda-mapa td:nth-child(1) { width: 12%; }
        .tabla-leyenda-mapa th:nth-child(2),
        .tabla-leyenda-mapa td:nth-child(2) {
          width: 48%;
          text-align: left;
        }
        .tabla-leyenda-mapa th:nth-child(3),
        .tabla-leyenda-mapa td:nth-child(3) { width: 14%; }
        .tabla-leyenda-mapa th:nth-child(4),
        .tabla-leyenda-mapa td:nth-child(4) { width: 26%; }
        .tabla-leyenda-mapa-nombre {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: left !important;
          color: #495057;
        }
        .tabla-leyenda-mapa-calif {
          font-weight: 700;
          color: #2c3e50;
        }
        .tabla-leyenda-mapa-nivel {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .tabla-leyenda-mapa-nivel.nivel-bajo { background: #d4edda; color: #155724; }
        .tabla-leyenda-mapa-nivel.nivel-medio { background: #fff3cd; color: #856404; }
        .tabla-leyenda-mapa-nivel.nivel-alto { background: #ffe0b2; color: #e65100; }
        .tabla-leyenda-mapa-nivel.nivel-critico { background: #f8d7da; color: #721c24; }
        .mapa-detalle-celdas-export {
          width: 100%;
          max-width: 500px;
          margin: 0 auto 14px;
          text-align: left;
        }
        .mapa-detalle-celdas-titulo {
          margin: 0 0 6px;
          padding: 8px 10px;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #fff;
          background: #1a5276;
          border-radius: 6px;
        }
        .mapa-detalle-celdas-ayuda {
          font-size: 0.76rem;
          color: #6c757d;
          margin: 0 0 10px;
          line-height: 1.35;
        }
        .mapa-detalle-celda-grupo {
          border: 1px solid #dee2e6;
          border-radius: 6px;
          margin-bottom: 10px;
          overflow: hidden;
          background: #fff;
        }
        .mapa-detalle-celda-titulo {
          margin: 0;
          padding: 8px 10px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #2c3e50;
          background: #e8f4fc;
        }
        .mapa-detalle-celda-lista {
          list-style: none;
          margin: 0;
          padding: 0;
          max-height: 280px;
          overflow-y: auto;
        }
        .mapa-detalle-celda-lista li {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 8px 10px;
          padding: 8px 10px;
          border-bottom: 1px solid #f1f3f4;
          font-size: 0.78rem;
        }
        .mapa-detalle-celda-lista li:last-child { border-bottom: none; }
        .mapa-detalle-codigo {
          font-weight: 700;
          color: #2c3e50;
          flex-shrink: 0;
        }
        .mapa-detalle-nombre {
          flex: 1;
          min-width: 120px;
          color: #495057;
          line-height: 1.35;
        }
        .mapa-detalle-calif {
          font-size: 0.74rem;
          color: #6c757d;
          white-space: nowrap;
          margin-left: auto;
        }
        @media print {
          .mapa-detalle-celda-lista { max-height: none; overflow: visible; }
        }
        .mapa-calor-info-compact {
          margin-top: 20px;
          padding: 16px;
        }
        .mapa-calor-info-compact h3 {
          font-size: 1rem;
          margin-bottom: 12px;
        }
        @media print {
          .mapas-container-export { grid-template-columns: 1fr; }
          .tabla-resumen-mapa-scroll { max-height: none; overflow: visible; }
        }
        
        @media (max-width: 1024px) {
          .mapas-container-export { grid-template-columns: 1fr; }
          .leyenda-riesgos {
            flex-direction: column;
            gap: 15px;
          }
          
          .leyenda-mapa {
            flex: none;
          }
        }
        
        @media (max-width: 768px) {
          .recomendacion-fechas-report {
            grid-template-columns: 1fr;
          }
          
          .recomendacion-card-report {
            padding: 20px;
          }
        }
      </style>
      
      <div class="section">
        <h2>🔥 Mapa de Calor de Riesgos</h2>
        <p>Visualización de la matriz de riesgos con códigos de color para facilitar la identificación de riesgos prioritarios.</p>
        
        <!-- Información del tipo de valoración -->
        <div class="valoracion-info">
          <div class="valoracion-badge ${esValoracionInicial ? 'inicial' : 'anual'}">
            <span class="badge-icon">${esValoracionInicial ? '🚀' : '📅'}</span>
            <span class="badge-text">Valoración ${tipoValoracion}</span>
          </div>
          <div class="fecha-valoracion">
            <strong>Fecha:</strong> ${fechaValoracion}
          </div>
        </div>
        
        <div class="mapas-container-export ${tipoReporte === 'inicial' ? 'mapas-container-export--uno' : ''}">
          ${this.generarBloqueMapaExport({
            tituloResumen: 'Valoración riesgo inherente',
            tituloMapa: 'Mapa de calor — Riesgo inherente',
            tituloLeyenda: 'Identificación — inherente',
            riesgos: riesgosInherentes,
            valoraciones,
            matrizHTML: matrizInherente,
            estadisticas: estadisticasInherentes,
          })}
          ${
            tipoReporte === 'anual'
              ? this.generarBloqueMapaExport({
                  tituloResumen: 'Valoración riesgo residual',
                  tituloMapa: 'Mapa de calor — Riesgo residual',
                  tituloLeyenda: 'Identificación — residual',
                  riesgos: riesgosResiduales,
                  valoraciones,
                  matrizHTML: matrizResidual,
                  estadisticas: estadisticasResiduales,
                  vacio: 'Sin datos residuales',
                })
              : ''
          }
        </div>

        <div class="mapa-calor-info mapa-calor-info-compact">
          <h3>Leyenda de colores</h3>
          <div class="leyenda">
            <div class="leyenda-item"><div class="color-box" style="background:#28a745;"></div><span>Bajo (≤ 4)</span></div>
            <div class="leyenda-item"><div class="color-box" style="background:#ffc107;"></div><span>Medio (5-9)</span></div>
            <div class="leyenda-item"><div class="color-box" style="background:#fd7e14;"></div><span>Alto (10-16)</span></div>
            <div class="leyenda-item"><div class="color-box" style="background:#dc3545;"></div><span>Crítico (&gt; 16)</span></div>
          </div>
        </div>
      </div>
    `;
  }

  // Función auxiliar para calcular máximo impacto (igual que la plataforma)
  static calcularMaxImpacto(impactos) {
    if (!impactos) return 1;
    const { economico = 1, operativo = 1, reputacional = 1, legal = 1 } = impactos;
    return Math.max(Number(economico), Number(operativo), Number(reputacional), Number(legal));
  }

  // Función para convertir valor a bucket 1-5 (igual que la plataforma)
  static bucket1a5(valor) {
    const num = Number(valor) || 0;
    if (num <= 1.5) return 1;
    if (num <= 2.5) return 2;
    if (num <= 3.5) return 3;
    if (num <= 4.5) return 4;
    return 5;
  }

  // Función para calcular el nivel de riesgo (igual que la plataforma)
  static calcularNivelRiesgo(probabilidad, impacto) {
    const clasificacion = probabilidad * impacto;
    if (clasificacion <= 4) return { nivel: 'Bajo', color: '#28a745' };
    if (clasificacion <= 9) return { nivel: 'Medio', color: '#ffc107' };
    if (clasificacion <= 16) return { nivel: 'Alto', color: '#fd7e14' };
    return { nivel: 'Crítico', color: '#dc3545' };
  }

  // Detectar si es valoración inicial o anual
  static detectarTipoValoracion(valoracion) {
    // Lógica para detectar si es valoración inicial o anual
    // Se puede basar en:
    // 1. Campo específico en los datos
    // 2. Fecha de creación vs fecha actual
    // 3. Presencia de datos residuales
    // 4. Etiquetas o metadatos
    
    if (valoracion.tipoValoracion) {
      return valoracion.tipoValoracion === 'inicial';
    }
    
    // Si hay datos residuales, probablemente es anual
    if (valoracion.probResidual && Object.keys(valoracion.probResidual).length > 0) {
      return false; // Es anual
    }
    
    // Si no hay datos residuales, probablemente es inicial
    return true; // Es inicial
  }

  // Obtener fecha de valoración
  static obtenerFechaValoracion(valoracion) {
    if (valoracion.fechaValoracion) {
      return valoracion.fechaValoracion;
    }
    
    if (valoracion.fechaCreacion) {
      return valoracion.fechaCreacion;
    }
    
    // Fecha actual como fallback
    return new Date().toLocaleDateString('es-ES');
  }

  /**
   * Contenido estático de celda para mapa en HTML/PDF (sin interacción).
   * Misma lógica que en pantalla: 1 código, 2 códigos compactos, 3+ solo cantidad + «riesgos».
   */
  static contenidoCeldaMapaReporte(riesgosEnCelda) {
    if (!Array.isArray(riesgosEnCelda) || riesgosEnCelda.length === 0) return '';
    const n = riesgosEnCelda.length;
    if (n === 1) {
      return `<span class="riesgo-marcador">${riesgosEnCelda[0].id}</span>`;
    }
    if (n === 2) {
      return `<div style="display:flex;gap:3px;justify-content:center;align-items:center;width:100%;height:100%;padding:2px;box-sizing:border-box;flex-wrap:wrap;">${riesgosEnCelda
        .map(
          (r) =>
            `<span class="riesgo-marcador" style="font-size:7px;padding:2px 4px;line-height:1.1;border-width:1px;">${r.id}</span>`
        )
        .join('')}</div>`;
    }
    const idsLista = riesgosEnCelda.map((r) => r.id).join(', ');
    const titulo = idsLista.replace(/"/g, '&quot;').replace(/</g, '');
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;padding:3px;box-sizing:border-box;text-align:center;" title="${titulo}">
    <span style="font-size:clamp(12px,2.2vw,16px);font-weight:800;color:#1e1e1e;line-height:1;">${n}</span>
    <span style="font-size:clamp(7px,1.6vw,9px);font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:0.03em;line-height:1.15;">riesgos</span>
  </div>`;
  }

  // Generar matriz visual 5x5 (HTML/PDF; alineado con MapaCalorMatriz en la app)
  static generarMatrizVisual(riesgos, tipo = '') {
if (!Array.isArray(riesgos)) {
      console.error('🎯 Error: riesgos no es un array:', riesgos);
      return '<div class="error">Error: Datos de riesgos no válidos</div>';
    }
    
    if (riesgos.length === 0) {
return '<div class="no-data">No hay datos de riesgos disponibles</div>';
    }
    
    // Función para obtener la clase CSS según el patrón específico de la matriz (COPIA EXACTA)
    const obtenerClaseRiesgo = (probabilidad, impacto) => {
      if (impacto === 5) {
        if (probabilidad === 1) return 'yellow-risk';
        if (probabilidad === 2) return 'orange-risk';
        return 'red-risk'; // probabilidad 3, 4, 5
      }
      if (impacto === 4) {
        if (probabilidad === 1) return 'yellow-risk';
        if (probabilidad === 2) return 'yellow-risk';
        if (probabilidad === 3) return 'orange-risk';
        return 'red-risk'; // probabilidad 4, 5
      }
      if (impacto === 3) {
        if (probabilidad === 1) return 'green-risk';
        if (probabilidad === 2) return 'yellow-risk';
        if (probabilidad === 3) return 'orange-risk';
        if (probabilidad === 4) return 'orange-risk';
        return 'red-risk'; // probabilidad 5
      }
      if (impacto === 2) {
        if (probabilidad === 1) return 'green-risk';
        if (probabilidad === 2) return 'yellow-risk';
        if (probabilidad === 3) return 'yellow-risk';
        if (probabilidad === 4) return 'yellow-risk';
        return 'orange-risk'; // probabilidad 5
      }
      if (impacto === 1) {
        if (probabilidad === 1) return 'green-risk';
        if (probabilidad === 2) return 'green-risk';
        if (probabilidad === 3) return 'green-risk';
        return 'yellow-risk'; // probabilidad 4, 5
      }
      return 'green-risk';
    };
    
    // Grid 5x5: filas = probabilidad (5→1), columnas = impacto (1→5); coincide con MapaCalorMatriz
    let matrizHTML = '';
    
    for (let probabilidad = 5; probabilidad >= 1; probabilidad--) {
      matrizHTML += '<div class="heatmap-row">';
      
      for (let impacto = 1; impacto <= 5; impacto++) {
        const claseRiesgo = obtenerClaseRiesgo(probabilidad, impacto);
        const riesgosEnCelda = riesgos.filter(r => r.probabilidad === probabilidad && r.impacto === impacto);
        
        // Debug: Mostrar información de cada celda
// Convertir clase CSS a color de fondo
        let colorFondo = '#28a745'; // Verde por defecto
        if (claseRiesgo === 'yellow-risk') colorFondo = '#ffc107';
        else if (claseRiesgo === 'orange-risk') colorFondo = '#fd7e14';
        else if (claseRiesgo === 'red-risk') colorFondo = '#dc3545';
        
        matrizHTML += `
          <div class="heatmap-cell" style="background-color: ${colorFondo}; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
            ${this.contenidoCeldaMapaReporte(riesgosEnCelda)}
          </div>
        `;
      }
      
      matrizHTML += '</div>';
    }
    
return matrizHTML;
  }

  // Calcular estadísticas de valoración
  static calcularEstadisticasValoracion(valoraciones) {
if (!Array.isArray(valoraciones)) {
      console.error('📊 Error: valoraciones no es un array');
      return { total: 0, criticos: 0, altos: 0, medios: 0, bajos: 0 };
    }
    
    let total = valoraciones.length;
    let criticos = 0;
    let altos = 0;
    let medios = 0;
    let bajos = 0;

    valoraciones.forEach((valoracion, index) => {
const probabilidad = Number(valoracion.probabilidad) || 0;
      const impacto = Number(valoracion.impacto) || 0;
      const clasificacion =
        Number(valoracion.clasificacion) > 0
          ? Number(valoracion.clasificacion)
          : probabilidad * impacto;
      
// Misma escala que calcularNivelRiesgo (producto prob×impacto 1–25): ≤4 bajo, 5–9 medio, 10–16 alto, >16 crítico
      if (clasificacion > 16) {
        criticos++;
} else if (clasificacion > 9) {
        altos++;
} else if (clasificacion > 4) {
        medios++;
} else {
        bajos++;
}
    });

    const estadisticas = { total, criticos, altos, medios, bajos };
return estadisticas;
  }

  // Obtener nivel de riesgo
  /** Nivel cualitativo a partir del producto prob×impacto (igual que calcularNivelRiesgo en este servicio) */
  static obtenerNivelRiesgo(clasificacion) {
    const c = Number(clasificacion) || 0;
    if (c > 16) return { texto: 'Crítico', clase: 'nivel-critico' };
    if (c > 9) return { texto: 'Alto', clase: 'nivel-alto' };
    if (c > 4) return { texto: 'Medio', clase: 'nivel-medio' };
    return { texto: 'Bajo', clase: 'nivel-bajo' };
  }

  // Calcular riesgos inherentes
  static calcularRiesgosInherentes(valoraciones, valoracion) {
if (!Array.isArray(valoraciones) || valoraciones.length === 0) {
      return [];
    }
    
    const probabilidades = valoracion?.probabilidad || {};
    const impactosCategoria = valoracion?.impactosCategoria || {};
    
    return valoraciones.map(valoracion => {
      // Probabilidad inherente (primera probabilidad)
      const probabilidadInherente = probabilidades[valoracion.id] || 1;
      
      // Impacto inherente (máximo impacto por categoría - igual que la plataforma)
      const impactosInherentes = impactosCategoria[valoracion.id] || { economico: 1, operativo: 1, reputacional: 1, legal: 1 };
      const maxImpactoInherente = this.calcularMaxImpacto(impactosInherentes);
      const impactoInherente = this.bucket1a5(maxImpactoInherente);
      
return {
        id: valoracion.id || `R${valoracion.numero}`,
        numero: valoracion.numero,
        probabilidad: probabilidadInherente,
        impacto: impactoInherente,
        descripcion: valoracion.descripcion || valoracion.riesgo || ''
      };
    });
  }
  
  // Calcular riesgos residuales
  static calcularRiesgosResiduales(valoraciones, valoracion) {
if (!Array.isArray(valoraciones) || valoraciones.length === 0) {
      return [];
    }
    
    const probResidual = valoracion?.probResidual || {};
    const impactosCategoriaResidual = valoracion?.impactosCategoriaResidual || {};
    const probabilidades = valoracion?.probabilidad || {};
    const impactosCategoria = valoracion?.impactosCategoria || {};
    
return valoraciones.map(valoracion => {
// Probabilidad residual (después de controles)
      const probabilidadResidual = probResidual[valoracion.id] || probabilidades[valoracion.id] || 1;
// Impacto residual (máximo impacto por categoría - igual que la plataforma)
      const impactosResiduales = impactosCategoriaResidual[valoracion.id] || impactosCategoria[valoracion.id] || { economico: 1, operativo: 1, reputacional: 1, legal: 1 };
      const maxImpactoResidual = this.calcularMaxImpacto(impactosResiduales);
      const impactoResidual = this.bucket1a5(maxImpactoResidual);
      
return {
        id: valoracion.id || `R${valoracion.numero}`,
        numero: valoracion.numero,
        probabilidad: probabilidadResidual,
        impacto: impactoResidual,
        descripcion: valoracion.descripcion || valoracion.riesgo || ''
      };
    });
  }
  
  // Función auxiliar para calcular suma de impactos
  static calcularSumaImpacto(impactos) {
    if (!impactos) return 1;
    const { economico = 1, operativo = 1, reputacional = 1, legal = 1 } = impactos;
    return Number(economico) + Number(operativo) + Number(reputacional) + Number(legal);
  }
  
  // Función auxiliar para calcular máximo impacto (igual que la plataforma)
  static calcularMaxImpacto(impactos) {
    if (!impactos) return 1;
    const { economico = 1, operativo = 1, reputacional = 1, legal = 1 } = impactos;
    return Math.max(Number(economico), Number(operativo), Number(reputacional), Number(legal));
  }
  
  // Función auxiliar para convertir valor a bucket 1-5
  static bucket1a5(valor) {
    const num = Number(valor) || 0;
    if (num <= 1.5) return 1;
    if (num <= 2.5) return 2;
    if (num <= 3.5) return 3;
    if (num <= 4.5) return 4;
    return 5;
  }

  // Exportar reporte como HTML
  static async exportarReporteHTML(datosMatriz, nombreArchivo = 'reporte_matriz_riesgos', tipoReporte = 'inicial') {
    try {
      const htmlReporte = await this.generarReporteHTML(datosMatriz, tipoReporte);
      
      const fecha = new Date().toISOString().split('T')[0];
      const nombreCompleto = `${nombreArchivo}_${fecha}.html`;
      
      const blob = new Blob([htmlReporte], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreCompleto;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return { success: true, nombreArchivo: nombreCompleto };
    } catch (error) {
      console.error('Error al exportar reporte HTML:', error);
      return { success: false, error: error.message };
    }
  }

  // Generar y mostrar reporte en nueva ventana
  static async mostrarReporte(datosMatriz, tipoReporte = 'inicial') {
    try {
      const htmlReporte = await this.generarReporteHTML(datosMatriz, tipoReporte);
      
      // Crear nueva ventana
      const nuevaVentana = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      
      if (nuevaVentana) {
        nuevaVentana.document.write(htmlReporte);
        nuevaVentana.document.close();
        
        return { success: true };
      } else {
        throw new Error('No se pudo abrir la nueva ventana. Verifica que los pop-ups estén permitidos.');
      }
    } catch (error) {
      console.error('Error al mostrar reporte:', error);
      return { success: false, error: error.message };
    }
  }
}
