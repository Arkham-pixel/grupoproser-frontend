// Servicio para generar reportes completos de la matriz de riesgos
import { REPORTE_FENIX_CSS } from './reporteMatrizEstilos.js';
import { REPORTE_COMPONENTES_CSS } from './reporteMatrizEstilosComponentes.js';
import { cargarAssetsReporte } from './reporteBrandAssets.js';
import {
  generarSeccionInformacionModerna,
  generarNavReporteHtml,
  generarCabeceraReporteHtml,
  generarPieReporteHtml,
  envolverSeccion,
} from './reporteHtmlSecciones.js';
import { generarSeccionesEjecutivasHtml } from './reporteEjecutivoHtml.js';

export class ReporteService {
  
  // Generar reporte HTML completo
  static async generarReporteHTML(datosMatriz, tipoReporte = 'inicial', opciones = {}) {
    try {
      const modoCapturaPdf = Boolean(opciones.modoCapturaPdf);
      const modoExportacion = Boolean(opciones.modoExportacion);
      const embeberAssets = opciones.embeberAssets !== false;
      const assets = embeberAssets ? await cargarAssetsReporte() : {};

      const fecha = new Date();
      const fechaFormateada = fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const horaFormateada = fecha.toLocaleTimeString('es-ES');

      const cabeceraHtml = generarCabeceraReporteHtml({
        assets,
        informacion: datosMatriz.informacion || {},
        fechaFormateada,
        horaFormateada,
        tipoReporte,
      });
      const navHtml = generarNavReporteHtml();
      const pieHtml = generarPieReporteHtml(assets);
      const seccionesEjecutivasHtml = generarSeccionesEjecutivasHtml(datosMatriz);

      // Crear el HTML del reporte
      const htmlReporte = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reporte de Matriz de Riesgos</title>
          <style>
            ${REPORTE_FENIX_CSS}
            ${REPORTE_COMPONENTES_CSS}
          </style>
          
          <!-- JavaScript para funcionalidad de pestañas -->
          <script>
            function imprimirReportePDF() {
              window.print();
            }
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
        <body class="reporte-tipo-${tipoReporte}${modoCapturaPdf ? ' modo-captura-pdf' : ''}${modoExportacion ? ' modo-exportacion' : ''}">
          <div class="reporte-layout">
            ${navHtml}
            <div class="reporte-contenido-principal">
              <div class="reporte-acciones no-print">
                <button type="button" onclick="imprimirReportePDF()">Guardar como PDF</button>
                <span class="reporte-acciones-hint">
                  Use <strong>Guardar como PDF</strong> para conservar el diseño. Orientación horizontal recomendada.
                </span>
              </div>
              ${cabeceraHtml}
              ${generarSeccionInformacionModerna(datosMatriz.informacion)}
              ${seccionesEjecutivasHtml}
              ${envolverSeccion('seccion-identificacion', this.generarSeccionIdentificacion(datosMatriz.identificacion))}
              ${envolverSeccion('seccion-valoracion', this.generarSeccionValoracion(datosMatriz.valoracion, tipoReporte))}
              ${envolverSeccion('seccion-mapa-calor', this.generarSeccionMapaCalor(datosMatriz.mapaCalor, datosMatriz.valoracion, datosMatriz, tipoReporte))}
              ${this.generarSeccionGestionRiesgos(datosMatriz.gestionRiesgos)}
              ${pieHtml}
            </div>
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

    // Generar sección de información (delegada al layout Fenix moderno)
  static generarSeccionInformacion(informacion) {
    return generarSeccionInformacionModerna(informacion);
  }

  static generarSeccionInformacionLegacy(informacion) {
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
              <h2>Mapa de Calor de Riesgos</h2>
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
    // La leyenda se genera ahora por mapa; se conserva este método como API compatible.
    return '';

    // eslint-disable-next-line no-unreachable
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

    const renderSeguimientos = (recomendacion) => {
      const seguimientos = [];

      if (Array.isArray(recomendacion.seguimientos) && recomendacion.seguimientos.length > 0) {
        recomendacion.seguimientos.forEach((seg, segIndex) => {
          if (!seg?.fecha && !seg?.comentarios) return;
          seguimientos.push(`
            <div class="seguimiento-item-report">
              <strong>📌 Seguimiento ${segIndex + 1}:</strong>
              ${seg.fecha ? `<span class="fecha-seguimiento-report">${seg.fecha}</span>` : ''}
              ${seg.comentarios ? `
                <div class="comentarios-report">
                  <strong>💬 Comentarios:</strong> ${seg.comentarios}
                </div>
              ` : ''}
            </div>
          `);
        });
      }

      if (seguimientos.length === 0 && recomendacion.fechaImplementacion1) {
        seguimientos.push(`
          <div class="seguimiento-item-report">
            <strong>📌 Seguimiento 1:</strong>
            <span class="fecha-seguimiento-report">${recomendacion.fechaImplementacion1}</span>
            ${recomendacion.comentariosImplementacion1 ? `
              <div class="comentarios-report">
                <strong>💬 Comentarios:</strong> ${recomendacion.comentariosImplementacion1}
              </div>
            ` : ''}
          </div>
        `);
      }

      if (recomendacion.fechaImplementacion2) {
        seguimientos.push(`
          <div class="seguimiento-item-report">
            <strong>📌 Seguimiento 2:</strong>
            <span class="fecha-seguimiento-report">${recomendacion.fechaImplementacion2}</span>
            ${recomendacion.comentariosImplementacion2 ? `
              <div class="comentarios-report">
                <strong>💬 Comentarios:</strong> ${recomendacion.comentariosImplementacion2}
              </div>
            ` : ''}
          </div>
        `);
      }

      if (seguimientos.length === 0) return '';

      return `
        <div class="seguimientos-container-report">
          <h4>Seguimiento</h4>
          ${seguimientos.join('')}
        </div>
      `;
    };

    const inner = `
      <div class="section reporte-card">
        <h2>Recomendaciones de gestión de riesgos</h2>
        <p class="section-subtitulo">Recomendaciones identificadas, estado de progreso y seguimiento</p>
        
        <div class="recomendaciones-container-report">
          ${gestionRiesgos.recomendaciones.map((recomendacion, index) => {
            const textoRecomendacion =
              recomendacion.recomendacion || recomendacion.descripcion || recomendacion.texto || '';
            const estadoId = recomendacion.estado || 'abierta';
            const avance = Number.isFinite(Number(recomendacion.avance))
              ? Number(recomendacion.avance)
              : 0;
            const etiquetaEstado =
              estadoId === 'abierta'
                ? 'No iniciada'
                : estadoId === 'en_proceso'
                  ? 'En proceso'
                  : estadoId === 'avanzada'
                    ? 'Avanzada'
                    : estadoId === 'cerrada'
                      ? 'Completada'
                      : estadoId;
            return `
            <div class="recomendacion-card-report">
              <div class="recomendacion-header-report">
                <h3>Recomendación ${index + 1}</h3>
                ${recomendacion.fechaRecomendacion || recomendacion.fechaInicial ? `
                  <p class="fecha-recomendacion-report">
                    <strong>Fecha:</strong>
                    ${recomendacion.fechaRecomendacion || recomendacion.fechaInicial}
                  </p>
                ` : ''}
                <p class="fecha-recomendacion-report">
                  <strong>Estado:</strong> ${etiquetaEstado}
                  · <strong>Avance:</strong> ${avance}%
                </p>
                <div style="margin-top:8px;height:8px;background:#e5e7eb;border-radius:999px;overflow:hidden;">
                  <div style="height:100%;width:${avance}%;background:${
                    avance >= 100
                      ? '#28a745'
                      : avance >= 75
                        ? '#eab308'
                        : avance >= 25
                          ? '#fd7e14'
                          : '#dc3545'
                  };"></div>
                </div>
              </div>
              
              <div class="recomendacion-content-report">
                ${textoRecomendacion ? `
                  <div class="recomendacion-descripcion-report">
                    <h4>Descripción</h4>
                    <p>${textoRecomendacion}</p>
                  </div>
                ` : ''}
                
                ${renderSeguimientos(recomendacion)}
              </div>
            </div>
          `;
          }).join('')}
        </div>
      </div>
    `;

    return envolverSeccion('seccion-recomendaciones', inner);
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
      ...new Set(
        riesgos.map((r) => (r.tipoProceso || '').trim()).filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, 'es'));

    return `
      <div class="section">
        <h2>Identificación de Riesgos</h2>
        <p class="section-description-report">Identifica y categoriza todos los riesgos potenciales por proceso organizacional</p>
        
        ${riesgos.length === 0 ? `
          <div class="sin-riesgos-report">
            <div class="sin-riesgos-icono-report">📝</div>
            <h5>No hay riesgos identificados</h5>
            <p>Comienza agregando el primer riesgo usando el formulario de arriba.</p>
          </div>
        ` : `
          <div class="identificacion-content-report">
            <div class="reporte-resumen-bloque resumen-riesgos-report">
              <h4 class="reporte-resumen-titulo">Resumen de categorías</h4>
              <div class="categorias-resumen-report reporte-resumen-grid">
                ${categoriasRiesgo.map(cat => {
                  const count = riesgos.filter(riesgo => 
                    riesgo.categorias && riesgo.categorias[cat.valor]
                  ).length;
                  return `
                    <div class="categoria-item-report">
                      <span class="categoria-nombre-report">${cat.etiqueta}</span>
                      <span class="categoria-count-report">${count}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <div class="reporte-resumen-bloque tipos-proceso-report">
              <h4 class="reporte-resumen-titulo">Tipos de proceso identificados</h4>
              <div class="tipos-grid-report reporte-resumen-grid">
                ${tiposProceso.length === 0 ? `
                  <p style="margin:0;color:#6c757d;grid-column:1/-1;">No hay tipos de proceso registrados.</p>
                ` : tiposProceso.map(tipo => {
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

            <h3 class="seccion-titulo-report">
              <span class="icono-report" aria-hidden="true"></span>
              Detalle de riesgos (${riesgos.length})
            </h3>
            
            <p class="reporte-tabla-scroll-hint no-print">← Arrastre con el mouse o desplace horizontalmente para ver todas las columnas →</p>
            <div class="tabla-container-report reporte-tabla-scroll">
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
                    ${columnasAdicionales.map(() => `
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
          <h2>Valoración de Riesgos</h2>
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
        <h2>Valoración de Riesgos</h2>
        <p class="section-description-report">Evaluación cuantitativa y cualitativa de los riesgos identificados</p>
        
        <div class="valoracion-content-report">
          <div class="reporte-resumen-bloque resumen-valoracion-report">
            <h4 class="reporte-resumen-titulo">Resumen de valoración</h4>
            <div class="resumen-grid-report reporte-resumen-grid">
              <div class="resumen-item-report">
                <span class="categoria-nombre-report">Riesgos valorados</span>
                <span class="resumen-numero-report">${valoraciones.length}</span>
              </div>
              <div class="resumen-item-report">
                <span class="categoria-nombre-report">Críticos</span>
                <span class="resumen-numero-report">${valoraciones.filter(v => calcularNivelRiesgoResidual((v.probResidual || v.probabilidad) * (v.sumImpactoResidual || v.sumImpacto || 1)).nivel === 'CRÍTICO').length}</span>
              </div>
              <div class="resumen-item-report">
                <span class="categoria-nombre-report">Altos</span>
                <span class="resumen-numero-report">${valoraciones.filter(v => calcularNivelRiesgoResidual((v.probResidual || v.probabilidad) * (v.sumImpactoResidual || v.sumImpacto || 1)).nivel === 'ALTO').length}</span>
              </div>
              <div class="resumen-item-report">
                <span class="categoria-nombre-report">Tolerables</span>
                <span class="resumen-numero-report">${valoraciones.filter(v => calcularNivelRiesgoResidual((v.probResidual || v.probabilidad) * (v.sumImpactoResidual || v.sumImpacto || 1)).nivel === 'TOLERABLE').length}</span>
              </div>
              <div class="resumen-item-report">
                <span class="categoria-nombre-report">Aceptables</span>
                <span class="resumen-numero-report">${valoraciones.filter(v => calcularNivelRiesgoResidual((v.probResidual || v.probabilidad) * (v.sumImpactoResidual || v.sumImpacto || 1)).nivel === 'ACEPTABLE').length}</span>
              </div>
            </div>
          </div>

          <h3 class="seccion-titulo-report">
            <span class="icono-report" aria-hidden="true"></span>
            Detalle de valoración (${valoraciones.length})
          </h3>
          
          <p class="reporte-tabla-scroll-hint no-print">← Arrastre con el mouse o desplace horizontalmente para ver todas las columnas →</p>
          <div class="tabla-container-report tabla-container-report--valoracion reporte-tabla-scroll">
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
        </div>
      </div>
    `;
  }

  // Generar sección de mapa de calor
  static generarSeccionMapaCalor(mapaCalor, valoracion, _DATOS_MATRIZ = {}, tipoReporte = 'inicial') {
    void _DATOS_MATRIZ;
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
      <div class="section">
        <h2>Mapa de calor</h2>
        <p class="section-subtitulo">Visualización de la matriz con códigos de color para identificar riesgos prioritarios</p>
        
        <div class="valoracion-info">
          <div class="valoracion-badge ${esValoracionInicial ? 'inicial' : 'anual'}">
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
            <div class="leyenda-item"><div class="color-box leyenda-bajo"></div><span>Bajo (≤ 4)</span></div>
            <div class="leyenda-item"><div class="color-box leyenda-medio"></div><span>Medio (5-9)</span></div>
            <div class="leyenda-item"><div class="color-box leyenda-alto"></div><span>Alto (10-16)</span></div>
            <div class="leyenda-item"><div class="color-box leyenda-critico"></div><span>Crítico (&gt; 16)</span></div>
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
  static generarMatrizVisual(riesgos, _TIPO = '') {
    void _TIPO;
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
        let colorFondo = '#16A34A';
        if (claseRiesgo === 'yellow-risk') colorFondo = '#CA8A04';
        else if (claseRiesgo === 'orange-risk') colorFondo = '#EA580C';
        else if (claseRiesgo === 'red-risk') colorFondo = '#DC2626';
        
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

    valoraciones.forEach((valoracion) => {
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
  
  static agregarCanvasAlPdf(pdf, canvas, pdfWidth, pdfHeight, estadoPagina) {
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    while (heightLeft > 0) {
      if (!estadoPagina.esPrimera) {
        pdf.addPage();
      } else {
        estadoPagina.esPrimera = false;
      }
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
      position -= pdfHeight;
    }
  }

  static async esperarDocumentoIframe(iframeWin, iframeDoc) {
    await new Promise((resolve) => {
      if (iframeDoc.readyState === 'complete') {
        resolve();
        return;
      }
      iframeWin.addEventListener('load', resolve, { once: true });
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Descargar archivo .html interactivo (NO es PDF — tablas movibles en el navegador)
  static async exportarReportePDF(datosMatriz, nombreArchivo = 'reporte_matriz_riesgos', tipoReporte = 'inicial') {
    const { descargarReporteInteractivoHtml } = await import('./exportarReporteInteractivoArchivo.js');
    return descargarReporteInteractivoHtml(datosMatriz, nombreArchivo, tipoReporte);
  }

  // Descargar .html interactivo autónomo
  static async exportarReporteHTML(datosMatriz, nombreArchivo = 'reporte_matriz_riesgos', tipoReporte = 'inicial') {
    try {
      const { descargarReporteInteractivoHtml } = await import('./exportarReporteInteractivoArchivo.js');
      return descargarReporteInteractivoHtml(datosMatriz, nombreArchivo, tipoReporte);
    } catch (error) {
      console.error('Error al exportar reporte HTML:', error);
      return { success: false, error: error.message };
    }
  }

  // Generar y mostrar reporte en nueva ventana (vista React = mismo diseño que la matriz)
  static async mostrarReporte(datosMatriz, tipoReporte = 'inicial', matrizId = null) {
    try {
      const { abrirReporteMatrizVista } = await import('./reportePdfDesdeHtmlService.js');
      abrirReporteMatrizVista(datosMatriz, tipoReporte, matrizId);
      return { success: true };
    } catch (error) {
      console.error('Error al mostrar reporte:', error);
      return { success: false, error: error.message };
    }
  }
}
